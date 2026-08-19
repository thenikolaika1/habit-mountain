import { getAppStats } from "../state/derive.js";
import { ACHIEVEMENTS, getUnlockedMap } from "../logic/achievements.js";

export function renderAchievementsView(container) {
  // Recompute stats so any achievement earned this instant shows immediately.
  getAppStats();
  const unlocked = getUnlockedMap();

  const cards = ACHIEVEMENTS.map((a) => {
    const info = unlocked[a.id];
    const date = info ? formatShortDate(info.unlockedAt) : "";
    return `
      <div class="achievement-card ${info ? "" : "is-locked"}">
        <div class="achievement-icon">${a.icon}</div>
        <div class="achievement-title">${a.title}</div>
        <div class="achievement-desc">${a.description}</div>
        ${info ? `<div class="achievement-date">Получено ${date}</div>` : ""}
      </div>`;
  }).join("");

  container.innerHTML = `
    <section class="view">
      <div class="view-header">
        <h1>Достижения</h1>
      </div>
      <div class="achievements-grid">${cards}</div>
    </section>
  `;
}

function formatShortDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}
