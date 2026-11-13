const { appendLine, REQUEST_LOG } = require('../utils/fileLog');

// Обрезка длинных URL, чтобы огромный адрес не раздувал журнал
const MAX_URL_IN_LOG = 300;
const shortUrl = (url) => (url.length > MAX_URL_IN_LOG ? `${url.slice(0, MAX_URL_IN_LOG)}…(${url.length} симв.)` : url);

// Логирующее middleware: метод, URL и время запроса пишутся в консоль и в файл logs/requests.log.
// Если файла/папки нет — они создаются; если записать невозможно — ошибка уходит в next(err) → страница 500.
function logger(req, res, next) {
  const startedAt = new Date();
  const start = process.hrtime.bigint();
  const url = shortUrl(req.originalUrl);
  const time = startedAt.toLocaleString('ru-RU');

  // По завершении ответа — статус и длительность в консоль
  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    console.log(`[${time}] ${req.method} ${url} -> ${res.statusCode} (${ms.toFixed(1)} мс)`);
  });

  try {
    appendLine(REQUEST_LOG, `[${startedAt.toISOString()}] ${req.method} ${url} ip=${req.ip}`);
  } catch (err) {
    return next(err);
  }
  next();
}

module.exports = logger;
