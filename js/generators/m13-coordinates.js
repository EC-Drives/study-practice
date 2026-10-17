// m13 The Coordinate Grid: reading and plotting points in four quadrants, quadrants, points on
// the axes and distances from them, missing corners, lengths and midpoints of horizontal and
// vertical lines, perimeter and area from coordinates, translations.
// Patterns follow the CLO's generator guide (section 2, m13). Diagrams are coordinateGrid specs
// built from the same numbers as the answer; the point she has to find is never drawn or labelled
// with its coordinates. Every wrong option is made by one named misconception and carries its code.

import { choices, typedMisconceptions, nearMiss, numericAnswer, term, countOf } from './core.js';

const T = 'm13-coordinate-grid';
const SK = {
  read: 'reading and plotting coordinates', quad: 'identifying quadrants', axes: 'points on the axes', dist: 'distance from an axis',
  vertex: 'finding a missing vertex', length: 'lengths of horizontal and vertical lines', mid: 'midpoints of horizontal and vertical lines',
  perim: 'perimeter and area from coordinates', trans: 'translating points and shapes', describe: 'describing a translation',
  original: 'finding the original point before a translation',
};

// Misconception codes: all declared once in misconceptions.js (the CLO's catalogue).

// ---------------------------------------------------------------- helpers

/** A coordinate as text: whole numbers and halves, never "-0". */
const n = (v) => (v === 0 ? '0' : String(v));
/** "(3, -2)" */
const C = (p) => `(${n(p[0])}, ${n(p[1])})`;
const eqP = (a, b) => a[0] === b[0] && a[1] === b[1];
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const nz = (rng, lo, hi) => rng.intNot(lo, hi, [0]);
const units = (k) => `${n(k)} ${Math.abs(k) === 1 ? 'unit' : 'units'}`;
const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'K', 'M', 'N', 'P', 'Q', 'R', 'S', 'T', 'W'];
const QNAME = ['', 'first', 'second', 'third', 'fourth'];
/** Quadrant 1-4 (anticlockwise from top right), 0 on an axis. */
const quad = ([x, y]) => (x === 0 || y === 0 ? 0 : x > 0 ? (y > 0 ? 1 : 4) : (y > 0 ? 2 : 3));
/** The quadrant a pupil numbering clockwise would call quadrant k. */
const CLOCKWISE = [0, 1, 4, 3, 2];
const QUAD_NOTE = '(Quadrants are numbered anticlockwise, starting from the top right.)';
const lr = (x) => (x < 0 ? 'left' : 'right');
const ud = (y) => (y < 0 ? 'down' : 'up');
const where = ([x, y]) => `${units(Math.abs(x))} ${x < 0 ? 'left' : 'right'} and ${units(Math.abs(y))} ${y < 0 ? 'down' : 'up'}`;

/** Axis ranges that show every point with a margin; first quadrant only when all are positive. */
function grid(pts, minSpan = 8) {
  const range = (vals) => {
    const pos = vals.every((v) => v > 0);
    let lo = pos ? 0 : Math.min(-2, Math.floor(Math.min(...vals)) - 1);
    let hi = Math.max(2, Math.ceil(Math.max(...vals)) + 1);
    while (hi - lo < minSpan) { hi++; if (hi - lo < minSpan && !pos) lo--; }
    return [lo, hi];
  };
  const x = range(pts.map((p) => p[0]));
  const y = range(pts.map((p) => p[1]));
  const out = { type: 'coordinateGrid', x, y };
  return out;
}

/** Does the number v appear in the prompt? (A near miss must never be one: CLO review X3.) */
const promptHas = (prompt, v) => (String(prompt).match(/-?\d+(?:\.\d+)?/g) || []).some((t) => Number(t) === v);
/** Fallback near miss next to a coordinate pair. */
const nearP = (P, hint) => (i) => nearMiss(C([P[0] + (i % 2 ? 1 : -1) * Math.ceil(i / 2), P[1] + (i % 3 === 0 ? 1 : 0)]), hint);

/** A short-answer coordinate question body. */
function shortCoord(prompt, P, items, common, rest) {
  const ans = C(P);
  const t = typedMisconceptions(ans, items, common);
  return { type: 'short', prompt: `${prompt} Write your answer as (x, y).`, answer: { accept: [ans, `${n(P[0])},${n(P[1])}`, `${n(P[0])}, ${n(P[1])}`], keywords: [] }, ...t, ...rest };
}

// ---------------------------------------------------------------- g01 read the coordinates of a plotted point

const readPoint = {
  id: 'm13.read-point', topicId: T, subtopicId: 'm13-s1', skill: SK.read,
  title: 'Read the coordinates of a plotted point (D2: halfway points, several points plotted)',
  difficulties: [1, 2],
  check: {},
  make(rng, d) {
    for (let t = 0; t < 300; t++) {
      const lim = 6;
      let x = nz(rng, -lim, lim); let y = nz(rng, -lim, lim);
      let halfAt = -1;
      if (d === 2) {
        halfAt = rng.int(0, 2); // 0: x is a half, 1: y is a half, 2: both
        if (halfAt !== 1) x += x > 0 ? -0.5 : 0.5;
        if (halfAt !== 0) y += y > 0 ? -0.5 : 0.5;
      }
      if (Math.abs(x) === Math.abs(y)) continue;
      const P = [x, y];
      const [L, ...rest] = rng.sample(LETTERS, 3);
      const pts = [{ at: P, label: L }];
      if (d === 2) {
        for (const other of rest) {
          const o = [nz(rng, -lim + 1, lim - 1) + (rng.chance(0.5) ? 0.5 : 0), nz(rng, -lim, lim)];
          if (pts.some((p) => Math.abs(p.at[0] - o[0]) + Math.abs(p.at[1] - o[1]) < 2) || eqP(o, [y, x])) continue;
          pts.push({ at: o, label: other });
        }
      }
      const diagram = { ...grid(pts.map((p) => p.at)), points: rng.shuffle(pts), alt: `A coordinate grid with ${pts.length === 1 ? `point ${L}` : `points ${pts.map((p) => p.label).sort().join(', ')}`} plotted.` };
      const prompt = `What are the coordinates of point ${L}?`;
      const solution = `Start at the origin (0, 0). Point ${L} is ${where(P)}. Write the x-coordinate (across) first, then the y-coordinate (up or down)${d === 2 ? '. A point halfway between two grid lines has a coordinate ending in .5' : ''}. Answer: ${C(P)}`;
      const half = [];
      if (d === 2) {
        const w = (v) => (rng.chance(0.5) ? Math.floor(v) : Math.ceil(v));
        const mis = halfAt === 1 ? [x, w(y)] : [w(x), y];
        const which = halfAt === 1 ? 'y' : 'x';
        const hv = halfAt === 1 ? y : x;
        half.push({ text: C(mis), code: 'COORD-HALF-MISREAD', why: `Point ${L} is halfway between two grid lines, so its ${which}-coordinate is ${n(hv)}, not ${n(halfAt === 1 ? mis[1] : mis[0])}. Look carefully at where the point sits between the lines.` });
      }
      const distractors = [
        ...half,
        { text: C([y, x]), code: 'COORD-SWAP', why: `It looks like you wrote the coordinates the wrong way round. The x-coordinate (across) always comes first: ${L} is ${units(Math.abs(x))} ${lr(x)}, so x = ${n(x)}.` },
        ...rng.shuffle([
          { text: C([-x, y]), code: 'COORD-SIGN', why: `${L} is to the ${lr(x)} of the y-axis, so its x-coordinate is ${x < 0 ? 'negative' : 'positive'}: ${n(x)}, not ${n(-x)}.` },
          { text: C([x, -y]), code: 'COORD-SIGN', why: `${L} is ${y < 0 ? 'below' : 'above'} the x-axis, so its y-coordinate is ${y < 0 ? 'negative' : 'positive'}: ${n(y)}, not ${n(-y)}.` },
        ]),
      ];
      try {
        if (rng.chance(0.3)) {
          return shortCoord(prompt, P, distractors, { code: 'COORD-SWAP', why: 'Count across first (x), then up or down (y). Left and down are negative.' }, { solution, diagram });
        }
        return { type: 'mcq', prompt, ...choices(rng, C(P), distractors, nearP(P, 'Count the squares across from the origin first, then up or down.')), solution, diagram };
      } catch { /* draw again */ }
    }
    throw new Error('no question');
  },
};

// ---------------------------------------------------------------- g02 which point is at (x, y)

const whichPoint = {
  id: 'm13.which-point', topicId: T, subtopicId: 'm13-s1', skill: SK.read,
  title: 'Which labelled point is at (x, y)? (D2 with halfway points)',
  difficulties: [1, 2],
  check: {},
  make(rng, d) {
    for (let t = 0; t < 300; t++) {
      let x = nz(rng, -6, 6); let y = nz(rng, -6, 6);
      if (d === 2) { if (rng.chance(0.5)) x += x > 0 ? -0.5 : 0.5; else y += y > 0 ? -0.5 : 0.5; }
      if (Math.abs(x) === Math.abs(y)) continue;
      const P = [x, y];
      const cands = [
        { at: [y, x], code: 'COORD-SWAP', why: (l) => `Point ${l} is at ${C([y, x])}: the numbers are the wrong way round. Go across first (x = ${n(x)}), then up or down (y = ${n(y)}).` },
        { at: [-x, y], code: 'COORD-SIGN', why: (l) => `Point ${l} is at ${C([-x, y])}. An x-coordinate of ${n(x)} means ${x < 0 ? 'LEFT' : 'RIGHT'} of the y-axis.` },
        { at: [x, -y], code: 'COORD-SIGN', why: (l) => `Point ${l} is at ${C([x, -y])}. A y-coordinate of ${n(y)} means ${y < 0 ? 'BELOW' : 'ABOVE'} the x-axis.` },
        { at: [-x, -y], code: 'COORD-SIGN', why: (l) => `Point ${l} is at ${C([-x, -y])}: both signs are the other way. ${n(x)} is ${x < 0 ? 'left' : 'right'} and ${n(y)} is ${y < 0 ? 'down' : 'up'}.` },
      ];
      const wrong = [cands[0], ...rng.sample(cands.slice(1), 2)];
      const letters = rng.sample(['A', 'B', 'C', 'D'], 4);
      const items = rng.shuffle([{ at: P, correct: true }, ...wrong]).map((it, i) => ({ ...it, label: letters[i] }));
      const options = ['A', 'B', 'C', 'D'];
      const answer = options.indexOf(items.find((it) => it.correct).label);
      const misconceptions = {}; const codes = {};
      for (const it of items) {
        if (it.correct) continue;
        const k = String(options.indexOf(it.label));
        misconceptions[k] = it.why(it.label); codes[k] = it.code;
      }
      const all = items.map((it) => it.at);
      const diagram = { ...grid(all), points: items.map((it) => ({ at: it.at, label: it.label })), alt: 'A coordinate grid with four labelled points, A, B, C and D.' };
      const L = options[answer];
      const solution = `${C(P)} means ${where(P)} from the origin. x comes first (across), then y (up or down). That is point ${L}. Answer: ${L}`;
      return { type: 'mcq', prompt: `Which point is at ${C(P)}?`, options, answer, misconceptions, codes, solution, diagram };
    }
    throw new Error('no question');
  },
};

// ---------------------------------------------------------------- g03 quadrant of a point

const QOPTS = ['The first quadrant', 'The second quadrant', 'The third quadrant', 'The fourth quadrant'];
const quadSide = (k) => `${k === 1 || k === 4 ? 'right' : 'left'} and ${k === 1 || k === 2 ? 'up' : 'down'}`;
const quadrant = {
  id: 'm13.quadrant', topicId: T, subtopicId: 'm13-s1', skill: SK.quad,
  title: 'Which quadrant is the point in? (D2: which point is in a given quadrant)',
  difficulties: [1, 2],
  check: {},
  make(rng, d) {
    if (d === 1 || rng.chance(0.65)) {
      // D2: decimals, often with a small whole-number part
      const dv = () => (rng.chance(0.5) ? -1 : 1) * (rng.int(0, 6) + rng.int(1, 9) / 10);
      for (let t = 0; t < 100; t++) {
        const x = d === 1 ? nz(rng, -8, 8) : Number(dv().toFixed(1)); const y = d === 1 ? nz(rng, -8, 8) : Number((rng.chance(0.5) ? nz(rng, -8, 8) : dv()).toFixed(1));
        const P = [x, y]; const k = quad(P);
        const options = QOPTS.slice();
        const misconceptions = {}; const codes = {};
        const set = (q, code, why) => { misconceptions[String(q - 1)] = why; codes[String(q - 1)] = code; };
        set(quad([-x, y]), 'COORD-SIGN', `x = ${n(x)} is ${x < 0 ? 'negative, so the point is LEFT' : 'positive, so the point is RIGHT'} of the y-axis. That puts it in the ${QNAME[k]} quadrant, not the ${QNAME[quad([-x, y])]}.`);
        set(quad([x, -y]), 'COORD-SIGN', `y = ${n(y)} is ${y < 0 ? 'negative, so the point is BELOW' : 'positive, so the point is ABOVE'} the x-axis. Check the sign of y again.`);
        const both = quad([-x, -y]);
        if (k === 2 || k === 4) set(both, 'QUAD-CLOCKWISE', `It looks like you numbered the quadrants clockwise. They go ANTICLOCKWISE from the top right: first top right, second top left, third bottom left, fourth bottom right.`);
        else set(both, 'COORD-SIGN', `Both signs matter: x = ${n(x)} and y = ${n(y)} put the point ${quadSide(k)} from the origin, which is the ${QNAME[k]} quadrant.`);
        const solution = `x = ${n(x)} means ${units(Math.abs(x))} ${lr(x)}; y = ${n(y)} means ${units(Math.abs(y))} ${ud(y)}. ${lr(x) === 'left' ? 'Left' : 'Right'} and ${ud(y)} is the ${QNAME[k]} quadrant (numbered anticlockwise from the top right). Answer: ${QOPTS[k - 1]}`;
        return { type: 'mcq', prompt: `Which quadrant is the point ${C(P)} in? ${QUAD_NOTE}`, options, answer: k - 1, misconceptions, codes, solution };
      }
    }
    for (let t = 0; t < 200; t++) {
      const k = rng.int(1, 4);
      let a = rng.int(1, 8); let b = rng.int(1, 8);
      if (rng.chance(0.3)) { if (rng.chance(0.5)) a -= 0.5; else b -= 0.5; }
      if (a === b) continue;
      const sx = k === 1 || k === 4 ? 1 : -1; const sy = k === 1 || k === 2 ? 1 : -1;
      const P = [sx * a, sy * b];
      const cand = [
        k === 2 || k === 4
          ? { text: C([-sx * a, -sy * b]), code: 'QUAD-CLOCKWISE', why: `This point is in the ${QNAME[quad([-sx * a, -sy * b])]} quadrant. It looks like you numbered the quadrants clockwise; they go anticlockwise from the top right.` }
          : { text: C([-sx * a, -sy * b]), code: 'COORD-SIGN', why: `Both coordinates of this point have the other sign, so it is in the ${QNAME[quad([-sx * a, -sy * b])]} quadrant.` },
        rng.chance(0.5) ? { text: C([0, sy * b]), code: 'COORD-AXIS-QUADRANT', why: `x = 0, so this point is ON the y-axis. A point on an axis is not in any quadrant.` }
          : { text: C([sx * a, 0]), code: 'COORD-AXIS-QUADRANT', why: `y = 0, so this point is ON the x-axis. A point on an axis is not in any quadrant.` },
        ...rng.shuffle([
          { text: C([-sx * a, sy * b]), code: 'COORD-SIGN', why: `x = ${n(-sx * a)} puts this point to the ${lr(-sx)} of the y-axis, in the ${QNAME[quad([-sx * a, sy * b])]} quadrant.` },
          { text: C([sx * a, -sy * b]), code: 'COORD-SIGN', why: `y = ${n(-sy * b)} puts this point ${-sy < 0 ? 'below' : 'above'} the x-axis, in the ${QNAME[quad([sx * a, -sy * b])]} quadrant.` },
        ]),
      ];
      const solution = `The ${QNAME[k]} quadrant is ${quadSide(k)} from the origin, so x is ${sx > 0 ? 'positive' : 'negative'} and y is ${sy > 0 ? 'positive' : 'negative'}. Only ${C(P)} has both signs right (a 0 means the point is on an axis). Answer: ${C(P)}`;
      try {
        return { type: 'mcq', prompt: `Which of these points is in the ${QNAME[k]} quadrant? ${QUAD_NOTE}`, ...choices(rng, C(P), cand, null), solution };
      } catch { /* draw again */ }
    }
    throw new Error('no question');
  },
};

// ---------------------------------------------------------------- points on the axes; distance from an axis

const axisDistance = {
  id: 'm13.axis-distance', topicId: T, subtopicId: 'm13-s1', skill: SK.dist,
  title: 'Points on the axes (D1), distance from an axis or coordinates from two distances and a quadrant (D2), both points that fit two distances and a side (D3)',
  difficulties: [1, 2, 3],
  check: {},
  make(rng, d) {
    const L = rng.pick(['P', 'Q', 'R', 'S', 'T', 'K', 'M', 'N']);
    if (d === 1) {
      for (let t = 0; t < 100; t++) {
        const dist = rng.int(1, 8) - (rng.chance(0.25) ? 0.5 : 0);
        const onX = rng.chance(0.5); const neg = rng.chance(0.5);
        const v = neg ? -dist : dist;
        const P = onX ? [v, 0] : [0, v];
        const place = onX ? `${units(dist)} to the ${neg ? 'left' : 'right'} of the origin` : `${units(dist)} ${neg ? 'below' : 'above'} the origin`;
        const prompt = `Point ${L} is on the ${onX ? 'x' : 'y'}-axis, ${place}. What are the coordinates of ${L}?`;
        const solution = `On the ${onX ? 'x' : 'y'}-axis means ${onX ? 'y' : 'x'} = 0. ${onX ? (neg ? 'Left' : 'Right') : (neg ? 'Below' : 'Above')} the origin by ${n(dist)} means ${onX ? 'x' : 'y'} = ${n(v)}. Answer: ${C(P)}`;
        const distractors = [
          { text: C([P[1], P[0]]), code: 'COORD-SWAP', why: `This point is on the ${onX ? 'y' : 'x'}-axis. The x-coordinate comes first, so a point on the ${onX ? 'x' : 'y'}-axis is written ${onX ? '(number, 0)' : '(0, number)'}.` },
          { text: C(P.map((c) => -c)), code: 'COORD-SIGN', why: `${onX ? (neg ? 'Left of the origin means x is negative' : 'Right of the origin means x is positive') : (neg ? 'Below the origin means y is negative' : 'Above the origin means y is positive')}, so it is ${n(v)}, not ${n(-v)}.` },
          { text: C([v, v]), code: 'AXIS-ZERO-MISSED', why: `A point on the ${onX ? 'x' : 'y'}-axis has not moved ${onX ? 'up or down' : 'left or right'} at all, so its ${onX ? 'y' : 'x'}-coordinate is 0.` },
        ];
        return { type: 'mcq', prompt, ...choices(rng, C(P), distractors, null), solution, skill: SK.axes };
      }
    }
    if (d === 3) return bothPoints(rng, L);
    // D2: half the time a distance from an axis; otherwise the quadrant form below (formerly D3,
    // which is D2 work: CLO review, m13 SHOULD 3)
    if (d === 2 && rng.chance(0.5)) {
      for (let t = 0; t < 200; t++) {
        const x = nz(rng, -8, 8) + (rng.chance(0.3) ? 0.5 : 0); const y = nz(rng, -8, 8) + (rng.chance(0.3) ? 0.5 : 0);
        if (Math.abs(x) < 1 || Math.abs(y) < 1 || Math.abs(x) === Math.abs(y)) continue;
        const P = [x, y];
        const fromY = rng.chance(0.5); // distance from the y-axis is |x|
        const used = fromY ? x : y; const other = fromY ? y : x;
        const ans = Math.abs(used);
        const prompt = `Point ${L} is at ${C(P)}. How many units is ${L} from the ${fromY ? 'y' : 'x'}-axis?`;
        const solution = `The distance from the ${fromY ? 'y-axis (the vertical axis) is given by the x-coordinate' : 'x-axis (the horizontal axis) is given by the y-coordinate'}. ${fromY ? 'x' : 'y'} = ${n(used)}, so ${L} is ${countOf(n(ans), 'unit')} ${fromY ? (x < 0 ? 'left of' : 'right of') : (y < 0 ? 'below' : 'above')} it. A distance is never negative. Answer: ${n(ans)}`;
        const items = [
          { text: n(Math.abs(other)), code: 'COORD-SWAP', why: `${n(Math.abs(other))} comes from the ${fromY ? 'y' : 'x'}-coordinate, which gives the distance from the ${fromY ? 'x' : 'y'}-axis. The distance from the ${fromY ? 'y' : 'x'}-axis comes from the ${fromY ? 'x' : 'y'}-coordinate.` },
          used < 0 ? { text: n(used), code: 'DIST-NEGATIVE', why: `The minus sign only tells you which side of the axis ${L} is on. A distance is always positive: ${countOf(n(ans), 'unit')}.` } : null,
        ].filter(Boolean);
        const diagram = { ...grid([P]), points: [{ at: P, label: L, showCoords: true }] };
        const t2 = typedMisconceptions(n(ans), items, { code: 'COORD-SWAP', why: `The distance from the ${fromY ? 'y' : 'x'}-axis is the size of the ${fromY ? 'x' : 'y'}-coordinate, without its sign.` });
        return { type: 'numeric', prompt, answer: numericAnswer(ans, [n(ans), countOf(n(ans), 'unit'), ...(ans % 1 ? [ans < 1 ? '1/2' : `${Math.floor(ans)} 1/2`] : [])]), solution, ...t2, diagram };
      }
    }
    for (let t = 0; t < 200; t++) {
      const k = rng.int(1, 4);
      const a = rng.int(1, 8) - (rng.chance(0.3) ? 0.5 : 0); const b = rng.int(1, 8) - (rng.chance(0.3) ? 0.5 : 0);
      if (a === b) continue;
      const sx = k === 1 || k === 4 ? 1 : -1; const sy = k === 1 || k === 2 ? 1 : -1;
      const P = [sx * a, sy * b];
      const prompt = `Point ${L} is in the ${QNAME[k]} quadrant. It is ${units(a)} from the y-axis and ${units(b)} from the x-axis. What are the coordinates of ${L}? ${QUAD_NOTE}`;
      const solution = `The distance from the y-axis gives x, and the distance from the x-axis gives y. The ${QNAME[k]} quadrant is ${quadSide(k)} from the origin, so x = ${n(P[0])} and y = ${n(P[1])}. Answer: ${C(P)}`;
      const distractors = [
        { text: C([sx * b, sy * a]), code: 'COORD-SWAP', why: `The distance from the y-axis tells you how far LEFT or RIGHT the point is, so it gives x (${n(a)}). The distance from the x-axis gives y (${n(b)}).` },
        { text: C([-sx * a, sy * b]), code: 'COORD-SIGN', why: `This point is in the ${QNAME[quad([-sx * a, sy * b])]} quadrant. In the ${QNAME[k]} quadrant x is ${sx > 0 ? 'positive' : 'negative'}.` },
        { text: C([sx * a, -sy * b]), code: 'COORD-SIGN', why: `This point is in the ${QNAME[quad([sx * a, -sy * b])]} quadrant. In the ${QNAME[k]} quadrant y is ${sy > 0 ? 'positive' : 'negative'}.` },
        { text: C([b, a]), code: 'COORD-SWAP', why: `This swaps the distances and ignores the quadrant. Distance from the y-axis gives x; then use the signs of the ${QNAME[k]} quadrant.` },
      ];
      const diagram = { type: 'coordinateGrid', x: [-10, 10], y: [-10, 10], quadrantLabels: true, labelEvery: 2 };
      try {
        return { type: 'mcq', prompt, ...choices(rng, C(P), distractors, null), solution, diagram };
      } catch { /* draw again */ }
    }
    throw new Error('no question');
  },
};

/** "(-3, 5) and (3, 5)": two points, the one further left (then lower) first. */
const pairText = (p1, p2) => { const [a, b] = [p1, p2].sort((u, v) => u[0] - v[0] || u[1] - v[1]); return `${C(a)} and ${C(b)}`; };

/** D3: a point is a units from the y-axis and b units from the x-axis, on one side of an axis.
 * Two points fit; she chooses the pair (CLO review, m13 SHOULD 3). */
function bothPoints(rng, L) {
  for (let t = 0; t < 200; t++) {
    const a = rng.int(1, 8); const b = rng.int(1, 8);
    if (a === b) continue;
    const sideOfX = rng.chance(0.5); // the side is given for the x-axis (above/below), else for the y-axis
    const s = rng.chance(0.5) ? 1 : -1;
    const sideText = sideOfX ? (s > 0 ? 'above the x-axis' : 'below the x-axis') : (s > 0 ? 'to the right of the y-axis' : 'to the left of the y-axis');
    // the two points that fit, and the wrong pairs
    const fit = sideOfX ? [[a, s * b], [-a, s * b]] : [[s * a, b], [s * a, -b]];
    const prompt = `Point ${L} is ${countOf(a, 'unit')} from the y-axis and ${countOf(b, 'unit')} from the x-axis. It is ${sideText}. Which two points could ${L} be?`;
    const ans = pairText(...fit);
    const solution = `The distance from the y-axis gives the size of x (${a}), and the distance from the x-axis gives the size of y (${b}). ${sideOfX ? `${capFirst(sideText)} means y = ${n(s * b)}, and x can be ${a} or -${a}.` : `${capFirst(sideText)} means x = ${n(s * a)}, and y can be ${b} or -${b}.`} Answer: ${ans}`;
    // the two distances swapped (b from the y-axis, a from the x-axis), on the right side
    const swapped = sideOfX ? [[b, s * a], [-b, s * a]] : [[s * b, a], [s * b, -a]];
    const distractors = [
      { text: pairText(...swapped), code: 'COORD-SWAP', why: `The distance from the y-axis tells you how far LEFT or RIGHT the point is, so it gives x (${a}). The distance from the x-axis gives y (${b}).` },
      { text: sideOfX ? pairText([s * a, b * s], [s * a, -b * s]) : pairText([a * s, s * b], [-a * s, s * b]), code: 'ONE-CONDITION-ONLY', why: `Both points are the right distances from the axes, but one of them is not ${sideText}. Use that clue too.` },
      { text: sideOfX ? pairText([a, -s * b], [-a, -s * b]) : pairText([-s * a, b], [-s * a, -b]), code: 'COORD-SIGN', why: `These points are ${sideOfX ? (s > 0 ? 'below the x-axis: y is negative there' : 'above the x-axis: y is positive there') : (s > 0 ? 'to the left of the y-axis: x is negative there' : 'to the right of the y-axis: x is positive there')}. ${capFirst(sideText)} means ${sideOfX ? `y = ${n(s * b)}` : `x = ${n(s * a)}`}.` },
    ];
    try {
      return { type: 'mcq', prompt, ...choices(rng, ans, distractors, null), solution, marks: 2 };
    } catch { /* draw again */ }
  }
  throw new Error('no question');
}
const capFirst = (t) => t.charAt(0).toUpperCase() + t.slice(1);

// ---------------------------------------------------------------- g04 missing vertex

const NAMES = ['ABCD', 'PQRS', 'KLMN', 'EFGH', 'WXYZ'];
const missingVertex = {
  id: 'm13.missing-vertex', topicId: T, subtopicId: 'm13-s2', skill: SK.vertex,
  title: 'Missing corner of a rectangle (D1), a square or parallelogram (D2), a square from one side (D3)',
  difficulties: [1, 2, 3],
  check: {},
  make(rng, d) {
    for (let t = 0; t < 400; t++) {
      const name = rng.pick(NAMES);
      if (d === 3) {
        // square from two adjacent corners and the side the square is on
        const horiz = rng.chance(0.5);
        const len = rng.int(3, 7);
        const s = rng.chance(0.5) ? 1 : -1; // direction from A to B
        const side = rng.chance(0.5) ? 1 : -1; // which side of AB the square is
        const A = [rng.int(-6, 6), rng.int(-6, 6)];
        const B = horiz ? [A[0] + s * len, A[1]] : [A[0], A[1] + s * len];
        const off = horiz ? [0, side * len] : [side * len, 0];
        const Cc = add(B, off); const D = add(A, off);
        if ([A, B, Cc, D].some((p) => Math.abs(p[0]) > 8 || Math.abs(p[1]) > 8)) continue;
        const askC = rng.chance(0.6);
        const ans = askC ? Cc : D; const from = askC ? B : A; const other = askC ? D : Cc;
        const [a, b, c, dd] = name.split('');
        const sideWord = horiz ? (side > 0 ? 'above' : 'below') : (side > 0 ? 'to the right of' : 'to the left of');
        const crosses = horiz ? A[0] * B[0] < 0 : A[1] * B[1] < 0;
        const prompt = `${name} is a square with its corners in that order. ${a} is ${C(A)} and ${b} is ${C(B)}. Corners ${c} and ${dd} are ${sideWord} ${a}${b}. What are the coordinates of ${askC ? c : dd}?`;
        const step = horiz ? `${a}${b} goes from x = ${n(A[0])} to x = ${n(B[0])}, so each side is ${len} units` : `${a}${b} goes from y = ${n(A[1])} to y = ${n(B[1])}, so each side is ${len} units`;
        const solution = `${step}${crosses ? ' (count across zero)' : ''}. ${askC ? c : dd} is ${len} units ${horiz ? (side > 0 ? 'up' : 'down') : (side > 0 ? 'right' : 'left')} from ${askC ? b : a}${C(from)}. Answer: ${C(ans)}`;
        const wrongSide = sub(from, off);
        const plus1 = add(from, horiz ? [0, side * (len + 1)] : [side * (len + 1), 0]);
        const negLen = Math.abs(Math.abs(horiz ? B[0] : B[1]) - Math.abs(horiz ? A[0] : A[1]));
        const distractors = [
          { text: C(wrongSide), code: 'TRANS-WRONG-DIRECTION', why: `This corner is on the wrong side of ${a}${b}. The square is ${sideWord} ${a}${b}, so go ${horiz ? (side > 0 ? 'up' : 'down') : (side > 0 ? 'right' : 'left')}.` },
          crosses && negLen > 0 ? { text: C(add(from, horiz ? [0, side * negLen] : [side * negLen, 0])), code: 'NEG-DIFF-ADD-SIGNS', why: `${a}${b} crosses an axis, so its length is ${n(Math.abs(horiz ? A[0] : A[1]))} + ${n(Math.abs(horiz ? B[0] : B[1]))} = ${len} units, not ${negLen}.` } : null,
          { text: C(plus1), code: 'COORD-COUNT-POINTS', why: `It looks like the side was counted as ${len + 1} by counting grid points. Count the gaps (units): the side is ${len} units long.` },
          { text: C(other), code: 'VERTEX-WRONG-ORDER', why: `That is corner ${askC ? dd : c}. Go round the corners in order: ${askC ? c : dd} is next to ${askC ? b : a}.` },
          { text: C([ans[1], ans[0]]), code: 'COORD-SWAP', why: 'The coordinates are the wrong way round. Write the x-coordinate (across) first.' },
        ];
        const diagram = { ...grid([A, B, Cc, D]), points: [{ at: A, label: a }, { at: B, label: b }], segments: [{ from: A, to: B }] };
        try {
          return { type: 'mcq', prompt, ...choices(rng, C(ans), distractors, nearP(ans, 'Find the side length first, then move that far from the corner.')), solution, diagram, marks: 2 };
        } catch { continue; }
      }
      let P; let shape;
      if (d === 1) {
        const w = rng.int(2, 7); const h = rng.intNot(2, 6, [w]);
        const x0 = rng.int(0, 8 - w); const y0 = rng.int(0, 8 - h);
        const sq = [[x0, y0], [x0 + w, y0], [x0 + w, y0 + h], [x0, y0 + h]];
        P = rng.chance(0.5) ? sq : sq.slice().reverse();
        const k = rng.int(0, 3); P = [...P.slice(k), ...P.slice(0, k)];
        shape = 'rectangle';
      } else {
        const sqr = rng.chance(0.5);
        const u = [rng.int(-4, 4), rng.int(-4, 4)];
        if (u[0] === 0 && u[1] === 0) continue;
        const v = sqr ? (rng.chance(0.5) ? [-u[1], u[0]] : [u[1], -u[0]]) : [rng.int(-4, 4), rng.int(-4, 4)];
        if (!sqr && (u[0] * v[1] - u[1] * v[0] === 0 || u[0] * v[0] + u[1] * v[1] === 0)) continue; // not a rectangle or flat
        // a real parallelogram: area at least 4 and an angle between 45° and 135° (CLO review, m13 SHOULD 2)
        const dot = u[0] * v[0] + u[1] * v[1]; const uu = u[0] ** 2 + u[1] ** 2; const vv = v[0] ** 2 + v[1] ** 2;
        if (!sqr && (Math.abs(u[0] * v[1] - u[1] * v[0]) < 4 || 2 * dot * dot > uu * vv)) continue;
        if (sqr && (u[0] === 0 || u[1] === 0)) continue; // a tilted square
        const A = [rng.int(-5, 5), rng.int(-5, 5)];
        P = [A, add(A, u), add(add(A, u), v), add(A, v)];
        if (P.some((p) => Math.abs(p[0]) > 7 || Math.abs(p[1]) > 7)) continue;
        if (!P.some((p) => p[0] < 0) && !P.some((p) => p[1] < 0)) continue; // D2 uses more than one quadrant
        shape = sqr ? 'square' : 'parallelogram';
      }
      const m = rng.int(0, 3); // the missing corner
      const letters = name.split('');
      const prev = P[(m + 3) % 4]; const next = P[(m + 1) % 4]; const opp = P[(m + 2) % 4];
      const ans = P[m];
      const given = [1, 2, 3].map((j) => (m + j) % 4);
      const listed = given.slice().sort((a, b) => a - b);
      const prompt = `${name} is a ${shape} with its corners in that order${shape === 'rectangle' ? '. Its sides are horizontal and vertical' : ''}. ${listed.map((j, i) => `${i === listed.length - 1 ? 'and ' : ''}${letters[j]} is ${C(P[j])}`).join(', ').replace(', and', ' and')}. What are the coordinates of ${letters[m]}?`;
      const mv = sub(prev, opp);
      const solution = shape === 'rectangle'
        ? `${letters[m]} is opposite ${letters[(m + 2) % 4]}. It lines up with ${letters[(m + 3) % 4]}${C(prev)} on one side and with ${letters[(m + 1) % 4]}${C(next)} on the other. From ${letters[(m + 2) % 4]} to ${letters[(m + 3) % 4]} is ${moveText(mv)}; do the same from ${letters[(m + 1) % 4]}: ${C(next)} → ${C(ans)}. Answer: ${C(ans)}`
        : `Opposite sides of a ${shape} are equal and parallel. From ${letters[(m + 2) % 4]}${C(opp)} to ${letters[(m + 3) % 4]}${C(prev)} is ${moveText(mv)}. Make the same move from ${letters[(m + 1) % 4]}${C(next)}: ${C(next)} → ${C(ans)}. Answer: ${C(ans)}`;
      const w1 = add(prev, sub(opp, next)); const w2 = add(next, sub(opp, prev));
      const distractors = [
        // w1 copies the move from the opposite corner to one neighbour, but the wrong way (CLO review, m13 MUST 1)
        { text: C(w1), code: 'TRANS-WRONG-DIRECTION', why: `It looks like you copied the move from ${letters[(m + 2) % 4]} to ${letters[(m + 1) % 4]} (${moveText(sub(next, opp))}) the wrong way round, starting at ${letters[(m + 3) % 4]}. From ${letters[(m + 3) % 4]}, make that move the same way: ${moveText(sub(next, opp))}.` },
        { text: C(w2), code: 'VERTEX-WRONG-ORDER', why: `This point puts ${letters[m]} next to ${letters[(m + 2) % 4]}, but in ${name} they are opposite corners. Copy the move from ${letters[(m + 2) % 4]} to ${letters[(m + 3) % 4]}, starting at ${letters[(m + 1) % 4]}.` },
        { text: C([ans[1], ans[0]]), code: 'COORD-SWAP', why: 'The right numbers, but the wrong way round. Write the x-coordinate (across) first, then y.' },
      ];
      const diagram = { ...grid(P), points: given.map((j) => ({ at: P[j], label: letters[j] })), segments: [{ from: P[(m + 1) % 4], to: P[(m + 2) % 4] }, { from: P[(m + 2) % 4], to: P[(m + 3) % 4] }] };
      // a wrong answer is never one of the corners already given
      const isGiven = (t) => given.some((j) => C(P[j]) === t);
      for (let i = distractors.length - 1; i >= 0; i--) if (isGiven(distractors[i].text)) distractors.splice(i, 1);
      const nearV = nearP(ans, 'Copy the move along one side to the opposite side.');
      try {
        if (d === 2 && rng.chance(0.35)) {
          return shortCoord(prompt, ans, distractors, { code: 'VERTEX-WRONG-ORDER', why: `Go round the corners in order. ${letters[m]} is opposite ${letters[(m + 2) % 4]}: copy the move from ${letters[(m + 2) % 4]} to ${letters[(m + 3) % 4]}, starting at ${letters[(m + 1) % 4]}.` }, { solution, diagram });
        }
        return { type: 'mcq', prompt, ...choices(rng, C(ans), distractors, (i) => { const x = nearV(i); return isGiven(x.text) ? null : x; }), solution, diagram };
      } catch { /* draw again */ }
    }
    throw new Error('no question');
  },
};

// ---------------------------------------------------------------- g05 length of a horizontal or vertical line

/** A horizontal or vertical segment. crossing: the ends are on both sides of an axis. */
function segment(rng, crossing, lim = 8) {
  for (;;) {
    const horiz = rng.chance(0.5);
    const c = nz(rng, -lim + 1, lim - 1);
    let a; let b;
    if (crossing) { a = -rng.int(1, lim); b = rng.int(1, lim); } else { a = rng.int(1, lim); b = rng.int(1, lim); }
    if (a === b) continue;
    if (rng.chance(0.5)) [a, b] = [b, a];
    if (!crossing && rng.chance(0.25)) { a = -a; b = -b; }
    return horiz ? { horiz, A: [a, c], B: [b, c], a, b } : { horiz, A: [c, a], B: [c, b], a, b };
  }
}

const lineLength = {
  id: 'm13.line-length', topicId: T, subtopicId: 'm13-s2', skill: SK.length,
  title: 'Length of a horizontal or vertical line (D2 crosses an axis; D3 find the other end)',
  difficulties: [1, 2, 3],
  check: { min: 0 },
  make(rng, d) {
    const [p, q] = rng.pick([['A', 'B'], ['P', 'Q'], ['M', 'N'], ['R', 'S'], ['C', 'D']]);
    for (let t = 0; t < 200; t++) {
      if (d === 3) {
        const horiz = rng.chance(0.5);
        const A = [nz(rng, -6, 6), nz(rng, -6, 6)];
        const len = rng.int(3, 9);
        const sgn = rng.chance(0.5) ? 1 : -1;
        const B = horiz ? [A[0] + sgn * len, A[1]] : [A[0], A[1] + sgn * len];
        if (Math.abs(B[0]) > 8 || Math.abs(B[1]) > 8) continue;
        const dirWord = horiz ? (sgn > 0 ? 'to the right of' : 'to the left of') : (sgn > 0 ? 'directly above' : 'directly below');
        const prompt = `${p} is at ${C(A)}. ${q} is ${dirWord} ${p}, and the line ${p}${q} is ${len} units long. What are the coordinates of ${q}?`;
        const solution = `${horiz ? 'Moving across changes only x' : 'Moving up or down changes only y'}. ${horiz ? 'x' : 'y'} = ${n(horiz ? A[0] : A[1])} ${sgn > 0 ? '+' : '-'} ${len} = ${n(horiz ? B[0] : B[1])}${(horiz ? A[0] * B[0] : A[1] * B[1]) < 0 ? ' (this crosses zero)' : ''}; ${horiz ? 'y' : 'x'} stays ${n(horiz ? A[1] : A[0])}. Answer: ${C(B)}`;
        const off = horiz ? [sgn * len, 0] : [0, sgn * len];
        const distractors = [
          { text: C(sub(A, off)), code: 'TRANS-WRONG-DIRECTION', why: `This point is ${len} units the other way. ${q} is ${dirWord} ${p}, so ${horiz ? 'x' : 'y'} must ${sgn > 0 ? 'go up' : 'go down'}.` },
          { text: C(add(A, [off[1], off[0]])), code: 'TRANS-WRONG-AXIS', why: `This changes the ${horiz ? 'y' : 'x'}-coordinate. A ${horiz ? 'horizontal' : 'vertical'} line keeps the same ${horiz ? 'y' : 'x'}, so only ${horiz ? 'x' : 'y'} changes.` },
          { text: C(add(A, horiz ? [sgn * (len - 1), 0] : [0, sgn * (len - 1)])), code: 'COORD-COUNT-POINTS', why: `This line would be only ${len - 1} units long: it looks like you counted ${len} grid points, including the start. Count ${len} jumps.` },
        ];
        const diagram = { ...grid([A, B]), points: [{ at: A, label: p }] };
        try { return { type: 'mcq', prompt, ...choices(rng, C(B), distractors, nearP(B, 'Count the units from the start point.')), solution, diagram, marks: 2 }; } catch { continue; }
      }
      const s = segment(rng, d === 2);
      const len = Math.abs(s.b - s.a);
      const prompt = `A line is drawn from ${p}${C(s.A)} to ${q}${C(s.B)}. How many units long is ${p}${q}?`;
      const axis = s.horiz ? 'x' : 'y';
      const solution = d === 2
        ? `Both points have the same ${s.horiz ? 'y' : 'x'}-coordinate, so the line is ${s.horiz ? 'horizontal' : 'vertical'}. It crosses the ${s.horiz ? 'y' : 'x'}-axis: from ${axis} = ${n(Math.min(s.a, s.b))} to 0 is ${countOf(-Math.min(s.a, s.b), 'unit')}, and from 0 to ${n(Math.max(s.a, s.b))} is ${countOf(Math.max(s.a, s.b), 'unit')}. ${n(-Math.min(s.a, s.b))} + ${n(Math.max(s.a, s.b))} = ${len}. Answer: ${len}`
        : `Both points have the same ${s.horiz ? 'y' : 'x'}-coordinate, so the line is ${s.horiz ? 'horizontal' : 'vertical'}. Its length is the difference between the ${axis}-coordinates: ${n(Math.max(s.a, s.b))} - ${term(n(Math.min(s.a, s.b)))} = ${len}. Answer: ${len}`;
      const items = [
        { text: String(len + 1), code: 'COORD-COUNT-POINTS', why: `It looks like you counted the grid points from one end to the other (${len + 1}). The length is the number of jumps between them: ${len}.` },
        d === 2 ? { text: String(Math.abs(Math.abs(s.b) - Math.abs(s.a))), code: 'NEG-DIFF-ADD-SIGNS', why: `It looks like you took ${Math.min(Math.abs(s.a), Math.abs(s.b))} from ${Math.max(Math.abs(s.a), Math.abs(s.b))}. The line crosses zero, so add the parts on each side: ${Math.abs(s.a)} + ${Math.abs(s.b)} = ${len}.` }
          : { text: String(Math.abs(s.a + s.b)), code: 'OP-SWAP', why: `It looks like you added the ${axis}-coordinates. The length is the DIFFERENCE between them: ${n(Math.max(s.a, s.b))} - ${term(n(Math.min(s.a, s.b)))}.` },
      ];
      const diagram = { ...grid([s.A, s.B]), points: [{ at: s.A, label: p }, { at: s.B, label: q }], segments: [{ from: s.A, to: s.B }] };
      try {
        if (rng.chance(0.5)) {
          const tm = typedMisconceptions(String(len), items, { code: d === 2 ? 'NEG-DIFF-ADD-SIGNS' : 'COORD-COUNT-POINTS', why: d === 2 ? 'When a line crosses an axis, add the distances on each side of zero.' : 'Find the difference between the coordinates that change; count jumps, not points.' });
          return { type: 'numeric', prompt, answer: numericAnswer(len, [String(len), countOf(len, 'unit')]), solution, ...tm, diagram };
        }
        const unitsText = items.map((it) => ({ ...it, text: countOf(it.text, 'unit') }));
        const nearL = (i) => { const v = len + (i % 2 ? -1 : 1) * Math.ceil(i / 2) + 1; return v > 0 && !promptHas(prompt, v) ? nearMiss(countOf(v, 'unit'), 'Count the jumps between the two ends, not the grid points.') : null; };
        return { type: 'mcq', prompt, ...choices(rng, countOf(len, 'unit'), unitsText, nearL), solution: solution.replace(/Answer: \d+$/, `Answer: ${countOf(len, 'unit')}`), diagram };
      } catch { /* draw again */ }
    }
    throw new Error('no question');
  },
};

// ---------------------------------------------------------------- g06 midpoint

const midpoint = {
  id: 'm13.midpoint', topicId: T, subtopicId: 'm13-s2', skill: SK.mid,
  title: 'Midpoint of a horizontal or vertical line (D2 crosses an axis or ends in .5; D3 find the other end)',
  difficulties: [1, 2, 3],
  check: {},
  make(rng, d) {
    const [p, q] = rng.pick([['A', 'B'], ['P', 'Q'], ['R', 'S'], ['K', 'L'], ['C', 'D']]);
    for (let t = 0; t < 300; t++) {
      if (d === 3) {
        const horiz = rng.chance(0.5);
        const A = [nz(rng, -7, 7), nz(rng, -7, 7)];
        const half = (rng.chance(0.5) ? 1 : -1) * rng.int(2, 5);
        const M = horiz ? [A[0] + half, A[1]] : [A[0], A[1] + half];
        const B = horiz ? [A[0] + 2 * half, A[1]] : [A[0], A[1] + 2 * half];
        if (Math.abs(B[0]) > 8 || Math.abs(B[1]) > 8 || Math.abs(M[0]) > 8 || Math.abs(M[1]) > 8) continue;
        if (!(A[0] * B[0] < 0 || A[1] * B[1] < 0) && rng.chance(0.6)) continue; // mostly across an axis
        const prompt = `M is the midpoint of the line ${p}${q}. ${p} is ${C(A)} and M is ${C(M)}. What are the coordinates of ${q}?`;
        const step = sub(M, A);
        const solution = `From ${p} to M is ${moveText(step)}. M is halfway, so ${q} is the same distance again past M: ${C(M)} → ${C(B)}. Answer: ${C(B)}`;
        const mid2 = [(A[0] + M[0]) / 2, (A[1] + M[1]) / 2];
        const distractors = [
          { text: C(mid2), code: 'MID-WRONG-WAY', why: `This is halfway between ${p} and M. M is already the middle of ${p}${q}, so ${q} is as far past M as ${p} is before it.` },
          { text: C(sub(A, step)), code: 'TRANS-WRONG-DIRECTION', why: `This goes the wrong way from ${p}. ${q} is on the other side of M, so keep going in the direction from ${p} to M.` },
          { text: C([B[1], B[0]]), code: 'COORD-SWAP', why: 'The right numbers, but the wrong way round. Write x first.' },
        ];
        const diagram = { ...grid([A, M, B]), points: [{ at: A, label: p }, { at: M, label: 'M' }], segments: [{ from: A, to: M }] };
        try { return { type: 'mcq', prompt, ...choices(rng, C(B), distractors, nearP(B, 'Go past M by the same distance as from the first end to M.')), solution, diagram, marks: 2 }; } catch { continue; }
      }
      const s = segment(rng, d === 2 && rng.chance(0.7), d === 1 ? 9 : 8);
      const diff = Math.abs(s.b - s.a);
      if (d === 1 && (diff % 2 || s.a < 0 || s.b < 0 || diff < 4)) continue;
      if (d === 2 && diff < 3) continue;
      const m = (s.a + s.b) / 2;
      const P = s.horiz ? [m, s.A[1]] : [s.A[0], m];
      const fixed = s.horiz ? s.A[1] : s.A[0];
      const mk = (v) => (s.horiz ? [v, fixed] : [fixed, v]);
      const axis = s.horiz ? 'x' : 'y';
      const prompt = `What is the midpoint of the line joining ${C(s.A)} and ${C(s.B)}?`;
      const lo = Math.min(s.a, s.b);
      const solution = `The line is ${s.horiz ? 'horizontal' : 'vertical'}, so the midpoint has ${s.horiz ? 'y' : 'x'} = ${n(fixed)}. Halfway between ${axis} = ${n(s.a)} and ${axis} = ${n(s.b)}: (${n(s.a)} + ${term(n(s.b))}) ÷ 2 = ${n(m)}. (Or: the length is ${diff}, half of it is ${n(diff / 2)}, and ${n(lo)} + ${n(diff / 2)} = ${n(m)}.) Answer: ${C(P)}`;
      const distractors = [
        { text: C(mk(diff / 2)), code: 'MID-HALF-DIFF', why: `${n(diff / 2)} is half the LENGTH of the line. Count that far on from the start, ${axis} = ${n(lo)}: ${n(lo)} + ${n(diff / 2)} = ${n(m)}.` },
        { text: C(mk(s.a + s.b)), code: 'MID-NO-HALVE', why: `You added the ${axis}-coordinates (${n(s.a)} + ${term(n(s.b))} = ${n(s.a + s.b)}) but did not halve the total.` },
        { text: C(mk(diff)), code: 'MID-LENGTH', why: `${diff} is the length of the line. The midpoint is only half of that distance from one end.` },
        { text: C([P[1], P[0]]), code: 'COORD-SWAP', why: 'The numbers are the wrong way round. Write the x-coordinate first.' },
      ];
      const diagram = { ...grid([s.A, s.B]), points: [{ at: s.A }, { at: s.B }], segments: [{ from: s.A, to: s.B }] };
      try {
        if (d === 2 && rng.chance(0.3)) return shortCoord(prompt, P, distractors, { code: 'MID-HALF-DIFF', why: 'Halve the length, then count that far on from the start (or add the two ends and halve).' }, { solution, diagram });
        return { type: 'mcq', prompt, ...choices(rng, C(P), distractors, nearP(P, 'Add the two end coordinates and halve.')), solution, diagram };
      } catch { /* draw again */ }
    }
    throw new Error('no question');
  },
};

// ---------------------------------------------------------------- g07 perimeter and area from coordinates

const perimArea = {
  id: 'm13.perimeter-area', topicId: T, subtopicId: 'm13-s2', skill: SK.perim,
  title: 'Perimeter or area of a rectangle from its corners (D3: across both axes, or a right-angled triangle)',
  difficulties: [2, 3],
  check: { min: 0, integer: true },
  make(rng, d) {
    for (let t = 0; t < 300; t++) {
      const tri = d === 3 && rng.chance(0.35);
      let x1; let x2; let y1; let y2;
      if (d === 2) { // one axis crossed at most
        x1 = rng.int(-6, 4); x2 = x1 + rng.int(2, 8); y1 = rng.int(0, 4); y2 = y1 + rng.int(2, 6);
        if (rng.chance(0.5)) [y1, y2] = [-y2, -y1];
        if (rng.chance(0.4)) { [x1, x2, y1, y2] = [y1, y2, x1, x2]; }
      } else { x1 = -rng.int(1, 6); x2 = rng.int(1, 7); y1 = -rng.int(1, 6); y2 = rng.int(1, 6); }
      const w = x2 - x1; const h = y2 - y1;
      if (w === h || w > 12 || h > 12 || Math.max(Math.abs(x1), Math.abs(x2), Math.abs(y1), Math.abs(y2)) > 8) continue;
      const crossX = x1 < 0 && x2 > 0; const crossY = y1 < 0 && y2 > 0;
      const wN = crossX ? Math.abs(Math.abs(x2) - Math.abs(x1)) : w; const hN = crossY ? Math.abs(Math.abs(y2) - Math.abs(y1)) : h;
      let pts = [[x1, y1], [x2, y1], [x2, y2], [x1, y2]];
      if (tri) pts = rng.pick([[[x1, y1], [x2, y1], [x1, y2]], [[x1, y1], [x2, y1], [x2, y2]], [[x1, y2], [x2, y2], [x1, y1]], [[x2, y2], [x1, y2], [x2, y1]]]);
      const askArea = tri || rng.chance(0.5);
      const ans = tri ? (w * h) / 2 : askArea ? w * h : 2 * (w + h);
      if (!Number.isInteger(ans)) continue;
      const U = askArea ? 'cm^2' : 'cm';
      const show = (v) => `${v} ${U}`;
      const shape = tri ? 'right-angled triangle' : 'rectangle';
      const prompt = `A ${shape} has corners at ${pts.slice(0, -1).map(C).join(', ')} and ${C(pts[pts.length - 1])}. Each square on the grid is 1 cm by 1 cm. What is the ${askArea ? 'area' : 'perimeter'} of the ${tri ? 'triangle' : 'rectangle'}?`;
      const across = `Width: from x = ${n(x1)} to x = ${n(x2)} is ${w} cm${crossX ? ` (${-x1} + ${x2})` : ''}. Height: from y = ${n(y1)} to y = ${n(y2)} is ${h} cm${crossY ? ` (${-y1} + ${y2})` : ''}.`;
      const solution = `${across} ${tri ? `The triangle is half of a ${w} cm by ${h} cm rectangle: ${w} x ${h} ÷ 2 = ${ans} cm^2.` : askArea ? `Area = ${w} x ${h} = ${ans} cm^2.` : `Perimeter = ${w} + ${h} + ${w} + ${h} = ${ans} cm.`} Answer: ${show(ans)}`;
      const distractors = [];
      if (tri) {
        distractors.push({ text: show(w * h), code: 'AREA-TRI-NO-HALF', why: `${w} x ${h} = ${w * h} is the area of the whole rectangle. The triangle is half of it.` });
        distractors.push({ text: show(((w + 1) * (h + 1)) / 2), code: 'COORD-COUNT-POINTS', why: `It looks like the sides were counted as ${w + 1} and ${h + 1} by counting grid points. Count the units between the corners: ${w} and ${h}.` });
        if (wN * hN !== w * h && wN > 0 && hN > 0) distractors.push({ text: show((wN * hN) / 2), code: 'NEG-DIFF-ADD-SIGNS', why: `A side that crosses an axis is longer than the difference of the numbers: from ${n(crossX ? x1 : y1)} to ${n(crossX ? x2 : y2)} is ${crossX ? w : h} units, not ${crossX ? wN : hN}.` });
      } else if (askArea) {
        distractors.push({ text: show(2 * (w + h)), code: 'AREA-PERIM-SWAP', why: `${2 * (w + h)} is the perimeter (the distance all the way round). The area is width x height.` });
        distractors.push({ text: show((w + 1) * (h + 1)), code: 'COORD-COUNT-POINTS', why: `It looks like you counted grid points (${w + 1} and ${h + 1}) instead of units. The sides are ${w} cm and ${h} cm.` });
        if (wN * hN !== w * h && wN > 0 && hN > 0) distractors.push({ text: show(wN * hN), code: 'NEG-DIFF-ADD-SIGNS', why: `A side that crosses an axis: from ${n(crossX ? x1 : y1)} to ${n(crossX ? x2 : y2)} is ${crossX ? w : h} units (add the parts each side of zero), not ${crossX ? wN : hN}.` });
      } else {
        distractors.push({ text: show(w * h), code: 'AREA-PERIM-SWAP', why: `${w * h} is the area (width x height). The perimeter is the distance all the way round: add all four sides.` });
        distractors.push({ text: show(w + h), code: 'PERIM-TWO-SIDES', why: `${w} + ${h} is only two of the four sides. Add all four: ${w} + ${h} + ${w} + ${h}.` });
        distractors.push({ text: show(2 * (w + h) + 4), code: 'COORD-COUNT-POINTS', why: `It looks like you counted grid points (${w + 1} and ${h + 1}) instead of units. The sides are ${w} cm and ${h} cm.` });
        if (wN + hN !== w + h && wN > 0 && hN > 0) distractors.push({ text: show(2 * (wN + hN)), code: 'NEG-DIFF-ADD-SIGNS', why: `A side that crosses an axis: from ${n(crossX ? x1 : y1)} to ${n(crossX ? x2 : y2)} is ${crossX ? w : h} units, not ${crossX ? wN : hN}.` });
      }
      const diagram = { ...grid(pts), polygons: [{ points: pts }], points: pts.map((pp) => ({ at: pp })) };
      try {
        if (d === 3 && rng.chance(0.35)) {
          const tm = typedMisconceptions(String(ans), distractors.map((x) => ({ ...x, text: x.text.replace(` ${U}`, '') })), { code: tri ? 'AREA-TRI-NO-HALF' : 'AREA-PERIM-SWAP', why: 'Find the width and height from the coordinates first (count across zero), then use the right rule.' });
          return { type: 'numeric', prompt, answer: numericAnswer(ans, [String(ans), show(ans)]), solution, ...tm, diagram, marks: 2 };
        }
        return { type: 'mcq', prompt, ...choices(rng, show(ans), distractors, (i) => { const v = ans + (i % 2 ? 2 : -2) * Math.ceil(i / 2); return v > 0 && !promptHas(prompt, v) ? nearMiss(show(v), 'Find the width and height from the coordinates (count across zero), then use the rule.') : null; }), solution, diagram, marks: 2 };
      } catch { /* draw again */ }
    }
    throw new Error('no question');
  },
};

// ---------------------------------------------------------------- g08 translations

/** "4 units right and 3 units down" (a part with 0 is left out). */
function moveText([dx, dy]) {
  const parts = [];
  if (dx) parts.push(`${units(Math.abs(dx))} ${dx > 0 ? 'right' : 'left'}`);
  if (dy) parts.push(`${units(Math.abs(dy))} ${dy > 0 ? 'up' : 'down'}`);
  return parts.join(' and ');
}

const translate = {
  id: 'm13.translate', topicId: T, subtopicId: 'm13-s3', skill: SK.trans,
  title: 'Translate a point (D1), a corner of a shape (D2), or a shape given one corner\'s move (D3)',
  difficulties: [1, 2, 3],
  check: {},
  make(rng, d) {
    for (let t = 0; t < 300; t++) {
      if (d === 1) {
        const P = [nz(rng, -6, 6), nz(rng, -6, 6)];
        const k = rng.int(1, 8);
        const horiz = rng.chance(0.5); const s = rng.chance(0.5) ? 1 : -1;
        const m = horiz ? [s * k, 0] : [0, s * k];
        const ans = add(P, m);
        if (Math.abs(ans[0]) > 8 || Math.abs(ans[1]) > 8 || (ans[0] === 0 && ans[1] === 0)) continue;
        const L = rng.pick(['P', 'A', 'Q', 'K', 'T']);
        const prompt = `Point ${L}${C(P)} is translated ${moveText(m)}. What are the coordinates of its image?`;
        const solution = `Moving ${horiz ? (s > 0 ? 'right adds to' : 'left takes away from') : (s > 0 ? 'up adds to' : 'down takes away from')} the ${horiz ? 'x' : 'y'}-coordinate: ${n(horiz ? P[0] : P[1])} ${s > 0 ? '+' : '-'} ${k} = ${n(horiz ? ans[0] : ans[1])}. The ${horiz ? 'y' : 'x'}-coordinate does not change. Answer: ${C(ans)}`;
        const distractors = [
          { text: C(add(P, [m[1], m[0]])), code: 'TRANS-WRONG-AXIS', why: `This moves the point ${horiz ? (s > 0 ? 'up' : 'down') : (s > 0 ? 'right' : 'left')}. Moving ${horiz ? 'left or right changes x' : 'up or down changes y'}, not ${horiz ? 'y' : 'x'}.` },
          { text: C(sub(P, m)), code: 'TRANS-WRONG-DIRECTION', why: `This moves the point ${k} the wrong way. ${horiz ? (s > 0 ? 'Right means add to x' : 'Left means take away from x') : (s > 0 ? 'Up means add to y' : 'Down means take away from y')}.` },
          { text: C(add(P, [s * k, s * k])), code: 'TRANS-BOTH-COORDS', why: `Only ${horiz ? 'x' : 'y'} should change. The move is only ${horiz ? 'across' : 'up or down'}, so ${horiz ? 'y' : 'x'} stays ${n(horiz ? P[1] : P[0])}.` },
        ];
        const diagram = { ...grid([P, ans]), points: [{ at: P, label: L }] };
        try {
          if (rng.chance(0.3)) return shortCoord(prompt, ans, distractors, { code: 'TRANS-WRONG-DIRECTION', why: 'Right and up add; left and down take away. Change only the coordinate for the direction of the move.' }, { solution, diagram });
          return { type: 'mcq', prompt, ...choices(rng, C(ans), distractors, nearP(ans, 'Count the move one square at a time.')), solution, diagram };
        } catch { continue; }
      }
      // a triangle or rectangle
      const rect = rng.chance(0.4);
      const o = [rng.int(-6, 4), rng.int(-6, 4)];
      const w = rng.int(1, 4) * (rng.chance(0.5) ? 1 : -1); const h = rng.int(1, 4) * (rng.chance(0.5) ? 1 : -1);
      const shp = rect ? [o, add(o, [w, 0]), add(o, [w, h]), add(o, [0, h])] : rng.pick([[o, add(o, [w, 0]), add(o, [0, h])], [o, add(o, [w, 0]), add(o, [w, h])]]);
      const names = rect ? 'ABCD' : 'ABC';
      const m = [nz(rng, -6, 6), nz(rng, -6, 6)];
      if (Math.abs(m[0]) === Math.abs(m[1])) continue;
      const img = shp.map((p) => add(p, m));
      if ([...shp, ...img].some((p) => Math.abs(p[0]) > 8 || Math.abs(p[1]) > 8)) continue;
      const ki = rng.int(1, shp.length - 1); // ask about this corner
      const V = shp[ki]; const ans = img[ki];
      const label = names[ki];
      const shapeName = rect ? 'Rectangle' : 'Triangle';
      const listed = `${shp.map((p, i) => `${names[i]}${C(p)}`).slice(0, -1).join(', ')} and ${names[shp.length - 1]}${C(shp[shp.length - 1])}`;
      const diagram = { ...grid([...shp, ...img]), polygons: [{ points: shp }], points: shp.map((p, i) => ({ at: p, label: names[i] })) };
      if (d === 2) {
        const prompt = `${shapeName} ${names} has corners ${listed}. It is translated ${moveText(m)}. What are the coordinates of the image of ${label}?`;
        const solution = `${moveText(m)}: x changes by ${m[0] > 0 ? '+' : '-'}${Math.abs(m[0])} and y by ${m[1] > 0 ? '+' : '-'}${Math.abs(m[1])}. ${label}${C(V)} → (${n(V[0])} ${m[0] > 0 ? '+' : '-'} ${Math.abs(m[0])}, ${n(V[1])} ${m[1] > 0 ? '+' : '-'} ${Math.abs(m[1])}) = ${C(ans)}. Answer: ${C(ans)}`;
        const distractors = [
          { text: C(add(V, [-m[0], m[1]])), code: 'TRANS-WRONG-DIRECTION', why: `This moves ${units(Math.abs(m[0]))} ${m[0] > 0 ? 'LEFT' : 'RIGHT'}. ${m[0] > 0 ? 'Right means add to x' : 'Left means take away from x'}.` },
          { text: C(add(V, [m[0], -m[1]])), code: 'TRANS-WRONG-DIRECTION', why: `This moves ${units(Math.abs(m[1]))} ${m[1] > 0 ? 'DOWN' : 'UP'}. ${m[1] > 0 ? 'Up means add to y' : 'Down means take away from y'}.` },
          { text: C(add(V, [Math.sign(m[0]) * Math.abs(m[1]), Math.sign(m[1]) * Math.abs(m[0])])), code: 'TRANS-WRONG-AXIS', why: `The two amounts have been swapped. The move is ${moveText(m)}: ${Math.abs(m[0])} across and ${Math.abs(m[1])} up or down.` },
          { text: C(sub(V, m)), code: 'TRANS-WRONG-DIRECTION', why: `This moves the opposite way in both directions (${moveText([-m[0], -m[1]])}).` },
        ];
        try {
          if (rng.chance(0.3)) return shortCoord(prompt, ans, distractors, { code: 'TRANS-WRONG-DIRECTION', why: 'Right and up add; left and down take away.' }, { solution, diagram });
          return { type: 'mcq', prompt, ...choices(rng, C(ans), distractors, nearP(ans, 'Apply the move to x and to y.')), solution, diagram };
        } catch { continue; }
      }
      // D3: one corner's image is given; find another corner's image
      const k0 = 0;
      const prompt = `${shapeName} ${names} has corners ${listed}. It is translated so that ${names[k0]} moves to ${C(img[k0])}. What are the coordinates of the image of ${label}?`;
      const solution = `First find the translation: ${names[k0]}${C(shp[k0])} to ${C(img[k0])} is ${moveText(m)}. Every corner moves the same way: ${label}${C(V)} → ${C(ans)}. Answer: ${C(ans)}`;
      const distractors = [
        { text: C(sub(V, m)), code: 'TRANS-WRONG-DIRECTION', why: `This moves ${label} the opposite way (${moveText([-m[0], -m[1]])}). ${names[k0]} went ${moveText(m)}, so ${label} does the same.` },
        { text: C(add(V, [Math.sign(m[0]) * Math.abs(m[1]), Math.sign(m[1]) * Math.abs(m[0])])), code: 'TRANS-WRONG-AXIS', why: `The two amounts have been swapped. The move is ${Math.abs(m[0])} across and ${Math.abs(m[1])} up or down.` },
        { text: C(add(V, [m[0], -m[1]])), code: 'TRANS-WRONG-DIRECTION', why: `The up/down part is the wrong way. ${names[k0]} moved ${units(Math.abs(m[1]))} ${m[1] > 0 ? 'up' : 'down'}.` },
      ];
      const dia3 = { ...diagram, points: [...diagram.points, { at: img[k0], label: `${names[k0]}'`, style: 'cross' }] };
      // no wrong answer may sit on a point that is already plotted (such as A')
      const plotted = dia3.points.map((pt) => C(pt.at));
      for (let i = distractors.length - 1; i >= 0; i--) if (plotted.includes(distractors[i].text)) distractors.splice(i, 1);
      const near3 = nearP(ans, 'Find the move first, then apply it.');
      try {
        if (rng.chance(0.5)) return shortCoord(prompt, ans, distractors, { code: 'TRANS-WRONG-DIRECTION', why: `Find the move from ${names[k0]} to its image first, then do the same move to ${label}.` }, { solution, diagram: dia3, marks: 2 });
        return { type: 'mcq', prompt, ...choices(rng, C(ans), distractors, (i) => { const x = near3(i); return plotted.includes(x.text) ? null : x; }), solution, diagram: dia3, marks: 2 };
      } catch { /* draw again */ }
    }
    throw new Error('no question');
  },
};

// ---------------------------------------------------------------- describe a translation

const describe = {
  id: 'm13.describe-translation', topicId: T, subtopicId: 'm13-s3', skill: SK.describe,
  title: 'Describe the translation from a point to its image (D3: one move for two moves)',
  difficulties: [2, 3],
  check: {},
  make(rng, d) {
    for (let t = 0; t < 300; t++) {
      if (d === 2) {
        const P = [nz(rng, -7, 7), nz(rng, -7, 7)];
        const m = [nz(rng, -8, 8), nz(rng, -8, 8)];
        const Q = add(P, m);
        if (Math.abs(Q[0]) > 8 || Math.abs(Q[1]) > 8 || Q[0] === 0 || Q[1] === 0 || Math.abs(m[0]) === Math.abs(m[1])) continue;
        const crossX = P[0] * Q[0] < 0; const crossY = P[1] * Q[1] < 0;
        const prompt = `Point P${C(P)} moves to its image P'${C(Q)} by a translation. Describe the translation.`;
        const solution = `Change in x: ${n(Q[0])} - ${term(n(P[0]))} = ${n(m[0])}, so ${units(Math.abs(m[0]))} ${m[0] > 0 ? 'right' : 'left'}. Change in y: ${n(Q[1])} - ${term(n(P[1]))} = ${n(m[1])}, so ${units(Math.abs(m[1]))} ${m[1] > 0 ? 'up' : 'down'}.${crossX || crossY ? ' When the point crosses an axis, count the units on both sides of zero.' : ''} Answer: ${moveText(m)}`;
        const distractors = [
          { text: moveText([-m[0], -m[1]]), code: 'TRANS-WRONG-DIRECTION', why: `This is the move from the image back to the start. From ${C(P)} to ${C(Q)}, x ${m[0] > 0 ? 'gets bigger (right)' : 'gets smaller (left)'} and y ${m[1] > 0 ? 'gets bigger (up)' : 'gets smaller (down)'}.` },
          { text: moveText([Math.sign(m[0]) * Math.abs(m[1]), Math.sign(m[1]) * Math.abs(m[0])]), code: 'TRANS-WRONG-AXIS', why: `The two amounts are swapped. The change in x is ${Math.abs(m[0])} and the change in y is ${Math.abs(m[1])}.` },
        ];
        const nx = crossX ? Math.sign(m[0]) * Math.abs(Math.abs(Q[0]) - Math.abs(P[0])) : m[0];
        const ny = crossY ? Math.sign(m[1]) * Math.abs(Math.abs(Q[1]) - Math.abs(P[1])) : m[1];
        if ((crossX || crossY) && nx && ny) distractors.push({ text: moveText([nx, ny]), code: 'NEG-DIFF-ADD-SIGNS', why: `The point crosses ${crossX && crossY ? 'both axes' : 'an axis'}. From ${crossX ? `x = ${n(P[0])} to x = ${n(Q[0])}` : `y = ${n(P[1])} to y = ${n(Q[1])}`} you pass 0, so add the parts on each side: ${crossX ? `${Math.abs(P[0])} + ${Math.abs(Q[0])}` : `${Math.abs(P[1])} + ${Math.abs(Q[1])}`}.` });
        distractors.push({ text: moveText([m[0], -m[1]]), code: 'TRANS-WRONG-DIRECTION', why: `Check the up/down part: y goes from ${n(P[1])} to ${n(Q[1])}, so the point moves ${m[1] > 0 ? 'up' : 'down'}.` });
        const diagram = { ...grid([P, Q]), points: [{ at: P, label: 'P' }, { at: Q, label: "P'", style: 'cross' }] };
        try { return { type: 'mcq', prompt, ...choices(rng, moveText(m), distractors, null), solution, diagram }; } catch { continue; }
      }
      // D3: two translations combined
      const P = [nz(rng, -5, 5), nz(rng, -5, 5)];
      const m1 = [nz(rng, -6, 6), nz(rng, -6, 6)];
      const m2 = [-Math.sign(m1[0]) * rng.int(1, 6), -Math.sign(m1[1]) * rng.int(1, 6)];
      const net = add(m1, m2);
      if (!net[0] || !net[1] || Math.abs(net[0]) === Math.abs(net[1])) continue;
      const P1 = add(P, m1); const P2 = add(P1, m2);
      if ([P1, P2].some((p) => Math.abs(p[0]) > 8 || Math.abs(p[1]) > 8)) continue;
      const prompt = `Point P${C(P)} is translated ${moveText(m1)} to P'. Then P' is translated ${moveText(m2)} to P''. Which single translation would move P straight to P''?`;
      const solution = `Across: ${moveText([m1[0], 0])} then ${moveText([m2[0], 0])} leaves ${moveText([net[0], 0])}. Up/down: ${moveText([0, m1[1]])} then ${moveText([0, m2[1]])} leaves ${moveText([0, net[1]])}. (Check: P' is ${C(P1)} and P'' is ${C(P2)}.) Answer: ${moveText(net)}`;
      const all = [Math.sign(net[0]) * (Math.abs(m1[0]) + Math.abs(m2[0])), Math.sign(net[1]) * (Math.abs(m1[1]) + Math.abs(m2[1]))];
      const distractors = [
        { text: moveText(all), code: 'TRANS-ADD-ALL', why: `It looks like you added all the amounts. ${moveText([m1[0], 0])} and then ${moveText([m2[0], 0])} partly cancel out, and so do the up and down moves.` },
        { text: moveText([-net[0], -net[1]]), code: 'TRANS-WRONG-DIRECTION', why: 'This is the move from P\'\' back to P: the opposite direction.' },
        { text: moveText([Math.sign(net[0]) * Math.abs(net[1]), Math.sign(net[1]) * Math.abs(net[0])]), code: 'TRANS-WRONG-AXIS', why: `The amounts are swapped: the overall move across is ${Math.abs(net[0])} and up or down is ${Math.abs(net[1])}.` },
        { text: moveText(m1), code: 'TRANS-ONE-STEP', why: 'This is only the first move. P\'\' comes after the second move as well.' },
      ];
      const diagram = { ...grid([P, P1, P2]), points: [{ at: P, label: 'P' }, { at: P1, label: "P'" }], segments: [{ from: P, to: P1, arrow: true }] };
      try { return { type: 'mcq', prompt, ...choices(rng, moveText(net), distractors, null), solution, diagram, marks: 2 }; } catch { /* draw again */ }
    }
    throw new Error('no question');
  },
};

// ---------------------------------------------------------------- find the original point

const original = {
  id: 'm13.translation-original', topicId: T, subtopicId: 'm13-s3', skill: SK.original,
  title: 'Find the point before a translation (D3: two moves to undo)',
  difficulties: [2, 3],
  check: {},
  make(rng, d) {
    for (let t = 0; t < 300; t++) {
      const O = [nz(rng, -6, 6), nz(rng, -6, 6)];
      const m1 = [nz(rng, -5, 5), nz(rng, -5, 5)];
      if (Math.abs(m1[0]) === Math.abs(m1[1])) continue;
      if (d === 2) {
        const I = add(O, m1);
        if (Math.abs(I[0]) > 8 || Math.abs(I[1]) > 8) continue;
        const prompt = `A point is translated ${moveText(m1)}. Its image is at ${C(I)}. Where was the point before the translation?`;
        const solution = `Work backwards: undo ${moveText([m1[0], 0])} by going ${moveText([-m1[0], 0])}, and undo ${moveText([0, m1[1]])} by going ${moveText([0, -m1[1]])}. x = ${n(I[0])} ${m1[0] > 0 ? '-' : '+'} ${Math.abs(m1[0])} = ${n(O[0])}, y = ${n(I[1])} ${m1[1] > 0 ? '-' : '+'} ${Math.abs(m1[1])} = ${n(O[1])}. Check by translating it forwards. Answer: ${C(O)}`;
        const distractors = [
          { text: C(add(I, m1)), code: 'TRANS-WRONG-DIRECTION', why: `This applies the translation to the image again. To go back, undo it: ${moveText([-m1[0], -m1[1]])}.` },
          { text: C([I[0] - m1[0], I[1] + m1[1]]), code: 'TRANS-WRONG-DIRECTION', why: `The x part is undone correctly, but the y part is not. Undo ${moveText([0, m1[1]])} by going ${moveText([0, -m1[1]])}.` },
          { text: C([I[0] + m1[0], I[1] - m1[1]]), code: 'TRANS-WRONG-DIRECTION', why: `The y part is right, but undoing ${moveText([m1[0], 0])} means going ${moveText([-m1[0], 0])}.` },
          { text: C([I[0] - Math.sign(m1[0]) * Math.abs(m1[1]), I[1] - Math.sign(m1[1]) * Math.abs(m1[0])]), code: 'TRANS-WRONG-AXIS', why: `The amounts are swapped. The move across was ${Math.abs(m1[0])} and the move up or down was ${Math.abs(m1[1])}.` },
        ];
        const diagram = { ...grid([O, I]), points: [{ at: I, label: "P'" }] };
        try {
          if (rng.chance(0.3)) return shortCoord(prompt, O, distractors, { code: 'TRANS-WRONG-DIRECTION', why: 'To work backwards, do the opposite move: left for right and down for up.' }, { solution, diagram });
          return { type: 'mcq', prompt, ...choices(rng, C(O), distractors, nearP(O, 'Undo each part of the move.')), solution, diagram };
        } catch { continue; }
      }
      const m2 = [nz(rng, -5, 5), nz(rng, -5, 5)];
      const I1 = add(O, m1); const I2 = add(I1, m2);
      if ([I1, I2].some((p) => Math.abs(p[0]) > 8 || Math.abs(p[1]) > 8) || eqP(add(m1, m2), [0, 0]) || eqP(m1, m2)) continue;
      const prompt = `A point P is translated ${moveText(m1)}, and then ${moveText(m2)}. It ends at Q${C(I2)}. What were the coordinates of P at the start?`;
      const net = add(m1, m2);
      const solution = `Undo both moves. Undo ${moveText(m2)}: ${C(I2)} → ${C(I1)}. Undo ${moveText(m1)}: ${C(I1)} → ${C(O)}. Check: ${C(O)} moved ${moveText(m1)} and then ${moveText(m2)} ends at ${C(I2)}. Answer: ${C(O)}`;
      const distractors = [
        { text: C(add(I2, net)), code: 'TRANS-WRONG-DIRECTION', why: 'This does the two moves again instead of undoing them. Work backwards: do the opposite of each move.' },
        { text: C(I1), code: 'TRANS-ONE-STEP', why: `This undoes only the second move. Undo the first move (${moveText(m1)}) as well.` },
        { text: C(sub(I2, m1)), code: 'TRANS-ONE-STEP', why: `This undoes only the first move. Undo the second move (${moveText(m2)}) as well.` },
      ];
      const diagram = { ...grid([O, I1, I2]), points: [{ at: I2, label: 'Q' }] };
      try {
        if (rng.chance(0.4)) return shortCoord(prompt, O, distractors, { code: 'TRANS-WRONG-DIRECTION', why: 'Undo the moves in reverse order, each the opposite way.' }, { solution, diagram, marks: 2 });
        return { type: 'mcq', prompt, ...choices(rng, C(O), distractors, nearP(O, 'Undo each move the opposite way.')), solution, diagram, marks: 2 };
      } catch { /* draw again */ }
    }
    throw new Error('no question');
  },
};

export default [readPoint, whichPoint, quadrant, axisDistance, missingVertex, lineLength, midpoint, perimArea, translate, describe, original];
