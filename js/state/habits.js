import { loadState, saveState, generateId } from "./storage.js";

export function getHabits({ includeArchived = false } = {}) {
  const state = loadState();
  return includeArchived ? state.habits.slice() : state.habits.filter((h) => !h.archived);
}

export function getHabit(id) {
  const state = loadState();
  return state.habits.find((h) => h.id === id) || null;
}

export function addHabit({ name, type, unit = "", target = null, color = null }) {
  const state = loadState();
  const habit = {
    id: generateId("hb"),
    name: name.trim(),
    type, // 'boolean' | 'numeric'
    unit: type === "numeric" ? unit.trim() : "",
    target: type === "numeric" && target ? Number(target) : null,
    color: color || pickColor(state.habits.length),
    createdAt: new Date().toISOString(),
    archived: false,
  };
  state.habits.push(habit);
  saveState(state);
  return habit;
}

export function updateHabit(id, patch) {
  const state = loadState();
  const habit = state.habits.find((h) => h.id === id);
  if (!habit) return null;
  Object.assign(habit, patch);
  saveState(state);
  return habit;
}

export function archiveHabit(id) {
  return updateHabit(id, { archived: true });
}

export function deleteHabitPermanently(id) {
  const state = loadState();
  state.habits = state.habits.filter((h) => h.id !== id);
  delete state.entries[id];
  saveState(state);
}

const PALETTE = ["#2f9e6e", "#3a7bd5", "#d9822b", "#c1447e", "#7a5cd6", "#2aa7a0", "#c94f4f"];

function pickColor(index) {
  return PALETTE[index % PALETTE.length];
}
