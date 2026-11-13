// Пользовательская ошибка приложения: понятный текст для страницы вместо системного сообщения.
// Исходная системная ошибка сохраняется в поле cause и пишется только в журнал сервера.
class AppError extends Error {
  constructor({ status = 500, title, message, hint = '', cause = null }) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.title = title;
    this.hint = hint;
    this.cause = cause;
    this.isAppError = true;
  }
}

// Расшифровка системных кодов ошибок файловой системы на русском языке
const FS_REASONS = {
  ENOENT: 'файл или папка не найдены',
  EACCES: 'нет прав доступа (чтение или запись запрещены)',
  EPERM: 'операция запрещена: нет прав или файл доступен только для чтения',
  EISDIR: 'по этому пути находится папка, а не файл',
  ENOTDIR: 'одна из папок в пути заменена файлом',
  EEXIST: 'по этому пути уже существует объект другого типа',
  EBUSY: 'файл занят другой программой',
  ENOSPC: 'на диске закончилось место',
  EROFS: 'файловая система доступна только для чтения',
  EMFILE: 'открыто слишком много файлов',
  ENAMETOOLONG: 'слишком длинный путь к файлу',
};

// Превращает системную ошибку fs в AppError с понятным описанием.
// title — заголовок страницы; action — что не удалось сделать («прочитать файл данных»); file — путь для подсказки
function fromFsError(err, { title, action, file }) {
  const reason = FS_REASONS[err && err.code] || 'непредвиденный сбой файловой системы';
  return new AppError({
    status: 500,
    title,
    message: `Не удалось ${action}: ${reason}.`,
    hint: `Проверьте, что ${file} существует, является файлом и доступен приложению для чтения и записи.`,
    cause: err,
  });
}

module.exports = { AppError, fromFsError, FS_REASONS };
