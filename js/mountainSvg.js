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

// A fixed pixel cushion added on top of approxRidgeY()'s reading, to
// absorb the gap between that straight-line approximation and the real
// (slightly bowed) Catmull-Rom ridge curve.
const RIDGE_SAFETY_MARGIN = 15;

/** Piecewise-linear approximation of the ridge's y at an arbitrary x —
 * good enough for placing decorative fills deep inside the already-clipped
 * mountain body. The real silhouette boundary is a smooth curve through
 * the same RIDGE points, so it never strays far from this straight-line
 * reading; RIDGE_SAFETY_MARGIN below absorbs the small remaining gap. */
function approxRidgeY(x) {
  for (let i = 0; i < RIDGE.length - 1; i++) {
    const a = RIDGE[i];
    const b = RIDGE[i + 1];
    if (x >= a.x && x <= b.x) {
      const t = (x - a.x) / (b.x - a.x || 1);
      return a.y + (b.y - a.y) * t;
    }
  }
  return RIDGE[RIDGE.length - 1].y;
}

// Deterministic pseudo-random hash (not Math.random() — reproducible
// across renders/tests), used below to jitter the tree/grass grid so it
// doesn't read as a rigid lattice.
function hash(seed) {
  const v = Math.sin(seed * 12.9898) * 43758.5453;
  return v - Math.floor(v);
}

// x-range decorations (trees, grass) are allowed in. Stops 10px short of
// each edge (0 and 400), the same buffer on both sides, so nothing ever
// sits flush against the viewBox edge.
const GREEN_ZONE_MIN_X = 10;
const GREEN_ZONE_MAX_X = 390;

// The mountain body's fill is ONE linear gradient over y (grass -> forest
// -> rock -> snow, see mountainBodyGradient in buildMountainSvg), the same
// at every x — and the silhouette's bottom edge is y=600 across the WHOLE
// width (buildMountainSvg's `L400,600 L0,600 Z`), not just near the
// trail. So the grass/forest-colored surface actually extends far past
// where the ridge line itself enters the "rocks" stage (RIDGE's x=250) —
// at any x, however high the ridge climbs, the bottom of that column is
// still grass-colored. VEGETATION_MIN_Y is that color boundary in
// absolute viewBox y (not relative to the ridge): the forest->rock
// gradient stop sits at offset 55%, i.e. y = 600 * (1 - 0.55) = 270.
// Above this y (smaller y, closer to the peak), the surface reads as
// rock/snow, so decorations must not go there even where a column's
// silhouette technically extends that high.
const VEGETATION_MIN_Y = 270;

/**
 * A deterministic jittered grid of (x, y) points spread across the whole
 * grass/forest-colored surface, at a roughly constant DENSITY (items per
 * unit area) rather than a constant count per column. Each column's
 * usable depth runs from `max(approxRidgeY(x) + RIDGE_SAFETY_MARGIN,
 * VEGETATION_MIN_Y)` down to the silhouette floor (583) — clamping the
 * top to VEGETATION_MIN_Y (rather than always starting right at the
 * ridge) is what keeps decorations out of the rock/snow-colored area for
 * the columns where the ridge climbs well above that color boundary,
 * while still giving those columns their full share of the (large,
 * roughly constant) grass/forest depth below it. An earlier version
 * anchored every column's depth to the ridge itself and stopped
 * decorations entirely past x=248 (near where the ridge line enters the
 * "rocks" stage) — but the actual grass-colored fill extends, at the
 * bottom of the silhouette, almost the full width (see VEGETATION_MIN_Y's
 * comment), so that left a huge, clearly green, completely undecorated
 * strip from x=248 to the right edge. Within a column, `rows` is scaled
 * to that column's own area (`colWidth * depth`) at a fixed
 * `targetAreaPerItem`, so near-zero-area columns (e.g. the thin sliver
 * near x=10) correctly get 0 items instead of a collapsed cluster, and
 * density stays roughly even everywhere else. Each point still gets a
 * small pseudo-random offset so the result reads as naturally scattered
 * rather than a rigid lattice.
 */
function densityGrid({ cols, targetAreaPerItem, marginStartFrac, marginEndFrac, seed }) {
  const points = [];
  const colWidth = (GREEN_ZONE_MAX_X - GREEN_ZONE_MIN_X) / cols;
  for (let c = 0; c < cols; c++) {
    const xCenter = GREEN_ZONE_MIN_X + colWidth * (c + 0.5);
    const usableStart = Math.max(approxRidgeY(xCenter) + RIDGE_SAFETY_MARGIN, VEGETATION_MIN_Y);
    const depth = Math.max(0, 583 - usableStart);
    const rows = Math.round((colWidth * depth) / targetAreaPerItem);
    if (rows <= 0) continue; // too thin a sliver to sensibly fit even one
    const xJitter = (hash(seed + c * 31 + 1) - 0.5) * colWidth * 0.6;
    const x = Math.max(GREEN_ZONE_MIN_X, Math.min(GREEN_ZONE_MAX_X, xCenter + xJitter));
    const yStart = usableStart + depth * marginStartFrac;
    const yEnd = Math.max(yStart + 5, usableStart + depth * marginEndFrac);
    const rowSpan = (yEnd - yStart) / rows;
    for (let r = 0; r < rows; r++) {
      const rowJitter = (hash(seed + c * 31 + r * 7 + 2) - 0.5) * rowSpan * 0.7;
      points.push({ x, y: Math.max(0, yStart + rowSpan * (r + 0.5) + rowJitter) });
    }
  }
  return points;
}

/**
 * Drops any point that lands closer than `minDist` (real pixel distance)
 * to an already-accepted point, checked in generation order. Per-column
 * jitter alone can't promise this: two
 * *adjacent* columns are jittered independently, so nothing stops one
 * column's point from landing right next to its neighbor's — which is
 * exactly what produced the reported overlapping "mess" in the denser
 * middle columns. This is the actual overlap guarantee; densityGrid()
 * only gets the average density right.
 */
function enforceMinSpacing(points, minDist) {
  const accepted = [];
  for (const p of points) {
    const tooClose = accepted.some((q) => Math.hypot(p.x - q.x, p.y - q.y) < minDist);
    if (!tooClose) accepted.push(p);
  }
  return accepted;
}

// 26 columns (same ~15px colWidth as before) at ~1000 sq px per tree
// candidate before spacing enforcement — even density across the whole
// grass/forest-colored surface instead of a fixed count per column (see
// densityGrid()'s comment for why that clumped near the trail while
// reading as empty at the thin left edge and blank across the wide right
// strip). `targetAreaPerItem` was doubled from 550 -- the previous
// setting -- to roughly halve the overall tree count on request (the
// scene read as too crowded); `cols` is untouched so the grid's spatial
// resolution (how finely x is sliced) stays the same, only how many
// points survive per slice changes. The target is deliberately denser
// than the ~30 trees that actually end up on screen: enforceMinSpacing()
// below (in treesMarkup()) thins the raw candidates down to that count,
// and starting from a denser raw set keeps the survivors spread evenly
// instead of leaving gaps wherever a sparse raw grid happened to reject
// its only nearby candidate.
const TREE_GRID = { cols: 26, targetAreaPerItem: 1000, marginStartFrac: 0.03, marginEndFrac: 0.85, seed: 1 };

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

// Which silhouette + how big at each grid slot — deterministic,
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
  const shapeMarkup = TREE_SHAPES[variant.shape](bx, by, variant.scale);
  // Gentle wind sway — a shared rotate keyframe (css/mountain.css), with
  // per-tree duration/delay so six trees don't swing in lockstep like one
  // shape copy-pasted six times. Deterministic (not Math.random()), same
  // spirit as the jitter above: duration varies by index, and a negative
  // delay starts each tree mid-cycle instead of every tree beginning in
  // the same pose. transform-origin (center bottom of the tree's own
  // fill box, see .mountain-tree-sway) needs no coordinates here — no bx/by
  // math to keep in sync with the rotation pivot.
  const duration = (3.1 + (index % 4) * 0.35).toFixed(2);
  const delay = (-(index * 0.61 + (index % 3) * 0.27)).toFixed(2);
  return `<g class="mountain-tree-sway" style="animation-duration:${duration}s; animation-delay:${delay}s;">${shapeMarkup}</g>`;
}

function treesMarkup() {
  // 34px -- comfortably beyond a canopy's own width (up to ~35-40px
  // across at the largest scale), so two tree centers can't land close
  // enough to visibly overlap. Raised from 24px alongside
  // TREE_GRID.targetAreaPerItem's own increase (see its comment): halving
  // the tree count roughly doubles the average area per tree, so the
  // minimum spacing was scaled up to match (~sqrt(2) x 24 ≈ 34) rather
  // than left at the old, now too-tight-relative-to-the-new-density
  // value -- a sweep of (targetAreaPerItem, minDist) pairs confirmed 34px
  // lands the count exactly at half (30) with good, even spacing.
  const points = enforceMinSpacing(densityGrid(TREE_GRID), 34);
  return points.map(({ x, y }, i) => treeShape(x, y, i)).join("");
}

// ---------- Sky: slow-drifting clouds, spread across the whole sky height ----------
// Plain sky decoration, not clipped to the mountain silhouette — rendered
// before the mountain body (see buildMountainSvg) so the mountain would
// occlude any cloud that ever dipped below the ridge line, though none of
// these positions do (all checked against approxRidgeY(x) with a big
// margin). x stays under ~260 so clouds don't crowd the two rightmost
// milestones' captions near the summit (x≈325-378). The first three
// entries were the original set, clustered in a narrow band near the very
// top (y≈26-72) -- the other four fill out the middle and lower sky. The
// key to "lower" here is smaller x, not bigger y at the same x: the ridge
// is a diagonal, so how far down the sky extends before hitting it varies
// enormously by x (at x=0 the ridge itself is already down at y=585, so
// the sky column there reaches almost the full frame height; at x=250 it's
// only down to y=255). Reusing the same x as an existing cloud and just
// bumping y risks putting the new cloud below the ridge at that x -- these
// new entries instead pick smaller/middling x specifically so there's
// still a generous margin at a much larger y.
const CLOUD_POSITIONS = [
  { x: 55, y: 45, scale: 1.0, duration: 27, delay: -4 },
  { x: 155, y: 26, scale: 0.8, duration: 33, delay: -14 },
  { x: 255, y: 72, scale: 0.9, duration: 24, delay: -9 },
  { x: 25, y: 180, scale: 0.7, duration: 30, delay: -11 },
  { x: 110, y: 260, scale: 0.85, duration: 21, delay: -6 },
  { x: 190, y: 200, scale: 0.65, duration: 36, delay: -18 },
  { x: 70, y: 340, scale: 0.75, duration: 25, delay: -3 },
];

/** Three overlapping ellipses — the classic cartoon-cloud silhouette. */
function cloudShape(x, y, scale) {
  return `
    <ellipse cx="${x - 14 * scale}" cy="${y + 3 * scale}" rx="${12 * scale}" ry="${7 * scale}" />
    <ellipse cx="${x}" cy="${y}" rx="${18 * scale}" ry="${9 * scale}" />
    <ellipse cx="${x + 13 * scale}" cy="${y + 2 * scale}" rx="${11 * scale}" ry="${6.5 * scale}" />
  `;
}

function cloudsMarkup() {
  return CLOUD_POSITIONS.map(({ x, y, scale, duration, delay }) => {
    return `<g class="mountain-cloud" style="animation-duration:${duration}s; animation-delay:${delay}s;">${cloudShape(x, y, scale)}</g>`;
  }).join("");
}

// ---------- Sky: birds soaring over the rocky slope ----------
// Same "not clipped to the silhouette" reasoning as CLOUD_POSITIONS above,
// and for the same reason: a bird whose flight animation ever dipped below
// the ridge would get cut off mid-flight by the clip-path if it were
// clipped, which would read as a bug, not a bird flying "behind" the
// mountain. Each position was checked by hand against approxRidgeY(x) at
// every keyframe extreme its `variant` reaches (see bird-fly-a/-b in
// css/mountain.css) to keep at least ~15px of clearance above the ridge
// throughout the whole animation, the same safety margin
// RIDGE_SAFETY_MARGIN uses elsewhere in this file -- the 4th position
// below (x=340ish, near the summit) failed exactly this check on a first
// pass (the ridge climbs too high there for a bird arcing further right to
// stay clear) and was moved to x=300 instead; kept as a reminder that
// "base position looks fine" isn't sufficient, every keyframe extreme has
// to be checked. `variant` picks which keyframe (arc direction/speed) a
// bird flies -- the silhouette itself (birdShape() below) is left-right
// symmetric, so there's no separate "facing" to vary; different
// variants/positions/timings are what make the five birds read as
// independent rather than copy-pasted.
const BIRD_POSITIONS = [
  { x: 250, y: 150, variant: "a", scale: 1.0, duration: 13, delay: -2 },
  { x: 300, y: 105, variant: "b", scale: 0.85, duration: 16, delay: -8 },
  { x: 230, y: 175, variant: "a", scale: 0.75, duration: 11, delay: -5 },
  { x: 300, y: 140, variant: "b", scale: 0.9, duration: 14, delay: -6 },
  { x: 210, y: 205, variant: "a", scale: 0.7, duration: 12, delay: -9 },
];

/** A minimal double-arc "seagull" silhouette, stroke-only (no fill) --
 * the classic flat "birds in the sky" doodle. `x`/`y` are baked directly
 * into the path's own coordinates (not a transform attribute on this
 * shape or its wrapper), same reasoning treeShape() already follows: a
 * transform *attribute* would be silently replaced the instant
 * the wrapping .mountain-bird-fly class's CSS transform *animation*
 * kicks in. */
function birdShape(x, y, scale) {
  const w = 6 * scale;
  const h = 4 * scale;
  return `<path class="mountain-bird" d="M ${x - w},${y} Q ${x - w / 2},${y - h} ${x},${y} Q ${x + w / 2},${y - h} ${x + w},${y}" />`;
}

function birdsMarkup() {
  return BIRD_POSITIONS.map(({ x, y, variant, scale, duration, delay }) => {
    return `<g class="mountain-bird-fly mountain-bird-fly--${variant}" style="animation-duration:${duration}s; animation-delay:${delay}s;">${birdShape(x, y, scale)}</g>`;
  }).join("");
}

// ---------- Fog, soft atmospheric haze drifting over the rocky slope ----------
// Replaces the stone cairn (removed on request -- read as "камни/валуны",
// didn't land visually). Unlike the cairn (or the waterfall before it),
// this is deliberately NOT rendered inside buildMountainSvg()'s clip-path
// group: a hard cutoff right at the silhouette edge would read as a
// geometric shape with a clipped boundary, not atmospheric mist -- real
// fog has no crisp edge, and drifting slightly past the ridge into the sky
// is exactly what makes it look like haze rather than a sticker. Same
// "not clipped" reasoning CLOUD_POSITIONS/BIRD_POSITIONS already rely on.
// Wide, flat, low-opacity wisps (two overlapping ellipses per layer,
// wider and flatter than a cloud's puffier three-ellipse silhouette --
// fog spreads sideways along the slope rather than piling up vertically
// like a cumulus cloud) positioned over the same rock-zone area birds fly
// through (x≈210-390), within the rock band's y-range (see
// VEGETATION_MIN_Y's comment for how that's computed) -- "atmospheric
// depth near the summit," as requested.
const FOG_POSITIONS = [
  { x: 260, y: 230, scale: 1.3, duration: 46, delay: -10 },
  { x: 330, y: 160, scale: 1.1, duration: 58, delay: -25 },
  { x: 300, y: 260, scale: 1.0, duration: 40, delay: -5 },
  { x: 355, y: 130, scale: 0.9, duration: 52, delay: -33 },
];

/** Two overlapping flat ellipses -- a soft horizontal wisp, the fog
 * equivalent of cloudShape() above. */
function fogShape(x, y, scale) {
  return `
    <ellipse cx="${x - 18 * scale}" cy="${y}" rx="${22 * scale}" ry="${8 * scale}" />
    <ellipse cx="${x + 16 * scale}" cy="${y + 2 * scale}" rx="${20 * scale}" ry="${7 * scale}" />
  `;
}

function fogMarkup() {
  return FOG_POSITIONS.map(({ x, y, scale, duration, delay }) => {
    return `<g class="mountain-fog" style="animation-duration:${duration}s; animation-delay:${delay}s;">${fogShape(x, y, scale)}</g>`;
  }).join("");
}

// ---------- Grass, scattered across the green zones ----------
// 32 columns (same ~12px colWidth as before, over the now much wider
// x-range) at ~480 sq px per tuft candidate — same densityGrid()
// technique as the trees (including the same wider x-range and
// VEGETATION_MIN_Y clamp), with a different seed so the two grids don't
// land in lockstep. Margins reach almost the full usable depth (grass is
// short, so it can sit close to the very bottom edge without looking like
// it's floating past the silhouette). Grass is cheap visually (small,
// subtle), so it can afford a higher density than the trees without
// recreating the "clumped" look.
const GRASS_GRID = { cols: 32, targetAreaPerItem: 480, marginStartFrac: 0.02, marginEndFrac: 0.92, seed: 101 };

const GRASS_SCALES = [0.8, 1.0, 1.15, 0.9];

/** A small 3-blade fan, thin triangles splayed left/center/right from one
 * base point — the grass equivalent of firTree()/slimTree() above. */
function grassTuft(bx, by, scale) {
  const h1 = 9 * scale;
  const h2 = 12 * scale;
  const h3 = 7 * scale;
  return `
    <polygon class="mountain-grass" points="${bx - 4 * scale},${by} ${bx - 1 * scale},${by} ${bx - 2.5 * scale},${by - h1}" />
    <polygon class="mountain-grass" points="${bx - 1 * scale},${by} ${bx + 1 * scale},${by} ${bx},${by - h2}" />
    <polygon class="mountain-grass" points="${bx + 1 * scale},${by} ${bx + 4 * scale},${by} ${bx + 2.5 * scale},${by - h3}" />
  `;
}

function grassInstance(x, y, index) {
  const jitter = ((index % 3) - 1) * 4;
  const bx = x + jitter;
  const by = y + 2;
  const scale = GRASS_SCALES[index % GRASS_SCALES.length];
  const shapeMarkup = grassTuft(bx, by, scale);
  // Faster/wider sway than the trees (real grass flutters quicker than a
  // tree trunk) — its own keyframe (css/mountain.css), same deterministic
  // per-instance duration/delay trick as treeShape() so tufts don't
  // flutter in lockstep.
  const duration = (1.5 + (index % 4) * 0.25).toFixed(2);
  const delay = (-(index * 0.37 + (index % 3) * 0.19)).toFixed(2);
  return `<g class="mountain-grass-sway" style="animation-duration:${duration}s; animation-delay:${delay}s;">${shapeMarkup}</g>`;
}

function grassMarkup() {
  // A much smaller minimum than the trees -- grass blades are tiny (~9px
  // across), and a naturally thick "carpet" is meant to sit closer
  // together than trees ever would.
  const points = enforceMinSpacing(densityGrid(GRASS_GRID), 10);
  return points.map(({ x, y }, i) => grassInstance(x, y, i)).join("");
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
      ${cloudsMarkup()}
      ${birdsMarkup()}
      <g clip-path="url(#mountainClip)">
        <rect class="mountain-body" x="0" y="0" width="400" height="600" />
      </g>
      ${fogMarkup()}
      ${grassMarkup()}
      ${treesMarkup()}
      <path class="mountain-trail" d="${remainingD || `M${RIDGE[ridgeIndexOf(1)].x},${RIDGE[ridgeIndexOf(1)].y}`}" style="${remainingD ? "" : "display:none;"}" />
      <path class="mountain-trail-walked" d="${walkedD}" />
      ${milestoneMarkup(overallProgress)}
    </svg>`;
}
