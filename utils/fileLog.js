const fs = require('fs');
const path = require('path');
const { fromFsError } = require('./AppError');

const LOG_DIR = path.join(__dirname, '..', 'logs');
const REQUEST_LOG = path.join(LOG_DIR, 'requests.log');
const ERROR_LOG = path.join(LOG_DIR, 'errors.log');

// Надёжная дозапись строки в файл журнала.
// 1) Папки logs нет (удалена/переименована) — создаём заново.
// 2) Файла нет (удалён/переименован) — appendFileSync создаст новый.
// 3) На месте файла папка, нет прав, файл только для чтения — бросаем AppError с понятным текстом.
function appendLine(file, line) {
  const rel = path.relative(path.join(__dirname, '..'), file).replace(/\\/g, '/');
  const title = 'Ошибка доступа к журналу запросов';

  try {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  } catch (err) {
    throw fromFsError(err, { title, action: 'создать папку журнала logs', file: 'папка logs' });
  }

  // Проверяем тип объекта: подмена файла папкой с тем же именем
  try {
    const stat = fs.statSync(file);
    if (!stat.isFile()) {
      const e = new Error(`${file} is not a file`);
      e.code = stat.isDirectory() ? 'EISDIR' : 'EEXIST';
      throw e;
    }
  } catch (err) {
    if (err.code !== 'ENOENT') throw fromFsError(err, { title, action: `открыть файл журнала ${rel}`, file: `файл ${rel}` });
  }

  try {
    fs.appendFileSync(file, `${line}\n`, 'utf8');
  } catch (err) {
    throw fromFsError(err, { title, action: `записать в файл журнала ${rel}`, file: `файл ${rel}` });
  }
}

// Безопасная запись: никогда не бросает исключение (используется в обработчике ошибок,
// чтобы сбой журнала не помешал показать страницу 500)
function appendLineSafe(file, line) {
  try {
    appendLine(file, line);
    return true;
  } catch (err) {
    console.error(`[журнал недоступен] ${err.message}`);
    return false;
  }
}

module.exports = { appendLine, appendLineSafe, REQUEST_LOG, ERROR_LOG, LOG_DIR };
