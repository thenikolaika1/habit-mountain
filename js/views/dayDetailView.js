import { setEntry } from "../state/entries.js";
import { openModal } from "../components/modal.js";

const MONTH_GENITIVE = [
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
];

function formatDateLong(dateKey) {
  const [y, m, d] = dateKey.split("-").map(Number);
  return `${d} ${MONTH_GENITIVE[m - 1]} ${y}`;
}

export function openDayDetail(habit, dateKey, currentValue) {
  const bodyHtml =
    habit.type === "boolean" ? booleanBodyHtml(currentValue) : numericBodyHtml(habit, currentValue);

  openModal({
    title: habit.name,
    bodyHtml: `
      <p class="day-detail-date">${formatDateLong(dateKey)}</p>
      ${bodyHtml}
      <div class="modal-actions">
        <button type="button" class="btn btn-block" id="day-detail-save">Сохранить</button>
      </div>
    `,
    onMount: (sheet, close) => wireDayDetail(sheet, close, habit, dateKey, currentValue),
  });
}

function booleanBodyHtml(currentValue) {
  const done = currentValue === true;
  return `
    <button type="button" class="check-toggle ${done ? "is-done" : ""}" id="day-toggle">
      <span class="check-mark">${done ? "✅" : "⬜️"}</span>
      <span>${done ? "Выполнено" : "Отметить выполненным"}</span>
    </button>`;
}

function numericBodyHtml(habit, currentValue) {
  const value = typeof currentValue === "number" ? currentValue : 0;
  return `
    <div class="stepper">
      <button type="button" id="day-dec" aria-label="Меньше">−</button>
      <input type="number" min="0" inputmode="numeric" id="day-number" value="${value}" />
      <button type="button" id="day-inc" aria-label="Больше">+</button>
    </div>
    ${habit.unit ? `<p class="day-detail-date" style="margin-top:8px;">Единица: ${escapeHtml(habit.unit)}</p>` : ""}`;
}

function wireDayDetail(sheet, close, habit, dateKey, currentValue) {
  if (habit.type === "boolean") {
    let done = currentValue === true;
    const toggle = sheet.querySelector("#day-toggle");
    toggle.addEventListener("click", () => {
      done = !done;
      toggle.classList.toggle("is-done", done);
      toggle.querySelector(".check-mark").textContent = done ? "✅" : "⬜️";
      toggle.querySelector("span:last-child").textContent = done ? "Выполнено" : "Отметить выполненным";
    });
    sheet.querySelector("#day-detail-save").addEventListener("click", () => {
      setEntry(habit.id, dateKey, done);
      close();
    });
  } else {
    const input = sheet.querySelector("#day-number");
    sheet.querySelector("#day-dec").addEventListener("click", () => {
      input.value = Math.max(0, Number(input.value || 0) - 1);
    });
    sheet.querySelector("#day-inc").addEventListener("click", () => {
      input.value = Number(input.value || 0) + 1;
    });
    sheet.querySelector("#day-detail-save").addEventListener("click", () => {
      const num = Number(input.value);
      setEntry(habit.id, dateKey, Number.isNaN(num) || num < 0 ? null : num);
      close();
    });
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
