const helpers = require('../utils/helpers');

// Общие данные и функции-хелперы, доступные во всех шаблонах и partials
function viewLocals(req, res, next) {
  res.locals.user = req.user;
  res.locals.currentPath = req.path;
  res.locals.formatDate = helpers.formatDate;
  res.locals.categoryLabel = helpers.categoryLabel;
  res.locals.formatLabel = helpers.formatLabel;
  res.locals.pluralize = helpers.pluralize;
  next();
}

module.exports = viewLocals;
