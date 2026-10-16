const express = require('express');
const consultations = require('../controllers/consultationController');
const tests = require('../controllers/testController');
const { requireAuth, logout } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

// Обращения: список, детальная, форма добавления (форма — только после входа)
router.get('/', consultations.list);
router.get('/item/:id', consultations.detail);
router.get('/add', requireAuth, consultations.showForm);
router.post('/add', requireAuth, asyncHandler(consultations.create));

// Тесты для самопроверки
router.get('/tests', tests.list);
router.get('/tests/:slug', tests.show);
router.post('/tests/:slug', tests.submit);

// Вход и выход (имитация)
router.get('/login', (req, res) => {
  const next = typeof req.query.next === 'string' && /^\/(?!\/)/.test(req.query.next) ? req.query.next : '/';
  if (req.user.isAuth) return res.redirect(next);
  res.render('login', { title: 'Вход', next });
});
router.get('/logout', logout);

// Демонстрация ошибок: синхронная и асинхронная ошибка → страница 500
router.get('/error-500', () => {
  throw new Error('Демонстрационная ошибка: исключение в синхронном обработчике маршрута.');
});
router.get('/error-500-async', asyncHandler(async () => {
  await new Promise((resolve) => { setTimeout(resolve, 50); });
  throw new Error('Демонстрационная ошибка: отклонённый промис в асинхронном обработчике.');
}));

module.exports = router;
