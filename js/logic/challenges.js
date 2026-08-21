import { loadState, saveState } from "../state/storage.js";

// Rule-based, like achievements.js's ACHIEVEMENTS — but scoped to a single
// calendar month (see computeMonthStats in progress.js) rather than
// lifetime totals, and only 5 of these are "live" in any given month (see
// pickMonthlyChallenges below). Titles are deliberately distinct from the
// permanent ACHIEVEMENTS ("Первый шаг", "Неделя силы", "Месяц дисциплины",
// "Идеальный день", "Идеальная неделя", "Сто отметок", "Покоритель
// вершины") so the two lists never look like duplicates in Достижения.
//
// Each entry pairs its pass/fail `check(m)` with a `progress(m)` function
// returning how far along the SAME rule is as a 0-1 fraction — used for the
// in-progress ring/bar on the active challenge card and for the "how far
// did I get" record kept when a challenge's month ends unmet (see
// archiveEndedMonthChallenges below). The two are meant to agree exactly at
// the threshold (progress reaches 1 iff check passes) — kept side by side
// per entry rather than deriving one from the other, since the natural
// "fraction of the way there" isn't always a trivial reading of the
// boolean rule (e.g. firstThreeCounted).
export const CHALLENGE_POOL = [
  {
    id: "stable_start",
    title: "Стабильный старт",
    description: "Первые 3 дня месяца — большинство привычек выполнено каждый день",
    icon: "🚀",
    difficulty: "easy",
    check: (m) => m.firstThreeCounted,
    progress: (m) => m.days.slice(0, 3).filter((d) => d.counted).length / 3,
  },
  {
    id: "warm_up",
    title: "Разгон",
    description: "10 отметок-дней суммарно за месяц",
    icon: "🔆",
    difficulty: "easy",
    check: (m) => m.totalMarks >= 10,
    progress: (m) => m.totalMarks / 10,
  },
  {
    id: "no_gaps_5",
    title: "Без пропусков",
    description: "5 дней подряд с большинством привычек выполнено",
    icon: "🧩",
    difficulty: "medium",
    check: (m) => m.bestCountedStreak >= 5,
    progress: (m) => m.bestCountedStreak / 5,
  },
  {
    id: "climb_third",
    title: "Восхождение на треть",
    description: "Прогресс горы в этом месяце — не меньше 33%",
    icon: "🥾",
    difficulty: "hard",
    check: (m) => m.progress >= 0.33,
    progress: (m) => m.progress / 0.33,
  },
  {
    id: "climb_half",
    title: "Половина пути",
    description: "Прогресс горы в этом месяце — не меньше 50%",
    icon: "🏔️",
    difficulty: "hard",
    check: (m) => m.progress >= 0.5,
    progress: (m) => m.progress / 0.5,
  },
  {
    id: "climb_summit",
    title: "Штурм вершины",
    description: "Прогресс горы в этом месяце достиг 100%",
    icon: "🚩",
    difficulty: "hard",
    check: (m) => m.progress >= 1,
    progress: (m) => m.progress,
  },
  {
    id: "mark_collector",
    title: "Коллекционер отметок",
    description: "20 отметок-дней суммарно за месяц",
    icon: "🗂️",
    difficulty: "medium",
    check: (m) => m.totalMarks >= 20,
    progress: (m) => m.totalMarks / 20,
  },
  {
    id: "all_by_plan",
    title: "Всё по плану",
    description: "7 дней подряд — хотя бы одна привычка выполнена каждый день",
    icon: "📅",
    difficulty: "easy",
    check: (m) => m.bestAnyStreak >= 7,
    progress: (m) => m.bestAnyStreak / 7,
  },
  {
    id: "persistence",
    title: "Упорство",
    description: "40 отметок-дней суммарно за месяц",
    icon: "🧗",
    difficulty: "hard",
    check: (m) => m.totalMarks >= 40,
    progress: (m) => m.totalMarks / 40,
  },
  {
    id: "iron_will",
    title: "Железная воля",
    description: "10 дней подряд с большинством привычек выполнено",
    icon: "🛡️",
    difficulty: "hard",
    check: (m) => m.bestCountedStreak >= 10,
    progress: (m) => m.bestCountedStreak / 10,
  },
];

/** Label + accent token for each difficulty tier — reuses existing palette tokens (no new colors introduced). */
export const DIFFICULTY_META = {
  easy: { label: "Легко", className: "is-easy" },
  medium: { label: "Средне", className: "is-medium" },
  hard: { label: "Сложно", className: "is-hard" },
};

/** Ascending sort weight for a difficulty tier — used to order the active challenge cards easy-first. */
export const DIFFICULTY_RANK = { easy: 0, medium: 1, hard: 2 };

/** How far along `challenge` is against `monthStats`, clamped to 0-1. Always reads 1 once challenge.check() would pass. */
export function getChallengeProgress(challenge, monthStats) {
  if (challenge.check(monthStats)) return 1;
  const raw = challenge.progress(monthStats);
  return Math.max(0, Math.min(1, Number.isFinite(raw) ? raw : 0));
}

const CHALLENGES_PER_MONTH = 5;

/** Tiny deterministic string hash (djb2) — good enough for a stable seed, not cryptography. */
function hashString(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return hash >>> 0;
}

/** Seeded PRNG (mulberry32) so the same monthKey always yields the same shuffle. */
function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Deterministically picks this month's 5 active challenges from the pool,
 * seeded by the month key ("2026-08") — the same month always yields the
 * same 5, but a new month reliably picks a different combination. Nothing
 * about this is persisted: like the rest of the app, it's recomputed on
 * the fly from a pure function of the current date.
 */
export function pickMonthlyChallenges(monthKey) {
  const rng = mulberry32(hashString(monthKey));
  const shuffled = CHALLENGE_POOL.slice();
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, CHALLENGES_PER_MONTH);
}

// ---------- Medal photo assignment (assets/habits/medal_*.png) ----------
// 5 real medal photos, one per active challenge each month — every month's
// active set is exactly 5 (CHALLENGES_PER_MONTH), so this is a clean
// bijection, never a many-to-one guess.
const MEDAL_FILES = ["medal_trophy.png", "medal_shield.png", "medal_crown.png", "medal_lightning.png", "medal_star.png"];

// One-time hand-curated assignment, by meaning, for the specific 5
// challenges active this exact month — every other month (past or future)
// falls through to the random-but-deterministic assignment below instead,
// per the user's explicit request that future rotations NOT be re-curated
// by hand.
const CURATED_MEDAL_MONTH_KEY = "2026-08";
const CURATED_MEDAL_BY_CHALLENGE_ID = {
  warm_up: "medal_lightning.png", // Разгон — энергия/скорость
  all_by_plan: "medal_shield.png", // Всё по плану — надёжность/выполнение
  climb_third: "medal_crown.png", // Восхождение на треть — масштаб/статус подъёма
  persistence: "medal_trophy.png", // Упорство — 40 отметок, самый тяжёлый числовой порог в пуле
  no_gaps_5: "medal_star.png", // Без пропусков — стабильность день за днём
};

/**
 * Which medal photo (a filename in assets/habits/) challenge `id` should
 * show for the month `monthKey` — null if `id` wasn't even active that
 * month (a defensive no-op the caller should treat as "no photo, fall back
 * to the drawn SVG scene"). CURATED_MEDAL_MONTH_KEY uses the hand-picked
 * thematic table above (only if its keys still match that month's actual
 * active set — a guard against CHALLENGE_POOL/pickMonthlyChallenges ever
 * changing out from under it); every other month deterministically
 * shuffles the same 5 medal files (seeded by monthKey with its own salt,
 * so it doesn't mirror pickMonthlyChallenges' own shuffle) and assigns them
 * 1:1 to that month's active challenges in pickMonthlyChallenges' own
 * order — bijective, so two challenges never share a medal within the same
 * month.
 */
export function getMedalForChallenge(id, monthKey) {
  if (!monthKey) return null;
  const active = pickMonthlyChallenges(monthKey);
  const idx = active.findIndex((c) => c.id === id);
  if (idx === -1) return null;

  if (monthKey === CURATED_MEDAL_MONTH_KEY && active.every((c) => CURATED_MEDAL_BY_CHALLENGE_ID[c.id])) {
    return CURATED_MEDAL_BY_CHALLENGE_ID[id];
  }

  const rng = mulberry32(hashString(`${monthKey}:medal`));
  const shuffled = MEDAL_FILES.slice();
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled[idx];
}

/** Read-only view of ever-completed challenges, joined with their pool definitions. */
export function getCompletedChallengesMap() {
  const state = loadState();
  return state.meta.completedChallenges || {};
}

/**
 * Read-only view of challenges whose most recent attempt ran out the
 * month without completing — see archiveEndedMonthChallenges(). Keyed by
 * challenge id, one record per id (the latest failed attempt only, not a
 * full history of every miss) — cleared automatically the moment that
 * challenge is ever completed, in either evaluateAndUnlockChallenges() or
 * archiveEndedMonthChallenges() itself.
 */
export function getIncompleteChallengesMap() {
  const state = loadState();
  return state.meta.incompleteChallenges || {};
}

/**
 * Checks this month's 5 active challenges against fresh month stats and
 * persists newly-completed ones — same one-way ratchet as
 * evaluateAndUnlock() in achievements.js. A challenge completed in an
 * earlier month stays completed (and visible in Достижения) even after
 * the pool rotates away from it.
 */
export function evaluateAndUnlockChallenges(monthStats, monthKey) {
  const state = loadState();
  const completed = state.meta.completedChallenges;
  const active = pickMonthlyChallenges(monthKey);
  const newlyCompleted = [];
  let changed = false;

  for (const challenge of active) {
    if (completed[challenge.id]) continue;
    if (challenge.check(monthStats)) {
      completed[challenge.id] = { unlockedAt: new Date().toISOString(), monthKey };
      newlyCompleted.push(challenge.id);
      changed = true;
      // A challenge that eventually succeeds shouldn't still show up as an
      // unfinished attempt from some earlier month it missed.
      if (state.meta.incompleteChallenges[challenge.id]) {
        delete state.meta.incompleteChallenges[challenge.id];
      }
    }
  }

  if (changed) {
    saveState(state);
  }
  return newlyCompleted;
}

/**
 * Called once per month transition (see maybeShowMonthRecap() in
 * js/components/monthRecap.js, the same "have we seen this month key
 * before" gate the mountain's own recap uses) — for every challenge that
 * was active during the month that just ended, either:
 *  - it's already completed (this or an earlier month) — nothing to do;
 *  - its final numbers actually clear the bar but the app was never open
 *    to catch it live (e.g. the user skipped the last few days of the
 *    month) — complete it now, backdated to the month that ended, same
 *    as evaluateAndUnlockChallenges would have;
 *  - otherwise it genuinely fell short — record how far it got
 *    (getIncompleteChallengesMap()) instead of silently dropping it, so
 *    Достижения can show it as an unfinished attempt with a progress bar
 *    rather than losing the data.
 * Recomputes monthStats itself from the raw entries rather than relying on
 * whatever was last cached, so it reflects the month's true final state
 * regardless of when the app happens to be reopened.
 */
export function archiveEndedMonthChallenges(endedMonthStats, endedMonthKey) {
  const state = loadState();
  const completed = state.meta.completedChallenges;
  const incomplete = state.meta.incompleteChallenges;
  const active = pickMonthlyChallenges(endedMonthKey);
  let changed = false;

  for (const challenge of active) {
    if (completed[challenge.id]) {
      if (incomplete[challenge.id]) {
        delete incomplete[challenge.id];
        changed = true;
      }
      continue;
    }
    if (challenge.check(endedMonthStats)) {
      completed[challenge.id] = { unlockedAt: new Date().toISOString(), monthKey: endedMonthKey };
      if (incomplete[challenge.id]) delete incomplete[challenge.id];
      changed = true;
      continue;
    }
    incomplete[challenge.id] = {
      monthKey: endedMonthKey,
      progress: getChallengeProgress(challenge, endedMonthStats),
      endedAt: new Date().toISOString(),
    };
    changed = true;
  }

  if (changed) saveState(state);
}
