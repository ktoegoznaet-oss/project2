const express = require('express');
const { query } = require('../config/database');
const { optionalAuth } = require('../middleware/auth');
const router = express.Router();

router.get('/history', optionalAuth, async (req, res, next) => {
  try {
    const { limit = 50, before } = req.query;
    const params = [Math.min(100, parseInt(limit))];
    let whereClause = '';

    if (before) {
      params.push(before);
      whereClause = `WHERE cm.created_at < $${params.length}`;
    }

    const result = await query(
      `SELECT cm.id, cm.message, cm.is_bot, cm.message_type, cm.created_at,
              u.username, u.role
       FROM chat_messages cm
       LEFT JOIN users u ON cm.user_id = u.id
       ${whereClause}
       ORDER BY cm.created_at DESC
       LIMIT $1`,
      params
    );

    res.json({ messages: result.rows.reverse() });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
