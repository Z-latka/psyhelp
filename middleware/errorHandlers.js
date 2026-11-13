const crypto = require('crypto');
const { AppError } = require('../utils/AppError');
const { appendLineSafe, ERROR_LOG } = require('../utils/fileLog');
const helpers = require('../utils/helpers');

// 404: ни один маршрут не обработал запрос
function notFoundHandler(req, res) {
  const url = req.originalUrl.length > 200 ? `${req.originalUrl.slice(0, 200)}…` : req.originalUrl;
  res.status(404).render('404', { title: 'Страница не найдена', url });
}

// Перевод любых ошибок в пользовательский вид: системный текст на страницу не попадает
function toUserError(err) {
  if (err && err.isAppError) return err;

  // Ошибки разбора тела запроса (express.urlencoded / express.json)
  switch (err && err.type) {
    case 'entity.too.large':
      return new AppError({
        status: 413,
        title: 'Слишком большой объём данных',
        message: 'Отправленная форма превышает допустимый размер (20 КБ).',
        hint: 'Сократите текст в полях формы и отправьте её снова.',
        cause: err,
      });
    case 'parameters.too.many':
      return new AppError({
        status: 413,
        title: 'Слишком много полей',
        message: 'Запрос содержит слишком много параметров.',
        hint: 'Отправляйте форму только через страницу сайта.',
        cause: err,
      });
    case 'entity.parse.failed':
    case 'encoding.unsupported':
    case 'charset.unsupported':
      return new AppError({
        status: 400,
        title: 'Некорректные данные запроса',
        message: 'Сервер не смог разобрать отправленные данные.',
        hint: 'Обновите страницу и отправьте форму ещё раз.',
        cause: err,
      });
    default:
  }

  // Некорректная кодировка в адресе (например, /item/%E0%A4%A)
  if (err instanceof URIError || (err && err.status === 400)) {
    return new AppError({
      status: 400,
      title: 'Некорректный адрес',
      message: 'Адрес страницы содержит недопустимые символы.',
      hint: 'Проверьте ссылку или вернитесь на главную страницу.',
      cause: err,
    });
  }

  // Любая другая непредвиденная ошибка
  return new AppError({
    status: 500,
    title: 'Внутренняя ошибка сервера',
    message: 'При обработке запроса произошёл непредвиденный сбой.',
    hint: 'Попробуйте повторить запрос позже. Ошибка записана в журнал сервера.',
    cause: err,
  });
}

// Запасная HTML-страница, если сам шаблон 500.ejs не удалось отрендерить
const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));

function fallbackHtml(e, errorId) {
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>Ошибка ${e.status}</title>
<link rel="stylesheet" href="/css/style.css"></head><body><main class="container error-page">
<div class="error-code">${e.status}</div><h1>${escapeHtml(e.title)}</h1>
<p>${escapeHtml(e.message)}</p><p class="muted">${escapeHtml(e.hint)}</p>
<p class="muted">Код ошибки: #${errorId}</p><div class="actions"><a class="btn" href="/">На главную</a></div>
</main></body></html>`;
}

// 500: централизованная обработка всех ошибок (4 параметра обязательны).
// Порядок действий построен так, чтобы страница 500 открылась даже при сбое журнала:
// 1) логирование в консоль (всегда работает) и в файл (сбой игнорируется);
// 2) рендер 500.ejs; 3) при ошибке рендера — запасной HTML.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const e = toUserError(err);
  const errorId = crypto.randomBytes(4).toString('hex').toUpperCase();
  const time = new Date();
  const cause = e.cause || err;
  const tech = cause && cause !== e ? `${cause.code ? `${cause.code} ` : ''}${cause.message}` : '';

  // Технические подробности — только в журнал, пользователю не показываются
  const line = `[${time.toISOString()}] #${errorId} ${e.status} ${req.method} ${req.originalUrl.slice(0, 300)} | ${e.message}${tech ? ` | ${tech}` : ''}`;
  console.error(`ОШИБКА ${line}`);
  if (e.status >= 500 && cause && cause.stack) console.error(cause.stack);
  const logged = appendLineSafe(ERROR_LOG, line);

  if (res.headersSent) return req.socket.destroy();

  const viewData = {
    title: e.title,
    status: e.status,
    errorTitle: e.title,
    message: e.message,
    hint: e.hint,
    errorId,
    time,
    logged,
    method: req.method,
    url: req.originalUrl.length > 200 ? `${req.originalUrl.slice(0, 200)}…` : req.originalUrl,
    // Данные для шапки на случай, если ошибка возникла до middleware viewLocals
    user: req.user || { name: 'Гость', isAuth: false },
    currentPath: req.path || '/',
    formatDate: helpers.formatDate,
  };

  res.status(e.status);
  res.render('500', viewData, (renderErr, html) => {
    if (renderErr) {
      console.error('Не удалось отрендерить 500.ejs:', renderErr.message);
      return res.type('html').send(fallbackHtml(e, errorId));
    }
    res.send(html);
  });
}

module.exports = { notFoundHandler, errorHandler, toUserError };
