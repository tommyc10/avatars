/* Generates src/shapes.ts: the body outlines as SVG path data in a
   100×100 box, centred on (50, 50). Run with `node scripts/gen-shapes.mjs`.

   Everything is built from a few primitives so the silhouettes stay
   smooth at every size: circle unions with filleted cusps (clover,
   flower), rounded polygons with true circular fillets (sun, triangle,
   star), a superellipse (square), a polar blob, and hand-drawn Béziers
   (ghost, drop). Numbers are rounded to 0.01 to keep the strings short. */

import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const C = 50;
const f = (n) => Math.round(n * 100) / 100;
const pt = (p) => `${f(p[0])} ${f(p[1])}`;
const polar = (r, a) => [C + r * Math.cos(a), C + r * Math.sin(a)];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const mul = (a, k) => [a[0] * k, a[1] * k];
const len = (a) => Math.hypot(a[0], a[1]);
const norm = (a) => mul(a, 1 / len(a));
const cross = (a, b) => a[0] * b[1] - a[1] * b[0];

/* ── Rounded polygon: every vertex replaced by a circular fillet ────── */
function roundedPolygon(points, radius) {
  const n = points.length;
  const out = [];
  for (let i = 0; i < n; i++) {
    const p = points[(i - 1 + n) % n];
    const v = points[i];
    const q = points[(i + 1) % n];
    const r = typeof radius === "function" ? radius(i) : radius;
    const u1 = norm(sub(p, v));
    const u2 = norm(sub(q, v));
    const cosA = u1[0] * u2[0] + u1[1] * u2[1];
    const alpha = Math.acos(Math.max(-1, Math.min(1, cosA)));
    /* tangent distance from the vertex; clamped so neighbouring fillets
       never overlap */
    let t = r / Math.tan(alpha / 2);
    const maxT = Math.min(len(sub(p, v)), len(sub(q, v))) / 2 - 0.01;
    let rr = r;
    if (t > maxT) { t = maxT; rr = t * Math.tan(alpha / 2); }
    const a = add(v, mul(u1, t));
    const b = add(v, mul(u2, t));
    /* sweep: 1 when the corner turns clockwise on screen (y down) */
    const sweep = cross(sub(v, p), sub(q, v)) > 0 ? 1 : 0;
    out.push({ a, b, rr, sweep });
  }
  let d = `M${pt(out[0].a)}`;
  for (let i = 0; i < n; i++) {
    const s = out[i];
    d += `A${f(s.rr)} ${f(s.rr)} 0 0 ${s.sweep} ${pt(s.b)}`;
    const next = out[(i + 1) % n];
    d += `L${pt(next.a)}`;
  }
  return d + "Z";
}

/* ── Union of k equal circles on a ring, cusps filleted ─────────────── */
function lobes(k, r, offset, fillet, phase = -Math.PI / 2) {
  const centres = [];
  for (let i = 0; i < k; i++) centres.push(polar(offset, phase + (i * 2 * Math.PI) / k));
  const parts = [];
  for (let i = 0; i < k; i++) {
    const a = centres[i];
    const b = centres[(i + 1) % k];
    /* fillet circle: tangent to both lobes from outside, on the outer
       side of the chord between their centres */
    const m = mul(add(a, b), 0.5);
    const d = len(sub(b, a));
    const h = Math.sqrt((r + fillet) ** 2 - (d / 2) ** 2);
    const outward = norm(sub(m, [C, C]));
    const c = add(m, mul(outward, h));
    const ta = add(a, mul(norm(sub(c, a)), r));
    const tb = add(b, mul(norm(sub(c, b)), r));
    parts.push({ ta, tb });
  }
  /* lobe i runs from the fillet before it (parts[i-1].tb) to the fillet
     after it (parts[i].ta), the long way round its circle */
  let d = `M${pt(parts[k - 1].tb)}`;
  for (let i = 0; i < k; i++) {
    const from = parts[(i - 1 + k) % k].tb;
    const { ta, tb } = parts[i];
    /* the lobe's outer arc is the clockwise way round from `from` to
       `ta`; past a half-turn it needs the large-arc flag */
    const c = centres[i];
    const a0 = Math.atan2(from[1] - c[1], from[0] - c[0]);
    const a1 = Math.atan2(ta[1] - c[1], ta[0] - c[0]);
    const span = ((a1 - a0) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
    d += `A${r} ${r} 0 ${span > Math.PI ? 1 : 0} 1 ${pt(ta)}`;
    d += `A${f(fillet)} ${f(fillet)} 0 0 0 ${pt(tb)}`;
  }
  return d + "Z";
}

/* ── Superellipse (squircle) ────────────────────────────────────────── */
function squircle(half, n, steps = 64) {
  const pts = [];
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * 2 * Math.PI;
    const c = Math.cos(a), s = Math.sin(a);
    pts.push([C + half * Math.sign(c) * Math.abs(c) ** (2 / n), C + half * Math.sign(s) * Math.abs(s) ** (2 / n)]);
  }
  return smoothClosed(pts);
}

/* ── Polar blob, sampled and smoothed ───────────────────────────────── */
function blob(fn, steps = 48) {
  const pts = [];
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * 2 * Math.PI;
    pts.push(polar(fn(a), a));
  }
  return smoothClosed(pts);
}

/* Catmull-Rom through the points, emitted as cubic Béziers. */
function smoothClosed(p) {
  const n = p.length;
  let d = `M${pt(p[0])}`;
  for (let i = 0; i < n; i++) {
    const p0 = p[(i - 1 + n) % n], p1 = p[i], p2 = p[(i + 1) % n], p3 = p[(i + 2) % n];
    const c1 = add(p1, mul(sub(p2, p0), 1 / 6));
    const c2 = sub(p2, mul(sub(p3, p1), 1 / 6));
    d += `C${pt(c1)} ${pt(c2)} ${pt(p2)}`;
  }
  return d + "Z";
}

/* ── The ten ────────────────────────────────────────────────────────── */

const clover = lobes(4, 25, 19, 7);
const flower = lobes(5, 20.5, 22, 5);

const tri = roundedPolygon([[50, 8], [94, 84], [6, 84]], 13);

const starPts = [];
for (let i = 0; i < 10; i++) {
  const a = -Math.PI / 2 + (i * Math.PI) / 5;
  starPts.push(polar(i % 2 === 0 ? 47 : 27, a));
}
const star = roundedPolygon(starPts, (i) => (i % 2 === 0 ? 5 : 4));

const square = squircle(43, 3.4);

const blobShape = blob((a) => 39 + 3.2 * Math.sin(2 * a + 0.9) + 2.4 * Math.sin(3 * a + 2.3) + 1.6 * Math.sin(5 * a + 0.4));

const circle = `M${pt([C, 8])}A42 42 0 1 1 ${pt([C, 92])}A42 42 0 1 1 ${pt([C, 8])}Z`;

/* Ghost: a dome over a body with a three-scallop hem. */
const ghost = "M17 50C17 31.78 31.78 17 50 17C68.22 17 83 31.78 83 50V81.5Q72 93.5 61 81.5Q50 93.5 39 81.5Q28 93.5 17 81.5Z";

/* Drop: a round belly rising to a soft tip. */
const drop = "M50 8.5C52.2 8.5 53.4 10.3 56.4 15.2C62.9 25.5 84 44.6 84 61.5C84 80.3 68.8 92 50 92C31.2 92 16 80.3 16 61.5C16 44.6 37.1 25.5 43.6 15.2C46.6 10.3 47.8 8.5 50 8.5Z";

/* Droid: a rounded head with two round ears; the antenna is a thin part. */
const droid = "M16 50C16 38.95 24.95 30 36 30H64C75.05 30 84 38.95 84 50V70C84 81.05 75.05 90 64 90H36C24.95 90 16 81.05 16 70Z" +
  "M4 62A7 7 0 1 1 18 62A7 7 0 1 1 4 62Z" +
  "M82 62A7 7 0 1 1 96 62A7 7 0 1 1 82 62Z";
const droidParts = "M47.5 14H52.5V32H47.5Z" +
  "M43 11A7 7 0 1 1 57 11A7 7 0 1 1 43 11Z";

/* Mech: a wide head with a nub on each side; the antennae are thin parts. */
const mech = "M10 48C10 38.06 18.06 30 28 30H72C81.94 30 90 38.06 90 48V70C90 79.94 81.94 88 72 88H28C18.06 88 10 79.94 10 70Z" +
  "M3 54C3 51.79 4.79 50 7 50H11V72H7C4.79 72 3 70.21 3 68Z" +
  "M89 50H93C95.21 50 97 51.79 97 54V68C97 70.21 95.21 72 93 72H89Z";
const mechParts = "M19.5 32L24.5 32L17 13L12 13Z" +
  "M75.5 32L80.5 32L88 13L83 13Z" +
  "M10 11.5A4.5 4.5 0 1 1 19 11.5A4.5 4.5 0 1 1 10 11.5Z" +
  "M81 11.5A4.5 4.5 0 1 1 90 11.5A4.5 4.5 0 1 1 81 11.5Z";

/* Alien: an egg upside down, wide brow and a narrow chin. */
const alien = "M50 10C70 10 83 27 83 46C83 65 64 92 50 92C36 92 17 65 17 46C17 27 30 10 50 10Z";

/* Hexagon: a rounded nut, flat top and bottom. */
const hexPts = [];
for (let i = 0; i < 6; i++) hexPts.push(polar(44, (i * Math.PI) / 3));
const hexagon = roundedPolygon(hexPts, 9);

/* Cat: a round head with two rounded ears, as three subpaths. */
const cat = `M${pt([50, 20])}A36 36 0 1 1 ${pt([50, 92])}A36 36 0 1 1 ${pt([50, 20])}Z` +
  roundedPolygon([[16, 52], [21, 10], [48, 25]], 4.5) +
  roundedPolygon([[84, 52], [52, 25], [79, 10]], 4.5);

/* Cloud: five round puffs — a big one top left, a smaller one top
   right, three along the bottom — bumps all the way round. */
const circleAt = (cx, cy, r) => `M${cx - r} ${cy}A${r} ${r} 0 1 1 ${cx + r} ${cy}A${r} ${r} 0 1 1 ${cx - r} ${cy}Z`;
const cloud = circleAt(44, 44, 25) + circleAt(68, 50, 21) + circleAt(24, 68, 17) + circleAt(50, 73, 18) + circleAt(76, 70, 16);

/* Pill: a wide capsule with a hint of a squarer corner. */
const pill = "M28 28H72C84.15 28 94 37.85 94 50C94 62.15 84.15 72 72 72H28C15.85 72 6 62.15 6 50C6 37.85 15.85 28 28 28Z";

/* Pebble: a wide, flat, slightly lopsided stone. */
const pebble = blob((a) => 36 + 7 * Math.cos(2 * a) + 1.8 * Math.sin(3 * a + 1.1));

/* Puddle: a taller, lumpier blob. */
const puddle = blob((a) => 38 - 4 * Math.cos(2 * a) + 2.8 * Math.sin(3 * a + 0.5));


/* ── Dragon ─────────────────────────────────────────────────────────── */

/* Signed area of a polygon: positive winds clockwise on screen (y down).
   Every subpath of an outline winds the same way, so where they overlap
   the nonzero fill keeps them solid rather than cutting a hole. */
const area = (p) => p.reduce((s, a, i) => s + cross(a, p[(i + 1) % p.length]), 0) / 2;
const clockwise = (p) => (area(p) < 0 ? p.slice().reverse() : p);

/* Head: a chubby superellipse, wider than tall, sitting low so the horns
   have the room above. */
function superellipse(cx, cy, rx, ry, n, steps = 56) {
  const pts = [];
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * 2 * Math.PI;
    const c = Math.cos(a), s = Math.sin(a);
    pts.push([cx + rx * Math.sign(c) * Math.abs(c) ** (2 / n), cy + ry * Math.sign(s) * Math.abs(s) ** (2 / n)]);
  }
  return pts;
}

/* Horn: a cone swept along a quadratic curve from its root (buried in the
   head) to a round tip, tapering as it goes. */
function horn(root, ctrl, tip, w0, wTip, steps = 10) {
  const at = (t) => add(add(mul(root, (1 - t) ** 2), mul(ctrl, 2 * t * (1 - t))), mul(tip, t * t));
  const tan = (t) => norm(add(mul(sub(ctrl, root), 2 * (1 - t)), mul(sub(tip, ctrl), 2 * t)));
  const left = [], right = [];
  for (let i = 0; i < steps; i++) {
    const t = i / steps;
    const c = at(t), d = tan(t), n = [-d[1], d[0]];
    const w = wTip + (w0 - wTip) * (1 - t) ** 1.1;
    left.push(add(c, mul(n, w)));
    right.push(sub(c, mul(n, w)));
  }
  /* the round tip: a half circle round the end of the centreline */
  const c = at(1), d = tan(1), n = [-d[1], d[0]];
  const cap = [];
  for (let i = 1; i < 6; i++) {
    const a = (i / 6) * Math.PI;
    cap.push(add(c, add(mul(n, wTip * Math.cos(a)), mul(d, wTip * Math.sin(a)))));
  }
  return clockwise([...left, add(c, mul(n, wTip)), ...cap, sub(c, mul(n, wTip)), ...right.reverse()]);
}

const HEAD = { cx: 50, cy: 42, rx: 27, ry: 23 };
const dragonHead = smoothClosed(clockwise(superellipse(HEAD.cx, HEAD.cy, HEAD.rx, HEAD.ry, 2.5)));
const dragonSnout = smoothClosed(clockwise(superellipse(50, 53, 23, 12, 2.9)));
const dragonTorso = smoothClosed(clockwise(superellipse(50, 72, 18, 17, 2.2)));
const hornL = horn([35, 28], [28, 14], [22, 12], 7, 3);
const hornR = horn([65, 28], [72, 14], [78, 12], 7, 3);
/* a little crest of three soft spikes along the brow */
const crest = [
  roundedPolygon([[44, 26], [50, 11], [56, 26]], 3),
];

const dragon = dragonHead + dragonSnout + dragonTorso + smoothClosed(hornL) + smoothClosed(hornR) + crest.join("");

/* Headphones: a band over the top and a cup on each side. They are thin
   parts, drawn behind the head in their own colour. */
function arcBand(cx, cy, r, t, a0, a1) {
  const o0 = [cx + (r + t) * Math.cos(a0), cy + (r + t) * Math.sin(a0)];
  const o1 = [cx + (r + t) * Math.cos(a1), cy + (r + t) * Math.sin(a1)];
  const i1 = [cx + (r - t) * Math.cos(a1), cy + (r - t) * Math.sin(a1)];
  const i0 = [cx + (r - t) * Math.cos(a0), cy + (r - t) * Math.sin(a0)];
  return `M${pt(o0)}A${f(r + t)} ${f(r + t)} 0 0 1 ${pt(o1)}L${pt(i1)}A${f(r - t)} ${f(r - t)} 0 0 0 ${pt(i0)}Z`;
}
const deg = (d) => (d * Math.PI) / 180;
const band = arcBand(50, 61, 41, 3, deg(192), deg(348));
const cupL = roundedPolygon([[5, 47], [19, 47], [19, 75], [5, 75]], 6.5);
const cupR = roundedPolygon([[81, 47], [95, 47], [95, 75], [81, 75]], 6.5);
const headphonePath = band + cupL + cupR;
const dragonParts = arcBand(50, 42, 33, 3, deg(190), deg(350)) +
  roundedPolygon([[11, 34], [25, 34], [25, 57], [11, 57]], 6) +
  roundedPolygon([[75, 34], [89, 34], [89, 57], [75, 57]], 6);


/* ── Fantasy avatars ───────────────────────────────────────────────── */
/* The supplied PNGs live in assets/references. These are native outlines,
   so every piece turns and squashes with the same rig as the original. */
const closed = (points) => smoothClosed(clockwise(points));
const mirror = (points) => points.map(([x, y]) => [100 - x, y]);

/* A dragon is a head, a little body and articulated limbs, not a round
   head wearing horns. Feet and their claws share the same hinge. */
const fullWing = [[34, 69], [25, 62], [22, 55], [12, 52], [5, 56], [1, 67], [10, 63], [14, 75], [21, 72], [27, 83], [35, 77]];
const fullWingInset = [[32, 70], [25, 64], [20, 59], [9, 57], [10, 63], [16, 72], [21, 69], [29, 77]];
const foot = [[36, 79], [31, 86], [27, 90], [28, 94], [38, 96], [45, 93], [43, 85]];
const clawTips = [[[29, 90], [32, 90], [30, 95]], [[33, 90], [36, 90], [34, 96]], [[37, 90], [40, 90], [39, 95]]];
const tail = [[64, 77], [73, 82], [83, 77], [86, 67], [90, 64], [94, 69], [92, 83], [83, 91], [70, 90], [61, 84]];
const dragonBodyLayers = [
  { path: closed(tail), palette: 'body', lightness: -0.08, placement: 'behind', depth: 0.5, motion: 'tail', pivot: [64, 80] },
  ...[-1, 1].flatMap(side => {
    const flip = points => side < 0 ? points : mirror(points);
    const label = side < 0 ? 'left' : 'right';
    const pivot = [side < 0 ? 34 : 66, 68];
    return [
      { path: closed(flip(fullWing)), palette: 'body', lightness: -0.04, placement: 'behind', depth: 0.45, motion: `wing-${label}`, pivot },
      { path: closed(flip(fullWingInset)), palette: 'body', lightness: 0.14, placement: 'behind', depth: 0.25, motion: `wing-${label}`, pivot },
      { path: closed(flip(foot)), palette: 'body', lightness: -0.04, placement: 'behind', depth: 0.65, motion: `foot-${label}`, pivot: [side < 0 ? 39 : 61, 82] },
      { path: clawTips.map(tip => roundedPolygon(clockwise(flip(tip)), 0.7)).join(''), palette: 'body', lightness: 0.4, placement: 'behind', depth: 0.25, motion: `foot-${label}`, pivot: [side < 0 ? 39 : 61, 82] },
    ];
  }),
  { path: closed(superellipse(50, 74, 10, 12, 2.1)), palette: 'body', lightness: 0.2, placement: 'surface', depth: 0, opacity: 0.6 },
];

const forestSpirit = closed(superellipse(50, 62, 31, 29, 2.6));
const leaf = [[29, 49], [19, 37], [10, 37], [9, 43], [16, 53], [29, 58]];
/* Forks are one outline each, with thick, rounded branches at small sizes. */
const antler = [[34, 40], [30, 31], [27, 26], [19, 23], [16, 18], [18, 14], [22, 15], [29, 21], [30, 17], [29, 10], [32, 6], [36, 7], [38, 13], [36, 24], [42, 37]];
const forestLayers = [
  { path: closed(leaf) + closed(mirror(leaf)), palette: 'body', lightness: -0.06, placement: 'behind', depth: 0.65 },
  { path: closed(antler) + closed(mirror(antler)), palette: 'accent', placement: 'behind', depth: 0.65 },
];

const wingedDragon = closed(superellipse(50, 59, 31, 32, 2.5));
const wing = [[25, 49], [17, 40], [8, 39], [2, 45], [3, 48], [9, 46], [12, 54], [16, 53], [21, 62], [27, 58]];
const wingInset = [[24, 50], [17, 44], [9, 43], [13, 50], [16, 48], [22, 56]];
const ivoryHornL = horn([33, 35], [27, 26], [29, 14], 7, 2.7);
const ivoryHornR = horn([67, 35], [75, 26], [73, 15], 7, 2.7);
const dragonLayers = [
  ...[-1, 1].flatMap(side => {
    const flip = points => side < 0 ? points : mirror(points);
    const motion = side < 0 ? 'wing-left' : 'wing-right';
    const pivot = [side < 0 ? 27 : 73, 54];
    return [
      { path: closed(flip(wing)), palette: 'body', lightness: -0.04, placement: 'behind', depth: 0.55, motion, pivot },
      { path: closed(flip(wingInset)), palette: 'body', lightness: 0.13, placement: 'behind', depth: 0.3, motion, pivot },
    ];
  }),
  { path: smoothClosed(ivoryHornL) + smoothClosed(ivoryHornR), palette: 'accent', placement: 'behind', depth: 0.7 },
  { path: closed(superellipse(50, 81, 20, 7, 2)), palette: 'body', lightness: 0.11, placement: 'surface', depth: 0, opacity: 0.4 },
];

const flame = [[44, 44], [45, 32], [52, 23], [51, 11], [55, 7], [64, 14], [68, 26], [64, 41], [57, 48]];
const flameL = [[31, 48], [30, 36], [35, 27], [35, 21], [40, 22], [46, 31], [46, 45]];
const flameR = [[60, 47], [61, 35], [69, 27], [71, 22], [76, 26], [78, 38], [73, 48]];
const phoenixHead = closed(superellipse(50, 65, 30, 27, 2.2));
const phoenix = phoenixHead + closed(flame) + closed(flameL) + closed(flameR);
const featherWing = [[27, 60], [18, 50], [8, 48], [4, 51], [6, 56], [14, 60], [7, 59], [5, 63], [9, 69], [20, 74], [29, 73]];
const beak = closed([[50, 73], [56, 76], [54, 80], [50, 83], [46, 80], [44, 76]]);
const flameTip = closed([[52, 22], [53, 15], [54, 10], [58, 11], [63, 17], [63, 24], [59, 29], [55, 27]]);
const phoenixLayers = [
  { path: closed(featherWing) + closed(mirror(featherWing)), palette: 'body', lightness: 0.12, placement: 'behind', depth: 0.55 },
  { path: flameTip, palette: 'accent', placement: 'surface', depth: 0.08 },
  { path: beak, palette: 'accent', placement: 'surface', depth: 0.2, whenFace: 'eyes' },
];

const shapes = { clover, flower, triangle: tri, square, blob: blobShape, ghost, circle, drop, star, droid, mech, alien, hexagon, cat, cloud, pill, pebble, puddle, dragon, 'forest-spirit': forestSpirit, 'winged-dragon': wingedDragon, phoenix };
const layers = { dragon: dragonBodyLayers, 'forest-spirit': forestLayers, 'winged-dragon': dragonLayers, phoenix: phoenixLayers };

/* Thin parts drawn with less depth than the body they sit on. */
const parts = { droid: droidParts, mech: mechParts, dragon: dragonParts };


let ts = `/* Generated by scripts/gen-shapes.mjs — do not edit by hand. Body
   outlines in a 100×100 box, centred on (50, 50). */

import type { BotAvatarType, BotAvatarShapeLayer } from './types';

export const SHAPE_PATHS: Record<BotAvatarType, string> = {
`;
for (const [k, v] of Object.entries(shapes)) ts += `  ${k.includes('-') ? `'${k}'` : k}: '${v}',\n`;
ts += "};\n\n/** Thin parts (antennae) drawn with a fraction of the body's depth. */\nexport const SHAPE_PARTS: Partial<Record<BotAvatarType, string>> = {\n";
for (const [k, v] of Object.entries(parts)) ts += `  ${k}: '${v}',\n`;
ts += "};\n";
ts += `\n/** Shared optional headphones, independent of a type's anatomy. */\nexport const HEADPHONE_PATH = '${headphonePath}';\n`;
ts += "\n/** Coloured anatomy, ordered from back to front within each placement. */\nexport const SHAPE_LAYERS: Partial<Record<BotAvatarType, readonly BotAvatarShapeLayer[]>> = " + JSON.stringify(layers, null, 2) + ";\n";

const here = dirname(fileURLToPath(import.meta.url));
writeFileSync(resolve(here, "../src/shapes.ts"), ts);
console.log("wrote src/shapes.ts", Object.keys(shapes).join(", "));
