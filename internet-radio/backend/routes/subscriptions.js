const express = require('express');
const { query } = require('../config/database');
const { auth } = require('../middleware/auth');
const paymentService = require('../services/paymentService');
const logger = require('../utils/logger');
const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const result = await query('SELECT id, name, slug, price_monthly, price_yearly, features FROM subscriptions WHERE is_active = TRUE ORDER BY price_monthly ASC');
    res.json({ subscriptions: result.rows });
  } catch (err) {
    next(err);
  }
});

router.post('/purchase', auth, async (req, res, next) => {
  try {
    const { subscription_slug, period = 'monthly' } = req.body;

    if (!subscription_slug) {
      return res.status(400).json({ error: 'Укажите subscription_slug' });
    }

    if (!['monthly', 'yearly'].includes(period)) {
      return res.status(400).json({ error: 'Период: monthly или yearly' });
    }

    const subResult = await query('SELECT id, name, slug, price_monthly, price_yearly, features FROM subscriptions WHERE slug = $1 AND is_active = TRUE', [subscription_slug]);
    if (subResult.rows.length === 0) {
      return res.status(404).json({ error: 'Подписка не найдена' });
    }

    const sub = subResult.rows[0];
    const amount = period === 'yearly' ? parseFloat(sub.price_yearly) : parseFloat(sub.price_monthly);

    const paymentResult = await query(
      `INSERT INTO payments (user_id, amount, payment_type, metadata)
       VALUES ($1, $2, 'subscription', $3)
       RETURNING id`,
      [req.user.id, amount, JSON.stringify({ subscription_slug, subscription_name: sub.name, period })]
    );
    const paymentId = paymentResult.rows[0].id;

    const yookassaPayment = await paymentService.createPayment({
      amount,
      description: `Подписка ${sub.name} (${period === 'yearly' ? 'год' : 'месяц'}) — ${amount} ₽`,
      paymentId,
      userId: req.user.id,
      metadata: { payment_type: 'subscription', subscription_slug, period },
    });

    await query('UPDATE payments SET external_id = $1, status = $2 WHERE id = $3', [yookassaPayment.id, 'waiting_for_capture', paymentId]);

    logger.info('Subscription purchase initiated', { userId: req.user.id, subscription: sub.name, period, amount });

    res.json({
      payment_id: paymentId,
      confirmation_url: yookassaPayment.confirmation?.confirmation_url || null,
      subscription: sub.name,
      amount,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/my', auth, async (req, res, next) => {
  try {
    const user = req.user;

    if (!user.subscription_type) {
      return res.json({ subscription: null });
    }

    const subResult = await query('SELECT name, slug, features FROM subscriptions WHERE slug = $1', [user.subscription_type]);
    const sub = subResult.rows[0] || null;

    res.json({
      subscription: sub ? {
        name: sub.name,
        slug: sub.slug,
        features: sub.features,
        expires: user.subscription_expires,
        free_orders_remaining: user.free_orders_remaining,
      } : null,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
