import { computeHabitStats } from "./points.js";
import { computeCurrentStreak, computeOverallCurrentStreak } from "./streaks.js";
import { isDayComplete } from "./completion.js";
import { daysInMonth, formatDateKey, todayParts } from "./dateUtils.js";

/**
 * Walks every day of a calendar month once, returning per-day results:
 * how many active habits were completed that day, and whether that's
 * enough to count toward the mountain (more than half the user's active
 * habits — e.g. 4 habits -> need at least 3). This is the single scan
 * that both computeMonthMountainProgress() and computeMonthStats() (used
 * by the monthly Challenges) build on, so the majority-rule loop and its
 * date-key math exist in exactly one place.
 */
export function computeMonthDayResults(year, month, habits, entriesByHabit) {
  const total = daysInMonth(year, month);
  const threshold = habits.length / 2;
  const days = [];
  for (let day = 1; day <= total; day++) {
    const dateKey = formatDateKey(year, month, day);
    let completedCount = 0;
    for (const habit of habits) {
      const entries = entriesByHabit[habit.id] || {};
      if (isDayComplete(habit, entries[dateKey])) completedCount++;
    }
    days.push({ day, dateKey, completedCount, counted: habits.length > 0 && completedCount > threshold });
  }
  return days;
}

/**
 * Mountain progress for one calendar month: each qualifying day (see
 * computeMonthDayResults) contributes 1/daysInMonth toward the summit.
 * This is deliberately NOT the lifetime points total — the mountain
 * always restarts at the beginning of a month, and can only be finished
 * by a consistently strong month, not a 15-day burst. Future days need no
 * special-casing: they simply have no entries yet, so they don't count
 * until they're actually lived through.
 */
export function computeMonthMountainProgress(year, month, habits, entriesByHabit) {
  if (habits.length === 0) return 0;
  const days = computeMonthDayResults(year, month, habits, entriesByHabit);
  // Count qualifying days as an integer and divide once at the end, rather
  // than summing a fractional step per day — repeatedly adding 1/total can
  // land a fraction of a ULP short of 1 (e.g. 0.9999999999999998), which
  // would make a fully-completed month narrowly fail an ">= 1" summit check.
  // A single integer division is exact when countedDays === total.
  const countedDays = days.filter((d) => d.counted).length;
  return Math.min(1, countedDays / days.length);
}

/**
 * Month-scoped stats for the current month, used by the Challenges pool
 * (js/logic/challenges.js) — deliberately separate from computeAppStats'
 * lifetime totals (totalPoints, bestStreakOverall, ...), since challenges
 * are meant to be achievable within a single month, not by lifetime
 * accumulation.
 */
export function computeMonthStats(year, month, habits, entriesByHabit) {
  const days = computeMonthDayResults(year, month, habits, entriesByHabit);
  const countedDays = days.filter((d) => d.counted).length;
  const totalMarks = days.reduce((sum, d) => sum + d.completedCount, 0);

  // Longest run of consecutive qualifying ("counted") days within the
  // month, and separately the longest run of consecutive days with at
  // least one habit done (a much easier bar) — two different challenge
  // difficulty tiers read off the same scan.
  let bestCountedStreak = 0;
  let runCounted = 0;
  let bestAnyStreak = 0;
  let runAny = 0;
  for (const d of days) {
    if (d.counted) {
      runCounted++;
      bestCountedStreak = Math.max(bestCountedStreak, runCounted);
    } else {
      runCounted = 0;
    }
    if (d.completedCount > 0) {
      runAny++;
      bestAnyStreak = Math.max(bestAnyStreak, runAny);
    } else {
      runAny = 0;
    }
  }

  const firstThreeCounted = days.slice(0, 3).every((d) => d.counted);
  const progress = habits.length === 0 ? 0 : Math.min(1, countedDays / days.length);

  return { days, countedDays, totalMarks, bestCountedStreak, bestAnyStreak, firstThreeCounted, progress };
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
