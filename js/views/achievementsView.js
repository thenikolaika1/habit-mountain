import { getAppStats } from "../state/derive.js";
import { CHALLENGE_POOL, DIFFICULTY_META, getCompletedChallengesMap, getIncompleteChallengesMap, getMedalForChallenge } from "../logic/challenges.js";
import { ACHIEVEMENTS, getUnlockedMap } from "../logic/achievements.js";
import { monthLabel } from "../logic/dateUtils.js";
import { openModal } from "../components/modal.js";
import { achievementsBannerHtml, challengeHeroForId, challengeProgressBadge, wirePhotoFallback } from "../illustrations.js";

export function renderAchievementsView(container) {
  // Called only for its side effect (evaluateAndUnlock()/
  // evaluateAndUnlockChallenges() inside it) — this screen otherwise just
  // reads already-persisted maps below. Without this, a newly-earned
  // long-term achievement or monthly challenge wouldn't actually get
  // evaluated/saved until the user happened to visit Прогресс/Испытания
  // first — this screen used to have that same gap for challenges too.
  getAppStats();

  const unlockedAchievements = getUnlockedMap();
  const completedChallenges = getCompletedChallengesMap();
  const incompleteChallenges = getIncompleteChallengesMap();

  // Long-term achievements (js/logic/achievements.js's ACHIEVEMENTS) track
  // continuously across month boundaries — no reset, unlike CHALLENGE_POOL
  // below — so they get their own section, in ACHIEVEMENTS' own declared
  // order (easiest first, "Покоритель вершины" last).
  const earnedAchievements = ACHIEVEMENTS.filter((a) => unlockedAchievements[a.id]);
  const achievementCards = earnedAchievements.map((a) => longTermTileHtml(a, unlockedAchievements[a.id])).join("");

  const passedChallenges = CHALLENGE_POOL.filter((c) => completedChallenges[c.id]);
  const challengeCards = passedChallenges.map((c) => achievementTileHtml(c, completedChallenges[c.id])).join("");

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

      <h3 class="section-heading">Особые достижения</h3>
      ${
        earnedAchievements.length === 0
          ? `<div class="empty-state card"><p>Пока нет особых достижений — сложные долгосрочные цели (например, 100-дневный стрик) появятся здесь автоматически, как только будут выполнены.</p></div>`
          : `<div class="achievements-list">${achievementCards}</div>`
      }

      <h3 class="section-heading">Пройденные испытания</h3>
      ${
        passedChallenges.length === 0
          ? `<div class="empty-state card"><p>Пока ни одно испытание не пройдено — загляните во вкладку «Испытания».</p></div>`
          : `<div class="achievements-list">${challengeCards}</div>`
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

  container.querySelectorAll(".achievement-tile[data-achievement-id]").forEach((tile) => {
    const achievement = ACHIEVEMENTS.find((a) => a.id === tile.dataset.achievementId);
    const info = unlockedAchievements[tile.dataset.achievementId];
    if (achievement && info) tile.addEventListener("click", () => openLongTermAchievementDetail(achievement, info));
  });

  container.querySelectorAll(".achievement-tile[data-challenge-id]").forEach((tile) => {
    const challenge = CHALLENGE_POOL.find((c) => c.id === tile.dataset.challengeId);
    const info = completedChallenges[tile.dataset.challengeId];
    if (challenge && info) tile.addEventListener("click", () => openAchievementDetail(challenge, info));
  });
}

/** Same compact row as achievementTileHtml() below, for a long-term
 * ACHIEVEMENTS entry instead of a CHALLENGE_POOL one — the medal slot is
 * the achievement's own emoji in a plain gradient badge
 * (.achievement-tile-medal--icon) rather than challengeHeroForId()'s
 * photo/SVG, since these aren't tied to any month's medal rotation. */
function longTermTileHtml(a, info) {
  const date = formatShortDate(info.unlockedAt);
  return `
    <button type="button" class="achievement-tile" data-achievement-id="${a.id}">
      <div class="achievement-tile-medal achievement-tile-medal--icon">${a.icon}</div>
      <div class="achievement-tile-body">
        <div class="settings-row-title">${a.title}</div>
        <div class="settings-row-desc">Получено ${date}</div>
      </div>
    </button>`;
}

/** Detail popup for a long-term achievement tile — mirrors
 * openAchievementDetail() below, minus the difficulty badge (ACHIEVEMENTS
 * entries have no CHALLENGE_POOL-style difficulty tier). */
function openLongTermAchievementDetail(achievement, info) {
  openModal({
    title: achievement.title,
    bodyHtml: `
      <div class="achievement-detail-medal achievement-detail-medal--icon">${achievement.icon}</div>
      <p class="modal-message">${achievement.description}</p>
      <p class="modal-message"><span class="summary-value">Получено ${formatShortDate(info.unlockedAt)}</span></p>
    `,
  });
}

/**
 * Compact clickable row — a small medal thumbnail + title/date, instead of
 * the full-bleed .media-card photo the challenge cards elsewhere use. A
 * lifetime achievement earned in some past month doesn't need a big hero
 * photo to stay legible, and a list of several used to read as a wall of
 * near-identical giant cards; this scales down cleanly to any count. A
 * real <button> (same reasoning as .popular-habit-card/.achievements-banner
 * elsewhere) — keyboard activation comes for free. challengeHeroForId()'s
 * output is unchanged; it's absolutely-positioned (inset: 0) so it fills
 * whatever box it's given — .achievement-tile-medal just gives it a small
 * one instead of a full-width one.
 */
function achievementTileHtml(a, info) {
  const date = formatShortDate(info.unlockedAt);
  return `
    <button type="button" class="achievement-tile" data-challenge-id="${a.id}">
      <div class="achievement-tile-medal">${challengeHeroForId(a.id, getMedalForChallenge(a.id, info.monthKey))}</div>
      <div class="achievement-tile-body">
        <div class="settings-row-title">${a.title}</div>
        <div class="settings-row-desc">Получено ${date}</div>
      </div>
    </button>`;
}

/** Detail popup for a completed achievement tile — the challenge's own
 * description, its difficulty (see incompleteCardHtml() below for the same
 * DIFFICULTY_META lookup), and the date it was earned. Mirrors
 * challengesView.js's openChallengeDetail() for an active challenge card,
 * just fed unlockedAt/monthKey from the completed-challenges map instead
 * of live monthStats. */
function openAchievementDetail(challenge, info) {
  const diff = DIFFICULTY_META[challenge.difficulty];
  openModal({
    title: challenge.title,
    bodyHtml: `
      <div class="achievement-detail-medal">${challengeHeroForId(challenge.id, getMedalForChallenge(challenge.id, info.monthKey))}</div>
      <p class="modal-message">${challenge.description}</p>
      <div class="achievement-detail-meta">
        <span class="challenge-difficulty-badge challenge-difficulty-badge--standalone ${diff.className}">
          <span class="challenge-difficulty-dot"></span>${diff.label}
        </span>
        <span class="summary-value">Получено ${formatShortDate(info.unlockedAt)}</span>
      </div>
    `,
  });
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
