// Pure date helpers. Dates are always represented either as {year, month, day}
// plain numbers (month is 0-11) or as "YYYY-MM-DD" string keys built manually
// (never via toISOString(), which shifts to UTC and can roll the day over).

const WEEKDAYS_MON_FIRST = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

const MONTH_NAMES = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
];

export function pad2(n) {
  return String(n).padStart(2, "0");
}

export function formatDateKey(year, month, day) {
  // month is 0-11
  return `${year}-${pad2(month + 1)}-${pad2(day)}`;
}

export function todayParts() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth(), day: now.getDate() };
}

export function todayKey() {
  const t = todayParts();
  return formatDateKey(t.year, t.month, t.day);
}

/** "YYYY-MM" key for a given month — used to detect a month boundary was crossed. */
export function monthKey(year, month) {
  return `${year}-${pad2(month + 1)}`;
}

export function dateKeyFromDate(date) {
  return formatDateKey(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addDaysToKey(dateKey, delta) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + delta);
  return dateKeyFromDate(date);
}

// Only the last 3 days — today, yesterday, and the day before — can be
// checked off or edited. Everything older is locked, same as future dates.
const EDITABLE_WINDOW_DAYS = 3;

/** {minKey, maxKey} inclusive bounds of the currently editable date range. */
export function editableDateRange() {
  const tKey = todayKey();
  return { minKey: addDaysToKey(tKey, -(EDITABLE_WINDOW_DAYS - 1)), maxKey: tKey };
}

export function isDateEditable(dateKey) {
  const { minKey, maxKey } = editableDateRange();
  return dateKey >= minKey && dateKey <= maxKey;
}

export function weekdayHeader() {
  return WEEKDAYS_MON_FIRST.slice();
}

export function monthLabel(year, month) {
  return `${MONTH_NAMES[month]} ${year}`;
}

export function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

export function prevMonth({ year, month }) {
  return month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 };
}

export function nextMonth({ year, month }) {
  return month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 };
}

/**
 * Build a flat array of cells for a month grid, Monday-first, padded to full
 * weeks. Each cell is either null (blank filler) or
 * { day, dateKey, isFuture, isToday, isTooOld }.
 */
export function buildMonthGrid(year, month) {
  const first = new Date(year, month, 1);
  const mondayIndex = (first.getDay() + 6) % 7;
  const total = daysInMonth(year, month);
  const tKey = todayKey();
  const { minKey } = editableDateRange();

  const cells = [];
  for (let i = 0; i < mondayIndex; i++) cells.push(null);
  for (let day = 1; day <= total; day++) {
    const dateKey = formatDateKey(year, month, day);
    cells.push({
      day,
      dateKey,
      isFuture: dateKey > tKey,
      isToday: dateKey === tKey,
      isTooOld: dateKey < minKey,
    });
  }
  const remainder = cells.length % 7;
  if (remainder !== 0) {
    const trailing = 7 - remainder;
    for (let i = 0; i < trailing; i++) cells.push(null);
  }
  return cells;
}

/**
 * The earliest date that should count toward a habit's history: the older
 * of its creation date and the earliest logged entry (a user is allowed to
 * backfill past days for a habit right after creating it, so an entry can
 * legitimately predate `createdAt`).
 */
export function earliestRelevantDateKey(habit, entries) {
  const createdKey = dateKeyFromDate(new Date(habit.createdAt));
  const entryKeys = Object.keys(entries);
  if (entryKeys.length === 0) return createdKey;
  const earliestEntryKey = entryKeys.reduce((min, key) => (key < min ? key : min), entryKeys[0]);
  return earliestEntryKey < createdKey ? earliestEntryKey : createdKey;
}

/** All dateKeys within a given month, in order. */
export function allKeysInMonth(year, month) {
  const total = daysInMonth(year, month);
  const keys = [];
  for (let day = 1; day <= total; day++) keys.push(formatDateKey(year, month, day));
  return keys;
}
