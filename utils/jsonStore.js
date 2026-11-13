const fs = require('fs');
const path = require('path');
const { AppError, fromFsError } = require('./AppError');

const ROOT = path.join(__dirname, '..');

// Общая очередь операций для всех хранилищ: чтение/запись выполняются строго по одной,
// поэтому одновременные запросы не портят файлы и не создают дубликатов
let queue = Promise.resolve();
function serialize(fn) {
  const run = queue.then(fn, fn);
  queue = run.catch(() => {});
  return run;
}

// Хранилище «таблицы» в JSON-файле (роль базы данных).
// Массив в памяти — рабочая копия; файл перечитывается при каждом обращении,
// поэтому повреждение файла или запрет доступа сразу приводят к странице 500.
function createStore({ file, name, isValidRecord }) {
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  const tmp = `${file}.tmp`;
  const title = 'Ошибка доступа к хранилищу данных';
  const fileLabel = `файл ${rel}`;
  let records = [];

  // Атомарная запись: сначала во временный файл, затем переименование
  async function write(list) {
    try {
      await fs.promises.mkdir(path.dirname(file), { recursive: true });
      await fs.promises.writeFile(tmp, JSON.stringify(list, null, 2), 'utf8');
      await fs.promises.rename(tmp, file);
    } catch (err) {
      throw fromFsError(err, { title, action: `сохранить ${name} в файл ${rel}`, file: fileLabel });
    }
  }

  // Чтение файла в массив; удалённый файл восстанавливается из копии в памяти
  async function load() {
    let raw;
    try {
      raw = await fs.promises.readFile(file, 'utf8');
    } catch (err) {
      if (err.code === 'ENOENT') {
        console.warn(`[данные] ${rel} не найден — создаётся заново из копии в памяти (${records.length} зап.)`);
        await write(records);
        return;
      }
      throw fromFsError(err, { title, action: `прочитать ${name} из файла ${rel}`, file: fileLabel });
    }

    let parsed;
    try {
      parsed = JSON.parse(raw.replace(/^﻿/, '') || '[]');
    } catch (err) {
      throw new AppError({
        title: 'Ошибка чтения данных',
        message: `Файл ${rel} повреждён: содержимое не является корректным JSON.`,
        hint: `Восстановите ${rel} из резервной копии или исправьте его содержимое.`,
        cause: err,
      });
    }
    if (!Array.isArray(parsed) || !parsed.every(isValidRecord)) {
      throw new AppError({
        title: 'Ошибка структуры данных',
        message: `Файл ${rel} имеет неверную структуру: ожидается массив записей (${name}).`,
        hint: `Проверьте содержимое ${rel}.`,
      });
    }
    records = parsed;
  }

  return {
    // Актуальная копия всех записей (после перечитывания файла)
    all: () => serialize(async () => { await load(); return [...records]; }),
    // Изменение внутри очереди: fn получает актуальный массив и возвращает
    // { records: новыйМассив, result } или { result } без изменений
    transact: (fn) => serialize(async () => {
      await load();
      const out = await fn([...records]);
      if (out && out.records) {
        await write(out.records);
        records = out.records;
      }
      return out ? out.result : undefined;
    }),
    // Первичная загрузка при старте: ошибка не роняет сервер
    init: () => serialize(load).catch((err) => console.error(`[данные] ${rel}: ${err.message}`)),
  };
}

module.exports = { createStore };
