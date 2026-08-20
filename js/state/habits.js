import { loadState, saveState, generateId } from "./storage.js";

export function getHabits({ includeArchived = false } = {}) {
  const state = loadState();
  return includeArchived ? state.habits.slice() : state.habits.filter((h) => !h.archived);
}

export function getHabit(id) {
  const state = loadState();
  return state.habits.find((h) => h.id === id) || null;
}

const DEFAULT_ICONS = ["⭐", "🌱", "💧", "📚", "🏃", "🧘", "🎯", "☀️"];

export function addHabit({ name, type, unit = "", target = null, color = null, icon = null }) {
  const state = loadState();
  const habit = {
    id: generateId("hb"),
    name: name.trim(),
    type, // 'boolean' | 'numeric'
    unit: type === "numeric" ? unit.trim() : "",
    target: type === "numeric" && target ? Number(target) : null,
    color: color || pickColor(state.habits.length),
    icon: icon || DEFAULT_ICONS[state.habits.length % DEFAULT_ICONS.length],
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

export const PALETTE = ["#2f9e6e", "#3a7bd5", "#d9822b", "#c1447e", "#7a5cd6", "#2aa7a0", "#c94f4f"];

function pickColor(index) {
  return PALETTE[index % PALETTE.length];
}

/**
 * Darkens a "#rrggbb" hex color by lowering its HSL lightness — used to
 * build a two-stop gradient (habit.color → darkenColor(habit.color)) for
 * the icon-chip backgrounds (habit avatar, popular-habit card) instead of
 * a flat fill, echoing the same accent-gradient treatment already used on
 * .fab/.btn-primary/.stat-value.
 */
export function darkenColor(hex, amount = 0.16) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const num = parseInt(m[1], 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  const d = max - min;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    if (max === r / 255) h = ((g / 255 - b / 255) / d) % 6;
    else if (max === g / 255) h = (b / 255 - r / 255) / d + 2;
    else h = (r / 255 - g / 255) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const newL = Math.max(0, l - amount);
  const c = (1 - Math.abs(2 * newL - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const mm = newL - c / 2;
  let [r2, g2, b2] = [0, 0, 0];
  if (h < 60) [r2, g2, b2] = [c, x, 0];
  else if (h < 120) [r2, g2, b2] = [x, c, 0];
  else if (h < 180) [r2, g2, b2] = [0, c, x];
  else if (h < 240) [r2, g2, b2] = [0, x, c];
  else if (h < 300) [r2, g2, b2] = [x, 0, c];
  else [r2, g2, b2] = [c, 0, x];
  const toHex = (v) =>
    Math.round((v + mm) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(r2)}${toHex(g2)}${toHex(b2)}`;
}

// Curated emoji choices for the habit avatar picker — a fixed, small set
// covering common habit themes rather than a full emoji picker library.
export const EMOJI_CHOICES = [
  "⭐", "🌱", "💧", "📚", "🏃", "🧘", "🎯", "☀️",
  "🔥", "💪", "🛌", "🥗", "🚭", "🧠", "🎨", "🎸",
  "🚴", "🏊", "✍️", "🧹", "💰", "🌍", "🐶", "☕️",
];
