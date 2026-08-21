import { getAppStats } from "../state/derive.js";
import { CHALLENGE_POOL, DIFFICULTY_META, DIFFICULTY_RANK, pickMonthlyChallenges, getCompletedChallengesMap, getChallengeProgress, getMedalForChallenge } from "../logic/challenges.js";
import { todayParts, monthKey, monthLabel } from "../logic/dateUtils.js";
import { openModal } from "../components/modal.js";
import { showToast } from "../components/toast.js";
import { medalHeaderPhoto, challengeProgressBadge, challengeHeroForId, wirePhotoFallback } from "../illustrations.js";

export function renderChallengesView(container) {
  const { newlyCompletedChallenges, monthStats } = getAppStats();

  if (newlyCompletedChallenges.length > 0) {
    const first = CHALLENGE_POOL.find((c) => c.id === newlyCompletedChallenges[0]);
    showToast(`🏅 Испытание пройдено: ${first ? first.title : ""}`);
  }

  const t = todayParts();
  const currentMonthKey = monthKey(t.year, t.month);
  // Sorted easy -> medium -> hard (stable, so same-tier challenges keep
  // pickMonthlyChallenges()'s own order) — the pool's picked-per-month
  // order has no relation to difficulty on its own.
  const active = pickMonthlyChallenges(currentMonthKey)
    .slice()
    .sort((a, b) => DIFFICULTY_RANK[a.difficulty] - DIFFICULTY_RANK[b.difficulty]);
  const completed = getCompletedChallengesMap();

  container.innerHTML = `
    <section class="view">
      <div class="view-header">
        <div class="challenges-title">
          <h1>Испытай себя!</h1>
          <p class="mountain-month-subtitle">Испытания за ${monthLabel(t.year, t.month)} · обновляются 1-го числа</p>
        </div>
      </div>

      <div class="illustration-frame">${medalHeaderPhoto()}</div>

      <div class="challenge-list">
        ${active.map((c) => challengeCardHtml(c, Boolean(completed[c.id]), monthStats, currentMonthKey)).join("")}
      </div>
    </section>
  `;

  wirePhotoFallback(container);

  container.querySelectorAll(".challenge-card").forEach((card) => {
    card.addEventListener("click", () => {
      const challenge = active.find((c) => c.id === card.dataset.challengeId);
      if (challenge) openChallengeDetail(challenge, Boolean(completed[challenge.id]), monthStats);
    });
  });
}

function challengeCardHtml(challenge, done, monthStats, activeMonthKey) {
  const pct = done ? 1 : getChallengeProgress(challenge, monthStats);
  const diff = DIFFICULTY_META[challenge.difficulty];
  return `
    <div class="challenge-card media-card ${done ? "is-done" : ""}" data-challenge-id="${challenge.id}" role="button" tabindex="0">
      ${challengeHeroForId(challenge.id, getMedalForChallenge(challenge.id, activeMonthKey))}
      <span class="media-card-badge">${challengeProgressBadge({ pct, done })}</span>
      <span class="media-card-badge media-card-badge--left challenge-difficulty-badge ${diff.className}">
        <span class="challenge-difficulty-dot"></span>${diff.label}
      </span>
      <div class="media-card-scrim">
        <div class="media-card-title">${challenge.title}</div>
        <div class="media-card-meta">${challenge.description}</div>
      </div>
    </div>`;
}

function openChallengeDetail(challenge, done, monthStats) {
  const pct = Math.round((done ? 1 : getChallengeProgress(challenge, monthStats)) * 100);
  openModal({
    title: challenge.title,
    bodyHtml: `
      <p class="modal-message">${challenge.description}</p>
      <p class="modal-message">${
        done
          ? "🏅 Это испытание уже пройдено в этом месяце — оно сохранено в разделе «Достижения»."
          : `Выполняйте привычки в течение месяца — испытание засчитается автоматически, как только условие выполнится. Текущий прогресс: ${pct}%.`
      }</p>
    `,
    onMount: () => {},
  });
}
