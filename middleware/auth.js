const AUTH_COOKIE = 'auth';

// Разбор заголовка Cookie без сторонних библиотек
function parseCookies(header = '') {
  return header.split(';').reduce((acc, part) => {
    const [key, ...rest] = part.trim().split('=');
    if (key) acc[key] = decodeURIComponent(rest.join('='));
    return acc;
  }, {});
}

// Имитация авторизации: ?auth=1 включает вход и запоминается в cookie
function authenticate(req, res, next) {
  const cookies = parseCookies(req.headers.cookie);
  const byQuery = req.query.auth === '1';

  if (byQuery) {
    res.cookie(AUTH_COOKIE, '1', { httpOnly: true, sameSite: 'lax' });
  }

  const isAuth = byQuery || cookies[AUTH_COOKIE] === '1';
  req.user = isAuth
    ? { name: 'Анонимный пользователь', isAuth: true }
    : { name: 'Гость', isAuth: false };

  next();
}

// Защита маршрута: без авторизации — редирект на /login с возвратом обратно
function requireAuth(req, res, next) {
  if (req.user && req.user.isAuth) return next();
  res.redirect(`/login?next=${encodeURIComponent(req.originalUrl)}`);
}

// Выход: удаление cookie авторизации
function logout(req, res) {
  res.clearCookie(AUTH_COOKIE);
  res.redirect('/');
}

module.exports = { authenticate, requireAuth, logout, AUTH_COOKIE };
