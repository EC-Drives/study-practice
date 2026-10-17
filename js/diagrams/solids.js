// 3D shapes: nets, a cuboid with dimensions (optionally built from unit cubes), shapes built from
// unit cubes, and named solids. Drawn in oblique projection: depth goes back and up to the right
// at 30 degrees, at half scale, as in textbooks. Hidden edges are dashed.

import { el, g, F, Box, label, labelAt, tidy, num, pathOf, listText, say, plural, pt, round, withArticle } from './core.js';

const DEPTH_ANGLE = 30;
const DEPTH_SCALE = 0.5;
const depthVec = (w, u) => [w * u * DEPTH_SCALE * Math.cos((DEPTH_ANGLE * Math.PI) / 180), -w * u * DEPTH_SCALE * Math.sin((DEPTH_ANGLE * Math.PI) / 180)];
const add = (p, q) => [p[0] + q[0], p[1] + q[1]];
const mid = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
const line = (p, q, hidden = false, w = 2.2) => el('line', { x1: p[0], y1: p[1], x2: q[0], y2: q[1], class: hidden ? 'dg-ink2' : 'dg-ink', 'stroke-width': hidden ? 1.4 : w, 'stroke-dasharray': hidden ? '5 4' : null });

// ---------------------------------------------------------------- net

const CUBE_CROSS = [[1, 0], [0, 1], [1, 1], [2, 1], [3, 1], [1, 2]];

/** The faces of a net as polygons in units (y down), plus labelled edges. */
function netFaces(s) {
  if (s.shape === 'custom' || (s.shape === 'cube' && s.cells) || s.shape === 'cube') {
    const cells = s.cells || CUBE_CROSS;
    return { faces: cells.map(([c, r]) => [[c, r], [c + 1, r], [c + 1, r + 1], [c, r + 1]]), edges: [] };
  }
  if (s.shape === 'cuboid') {
    const { l, w, h } = s;
    const x0 = w; const x1 = w + l;
    const faces = [
      [[x0, 0], [x1, 0], [x1, w], [x0, w]], // top
      [[0, w], [x0, w], [x0, w + h], [0, w + h]], // left side
      [[x0, w], [x1, w], [x1, w + h], [x0, w + h]], // front
      [[x1, w], [x1 + w, w], [x1 + w, w + h], [x1, w + h]], // right side
      [[x0, w + h], [x1, w + h], [x1, 2 * w + h], [x0, 2 * w + h]], // bottom
      [[x0, 2 * w + h], [x1, 2 * w + h], [x1, 2 * w + 2 * h], [x0, 2 * w + 2 * h]], // back
    ];
    const edges = [
      { key: 'l', p: [x0, 0], q: [x1, 0], dir: 90 },
      { key: 'w', p: [x0, 0], q: [x0, w], dir: 180 },
      { key: 'h', p: [0, w], q: [0, w + h], dir: 180 },
    ];
    return { faces, edges };
  }
  if (s.shape === 'triangularPrism') {
    const l = s.l || 6; const w = s.w || 3; const h = s.h || (w * Math.sqrt(3)) / 2;
    const sl = Math.hypot(w / 2, h);
    const x0 = sl; const x1 = sl + w;
    const top = h; const bot = h + l;
    const faces = [
      [[0, top], [x0, top], [x0, bot], [0, bot]],
      [[x0, top], [x1, top], [x1, bot], [x0, bot]],
      [[x1, top], [x1 + sl, top], [x1 + sl, bot], [x1, bot]],
      [[x0, top], [x0 + w / 2, 0], [x1, top]],
      [[x0, bot], [x1, bot], [x0 + w / 2, bot + h]],
    ];
    const edges = [{ key: 'l', p: [0, top], q: [0, bot], dir: 180 }, { key: 'w', p: [x0, bot], q: [x1, bot], dir: 0, inside: true }, { key: 'h', p: [x1 + sl, top], q: [x1 + sl, top], dir: 0 }];
    return { faces, edges: edges.slice(0, 2) };
  }
  if (s.shape === 'squarePyramid') {
    const a = 1; const t = 0.9;
    const faces = [
      [[t, t], [t + a, t], [t + a, t + a], [t, t + a]],
      [[t, t], [t + a / 2, 0], [t + a, t]],
      [[t + a, t], [2 * t + a, t + a / 2], [t + a, t + a]],
      [[t + a, t + a], [t + a / 2, 2 * t + a], [t, t + a]],
      [[t, t + a], [0, t + a / 2], [t, t]],
    ];
    return { faces, edges: [] };
  }
  // tetrahedron: an equilateral triangle cut into four
  const H = Math.sqrt(3) / 2;
  const A = [0, 2 * H]; const B = [2, 2 * H]; const C = [1, 0];
  const ab = mid(A, B); const bc = mid(B, C); const ca = mid(C, A);
  return { faces: [[ca, bc, C], [A, ab, ca], [ab, B, bc], [ab, bc, ca]], edges: [] };
}

const net = {
  size: 'medium',
  schema: {
    shape: F.enum('cube', 'cuboid', 'triangularPrism', 'squarePyramid', 'tetrahedron', 'custom'),
    cells: F.arr(F.arr(F.int(0, 8), 2, 2), 1, 12), l: F.num(0.1, 100), w: F.num(0.1, 100), h: F.num(0.1, 100),
    labels: F.obj({ l: F.label, w: F.label, h: F.label }), faceLabels: F.arr(F.label, 0, 12), shaded: F.arr(F.int(0, 11), 0, 12),
  },
  required: ['shape'],
  check(s) {
    const e = [];
    if (s.shape === 'custom' && !s.cells) e.push('a custom net needs cells');
    if (s.shape === 'cuboid' && !(s.l && s.w && s.h)) e.push('a cuboid net needs l, w and h');
    if (s.cells) { const keys = s.cells.map((c) => c.join(',')); if (new Set(keys).size !== keys.length) e.push('two cells are in the same place'); }
    return e;
  },
  render(s) {
    const { faces, edges } = netFaces(s);
    const xs = faces.flat().map((p) => p[0]); const ys = faces.flat().map((p) => p[1]);
    const minx = Math.min(...xs); const miny = Math.min(...ys);
    const W = Math.max(...xs) - minx; const Hh = Math.max(...ys) - miny;
    const u = Math.min(s.shape === 'custom' || s.shape === 'cube' ? 44 : 120, 320 / W, 300 / Hh);
    const T = ([x, y]) => [(x - minx) * u, (y - miny) * u];
    const box = new Box();
    const body = [];
    const shaded = new Set(s.shaded || []);
    faces.forEach((f, i) => {
      const P = f.map(T);
      box.addPts(P);
      body.push(el('path', { d: pathOf(P), class: shaded.has(i) ? 'dg-part' : 'dg-shade2' }));
      body.push(el('path', { d: pathOf(P), class: 'dg-ink', 'stroke-width': 2 }));
      const lab = (s.faceLabels || [])[i];
      if (lab != null && lab !== '') {
        const c = P.reduce((a, p) => [a[0] + p[0] / P.length, a[1] + p[1] / P.length], [0, 0]);
        body.push(label(c[0], c[1], String(lab), { size: 16, weight: 700 }));
      }
    });
    for (const ed of edges) {
      const t = s.labels && s.labels[ed.key];
      if (t == null || t === '') continue;
      const m = mid(T(ed.p), T(ed.q));
      body.push(labelAt(box, m[0], m[1], ed.dir + (ed.inside ? 180 : 0), String(t), { size: 16 }).node);
    }
    return { box, body };
  },
  describe(s) {
    const names = { cube: 'cube', cuboid: 'cuboid', triangularPrism: 'triangular prism', squarePyramid: 'square-based pyramid', tetrahedron: 'tetrahedron (triangle-based pyramid)' };
    if (s.shape === 'custom' || (s.shape === 'cube' && s.cells)) {
      const cells = s.cells;
      const rows = [...new Set(cells.map((c) => c[1]))].sort((a, b) => a - b);
      const desc = rows.map((r) => {
        const cs = cells.filter((c) => c[1] === r).map((c) => c[0]).sort((a, b) => a - b);
        return `row ${r + 1}: squares in column${cs.length > 1 ? 's' : ''} ${listText(cs.map((c) => c + 1))}`;
      });
      return `A net of ${plural(cells.length, 'square')} joined edge to edge. ${cap(desc.join('; '))}.${faceText(s)}`;
    }
    const parts = [`The net of ${withArticle(names[s.shape])}.`];
    if (s.shape === 'cuboid') parts.push('Six rectangles: a column of four (top, front, bottom, back) with one side face either side of the front.');
    if (s.shape === 'triangularPrism') parts.push('Three rectangles side by side, with a triangle on the top and the bottom of the middle one.');
    if (s.shape === 'squarePyramid') parts.push('A square with a triangle on each of its four sides.');
    if (s.shape === 'tetrahedron') parts.push('A large triangle made of four equal triangles.');
    if (s.shape === 'cube') parts.push('Six squares in a cross shape.');
    if (s.labels) parts.push(`Edges are labelled ${listText(Object.values(s.labels).filter((x) => x !== '').map(say))}.`);
    return parts.join(' ') + faceText(s);
  },
};
const faceText = (s) => ((s.faceLabels || []).some((x) => x !== '') ? ` The faces are labelled ${listText(s.faceLabels.filter((x) => x !== '').map(say))}.` : '');
const cap = (t) => (t ? t[0].toUpperCase() + t.slice(1) : t);

// ---------------------------------------------------------------- cuboid

const cuboid = {
  size: 'medium',
  schema: { l: F.num(0.1, 1000), w: F.num(0.1, 1000), h: F.num(0.1, 1000), labels: F.obj({ l: F.label, w: F.label, h: F.label }), unitCubes: F.bool, hiddenEdges: F.bool },
  required: ['l', 'w', 'h'],
  check(s) {
    if (s.unitCubes && ![s.l, s.w, s.h].every((v) => Number.isInteger(v) && v <= 12)) return ['unitCubes needs whole-number sizes up to 12'];
    return [];
  },
  render(s) {
    const { l, w, h } = s;
    const dv0 = depthVec(w, 1);
    const u = Math.min(300 / (l + dv0[0]), 200 / (h - dv0[1]), 60);
    const dv = depthVec(w, u);
    const A = [0, h * u]; const B = [l * u, h * u]; const C = [l * u, 0]; const D = [0, 0]; // front: bottom-left, bottom-right, top-right, top-left
    const [A2, B2, C2, D2] = [A, B, C, D].map((p) => add(p, dv));
    const box = new Box().addPts([A, B, C, D, A2, B2, C2, D2]);
    const body = [];
    body.push(el('path', { d: pathOf([D, C, C2, D2]), class: 'dg-shade2' }));
    body.push(el('path', { d: pathOf([B, C, C2, B2]), class: 'dg-shade' }));
    if (s.hiddenEdges !== false) body.push(line(A, A2, true), line(A2, B2, true), line(A2, D2, true));
    if (s.unitCubes) {
      let d = '';
      for (let i = 1; i < l; i++) { d += `M${pt([i * u, h * u])}L${pt([i * u, 0])}L${pt(add([i * u, 0], dv))}`; }
      for (let j = 1; j < h; j++) { d += `M${pt([0, j * u])}L${pt([l * u, j * u])}L${pt(add([l * u, j * u], dv))}`; }
      for (let k = 1; k < w; k++) { const v = depthVec(k, u); d += `M${pt(add(D, v))}L${pt(add(C, v))}L${pt(add(B, v))}`; }
      body.push(el('path', { d, class: 'dg-ink', 'stroke-width': 1.1 }));
    }
    body.push(el('path', { d: pathOf([A, B, C, D]), class: 'dg-ink', 'stroke-width': 2.2 }));
    body.push(el('path', { d: `M${pt(D)}L${pt(D2)}L${pt(C2)}L${pt(B2)}L${pt(B)}M${pt(C)}L${pt(C2)}`, class: 'dg-ink', 'stroke-width': 2.2 }));
    const L = s.labels || {};
    if (L.l != null && L.l !== '') body.push(labelAt(box, ...mid(A, B), 270, String(L.l), { size: 15 }).node);
    if (L.h != null && L.h !== '') body.push(labelAt(box, ...mid(A, D), 180, String(L.h), { size: 15 }).node);
    if (L.w != null && L.w !== '') body.push(labelAt(box, ...mid(B, B2), -60, String(L.w), { size: 15 }).node);
    return { box, body };
  },
  describe(s) {
    const L = s.labels || {};
    const parts = [s.l === s.w && s.w === s.h ? 'A cube.' : 'A cuboid.'];
    if (s.unitCubes) parts.push(`It is built from 1-unit cubes: ${s.l} along the length, ${s.w} deep and ${s.h} high.`);
    const lab = [['length', L.l], ['width (depth)', L.w], ['height', L.h]].filter(([, v]) => v != null && v !== '').map(([k, v]) => `the ${k} is labelled ${say(v)}`);
    if (lab.length) parts.push(`${cap(listText(lab))}.`);
    return parts.join(' ');
  },
};

// ---------------------------------------------------------------- cubes

const cubes = {
  size: 'small',
  schema: { cubes: F.arr(F.arr(F.int(0, 9), 3, 3), 1, 60) },
  required: ['cubes'],
  check(s) { const k = s.cubes.map((c) => c.join(',')); return new Set(k).size !== k.length ? ['two cubes are in the same place'] : []; },
  render(s) {
    const u = 40;
    const P = ([x, y, z]) => add([x * u, -z * u], depthVec(y, u));
    const order = [...s.cubes].sort((a, b) => b[1] - a[1] || a[2] - b[2] || a[0] - b[0]);
    const box = new Box();
    const body = [];
    const has = new Set(s.cubes.map((c) => c.join(',')));
    for (const [x, y, z] of order) {
      const f = [P([x, y, z]), P([x + 1, y, z]), P([x + 1, y, z + 1]), P([x, y, z + 1])];
      const t = [P([x, y, z + 1]), P([x + 1, y, z + 1]), P([x + 1, y + 1, z + 1]), P([x, y + 1, z + 1])];
      const r = [P([x + 1, y, z]), P([x + 1, y + 1, z]), P([x + 1, y + 1, z + 1]), P([x + 1, y, z + 1])];
      box.addPts([...f, ...t, ...r]);
      if (!has.has(`${x},${y},${z + 1}`)) body.push(el('path', { d: pathOf(t), class: 'dg-fill-surface' }), el('path', { d: pathOf(t), class: 'dg-shade2 ' }), el('path', { d: pathOf(t), class: 'dg-ink', 'stroke-width': 1.6 }));
      if (!has.has(`${x + 1},${y},${z}`)) body.push(el('path', { d: pathOf(r), class: 'dg-fill-surface' }), el('path', { d: pathOf(r), class: 'dg-shade' }), el('path', { d: pathOf(r), class: 'dg-ink', 'stroke-width': 1.6 }));
      body.push(el('path', { d: pathOf(f), class: 'dg-fill-surface' }), el('path', { d: pathOf(f), class: 'dg-ink', 'stroke-width': 1.6 }));
    }
    return { box, body };
  },
  describe(s) {
    const layers = {};
    for (const [, , z] of s.cubes) layers[z] = (layers[z] || 0) + 1;
    const zs = Object.keys(layers).map(Number).sort((a, b) => a - b);
    return `A shape made of ${plural(s.cubes.length, 'cube')}, all the same size, in ${plural(zs.length, 'layer')}: ${listText(zs.map((z) => `${layers[z]} in layer ${z + 1}${z === 0 ? ' (the bottom)' : ''}`))}. Some cubes may be hidden behind others.`;
  },
};

// ---------------------------------------------------------------- named solids

/** A prism from a convex front polygon (screen coordinates, y down) and a depth vector. */
function prism(front, dv) {
  const back = front.map((p) => add(p, dv));
  const n = front.length;
  // signed area: outward normal side of each edge
  let area = 0;
  for (let i = 0; i < n; i++) { const p = front[i]; const q = front[(i + 1) % n]; area += p[0] * q[1] - q[0] * p[1]; }
  const sgn = Math.sign(area) || 1;
  const visible = [];
  for (let i = 0; i < n; i++) {
    const p = front[i]; const q = front[(i + 1) % n];
    const e = [q[0] - p[0], q[1] - p[1]];
    const nrm = sgn > 0 ? [e[1], -e[0]] : [-e[1], e[0]]; // outward normal
    visible.push(nrm[0] * dv[0] + nrm[1] * dv[1] > 1e-9);
  }
  const out = [];
  for (let i = 0; i < n; i++) if (visible[i]) out.push(el('path', { d: pathOf([front[i], front[(i + 1) % n], back[(i + 1) % n], back[i]]), class: 'dg-shade' }));
  out.push(el('path', { d: pathOf(front), class: 'dg-shade2' }));
  for (let i = 0; i < n; i++) {
    out.push(line(back[i], back[(i + 1) % n], !visible[i]));
    out.push(line(front[i], back[i], !(visible[i] || visible[(i - 1 + n) % n])));
  }
  out.push(el('path', { d: pathOf(front), class: 'dg-ink', 'stroke-width': 2.2 }));
  return { nodes: out, pts: [...front, ...back] };
}
function regular(n, r, rot = -90) {
  return Array.from({ length: n }, (_, i) => { const a = ((rot + (360 * i) / n) * Math.PI) / 180; return [r * Math.cos(a), r * Math.sin(a)]; });
}

const SOLID_NAMES = {
  cube: 'cube', cuboid: 'cuboid', triangularPrism: 'triangular prism', pentagonalPrism: 'pentagonal prism', hexagonalPrism: 'hexagonal prism',
  squarePyramid: 'square-based pyramid', triangularPyramid: 'triangle-based pyramid (tetrahedron)', cylinder: 'cylinder', cone: 'cone', sphere: 'sphere', hemisphere: 'hemisphere',
};
const SOLID_FACTS = {
  cube: [6, 12, 8], cuboid: [6, 12, 8], triangularPrism: [5, 9, 6], pentagonalPrism: [7, 15, 10], hexagonalPrism: [8, 18, 12],
  squarePyramid: [5, 8, 5], triangularPyramid: [4, 6, 4],
};

const solid = {
  size: 'small',
  schema: { shape: F.enum(...Object.keys(SOLID_NAMES)), label: F.str },
  required: ['shape'],
  render(s) {
    const box = new Box();
    const body = [];
    const sh = s.shape;
    if (sh === 'cube' || sh === 'cuboid') {
      const r = cuboid.render({ l: sh === 'cube' ? 3 : 4.4, w: 3, h: sh === 'cube' ? 3 : 2.4 });
      body.push(...r.body); box.add(r.box.x0, r.box.y0).add(r.box.x1, r.box.y1);
    } else if (sh.endsWith('Prism')) {
      const n = { triangularPrism: 3, pentagonalPrism: 5, hexagonalPrism: 6 }[sh];
      const front = sh === 'triangularPrism' ? [[0, 0], [130, 0], [65, -105]].map(([x, y]) => [x, y + 105]) : regular(n, 66, n === 6 ? 0 : -90).map(([x, y]) => [x + 70, y + 70]);
      const p = prism(front, sh === 'triangularPrism' ? depthVec(5.4, 40) : depthVec(4.4, 40));
      body.push(...p.nodes); box.addPts(p.pts);
    } else if (sh === 'squarePyramid' || sh === 'triangularPyramid') {
      const dv = depthVec(4, 40);
      const B = sh === 'squarePyramid' ? [[0, 120], [140, 120], add([140, 120], dv), add([0, 120], dv)] : [[0, 120], [150, 120], add([75, 120], dv)];
      const c = B.reduce((a, p) => [a[0] + p[0] / B.length, a[1] + p[1] / B.length], [0, 0]);
      const apex = [c[0], -10];
      const back = sh === 'squarePyramid' ? 3 : 2; // the hidden base corner
      body.push(el('path', { d: pathOf([B[0], B[1], apex]), class: 'dg-shade2' }));
      if (sh === 'squarePyramid') body.push(el('path', { d: pathOf([B[1], B[2], apex]), class: 'dg-shade' }));
      else body.push(el('path', { d: pathOf([B[1], B[2], apex]), class: 'dg-shade' }));
      for (let i = 0; i < B.length; i++) {
        const j = (i + 1) % B.length;
        body.push(line(B[i], B[j], i === back || j === back));
        body.push(line(B[i], apex, i === back));
      }
      box.addPts([...B, apex]);
    } else if (sh === 'cylinder') {
      const rx = 60; const ry = 18; const H = 140;
      body.push(el('path', { d: `M${-rx},0V${H}A${rx},${ry} 0 0 0 ${rx},${H}V0Z`, class: 'dg-shade' }));
      body.push(el('ellipse', { cx: 0, cy: 0, rx, ry, class: 'dg-shade2' }), el('ellipse', { cx: 0, cy: 0, rx, ry, class: 'dg-ink', 'stroke-width': 2.2 }));
      body.push(el('path', { d: `M${-rx},${H}A${rx},${ry} 0 0 1 ${rx},${H}`, class: 'dg-ink2', 'stroke-width': 1.4, 'stroke-dasharray': '5 4' }));
      body.push(el('path', { d: `M${-rx},0V${H}A${rx},${ry} 0 0 0 ${rx},${H}V0`, class: 'dg-ink', 'stroke-width': 2.2 }));
      box.rect(-rx, -ry, 2 * rx, H + 2 * ry);
    } else if (sh === 'cone') {
      const rx = 65; const ry = 19; const H = 150;
      body.push(el('path', { d: `M0,${-H}L${-rx},0A${rx},${ry} 0 0 0 ${rx},0Z`, class: 'dg-shade' }));
      body.push(el('path', { d: `M${-rx},0A${rx},${ry} 0 0 1 ${rx},0`, class: 'dg-ink2', 'stroke-width': 1.4, 'stroke-dasharray': '5 4' }));
      body.push(el('path', { d: `M0,${-H}L${-rx},0A${rx},${ry} 0 0 0 ${rx},0Z`, class: 'dg-ink', 'stroke-width': 2.2 }));
      box.rect(-rx, -H, 2 * rx, H + ry);
    } else if (sh === 'sphere') {
      const R = 75;
      body.push(el('circle', { cx: 0, cy: 0, r: R, class: 'dg-shade' }), el('circle', { cx: 0, cy: 0, r: R, class: 'dg-ink', 'stroke-width': 2.2 }));
      body.push(el('path', { d: `M${-R},0A${R},${R * 0.28} 0 0 1 ${R},0`, class: 'dg-ink2', 'stroke-width': 1.4, 'stroke-dasharray': '5 4' }));
      body.push(el('path', { d: `M${-R},0A${R},${R * 0.28} 0 0 0 ${R},0`, class: 'dg-ink', 'stroke-width': 1.6 }));
      box.circle(0, 0, R);
    } else {
      const R = 80; const ry = 22;
      body.push(el('path', { d: `M${-R},0A${R},${R} 0 0 0 ${R},0Z`, class: 'dg-shade' }));
      body.push(el('ellipse', { cx: 0, cy: 0, rx: R, ry, class: 'dg-shade2' }), el('ellipse', { cx: 0, cy: 0, rx: R, ry, class: 'dg-ink', 'stroke-width': 2.2 }));
      body.push(el('path', { d: `M${-R},0A${R},${R} 0 0 0 ${R},0`, class: 'dg-ink', 'stroke-width': 2.2 }));
      box.rect(-R, -ry, 2 * R, R + ry);
    }
    if (s.label) { const y = box.y1 + 18; body.push(label((box.x0 + box.x1) / 2, y, s.label, { size: 15 })); box.text((box.x0 + box.x1) / 2, y, s.label, 15); }
    return { box, body };
  },
  describe(s) {
    const f = SOLID_FACTS[s.shape];
    const curved = { cylinder: 'two flat circular faces and one curved surface', cone: 'one flat circular face, one curved surface and one point at the top', sphere: 'one curved surface', hemisphere: 'one flat circular face and one curved surface' }[s.shape];
    return `A drawing of a ${s.label ? `3D shape labelled "${tidy(s.label)}"` : '3D shape'}${f ? ` with ${f[0]} faces, ${f[1]} edges and ${f[2]} vertices (hidden edges dashed)` : curved ? ` with ${curved}` : ''}. ${s.label ? '' : `It is ${withArticle(SOLID_NAMES[s.shape])}.`}`.trim();
  },
};

export const SOLIDS = { net, cuboid, cubes, solid };
export { SOLID_NAMES, round as _round, num as _num };
