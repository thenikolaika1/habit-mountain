import { getAppStats } from "../state/derive.js";
import { CHALLENGE_POOL, getCompletedChallengesMap } from "../logic/challenges.js";
import { trophyIllustration, challengeHeroForId } from "../illustrations.js";

export function renderAchievementsView(container) {
  // Recompute stats so anything earned this instant shows immediately.
  getAppStats();
  const completedChallenges = getCompletedChallengesMap();

  const passedChallenges = CHALLENGE_POOL.filter((c) => completedChallenges[c.id]);
  const challengeCards = passedChallenges.map((c) => achievementCardHtml(c, completedChallenges[c.id])).join("");

  container.innerHTML = `
    <section class="view">
      <div class="view-header">
        <h1>Достижения</h1>
      </div>

      <div class="illustration-frame">${trophyIllustration()}</div>

      <h3 class="section-heading">Пройденные испытания</h3>
      ${
        passedChallenges.length === 0
          ? `<div class="empty-state card"><p>Пока ни одно испытание не пройдено — загляните во вкладку «Испытания».</p></div>`
          : `<div class="achievements-grid">${challengeCards}</div>`
      }
    </section>
  `;
}

function achievementCardHtml(a, info) {
  const date = formatShortDate(info.unlockedAt);
  return `
    <div class="achievement-card media-card">
      ${challengeHeroForId(a.id)}
      <div class="media-card-scrim">
        <div class="media-card-title">${a.title}</div>
        <div class="media-card-meta">Получено ${date}</div>
      </div>
    </div>`;
}

function formatShortDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}
