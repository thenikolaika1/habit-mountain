import { getAppStats } from "../state/derive.js";
import { setEntry } from "../state/entries.js";
import { todayKey } from "../logic/dateUtils.js";
import { isDayComplete } from "../logic/completion.js";
import { buildMountainSvg } from "../mountainSvg.js";
import { stageForProgress } from "../logic/progress.js";
import { ACHIEVEMENTS } from "../logic/achievements.js";
import { showToast } from "../components/toast.js";

export function renderMountainView(container) {
  const { stats, newlyUnlocked } = getAppStats();
  const tKey = todayKey();

  if (newlyUnlocked.length > 0) {
    const first = ACHIEVEMENTS.find((a) => a.id === newlyUnlocked[0]);
    showToast(`🏆 Новая ачивка: ${first ? first.title : ""}`);
  }

  const stage = stageForProgress(stats.overallProgress);
  const progressPct = Math.round(stats.overallProgress * 100);

  container.innerHTML = `
    <section class="view">
      <div class="view-header">
        <h1>Гора привычек</h1>
      </div>

      <div class="stats-row">
        <div class="stat-pill">
          <div class="stat-value">${stats.totalPoints}</div>
          <div class="stat-label">Очки</div>
        </div>
        <div class="stat-pill">
          <div class="stat-value">${stats.overallCurrentStreak}</div>
          <div class="stat-label">Общий стрик</div>
        </div>
        <div class="stat-pill">
          <div class="stat-value">${progressPct}%</div>
          <div class="stat-label">${stage.label}</div>
        </div>
      </div>

      <div class="mountain-wrap">
        <span class="mountain-progress-caption">${progressPct}% · ${stage.label}</span>
        ${buildMountainSvg(stats.overallProgress)}
      </div>

      <h3 class="section-heading">Сегодня</h3>
      ${stats.activeHabits.length === 0 ? emptyTodayHtml() : todayListHtml(stats, tKey)}
    </section>
  `;

  wireTodayList(container, stats, tKey);
}

function emptyTodayHtml() {
  return `
    <div class="empty-state card">
      <span class="empty-emoji">🏔️</span>
      <p>Пока нет привычек. Добавьте первую на вкладке «Привычки», чтобы начать восхождение.</p>
    </div>`;
}

function todayListHtml(stats, tKey) {
  const items = stats.perHabit
    .map(({ habit, entries, currentStreak }) => {
      const value = entries[tKey];
      const done = isDayComplete(habit, value);
      if (habit.type === "boolean") {
        return `
          <li class="today-item ${done ? "is-done" : ""}" data-habit-id="${habit.id}" data-type="boolean">
            <button type="button" class="today-check" data-action="toggle">${done ? "✓" : ""}</button>
            <div class="today-item-body">
              <div class="today-item-name">${escapeHtml(habit.name)}</div>
              <div class="today-item-streak">${currentStreak > 0 ? `🔥 ${currentStreak} дн. подряд` : "Отметьте сегодня"}</div>
            </div>
          </li>`;
      }
      return `
        <li class="today-item ${done ? "is-done" : ""}" data-habit-id="${habit.id}" data-type="numeric">
          <button type="button" class="today-check" data-action="toggle" aria-hidden="true">${done ? "✓" : ""}</button>
          <div class="today-item-body">
            <div class="today-item-name">${escapeHtml(habit.name)}</div>
            <div class="today-item-streak">${currentStreak > 0 ? `🔥 ${currentStreak} дн. подряд` : habit.unit || "Введите число"}</div>
          </div>
          <input class="today-item-input" type="number" min="0" inputmode="numeric" data-action="number" value="${typeof value === "number" ? value : ""}" placeholder="0" />
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
