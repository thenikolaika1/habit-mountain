// Hand-authored mountain artwork + trail geometry. No geometry library —
// just a small ordered list of anchor points and linear interpolation
// between them, which is all that's needed for a marker that climbs a
// fixed, known path.

export const TRAIL_ANCHORS = [
  { p: 0.0, x: 40, y: 560, stage: "base" },
  { p: 0.15, x: 95, y: 480, stage: "base" },
  { p: 0.35, x: 150, y: 380, stage: "forest" },
  { p: 0.55, x: 210, y: 290, stage: "forest" },
  { p: 0.72, x: 260, y: 195, stage: "rocks" },
  { p: 0.88, x: 305, y: 110, stage: "rocks" },
  { p: 1.0, x: 340, y: 50, stage: "summit" },
];

export const MILESTONES = [
  { p: 0.1, icon: "👣", label: "Первые шаги" },
  { p: 0.35, icon: "🏕️", label: "Лагерь в лесу" },
  { p: 0.6, icon: "👣", label: "Половина пути" },
  { p: 0.85, icon: "🏕️", label: "Последний привал" },
  { p: 1.0, icon: "🚩", label: "Вершина!" },
];

/** Linear interpolation of {x,y} along TRAIL_ANCHORS at progress p (0..1). */
export function pointAtProgress(p) {
  const clamped = Math.max(0, Math.min(1, p));
  let a = TRAIL_ANCHORS[0];
  let b = TRAIL_ANCHORS[TRAIL_ANCHORS.length - 1];
  for (let i = 0; i < TRAIL_ANCHORS.length - 1; i++) {
    if (clamped >= TRAIL_ANCHORS[i].p && clamped <= TRAIL_ANCHORS[i + 1].p) {
      a = TRAIL_ANCHORS[i];
      b = TRAIL_ANCHORS[i + 1];
      break;
    }
  }
  const span = b.p - a.p;
  const t = span === 0 ? 0 : (clamped - a.p) / span;
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    stage: t > 0.5 ? b.stage : a.stage,
  };
}

const MOUNTAIN_OUTLINE =
  "0,600 40,555 90,505 130,525 180,435 220,455 260,345 300,365 340,50 380,345 400,600";

const TREES = [
  { x: 70, y: 445 },
  { x: 120, y: 415 },
  { x: 165, y: 450 },
  { x: 195, y: 390 },
  { x: 235, y: 400 },
];

function treeShape({ x, y }) {
  return `<path class="mountain-tree" d="M${x},${y} l14,26 l-8,0 l10,20 l-32,0 l10,-20 l-8,0 Z" />`;
}

function trailPath() {
  return TRAIL_ANCHORS.map((a, i) => `${i === 0 ? "M" : "L"}${a.x},${a.y}`).join(" ");
}

function milestoneMarkup(overallProgress) {
  return MILESTONES.map((m) => {
    const { x, y } = pointAtProgress(m.p);
    const reached = overallProgress >= m.p - 0.0001;
    return `
      <g class="milestone ${reached ? "milestone--reached" : ""}" transform="translate(${x},${y - 22})">
        <text class="milestone-icon" x="0" y="0">${m.icon}</text>
        <text class="milestone-label" x="0" y="16">${m.label}</text>
      </g>`;
  }).join("");
}

/** Builds the full inline SVG markup for the mountain, marker included. */
export function buildMountainSvg(overallProgress) {
  const marker = pointAtProgress(overallProgress);
  return `
    <svg class="mountain-svg" viewBox="0 0 400 600" role="img" aria-label="Гора прогресса">
      <defs>
        <clipPath id="mountainClip">
          <polygon points="${MOUNTAIN_OUTLINE}" />
        </clipPath>
      </defs>
      <g clip-path="url(#mountainClip)">
        <rect class="mountain-layer-base" x="0" y="420" width="400" height="180" />
        <rect class="mountain-layer-forest" x="0" y="260" width="400" height="160" />
        <rect class="mountain-layer-rocks" x="0" y="100" width="400" height="160" />
        <rect class="mountain-layer-summit" x="0" y="0" width="400" height="100" />
      </g>
      <polygon class="mountain-layer-base-shadow" opacity="0.25" points="0,600 40,555 90,505 130,525 60,600" />
      ${TREES.map(treeShape).join("")}
      <path class="mountain-trail" d="${trailPath()}" />
      ${milestoneMarkup(overallProgress)}
      <g class="mountain-marker" transform="translate(${marker.x},${marker.y - 14})">
        <ellipse cx="0" cy="20" rx="10" ry="3" fill="rgba(0,0,0,0.25)" />
        <text class="mountain-marker-emoji" x="0" y="0">🧗</text>
      </g>
    </svg>`;
}
