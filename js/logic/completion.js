// Whether a stored entry value counts as "done" for a given habit type.
export function isDayComplete(habit, value) {
  if (value === undefined || value === null) return false;
  if (habit.type === "boolean") return value === true;
  if (habit.type === "numeric") return typeof value === "number" && value > 0;
  return false;
}
