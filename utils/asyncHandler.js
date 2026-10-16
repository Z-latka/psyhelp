// Обёртка для async-обработчиков: отклонённый промис передаётся в next(err) → страница 500
module.exports = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
