// Independent answers for the m14 generators, worked out again from the question text and the
// diagram data, and the misconception rules that must reproduce each wrong option from its code.
// Shares no code with js/generators.

const fmt = (v) => (v === 0 ? '0' : String(v));
const T = (p) => `(${fmt(p[0])}, ${fmt(p[1])})`;
const num = (s) => Number(String(s).replace(/ /g, ''));
const pairs = (text) => [...String(text).matchAll(/\((-?\d+(?:\.\d+)?), (-?\d+(?:\.\d+)?)\)/g)].map((m) => [num(m[1]), num(m[2])]);
const at = (q, label) => { const p = (q.diagram.points || []).find((x) => x.label === label); if (!p) throw new Error(`no point ${label}`); return p.at.map(Number); };
const same = (a, b) => a[0] === b[0] && a[1] === b[1];
const L = (pts) => pts.map(T).join(', ');
const setEq = (A, B) => A.length === B.length && A.every((p) => B.some((q) => same(p, q)));

// mirror images by distances: across a vertical line x = a, the x-distance is kept but turned round
const mirrorV = (a) => ([x, y]) => [a + (a - x), y];
const mirrorH = (b) => ([x, y]) => [x, b + (b - y)];
// a quarter turn about c: clockwise sends "right" to "down" and "up" to "right"
function quarter(c, clockwise) {
  return ([x, y]) => {
    const dx = x - c[0]; const dy = y - c[1];
    return clockwise ? [c[0] + dy, c[1] - dx] : [c[0] - dy, c[1] + dx];
  };
}
const halfTurn = (c) => ([x, y]) => [2 * c[0] - x, 2 * c[1] - y];

// ---------------------------------------------------------------- reflect in an axis

function axisAsk(q) {
  let m = q.prompt.match(/Point \w(\(.*?\)) is reflected in the (x|y)-axis\./);
  if (m) return { P: pairs(m[1])[0], axis: m[2] };
  m = q.prompt.match(/has corners (.*?)\. It is reflected in the (x|y)-axis\./);
  return { tri: pairs(m[1]), axis: m[2] };
}
const inAxis = (axis) => (axis === 'y' ? mirrorV(0) : mirrorH(0));
const otherAxis = (axis) => (axis === 'y' ? mirrorH(0) : mirrorV(0));

// ---------------------------------------------------------------- reflect in x = a, y = b

function lineAsk(q) {
  let m = q.prompt.match(/Point \w(\(.*?\)) is reflected in the (vertical|horizontal) mirror line (x|y) = (-?\d+)\./);
  let from; let c; let a;
  if (m) { from = pairs(m[1])[0]; c = m[3]; a = num(m[4]); } else {
    m = q.prompt.match(/is reflected in the (vertical|horizontal) mirror line (x|y) = (-?\d+)\. Its image is (\(.*?\))\./);
    c = m[2]; a = num(m[3]); from = pairs(m[4])[0];
  }
  const k = c === 'x' ? 0 : 1;
  const f = c === 'x' ? mirrorV(a) : mirrorH(a);
  return { from, a, k, f, ans: f(from) };
}
const setK = (p, k, v) => (k === 0 ? [v, p[1]] : [p[0], v]);

// ---------------------------------------------------------------- mirror line

function mirrorAsk(q) {
  const [P, Q] = pairs(q.prompt);
  const k = P[0] === Q[0] ? 1 : 0;
  return { u: P[k], v: Q[k], c: k === 0 ? 'x' : 'y', mid: (P[k] + Q[k]) / 2 };
}
const both = (c, v) => [v, `${c} = ${fmt(v)}`];

// ---------------------------------------------------------------- diagonals

function diagAsk(q) {
  const other = /\(1, -1\) and \(2, -2\)/.test(q.prompt);
  let m = q.prompt.match(/Point \w(\(.*?\)) is reflected/);
  const back = !m;
  if (!m) m = q.prompt.match(/Its image is (\(.*?\))\./);
  const P = pairs(m[1])[0];
  const [x, y] = P;
  return { P, x, y, ans: other ? [-y, -x] : [y, x], other, back };
}

// ---------------------------------------------------------------- rotation

function rotAsk(q) {
  const clockwise = !/anticlockwise/.test(q.prompt);
  let m = q.prompt.match(/about its corner \w(\(.*?\))\. The image of corner \w is at (\(.*?\))\./);
  if (m) {
    const c = pairs(m[1])[0]; const img = pairs(m[2])[0];
    return { back: true, c, img, clockwise, ans: quarter(c, !clockwise)(img) };
  }
  m = q.prompt.match(/about (\w)\. What are the coordinates of the image of (\w)\?/);
  const c = at(q, m[1]); const V = at(q, m[2]);
  return { c, V, clockwise, ans: quarter(c, clockwise)(V) };
}

// ---------------------------------------------------------------- identify the transformation

/** An option's words as a function of a point (null if not understood). */
function parseT(text) {
  let m;
  if (text === 'A reflection in the x-axis') return mirrorH(0);
  if (text === 'A reflection in the y-axis') return mirrorV(0);
  if ((m = text.match(/^A reflection in the line x = (-?\d+)$/))) return mirrorV(num(m[1]));
  if ((m = text.match(/^A reflection in the line y = (-?\d+)$/))) return mirrorH(num(m[1]));
  if ((m = text.match(/^A rotation of 90° (clockwise|anticlockwise) about (\(.*?\))$/))) return quarter(pairs(m[2])[0], m[1] === 'clockwise');
  if ((m = text.match(/^A translation of (.*)$/))) {
    let dx = 0; let dy = 0;
    for (const k of m[1].matchAll(/(\d+) units? (right|left|up|down)/g)) {
      const v = num(k[1]);
      if (k[2] === 'right') dx += v; else if (k[2] === 'left') dx -= v; else if (k[2] === 'up') dy += v; else dy -= v;
    }
    return ([x, y]) => [x + dx, y + dy];
  }
  return null;
}
function shapes(q) {
  const A = q.diagram.polygons.find((p) => p.label === 'A').points.map((p) => p.map(Number));
  const B = q.diagram.polygons.find((p) => p.label === 'B').points.map((p) => p.map(Number));
  return { A, B };
}
function identifyAnswer(q) {
  const { A, B } = shapes(q);
  const hits = q.options.filter((o) => { const f = parseT(o); return f && setEq(A.map(f), B); });
  if (hits.length !== 1) throw new Error(`${hits.length} options map A onto B`);
  return hits[0];
}

// ---------------------------------------------------------------- completing a symmetric shape

function symAsk(q) {
  const m = q.prompt.match(/Three of its corners are (.*?)\. \w+ completes the shape so that (the y-axis|the x-axis|the vertical line x = (-?\d+)|the horizontal line y = (-?\d+)) is a line of symmetry/);
  const corners = pairs(m[1]);
  let f; let vert;
  if (m[2] === 'the y-axis') { f = mirrorV(0); vert = true; } else if (m[2] === 'the x-axis') { f = mirrorH(0); vert = false; } else if (m[3] != null) { f = mirrorV(num(m[3])); vert = true; } else { f = mirrorH(num(m[4])); vert = false; }
  const a = m[3] != null ? num(m[3]) : m[4] != null ? num(m[4]) : 0;
  const all = [...corners, ...corners.map(f)];
  return { corners, f, vert, a, all };
}

export const SOLVERS = {
  'm14.reflect-axis': (q) => {
    const a = axisAsk(q);
    return { text: a.P ? T(inAxis(a.axis)(a.P)) : L(a.tri.map(inAxis(a.axis))) };
  },
  'm14.reflect-line': (q) => ({ text: T(lineAsk(q).ans) }),
  'm14.find-mirror-line': (q) => { const a = mirrorAsk(q); return q.type === 'mcq' ? { text: `${a.c} = ${fmt(a.mid)}` } : { value: a.mid }; },
  'm14.reflect-diagonal': (q) => ({ text: T(diagAsk(q).ans) }),
  'm14.rotate': (q) => ({ text: T(rotAsk(q).ans) }),
  'm14.identify-transformation': (q) => ({ text: identifyAnswer(q) }),
  'm14.complete-symmetry': (q) => {
    const s = symAsk(q);
    const hits = q.options.filter((o) => s.all.some((p) => T(p) === o));
    if (hits.length !== 1) throw new Error(`${hits.length} options are corners`);
    return { text: hits[0] };
  },
};

export const MIS = {
  'm14.reflect-axis': {
    'REFL-WRONG-AXIS': (q) => { const a = axisAsk(q); return [a.P ? T(otherAxis(a.axis)(a.P)) : L(a.tri.map(otherAxis(a.axis)))]; },
    'REFL-NEGATE-BOTH': (q) => { const a = axisAsk(q); const h = halfTurn([0, 0]); return [a.P ? T(h(a.P)) : L(a.tri.map(h))]; },
    'COORD-SWAP': (q) => { const a = axisAsk(q); return [T([a.P[1], a.P[0]])]; },
    'REFL-PART-SHAPE': (q) => {
      const a = axisAsk(q); const f = inAxis(a.axis);
      return a.tri.map((_, k) => L(a.tri.map((p, i) => (i === k ? p : f(p)))));
    },
  },
  'm14.reflect-line': {
    'REFL-FROM-ORIGIN': (q) => { const a = lineAsk(q); return [T(setK(a.from, a.k, -a.from[a.k]))]; },
    'REFL-WRONG-AXIS': (q) => { const a = lineAsk(q); return [T((a.k === 0 ? mirrorH(a.a) : mirrorV(a.a))(a.from))]; },
    'REFL-TO-LINE': (q) => { const a = lineAsk(q); return [T(setK(a.from, a.k, a.a))]; },
    'REFL-DIST-AS-COORD': (q) => { const a = lineAsk(q); return [T(setK(a.from, a.k, Math.abs(a.from[a.k] - a.a)))]; },
  },
  'm14.find-mirror-line': {
    'MIRROR-DIST': (q) => { const a = mirrorAsk(q); return both(a.c, Math.abs(a.v - a.u)); },
    'MID-HALF-LENGTH': (q) => { const a = mirrorAsk(q); return both(a.c, Math.abs(a.v - a.u) / 2); },
    'MID-NO-HALVE': (q) => { const a = mirrorAsk(q); return both(a.c, a.u + a.v); },
  },
  'm14.reflect-diagonal': {
    'REFL-DIAG-SWAP-ONLY': (q) => { const a = diagAsk(q); return [T([a.y, a.x])]; },
    'REFL-NEGATE-BOTH': (q) => { const a = diagAsk(q); return [T([-a.x, -a.y])]; },
    'REFL-WRONG-AXIS': (q) => { const a = diagAsk(q); return [T([-a.x, a.y]), T([a.x, -a.y])]; },
    'REFL-DIAG-NEGATE': (q) => { const a = diagAsk(q); return [T([-a.y, -a.x])]; },
    'REFL-NO-CHANGE': (q) => [T(diagAsk(q).P)],
    'REFL-DIAG-SIGN-STAYS': (q) => { const a = diagAsk(q); return [T([Math.sign(a.x) * Math.abs(a.y), Math.sign(a.y) * Math.abs(a.x)])]; },
  },
  'm14.rotate': {
    'ROT-WRONG-DIRECTION': (q) => { const a = rotAsk(q); return [T(a.back ? quarter(a.c, a.clockwise)(a.img) : quarter(a.c, !a.clockwise)(a.V))]; },
    'ROT-ABOUT-ORIGIN': (q) => { const a = rotAsk(q); return [T(a.back ? quarter([0, 0], !a.clockwise)(a.img) : quarter([0, 0], a.clockwise)(a.V))]; },
    'ROT-180': (q) => { const a = rotAsk(q); return [T(halfTurn(a.c)(a.back ? a.img : a.V))]; },
  },
  'm14.identify-transformation': {
    'REFL-WRONG-AXIS': (q) => {
      const t = identifyAnswer(q); let m;
      if (t === 'A reflection in the x-axis') return ['A reflection in the y-axis'];
      if (t === 'A reflection in the y-axis') return ['A reflection in the x-axis'];
      if ((m = t.match(/line (x|y) = (-?\d+)$/))) return [`A reflection in the line ${m[1] === 'x' ? 'y' : 'x'} = ${m[2]}`];
      return [];
    },
    'ROT-WRONG-DIRECTION': (q) => {
      const t = identifyAnswer(q);
      return [/anticlockwise/.test(t) ? t.replace('anticlockwise', 'clockwise') : t.replace('clockwise', 'anticlockwise')];
    },
    'TRANS-WRONG-DIRECTION': (q) => {
      const t = identifyAnswer(q);
      const flip = { right: 'left', left: 'right', up: 'down', down: 'up' };
      return [t.replace(/\b(right|left|up|down)\b/g, (w) => flip[w])];
    },
    'TRANSF-ONE-POINT': (q) => {
      const { A, B } = shapes(q);
      return q.options.filter((o) => {
        const f = parseT(o);
        if (!f) return false;
        const img = A.map(f);
        return !setEq(img, B) && img.some((p) => B.some((r) => same(p, r)));
      });
    },
  },
  'm14.complete-symmetry': {
    'REFL-WRONG-AXIS': (q) => { const s = symAsk(q); const g = s.vert ? mirrorH(s.a) : mirrorV(s.a); return s.corners.map((p) => T(g(p))); },
    'REFL-FROM-ORIGIN': (q) => { const s = symAsk(q); const g = s.vert ? mirrorV(0) : mirrorH(0); return s.corners.map((p) => T(g(p))); },
    'REFL-NEGATE-BOTH': (q) => symAsk(q).corners.map((p) => T([-p[0], -p[1]])),
    'COORD-SWAP': (q) => symAsk(q).corners.map((p) => T([p[1], p[0]])),
  },
};
