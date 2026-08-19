import { addDaysToKey, todayKey, earliestRelevantDateKey } from "./dateUtils.js";
import { isDayComplete } from "./completion.js";

/**
 * Current streak for a single habit: consecutive completed days ending
 * today. If today isn't logged yet, we still count a real streak that ended
 * yesterday (so it doesn't flicker to 0 before the user logs today).
 */
export function computeCurrentStreak(habit, entries) {
  const tKey = todayKey();
  let cursor = isDayComplete(habit, entries[tKey]) ? tKey : addDaysToKey(tKey, -1);
  let streak = 0;
  while (isDayComplete(habit, entries[cursor])) {
    streak++;
    cursor = addDaysToKey(cursor, -1);
  }
  return streak;
}

/**
 * Best (longest ever) streak for a single habit, scanning from the habit's
 * creation date through today.
 */
export function computeBestStreak(habit, entries) {
  const startKey = earliestRelevantDateKey(habit, entries);
  const endKey = todayKey();
  let running = 0;
  let best = 0;
  let cursor = startKey;
  // Guard against pathological/corrupt data (createdAt in the future, etc).
  let safety = 0;
  while (cursor <= endKey && safety < 20000) {
    if (isDayComplete(habit, entries[cursor])) {
      running++;
      if (running > best) best = running;
    } else {
      running = 0;
    }
    cursor = addDaysToKey(cursor, 1);
    safety++;
  }
  return best;
}

/**
 * Combined streak across ALL active habits: a day counts only if every
 * active habit was completed that day. Used for "perfect day/week"
 * achievements and as a bonus signal for mountain progress.
 */
export function computeOverallCurrentStreak(habits, entriesByHabit) {
  if (habits.length === 0) return 0;
  const tKey = todayKey();

  const allCompleteOn = (dateKey) =>
    habits.every((h) => isDayComplete(h, (entriesByHabit[h.id] || {})[dateKey]));

  let cursor = allCompleteOn(tKey) ? tKey : addDaysToKey(tKey, -1);
  let streak = 0;
  while (allCompleteOn(cursor)) {
    streak++;
    cursor = addDaysToKey(cursor, -1);
  }
  return streak;
}
