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

// ---------- Settings row icons (small, monochrome line art via currentColor) ----------

export function iconTheme() {
  return `<svg class="settings-row-icon-svg" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="7.2" stroke="currentColor" stroke-width="1.7"/><path d="M12 4.8A7.2 7.2 0 0 1 12 19.2Z" fill="currentColor"/></svg>`;
}

export function iconUnit() {
  return `<svg class="settings-row-icon-svg" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3.5" y="9" width="17" height="6" rx="1.4" transform="rotate(-18 12 12)" stroke="currentColor" stroke-width="1.6"/><path d="M9 9.8 8.3 11.6M12.2 8.6 11.5 10.4M15.4 7.4 14.7 9.2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" transform="rotate(-18 12 12)"/></svg>`;
}

export function iconBell() {
  return `<svg class="settings-row-icon-svg" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 10.5C6 7 8.5 4.5 12 4.5C15.5 4.5 18 7 18 10.5C18 15 19.5 16 19.5 16.5H4.5C4.5 16 6 15 6 10.5Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" fill="currentColor" fill-opacity="0.15"/><path d="M10 19C10.4 19.8 11.1 20.2 12 20.2C12.9 20.2 13.6 19.8 14 19" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`;
}

export function iconDownload() {
  return `<svg class="settings-row-icon-svg" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 4.5V15" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M8 11.2 12 15.2 16 11.2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 17.5V18.5C5 19.6 5.9 20.5 7 20.5H17C18.1 20.5 19 19.6 19 18.5V17.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`;
}

export function iconTrash() {
  return `<svg class="settings-row-icon-svg" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 7.5H19" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M9 7.5V5.8C9 5.1 9.6 4.5 10.3 4.5H13.7C14.4 4.5 15 5.1 15 5.8V7.5" stroke="currentColor" stroke-width="1.7"/><path d="M6.5 7.5 7.3 18.2C7.4 19.2 8.2 20 9.3 20H14.7C15.8 20 16.6 19.2 16.7 18.2L17.5 7.5" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" fill="currentColor" fill-opacity="0.12"/><path d="M10.3 10.8V16.5M13.7 10.8V16.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`;
}

export function iconInfo() {
  return `<svg class="settings-row-icon-svg" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="7.5" stroke="currentColor" stroke-width="1.7" fill="currentColor" fill-opacity="0.12"/><circle cx="12" cy="8.4" r="1.15" fill="currentColor"/><path d="M12 11.2V16.4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`;
}

// ---------- Habit detail hero illustrations ----------
// Full-width "photo banner" scenes for the per-habit screen
// (js/views/calendarView.js) and, at a smaller size, the "Популярные
// привычки" carousel (js/views/habitsView.js) — detailed flat-illustration
// *scenes* (a person + 2-3 props in their environment), not single-shape
// pictograms. Still hand-drawn inline SVG colored via CSS classes (no
// external art, so the offline PWA stays fully self-contained) — the
// "realism" is multi-part composition, not photorealistic rendering: a
// face (always a light circle + ink stroke, see .habit-hero-face) with
// hair/clothing in ink or the accent green, and a couple of environment
// props per scene, all in the app's own white/ink/green palette.
function heroFrame(motifSvg, { night = false } = {}) {
  return `
    <svg class="habit-hero-svg ${night ? "habit-hero-svg--night" : ""}" viewBox="0 0 400 220" preserveAspectRatio="xMidYMid slice" role="img" aria-hidden="true">
      <rect class="habit-hero-bg-a" x="0" y="0" width="400" height="220" />
      <rect class="habit-hero-bg-b" x="0" y="0" width="400" height="220" />
      ${motifSvg}
      <ellipse class="habit-hero-ground-shadow" cx="200" cy="206" rx="150" ry="10" />
    </svg>`;
}

/** Person filling a glass of water, for hydration-style habits. */
export function heroWater() {
  return heroFrame(`
    <circle class="habit-hero-accent-soft" cx="325" cy="55" r="40" />
    <path class="habit-hero-prop-accent" d="M150 205 V140 C150 118 165 100 200 100 C235 100 250 118 250 140 V205 Z" />
    <ellipse class="habit-hero-face" cx="200" cy="86" rx="26" ry="25" />
    <path class="habit-hero-hair" d="M176 78 C176 56 224 56 224 78 C224 64 176 64 176 78 Z" />
    <path class="habit-hero-face-detail" d="M190 88 q4 4 8 0" />
    <path class="habit-hero-face-detail" d="M210 96 C214 88 210 82 202 84" />
    <path class="habit-hero-limb" d="M210 132 C222 118 232 104 234 92" />
    <path class="habit-hero-limb" d="M172 140 C168 160 168 180 176 200" />
    <path class="habit-hero-limb" d="M228 140 C232 160 232 180 224 200" />
    <path class="habit-hero-motif" d="M224 60 L248 60 L242 110 C242 118 230 118 230 110 Z" />
    <path class="habit-hero-motif-leaf" d="M228 70 H244 L240 102 H232 Z" />
    <path class="habit-hero-motif" d="M300 150 C300 172 284 190 266 190 C248 190 232 172 232 150 C232 130 266 92 266 92 C266 92 300 130 300 150 Z" />
    <path class="habit-hero-motif-line" d="M254 128 C242 148 236 164 236 178" />
  `);
}

/** Person reading in an armchair, for reading/journaling habits. */
export function heroReading() {
  return heroFrame(`
    <circle class="habit-hero-accent-soft" cx="70" cy="55" r="36" />
    <path class="habit-hero-motif" d="M150 205 V120 C150 95 168 80 195 80 H270 C297 80 315 95 315 120 V205 Z" />
    <rect class="habit-hero-motif-leaf" x="165" y="130" width="140" height="72" rx="14" />
    <ellipse class="habit-hero-face" cx="232" cy="118" rx="27" ry="25" />
    <path class="habit-hero-hair" d="M205 110 C205 88 259 88 259 110 C259 96 205 96 205 110 Z" />
    <circle class="habit-hero-pupil" cx="224" cy="122" r="1.8" />
    <circle class="habit-hero-pupil" cx="240" cy="122" r="1.8" />
    <path class="habit-hero-limb" d="M210 164 C216 154 224 150 230 154" />
    <path class="habit-hero-limb" d="M254 164 C248 154 240 150 234 154" />
    <rect class="habit-hero-motif-leaf" x="206" y="150" width="52" height="30" rx="3" />
    <line class="habit-hero-motif-line" x1="232" y1="150" x2="232" y2="178" />
    <line class="habit-hero-motif-line" x1="214" y1="158" x2="228" y2="160" />
    <line class="habit-hero-motif-line" x1="214" y1="168" x2="228" y2="170" />
    <line class="habit-hero-motif-line" x1="236" y1="160" x2="250" y2="158" />
    <line class="habit-hero-motif-line" x1="236" y1="170" x2="250" y2="168" />
    <line class="habit-hero-limb" x1="345" y1="86" x2="345" y2="150" />
    <path class="habit-hero-motif-leaf" d="M322 86 L332 50 H358 L368 86 Z" />
  `);
}

/** Person mid-lunge with a dumbbell, for strength/fitness habits. */
export function heroFitness() {
  return heroFrame(`
    <circle class="habit-hero-accent-soft" cx="320" cy="60" r="40" />
    <rect class="habit-hero-motif-leaf" x="90" y="188" width="220" height="16" rx="8" />
    <path class="habit-hero-prop-accent" d="M190 120 C190 108 240 108 240 120 C244 140 236 158 215 158 C194 158 186 140 190 120 Z" />
    <ellipse class="habit-hero-face" cx="215" cy="98" rx="24" ry="23" />
    <path class="habit-hero-hair" d="M194 90 C194 70 236 70 236 90 C236 78 194 78 194 90 Z" />
    <path class="habit-hero-face-detail" d="M208 100 q5 4 9 0" />
    <path class="habit-hero-limb" d="M198 132 C176 122 152 122 136 124" />
    <path class="habit-hero-limb" d="M232 132 C210 150 190 162 176 168" />
    <path class="habit-hero-limb" d="M204 156 C196 170 196 186 202 200" />
    <path class="habit-hero-limb" d="M226 156 C246 168 260 182 262 200" />
    <rect class="habit-hero-motif" x="120" y="112" width="14" height="24" rx="4" />
    <rect class="habit-hero-motif" x="90" y="98" width="30" height="52" rx="10" />
    <rect class="habit-hero-motif" x="238" y="196" width="46" height="16" rx="8" />
  `);
}

/** Person asleep in bed, the one "night" themed hero, for sleep habits. */
export function heroSleep() {
  return heroFrame(
    `
    <circle class="habit-hero-accent-soft" cx="335" cy="50" r="28" />
    <circle class="habit-hero-star" cx="80" cy="50" r="3" />
    <circle class="habit-hero-star" cx="50" cy="90" r="2.5" />
    <circle class="habit-hero-star" cx="112" cy="35" r="2" />
    <rect class="habit-hero-motif" x="52" y="78" width="16" height="120" rx="6" />
    <rect class="habit-hero-motif" x="58" y="152" width="270" height="46" rx="10" />
    <path class="habit-hero-prop-accent" d="M152 152 C152 122 202 112 252 120 C292 126 322 142 322 162 V198 H152 Z" />
    <path class="habit-hero-motif-leaf" d="M168 150 C168 132 198 126 228 130" />
    <ellipse class="habit-hero-face" cx="128" cy="134" rx="30" ry="27" />
    <path class="habit-hero-face-detail" d="M114 134 q7 6 14 0" />
    <path class="habit-hero-face-detail" d="M144 134 q7 6 14 0" />
    <path class="habit-hero-face-detail" d="M120 152 q10 7 20 0" />
    <path class="habit-hero-zzz" d="M252 86 h16 l-16 16 h16" />
    <path class="habit-hero-zzz" d="M274 64 h12 l-12 12 h12" />
    <path class="habit-hero-zzz" d="M292 46 h9 l-9 9 h9" />
  `,
    { night: true }
  );
}

/** Person seated cross-legged on a mat, for meditation/mindfulness habits. */
export function heroMindfulness() {
  return heroFrame(`
    <circle class="habit-hero-accent-soft" cx="200" cy="60" r="34" opacity="0.4" />
    <circle class="habit-hero-accent-soft" cx="200" cy="60" r="20" />
    <ellipse class="habit-hero-motif-leaf" cx="200" cy="198" rx="94" ry="14" />
    <path class="habit-hero-motif" d="M138 190 C138 164 262 164 262 190 C262 202 138 202 138 190 Z" />
    <path class="habit-hero-prop-accent" d="M163 188 C163 148 237 148 237 188 Z" />
    <ellipse class="habit-hero-face" cx="200" cy="128" rx="25" ry="24" />
    <path class="habit-hero-hair" d="M177 120 C177 98 223 98 223 120 C223 106 177 106 177 120 Z" />
    <path class="habit-hero-face-detail" d="M188 130 q4 3 8 0" />
    <path class="habit-hero-face-detail" d="M204 130 q4 3 8 0" />
    <circle class="habit-hero-dot" cx="172" cy="182" r="6" />
    <circle class="habit-hero-dot" cx="228" cy="182" r="6" />
    <path class="habit-hero-motif-leaf" d="M320 150 C320 130 335 118 348 116 C348 138 336 152 320 150 Z" />
    <line class="habit-hero-motif-line" x1="330" y1="150" x2="330" y2="196" />
  `);
}

/** Person eating at a table, for nutrition/diet habits. */
export function heroNutrition() {
  return heroFrame(`
    <circle class="habit-hero-accent-soft" cx="80" cy="50" r="34" />
    <rect class="habit-hero-motif" x="150" y="150" width="180" height="14" rx="6" />
    <rect class="habit-hero-motif" x="160" y="164" width="14" height="40" rx="4" />
    <rect class="habit-hero-motif" x="296" y="164" width="14" height="40" rx="4" />
    <ellipse class="habit-hero-motif-leaf" cx="240" cy="140" rx="46" ry="14" />
    <circle class="habit-hero-prop-accent" cx="225" cy="136" r="5" />
    <circle class="habit-hero-prop-accent" cx="242" cy="132" r="5" />
    <circle class="habit-hero-prop-accent" cx="257" cy="138" r="5" />
    <path class="habit-hero-prop-accent" d="M120 205 V140 C120 118 135 100 165 100 C195 100 210 118 210 140 V205 Z" />
    <ellipse class="habit-hero-face" cx="165" cy="86" rx="26" ry="25" />
    <path class="habit-hero-hair" d="M141 78 C141 56 189 56 189 78 C189 64 141 64 141 78 Z" />
    <path class="habit-hero-face-detail" d="M155 88 q4 4 8 0" />
    <path class="habit-hero-face-detail" d="M172 88 q4 4 8 0" />
    <path class="habit-hero-limb" d="M182 130 C196 122 208 122 214 128" />
    <path class="habit-hero-limb" d="M142 140 C130 160 130 182 138 202" />
    <path class="habit-hero-limb" d="M192 140 C198 160 196 182 188 202" />
    <line class="habit-hero-motif-line" x1="214" y1="128" x2="222" y2="124" />
  `);
}

/** Person painting at an easel, for creative habits. */
export function heroCreative() {
  return heroFrame(`
    <circle class="habit-hero-accent-soft" cx="90" cy="55" r="36" />
    <path class="habit-hero-limb" d="M255 60 L285 200 M315 60 L285 200 M262 150 H308" />
    <rect class="habit-hero-motif-leaf" x="238" y="70" width="94" height="76" rx="4" />
    <path class="habit-hero-prop-accent" d="M130 205 V140 C130 118 145 100 175 100 C205 100 220 118 220 140 V205 Z" />
    <ellipse class="habit-hero-face" cx="175" cy="86" rx="26" ry="25" />
    <path class="habit-hero-hair" d="M151 78 C151 56 199 56 199 78 C199 64 151 64 151 78 Z" />
    <path class="habit-hero-face-detail" d="M165 88 q4 4 8 0" />
    <path class="habit-hero-face-detail" d="M182 88 q4 4 8 0" />
    <path class="habit-hero-limb" d="M204 128 C222 118 236 112 246 112" />
    <path class="habit-hero-limb" d="M148 140 C140 160 140 182 148 202" />
    <path class="habit-hero-limb" d="M198 140 C204 160 202 182 194 202" />
    <circle class="habit-hero-dot" cx="140" cy="118" r="9" />
    <circle class="habit-hero-dot" cx="164" cy="108" r="9" />
    <circle class="habit-hero-dot" cx="188" cy="118" r="9" />
  `);
}

/** Mountain peak + sun — the generic fallback, echoing the app's own branding. Deliberately landscape-only (no figure): it's the brand anchor, not a specific themed activity. */
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
// ---------- Real photos (assets/habits/), where available ----------
// A small curated set of the "Популярные привычки" presets ships an actual
// photo instead of a hand-drawn scene — matched by the habit's emoji icon,
// same lookup pattern as HERO_BY_EMOJI, so both the ready-made presets and
// any user habit that happens to share the same icon get the photo too.
// Everything else (including any habit whose photo file hasn't landed in
// assets/habits/ yet) keeps falling back to the SVG heroXxx() scenes below
// — there's always a themed illustration, real photo or drawn.
const PHOTO_BY_EMOJI = {
  "💧": "pit_vodu.png",
  "📚": "chtenie.png",
  "🧘": "meditaciya.png",
  "💪": "otzhimaniya.png",
  "🛌": "son.png",
  "🏃": "progulka.png",
};

/**
 * Wraps a real photo in the same full-bleed treatment as heroFrame()'s SVG
 * output — an <img>, not an <svg>, but sized/positioned identically by
 * .habit-hero-photo (css/illustrations.css) so every call site (habit
 * list card, popular-habit carousel, habit detail hero) can treat the two
 * interchangeably. The photo's own baked-in caption pill sits in the
 * bottom slice of the frame, which .habit-hero-photo's crop hides — the
 * app draws its own name/scrim on top instead, so there's one consistent
 * label style whether the card ended up with a photo or a drawn scene.
 */
function heroPhotoFrame(filename, alt, icon) {
  // data-fallback-icon lets wirePhotoFallback() below rebuild the *same*
  // themed SVG scene heroIllustrationForHabit() would have picked for this
  // icon if there were no photo mapping — so a missing/broken photo file
  // degrades to the matching drawn scene (a wet droplet for 💧, a book for
  // 📚, ...), not a generic fallback every mapped habit would share.
  return `<img class="habit-hero-photo" src="./assets/habits/${filename}" alt="${alt}" loading="lazy" data-fallback-icon="${icon}" />`;
}

export function heroIllustrationForHabit(habit) {
  const photo = PHOTO_BY_EMOJI[habit?.icon];
  if (photo) return heroPhotoFrame(photo, habit?.name || "", habit?.icon || "");
  const build = HERO_BY_EMOJI[habit?.icon] || heroDefault;
  return build();
}

/**
 * Call once after rendering any container that may contain
 * heroIllustrationForHabit() output — swaps a broken/missing photo
 * (assets/habits/*.png not present, e.g. before the real files have
 * landed, or a future rename/typo) for the matching drawn scene instead of
 * leaving a blank/broken-image card. Every call site of
 * heroIllustrationForHabit() should call this right after setting
 * container.innerHTML.
 */
export function wirePhotoFallback(container) {
  container.querySelectorAll("img.habit-hero-photo").forEach((img) => {
    img.addEventListener(
      "error",
      () => {
        const build = HERO_BY_EMOJI[img.dataset.fallbackIcon] || heroDefault;
        img.outerHTML = build();
      },
      { once: true }
    );
  });
}

// ---------- Challenge / achievement hero illustrations ----------
// Same heroFrame() photo-banner language as the habit heroes above, reused
// for "Испытания"/"Достижения" cards: a small hiker figure climbing the
// app's own mountain motif at different heights — ties the illustration
// back to the mountain that's already the app's visual identity, instead
// of an arbitrary unrelated scene per challenge.

/** A simplified hiking figure — shared by every challengeHeroXxx() scene below, just repositioned/re-posed per scene. */
function climberFigure({ x = 200, y = 150, flag = false, backpack = false } = {}) {
  return `
    <g transform="translate(${x} ${y})">
      <path class="habit-hero-prop-accent" d="M-20 58 V20 C-20 4 -8 -8 0 -8 C8 -8 20 4 20 20 V58 Z" />
      <ellipse class="habit-hero-face" cx="0" cy="-30" rx="19" ry="18" />
      <path class="habit-hero-hair" d="M-16 -35 C-16 -50 16 -50 16 -35 C16 -44 -16 -44 -16 -35 Z" />
      <path class="habit-hero-limb" d="M-14 8 C-30 -2 -40 -12 -42 -24" />
      <path class="habit-hero-limb" d="M14 8 C28 -4 34 -16 32 -28" />
      <path class="habit-hero-limb" d="M-8 56 C-14 72 -12 88 -4 98" />
      <path class="habit-hero-limb" d="M8 56 C16 70 16 86 8 98" />
      ${backpack ? '<rect class="habit-hero-motif" x="9" y="2" width="17" height="32" rx="7" />' : ""}
      ${
        flag
          ? '<line class="habit-hero-motif-line" x1="-42" y1="-24" x2="-42" y2="-62" /><path class="habit-hero-prop-accent" d="M-42 -62 L-14 -52 L-42 -42 Z" />'
          : ""
      }
    </g>`;
}

/** A triangular slope silhouette, the shared backdrop for the climber scenes — heightFraction (0-1) controls how high the peak sits, echoing the mountain's own progress-by-height language. */
function slopeBackdrop(heightFraction) {
  const peakX = 60 + heightFraction * 240;
  const peakY = 206 - heightFraction * 140 - 24;
  return { peakX, peakY, svg: `<path class="habit-hero-slope" d="M6 206 L${peakX} ${peakY} L394 206 Z" />` };
}

/** Figure at the foot of the slope at sunrise — "старт/разгон"-style challenges (a fresh beginning, not progress yet). */
export function challengeHeroStart() {
  return heroFrame(`
    <circle class="habit-hero-accent-soft" cx="330" cy="150" r="46" />
    <line class="habit-hero-motif-line" x1="330" y1="90" x2="330" y2="70" />
    <line class="habit-hero-motif-line" x1="300" y1="110" x2="286" y2="98" />
    <line class="habit-hero-motif-line" x1="360" y1="110" x2="374" y2="98" />
    ${slopeBackdrop(0.12).svg}
    ${climberFigure({ x: 92, y: 168 })}
  `);
}

/** Footprints climbing the slope — "без пропусков" (a consistency streak). */
export function challengeHeroStreak() {
  const { svg } = slopeBackdrop(0.5);
  const prints = [0.18, 0.3, 0.42, 0.54, 0.66].map((t, i) => {
    const x = 60 + t * 260;
    const y = 200 - t * 150;
    return `<ellipse class="habit-hero-dot" cx="${x + (i % 2 === 0 ? -8 : 8)}" cy="${y}" rx="6" ry="9" transform="rotate(${-35} ${x} ${y})" />`;
  });
  return heroFrame(`
    ${svg}
    ${prints.join("")}
    ${climberFigure({ x: 246, y: 118, backpack: true })}
  `);
}

/** Climber a third of the way up — "восхождение на треть". */
export function challengeHeroClimbThird() {
  const { peakX, peakY } = slopeBackdrop(0.33);
  return heroFrame(`
    ${slopeBackdrop(0.33).svg}
    ${climberFigure({ x: peakX - 10, y: peakY + 66 })}
  `);
}

/** Climber halfway up — "половина пути". */
export function challengeHeroClimbHalf() {
  const { peakX, peakY } = slopeBackdrop(0.55);
  return heroFrame(`
    ${slopeBackdrop(0.55).svg}
    ${climberFigure({ x: peakX - 6, y: peakY + 66, backpack: true })}
  `);
}

/** Climber at the summit, planting a flag — "штурм вершины". */
export function challengeHeroClimbSummit() {
  const { peakX, peakY } = slopeBackdrop(0.85);
  return heroFrame(`
    <circle class="habit-hero-accent-soft" cx="70" cy="55" r="30" />
    ${slopeBackdrop(0.85).svg}
    ${climberFigure({ x: peakX, y: peakY + 64, flag: true })}
  `);
}

/** Climber with a backpack and a string of collected pennants — "коллекционер отметок"/"упорство" (accumulation over the month). */
export function challengeHeroGear() {
  const { peakX, peakY } = slopeBackdrop(0.42);
  const pennants = [0.2, 0.36, 0.52, 0.68].map((t, i) => {
    const x = 70 + t * 300;
    const y = 60 + (i % 2 === 0 ? 0 : 10);
    return `<path class="habit-hero-prop-accent" d="M${x} ${y} L${x + 16} ${y + 5} L${x} ${y + 10} Z" />`;
  });
  return heroFrame(`
    <line class="habit-hero-motif-line" x1="70" y1="60" x2="370" y2="70" />
    ${pennants.join("")}
    ${slopeBackdrop(0.42).svg}
    ${climberFigure({ x: peakX - 8, y: peakY + 66, backpack: true })}
  `);
}

/** Figure marking a wall calendar — "всё по плану" (a planning/consistency habit, not a climb). */
export function challengeHeroPlan() {
  return heroFrame(`
    <circle class="habit-hero-accent-soft" cx="330" cy="55" r="34" />
    <rect class="habit-hero-motif" x="130" y="60" width="140" height="120" rx="10" />
    <rect class="habit-hero-motif-leaf" x="144" y="82" width="112" height="84" rx="4" />
    <line class="habit-hero-motif-line" x1="160" y1="52" x2="160" y2="72" />
    <line class="habit-hero-motif-line" x1="240" y1="52" x2="240" y2="72" />
    ${[0, 1, 2].map((r) => [0, 1, 2, 3].map((c) => `<circle class="habit-hero-dot" cx="${160 + c * 26}" cy="${100 + r * 22}" r="4" />`).join("")).join("")}
    <path class="habit-hero-limb" d="M186 152 L204 168 L236 122" />
    ${climberFigure({ x: 320, y: 172 })}
  `);
}

/** Climber holding a banner on a ridge — "железная воля" (sustained resolve, distinct pose from the summit-flag scene). */
export function challengeHeroBanner() {
  const { peakX, peakY } = slopeBackdrop(0.68);
  return heroFrame(`
    ${slopeBackdrop(0.68).svg}
    <rect class="habit-hero-prop-accent" x="${peakX + 26}" y="${peakY + 10}" width="34" height="24" rx="3" />
    <line class="habit-hero-motif-line" x1="${peakX + 26}" y1="${peakY + 60}" x2="${peakX + 26}" y2="${peakY + 6}" />
    ${climberFigure({ x: peakX - 4, y: peakY + 66 })}
  `);
}

const CHALLENGE_HERO_BY_ID = {
  stable_start: challengeHeroStart,
  warm_up: challengeHeroStart,
  no_gaps_5: challengeHeroStreak,
  climb_third: challengeHeroClimbThird,
  climb_half: challengeHeroClimbHalf,
  climb_summit: challengeHeroClimbSummit,
  mark_collector: challengeHeroGear,
  persistence: challengeHeroGear,
  all_by_plan: challengeHeroPlan,
  iron_will: challengeHeroBanner,
};

/** Picks a themed hero illustration for a challenge (Испытания/Достижения cards) by its CHALLENGE_POOL id, falling back to the climb-a-third scene for any future/unmapped id. */
export function challengeHeroForId(id) {
  const build = CHALLENGE_HERO_BY_ID[id] || challengeHeroClimbThird;
  return build();
}
