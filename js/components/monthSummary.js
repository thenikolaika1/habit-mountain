import { allKeysInMonth, daysInMonth } from "../logic/dateUtils.js";
import { isDayComplete } from "../logic/completion.js";

/** Renders the end-of-month summary card for a single habit + viewed month. */
export function renderMonthSummary(habit, entries, year, month) {
  const keys = allKeysInMonth(year, month);
  const total = daysInMonth(year, month);

  let valueHtml;
  if (habit.type === "numeric") {
    const sum = keys.reduce((acc, key) => {
      const v = entries[key];
      return acc + (typeof v === "number" ? v : 0);
    }, 0);
    const unit = habit.unit ? ` ${habit.unit}` : "";
    valueHtml = `${sum}${unit}`;
  } else {
    const done = keys.filter((key) => isDayComplete(habit, entries[key])).length;
    valueHtml = `${done} из ${total} дней`;
  }

  return `
    <div class="month-summary">
      <h3>Итог месяца</h3>
      <div class="summary-row">
        <span>${habit.name}</span>
        <span class="summary-value">${valueHtml}</span>
      </div>
    </div>`;
}
