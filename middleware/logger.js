// Логирование запроса: время, метод, URL, статус ответа и длительность обработки
function logger(req, res, next) {
  const startedAt = new Date();
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    const time = startedAt.toLocaleString('ru-RU');
    console.log(`[${time}] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${ms.toFixed(1)} мс)`);
  });

  next();
}

module.exports = logger;
