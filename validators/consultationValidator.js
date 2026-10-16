const rules = require('./rules');
const { CATEGORIES, FORMATS } = require('../utils/helpers');

// Ограничения полей формы (используются и в валидаторе, и в шаблоне формы)
const LIMITS = {
  title: { min: 5, max: 100 },
  nickname: { min: 2, max: 30 },
  age: { min: 14, max: 100 },
  anxietyLevel: { min: 0, max: 10 },
  duration: { min: 15, max: 120 },
  description: { min: 20, max: 1000 },
  contactEmail: { max: 100 },
};

// Нормализация строк: обрезка краёв, схлопывание повторных пробелов
const singleLine = (s) => s.trim().replace(/\s+/g, ' ');
const multiLine = (s) => s.replace(/\r\n?/g, '\n').trim().replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n');

// Проверка поля по цепочке правил: возвращается первая найденная ошибка
function runChain(value, checks) {
  for (const check of checks) {
    const error = check(value);
    if (error) return error;
  }
  return null;
}

// Валидация формы обращения: возвращает очищенные данные и ошибки по полям
function validateConsultation(body, { isDuplicate } = {}) {
  const raw = {};
  ['title', 'nickname', 'category', 'format', 'age', 'anxietyLevel', 'duration', 'description', 'contactEmail', 'agree']
    .forEach((key) => { raw[key] = rules.toStringValue(body[key]); });

  const errors = {};
  const L = LIMITS;

  // Тема обращения
  errors.title = runChain(raw.title, [
    (v) => rules.required(v, 'Тема обращения'),
    (v) => rules.length(singleLine(v), 'Тема обращения', L.title.min, L.title.max),
    (v) => rules.hasLetters(v, 'Тема обращения'),
    (v) => rules.noRepeatedChars(v, 'Тема обращения'),
  ]);

  // Анонимный псевдоним: буквы, цифры, пробел, «_» и «-»
  errors.nickname = runChain(raw.nickname, [
    (v) => rules.required(v, 'Псевдоним'),
    (v) => rules.length(singleLine(v), 'Псевдоним', L.nickname.min, L.nickname.max),
    (v) => (/^[\p{L}\d _-]+$/u.test(singleLine(v)) ? null
      : 'Поле «Псевдоним» может содержать только буквы, цифры, пробел, «_» и «-».'),
    (v) => rules.hasLetters(v, 'Псевдоним'),
  ]);

  // Направление и формат: только значения из справочников
  errors.category = runChain(raw.category, [
    (v) => rules.required(v, 'Направление'),
    (v) => rules.oneOf(v, 'Направление', Object.keys(CATEGORIES)),
  ]);
  errors.format = runChain(raw.format, [
    (v) => rules.required(v, 'Формат консультации'),
    (v) => rules.oneOf(v, 'Формат консультации', Object.keys(FORMATS)),
  ]);

  // Числовые поля: целые, неотрицательные, в допустимом диапазоне
  errors.age = runChain(raw.age, [
    (v) => rules.required(v, 'Возраст'),
    (v) => rules.integerInRange(v, 'Возраст', L.age.min, L.age.max),
  ]);
  errors.anxietyLevel = runChain(raw.anxietyLevel, [
    (v) => rules.required(v, 'Уровень тревоги'),
    (v) => rules.integerInRange(v, 'Уровень тревоги', L.anxietyLevel.min, L.anxietyLevel.max),
  ]);
  errors.duration = runChain(raw.duration, [
    (v) => rules.required(v, 'Длительность'),
    (v) => rules.integerInRange(v, 'Длительность', L.duration.min, L.duration.max),
    (v) => (Number(v.trim()) % 15 === 0 ? null : 'Поле «Длительность» должно быть кратно 15 минутам.'),
  ]);

  // Описание ситуации
  errors.description = runChain(raw.description, [
    (v) => rules.required(v, 'Описание ситуации'),
    (v) => rules.length(multiLine(v), 'Описание ситуации', L.description.min, L.description.max),
    (v) => rules.hasLetters(v, 'Описание ситуации'),
    (v) => rules.noRepeatedChars(v, 'Описание ситуации'),
  ]);

  // E-mail необязателен, но если введён — проверяется формат и длина
  errors.contactEmail = runChain(raw.contactEmail, [
    (v) => (v === null ? 'Поле «E-mail» содержит некорректное значение.' : null),
    (v) => (v.trim() === '' ? 'SKIP' : null),
    (v) => rules.length(v.trim(), 'E-mail', 0, L.contactEmail.max),
    (v) => rules.email(v.trim(), 'E-mail'),
  ]);
  if (errors.contactEmail === 'SKIP') errors.contactEmail = null;

  // Согласие с правилами сервиса
  errors.agree = raw.agree === 'on' ? null : 'Необходимо подтвердить согласие с правилами сервиса.';

  // Очищенные данные для сохранения
  const data = {
    title: singleLine(raw.title || ''),
    nickname: singleLine(raw.nickname || ''),
    category: raw.category || '',
    format: raw.format || '',
    age: Number((raw.age || '').trim()),
    anxietyLevel: Number((raw.anxietyLevel || '').trim()),
    duration: Number((raw.duration || '').trim()),
    description: multiLine(raw.description || ''),
    contactEmail: (raw.contactEmail || '').trim().toLowerCase(),
  };

  // Дубликат: такой же псевдоним и тема уже есть
  if (!errors.title && !errors.nickname && isDuplicate && isDuplicate(data.nickname, data.title)) {
    errors.title = 'Обращение с такой темой от этого псевдонима уже существует.';
  }

  Object.keys(errors).forEach((k) => { if (!errors[k]) delete errors[k]; });

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    data,
    values: Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, v || ''])),
  };
}

module.exports = { validateConsultation, LIMITS };
