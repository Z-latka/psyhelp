const Consultation = require('../models/consultationModel');
const { validateConsultation, LIMITS } = require('../validators/consultationValidator');
const { CATEGORIES, FORMATS } = require('../utils/helpers');

// Главная: список обращений с фильтром по направлению
exports.list = async (req, res) => {
  const category = typeof req.query.category === 'string' ? req.query.category : '';
  const all = await Consultation.getAll();
  const items = CATEGORIES[category] ? all.filter((c) => c.category === category) : all;

  res.render('index', {
    title: 'Анонимные консультации',
    heading: 'Анонимные консультации',
    items,
    total: all.length,
    categories: CATEGORIES,
    selectedCategory: CATEGORIES[category] ? category : '',
    filterAction: '/',
  });
};

// «Мои обращения»: только записи текущего пользователя
exports.my = async (req, res) => {
  const category = typeof req.query.category === 'string' ? req.query.category : '';
  const mine = await Consultation.getByOwner(req.user.id);
  const items = CATEGORIES[category] ? mine.filter((c) => c.category === category) : mine;

  res.render('index', {
    title: 'Мои обращения',
    heading: 'Мои обращения',
    items,
    total: mine.length,
    categories: CATEGORIES,
    selectedCategory: CATEGORIES[category] ? category : '',
    filterAction: '/my',
  });
};

// Детальная страница: id должен быть положительным целым числом, иначе 404.
// E-mail для связи видит только автор обращения
exports.detail = async (req, res, next) => {
  if (!/^[1-9]\d{0,8}$/.test(req.params.id)) return next();
  const item = await Consultation.getById(Number(req.params.id));
  if (!item) return next();

  const isOwner = Boolean(req.user.isAuth && item.ownerId === req.user.id);
  res.render('item', {
    title: item.title, item, isOwner, created: isOwner && req.query.created === '1',
  });
};

// Данные для шаблона формы (пустой или с ошибками)
function renderForm(res, { values = {}, errors = {} } = {}, status = 200) {
  res.status(status).render('add', {
    title: 'Новое обращение',
    values,
    errors,
    limits: LIMITS,
    categories: CATEGORIES,
    formats: FORMATS,
  });
}

// Форма добавления (данные перечитываются, чтобы сбой файла был виден сразу)
exports.showForm = async (req, res) => {
  await Consultation.load();
  renderForm(res, { values: { anxietyLevel: '5', duration: '45', format: 'chat' } });
};

// Обработка формы: при ошибках — форма с сообщениями (422), иначе сохранение в файл.
// Автор (ownerId, nickname) берётся из сессии, а не из формы
exports.create = async (req, res) => {
  const result = validateConsultation(req.body);

  if (!result.isValid) {
    await Consultation.load();
    return renderForm(res, { values: result.values, errors: result.errors }, 422);
  }

  const { item, duplicate } = await Consultation.create({
    ...result.data, ownerId: req.user.id, nickname: req.user.name,
  });
  if (duplicate) {
    return renderForm(res, {
      values: result.values,
      errors: { title: 'У вас уже есть обращение с такой темой.' },
    }, 422);
  }
  res.redirect(`/item/${item.id}?created=1`);
};
