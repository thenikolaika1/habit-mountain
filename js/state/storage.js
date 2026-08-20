// localStorage persistence layer + tiny pub/sub so views can re-render after
// any mutation without a framework. All reads/writes to the app's data MUST
// go through loadState()/saveState() so schema shape stays consistent.

const STORAGE_KEY = "habit-mountain:v1";
const SCHEMA_VERSION = 2;

const DEFAULT_ICONS = ["⭐", "🌱", "💧", "📚", "🏃", "🧘", "🎯", "☀️"];

function emptyState() {
  return {
    schemaVersion: SCHEMA_VERSION,
    habits: [],
    entries: {},
    meta: {
      unlockedAchievements: {},
      completedChallenges: {},
      lastSeenMonth: null,
      settings: { theme: "system", notificationsEnabled: false, defaultUnit: "раз" },
    },
  };
}

function migrate(raw) {
  // Manual, defensive migration — every field is individually type-checked
  // so older data (missing fields this version added) still loads cleanly
  // instead of throwing or silently losing everything.
  if (!raw || typeof raw !== "object") return emptyState();
  const state = emptyState();
  if (Array.isArray(raw.habits)) {
    state.habits = raw.habits.map((h, i) => ({
      ...h,
      icon: typeof h.icon === "string" && h.icon ? h.icon : DEFAULT_ICONS[i % DEFAULT_ICONS.length],
    }));
  }
  if (raw.entries && typeof raw.entries === "object") state.entries = raw.entries;
  if (raw.meta && typeof raw.meta === "object") {
    state.meta.unlockedAchievements =
      raw.meta.unlockedAchievements && typeof raw.meta.unlockedAchievements === "object"
        ? raw.meta.unlockedAchievements
        : {};
    state.meta.completedChallenges =
      raw.meta.completedChallenges && typeof raw.meta.completedChallenges === "object"
        ? raw.meta.completedChallenges
        : {};
    state.meta.lastSeenMonth = typeof raw.meta.lastSeenMonth === "string" ? raw.meta.lastSeenMonth : null;
    const rawSettings = raw.meta.settings && typeof raw.meta.settings === "object" ? raw.meta.settings : {};
    state.meta.settings = {
      theme: ["system", "light", "dark"].includes(rawSettings.theme) ? rawSettings.theme : "system",
      notificationsEnabled: rawSettings.notificationsEnabled === true,
      defaultUnit: typeof rawSettings.defaultUnit === "string" && rawSettings.defaultUnit ? rawSettings.defaultUnit : "раз",
    };
  }
  return state;
}

let cachedState = null;
const subscribers = new Set();

export function loadState() {
  if (cachedState) return cachedState;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      cachedState = emptyState();
      return cachedState;
    }
    const parsed = JSON.parse(raw);
    cachedState = migrate(parsed);
  } catch (err) {
    console.warn("Habit Mountain: failed to load state, starting fresh.", err);
    cachedState = emptyState();
  }
  return cachedState;
}

export function saveState(state) {
  cachedState = state;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn("Habit Mountain: failed to save state (quota exceeded?).", err);
  }
  notifySubscribers();
}

export function subscribe(fn) {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}

function notifySubscribers() {
  for (const fn of subscribers) {
    try {
      fn(cachedState);
    } catch (err) {
      console.error("Habit Mountain: subscriber failed", err);
    }
  }
}

export function generateId(prefix) {
  const rand = Math.random().toString(36).slice(2, 10);
  const time = Date.now().toString(36);
  return `${prefix}_${time}${rand}`;
}
