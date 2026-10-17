// Independent answers for the m03 generators, worked out again from the question text and the
// diagram data (angle labels, protractor rays, polygon corners), and the misconception rules that
// must reproduce each wrong option from its code. Shares no code with js/generators.

const num = (s) => Number(String(s).replace(/ /g, ''));
/** The numbers written with a degree sign, in order. */
const degs = (text) => [...String(text).matchAll(/(\d+(?:\.\d+)?)°/g)].map((m) => num(m[1]));

// ---------------------------------------------------------------- radius and diameter

function circleAsk(q) {
  let m = q.prompt.match(/^(\d+) identical .*? Each has a radius of ([\d.]+) /);
  if (m) { const n = num(m[1]); const r = num(m[2]); return { kind: 'row', n, r, ans: n * (r + r) }; }
  m = q.prompt.match(/The perimeter of the square is ([\d.]+) /);
  if (m) { const side = num(m[1]) / 4; return { kind: 'square', P: num(m[1]), side, ans: side / 2 }; }
  m = q.prompt.match(/with a diameter of ([\d.]+) \w+ using a pair of compasses/);
  if (m) return { kind: 'plain', fromR: false, given: num(m[1]), ans: num(m[1]) / 2 };
  m = q.prompt.match(/has a (radius|diameter) of ([\d.]+) /);
  const g = num(m[2]);
  return m[1] === 'radius' ? { kind: 'plain', fromR: true, given: g, ans: g + g } : { kind: 'plain', fromR: false, given: g, ans: g / 2 };
}

// ---------------------------------------------------------------- angle types

const kind = (a) => { if (a < 90) return 'acute'; if (a === 90) return 'right'; if (a < 180) return 'obtuse'; if (a === 180) return 'straight'; return 'reflex'; };
function wrongTypes(code, a) {
  const t = kind(a);
  switch (code) {
    case 'ANG-ACUTE-OBTUSE': return t === 'acute' ? ['obtuse'] : t === 'obtuse' ? ['acute'] : [];
    case 'ANG-OBTUSE-REFLEX': return t === 'obtuse' ? ['reflex'] : t === 'reflex' ? ['obtuse'] : [];
    case 'ANG-OTHER-SIDE': return a === 180 ? [] : [kind(360 - a)];
    case 'ANG-TYPE-BOUNDARY':
      if (a === 90) return ['acute', 'obtuse'];
      if (a === 180) return ['obtuse', 'reflex'];
      if (Math.abs(a - 90) <= 5) return ['right'];
      if (Math.abs(a - 180) <= 5) return ['straight'];
      return [];
    default: return [];
  }
}
function typeAsk(q) {
  let m = q.prompt.match(/An angle measures (\d+)°/);
  if (m) return { a: num(m[1]) };
  m = q.prompt.match(/Which of them is an? (\w+) angle\?/);
  return { target: m[1], vals: degs(q.prompt.split('Which')[0]) };
}
const typeRule = (code) => (q) => {
  const a = typeAsk(q);
  if (a.a != null) return wrongTypes(code, a.a);
  return a.vals.filter((v) => wrongTypes(code, v).includes(a.target)).map((v) => v);
};

// ---------------------------------------------------------------- angles on a line / round a point (labels read from the drawing)

const WORDS = { two: 2, three: 3, four: 4, five: 5 };
const arcVals = (q) => q.diagram.arcs.map((x) => String(x.label)).filter((l) => /°$/.test(l)).map((l) => num(l.replace('°', '')));
function lineAsk(q) {
  let m = q.prompt.match(/An angle of (\d+)° and (\w+) equal angles/);
  if (m) return { equal: true, g: num(m[1]), k: WORDS[m[2]], total: 180 };
  m = q.prompt.match(/Angle a is (\d+)°\. Angle b is (twice the size of angle a|(\d+)° more than angle a)/);
  if (m) { const a = num(m[1]); const b = m[3] ? a + num(m[3]) : 2 * a; return { rel: true, a, b, total: 180 }; }
  return { given: arcVals(q), total: 180 };
}
function pointAsk(q) {
  const m = q.prompt.match(/One of them is (\d+)° and the other (\w+) are equal/);
  if (m) return { equal: true, g: num(m[1]), k: WORDS[m[2]], total: 360 };
  return { given: arcVals(q), total: 360 };
}
function sharedAnswer(a) {
  if (a.equal) return (a.total - a.g) / a.k;
  if (a.rel) return a.total - a.a - a.b;
  return a.total - a.given.reduce((s, v) => s + v, 0);
}

// ---------------------------------------------------------------- triangles

function triAsk(q) {
  let m = q.prompt.match(/Two angles of triangle \w+ are (\d+)° and (\d+)°/);
  if (m) { const A = num(m[1]); const B = num(m[2]); return { A, B, ans: 180 - A - B }; }
  m = q.prompt.match(/has a right angle at \w\. Angle \w is (\d+)°/);
  if (m) { const A = num(m[1]); return { right: true, A, ans: 180 - 90 - A }; }
  m = q.prompt.match(/angle \w is (\d+)°\. Angle \w is (twice the size of angle \w|(\d+)° more than angle \w)/);
  const C = num(m[1]); const extra = m[3] ? num(m[3]) : null;
  // try every whole-number angle for the smaller unknown
  for (let b = 1; b < 180; b++) {
    const a = extra == null ? 2 * b : b + extra;
    if (a + b + C === 180) return { C, b, a, extra, ans: b };
  }
  throw new Error('no triangle');
}

function isoAsk(q) {
  let m = q.prompt.match(/The angle between the equal sides, angle \w, is (\d+)°/);
  if (m) { const apex = num(m[1]); return { apex, base: (180 - apex) / 2, ask: 'base', given: apex }; }
  m = q.prompt.match(/Angle (\w) is (\d+)°\. What is the size of angle (\w)\?/);
  if (m) { const base = num(m[2]); return { base, apex: 180 - base - base, ask: 'apex', given: base }; }
  m = q.prompt.match(/with (\w)\w = \w\w\. (.*?)\. What is the size of angle (\w)\?/);
  const apexName = m[1]; const rel = m[2]; const asked = m[3];
  let test; let d = null; let k = null; let mm;
  if ((mm = rel.match(/^Angle \w is (\d+)° more than angle \w$/i))) {
    d = num(mm[1]);
    const apexMore = rel.toLowerCase().startsWith(`angle ${apexName.toLowerCase()} `);
    test = (base, apex) => (apexMore ? apex === base + d : base === apex + d);
  } else {
    mm = rel.match(/is (twice|three times|four times) the size/);
    k = { twice: 2, 'three times': 3, 'four times': 4 }[mm[1]];
    test = (base, apex) => apex === k * base;
  }
  for (let base = 1; base < 90; base++) {
    const apex = 180 - 2 * base;
    if (test(base, apex)) return { base, apex, ask: asked === apexName ? 'apex' : 'base', d, k, rel: true };
  }
  throw new Error('no isosceles triangle');
}
const isoAns = (a) => (a.ask === 'apex' ? a.apex : a.base);

// ---------------------------------------------------------------- areas

function areaAsk(q) {
  let m = q.prompt.match(/has an area of ([\d.]+) \w+\^2\. One of the two sides that meet at the right angle is ([\d.]+) /);
  if (m) { const A = num(m[1]); const a = num(m[2]); return { back: true, A, a, ans: (2 * A) / a }; }
  m = q.prompt.match(/two shorter sides of ([\d.]+) \w+ and ([\d.]+) \w+, which meet at the right angle\.(?: Its longest side is (?:about )?([\d.]+) )?/);
  const a = num(m[1]); const b = num(m[2]); const c = m[3] ? num(m[3]) : null;
  return { a, b, c, ans: (a * b) / 2 };
}
function shoelace(pts) {
  let s = 0;
  for (let i = 0; i < pts.length; i++) { const p = pts[i]; const r = pts[(i + 1) % pts.length]; s += p[0] * r[1] - r[0] * p[1]; }
  return Math.abs(s) / 2;
}
function compoundParts(q) {
  const pts = q.diagram.points.map((p) => p.map(Number));
  const W = Math.max(...pts.map((p) => p[0])); const H = Math.max(...pts.map((p) => p[1]));
  const lines = q.diagram.extraLines;
  if (lines.length === 1) { const w = lines[0].from[0]; const h = lines[0].to[1]; return { joined: true, w, h, t: W - w }; }
  // cut corner: the prompt gives the rectangle, then what is left of the top and right-hand edges
  const ns = [...q.prompt.matchAll(/(\d+(?:\.\d+)?) (?:cm|m)\b/g)].map((x) => num(x[1]));
  return { joined: false, W: ns[0], H: ns[1], a: ns[0] - ns[2], b: ns[1] - ns[3] };
}

// ---------------------------------------------------------------- rotational symmetry (from the drawn corners)

function turnPt([x, y], a) { const r = (a * Math.PI) / 180; return [x * Math.cos(r) - y * Math.sin(r), x * Math.sin(r) + y * Math.cos(r)]; }
function symmetryOrder(q) {
  const pts = q.diagram.points.map((p) => p.map(Number));
  const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length; const cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  let best = 1;
  for (let k = 2; k <= 12; k++) {
    const fits = pts.every((p) => { const t = turnPt([p[0] - cx, p[1] - cy], 360 / k); return pts.some((s) => Math.hypot(s[0] - cx - t[0], s[1] - cy - t[1]) < 0.05); });
    if (fits) best = k;
  }
  return { k: best, corners: pts.length };
}
const askAngle = (q) => /smallest angle/.test(q.prompt);

export const SOLVERS = {
  'm03.radius-diameter': (q) => ({ value: circleAsk(q).ans }),
  'm03.angle-type': (q) => {
    const a = typeAsk(q);
    if (a.a != null) return { text: kind(a.a) };
    const hits = a.vals.filter((v) => kind(v) === a.target);
    if (hits.length !== 1) throw new Error(`${hits.length} angles are ${a.target}`);
    return { value: hits[0] };
  },
  'm03.angles-straight-line': (q) => ({ value: sharedAnswer(lineAsk(q)) }),
  'm03.angles-at-point': (q) => ({ value: sharedAnswer(pointAsk(q)) }),
  'm03.protractor': (q) => ({ value: Math.abs(q.diagram.rays[0] - q.diagram.rays[1]) }),
  'm03.triangle-angle': (q) => ({ value: triAsk(q).ans }),
  'm03.special-triangle': (q) => ({ value: isoAns(isoAsk(q)) }),
  'm03.area-right-triangle': (q) => ({ value: areaAsk(q).ans }),
  'm03.compound-area': (q) => {
    const c = compoundParts(q);
    // joined: read from the drawing; cut corner: worked out from the prompt's lengths alone
    return { value: c.joined ? shoelace(q.diagram.points.map((p) => p.map(Number))) : c.W * c.H - (c.a * c.b) / 2 };
  },
  'm03.rotational-symmetry': (q) => { const s = symmetryOrder(q); return { value: askAngle(q) ? 360 / s.k : s.k }; },
};

export const MIS = {
  'm03.radius-diameter': {
    'CIRC-DIAM-FOR-RAD': (q) => { const a = circleAsk(q); return a.kind === 'row' ? [a.r * a.n, 2 * a.r] : a.kind === 'square' ? [a.side] : [a.given]; },
    'CIRC-HALVE-DOUBLE-SWAP': (q) => { const a = circleAsk(q); return a.kind === 'square' ? [2 * a.side, a.P / 2] : [a.fromR ? a.given / 2 : 2 * a.given]; },
    'CIRC-CENTRES-ONLY': (q) => { const a = circleAsk(q); return [2 * a.r * (a.n - 1)]; },
  },
  'm03.angle-type': {
    'ANG-ACUTE-OBTUSE': typeRule('ANG-ACUTE-OBTUSE'),
    'ANG-OBTUSE-REFLEX': typeRule('ANG-OBTUSE-REFLEX'),
    'ANG-OTHER-SIDE': typeRule('ANG-OTHER-SIDE'),
    'ANG-TYPE-BOUNDARY': typeRule('ANG-TYPE-BOUNDARY'),
  },
  'm03.angles-straight-line': {
    'ANG-180-360-SWAP': (q) => { const a = lineAsk(q); return a.equal ? [(360 - a.g) / a.k] : [360 - a.given.reduce((s, v) => s + v, 0)]; },
    'ANG-USES-90': (q) => [90 - lineAsk(q).given[0]],
    'ANG-ASSUME-EQUAL': (q) => { const a = lineAsk(q); return a.rel ? [180 - 2 * a.a] : [a.given[0]]; },
    'ANG-SUM-NOT-SUBTRACT': (q) => [lineAsk(q).given.reduce((s, v) => s + v, 0)],
    'ANG-ONE-ANGLE-ONLY': (q) => { const a = lineAsk(q); return a.rel ? [180 - a.b, 180 - a.a] : a.given.map((v) => 180 - v); },
    'ANG-NO-SHARE': (q) => [180 - lineAsk(q).g],
    'ANG-ALL-EQUAL': (q) => [180 / (lineAsk(q).k + 1)],
    'ANG-SPLIT-WRONG': (q) => { const a = lineAsk(q); return [(180 - a.g) / (a.k + 1), (180 - a.g) / (a.k - 1)]; },
    'ANG-WRONG-UNKNOWN': (q) => [lineAsk(q).b],
  },
  'm03.angles-at-point': {
    'ANG-180-360-SWAP': (q) => { const a = pointAsk(q); return a.equal ? [(180 - a.g) / a.k] : [180 - a.given.reduce((s, v) => s + v, 0)]; },
    'ANG-SUM-NOT-SUBTRACT': (q) => [pointAsk(q).given.reduce((s, v) => s + v, 0)],
    'ANG-ONE-ANGLE-ONLY': (q) => pointAsk(q).given.map((v) => 360 - v),
    'ANG-NO-SHARE': (q) => [360 - pointAsk(q).g],
    'ANG-SPLIT-WRONG': (q) => { const a = pointAsk(q); return [(360 - a.g) / (a.k + 1)]; },
    'ANG-ALL-EQUAL': (q) => [360 / (pointAsk(q).k + 1)],
  },
  'm03.protractor': {
    'ANG-PROTRACTOR-SCALE': (q) => [180 - SOLVERS['m03.protractor'](q).value],
    'ANG-REFLEX-OUTSIDE': (q) => [360 - SOLVERS['m03.protractor'](q).value],
    'ANG-USES-90': (q) => [Math.abs(90 - SOLVERS['m03.protractor'](q).value)],
  },
  'm03.triangle-angle': {
    'ANG-180-360-SWAP': (q) => { const a = triAsk(q); return a.right ? [360 - 90 - a.A] : [360 - a.A - a.B]; },
    'ANG-SUM-NOT-SUBTRACT': (q) => { const a = triAsk(q); return [a.A + a.B]; },
    'ANG-ONE-ANGLE-ONLY': (q) => [180 - triAsk(q).A],
    'ANG-USES-90': (q) => [90 - triAsk(q).A],
    'ANG-FORGETS-RIGHT': (q) => [180 - triAsk(q).A],
    'ANG-ASSUME-EQUAL': (q) => { const a = triAsk(q); return a.right ? [45] : [(180 - a.C) / 2]; },
    'ANG-WRONG-UNKNOWN': (q) => [triAsk(q).a],
    'ANG-NO-SHARE': (q) => [180 - triAsk(q).C],
  },
  'm03.special-triangle': {
    'ANG-NO-SHARE': (q) => [180 - isoAsk(q).apex],
    'ANG-ALL-EQUAL': () => [60],
    'ANG-COPY-GIVEN': (q) => [isoAsk(q).given],
    'ANG-ISO-WRONG-PAIR': (q) => { const a = isoAsk(q); return a.ask === 'base' ? [180 - 2 * a.apex] : [(180 - a.base) / 2]; },
    'ANG-ONE-ANGLE-ONLY': (q) => [180 - isoAsk(q).base],
    'ANG-WRONG-UNKNOWN': (q) => { const a = isoAsk(q); return [a.ask === 'apex' ? a.base : a.apex]; },
    'ANG-SPLIT-WRONG': (q) => { const a = isoAsk(q); return a.k ? [180 / (a.k + 1)] : [(180 - a.d) / 2]; },
  },
  'm03.area-right-triangle': {
    'AREA-TRI-NO-HALF': (q) => { const a = areaAsk(q); return [a.a * a.b]; },
    'AREA-USES-HYPOT': (q) => { const a = areaAsk(q); return [(a.c * a.a) / 2, (a.c * a.b) / 2]; },
    'AREA-PERIM-SWAP': (q) => { const a = areaAsk(q); return [a.a + a.b + a.c]; },
    'AREA-ADDS-SIDES': (q) => { const a = areaAsk(q); return [a.a + a.b]; },
    'AREA-TRI-NO-DOUBLE': (q) => { const a = areaAsk(q); return [a.A / a.a]; },
    'INVERSE-WRONG': (q) => { const a = areaAsk(q); return [a.A * a.a, 2 * a.A * a.a]; },
  },
  'm03.compound-area': {
    'AREA-TRI-NO-HALF': (q) => { const c = compoundParts(q); return c.joined ? [c.w * c.h + c.h * c.t, (c.w + c.t) * c.h] : [c.W * c.H - c.a * c.b]; },
    'OP-SWAP': (q) => { const c = compoundParts(q); return c.joined ? [c.w * c.h - (c.h * c.t) / 2] : [c.W * c.H + (c.a * c.b) / 2]; },
    'AREA-ADDS-SIDES': (q) => { const c = compoundParts(q); return c.joined ? [c.w * c.h + c.h + c.t] : [c.W * c.H - c.a - c.b]; },
    'ITEM-LEFT-OUT': (q) => { const c = compoundParts(q); return [c.w * c.h]; },
  },
  'm03.rotational-symmetry': {
    'ROT-ORDER-ANGLE': (q) => [360 / symmetryOrder(q).k],
    'ROT-ORDER-CORNERS': (q) => { const s = symmetryOrder(q); return [s.corners, 360 / s.corners]; },
    'ROT-ORDER-ZERO': () => [0],
    'ROT-ORDER-HALF-TURN': () => [2, 180],
    'ROT-ORDER-ADD-LINES': (q) => [2 * symmetryOrder(q).k],
    'ROT-ORDER-FOR-ANGLE': (q) => [symmetryOrder(q).k],
    'ROT-ALWAYS-QUARTER': () => [90],
  },
};

