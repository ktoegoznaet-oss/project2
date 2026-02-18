const express = require('express');
const { query, getClient } = require('../config/database');
const { auth } = require('../middleware/auth');
const { paymentLimiter } = require('../middleware/rateLimiter');
const paymentService = require('../services/paymentService');
const logger = require('../utils/logger');
const router = express.Router();

router.post('/create', auth, paymentLimiter, async (req, res, next) => {
  try {
    const { amount, payment_type = 'balance_topup', metadata = {} } = req.body;

    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount < 10 || parsedAmount > 100000) {
      return res.status(400).json({ error: 'Сумма должна быть от 10 до 100 000 ₽' });
    }

    const validTypes = ['balance_topup', 'song_order', 'custom_song', 'subscription'];
    if (!validTypes.includes(payment_type)) {
      return res.status(400).json({ error: 'Неверный тип платежа' });
    }

    const paymentResult = await query(
      `INSERT INTO payments (user_id, amount, payment_type, metadata)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [req.user.id, parsedAmount, payment_type, JSON.stringify(metadata)]
    );
    const paymentId = paymentResult.rows[0].id;

    const yookassaPayment = await paymentService.createPayment({
      amount: parsedAmount,
      description: getPaymentDescription(payment_type, parsedAmount),
      paymentId,
      userId: req.user.id,
      metadata: { ...metadata, payment_type },
    });

    await query('UPDATE payments SET external_id = $1, status = $2 WHERE id = $3', [yookassaPayment.id, 'waiting_for_capture', paymentId]);

    logger.info('Payment created', { paymentId, userId: req.user.id, amount: parsedAmount, type: payment_type });

    res.json({
      payment_id: paymentId,
      confirmation_url: yookassaPayment.confirmation?.confirmation_url || null,
      external_id: yookassaPayment.id,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res, next) => {
  const client = await getClient();
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { event, object } = body;

    logger.info('Payment webhook received', { event, paymentId: object?.id });

    if (event === 'payment.succeeded') {
      await client.query('BEGIN');

      const paymentResult = await client.query('SELECT id, user_id, amount, payment_type, metadata FROM payments WHERE external_id = $1 FOR UPDATE', [object.id]);

      if (paymentResult.rows.length === 0) {
        logger.warn('Payment not found for webhook', { externalId: object.id });
        await client.query('ROLLBACK');
        return res.status(200).json({ ok: true });
      }

      const payment = paymentResult.rows[0];

      if (payment.status === 'succeeded') {
        await client.query('ROLLBACK');
        return res.status(200).json({ ok: true });
      }

      await client.query('UPDATE payments SET status = $1 WHERE id = $2', ['succeeded', payment.id]);

      if (payment.payment_type === 'balance_topup') {
        await client.query('UPDATE users SET balance = balance + $1 WHERE id = $2', [payment.amount, payment.user_id]);
      } else if (payment.payment_type === 'subscription') {
        const meta = payment.metadata;
        if (!meta || !meta.subscription_slug) {
          logger.error('Invalid subscription metadata', { paymentId: payment.id, metadata: meta });
          await client.query('ROLLBACK');
          return res.status(200).json({ ok: true });
        }
        const slug = meta.subscription_slug;
        const period = meta.period || 'monthly';
        const interval = period === 'yearly' ? "365 days" : "30 days";

        const subResult = await client.query('SELECT features FROM subscriptions WHERE slug = $1', [slug]);
        if (subResult.rows.length === 0) {
          logger.error('Subscription not found', { slug, paymentId: payment.id });
          await client.query('ROLLBACK');
          return res.status(200).json({ ok: true });
        }
        const freeOrders = subResult.rows[0]?.features?.free_orders_monthly || 0;

        await client.query(
          `UPDATE users SET subscription_type = $1, subscription_expires = NOW() + $2::interval, free_orders_remaining = $3 WHERE id = $4`,
          [slug, interval, freeOrders, payment.user_id]
        );
      }

      await client.query('COMMIT');
      logger.info('Payment succeeded', { paymentId: payment.id, userId: payment.user_id, amount: payment.amount });
    } else if (event === 'payment.canceled') {
      await query('UPDATE payments SET status = $1 WHERE external_id = $2', ['cancelled', object.id]);
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('Webhook processing error', { error: err.message });
    res.status(200).json({ ok: true });
  } finally {
    client.release();
  }
});

router.get('/history', auth, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, amount, payment_type, status, created_at
       FROM payments
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [req.user.id]
    );
    res.json({ payments: result.rows });
  } catch (err) {
    next(err);
  }
});

function getPaymentDescription(type, amount) {
  const descriptions = {
    balance_topup: `Пополнение баланса на ${amount} ₽`,
    song_order: `Заказ песни — ${amount} ₽`,
    custom_song: `Заказ кастомной песни — ${amount} ₽`,
    subscription: `Оплата подписки — ${amount} ₽`,
  };
  return descriptions[type] || `Оплата ${amount} ₽`;
}

module.exports = router;
