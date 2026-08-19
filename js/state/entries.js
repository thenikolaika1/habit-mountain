import { loadState, saveState } from "./storage.js";
import { isDateEditable } from "../logic/dateUtils.js";

/** Returns the raw stored value for a habit/date, or undefined if not logged. */
export function getEntry(habitId, dateKey) {
  const state = loadState();
  const bucket = state.entries[habitId];
  return bucket ? bucket[dateKey] : undefined;
}

export function getEntriesForHabit(habitId) {
  const state = loadState();
  return state.entries[habitId] || {};
}

/**
 * Sets the value for a habit on a given date. Only the last 3 days (today,
 * yesterday, the day before) may be edited — everything else, future or
 * older, is rejected defensively (UI should already prevent this via
 * disabled cells).
 */
export function setEntry(habitId, dateKey, value) {
  if (!isDateEditable(dateKey)) {
    console.warn("Habit Mountain: refused to set an entry outside the editable 3-day window.", dateKey);
    return;
  }
  const state = loadState();
  if (!state.entries[habitId]) state.entries[habitId] = {};

  const isEmptySets = Array.isArray(value) && value.length === 0;
  if (value === false || value === null || value === undefined || value === "" || isEmptySets) {
    delete state.entries[habitId][dateKey];
  } else {
    state.entries[habitId][dateKey] = value;
  }
  saveState(state);
}

export function clearEntry(habitId, dateKey) {
  setEntry(habitId, dateKey, null);
}
