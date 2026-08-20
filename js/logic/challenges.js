import { loadState, saveState } from "../state/storage.js";

// Rule-based, like achievements.js's ACHIEVEMENTS — but scoped to a single
// calendar month (see computeMonthStats in progress.js) rather than
// lifetime totals, and only 5 of these are "live" in any given month (see
// pickMonthlyChallenges below). Titles are deliberately distinct from the
// permanent ACHIEVEMENTS ("Первый шаг", "Неделя силы", "Месяц дисциплины",
// "Идеальный день", "Идеальная неделя", "Сто отметок", "Покоритель
// вершины") so the two lists never look like duplicates in Достижения.
export const CHALLENGE_POOL = [
  {
    id: "stable_start",
    title: "Стабильный старт",
    description: "Первые 3 дня месяца — большинство привычек выполнено каждый день",
    icon: "🚀",
    check: (m) => m.firstThreeCounted,
  },
  {
    id: "warm_up",
    title: "Разгон",
    description: "10 отметок-дней суммарно за месяц",
    icon: "🔆",
    check: (m) => m.totalMarks >= 10,
  },
  {
    id: "no_gaps_5",
    title: "Без пропусков",
    description: "5 дней подряд с большинством привычек выполнено",
    icon: "🧩",
    check: (m) => m.bestCountedStreak >= 5,
  },
  {
    id: "climb_third",
    title: "Восхождение на треть",
    description: "Прогресс горы в этом месяце — не меньше 33%",
    icon: "🥾",
    check: (m) => m.progress >= 0.33,
  },
  {
    id: "climb_half",
    title: "Половина пути",
    description: "Прогресс горы в этом месяце — не меньше 50%",
    icon: "🏔️",
    check: (m) => m.progress >= 0.5,
  },
  {
    id: "climb_summit",
    title: "Штурм вершины",
    description: "Прогресс горы в этом месяце достиг 100%",
    icon: "🚩",
    check: (m) => m.progress >= 1,
  },
  {
    id: "mark_collector",
    title: "Коллекционер отметок",
    description: "20 отметок-дней суммарно за месяц",
    icon: "🗂️",
    check: (m) => m.totalMarks >= 20,
  },
  {
    id: "all_by_plan",
    title: "Всё по плану",
    description: "7 дней подряд — хотя бы одна привычка выполнена каждый день",
    icon: "📅",
    check: (m) => m.bestAnyStreak >= 7,
  },
  {
    id: "persistence",
    title: "Упорство",
    description: "40 отметок-дней суммарно за месяц",
    icon: "🧗",
    check: (m) => m.totalMarks >= 40,
  },
  {
    id: "iron_will",
    title: "Железная воля",
    description: "10 дней подряд с большинством привычек выполнено",
    icon: "🛡️",
    check: (m) => m.bestCountedStreak >= 10,
  },
];

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

/** Read-only view of ever-completed challenges, joined with their pool definitions. */
export function getCompletedChallengesMap() {
  const state = loadState();
  return state.meta.completedChallenges || {};
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

  for (const challenge of active) {
    if (completed[challenge.id]) continue;
    if (challenge.check(monthStats)) {
      completed[challenge.id] = { unlockedAt: new Date().toISOString(), monthKey };
      newlyCompleted.push(challenge.id);
    }
  }

  if (newlyCompleted.length > 0) {
    saveState(state);
  }
  return newlyCompleted;
}
