// Auto-detected "Сегодня" checklist icon topic, driven purely by the
// habit's name — same technique as logic/categories.js's detectCategory()
// (scored keyword matching, no real semantic model running offline in this
// PWA), but deliberately more fine-grained: categories.js picks one of 8
// broad photo categories for a habit's *card*, this picks one of ~18
// specific pictogram topics for the small decorative icon next to it in
// the "Сегодня" list — "Пить воду" and "Витамины" would both land in
// categories.js's single "health" bucket, but here they need visibly
// different icons (a droplet vs a pill), so this keyword list is its own,
// narrower-scoped set, not a re-export of CATEGORIES.
//
// Array order is the tie-breaker in pickHabitIconTopic() below, same rule
// as categories.js: more specific topics (water, sleep, vitamins, ...)
// come before broader ones (sport, health) so a name that could plausibly
// fit either doesn't fall into the vaguer bucket on a tie.
export const HABIT_ICON_TOPICS = [
  {
    id: "water",
    keywords: ["вода", "воду", "воды", "пить", "гидратац"],
  },
  {
    id: "sleep",
    keywords: ["сон", "спать", "высыпа", "засыпа"],
  },
  {
    id: "meditation",
    keywords: [
      "медитаци", "медитировать", "дыхани", "осознанност", "майндфулн",
      "релакс", "покой", "спокойств", "тишин", "уединен",
    ],
  },
  {
    id: "vitamins",
    keywords: ["витамин", "таблетк", "лекарств", "капсул", "добавк"],
  },
  {
    id: "reading",
    keywords: ["книг", "читат", "чтени", "роман", "рассказ"],
  },
  {
    id: "learning",
    keywords: [
      "учеб", "учить", "изучен", "курс", "язык", "английск", "испанск",
      "немецк", "французск", "китайск", "урок", "обучени", "развити",
      "лекци", "подкаст", "аудиокниг", "диплом", "экзамен", "конспект",
      "лексик", "грамматик", "программирован", "навык", "семинар",
    ],
  },
  {
    id: "strength",
    keywords: [
      "отжиман", "гантел", "штанг", "силов", "качалк", "подтягива",
      "планка", "приседан",
    ],
  },
  {
    id: "walking",
    keywords: ["прогулк", "шаг", "шагов", "ходьб"],
  },
  {
    id: "sport",
    keywords: [
      "спорт", "бег", "беж", "пробеж", "трениров", "тренаж", "фитнес",
      "спортзал", "зал", "кардио", "плаван", "бассейн", "велосипед", "вел",
      "растяжк", "стретч", "йога", "йогой", "бокс", "единоборств", "футбол",
      "баскетбол", "теннис", "лыж", "коньк", "ролик", "самокат",
      "разминк", "зарядк", "гимнастик", "марафон", "кросс",
    ],
  },
  {
    id: "nutrition",
    keywords: ["питани", "диет", "овощ", "фрукт", "готовк", "кухн"],
  },
  {
    id: "cleaning",
    keywords: ["уборк", "пылесос", "чистот", "посуд", "стирк", "глажк"],
  },
  {
    id: "home",
    keywords: [
      "дом", "быт", "поряд", "растен", "полив", "мусор", "ремонт",
      "огород", "сад", "хозяйств",
    ],
  },
  {
    id: "finance",
    keywords: [
      "деньг", "финанс", "бюджет", "накоплен", "трат", "инвестиц",
      "кредит", "экономи", "зарплат", "доход", "расход", "сбережен",
      "вклад", "акци", "бирж", "налог", "ипотек", "долг", "подушк",
    ],
  },
  {
    id: "mail",
    keywords: ["почт", "письм", "email", "имейл"],
  },
  {
    id: "phone",
    keywords: ["звон", "созвон", "позвонить", "телефон", "видеозвон"],
  },
  {
    id: "relationships",
    keywords: [
      "семь", "друз", "отношени", "партнер", "свидани", "родител",
      "детьми", "детям", "общени", "близ", "муж", "жен", "супруг", "мам",
      "пап", "бабушк", "дедушк", "брат", "сестр", "подруг", "коллег",
      "встреч", "навест", "обним",
    ],
  },
  {
    id: "productivity",
    keywords: [
      "продуктивност", "работ", "задач", "план", "дедлайн", "фокус",
      "список дел", "проект", "тайм-менеджмент", "органайзер",
      "приоритет", "отчет", "расписан", "календар", "делеги", "митинг",
      "совещан",
    ],
  },
  {
    id: "health",
    keywords: [
      "здоровь", "врач", "доктор", "зуб", "чекап", "давлен", "пульс",
      "курен", "алкогол", "гигиен", "кож", "массаж", "иммунитет", "вес",
    ],
  },
];

/**
 * Best-effort icon topic id for a habit name — same scored-keyword-match
 * algorithm as categories.js's detectCategory(): count keyword hits per
 * topic, return the highest-scoring one (ties go to the earlier topic in
 * HABIT_ICON_TOPICS). Returns null if nothing matched — callers should
 * fall back to a neutral generic icon (see illustrations.js's
 * todayAvatarIcon()).
 */
export function pickHabitIconTopic(name) {
  if (!name) return null;
  const lower = name.toLowerCase();
  let best = null;
  let bestScore = 0;
  for (const topic of HABIT_ICON_TOPICS) {
    const score = topic.keywords.reduce((n, kw) => n + (lower.includes(kw) ? 1 : 0), 0);
    if (score > bestScore) {
      bestScore = score;
      best = topic;
    }
  }
  return best ? best.id : null;
}
