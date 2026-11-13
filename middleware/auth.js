const sessions = require('../utils/sessions');

const MAX_COOKIE_HEADER = require('../config/limits').request.maxCookieHeader;

// Разбор заголовка Cookie без сторонних библиотек.
// Битая кодировка (%E0%A4%A) или слишком длинный заголовок не должны ронять запрос
function parseCookies(header = '') {
  if (typeof header !== 'string' || header.length > MAX_COOKIE_HEADER) return {};
  return header.split(';').reduce((acc, part) => {
    const [key, ...rest] = part.trim().split('=');
    if (!key) return acc;
    try {
      acc[key] = decodeURIComponent(rest.join('='));
    } catch {
      acc[key] = '';
    }
    return acc;
  }, {});
}

// Middleware авторизации: по cookie сессии определяет пользователя.
// Нет сессии (или она подделана/истекла) — req.user = { name: 'Гость' }
function authenticate(req, res, next) {
  const token = parseCookies(req.headers.cookie)[sessions.SESSION_COOKIE];
  const session = sessions.get(token);

  req.sessionToken = session ? token : null;
  req.session = session;
  req.user = session
    ? { id: session.userId, name: session.nickname, isAuth: true }
    : { name: 'Гость', isAuth: false };

  next();
}

// Защита маршрута: без входа — редирект на /login с возвратом на исходную страницу
function requireAuth(req, res, next) {
  if (req.user && req.user.isAuth) return next();
  const back = req.originalUrl.length <= 200 ? req.originalUrl : '/';
  res.redirect(`/login?next=${encodeURIComponent(back)}`);
}

// Обратная защита: вошедшему пользователю не нужны страницы входа/регистрации
function requireGuest(req, res, next) {
  if (req.user && req.user.isAuth) return res.redirect('/my');
  next();
}

// Безопасный адрес возврата: только локальный путь разумной длины (защита от open redirect)
function safeNext(raw) {
  return typeof raw === 'string' && raw.length <= 200 && /^\/(?![/\\])/.test(raw) ? raw : '/my';
}

module.exports = { authenticate, requireAuth, requireGuest, safeNext, parseCookies };
