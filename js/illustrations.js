// Hand-authored inline SVG illustrations, in the same spirit as
// js/mountainSvg.js — no external image files or icon libraries, so the
// app stays fully self-contained and offline-installable. Colors are set
// via CSS classes (styled in css/illustrations.css) rather than baked into
// the markup, so everything reacts correctly to the light/dark theme.

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

export function iconSettings() {
  return `<svg class="tab-icon-svg" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3.2" stroke="currentColor" stroke-width="1.6" fill="currentColor" fill-opacity="0.18"/><path d="M12 4.5V6.3M12 17.7V19.5M19.5 12H17.7M6.3 12H4.5M17.5 6.5 16.2 7.8M7.8 16.2 6.5 17.5M17.5 17.5 16.2 16.2M7.8 7.8 6.5 6.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`;
}
