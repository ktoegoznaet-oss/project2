const logger = require('../utils/logger');

const errorHandler = (err, req, res, _next) => {
  logger.error(`${req.method} ${req.path} — ${err.message}`, {
    stack: err.stack,
    body: req.body,
    user: req.user?.id,
  });

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Неверный формат JSON' });
  }

  if (err.code === '23505') {
    return res.status(409).json({ error: 'Запись уже существует' });
  }

  if (err.code === '23503') {
    return res.status(400).json({ error: 'Ссылка на несуществующую запись' });
  }

  const status = err.status || err.statusCode || 500;
  const message = status === 500 ? 'Внутренняя ошибка сервера' : err.message;

  res.status(status).json({ error: message });
};

module.exports = errorHandler;
