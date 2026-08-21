import { getAppStats } from "../state/derive.js";
import { CHALLENGE_POOL, DIFFICULTY_META, pickMonthlyChallenges, getCompletedChallengesMap, getChallengeProgress } from "../logic/challenges.js";
import { todayParts, monthKey, monthLabel } from "../logic/dateUtils.js";
import { openModal } from "../components/modal.js";
import { showToast } from "../components/toast.js";
import { medalIllustration, statusRing, challengeHeroForId } from "../illustrations.js";

export function renderChallengesView(container) {
  const { newlyCompletedChallenges, monthStats } = getAppStats();

  if (newlyCompletedChallenges.length > 0) {
    const first = CHALLENGE_POOL.find((c) => c.id === newlyCompletedChallenges[0]);
    showToast(`🏅 Испытание пройдено: ${first ? first.title : ""}`);
  }

  const t = todayParts();
  const currentMonthKey = monthKey(t.year, t.month);
  const active = pickMonthlyChallenges(currentMonthKey);
  const completed = getCompletedChallengesMap();

  container.innerHTML = `
    <section class="view">
      <div class="view-header">
        <div>
          <h1>Испытай себя!</h1>
          <p class="mountain-month-subtitle">Испытания за ${monthLabel(t.year, t.month)} · обновляются 1-го числа</p>
        </div>
      </div>

      <div class="illustration-frame">${medalIllustration()}</div>

      <div class="challenge-list">
        ${active.map((c) => challengeCardHtml(c, Boolean(completed[c.id]), monthStats)).join("")}
      </div>
    </section>
  `;

  container.querySelectorAll(".challenge-card").forEach((card) => {
    card.addEventListener("click", () => {
      const challenge = active.find((c) => c.id === card.dataset.challengeId);
      if (challenge) openChallengeDetail(challenge, Boolean(completed[challenge.id]), monthStats);
    });
  });
}

function challengeCardHtml(challenge, done, monthStats) {
  const pct = done ? 1 : getChallengeProgress(challenge, monthStats);
  const diff = DIFFICULTY_META[challenge.difficulty];
  return `
    <div class="challenge-card media-card ${done ? "is-done" : ""}" data-challenge-id="${challenge.id}" role="button" tabindex="0">
      ${challengeHeroForId(challenge.id)}
      <span class="media-card-badge">${statusRing({ state: done ? "done" : "empty", size: 34, pct })}</span>
      <div class="media-card-scrim">
        <div class="challenge-difficulty">
          <span class="challenge-difficulty-dot ${diff.className}"></span>
          ${diff.label}
        </div>
        <div class="media-card-title">${challenge.title}</div>
        <div class="media-card-meta">${challenge.description}</div>
        ${challengeProgressBarHtml(pct, done)}
      </div>
    </div>`;
}

/** Shared with achievementsView.js's incomplete-attempt cards — a thin fill bar + percentage label. `tone` picks the fill color: "accent" (still achievable, this month's active card) or "muted" (an archived, no-longer-achievable attempt). */
export function challengeProgressBarHtml(pct, done, { tone = "accent" } = {}) {
  if (done) return "";
  const roundedPct = Math.round(pct * 100);
  return `
    <div class="challenge-progress">
      <div class="challenge-progress-track"><div class="challenge-progress-fill challenge-progress-fill--${tone}" style="width:${roundedPct}%"></div></div>
      <span class="challenge-progress-label">${roundedPct}%</span>
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
