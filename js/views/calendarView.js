import { getHabit } from "../state/habits.js";
import { getEntriesForHabit } from "../state/entries.js";
import { computeCurrentStreak } from "../logic/streaks.js";
import { isDayComplete, getNumericTotal } from "../logic/completion.js";
import { buildMonthGrid, monthLabel, prevMonth, nextMonth, todayParts } from "../logic/dateUtils.js";
import { renderMonthSummary } from "../components/monthSummary.js";
import { openDayDetail } from "./dayDetailView.js";
import { heroIllustrationForHabit, wirePhotoFallback, statusRing } from "../illustrations.js";

const WEEKDAY_SHORT = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"]; // JS Date#getDay(): 0 = Sunday

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

  // A fresh navigation into this habit's screen (from the habits list, or
  // from a different habit's screen) vs. an in-place re-render of the
  // screen already showing (subscribe(render) firing from an unrelated
  // state change anywhere in the app, or a cal-prev/cal-next month-nav
  // click) — only the former should jump the scroll position to today
  // below. Checked BEFORE container.innerHTML is overwritten, while the
  // previous screen's content (or nothing, on first load) is still there.
  const existingList = container.querySelector(".day-pill-list");
  const isFreshMount = !existingList || existingList.dataset.habitId !== habitId;

  // buildMonthGrid pads to full weeks with null filler cells (for the
  // 7-column calendar grid used elsewhere) — this screen is a plain
  // vertical list of real days, so the filler cells are simply dropped.
  const days = buildMonthGrid(current.year, current.month).filter(Boolean);
  const meta =
    habit.type === "numeric" ? `Числовая${habit.unit ? " · " + escapeHtml(habit.unit) : ""}` : "Простая · галочка";

  container.innerHTML = `
    <section class="view view--habit-detail">
      <div class="habit-hero">
        ${heroIllustrationForHabit(habit)}
        <button type="button" class="habit-hero-back" id="calendar-back" aria-label="К привычкам">‹</button>
        <div class="habit-hero-scrim">
          <h1 class="habit-hero-title">${escapeHtml(habit.name)}</h1>
          <div class="habit-hero-badges">
            <span class="habit-hero-badge">${meta}</span>
            ${streak > 0 ? `<span class="habit-hero-badge">🔥 ${streak} дн. подряд</span>` : ""}
          </div>
        </div>
      </div>

      <div class="calendar-header">
        <button type="button" class="calendar-nav-btn" id="cal-prev" aria-label="Предыдущий месяц">‹</button>
        <span class="calendar-title">${monthLabel(current.year, current.month)}</span>
        <button type="button" class="calendar-nav-btn" id="cal-next" aria-label="Следующий месяц">›</button>
      </div>

      <div class="day-pill-list" id="day-pill-list" data-habit-id="${habitId}">
        ${days.map((cell) => dayPillHtml(habit, entries, cell)).join("")}
      </div>
      <p class="calendar-swipe-hint">Свайп или стрелки — соседний месяц</p>

      ${renderMonthSummary(habit, entries, current.year, current.month)}
    </section>
  `;

  wireEvents(container, habit, entries, habitId);
  wirePhotoFallback(container);

  // Jump straight to today's pill on first open, rather than leaving the
  // user looking at the 1st of the month — only when today actually falls
  // within the month currently shown (always true on first open, since
  // viewMonthByHabit seeds with today's month above; not necessarily true
  // if the user had already paged to a different month before navigating
  // away and back, in which case there's simply no today pill to jump to).
  if (isFreshMount) {
    const todayPill = container.querySelector(".day-pill.is-today");
    if (todayPill) todayPill.scrollIntoView({ block: "center" });
  }
}

function dayPillHtml(habit, entries, cell) {
  const value = entries[cell.dateKey];
  const done = isDayComplete(habit, value);
  const locked = cell.isFuture || cell.isTooOld;
  const classes = ["day-pill"];
  if (cell.isToday) classes.push("is-today");
  if (locked) classes.push("is-locked");
  if (done) classes.push("is-done");

  // Built from the y/m/d numbers, not new Date(cell.dateKey) — parsing an
  // "YYYY-MM-DD" string is UTC per spec and can roll the weekday over in
  // negative-UTC-offset timezones (see dateUtils.js's own note on this).
  const [dy, dm, dd] = cell.dateKey.split("-").map(Number);
  const weekday = WEEKDAY_SHORT[new Date(dy, dm - 1, dd).getDay()];
  const numericTotal = habit.type === "numeric" ? getNumericTotal(value) : 0;
  const valueLabel = numericTotal > 0 ? `${numericTotal}${habit.unit ? ` ${escapeHtml(habit.unit)}` : ""}` : "";

  // `locked` only means "outside the editable window" — it must not hide
  // whether the day was actually completed. Checking `done` first (was:
  // `locked ? "locked" : done ? "done" : "empty"`) fixed a real bug where
  // a genuinely completed day older than the 3-day edit window silently
  // showed as "locked"/not done, because the old ternary never even
  // looked at `done` once the day was outside that window.
  const ringState = done ? "done" : locked ? "locked" : "empty";
  // A completed day that isn't "today" gets the paler/muted checkmark —
  // visually distinct from today's vivid green, whether or not it's still
  // editable (viewing status and being able to edit are separate things).
  const ringMuted = done && !cell.isToday;

  return `
    <button type="button" class="${classes.join(" ")}" data-date-key="${cell.dateKey}" ${locked ? 'disabled aria-disabled="true"' : ""}>
      <span class="day-pill-date">
        <span class="day-pill-daynum">${cell.day}</span>
        <span class="day-pill-weekday">${weekday}</span>
      </span>
      <span class="day-pill-body">${valueLabel}</span>
      <span class="day-pill-status">${statusRing({ state: ringState, size: 36, muted: ringMuted })}</span>
    </button>`;
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

  container.querySelectorAll(".day-pill:not([disabled])").forEach((btn) => {
    btn.addEventListener("click", () => {
      const dateKey = btn.dataset.dateKey;
      openDayDetail(habit, dateKey, entries[dateKey]);
    });
  });

  wireSwipe(container.querySelector("#day-pill-list"), {
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
