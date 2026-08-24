// Hand-authored mountain artwork + trail geometry. No geometry library —
// just a small ordered list of ridge points and a hand-rolled Catmull-Rom
// -> cubic Bezier conversion, which is all that's needed for a genuinely
// smooth slope (no library needed for that either).
//
// Everything that has to "stand on the mountain" — the trail, the
// milestone icons, and the trees — reads its position from the exact same
// curve that gets drawn as the mountain's silhouette. There is only one
// source of geometric truth, so nothing can visually drift off the slope.
// Progress itself has no separate character graphic: it's shown purely by
// how far up that same curve is colored gold (see buildProgressTrailPaths).

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

// Only the two footprint waypoints and the summit keep a picture — the
// motivational-only waypoints show just their caption, no icon. The summit
// "icon" isn't an emoji at all: it's hand-drawn (see summitFlagMarkup) so
// it's always a straight, vertical flag rather than a font glyph that can
// render tilted.
export const MILESTONES = [
  { p: 0.1, icon: "👣", label: "Первые шаги" },
  { p: 0.35, icon: "👣", label: "Продолжай!" },
  { p: 0.6, icon: "👣", label: "Половина пути уже пройдена!" },
  { p: 0.85, icon: null, label: "Ты почти сделал это!" },
  { p: 1.0, icon: null, label: "Success", isSummit: true },
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

function lerpPt(a, b, t) {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

/**
 * De Casteljau split of a cubic bezier (p1,cp1,cp2,p2) at parameter t into
 * two sub-curves that together retrace the exact same curve — `left` runs
 * from the original start up to the split point, `right` from the split
 * point to the original end. This is what lets the trail be cut at an
 * arbitrary progress value (not just at a RIDGE anchor) without the curve
 * visibly kinking at the cut.
 */
function splitBezierAt(p1, cp1, cp2, p2, t) {
  const a = lerpPt(p1, cp1, t);
  const b = lerpPt(cp1, cp2, t);
  const c = lerpPt(cp2, p2, t);
  const d = lerpPt(a, b, t);
  const e = lerpPt(b, c, t);
  const f = lerpPt(d, e, t);
  return {
    left: { p1, cp1: a, cp2: d, p2: f },
    right: { p1: f, cp1: e, cp2: c, p2 },
  };
}

/**
 * Splits the trail into two path `d` strings at the given progress: the
 * "walked" portion from p=0 up to `progress` (drawn gold) and the
 * remaining portion from `progress` to p=1 (drawn as the normal trail).
 * Every whole segment before/after the cut is reused verbatim (same as
 * buildRidgePathD) — only the one segment straddling `progress` needs an
 * actual split.
 */
export function buildProgressTrailPaths(progress) {
  const clamped = Math.max(0, Math.min(1, progress));
  const startIdx = ridgeIndexOf(0);
  const endIdx = ridgeIndexOf(1);
  const cutIdx = findSegment(clamped);

  let walkedD = `M${RIDGE[startIdx].x},${RIDGE[startIdx].y}`;
  let remainingD = "";

  for (let i = startIdx; i < endIdx; i++) {
    const { p1, p2, cp1, cp2 } = segmentControlPoints(i);
    if (i < cutIdx) {
      walkedD += ` C${cp1.x},${cp1.y} ${cp2.x},${cp2.y} ${p2.x},${p2.y}`;
    } else if (i > cutIdx) {
      if (remainingD === "") remainingD = `M${p1.x},${p1.y}`;
      remainingD += ` C${cp1.x},${cp1.y} ${cp2.x},${cp2.y} ${p2.x},${p2.y}`;
    } else {
      const span = p2.p - p1.p;
      const t = span === 0 ? 0 : (clamped - p1.p) / span;
      const { left, right } = splitBezierAt(p1, cp1, cp2, p2, t);
      walkedD += ` C${left.cp1.x},${left.cp1.y} ${left.cp2.x},${left.cp2.y} ${left.p2.x},${left.p2.y}`;
      remainingD = `M${right.p1.x},${right.p1.y} C${right.cp1.x},${right.cp1.y} ${right.cp2.x},${right.cp2.y} ${right.p2.x},${right.p2.y}`;
    }
  }

  return { walkedD, remainingD };
}

// Three distinct silhouettes so the tree line doesn't read as one shape
// copy-pasted six times — a tall narrow two-tier fir (the original
// shape), a shorter bushier three-tier pine, and a single slender spike.
// Each is built at a base unit size and scaled by `scale`, keeping one
// shared set of proportions per shape rather than ad-hoc numbers per tree.
function firTree(bx, by, scale) {
  const lower = 26 * scale;
  const upper = 42 * scale;
  const wLower = 15 * scale;
  const wUpper = 9 * scale;
  const tierGap = 15 * scale;
  return `
    <polygon class="mountain-tree" points="${bx - wLower},${by} ${bx + wLower},${by} ${bx},${by - lower}" />
    <polygon class="mountain-tree" points="${bx - wUpper},${by - tierGap} ${bx + wUpper},${by - tierGap} ${bx},${by - upper}" />
  `;
}

function roundTree(bx, by, scale) {
  const h = 30 * scale;
  const wLower = 17 * scale;
  const wMid = 13 * scale;
  const wUpper = 8 * scale;
  const tier1 = h * 0.36;
  const tier2 = h * 0.68;
  return `
    <polygon class="mountain-tree" points="${bx - wLower},${by} ${bx + wLower},${by} ${bx},${by - tier1}" />
    <polygon class="mountain-tree" points="${bx - wMid},${by - tier1 * 0.6} ${bx + wMid},${by - tier1 * 0.6} ${bx},${by - tier2}" />
    <polygon class="mountain-tree" points="${bx - wUpper},${by - tier2 * 0.75} ${bx + wUpper},${by - tier2 * 0.75} ${bx},${by - h}" />
  `;
}

function slimTree(bx, by, scale) {
  const h = 44 * scale;
  const w = 7 * scale;
  return `<polygon class="mountain-tree" points="${bx - w},${by} ${bx + w},${by} ${bx},${by - h}" />`;
}

const TREE_SHAPES = { fir: firTree, round: roundTree, slim: slimTree };

// Which silhouette + how big at each TREE_PROGRESS slot — deterministic,
// deliberately not sorted by shape or by size, so the tree line reads as a
// mixed, natural-looking stand rather than a uniform row.
const TREE_VARIANTS = [
  { shape: "fir", scale: 1.0 },
  { shape: "round", scale: 0.72 },
  { shape: "slim", scale: 1.15 },
  { shape: "round", scale: 0.85 },
  { shape: "fir", scale: 0.68 },
  { shape: "slim", scale: 0.95 },
];

function treeShape(x, y, index) {
  const jitter = ((index % 3) - 1) * 5; // deterministic left/right stagger
  const bx = x + jitter;
  const by = y + 2; // sink base 2px into the fill so it reads as planted
  const variant = TREE_VARIANTS[index % TREE_VARIANTS.length];
  return TREE_SHAPES[variant.shape](bx, by, variant.scale);
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

// Vertical layout of a milestone's stacked elements, measured upward
// (negative y) from its ground point at (0,0). Bumped up from the original
// tight spacing so captions clear the slope/trail line for readability,
// and ICON_GAP in particular is generous — an emoji icon's rendered glyph
// is noticeably taller than its nominal font-size, so a small gap here
// still let icons and captions visually touch/overlap.
const LABEL_GAP = 18; // ground dot -> bottom of a single-line caption
const LABEL_LINE_HEIGHT = 10; // gap between two stacked caption lines
const ICON_GAP = 32; // caption top -> icon
const ICON_LABEL_EXTRA = 8; // extra headroom when an icon sits above a 2-line caption
const FLAGPOLE_LENGTH = 14;
const FLAG_LENGTH = 9;
const FLAG_WIDTH = 12;

/** Renders the milestone caption from already-wrapped lines, with its
 * bottom line at `baseY` (and, for 2 lines, the top line `LABEL_LINE_HEIGHT`
 * above that). */
function labelMarkup(lines, labelClass, baseY) {
  if (lines.length === 1) {
    return `<text class="${labelClass}" x="0" y="${baseY}">${lines[0]}</text>`;
  }
  const topY = baseY - LABEL_LINE_HEIGHT;
  return `
        <text class="${labelClass}" x="0" y="${topY}">
          <tspan x="0" dy="0">${lines[0]}</tspan>
          <tspan x="0" dy="${LABEL_LINE_HEIGHT}">${lines[1]}</tspan>
        </text>`;
}

/** Hand-drawn flag on a short, straight, vertical pole — deliberately not
 * an emoji glyph, whose "🚩" tends to render at a slant depending on the
 * font. Only the flag itself is red; the pole is a neutral, un-flag-like
 * color so the two read as separate parts. `poleBottom` is where the pole
 * meets the connecting stem below it. */
function summitFlagMarkup(poleBottom) {
  const poleTop = poleBottom - FLAGPOLE_LENGTH;
  return `
        <line class="summit-flagpole" x1="0" y1="${poleBottom}" x2="0" y2="${poleTop}" />
        <polygon class="summit-flag" points="0,${poleTop} ${FLAG_WIDTH},${poleTop + FLAG_LENGTH / 2} 0,${poleTop + FLAG_LENGTH}" />`;
}

function milestoneMarkup(overallProgress) {
  return MILESTONES.map((m, i) => {
    const { x, y } = pointAtProgress(m.p);
    const reached = overallProgress >= m.p - 0.0001;
    const groupClasses = ["milestone", reached ? "milestone--reached" : "", m.isSummit ? "milestone--summit" : ""]
      .filter(Boolean)
      .join(" ");
    const labelClass = m.isSummit ? "milestone-label milestone-label--success" : "milestone-label";
    const lines = wrapLabelLines(m.label);
    const hasIcon = Boolean(m.icon) || m.isSummit;

    // A 2-line caption under an icon gets a little extra headroom above it.
    const extra = m.icon && lines.length > 1 ? ICON_LABEL_EXTRA : 0;
    const baseY = -LABEL_GAP - extra;
    const labelTopY = lines.length > 1 ? baseY - LABEL_LINE_HEIGHT : baseY;
    const iconY = labelTopY - ICON_GAP;
    // The stem reaches up to the icon/flag when there is one, otherwise
    // just up to the caption itself — either way it's the visible anchor
    // connecting whatever floats above back down to the ground dot.
    const stemY = hasIcon ? iconY + 6 : labelTopY - 4;

    let iconMarkup = "";
    if (m.isSummit) iconMarkup = summitFlagMarkup(stemY);
    else if (m.icon) iconMarkup = `<text class="milestone-icon" x="0" y="${iconY}">${m.icon}</text>`;

    return `
      <g class="${groupClasses}" data-milestone-index="${i}" transform="translate(${x},${y})">
        <line class="milestone-stem" x1="0" y1="0" x2="0" y2="${stemY}" />
        <circle class="milestone-dot" cx="0" cy="0" r="3" />
        ${iconMarkup}
        ${labelMarkup(lines, labelClass, baseY)}
      </g>`;
  }).join("");
}

/**
 * Builds the full inline SVG markup for the mountain. Progress has no
 * separate character/marker graphic — it's shown purely by how far the
 * trail itself is colored gold, from the foot of the mountain up to the
 * current point; the rest of the trail stays the plain dashed line.
 */
export function buildMountainSvg(overallProgress) {
  const silhouetteD = `${buildRidgePathD(-0.06, 1.06)} L400,600 L0,600 Z`;
  const { walkedD, remainingD } = buildProgressTrailPaths(overallProgress);

  return `
    <svg class="mountain-svg" viewBox="0 0 400 600" role="img" aria-label="Гора прогресса">
      <defs>
        <clipPath id="mountainClip">
          <path d="${silhouetteD}" />
        </clipPath>
        <!-- Single smooth fill for the whole silhouette instead of four
             flat stacked bands — grass -> forest -> rock -> snow, no hard
             seams between zones. Each stop's color lives in mountain.css
             (class + stop-color), not inlined here, matching how every
             other fill in this file is styled. Safe as a fixed id: this
             SVG is only ever mounted once per page. -->
        <linearGradient id="mountainBodyGradient" x1="0" y1="1" x2="0" y2="0">
          <stop class="mountain-gradient-stop mountain-gradient-stop--grass" offset="0%" />
          <stop class="mountain-gradient-stop mountain-gradient-stop--grass" offset="22%" />
          <stop class="mountain-gradient-stop mountain-gradient-stop--forest" offset="38%" />
          <stop class="mountain-gradient-stop mountain-gradient-stop--forest" offset="55%" />
          <stop class="mountain-gradient-stop mountain-gradient-stop--rock" offset="68%" />
          <stop class="mountain-gradient-stop mountain-gradient-stop--rock" offset="85%" />
          <stop class="mountain-gradient-stop mountain-gradient-stop--snow-tint" offset="94%" />
          <stop class="mountain-gradient-stop mountain-gradient-stop--snow" offset="100%" />
        </linearGradient>
        <!-- Dark base -> lighter tip fill shared by every tree, for a bit
             of volume instead of one flat color. -->
        <linearGradient id="treeGradient" x1="0" y1="1" x2="0" y2="0">
          <stop class="mountain-gradient-stop mountain-gradient-stop--tree-base" offset="0%" />
          <stop class="mountain-gradient-stop mountain-gradient-stop--tree-tip" offset="100%" />
        </linearGradient>
      </defs>
      <g clip-path="url(#mountainClip)">
        <rect class="mountain-body" x="0" y="0" width="400" height="600" />
      </g>
      ${treesMarkup()}
      <path class="mountain-trail" d="${remainingD || `M${RIDGE[ridgeIndexOf(1)].x},${RIDGE[ridgeIndexOf(1)].y}`}" style="${remainingD ? "" : "display:none;"}" />
      <path class="mountain-trail-walked" d="${walkedD}" />
      ${milestoneMarkup(overallProgress)}
    </svg>`;
}
