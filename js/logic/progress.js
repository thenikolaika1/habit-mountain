import { computeHabitStats } from "./points.js";
import { computeCurrentStreak, computeOverallCurrentStreak } from "./streaks.js";

/** Total points required to reach the summit (100% mountain progress). */
export const POINTS_FOR_SUMMIT = 1000;

export function computeOverallProgress(totalPoints) {
  return Math.min(1, totalPoints / POINTS_FOR_SUMMIT);
}

/**
 * One-stop aggregator: derives every number the UI needs (points, streaks,
 * mountain progress, achievement-eligible stats) from raw habits + entries.
 * Nothing here is persisted — it's recomputed on every render so it can
 * never drift from the source-of-truth data.
 */
export function computeAppStats(habits, entriesByHabit) {
  const activeHabits = habits.filter((h) => !h.archived);

  const perHabit = activeHabits.map((habit) => {
    const entries = entriesByHabit[habit.id] || {};
    const stats = computeHabitStats(habit, entries);
    return {
      habit,
      entries,
      ...stats,
      currentStreak: computeCurrentStreak(habit, entries),
    };
  });

  const totalPoints = perHabit.reduce((sum, p) => sum + p.totalPoints, 0);
  const totalCompletedDays = perHabit.reduce((sum, p) => sum + p.completedDays, 0);
  const bestStreakOverall = perHabit.reduce((max, p) => Math.max(max, p.bestStreak), 0);
  const overallCurrentStreak = computeOverallCurrentStreak(activeHabits, entriesByHabit);
  const overallProgress = computeOverallProgress(totalPoints);

  return {
    activeHabits,
    perHabit,
    totalPoints,
    totalCompletedDays,
    bestStreakOverall,
    overallCurrentStreak,
    overallProgress,
  };
}

const STAGES = [
  { key: "base", threshold: 0, label: "Подножие" },
  { key: "forest", threshold: 0.25, label: "Лес" },
  { key: "rocks", threshold: 0.55, label: "Скалы" },
  { key: "summit", threshold: 0.85, label: "Вершина" },
];

export function stageForProgress(progress) {
  let current = STAGES[0];
  for (const stage of STAGES) {
    if (progress >= stage.threshold) current = stage;
  }
  return current;
}
