import { getHabit } from "../state/habits.js";
import { getEntriesForHabit } from "../state/entries.js";
import { computeCurrentStreak } from "../logic/streaks.js";
import { isDayComplete, getNumericTotal } from "../logic/completion.js";
import { buildMonthGrid, weekdayHeader, monthLabel, prevMonth, nextMonth, todayParts } from "../logic/dateUtils.js";
import { renderMonthSummary } from "../components/monthSummary.js";
import { openDayDetail } from "./dayDetailView.js";

// Remembers which month is being viewed per habit for the lifetime of the
// page (not persisted) so switching tabs and coming back keeps your place.
const viewMonthByHabit = new Map();

export function renderCalendarView(container, { habitId }) {
  const habit = getHabit(habitId);
  if (!habit) {
    location.hash = "#/habits";
    return;
  }

  const entries = getEntriesForHabit(habitId);
  const streak = computeCurrentStreak(habit, entries);

  if (!viewMonthByHabit.has(habitId)) {
    const t = todayParts();
    viewMonthByHabit.set(habitId, { year: t.year, month: t.month });
  }
  const current = viewMonthByHabit.get(habitId);

  const grid = buildMonthGrid(current.year, current.month);
  const weekdays = weekdayHeader();

  container.innerHTML = `
    <section class="view">
      <div class="view-header">
        <button type="button" class="back-button" id="calendar-back">‹ Привычки</button>
      </div>
      <div class="card" style="margin-bottom: var(--space-4); display:flex; align-items:center; gap:12px;">
        <span class="habit-avatar" style="background:${habit.color}">${habit.icon || ""}</span>
        <div>
          <div class="habit-card-title">${escapeHtml(habit.name)}</div>
          <div class="habit-card-meta">${habit.type === "numeric" ? `Числовая${habit.unit ? " · " + escapeHtml(habit.unit) : ""}` : "Простая · галочка"}${streak > 0 ? ` · 🔥 ${streak} дн. подряд` : ""}</div>
        </div>
      </div>

      <div class="calendar-header">
        <button type="button" class="calendar-nav-btn" id="cal-prev" aria-label="Предыдущий месяц">‹</button>
        <span class="calendar-title">${monthLabel(current.year, current.month)}</span>
        <button type="button" class="calendar-nav-btn" id="cal-next" aria-label="Следующий месяц">›</button>
      </div>

      <div class="calendar-weekdays">${weekdays.map((w) => `<span>${w}</span>`).join("")}</div>

      <div class="calendar-grid" id="cal-grid">
        ${grid.map((cell) => cellHtml(habit, entries, cell)).join("")}
      </div>
      <p class="calendar-swipe-hint">Свайп или стрелки — соседний месяц</p>

      ${renderMonthSummary(habit, entries, current.year, current.month)}
    </section>
  `;

  wireEvents(container, habit, entries, habitId);
}

function cellHtml(habit, entries, cell) {
  if (!cell) return `<div class="calendar-cell"></div>`;
  const value = entries[cell.dateKey];
  const done = isDayComplete(habit, value);
  const locked = cell.isFuture || cell.isTooOld;
  const classes = ["calendar-day"];
  if (cell.isToday) classes.push("is-today");
  if (done) classes.push("is-done");
  if (locked) classes.push("is-locked");

  const numericTotal = habit.type === "numeric" ? getNumericTotal(value) : 0;
  const valueBadge = numericTotal > 0 ? `<span class="day-value">${numericTotal}</span>` : "";

  return `
    <div class="calendar-cell">
      <button type="button" class="${classes.join(" ")}" data-date-key="${cell.dateKey}" ${locked ? "disabled aria-disabled=\"true\"" : ""}>
        ${cell.day}${valueBadge}
      </button>
    </div>`;
}

function wireEvents(container, habit, entries, habitId) {
  container.querySelector("#calendar-back").addEventListener("click", () => {
    location.hash = "#/habits";
  });

  const goToMonth = (mutator) => {
    const current = viewMonthByHabit.get(habitId);
    viewMonthByHabit.set(habitId, mutator(current));
    renderCalendarView(container, { habitId });
  };

  container.querySelector("#cal-prev").addEventListener("click", () => goToMonth(prevMonth));
  container.querySelector("#cal-next").addEventListener("click", () => goToMonth(nextMonth));

  container.querySelectorAll(".calendar-day:not([disabled])").forEach((btn) => {
    btn.addEventListener("click", () => {
      const dateKey = btn.dataset.dateKey;
      openDayDetail(habit, dateKey, entries[dateKey]);
    });
  });

  wireSwipe(container.querySelector("#cal-grid"), {
    onSwipeLeft: () => goToMonth(nextMonth),
    onSwipeRight: () => goToMonth(prevMonth),
  });
}

function wireSwipe(el, { onSwipeLeft, onSwipeRight }) {
  if (!el) return;
  let startX = 0;
  let startY = 0;
  let startTime = 0;

  el.addEventListener(
    "touchstart",
    (e) => {
      const t = e.changedTouches[0];
      startX = t.clientX;
      startY = t.clientY;
      startTime = Date.now();
    },
    { passive: true }
  );

  el.addEventListener(
    "touchend",
    (e) => {
      const t = e.changedTouches[0];
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      const elapsed = Date.now() - startTime;
      const isSwipe = Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5 && elapsed < 600;
      if (!isSwipe) return;
      if (dx < 0) onSwipeLeft();
      else onSwipeRight();
    },
    { passive: true }
  );
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
