// Валидация ответов теста: на каждый вопрос нужен один ответ из допустимых вариантов
function validateTestAnswers(test, body) {
  const allowed = test.options.map((o) => String(o.value));
  const answers = [];
  const errors = {};

  test.questions.forEach((_, i) => {
    const value = body[`q${i}`];
    if (value === undefined || value === '') {
      errors[i] = 'Выберите вариант ответа.';
    } else if (typeof value !== 'string' || !allowed.includes(value)) {
      errors[i] = 'Недопустимый вариант ответа.';
    } else {
      answers[i] = Number(value);
    }
  });

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    answers,
  };
}

module.exports = { validateTestAnswers };
