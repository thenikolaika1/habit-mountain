import { allKeysInMonth, daysInMonth } from "../logic/dateUtils.js";
import { isDayComplete, getNumericTotal } from "../logic/completion.js";
import { todayAvatarIcon } from "../illustrations.js";

/**
 * "29 из 31 дней" (boolean) or "5000 раз" (numeric) for one habit over one
 * calendar month — the single source of truth both render functions below
 * build on, so the per-habit card and the all-habits list can never drift
 * apart on how a month total is computed.
 */
function monthSummaryValueText(habit, entries, year, month) {
  const keys = allKeysInMonth(year, month);
  if (habit.type === "numeric") {
    const sum = keys.reduce((acc, key) => acc + getNumericTotal(entries[key]), 0);
    const unit = habit.unit ? ` ${habit.unit}` : "";
    return `${sum}${unit}`;
  }
  const total = daysInMonth(year, month);
  const done = keys.filter((key) => isDayComplete(habit, entries[key])).length;
  return `${done} из ${total} дней`;
}

/** Renders the end-of-month summary card for a single habit + viewed month. */
export function renderMonthSummary(habit, entries, year, month) {
  return `
    <div class="month-summary">
      <h3>Итог месяца</h3>
      <div class="summary-row">
        <span>${escapeHtml(habit.name)}</span>
        <span class="summary-value">${monthSummaryValueText(habit, entries, year, month)}</span>
      </div>
    </div>`;
}

/**
 * Renders a single card listing EVERY active habit's total for one
 * calendar month at once — "Итоги месяца" on the Прогресс screen, right
 * under the month calendar grid. `perHabit` is stats.perHabit from
 * getAppStats() (js/state/derive.js): [{habit, entries}, ...]. Reuses
 * monthSummaryValueText() above for the value text (same "X из Y дней" /
 * "sum unit" logic as the single-habit card) and todayAvatarIcon() for the
 * icon, so both the numbers and the icon match every other place in the
 * app that shows a habit. Returns "" when there are no active habits, same
 * as mountainView.js's own emptyTodayHtml() convention — the caller just
 * drops the empty string into the DOM.
 */
export function renderAllHabitsMonthSummary(perHabit, year, month) {
  if (perHabit.length === 0) return "";
  const rows = perHabit
    .map(
      ({ habit, entries }) => `
        <li class="month-habits-summary-row">
          ${todayAvatarIcon(habit)}
          <span class="month-habits-summary-name">${escapeHtml(habit.name)}</span>
          <span class="month-habits-summary-value">${monthSummaryValueText(habit, entries, year, month)}</span>
        </li>`
    )
    .join("");
  return `
    <h3 class="section-heading">Итоги месяца</h3>
    <div class="card month-habits-summary">
      <ul class="month-habits-summary-list">${rows}</ul>
    </div>`;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
