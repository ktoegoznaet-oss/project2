const crypto = require('crypto');

const generateToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

const fileHash = (buffer) => {
  return crypto.createHash('sha256').update(buffer).digest('hex');
};

const formatDuration = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const calculateOrderPrice = (basePrice, subscription) => {
  if (!subscription) return basePrice;

  const discounts = {
    basic: 0.10,
    premium: 0.25,
    vip: 0.40,
  };

  const discount = discounts[subscription] || 0;
  return Math.round(basePrice * (1 - discount) * 100) / 100;
};

const calculateCustomSongPrice = (airCount, subscription) => {
  const basePrice = 2000;
  const extraPlayPrice = 200;
  let total = basePrice + Math.max(0, airCount - 1) * extraPlayPrice;

  if (subscription) {
    const discounts = {
      basic: 0,
      premium: 0.15,
      vip: 0.30,
    };
    const discount = discounts[subscription] || 0;
    total = Math.round(total * (1 - discount) * 100) / 100;
  }

  return total;
};

const sanitizeInput = (str) => {
  if (typeof str !== 'string') return '';
  return str.replace(/[<>]/g, '').trim();
};

module.exports = { generateToken, fileHash, formatDuration, calculateOrderPrice, calculateCustomSongPrice, sanitizeInput };
