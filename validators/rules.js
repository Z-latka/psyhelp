// Базовые правила валидации; каждое возвращает текст ошибки или null

// Значение должно быть одной строкой (а не массивом/объектом из подделанной формы)
function toStringValue(value) {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string') return null;
  return value;
}

// Обязательное поле: пустая строка и строка из одних пробелов не принимаются
function required(value, label) {
  if (value === null) return `Поле «${label}» содержит некорректное значение.`;
  if (value.trim() === '') {
    return value.length > 0
      ? `Поле «${label}» не может состоять только из пробелов.`
      : `Поле «${label}» обязательно для заполнения.`;
  }
  return null;
}

// Ограничение длины (в символах, после обрезки пробелов)
function length(value, label, min, max) {
  const len = [...value].length;
  if (len < min) return `Поле «${label}»: минимум ${min} символов (сейчас ${len}).`;
  if (len > max) return `Поле «${label}»: максимум ${max} символов (сейчас ${len}).`;
  return null;
}

// Текст должен содержать хотя бы одну букву (защита от «.....» и «12345»)
function hasLetters(value, label) {
  return /\p{L}/u.test(value) ? null : `Поле «${label}» должно содержать буквы, а не только цифры и знаки.`;
}

// Запрет одного символа, повторённого подряд много раз (например, «аааааа»)
function noRepeatedChars(value, label, limit = 5) {
  const re = new RegExp(`(.)\\1{${limit},}`, 'u');
  return re.test(value) ? `Поле «${label}» содержит слишком много одинаковых символов подряд.` : null;
}

// Целое неотрицательное число в заданном диапазоне
function integerInRange(value, label, min, max) {
  const v = value.trim();
  if (/^[+-]?\d+[.,]\d+$/.test(v)) return `Поле «${label}» должно быть целым числом.`;
  if (/^-\d+$/.test(v)) return `Поле «${label}» не может быть отрицательным.`;
  if (!/^\d+$/.test(v)) return `Поле «${label}» должно содержать только цифры.`;
  const n = Number(v);
  if (n < 0) return `Поле «${label}» не может быть отрицательным.`;
  if (n < min || n > max) return `Поле «${label}» должно быть в диапазоне от ${min} до ${max}.`;
  return null;
}

// Значение из допустимого списка (select, radio)
function oneOf(value, label, allowed) {
  return allowed.includes(value) ? null : `Выберите допустимое значение в поле «${label}».`;
}

// Формат e-mail (упрощённая проверка)
function email(value, label) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value) ? null : `Поле «${label}» должно содержать корректный e-mail.`;
}

module.exports = { toStringValue, required, length, hasLetters, noRepeatedChars, integerInRange, oneOf, email };
