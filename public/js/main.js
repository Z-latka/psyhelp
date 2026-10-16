// Счётчики символов для полей с атрибутом data-counter
document.querySelectorAll('[data-counter]').forEach((input) => {
  const counter = input.closest('.field')?.querySelector('.counter');
  if (!counter) return;
  const update = () => { counter.textContent = `${input.value.trim().length} / ${input.maxLength}`; };
  input.addEventListener('input', update);
  update();
});

// Отображение значения ползунка «Уровень тревоги»
const range = document.getElementById('anxietyLevel');
const output = document.getElementById('anxietyOut');
if (range && output) {
  const sync = () => { output.textContent = range.value; };
  range.addEventListener('input', sync);
  sync();
}
