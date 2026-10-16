const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data', 'consultations.json');

// Массив обращений в памяти; источник данных — JSON-файл
let consultations = [];

// Загрузка данных из файла при старте (файла нет — создаём пустой)
function load() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(DATA_FILE, '[]', 'utf8');
  }
  const raw = fs.readFileSync(DATA_FILE, 'utf8');
  const parsed = JSON.parse(raw || '[]');
  if (!Array.isArray(parsed)) throw new Error('Файл данных должен содержать массив');
  consultations = parsed;
}

// Атомарная запись: сначала во временный файл, затем переименование
async function save() {
  const tmp = `${DATA_FILE}.tmp`;
  await fs.promises.writeFile(tmp, JSON.stringify(consultations, null, 2), 'utf8');
  await fs.promises.rename(tmp, DATA_FILE);
}

// Чтение: список (новые сверху) и поиск по id
function getAll() {
  return [...consultations].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function getById(id) {
  return consultations.find((c) => c.id === id) || null;
}

// Проверка дубликата: тот же псевдоним и та же тема обращения
function isDuplicate(nickname, title) {
  const n = nickname.toLowerCase();
  const t = title.toLowerCase();
  return consultations.some((c) => c.nickname.toLowerCase() === n && c.title.toLowerCase() === t);
}

// Уникальное время создания: при совпадении миллисекунд сдвигаем на 1 мс
function uniqueTimestamp() {
  let ts = Date.now();
  const last = consultations.reduce((max, c) => Math.max(max, new Date(c.createdAt).getTime()), 0);
  if (ts <= last) ts = last + 1;
  return new Date(ts).toISOString();
}

// Создание записи и сохранение в файл
async function create(data) {
  const id = consultations.reduce((max, c) => Math.max(max, c.id), 0) + 1;
  const item = { id, ...data, status: 'new', createdAt: uniqueTimestamp() };
  consultations.push(item);
  try {
    await save();
  } catch (err) {
    consultations.pop();
    throw err;
  }
  return item;
}

load();

module.exports = { getAll, getById, create, isDuplicate };
