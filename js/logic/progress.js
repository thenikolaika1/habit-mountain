import { computeHabitStats } from "./points.js";
import { computeCurrentStreak, computeOverallCurrentStreak } from "./streaks.js";
import { isDayComplete } from "./completion.js";
import { daysInMonth, formatDateKey, todayParts } from "./dateUtils.js";

/**
 * Mountain progress for one calendar month: each day contributes
 * 1/daysInMonth toward the summit, but only if more than half of the
 * user's active habits were completed that day (e.g. 4 habits -> need at
 * least 3). This is deliberately NOT the lifetime points total — the
 * mountain always restarts at the beginning of a month, and can only be
 * finished by a consistently strong month, not a 15-day burst. Future days
 * need no special-casing: they simply have no entries yet, so they don't
 * count until they're actually lived through.
 */
export function computeMonthMountainProgress(year, month, habits, entriesByHabit) {
  if (habits.length === 0) return 0;
  const total = daysInMonth(year, month);
  const threshold = habits.length / 2;

  // Count qualifying days as an integer and divide once at the end, rather
  // than summing a fractional step per day — repeatedly adding 1/total can
  // land a fraction of a ULP short of 1 (e.g. 0.9999999999999998), which
  // would make a fully-completed month narrowly fail an ">= 1" summit check.
  // A single integer division is exact when countedDays === total.
  let countedDays = 0;
  for (let day = 1; day <= total; day++) {
    const dateKey = formatDateKey(year, month, day);
    let completedCount = 0;
    for (const habit of habits) {
      const entries = entriesByHabit[habit.id] || {};
      if (isDayComplete(habit, entries[dateKey])) completedCount++;
    }
    if (completedCount > threshold) countedDays++;
  }
  return Math.min(1, countedDays / total);
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
  const today = todayParts();
  const overallProgress = computeMonthMountainProgress(today.year, today.month, activeHabits, entriesByHabit);

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
