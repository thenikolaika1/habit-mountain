// Auto-detected habit categories, driven purely by the habit's name — the
// replacement for manually picking a photo/icon (see habitsView.js's now-gone
// emoji picker). Each category pairs a Russian keyword list with a real
// photo in assets/habits/; "sport" and "mental_health" deliberately reuse
// existing habit photos (otzhimaniya.png/meditaciya.png) rather than new
// dedicated files, since no separate ones were supplied for those two.
//
// Array order is the match priority when a name could plausibly fit more
// than one category (checked top to bottom, first match wins) — sport and
// mental_health sit above the general "health" bucket so e.g. "пробежка"
// or "медитация" don't get swallowed by the broader health keywords.
export const CATEGORIES = [
  {
    id: "sport",
    label: "Спорт",
    photo: "otzhimaniya.png",
    keywords: [
      "спорт", "бег", "беж", "трениров", "фитнес", "качалк", "зал",
      "кардио", "плаван", "велосипед", "приседан", "отжиман", "растяжк",
      "йога", "ходьб", "прогулк", "шаг",
    ],
  },
  {
    id: "mental_health",
    label: "Ментальное здоровье",
    photo: "meditaciya.png",
    keywords: [
      "медитаци", "дыхани", "осознанност", "майндфулн", "психолог",
      "тревог", "стресс", "благодарност", "релакс", "покой",
    ],
  },
  {
    id: "health",
    label: "Здоровье",
    photo: "health.png",
    keywords: [
      "здоровь", "витамин", "таблетк", "лекарств", "вода", "пить", "вес",
      "диета", "питани", "врач", "доктор", "зуб", "сон",
    ],
  },
  {
    id: "productivity",
    label: "Продуктивность",
    photo: "productivity.png",
    keywords: [
      "продуктивност", "работа", "задач", "план", "дедлайн", "фокус",
      "список дел", "проект", "почта",
    ],
  },
  {
    id: "learning",
    label: "Обучение и развитие",
    photo: "learning.png",
    keywords: [
      "учеб", "учить", "изучен", "курс", "язык", "английск", "урок",
      "обучени", "развити", "чтени", "книг", "лекци",
    ],
  },
  {
    id: "finance",
    label: "Финансы",
    photo: "finance.png",
    keywords: [
      "деньг", "финанс", "бюджет", "накоплен", "трат", "инвестиц",
      "кредит", "экономи", "зарплат",
    ],
  },
  {
    id: "home",
    label: "Дом и быт",
    photo: "home.png",
    keywords: [
      "уборк", "дом", "быт", "стирк", "посуд", "готовк", "кухн",
      "порядок", "растен", "чистот",
    ],
  },
  {
    id: "relationships",
    label: "Отношения",
    photo: "relationships.png",
    keywords: [
      "семь", "друз", "отношени", "партнер", "свидани", "родител",
      "детьми", "детям", "общени", "позвонить",
    ],
  },
];

/** Best-effort category id for a habit name (case-insensitive substring match against each category's keyword list), or null if nothing matched — callers should treat null as "no themed photo, fall back to whatever comes next." */
export function detectCategory(name) {
  if (!name) return null;
  const lower = name.toLowerCase();
  const match = CATEGORIES.find((c) => c.keywords.some((kw) => lower.includes(kw)));
  return match ? match.id : null;
}

/** Looks up a category's metadata (label/photo/keywords) by id — used wherever the id alone (e.g. from detectCategory()) needs to become a filename. */
export function getCategoryById(id) {
  return CATEGORIES.find((c) => c.id === id) || null;
}
