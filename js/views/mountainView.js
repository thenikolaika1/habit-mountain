import { getAppStats } from "../state/derive.js";
import { setEntry } from "../state/entries.js";
import { computeOverallCurrentStreak } from "../logic/streaks.js";
import { POINTS_PER_DAY } from "../logic/points.js";
import { todayKey, todayParts, monthLabel, weekdayHeader, buildMonthGrid, formatDateKey, daysInMonth, prevMonth, nextMonth } from "../logic/dateUtils.js";
import { isDayComplete } from "../logic/completion.js";
import { buildMountainSvg, buildProgressTrailPaths, MILESTONES } from "../mountainSvg.js";
import { stageForProgress, computeMonthMountainProgress, computeMonthStats } from "../logic/progress.js";
import { CHALLENGE_POOL } from "../logic/challenges.js";
import { showToast } from "../components/toast.js";
import { openDaySummary } from "./daySummaryView.js";
import { renderAllHabitsMonthSummary } from "../components/monthSummary.js";
import { todayAvatarIcon, dayProgressRing, iconChevronLeft, iconChevronRight } from "../illustrations.js";

// The mountain screen is re-rendered on every state change (subscribe in
// app.js), which is most of the time just a habit being ticked while the
// user is still looking at this same screen. Rebuilding the whole <section>
// from scratch every time would also throw away the gold trail's <path>
// node, which is the one place a real CSS `transition` (see mountain.css)
// can animate smoothly — a transition needs the *same* node to persist
// across the update. So: build fresh only the first time the screen is
// mounted, then patch attributes/text in place on every update after that.

// Which month's mountain/calendar/header stats are currently being
// browsed — {year, month}, month 0-11. Plain module-level state, not
// threaded through render() or persisted (mirrors selectedDateKey further
// down): purely a UI browsing position, unrelated to the store, so it
// survives an unrelated store-triggered re-render (e.g. ticking today's
// habit while looking at a past month) instead of snapping back to the
// current month every time. It's also NOT reset when leaving and
// returning to this screen — same precedent as selectedDateKey — so
// browsing a specific month survives a quick trip to another tab. Lazily
// initialized to the current month on first render rather than at module
// load, so a fresh page load always starts on "now" regardless of when
// this module happened to be imported.
let viewedMonth = null;

function isCurrentMonth(vm) {
  const t = todayParts();
  return vm.year === t.year && vm.month === t.month;
}

// Defensive clamp — the nav button itself is disabled at the current
// month (see wireMonthNav()), but this keeps renderMountainView() itself
// honest even if something else ever mutates viewedMonth directly.
function clampToNotFuture(vm) {
  const t = todayParts();
  return vm.year * 12 + vm.month > t.year * 12 + t.month ? { year: t.year, month: t.month } : vm;
}

/**
 * Everything the header stats + mountain + calendar need for whichever
 * month is being browsed — a small local computation on top of the
 * already-generic, already-month-parameterized progress.js functions
 * (computeMonthMountainProgress/computeMonthStats take (year, month, ...)
 * for any month, not just "now"), so no changes were needed there. Kept
 * entirely separate from getAppStats()'s own monthStats/overallProgress
 * (both hardcoded to the *current* month, used elsewhere for achievement/
 * challenge evaluation) — this is purely a display-time computation, never
 * persisted or fed back into anything.
 */
function computeViewedMonthData(vm, activeHabits, entriesByHabit) {
  const overallProgress = computeMonthMountainProgress(vm.year, vm.month, activeHabits, entriesByHabit);
  const monthStats = computeMonthStats(vm.year, vm.month, activeHabits, entriesByHabit);
  // "Общий стрик" as it stood at the end of the browsed month, not the
  // month-bounded best run — a streak in progress right now that started
  // last month would otherwise get truncated to a much smaller number the
  // moment you browse back to today's month. For the current (still
  // unfinished) month this is just todayKey(), i.e. computeOverallCurrentStreak()'s
  // own default — the live "Общий стрик" shown today is unchanged.
  const asOfKey = isCurrentMonth(vm) ? todayKey() : formatDateKey(vm.year, vm.month, daysInMonth(vm.year, vm.month));
  const streakAsOfMonthEnd = computeOverallCurrentStreak(activeHabits, entriesByHabit, asOfKey);
  // "Очки" for the browsed month specifically (activity within that month
  // only), not the lifetime bonus-crossing total computeHabitStats() tracks
  // — see points.js's own comment on why that one isn't month-bucketable.
  const monthPoints = monthStats.totalMarks * POINTS_PER_DAY;
  return { overallProgress, monthStats, streakAsOfMonthEnd, monthPoints };
}

export function renderMountainView(container) {
  // newlyUnlocked (permanent achievements) is still computed and persisted
  // by getAppStats() — see js/logic/achievements.js — but no longer shown
  // anywhere (Достижения only lists challenges now), so it's intentionally
  // not toasted here: a celebration for something invisible would just be
  // confusing.
  const { stats, newlyCompletedChallenges, entriesByHabit } = getAppStats();
  const tKey = todayKey();

  if (newlyCompletedChallenges.length > 0) {
    const first = CHALLENGE_POOL.find((c) => c.id === newlyCompletedChallenges[0]);
    showToast(`🏅 Испытание пройдено: ${first ? first.title : ""}`);
  }

  if (viewedMonth === null) viewedMonth = todayParts();
  const vm = clampToNotFuture(viewedMonth);
  viewedMonth = vm;
  const viewedData = computeViewedMonthData(vm, stats.activeHabits, entriesByHabit);

  if (container.querySelector(".mountain-wrap svg")) {
    patchMountainView(container, stats, tKey, vm, viewedData);
  } else {
    renderFreshMountainView(container, stats, tKey, vm, viewedData);
  }
}

function renderFreshMountainView(container, stats, tKey, vm, viewedData) {
  const stage = stageForProgress(viewedData.overallProgress);
  const progressPct = Math.round(viewedData.overallProgress * 100);
  const atCurrent = isCurrentMonth(vm);

  container.innerHTML = `
    <section class="view">
      <div class="view-header">
        <div>
          <h1>Прогресс</h1>
          <div class="progress-month-nav">
            <button type="button" class="progress-month-nav-btn" data-dir="prev" aria-label="Предыдущий месяц">${iconChevronLeft()}</button>
            <span class="progress-month-nav-label" id="progress-month-label">Гора за ${monthLabel(vm.year, vm.month)}</span>
            <button type="button" class="progress-month-nav-btn" data-dir="next" id="progress-month-next-btn" aria-label="Следующий месяц" ${atCurrent ? "disabled" : ""}>${iconChevronRight()}</button>
          </div>
          <p class="mountain-month-subtitle" id="progress-month-subtitle">${atCurrent ? "1-го числа обновляется" : "Архив — только просмотр"}</p>
        </div>
      </div>

      <div class="stats-row">
        <div class="stat-pill">
          <div class="stat-value" id="stat-points">${viewedData.monthPoints}</div>
          <div class="stat-label">Очки</div>
        </div>
        <div class="stat-pill">
          <div class="stat-value" id="stat-streak">${viewedData.streakAsOfMonthEnd}</div>
          <div class="stat-label">Общий стрик</div>
        </div>
        <div class="stat-pill">
          <div class="stat-value" id="stat-progress-pct">${progressPct}%</div>
          <div class="stat-label" id="stat-progress-stage">${stage.label}</div>
        </div>
      </div>

      <div class="mountain-wrap">
        <span class="mountain-progress-caption" id="mountain-caption">${progressPct}% · ${stage.label}</span>
        ${buildMountainSvg(viewedData.overallProgress)}
      </div>

      <div id="progress-calendar-section">${progressCalendarHtml(viewedData.monthStats, vm.year, vm.month, stats.activeHabits.length)}</div>

      <div id="progress-habits-summary-section">${renderAllHabitsMonthSummary(stats.perHabit, vm.year, vm.month)}</div>

      <h3 class="section-heading">Сегодня</h3>
      <div id="today-section">
        ${stats.activeHabits.length === 0 ? emptyTodayHtml() : todayListHtml(stats, tKey)}
      </div>
    </section>
  `;

  wireTodayList(container, stats, tKey);
  wireProgressCalendar(container, stats);
  // Only wired here, on the screen's first mount (or a remount after
  // leaving and coming back) — unlike wireProgressCalendar/wireTodayList,
  // the header these buttons live in is never rebuilt by patchMountainView,
  // so the listeners attached here simply persist across every later patch.
  wireMonthNav(container);
}

function patchMountainView(container, stats, tKey, vm, viewedData) {
  const stage = stageForProgress(viewedData.overallProgress);
  const progressPct = Math.round(viewedData.overallProgress * 100);
  const atCurrent = isCurrentMonth(vm);

  container.querySelector("#progress-month-label").textContent = `Гора за ${monthLabel(vm.year, vm.month)}`;
  container.querySelector("#progress-month-subtitle").textContent = atCurrent ? "1-го числа обновляется" : "Архив — только просмотр";
  container.querySelector("#progress-month-next-btn").disabled = atCurrent;

  container.querySelector("#stat-points").textContent = viewedData.monthPoints;
  container.querySelector("#stat-streak").textContent = viewedData.streakAsOfMonthEnd;
  container.querySelector("#stat-progress-pct").textContent = `${progressPct}%`;
  container.querySelector("#stat-progress-stage").textContent = stage.label;
  container.querySelector("#mountain-caption").textContent = `${progressPct}% · ${stage.label}`;

  const { walkedD, remainingD } = buildProgressTrailPaths(viewedData.overallProgress);
  container.querySelector(".mountain-trail-walked").setAttribute("d", walkedD);
  const remainingEl = container.querySelector(".mountain-trail");
  if (remainingD) {
    remainingEl.setAttribute("d", remainingD);
    remainingEl.style.display = "";
  } else {
    remainingEl.style.display = "none";
  }

  MILESTONES.forEach((m, i) => {
    const reached = viewedData.overallProgress >= m.p - 0.0001;
    const el = container.querySelector(`[data-milestone-index="${i}"]`);
    if (el) el.classList.toggle("milestone--reached", reached);
  });

  const calendarSection = container.querySelector("#progress-calendar-section");
  calendarSection.innerHTML = progressCalendarHtml(viewedData.monthStats, vm.year, vm.month, stats.activeHabits.length);
  wireProgressCalendar(container, stats);

  container.querySelector("#progress-habits-summary-section").innerHTML = renderAllHabitsMonthSummary(stats.perHabit, vm.year, vm.month);

  const todaySection = container.querySelector("#today-section");
  todaySection.innerHTML = stats.activeHabits.length === 0 ? emptyTodayHtml() : todayListHtml(stats, tKey);
  wireTodayList(container, stats, tKey);
}

function wireMonthNav(container) {
  container.querySelector('.progress-month-nav-btn[data-dir="prev"]').addEventListener("click", () => {
    viewedMonth = prevMonth(viewedMonth);
    renderMountainView(container);
  });
  const nextBtn = container.querySelector('.progress-month-nav-btn[data-dir="next"]');
  nextBtn.addEventListener("click", () => {
    if (nextBtn.disabled) return; // native disabled already blocks this -- just extra-defensive
    viewedMonth = nextMonth(viewedMonth);
    renderMountainView(container);
  });
}

// Which day was last tapped in the calendar grid — plain module-level
// state, not threaded through render(), mirroring the bounce-animation
// diffing state further down this file (previouslyDoneToday etc.): it's
// UI-only and unrelated to the store, so it survives an unrelated
// store-triggered re-render (e.g. ticking a habit elsewhere) instead of
// resetting the selection highlight every time.
let selectedDateKey = null;

function progressCalendarHtml(monthStats, year, month, activeHabitsCount) {
  const grid = buildMonthGrid(year, month);
  const weekdays = weekdayHeader();
  const dayResultByKey = new Map(monthStats.days.map((d) => [d.dateKey, d]));

  return `
    <h3 class="section-heading">Календарь месяца</h3>
    <div class="calendar-weekdays">${weekdays.map((w, i) => `<span class="${i >= 5 ? "is-weekend" : ""}">${w}</span>`).join("")}</div>
    <div class="calendar-grid" id="progress-cal-grid">
      ${grid.map((cell) => progressCellHtml(cell, dayResultByKey, activeHabitsCount)).join("")}
    </div>
    <p class="calendar-swipe-hint">Нажмите на день — сводка по всем привычкам</p>
  `;
}

function progressCellHtml(cell, dayResultByKey, activeHabitsCount) {
  if (!cell) return `<div class="calendar-cell"></div>`;
  const result = dayResultByKey.get(cell.dateKey);
  const classes = ["calendar-day"];
  if (cell.isToday) classes.push("is-today");
  if (result && result.counted) classes.push("is-done");
  if (cell.isFuture) classes.push("is-future");
  if (cell.dateKey === selectedDateKey) classes.push("is-selected");

  // Mini progress ring: only for a past-or-current day with something
  // completed — a future day never has data, and a day with 0 completed
  // habits gets no ring at all (dayProgressRing() is simply not called).
  const pct = !cell.isFuture && result && activeHabitsCount > 0 ? result.completedCount / activeHabitsCount : 0;
  const ring = pct > 0 ? dayProgressRing(pct) : "";

  return `
    <div class="calendar-cell">
      <button type="button" class="${classes.join(" ")}" data-date-key="${cell.dateKey}">
        ${ring}
        <span class="calendar-day-value">${cell.day}</span>
      </button>
    </div>`;
}

function wireProgressCalendar(container, stats) {
  container.querySelectorAll("#progress-cal-grid .calendar-day").forEach((btn) => {
    btn.addEventListener("click", () => {
      selectedDateKey = btn.dataset.dateKey;
      container.querySelectorAll("#progress-cal-grid .calendar-day.is-selected").forEach((el) => {
        if (el !== btn) el.classList.remove("is-selected");
      });
      btn.classList.add("is-selected");
      openDaySummary(btn.dataset.dateKey, stats.perHabit);
    });
  });
}

function emptyTodayHtml() {
  return `
    <div class="empty-state card">
      <span class="empty-emoji">🏔️</span>
      <p>Пока нет привычек. Добавьте первую на вкладке «Привычки», чтобы начать восхождение.</p>
    </div>`;
}

// Diffing state for the "just marked done" bounce animation (see
// check-pop in components.css). Rebuilt as a plain module-level variable
// rather than something threaded through render() — the today list is
// always keyed by the current day (tKey), so a change of day is itself
// the signal to drop any stale history and not bounce anything on the
// first render of a new day.
let previouslyDoneToday = null;
let previouslyDoneForKey = null;
// A single user action (e.g. tapping a checkbox) can trigger more than one
// subscribe(render) pass in the very same tick — e.g. marking a habit done
// can also unlock an achievement, which persists state again and fires a
// second notification. If the baseline were updated synchronously inside
// this function, that second pass would see the first pass's own freshly-
// applied change as "already old" and render without the bounce class,
// clobbering the DOM the first pass just produced. So the baseline is only
// committed once the current synchronous batch of renders has fully
// drained (queueMicrotask), and every call within that batch diffs against
// the same pre-batch snapshot.
let pendingDoneIds = null;
let baselineUpdateQueued = false;

function todayListHtml(stats, tKey) {
  if (previouslyDoneForKey !== tKey) {
    previouslyDoneToday = new Set();
    previouslyDoneForKey = tKey;
  }

  const currentDoneIds = new Set();
  stats.perHabit.forEach(({ habit, entries }) => {
    if (isDayComplete(habit, entries[tKey])) currentDoneIds.add(habit.id);
  });
  const justCompleted = new Set([...currentDoneIds].filter((id) => !previouslyDoneToday.has(id)));

  pendingDoneIds = currentDoneIds;
  const keyAtSchedule = tKey;
  if (!baselineUpdateQueued) {
    baselineUpdateQueued = true;
    queueMicrotask(() => {
      baselineUpdateQueued = false;
      if (previouslyDoneForKey === keyAtSchedule) previouslyDoneToday = pendingDoneIds;
    });
  }

  const items = stats.perHabit
    .map(({ habit, entries, currentStreak }) => {
      const value = entries[tKey];
      const done = isDayComplete(habit, value);
      const checkClass = `today-check${justCompleted.has(habit.id) ? " just-completed" : ""}`;
      const avatar = todayAvatarIcon(habit);
      if (habit.type === "boolean") {
        return `
          <li class="today-item ${done ? "is-done" : ""}" data-habit-id="${habit.id}" data-type="boolean">
            ${avatar}
            <div class="today-item-body">
              <div class="today-item-name">${escapeHtml(habit.name)}</div>
              <div class="today-item-streak">${currentStreak > 0 ? `🔥 ${currentStreak} дн. подряд` : "Отметьте сегодня"}</div>
            </div>
            <button type="button" class="${checkClass}" data-action="toggle">${done ? "✓" : ""}</button>
          </li>`;
      }
      return `
        <li class="today-item ${done ? "is-done" : ""}" data-habit-id="${habit.id}" data-type="numeric">
          ${avatar}
          <div class="today-item-body">
            <div class="today-item-name">${escapeHtml(habit.name)}</div>
            <div class="today-item-streak">${currentStreak > 0 ? `🔥 ${currentStreak} дн. подряд` : habit.unit || "Введите число"}</div>
          </div>
          <input class="today-item-input" type="number" min="0" inputmode="numeric" data-action="number" value="${typeof value === "number" ? value : ""}" placeholder="0" />
          <button type="button" class="${checkClass}" data-action="toggle" aria-hidden="true">${done ? "✓" : ""}</button>
        </li>`;
    })
    .join("");

  return `<ul class="today-list">${items}</ul>`;
}

function wireTodayList(container, stats, tKey) {
  container.querySelectorAll(".today-item").forEach((item) => {
    const habitId = item.dataset.habitId;
    const type = item.dataset.type;

    if (type === "boolean") {
      item.querySelector('[data-action="toggle"]').addEventListener("click", () => {
        const currentlyDone = item.classList.contains("is-done");
        setEntry(habitId, tKey, !currentlyDone);
      });
    } else {
      const input = item.querySelector('[data-action="number"]');
      const commit = () => {
        const raw = input.value.trim();
        if (raw === "") {
          setEntry(habitId, tKey, null);
          return;
        }
        const num = Number(raw);
        if (!Number.isNaN(num) && num >= 0) setEntry(habitId, tKey, num);
      };
      input.addEventListener("change", commit);
      input.addEventListener("blur", commit);
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          input.blur();
        }
      });
    }
  });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
