// Fixed catalog of units for numeric habits — a dropdown instead of free
// text, so "раз"/"мин"/"минуты" etc. don't fragment into inconsistent
// variants across habits.
export const UNITS = ["раз", "минуты", "часы", "страницы", "км", "литры", "подходы", "калории", "мл", "шагов"];

/** One emoji per unit, for the habit form's unit picker (habitsView.js) — purely decorative, no effect on the stored value. */
export const UNIT_ICONS = {
  раз: "🔁",
  минуты: "⏱️",
  часы: "⏰",
  страницы: "📄",
  км: "📍",
  литры: "💧",
  подходы: "🏋️",
  калории: "🔥",
  мл: "🥤",
  шагов: "👣",
};
