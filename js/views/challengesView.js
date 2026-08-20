import { getAppStats } from "../state/derive.js";
import { CHALLENGE_POOL, pickMonthlyChallenges, getCompletedChallengesMap } from "../logic/challenges.js";
import { todayParts, monthKey, monthLabel } from "../logic/dateUtils.js";
import { openModal } from "../components/modal.js";
import { showToast } from "../components/toast.js";
import { medalIllustration, statusRing } from "../illustrations.js";

export function renderChallengesView(container) {
  const { newlyCompletedChallenges } = getAppStats();

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
        ${active.map((c) => challengeCardHtml(c, Boolean(completed[c.id]))).join("")}
      </div>
    </section>
  `;

  container.querySelectorAll(".challenge-card").forEach((card) => {
    card.addEventListener("click", () => {
      const challenge = active.find((c) => c.id === card.dataset.challengeId);
      if (challenge) openChallengeDetail(challenge, Boolean(completed[challenge.id]));
    });
  });
}

function challengeCardHtml(challenge, done) {
  return `
    <div class="challenge-card ${done ? "is-done" : ""}" data-challenge-id="${challenge.id}" role="button" tabindex="0">
      <div class="challenge-card-icon">${challenge.icon}</div>
      <div class="challenge-card-body">
        <div class="challenge-card-title">${challenge.title}</div>
        <div class="challenge-card-desc">${challenge.description}</div>
      </div>
      <span class="challenge-card-status">${statusRing({ state: done ? "done" : "empty" })}</span>
    </div>`;
}

function openChallengeDetail(challenge, done) {
  openModal({
    title: challenge.title,
    bodyHtml: `
      <p class="modal-message">${challenge.description}</p>
      <p class="modal-message">${done ? "🏅 Это испытание уже пройдено в этом месяце — оно сохранено в разделе «Достижения»." : "Выполняйте привычки в течение месяца — испытание засчитается автоматически, как только условие выполнится."}</p>
    `,
    onMount: () => {},
  });
}
