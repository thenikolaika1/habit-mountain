import { setEntry } from "../state/entries.js";
import { openModal } from "../components/modal.js";
import { getNumericTotal } from "../logic/completion.js";

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
    onMount: (sheet, close) => {
      if (habit.type === "boolean") wireBooleanDayDetail(sheet, close, habit, dateKey, currentValue);
      else wireNumericDayDetail(sheet, close, habit, dateKey, currentValue);
    },
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

function wireBooleanDayDetail(sheet, close, habit, dateKey, currentValue) {
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
}

// A numeric habit's value can be entered either as one number, or split
// into "подходы" (sets) that get summed into the day's total — e.g. for
// pull-ups: set 1 = 10, set 2 = 8, set 3 = 12 -> total 30. Which mode a
// day starts in is inferred from how it's currently stored: an array
// means it was logged as sets, a plain number (or nothing) means single.
function numericBodyHtml(habit, currentValue) {
  const initialMode = Array.isArray(currentValue) ? "sets" : "single";
  const singleValue = typeof currentValue === "number" ? currentValue : 0;

  return `
    <div class="segmented" id="numeric-mode">
      <button type="button" data-value="single" class="${initialMode === "single" ? "is-active" : ""}">Одно число</button>
      <button type="button" data-value="sets" class="${initialMode === "sets" ? "is-active" : ""}">По подходам</button>
    </div>

    <div class="stepper" id="single-mode-body" style="display:${initialMode === "single" ? "flex" : "none"}">
      <button type="button" id="day-dec" aria-label="Меньше">−</button>
      <input type="number" min="0" inputmode="numeric" id="day-number" value="${singleValue}" />
      <button type="button" id="day-inc" aria-label="Больше">+</button>
    </div>

    <div id="sets-mode-body" style="display:${initialMode === "sets" ? "block" : "none"}">
      <div class="sets-list" id="sets-list"></div>
      <button type="button" class="btn btn-block" id="add-set">+ Добавить подход</button>
      <div class="sets-total-row">
        <span>Итого за день</span>
        <span class="summary-value" id="sets-total-value">0</span>
      </div>
    </div>

    ${habit.unit ? `<p class="day-detail-date" style="margin-top:8px;">Единица: ${escapeHtml(habit.unit)}</p>` : ""}`;
}

function wireNumericDayDetail(sheet, close, habit, dateKey, currentValue) {
  const singleValue = typeof currentValue === "number" ? currentValue : 0;
  let mode = Array.isArray(currentValue) ? "sets" : "single";
  let sets = Array.isArray(currentValue) ? currentValue.slice() : singleValue > 0 ? [singleValue] : [];
  const unitSuffix = habit.unit ? ` ${habit.unit}` : "";

  const modeButtons = [...sheet.querySelectorAll("#numeric-mode button")];
  const singleBody = sheet.querySelector("#single-mode-body");
  const setsBody = sheet.querySelector("#sets-mode-body");
  const input = sheet.querySelector("#day-number");
  const setsList = sheet.querySelector("#sets-list");
  const setsTotalEl = sheet.querySelector("#sets-total-value");

  function applyMode() {
    modeButtons.forEach((b) => b.classList.toggle("is-active", b.dataset.value === mode));
    singleBody.style.display = mode === "single" ? "flex" : "none";
    setsBody.style.display = mode === "sets" ? "block" : "none";
  }

  function renderSets() {
    setsList.innerHTML = sets
      .map(
        (val, i) => `
        <div class="set-row">
          <span class="set-row-label">Подход ${i + 1}</span>
          <input type="number" min="0" inputmode="numeric" class="set-row-input" data-index="${i}" value="${val}" />
          <button type="button" class="set-row-remove" data-index="${i}" aria-label="Удалить подход ${i + 1}">✕</button>
        </div>`
      )
      .join("");

    setsList.querySelectorAll(".set-row-input").forEach((el) => {
      el.addEventListener("input", () => {
        const i = Number(el.dataset.index);
        const n = Number(el.value);
        sets[i] = Number.isNaN(n) || n < 0 ? 0 : n;
        setsTotalEl.textContent = `${getNumericTotal(sets)}${unitSuffix}`;
      });
    });
    setsList.querySelectorAll(".set-row-remove").forEach((btn) => {
      btn.addEventListener("click", () => {
        sets.splice(Number(btn.dataset.index), 1);
        renderSets();
      });
    });
    setsTotalEl.textContent = `${getNumericTotal(sets)}${unitSuffix}`;
  }

  modeButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.value;
      // Carry the value across when switching modes, rather than losing it.
      if (target === "sets" && sets.length === 0) {
        const seed = Number(input.value);
        if (!Number.isNaN(seed) && seed > 0) sets = [seed];
      } else if (target === "single") {
        const total = getNumericTotal(sets);
        if (total > 0) input.value = total;
      }
      mode = target;
      applyMode();
      renderSets();
    });
  });

  sheet.querySelector("#day-dec").addEventListener("click", () => {
    input.value = Math.max(0, Number(input.value || 0) - 1);
  });
  sheet.querySelector("#day-inc").addEventListener("click", () => {
    input.value = Number(input.value || 0) + 1;
  });

  sheet.querySelector("#add-set").addEventListener("click", () => {
    sets.push(0);
    renderSets();
    const inputs = setsList.querySelectorAll(".set-row-input");
    const last = inputs[inputs.length - 1];
    if (last) {
      last.focus();
      last.select();
    }
  });

  renderSets();

  sheet.querySelector("#day-detail-save").addEventListener("click", () => {
    if (mode === "single") {
      const num = Number(input.value);
      setEntry(habit.id, dateKey, Number.isNaN(num) || num < 0 ? null : num);
    } else {
      const cleaned = sets.filter((n) => typeof n === "number" && !Number.isNaN(n) && n >= 0);
      setEntry(habit.id, dateKey, cleaned);
    }
    close();
  });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
