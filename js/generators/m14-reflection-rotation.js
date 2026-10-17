// m14 Reflection and Rotation: reflecting points and shapes in the axes, in lines x = a and y = b,
// and in the diagonal lines through the origin; finding a mirror line; rotating 90° about a
// vertex; naming the transformation that maps one shape onto another; completing a symmetric shape.
// Patterns follow the CLO's generator guide (section 2, m14). Diagrams are coordinateGrid specs
// built from the same numbers as the answer; the image she has to find is never drawn. Every wrong
// option is made by one named misconception and carries its code.

import { choices, typedMisconceptions, nearMiss, numericAnswer, person } from './core.js';

const T = 'm14-reflection-and-rotation';
const SK = {
  axis: 'reflecting in the x-axis or y-axis', line: 'reflecting in a vertical or horizontal line', diag: 'reflecting in a diagonal line',
  rot: 'rotating 90° about a vertex', describe: 'describing a transformation', sym: 'symmetry in patterns',
};

export const EXTRA_CODES = {
  'REFL-NEGATE-BOTH': 'Changes the sign of both coordinates when reflecting in one line (that is a half turn about the origin)',
  'REFL-PART-SHAPE': 'Reflects only some of the corners of a shape',
  'REFL-DIST-AS-COORD': 'Gives the distance to the mirror line as the new coordinate',
  'REFL-TO-LINE': 'Moves the point onto the mirror line instead of the same distance past it',
  'REFL-NO-CHANGE': 'Leaves a point where it is although it is not on the mirror line',
  'REFL-DIAG-SIGN-STAYS': 'Swaps the coordinates for the diagonal mirror but leaves the minus sign in its old place',
  'REFL-DIAG-SWAP-ONLY': 'For the diagonal line through (1, -1), swaps the coordinates but does not change their signs',
  'MIRROR-DIST': 'Gives the distance between a point and its image instead of the halfway point',
  'MID-HALF-LENGTH': 'Gives half the length of the line as the midpoint coordinate, without counting on from the start',
  'MID-NO-HALVE': 'Adds the two end coordinates but does not halve the total',
  'ROT-180': 'Turns through 180° (a half turn) instead of 90°',
  'TRANSF-ONE-POINT': 'Checks only one corner: the transformation fits that corner but not the whole shape',
};

// ---------------------------------------------------------------- helpers

const n = (v) => (v === 0 ? '0' : String(v));
const C = (p) => `(${n(p[0])}, ${n(p[1])})`;
const eqP = (a, b) => a[0] === b[0] && a[1] === b[1];
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const nz = (rng, lo, hi) => rng.intNot(lo, hi, [0]);
const units = (k) => `${n(k)} ${Math.abs(k) === 1 ? 'unit' : 'units'}`;
const sameSet = (A, B) => A.length === B.length && A.every((p) => B.some((q) => eqP(p, q)));
const DIAG = 'the diagonal mirror line that passes through (0, 0), (1, 1) and (2, 2)';
const DIAG2 = 'the other diagonal mirror line, which passes through (0, 0), (1, -1) and (2, -2)';

function grid(pts, minSpan = 8) {
  const range = (vals) => {
    const pos = vals.every((v) => v > 0);
    let lo = pos ? 0 : Math.min(-2, Math.floor(Math.min(...vals)) - 1);
    let hi = Math.max(2, Math.ceil(Math.max(...vals)) + 1);
    while (hi - lo < minSpan) { hi++; if (hi - lo < minSpan && !pos) lo--; }
    return [lo, hi];
  };
  return { type: 'coordinateGrid', x: range(pts.map((p) => p[0])), y: range(pts.map((p) => p[1])) };
}
const nearP = (P, hint) => (i) => nearMiss(C([P[0] + (i % 2 ? 1 : -1) * Math.ceil(i / 2), P[1] + (i % 3 === 0 ? 1 : 0)]), hint);
function shortCoord(prompt, P, items, common, rest) {
  const ans = C(P);
  const t = typedMisconceptions(ans, items, common);
  return { type: 'short', prompt: `${prompt} Write them like (x, y).`, answer: { accept: [ans, `${n(P[0])},${n(P[1])}`, `${n(P[0])}, ${n(P[1])}`], keywords: [] }, ...t, ...rest };
}
const list = (pts) => pts.map(C).join(', ');
const named = (names, pts) => `${pts.slice(0, -1).map((p, i) => `${names[i]}${C(p)}`).join(', ')} and ${names[pts.length - 1]}${C(pts[pts.length - 1])}`;
/** A right-angled triangle with legs along the grid lines, legs of different lengths (no symmetry). */
function rightTriangle(rng, o, maxLeg = 4) {
  for (;;) {
    const a = rng.int(1, maxLeg) * (rng.chance(0.5) ? 1 : -1); const b = rng.int(1, maxLeg) * (rng.chance(0.5) ? 1 : -1);
    if (Math.abs(a) === Math.abs(b)) continue;
    const tri = [o, add(o, [a, 0]), add(o, [0, b])];
    return rng.chance(0.5) ? tri : [tri[1], tri[2], tri[0]];
  }
}

// reflections and rotations as functions of a point
const reflX = ([x, y]) => [x, -y]; // in the x-axis
const reflY = ([x, y]) => [-x, y]; // in the y-axis
const reflXa = (a) => ([x, y]) => [2 * a - x, y]; // in x = a
const reflYb = (b) => ([x, y]) => [x, 2 * b - y]; // in y = b
const cw = (c) => (p) => { const d = sub(p, c); return add(c, [d[1], -d[0]]); };
const acw = (c) => (p) => { const d = sub(p, c); return add(c, [-d[1], d[0]]); };
const half = (c) => (p) => sub(add(c, c), p);

// ---------------------------------------------------------------- g01 reflect in an axis

const reflectAxis = {
  id: 'm14.reflect-axis', topicId: T, subtopicId: 'm14-s1', skill: SK.axis,
  title: 'Reflect a point (D1) or a triangle (D2) in the x-axis or the y-axis',
  difficulties: [1, 2],
  check: {},
  make(rng, d) {
    for (let t = 0; t < 300; t++) {
      const inY = rng.chance(0.5);
      const f = inY ? reflY : reflX; const g = inY ? reflX : reflY;
      const ax = inY ? 'y-axis' : 'x-axis';
      const line = inY ? { x: 0, label: 'mirror line' } : { y: 0, label: 'mirror line' };
      const how = inY ? 'The y-axis is a vertical mirror: the point flips from one side to the other at the same height, so x changes sign and y stays the same.' : 'The x-axis is a horizontal mirror: the point flips from above to below (or below to above), so y changes sign and x stays the same.';
      if (d === 1) {
        const P = [nz(rng, -7, 7), nz(rng, -7, 7)];
        if (Math.abs(P[0]) === Math.abs(P[1])) continue;
        const L = rng.pick(['P', 'A', 'Q', 'K', 'T', 'R']);
        const ans = f(P);
        const prompt = `Point ${L}${C(P)} is reflected in the ${ax}. What are the coordinates of its image?`;
        const solution = `${how} ${C(P)} → ${C(ans)}. Answer: ${C(ans)}`;
        const distractors = [
          { text: C(g(P)), code: 'REFL-WRONG-AXIS', why: `This is a reflection in the ${inY ? 'x' : 'y'}-axis. The ${ax} is ${inY ? 'vertical, so only x changes' : 'horizontal, so only y changes'}.` },
          { text: C([-P[0], -P[1]]), code: 'REFL-NEGATE-BOTH', why: `Both signs have changed. A reflection in the ${ax} changes only the sign of ${inY ? 'x' : 'y'}.` },
          { text: C([P[1], P[0]]), code: 'COORD-SWAP', why: 'The numbers have swapped places. Reflecting in an axis keeps x first and y second; only one sign changes.' },
        ];
        const diagram = { ...grid([P, ans]), points: [{ at: P, label: L }], lines: [line] };
        try {
          if (rng.chance(0.3)) return shortCoord(prompt, ans, distractors, { code: 'REFL-WRONG-AXIS', why: `Reflecting in the ${ax} changes the sign of ${inY ? 'x' : 'y'} only.` }, { solution, diagram });
          return { type: 'mcq', prompt, ...choices(rng, C(ans), distractors, nearP(ans, 'The image is the same distance from the mirror, on the other side.')), solution, diagram };
        } catch { continue; }
      }
      const o = [nz(rng, -5, 5), nz(rng, -5, 5)];
      const tri = rightTriangle(rng, o);
      if (tri.some((p) => p[0] === 0 || p[1] === 0 || Math.abs(p[0]) > 6 || Math.abs(p[1]) > 6)) continue;
      const img = tri.map(f);
      const k = rng.int(0, 2);
      const part = img.map((p, i) => (i === k ? tri[i] : p));
      const prompt = `Triangle ABC has corners ${named('ABC', tri)}. It is reflected in the ${ax}. Which list gives the corners of the image, A', B' and C'?`;
      const solution = `Reflecting in the ${ax}: keep each ${inY ? 'y' : 'x'}-coordinate and change the sign of each ${inY ? 'x' : 'y'}-coordinate. ${tri.map((p, i) => `${'ABC'[i]}${C(p)} → ${C(img[i])}`).join(', ')}. Answer: ${list(img)}`;
      const distractors = [
        { text: list(tri.map(g)), code: 'REFL-WRONG-AXIS', why: `This is a reflection in the ${inY ? 'x' : 'y'}-axis. Reflecting in the ${ax} changes the sign of ${inY ? 'x' : 'y'} and keeps ${inY ? 'y' : 'x'}.` },
        { text: list(part), code: 'REFL-PART-SHAPE', why: `Every corner must be reflected. ${'ABC'[k]}${C(tri[k])} also moves, to ${C(img[k])}.` },
        { text: list(tri.map(([x, y]) => [-x, -y])), code: 'REFL-NEGATE-BOTH', why: `Both signs have changed in every corner. A reflection in the ${ax} changes only the sign of ${inY ? 'x' : 'y'}.` },
      ];
      const diagram = { ...grid([...tri, ...img]), polygons: [{ points: tri }], points: tri.map((p, i) => ({ at: p, label: 'ABC'[i] })), lines: [line] };
      try { return { type: 'mcq', prompt, ...choices(rng, list(img), distractors, null), solution, diagram }; } catch { /* draw again */ }
    }
    throw new Error('no question');
  },
};

// ---------------------------------------------------------------- g02 reflect in x = a or y = b

const reflectLine = {
  id: 'm14.reflect-line', topicId: T, subtopicId: 'm14-s1', skill: SK.line,
  title: 'Reflect a point in a line x = a or y = b (D3: find the point from its image)',
  difficulties: [2, 3],
  check: {},
  make(rng, d) {
    for (let t = 0; t < 300; t++) {
      const vert = rng.chance(0.5);
      const a = nz(rng, -4, 4);
      const P = [nz(rng, -7, 7), nz(rng, -7, 7)];
      const k = vert ? 0 : 1;
      const dist = Math.abs(P[k] - a);
      if (dist === 0 || dist === Math.abs(a) || Math.abs(P[0]) === Math.abs(P[1])) continue;
      const f = vert ? reflXa(a) : reflYb(a);
      const Q = f(P);
      if (Math.abs(Q[0]) > 9 || Math.abs(Q[1]) > 9) continue;
      const lineName = `${vert ? 'x' : 'y'} = ${n(a)}`;
      const kind = vert ? 'vertical' : 'horizontal';
      const line = vert ? { x: a, label: lineName } : { y: a, label: lineName };
      const side = (v) => (vert ? (v > a ? 'right of' : 'left of') : (v > a ? 'above' : 'below'));
      const c = vert ? 'x' : 'y'; const o = vert ? 'y' : 'x';
      const setK = (pt, v) => (vert ? [v, pt[1]] : [pt[0], v]);
      // D2: P -> image. D3: the image is given; find P (same reflection).
      const from = d === 2 ? P : Q; const ans = d === 2 ? Q : P;
      const L = rng.pick(['P', 'A', 'B', 'K', 'R']);
      const prompt = d === 2
        ? `Point ${L}${C(from)} is reflected in the ${kind} mirror line ${lineName}. What are the coordinates of its image?`
        : `Point ${L} is reflected in the ${kind} mirror line ${lineName}. Its image is ${C(from)}. What are the coordinates of ${L}?`;
      const fv = from[k];
      const solution = `${d === 3 ? 'Reflecting the image back gives the original point. ' : ''}The ${c}-coordinate ${n(fv)} is ${dist} ${dist === 1 ? 'unit' : 'units'} ${side(fv)} the mirror line ${lineName}. The ${d === 2 ? 'image' : 'point'} is ${dist} ${dist === 1 ? 'unit' : 'units'} on the other side: ${c} = ${n(a)} ${ans[k] > a ? '+' : '-'} ${dist} = ${n(ans[k])}. ${o} does not change. Answer: ${C(ans)}`;
      const distractors = [
        { text: C(setK(from, -fv)), code: 'REFL-FROM-ORIGIN', why: `This reflects in the ${vert ? 'y' : 'x'}-axis (${c} = 0). The mirror here is the line ${lineName}, so measure the distance from that line.` },
        { text: C(vert ? reflYb(a)(from) : reflXa(a)(from)), code: 'REFL-WRONG-AXIS', why: `This reflects in the ${vert ? 'horizontal' : 'vertical'} line ${vert ? 'y' : 'x'} = ${n(a)}. The line ${lineName} is ${kind}, so only ${c} changes.` },
        { text: C(setK(from, a)), code: 'REFL-TO-LINE', why: `This point is ON the mirror line. The ${d === 2 ? 'image' : 'original point'} is the same distance from the line as ${C(from)}, but on the other side.` },
        { text: C(setK(from, dist)), code: 'REFL-DIST-AS-COORD', why: `${dist} is the DISTANCE from the point to the mirror line. Count ${dist} on the other side of ${lineName}: ${c} = ${n(ans[k])}.` },
      ];
      const diagram = { ...grid([P, Q, setK(P, a)]), points: [{ at: from, label: d === 2 ? L : `${L}'` }], lines: [line] };
      try {
        if (rng.chance(0.3)) return shortCoord(prompt, ans, distractors, { code: 'REFL-FROM-ORIGIN', why: `Measure the distance from the line ${lineName}, then go the same distance on the other side.` }, { solution, diagram, marks: d === 3 ? 2 : 1 });
        return { type: 'mcq', prompt, ...choices(rng, C(ans), distractors, nearP(ans, 'Count the distance to the mirror line, then the same again past it.')), solution, diagram, marks: d === 3 ? 2 : 1 };
      } catch { /* draw again */ }
    }
    throw new Error('no question');
  },
};

// ---------------------------------------------------------------- g03 find the mirror line

const findMirror = {
  id: 'm14.find-mirror-line', topicId: T, subtopicId: 'm14-s1', skill: SK.line,
  title: 'Find the mirror line from a point and its image',
  difficulties: [3],
  check: {},
  make(rng) {
    for (let t = 0; t < 300; t++) {
      const vert = rng.chance(0.5);
      const a = rng.int(-5, 5);
      const dist = rng.int(1, 6);
      const other = nz(rng, -7, 7);
      const p = a - dist; const q = a + dist;
      if (Math.abs(p) > 9 || Math.abs(q) > 9) continue;
      const [u, v] = rng.chance(0.5) ? [p, q] : [q, p];
      const P = vert ? [u, other] : [other, u]; const Q = vert ? [v, other] : [other, v];
      const c = vert ? 'x' : 'y';
      const prompt = `The point ${C(P)} is reflected in a ${vert ? 'vertical' : 'horizontal'} mirror line and its image is ${C(Q)}. The mirror line is ${c} = ?. What is the missing number?`;
      const solution = `The mirror line is exactly halfway between a point and its image. Halfway between ${c} = ${n(u)} and ${c} = ${n(v)}: (${n(u)} + ${v < 0 ? `(${n(v)})` : n(v)}) ÷ 2 = ${n(a)}. Check: both points are ${dist} ${dist === 1 ? 'unit' : 'units'} from ${c} = ${n(a)}. Answer: ${n(a)}`;
      const items = [
        { text: n(2 * dist), code: 'MIRROR-DIST', why: `${2 * dist} is the distance between the point and its image. The mirror line is halfway between them.` },
        { text: n(dist), code: 'MID-HALF-LENGTH', why: `${dist} is half the distance. Count ${dist} on from ${c} = ${n(Math.min(u, v))} to reach the mirror line.` },
        { text: n(u + v), code: 'MID-NO-HALVE', why: `You added the ${c}-coordinates (${n(u)} + ${n(v)}) but did not halve the total.` },
      ];
      const diagram = { ...grid([P, Q]), points: [{ at: P, label: 'P' }, { at: Q, label: "P'" }] };
      try {
        if (rng.chance(0.6)) {
          const tm = typedMisconceptions(n(a), items, { code: 'MIRROR-DIST', why: 'The mirror line is halfway between the point and its image: add the two coordinates and halve.' });
          return { type: 'numeric', prompt, answer: numericAnswer(a, [n(a), `${c} = ${n(a)}`, `${c}=${n(a)}`]), solution, ...tm, diagram };
        }
        const lt = (x) => ({ ...x, text: `${c} = ${x.text}` });
        return { type: 'mcq', prompt: prompt.replace(` The mirror line is ${c} = ?. What is the missing number?`, ' Which line is the mirror line?'), ...choices(rng, `${c} = ${n(a)}`, items.map(lt), (i) => nearMiss(`${c} = ${n(a + (i % 2 ? 1 : -1) * Math.ceil(i / 2))}`, 'The mirror line is halfway between the point and its image.')), solution: solution.replace(/Answer: \S+$/, `Answer: ${c} = ${n(a)}`), diagram };
      } catch { /* draw again */ }
    }
    throw new Error('no question');
  },
};

// ---------------------------------------------------------------- g04 reflect in y = x (and y = -x)

const reflectDiagonal = {
  id: 'm14.reflect-diagonal', topicId: T, subtopicId: 'm14-s2', skill: SK.diag,
  title: 'Reflect in the diagonal through (1, 1): first quadrant (D1), any point (D2); the other diagonal or working back (D3)',
  difficulties: [1, 2, 3],
  check: {},
  make(rng, d) {
    for (let t = 0; t < 300; t++) {
      const lim = d === 1 ? 7 : 6;
      const P = d === 1 ? [rng.int(1, lim), rng.int(1, lim)] : [nz(rng, -lim, lim), nz(rng, -lim, lim)];
      if (Math.abs(P[0]) === Math.abs(P[1])) continue;
      if (d === 2 && P[0] > 0 && P[1] > 0) continue;
      const [x, y] = P;
      const L = rng.pick(['P', 'A', 'B', 'K', 'Q', 'T']);
      const other = d === 3 && rng.chance(0.5);
      const back = d === 3 && !other;
      const lineSpec = other ? { through: [[0, 0], [1, -1]], label: 'mirror line' } : { through: [[0, 0], [1, 1]], label: 'mirror line' };
      let prompt; let ans; let solution; let distractors;
      if (other) {
        ans = [-y, -x];
        prompt = `Point ${L}${C(P)} is reflected in ${DIAG2}. What are the coordinates of its image?`;
        solution = `For this diagonal mirror, swap the coordinates AND change both signs: ${C(P)} → ${C(ans)}. Check: halfway between them is ${C([(x - y) / 2, (y - x) / 2])}, which is on the mirror line. Answer: ${C(ans)}`;
        distractors = [
          { text: C([y, x]), code: 'REFL-DIAG-SWAP-ONLY', why: 'This only swaps the numbers, which is the reflection in the diagonal through (1, 1). This mirror goes through (1, -1), so both signs change as well.' },
          { text: C([-x, -y]), code: 'REFL-NEGATE-BOTH', why: 'Both signs have changed, but the numbers also need to swap places.' },
          { text: C([x, -y]), code: 'REFL-WRONG-AXIS', why: 'This is a reflection in the x-axis. The mirror here is the sloping line through (1, -1) and (2, -2).' },
          { text: C([-x, y]), code: 'REFL-WRONG-AXIS', why: 'This is a reflection in the y-axis. The mirror here is the sloping line through (1, -1) and (2, -2).' },
        ];
      } else if (back) {
        ans = [y, x];
        prompt = `A point ${L} is reflected in ${DIAG}. Its image is ${C(P)}. What were the coordinates of ${L}?`;
        solution = `Reflecting in this diagonal swaps the coordinates, and reflecting back swaps them again. So ${L} is ${C(ans)}. Check: swapping ${C(ans)} gives ${C(P)}. Answer: ${C(ans)}`;
        distractors = [
          { text: C([-y, -x]), code: 'REFL-DIAG-NEGATE', why: 'This changes the signs as well as swapping. With this diagonal mirror, the signs stay with their numbers.' },
          { text: C(P), code: 'REFL-NO-CHANGE', why: `${C(P)} is the image, not the original. The point is not on the mirror line, so the original is somewhere else: swap the coordinates.` },
          { text: C([Math.sign(x) * Math.abs(y), Math.sign(y) * Math.abs(x)]), code: 'REFL-DIAG-SIGN-STAYS', why: 'The numbers have swapped, but the minus sign stayed in the same place. The sign moves with its number.' },
          { text: C([-x, y]), code: 'REFL-WRONG-AXIS', why: 'This is a reflection in the y-axis. The diagonal mirror swaps the coordinates.' },
        ];
      } else {
        ans = [y, x];
        prompt = `Point ${L}${C(P)} is reflected in ${DIAG}. What are the coordinates of its image?`;
        solution = `In the diagonal mirror line through (0, 0), (1, 1) and (2, 2), the x and y coordinates swap places${d === 2 ? ' and keep their signs' : ''}: ${C(P)} → ${C(ans)}. Answer: ${C(ans)}`;
        distractors = [
          d === 2 ? { text: C([Math.sign(x) * Math.abs(y), Math.sign(y) * Math.abs(x)]), code: 'REFL-DIAG-SIGN-STAYS', why: 'The numbers have swapped, but the minus sign stayed in the same place. Each sign moves with its number.' } : null,
          { text: C([-y, -x]), code: 'REFL-DIAG-NEGATE', why: 'This swaps the numbers AND changes both signs, which is a reflection in the other diagonal (through (1, -1)). For this mirror, just swap.' },
          { text: C(P), code: 'REFL-NO-CHANGE', why: `${L} is not on the mirror line (its coordinates are not equal), so it must move.` },
          { text: C([-x, y]), code: 'REFL-WRONG-AXIS', why: 'This is a reflection in the y-axis. The mirror here is the diagonal line through (1, 1) and (2, 2).' },
          { text: C([x, -y]), code: 'REFL-WRONG-AXIS', why: 'This is a reflection in the x-axis. The mirror here is the diagonal line through (1, 1) and (2, 2).' },
        ].filter(Boolean);
      }
      if (rng.chance(0.5)) distractors = [distractors[0], ...rng.shuffle(distractors.slice(1))];
      const pts = [P, ans, [0, 0]];
      const g = d === 1 ? { type: 'coordinateGrid', x: [0, 8], y: [0, 8] } : grid(pts);
      const diagram = { ...g, points: [{ at: P, label: back ? `${L}'` : L }], lines: [lineSpec] };
      try {
        if (d !== 1 && rng.chance(0.3)) return shortCoord(prompt, ans, distractors, { code: other ? 'REFL-DIAG-SWAP-ONLY' : 'REFL-DIAG-NEGATE', why: other ? 'For the diagonal through (1, -1), swap the coordinates and change both signs.' : 'For the diagonal through (1, 1), swap the coordinates and keep their signs.' }, { solution, diagram, marks: d === 3 ? 2 : 1 });
        return { type: 'mcq', prompt, ...choices(rng, C(ans), distractors, nearP(ans, 'Use the rule for this diagonal mirror.')), solution, diagram, marks: d === 3 ? 2 : 1 };
      } catch { /* draw again */ }
    }
    throw new Error('no question');
  },
};

// ---------------------------------------------------------------- g05 rotate 90° about a vertex

const turnWords = (v) => (v[0] > 0 ? 'right' : v[0] < 0 ? 'left' : v[1] > 0 ? 'up' : 'down');
function offsetWords(v) {
  const parts = [];
  if (v[0]) parts.push(`${Math.abs(v[0])} ${v[0] > 0 ? 'right' : 'left'}`);
  if (v[1]) parts.push(`${Math.abs(v[1])} ${v[1] > 0 ? 'up' : 'down'}`);
  return parts.join(' and ');
}

const rotate = {
  id: 'm14.rotate', topicId: T, subtopicId: 'm14-s3', skill: SK.rot,
  title: 'Rotate 90° about a vertex: a line (D1), a corner of a shape (D2), a far corner or working back (D3)',
  difficulties: [1, 2, 3],
  check: {},
  make(rng, d) {
    for (let t = 0; t < 400; t++) {
      const clockwise = rng.chance(0.5);
      const dir = clockwise ? 'clockwise' : 'anticlockwise';
      const c = [rng.int(-5, 5), rng.int(-5, 5)];
      if (c[0] === 0 && c[1] === 0) continue;
      const f = clockwise ? cw(c) : acw(c); const g = clockwise ? acw(c) : cw(c);
      const aboutO = clockwise ? cw([0, 0]) : acw([0, 0]);
      let shape; let names; let ki; let V;
      if (d === 1) {
        const len = rng.int(2, 5);
        const v = rng.pick([[len, 0], [-len, 0], [0, len], [0, -len]]);
        shape = [c, add(c, v)]; names = rng.pick(['AB', 'PQ', 'OA', 'KL']); ki = 1;
      } else {
        const rect = rng.chance(0.35);
        const a = rng.int(1, 4) * (rng.chance(0.5) ? 1 : -1); const b = rng.int(1, 4) * (rng.chance(0.5) ? 1 : -1);
        if (Math.abs(a) === Math.abs(b)) continue;
        // D3 asks about a corner that is across AND up/down from the centre
        shape = rect ? [c, add(c, [a, 0]), add(c, [a, b]), add(c, [0, b])] : d === 3 ? [c, add(c, [a, 0]), add(c, [a, b])] : [c, add(c, [a, 0]), add(c, [0, b])];
        names = rect ? rng.pick(['ABCD', 'PQRS']) : rng.pick(['ABC', 'PQR', 'XYZ']);
        if (d === 2) ki = rect ? rng.pick([1, 3]) : rng.int(1, 2);
        else ki = 2;
      }
      V = shape[ki];
      const off = sub(V, c);
      const img = f(V);
      const both = !!(off[0] && off[1]);
      if ([...shape, img, f(shape[shape.length - 1])].some((p) => Math.abs(p[0]) > 9 || Math.abs(p[1]) > 9)) continue;
      const cn = names[0]; const vn = names[ki];
      const desc = shape.length === 2 ? `The line ${names} goes from ${cn}${C(c)} to ${vn}${C(V)}.` : `${shape.length === 3 ? 'Triangle' : 'Rectangle'} ${names} has corners ${named(names, shape)}.`;
      const back = d === 3 && rng.chance(0.4);
      const turned = (v) => (clockwise ? [v[1], -v[0]] : [-v[1], v[0]]);
      let prompt; let ans; let solution; let distractors;
      if (back) {
        ans = V;
        prompt = `A shape is rotated 90° ${dir} about its corner ${cn}${C(c)}. The image of corner ${vn} is at ${C(img)}. What were the coordinates of ${vn} before the rotation?`;
        const io = sub(img, c);
        solution = `The image of ${vn} is ${offsetWords(io)} from ${cn}. To undo a ${dir} quarter turn, turn back ${clockwise ? 'anticlockwise' : 'clockwise'}: ${offsetWords(io)} becomes ${offsetWords(off)}. So ${vn} was at ${C(V)}. Check: turning ${C(V)} ${dir} about ${cn} gives ${C(img)}. Answer: ${C(V)}`;
        distractors = [
          { text: C(f(img)), code: 'ROT-WRONG-DIRECTION', why: `This turns the image ${dir} again. To find the original, turn the opposite way (${clockwise ? 'anticlockwise' : 'clockwise'}).` },
          { text: C((clockwise ? acw([0, 0]) : cw([0, 0]))(img)), code: 'ROT-ABOUT-ORIGIN', why: `This turns about the origin (0, 0). The centre of rotation is ${cn}${C(c)}.` },
          { text: C(half(c)(img)), code: 'ROT-180', why: 'This is a half turn (180°) of the image. A quarter turn (90°) is needed.' },
        ];
      } else {
        ans = img;
        prompt = `${desc} It is rotated 90° ${dir} about ${cn}. What are the coordinates of the image of ${vn}?`;
        solution = both
          ? `From ${cn}${C(c)}, ${vn} is ${offsetWords(off)}. A quarter turn ${dir} turns each part: ${offsetWords(off)} becomes ${offsetWords(turned(off))}. So the image of ${vn} is ${C(c)} moved ${offsetWords(turned(off))}: ${C(img)}. ${cn} stays where it is. Answer: ${C(img)}`
          : `${cn}${vn} goes ${Math.abs(off[0] || off[1])} units ${turnWords(off)} from ${cn}. A quarter turn ${dir} turns '${turnWords(off)}' into '${turnWords(turned(off))}'. So the image of ${vn} is ${Math.abs(off[0] || off[1])} units ${turnWords(turned(off))} of ${cn}: ${C(img)}. ${cn} stays at ${C(c)}. Answer: ${C(img)}`;
        distractors = [
          { text: C(g(V)), code: 'ROT-WRONG-DIRECTION', why: `This is a 90° ${clockwise ? 'ANTICLOCKWISE' : 'CLOCKWISE'} turn. ${clockwise ? 'Clockwise is the way clock hands move' : 'Anticlockwise is the opposite way to clock hands'}: '${turnWords(both ? [off[0], 0] : off)}' turns into '${turnWords(turned(both ? [off[0], 0] : off))}'.` },
          { text: C(aboutO(V)), code: 'ROT-ABOUT-ORIGIN', why: `This rotates about the origin (0, 0), not about ${cn}${C(c)}. Use ${cn} as the centre.` },
          { text: C(half(c)(V)), code: 'ROT-180', why: `This is a half turn (180°): ${cn}${vn} now points the opposite way. A 90° turn is only a quarter turn.` },
        ];
      }
      const diagram = back
        ? { ...grid([c, V, img]), points: [{ at: c, label: cn }, { at: img, label: `${vn}'`, style: 'cross' }] }
        : { ...grid([...shape, ...shape.map(f)]), ...(shape.length > 2 ? { polygons: [{ points: shape }] } : { segments: [{ from: shape[0], to: shape[1] }] }), points: shape.map((p, i) => ({ at: p, label: names[i] })) };
      try {
        if (d === 3 && back && rng.chance(0.5)) return shortCoord(prompt, ans, distractors, { code: 'ROT-WRONG-DIRECTION', why: `To work backwards, turn the opposite way (${clockwise ? 'anticlockwise' : 'clockwise'}) about ${cn}.` }, { solution, diagram, marks: 2 });
        return { type: 'mcq', prompt, ...choices(rng, C(ans), distractors, nearP(ans, 'Turn the movement from the centre a quarter turn.')), solution, diagram, marks: d === 3 ? 2 : 1 };
      } catch { /* draw again */ }
    }
    throw new Error('no question');
  },
};

// ---------------------------------------------------------------- g06 identify the transformation

const tText = {
  reflX: () => 'A reflection in the x-axis', reflY: () => 'A reflection in the y-axis',
  reflXa: (a) => `A reflection in the line x = ${n(a)}`, reflYb: (b) => `A reflection in the line y = ${n(b)}`,
  rot: (c, clockwise) => `A rotation of 90° ${clockwise ? 'clockwise' : 'anticlockwise'} about ${C(c)}`,
  trans: (v) => {
    const parts = [];
    if (v[0]) parts.push(`${units(Math.abs(v[0]))} ${v[0] > 0 ? 'right' : 'left'}`);
    if (v[1]) parts.push(`${units(Math.abs(v[1]))} ${v[1] > 0 ? 'up' : 'down'}`);
    return `A translation of ${parts.join(' and ')}`;
  },
};

const identify = {
  id: 'm14.identify-transformation', topicId: T, subtopicId: 'm14-s4', skill: SK.describe,
  title: 'Which single transformation maps shape A onto shape B? (D2 axes and translations; D3 lines x = a, y = b and rotations)',
  difficulties: [2, 3],
  check: {},
  make(rng, d) {
    for (let t = 0; t < 400; t++) {
      const o = [nz(rng, -5, 5), nz(rng, -5, 5)];
      const A = rightTriangle(rng, o, 3);
      let kind;
      if (d === 2) kind = rng.pick(['reflAxis', 'reflAxis', 'trans']);
      else kind = rng.pick(['reflLine', 'rot', 'rot', 'trans']);
      let f; let text; let partner; let partnerCode; let partnerWhy;
      if (kind === 'reflAxis') {
        const inY = rng.chance(0.5);
        f = inY ? reflY : reflX; text = inY ? tText.reflY() : tText.reflX();
        partner = inY ? tText.reflX() : tText.reflY(); partnerCode = 'REFL-WRONG-AXIS';
        partnerWhy = `A reflection in the ${inY ? 'x' : 'y'}-axis would change the ${inY ? 'y' : 'x'}-coordinates. Here the ${inY ? 'x' : 'y'}-coordinates change sign and the ${inY ? 'y' : 'x'}-coordinates stay the same.`;
        if (A.some((p) => p[0] === 0 || p[1] === 0)) continue;
      } else if (kind === 'reflLine') {
        const vert = rng.chance(0.5); const a = nz(rng, -3, 3);
        f = vert ? reflXa(a) : reflYb(a); text = vert ? tText.reflXa(a) : tText.reflYb(a);
        partner = vert ? tText.reflYb(a) : tText.reflXa(a); partnerCode = 'REFL-WRONG-AXIS';
        partnerWhy = `The line ${vert ? 'y' : 'x'} = ${n(a)} is ${vert ? 'horizontal' : 'vertical'}, so reflecting in it would change the ${vert ? 'y' : 'x'}-coordinates. Here the ${vert ? 'x' : 'y'}-coordinates change and the ${vert ? 'y' : 'x'}-coordinates stay the same.`;
      } else if (kind === 'rot') {
        const clockwise = rng.chance(0.5); const c = rng.pick(A);
        f = clockwise ? cw(c) : acw(c); text = tText.rot(c, clockwise);
        partner = tText.rot(c, !clockwise); partnerCode = 'ROT-WRONG-DIRECTION';
        partnerWhy = `${C(c)} is the right centre, but the turn goes the other way. Follow one side: ${clockwise ? 'a clockwise' : 'an anticlockwise'} quarter turn takes it to where it is in shape B.`;
      } else {
        const v = [nz(rng, -6, 6), nz(rng, -6, 6)];
        f = (p) => add(p, v); text = tText.trans(v);
        partner = tText.trans([-v[0], -v[1]]); partnerCode = 'TRANS-WRONG-DIRECTION';
        partnerWhy = 'This is the move from shape B back to shape A: the opposite direction.';
      }
      const B = A.map(f);
      if ([...A, ...B].some((p) => Math.abs(p[0]) > 8 || Math.abs(p[1]) > 8)) continue;
      if (sameSet(A, B) || A.some((p) => B.some((q) => eqP(p, q))) && kind === 'trans') continue;
      // one-corner distractors: the translation taking one corner of A onto one corner of B
      const ones = [];
      for (const p of A) for (const q of B) {
        const v = sub(q, p);
        if (!v[0] && !v[1]) continue;
        const moved = A.map((x) => add(x, v));
        if (sameSet(moved, B)) continue;
        ones.push({ text: tText.trans(v), code: 'TRANSF-ONE-POINT', why: `This does move the corner at ${C(p)} to ${C(q)}, but it does not move the other corners onto shape B. Check every corner.` });
      }
      const distractors = [{ text: partner, code: partnerCode, why: partnerWhy }, ...rng.shuffle(ones)];
      const solution = {
        reflAxis: `Compare each corner with its image: ${A.map((p, i) => `${C(p)} → ${C(B[i])}`).join(', ')}. ${text.includes('y-axis') ? 'The y-coordinates stay the same and every x-coordinate changes sign' : 'The x-coordinates stay the same and every y-coordinate changes sign'}, so shape A has flipped over the ${text.includes('y-axis') ? 'y' : 'x'}-axis.`,
        reflLine: `Compare each corner with its image: ${A.map((p, i) => `${C(p)} → ${C(B[i])}`).join(', ')}. Each corner and its image are the same distance from the line ${text.split('line ')[1]}, on opposite sides, so it is a reflection in that line.`,
        rot: `One corner, ${text.split('about ')[1]}, does not move, so it is the centre. Follow a side from the centre: in shape B it has turned a quarter turn ${text.includes('anticlockwise') ? 'anticlockwise' : 'clockwise'}. Check the other corners: ${A.map((p, i) => `${C(p)} → ${C(B[i])}`).join(', ')}.`,
        trans: `Shape B faces the same way as shape A, so it is a translation. Every corner moves the same: ${A.map((p, i) => `${C(p)} → ${C(B[i])}`).join(', ')}.`,
      }[kind];
      const diagram = { ...grid([...A, ...B]), polygons: [{ points: A, label: 'A' }, { points: B, label: 'B', style: 'dashed' }] };
      try {
        return { type: 'mcq', prompt: 'Which single transformation maps shape A onto shape B?', ...choices(rng, text, distractors, null), solution: `${solution} Check all the corners, not just one. Answer: ${text}`, diagram, marks: d === 3 ? 2 : 1 };
      } catch { /* draw again */ }
    }
    throw new Error('no question');
  },
};

// ---------------------------------------------------------------- g07 complete a symmetric shape

const completeSym = {
  id: 'm14.complete-symmetry', topicId: T, subtopicId: 'm14-s4', skill: SK.sym,
  title: 'Complete a shape with a line of symmetry: an axis (D2) or a line x = a / y = b (D3)',
  difficulties: [2, 3],
  check: {},
  make(rng, d) {
    for (let t = 0; t < 300; t++) {
      const vert = rng.chance(0.5);
      const a = d === 2 ? 0 : nz(rng, -3, 3);
      const k = vert ? 0 : 1;
      const s = rng.chance(0.5) ? 1 : -1; // which side the half shape is on
      // three corners on one side of the line; the first on the line itself
      const along = rng.sample([-4, -3, -2, -1, 1, 2, 3, 4, 5], 3).sort((x, y) => x - y);
      const outs = [0, rng.int(1, 4), rng.int(1, 4)];
      if (outs[1] === outs[2] && along[1] === along[2]) continue;
      const pts = along.map((u, i) => { const p = [0, 0]; p[k] = a + s * outs[i]; p[1 - k] = u; return p; });
      const f = vert ? reflXa(a) : reflYb(a);
      const off = pts.filter((p) => p[k] !== a);
      if (off.length < 2) continue;
      const P = rng.pick(off);
      const ans = f(P);
      const done = [...pts, ...pts.map(f)];
      const lineName = d === 2 ? (vert ? 'the y-axis' : 'the x-axis') : `the ${vert ? 'vertical' : 'horizontal'} line ${vert ? 'x' : 'y'} = ${n(a)}`;
      const who = person(rng);
      const prompt = `${who.name} draws half of a shape. Three of its corners are ${list(pts.slice(0, 2))} and ${C(pts[2])}. ${who.He} completes the shape so that ${lineName} is a line of symmetry. Which of these points must also be a corner of the completed shape?`;
      const dist = Math.abs(P[k] - a);
      const solution = `${lineName[0].toUpperCase()}${lineName.slice(1)} is the mirror line, so every corner has a partner on the other side, the same distance away. ${C(P)} is ${dist} ${dist === 1 ? 'unit' : 'units'} from the line, so its partner is ${dist} ${dist === 1 ? 'unit' : 'units'} on the other side: ${C(ans)}. Answer: ${C(ans)}`;
      const g = vert ? reflYb(a) : reflXa(a);
      const distractors = [
        { text: C(g(P)), code: 'REFL-WRONG-AXIS', why: `This reflects ${C(P)} in ${d === 2 ? `the ${vert ? 'x' : 'y'}-axis` : `the ${vert ? 'horizontal' : 'vertical'} line ${vert ? 'y' : 'x'} = ${n(a)}`}. The line of symmetry here is ${vert ? 'vertical' : 'horizontal'}, so only the ${vert ? 'x' : 'y'}-coordinate changes.` },
        d === 3 ? { text: C(vert ? reflY(P) : reflX(P)), code: 'REFL-FROM-ORIGIN', why: `This reflects in the ${vert ? 'y' : 'x'}-axis. The line of symmetry is ${lineName}, so measure from that line.` } : null,
        { text: C([-P[0], -P[1]]), code: 'REFL-NEGATE-BOTH', why: 'Both signs have changed. Only the coordinate across the mirror line changes.' },
        { text: C([P[1], P[0]]), code: 'COORD-SWAP', why: `This swaps the coordinates, which is a reflection in a diagonal line, not ${lineName}.` },
      ].filter((x) => x && !done.some((q) => C(q) === x.text));
      // the half shape starts on the line of symmetry and comes back to it
      const end = pts[2].slice(); end[k] = a;
      const segs = [[pts[0], pts[1]], [pts[1], pts[2]], [pts[2], end]].map(([u, v]) => ({ from: u, to: v }));
      const diagram = { ...grid([...done, ...distractors.map(() => [0, 0])]), segments: segs, points: pts.map((p) => ({ at: p })), lines: [vert ? { x: a, label: 'line of symmetry' } : { y: a, label: 'line of symmetry' }] };
      try {
        return { type: 'mcq', prompt, ...choices(rng, C(ans), distractors, null), solution, diagram, marks: d === 3 ? 2 : 1 };
      } catch { /* draw again */ }
    }
    throw new Error('no question');
  },
};

export default [reflectAxis, reflectLine, findMirror, reflectDiagonal, rotate, identify, completeSym];
