import { addDaysToKey, todayKey, earliestRelevantDateKey } from "./dateUtils.js";
import { isDayComplete } from "./completion.js";

// Exported for mountainView.js's month-history header stats — a simple
// "days completed this month × POINTS_PER_DAY" reading (see
// computeViewedMonthData() there), deliberately not the full bonus-crossing
// algorithm below: that one only makes sense as a lifetime running total
// (a streak bonus can be earned mid-streak, and streaks routinely cross
// month boundaries), so it isn't a meaningful thing to bucket by month.
export const POINTS_PER_DAY = 10;
const BONUS_AT_7 = 50;
const BONUS_AT_30 = 200;

/**
 * Scans a single habit's full history once, returning everything derived
 * from that scan: completed-day count, base points, one-time streak-milestone
 * bonuses (awarded once per streak run, not re-awarded every day the streak
 * stays above the threshold), and the best streak ever achieved.
 */
export function computeHabitStats(habit, entries) {
  const startKey = earliestRelevantDateKey(habit, entries);
  const endKey = todayKey();

  let completedDays = 0;
  let running = 0;
  let best = 0;
  let bonus = 0;
  let crossed7 = false;
  let crossed30 = false;

  let cursor = startKey;
  let safety = 0;
  while (cursor <= endKey && safety < 20000) {
    if (isDayComplete(habit, entries[cursor])) {
      completedDays++;
      running++;
      if (running > best) best = running;
      if (running >= 7 && !crossed7) {
        bonus += BONUS_AT_7;
        crossed7 = true;
      }
      if (running >= 30 && !crossed30) {
        bonus += BONUS_AT_30;
        crossed30 = true;
      }
    } else {
      running = 0;
      crossed7 = false;
      crossed30 = false;
    }
    cursor = addDaysToKey(cursor, 1);
    safety++;
  }

  const basePoints = completedDays * POINTS_PER_DAY;
  return {
    completedDays,
    bestStreak: best,
    basePoints,
    bonusPoints: bonus,
    totalPoints: basePoints + bonus,
  };
}

/** Sums per-habit stats across all given habits. */
export function computeTotalPoints(habits, entriesByHabit) {
  return habits.reduce((sum, habit) => {
    const stats = computeHabitStats(habit, entriesByHabit[habit.id] || {});
    return sum + stats.totalPoints;
  }, 0);
}
