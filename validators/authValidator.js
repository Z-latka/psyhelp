const rules = require('./rules');
const { normalizeCode, CODE_ALPHABET } = require('../models/userModel');

const NICKNAME = { min: 3, max: 30 };
const singleLine = (s) => s.trim().replace(/\s+/g, ' ');

function runChain(value, checks) {
  for (const check of checks) {
    const error = check(value);
    if (error) return error;
  }
  return null;
}

// Псевдоним: 3–30 символов, буквы/цифры/пробел/«_»/«-», обязательно есть буква,
// без служебных символов и длинных повторов
function validateNickname(rawValue) {
  const raw = rules.toStringValue(rawValue);
  const label = 'Псевдоним';
  const error = runChain(raw, [
    (v) => rules.required(v, label),
    (v) => rules.maxRawLength(v, label, NICKNAME.max * 2),
    (v) => rules.noControlChars(v, label),
    (v) => rules.length(singleLine(v), label, NICKNAME.min, NICKNAME.max),
    (v) => (/^[\p{L}\d _-]+$/u.test(singleLine(v)) ? null
      : `Поле «${label}» может содержать только буквы, цифры, пробел, «_» и «-».`),
    (v) => rules.hasLetters(v, label),
    (v) => rules.noRepeatedChars(v, label, 3),
    // Смешение алфавитов в одном слове — частый способ выдать себя за другого («Tихий»)
    (v) => (/\p{Script=Latin}/u.test(v) && /\p{Script=Cyrillic}/u.test(v)
      ? `Поле «${label}» не должно смешивать русские и латинские буквы.` : null),
  ]);
  return { error, value: error ? '' : singleLine(raw), echo: (raw || '').replace(/[^\P{Cc}]/gu, '').slice(0, 60) };
}

// Код доступа: 8 символов из допустимого алфавита (дефисы и пробелы игнорируются)
function validateCode(rawValue) {
  const raw = rules.toStringValue(rawValue);
  const label = 'Код доступа';
  const error = runChain(raw, [
    (v) => rules.required(v, label),
    (v) => rules.maxRawLength(v, label, 20),
    (v) => (new RegExp(`^[${CODE_ALPHABET}]{8}$`).test(normalizeCode(v)) ? null
      : `Поле «${label}» должно содержать 8 символов в формате XXXX-XXXX (латинские буквы и цифры).`),
  ]);
  return { error, value: error ? '' : normalizeCode(raw) };
}

module.exports = { validateNickname, validateCode, NICKNAME };
