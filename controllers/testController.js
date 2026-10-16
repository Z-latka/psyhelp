const tests = require('../data/tests');
const { validateTestAnswers } = require('../validators/testValidator');

const findTest = (slug) => tests.find((t) => t.slug === slug);

// Список тестов
exports.list = (req, res) => {
  res.render('tests', { title: 'Психологические тесты', tests });
};

// Страница прохождения теста
exports.show = (req, res, next) => {
  const test = findTest(req.params.slug);
  if (!test) return next();
  res.render('test', { title: test.title, test, answers: {}, errors: {}, result: null });
};

// Подсчёт результата после проверки, что ответы даны на все вопросы
exports.submit = (req, res, next) => {
  const test = findTest(req.params.slug);
  if (!test) return next();

  const { isValid, errors, answers } = validateTestAnswers(test, req.body);
  let result = null;

  if (isValid) {
    const score = answers.reduce((sum, a) => sum + a, 0);
    const maxScore = test.questions.length * 3;
    const level = test.scale.find((s) => score <= s.max) || test.scale[test.scale.length - 1];
    result = { score, maxScore, ...level };
  }

  res.status(isValid ? 200 : 422).render('test', { title: test.title, test, answers, errors, result });
};
