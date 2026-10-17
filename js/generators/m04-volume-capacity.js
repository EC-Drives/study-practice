// m04 3D shapes, volume and capacity: faces, edges and vertices of prisms and pyramids, nets of 3D
// shapes and of a cube (folding, opposite faces), surface area of cubes and cuboids, volume of
// cuboids (unit cubes, dimensions, missing dimension, displacement) and capacity.
// Patterns and ranges follow the CLO's generator guide (section 2, m04). Every diagram is drawn from
// the same numbers as the answer; an unknown length is drawn as "?".

import { choices, typedMisconceptions, nearMiss, numericAnswer, fmtInt, dec, person, valueOf } from './core.js';

const T = 'm04-3d-shapes-volume-capacity';
const SK = {
  fev: 'faces, edges and vertices', nets: 'nets of 3D shapes', cubeNet: 'nets of a cube', sa: 'surface area of cubes and cuboids',
  vol: 'volume of cuboids', cap: 'capacity and volume',
};

// Misconception codes: all declared once in misconceptions.js (the CLO's catalogue).

// ---------------------------------------------------------------- helpers

const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const around = (v, step, k) => { const w = v + step * (k % 2 ? Math.ceil(k / 2) : -Math.ceil(k / 2)); return w <= 0 ? null : w; };
/** A whole number, or an exact decimal (12.5), as the bank writes it. */
const fmtV = (v) => (Number.isInteger(v) ? fmtInt(v) : dec(v));
const nm = (u) => (v) => `${fmtV(v)} ${u}`;
/** The numbers written in a prompt ("48 650" read as one number). */
const promptNumbers = (t) => (String(t).replace(/(\d) (\d{3})/g, '$1$2').match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
/** A near miss for this prompt, or null when its value already appears in the question (CLO review X3). */
const nearFor = (prompt) => (text, hint) => {
  const v = valueOf(text);
  if (v == null || promptNumbers(prompt).some((x) => Math.abs(x - v) < 1e-9)) return null;
  return nearMiss(text, hint);
};
/** mcq, or numeric with the unit accepted, from a whole-number answer. */
function build(rng, { ans, unit, ds, common, step, hint, typed, prompt }) {
  const U = unit ? nm(unit) : (v) => fmtV(v);
  if (typed) {
    const t = typedMisconceptions(fmtInt(ans), ds.map((x) => ({ ...x, text: fmtV(x.v) })), common);
    return { type: 'numeric', answer: numericAnswer(ans, [fmtInt(ans), String(ans), ...(unit ? [U(ans), `${ans} ${unit.replace('^', '')}`] : [])]), ...t };
  }
  const c = choices(rng, U(ans), ds.map((x) => ({ ...x, text: U(x.v) })), (k) => { const w = around(ans, step, k); return w == null ? null : nearFor(prompt)(U(w), hint); });
  return { type: 'mcq', ...c };
}

// ---------------------------------------------------------------- g01 faces, edges and vertices

const BASES = { 3: ['triangular', 'triangle'], 4: ['square-based', 'square'], 5: ['pentagonal', 'pentagon'], 6: ['hexagonal', 'hexagon'], 7: ['heptagonal', 'heptagon'], 8: ['octagonal', 'octagon'] };
const FEV = { prism: (n) => ({ faces: n + 2, edges: 3 * n, vertices: 2 * n }), pyramid: (n) => ({ faces: n + 1, edges: 2 * n, vertices: n + 1 }) };
const MISSED = { prism: (n) => ({ faces: n + 1, edges: 2 * n, vertices: n }), pyramid: (n) => ({ faces: n, edges: n, vertices: n }) };
const SOLID_OF = { 'prism-3': 'triangularPrism', 'prism-5': 'pentagonalPrism', 'prism-6': 'hexagonalPrism', 'pyramid-4': 'squarePyramid', 'pyramid-3': 'triangularPyramid' };
const NAMED = [
  { name: 'cube', kind: 'prism', n: 4, solid: 'cube', objs: ['A dice is a cube.', 'A box of tissues is shaped like a cube.', 'A Rubik puzzle is a cube.'] },
  { name: 'cuboid', kind: 'prism', n: 4, solid: 'cuboid', objs: ['A shoebox is a cuboid.', 'A brick is a cuboid.', 'A cereal box is a cuboid.'] },
  { name: 'triangular prism', kind: 'prism', n: 3, solid: 'triangularPrism', objs: ['A tent is shaped like a triangular prism.', 'A chocolate box is shaped like a triangular prism.', 'A roof is shaped like a triangular prism.'] },
  { name: 'pentagonal prism', kind: 'prism', n: 5, solid: 'pentagonalPrism', objs: ['A gift box is shaped like a pentagonal prism.', 'A pencil holder is shaped like a pentagonal prism.'] },
  { name: 'hexagonal prism', kind: 'prism', n: 6, solid: 'hexagonalPrism', objs: ['A pencil is shaped like a hexagonal prism.', 'A nut for a bolt is shaped like a hexagonal prism.'] },
  { name: 'square-based pyramid', kind: 'pyramid', n: 4, solid: 'squarePyramid', objs: ['The roof of a tower is a square-based pyramid.', 'A paperweight is shaped like a square-based pyramid.'] },
  { name: 'triangle-based pyramid (tetrahedron)', kind: 'pyramid', n: 3, solid: 'triangularPyramid', objs: ['A tea bag is shaped like a tetrahedron (a triangle-based pyramid).'] },
];
const QWORD = ['faces', 'edges', 'vertices'];
const fevWhy = {
  base: (n, kind, q) => `${n} is the number of sides of the base. A ${kind} has more ${q} than that: count every ${q === 'faces' ? 'face' : q === 'edges' ? 'edge' : 'corner'}.`,
  swap: (kind, q, v) => `${v} is the number of ${q} of a ${kind === 'prism' ? 'pyramid' : 'prism'} with this base. ${kind === 'prism' ? 'A prism has two identical ends joined by rectangles.' : 'A pyramid has one base, with triangles meeting at a point.'}`,
  missed: (kind, q) => (kind === 'prism'
    ? { faces: 'It looks like you counted only one of the two end faces. A prism has two ends.', edges: 'It looks like you missed one set of edges: the prism has edges round both ends AND edges joining the ends.', vertices: 'It looks like you counted the corners of only one end. A prism has corners at both ends.' }[q]
    : { faces: 'It looks like you counted only the triangles. Add the base as well.', edges: 'It looks like you counted only the edges going up to the point. Add the edges round the base.', vertices: 'It looks like you forgot the point at the top. Add it to the corners of the base.' }[q]),
  wrong: (q, other, v) => `${v} is the number of ${other}, not ${q}. ${q === 'faces' ? 'Faces are the flat surfaces.' : q === 'edges' ? 'Edges are the lines where two faces meet.' : 'Vertices are the corners.'}`,
};

const fev = {
  id: 'm04.faces-edges-vertices', topicId: T, subtopicId: 'm04-s1', skill: SK.fev,
  title: 'Faces, edges and vertices of prisms and pyramids (D1 a named shape, D2 from its base, D3 working backwards)',
  difficulties: [1, 2, 3],
  check: { min: 0, integer: true },
  make(rng, d) {
    for (;;) {
      const p = person(rng);
      let kind; let n; let prompt; let ask; let diagram; let solution; let nameTxt;
      const ds = [];
      if (d < 3) {
        if (d === 1) {
          const s = rng.pick(NAMED);
          kind = s.kind; n = s.n; nameTxt = s.name;
          ask = rng.pick(QWORD);
          const intro = rng.chance(0.6) ? `${rng.pick(s.objs)} ` : '';
          prompt = `${intro}How many ${ask} does a ${s.name} have?`;
          if (rng.chance(0.7)) diagram = { type: 'solid', shape: s.solid, alt: `A drawing of a ${s.name}, with hidden edges dashed.` };
          if (rng.chance(0.25)) { prompt = `Look at this 3D shape. Count carefully, including the edges and corners you cannot see. How many ${ask} does it have?`; diagram = { type: 'solid', shape: s.solid, alt: 'A drawing of a 3D shape, with hidden edges dashed.' }; }
          else if (diagram) prompt += ` The diagram shows ${/^[aeiou]/.test(s.name) ? 'an' : 'a'} ${s.name}.`;
        } else {
          kind = rng.pick(['prism', 'pyramid']); n = rng.int(3, 8);
          ask = rng.pick(QWORD);
          const [adj, noun] = BASES[n];
          nameTxt = `${adj} ${kind}`;
          prompt = rng.pick([
            `A ${kind} has a base that is a${/^[aeiou]/.test(noun) ? 'n' : ''} ${noun} (${n} sides). How many ${ask} does it have?`,
            `${p.name} makes a model of a${/^[aeiou]/.test(adj) ? 'n' : ''} ${adj} ${kind}. How many ${ask} does the model have?`,
            `How many ${ask} does a${/^[aeiou]/.test(adj) ? 'n' : ''} ${adj} ${kind} have?`,
          ]);
          const sol = SOLID_OF[`${kind}-${n}`];
          if (sol && rng.chance(0.5)) diagram = { type: 'solid', shape: sol, alt: `A drawing of a ${adj} ${kind}, with hidden edges dashed.` };
          if (diagram) prompt += ` The diagram shows ${/^[aeiou]/.test(adj) ? 'an' : 'a'} ${adj} ${kind}.`;
        }
        const f = FEV[kind](n);
        const ans = f[ask];
        solution = kind === 'prism'
          ? { faces: `A prism has 2 end faces and one rectangle for each side of the end: ${n} + 2 = ${ans} faces.`, edges: `There are ${n} edges round each end (${n} + ${n} = ${2 * n}) and ${n} edges joining the ends: ${2 * n} + ${n} = ${ans} edges.`, vertices: `Each end has ${n} corners: ${n} + ${n} = ${ans} vertices.` }[ask]
          : { faces: `A pyramid has 1 base and one triangle for each side of the base: ${n} + 1 = ${ans} faces.`, edges: `There are ${n} edges round the base and ${n} edges going up to the point: ${n} + ${n} = ${ans} edges.`, vertices: `The base has ${n} corners, plus 1 at the point: ${n} + 1 = ${ans} vertices.` }[ask];
        solution += ` Answer: ${ans}`;
        ds.push({ v: n, code: 'FEV-BASE-ONLY', why: fevWhy.base(n, kind, ask) });
        ds.push({ v: MISSED[kind](n)[ask], code: 'FEV-MISSED-PART', why: fevWhy.missed(kind, ask) });
        const other = kind === 'prism' ? 'pyramid' : 'prism';
        ds.push({ v: FEV[other](n)[ask], code: 'FEV-PRISM-PYRAMID-SWAP', why: fevWhy.swap(kind, ask, FEV[other](n)[ask]) });
        for (const o of QWORD) if (o !== ask) ds.push({ v: f[o], code: 'FEV-WRONG-COUNT', why: fevWhy.wrong(ask, o, f[o]) });
        try {
          const body = build(rng, { ans, ds: dedupe(ds, ans), common: { code: 'FEV-MISSED-PART', why: 'Count carefully: imagine the shape and count every part once.' }, step: 1, hint: `Count every ${ask === 'faces' ? 'face' : ask === 'edges' ? 'edge' : 'corner'} of the ${nameTxt} once.`, typed: rng.chance(0.3), prompt });
          return { ...body, prompt, solution, diagram };
        } catch { continue; }
      }
      // D3: work backwards from one count
      kind = rng.pick(['prism', 'pyramid']); n = rng.int(3, 8); // bases of 3 to 8 sides (CLO review m04 item 7)
      const given = rng.pick(QWORD);
      ask = rng.pick(QWORD.filter((x) => x !== given));
      const f = FEV[kind](n);
      const ans = f[ask];
      prompt = rng.pick([
        `A ${kind} has ${f[given]} ${given}. How many ${ask} does it have?`,
        `${p.name} makes a model of a ${kind} with ${f[given]} ${given}. How many ${ask} does the model have?`,
        `A ${kind} has exactly ${f[given]} ${given}. How many ${ask} must it have?`,
      ]);
      const back = kind === 'prism' ? { faces: `${f.faces} - 2 = ${n}`, edges: `${f.edges} ÷ 3 = ${n}`, vertices: `${f.vertices} ÷ 2 = ${n}` }[given] : { faces: `${f.faces} - 1 = ${n}`, edges: `${f.edges} ÷ 2 = ${n}`, vertices: `${f.vertices} - 1 = ${n}` }[given];
      solution = `First find the shape of the base. ${kind === 'prism' ? 'For a prism' : 'For a pyramid'}, the base has ${back} sides. A ${kind} with a ${n}-sided base has ${ans} ${ask} (${kind === 'prism' ? { faces: `${n} + 2`, edges: `3 x ${n}`, vertices: `2 x ${n}` }[ask] : { faces: `${n} + 1`, edges: `2 x ${n}`, vertices: `${n} + 1` }[ask]}). Answer: ${ans}`;
      const asSides = FEV[kind](f[given])[ask];
      ds.push({ v: asSides, code: 'FEV-FACES-AS-SIDES', why: `It looks like you took ${f[given]} as the number of sides of the base. Work out the base first: it has ${n} sides.` });
      const other = kind === 'prism' ? 'pyramid' : 'prism';
      ds.push({ v: FEV[other](n)[ask], code: 'FEV-PRISM-PYRAMID-SWAP', why: fevWhy.swap(kind, ask, FEV[other](n)[ask]) });
      ds.push({ v: MISSED[kind](n)[ask], code: 'FEV-MISSED-PART', why: fevWhy.missed(kind, ask) });
      ds.push({ v: n, code: 'FEV-BASE-ONLY', why: `${n} is the number of sides of the base. Use it to count the ${ask}.` });
      try {
        const body = build(rng, { ans, ds: dedupe(ds, ans), common: { code: 'FEV-FACES-AS-SIDES', why: 'Find the number of sides of the base first, then count.' }, step: 1, hint: 'Find the number of sides of the base first.', typed: rng.chance(0.3), prompt });
        return { ...body, prompt, solution, marks: 2 };
      } catch { /* draw again */ }
    }
  },
};
/** Drop distractors equal to the answer or to an earlier one. */
function dedupe(ds, ans) { const seen = new Set([ans]); return ds.filter((x) => (seen.has(x.v) ? false : seen.add(x.v))); }

// ---------------------------------------------------------------- nets: folding a cube (die rolling)

/** Fold a set of squares as a rolling cube. Returns the cube face (0-5) on each cell, or null if two cells land on one face. */
function fold(cells) {
  const key = (c) => `${c[0]},${c[1]}`;
  const at = new Map(cells.map((c, i) => [key(c), i]));
  const face = new Array(cells.length).fill(null);
  const start = { top: 0, bottom: 1, north: 2, south: 3, east: 4, west: 5 };
  face[0] = start.bottom;
  const queue = [[0, start]];
  const roll = {
    east: (s) => ({ ...s, bottom: s.east, east: s.top, top: s.west, west: s.bottom }),
    west: (s) => ({ ...s, bottom: s.west, west: s.top, top: s.east, east: s.bottom }),
    south: (s) => ({ ...s, bottom: s.south, south: s.top, top: s.north, north: s.bottom }),
    north: (s) => ({ ...s, bottom: s.north, north: s.top, top: s.south, south: s.bottom }),
  };
  const seen = new Set([0]);
  while (queue.length) {
    const [i, st] = queue.shift();
    const [c, r] = cells[i];
    for (const [dir, dc, dr] of [['east', 1, 0], ['west', -1, 0], ['south', 0, 1], ['north', 0, -1]]) {
      const j = at.get(key([c + dc, r + dr]));
      if (j == null || seen.has(j)) continue;
      const ns = roll[dir](st);
      face[j] = ns.bottom;
      seen.add(j);
      queue.push([j, ns]);
    }
  }
  return new Set(face).size === 6 && seen.size === 6 ? face : null;
}
const OPP = { 0: 1, 1: 0, 2: 3, 3: 2, 4: 5, 5: 4 };
/** A random set of 6 joined squares, moved so its corner is at (0, 0). */
function hexomino(rng) {
  const cells = [[0, 0]];
  const has = (c) => cells.some((x) => x[0] === c[0] && x[1] === c[1]);
  while (cells.length < 6) {
    const [c, r] = rng.pick(cells);
    const [dc, dr] = rng.pick([[1, 0], [-1, 0], [0, 1], [0, -1]]);
    const nc = [c + dc, r + dr];
    if (!has(nc)) cells.push(nc);
  }
  const mc = Math.min(...cells.map((x) => x[0])); const mr = Math.min(...cells.map((x) => x[1]));
  const out = cells.map(([c, r]) => [c - mc, r - mr]);
  if (Math.max(...out.map((x) => x[0])) > 5 || Math.max(...out.map((x) => x[1])) > 5) return null;
  return rng.shuffle(out);
}
const FACES = ['A', 'B', 'C', 'D', 'E', 'F'];

const cubeNet = {
  id: 'm04.cube-net', topicId: T, subtopicId: 'm04-s2', skill: SK.cubeNet,
  title: 'Nets of a cube: does it fold into a cube? (D2), which face is opposite? (D3)',
  difficulties: [2, 3],
  check: {},
  make(rng, d) {
    // drawn once, before the search for a matching net, so true and false come up equally often
    // (CLO review X9: drawing it inside the loop made "false" far more common)
    const want = rng.chance(0.5);
    for (;;) {
      const cells = hexomino(rng);
      if (!cells) continue;
      const f = fold(cells);
      if (d === 2) {
        if (!!f !== want) continue;
        const p = person(rng);
        const prompt = rng.pick([`True or false: the 6 squares shown can be folded to make a cube.`, `${p.name} cuts out the 6 squares shown, in one piece. True or false: ${p.he} can fold them to make a cube.`, `True or false: this is the net of a cube.`]);
        const diagram = { type: 'net', shape: 'custom', cells, alt: 'Six squares joined edge to edge.' };
        const solution = want
          ? 'Imagine folding it: choose one square as the base and fold the others up round it. Every square lands on a different face of the cube, and no face is left empty, so it folds into a cube. The statement is true.'
          : 'Imagine folding it: choose one square as the base and fold the others up round it. Two of the squares land on the same face, so one face of the cube is left open. Six squares is not enough on its own. The statement is false.';
        const wrong = want ? 'false' : 'true';
        const mis = { [wrong]: want ? 'This one does fold into a cube. Try folding it in your head, one square at a time, starting from a square in the middle.' : 'It has 6 squares, but that is not enough. When you fold it, two squares overlap on the same face, so the cube cannot close.' };
        return { type: 'truefalse', prompt, answer: want, solution, misconceptions: mis, codes: { [wrong]: want ? 'NET-MISSED-OVERLAP' : 'NET-COUNT-ONLY' }, diagram };
      }
      if (!f) continue;
      const labels = rng.shuffle(FACES);
      const i = rng.int(0, 5);
      const j = f.indexOf(OPP[f[i]]);
      const adj = range(0, 5).filter((x) => x !== i && x !== j);
      const prompt = `The net is folded to make a cube. Which face is opposite the face labelled ${labels[i]}?`;
      const diagram = { type: 'net', shape: 'custom', cells, faceLabels: labels, alt: `A net of six squares labelled ${labels.join(', ')}.` };
      const solution = `Fold the net in your head, keeping face ${labels[i]} as the base. The four faces that share an edge with ${labels[i]} when folded (${adj.map((x) => labels[x]).join(', ')}) become its sides. The one face left over, ${labels[j]}, is on the top: opposite ${labels[i]}. Tip: in a straight row of three squares, the two end squares are opposite. Answer: ${labels[j]}`;
      const ds = rng.shuffle(adj).slice(0, 3).map((x) => ({ text: labels[x], code: 'NET-ADJACENT', why: `${labels[x]} shares an edge with ${labels[i]} when the cube is folded, so it is next to ${labels[i]}, not opposite it.` }));
      try {
        const c = choices(rng, labels[j], ds, null);
        const opts = [...c.options].sort();
        const map = c.options.map((o) => opts.indexOf(o));
        const mis = {}; const codes = {};
        Object.keys(c.misconceptions).forEach((k) => { mis[String(map[k])] = c.misconceptions[k]; codes[String(map[k])] = c.codes[k]; });
        return { type: 'mcq', prompt, options: opts, answer: opts.indexOf(labels[j]), misconceptions: mis, codes, solution, diagram, marks: 2 };
      } catch { /* draw again */ }
    }
  },
};

// ---------------------------------------------------------------- nets of other 3D shapes

const NET_SHAPES = {
  cube: { name: 'cube', f: 6, e: 12, v: 8, wrong: [['cuboid', 'NET-CUBE-CUBOID', 'A cuboid has rectangles. All six faces here are squares of the same size, so it folds into a cube.'], ['square-based pyramid', 'FEV-PRISM-PYRAMID-SWAP', 'A square-based pyramid has triangles that meet at a point. This net has only squares.']] },
  cuboid: { name: 'cuboid', f: 6, e: 12, v: 8, wrong: [['cube', 'NET-CUBE-CUBOID', 'A cube has six squares of the same size. These faces are rectangles of different sizes, so it folds into a cuboid.'], ['square-based pyramid', 'FEV-PRISM-PYRAMID-SWAP', 'A pyramid has triangles that meet at a point. This net has six rectangles, so it is a cuboid.']] },
  triangularPrism: { name: 'triangular prism', f: 5, e: 9, v: 6, wrong: [['triangle-based pyramid (tetrahedron)', 'FEV-PRISM-PYRAMID-SWAP', 'A pyramid has only one base. This net has TWO triangles (the ends) joined by three rectangles, so it is a prism.'], ['cuboid', 'NET-BASE-SHAPE', 'The rectangles go round the sides. The two end faces are triangles, so it is a triangular prism.']] },
  squarePyramid: { name: 'square-based pyramid', f: 5, e: 8, v: 5, wrong: [['triangle-based pyramid (tetrahedron)', 'NET-BASE-SHAPE', 'The triangles are the sides. A pyramid is named after its base, and the base here is a square.'], ['cuboid', 'FEV-PRISM-PYRAMID-SWAP', 'The four triangles fold up to meet at a point, so it is a pyramid, not a prism.']] },
  tetrahedron: { name: 'triangle-based pyramid (tetrahedron)', f: 4, e: 6, v: 4, wrong: [['triangular prism', 'FEV-PRISM-PYRAMID-SWAP', 'A triangular prism has two triangles AND three rectangles. This net has four triangles that fold up to meet at a point.'], ['square-based pyramid', 'NET-BASE-SHAPE', 'A square-based pyramid has a square base. Every face of this net is a triangle, so the base is a triangle too.']] },
};
const ALL_NAMES = ['cube', 'cuboid', 'triangular prism', 'square-based pyramid', 'triangle-based pyramid (tetrahedron)'];
/** What the faces of each shape's net are, for an honest near-miss text (CLO review m04 item 4). */
const FACE_DESC = { cube: '6 squares of the same size', cuboid: '6 rectangles in 3 matching pairs', 'triangular prism': '2 triangles and 3 rectangles', 'square-based pyramid': '1 square and 4 triangles', 'triangle-based pyramid (tetrahedron)': '4 triangles' };

const netShape = {
  id: 'm04.net-shape', topicId: T, subtopicId: 'm04-s2', skill: SK.nets,
  title: 'Nets of 3D shapes: name the shape (D1), count its edges or vertices when folded (D2)',
  difficulties: [1, 2],
  check: { min: 0 },
  make(rng, d) {
    for (;;) {
      const key = rng.pick(['cube', 'cube', 'cuboid', 'cuboid', 'triangularPrism', 'triangularPrism', 'squarePyramid', 'tetrahedron']);
      const s = NET_SHAPES[key];
      let diagram;
      if (key === 'cube') { const c = hexomino(rng); if (!c || !fold(c)) continue; diagram = { type: 'net', shape: 'custom', cells: c }; } else if (key === 'cuboid') {
        const [l, w, h] = rng.sample(range(2, 9), 3);
        diagram = { type: 'net', shape: 'cuboid', l, w, h };
        if (rng.chance(0.5)) diagram.labels = { l: `${l} cm`, w: `${w} cm`, h: `${h} cm` };
      } else if (key === 'triangularPrism') {
        const l = rng.int(4, 10); const w = rng.int(2, 5);
        diagram = { type: 'net', shape: 'triangularPrism', l, w };
        if (rng.chance(0.5)) diagram.labels = { l: `${l} cm`, w: `${w} cm` };
      } else diagram = { type: 'net', shape: key };
      diagram.alt = 'The net of a 3D shape.';
      const p = person(rng);
      const lead = rng.pick([`${p.name} cuts out this net and folds it up.`, 'This net folds up to make a 3D shape.', `${p.name} draws this net on card.`]);
      if (d === 1) {
        const prompt = `${lead} What 3D shape does it make?`;
        const solution = `The net has ${s.f} faces: ${{ cube: '6 squares of the same size', cuboid: '6 rectangles in 3 matching pairs', triangularPrism: '2 triangles and 3 rectangles', squarePyramid: '1 square and 4 triangles', tetrahedron: '4 triangles' }[key]}. ${{ cube: 'Six equal squares fold into a cube.', cuboid: 'Three pairs of rectangles fold into a cuboid.', triangularPrism: 'The triangles are the two ends and the rectangles join them, so it is a triangular prism.', squarePyramid: 'The square is the base and the triangles meet at a point, so it is a square-based pyramid.', tetrahedron: 'Four triangles meet in a point above a triangle base: a triangle-based pyramid (tetrahedron).' }[key]} Answer: ${s.name}`;
        const ds = s.wrong.map(([t, code, why]) => ({ text: t, code, why }));
        const others = ALL_NAMES.filter((x) => x !== s.name && !ds.some((q) => q.text === x));
        try {
          const c = choices(rng, s.name, ds, (k) => { const o = others[(k - 1) % others.length]; return { text: o, code: 'NEAR-MISS', why: `Not quite: the net of a ${o} has ${FACE_DESC[o]}. This net has ${FACE_DESC[s.name]}.` }; });
          return { type: 'mcq', prompt, ...c, solution, diagram };
        } catch { continue; }
      }
      const ask = rng.pick(['edges', 'vertices']);
      const ans = ask === 'edges' ? s.e : s.v;
      const prompt = `${lead} When it is folded, how many ${ask} will the 3D shape have?`;
      const solution = `The net folds into a ${s.name}. A ${s.name} has ${s.f} faces, ${s.e} edges and ${s.v} vertices. Answer: ${ans}`;
      const swapName = s.wrong.find((w) => w[1] === 'FEV-PRISM-PYRAMID-SWAP')[0];
      const sw = Object.values(NET_SHAPES).find((x) => x.name === swapName);
      const ds = [
        { v: ask === 'edges' ? s.v : s.e, code: 'FEV-WRONG-COUNT', why: `${ask === 'edges' ? s.v : s.e} is the number of ${ask === 'edges' ? 'vertices' : 'edges'}. ${ask === 'edges' ? 'Edges are where two faces meet.' : 'Vertices are the corners.'}` },
        { v: s.f, code: 'FEV-WRONG-COUNT', why: `${s.f} is the number of faces (the shapes in the net). The question asks for ${ask}.` },
        { v: ask === 'edges' ? sw.e : sw.v, code: 'FEV-PRISM-PYRAMID-SWAP', why: `${ask === 'edges' ? sw.e : sw.v} is the number for a ${sw.name}. This net makes a ${s.name}.` },
      ];
      try {
        const body = build(rng, { ans, ds: dedupe(ds, ans), common: { code: 'FEV-WRONG-COUNT', why: 'Work out which shape the net makes, then count its edges or corners.' }, step: 1, hint: `Work out which shape the net makes, then count its ${ask}.`, typed: rng.chance(0.3), prompt });
        return { ...body, prompt, solution, diagram };
      } catch { /* draw again */ }
    }
  },
};

// ---------------------------------------------------------------- g02, g03, g04 surface area

const SA_CTX = ['a gift box', 'a wooden block', 'a cereal box', 'a tissue box', 'a storage box', 'a cake box'];
const surfaceArea = {
  id: 'm04.surface-area', topicId: T, subtopicId: 'm04-s3', skill: SK.sa,
  title: 'Surface area of a cube (D1) or cuboid (D2); an open box, or a cube edge from its surface area (D3)',
  difficulties: [1, 2, 3],
  check: { min: 0, integer: true },
  make(rng, d) {
    for (;;) {
      const ds = [];
      let prompt; let ans; let solution; let diagram; let u = 'cm';
      const what = rng.pick(SA_CTX);
      if (d === 1) {
        const e = rng.int(2, 12);
        // e = 6 makes the surface area equal the volume (216), so working out the volume would
        // earn the mark (CLO review m04 item 3)
        if (e === 6) continue;
        ans = 6 * e * e;
        u = rng.chance(0.75) ? 'cm' : 'm';
        diagram = { type: 'cuboid', l: e, w: e, h: e, labels: { l: `${e} ${u}`, w: `${e} ${u}`, h: `${e} ${u}` } };
        const what2 = u === 'm' ? rng.pick(['a storeroom', 'a water tank', 'a shipping container']) : rng.pick(['a gift box', 'a wooden block', 'a tissue box', 'a storage box']);
        if (u === 'm' && e > 4) continue; // a cube-shaped room or tank of 2-4 m (CLO review X6)
        const faceGiven = rng.chance(0.25);
        if (faceGiven) { prompt = `Each face of a cube has an area of ${e * e} ${u}^2. What is the cube's total surface area?`; diagram = undefined; } else prompt = `${rng.chance(0.5) ? `${what2.charAt(0).toUpperCase() + what2.slice(1)} is a cube with edges ${e} ${u} long, as shown.` : `The cube shown has edges ${e} ${u} long.`} What is its total surface area?`;
        solution = faceGiven
          ? `A cube has 6 faces, each ${e * e} ${u}^2: 6 x ${e * e} = ${ans} ${u}^2. Answer: ${ans} ${u}^2`
          : `Each face is a square ${e} ${u} by ${e} ${u}: ${e} x ${e} = ${e * e} ${u}^2. A cube has 6 faces: 6 x ${e * e} = ${ans} ${u}^2. Answer: ${ans} ${u}^2`;
        ds.push({ v: 4 * e * e, code: 'SA-FOUR-FACES', why: `It looks like you counted 4 faces. A cube has 6 faces: top, bottom and four sides.` });
        ds.push({ v: e * e, code: 'SA-ONE-FACE', why: `${e * e} ${u}^2 is the area of one face. A cube has 6 faces.` });
        // with only the face area given, she never finds the edge, so no edge-based options (CLO review m04 item 5)
        if (!faceGiven) {
          ds.push({ v: e * e * e, code: 'SA-VOLUME-SWAP', why: `${e} x ${e} x ${e} = ${e ** 3} is the volume (${u}^3). Surface area is the total area of the 6 faces.` });
          ds.push({ v: 6 * e, code: 'SA-NO-SQUARE', why: `It looks like you multiplied the edge by 6. Find the area of one face first (${e} x ${e}), then multiply by 6.` });
        }
      } else if (d === 2) {
        const [l, w, h] = rng.sample(range(2, 20), 3);
        const a = l * w; const b = l * h; const c = w * h;
        ans = 2 * (a + b + c);
        if (ans > 2000) continue;
        diagram = { type: 'cuboid', l, w, h, labels: { l: `${l} cm`, w: `${w} cm`, h: `${h} cm` } };
        prompt = `${what.charAt(0).toUpperCase() + what.slice(1)} is a cuboid ${l} cm long, ${w} cm wide and ${h} cm high, as shown. What is its total surface area?`;
        solution = `The faces come in 3 pairs. Top and bottom: ${l} x ${w} = ${a} cm^2 each. Front and back: ${l} x ${h} = ${b} cm^2 each. The two ends: ${w} x ${h} = ${c} cm^2 each. Total = 2 x (${a} + ${b} + ${c}) = 2 x ${a + b + c} = ${ans} cm^2. Answer: ${ans} cm^2`;
        ds.push({ v: a + b + c, code: 'SA-ONE-FACE-EACH', why: `It looks like you counted each different face once. Every face has a matching opposite face, so double it: 2 x ${a + b + c}.` });
        ds.push({ v: l * w * h, code: 'SA-VOLUME-SWAP', why: `${l} x ${w} x ${h} = ${l * w * h} is the volume (cm^3). Surface area adds the areas of all 6 faces.` });
        ds.push({ v: 2 * (a + b), code: 'SA-MISSED-PAIR', why: `It looks like you left out the two end faces (${w} x ${h} each).` });
        ds.push({ v: 6 * a, code: 'SA-CUBE-RULE', why: `It looks like you used the cube rule (6 x one face). A cuboid's faces are not all the same size: work out each pair.` });
      } else if (rng.chance(0.6)) {
        const [l, w, h] = rng.sample(range(3, 20), 3);
        const a = l * w; const b = l * h; const c = w * h;
        ans = a + 2 * b + 2 * c;
        if (ans > 2000) continue;
        const p = person(rng);
        diagram = { type: 'cuboid', l, w, h, labels: { l: `${l} cm`, w: `${w} cm`, h: `${h} cm` }, caption: 'An open box: it has no lid.' };
        prompt = `${p.name} makes an open box (it has no lid) from card. The box is a cuboid ${l} cm long, ${w} cm wide and ${h} cm high, as shown. What area of card does ${p.he} need, with no overlaps?`;
        solution = `Base: ${l} x ${w} = ${a} cm^2. Front and back: 2 x (${l} x ${h}) = ${2 * b} cm^2. Two ends: 2 x (${w} x ${h}) = ${2 * c} cm^2. There is no lid. Total: ${a} + ${2 * b} + ${2 * c} = ${ans} cm^2. Answer: ${ans} cm^2`;
        ds.push({ v: 2 * (a + b + c), code: 'SA-OPEN-AS-CLOSED', why: `${2 * (a + b + c)} cm^2 includes a lid. The box is open, so leave out the top (${l} x ${w}).` });
        ds.push({ v: 2 * b + 2 * c, code: 'SA-OPEN-WRONG-FACE', why: `It looks like you left out the base as well as the lid. An open box still has a bottom (${l} x ${w}).` });
        ds.push({ v: a + b + c, code: 'SA-ONE-FACE-EACH', why: `It looks like you counted each different face once. The front and back are a pair, and so are the two ends.` });
      } else {
        const e = rng.int(2, 12);
        const A = 6 * e * e;
        const thing = rng.pick(['A cube', 'A wooden cube', 'A cube-shaped box', 'A dice-shaped gift box']);
        const askVol = rng.chance(0.4); // a second D3 form: the volume from the surface area (CLO review m04 item 6)
        ans = askVol ? e ** 3 : e;
        prompt = askVol
          ? `${thing} has a total surface area of ${fmtInt(A)} cm^2. What is its volume?`
          : `${thing} has a total surface area of ${fmtInt(A)} cm^2. How long is each edge?`;
        solution = `A cube has 6 equal faces, so one face is ${fmtInt(A)} ÷ 6 = ${e * e} cm^2. The face is a square, and ${e} x ${e} = ${e * e}, so each edge is ${e} cm.${askVol ? ` Volume = ${e} x ${e} x ${e} = ${fmtInt(e ** 3)} cm^3. Answer: ${fmtInt(e ** 3)} cm^3` : ` Answer: ${e} cm`}`;
        if (askVol) {
          ds.push({ v: A, code: 'SA-VOLUME-SWAP', why: `${fmtInt(A)} cm^2 is the surface area you were given. The volume is edge x edge x edge.` });
          ds.push({ v: e * e, code: 'ONE-STEP-ONLY', why: `${e * e} cm^2 is the area of one face. Find the edge (${e} cm), then the volume: ${e} x ${e} x ${e}.` });
          ds.push({ v: e, code: 'ONE-STEP-ONLY', why: `${e} cm is the edge. The volume is ${e} x ${e} x ${e}.` });
        } else {
          ds.push({ v: e * e, code: 'SA-EDGE-NO-ROOT', why: `${e * e} cm^2 is the area of one face. The edge is the number that multiplies by itself to make ${e * e}.` });
          ds.push({ v: A / 4, code: 'SA-FOUR-FACES', why: 'It looks like you divided by 4, as if the cube had 4 faces. A cube has 6 faces, so divide by 6 first.' });
          ds.push({ v: (e * e) / 2, code: 'SQ-SIDE-HALF', why: `It looks like you halved the area of one face (${e * e}). The edge is the number that multiplies by ITSELF to make ${e * e}.` });
        }
        try {
          const unit = askVol ? 'cm^3' : 'cm';
          const body = build(rng, { ans, unit, ds: dedupe(ds, ans), common: { why: 'Divide by 6 to find one face, then find the edge that multiplies by itself to make that area.' }, step: askVol ? Math.max(1, Math.round(ans / 10)) : 1, hint: 'Find the area of one face, then the edge.', typed: rng.chance(0.3), prompt });
          return { ...body, prompt, solution, marks: 2 };
        } catch { continue; }
      }
      try {
        const body = build(rng, { ans, unit: `${u}^2`, ds: dedupe(ds, ans), common: { why: d === 1 ? 'Find the area of one face, then multiply by 6: a cube has 6 equal faces.' : 'Add the areas of all the faces. Each face of a cuboid has a matching face opposite it.' }, step: d === 1 ? 2 : 4, hint: 'Find the area of each face, then add them all.', typed: rng.chance(0.3), prompt });
        return { ...body, prompt, solution, diagram, marks: d === 3 ? 2 : 1 };
      } catch { /* draw again */ }
    }
  },
};

// ---------------------------------------------------------------- g05, g06, g08 volume

const volume = {
  id: 'm04.volume', topicId: T, subtopicId: 'm04-s4', skill: SK.vol,
  title: 'Volume of a cuboid: from unit cubes (D1), from its dimensions (D2), a missing dimension or water displacement (D3)',
  difficulties: [1, 2, 3],
  check: { min: 0, integer: true },
  make(rng, d) {
    for (;;) {
      const ds = [];
      let prompt; let ans; let solution; let diagram; let unit = 'cm^3';
      if (d === 1) {
        const [l, w, h] = [rng.int(2, 6), rng.int(2, 5), rng.int(2, 5)];
        ans = l * w * h;
        diagram = { type: 'cuboid', l, w, h, unitCubes: true, alt: `A cuboid built from 1 cm cubes.` };
        prompt = `The cuboid shown is built from 1 cm cubes. It is ${l} cubes long, ${w} cubes wide and ${h} cubes high. What is its volume?`;
        if (rng.chance(0.4)) prompt = `${person(rng).name} builds the cuboid shown from 1 cm cubes: ${l} cubes long, ${w} cubes wide and ${h} cubes high. What is the volume of the cuboid?`;
        solution = `Each layer has ${l} x ${w} = ${l * w} cubes. There are ${h} layers: ${l * w} x ${h} = ${ans} cubes. Each cube is 1 cm^3, so the volume is ${ans} cm^3. Answer: ${ans} cm^3`;
        ds.push({ v: l + w + h, code: 'VOL-ADD-SIDES', why: `It looks like you added ${l} + ${w} + ${h}. Volume multiplies: length x width x height.` });
        ds.push({ v: l * w, code: 'VOL-BASE-ONLY', why: `${l * w} is one layer of cubes. There are ${h} layers.` });
        ds.push({ v: l * h, code: 'VOL-ONE-LAYER', why: `${l * h} counts only the cubes on the front face. The cuboid is ${w} cubes deep.` });
        ds.push({ v: 2 * (l * w + l * h + w * h), code: 'SA-VOLUME-SWAP', why: `${2 * (l * w + l * h + w * h)} is the surface area (the outside squares). Volume counts the cubes inside.` });
      } else if (d === 2) {
        // each object with its own sizes (CLO review X6): no 2 cm bricks
        const [obj, L1, L2, W1, W2, H1, H2] = rng.pick([['A box', 5, 20, 4, 15, 3, 12], ['A brick', 18, 24, 8, 11, 5, 8], ['A block of wood', 2, 15, 2, 12, 2, 10], ['A packet of rice', 12, 20, 6, 10, 3, 6], ['A pencil box', 15, 22, 5, 9, 2, 4], ['A tissue box', 11, 20, 10, 12, 6, 12]]);
        const [l, w, h] = [rng.int(L1, L2), rng.int(W1, W2), rng.int(H1, H2)];
        ans = l * w * h;
        if (ans > 3000 || new Set([l, w, h]).size < 3) continue;
        diagram = { type: 'cuboid', l, w, h, labels: { l: `${l} cm`, w: `${w} cm`, h: `${h} cm` } };
        prompt = `${obj} is a cuboid ${l} cm long, ${w} cm wide and ${h} cm high, as shown. What is its volume?`;
        solution = `Volume = length x width x height = ${l} x ${w} x ${h} = ${l * w} x ${h} = ${ans} cm^3. Answer: ${fmtInt(ans)} cm^3`;
        ds.push({ v: l + w + h, code: 'VOL-ADD-SIDES', why: `It looks like you added the lengths. Volume = length x width x height.` });
        ds.push({ v: l * w, code: 'VOL-BASE-ONLY', why: `${l} x ${w} = ${l * w} is the area of the base. Multiply by the height (${h}) too.` });
        ds.push({ v: 2 * (l * w + l * h + w * h), code: 'SA-VOLUME-SWAP', why: `${2 * (l * w + l * h + w * h)} is the surface area. Volume is length x width x height.` });
      } else if (rng.chance(0.55)) {
        const [l, w, h] = [rng.int(2, 15), rng.int(2, 12), rng.int(2, 15)];
        const V = l * w * h;
        if (V > 3000 || new Set([l, w, h]).size < 3) continue;
        ans = h; unit = 'cm';
        diagram = { type: 'cuboid', l, w, h, labels: { l: `${l} cm`, w: `${w} cm`, h: '?' } };
        prompt = `A cuboid has a volume of ${fmtInt(V)} cm^3. It is ${l} cm long and ${w} cm wide, as shown. How high is it?`;
        solution = `Volume = length x width x height, so ${l} x ${w} x height = ${V}. ${l} x ${w} = ${l * w}, and ${V} ÷ ${l * w} = ${h}. Check: ${l} x ${w} x ${h} = ${V}. Answer: ${h} cm`;
        if (V - l - w > 0) ds.push({ v: V - l - w, code: 'VOL-MISSING-SUBTRACT', why: `It looks like you subtracted ${l} and ${w} from ${V}. Volume multiplies the lengths, so divide: ${V} ÷ (${l} x ${w}).` });
        if (V % (l + w) === 0) ds.push({ v: V / (l + w), code: 'VOL-MISSING-ADD-SIDES', why: `It looks like you divided by ${l} + ${w}. Divide by ${l} x ${w} = ${l * w} instead.` });
        ds.push({ v: V / l, code: 'VOL-MISSING-ONE-DIVIDE', why: `${V} ÷ ${l} = ${V / l} is the area of the end face. Divide by ${w} as well.` });
        ds.push({ v: V / w, code: 'VOL-MISSING-ONE-DIVIDE', why: `${V} ÷ ${w} = ${V / w}. Divide by ${l} as well.` });
      } else {
        const [l, w] = [rng.int(10, 30), rng.int(10, 25)];
        const r = rng.int(1, 5); const h0 = rng.int(6, 15);
        ans = l * w * r;
        if (ans > 3000) continue;
        const p = person(rng);
        prompt = `The tank shown has a rectangular base ${l} cm long and ${w} cm wide. The water in it is ${h0} cm deep. ${p.name} lowers a stone into the water until it is completely under water, and the water level rises to ${h0 + r} cm. What is the volume of the stone?`;
        diagram = { type: 'cuboid', l, w, h: h0 + r + 4, labels: { l: `${l} cm`, w: `${w} cm` }, alt: `A tank shaped like a cuboid, ${l} cm long and ${w} cm wide.` };
        solution = `The stone pushes the water up by ${h0 + r} - ${h0} = ${r} cm. The volume of the stone equals the volume of the extra water: ${l} x ${w} x ${r} = ${ans} cm^3. Answer: ${fmtInt(ans)} cm^3`;
        ds.push({ v: l * w * (h0 + r), code: 'VOL-WHOLE-WATER', why: `${l} x ${w} x ${h0 + r} is all the water and the stone together. Use only the RISE in the water level: ${h0 + r} - ${h0} = ${r} cm.` });
        ds.push({ v: (2 * l + 2 * w) * r, code: 'VOL-PERIMETER-BASE', why: `It looks like you used the perimeter of the base (${2 * l + 2 * w} cm). Use the area of the base: ${l} x ${w}.` });
        ds.push({ v: l * w + r, code: 'VOL-ADD-RISE', why: `It looks like you added the rise to the base area. Multiply: base area x rise.` });
      }
      try {
        const body = build(rng, { ans, unit, ds: dedupe(ds, ans), common: { code: 'VOL-ADD-SIDES', why: 'Volume of a cuboid = length x width x height.' }, step: unit === 'cm' ? 1 : Math.max(1, Math.round(ans / 12)), hint: 'Use volume = length x width x height.', typed: rng.chance(0.3), prompt });
        return { ...body, prompt, solution, diagram, marks: d === 3 ? 2 : 1 };
      } catch { /* draw again */ }
    }
  },
};

// ---------------------------------------------------------------- g07, g09 capacity and volume

const capacity = {
  id: 'm04.capacity', topicId: T, subtopicId: 'm04-s4', skill: SK.cap,
  title: 'Capacity: ml, L and cm^3 conversions (D1), capacity from inside measurements (D2), part-filled containers (D3)',
  difficulties: [1, 2, 3],
  check: { min: 0, maxDp: 3 },
  make(rng, d) {
    for (;;) {
      const ds = [];
      let prompt; let ans; let unit; let solution; let diagram;
      if (d === 1) {
        const kind = rng.pick(['L>ml', 'ml>L', 'cm3>ml', 'cm3>L', 'L>cm3']);
        if (kind === 'L>ml' || kind === 'L>cm3') {
          const L = rng.pick([rng.int(1, 9), rng.int(1, 9) + rng.pick([0.5, 0.25, 0.75]), rng.int(1, 9) + rng.int(1, 9) / 10]);
          const ml = Math.round(L * 1000);
          const to = kind === 'L>ml' ? 'ml' : 'cm^3';
          ans = ml; unit = to;
          prompt = `How many ${kind === 'L>ml' ? 'millilitres' : 'cubic centimetres'} is ${dec(L)} litres? Give your answer in ${to}.`;
          solution = `1 litre = 1000 ml${to === 'cm^3' ? ' = 1000 cm^3' : ''}. ${dec(L)} x 1000 = ${fmtInt(ml)}. Answer: ${fmtInt(ml)} ${to}`;
          // exact values only: 8.25 x 10 is 82.5, never "83" (CLO review m04 item 1)
          ds.push({ v: ml / 10, code: 'UNIT-FACTOR-WRONG', why: `It looks like you multiplied by 100: ${dec(L)} x 100 = ${fmtV(ml / 10)}. There are 1000 ml in 1 litre.` });
          ds.push({ v: ml / 100, code: 'UNIT-FACTOR-WRONG', why: `It looks like you multiplied by 10: ${dec(L)} x 10 = ${fmtV(ml / 100)}. There are 1000 ml in 1 litre.` });
          ds.push({ v: ml * 10, code: 'PV-SHIFT-WRONG', why: `That is 10 times too big: ${dec(L)} x 1000 = ${fmtInt(ml)}. Move each digit 3 places, not 4.` });
        } else if (kind === 'cm3>ml') {
          const v = 50 * rng.int(2, 60);
          ans = v; unit = 'ml';
          prompt = `A container holds ${fmtInt(v)} cm^3 of water. How many millilitres is that?`;
          solution = `1 cm^3 holds exactly 1 ml, so ${fmtInt(v)} cm^3 = ${fmtInt(v)} ml. Answer: ${fmtInt(v)} ml`;
          ds.push({ v: v * 1000, code: 'UNIT-FACTOR-WRONG', why: `It looks like you multiplied by 1000. 1 cm^3 = 1 ml, so the number stays the same.` });
          ds.push({ v: v * 10, code: 'UNIT-FACTOR-WRONG', why: `It looks like you multiplied by 10. 1 cm^3 = 1 ml, so the number stays the same.` });
          if (v % 10 === 0) ds.push({ v: v / 10, code: 'UNIT-FACTOR-WRONG', why: `It looks like you divided by 10. 1 cm^3 = 1 ml, so the number stays the same.` });
        } else {
          const ml = 100 * rng.int(2, 95);
          const L = ml / 1000;
          unit = 'L';
          const isCm = kind === 'cm3>L';
          prompt = `Write ${fmtInt(ml)} ${isCm ? 'cm^3' : 'ml'} in litres.`;
          solution = `${isCm ? '1 cm^3 = 1 ml, and ' : ''}1000 ml = 1 litre, so divide by 1000: ${fmtInt(ml)} ÷ 1000 = ${dec(L)}. Answer: ${dec(L)} L`;
          const U = (x) => `${dec(x)} L`;
          const c = [
            { text: U(ml / 100), code: 'UNIT-FACTOR-WRONG', why: `It looks like you divided by 100. There are 1000 ml in 1 litre.` },
            { text: U(ml / 10), code: 'UNIT-FACTOR-WRONG', why: `It looks like you divided by 10. There are 1000 ml in 1 litre.` },
            { text: U(ml * 1000), code: 'PV-SHIFT-WRONG', why: `It looks like you multiplied by 1000. Litres are bigger than millilitres, so the number of litres is smaller: divide.` },
          ];
          try {
            if (rng.chance(0.3)) return { type: 'numeric', prompt, answer: numericAnswer(L, [dec(L), `${dec(L)} L`, `${dec(L)} litres`]), ...typedMisconceptions(dec(L), c.map((x) => ({ ...x, text: x.text.replace(' L', '') })), { code: 'UNIT-FACTOR-WRONG', why: '1000 ml = 1 litre: divide by 1000.' }), solution };
            return { type: 'mcq', prompt, ...choices(rng, U(L), c, (k) => { const w = ml + 100 * (k % 2 ? Math.ceil(k / 2) : -Math.ceil(k / 2)); return w > 0 ? nearFor(prompt)(U(w / 1000), 'Divide by 1000.') : null; }), solution };
          } catch { continue; }
        }
      } else if (d === 2) {
        const [l, w, h] = [rng.pick([10, 20, 25, 30, 40, 50]), rng.pick([10, 20, 25, 30, 40]), rng.pick([10, 15, 20, 25, 30, 40])];
        const V = l * w * h;
        if (V % 1000 || V > 60000) continue;
        ans = V / 1000; unit = 'L';
        diagram = { type: 'cuboid', l, w, h, labels: { l: `${l} cm`, w: `${w} cm`, h: `${h} cm` } };
        prompt = `The inside of a ${rng.pick(['fish tank', 'water tank', 'storage box', 'cooler box'])} is a cuboid ${l} cm long, ${w} cm wide and ${h} cm high, as shown. What is its capacity in litres?`;
        solution = `Capacity = ${l} x ${w} x ${h} = ${fmtInt(V)} cm^3 = ${fmtInt(V)} ml. 1000 ml = 1 litre, so ${fmtInt(V)} ÷ 1000 = ${ans} litres. Answer: ${ans} L`;
        ds.push({ v: V, code: 'UNIT-NOT-CONVERTED', why: `${fmtInt(V)} is the capacity in cm^3 (or ml). Change it to litres: divide by 1000.` });
        ds.push({ v: V / 100, code: 'UNIT-FACTOR-WRONG', why: `It looks like you divided by 100. 1000 ml = 1 litre.` });
        if (V % 10000 === 0) ds.push({ v: V / 10000, code: 'UNIT-FACTOR-WRONG', why: `It looks like you divided by 10 000. 1000 ml = 1 litre.` });
      } else if (rng.chance(0.5)) {
        const [l, w] = [rng.pick([10, 20, 25, 30]), rng.pick([10, 20, 25])];
        const h = rng.pick([12, 16, 20, 24, 30, 40]);
        const fr = rng.pick([[1, 2], [1, 4], [3, 4], [2, 3], [1, 3], [3, 5], [2, 5]]);
        if ((h * fr[0]) % fr[1]) continue;
        const depth = (h * fr[0]) / fr[1];
        ans = l * w * depth; unit = 'ml';
        diagram = { type: 'cuboid', l, w, h, labels: { l: `${l} cm`, w: `${w} cm`, h: `${h} cm` } };
        prompt = `A container is a cuboid with inside measurements ${l} cm long, ${w} cm wide and ${h} cm high, as shown. It is filled with water to ${fr[0]}/${fr[1]} of its height. How many millilitres of water are in it?`;
        solution = `${fr[0]}/${fr[1]} of ${h} cm = ${depth} cm. Volume of water = ${l} x ${w} x ${depth} = ${fmtInt(ans)} cm^3. 1 cm^3 = 1 ml, so there are ${fmtInt(ans)} ml. Answer: ${fmtInt(ans)} ml`;
        ds.push({ v: l * w * h, code: 'CAP-FULL-NOT-PART', why: `${fmtInt(l * w * h)} ml is the capacity when it is full. It is filled to only ${fr[0]}/${fr[1]} of its height.` });
        ds.push({ v: l * w * h - ans, code: 'PCT-OF-WRONG-WHOLE', why: `${fmtInt(l * w * h - ans)} ml is the empty space above the water.` });
        if (ans % 10 === 0) ds.push({ v: ans / 10, code: 'UNIT-FACTOR-WRONG', why: `It looks like you divided by 10. 1 cm^3 is exactly 1 ml.` });
      } else {
        const e = rng.pick([10, 20]);
        const cap = e * e * e;
        const add = 50 * rng.int(1, (cap / 2 - 50) / 50);
        ans = cap - cap / 2 - add; unit = 'ml';
        if (ans <= 0) continue;
        const p = person(rng);
        diagram = { type: 'cuboid', l: e, w: e, h: e, labels: { l: `${e} cm`, w: `${e} cm`, h: `${e} cm` }, caption: 'Inside measurements' };
        prompt = `A box shaped like a cube has inside edges of ${e} cm, as shown. It is half full of water. ${p.name} pours in another ${fmtInt(add)} ml. How much more water is needed to fill the box to the top?`;
        solution = `Capacity = ${e} x ${e} x ${e} = ${fmtInt(cap)} cm^3 = ${fmtInt(cap)} ml. Half full = ${fmtInt(cap / 2)} ml. After pouring: ${fmtInt(cap / 2)} + ${fmtInt(add)} = ${fmtInt(cap / 2 + add)} ml. Still needed: ${fmtInt(cap)} - ${fmtInt(cap / 2 + add)} = ${fmtInt(ans)} ml. Answer: ${fmtInt(ans)} ml`;
        ds.push({ v: cap / 2 + add, code: 'PCT-OF-WRONG-WHOLE', why: `${fmtInt(cap / 2 + add)} ml is how much water is IN the box now. The question asks how much more will fill it.` });
        ds.push({ v: cap - add, code: 'CAP-STEP-MISSED', why: `It looks like you forgot that the box was already half full. Take away the half (${fmtInt(cap / 2)} ml) as well.` });
        ds.push({ v: cap / 2, code: 'CAP-STEP-MISSED', why: `${fmtInt(cap / 2)} ml was needed BEFORE the ${fmtInt(add)} ml was poured in. Take that away too.` });
      }
      try {
        const body = build(rng, { ans, unit, ds: dedupe(ds, ans), common: { code: 'UNIT-FACTOR-WRONG', why: '1 cm^3 = 1 ml, and 1000 ml = 1 litre.' }, step: ans > 100 ? 50 : 1, hint: 'Remember: 1 cm^3 = 1 ml and 1000 ml = 1 litre.', typed: rng.chance(0.3), prompt });
        return { ...body, prompt, solution, diagram, marks: d === 3 ? 2 : 1 };
      } catch { /* draw again */ }
    }
  },
};

export default [fev, netShape, cubeNet, surfaceArea, volume, capacity];
