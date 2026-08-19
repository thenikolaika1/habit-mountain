// localStorage persistence layer + tiny pub/sub so views can re-render after
// any mutation without a framework. All reads/writes to the app's data MUST
// go through loadState()/saveState() so schema shape stays consistent.

const STORAGE_KEY = "habit-mountain:v1";
const SCHEMA_VERSION = 1;

function emptyState() {
  return {
    schemaVersion: SCHEMA_VERSION,
    habits: [],
    entries: {},
    meta: {
      unlockedAchievements: {},
      lastSeenMonth: null,
    },
  };
}

function migrate(raw) {
  // Placeholder for future schema migrations. Currently only v1 exists.
  if (!raw || typeof raw !== "object") return emptyState();
  const state = emptyState();
  if (Array.isArray(raw.habits)) state.habits = raw.habits;
  if (raw.entries && typeof raw.entries === "object") state.entries = raw.entries;
  if (raw.meta && typeof raw.meta === "object") {
    state.meta.unlockedAchievements =
      raw.meta.unlockedAchievements && typeof raw.meta.unlockedAchievements === "object"
        ? raw.meta.unlockedAchievements
        : {};
    state.meta.lastSeenMonth = typeof raw.meta.lastSeenMonth === "string" ? raw.meta.lastSeenMonth : null;
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
