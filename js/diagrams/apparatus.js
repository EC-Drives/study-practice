// Simple laboratory set-ups for primary science: filtering, evaporating, heating and dissolving.
// Drawn as plain side views; parts can be named or lettered (A, B, C...) for "what is part B?".

import { el, F, Box, label, listText } from './core.js';

const PARTS = {
  filtration: {
    funnel: { name: 'funnel', at: [180, 70] }, filterPaper: { name: 'filter paper', at: [160, 52] }, beaker: { name: 'beaker', at: [236, 240] },
    filtrate: { name: 'filtrate', at: [180, 262] }, residue: { name: 'residue', at: [180, 66] }, stand: { name: 'stand', at: [60, 150] },
  },
  evaporation: {
    dish: { name: 'evaporating dish', at: [226, 104] }, solution: { name: 'solution', at: [180, 104] }, gauze: { name: 'gauze', at: [262, 122] },
    tripod: { name: 'tripod', at: [252, 200] }, burner: { name: 'spirit burner', at: [180, 262] }, flame: { name: 'flame', at: [180, 200] },
  },
  heating: {
    beaker: { name: 'beaker', at: [236, 70] }, water: { name: 'water', at: [180, 96] }, thermometer: { name: 'thermometer', at: [206, 20] }, gauze: { name: 'gauze', at: [262, 122] },
    tripod: { name: 'tripod', at: [252, 200] }, burner: { name: 'spirit burner', at: [180, 262] },
  },
  dissolving: {
    beaker: { name: 'beaker', at: [250, 170] }, water: { name: 'water', at: [180, 210] }, spoon: { name: 'spoon', at: [120, 40] }, stirrer: { name: 'stirring rod', at: [214, 60] }, solid: { name: 'solid', at: [180, 256] },
  },
};
const LETTERS = 'ABCDEFGH';

function beaker(x, y, w, h, level, cls = 'dg-liquid') {
  const out = [];
  if (level > 0) out.push(el('rect', { x: x + 2, y: y + h - level, width: w - 4, height: level - 2, class: cls }));
  out.push(el('path', { d: `M${x - 6},${y}H${x}V${y + h}H${x + w}V${y}`, class: 'dg-ink', 'stroke-width': 2.2 }));
  return out;
}
function tripodBurner(out, flame = true) {
  out.push(el('path', { d: 'M110,128H250M128,128L104,232M232,128L256,232M180,128V232', class: 'dg-ink', 'stroke-width': 3 }));
  out.push(el('path', { d: 'M100,122H260', class: 'dg-ink2', 'stroke-width': 4, 'stroke-dasharray': '3 2' }));
  out.push(el('path', { d: 'M150,236H210V276H150Z', class: 'dg-glass' }), el('path', { d: 'M150,236H210V276H150Z', class: 'dg-ink', 'stroke-width': 2 }), el('rect', { x: 176, y: 222, width: 8, height: 14, class: 'dg-fill-ink2' }));
  if (flame) out.push(el('path', { d: 'M180,170Q194,196 186,214Q180,222 174,214Q166,196 180,170Z', class: 'dg-sun' }));
}

function draw(setup) {
  const out = [];
  if (setup === 'filtration') {
    out.push(el('path', { d: 'M50,280H120M60,280V20M60,40H120', class: 'dg-ink', 'stroke-width': 3 }));
    out.push(el('path', { d: 'M120,34H240L192,110V160H168V110Z', class: 'dg-glass' }), el('path', { d: 'M120,34L168,110V160M240,34L192,110V160', class: 'dg-ink', 'stroke-width': 2.2 }));
    out.push(el('path', { d: 'M130,40L180,104L230,40', class: 'dg-ink2', fill: 'none', 'stroke-width': 1.4, 'stroke-dasharray': '4 3' }));
    out.push(el('path', { d: 'M156,64H204L192,80H168Z', class: 'dg-brown' }));
    out.push(...beaker(130, 170, 100, 110, 28));
    out.push(el('path', { d: 'M180,160V178', class: 'dg-blue-l', 'stroke-width': 3, 'stroke-dasharray': '4 6' }));
  } else if (setup === 'evaporation') {
    tripodBurner(out);
    out.push(el('path', { d: 'M130,96Q180,140 230,96Z', class: 'dg-liquid' }), el('path', { d: 'M126,92Q180,150 234,92', class: 'dg-ink', fill: 'none', 'stroke-width': 2.2 }));
  } else if (setup === 'heating') {
    tripodBurner(out);
    out.push(...beaker(136, 40, 88, 80, 50));
    out.push(el('path', { d: 'M200,6V108', class: 'dg-ink', 'stroke-width': 6, 'stroke-linecap': 'round' }), el('path', { d: 'M200,40V108', class: 'dg-red-l', 'stroke-width': 3 }), el('circle', { cx: 200, cy: 110, r: 5, class: 'dg-red' }));
  } else {
    out.push(...beaker(120, 120, 120, 150, 110));
    out.push(el('path', { d: 'M150,262h60', class: 'dg-ink2', 'stroke-width': 6, 'stroke-dasharray': '3 4' }));
    out.push(el('path', { d: 'M196,30L174,250', class: 'dg-ink', 'stroke-width': 4, 'stroke-linecap': 'round' }));
    out.push(el('path', { d: 'M60,48L112,36', class: 'dg-ink', 'stroke-width': 4, 'stroke-linecap': 'round' }), el('ellipse', { cx: 124, cy: 34, rx: 14, ry: 8, class: 'dg-fill-ink2' }));
  }
  return out;
}

const apparatus = {
  size: 'medium',
  schema: { setup: F.enum('filtration', 'evaporation', 'heating', 'dissolving'), labels: F.enum('names', 'letters', 'none'), parts: F.arr(F.str, 0, 8) },
  required: ['setup'],
  check(s) {
    const known = Object.keys(PARTS[s.setup] || {});
    return (s.parts || []).filter((p) => !known.includes(p)).map((p) => `unknown part "${p}" for ${s.setup} (parts: ${known.join(', ')})`);
  },
  render(s) {
    const box = new Box().rect(40, 0, 240, 290);
    const body = draw(s.setup);
    const mode = s.labels || 'names';
    if (mode !== 'none') {
      const table = PARTS[s.setup];
      const list = s.parts && s.parts.length ? s.parts : Object.keys(table);
      const items = list.map((key, i) => ({ key, i, p: table[key], left: table[key].at[0] < 180 }));
      for (const side of [true, false]) {
        const group = items.filter((it) => it.left === side).sort((a, b) => a.p.at[1] - b.p.at[1]);
        group.forEach((it, j) => {
          const lx = side ? 44 : 318;
          const ly = group.length === 1 ? it.p.at[1] : 16 + (j * 262) / (group.length - 1);
          const text = mode === 'letters' ? LETTERS[it.i] : it.p.name;
          body.push(el('line', { x1: lx + (side ? 4 : -4), y1: ly, x2: it.p.at[0], y2: it.p.at[1], class: 'dg-ink', 'stroke-width': 1.2 }), el('circle', { cx: it.p.at[0], cy: it.p.at[1], r: 3, class: 'dg-fill-ink' }));
          body.push(label(lx, ly, text, { size: mode === 'letters' ? 17 : 15, anchor: side ? 'end' : 'start', weight: mode === 'letters' ? 700 : 500 }));
          box.text(lx, ly, text, 15, side ? 'end' : 'start');
        });
      }
    }
    return { box, body };
  },
  describe(s) {
    const what = { filtration: 'Filtering: a funnel lined with filter paper, held by a stand over a beaker. The liquid that drips through collects in the beaker; the solid stays on the paper.', evaporation: 'Evaporating: an evaporating dish of solution on a gauze and tripod, heated by a spirit burner.', heating: 'Heating water: a beaker of water with a thermometer in it, on a gauze and tripod over a spirit burner.', dissolving: 'Dissolving: a beaker of water with a solid at the bottom, a stirring rod and a spoon.' }[s.setup];
    const table = PARTS[s.setup];
    const list = s.parts && s.parts.length ? s.parts : Object.keys(table);
    const mode = s.labels || 'names';
    return `${what}${mode === 'names' ? ` Labelled: ${listText(list.map((k) => table[k].name))}.` : mode === 'letters' ? ` ${list.length} parts are labelled with the letters ${listText(list.map((_, i) => LETTERS[i]))}.` : ''}`;
  },
};

export const APPARATUS = { apparatus };
