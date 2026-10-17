// Force diagrams: an object with labelled force arrows (push, pull, weight, friction, air
// resistance, upthrust). Arrow lengths are in proportion to the sizes given, so balanced and
// unbalanced forces look right.

import { el, F, Box, label, tidy, arrowLine, listText, say, round, textWidth } from './core.js';

const DIRS = { up: 90, down: 270, left: 180, right: 0 };
const WORD = { up: 'upwards', down: 'downwards', left: 'to the left', right: 'to the right' };

/** The object, centred on (0, 0). Returns its half-width and half-height for placing arrows. */
function objectShape(kind) {
  switch (kind) {
    case 'ball': return { w: 34, h: 34, nodes: [el('circle', { cx: 0, cy: 0, r: 34, class: 'dg-red' }), el('circle', { cx: 0, cy: 0, r: 34, class: 'dg-ink', 'stroke-width': 1.8 })] };
    case 'car': return {
      w: 62, h: 30, nodes: [
        el('path', { d: 'M-62,14V-4Q-62,-10 -54,-10H-36L-22,-28H22L36,-10H54Q62,-10 62,-4V14Z', class: 'dg-blue' }),
        el('path', { d: 'M-62,14V-4Q-62,-10 -54,-10H-36L-22,-28H22L36,-10H54Q62,-10 62,-4V14Z', class: 'dg-ink', 'stroke-width': 1.8 }),
        el('path', { d: 'M-18,-24H-2V-12H-30ZM2,-24H18L30,-12H2Z', class: 'dg-glass' }),
        el('circle', { cx: -34, cy: 16, r: 12, class: 'dg-fill-ink' }), el('circle', { cx: 34, cy: 16, r: 12, class: 'dg-fill-ink' }),
      ],
    };
    case 'boat': return { w: 60, h: 26, nodes: [el('path', { d: 'M-60,-6H60L44,22H-44Z', class: 'dg-brown' }), el('path', { d: 'M-60,-6H60L44,22H-44Z', class: 'dg-ink', 'stroke-width': 1.8 }), el('path', { d: 'M0,-6V-60L34,-14Z', class: 'dg-glass' }), el('path', { d: 'M0,-6V-60L34,-14Z', class: 'dg-ink', 'stroke-width': 1.4 })] };
    case 'parachutist': return {
      w: 46, h: 54, nodes: [
        el('path', { d: 'M-50,-34Q0,-96 50,-34Z', class: 'dg-red' }), el('path', { d: 'M-50,-34Q0,-96 50,-34Z', class: 'dg-ink', 'stroke-width': 1.6 }),
        el('path', { d: 'M-50,-34L0,22M50,-34L0,22M-18,-38L0,22M18,-38L0,22', class: 'dg-ink2', 'stroke-width': 1 }),
        el('circle', { cx: 0, cy: 28, r: 7, class: 'dg-fill-ink2' }), el('path', { d: 'M0,35V58M0,42L-10,52M0,42L10,52M0,58L-8,72M0,58L8,72', class: 'dg-ink2', 'stroke-width': 3 }),
      ],
    };
    case 'person': return { w: 22, h: 48, nodes: [el('circle', { cx: 0, cy: -38, r: 10, class: 'dg-fill-ink2' }), el('path', { d: 'M0,-28V10M0,10L-12,46M0,10L12,46M-18,-12L18,-12', class: 'dg-ink2', 'stroke-width': 5 })] };
    case 'apple': return { w: 26, h: 26, nodes: [el('circle', { cx: 0, cy: 0, r: 26, class: 'dg-red' }), el('path', { d: 'M0,-26l4,-12', class: 'dg-ink', 'stroke-width': 3 })] };
    default: return { w: 46, h: 34, nodes: [el('rect', { x: -46, y: -34, width: 92, height: 68, rx: 3, class: 'dg-brown' }), el('rect', { x: -46, y: -34, width: 92, height: 68, rx: 3, class: 'dg-ink', 'stroke-width': 1.8 })] };
  }
}

const arrowSpec = F.obj({ direction: F.enum('up', 'down', 'left', 'right'), size: F.num(0, 10000), label: F.str, name: F.str }, ['direction']);

const forces = {
  size: 'medium',
  schema: {
    object: F.enum('box', 'ball', 'car', 'boat', 'parachutist', 'person', 'apple'), surface: F.enum('ground', 'water', 'table', 'none'),
    arrows: F.arr(arrowSpec, 1, 6), label: F.str,
  },
  required: ['arrows'],
  check(s) {
    const e = [];
    const dirs = s.arrows.map((a) => a.direction);
    for (const d of Object.keys(DIRS)) if (dirs.filter((x) => x === d).length > 1) e.push(`only one arrow per direction (two point ${d})`);
    return e;
  },
  render(s) {
    const box = new Box();
    const body = [];
    const obj = objectShape(s.object || 'box');
    const surface = s.surface || (s.object === 'boat' ? 'water' : s.object === 'parachutist' || s.object === 'apple' ? 'none' : 'ground');
    const sizes = s.arrows.map((a) => a.size).filter((x) => x != null && x > 0);
    const maxSize = sizes.length ? Math.max(...sizes) : 1;
    const len = (a) => (a.size != null ? (a.size === 0 ? 0 : 28 + (92 * a.size) / maxSize) : 70);
    const groundY = obj.h + (s.object === 'car' ? 4 : 0);
    if (surface === 'ground' || surface === 'table') {
      body.push(el('line', { x1: -150, y1: groundY, x2: 150, y2: groundY, class: 'dg-ink', 'stroke-width': 2.4 }));
      let d = '';
      for (let x = -146; x < 150; x += 12) d += `M${x},${groundY + 2}l-8,10`;
      body.push(el('path', { d, class: 'dg-ink2', 'stroke-width': 1.1 }));
      box.add(-150, groundY + 12).add(150, groundY);
    } else if (surface === 'water') {
      body.push(el('path', { d: `M-150,${obj.h * 0.25}H150V${obj.h + 40}H-150Z`, class: 'dg-liquid' }));
      box.add(-150, obj.h + 40).add(150, 0);
    }
    body.push(...obj.nodes);
    box.rect(-obj.w, -obj.h - (s.object === 'boat' ? 34 : s.object === 'parachutist' ? 60 : 0), 2 * obj.w, 2 * obj.h);
    for (const a of s.arrows) {
      const L = len(a);
      if (L === 0) continue;
      const deg = DIRS[a.direction];
      // weight acts from the middle; the others act on the edge facing their direction
      const fromCentre = a.direction === 'down' && /weight|gravity/i.test(a.name || '');
      const start = a.direction === 'up' ? [0, -obj.h] : a.direction === 'down' ? [0, fromCentre ? 0 : obj.h] : a.direction === 'left' ? [-obj.w, 0] : [obj.w, 0];
      if (a.direction === 'down' && fromCentre) start[1] = 0;
      const end = [start[0] + L * Math.cos((deg * Math.PI) / 180), start[1] - L * Math.sin((deg * Math.PI) / 180)];
      body.push(arrowLine(start, end, { cls: 'dg-accent', headCls: 'dg-fill-accent', width: 3.4, size: 13 }));
      const text = [a.name, a.label].filter(Boolean).map(tidy).join(' ');
      if (text) {
        // sideways arrows are labelled above their middle (keeps the picture narrow); up and down at the tip
        const side = a.direction === 'left' || a.direction === 'right';
        const fits = textWidth(text, 14) + 6 <= L;
        const out = a.direction === 'right' ? 1 : -1;
        let anchor = 'middle'; let lx = end[0]; let ly = end[1] + (a.direction === 'up' ? -16 : 16);
        if (side && fits) { anchor = out > 0 ? 'end' : 'start'; lx = end[0]; ly = end[1] - 16; } // above the arrow, flush with its tip
        else if (side) { anchor = out > 0 ? 'start' : 'end'; lx = end[0] + 8 * out; ly = end[1]; } // beyond the tip
        body.push(label(lx, ly, text, { size: 14, anchor, weight: 600 }));
        box.text(lx, ly, text, 14, anchor);
      }
      box.add(...end);
    }
    if (s.label) { const y = box.y1 + 16; body.push(label(0, y, s.label, { size: 14 })); box.text(0, y, s.label, 14); }
    return { box, body };
  },
  describe(s) {
    const what = s.object || 'box';
    const where = { ground: ' on the ground', table: ' on a table', water: ' on water', none: '' }[s.surface || (what === 'boat' ? 'water' : what === 'parachutist' || what === 'apple' ? 'none' : 'ground')];
    const list = s.arrows.map((a) => `${a.name ? `${tidy(a.name)}, ` : 'a force '}${WORD[a.direction]}${a.label ? `, labelled ${say(a.label)}` : ''}`);
    const parts = [`A force diagram: ${s.label ? `${say(s.label)} (drawn as a ${what})` : `a ${what}`}${where} with ${s.arrows.length === 1 ? 'one force arrow' : `${s.arrows.length} force arrows`}: ${listText(list)}.`];
    // compare the lengths of opposite arrows, as a sighted pupil would see them
    const by = Object.fromEntries(s.arrows.map((a) => [a.direction, a]));
    for (const [p, q] of [['left', 'right'], ['up', 'down']]) {
      if (!by[p] || !by[q] || by[p].size == null || by[q].size == null) continue;
      if (by[p].size === by[q].size) parts.push(`The ${WORD[p].replace('to the ', '')} and ${WORD[q].replace('to the ', '')} arrows are the same length.`);
      else { const [big, small] = by[p].size > by[q].size ? [p, q] : [q, p]; parts.push(`The arrow ${WORD[big]} is longer than the arrow ${WORD[small]}.`); }
    }
    return parts.join(' ');
  },
};

export const FORCES = { forces };
export { round, textWidth };
