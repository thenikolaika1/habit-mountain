// Hand-authored inline SVG illustrations, in the same spirit as
// js/mountainSvg.js — no external image files or icon libraries, so the
// app stays fully self-contained and offline-installable. Colors are set
// via CSS classes (styled in css/illustrations.css) rather than baked into
// the markup, so everything reacts correctly to the light/dark theme.

/**
 * Small circular status indicator — done (filled + check) / empty (outline)
 * / locked (outline + dot) — used wherever a card needs a compact status
 * badge instead of a button or chevron: the habit list, challenge cards,
 * and the per-habit day list. Deliberately not a percentage ring — none of
 * those three contexts have a meaningful "how much" to show, just a
 * three-state status, so a simpler shape reads faster at a glance.
 */
export function statusRing({ state = "empty", size = 44 } = {}) {
  const r = (size - 4) / 2;
  const c = size / 2;

  if (state === "done") {
    const a = size * 0.28;
    const b = size * 0.43;
    const d = size * 0.67;
    const e = size * 0.74;
    const f = size * 0.34;
    return `
      <svg class="status-ring status-ring--done" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="Выполнено">
        <circle class="status-ring-fill" cx="${c}" cy="${c}" r="${r}" />
        <path class="status-ring-check" d="M${a},${size * 0.52} L${b},${d} L${e},${f}" />
      </svg>`;
  }

  if (state === "locked") {
    return `
      <svg class="status-ring status-ring--locked" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="Недоступно">
        <circle class="status-ring-track" cx="${c}" cy="${c}" r="${r}" />
        <circle class="status-ring-dot" cx="${c}" cy="${c}" r="2.5" />
      </svg>`;
  }

  return `
    <svg class="status-ring status-ring--empty" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="Не выполнено">
      <circle class="status-ring-track" cx="${c}" cy="${c}" r="${r}" />
    </svg>`;
}

/** Medal-on-ribbon hero illustration for the "Испытания" screen header. */
export function medalIllustration() {
  return `
    <svg class="illustration illustration-medal" viewBox="0 0 120 120" role="img" aria-label="Медаль">
      <path class="illustration-ribbon illustration-ribbon-a" d="M40 8 L58 62 L38 70 Z" />
      <path class="illustration-ribbon illustration-ribbon-b" d="M80 8 L62 62 L82 70 Z" />
      <circle class="illustration-medal-disc" cx="60" cy="72" r="34" />
      <circle class="illustration-medal-ring" cx="60" cy="72" r="34" />
      <path
        class="illustration-medal-star"
        d="M60 54 L65.5 66.5 L79 68 L69 77 L72 90.5 L60 83.5 L48 90.5 L51 77 L41 68 L54.5 66.5 Z"
      />
    </svg>`;
}

/** Trophy hero illustration for the "Достижения" screen header. */
export function trophyIllustration() {
  return `
    <svg class="illustration illustration-trophy" viewBox="0 0 120 120" role="img" aria-label="Кубок">
      <path class="illustration-trophy-handle" d="M28 26 C14 26 14 50 30 52" />
      <path class="illustration-trophy-handle" d="M92 26 C106 26 106 50 90 52" />
      <path class="illustration-trophy-cup" d="M32 22 H88 L84 60 C84 76 72 86 60 86 C48 86 36 76 36 60 Z" />
      <rect class="illustration-trophy-stem" x="52" y="86" width="16" height="14" rx="3" />
      <rect class="illustration-trophy-base" x="38" y="98" width="44" height="12" rx="4" />
      <path class="illustration-trophy-star" d="M60 40 L64 50 L74 51 L66 58 L69 68 L60 62 L51 68 L54 58 L46 51 L56 50 Z" />
    </svg>`;
}

/** Sprout-in-a-pot illustration for the "Привычки" empty state. */
export function sproutIllustration() {
  return `
    <svg class="illustration illustration-sprout" viewBox="0 0 120 120" role="img" aria-label="Росток">
      <path class="illustration-sprout-leaf illustration-sprout-leaf-a" d="M60 70 C40 70 34 50 40 32 C58 36 66 52 60 70 Z" />
      <path class="illustration-sprout-leaf illustration-sprout-leaf-b" d="M60 70 C80 70 86 52 80 34 C62 38 54 54 60 70 Z" />
      <line class="illustration-sprout-stem" x1="60" y1="70" x2="60" y2="86" />
      <path class="illustration-sprout-pot" d="M38 86 H82 L76 108 H44 Z" />
      <line class="illustration-sprout-pot-rim" x1="34" y1="86" x2="86" y2="86" />
    </svg>`;
}

/** Gear-with-leaf illustration for the "Настройки" screen header. */
export function gearIllustration() {
  return `
    <svg class="illustration illustration-gear" viewBox="0 0 120 120" role="img" aria-label="Настройки">
      <path
        class="illustration-gear-body"
        d="M60 30 a30 30 0 0 1 0 60 a30 30 0 0 1 0 -60 Z"
      />
      ${Array.from({ length: 8 })
        .map((_, i) => {
          const angle = (i * 360) / 8;
          return `<rect class="illustration-gear-tooth" x="56" y="10" width="8" height="16" rx="2" transform="rotate(${angle} 60 60)" />`;
        })
        .join("")}
      <circle class="illustration-gear-hole" cx="60" cy="60" r="12" />
      <path class="illustration-gear-leaf" d="M60 60 C48 52 48 40 58 32 C66 42 64 54 60 60 Z" />
    </svg>`;
}

// ---------- Tab bar icons (small, monochrome line art via currentColor) ----------

export function iconMedal() {
  return `<svg class="tab-icon-svg" viewBox="0 0 24 24" fill="none"><path d="M9 2 12 11 8 12.5 6 2Z" fill="currentColor" opacity="0.55"/><path d="M15 2 12 11 16 12.5 18 2Z" fill="currentColor" opacity="0.55"/><circle cx="12" cy="15" r="6.5" fill="currentColor" opacity="0.18"/><circle cx="12" cy="15" r="6.5" stroke="currentColor" stroke-width="1.6"/><path d="M12 11.8 12.9 13.6 14.9 13.9 13.4 15.3 13.8 17.3 12 16.3 10.2 17.3 10.6 15.3 9.1 13.9 11.1 13.6Z" fill="currentColor"/></svg>`;
}

export function iconHabits() {
  return `<svg class="tab-icon-svg" viewBox="0 0 24 24" fill="none"><rect x="4" y="4" width="16" height="16" rx="5" stroke="currentColor" stroke-width="1.6" fill="currentColor" fill-opacity="0.12"/><path d="M8 12.5 10.5 15 16 9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

export function iconProgress() {
  return `<svg class="tab-icon-svg" viewBox="0 0 24 24" fill="none"><path d="M3 19 9 8 13 14 16 9 21 19Z" fill="currentColor" fill-opacity="0.18" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M16 9 13 5 10.5 8.8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

export function iconAchievements() {
  return `<svg class="tab-icon-svg" viewBox="0 0 24 24" fill="none"><path d="M7 5H17L16 12C16 15 14 17 12 17C10 17 8 15 8 12Z" fill="currentColor" fill-opacity="0.18" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M7 6C5 6 4.5 8 6 9.5C6.8 10.3 7.6 10.4 8 10.3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M17 6C19 6 19.5 8 18 9.5C17.2 10.3 16.4 10.4 16 10.3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><rect x="10.5" y="17" width="3" height="2.5" fill="currentColor"/><rect x="8.5" y="19.3" width="7" height="2" rx="1" fill="currentColor"/></svg>`;
}

export function iconSearch() {
  return `<svg class="search-field-icon-svg" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" stroke-width="1.8"/><line x1="15.3" y1="15.3" x2="20" y2="20" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`;
}

export function iconSettings() {
  return `<svg class="tab-icon-svg" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3.2" stroke="currentColor" stroke-width="1.6" fill="currentColor" fill-opacity="0.18"/><path d="M12 4.5V6.3M12 17.7V19.5M19.5 12H17.7M6.3 12H4.5M17.5 6.5 16.2 7.8M7.8 16.2 6.5 17.5M17.5 17.5 16.2 16.2M7.8 7.8 6.5 6.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`;
}

// ---------- Habit detail hero illustrations ----------
// Full-width "photo banner" scenes for the per-habit screen
// (js/views/calendarView.js) — bigger and more scene-like than the small
// line icons above, standing in for a real themed photo without needing
// one: a gradient backdrop (colored via CSS, like everything else here)
// plus a bold central motif per habit theme. heroIllustrationForHabit()
// below picks one from the habit's emoji.
function heroFrame(motifSvg, { night = false } = {}) {
  return `
    <svg class="habit-hero-svg ${night ? "habit-hero-svg--night" : ""}" viewBox="0 0 400 220" preserveAspectRatio="xMidYMid slice" role="img" aria-hidden="true">
      <rect class="habit-hero-bg-a" x="0" y="0" width="400" height="220" />
      <rect class="habit-hero-bg-b" x="0" y="0" width="400" height="220" />
      ${motifSvg}
      <ellipse class="habit-hero-ground-shadow" cx="200" cy="206" rx="150" ry="10" />
    </svg>`;
}

/** Water droplet, for hydration-style habits. */
export function heroWater() {
  return heroFrame(`
    <circle class="habit-hero-accent-soft" cx="330" cy="55" r="46" />
    <path class="habit-hero-motif" d="M200 40 C238 96 262 128 262 155 C262 189 234 210 200 210 C166 210 138 189 138 155 C138 128 162 96 200 40 Z" />
    <path class="habit-hero-motif-shine" d="M188 66 C168 100 154 126 154 150" />
  `);
}

/** Open book, for reading/journaling habits. */
export function heroReading() {
  return heroFrame(`
    <circle class="habit-hero-accent-soft" cx="70" cy="50" r="38" />
    <path class="habit-hero-motif" d="M200 90 C170 72 128 68 100 78 V172 C128 162 170 166 200 184 C230 166 272 162 300 172 V78 C272 68 230 72 200 90 Z" />
    <line class="habit-hero-motif-shine" x1="200" y1="90" x2="200" y2="184" />
    <line class="habit-hero-motif-line" x1="122" y1="98" x2="178" y2="106" />
    <line class="habit-hero-motif-line" x1="122" y1="118" x2="178" y2="124" />
    <line class="habit-hero-motif-line" x1="222" y1="106" x2="278" y2="98" />
    <line class="habit-hero-motif-line" x1="222" y1="124" x2="278" y2="118" />
  `);
}

/** Dumbbell, for strength/fitness habits. */
export function heroFitness() {
  return heroFrame(`
    <circle class="habit-hero-accent-soft" cx="320" cy="60" r="42" />
    <rect class="habit-hero-motif" x="120" y="130" width="160" height="20" rx="10" />
    <rect class="habit-hero-motif" x="90" y="105" width="34" height="70" rx="10" />
    <rect class="habit-hero-motif" x="276" y="105" width="34" height="70" rx="10" />
    <rect class="habit-hero-motif-shine" x="90" y="105" width="34" height="18" rx="9" />
  `);
}

/** Crescent moon + stars, for sleep habits — the one "night" themed hero. */
export function heroSleep() {
  return heroFrame(
    `
    <path class="habit-hero-motif" d="M235 60 A70 70 0 1 0 235 190 A56 56 0 1 1 235 60 Z" />
    <circle class="habit-hero-star" cx="120" cy="60" r="4" />
    <circle class="habit-hero-star" cx="90" cy="100" r="3" />
    <circle class="habit-hero-star" cx="150" cy="110" r="2.5" />
  `,
    { night: true }
  );
}

/** Seated figure in a lotus pose, for meditation/mindfulness habits. */
export function heroMindfulness() {
  return heroFrame(`
    <circle class="habit-hero-accent-soft" cx="200" cy="60" r="44" />
    <circle class="habit-hero-motif" cx="200" cy="110" r="24" />
    <path class="habit-hero-motif" d="M140 190 C140 150 170 140 200 140 C230 140 260 150 260 190 Z" />
    <path class="habit-hero-motif-shine" d="M150 168 C165 154 180 150 200 150 C220 150 235 154 250 168" />
  `);
}

/** Apple + leaf, for nutrition/diet habits. */
export function heroNutrition() {
  return heroFrame(`
    <circle class="habit-hero-accent-soft" cx="90" cy="55" r="36" />
    <path class="habit-hero-motif" d="M200 90 C160 90 140 120 140 150 C140 180 165 200 195 200 C200 200 205 198 210 198 C215 198 220 200 225 200 C255 200 280 180 280 150 C280 120 250 92 218 92 C212 92 206 96 200 96 Z" />
    <path class="habit-hero-motif-leaf" d="M205 90 C205 70 220 58 240 58 C240 78 225 90 205 90 Z" />
    <line class="habit-hero-motif-shine" x1="205" y1="92" x2="205" y2="70" />
  `);
}

/** Palette + brush, for creative habits. */
export function heroCreative() {
  return heroFrame(`
    <circle class="habit-hero-accent-soft" cx="310" cy="65" r="40" />
    <path class="habit-hero-motif" d="M200 70 C150 70 115 100 115 138 C115 168 140 178 160 168 C170 163 182 168 182 180 C182 195 195 202 210 198 C255 186 280 158 280 130 C280 96 250 70 200 70 Z" />
    <circle class="habit-hero-dot" cx="160" cy="115" r="9" />
    <circle class="habit-hero-dot" cx="200" cy="105" r="9" />
    <circle class="habit-hero-dot" cx="238" cy="120" r="9" />
  `);
}

/** Mountain peak + sun — the generic fallback, echoing the app's own branding. */
export function heroDefault() {
  return heroFrame(`
    <circle class="habit-hero-accent-soft" cx="90" cy="55" r="34" />
    <path class="habit-hero-motif" d="M40 195 L150 70 L210 140 L250 95 L360 195 Z" />
    <path class="habit-hero-motif-shine" d="M150 70 L180 108 L165 108 Z" />
  `);
}

const HERO_BY_EMOJI = {
  "💧": heroWater,
  "🥗": heroNutrition,
  "☕️": heroNutrition,
  "📚": heroReading,
  "✍️": heroReading,
  "💪": heroFitness,
  "🏃": heroFitness,
  "🚴": heroFitness,
  "🏊": heroFitness,
  "🛌": heroSleep,
  "🧘": heroMindfulness,
  "🧠": heroMindfulness,
  "🎨": heroCreative,
  "🎸": heroCreative,
};

/** Picks a themed hero illustration for a habit from its emoji icon, falling back to the generic mountain/sun scene for anything unmapped. */
export function heroIllustrationForHabit(habit) {
  const build = HERO_BY_EMOJI[habit?.icon] || heroDefault;
  return build();
}
