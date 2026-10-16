const crypto = require('crypto');

const isDev = process.env.NODE_ENV !== 'production';

// 404: ни один маршрут не обработал запрос
function notFoundHandler(req, res) {
  res.status(404).render('404', {
    title: 'Страница не найдена',
    url: req.originalUrl,
  });
}

// Запасная HTML-страница, если сам шаблон 500.ejs не удалось отрендерить
function fallbackHtml(status, errorId) {
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>Ошибка ${status}</title>
<link rel="stylesheet" href="/css/style.css"></head><body><main class="container error-page">
<div class="error-code">${status}</div><h1>Внутренняя ошибка сервера</h1>
<p>Код ошибки: ${errorId}</p><div class="actions"><a class="btn" href="/">На главную</a></div>
</main></body></html>`;
}

// 500: централизованная обработка всех ошибок (4 параметра обязательны)
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status = Number.isInteger(err.status) && err.status >= 400 ? err.status : 500;
  const errorId = crypto.randomBytes(4).toString('hex').toUpperCase();
  const time = new Date();

  console.error(`[${time.toLocaleString('ru-RU')}] ОШИБКА ${status} #${errorId} ${req.method} ${req.originalUrl}`);
  console.error(err.stack || err);

  if (res.headersSent) return next(err);

  const viewData = {
    title: status === 500 ? 'Ошибка сервера' : `Ошибка ${status}`,
    status,
    errorId,
    time,
    message: status === 500 && !isDev ? 'Произошла непредвиденная ошибка.' : err.message,
    stack: isDev ? err.stack : null,
    method: req.method,
    url: req.originalUrl,
    user: req.user || { name: 'Гость', isAuth: false },
    currentPath: req.path,
    formatDate: res.locals.formatDate || ((d) => new Date(d).toLocaleString('ru-RU')),
  };

  res.status(status).render('500', viewData, (renderErr, html) => {
    if (renderErr) {
      console.error('Не удалось отрендерить 500.ejs:', renderErr.message);
      return res.type('html').send(fallbackHtml(status, errorId));
    }
    res.send(html);
  });
}

module.exports = { notFoundHandler, errorHandler };
