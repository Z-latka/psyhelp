const path = require('path');
const express = require('express');

const logger = require('./middleware/logger');
const { authenticate } = require('./middleware/auth');
const viewLocals = require('./middleware/viewLocals');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandlers');
const routes = require('./routes');

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Настройка шаблонизатора EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.disable('x-powered-by');

// Статика: подключается первой, чтобы CSS отдавался даже при сбое журнала
// (тогда страница 500 будет оформлена, а не «текст на чёрном фоне»)
app.use(express.static(path.join(__dirname, 'public')));

// Кастомные middleware: имитация авторизации и общие данные для шаблонов.
// Подключаются ДО логгера: если логгер упадёт, у страницы 500 уже будут user и хелперы
app.use(authenticate);
app.use(viewLocals);

// Логирование запросов в консоль и в файл logs/requests.log
app.use(logger);

// Разбор тела формы: ограничение размера (20 КБ) и числа полей (защита от вставки огромных данных)
app.use(express.urlencoded({ extended: false, limit: '20kb', parameterLimit: 30 }));
app.use(express.json({ limit: '20kb' }));

// Маршруты приложения
app.use('/', routes);

// Обработка ошибок: 404 и 500 строго после всех маршрутов
app.use(notFoundHandler);
app.use(errorHandler);

// Последний рубеж: непойманные ошибки пишутся в консоль, сервер продолжает работу
process.on('unhandledRejection', (reason) => console.error('Необработанный отказ промиса:', reason));
process.on('uncaughtException', (err) => console.error('Непойманное исключение:', err));

const server = app.listen(PORT, () => {
  console.log(`Сервер запущен: http://localhost:${PORT}`);
});

// Понятное сообщение, если порт занят или недоступен
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') console.error(`Порт ${PORT} уже занят. Закройте другой сервер или задайте PORT.`);
  else if (err.code === 'EACCES') console.error(`Нет прав на использование порта ${PORT}.`);
  else console.error('Ошибка запуска сервера:', err.message);
  process.exit(1);
});

// Ограничения на размер заголовков и время запроса (защита от «медленных» запросов)
server.headersTimeout = 15000;
server.requestTimeout = 30000;
