// Fullscreen confetti celebration for reaching 100% mountain progress —
// once per calendar month, regardless of which screen the triggering
// action happened on. Checked unconditionally at the end of every
// js/app.js render() pass (same slot as onOnboardingTick()/
// maybeShowMonthRecap()), so it fires the moment any state mutation
// (a habit ticked on Привычки, a numeric entry saved from a day-detail
// popup, anything) or even a plain tab switch brings the current month's
// progress to 100% — no per-screen wiring needed.
//
// Deliberately separate from js/logic/achievements.js's "summit" entry:
// that one is a lifetime one-way ratchet (fires once ever, first time
// only) — this needs to re-fire every month, so it tracks its own
// "YYYY-MM already shown" flag instead (state.meta.summitCelebrationShownMonth).
import { loadState, saveState } from "../state/storage.js";
import { getHabits } from "../state/habits.js";
import { getEntriesByHabit } from "../state/derive.js";
import { computeMonthMountainProgress } from "../logic/progress.js";
import { todayParts, monthKey } from "../logic/dateUtils.js";

const AUTO_DISMISS_MS = 6000;
const CONFETTI_COUNT = 56;
// Existing palette tokens only — "green-gold" without a single new hex
// value: the app's usual accent green/dark-green, --color-warning (a warm
// amber/gold, already used for the "medium difficulty" dot elsewhere) and
// white for sparkle.
const CONFETTI_COLORS = ["var(--color-accent)", "var(--color-accent-dark)", "var(--color-warning)", "#ffffff"];

// Guards against a second overlay stacking on top of itself — belt and
// suspenders alongside the persisted monthKey check below, which is what
// actually prevents a repeat show (see checkSummitCelebration()'s own
// comment on why that check alone already can't double-fire).
let active = false;
let dismissTimer = null;

export function checkSummitCelebration() {
  if (active) return;

  const habits = getHabits(); // excludes archived habits by default
  if (habits.length === 0) return;

  const state = loadState();
  const t = todayParts();
  const currentKey = monthKey(t.year, t.month);
  if (state.meta.summitCelebrationShownMonth === currentKey) return;

  const entriesByHabit = getEntriesByHabit(habits);
  const progress = computeMonthMountainProgress(t.year, t.month, habits, entriesByHabit);
  if (progress < 1) return;

  // Persisted BEFORE showCelebration() runs: saveState() below
  // synchronously notifies subscribers, which re-enters render() ->
  // checkSummitCelebration() in the same call stack (js/app.js's
  // subscribe(render)) -- with the flag already written, that re-entrant
  // call's own currentKey check above short-circuits instead of opening
  // a second overlay.
  state.meta.summitCelebrationShownMonth = currentKey;
  saveState(state);

  showCelebration();
}

function showCelebration() {
  const root = document.getElementById("celebration-root");
  if (!root) return;
  active = true;

  root.innerHTML = `
    <div class="summit-celebration">
      <div class="summit-confetti">${confettiPiecesHtml()}</div>
      <div class="summit-celebration-content">
        <p class="summit-celebration-emoji">🏔️</p>
        <h2 class="summit-celebration-title">Вершина покорена!</h2>
        <p class="summit-celebration-subtitle">Гора этого месяца пройдена на 100% — невероятная стабильность!</p>
        <button type="button" class="summit-celebration-btn" id="summit-celebration-ok">Отлично!</button>
      </div>
    </div>
  `;

  // A single listener on the whole overlay covers both "tap anywhere" and
  // the button -- the button is just a more discoverable affordance for
  // the exact same dismiss action, not a functionally distinct one.
  root.querySelector(".summit-celebration").addEventListener("click", close);
  dismissTimer = setTimeout(close, AUTO_DISMISS_MS);
}

function close() {
  clearTimeout(dismissTimer);
  const root = document.getElementById("celebration-root");
  if (root) root.innerHTML = "";
  active = false;
}

function confettiPiecesHtml() {
  let html = "";
  for (let i = 0; i < CONFETTI_COUNT; i++) {
    const left = (Math.random() * 100).toFixed(1);
    const delay = (Math.random() * 0.6).toFixed(2);
    const duration = (2.2 + Math.random() * 1.4).toFixed(2);
    const drift = Math.floor(Math.random() * 80 - 40);
    const rotateStart = Math.floor(Math.random() * 360);
    const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
    html += `<span class="confetti-piece" style="left:${left}%; background:${color}; animation-delay:${delay}s; animation-duration:${duration}s; --drift:${drift}px; --rotate-start:${rotateStart}deg;"></span>`;
  }
  return html;
}
