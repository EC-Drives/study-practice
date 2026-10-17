// Science diagrams: electric circuits, food chains and webs, light rays (mirror, shadow, seeing),
// the Sun, Earth and Moon, and Moon phases.

import { el, g, F, Box, label, labelAt, tidy, textWidth, wrap, polar, dirOf, pathOf, arcPath, arrowHead, arrowLine, listText, say, plural, round, pt, rad } from './core.js';

const cap = (t) => (t ? t[0].toUpperCase() + t.slice(1) : t);

// ---------------------------------------------------------------- circuits

const KIND_LEN = { cell: 56, battery: 0, bulb: 56, lamp: 56, switch: 64, buzzer: 60, motor: 56, gap: 44 };
const compLen = (c) => (c.kind === 'battery' ? 26 + 22 * (c.cells || 2) : KIND_LEN[c.kind]);

/** A component drawn horizontally, centred on (0, 0), joining wires at x = -len/2 and +len/2. */
function symbol(c) {
  const L = compLen(c) / 2;
  const w = (x1, x2) => el('line', { x1, y1: 0, x2, y2: 0, class: 'dg-ink', 'stroke-width': 2.2 });
  const out = [];
  switch (c.kind) {
    case 'cell':
      out.push(w(-L, -5), w(5, L), el('line', { x1: -5, y1: -18, x2: -5, y2: 18, class: 'dg-ink', 'stroke-width': 2.4 }), el('line', { x1: 5, y1: -9, x2: 5, y2: 9, class: 'dg-ink', 'stroke-width': 5 }));
      break;
    case 'battery': {
      const n = c.cells || 2;
      const span = 22 * (n - 1) + 10;
      let x = -span / 2;
      out.push(w(-L, x));
      for (let i = 0; i < n; i++) {
        out.push(el('line', { x1: x, y1: -18, x2: x, y2: 18, class: 'dg-ink', 'stroke-width': 2.4 }), el('line', { x1: x + 10, y1: -9, x2: x + 10, y2: 9, class: 'dg-ink', 'stroke-width': 5 }));
        if (i < n - 1) out.push(w(x + 10, x + 22));
        x += 22;
      }
      out.push(w(x - 12, L));
      break;
    }
    case 'bulb':
    case 'lamp': {
      const r = 14; const k = r * 0.707;
      out.push(w(-L, -r), w(r, L), el('circle', { cx: 0, cy: 0, r, class: 'dg-ink', 'stroke-width': 2.2 }), el('path', { d: `M${-k},${-k}L${k},${k}M${-k},${k}L${k},${-k}`, class: 'dg-ink', 'stroke-width': 2 }));
      break;
    }
    case 'switch': {
      const a = -18; const b = 18;
      out.push(w(-L, a), w(b, L), el('circle', { cx: a, cy: 0, r: 3.5, class: 'dg-fill-ink' }), el('circle', { cx: b, cy: 0, r: 3.5, class: 'dg-fill-ink' }));
      if (c.closed) out.push(w(a, b));
      else { const p = polar(a, 0, 38, 30); out.push(el('line', { x1: a, y1: 0, x2: p[0], y2: p[1], class: 'dg-ink', 'stroke-width': 2.2 })); }
      break;
    }
    case 'buzzer':
      out.push(w(-L, -8), w(8, L), el('path', { d: 'M-8,0V-6M8,0V-6M-16,-6H16A16,16 0 0 0 -16,-6Z', class: 'dg-ink', 'stroke-width': 2.2 }));
      break;
    case 'motor':
      out.push(w(-L, -14), w(14, L), el('circle', { cx: 0, cy: 0, r: 14, class: 'dg-ink', 'stroke-width': 2.2 }), el('text', { x: 0, y: 0.5, 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': 15, 'font-weight': 700, class: 'dg-t' }, 'M'));
      break;
    case 'gap':
      out.push(w(-L, -9), w(9, L), el('circle', { cx: -9, cy: 0, r: 2.5, class: 'dg-fill-ink' }), el('circle', { cx: 9, cy: 0, r: 2.5, class: 'dg-fill-ink' }));
      break;
    default:
      out.push(w(-L, L));
  }
  return out;
}

/** Place components along a horizontal wire from x0 to x1 at y; returns nodes. `flip` mirrors them. */
function wireRow(comps, x0, x1, y, box, labelSide = -1, flip = false) {
  const out = [];
  const n = comps.length;
  if (!n) { out.push(el('line', { x1: x0, y1: y, x2: x1, y2: y, class: 'dg-ink', 'stroke-width': 2.2 })); return out; }
  const total = comps.reduce((a, c) => a + compLen(c), 0);
  const gap = (x1 - x0 - total) / (n + 1);
  let x = x0;
  const order = flip ? [...comps].reverse() : comps;
  for (const c of order) {
    const L = compLen(c);
    out.push(el('line', { x1: x, y1: y, x2: x + gap, y2: y, class: 'dg-ink', 'stroke-width': 2.2 }));
    const cx = x + gap + L / 2;
    out.push(g({ transform: `translate(${round(cx, 2)} ${round(y, 2)})${flip ? ' scale(-1 1)' : ''}` }, symbol(c)));
    box.add(cx - L / 2, y - 22).add(cx + L / 2, y + 22);
    if (c.label) {
      const ly = y + labelSide * 32;
      out.push(label(cx, ly, c.label, { size: 15, weight: 700 }));
      box.text(cx, ly, c.label, 15);
    }
    x += gap + L;
  }
  out.push(el('line', { x1: x, y1: y, x2: x1, y2: y, class: 'dg-ink', 'stroke-width': 2.2 }));
  return out;
}

const compSpec = F.obj({ kind: F.enum('cell', 'battery', 'bulb', 'lamp', 'switch', 'buzzer', 'motor', 'gap'), label: F.str, closed: F.bool, cells: F.int(2, 4) }, ['kind']);
const circuit = {
  size: 'medium',
  schema: { layout: F.enum('series', 'parallel'), components: F.arr(compSpec, 1, 8), main: F.arr(compSpec, 0, 4), branches: F.arr(F.arr(compSpec, 0, 3), 2, 4) },
  required: ['layout'],
  check(s) {
    const e = [];
    if (s.layout === 'series' && !s.components) e.push('a series circuit needs components');
    if (s.layout === 'series' && (s.main || s.branches)) e.push('main and branches are for parallel circuits');
    if (s.layout === 'parallel' && !s.branches) e.push('a parallel circuit needs branches');
    if (s.layout === 'parallel' && s.components) e.push('use main and branches (not components) for a parallel circuit');
    return e;
  },
  render(s) {
    const box = new Box();
    const body = [];
    if (s.layout === 'series') {
      const comps = s.components;
      const k = Math.ceil(comps.length / 2);
      const top = comps.slice(0, k); const bottom = comps.slice(k);
      const need = (row) => row.reduce((a, c) => a + compLen(c), 0) + 34 * (row.length + 1);
      const W = Math.max(240, need(top), need(bottom)); const H = 150;
      body.push(...wireRow(top, 0, W, 0, box, -1));
      body.push(...wireRow(bottom, 0, W, H, box, 1, true));
      body.push(el('path', { d: `M0,0V${H}M${W},0V${H}`, class: 'dg-ink', 'stroke-width': 2.2 }));
      box.rect(0, 0, W, H);
    } else {
      const main = s.main || [];
      const need = (row) => row.reduce((a, c) => a + compLen(c), 0) + 34 * (row.length + 1);
      const W = Math.max(240, need(main), ...s.branches.map(need));
      const gapY = 82;
      body.push(...wireRow(main, 0, W, 0, box, -1));
      s.branches.forEach((b, i) => {
        const y = gapY * (i + 1);
        body.push(...wireRow(b, 0, W, y, box, 1));
        if (i < s.branches.length - 1) body.push(el('circle', { cx: 0, cy: y, r: 4.5, class: 'dg-fill-ink' }), el('circle', { cx: W, cy: y, r: 4.5, class: 'dg-fill-ink' }));
      });
      const yb = gapY * s.branches.length;
      body.push(el('path', { d: `M0,0V${yb}M${W},0V${yb}`, class: 'dg-ink', 'stroke-width': 2.2 }));
      box.rect(0, 0, W, yb);
    }
    return { box, body };
  },
  describe(s) {
    const name = (c) => {
      const base = { cell: 'a cell', battery: `a battery of ${c.cells || 2} cells`, bulb: 'a bulb', lamp: 'a bulb', switch: `${c.closed ? 'a closed' : 'an open'} switch`, buzzer: 'a buzzer', motor: 'a motor', gap: 'a gap in the wire' }[c.kind];
      return c.label ? `${base} labelled ${tidy(c.label)}` : base;
    };
    if (s.layout === 'series') return `A circuit diagram of a series circuit: ${listText(s.components.map(name))}, all in one loop of wire.`;
    const parts = [`A circuit diagram of a parallel circuit.`];
    if ((s.main || []).length) parts.push(`On the main wire: ${listText(s.main.map(name))}.`);
    s.branches.forEach((b, i) => parts.push(`Branch ${i + 1}: ${b.length ? listText(b.map(name)) : 'just a wire'}.`));
    return parts.join(' ');
  },
};

// ---------------------------------------------------------------- food chains and webs

const ROLE_NAMES = ['producer', 'primary consumer', 'secondary consumer', 'tertiary consumer', 'quaternary consumer', 'top consumer'];

function orgBox(x, y, name, o = {}) {
  const t = tidy(name);
  const w = Math.max(70, textWidth(t, 15) + 22);
  const h = 34;
  return {
    w, h,
    nodes: [
      el('rect', { x: x - w / 2, y: y - h / 2, width: w, height: h, rx: 9, class: o.producer ? 'dg-leaf' : 'dg-fill-surface' }),
      el('rect', { x: x - w / 2, y: y - h / 2, width: w, height: h, rx: 9, class: o.highlight ? 'dg-accent' : 'dg-ink', 'stroke-width': o.highlight ? 3.2 : 1.8 }),
      label(x, y, t, { size: 15, weight: o.highlight ? 700 : 500, halo: false }),
    ],
  };
}

const foodChain = {
  size: 'medium',
  schema: { organisms: F.arr(F.str, 2, 6), roles: F.oneOf(F.bool, F.arr(F.str, 2, 6)) },
  required: ['organisms'],
  check(s) { return Array.isArray(s.roles) && s.roles.length !== s.organisms.length ? ['roles needs one entry per organism'] : []; },
  render(s) {
    const box = new Box();
    const body = [];
    const roles = s.roles === true ? s.organisms.map((_, i) => (i === s.organisms.length - 1 && i > 0 ? (ROLE_NAMES[i] || 'top consumer') : ROLE_NAMES[i])) : Array.isArray(s.roles) ? s.roles : null;
    const n = s.organisms.length;
    if (n <= 3) {
      let x = 0;
      const xs = [];
      s.organisms.forEach((o) => { const w = Math.max(70, textWidth(tidy(o), 15) + 22); xs.push(x + w / 2); x += w + 56; });
      s.organisms.forEach((o, i) => {
        const b = orgBox(xs[i], 0, o, {});
        body.push(...b.nodes); box.rect(xs[i] - b.w / 2, -b.h / 2, b.w, b.h);
        if (i > 0) { const pw = Math.max(70, textWidth(tidy(s.organisms[i - 1]), 15) + 22); body.push(arrowLine([xs[i - 1] + pw / 2 + 6, 0], [xs[i] - b.w / 2 - 6, 0], { width: 2.4, size: 11 })); }
        if (roles && roles[i]) { body.push(label(xs[i], 36, roles[i], { size: 13, cls: 'dg-t2' })); box.text(xs[i], 36, roles[i], 13); }
      });
    } else {
      // upwards: producer at the bottom
      const gap = 70;
      s.organisms.forEach((o, i) => {
        const y = (n - 1 - i) * gap;
        const b = orgBox(0, y, o, {});
        body.push(...b.nodes); box.rect(-b.w / 2, y - b.h / 2, b.w, b.h);
        if (i > 0) body.push(arrowLine([0, y + gap - 19], [0, y + 19], { width: 2.4, size: 11 }));
        if (roles && roles[i]) { const lx = Math.max(70, textWidth(tidy(o), 15) + 22) / 2 + 14; body.push(label(lx, y, roles[i], { size: 13, cls: 'dg-t2', anchor: 'start' })); box.text(lx, y, roles[i], 13, 'start'); }
      });
    }
    return { box, body };
  },
  describe(s) {
    const roles = Array.isArray(s.roles) ? s.roles : null;
    return `A food chain. Arrows show which way the food (energy) goes: ${s.organisms.map(tidy).join(' to ')}.${roles ? ` Labels: ${listText(s.organisms.map((o, i) => `${tidy(o)} ${say(roles[i])}`))}.` : s.roles === true ? ` ${tidy(s.organisms[0])} is the producer.` : ''}`;
  },
};

/** Level of each organism: 0 for producers, otherwise one more than the highest food it eats. */
export function webLevels(s) {
  const food = new Map(s.organisms.map((o) => [o.id, []]));
  for (const [f, e] of s.links) food.get(e).push(f);
  const level = new Map();
  const visit = (id, stack = new Set()) => {
    if (level.has(id)) return level.get(id);
    if (stack.has(id)) return 0; // a loop: should not happen in a food web
    stack.add(id);
    const fs = food.get(id);
    const v = fs.length ? 1 + Math.max(...fs.map((f) => visit(f, stack))) : 0;
    level.set(id, v);
    return v;
  };
  for (const o of s.organisms) visit(o.id);
  return level;
}

const foodWeb = {
  size: 'large',
  schema: {
    organisms: F.arr(F.obj({ id: F.str, name: F.str }, ['id', 'name']), 3, 12), links: F.arr(F.arr(F.str, 2, 2), 1, 30),
    highlight: F.arr(F.str, 0, 12), positions: (v, p) => (v && typeof v === 'object' && !Array.isArray(v) && Object.values(v).every((x) => Array.isArray(x) && x.length === 2 && x.every(Number.isFinite)) ? null : `${p} should map ids to [column, row]`),
  },
  required: ['organisms', 'links'],
  check(s) {
    const ids = new Set(s.organisms.map((o) => o.id));
    const e = [];
    if (ids.size !== s.organisms.length) e.push('organism ids must be different');
    for (const [a, b] of s.links) { if (!ids.has(a) || !ids.has(b)) e.push(`link ${a} -> ${b} names an organism that is not listed`); else if (a === b) e.push('an organism cannot eat itself'); }
    for (const h of s.highlight || []) if (!ids.has(h)) e.push(`highlight ${h} is not an organism`);
    for (const k of Object.keys(s.positions || {})) if (!ids.has(k)) e.push(`position for unknown organism ${k}`);
    return e;
  },
  render(s) {
    const box = new Box();
    const body = [];
    const level = webLevels(s);
    const maxL = Math.max(...level.values());
    const rows = Array.from({ length: maxL + 1 }, () => []);
    for (const o of s.organisms) rows[level.get(o.id)].push(o.id);
    // order within rows by the average position of their food (two sweeps)
    const pos = new Map();
    rows.forEach((r) => r.forEach((id, i) => pos.set(id, (i + 0.5) / r.length)));
    const foodOf = (id) => s.links.filter((l) => l[1] === id).map((l) => l[0]);
    const eatersOf = (id) => s.links.filter((l) => l[0] === id).map((l) => l[1]);
    for (let sweep = 0; sweep < 4; sweep++) {
      rows.forEach((r, li) => {
        const key = (id) => { const ns = sweep % 2 === 0 && li > 0 ? foodOf(id) : eatersOf(id); return ns.length ? ns.reduce((a, n) => a + pos.get(n), 0) / ns.length : pos.get(id); };
        r.sort((a, b) => key(a) - key(b));
        r.forEach((id, i) => pos.set(id, (i + 0.5) / r.length));
      });
    }
    const W = 440; const gapY = 92;
    const xy = new Map();
    rows.forEach((r, li) => r.forEach((id, i) => xy.set(id, [((i + 0.5) / r.length) * W, (maxL - li) * gapY])));
    for (const [id, [c, rr]] of Object.entries(s.positions || {})) xy.set(id, [c * 110 + 55, (maxL - rr) * gapY]);
    const names = new Map(s.organisms.map((o) => [o.id, o.name]));
    const size = new Map(s.organisms.map((o) => [o.id, [Math.max(70, textWidth(tidy(o.name), 15) + 22), 34]]));
    const edgePoint = (id, toward) => {
      const [x, y] = xy.get(id); const [w, h] = size.get(id);
      const dx = toward[0] - x; const dy = toward[1] - y;
      const t = Math.min(Math.abs((w / 2 + 3) / (dx || 1e-9)), Math.abs((h / 2 + 3) / (dy || 1e-9)));
      return [x + dx * t, y + dy * t];
    };
    // a link that skips a row bends sideways, so it never hides behind a box in between
    const boxes = s.organisms.map((o) => ({ id: o.id, c: xy.get(o.id), sz: size.get(o.id) }));
    const blocked = (p, q, skip) => boxes.some((bx) => {
      if (skip.includes(bx.id)) return false;
      for (let t = 0.1; t < 0.9; t += 0.05) {
        const x = p[0] + (q[0] - p[0]) * t; const y = p[1] + (q[1] - p[1]) * t;
        if (Math.abs(x - bx.c[0]) < bx.sz[0] / 2 + 4 && Math.abs(y - bx.c[1]) < bx.sz[1] / 2 + 4) return true;
      }
      return false;
    });
    let bendSide = 1;
    for (const [f, e] of s.links) {
      const pf = xy.get(f); const pe = xy.get(e);
      if (!blocked(pf, pe, [f, e])) {
        const a = edgePoint(f, pe); const b = edgePoint(e, pf);
        body.push(arrowLine(a, b, { width: 1.9, size: 10, cls: 'dg-ink2', headCls: 'dg-fill-ink2' }));
        continue;
      }
      const m = [(pf[0] + pe[0]) / 2, (pf[1] + pe[1]) / 2];
      let ctrl = null;
      for (const k of [1, 1.6, 2.2]) {
        for (const side of [bendSide, -bendSide]) {
          const c = [m[0] + side * 90 * k, m[1]];
          const mid1 = [(pf[0] + 2 * c[0] + pe[0]) / 4, (pf[1] + 2 * c[1] + pe[1]) / 4];
          if (!blocked(pf, mid1, [f, e]) && !blocked(mid1, pe, [f, e])) { ctrl = c; break; }
        }
        if (ctrl) break;
      }
      if (!ctrl) ctrl = [m[0] + bendSide * 90, m[1]];
      bendSide = -bendSide;
      const a = edgePoint(f, ctrl); const b = edgePoint(e, ctrl);
      const back = polar(b[0], b[1], 7, dirOf(ctrl, b) + 180);
      body.push(el('path', { d: `M${pt(a)}Q${pt(ctrl)} ${pt(back)}`, class: 'dg-ink2', 'stroke-width': 1.9, fill: 'none' }));
      body.push(arrowHead(b[0], b[1], dirOf(ctrl, b), 10, 'dg-fill-ink2'));
      box.add((a[0] + 2 * ctrl[0] + b[0]) / 4, (a[1] + 2 * ctrl[1] + b[1]) / 4);
    }
    const hl = new Set(s.highlight || []);
    for (const o of s.organisms) {
      const [x, y] = xy.get(o.id);
      const b = orgBox(x, y, names.get(o.id), { producer: level.get(o.id) === 0, highlight: hl.has(o.id) });
      body.push(...b.nodes); box.rect(x - b.w / 2, y - b.h / 2, b.w, b.h);
    }
    return { box, body };
  },
  describe(s) {
    const names = new Map(s.organisms.map((o) => [o.id, tidy(o.name)]));
    const level = webLevels(s);
    const producers = s.organisms.filter((o) => level.get(o.id) === 0).map((o) => names.get(o.id));
    const parts = [`A food web of ${plural(s.organisms.length, 'living thing')}. Each arrow points from the food to the animal that eats it.`];
    parts.push(`At the bottom: ${listText(producers)}.`);
    for (const o of s.organisms) {
      const eats = s.links.filter((l) => l[1] === o.id).map((l) => names.get(l[0]));
      if (eats.length) parts.push(`${names.get(o.id)} eats ${listText(eats)}.`);
    }
    if ((s.highlight || []).length) parts.push(`${listText(s.highlight.map((h) => names.get(h)))} ${s.highlight.length > 1 ? 'are' : 'is'} drawn in bold.`);
    return parts.join(' ');
  },
};

// ---------------------------------------------------------------- light

function sunIcon(x, y, r = 26) {
  const out = [];
  let d = '';
  for (let a = 0; a < 360; a += 30) { const p = polar(x, y, r + 5, a); const q = polar(x, y, r + 14, a); d += `M${pt(p)}L${pt(q)}`; }
  out.push(el('path', { d, class: 'dg-sunray' }), el('circle', { cx: x, cy: y, r, class: 'dg-sun' }));
  return out;
}
function lampIcon(x, y) {
  return [
    el('circle', { cx: x, cy: y, r: 16, class: 'dg-glow' }), el('circle', { cx: x, cy: y, r: 16, class: 'dg-ink', 'stroke-width': 1.8 }),
    el('rect', { x: x - 7, y: y + 14, width: 14, height: 10, rx: 2, class: 'dg-fill-ink2' }),
  ];
}
function torchIcon(x, y) {
  return [
    el('rect', { x: x - 46, y: y - 9, width: 34, height: 18, rx: 4, class: 'dg-fill-ink2' }),
    el('path', { d: `M${x - 13},${y - 9}L${x},${y - 15}V${y + 15}L${x - 13},${y + 9}Z`, class: 'dg-fill-ink2' }),
    el('rect', { x: x - 2, y: y - 15, width: 4, height: 30, class: 'dg-glow' }),
  ];
}
function eyeIcon(x, y, facingLeft = true) {
  const s = facingLeft ? 1 : -1;
  return [
    el('path', { d: `M${x + 22 * s},${y}Q${x},${y - 18} ${x - 22 * s},${y}Q${x},${y + 18} ${x + 22 * s},${y}Z`, class: 'dg-fill-surface' }),
    el('path', { d: `M${x + 22 * s},${y}Q${x},${y - 18} ${x - 22 * s},${y}Q${x},${y + 18} ${x + 22 * s},${y}Z`, class: 'dg-ink', 'stroke-width': 2 }),
    el('circle', { cx: x - 6 * s, cy: y, r: 8, class: 'dg-blue' }), el('circle', { cx: x - 6 * s, cy: y, r: 3.5, class: 'dg-fill-ink' }),
  ];
}
/** An opaque object standing on the ground at x (bottom at y), height h px. Returns nodes and its top edge points. */
function objectIcon(kind, x, y, h) {
  const w = h * 0.6;
  switch (kind) {
    case 'ball': return { nodes: [el('circle', { cx: x, cy: y - h / 2, r: h / 2, class: 'dg-red' }), el('circle', { cx: x, cy: y - h / 2, r: h / 2, class: 'dg-ink', 'stroke-width': 1.6 })], r: h / 2 };
    case 'tree': return { nodes: [el('rect', { x: x - h * 0.06, y: y - h * 0.45, width: h * 0.12, height: h * 0.45, class: 'dg-brown' }), el('circle', { cx: x, cy: y - h * 0.68, r: h * 0.3, class: 'dg-green' })] };
    case 'person': return { nodes: [el('circle', { cx: x, cy: y - h * 0.88, r: h * 0.12, class: 'dg-fill-ink2' }), el('path', { d: `M${x},${y - h * 0.76}V${y - h * 0.35}M${x},${y - h * 0.35}L${x - h * 0.13},${y}M${x},${y - h * 0.35}L${x + h * 0.13},${y}M${x - h * 0.2},${y - h * 0.62}L${x + h * 0.2},${y - h * 0.62}`, class: 'dg-ink2', 'stroke-width': Math.max(3, h * 0.07) })] };
    case 'book': return { nodes: [el('rect', { x: x - w * 0.6, y: y - h * 0.35, width: w * 1.2, height: h * 0.35, rx: 2, class: 'dg-blue' }), el('rect', { x: x - w * 0.6, y: y - h * 0.35, width: w * 1.2, height: h * 0.35, rx: 2, class: 'dg-ink', 'stroke-width': 1.4 })] };
    case 'apple': return { nodes: [el('circle', { cx: x, cy: y - h * 0.3, r: h * 0.3, class: 'dg-red' }), el('path', { d: `M${x},${y - h * 0.6}l3,-10`, class: 'dg-ink', 'stroke-width': 2.5 })] };
    default: return { nodes: [el('rect', { x: x - w / 2, y: y - h, width: w, height: h, class: 'dg-brown' }), el('rect', { x: x - w / 2, y: y - h, width: w, height: h, class: 'dg-ink', 'stroke-width': 1.4 })] };
  }
}

/** Shadow geometry for a point source (torch or lamp) and a screen: the shadow's height on the screen. */
export function shadowOnScreen(s) {
  const d = s.sourceDistance; const D = s.screenDistance; const h = s.objectHeight;
  if ((s.object || 'box') === 'ball') {
    // tangent lines from the source to a sphere of radius h/2 centred on the axis
    const r = h / 2;
    return 2 * D * Math.tan(Math.asin(Math.min(1, r / d)));
  }
  return (h * D) / d;
}

const light = {
  size: 'medium',
  schema: {
    scene: F.enum('mirror', 'shadow', 'seeing', 'refraction'), angle: F.num(0, 89), showReflected: F.bool, medium: F.enum('water', 'glass'), showRefracted: F.bool,
    labels: F.obj({ incident: F.str, reflected: F.str, refracted: F.str, normal: F.str, mirror: F.str, i: F.str, r: F.str, source: F.str, object: F.str, shadow: F.str, screen: F.str, air: F.str, medium: F.str }),
    source: F.enum('torch', 'lamp', 'sun'), object: F.enum('box', 'ball', 'tree', 'person', 'book', 'apple'),
    sourceDistance: F.num(0.01), screenDistance: F.num(0.01), objectHeight: F.num(0.01), arrows: F.enum('correct', 'fromEye', 'none'),
  },
  required: ['scene'],
  check(s) {
    const e = [];
    if (s.scene === 'mirror' && s.angle != null && s.angle > 80) e.push('mirror angle should be 0 to 80');
    if (s.scene === 'shadow' && s.source === 'sun' && s.angle != null && (s.angle < 10 || s.angle > 85)) e.push('the Sun angle should be 10 to 85');
    if (s.scene === 'shadow' && s.screenDistance != null && s.sourceDistance != null && s.screenDistance <= s.sourceDistance) e.push('the screen must be further than the object');
    if (s.scene === 'shadow' && s.object === 'ball' && s.objectHeight != null && s.sourceDistance != null && s.objectHeight / 2 >= s.sourceDistance) e.push('the ball is too close to the source');
    return e;
  },
  render(s) {
    const box = new Box();
    const body = [];
    const L = s.labels || {};
    if (s.scene === 'mirror') {
      const i = s.angle != null ? s.angle : 40;
      const R = 150;
      body.push(el('rect', { x: -180, y: 0, width: 360, height: 8, class: 'dg-glass' }), el('line', { x1: -180, y1: 0, x2: 180, y2: 0, class: 'dg-ink', 'stroke-width': 3 }));
      let d = '';
      for (let x = -176; x < 180; x += 12) d += `M${x},8L${x + 9},18`;
      body.push(el('path', { d, class: 'dg-ink2', 'stroke-width': 1.2 }));
      body.push(el('line', { x1: 0, y1: 0, x2: 0, y2: -R - 10, class: 'dg-ink2', 'stroke-width': 1.6, 'stroke-dasharray': '6 5' }));
      const a = polar(0, 0, R, 90 + i);
      body.push(arrowLine(a, [0, 0], { cls: 'dg-ray', headCls: 'dg-fill-ray', width: 3, mid: true, size: 12 }));
      if (s.showReflected !== false) body.push(arrowLine([0, 0], polar(0, 0, R, 90 - i), { cls: 'dg-ray', headCls: 'dg-fill-ray', width: 3, mid: true, size: 12 }));
      if (i > 0) {
        body.push(el('path', { d: arcPath(0, 0, 44, 90, 90 + i), class: 'dg-ink', 'stroke-width': 1.5 }));
        if (s.showReflected !== false) body.push(el('path', { d: arcPath(0, 0, 50, 90 - i, 90), class: 'dg-ink', 'stroke-width': 1.5 }));
        if (L.i) body.push(labelAt(box, 0, 0, 90 + i / 2, L.i, { gap: 50, size: 15 }).node);
        if (L.r && s.showReflected !== false) body.push(labelAt(box, 0, 0, 90 - i / 2, L.r, { gap: 56, size: 15 }).node);
      }
      if (L.incident) body.push(labelAt(box, a[0], a[1], 90 + i, L.incident, { size: 14 }).node);
      if (L.reflected && s.showReflected !== false) { const b = polar(0, 0, R, 90 - i); body.push(labelAt(box, b[0], b[1], 90 - i, L.reflected, { size: 14 }).node); }
      if (L.normal) body.push(labelAt(box, 0, -R - 10, 90, L.normal, { size: 14 }).node);
      if (L.mirror) { body.push(label(176, 30, L.mirror, { size: 14, anchor: 'end' })); box.text(176, 30, L.mirror, 14, 'end'); }
      box.rect(-180, -R - 12, 360, 32).addPts([a]);
      return { box, body };
    }
    if (s.scene === 'refraction') {
      // a ray from air into water or glass bends towards the normal (Snell's law, n = 1.33 or 1.5)
      const i = s.angle != null ? s.angle : 40;
      const n = s.medium === 'glass' ? 1.5 : 1.33;
      const r = (Math.asin(Math.sin(rad(i)) / n) * 180) / Math.PI;
      const R = 140;
      body.push(el('rect', { x: -180, y: 0, width: 360, height: 150, class: s.medium === 'glass' ? 'dg-glass' : 'dg-liquid' }));
      body.push(el('line', { x1: -180, y1: 0, x2: 180, y2: 0, class: 'dg-ink', 'stroke-width': 2 }));
      body.push(el('line', { x1: 0, y1: -R - 10, x2: 0, y2: 150, class: 'dg-ink2', 'stroke-width': 1.6, 'stroke-dasharray': '6 5' }));
      const a = polar(0, 0, R, 90 + i);
      body.push(arrowLine(a, [0, 0], { cls: 'dg-ray', headCls: 'dg-fill-ray', width: 3, mid: true, size: 12 }));
      const b = polar(0, 0, R, 270 + r);
      if (s.showRefracted !== false) body.push(arrowLine([0, 0], b, { cls: 'dg-ray', headCls: 'dg-fill-ray', width: 3, mid: true, size: 12 }));
      if (i > 0) {
        body.push(el('path', { d: arcPath(0, 0, 44, 90, 90 + i), class: 'dg-ink', 'stroke-width': 1.5 }));
        if (L.i) body.push(labelAt(box, 0, 0, 90 + i / 2, L.i, { gap: 50, size: 15 }).node);
        if (s.showRefracted !== false && r > 0.5) {
          body.push(el('path', { d: arcPath(0, 0, 50, 270, 270 + r), class: 'dg-ink', 'stroke-width': 1.5 }));
          if (L.r) body.push(labelAt(box, 0, 0, 270 + r / 2, L.r, { gap: 56, size: 15 }).node);
        }
      }
      body.push(label(-170, -16, L.air || 'air', { size: 14, anchor: 'start', cls: 'dg-t2' }), label(-170, 20, L.medium || s.medium || 'water', { size: 14, anchor: 'start', cls: 'dg-t2' }));
      if (L.normal) body.push(labelAt(box, 0, -R - 10, 90, L.normal, { size: 14 }).node);
      if (L.incident) body.push(labelAt(box, a[0], a[1], 90 + i, L.incident, { size: 14 }).node);
      if (L.refracted && s.showRefracted !== false) body.push(labelAt(box, b[0], b[1], 270 + r, L.refracted, { size: 14 }).node);
      box.rect(-180, -R - 12, 360, R + 162).addPts([a, b]);
      return { box, body };
    }
    if (s.scene === 'shadow') {
      const obj = s.object || 'box';
      if (s.source === 'sun') {
        const ang = s.angle != null ? s.angle : 35;
        const h = 110;
        const len = h / Math.tan(rad(ang));
        const scaleK = Math.min(1, 330 / (len + 80));
        const H = h * scaleK; const Ls = len * scaleK;
        body.push(el('line', { x1: -60, y1: 0, x2: Ls + 60, y2: 0, class: 'dg-ink', 'stroke-width': 2 }));
        body.push(el('path', { d: `M0,-3H${Ls}V3H0Z`, class: 'dg-shadow' }));
        const o = objectIcon(obj, 0, 0, H);
        body.push(...o.nodes);
        // parallel rays at the Sun's angle; the one past the top of the object makes the tip of the shadow
        const dir = 180 + 90 - (90 - ang); // pointing down-right
        void dir;
        const start = polar(Ls, 0, Ls + 40, 180 - ang);
        body.push(arrowLine(start, [Ls, 0], { cls: 'dg-ray', headCls: 'dg-fill-ray', width: 2.4, mid: true }));
        const s2 = polar(start[0], start[1], 46, 270);
        const p2 = [s2[0] + 46 / Math.tan(rad(ang)) * 0 + 40, s2[1]];
        void p2;
        const sunAt = polar(start[0], start[1], 40, 180 - ang);
        body.push(...sunIcon(sunAt[0], sunAt[1], 22));
        box.add(-60, 10).add(Ls + 60, 0).add(sunAt[0] - 40, sunAt[1] - 40).add(sunAt[0] + 40, sunAt[1] + 40).add(0, -H);
        if (L.shadow) { body.push(label(Ls / 2, 20, L.shadow, { size: 14 })); box.text(Ls / 2, 20, L.shadow, 14); }
        if (L.object) body.push(labelAt(box, -H * 0.3, -H / 2, 180, L.object, { size: 14 }).node);
        if (L.source) body.push(labelAt(box, sunAt[0], sunAt[1], 90, L.source, { size: 14, gap: 40 }).node);
        return { box, body };
      }
      const d = s.sourceDistance || 2; const D = s.screenDistance; const h = s.objectHeight || 1;
      if (D) {
        const u = Math.min(340 / D, 120 / h);
        const ox = d * u; const sx = D * u; const oh = h * u;
        const shadowH = shadowOnScreen({ ...s, sourceDistance: d, screenDistance: D, objectHeight: h, object: obj }) * u;
        // axis y = 0 through the source and the object's centre
        body.push(el('line', { x1: sx, y1: -Math.max(shadowH / 2 + 30, 90), x2: sx, y2: Math.max(shadowH / 2 + 30, 90), class: 'dg-ink', 'stroke-width': 4 }));
        body.push(el('rect', { x: sx - 2, y: -shadowH / 2, width: 8, height: shadowH, class: 'dg-shadow' }));
        const tTop = [sx, -shadowH / 2]; const tBot = [sx, shadowH / 2];
        // the dark region behind the object, where its light is blocked
        const k0 = ox / sx;
        body.push(el('path', { d: `M${pt([ox, tTop[1] * k0])}L${pt(tTop)}L${pt(tBot)}L${pt([ox, tBot[1] * k0])}Z`, class: 'dg-shadow', opacity: 0.16 }));
        if (obj === 'ball') {
          body.push(el('circle', { cx: ox, cy: 0, r: oh / 2, class: 'dg-red' }), el('circle', { cx: ox, cy: 0, r: oh / 2, class: 'dg-ink', 'stroke-width': 1.6 }));
        } else {
          body.push(el('rect', { x: ox - 6, y: -oh / 2, width: 12, height: oh, class: 'dg-brown' }), el('rect', { x: ox - 6, y: -oh / 2, width: 12, height: oh, class: 'dg-ink', 'stroke-width': 1.4 }));
        }
        body.push(el('path', { d: `M0,0L${pt(tTop)}M0,0L${pt(tBot)}`, class: 'dg-ray', 'stroke-width': 1.6, 'stroke-dasharray': '6 4' }));
        body.push(...(s.source === 'lamp' ? lampIcon(-4, 0) : torchIcon(0, 0)));
        box.add(-50, -20).add(sx + 8, -Math.max(shadowH / 2 + 30, 90)).add(sx + 8, Math.max(shadowH / 2 + 30, 90));
        if (L.screen) body.push(labelAt(box, sx, -Math.max(shadowH / 2 + 30, 90), 90, L.screen, { size: 14 }).node);
        if (L.shadow) body.push(labelAt(box, sx + 6, 0, 0, L.shadow, { size: 14 }).node);
        if (L.object) body.push(labelAt(box, ox, -oh / 2, 90, L.object, { size: 14 }).node);
        if (L.source) body.push(labelAt(box, -20, 0, 270, L.source, { size: 14, gap: 22 }).node);
        return { box, body };
      }
      // torch or lamp above the ground, shadow on the ground
      const u = 60; const oh = h * u; const sh = oh * 1.8; const sxp = -d * u;
      const tip = (0 - sxp) * (sh / (sh - oh)) + sxp;
      body.push(el('line', { x1: sxp - 30, y1: 0, x2: tip + 40, y2: 0, class: 'dg-ink', 'stroke-width': 2 }));
      body.push(el('path', { d: `M0,-3H${tip}V3H0Z`, class: 'dg-shadow' }));
      const o = objectIcon(obj, 0, 0, oh);
      body.push(...o.nodes);
      body.push(el('line', { x1: sxp, y1: -sh, x2: tip, y2: 0, class: 'dg-ray', 'stroke-width': 1.6, 'stroke-dasharray': '6 4' }));
      body.push(...(s.source === 'torch' ? torchIcon(sxp, -sh) : lampIcon(sxp, -sh)));
      box.add(sxp - 50, -sh - 20).add(tip + 40, 10);
      if (L.shadow) { body.push(label(tip / 2, 20, L.shadow, { size: 14 })); box.text(tip / 2, 20, L.shadow, 14); }
      return { box, body };
    }
    // seeing: source -> object -> eye
    const src = [-150, -110]; const obj = [0, 40]; const eye = [160, -40];
    body.push(el('line', { x1: -200, y1: 60, x2: 80, y2: 60, class: 'dg-ink2', 'stroke-width': 2 }));
    body.push(...(s.source === 'sun' ? sunIcon(src[0], src[1], 24) : lampIcon(src[0], src[1])));
    const o = objectIcon(s.object || 'book', obj[0], 60, 70);
    body.push(...o.nodes);
    body.push(...eyeIcon(eye[0], eye[1], true));
    const A = polar(src[0], src[1], 34, dirOf(src, [obj[0], 30]));
    const objTop = [obj[0] - 8, 34];
    const objOut = [obj[0] + 14, 34];
    const eyeIn = [eye[0] - 26, eye[1] + 6];
    const arrowsKind = s.arrows || 'correct';
    if (arrowsKind === 'none') {
      body.push(el('path', { d: `M${pt(A)}L${pt(objTop)}M${pt(objOut)}L${pt(eyeIn)}`, class: 'dg-ray', 'stroke-width': 2.4 }));
    } else {
      body.push(arrowLine(A, objTop, { cls: 'dg-ray', headCls: 'dg-fill-ray', width: 2.6, mid: true, size: 12 }));
      if (arrowsKind === 'fromEye') body.push(arrowLine(eyeIn, objOut, { cls: 'dg-ray', headCls: 'dg-fill-ray', width: 2.6, mid: true, size: 12 }));
      else body.push(arrowLine(objOut, eyeIn, { cls: 'dg-ray', headCls: 'dg-fill-ray', width: 2.6, mid: true, size: 12 }));
    }
    box.add(-200, -150).add(195, 70);
    if (L.source) body.push(labelAt(box, src[0], src[1], 90, L.source, { size: 14, gap: 36 }).node);
    if (L.object) body.push(labelAt(box, obj[0], 60, 270, L.object, { size: 14 }).node);
    return { box, body };
  },
  describe(s) {
    const L = s.labels || {};
    if (s.scene === 'mirror') {
      const i = s.angle != null ? s.angle : 40;
      const parts = ['A ray of light hits a flat mirror. A dashed line (the normal) stands at right angles to the mirror where the ray hits it.'];
      parts.push(`The incoming ray comes down from the upper left${i === 0 ? ' straight along the normal' : ''}.`);
      if (s.showReflected !== false) parts.push(`The reflected ray goes up to the upper right${i === 0 ? ' straight back along the normal' : ', at the same slope on the other side of the normal'}.`);
      else parts.push('The reflected ray is not drawn.');
      if (L.i) parts.push(`The angle between the incoming ray and the normal is labelled ${say(L.i)}.`);
      if (L.r && s.showReflected !== false) parts.push(`The angle between the reflected ray and the normal is labelled ${say(L.r)}.`);
      return parts.join(' ');
    }
    if (s.scene === 'refraction') {
      const i = s.angle != null ? s.angle : 40;
      const med = s.medium || 'water';
      const parts = [`A ray of light travels through air and enters ${med === 'glass' ? 'a glass block' : 'water'}. A dashed line (the normal) is drawn at right angles to the surface where the ray enters.`];
      parts.push(i === 0 ? 'The ray goes straight down along the normal.' : `The incoming ray comes down from the upper left.${s.showRefracted !== false ? ` Inside the ${med} the ray bends towards the normal, so it is steeper than before.` : ` The ray inside the ${med} is not drawn.`}`);
      if (L.i) parts.push(`The angle between the incoming ray and the normal is labelled ${say(L.i)}.`);
      if (L.r && s.showRefracted !== false) parts.push(`The angle between the ray in the ${med} and the normal is labelled ${say(L.r)}.`);
      return parts.join(' ');
    }
    if (s.scene === 'shadow') {
      const obj = s.object || 'box';
      if (s.source === 'sun') return `Sunlight shines down at an angle onto a ${obj} standing on the ground, and the ${obj} casts a shadow on the ground on the side away from the Sun.${L.shadow ? ` The shadow is labelled ${say(L.shadow)}.` : ''}`;
      if (s.screenDistance) return `A ${s.source || 'torch'} shines on a ${obj}. Behind the ${obj} is a screen. Light rays from the ${s.source || 'torch'} pass the edges of the ${obj}, and the ${obj} blocks the light between them, making a shadow on the screen that is bigger than the ${obj}. The ${obj} is ${round(s.sourceDistance, 3)} units from the ${s.source || 'torch'} and the screen is ${round(s.screenDistance, 3)} units away.`;
      return `A ${s.source || 'torch'} above the ground shines on a ${obj}, which casts a shadow on the ground on the side away from the light.`;
    }
    const k = s.arrows || 'correct';
    return `A ${s.source === 'sun' ? 'Sun' : 'lamp'}, a ${s.object || 'book'} and an eye. ${k === 'correct' ? `Arrows show light going from the ${s.source === 'sun' ? 'Sun' : 'lamp'} to the ${s.object || 'book'}, then from the ${s.object || 'book'} into the eye.` : k === 'fromEye' ? `Arrows show light going from the ${s.source === 'sun' ? 'Sun' : 'lamp'} to the ${s.object || 'book'}, and another arrow going from the eye to the ${s.object || 'book'}.` : 'Lines join the light, the object and the eye, with no arrows.'}`;
  },
};

// ---------------------------------------------------------------- Moon phases

const PHASES = { new: 0, waxingCrescent: 45, firstQuarter: 90, waxingGibbous: 135, full: 180, waningGibbous: 225, lastQuarter: 270, waningCrescent: 315 };
const PHASE_NAMES = { new: 'new moon', waxingCrescent: 'waxing crescent', firstQuarter: 'first quarter', waxingGibbous: 'waxing gibbous', full: 'full moon', waningGibbous: 'waning gibbous', lastQuarter: 'last quarter', waningCrescent: 'waning crescent' };

/** How the Moon looks from Earth at elongation e (0 new, 90 first quarter, 180 full), northern view. */
export function moonFace(cx, cy, R, e, hemisphere = 'north') {
  const out = [el('circle', { cx, cy, r: R, class: 'dg-moon-dark' })];
  const E = ((e % 360) + 360) % 360;
  if (E > 1 && E < 359) {
    const waxing = E < 180;
    const rx = Math.abs(R * Math.cos(rad(E)));
    const crescent = E < 90 || E > 270;
    // lit limb on the right when waxing (north); mirror for the south or waning
    let right = waxing;
    if (hemisphere === 'south') right = !right;
    const limb = `M${cx},${cy - R}A${R},${R} 0 0 ${right ? 1 : 0} ${cx},${cy + R}`;
    const term = `A${round(rx, 2)},${R} 0 0 ${right === crescent ? 0 : 1} ${cx},${cy - R}Z`;
    out.push(el('path', { d: limb + term, class: 'dg-moon' }));
  }
  out.push(el('circle', { cx, cy, r: R, class: 'dg-ink2', 'stroke-width': 1.4 }));
  return out;
}

const moonPhases = {
  size: 'medium',
  schema: { phases: F.arr(F.enum(...Object.keys(PHASES)), 1, 8), labels: F.oneOf(F.bool, F.arr(F.str, 1, 8)), hemisphere: F.enum('north', 'south') },
  required: ['phases'],
  check(s) { return Array.isArray(s.labels) && s.labels.length !== s.phases.length ? ['labels needs one entry per phase'] : []; },
  render(s) {
    const box = new Box();
    const body = [];
    const R = 30; const step = 86;
    const perRow = s.phases.length > 4 ? 4 : s.phases.length;
    s.phases.forEach((p, i) => {
      const cx = (i % perRow) * step; const cy = Math.floor(i / perRow) * 120;
      body.push(el('rect', { x: cx - 40, y: cy - 40, width: 80, height: 80, rx: 10, class: 'dg-night' }));
      body.push(...moonFace(cx, cy, R, PHASES[p], s.hemisphere));
      box.rect(cx - 40, cy - 40, 80, 80);
      const t = s.labels === true ? PHASE_NAMES[p] : Array.isArray(s.labels) ? s.labels[i] : '';
      if (t) { body.push(label(cx, cy + 56, t, { size: 13, maxWidth: 84 })); box.text(cx, cy + 56, t, 13, 'middle', 84); }
    });
    return { box, body };
  },
  describe(s) {
    const lit = (p) => {
      const e = PHASES[p];
      if (p === 'new') return 'dark (none of it lit)';
      if (p === 'full') return 'fully lit';
      const side = (e < 180) === (s.hemisphere !== 'south') ? 'right' : 'left';
      const amount = e === 90 || e === 270 ? 'the right half'.replace('right', side) : (e < 90 || e > 270) ? `a thin crescent on the ${side}` : `most of it, all but a crescent on the ${side === 'right' ? 'left' : 'right'}`;
      return `lit: ${amount}`;
    };
    const names = Array.isArray(s.labels) ? s.labels : null;
    return `${plural(s.phases.length, 'picture')} of the Moon as seen from Earth: ${listText(s.phases.map((p, i) => `${names ? `${say(names[i])}: ` : s.labels === true ? `${PHASE_NAMES[p]}, ` : ''}${lit(p)}`))}.`;
  },
};

// ---------------------------------------------------------------- Sun, Earth and Moon

const DEFAULT_MOONS = [180, 225, 270, 315, 0, 45, 90, 135];
const sunEarthMoon = {
  size: 'medium',
  schema: { view: F.enum('dayNight', 'earthOrbit', 'moonOrbit'), place: F.num(-360, 720), moons: F.arr(F.num(-360, 720), 1, 8), moonLabels: F.arr(F.str, 1, 8), showPhases: F.bool, labels: F.bool },
  required: ['view'],
  check(s) {
    const e = [];
    if (s.moonLabels && s.moonLabels.length !== (s.moons || DEFAULT_MOONS).length) e.push('moonLabels needs one label per moon');
    if ((s.moons || s.moonLabels || s.showPhases) && s.view !== 'moonOrbit') e.push('moons, moonLabels and showPhases are for the moonOrbit view');
    if (s.place != null && s.view !== 'dayNight') e.push('place is for the dayNight view');
    return e;
  },
  render(s) {
    const box = new Box();
    const body = [];
    const showL = s.labels !== false;
    if (s.view === 'dayNight') {
      const R = 80;
      body.push(el('path', { d: `M-250,-120A140,140 0 0 1 -250,120Z`, class: 'dg-sun' }));
      for (const y of [-60, 0, 60]) body.push(arrowLine([-170, y], [-110, y], { cls: 'dg-ray', headCls: 'dg-fill-ray', width: 2.6, size: 11 }));
      body.push(el('circle', { cx: 0, cy: 0, r: R, class: 'dg-earth' }));
      body.push(el('path', { d: 'M-30,-40c18,-14 34,-6 30,10c-3,14 10,22 2,34c-10,10 -30,4 -36,-10c-6,-14 -10,-24 4,-34ZM24,30c10,-6 26,2 22,14c-4,10 -18,12 -24,4c-4,-6 -4,-14 2,-18Z', class: 'dg-land' }));
      body.push(el('path', { d: `M0,${-R}A${R},${R} 0 0 1 0,${R}Z`, class: 'dg-night', opacity: 0.82 }));
      body.push(el('circle', { cx: 0, cy: 0, r: R, class: 'dg-ink', 'stroke-width': 2 }));
      body.push(el('path', { d: arcPath(0, 0, R + 18, 200, 330), class: 'dg-ink', 'stroke-width': 2 }));
      const tip = polar(0, 0, R + 18, 330);
      body.push(arrowHead(tip[0], tip[1], 330 + 90, 10));
      body.push(el('circle', { cx: 0, cy: 0, r: 4, class: 'dg-fill-ink' }));
      if (s.place != null) { const p = polar(0, 0, R, s.place); body.push(el('circle', { cx: p[0], cy: p[1], r: 7, class: 'dg-red', stroke: 'var(--dg-surface)', 'stroke-width': 2 })); }
      box.add(-250, -120).add(R + 30, R + 30).add(-250, 120);
      if (showL) {
        body.push(label(-215, 0, 'Sun', { size: 15, weight: 700, halo: false }));
        body.push(label(-R / 2, R + 22, 'day', { size: 14 }), label(R / 2 + 6, R + 22, 'night', { size: 14 }));
        body.push(label(0, -R - 38, 'Earth (seen from above the North Pole)', { size: 13, cls: 'dg-t2' })); box.text(0, -R - 38, 'Earth (seen from above the North Pole)', 13);
        box.add(0, R + 32);
      }
      return { box, body };
    }
    if (s.view === 'earthOrbit') {
      const rx = 180; const ry = 80;
      body.push(el('ellipse', { cx: 0, cy: 0, rx, ry, class: 'dg-ink2', 'stroke-width': 1.6, 'stroke-dasharray': '6 5' }));
      body.push(...sunIcon(0, 0, 34));
      const ea = 300; const ep = [rx * Math.cos(rad(ea)), -ry * Math.sin(rad(ea))];
      body.push(el('circle', { cx: ep[0], cy: ep[1], r: 16, class: 'dg-earth' }), el('path', { d: `M${ep[0]},${ep[1] - 16}A16,16 0 0 1 ${ep[0]},${ep[1] + 16}`, class: 'dg-night', opacity: 0 }));
      // half lit facing the Sun
      const away = Math.atan2(ep[1], ep[0]);
      const p1 = [ep[0] + 16 * Math.cos(away + Math.PI / 2), ep[1] + 16 * Math.sin(away + Math.PI / 2)];
      const p2 = [ep[0] + 16 * Math.cos(away - Math.PI / 2), ep[1] + 16 * Math.sin(away - Math.PI / 2)];
      body.push(el('path', { d: `M${pt(p1)}A16,16 0 0 0 ${pt(p2)}Z`, class: 'dg-night', opacity: 0.82 }));
      body.push(el('circle', { cx: ep[0], cy: ep[1], r: 16, class: 'dg-ink', 'stroke-width': 1.6 }));
      // direction arrow: anticlockwise seen from above the North Pole
      const a1 = 30; const a2 = 70;
      const pa = (a) => [rx * Math.cos(rad(a)), -ry * Math.sin(rad(a))];
      body.push(el('path', { d: `M${pt(pa(a1))}A${rx},${ry} 0 0 0 ${pt(pa(a2))}`, class: 'dg-ink', 'stroke-width': 2.6 }));
      const t = pa(a2); const before = pa(a2 - 3);
      body.push(arrowHead(t[0], t[1], dirOf(before, t), 11));
      box.rect(-rx - 4, -ry - 4, 2 * rx + 8, 2 * ry + 8);
      if (showL) {
        body.push(label(0, 52, 'Sun', { size: 15, weight: 700 }));
        body.push(labelAt(box, ep[0], ep[1], 300, 'Earth', { size: 15, weight: 700, gap: 20 }).node);
        body.push(label(0, -ry - 18, 'One orbit takes about 365 days (a year)', { size: 13, cls: 'dg-t2' })); box.text(0, -ry - 18, 'One orbit takes about 365 days (a year)', 13);
      }
      return { box, body };
    }
    // moonOrbit
    const R = 120; const r = 15;
    const moons = s.moons || DEFAULT_MOONS;
    body.push(el('rect', { x: -330, y: -175, width: 34, height: 350, rx: 8, class: 'dg-sun' }));
    for (const y of [-120, -40, 40, 120]) body.push(arrowLine([-286, y], [-226, y], { cls: 'dg-ray', headCls: 'dg-fill-ray', width: 2.6, size: 11 }));
    body.push(el('circle', { cx: 0, cy: 0, r: R, class: 'dg-ink2', 'stroke-width': 1.4, 'stroke-dasharray': '6 5' }));
    body.push(el('circle', { cx: 0, cy: 0, r: 28, class: 'dg-earth' }), el('path', { d: 'M0,-28A28,28 0 0 1 0,28Z', class: 'dg-night', opacity: 0.82 }), el('circle', { cx: 0, cy: 0, r: 28, class: 'dg-ink', 'stroke-width': 1.6 }));
    const ah = polar(0, 0, R, 252);
    body.push(el('path', { d: arcPath(0, 0, R, 238, 252), class: 'dg-ink', 'stroke-width': 2.4 }), arrowHead(ah[0], ah[1], 252 + 90, 11));
    box.add(-330, -175).add(-296, 175).circle(0, 0, R + r);
    moons.forEach((a, i) => {
      const c = polar(0, 0, R, a);
      body.push(el('circle', { cx: c[0], cy: c[1], r, class: 'dg-moon-dark' }), el('path', { d: `M${c[0]},${c[1] - r}A${r},${r} 0 0 0 ${c[0]},${c[1] + r}Z`, class: 'dg-moon' }), el('circle', { cx: c[0], cy: c[1], r, class: 'dg-ink2', 'stroke-width': 1.4 }));
      const lab = s.moonLabels && s.moonLabels[i];
      if (s.showPhases) {
        const fc = polar(0, 0, R + 58, a);
        body.push(el('circle', { cx: fc[0], cy: fc[1], r: 21, class: 'dg-night' }));
        body.push(...moonFace(fc[0], fc[1], 16, ((a - 180) % 360 + 360) % 360));
        box.circle(fc[0], fc[1], 22);
        if (lab) body.push(labelAt(box, c[0], c[1], a + 90, lab, { size: 15, weight: 700, gap: r + 2 }).node);
      } else if (lab) body.push(labelAt(box, c[0], c[1], a, lab, { size: 15, weight: 700, gap: r + 2 }).node);
    });
    if (showL) {
      body.push(label(-313, 196, 'Sunlight', { size: 13, cls: 'dg-t2' })); box.text(-313, 196, 'Sunlight', 13);
      body.push(label(0, 46, 'Earth', { size: 13, weight: 700 }));
    }
    return { box, body };
  },
  describe(s) {
    if (s.view === 'dayNight') {
      let place = '';
      if (s.place != null) {
        const a = ((s.place % 360) + 360) % 360;
        const sunward = Math.abs(a - 180) < 1;
        place = ` A red dot marks a place on the Earth ${sunward ? 'facing the Sun directly (midday)' : a > 90 && a < 270 ? 'on the day side' : a === 90 || a === 270 ? 'on the line between day and night' : 'on the night side'}.`;
      }
      return `Sunlight shines from the left onto the Earth, seen from above the North Pole. The half facing the Sun is in daylight; the other half is in night. An arrow shows the Earth spinning anticlockwise.${place}`;
    }
    if (s.view === 'earthOrbit') return 'The Earth travels round the Sun in an oval path (its orbit), anticlockwise seen from above the North Pole. One orbit takes about 365 days. The half of the Earth facing the Sun is lit.';
    const moons = s.moons || DEFAULT_MOONS;
    const where = (a) => {
      const n = ((a % 360) + 360) % 360;
      return n === 180 ? 'between the Earth and the Sun' : n === 0 ? 'on the far side of the Earth from the Sun' : `${n > 0 && n < 180 ? 'above' : 'below'} the Earth${n > 90 && n < 270 ? ', on the Sun side' : n === 90 || n === 270 ? '' : ', on the side away from the Sun'}`;
    };
    const parts = ['Sunlight comes from the left. The Earth is in the middle and the Moon is drawn at several places on its orbit, which goes anticlockwise. Each Moon is lit on the half facing the Sun.'];
    parts.push(`${listText(moons.map((a, i) => `${s.moonLabels ? `Moon ${s.moonLabels[i]}` : `a Moon`} is ${where(a)}`))}.`);
    if (s.showPhases) parts.push('Beside each Moon is how it looks from the Earth.');
    return parts.join(' ');
  },
};

export const SCIENCE = { circuit, foodChain, foodWeb, light, sunEarthMoon, moonPhases };
export { wrap };
