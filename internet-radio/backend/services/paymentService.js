const fetch = require('node-fetch');
const logger = require('../utils/logger');

const YOOKASSA_API = 'https://api.yookassa.ru/v3';

const getAuth = () => {
  const shopId = process.env.YOOKASSA_SHOP_ID;
  const secret = process.env.YOOKASSA_SECRET;
  return 'Basic ' + Buffer.from(`${shopId}:${secret}`).toString('base64');
};

const createPayment = async ({ amount, description, paymentId, userId, metadata = {} }) => {
  try {
    const { v4: uuidv4 } = require('uuid');
    const idempotenceKey = uuidv4();

    const body = {
      amount: {
        value: amount.toFixed(2),
        currency: 'RUB',
      },
      confirmation: {
        type: 'redirect',
        return_url: process.env.YOOKASSA_RETURN_URL || 'http://localhost:3001/payment/success',
      },
      capture: true,
      description,
      metadata: {
        internal_payment_id: paymentId,
        user_id: userId,
        ...metadata,
      },
    };

    const response = await fetch(`${YOOKASSA_API}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': getAuth(),
        'Idempotence-Key': idempotenceKey,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('YooKassa payment creation failed', { status: response.status, body: errorText });
      throw new Error(`YooKassa error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    logger.info('YooKassa payment created', { paymentId: data.id, amount, status: data.status });
    return data;
  } catch (err) {
    logger.error('Payment creation error', { error: err.message });
    throw err;
  }
};

const getPayment = async (externalId) => {
  try {
    const response = await fetch(`${YOOKASSA_API}/payments/${externalId}`, {
      headers: {
        'Authorization': getAuth(),
      },
    });

    if (!response.ok) {
      throw new Error(`YooKassa get payment error: ${response.status}`);
    }

    return await response.json();
  } catch (err) {
    logger.error('Get payment error', { error: err.message, externalId });
    throw err;
  }
};

const createRefund = async (externalId, amount) => {
  try {
    const { v4: uuidv4 } = require('uuid');

    const response = await fetch(`${YOOKASSA_API}/refunds`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': getAuth(),
        'Idempotence-Key': uuidv4(),
      },
      body: JSON.stringify({
        payment_id: externalId,
        amount: {
          value: amount.toFixed(2),
          currency: 'RUB',
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`YooKassa refund error: ${response.status}`);
    }

    const data = await response.json();
    logger.info('Refund created', { refundId: data.id, amount });
    return data;
  } catch (err) {
    logger.error('Refund creation error', { error: err.message });
    throw err;
  }
};

module.exports = { createPayment, getPayment, createRefund };
