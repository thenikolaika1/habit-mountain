import { CHALLENGE_POOL, DIFFICULTY_META, getCompletedChallengesMap, getIncompleteChallengesMap, getMedalForChallenge } from "../logic/challenges.js";
import { monthLabel } from "../logic/dateUtils.js";
import { achievementsBannerHtml, challengeHeroForId, challengeProgressBadge, wirePhotoFallback } from "../illustrations.js";

export function renderAchievementsView(container) {
  const completedChallenges = getCompletedChallengesMap();
  const incompleteChallenges = getIncompleteChallengesMap();

  const passedChallenges = CHALLENGE_POOL.filter((c) => completedChallenges[c.id]);
  const challengeCards = passedChallenges.map((c) => achievementCardHtml(c, completedChallenges[c.id])).join("");

  // A challenge only ever shows here once it's completed OR its month has
  // actually ended without completing (see archiveEndedMonthChallenges()) —
  // never for one still running in the current month, which belongs on
  // the Испытания screen instead, not here.
  const unfinishedChallenges = CHALLENGE_POOL.filter((c) => incompleteChallenges[c.id]);
  const unfinishedCards = unfinishedChallenges.map((c) => incompleteCardHtml(c, incompleteChallenges[c.id])).join("");

  container.innerHTML = `
    <section class="view">
      <div class="view-header">
        <h1>Достижения</h1>
      </div>

      ${achievementsBannerHtml()}

      <h3 class="section-heading">Пройденные испытания</h3>
      ${
        passedChallenges.length === 0
          ? `<div class="empty-state card"><p>Пока ни одно испытание не пройдено — загляните во вкладку «Испытания».</p></div>`
          : `<div class="achievements-grid">${challengeCards}</div>`
      }

      ${
        unfinishedChallenges.length > 0
          ? `<h3 class="section-heading">Незавершённые попытки</h3>
             <div class="achievements-grid">${unfinishedCards}</div>`
          : ""
      }
    </section>
  `;

  wirePhotoFallback(container);
}

function achievementCardHtml(a, info) {
  const date = formatShortDate(info.unlockedAt);
  return `
    <div class="achievement-card media-card">
      ${challengeHeroForId(a.id, getMedalForChallenge(a.id, info.monthKey))}
      <div class="media-card-scrim">
        <div class="media-card-title">${a.title}</div>
        <div class="media-card-meta">Получено ${date}</div>
      </div>
    </div>`;
}

/** A challenge whose active month ended without completing — same illustration, desaturated (see .achievement-card--incomplete), same corner badges as the active challenge card (progress donut left, difficulty right), frozen at however far it got. */
function incompleteCardHtml(challenge, info) {
  const diff = DIFFICULTY_META[challenge.difficulty];
  const pct = Math.round(info.progress * 100);
  return `
    <div class="achievement-card achievement-card--incomplete media-card">
      ${challengeHeroForId(challenge.id, getMedalForChallenge(challenge.id, info.monthKey))}
      <span class="media-card-badge">${challengeProgressBadge({ pct: info.progress, done: false })}</span>
      <span class="media-card-badge media-card-badge--left challenge-difficulty-badge ${diff.className}">
        <span class="challenge-difficulty-dot"></span>${diff.label}
      </span>
      <div class="media-card-scrim">
        <div class="media-card-title">${challenge.title}</div>
        <div class="media-card-meta">Не завершено — прогресс ${pct}% (${monthLabelFromKey(info.monthKey)})</div>
      </div>
    </div>`;
}

function monthLabelFromKey(key) {
  const [y, m] = key.split("-").map(Number);
  return monthLabel(y, m - 1);
}

function formatShortDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}
