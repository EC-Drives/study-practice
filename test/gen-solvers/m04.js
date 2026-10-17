// Independent answers for the m04 3D shapes, volume and capacity generators, worked out again from
// the question text and the diagram data (cuboid dimensions, net cells), and the misconception rules
// that reproduce each wrong option. Shares no code with js/generators.

import { numbersIn, parseQ, qnum } from './lib.js';

const num = (t) => qnum(parseQ(String(t)));
const SIDES = { triangular: 3, triangle: 3, 'square-based': 4, square: 4, pentagonal: 5, pentagon: 5, hexagonal: 6, hexagon: 6, heptagonal: 7, heptagon: 7, octagonal: 8, octagon: 8 };

// ---------------------------------------------------------------- faces, edges and vertices (Euler: V - E + F = 2)

function counts(kind, n) {
  const F = kind === 'prism' ? n + 2 : n + 1;
  const V = kind === 'prism' ? 2 * n : n + 1;
  return { faces: F, vertices: V, edges: V + F - 2 };
}
function shapeOf(q) {
  const t = q.prompt;
  const ask = t.match(/How many (faces|edges|vertices)/)[1];
  let m;
  if ((m = t.match(/\b(prism|pyramid) (?:has (?:exactly )?|with )(\d+) (faces|edges|vertices)/))) {
    const [, kind, g, given] = m;
    const G = Number(g);
    const n = kind === 'prism' ? { faces: G - 2, edges: G / 3, vertices: G / 2 }[given] : { faces: G - 1, edges: G / 2, vertices: G - 1 }[given];
    return { kind, n, ask, given: G };
  }
  if (/^Look at this 3D shape/.test(t)) { const sh = q.diagram.shape; return { kind: /Pyramid/.test(sh) ? 'pyramid' : 'prism', n: { cube: 4, cuboid: 4, triangularPrism: 3, pentagonalPrism: 5, hexagonalPrism: 6, squarePyramid: 4, triangularPyramid: 3 }[sh], ask }; }
  const qs = t.slice(t.lastIndexOf('How many'));
  const all = t;
  if (/\bcube\b|\bcuboid\b/.test(qs) && !/pyramid|prism/.test(qs)) return { kind: 'prism', n: 4, ask };
  if (/tetrahedron/.test(qs)) return { kind: 'pyramid', n: 3, ask };
  if ((m = all.match(/A (prism|pyramid) has a base that is an? (\w+) \((\d+) sides\)/))) return { kind: m[1], n: Number(m[3]), ask };
  m = all.match(/(triangular|square-based|pentagonal|hexagonal|heptagonal|octagonal) (prism|pyramid)(?![\s\S]*(?:triangular|square-based|pentagonal|hexagonal|heptagonal|octagonal) (?:prism|pyramid))/);
  return { kind: m[2], n: SIDES[m[1]], ask };
}

// ---------------------------------------------------------------- nets

const NETS = {
  cube: { name: 'cube', faces: 6, edges: 12, vertices: 8 },
  cuboid: { name: 'cuboid', faces: 6, edges: 12, vertices: 8 },
  triangularPrism: { name: 'triangular prism', faces: 5, edges: 9, vertices: 6 },
  squarePyramid: { name: 'square-based pyramid', faces: 5, edges: 8, vertices: 5 },
  tetrahedron: { name: 'triangle-based pyramid (tetrahedron)', faces: 4, edges: 6, vertices: 4 },
};
const SWAP = { cube: 'squarePyramid', cuboid: 'squarePyramid', triangularPrism: 'tetrahedron', squarePyramid: 'cuboid', tetrahedron: 'triangularPrism' };
const BASE_NAME = { triangularPrism: 'cuboid', squarePyramid: 'tetrahedron', tetrahedron: 'squarePyramid' };
const netKey = (q) => (q.diagram.shape === 'custom' ? 'cube' : q.diagram.shape);

/** Fold squares by tracking each face's outward direction in 3D. Returns one direction per cell, or null. */
function foldNormals(cells) {
  const neg = (a) => a.map((x) => -x);
  const idx = new Map(cells.map((c, i) => [`${c[0]},${c[1]}`, i]));
  const st = new Array(cells.length).fill(null);
  st[0] = { n: [0, 0, -1], r: [1, 0, 0], d: [0, 1, 0] };
  const todo = [0];
  while (todo.length) {
    const i = todo.pop();
    const { n, r, d } = st[i];
    const [c, w] = cells[i];
    const moves = [[1, 0, { n: r, r: neg(n), d }], [-1, 0, { n: neg(r), r: n, d }], [0, 1, { n: d, r, d: neg(n) }], [0, -1, { n: neg(d), r, d: n }]];
    for (const [dc, dw, ns] of moves) {
      const j = idx.get(`${c + dc},${w + dw}`);
      if (j == null || st[j]) continue;
      st[j] = ns;
      todo.push(j);
    }
  }
  if (st.some((x) => !x)) return null;
  const keys = st.map((x) => x.n.join(','));
  return new Set(keys).size === 6 ? keys : null;
}
function opposite(q) {
  const keys = foldNormals(q.diagram.cells);
  const L = q.diagram.faceLabels;
  const x = q.prompt.match(/opposite the face labelled (\w)/)[1];
  const i = L.indexOf(x);
  const want = keys[i].split(',').map((v) => String(-Number(v) || 0)).join(',');
  const j = keys.findIndex((k) => k.split(',').map((v) => String(Number(v) || 0)).join(',') === want);
  return { ans: L[j], adjacent: L.filter((_, k) => k !== i && k !== j) };
}

// ---------------------------------------------------------------- surface area and volume

const cub = (q) => ({ l: q.diagram.l, w: q.diagram.w, h: q.diagram.h });
function saInfo(q) {
  let m;
  if ((m = q.prompt.match(/Each face of a cube has an area of (\d+)/))) { const a = Number(m[1]); const e = Math.sqrt(a); return { l: e, w: e, h: e, full: 6 * a, ans: 6 * a }; }
  if ((m = q.prompt.match(/cube with edges (\d+)|cube has edges (\d+)/))) { const e = Number(m[1] || m[2]); return { l: e, w: e, h: e, full: 6 * e * e, ans: 6 * e * e }; }
  if (!q.diagram) { const A = num(numbersIn(q.prompt)[0]); return { edgeQ: true, A, e: Math.sqrt(A / 6) }; }
  const { l, w, h } = cub(q);
  const full = 2 * (l * w + l * h + w * h);
  return { l, w, h, full, open: /no lid/.test(q.prompt), ans: /no lid/.test(q.prompt) ? full - l * w : full };
}
function volInfo(q) {
  if (/water level rises/.test(q.prompt)) { const [l, w, h0, h1] = numbersIn(q.prompt).map(num); return { kind: 'disp', l, w, h0, h1, ans: l * w * (h1 - h0) }; }
  if (q.diagram.labels && q.diagram.labels.h === '?') { const V = num(numbersIn(q.prompt)[0]); const { l, w } = cub(q); return { kind: 'missing', V, l, w, ans: V / (l * w) }; }
  const { l, w, h } = cub(q);
  return { kind: 'plain', l, w, h, ans: l * w * h };
}
function capInfo(q) {
  const t = q.prompt;
  let m;
  if ((m = t.match(/How many (?:millilitres|cubic centimetres) is ([\d.]+) litres/))) { const x = num(m[1]); return { kind: 'L>ml', x, ans: Math.round(x * 1000) }; }
  if ((m = t.match(/holds ([\d ]+) cm\^3/))) { const x = num(m[1]); return { kind: 'cm3>ml', x, ans: x }; }
  if ((m = t.match(/^Write ([\d ]+) (?:ml|cm\^3) in litres/))) { const x = num(m[1]); return { kind: '>L', x, ans: x / 1000 }; }
  const { l, w, h } = cub(q);
  if ((m = t.match(/to (\d+)\/(\d+) of its height/))) { const full = l * w * h; return { kind: 'part', full, ans: (full * Number(m[1])) / Number(m[2]) }; }
  if ((m = t.match(/another ([\d ]+) ml/))) { const cap = l * w * h; const add = num(m[1]); return { kind: 'box', cap, add, ans: cap / 2 - add }; }
  const V = l * w * h;
  return { kind: 'tank', V, ans: V / 1000 };
}

export const SOLVERS = {
  'm04.faces-edges-vertices': (q) => { const s = shapeOf(q); return { value: counts(s.kind, s.n)[s.ask] }; },
  'm04.net-shape': (q) => {
    const k = netKey(q);
    if (k === 'cube' && !foldNormals(q.diagram.cells)) throw new Error('the drawn net does not fold into a cube');
    const ask = q.prompt.match(/how many (edges|vertices)/);
    return ask ? { value: NETS[k][ask[1]] } : { text: NETS[k].name };
  },
  'm04.cube-net': (q) => (q.type === 'truefalse' ? { bool: !!foldNormals(q.diagram.cells) } : { text: opposite(q).ans }),
  'm04.surface-area': (q) => { const s = saInfo(q); return { value: s.edgeQ ? s.e : s.ans }; },
  'm04.volume': (q) => ({ value: volInfo(q).ans }),
  'm04.capacity': (q) => ({ value: capInfo(q).ans }),
};

export const MIS = {
  'm04.faces-edges-vertices': {
    'FEV-BASE-ONLY': (q) => [shapeOf(q).n],
    'FEV-MISSED-PART': (q) => { const s = shapeOf(q); const n = s.n; return [s.kind === 'prism' ? { faces: n + 1, edges: 2 * n, vertices: n }[s.ask] : n]; },
    'FEV-PRISM-PYRAMID-SWAP': (q) => { const s = shapeOf(q); return [counts(s.kind === 'prism' ? 'pyramid' : 'prism', s.n)[s.ask]]; },
    'FEV-WRONG-COUNT': (q) => { const s = shapeOf(q); const c = counts(s.kind, s.n); return Object.keys(c).filter((k) => k !== s.ask).map((k) => c[k]); },
    'FEV-FACES-AS-SIDES': (q) => { const s = shapeOf(q); return [counts(s.kind, s.given)[s.ask]]; },
  },
  'm04.net-shape': {
    'NET-CUBE-CUBOID': (q) => [{ cube: 'cuboid', cuboid: 'cube' }[netKey(q)]].filter(Boolean),
    'FEV-PRISM-PYRAMID-SWAP': (q) => { const s = NETS[SWAP[netKey(q)]]; const ask = q.prompt.match(/how many (edges|vertices)/); return ask ? [s[ask[1]]] : [s.name]; },
    'NET-BASE-SHAPE': (q) => [NETS[BASE_NAME[netKey(q)]].name],
    'FEV-WRONG-COUNT': (q) => { const s = NETS[netKey(q)]; const ask = q.prompt.match(/how many (edges|vertices)/)[1]; return [s.faces, ask === 'edges' ? s.vertices : s.edges]; },
  },
  'm04.cube-net': {
    'NET-ADJACENT': (q) => opposite(q).adjacent,
  },
  'm04.surface-area': {
    'SA-FOUR-FACES': (q) => { const s = saInfo(q); return s.edgeQ ? [s.A / 4] : [4 * s.l * s.l, 6 * s.l * s.w]; },
    'SA-VOLUME-SWAP': (q) => { const s = saInfo(q); return [s.l * s.w * s.h]; },
    'SA-NO-SQUARE': (q) => [6 * saInfo(q).l],
    'SA-ONE-FACE': (q) => { const s = saInfo(q); return [s.l * s.l]; },
    'SA-ONE-FACE-EACH': (q) => { const s = saInfo(q); return [s.l * s.w + s.l * s.h + s.w * s.h]; },
    'SA-MISSED-PAIR': (q) => { const s = saInfo(q); return [2 * (s.l * s.w + s.l * s.h), 2 * (s.l * s.w + s.w * s.h), 2 * (s.l * s.h + s.w * s.h)]; },
    'SA-OPEN-AS-CLOSED': (q) => [saInfo(q).full],
    'SA-OPEN-WRONG-FACE': (q) => { const s = saInfo(q); return [s.full - 2 * s.l * s.w]; },
    'SA-EDGE-NO-ROOT': (q) => { const s = saInfo(q); return [s.A / 6, s.A / 12]; },
  },
  'm04.volume': {
    'VOL-ADD-SIDES': (q) => { const v = volInfo(q); return [v.l + v.w + v.h]; },
    'VOL-BASE-ONLY': (q) => { const v = volInfo(q); return [v.l * v.w]; },
    'VOL-ONE-LAYER': (q) => { const v = volInfo(q); return [v.l * v.h]; },
    'SA-VOLUME-SWAP': (q) => { const v = volInfo(q); return [2 * (v.l * v.w + v.l * v.h + v.w * v.h)]; },
    'VOL-MISSING-SUBTRACT': (q) => { const v = volInfo(q); return [v.V - v.l - v.w]; },
    'VOL-MISSING-ADD-SIDES': (q) => { const v = volInfo(q); return [v.V / (v.l + v.w)]; },
    'VOL-MISSING-ONE-DIVIDE': (q) => { const v = volInfo(q); return [v.V / v.l, v.V / v.w]; },
    'VOL-WHOLE-WATER': (q) => { const v = volInfo(q); return [v.l * v.w * v.h1]; },
    'VOL-PERIMETER-BASE': (q) => { const v = volInfo(q); return [(2 * v.l + 2 * v.w) * (v.h1 - v.h0)]; },
    'VOL-ADD-RISE': (q) => { const v = volInfo(q); return [v.l * v.w + (v.h1 - v.h0)]; },
  },
  'm04.capacity': {
    'UNIT-FACTOR-WRONG': (q) => {
      const c = capInfo(q);
      if (c.kind === 'L>ml') return [Math.round(c.x * 100), Math.round(c.x * 10)];
      if (c.kind === 'cm3>ml') return [c.x * 1000, c.x * 10, c.x / 10];
      if (c.kind === '>L') return [c.x / 100, c.x / 10];
      if (c.kind === 'tank') return [c.V / 100, c.V / 10000];
      return [c.ans / 10];
    },
    'PV-SHIFT-WRONG': (q) => { const c = capInfo(q); return c.kind === 'L>ml' ? [c.ans * 10] : [c.x * 1000]; },
    'UNIT-NOT-CONVERTED': (q) => [capInfo(q).V],
    'CAP-FULL-NOT-PART': (q) => [capInfo(q).full],
    'PCT-OF-WRONG-WHOLE': (q) => { const c = capInfo(q); return c.kind === 'part' ? [c.full - c.ans] : [c.cap / 2 + c.add]; },
    'CAP-STEP-MISSED': (q) => { const c = capInfo(q); return [c.cap - c.add, c.cap / 2]; },
  },
};
