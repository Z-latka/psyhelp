const User = require('../models/userModel');
const Consultation = require('../models/consultationModel');
const sessions = require('../utils/sessions');
const { createLimiter } = require('../utils/rateLimit');
const { validateNickname, validateCode, NICKNAME } = require('../validators/authValidator');
const { safeNext } = require('../middleware/auth');
const { AppError } = require('../utils/AppError');

// Защита от подбора: 10 неудачных входов за 15 минут с одного IP; регистраций — 5 в час
const loginLimiter = createLimiter({ max: 10, windowMs: 15 * 60 * 1000 });
const registerLimiter = createLimiter({ max: 5, windowMs: 60 * 60 * 1000 });

const cookieOptions = { httpOnly: true, sameSite: 'lax', maxAge: sessions.TTL_MS };

function tooManyAttempts(seconds, what) {
  return new AppError({
    status: 429,
    title: 'Слишком много попыток',
    message: `Превышено число попыток ${what}.`,
    hint: `Повторите через ${Math.ceil(seconds / 60)} мин.`,
  });
}

// Страница входа: две формы — «Войти» и «Получить новый псевдоним»
function renderLogin(req, res, data = {}, status = 200) {
  res.status(status).render('login', {
    title: 'Вход',
    next: safeNext(req.body && req.body.next !== undefined ? req.body.next : req.query.next),
    limits: NICKNAME,
    login: { values: {}, errors: {} },
    register: { values: {}, errors: {} },
    ...data,
  });
}

exports.showLogin = (req, res) => renderLogin(req, res);

// Вход: псевдоним + код доступа
exports.login = async (req, res) => {
  const wait = loginLimiter.retryAfter(req.ip);
  if (wait) throw tooManyAttempts(wait, 'входа');

  const nick = validateNickname(req.body.nickname);
  const code = validateCode(req.body.code);
  const errors = {};
  if (nick.error) errors.nickname = nick.error;
  if (code.error) errors.code = code.error;

  let user = null;
  if (!nick.error && !code.error) {
    user = await User.verify(nick.value, code.value);
    // Одно сообщение для обоих случаев: нельзя выяснить, существует ли псевдоним
    if (!user) errors.code = 'Неверный псевдоним или код доступа.';
  }

  if (!user) {
    loginLimiter.hit(req.ip);
    return renderLogin(req, res, { login: { values: { nickname: nick.echo }, errors } }, 422);
  }

  loginLimiter.reset(req.ip);
  sessions.destroy(req.sessionToken);
  res.cookie(sessions.SESSION_COOKIE, sessions.create(user), cookieOptions);
  res.redirect(safeNext(req.body.next));
};

// Регистрация: уникальный псевдоним → новый код доступа (показывается один раз)
exports.register = async (req, res) => {
  const wait = registerLimiter.retryAfter(req.ip);
  if (wait) throw tooManyAttempts(wait, 'регистрации');

  const nick = validateNickname(req.body.nickname);
  if (nick.error) {
    return renderLogin(req, res, { register: { values: { nickname: nick.echo }, errors: { nickname: nick.error } } }, 422);
  }

  const reserved = await Consultation.getNicknames();
  const { taken, user, code } = await User.register(nick.value, reserved);
  if (taken) {
    return renderLogin(req, res, {
      register: { values: { nickname: nick.echo }, errors: { nickname: 'Этот псевдоним (или очень похожий на него) уже занят. Выберите другой.' } },
    }, 422);
  }

  registerLimiter.hit(req.ip);
  const token = sessions.create(user);
  sessions.get(token).flash = { code, next: safeNext(req.body.next) };
  res.cookie(sessions.SESSION_COOKIE, token, cookieOptions);
  res.redirect('/welcome');
};

// Однократный показ кода доступа после регистрации (после обновления страницы код не показывается)
exports.welcome = (req, res) => {
  const flash = req.session && req.session.flash;
  if (!flash) return res.redirect('/my');
  req.session.flash = null;
  res.set('Cache-Control', 'no-store');
  res.render('welcome', { title: 'Ваш код доступа', code: flash.code, next: flash.next });
};

// Выход: удаление сессии на сервере и cookie в браузере
exports.logout = (req, res) => {
  sessions.destroy(req.sessionToken);
  res.clearCookie(sessions.SESSION_COOKIE);
  res.redirect('/');
};
