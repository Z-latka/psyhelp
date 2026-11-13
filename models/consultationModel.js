const path = require('path');
const { createStore } = require('../utils/jsonStore');

// Обращения хранятся в массиве в памяти; источник и резервная копия — data/consultations.json
const store = createStore({
  file: path.join(__dirname, '..', 'data', 'consultations.json'),
  name: 'обращения',
  isValidRecord: (c) => c && typeof c === 'object'
    && Number.isInteger(c.id) && typeof c.title === 'string' && typeof c.nickname === 'string'
    && typeof c.description === 'string' && typeof c.createdAt === 'string',
});

const byNewest = (a, b) => new Date(b.createdAt) - new Date(a.createdAt);

// Список (новые сверху)
async function getAll() {
  return (await store.all()).sort(byNewest);
}

// Обращения конкретного пользователя
async function getByOwner(ownerId) {
  return (await store.all()).filter((c) => c.ownerId === ownerId).sort(byNewest);
}

// Поиск по id
async function getById(id) {
  return (await store.all()).find((c) => c.id === id) || null;
}

// Псевдонимы авторов старых обращений (считаются занятыми при регистрации)
async function getNicknames() {
  return (await store.all()).map((c) => c.nickname);
}

// Уникальное время создания: при совпадении миллисекунд сдвигаем на 1 мс
function uniqueTimestamp(list) {
  let ts = Date.now();
  const last = list.reduce((max, c) => Math.max(max, new Date(c.createdAt).getTime() || 0), 0);
  if (ts <= last) ts = last + 1;
  return new Date(ts).toISOString();
}

// Создание: дубликат (тот же автор и та же тема) не допускается
function create(data) {
  return store.transact((list) => {
    const t = data.title.toLowerCase();
    if (list.some((c) => c.ownerId === data.ownerId && c.title.toLowerCase() === t)) {
      return { result: { duplicate: true } };
    }
    const id = list.reduce((max, c) => Math.max(max, c.id), 0) + 1;
    const item = { id, ...data, status: 'new', createdAt: uniqueTimestamp(list) };
    return { records: [...list, item], result: { item } };
  });
}

store.init();

module.exports = { getAll, getByOwner, getById, getNicknames, create, load: store.all };
