// Glue between persisted state and the pure derivation logic: gathers
// habits + all their entries, computes every derived stat fresh, and runs
// the achievement ratchet. This is the single entry point views should use
// to get "current numbers" — nothing here is cached or persisted itself
// (aside from achievement unlocks, which evaluateAndUnlock persists).

import { getHabits } from "./habits.js";
import { getEntriesForHabit } from "./entries.js";
import { computeAppStats, computeMonthStats } from "../logic/progress.js";
import { evaluateAndUnlock } from "../logic/achievements.js";
import { evaluateAndUnlockChallenges } from "../logic/challenges.js";
import { todayParts, monthKey } from "../logic/dateUtils.js";

export function getEntriesByHabit(habits) {
  const map = {};
  for (const habit of habits) {
    map[habit.id] = getEntriesForHabit(habit.id);
  }
  return map;
}

/**
 * Returns { stats, newlyUnlocked, newlyCompletedChallenges, monthStats,
 * entriesByHabit }. Call this once per render pass rather than mixing
 * individual getters, so achievement/challenge evaluation always sees the
 * same numbers the UI is about to show.
 */
export function getAppStats() {
  const habits = getHabits();
  const entriesByHabit = getEntriesByHabit(habits);
  const stats = computeAppStats(habits, entriesByHabit);
  const newlyUnlocked = evaluateAndUnlock(stats);

  const t = todayParts();
  const currentMonthKey = monthKey(t.year, t.month);
  const monthStats = computeMonthStats(t.year, t.month, stats.activeHabits, entriesByHabit);
  const newlyCompletedChallenges = evaluateAndUnlockChallenges(monthStats, currentMonthKey);

  return { stats, newlyUnlocked, newlyCompletedChallenges, monthStats, entriesByHabit };
}
