// Independent answers for the m13 generators, worked out again from the question text and the
// diagram data (plotted points are read from q.diagram), and the misconception rules that must
// reproduce each wrong option from its code. Shares no code with js/generators.

const fmt = (v) => (v === 0 ? '0' : String(v));
const P2 = (x, y) => `(${fmt(x)}, ${fmt(y)})`;
const T = (p) => P2(p[0], p[1]);
const num = (s) => Number(String(s).replace(/ /g, ''));
/** Every "(a, b)" in a text, in order. */
const pairs = (text) => [...String(text).matchAll(/\((-?\d+(?:\.\d+)?), (-?\d+(?:\.\d+)?)\)/g)].map((m) => [num(m[1]), num(m[2])]);
const at = (q, label) => { const p = (q.diagram.points || []).find((x) => x.label === label); if (!p) throw new Error(`no point ${label}`); return p.at.map(Number); };
const same = (a, b) => a[0] === b[0] && a[1] === b[1];
const plus = (a, b) => [a[0] + b[0], a[1] + b[1]];
const minus = (a, b) => [a[0] - b[0], a[1] - b[1]];
const neg = (a) => [-a[0], -a[1]];
const ORD = ['', 'first', 'second', 'third', 'fourth'];
/** Quadrant by the signs: right-up 1, left-up 2, left-down 3, right-down 4; 0 on an axis. */
function quadOf([x, y]) {
  if (x === 0 || y === 0) return 0;
  if (y > 0) return x > 0 ? 1 : 2;
  return x < 0 ? 3 : 4;
}
const quadName = (k) => `The ${ORD[k]} quadrant`;
/** A move written in words ("3 units left and 1 unit up") as a vector. */
function moveOf(text) {
  let x = 0; let y = 0;
  for (const m of String(text).matchAll(/(\d+(?:\.\d+)?) units? (right|left|up|down)/g)) {
    const k = num(m[1]);
    if (m[2] === 'right') x += k; else if (m[2] === 'left') x -= k; else if (m[2] === 'up') y += k; else y -= k;
  }
  return [x, y];
}
/** The words for a move (independent copy of the phrasing rule). */
function words([x, y]) {
  const u = (k) => `${k} ${k === 1 ? 'unit' : 'units'}`;
  const out = [];
  if (x) out.push(`${u(Math.abs(x))} ${x > 0 ? 'right' : 'left'}`);
  if (y) out.push(`${u(Math.abs(y))} ${y > 0 ? 'up' : 'down'}`);
  return out.join(' and ');
}
const swap = (p) => [p[1], p[0]];
/** Two points as one option: the one further left (then lower) first. */
const pairOf = (ps) => { const [a, b] = [...ps].sort((u, v) => u[0] - v[0] || u[1] - v[1]); return `${T(a)} and ${T(b)}`; };
const optPairs = (q) => q.options.map((o) => ({ o, p: pairs(o)[0] }));

// ---------------------------------------------------------------- read the point / which point

const readLabel = (q) => q.prompt.match(/coordinates of point (\w+)(?: on the grid)?\?/)[1];
const readP = (q) => at(q, readLabel(q));
const whichTarget = (q) => pairs(q.prompt)[0];
const labelsAt = (q, list) => (q.diagram.points || []).filter((p) => list.some((t) => same(p.at.map(Number), t))).map((p) => p.label);
const flips = ([x, y]) => [[-x, y], [x, -y], [-x, -y]];

// ---------------------------------------------------------------- quadrants

function quadAsk(q) {
  const m = q.prompt.match(/Which quadrant is the point (\(.*?\)) in\?/);
  if (m) return { point: pairs(m[1])[0] };
  return { k: ORD.indexOf(q.prompt.match(/is in the (\w+) quadrant\?/)[1]) };
}

// ---------------------------------------------------------------- points on the axes / distances

function axisAsk(q) {
  let m = q.prompt.match(/on the (x|y)-axis, (\d+(?:\.\d+)?) units? (to the left of|to the right of|above|below) the origin/);
  if (m) {
    const v = num(m[2]) * (/left|below/.test(m[3]) ? -1 : 1);
    return { kind: 'on', p: m[1] === 'x' ? [v, 0] : [0, v] };
  }
  m = q.prompt.match(/is at (\(.*?\))\. How many units is \w+ from the (x|y)-axis\?/);
  if (m) { const p = pairs(m[1])[0]; return { kind: 'dist', p, axis: m[2] }; }
  m = q.prompt.match(/^Point \w+ is (\d+) units? from the y-axis and (\d+) units? from the x-axis\. It is (above the x-axis|below the x-axis|to the right of the y-axis|to the left of the y-axis)\. Which two points/);
  if (m) {
    // every point a units from the y-axis and b from the x-axis, kept if it is on the named side
    const a = num(m[1]); const b = num(m[2]);
    const side = { 'above the x-axis': (p) => p[1] > 0, 'below the x-axis': (p) => p[1] < 0, 'to the right of the y-axis': (p) => p[0] > 0, 'to the left of the y-axis': (p) => p[0] < 0 }[m[3]];
    const all = [[a, b], [-a, b], [a, -b], [-a, -b]];
    return { kind: 'both', a, b, side, all, fit: all.filter(side) };
  }
  m = q.prompt.match(/in the (\w+) quadrant\. It is (\d+(?:\.\d+)?) units? from the y-axis and (\d+(?:\.\d+)?) units? from the x-axis/);
  const k = ORD.indexOf(m[1]);
  const sx = k === 2 || k === 3 ? -1 : 1; const sy = k === 3 || k === 4 ? -1 : 1;
  return { kind: 'quad', p: [sx * num(m[2]), sy * num(m[3])], a: num(m[2]), b: num(m[3]), sx, sy };
}

// ---------------------------------------------------------------- missing vertex

function vertexAsk(q) {
  const ask = q.prompt.match(/What are the coordinates of (\w)\?/)[1];
  let m = q.prompt.match(/^(\w{4}) is a square with its corners in that order\. (\w) is (\(.*?\)) and (\w) is (\(.*?\))\. Corners \w and \w are (above|below|to the right of|to the left of)/);
  if (m) {
    const name = m[1]; const A = pairs(m[3])[0]; const B = pairs(m[5])[0];
    const len = Math.abs(B[0] - A[0]) + Math.abs(B[1] - A[1]);
    const dir = { above: [0, 1], below: [0, -1], 'to the right of': [1, 0], 'to the left of': [-1, 0] }[m[6]];
    const off = [dir[0] * len, dir[1] * len];
    const corners = [A, B, plus(B, off), plus(A, off)];
    const i = name.indexOf(ask);
    const from = corners[i === 2 ? 1 : 0];
    return { square: true, ans: corners[i], from, dir, len, A, B, other: corners[i === 2 ? 3 : 2] };
  }
  m = q.prompt.match(/^(\w{4}) is a (rectangle|square|parallelogram)/);
  const name = m[1]; const i = name.indexOf(ask);
  const P = (j) => at(q, name[(i + j) % 4]);
  const next = P(1); const opp = P(2); const prev = P(3);
  // opposite sides are equal and parallel: the missing corner = next + prev - opposite
  return { ans: minus(plus(next, prev), opp), next, opp, prev };
}

// ---------------------------------------------------------------- line length / midpoint

function lineAsk(q) {
  const m = q.prompt.match(/(\w) is at (\(.*?\))\. \w is (to the right of|to the left of|directly above|directly below) \w, and the line \w\w is (\d+) units long/);
  if (m) {
    const A = pairs(m[2])[0]; const len = num(m[4]);
    const dir = { 'to the right of': [1, 0], 'to the left of': [-1, 0], 'directly above': [0, 1], 'directly below': [0, -1] }[m[3]];
    return { back: true, A, len, dir, B: [A[0] + dir[0] * len, A[1] + dir[1] * len] };
  }
  const [A, B] = pairs(q.prompt);
  return { A, B, len: Math.abs(B[0] - A[0]) + Math.abs(B[1] - A[1]) };
}
const unitsBoth = (k) => [k, `${k} ${k === 1 ? 'unit' : 'units'}`];

function midAsk(q) {
  if (/M is the midpoint/.test(q.prompt)) {
    const [A, M] = pairs(q.prompt);
    return { back: true, A, M, B: [2 * M[0] - A[0], 2 * M[1] - A[1]] };
  }
  const [A, B] = pairs(q.prompt);
  const horiz = A[1] === B[1];
  return { A, B, horiz, mid: [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2] };
}
function midWith(m, v) { return m.horiz ? [v, m.A[1]] : [m.A[0], v]; }
function midEnds(m) { return m.horiz ? [m.A[0], m.B[0]] : [m.A[1], m.B[1]]; }

// ---------------------------------------------------------------- perimeter and area (from the drawn shape)

function shapeOf(q) {
  const pts = q.diagram.polygons[0].points.map((p) => p.map(Number));
  let twice = 0; let per = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]; const b = pts[(i + 1) % pts.length];
    twice += a[0] * b[1] - b[0] * a[1];
    per += Math.hypot(b[0] - a[0], b[1] - a[1]);
  }
  const xs = pts.map((p) => p[0]); const ys = pts.map((p) => p[1]);
  const x1 = Math.min(...xs); const x2 = Math.max(...xs); const y1 = Math.min(...ys); const y2 = Math.max(...ys);
  const w = x2 - x1; const h = y2 - y1;
  const wN = x1 < 0 && x2 > 0 ? Math.abs(Math.abs(x2) - Math.abs(x1)) : w;
  const hN = y1 < 0 && y2 > 0 ? Math.abs(Math.abs(y2) - Math.abs(y1)) : h;
  return { area: Math.abs(twice) / 2, per, tri: pts.length === 3, area2: /area/.test(q.prompt), w, h, wN, hN };
}

// ---------------------------------------------------------------- translations

function transAsk(q) {
  let m = q.prompt.match(/Point (\w)(\(.*?\))(?: on the grid)? is translated (.*?)\. What are the coordinates of its image\?/);
  if (m) { const P = pairs(m[2])[0]; const v = moveOf(m[3]); return { V: P, v, ans: plus(P, v) }; }
  m = q.prompt.match(/It is translated so that (\w) moves to (\(.*?\))\. What are the coordinates of the image of (\w)\?/);
  if (m) { const v = minus(pairs(m[2])[0], at(q, m[1])); const V = at(q, m[3]); return { V, v, ans: plus(V, v), d3: true }; }
  m = q.prompt.match(/It is translated (.*?)\. What are the coordinates of the image of (\w)\?/);
  const v = moveOf(m[1]); const V = at(q, m[2]);
  return { V, v, ans: plus(V, v) };
}
const swapAmounts = (v) => [Math.sign(v[0]) * Math.abs(v[1]), Math.sign(v[1]) * Math.abs(v[0])];

function describeAsk(q) {
  const m = q.prompt.match(/Point P(\(.*?\)) is translated (.*?) to P'\. Then P' is translated (.*?) to P''/);
  if (m) {
    const m1 = moveOf(m[2]); const m2 = moveOf(m[3]);
    return { two: true, m1, m2, net: plus(m1, m2) };
  }
  const P = at(q, 'P'); const Q = at(q, "P'");
  return { P, Q, net: minus(Q, P) };
}
function originalAsk(q) {
  let m = q.prompt.match(/A point is translated (.*?)\. Its image(?:, shown on the grid,)? is at (\(.*?\))\./);
  if (m) { const v = moveOf(m[1]); const I = pairs(m[2])[0]; return { v, I, ans: minus(I, v) }; }
  m = q.prompt.match(/A point P is translated (.*?), and then (.*?)\. It ends at Q(\(.*?\))(?:, shown on the grid)?\./);
  const m1 = moveOf(m[1]); const m2 = moveOf(m[2]); const I = pairs(m[3])[0];
  return { two: true, m1, m2, I, ans: minus(minus(I, m2), m1) };
}

export const SOLVERS = {
  'm13.read-point': (q) => ({ text: T(readP(q)) }),
  'm13.which-point': (q) => ({ text: labelsAt(q, [whichTarget(q)])[0] }),
  'm13.quadrant': (q) => {
    const a = quadAsk(q);
    if (a.point) return { text: quadName(quadOf(a.point)) };
    const hits = optPairs(q).filter((x) => quadOf(x.p) === a.k);
    if (hits.length !== 1) throw new Error(`${hits.length} options in quadrant ${a.k}`);
    return { text: hits[0].o };
  },
  'm13.axis-distance': (q) => {
    const a = axisAsk(q);
    if (a.kind === 'dist') return { value: Math.abs(a.axis === 'y' ? a.p[0] : a.p[1]) };
    if (a.kind === 'both') return { text: pairOf(a.fit) };
    return { text: T(a.p) };
  },
  'm13.missing-vertex': (q) => ({ text: T(vertexAsk(q).ans) }),
  'm13.line-length': (q) => {
    const a = lineAsk(q);
    if (a.back) return { text: T(a.B) };
    return q.type === 'mcq' ? { text: `${a.len} ${a.len === 1 ? 'unit' : 'units'}` } : { value: a.len };
  },
  'm13.midpoint': (q) => { const a = midAsk(q); return { text: T(a.back ? a.B : a.mid) }; },
  'm13.perimeter-area': (q) => { const s = shapeOf(q); return { value: s.area2 ? s.area : s.per }; },
  'm13.translate': (q) => ({ text: T(transAsk(q).ans) }),
  'm13.describe-translation': (q) => ({ text: words(describeAsk(q).net) }),
  'm13.translation-original': (q) => ({ text: T(originalAsk(q).ans) }),
};

export const MIS = {
  'm13.read-point': {
    'COORD-SWAP': (q) => [T(swap(readP(q)))],
    'COORD-SIGN': (q) => flips(readP(q)).map(T),
    'COORD-HALF-MISREAD': (q) => {
      const [x, y] = readP(q);
      const opts = (v) => (Number.isInteger(v) ? [v] : [Math.floor(v), Math.ceil(v)]);
      const out = [];
      for (const a of opts(x)) for (const b of opts(y)) out.push(T([a, b]));
      for (const a of opts(x)) out.push(T([a, y]));
      for (const b of opts(y)) out.push(T([x, b]));
      return out;
    },
  },
  'm13.which-point': {
    'COORD-SWAP': (q) => labelsAt(q, [swap(whichTarget(q))]),
    'COORD-SIGN': (q) => labelsAt(q, flips(whichTarget(q))),
  },
  'm13.quadrant': {
    'COORD-SIGN': (q) => {
      const a = quadAsk(q);
      if (a.point) return flips(a.point).map((p) => quadName(quadOf(p)));
      return optPairs(q).filter((x) => quadOf(x.p) && quadOf(x.p) !== a.k).map((x) => x.o);
    },
    'QUAD-CLOCKWISE': (q) => {
      const cw = { 1: 1, 2: 4, 3: 3, 4: 2 };
      const a = quadAsk(q);
      if (a.point) return [quadName(cw[quadOf(a.point)])];
      return optPairs(q).filter((x) => quadOf(x.p) === cw[a.k]).map((x) => x.o);
    },
    'COORD-AXIS-QUADRANT': (q) => optPairs(q).filter((x) => x.p[0] === 0 || x.p[1] === 0).map((x) => x.o),
  },
  'm13.axis-distance': {
    'COORD-SWAP': (q) => {
      const a = axisAsk(q);
      if (a.kind === 'on') return [T(swap(a.p))];
      if (a.kind === 'dist') return [Math.abs(a.axis === 'y' ? a.p[1] : a.p[0])];
      if (a.kind === 'both') return [pairOf([[a.b, a.a], [-a.b, a.a], [a.b, -a.a], [-a.b, -a.a]].filter(a.side))];
      return [T([a.sx * a.b, a.sy * a.a]), T([a.b, a.a])];
    },
    'COORD-SIGN': (q) => {
      const a = axisAsk(q);
      if (a.kind === 'both') return [pairOf(a.all.filter((p) => !a.side(p)))]; // both points on the wrong side
      return a.kind === 'on' ? [T(neg(a.p))] : [T([-a.p[0], a.p[1]]), T([a.p[0], -a.p[1]])];
    },
    // a pair that fits the two distances but not the side: one right point and its mirror across the side's axis
    'ONE-CONDITION-ONLY': (q) => { const a = axisAsk(q); return a.fit.map((p) => pairOf([p, a.all.find((r) => !a.side(r) && (r[0] === p[0] || r[1] === p[1]) && !(r[0] === -p[0] && r[1] === -p[1]))])); },
    'AXIS-ZERO-MISSED': (q) => { const a = axisAsk(q); const v = a.p[0] || a.p[1]; return [T([v, v])]; },
    'DIST-NEGATIVE': (q) => { const a = axisAsk(q); return [a.axis === 'y' ? a.p[0] : a.p[1]]; },
  },
  'm13.missing-vertex': {
    'VERTEX-WRONG-ORDER': (q) => {
      const a = vertexAsk(q);
      if (a.square) return [T(a.other)];
      return [T(minus(plus(a.prev, a.opp), a.next)), T(minus(plus(a.next, a.opp), a.prev))];
    },
    'COORD-SWAP': (q) => [T(swap(vertexAsk(q).ans))],
    'TRANS-WRONG-DIRECTION': (q) => {
      const a = vertexAsk(q);
      if (!a.square) return [T(minus(plus(a.prev, a.opp), a.next))]; // the move opposite -> next copied backwards from prev
      return [T([a.from[0] - a.dir[0] * a.len, a.from[1] - a.dir[1] * a.len])];
    },
    'COORD-COUNT-POINTS': (q) => { const a = vertexAsk(q); return [T([a.from[0] + a.dir[0] * (a.len + 1), a.from[1] + a.dir[1] * (a.len + 1)])]; },
    'NEG-DIFF-ADD-SIGNS': (q) => {
      const a = vertexAsk(q);
      const k = a.A[1] === a.B[1] ? 0 : 1;
      const l = Math.abs(Math.abs(a.B[k]) - Math.abs(a.A[k]));
      return [T([a.from[0] + a.dir[0] * l, a.from[1] + a.dir[1] * l])];
    },
  },
  'm13.line-length': {
    'COORD-COUNT-POINTS': (q) => {
      const a = lineAsk(q);
      if (a.back) return [T([a.A[0] + a.dir[0] * (a.len - 1), a.A[1] + a.dir[1] * (a.len - 1)])];
      return unitsBoth(a.len + 1);
    },
    'OP-SWAP': (q) => { const a = lineAsk(q); const k = a.A[0] === a.B[0] ? 1 : 0; return unitsBoth(Math.abs(a.A[k] + a.B[k])); },
    'NEG-DIFF-ADD-SIGNS': (q) => { const a = lineAsk(q); const k = a.A[0] === a.B[0] ? 1 : 0; return unitsBoth(Math.abs(Math.abs(a.B[k]) - Math.abs(a.A[k]))); },
    'TRANS-WRONG-DIRECTION': (q) => { const a = lineAsk(q); return [T([a.A[0] - a.dir[0] * a.len, a.A[1] - a.dir[1] * a.len])]; },
    'TRANS-WRONG-AXIS': (q) => { const a = lineAsk(q); return [T([a.A[0] + a.dir[1] * a.len, a.A[1] + a.dir[0] * a.len])]; },
  },
  'm13.midpoint': {
    'MID-HALF-DIFF': (q) => { const a = midAsk(q); const [u, v] = midEnds(a); return [T(midWith(a, Math.abs(v - u) / 2))]; },
    'MID-NO-HALVE': (q) => { const a = midAsk(q); const [u, v] = midEnds(a); return [T(midWith(a, u + v))]; },
    'MID-LENGTH': (q) => { const a = midAsk(q); const [u, v] = midEnds(a); return [T(midWith(a, Math.abs(v - u)))]; },
    'COORD-SWAP': (q) => { const a = midAsk(q); return [T(swap(a.back ? a.B : a.mid))]; },
    'MID-WRONG-WAY': (q) => { const a = midAsk(q); return [T([(a.A[0] + a.M[0]) / 2, (a.A[1] + a.M[1]) / 2])]; },
    'TRANS-WRONG-DIRECTION': (q) => { const a = midAsk(q); return [T([2 * a.A[0] - a.M[0], 2 * a.A[1] - a.M[1]])]; },
  },
  'm13.perimeter-area': {
    'AREA-PERIM-SWAP': (q) => { const s = shapeOf(q); return [s.area2 ? s.per : s.area]; },
    'PERIM-TWO-SIDES': (q) => { const s = shapeOf(q); return [s.w + s.h]; },
    'COORD-COUNT-POINTS': (q) => {
      const s = shapeOf(q);
      if (s.tri) return [((s.w + 1) * (s.h + 1)) / 2];
      return [s.area2 ? (s.w + 1) * (s.h + 1) : 2 * (s.w + s.h + 2)];
    },
    'NEG-DIFF-ADD-SIGNS': (q) => {
      const s = shapeOf(q);
      if (s.tri) return [(s.wN * s.hN) / 2];
      return [s.area2 ? s.wN * s.hN : 2 * (s.wN + s.hN)];
    },
    'AREA-TRI-NO-HALF': (q) => { const s = shapeOf(q); return [s.w * s.h]; },
  },
  'm13.translate': {
    'TRANS-WRONG-AXIS': (q) => { const a = transAsk(q); return [T(plus(a.V, swap(a.v))), T(plus(a.V, swapAmounts(a.v)))]; },
    'TRANS-WRONG-DIRECTION': (q) => { const a = transAsk(q); return [T(minus(a.V, a.v)), T([a.V[0] - a.v[0], a.V[1] + a.v[1]]), T([a.V[0] + a.v[0], a.V[1] - a.v[1]])]; },
    'TRANS-BOTH-COORDS': (q) => { const a = transAsk(q); const k = a.v[0] || a.v[1]; return [T(plus(a.V, [k, k]))]; },
  },
  'm13.describe-translation': {
    'TRANS-WRONG-DIRECTION': (q) => { const a = describeAsk(q); return [words(neg(a.net)), words([a.net[0], -a.net[1]])]; },
    'TRANS-WRONG-AXIS': (q) => [words(swapAmounts(describeAsk(q).net))],
    'NEG-DIFF-ADD-SIGNS': (q) => {
      const a = describeAsk(q);
      const part = (k) => (a.P[k] * a.Q[k] < 0 ? Math.sign(a.Q[k] - a.P[k]) * Math.abs(Math.abs(a.Q[k]) - Math.abs(a.P[k])) : a.Q[k] - a.P[k]);
      return [words([part(0), part(1)])];
    },
    'TRANS-ADD-ALL': (q) => { const a = describeAsk(q); return [words([Math.sign(a.net[0]) * (Math.abs(a.m1[0]) + Math.abs(a.m2[0])), Math.sign(a.net[1]) * (Math.abs(a.m1[1]) + Math.abs(a.m2[1]))])]; },
    'TRANS-ONE-STEP': (q) => { const a = describeAsk(q); return [words(a.m1), words(a.m2)]; },
  },
  'm13.translation-original': {
    'TRANS-WRONG-DIRECTION': (q) => {
      const a = originalAsk(q);
      const v = a.two ? plus(a.m1, a.m2) : a.v;
      return [T(plus(a.I, v)), T([a.I[0] - v[0], a.I[1] + v[1]]), T([a.I[0] + v[0], a.I[1] - v[1]])];
    },
    'TRANS-WRONG-AXIS': (q) => { const a = originalAsk(q); return [T(minus(a.I, swapAmounts(a.v)))]; },
    'TRANS-ONE-STEP': (q) => { const a = originalAsk(q); return [T(minus(a.I, a.m2)), T(minus(a.I, a.m1))]; },
  },
};
