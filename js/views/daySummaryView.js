import { isDayComplete, getNumericTotal } from "../logic/completion.js";
import { openModal } from "../components/modal.js";
import { todayAvatarIcon } from "../illustrations.js";

const MONTH_GENITIVE = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];

function formatDateLong(dateKey) {
  const [y, m, d] = dateKey.split("-").map(Number);
  return `${d} ${MONTH_GENITIVE[m - 1]} ${y}`;
}

/**
 * Cross-habit day summary — unlike dayDetailView's openDayDetail (one
 * habit, editable), this is a read-only rollup of every active habit's
 * status on a given day, opened from the Progress screen's month
 * calendar (mountainView.js). Kept as its own small view rather than
 * folded into dayDetailView.js since the two serve different questions
 * ("what did I do on this habit's calendar" vs "what did I do overall").
 */
export function openDaySummary(dateKey, perHabit) {
  const rows = perHabit
    .map(({ habit, entries }) => {
      const value = entries[dateKey];
      const done = isDayComplete(habit, value);
      const valueLabel =
        habit.type === "numeric" && done ? `${getNumericTotal(value)}${habit.unit ? ` ${escapeHtml(habit.unit)}` : ""}` : "";
      return `
        <li class="today-item ${done ? "is-done" : ""}">
          ${todayAvatarIcon()}
          <div class="today-item-body">
            <div class="today-item-name">${escapeHtml(habit.name)}</div>
          </div>
          ${valueLabel ? `<span class="summary-value">${valueLabel}</span>` : ""}
          <span class="today-check" aria-hidden="true">${done ? "✓" : ""}</span>
        </li>`;
    })
    .join("");

  openModal({
    title: "Итоги дня",
    bodyHtml: `
      <p class="day-detail-date">${formatDateLong(dateKey)}</p>
      <ul class="today-list">${rows || `<li class="empty-state"><p>Нет активных привычек.</p></li>`}</ul>
    `,
  });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
