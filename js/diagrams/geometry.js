// Geometry and number diagrams: polygon, circle, angle (with protractor), coordinate grid,
// number line, fraction model, bar model.

import {
  el, g, F, Box, label, labelAt, fracLabel, tidy, textWidth, frac, fval, num, formatValue, round,
  polar, dirOf, pathOf, arcPath, sectorPath, arrowHead, arrowLine, sideTicks, sideArrows, rad, listText, say, plural, pt,
} from './core.js';

// ---------------------------------------------------------------- shared helpers

const SHAPE_NAMES = { 3: 'triangle', 4: 'quadrilateral', 5: 'pentagon', 6: 'hexagon', 7: 'heptagon', 8: 'octagon', 9: 'nonagon', 10: 'decagon' };
const shapeName = (n) => SHAPE_NAMES[n] || `${n}-sided shape`;

function inside(p, poly) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if ((yi > p[1]) !== (yj > p[1]) && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}
const norm360 = (a) => ((a % 360) + 360) % 360;
const angDist = (a, b) => { const d = Math.abs(norm360(a) - norm360(b)); return Math.min(d, 360 - d); };

/** The direction (multiple of 15°) furthest from every direction in `dirs`. */
function freeDirection(dirs, prefer = 225, blocked = () => false) {
  if (!dirs.length) return prefer;
  let best = prefer;
  let bestScore = -Infinity;
  for (let a = 0; a < 360; a += 15) {
    const score = Math.min(...dirs.map((d) => angDist(a, d))) + (angDist(a, prefer) < 1 ? 0.5 : 0) - (blocked(a) ? 1000 : 0);
    if (score > bestScore) { bestScore = score; best = a; }
  }
  return best;
}

const WORD_DIRS = ['right', 'up and to the right', 'up', 'up and to the left', 'left', 'down and to the left', 'down', 'down and to the right'];
const dirWord = (deg) => WORD_DIRS[Math.round(norm360(deg) / 45) % 8];

/** Where the corner of the interior angle at vertex i is: { start, sweep, mid } in screen degrees. */
function interiorAngle(S, i) {
  const n = S.length;
  const p = S[i];
  const a = S[(i - 1 + n) % n];
  const b = S[(i + 1) % n];
  const da = dirOf(p, a);
  const db = dirOf(p, b);
  let sweep = norm360(db - da);
  let start = da;
  const test = polar(p[0], p[1], 2, start + sweep / 2);
  if (!inside(test, S)) { start = db; sweep = 360 - sweep; }
  return { start, sweep, mid: start + sweep / 2, da, db };
}

// ---------------------------------------------------------------- polygon

function regularPoints(n) {
  const pts = [];
  const start = -90 - 180 / n;
  for (let i = 0; i < n; i++) {
    const a = rad(start + (360 * i) / n);
    pts.push([round(Math.cos(a), 6), round(Math.sin(a), 6)]);
  }
  return pts;
}

const sideSpec = F.nullable(F.obj({ label: F.label, ticks: F.int(0, 3), arrows: F.int(0, 3) }));
const angleSpec = F.nullable(F.obj({ label: F.label, right: F.bool, arcs: F.int(0, 3) }));

const polygon = {
  size: 'medium',
  schema: {
    points: F.arr(F.point, 3, 12), regular: F.int(3, 12), vertexLabels: F.arr(F.str, 0, 12),
    sides: F.arr(sideSpec, 0, 12), angles: F.arr(angleSpec, 0, 12),
    extraLines: F.arr(F.obj({ from: F.point, to: F.point, dashed: F.bool, label: F.label }, ['from', 'to']), 0, 8),
    shaded: F.bool, grid: F.bool,
  },
  check(s) {
    const e = [];
    if (!s.points && !s.regular) e.push('give either points or regular');
    if (s.points && s.regular) e.push('give points or regular, not both');
    const n = s.points ? s.points.length : s.regular;
    for (const k of ['vertexLabels', 'sides', 'angles']) if (s[k] && s[k].length > n) e.push(`${k} has more entries than the shape has corners`);
    if (s.grid && s.points && s.points.some((p) => p.some((v) => !Number.isInteger(num(v))))) e.push('grid needs whole-number points');
    return e;
  },
  render(s) {
    const P = s.points ? s.points.map((p) => [num(p[0]), num(p[1])]) : regularPoints(s.regular);
    const xs = P.map((p) => p[0]);
    const ys = P.map((p) => p[1]);
    let minx = Math.min(...xs); let maxx = Math.max(...xs); let miny = Math.min(...ys); let maxy = Math.max(...ys);
    let k = Math.min(280 / (maxx - minx || 1), 200 / (maxy - miny || 1));
    if (s.grid) k = Math.max(16, Math.min(40, Math.floor(k)));
    const T = ([x, y]) => [(x - minx) * k, (maxy - y) * k];
    const S = P.map(T);
    const box = new Box().addPts(S);
    const body = [];
    if (s.grid) {
      const gx0 = Math.floor(minx) - 1; const gx1 = Math.ceil(maxx) + 1; const gy0 = Math.floor(miny) - 1; const gy1 = Math.ceil(maxy) + 1;
      let d = '';
      for (let x = gx0; x <= gx1; x++) { const a = T([x, gy0]); const b = T([x, gy1]); d += `M${pt(a)}L${pt(b)}`; }
      for (let y = gy0; y <= gy1; y++) { const a = T([gx0, y]); const b = T([gx1, y]); d += `M${pt(a)}L${pt(b)}`; }
      body.push(el('path', { d, class: 'dg-grid' }));
      box.add(...T([gx0, gy0])).add(...T([gx1, gy1]));
    }
    body.push(el('path', { d: pathOf(S), class: s.shaded ? 'dg-shade' : 'dg-shade2' }));
    for (const ln of s.extraLines || []) {
      const a = T([num(ln.from[0]), num(ln.from[1])]);
      const b = T([num(ln.to[0]), num(ln.to[1])]);
      body.push(el('line', { x1: a[0], y1: a[1], x2: b[0], y2: b[1], class: 'dg-ink2', 'stroke-width': 1.8, 'stroke-dasharray': ln.dashed === false ? null : '6 4' }));
      box.add(...a).add(...b);
      if (ln.label != null && ln.label !== '') {
        const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
        const l = labelAt(box, m[0], m[1], dirOf(a, b) + 90, String(ln.label), { size: 14 });
        body.push(l.node);
      }
    }
    body.push(el('path', { d: pathOf(S), class: 'dg-ink', 'stroke-width': 2.4 }));
    const n = S.length;
    // angles
    (s.angles || []).forEach((a, i) => {
      if (!a) return;
      const ia = interiorAngle(S, i);
      const p = S[i];
      const lenA = Math.hypot(S[(i + 1) % n][0] - p[0], S[(i + 1) % n][1] - p[1]);
      const lenB = Math.hypot(S[(i - 1 + n) % n][0] - p[0], S[(i - 1 + n) % n][1] - p[1]);
      let r = Math.max(14, Math.min(28, 0.3 * Math.min(lenA, lenB)));
      if (a.right && ia.sweep > 180) {
        r = 18; // a reflex corner cannot be a right angle: no mark
      } else if (a.right) {
        const q = 13;
        const u = polar(p[0], p[1], q, ia.da);
        const v = polar(p[0], p[1], q, ia.db);
        const w = [u[0] + v[0] - p[0], u[1] + v[1] - p[1]];
        body.push(el('path', { d: `M${pt(u)}L${pt(w)}L${pt(v)}`, class: 'dg-ink', 'stroke-width': 1.6 }));
        r = 18;
      } else {
        const arcs = a.arcs ?? 1;
        for (let j = 0; j < arcs; j++) body.push(el('path', { d: arcPath(p[0], p[1], r + j * 4, ia.start, ia.start + ia.sweep), class: 'dg-ink', 'stroke-width': 1.6 }));
        r += Math.max(0, (a.arcs ?? 1) - 1) * 4;
      }
      if (a.label != null && a.label !== '') {
        const extra = ia.sweep < 40 ? 14 / Math.sin(rad(Math.max(ia.sweep, 8) / 2)) - r : 0;
        const l = labelAt(box, p[0], p[1], ia.mid, String(a.label), { size: 15, gap: r + 3 + Math.max(0, Math.min(extra, 50)) });
        body.push(l.node);
      }
    });
    // sides
    (s.sides || []).forEach((sd, i) => {
      if (!sd) return;
      const p = S[i];
      const q = S[(i + 1) % n];
      const both = sd.ticks && sd.arrows;
      if (sd.ticks) body.push(...sideTicks(p, q, sd.ticks, 10, both ? -12 : 0));
      if (sd.arrows) body.push(...sideArrows(p, q, sd.arrows, both ? 14 : 0));
      if (sd.label != null && sd.label !== '') {
        const m = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
        const d = dirOf(p, q);
        const out = inside(polar(m[0], m[1], 3, d + 90), S) ? d - 90 : d + 90;
        const l = labelAt(box, m[0], m[1], out, String(sd.label), { size: 15, gap: sd.ticks || sd.arrows ? 10 : 6 });
        body.push(l.node);
      }
    });
    // vertex labels
    (s.vertexLabels || []).forEach((t, i) => {
      if (!t) return;
      const ia = interiorAngle(S, i);
      const l = labelAt(box, S[i][0], S[i][1], ia.mid + 180, t, { size: 16, weight: 600, gap: 4 });
      body.push(l.node);
    });
    return { box, body };
  },
  describe(s) {
    const n = s.points ? s.points.length : s.regular;
    const V = s.vertexLabels || [];
    const nameSide = (i) => (V[i] && V[(i + 1) % n] ? `side ${V[i]}${V[(i + 1) % n]}` : `side ${i + 1}`);
    const nameCorner = (i) => (V[i] ? `corner ${V[i]}` : `corner ${i + 1}`);
    const parts = [];
    parts.push(s.regular ? `A regular ${shapeName(n)}.` : `A ${shapeName(n)}${V.filter(Boolean).length ? ` ${V.join('')}` : ''}.`);
    if (s.grid) parts.push('It is drawn on squared paper with 1-unit squares.');
    const sideL = []; const ticks = {}; const arrows = {};
    (s.sides || []).forEach((sd, i) => {
      if (!sd) return;
      if (sd.label != null && sd.label !== '') sideL.push(`${nameSide(i)} is labelled ${say(sd.label)}`);
      if (sd.ticks) (ticks[sd.ticks] ||= []).push(nameSide(i));
      if (sd.arrows) (arrows[sd.arrows] ||= []).push(nameSide(i));
    });
    if (sideL.length) parts.push(`${cap(listText(sideL))}.`);
    for (const list of Object.values(ticks)) if (list.length > 1) parts.push(`${cap(listText(list))} are marked as equal.`);
    for (const list of Object.values(arrows)) if (list.length > 1) parts.push(`${cap(listText(list))} are marked as parallel.`);
    const angL = []; const rights = []; const arcs = {};
    (s.angles || []).forEach((a, i) => {
      if (!a) return;
      if (a.right) rights.push(nameCorner(i));
      if (a.label != null && a.label !== '') angL.push(`the angle at ${nameCorner(i)} is labelled ${say(a.label)}`);
      if (!a.right && a.arcs > 0) (arcs[a.arcs] ||= []).push(nameCorner(i));
    });
    if (rights.length) parts.push(`There is a right angle at ${listText(rights)}.`);
    if (angL.length) parts.push(`${cap(listText(angL))}.`);
    for (const [k, list] of Object.entries(arcs)) if (list.length > 1 && Number(k) > 0) parts.push(`The angles at ${listText(list)} are marked as equal.`);
    for (const ln of s.extraLines || []) if (ln.label) parts.push(`A line inside is labelled ${say(ln.label)}.`);
    return parts.join(' ');
  },
};
const cap = (t) => (t ? t[0].toUpperCase() + t.slice(1) : t);

// ---------------------------------------------------------------- circle

const circle = {
  size: 'medium',
  schema: {
    centreLabel: F.str, radius: F.obj({ angle: F.num(), label: F.label }), diameter: F.obj({ angle: F.num(), label: F.label }),
    points: F.arr(F.obj({ angle: F.num(), label: F.str }, ['angle']), 0, 8), chords: F.arr(F.arr(F.num(), 2, 2), 0, 6),
  },
  render(s) {
    const R = 110;
    const box = new Box().circle(0, 0, R);
    const body = [el('circle', { cx: 0, cy: 0, r: R, class: 'dg-shade2' }), el('circle', { cx: 0, cy: 0, r: R, class: 'dg-ink', 'stroke-width': 2.4 })];
    const used = [];
    for (const [a1, a2] of s.chords || []) {
      const p = polar(0, 0, R, a1); const q = polar(0, 0, R, a2);
      body.push(el('line', { x1: p[0], y1: p[1], x2: q[0], y2: q[1], class: 'dg-ink', 'stroke-width': 2 }));
    }
    const seg = (a, b, text, d, at = 0.5) => {
      body.push(el('line', { x1: a[0], y1: a[1], x2: b[0], y2: b[1], class: 'dg-ink', 'stroke-width': 2 }));
      if (text != null && text !== '') {
        const m = [a[0] + (b[0] - a[0]) * at, a[1] + (b[1] - a[1]) * at];
        const side = norm360(d) > 90 && norm360(d) <= 270 ? d - 90 : d + 90;
        body.push(labelAt(box, m[0], m[1], side, String(text), { size: 15 }).node);
      }
    };
    if (s.diameter) {
      const d = s.diameter.angle || 0;
      // label the diameter on the half away from any radius, clear of the centre
      const flip = s.radius && angDist(s.radius.angle ?? 30, d) < 90;
      seg(polar(0, 0, R, d + 180), polar(0, 0, R, d), s.diameter.label, d, flip ? 0.25 : 0.75);
      used.push(d, d + 180);
    }
    if (s.radius) {
      const d = s.radius.angle ?? 30;
      seg([0, 0], polar(0, 0, R, d), s.radius.label, d);
      used.push(d);
    }
    for (const p of s.points || []) {
      const q = polar(0, 0, R, p.angle);
      body.push(el('circle', { cx: q[0], cy: q[1], r: 4, class: 'dg-fill-ink' }));
      if (p.label) body.push(labelAt(box, q[0], q[1], p.angle, p.label, { size: 16, weight: 600, gap: 5 }).node);
    }
    body.push(el('circle', { cx: 0, cy: 0, r: 3.5, class: 'dg-fill-ink' }));
    if (s.centreLabel) body.push(labelAt(box, 0, 0, freeDirection(used, 250), s.centreLabel, { size: 16, weight: 600, gap: 4 }).node);
    return { box, body };
  },
  describe(s) {
    const parts = [`A circle${s.centreLabel ? ` with centre ${s.centreLabel}` : ' with its centre marked'}.`];
    if (s.radius) parts.push(`A radius is drawn${s.radius.label ? ` and labelled ${say(s.radius.label)}` : ''}.`);
    if (s.diameter) parts.push(`A diameter is drawn${s.diameter.label ? ` and labelled ${say(s.diameter.label)}` : ''}.`);
    if ((s.points || []).length) parts.push(`Points ${listText(s.points.map((p) => p.label || 'unlabelled'))} are on the circle.`);
    if ((s.chords || []).length) parts.push(`${plural(s.chords.length, 'chord')} joining points on the circle.`);
    return parts.join(' ');
  },
};

// ---------------------------------------------------------------- angle and protractor

function protractor(R) {
  const out = [];
  out.push(el('path', { d: `M${-R - 8},0 A${R + 8},${R + 8} 0 0 1 ${R + 8},0 Z`, class: 'dg-glass' }));
  out.push(el('path', { d: `M${-R - 8},0 A${R + 8},${R + 8} 0 0 1 ${R + 8},0 Z`, class: 'dg-ink2', 'stroke-width': 1.4 }));
  let d = '';
  for (let a = 0; a <= 180; a++) {
    const len = a % 10 === 0 ? 13 : a % 5 === 0 ? 9 : 5;
    const p = polar(0, 0, R + 8, a); const q = polar(0, 0, R + 8 - len, a);
    d += `M${pt(p)}L${pt(q)}`;
    if (a % 10 === 0) { const p2 = polar(0, 0, R - 40, a); const q2 = polar(0, 0, R - 47, a); d += `M${pt(p2)}L${pt(q2)}`; }
  }
  out.push(el('path', { d, class: 'dg-ink2', 'stroke-width': 1 }));
  out.push(el('path', { d: arcPath(0, 0, R - 40, 0, 180), class: 'dg-ink2', 'stroke-width': 1 }));
  for (let a = 0; a <= 180; a += 10) {
    if (a === 0 || a === 180) {
      // the end numbers sit upright just above the baseline, as on a real protractor
      const sgn = a === 0 ? 1 : -1;
      const ot = String(180 - a); const it = String(a);
      out.push(el('text', { x: sgn * (R - 4), y: -8, 'text-anchor': a === 0 ? 'end' : 'start', 'dominant-baseline': 'central', 'font-size': 10.5, class: 'dg-t' }, ot));
      out.push(el('text', { x: sgn * (R - 26), y: -8, 'text-anchor': a === 0 ? 'end' : 'start', 'dominant-baseline': 'central', 'font-size': 9.5, class: 'dg-t2' }, it));
      continue;
    }
    const o = polar(0, 0, R - 13, a); // outer scale: 0 on the left
    const i = polar(0, 0, R - 31, a); // inner scale: 0 on the right
    out.push(el('text', { x: o[0], y: o[1], 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': 10.5, class: 'dg-t', transform: `rotate(${round(90 - a, 2)} ${round(o[0], 2)} ${round(o[1], 2)})` }, String(180 - a)));
    out.push(el('text', { x: i[0], y: i[1], 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': 9.5, class: 'dg-t2', transform: `rotate(${round(90 - a, 2)} ${round(i[0], 2)} ${round(i[1], 2)})` }, String(a)));
  }
  out.push(el('path', { d: 'M-7,0L7,0M0,-7L0,0', class: 'dg-ink', 'stroke-width': 1.2 }));
  return out;
}

const angle = {
  size: 'medium',
  schema: {
    rays: F.arr(F.num(-360, 720), 0, 8), lines: F.arr(F.num(-360, 720), 0, 4),
    arcs: F.arr(F.obj({ from: F.num(-360, 720), to: F.num(-360, 720), label: F.label, right: F.bool }, ['from', 'to']), 0, 8),
    rayLabels: F.arr(F.str, 0, 8), vertexLabel: F.str, protractor: F.bool,
  },
  check(s) { return (s.rays || []).length + (s.lines || []).length ? [] : ['give at least one ray or line']; },
  render(s) {
    const R = 150;
    const L = s.protractor ? R + 40 : 130;
    const box = new Box().add(0, 0);
    const body = [];
    if (s.protractor) { body.push(...protractor(R)); box.add(-R - 10, -R - 10).add(R + 10, 4); }
    const dirs = [];
    for (const d of s.lines || []) {
      const a = polar(0, 0, L, d + 180); const b = polar(0, 0, L, d);
      body.push(el('line', { x1: a[0], y1: a[1], x2: b[0], y2: b[1], class: 'dg-ink', 'stroke-width': 2.4 }));
      box.add(...a).add(...b); dirs.push(d, d + 180);
    }
    (s.rays || []).forEach((d) => {
      const b = polar(0, 0, L, d);
      body.push(el('line', { x1: 0, y1: 0, x2: b[0], y2: b[1], class: 'dg-ink', 'stroke-width': 2.4 }));
      box.add(...b); dirs.push(d);
    });
    const placed = [];
    (s.arcs || []).forEach((a) => {
      const sweep = norm360(a.to - a.from) || 360;
      // arcs share one radius unless they overlap an earlier arc
      const overlaps = (b) => { const s1 = norm360(a.from); const s2 = norm360(b.from); return [[s1, sweep, s2, b.sweep], [s2, b.sweep, s1, sweep]].some(([x, w, y]) => norm360(y - x) < w - 0.5 && norm360(y - x) > 0.5) || (Math.abs(s1 - s2) < 0.5); };
      const level = placed.filter(overlaps).length;
      placed.push({ from: a.from, sweep });
      const r = (s.protractor ? 34 : 30) + level * 10;
      if (a.right && Math.abs(sweep - 90) < 0.01) {
        const u = polar(0, 0, 16, a.from); const v = polar(0, 0, 16, a.to);
        body.push(el('path', { d: `M${pt(u)}L${pt([u[0] + v[0], u[1] + v[1]])}L${pt(v)}`, class: 'dg-ink', 'stroke-width': 1.6 }));
      } else {
        body.push(el('path', { d: arcPath(0, 0, r, a.from, a.from + sweep), class: 'dg-accent', 'stroke-width': 2 }));
      }
      if (a.label != null && a.label !== '') {
        const extra = sweep < 40 ? 14 / Math.sin(rad(Math.max(sweep, 8) / 2)) - r : 0;
        body.push(labelAt(box, 0, 0, a.from + sweep / 2, String(a.label), { size: 15, gap: r + 4 + Math.max(0, Math.min(extra, 60)) }).node);
      }
    });
    (s.rayLabels || []).forEach((t, i) => {
      if (!t || s.rays[i] == null) return;
      const b = polar(0, 0, L, s.rays[i]);
      body.push(labelAt(box, b[0], b[1], s.rays[i], t, { size: 16, weight: 600, gap: 4 }).node);
    });
    body.push(el('circle', { cx: 0, cy: 0, r: 3, class: 'dg-fill-ink' }));
    const avoid = [...dirs, ...(s.arcs || []).map((a) => a.from + (norm360(a.to - a.from) || 360) / 2)];
    if (s.protractor) avoid.push(0, 45, 90, 135, 180);
    const inArc = (d) => (s.arcs || []).some((a) => { const sw = norm360(a.to - a.from) || 360; return norm360(d - a.from) < sw; });
    if (s.vertexLabel) body.push(labelAt(box, 0, 0, freeDirection(avoid, 250, inArc), s.vertexLabel, { size: 16, weight: 600, gap: 6 }).node);
    return { box, body };
  },
  describe(s) {
    const parts = [];
    const rays = s.rays || [];
    const lines = s.lines || [];
    const V = s.vertexLabel || 'the point';
    const rayName = (i) => (s.rayLabels && s.rayLabels[i] ? `ray ${s.vertexLabel || ''}${s.rayLabels[i]}` : `the ray going ${dirWord(rays[i])}`);
    if (lines.length) parts.push(`${lines.length === 1 ? 'A straight line' : `${lines.length} straight lines`} through ${V}${rays.length ? `, with ${plural(rays.length, 'ray')} from ${V}` : ''}.`);
    else parts.push(`${rays.length === 2 ? 'Two rays meet' : `${rays.length === 1 ? 'One ray starts' : `${rays.length} rays start`}`} at ${V}.`);
    if (rays.length) parts.push(`${cap(listText(rays.map((_, i) => rayName(i))))}.`);
    for (const a of s.arcs || []) {
      const sweep = norm360(a.to - a.from) || 360;
      const kind = a.right ? 'a right angle' : 'an angle';
      parts.push(`${cap(kind)} is marked between the ${dirWord(a.from)} direction and the ${dirWord(a.to)} direction${a.label ? `, labelled ${say(a.label)}` : ''}${sweep > 180 ? ' (the reflex angle, the long way round)' : ''}.`);
    }
    if (s.protractor) {
      const up = rays.filter((d) => norm360(d) <= 180);
      const reads = up.filter((d) => norm360(d) % 180 !== 0).map((d) => `the ray going ${dirWord(d)} crosses the inner scale at ${round(norm360(d), 1)} and the outer scale at ${round(180 - norm360(d), 1)}`);
      parts.push(`A protractor is placed with its centre on ${V} and its baseline along the horizontal.${reads.length ? ` ${cap(listText(reads))}.` : ''}`);
    }
    return parts.join(' ');
  },
};

// ---------------------------------------------------------------- coordinate grid

const ptSpec = F.obj({ at: F.point, label: F.str, showCoords: F.bool, style: F.enum('dot', 'cross', 'hollow') }, ['at']);
const lineSpec = F.obj({ x: F.num(), y: F.num(), through: F.arr(F.point, 2, 2), label: F.str });
const coordFmt = (v) => tidy(formatValue(v, typeof v === 'string' && v.includes(' ') ? 'mixed' : 'auto'));

const coordinateGrid = {
  size: 'medium',
  schema: {
    x: F.arr(F.int(-20, 20), 2, 2), y: F.arr(F.int(-20, 20), 2, 2), labelEvery: F.int(1, 10),
    points: F.arr(ptSpec, 0, 16),
    polygons: F.arr(F.obj({ points: F.arr(F.point, 2, 12), label: F.str, style: F.enum('solid', 'dashed', 'shaded') }, ['points']), 0, 6),
    segments: F.arr(F.obj({ from: F.point, to: F.point, dashed: F.bool, arrow: F.bool, label: F.str }, ['from', 'to']), 0, 8),
    lines: F.arr(lineSpec, 0, 4), quadrantLabels: F.bool, axisLabels: F.arr(F.str, 2, 2),
  },
  required: ['x', 'y'],
  check(s) {
    const e = [];
    if (s.x[0] >= s.x[1] || s.y[0] >= s.y[1]) e.push('x and y ranges must go from low to high');
    if (s.x[1] - s.x[0] > 24 || s.y[1] - s.y[0] > 24) e.push('ranges may be at most 24 units');
    for (const l of s.lines || []) if ([l.x != null, l.y != null, l.through != null].filter(Boolean).length !== 1) e.push('each line needs exactly one of x, y or through');
    return e;
  },
  render(s) {
    const [x0, x1] = s.x; const [y0, y1] = s.y;
    const u = Math.max(16, Math.min(34, Math.floor(Math.min(330 / (x1 - x0), 330 / (y1 - y0)))));
    const X = (x) => (num(x) - x0) * u; const Y = (y) => (y1 - num(y)) * u;
    const W = (x1 - x0) * u; const H = (y1 - y0) * u;
    const box = new Box().rect(0, 0, W, H);
    const body = [];
    let d = '';
    for (let x = x0; x <= x1; x++) d += `M${X(x)},0V${H}`;
    for (let y = y0; y <= y1; y++) d += `M0,${Y(y)}H${W}`;
    body.push(el('path', { d, class: 'dg-grid' }));
    const ax = y0 <= 0 && y1 >= 0 ? Y(0) : H; // where the x axis sits
    const ay = x0 <= 0 && x1 >= 0 ? X(0) : 0;
    body.push(el('line', { x1: 0, y1: ax, x2: W + 12, y2: ax, class: 'dg-axis' }), arrowHead(W + 16, ax, 0, 9, 'dg-fill-ink2'));
    body.push(el('line', { x1: ay, y1: H, x2: ay, y2: -12, class: 'dg-axis' }), arrowHead(ay, -16, 90, 9, 'dg-fill-ink2'));
    const [xl, yl] = s.axisLabels || ['x', 'y'];
    body.push(label(W + 26, ax, xl, { size: 15, italic: true, anchor: 'start' }), label(ay, -28, yl, { size: 15, italic: true }));
    box.text(W + 26, ax, xl, 15, 'start').text(ay, -28, yl, 15);
    const every = s.labelEvery || (Math.max(x1 - x0, y1 - y0) > 14 ? 2 : 1);
    const nums = []; // axis numbers go on top of mirror lines and shapes (their halo keeps them readable)
    for (let x = x0; x <= x1; x++) {
      if (x === 0 && ay === X(0) && ax === Y(0)) continue;
      if (x % every) continue;
      const t = tidy(String(x));
      nums.push(label(X(x), ax + 12, t, { size: 12, cls: 'dg-t2' })); box.text(X(x), ax + 12, t, 12);
    }
    for (let y = y0; y <= y1; y++) {
      if (y === 0 && ay === X(0) && ax === Y(0)) continue;
      if (y % every) continue;
      const t = tidy(String(y));
      nums.push(label(ay - 6, Y(y), t, { size: 12, cls: 'dg-t2', anchor: 'end' })); box.text(ay - 6, Y(y), t, 12, 'end');
    }
    if (ay === X(0) && ax === Y(0)) { nums.push(label(ay - 6, ax + 12, '0', { size: 12, cls: 'dg-t2', anchor: 'end' })); box.text(ay - 6, ax + 12, '0', 12, 'end'); }
    if (s.quadrantLabels && x0 < 0 && x1 > 0 && y0 < 0 && y1 > 0) {
      // in the outer corner of each quadrant, where plotted points rarely are
      const q = [['2nd', X(x0) + 4, Y(y1) + 10, 'start'], ['1st', X(x1) - 4, Y(y1) + 10, 'end'], ['3rd', X(x0) + 4, Y(y0) - 10, 'start'], ['4th', X(x1) - 4, Y(y0) - 10, 'end']];
      for (const [t, qx, qy, anc] of q) body.push(label(qx, qy, `${t} quadrant`, { size: 12, cls: 'dg-tm', anchor: anc }));
    }
    for (const l of s.lines || []) {
      let a; let b;
      if (l.x != null) { a = [X(l.x), -6]; b = [X(l.x), H + 6]; }
      else if (l.y != null) { a = [-6, Y(l.y)]; b = [W + 6, Y(l.y)]; }
      else {
        const [p, q] = l.through.map(([px, py]) => [num(px), num(py)]);
        const clip = clipLine(p, q, x0, x1, y0, y1);
        if (!clip) continue;
        a = [X(clip[0][0]), Y(clip[0][1])]; b = [X(clip[1][0]), Y(clip[1][1])];
      }
      body.push(el('line', { x1: a[0], y1: a[1], x2: b[0], y2: b[1], class: 'dg-accent', 'stroke-width': 2.6, 'stroke-dasharray': '9 5' }));
      if (l.label) {
        if (l.y != null) body.push(labelAt(box, b[0], b[1], Number(l.y) === 0 ? -35 : 35, l.label, { size: 14, weight: 600, gap: 4 }).node);
        else if (l.x != null) {
          const onAxis = Number(l.x) === 0; // keep clear of the y-axis label at the top
          const end = onAxis ? (a[1] > b[1] ? a : b) : (a[1] < b[1] ? a : b);
          body.push(labelAt(box, end[0], end[1], onAxis ? -40 : 40, l.label, { size: 14, weight: 600, gap: 4 }).node);
        } else { const top = a[1] < b[1] ? a : b; body.push(labelAt(box, top[0], top[1], 40, l.label, { size: 14, weight: 600, gap: 4 }).node); }
      }
    }
    for (const p of s.polygons || []) {
      const S = p.points.map(([px, py]) => [X(px), Y(py)]);
      const closed = S.length > 2;
      const style = p.style || 'solid';
      body.push(el('path', {
        d: pathOf(S, closed), class: style === 'dashed' ? 'dg-accent' : 'dg-ink',
        'stroke-width': 2.4, 'stroke-dasharray': style === 'dashed' ? '7 4' : null,
      }));
      if (closed) body.splice(body.length - 1, 0, el('path', { d: pathOf(S), class: style === 'shaded' ? 'dg-shade' : 'dg-shade2' }));
      if (p.label) {
        const c = S.reduce((acc, q) => [acc[0] + q[0] / S.length, acc[1] + q[1] / S.length], [0, 0]);
        body.push(label(c[0], c[1], p.label, { size: 16, weight: 700 }));
      }
    }
    for (const sg of s.segments || []) {
      const a = [X(sg.from[0]), Y(sg.from[1])]; const b = [X(sg.to[0]), Y(sg.to[1])];
      if (sg.arrow) body.push(arrowLine(a, b, { cls: 'dg-accent', headCls: 'dg-fill-accent', width: 2.4, dashed: sg.dashed }));
      else body.push(el('line', { x1: a[0], y1: a[1], x2: b[0], y2: b[1], class: 'dg-ink', 'stroke-width': 2.4, 'stroke-dasharray': sg.dashed ? '7 4' : null }));
      if (sg.label) body.push(labelAt(box, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, dirOf(a, b) + 90, sg.label, { size: 14 }).node);
    }
    body.push(...nums);
    for (const p of s.points || []) {
      const c = [X(p.at[0]), Y(p.at[1])];
      const st = p.style || 'dot';
      if (st === 'cross') body.push(el('path', { d: `M${c[0] - 6},${c[1] - 6}L${c[0] + 6},${c[1] + 6}M${c[0] - 6},${c[1] + 6}L${c[0] + 6},${c[1] - 6}`, class: 'dg-ink', 'stroke-width': 2.4 }));
      else if (st === 'hollow') body.push(el('circle', { cx: c[0], cy: c[1], r: 5, class: 'dg-ink', 'stroke-width': 2, fill: 'none' }));
      else body.push(el('circle', { cx: c[0], cy: c[1], r: 5.5, class: 'dg-dot' }));
      const t = [p.label || '', p.showCoords ? `(${coordFmt(p.at[0])}, ${coordFmt(p.at[1])})` : ''].filter(Boolean).join(' ');
      if (t) body.push(labelAt(box, c[0], c[1], 45, t, { size: 15, weight: 600, gap: 3 }).node);
    }
    return { box, body };
  },
  describe(s) {
    const four = s.x[0] < 0 && s.y[0] < 0;
    const parts = [`A coordinate grid${four ? ' with four quadrants' : ''}, x from ${tidy(String(s.x[0]))} to ${s.x[1]} and y from ${tidy(String(s.y[0]))} to ${s.y[1]}.`];
    for (const p of s.points || []) parts.push(`Point ${p.label || ''} is plotted at (${coordFmt(p.at[0])}, ${coordFmt(p.at[1])}).`.replace('Point  is', 'A point is'));
    for (const p of s.polygons || []) parts.push(`${p.style === 'dashed' ? 'A dashed shape' : 'A shape'}${p.label ? ` ${p.label}` : ''} has corners at ${listText(p.points.map(([x, y]) => `(${coordFmt(x)}, ${coordFmt(y)})`))}.`);
    for (const sg of s.segments || []) parts.push(`${sg.arrow ? 'An arrow' : 'A line'} goes from (${coordFmt(sg.from[0])}, ${coordFmt(sg.from[1])}) to (${coordFmt(sg.to[0])}, ${coordFmt(sg.to[1])}).`);
    for (const l of s.lines || []) {
      const what = l.x != null ? `the vertical line x = ${tidy(String(l.x))}` : l.y != null ? `the horizontal line y = ${tidy(String(l.y))}` : `a sloping line through (${coordFmt(l.through[0][0])}, ${coordFmt(l.through[0][1])}) and (${coordFmt(l.through[1][0])}, ${coordFmt(l.through[1][1])})`;
      parts.push(`A dashed mirror line is drawn along ${what}${l.label ? `, labelled ${say(l.label)}` : ''}.`);
    }
    return parts.join(' ');
  },
};

/** Clip the infinite line through p and q to the rectangle; returns two points or null. */
function clipLine(p, q, x0, x1, y0, y1) {
  const dx = q[0] - p[0]; const dy = q[1] - p[1];
  const hits = [];
  if (dx !== 0) for (const x of [x0, x1]) { const t = (x - p[0]) / dx; const y = p[1] + t * dy; if (y >= y0 - 1e-9 && y <= y1 + 1e-9) hits.push([x, y, t]); }
  if (dy !== 0) for (const y of [y0, y1]) { const t = (y - p[1]) / dy; const x = p[0] + t * dx; if (x >= x0 - 1e-9 && x <= x1 + 1e-9) hits.push([x, y, t]); }
  if (hits.length < 2) return null;
  hits.sort((a, b) => a[2] - b[2]);
  return [hits[0], hits[hits.length - 1]];
}

// ---------------------------------------------------------------- number line

const lcm = (a, b) => { const g0 = (x, y) => (y ? g0(y, x % y) : x); return (a / g0(a, b)) * b; };

const numberLine = {
  size: 'large',
  schema: {
    min: F.frac, max: F.frac, step: F.frac, minorStep: F.frac,
    labels: F.oneOf(F.enum('major', 'ends', 'none'), F.arr(F.frac, 0, 20)), format: F.enum('auto', 'decimal', 'fraction', 'mixed'),
    points: F.arr(F.obj({ at: F.frac, label: F.str }, ['at']), 0, 8),
    jumps: F.arr(F.obj({ from: F.frac, to: F.frac, label: F.str }, ['from', 'to']), 0, 8),
    highlight: F.obj({ from: F.frac, to: F.frac }, ['from', 'to']),
  },
  required: ['min', 'max', 'step'],
  check(s) {
    const e = [];
    const [mn, mx, st] = [s.min, s.max, s.step].map((v) => fval(frac(v)));
    if (!(mx > mn)) e.push('max must be more than min');
    if (!(st > 0)) e.push('step must be more than 0');
    else if ((mx - mn) / st > 20.0001) e.push('at most 20 labelled steps');
    if (s.minorStep != null) {
      const ms = fval(frac(s.minorStep));
      const ratio = st / ms;
      if (!(ms > 0) || Math.abs(ratio - Math.round(ratio)) > 1e-9) e.push('minorStep must divide step exactly');
      else if ((mx - mn) / ms > 40.0001) e.push('at most 40 small steps');
    }
    const span = (mx - mn) / st;
    if (st > 0 && Math.abs(span - Math.round(span)) > 1e-9) e.push('max - min must be a whole number of steps');
    return e;
  },
  render(s) {
    const F0 = [s.min, s.max, s.step, s.minorStep ?? s.step].map(frac);
    let D = 1;
    for (const f of F0) D = lcm(D, f.d);
    const toU = (f) => Math.round((f.n * D) / f.d);
    const [mn, mx, st, ms] = F0.map(toU);
    const Lw = 380;
    const X = (u) => ((u - mn) / (mx - mn)) * Lw;
    const box = new Box().add(-22, -8).add(Lw + 22, 8);
    const body = [];
    if (s.highlight) {
      const a = X(toU(frac(s.highlight.from))); const b = X(toU(frac(s.highlight.to)));
      body.push(el('rect', { x: Math.min(a, b), y: -6, width: Math.abs(b - a), height: 12, rx: 3, class: 'dg-shade' }));
    }
    body.push(el('line', { x1: -14, y1: 0, x2: Lw + 14, y2: 0, class: 'dg-ink', 'stroke-width': 2 }), arrowHead(-20, 0, 180, 9), arrowHead(Lw + 20, 0, 0, 9));
    let d = '';
    for (let u = mn; u <= mx; u += ms) {
      const major = (u - mn) % st === 0;
      d += `M${round(X(u), 2)},${major ? -10 : -6}V${major ? 10 : 6}`;
    }
    body.push(el('path', { d, class: 'dg-ink', 'stroke-width': 1.8 }));
    const fmtWanted = s.format && s.format !== 'auto' ? s.format
      : [s.min, s.max, s.step, s.minorStep].some((v) => typeof v === 'string' && /\d\s+\d/.test(v)) ? 'mixed'
        : [s.min, s.max, s.step, s.minorStep].some((v) => typeof v === 'string' && v.includes('/')) ? 'fraction' : 'decimal';
    const stacked = fmtWanted === 'fraction' || fmtWanted === 'mixed';
    const labelVals = [];
    if (Array.isArray(s.labels)) for (const v of s.labels) labelVals.push(toU(frac(v)));
    else if (s.labels === 'ends') labelVals.push(mn, mx);
    else if (s.labels !== 'none') for (let u = mn; u <= mx; u += st) labelVals.push(u);
    for (const u of labelVals) {
      const f = simplify(u, D);
      const t = tidy(formatValue(f, fmtWanted));
      const y = stacked && f.d > 1 ? 34 : 24;
      body.push(stacked ? fracLabel(X(u), y, t, { size: 14 }) : label(X(u), y, t, { size: 14 }));
      box.text(X(u), y, t, 14).add(X(u), stacked ? 52 : 32);
    }
    (s.jumps || []).forEach((j) => {
      const a = X(toU(frac(j.from))); const b = X(toU(frac(j.to)));
      const h = Math.min(60, 16 + Math.abs(b - a) * 0.25);
      const m = (a + b) / 2;
      body.push(el('path', { d: `M${a},-4 Q${m},${-h * 2 + 4} ${b},-4`, class: 'dg-accent', 'stroke-width': 2 }));
      const dir = b > a ? 0 : 180;
      body.push(arrowHead(b, -4, dir === 0 ? -60 : 240, 8, 'dg-fill-accent'));
      if (j.label) { body.push(label(m, -h - 12, j.label, { size: 14, weight: 600 })); box.text(m, -h - 12, j.label, 14); }
      box.add(m, -h - 4);
    });
    for (const p of s.points || []) {
      const x = X(toU(frac(p.at)));
      body.push(el('circle', { cx: x, cy: 0, r: 6, class: 'dg-dot' }));
      if (p.label) {
        if (p.label.trim() === '?') { body.push(arrowLine([x, -40], [x, -9], { width: 1.6, size: 8 })); body.push(label(x, -52, '?', {})); box.text(x, -52, '?', 15); }
        else { body.push(label(x, -24, p.label, { size: 16, weight: 700 })); box.text(x, -24, p.label, 16); }
      }
    }
    return { box, body };
  },
  describe(s) {
    const fmt = (v) => tidy(formatValue(frac(v), typeof v === 'string' && /\d\s+\d/.test(v) ? 'mixed' : 'auto'));
    const parts = [`A number line from ${fmt(s.min)} to ${fmt(s.max)} with large marks every ${fmt(s.step)}${s.minorStep != null ? ` and small marks every ${fmt(s.minorStep)}` : ''}.`];
    if (s.labels === 'ends') parts.push('Only the two ends are numbered.');
    else if (s.labels === 'none') parts.push('The marks are not numbered.');
    else if (Array.isArray(s.labels)) parts.push(`The marks numbered are ${listText(s.labels.map(fmt))}.`);
    for (const p of s.points || []) parts.push(`${p.label && p.label !== '?' ? `Point ${p.label}` : 'A point to find'} is ${positionWords(p.at, s)}.`);
    for (const j of s.jumps || []) parts.push(`A jump goes from ${fmt(j.from)} to ${fmt(j.to)}${j.label ? `, labelled ${say(j.label)}` : ''}.`);
    if (s.highlight) parts.push(`The part from ${fmt(s.highlight.from)} to ${fmt(s.highlight.to)} is shaded.`);
    return parts.join(' ');
  },
};
function simplify(u, D) { const f = frac(`${u}/${D}`); return f; }

/** Where a value sits, in the words a sighted pupil would use: on which mark, counted from a numbered one. */
function positionWords(v, s) {
  const x = fval(frac(v));
  const step = fval(frac(s.step));
  const mn = fval(frac(s.min));
  const minor = s.minorStep != null ? fval(frac(s.minorStep)) : step;
  const labelled = s.labels === 'ends' ? [mn, fval(frac(s.max))] : s.labels === 'none' ? [] : Array.isArray(s.labels) ? s.labels.map((t) => fval(frac(t))) : null;
  const fmt = (t) => tidy(formatValue(frac(round(t, 9)), typeof s.step === 'string' || typeof s.minorStep === 'string' ? 'fraction' : 'auto'));
  const k = (x - mn) / minor;
  if (Math.abs(k - Math.round(k)) > 1e-9) return 'between two marks';
  // nearest numbered mark at or below
  let base = mn;
  if (labelled) { const below = labelled.filter((t) => t <= x + 1e-9); base = below.length ? Math.max(...below) : mn; }
  else base = mn + Math.floor((x - mn) / step + 1e-9) * step;
  const steps = Math.round((x - base) / minor);
  if (labelled && labelled.length === 0) return `on the ${ordinal(Math.round(k))} mark after the left end`;
  if (steps === 0) return `at ${fmt(base)}`;
  return `on the ${ordinal(steps)} ${minor < step ? 'small ' : ''}mark after ${fmt(base)}`;
}
export function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}

// ---------------------------------------------------------------- fraction model

const fractionModel = {
  size: 'medium',
  schema: {
    shape: F.enum('bar', 'circle', 'rectangle', 'grid'), parts: F.int(2, 24), rows: F.int(1, 12), cols: F.int(1, 12),
    shaded: F.oneOf(F.int(0, 400), F.arr(F.int(0, 400), 0, 400)), wholes: F.int(1, 4), partLabels: F.bool,
  },
  required: ['shape'],
  check(s) {
    const e = [];
    if (['bar', 'circle'].includes(s.shape) && !s.parts) e.push(`a ${s.shape} needs parts`);
    if (['grid', 'rectangle'].includes(s.shape) && !(s.rows && s.cols) && !s.parts) e.push(`a ${s.shape} needs rows and cols`);
    const per = partsPer(s);
    const total = per * (s.wholes || 1);
    if (typeof s.shaded === 'number' && s.shaded > total) e.push(`shaded (${s.shaded}) is more than the ${total} parts`);
    if (Array.isArray(s.shaded) && s.shaded.some((i) => i >= total)) e.push('a shaded index is past the last part');
    return e;
  },
  render(s) {
    const wholes = s.wholes || 1;
    const per = partsPer(s);
    const shadedSet = new Set(Array.isArray(s.shaded) ? s.shaded : Array.from({ length: s.shaded || 0 }, (_, i) => i));
    const box = new Box();
    const body = [];
    const gap = 16;
    for (let w = 0; w < wholes; w++) {
      if (s.shape === 'bar') {
        const W = Math.min(340, (380 - gap * (wholes - 1)) / wholes); const H = 46;
        const x0 = w * (W + gap);
        for (let i = 0; i < per; i++) {
          const x = x0 + (W * i) / per;
          body.push(el('rect', { x, y: 0, width: W / per, height: H, class: shadedSet.has(w * per + i) ? 'dg-part' : 'dg-fill-surface' }));
          if (s.partLabels && W / per > 24) body.push(fracLabel(x + W / per / 2, H / 2, `1/${per}`, { size: 12 }));
        }
        let d = '';
        for (let i = 1; i < per; i++) d += `M${round(x0 + (W * i) / per, 2)},0V${H}`;
        body.push(el('path', { d, class: 'dg-ink', 'stroke-width': 1.5 }), el('rect', { x: x0, y: 0, width: W, height: H, class: 'dg-ink', 'stroke-width': 2.2 }));
        box.rect(x0, 0, W, H);
      } else if (s.shape === 'circle') {
        const R = wholes > 2 ? 58 : 80; const cx = w * (2 * R + gap) + R; const cy = R;
        for (let i = 0; i < per; i++) {
          const a1 = 90 - (360 * i) / per; const a2 = 90 - (360 * (i + 1)) / per;
          body.push(el('path', { d: per === 1 ? arcPath(cx, cy, R, 0, 360) : sectorPath(cx, cy, R, a2, a1), class: shadedSet.has(w * per + i) ? 'dg-part' : 'dg-fill-surface' }));
          if (s.partLabels && per <= 12) { const m = polar(cx, cy, R * 0.62, (a1 + a2) / 2); body.push(fracLabel(m[0], m[1], `1/${per}`, { size: 12 })); }
        }
        let d = '';
        for (let i = 0; i < per; i++) { const p = polar(cx, cy, R, 90 - (360 * i) / per); d += `M${cx},${cy}L${pt(p)}`; }
        body.push(el('path', { d, class: 'dg-ink', 'stroke-width': 1.5 }), el('circle', { cx, cy, r: R, class: 'dg-ink', 'stroke-width': 2.2 }));
        box.circle(cx, cy, R);
      } else {
        const rows = s.rows || 1; const cols = s.cols || per;
        const cell = Math.min(s.shape === 'grid' ? 26 : 56, (360 - gap * (wholes - 1)) / wholes / cols, 220 / rows);
        const x0 = w * (cols * cell + gap);
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const i = r * cols + c;
            body.push(el('rect', { x: x0 + c * cell, y: r * cell, width: cell, height: cell, class: shadedSet.has(w * per + i) ? 'dg-part' : 'dg-fill-surface' }));
          }
        }
        let d = '';
        for (let c = 1; c < cols; c++) d += `M${round(x0 + c * cell, 2)},0V${round(rows * cell, 2)}`;
        for (let r = 1; r < rows; r++) d += `M${round(x0, 2)},${round(r * cell, 2)}H${round(x0 + cols * cell, 2)}`;
        body.push(el('path', { d, class: 'dg-ink', 'stroke-width': s.shape === 'grid' ? 0.9 : 1.5 }), el('rect', { x: x0, y: 0, width: cols * cell, height: rows * cell, class: 'dg-ink', 'stroke-width': 2.2 }));
        box.rect(x0, 0, cols * cell, rows * cell);
      }
    }
    return { box, body };
  },
  describe(s) {
    const wholes = s.wholes || 1;
    const per = partsPer(s);
    const n = Array.isArray(s.shaded) ? s.shaded.length : s.shaded || 0;
    const what = s.shape === 'grid' || s.shape === 'rectangle' ? `${s.shape === 'grid' ? 'grid' : 'rectangle'} of ${s.rows || 1} rows and ${s.cols || per} columns (${per} equal squares)` : `${s.shape} split into ${per} equal parts`;
    return `${wholes > 1 ? `${wholes} identical wholes, each a ${what}` : `A ${what}`}. ${n} ${n === 1 ? 'part is' : 'parts are'} shaded${wholes > 1 ? ' altogether' : ''}.`;
  },
};
function partsPer(s) { return s.shape === 'grid' || s.shape === 'rectangle' ? (s.rows || 1) * (s.cols || s.parts || 1) : s.parts || 1; }

// ---------------------------------------------------------------- bar model

function braceH(x1, x2, y, up, depth = 9) {
  const m = (x1 + x2) / 2; const s = up ? -1 : 1;
  return `M${x1},${y}q0,${s * depth / 2} ${depth / 2},${s * depth / 2}H${m - depth / 2}q${depth / 2},0 ${depth / 2},${s * depth / 2}q0,${-s * depth / 2} ${depth / 2},${-s * depth / 2}H${x2 - depth / 2}q${depth / 2},0 ${depth / 2},${-s * depth / 2}`;
}
function braceV(x, y1, y2, depth = 9) {
  const m = (y1 + y2) / 2;
  return `M${x},${y1}q${depth / 2},0 ${depth / 2},${depth / 2}V${m - depth / 2}q0,${depth / 2} ${depth / 2},${depth / 2}q${-depth / 2},0 ${-depth / 2},${depth / 2}V${y2 - depth / 2}q0,${depth / 2} ${-depth / 2},${depth / 2}`;
}

const barSpec = F.obj({
  label: F.str, units: F.num(0.5, 20), parts: F.arr(F.obj({ size: F.num(0.1, 20), text: F.label }, ['size']), 1, 10),
  unitText: F.label, right: F.label, shadedUnits: F.int(0, 20),
});
const barModel = {
  size: 'medium',
  schema: {
    bars: F.arr(barSpec, 1, 5),
    braces: F.arr(F.obj({ bar: F.int(0, 4), from: F.num(0, 20), to: F.num(0, 20), label: F.label, side: F.enum('above', 'below') }, ['bar', 'from', 'to']), 0, 6),
    totalBrace: F.obj({ label: F.label }),
  },
  required: ['bars'],
  check(s) {
    const e = [];
    s.bars.forEach((b, i) => { if ((b.units == null) === (b.parts == null)) e.push(`bar ${i + 1} needs units or parts (not both)`); });
    for (const br of s.braces || []) if (br.bar >= s.bars.length) e.push('a brace points at a bar that does not exist');
    return e;
  },
  render(s) {
    const lens = s.bars.map((b) => (b.units != null ? b.units : b.parts.reduce((a, p) => a + p.size, 0)));
    const maxU = Math.max(...lens);
    const uw = Math.min(56, 300 / maxU);
    const lw = Math.max(0, ...s.bars.map((b) => (b.label ? textWidth(tidy(b.label), 15) : 0))) + (s.bars.some((b) => b.label) ? 14 : 0);
    const H = 36;
    const hasAbove = (i) => (s.braces || []).some((b) => b.bar === i && (b.side || 'above') === 'above');
    const hasBelow = (i) => (s.braces || []).some((b) => b.bar === i && b.side === 'below');
    const box = new Box();
    const body = [];
    let y = 0;
    let maxRight = 0;
    const ys = [];
    s.bars.forEach((b, i) => {
      if (hasAbove(i)) y += 34;
      ys.push(y);
      if (b.label) { body.push(label(lw - 12, y + H / 2, b.label, { size: 15, anchor: 'end', weight: 600 })); box.text(lw - 12, y + H / 2, b.label, 15, 'end'); }
      const cells = b.units != null ? [...Array(Math.ceil(b.units))].map((_, k) => ({ size: Math.min(1, b.units - k), text: b.unitText })) : b.parts;
      let x = lw;
      cells.forEach((c, k) => {
        const w = c.size * uw;
        body.push(el('rect', { x, y, width: w, height: H, class: k < (b.shadedUnits || 0) ? 'dg-part' : 'dg-shade2' }));
        body.push(el('rect', { x, y, width: w, height: H, class: 'dg-ink', 'stroke-width': 1.8 }));
        if (c.text != null && c.text !== '') body.push(label(x + w / 2, y + H / 2, String(c.text), { size: 14 }));
        x += w;
      });
      box.rect(lw, y, x - lw, H);
      if (b.right != null && b.right !== '') { body.push(label(x + 10, y + H / 2, String(b.right), { size: 15, anchor: 'start' })); box.text(x + 10, y + H / 2, String(b.right), 15, 'start'); }
      maxRight = Math.max(maxRight, x + (b.right ? textWidth(tidy(b.right), 15) + 14 : 0));
      y += H + (hasBelow(i) ? 34 : 0) + 18;
    });
    for (const br of s.braces || []) {
      const by = ys[br.bar];
      const x1 = lw + br.from * uw; const x2 = lw + br.to * uw;
      const up = (br.side || 'above') === 'above';
      const yy = up ? by - 4 : by + H + 4;
      body.push(el('path', { d: braceH(x1, x2, yy, up), class: 'dg-ink', 'stroke-width': 1.6 }));
      if (br.label != null && br.label !== '') { const ly = up ? yy - 20 : yy + 20; body.push(label((x1 + x2) / 2, ly, String(br.label), { size: 14 })); box.text((x1 + x2) / 2, ly, String(br.label), 14); }
    }
    if (s.totalBrace) {
      const x = maxRight + 6; const y1 = ys[0]; const y2 = ys[ys.length - 1] + H;
      body.push(el('path', { d: braceV(x, y1, y2), class: 'dg-ink', 'stroke-width': 1.6 }));
      if (s.totalBrace.label) { body.push(label(x + 16, (y1 + y2) / 2, String(s.totalBrace.label), { size: 15, anchor: 'start', weight: 600 })); box.text(x + 16, (y1 + y2) / 2, String(s.totalBrace.label), 15, 'start'); }
      box.add(x + 12, y1);
    }
    return { box, body };
  },
  describe(s) {
    const parts = ['A bar model.'];
    for (const b of s.bars) {
      const who = b.label ? `${tidy(b.label)}: ` : 'A bar: ';
      if (b.units != null) parts.push(`${who}${plural(b.units, 'equal unit')}${b.unitText != null && b.unitText !== '' ? `, each labelled ${say(b.unitText)}` : ''}${b.shadedUnits ? `, ${b.shadedUnits} shaded` : ''}${b.right ? `, with ${say(b.right)} written after it` : ''}.`);
      else parts.push(`${who}${b.parts.length} parts${b.parts.some((p) => p.text != null && p.text !== '') ? ` labelled ${listText(b.parts.map((p) => say(p.text ?? 'blank')))}` : ''}${b.right ? `, with ${say(b.right)} written after it` : ''}.`);
    }
    for (const br of s.braces || []) parts.push(`A brace over ${s.bars[br.bar].label ? `${tidy(s.bars[br.bar].label)}'s bar` : 'a bar'}${br.label ? ` is labelled ${say(br.label)}` : ''}.`);
    if (s.totalBrace) parts.push(`A brace across all the bars${s.totalBrace.label ? ` is labelled ${say(s.totalBrace.label)}` : ''}.`);
    return parts.join(' ');
  },
};

export const GEOMETRY = { polygon, circle, angle, coordinateGrid, numberLine, fractionModel, barModel };
