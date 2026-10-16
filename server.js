const path = require('path');
const express = require('express');

const logger = require('./middleware/logger');
const { authenticate } = require('./middleware/auth');
const viewLocals = require('./middleware/viewLocals');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandlers');
const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 3000;

// Настройка шаблонизатора EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.disable('x-powered-by');

// Статика: подключается первой, чтобы CSS/JS отдавались без лишней обработки
app.use(express.static(path.join(__dirname, 'public')));

// Разбор тела запроса (формы и JSON) с ограничением размера
app.use(express.urlencoded({ extended: false, limit: '20kb' }));
app.use(express.json({ limit: '20kb' }));

// Кастомные middleware: логирование, имитация авторизации, общие данные для шаблонов
app.use(logger);
app.use(authenticate);
app.use(viewLocals);

// Маршруты приложения
app.use('/', routes);

// Обработка ошибок: 404 и 500 строго после всех маршрутов
app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Сервер запущен: http://localhost:${PORT}`);
});
