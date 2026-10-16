// Справочники: направления консультаций и форматы связи
const CATEGORIES = {
  anxiety: 'Тревога и стресс',
  mood: 'Настроение и апатия',
  relations: 'Отношения и семья',
  study: 'Учёба и работа',
  selfesteem: 'Самооценка',
  other: 'Другое',
};

const FORMATS = {
  chat: 'Текстовый чат',
  audio: 'Аудиозвонок',
  video: 'Видеозвонок',
};

// Дата с миллисекундами: делает время создания каждой записи визуально уникальным
function formatDate(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  const pad = (n, l = 2) => String(n).padStart(l, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} `
    + `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
}

const categoryLabel = (key) => CATEGORIES[key] || key;
const formatLabel = (key) => FORMATS[key] || key;

// Склонение слов по числу: 1 обращение, 2 обращения, 5 обращений
function pluralize(n, one, few, many) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

module.exports = { CATEGORIES, FORMATS, formatDate, categoryLabel, formatLabel, pluralize };
