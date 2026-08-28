// First-run tour: a fullscreen welcome screen, then a spotlight on the tab
// bar inviting a tap on ANY tab (no forced order), then a short popup the
// first time each tab is visited, until all 5 have been seen. See
// PROGRESS.md for the full design writeup; the two constraints carried
// over from the previous step-sequence tour still apply:
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
import { openModal } from "./modal.js";

const SPOTLIGHT_PADDING = 8;
const TARGET_RETRY_LIMIT = 15; // ~1.5s of retrying (100ms apart) before giving up on finding the tab bar

// One entry per tab-bar tab (js/components/tabBar.js's own TABS list) — a
// small parallel copy rather than importing that list, since this only
// needs the route + label + explainer text, not tabBar.js's icon
// renderers. `hash` doubles as the match key: a route "starts with" it the
// same way tabBar.js's own isActive() treats "#/habits/hb_123" as the
// "Привычки" tab, not a different one.
const TAB_INTROS = [
  {
    hash: "#/challenges",
    label: "Испытания",
    text: "Здесь — короткие цели на месяц. Выполни условие испытания (например, стрик по привычке) — и получишь медаль. Нажми на карточку испытания, чтобы посмотреть подробности.",
  },
  {
    hash: "#/habits",
    label: "Привычки",
    text: "Здесь живут твои привычки. Нажми «+», чтобы добавить новую, а на самой привычке — чтобы отметить её выполненной или открыть календарь.",
  },
  {
    hash: "#/progress",
    label: "Прогресс",
    text: "Это твоя гора — она растёт по мере того, как ты стабильно выполняешь привычки. Ниже — календарь месяца и список привычек на сегодня.",
  },
  {
    hash: "#/achievements",
    label: "Достижения",
    text: "Здесь хранятся твои награды: пройденные испытания и особые достижения за стабильность. Нажми на карточку, чтобы увидеть подробности.",
  },
  {
    hash: "#/settings",
    label: "Настройки",
    text: "Здесь можно настроить тему оформления, единицу измерения по умолчанию, уведомления и другие параметры приложения.",
  },
];

// Cached refs to the spotlight overlay's own DOM, valid only while the
// "spotlight" phase is on screen (rebuilt fresh by mountSpotlight() every
// time that phase starts) — unlike #view-container, this module fully owns
// #onboarding-root's lifecycle itself, so holding refs across ticks here is
// safe.
const dom = { bands: null, ring: null, tooltip: null };

// The single run currently in progress, or null when no tour is active.
// `phase` is one of "welcome" | "spotlight" | "roam" | "completion".
let active = null;

export function startOnboarding({ force = false } = {}) {
  if (active) return; // already running
  if (!force && loadState().meta.onboardingCompleted) return;

  active = { phase: "welcome", visitedTabs: new Set(), retryCount: 0 };
  mountWelcome();
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
 * running or the current phase doesn't need a tick (welcome/completion are
 * fully driven by their own button clicks, not renders).
 */
export function onOnboardingTick() {
  if (!active) return;
  if (active.phase === "spotlight") positionSpotlight();
  else if (active.phase === "roam") checkRoamArrival();
}

function markCompleted() {
  const state = loadState();
  if (!state.meta.onboardingCompleted) {
    state.meta.onboardingCompleted = true;
    saveState(state);
  }
}

function currentTabIntro() {
  const hash = location.hash || "#/progress";
  return TAB_INTROS.find((t) => hash === t.hash || hash.startsWith(`${t.hash}/`)) || TAB_INTROS.find((t) => t.hash === "#/progress");
}

// ---------- Phase 1: fullscreen welcome ----------

function mountWelcome() {
  const root = document.getElementById("onboarding-root");
  if (!root) return;
  root.innerHTML = `
    <div class="onboarding-welcome">
      <p class="onboarding-welcome-emoji">🏔️</p>
      <h1 class="onboarding-welcome-title">Готов покорить вершину?</h1>
      <p class="onboarding-welcome-subtitle">Habit Mountain превращает привычки в настоящее восхождение: выполняй испытания, собирай награды и наблюдай, как растёт твоя гора.</p>
      <button type="button" class="onboarding-welcome-cta" id="onboarding-start-btn">Начать восхождение 🚀</button>
      <button type="button" class="onboarding-welcome-skip" id="onboarding-welcome-skip-btn">Пропустить обучение</button>
    </div>
  `;
  root.querySelector("#onboarding-start-btn").addEventListener("click", () => {
    if (!active) return;
    active.phase = "spotlight";
    mountSpotlight();
  });
  root.querySelector("#onboarding-welcome-skip-btn").addEventListener("click", skipOnboarding);
}

// ---------- Phase 2: spotlight the tab bar, wait for any tap ----------

function mountSpotlight() {
  const root = document.getElementById("onboarding-root");
  if (!root) return;
  root.innerHTML = `
    <div class="onboarding-scrim-band" data-band="top"></div>
    <div class="onboarding-scrim-band" data-band="bottom"></div>
    <div class="onboarding-scrim-band" data-band="left"></div>
    <div class="onboarding-scrim-band" data-band="right"></div>
    <div class="onboarding-spotlight-ring"></div>
    <div class="onboarding-tooltip">
      <p class="onboarding-tooltip-text">Нажми на любую вкладку внизу — необязательно по порядку, выбирай сам.</p>
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
  root.querySelector(".onboarding-skip-btn").addEventListener("click", skipOnboarding);
  active.retryCount = 0;
  positionSpotlight();
}

function positionSpotlight() {
  if (!active || active.phase !== "spotlight") return;
  const target = document.querySelector(".tabbar-inner");

  if (!target) {
    active.retryCount += 1;
    if (active.retryCount > TARGET_RETRY_LIMIT) {
      // Genuinely can't find the tab bar -- don't leave the tour stuck
      // dimming the whole screen forever.
      skipOnboarding();
    } else {
      setTimeout(positionSpotlight, 100);
    }
    return;
  }
  active.retryCount = 0;

  // Wired once (not re-wired every tick) -- a click here is a real user
  // action, not something a state/route change re-triggers on its own, so
  // it needs its own listener rather than relying on onOnboardingTick()'s
  // diffing. That diffing alone wouldn't catch a tap on the tab that's
  // already active (no hashchange fires when the hash doesn't change),
  // e.g. the tour starting on "Прогресс" and the user tapping "Прогресс"
  // itself as their first pick.
  if (target.dataset.onboardingTapWired !== "1") {
    target.querySelectorAll(".tab-item").forEach((tabEl) => {
      tabEl.addEventListener(
        "click",
        () => {
          if (!active || active.phase !== "spotlight") return;
          active.phase = "roam";
          teardownSpotlightDom();
          visitTab(currentTabFromHash(tabEl.getAttribute("href")));
        },
        { once: true }
      );
    });
    target.dataset.onboardingTapWired = "1";
  }

  const rect = target.getBoundingClientRect();
  applyBands(rect);
  applyRing(rect, "var(--radius-lg)");
  applyTooltip(rect);
}

function currentTabFromHash(hash) {
  return TAB_INTROS.find((t) => hash === t.hash) || TAB_INTROS.find((t) => t.hash === "#/progress");
}

// ---------- Phase 3: free roam -- pop up each tab's intro once ----------

function checkRoamArrival() {
  if (!active || active.phase !== "roam") return;
  const tab = currentTabIntro();
  if (active.visitedTabs.has(tab.hash)) return;
  visitTab(tab);
}

function visitTab(tab) {
  if (!active) return;
  active.visitedTabs.add(tab.hash);
  showTabIntro(tab);
}

function showTabIntro(tab) {
  const isLast = active && active.visitedTabs.size >= TAB_INTROS.length;
  openModal({
    title: tab.label,
    bodyHtml: `
      <p class="modal-message">${tab.text}</p>
      <div class="modal-actions">
        <button type="button" class="btn" id="onboarding-tab-skip">Пропустить обучение</button>
        <button type="button" class="btn btn-primary" id="onboarding-tab-ok">Понятно</button>
      </div>
    `,
    onMount: (sheet, close) => {
      sheet.querySelector("#onboarding-tab-skip").addEventListener("click", () => {
        close();
        skipOnboarding();
      });
      sheet.querySelector("#onboarding-tab-ok").addEventListener("click", () => {
        close();
        if (!active) return;
        if (isLast) showCompletion();
      });
    },
  });
}

// ---------- Phase 4: completion ----------

function showCompletion() {
  if (!active) return;
  active.phase = "completion";
  const root = document.getElementById("onboarding-root");
  if (!root) return;
  root.innerHTML = `
    <div class="onboarding-completion-backdrop"></div>
    <div class="onboarding-completion">
      <p class="onboarding-completion-emoji">🎉</p>
      <h2 class="onboarding-completion-title">Готово!</h2>
      <p class="onboarding-completion-text">Теперь ты знаешь, где что искать — все разделы открыты. Гора уже ждёт восхождения 🏔️</p>
      <p class="onboarding-completion-hint">Если захочешь пройти тур ещё раз — Настройки → «Показать обучение заново».</p>
      <button type="button" class="btn btn-primary btn-block" id="onboarding-finish-btn">Отлично!</button>
    </div>
  `;
  root.querySelector("#onboarding-finish-btn").addEventListener("click", () => {
    markCompleted();
    teardown();
  });
}

// ---------- Shared spotlight geometry (welcome/completion don't need it) ----------

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

function applyTooltip(rect) {
  const vh = window.innerHeight;
  const vw = window.innerWidth;
  const tw = dom.tooltip.offsetWidth;
  const th = dom.tooltip.offsetHeight;
  const spaceAbove = rect.top;

  // The tab bar sits at the very bottom of the screen -- there's rarely
  // room below it, so the tooltip always goes above it (unlike the old
  // per-step tour, which could point at a target anywhere on screen).
  let top = rect.top - SPOTLIGHT_PADDING - 12 - th;
  top = Math.max(12, Math.min(top, spaceAbove - 12));

  let left = rect.left + rect.width / 2 - tw / 2;
  left = Math.max(12, Math.min(left, vw - tw - 12));

  dom.tooltip.style.top = `${top}px`;
  dom.tooltip.style.left = `${left}px`;
}

function teardownSpotlightDom() {
  const root = document.getElementById("onboarding-root");
  if (root) root.innerHTML = "";
  dom.bands = null;
  dom.ring = null;
  dom.tooltip = null;
}

function teardown() {
  if (!active) return;
  const root = document.getElementById("onboarding-root");
  if (root) root.innerHTML = "";
  dom.bands = null;
  dom.ring = null;
  dom.tooltip = null;
  active = null;
}

// Registered once at module load, not per-run -- harmless/no-op via the
// `active` guard whenever the spotlight phase isn't showing.
window.addEventListener("resize", () => {
  if (active && active.phase === "spotlight") positionSpotlight();
});
