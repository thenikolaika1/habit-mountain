// A once-per-month check: if the app is opened for the first time in a new
// calendar month, show a recap of how far up last month's mountain the
// user got before the mountain visually resets to 0% for the new month.
// This is a one-way ratchet (same pattern as achievements.js's unlock
// tracking) driven by meta.lastSeenMonth, so it fires exactly once per
// month transition, not on every render.

import { loadState, saveState } from "../state/storage.js";
import { getHabits } from "../state/habits.js";
import { getEntriesByHabit } from "../state/derive.js";
import { computeMonthMountainProgress, stageForProgress } from "../logic/progress.js";
import { todayParts, prevMonth, monthKey, monthLabel } from "../logic/dateUtils.js";
import { openModal } from "./modal.js";

export function maybeShowMonthRecap() {
  const state = loadState();
  const today = todayParts();
  const currentKey = monthKey(today.year, today.month);
  const lastSeenKey = state.meta.lastSeenMonth;

  if (lastSeenKey && lastSeenKey !== currentKey) {
    showRecap(prevMonth(today));
  }

  if (lastSeenKey !== currentKey) {
    state.meta.lastSeenMonth = currentKey;
    saveState(state);
  }
}

function showRecap({ year, month }) {
  const habits = getHabits().filter((h) => !h.archived);
  if (habits.length === 0) return; // nothing was tracked last month, nothing to recap

  const entriesByHabit = getEntriesByHabit(habits);
  const progress = computeMonthMountainProgress(year, month, habits, entriesByHabit);
  const pct = Math.round(progress * 100);
  const stage = stageForProgress(progress);
  const reachedSummit = progress >= 1;

  const resultLine = reachedSummit
    ? "🚩 Вершина покорена! Отличная стабильность весь месяц."
    : `Вы поднялись до этапа «${stage.label}». В этот раз до вершины не хватило — но гора уже ждёт нового восхождения.`;

  openModal({
    title: `Итоги месяца: ${monthLabel(year, month)}`,
    bodyHtml: `
      <p class="month-recap-pct">${pct}%</p>
      <p class="modal-message">${resultLine}</p>
      <p class="modal-message">Новый месяц — новая гора: прогресс обнулился, восхождение начинается заново.</p>
      <div class="modal-actions">
        <button type="button" class="btn btn-primary btn-block" id="recap-ok">Начать новый месяц</button>
      </div>
    `,
    onMount: (sheet, close) => {
      sheet.querySelector("#recap-ok").addEventListener("click", close);
    },
  });
}
