// Glue between persisted state and the pure derivation logic: gathers
// habits + all their entries, computes every derived stat fresh, and runs
// the achievement ratchet. This is the single entry point views should use
// to get "current numbers" — nothing here is cached or persisted itself
// (aside from achievement unlocks, which evaluateAndUnlock persists).

import { getHabits } from "./habits.js";
import { getEntriesForHabit } from "./entries.js";
import { computeAppStats } from "../logic/progress.js";
import { evaluateAndUnlock } from "../logic/achievements.js";

export function getEntriesByHabit(habits) {
  const map = {};
  for (const habit of habits) {
    map[habit.id] = getEntriesForHabit(habit.id);
  }
  return map;
}

/**
 * Returns { stats, newlyUnlocked, entriesByHabit }. Call this once per
 * render pass rather than mixing individual getters, so achievement
 * evaluation always sees the same numbers the UI is about to show.
 */
export function getAppStats() {
  const habits = getHabits();
  const entriesByHabit = getEntriesByHabit(habits);
  const stats = computeAppStats(habits, entriesByHabit);
  const newlyUnlocked = evaluateAndUnlock(stats);
  return { stats, newlyUnlocked, entriesByHabit };
}
