const fs = require('fs');
const path = require('path');

// Все ограничения ввода и защиты вынесены в config/limits.json.
// Файл читается один раз при запуске; при ошибке сервер не стартует и сообщает причину,
// чтобы приложение не работало с неизвестными ограничениями.
const FILE = path.join(__dirname, 'limits.json');

// Проверка: целое неотрицательное число
const isCount = (v) => Number.isInteger(v) && v >= 0;
// Проверка диапазона { min, max }: оба числа целые, min не больше max
const isRange = (r) => r && isCount(r.min) && isCount(r.max) && r.min <= r.max;

function fail(reason) {
  console.error(`Ошибка конфигурации: файл config/limits.json ${reason}. Сервер не запущен.`);
  process.exit(1);
}

function load() {
  let raw;
  try {
    raw = fs.readFileSync(FILE, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') return fail('не найден');
    if (err.code === 'EISDIR') return fail('заменён папкой');
    return fail('недоступен для чтения (нет прав доступа)');
  }

  let cfg;
  try {
    cfg = JSON.parse(raw.replace(/^﻿/, ''));
  } catch {
    return fail('повреждён: содержимое не является корректным JSON');
  }

  const c = cfg && cfg.consultation;
  const a = cfg && cfg.account;
  const r = cfg && cfg.request;
  const s = cfg && cfg.security;
  const ok = c && a && r && s
    && ['title', 'age', 'anxietyLevel', 'duration', 'description', 'contactEmail'].every((k) => isRange(c[k]))
    && isCount(c.duration.step) && c.duration.step > 0 && isCount(c.maxRepeatedChars)
    && isRange(a.nickname) && isCount(a.maxRepeatedChars)
    && ['bodyLimitKb', 'maxFormFields', 'maxCookieHeader', 'maxUrlInLog'].every((k) => isCount(r[k]) && r[k] > 0)
    && isCount(s.loginAttempts && s.loginAttempts.max) && isCount(s.loginAttempts.windowMinutes)
    && isCount(s.registrations && s.registrations.max) && isCount(s.registrations.windowMinutes)
    && isCount(s.sessionTtlDays) && isCount(s.maxSessions) && s.maxSessions > 0;

  if (!ok) return fail('имеет неверную структуру или недопустимые значения');
  return Object.freeze(cfg);
}

module.exports = load();
