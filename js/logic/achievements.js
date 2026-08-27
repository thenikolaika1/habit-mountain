import { loadState, saveState } from "../state/storage.js";

// Each achievement's `check` receives the aggregated stats object produced
// by logic/progress.js's computeAppStats(). Unlocking is a one-way ratchet:
// once earned it is never revoked, even if the underlying streak later
// breaks — see evaluateAndUnlock() below.
export const ACHIEVEMENTS = [
  {
    id: "first_step",
    title: "Первый шаг",
    description: "Отметьте любую привычку выполненной первый раз",
    icon: "🥾",
    check: (s) => s.totalCompletedDays >= 1,
  },
  {
    id: "streak_7",
    title: "Неделя силы",
    description: "Стрик 7 дней подряд по одной привычке",
    icon: "🔥",
    check: (s) => s.bestStreakOverall >= 7,
  },
  {
    id: "streak_30",
    title: "Месяц дисциплины",
    description: "Стрик 30 дней подряд по одной привычке",
    icon: "🏅",
    check: (s) => s.bestStreakOverall >= 30,
  },
  {
    id: "combo_day",
    title: "Идеальный день",
    description: "Все привычки выполнены в один день (от 3 привычек)",
    icon: "⭐",
    check: (s) => s.activeHabits.length >= 3 && s.overallCurrentStreak >= 1,
  },
  {
    id: "combo_week",
    title: "Идеальная неделя",
    description: "7 дней подряд выполнены абсолютно все привычки",
    icon: "🌈",
    check: (s) => s.overallCurrentStreak >= 7,
  },
  {
    id: "hundred_club",
    title: "Сто отметок",
    description: "100 выполненных дней-привычек суммарно",
    icon: "💯",
    check: (s) => s.totalCompletedDays >= 100,
  },
  {
    id: "summit",
    title: "Покоритель вершины",
    description: "Гора покорена — прогресс 100%",
    icon: "🚩",
    check: (s) => s.overallProgress >= 1,
  },
];

/** Read-only view of unlocked achievements, joined with their definitions. */
export function getUnlockedMap() {
  const state = loadState();
  return state.meta.unlockedAchievements || {};
}

/**
 * Checks every not-yet-unlocked achievement against fresh stats and persists
 * newly-earned ones. Returns the list of achievement ids newly unlocked by
 * this call (empty if nothing changed) so callers can show a celebration.
 */
export function evaluateAndUnlock(stats) {
  const state = loadState();
  const unlocked = state.meta.unlockedAchievements;
  const newlyUnlocked = [];

  for (const achievement of ACHIEVEMENTS) {
    if (unlocked[achievement.id]) continue;
    if (achievement.check(stats)) {
      unlocked[achievement.id] = { unlockedAt: new Date().toISOString() };
      newlyUnlocked.push(achievement.id);
    }
  }

  if (newlyUnlocked.length > 0) {
    saveState(state);
  }
  return newlyUnlocked;
}
