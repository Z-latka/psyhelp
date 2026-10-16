const Consultation = require('../models/consultationModel');
const { validateConsultation, LIMITS } = require('../validators/consultationValidator');
const { CATEGORIES, FORMATS } = require('../utils/helpers');

// Главная: список обращений с фильтром по направлению
exports.list = (req, res) => {
  const category = typeof req.query.category === 'string' ? req.query.category : '';
  const all = Consultation.getAll();
  const items = CATEGORIES[category] ? all.filter((c) => c.category === category) : all;

  res.render('index', {
    title: 'Анонимные консультации',
    items,
    total: all.length,
    categories: CATEGORIES,
    selectedCategory: CATEGORIES[category] ? category : '',
  });
};

// Детальная страница: id должен быть положительным целым числом, иначе 404
exports.detail = (req, res, next) => {
  if (!/^[1-9]\d{0,8}$/.test(req.params.id)) return next();
  const item = Consultation.getById(Number(req.params.id));
  if (!item) return next();

  res.render('item', { title: item.title, item, created: req.query.created === '1' });
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

// Форма добавления
exports.showForm = (req, res) => {
  renderForm(res, { values: { anxietyLevel: '5', duration: '45', format: 'chat' } });
};

// Обработка формы: при ошибках — форма с сообщениями (422), иначе сохранение в файл
exports.create = async (req, res) => {
  const result = validateConsultation(req.body, { isDuplicate: Consultation.isDuplicate });

  if (!result.isValid) {
    return renderForm(res, { values: result.values, errors: result.errors }, 422);
  }

  const item = await Consultation.create(result.data);
  res.redirect(`/item/${item.id}?created=1`);
};
