const path = require('path');
const crypto = require('crypto');
const { createStore } = require('../utils/jsonStore');

// Анонимные учётные записи: псевдоним + секретный код доступа (хранится только хеш)
const store = createStore({
  file: path.join(__dirname, '..', 'data', 'users.json'),
  name: 'учётные записи',
  isValidRecord: (u) => u && typeof u === 'object' && Number.isInteger(u.id)
    && typeof u.nickname === 'string' && typeof u.key === 'string'
    && typeof u.salt === 'string' && typeof u.codeHash === 'string',
});

// Похожие латинские буквы → кириллица: «Tихий» (с латинской T) и «Тихий» считаются одинаковыми
const HOMOGLYPHS = {
  a: 'а', b: 'в', c: 'с', e: 'е', h: 'н', k: 'к', m: 'м', o: 'о', p: 'р', t: 'т', x: 'х', y: 'у', ё: 'е',
};

// Ключ уникальности псевдонима: регистр, пробелы, «_» и «-», похожие буквы не учитываются
function nicknameKey(nickname) {
  return nickname
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\s_-]+/g, '')
    .replace(/[abcehkmoptxyё]/g, (ch) => HOMOGLYPHS[ch]);
}

// Код доступа: 8 символов без похожих (нет 0/O, 1/I/L), формат XXXX-XXXX
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function generateCode() {
  let s = '';
  for (let i = 0; i < 8; i += 1) s += CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)];
  return `${s.slice(0, 4)}-${s.slice(4)}`;
}

// Нормализация введённого кода: регистр, пробелы и дефисы не важны
const normalizeCode = (code) => code.toUpperCase().replace(/[\s-]/g, '');

const hashCode = (code, salt) => crypto.scryptSync(normalizeCode(code), salt, 32).toString('hex');

// Регистрация: псевдоним не должен совпадать ни с учётной записью, ни с автором старых обращений
async function register(nickname, reservedNicknames = []) {
  const key = nicknameKey(nickname);
  const reserved = new Set(reservedNicknames.map(nicknameKey));

  return store.transact((list) => {
    if (reserved.has(key) || list.some((u) => u.key === key)) return { result: { taken: true } };

    const code = generateCode();
    const salt = crypto.randomBytes(16).toString('hex');
    const user = {
      id: list.reduce((max, u) => Math.max(max, u.id), 0) + 1,
      nickname,
      key,
      salt,
      codeHash: hashCode(code, salt),
      createdAt: new Date().toISOString(),
    };
    return { records: [...list, user], result: { user, code } };
  });
}

// Проверка псевдонима и кода; сравнение хешей за постоянное время
async function verify(nickname, code) {
  const key = nicknameKey(nickname);
  const user = (await store.all()).find((u) => u.key === key);
  // Для несуществующего псевдонима тоже считаем хеш — время ответа не выдаёт, есть ли такой пользователь
  const salt = user ? user.salt : '00000000000000000000000000000000';
  const actual = Buffer.from(hashCode(code, salt), 'hex');
  const expected = Buffer.from(user ? user.codeHash : '0'.repeat(64), 'hex');
  return user && crypto.timingSafeEqual(actual, expected) ? user : null;
}

async function getById(id) {
  return (await store.all()).find((u) => u.id === id) || null;
}

store.init();

module.exports = { register, verify, getById, nicknameKey, normalizeCode, CODE_ALPHABET };
