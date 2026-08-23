// Auto-detected habit categories, driven purely by the habit's name — the
// replacement for manually picking a photo/icon (see habitsView.js's now-gone
// emoji picker). Each category pairs a Russian keyword/synonym list with a
// real photo in assets/habits/; "sport" and "mental_health" deliberately
// reuse existing habit photos (otzhimaniya.png/meditaciya.png) rather than
// new dedicated files, since no separate ones were supplied for those two.
//
// The keyword lists are intentionally broad — not just the exact words used
// by the 50 original preset habit names, but a wide net of everyday Russian
// synonyms/phrasings for each theme, so a habit name nobody anticipated
// (e.g. "Позвонить маме", "Звонок близким") still lands in a sensible
// category. There's no real semantic/embedding model running offline in
// this PWA (no backend, no network calls from the client) — this keyword
// breadth plus the scoring in detectCategory() below is the practical
// stand-in for that.
//
// Array order only matters as a tie-breaker (see detectCategory()) — sport
// and mental_health sit above the general "health" bucket so that, all else
// equal, e.g. "пробежка" or "медитация" don't get swallowed by the broader
// health keywords.
export const CATEGORIES = [
  {
    id: "sport",
    label: "Спорт",
    photo: "otzhimaniya.png",
    keywords: [
      "спорт", "бег", "беж", "пробеж", "трениров", "тренаж", "фитнес",
      "качалк", "спортзал", "зал", "кардио", "плаван", "бассейн",
      "велосипед", "вел", "приседан", "отжиман", "подтягива", "планка",
      "растяжк", "стретч", "йога", "ходьб", "прогулк", "шаг", "шагов",
      "силов", "гантел", "штанг", "бокс", "единоборств", "футбол",
      "баскетбол", "теннис", "лыж", "коньк", "ролик", "самокат",
      "разминк", "зарядк", "гимнастик", "марафон", "кросс",
    ],
  },
  {
    id: "mental_health",
    label: "Ментальное здоровье",
    photo: "meditaciya.png",
    keywords: [
      "медитаци", "медитировать", "дыхани", "осознанност", "майндфулн",
      "психолог", "тревог", "стресс", "благодарност", "релакс", "покой",
      "спокойств", "эмоци", "самоанализ", "рефлекси", "аффирмац",
      "терапи", "ретрит", "тишин", "уединен",
    ],
  },
  {
    id: "health",
    label: "Здоровье",
    photo: "health.png",
    keywords: [
      "здоровь", "витамин", "таблетк", "лекарств", "вода", "пить", "вес",
      "диета", "питани", "врач", "доктор", "зуб", "сон", "спать",
      "высыпа", "чекап", "давлен", "пульс", "овощ", "фрукт", "курен",
      "алкогол", "вредн привычк", "гигиен", "уход за собой", "кожа",
      "массаж", "иммунитет",
    ],
  },
  {
    id: "productivity",
    label: "Продуктивность",
    photo: "productivity.png",
    keywords: [
      "продуктивност", "работа", "задач", "план", "дедлайн", "фокус",
      "список дел", "проект", "почта", "тайм-менеджмент", "органайзер",
      "приоритет", "отчет", "расписан", "календар", "продуктив",
      "делеги", "митинг", "совещан",
    ],
  },
  {
    id: "learning",
    label: "Обучение и развитие",
    photo: "learning.png",
    keywords: [
      "учеб", "учить", "изучен", "курс", "язык", "английск", "испанск",
      "немецк", "французск", "китайск", "урок", "обучени", "развити",
      "чтени", "читать", "книг", "лекци", "подкаст", "аудиокниг",
      "диплом", "экзамен", "конспект", "лексик", "грамматик",
      "программирован", "навык", "мастер-класс", "семинар", "стать",
    ],
  },
  {
    id: "finance",
    label: "Финансы",
    photo: "finance.png",
    keywords: [
      "деньг", "финанс", "бюджет", "накоплен", "трат", "инвестиц",
      "кредит", "экономи", "зарплат", "доход", "расход", "сбережен",
      "вклад", "акци", "биржа", "налог", "ипотек", "долг", "подушк",
      "безопасности",
    ],
  },
  {
    id: "home",
    label: "Дом и быт",
    photo: "home.png",
    keywords: [
      "уборк", "дом", "быт", "стирк", "посуд", "готовк", "кухн",
      "порядок", "растен", "чистот", "полив", "мусор", "пылесос",
      "глажк", "ремонт", "огород", "сад", "хозяйств",
    ],
  },
  {
    id: "relationships",
    label: "Отношения",
    photo: "relationships.png",
    keywords: [
      "семь", "друз", "отношени", "партнер", "свидани", "родител",
      "детьми", "детям", "общени", "позвонить", "звон", "созвон",
      "близ", "муж", "жен", "супруг", "мам", "пап", "бабушк",
      "дедушк", "брат", "сестр", "подруг", "коллег", "встреч", "навест",
      "обним", "видеть",
    ],
  },
];

/**
 * Best-effort category id for a habit name. Scores every category by how
 * many of its keywords appear as a substring of the (lowercased) name, and
 * returns the highest-scoring one — not just the first category with any
 * match — so a name with several relevant words picks the category with the
 * strongest signal rather than whichever bucket happens to sit earlier in
 * CATEGORIES. Ties go to the earlier category in the array (its declared
 * priority), same as before. Returns null if nothing matched at all —
 * callers should treat that as "no themed photo, fall back to whatever
 * comes next" (see NEUTRAL_CATEGORY_ID / illustrations.js).
 */
export function detectCategory(name) {
  if (!name) return null;
  const lower = name.toLowerCase();
  let best = null;
  let bestScore = 0;
  for (const category of CATEGORIES) {
    const score = category.keywords.reduce((n, kw) => n + (lower.includes(kw) ? 1 : 0), 0);
    if (score > bestScore) {
      bestScore = score;
      best = category;
    }
  }
  return best ? best.id : null;
}

/** Looks up a category's metadata (label/photo/keywords) by id — used wherever the id alone (e.g. from detectCategory()) needs to become a filename. */
export function getCategoryById(id) {
  return CATEGORIES.find((c) => c.id === id) || null;
}

/** Category used when a habit's name doesn't match any category at all — a real, on-theme photo (see illustrations.js's heroIllustrationForHabit()) instead of the generic drawn mountain scene, so an unrecognized name never reads as an obvious visual miss. */
export const NEUTRAL_CATEGORY_ID = "productivity";
