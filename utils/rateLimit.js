// Ограничение числа попыток (защита от подбора кода доступа и массовой регистрации).
// Хранится в памяти: ключ (IP) → { count, resetAt }
function createLimiter({ max, windowMs, maxKeys = 10000 }) {
  const hits = new Map();

  // Очистка устаревших записей, чтобы память не росла бесконечно
  function cleanup(now) {
    hits.forEach((v, k) => { if (v.resetAt <= now) hits.delete(k); });
    while (hits.size >= maxKeys) hits.delete(hits.keys().next().value);
  }

  return {
    // Сколько секунд ждать, если лимит исчерпан; 0 — можно продолжать
    retryAfter(key) {
      const v = hits.get(key);
      if (!v || v.resetAt <= Date.now() || v.count < max) return 0;
      return Math.ceil((v.resetAt - Date.now()) / 1000);
    },
    hit(key) {
      const now = Date.now();
      if (hits.size >= maxKeys) cleanup(now);
      const v = hits.get(key);
      if (!v || v.resetAt <= now) hits.set(key, { count: 1, resetAt: now + windowMs });
      else v.count += 1;
    },
    reset(key) { hits.delete(key); },
  };
}

module.exports = { createLimiter };
