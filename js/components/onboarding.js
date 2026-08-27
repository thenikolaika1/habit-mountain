// Interactive first-run tutorial: a spotlight overlay that dims everything
// except one real UI element per step, advancing only when the user
// actually performs that element's real action (a real tap on a real tab,
// a real habit getting created, a real "done" entry) — never a synthetic
// "Next" button. See PROGRESS.md for the full design writeup; the short
// version of the two trickiest constraints:
//
// 1. js/app.js's render() rebuilds #tabbar-container and the current
//    view's whole DOM subtree from scratch on every state change AND every
//    hashchange — so this module never holds a DOM reference across ticks,
//    always re-queries the current target fresh, and hooks a single
//    onOnboardingTick() call at the very end of render() (app.js) instead
//    of an independent subscribe()/hashchange listener of its own — that
//    ordering guarantees this module only ever sees the DOM/route *after*
//    render() has already finished rebuilding it for this pass.
// 2. The spotlight is 4 independent position:fixed rectangles (top/
//    bottom/left/right) around the target's own getBoundingClientRect(),
//    not a clip-path cutout — the cutout region simply has no element
//    over it, so a real click reaches the real target natively, no
//    pointer-events trickery needed.
import { loadState, saveState } from "../state/storage.js";
import { getHabits } from "../state/habits.js";
import { getEntry } from "../state/entries.js";
import { isDayComplete } from "../logic/completion.js";
import { todayKey } from "../logic/dateUtils.js";

const SPOTLIGHT_PADDING = 8;
const MARK_DONE_ALREADY_TRUE_DELAY_MS = 900;
const MOUNTAIN_STEP_TIMER_MS = 2500;
const TARGET_RETRY_LIMIT = 15; // ~1.5s of retrying (100ms apart) before giving up on a step's target

// Cached refs to the overlay's own DOM, valid only while a tour is active
// (rebuilt fresh by mountRoot() every startOnboarding() call) — unlike
// #view-container, this module fully owns #onboarding-root's lifecycle
// itself, so holding refs across ticks here is safe.
const dom = { bands: null, ring: null, tooltip: null, tooltipStep: null, tooltipText: null };

// The single run currently in progress, or null when no tour is active.
let active = null;

function buildSteps(startedWithHabits) {
  const steps = [];

  steps.push({
    id: "tabbar",
    route: null,
    findTarget: () => document.querySelector(".tabbar-inner"),
    radius: "var(--radius-lg)",
    text: "Внизу — главное меню приложения: Испытания, Привычки, Прогресс, Достижения и Настройки.",
    isComplete: () => location.hash === "#/habits",
  });

  // A user who already has habits (a replay via "Показать обучение
  // заново") doesn't need to be told to create one — skip this step
  // entirely rather than requiring a throwaway extra habit just to move
  // the tour along.
  if (!startedWithHabits) {
    steps.push({
      id: "add-habit",
      route: "#/habits",
      findTarget: () => document.getElementById("add-habit-fab"),
      radius: "var(--radius-round)",
      text: "Нажми сюда, чтобы добавить новую привычку.",
      onActivate: (ctx) => {
        ctx.habitsCountAtStepStart = getHabits().length;
      },
      isComplete: (ctx) => {
        const habits = getHabits();
        if (habits.length <= ctx.habitsCountAtStepStart) return false;
        // addHabit() always pushes -- the most recently created habit is
        // always the last element, regardless of which path created it
        // (the form, or a one-tap "Популярные привычки" preset).
        ctx.targetHabit = habits[habits.length - 1];
        return true;
      },
    });
  }

  steps.push({
    id: "mark-done",
    route: "#/progress",
    findTarget: (ctx) => {
      if (!ctx.targetHabit) return null;
      const base = `.today-item[data-habit-id="${ctx.targetHabit.id}"] `;
      const sel = ctx.targetHabit.type === "boolean" ? base + '[data-action="toggle"]' : base + '[data-action="number"]';
      return document.querySelector(sel);
    },
    radius: "var(--radius-round)",
    text: (ctx) =>
      ctx.targetHabit && ctx.targetHabit.type === "numeric"
        ? "Введи число и нажми Enter (или убери фокус с поля), чтобы отметить прогресс за сегодня."
        : "Нажми на галочку, чтобы отметить привычку выполненной сегодня.",
    onActivate: (ctx) => {
      // For the fresh-habit path, ctx.targetHabit was already set by step
      // "add-habit"'s isComplete() above. Replaying with existing habits
      // skips that step entirely, so it's set here instead.
      if (startedWithHabits) ctx.targetHabit = getHabits()[0] || null;
    },
    // A brief pause before advancing (not instant) -- gives the user a
    // moment to see the checkmark actually land, and also gracefully
    // covers the replay case where the target habit is already marked
    // done today: the condition reads true immediately on activation, and
    // this delay reads as "confirmed, moving on" rather than requiring a
    // pointless re-tap of something already checked.
    advanceDelayMs: MARK_DONE_ALREADY_TRUE_DELAY_MS,
    isComplete: (ctx) => {
      if (!ctx.targetHabit) return false;
      return isDayComplete(ctx.targetHabit, getEntry(ctx.targetHabit.id, todayKey()));
    },
  });

  steps.push({
    id: "mountain",
    route: "#/progress",
    findTarget: () => document.querySelector(".mountain-wrap"),
    radius: "var(--radius-lg)",
    text: "Это твоя гора 🏔️ Она растёт по мере того, как ты выполняешь привычки — чем стабильнее, тем выше подъём.",
    // The mountain has no click action of its own to wait for (unlike
    // every other step) -- reads for a couple seconds, then continues on
    // its own; tapping the spotlighted mountain just skips the wait early
    // rather than adding a separate "Next" button elsewhere on screen.
    onActivate: (ctx) => {
      ctx.mountainReady = false;
      // Neither this timer nor wireTap()'s click below goes through a real
      // state mutation or route change (every other step's completion
      // does), so nothing else would ever re-run checkAdvance() for them —
      // each calls runTick() itself right after flipping the flag.
      ctx.mountainTimer = setTimeout(() => {
        ctx.mountainReady = true;
        runTick();
      }, MOUNTAIN_STEP_TIMER_MS);
    },
    wireTap: (target, ctx) => {
      target.addEventListener(
        "click",
        () => {
          ctx.mountainReady = true;
          runTick();
        },
        { once: true }
      );
    },
    isComplete: (ctx) => ctx.mountainReady === true,
  });

  steps.push({
    id: "challenges-tab",
    route: null,
    findTarget: () => document.querySelector('.tab-item[href="#/challenges"]'),
    radius: "var(--radius-md)",
    text: "Вкладка «Испытания» — короткие цели на месяц. Выполнил — получил медаль 🏅",
    isComplete: () => location.hash === "#/challenges",
  });

  steps.push({
    id: "achievements-tab",
    route: null,
    findTarget: () => document.querySelector('.tab-item[href="#/achievements"]'),
    radius: "var(--radius-md)",
    text: "А здесь хранятся твои достижения — все награды в одном месте.",
    isComplete: () => location.hash === "#/achievements",
  });

  return steps;
}

export function startOnboarding({ force = false } = {}) {
  if (active) return; // already running
  if (!force && loadState().meta.onboardingCompleted) return;

  const startedWithHabits = getHabits().length > 0;
  active = {
    steps: buildSteps(startedWithHabits),
    index: 0,
    ctx: {},
    retryCount: 0,
    pendingAdvanceTimer: null,
  };
  mountRoot();
  activateStep(0);
}

export function skipOnboarding() {
  markCompleted();
  teardown();
}

/**
 * Called unconditionally at the very end of app.js's render() — after both
 * the tab bar and the current view have already been fully rebuilt for
 * this pass, so everything this function looks at (DOM, location.hash,
 * loadState()) is guaranteed current. A cheap no-op whenever no tour is
 * running.
 */
export function onOnboardingTick() {
  runTick();
}

/**
 * Every step's completion is normally detected this way: a real state
 * mutation or route change elsewhere in the app triggers render(), which
 * calls onOnboardingTick() above. The one exception is the "mountain" step
 * (no state/route change of its own — just a timer or a direct tap on the
 * spotlighted element) — those two callbacks call this shared tick
 * function themselves, since nothing else in the app would ever re-check
 * onboarding's own step condition for them otherwise.
 */
function runTick() {
  if (!active) return;
  checkAdvance();
  if (active) positionStep(); // checkAdvance() may have ended the tour (skip mid-check is not possible today, but stay defensive)
}

function markCompleted() {
  const state = loadState();
  if (!state.meta.onboardingCompleted) {
    state.meta.onboardingCompleted = true;
    saveState(state);
  }
}

function mountRoot() {
  const root = document.getElementById("onboarding-root");
  if (!root) return;
  root.innerHTML = `
    <div class="onboarding-scrim-band" data-band="top"></div>
    <div class="onboarding-scrim-band" data-band="bottom"></div>
    <div class="onboarding-scrim-band" data-band="left"></div>
    <div class="onboarding-scrim-band" data-band="right"></div>
    <div class="onboarding-spotlight-ring"></div>
    <div class="onboarding-tooltip">
      <p class="onboarding-tooltip-step"></p>
      <p class="onboarding-tooltip-text"></p>
    </div>
    <button type="button" class="onboarding-skip-btn">Пропустить</button>
  `;
  dom.bands = {
    top: root.querySelector('[data-band="top"]'),
    bottom: root.querySelector('[data-band="bottom"]'),
    left: root.querySelector('[data-band="left"]'),
    right: root.querySelector('[data-band="right"]'),
  };
  dom.ring = root.querySelector(".onboarding-spotlight-ring");
  dom.tooltip = root.querySelector(".onboarding-tooltip");
  dom.tooltipStep = root.querySelector(".onboarding-tooltip-step");
  dom.tooltipText = root.querySelector(".onboarding-tooltip-text");
  root.querySelector(".onboarding-skip-btn").addEventListener("click", skipOnboarding);
}

function activateStep(index) {
  if (!active) return;
  const step = active.steps[index];
  if (!step) {
    showCompletion();
    return;
  }
  active.index = index;
  active.retryCount = 0;
  if (step.onActivate) step.onActivate(active.ctx);
  // hashchange fires asynchronously -- positionStep() below may not find
  // the new route's target yet on this same synchronous pass, which is
  // fine, it just retries (see positionStep()'s own retry loop) until the
  // resulting render() call rebuilds the new screen.
  if (step.route && location.hash !== step.route) location.hash = step.route;
  positionStep();
}

function checkAdvance() {
  if (!active) return;
  const step = active.steps[active.index];
  if (!step || !step.isComplete) return;
  const satisfied = step.isComplete(active.ctx);
  if (satisfied && active.pendingAdvanceTimer === null) {
    active.pendingAdvanceTimer = setTimeout(() => {
      if (!active) return;
      active.pendingAdvanceTimer = null;
      activateStep(active.index + 1);
    }, step.advanceDelayMs || 0);
  } else if (!satisfied && active.pendingAdvanceTimer !== null) {
    // Condition flipped back false before the delay elapsed (e.g. a
    // numeric entry cleared back to empty) -- don't advance on stale info.
    clearTimeout(active.pendingAdvanceTimer);
    active.pendingAdvanceTimer = null;
  }
}

function positionStep() {
  if (!active) return;
  const step = active.steps[active.index];
  if (!step) return;
  const target = step.findTarget(active.ctx);

  if (!target) {
    active.retryCount += 1;
    if (active.retryCount > TARGET_RETRY_LIMIT) {
      // Genuinely can't find this step's target (e.g. the user deleted
      // the habit this step was about to point at) -- skip it gracefully
      // rather than leaving the tour stuck forever.
      activateStep(active.index + 1);
    } else {
      setTimeout(positionStep, 100);
    }
    return;
  }
  active.retryCount = 0;

  if (target.dataset.onboardingScrolled !== "1") {
    target.scrollIntoView({ block: "center" });
    target.dataset.onboardingScrolled = "1";
  }
  if (step.wireTap && target.dataset.onboardingTapWired !== "1") {
    step.wireTap(target, active.ctx);
    target.dataset.onboardingTapWired = "1";
  }

  const rect = target.getBoundingClientRect();
  applyBands(rect);
  applyRing(rect, step.radius);
  applyTooltip(rect, step, active.ctx);
}

function applyBands(rect) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const top = Math.max(0, rect.top - SPOTLIGHT_PADDING);
  const bottom = Math.min(vh, rect.bottom + SPOTLIGHT_PADDING);
  const left = Math.max(0, rect.left - SPOTLIGHT_PADDING);
  const right = Math.min(vw, rect.right + SPOTLIGHT_PADDING);

  setBand(dom.bands.top, 0, 0, vw, top);
  setBand(dom.bands.bottom, bottom, 0, vw, Math.max(0, vh - bottom));
  setBand(dom.bands.left, top, 0, left, Math.max(0, bottom - top));
  setBand(dom.bands.right, top, right, Math.max(0, vw - right), Math.max(0, bottom - top));
}

function setBand(el, top, left, width, height) {
  el.style.top = `${top}px`;
  el.style.left = `${left}px`;
  el.style.width = `${width}px`;
  el.style.height = `${height}px`;
}

function applyRing(rect, radius) {
  dom.ring.style.top = `${rect.top - SPOTLIGHT_PADDING}px`;
  dom.ring.style.left = `${rect.left - SPOTLIGHT_PADDING}px`;
  dom.ring.style.width = `${rect.width + SPOTLIGHT_PADDING * 2}px`;
  dom.ring.style.height = `${rect.height + SPOTLIGHT_PADDING * 2}px`;
  dom.ring.style.borderRadius = radius;
}

function applyTooltip(rect, step, ctx) {
  dom.tooltipText.textContent = typeof step.text === "function" ? step.text(ctx) : step.text;
  dom.tooltipStep.textContent = `${active.index + 1} из ${active.steps.length}`;

  const vh = window.innerHeight;
  const vw = window.innerWidth;
  const tw = dom.tooltip.offsetWidth;
  const th = dom.tooltip.offsetHeight;
  const spaceBelow = vh - rect.bottom;
  const spaceAbove = rect.top;
  const placeBelow = spaceBelow >= th + 24 || spaceBelow >= spaceAbove;

  let top = placeBelow ? rect.bottom + SPOTLIGHT_PADDING + 12 : rect.top - SPOTLIGHT_PADDING - 12 - th;
  top = Math.max(12, Math.min(top, vh - th - 12));

  let left = rect.left + rect.width / 2 - tw / 2;
  left = Math.max(12, Math.min(left, vw - tw - 12));

  dom.tooltip.style.top = `${top}px`;
  dom.tooltip.style.left = `${left}px`;
}

function showCompletion() {
  if (!active) return;
  clearTimeout(active.pendingAdvanceTimer);
  const root = document.getElementById("onboarding-root");
  if (!root) return;
  root.innerHTML = `
    <div class="onboarding-completion-backdrop"></div>
    <div class="onboarding-completion">
      <p class="onboarding-completion-emoji">🎉</p>
      <h2 class="onboarding-completion-title">Готово!</h2>
      <p class="onboarding-completion-text">Ты знаешь, где искать всё самое важное. Начинай своё восхождение — гора уже ждёт 🏔️</p>
      <p class="onboarding-completion-hint">Если захочешь пройти тур ещё раз — Настройки → «Показать обучение заново».</p>
      <button type="button" class="btn btn-primary btn-block" id="onboarding-finish-btn">Отлично!</button>
    </div>
  `;
  root.querySelector("#onboarding-finish-btn").addEventListener("click", () => {
    markCompleted();
    teardown();
  });
}

function teardown() {
  if (!active) return;
  clearTimeout(active.pendingAdvanceTimer);
  clearTimeout(active.ctx.mountainTimer);
  const root = document.getElementById("onboarding-root");
  if (root) root.innerHTML = "";
  active = null;
}

// Registered once at module load, not per-run -- harmless/no-op via the
// `active` guard whenever no tour is in progress.
window.addEventListener("resize", () => {
  if (active) positionStep();
});
