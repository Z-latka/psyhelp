const express = require('express');
const consultations = require('../controllers/consultationController');
const tests = require('../controllers/testController');
const auth = require('../controllers/authController');
const { requireAuth, requireGuest } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

// Обращения: список и детальная — всем; форма и «Мои обращения» — только после входа.
// Async-обработчики обёрнуты в asyncHandler: сбой чтения/записи файла данных → страница 500
router.get('/', asyncHandler(consultations.list));
router.get('/item/:id', asyncHandler(consultations.detail));
router.get('/my', requireAuth, asyncHandler(consultations.my));
router.get('/add', requireAuth, asyncHandler(consultations.showForm));
router.post('/add', requireAuth, asyncHandler(consultations.create));

// Тесты для самопроверки
router.get('/tests', tests.list);
router.get('/tests/:slug', tests.show);
router.post('/tests/:slug', tests.submit);

// Анонимная учётная запись: вход по псевдониму и коду, регистрация уникального псевдонима
router.get('/login', requireGuest, auth.showLogin);
router.post('/login', requireGuest, asyncHandler(auth.login));
router.post('/register', requireGuest, asyncHandler(auth.register));
router.get('/welcome', requireAuth, auth.welcome);
router.get('/logout', auth.logout);

module.exports = router;
