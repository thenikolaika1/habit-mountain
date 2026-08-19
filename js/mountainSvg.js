// Hand-authored mountain artwork + trail geometry. No geometry library —
// just a small ordered list of ridge points and a hand-rolled Catmull-Rom
// -> cubic Bezier conversion, which is all that's needed for a genuinely
// smooth slope (no library needed for that either).
//
// Everything that has to "stand on the mountain" — the trail, the marker,
// the milestone icons, and the trees — reads its position from the exact
// same curve that gets drawn as the mountain's silhouette. There is only
// one source of geometric truth, so nothing can visually drift off the
// slope.

// Ridge points, viewBox 400x600. The two points outside p∈[0,1] only exist
// to give the curve a natural tangent at the trail's real start/end and to
// keep drawing a bit of background terrain past them — progress is always
// clamped to [0,1], so the marker/milestones/trees never reach them.
const RIDGE = [
  { p: -0.06, x: 0, y: 585, stage: "base" },
  { p: 0.0, x: 45, y: 555, stage: "base" },
  { p: 0.14, x: 100, y: 500, stage: "base" },
  { p: 0.28, x: 155, y: 425, stage: "forest" },
  { p: 0.42, x: 205, y: 340, stage: "forest" },
  { p: 0.56, x: 250, y: 255, stage: "rocks" },
  { p: 0.7, x: 290, y: 180, stage: "rocks" },
  { p: 0.83, x: 325, y: 125, stage: "rocks" },
  { p: 0.93, x: 355, y: 95, stage: "summit" },
  { p: 1.0, x: 378, y: 85, stage: "summit" },
  { p: 1.06, x: 400, y: 95, stage: "summit" },
];

// Icons are all natural elements — trees, snow, footprints, the summit
// flag — no tents/camps or other man-made structures on the slope.
export const MILESTONES = [
  { p: 0.1, icon: "👣", label: "Первые шаги" },
  { p: 0.35, icon: "🌲", label: "Продолжай!" },
  { p: 0.6, icon: "👣", label: "Половина пути уже пройдена!" },
  { p: 0.85, icon: "❄️", label: "Ты почти сделал это!" },
  { p: 1.0, icon: "🚩", label: "Success", isSummit: true },
];

// Trees stand at these progress values (foot + forest zone only).
const TREE_PROGRESS = [0.05, 0.12, 0.19, 0.27, 0.34, 0.41];

function findSegment(p) {
  for (let i = 0; i < RIDGE.length - 1; i++) {
    if (p >= RIDGE[i].p && p <= RIDGE[i + 1].p) return i;
  }
  return RIDGE.length - 2;
}

/** Catmull-Rom control points (tension 1/6) for the segment P1->P2. */
function segmentControlPoints(i) {
  const p0 = RIDGE[Math.max(0, i - 1)];
  const p1 = RIDGE[i];
  const p2 = RIDGE[i + 1];
  const p3 = RIDGE[Math.min(RIDGE.length - 1, i + 2)];
  return {
    p1,
    p2,
    cp1: { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 },
    cp2: { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 },
  };
}

function cubicBezierAt(t, p1, cp1, cp2, p2) {
  const mt = 1 - t;
  const x = mt * mt * mt * p1.x + 3 * mt * mt * t * cp1.x + 3 * mt * t * t * cp2.x + t * t * t * p2.x;
  const y = mt * mt * mt * p1.y + 3 * mt * mt * t * cp1.y + 3 * mt * t * t * cp2.y + t * t * t * p2.y;
  return { x, y };
}

/** The exact point on the smoothed ridge curve at progress p (0..1). */
export function pointAtProgress(p) {
  const clamped = Math.max(0, Math.min(1, p));
  const i = findSegment(clamped);
  const { p1, p2, cp1, cp2 } = segmentControlPoints(i);
  const span = p2.p - p1.p;
  const t = span === 0 ? 0 : (clamped - p1.p) / span;
  const { x, y } = cubicBezierAt(t, p1, cp1, cp2, p2);
  return { x, y, stage: t > 0.5 ? p2.stage : p1.stage };
}

function ridgeIndexOf(p) {
  return RIDGE.findIndex((pt) => Math.abs(pt.p - p) < 1e-6);
}

/**
 * Builds an SVG path `d` (M + C...) for the ridge curve between two progress
 * bounds. Both bounds must exactly match a RIDGE point's `p` (true for every
 * call in this file) — the curve is then just the untouched, exact sequence
 * of Catmull-Rom segments between those two points, so it's pixel-identical
 * to whatever pointAtProgress() would report along the way.
 */
function buildRidgePathD(fromP, toP) {
  const startIdx = ridgeIndexOf(fromP);
  const endIdx = ridgeIndexOf(toP);
  let d = `M${RIDGE[startIdx].x},${RIDGE[startIdx].y}`;
  for (let i = startIdx; i < endIdx; i++) {
    const { cp1, cp2, p2 } = segmentControlPoints(i);
    d += ` C${cp1.x},${cp1.y} ${cp2.x},${cp2.y} ${p2.x},${p2.y}`;
  }
  return d;
}

const TREE_HEIGHT_LOWER = 26;
const TREE_HEIGHT_UPPER = 42;

function treeShape(x, y, index) {
  const jitter = ((index % 3) - 1) * 5; // deterministic left/right stagger
  const bx = x + jitter;
  const by = y + 2; // sink base 2px into the fill so it reads as planted
  return `
    <polygon class="mountain-tree" points="${bx - 15},${by} ${bx + 15},${by} ${bx},${by - TREE_HEIGHT_LOWER}" />
    <polygon class="mountain-tree" points="${bx - 9},${by - 15} ${bx + 9},${by - 15} ${bx},${by - TREE_HEIGHT_UPPER}" />
  `;
}

function treesMarkup() {
  return TREE_PROGRESS.map((p, i) => {
    const { x, y } = pointAtProgress(p);
    return treeShape(x, y, i);
  }).join("");
}

/** Splits a long label into up to 2 roughly-balanced lines at a word boundary. */
function wrapLabelLines(label) {
  if (label.length <= 14) return [label];
  const words = label.split(" ");
  if (words.length < 2) return [label];

  let bestIdx = 1;
  let bestDiff = Infinity;
  let acc = 0;
  for (let i = 0; i < words.length - 1; i++) {
    acc += words[i].length + 1; // + the space
    const diff = Math.abs(acc - label.length / 2);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestIdx = i + 1;
    }
  }
  return [words.slice(0, bestIdx).join(" "), words.slice(bestIdx).join(" ")];
}

/** Renders the milestone caption from already-wrapped lines. The bottom
 * line normally lands at y=-6 (just above the ground dot) — `lift` raises
 * the whole caption higher above that, used for the summit so it clears
 * the climbing marker, which stands on this same ground point. */
function labelMarkup(lines, labelClass, lift = 0) {
  const baseY = -6 - lift;
  if (lines.length === 1) {
    return `<text class="${labelClass}" x="0" y="${baseY}">${lines[0]}</text>`;
  }
  const topY = -16 - lift;
  return `
        <text class="${labelClass}" x="0" y="${topY}">
          <tspan x="0" dy="0">${lines[0]}</tspan>
          <tspan x="0" dy="10">${lines[1]}</tspan>
        </text>`;
}

function milestoneMarkup(overallProgress) {
  return MILESTONES.map((m) => {
    const { x, y } = pointAtProgress(m.p);
    const reached = overallProgress >= m.p - 0.0001;
    const groupClasses = ["milestone", reached ? "milestone--reached" : "", m.isSummit ? "milestone--summit" : ""]
      .filter(Boolean)
      .join(" ");
    const labelClass = m.isSummit ? "milestone-label milestone-label--success" : "milestone-label";
    const lines = wrapLabelLines(m.label);
    // The climbing marker stands on this exact ground point once progress
    // hits 100%, so lift the summit's flag + caption well clear of it. A
    // 2-line caption also gets a little extra headroom from its icon.
    const lift = (m.isSummit ? 24 : 0) + (lines.length > 1 ? 8 : 0);
    const stemY = -16 - lift;
    const iconY = -22 - lift;
    return `
      <g class="${groupClasses}" transform="translate(${x},${y})">
        <line class="milestone-stem" x1="0" y1="0" x2="0" y2="${stemY}" />
        <circle class="milestone-dot" cx="0" cy="0" r="3" />
        <text class="milestone-icon" x="0" y="${iconY}">${m.icon}</text>
        ${labelMarkup(lines, labelClass, lift)}
      </g>`;
  }).join("");
}

/** Builds the full inline SVG markup for the mountain, marker included. */
export function buildMountainSvg(overallProgress) {
  const marker = pointAtProgress(overallProgress);
  const silhouetteD = `${buildRidgePathD(-0.06, 1.06)} L400,600 L0,600 Z`;
  // At the summit the marker's job is done — it simply stops there, shown
  // only by the flag + "Success" caption. No separate climber figure is
  // drawn on top of it once progress has actually reached 100%.
  const atSummit = overallProgress >= 1 - 1e-4;

  return `
    <svg class="mountain-svg" viewBox="0 0 400 600" role="img" aria-label="Гора прогресса">
      <defs>
        <clipPath id="mountainClip">
          <path d="${silhouetteD}" />
        </clipPath>
      </defs>
      <g clip-path="url(#mountainClip)">
        <rect class="mountain-layer-base" x="0" y="480" width="400" height="120" />
        <rect class="mountain-layer-forest" x="0" y="290" width="400" height="190" />
        <rect class="mountain-layer-rocks" x="0" y="140" width="400" height="150" />
        <rect class="mountain-layer-summit" x="0" y="0" width="400" height="140" />
      </g>
      ${treesMarkup()}
      <path class="mountain-trail" d="${buildRidgePathD(0, 1)}" />
      ${milestoneMarkup(overallProgress)}
      ${
        atSummit
          ? ""
          : `<g class="mountain-marker" transform="translate(${marker.x},${marker.y - 14})">
        <ellipse cx="0" cy="20" rx="10" ry="3" fill="rgba(0,0,0,0.25)" />
        <text class="mountain-marker-emoji" x="0" y="0">🧗</text>
      </g>`
      }
    </svg>`;
}
