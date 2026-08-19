// A numeric habit's stored value is either a plain number (single entry)
// or an array of per-set numbers ("подходы") — the day's total is always
// derived, never stored separately, so it can't drift from the sets.
export function getNumericTotal(value) {
  if (typeof value === "number") return value;
  if (Array.isArray(value)) {
    return value.reduce((sum, n) => sum + (typeof n === "number" ? n : 0), 0);
  }
  return 0;
}

// Whether a stored entry value counts as "done" for a given habit type.
export function isDayComplete(habit, value) {
  if (value === undefined || value === null) return false;
  if (habit.type === "boolean") return value === true;
  if (habit.type === "numeric") return getNumericTotal(value) > 0;
  return false;
}
