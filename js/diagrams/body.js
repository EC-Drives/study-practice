// Simple labelled organ diagrams: the heart, the lungs and the double circulation.
// Schematic but accurate, drawn as in textbooks from the front: the body's right side is on the
// left of the picture. Blood rich in oxygen is red; blood poor in oxygen is blue.

import { el, g, F, Box, label, tidy, arrowHead, arrowLine, dirOf, listText, say, pt } from './core.js';

const PARTS = {
  heart: {
    venaCava: { name: 'vena cava', at: [96, 40], side: 'L', y: 30 },
    pulmonaryArtery: { name: 'pulmonary artery', at: [124, 64], side: 'L', y: 82 },
    rightAtrium: { name: 'right atrium', at: [104, 150], side: 'L', y: 152 },
    rightVentricle: { name: 'right ventricle', at: [112, 250], side: 'L', y: 252 },
    aorta: { name: 'aorta', at: [258, 30], side: 'R', y: 24 },
    pulmonaryVein: { name: 'pulmonary vein', at: [332, 128], side: 'R', y: 104 },
    leftAtrium: { name: 'left atrium', at: [262, 150], side: 'R', y: 168 },
    leftVentricle: { name: 'left ventricle', at: [255, 250], side: 'R', y: 252 },
    septum: { name: 'septum', at: [178, 262], side: 'B', y: 378 },
  },
  lungs: {
    trachea: { name: 'trachea (windpipe)', at: [168, 50], side: 'L', y: 40 },
    bronchus: { name: 'bronchus', at: [138, 150], side: 'L', y: 118 },
    lung: { name: 'lung', at: [92, 235], side: 'L', y: 220 },
    ribs: { name: 'ribs', at: [34, 168], side: 'L', y: 168 },
    diaphragm: { name: 'diaphragm', at: [96, 330], side: 'L', y: 330 },
    bronchioles: { name: 'bronchioles', at: [262, 236], side: 'R', y: 236 },
    alveoli: { name: 'alveoli (air sacs)', at: [340, 60], side: 'R', y: 104 },
  },
  femaleReproductive: {
    ovary: { name: 'ovary', at: [72, 156], side: 'L', y: 190 },
    oviduct: { name: 'oviduct', at: [100, 118], side: 'L', y: 112 },
    uterus: { name: 'uterus', at: [180, 170], side: 'R', y: 150 },
    cervix: { name: 'cervix', at: [180, 252], side: 'R', y: 252 },
    vagina: { name: 'vagina', at: [180, 312], side: 'R', y: 318 },
  },
  maleReproductive: {
    bladder: { name: 'bladder', at: [180, 64], side: 'R', y: 40 },
    glands: { name: 'glands', at: [204, 126], side: 'R', y: 118 },
    spermDuct: { name: 'sperm duct', at: [110, 160], side: 'L', y: 150 },
    urethra: { name: 'urethra', at: [180, 200], side: 'R', y: 200 },
    penis: { name: 'penis', at: [194, 252], side: 'R', y: 262 },
    testis: { name: 'testis', at: [132, 300], side: 'L', y: 300 },
    scrotum: { name: 'scrotum', at: [120, 330], side: 'L', y: 344 },
  },
  circulation: {
    lungs: { name: 'lungs', at: [180, 40], side: 'R', y: 22 },
    heart: { name: 'heart', at: [210, 195], side: 'R', y: 150 },
    body: { name: 'rest of the body', at: [180, 352], side: 'R', y: 392 },
    arteries: { name: 'artery', at: [300, 270], side: 'R', y: 285 },
    veins: { name: 'vein', at: [60, 270], side: 'L', y: 285 },
  },
};
const LETTERS = 'ABCDEFGHIJ';

/** A vessel or airway: a dark outline with a coloured core and square ends. */
function tube(d, w, cls) {
  return [el('path', { d, class: 'dg-tube', 'stroke-width': w + 4 }), el('path', { d, class: cls, 'stroke-width': w })];
}
const flowArrow = (p, q, red) => arrowLine(p, q, { cls: red ? 'dg-red-l' : 'dg-blue-l', headCls: red ? 'dg-red' : 'dg-blue', width: 2.6, size: 10 });
const tubeArrow = (p, q) => arrowLine(p, q, { cls: 'dg-white-l', headCls: 'dg-white', width: 2.4, size: 9 });

function heart(flow) {
  const out = [];
  // vessels that go behind the heart
  out.push(...tube('M96,0V114', 26, 'dg-tube-blue'));
  out.push(...tube('M296,128H352M296,160H352', 14, 'dg-tube-red'));
  // heart wall and chambers
  const wall = 'M60,120Q60,100 82,100H288Q306,100 306,120V250Q300,312 200,352Q118,318 62,236Z';
  const rv = 'M72,192H170V300Q120,296 72,234Z';
  const lv = 'M186,192H296V250Q292,300 200,336Q186,320 186,300Z';
  out.push(el('path', { d: wall, class: 'dg-organ2' }), el('path', { d: wall, class: 'dg-ink', 'stroke-width': 2.2 }));
  out.push(el('rect', { x: 72, y: 112, width: 70, height: 70, rx: 14, class: 'dg-blue-soft' }), el('rect', { x: 72, y: 112, width: 70, height: 70, rx: 14, class: 'dg-ink2', 'stroke-width': 1.2 }));
  out.push(el('rect', { x: 220, y: 112, width: 74, height: 66, rx: 14, class: 'dg-red-soft' }), el('rect', { x: 220, y: 112, width: 74, height: 66, rx: 14, class: 'dg-ink2', 'stroke-width': 1.2 }));
  out.push(el('path', { d: rv, class: 'dg-blue-soft' }), el('path', { d: rv, class: 'dg-ink2', 'stroke-width': 1.2 }));
  out.push(el('path', { d: lv, class: 'dg-red-soft' }), el('path', { d: lv, class: 'dg-ink2', 'stroke-width': 1.2 }));
  // the aorta leaves the left ventricle and arches over; the pulmonary artery, in front of it, leaves the right ventricle
  out.push(...tube('M202,214V62Q202,30 236,30Q272,30 272,62V98', 24, 'dg-tube-red'));
  out.push(...tube('M158,214V82Q158,64 140,64H112M158,82Q158,64 176,64H240', 18, 'dg-tube-blue'));
  if (flow) {
    out.push(tubeArrow([96, 16], [96, 96]));
    out.push(flowArrow([104, 160], [104, 250], false));
    out.push(tubeArrow([158, 200], [158, 96]), tubeArrow([146, 64], [116, 64]), tubeArrow([172, 64], [236, 64]));
    out.push(tubeArrow([348, 144], [300, 144]));
    out.push(flowArrow([262, 158], [262, 244], true));
    out.push(tubeArrow([202, 200], [202, 70]), tubeArrow([272, 62], [272, 96]));
  }
  return out;
}

function lungs(flow) {
  const out = [];
  // ribs behind
  let d = '';
  for (let i = 0; i < 6; i++) { const y = 120 + i * 36; d += `M180,${y - 20}Q60,${y - 40} 26,${y + 14}M180,${y - 20}Q300,${y - 40} 334,${y + 14}`; }
  out.push(el('path', { d, class: 'dg-ink2', 'stroke-width': 7, fill: 'none', opacity: 0.25 }));
  // lungs
  const right = 'M160,112Q100,104 66,160Q44,230 52,318Q104,300 162,302Q170,210 160,112Z';
  const left = 'M200,112Q262,104 294,160Q316,230 308,318Q262,300 232,304Q222,262 204,248Q214,200 200,112Z';
  for (const p of [right, left]) out.push(el('path', { d: p, class: 'dg-organ' }), el('path', { d: p, class: 'dg-ink', 'stroke-width': 2.2 }));
  // trachea and bronchi
  out.push(...tube('M180,0V122', 26, 'dg-tube-glass'));
  let rings = '';
  for (let y = 12; y < 118; y += 14) rings += `M168,${y}H192`;
  out.push(el('path', { d: rings, class: 'dg-ink2', 'stroke-width': 1.4 }));
  out.push(...tube('M180,120Q168,138 132,156', 15, 'dg-tube-glass'), ...tube('M180,120Q192,138 228,156', 15, 'dg-tube-glass'));
  // bronchioles
  let b = '';
  const branch = (x, y, ang, len, depth) => {
    if (depth === 0) return;
    const x2 = x + len * Math.cos(ang); const y2 = y + len * Math.sin(ang);
    b += `M${x.toFixed(1)},${y.toFixed(1)}L${x2.toFixed(1)},${y2.toFixed(1)}`;
    branch(x2, y2, ang - 0.45, len * 0.72, depth - 1);
    branch(x2, y2, ang + 0.45, len * 0.72, depth - 1);
  };
  branch(132, 156, Math.PI * 0.62, 46, 4);
  branch(228, 156, Math.PI * 0.38, 46, 4);
  out.push(el('path', { d: b, class: 'dg-ink2', 'stroke-width': 1.6, fill: 'none' }));
  // diaphragm
  out.push(el('path', { d: 'M24,340Q180,266 336,340', class: 'dg-organ2', fill: 'none', stroke: 'var(--dg-organ2)', 'stroke-width': 12 }));
  out.push(el('path', { d: 'M24,334Q180,260 336,334M24,346Q180,272 336,346', class: 'dg-ink', 'stroke-width': 1.4 }));
  // alveoli inset
  out.push(el('line', { x1: 262, y1: 236, x2: 322, y2: 92, class: 'dg-ink2', 'stroke-width': 1.2, 'stroke-dasharray': '4 3' }));
  out.push(el('circle', { cx: 330, cy: 60, r: 40, class: 'dg-fill-surface' }));
  for (const [x, y] of [[318, 48], [338, 44], [348, 62], [330, 66], [312, 66], [324, 82], [344, 80]]) out.push(el('circle', { cx: x, cy: y, r: 9, class: 'dg-organ' }), el('circle', { cx: x, cy: y, r: 9, class: 'dg-ink2', 'stroke-width': 1.2 }));
  out.push(el('path', { d: 'M300,30L314,42', class: 'dg-ink2', 'stroke-width': 3 }));
  out.push(el('circle', { cx: 330, cy: 60, r: 40, class: 'dg-ink', 'stroke-width': 1.8 }));
  if (flow) out.push(arrowLine([180, -26], [180, 40], { cls: 'dg-accent', headCls: 'dg-fill-accent', width: 3, size: 12 }));
  return out;
}

/** Female reproductive organs, front view: ovaries, oviducts, uterus, cervix, vagina. */
function femaleReproductive() {
  const out = [];
  const uterus = 'M118,130Q120,112 140,112H220Q240,112 242,130Q244,190 196,238H164Q116,190 118,130Z';
  const inner = 'M148,132H212Q214,170 186,214H174Q146,170 148,132Z';
  out.push(el('path', { d: 'M120,128Q96,100 70,128M240,128Q264,100 290,128', class: 'dg-tube', 'stroke-width': 12 }), el('path', { d: 'M120,128Q96,100 70,128M240,128Q264,100 290,128', class: 'dg-tube-organ', 'stroke-width': 8 }));
  for (const x of [72, 288]) {
    out.push(el('ellipse', { cx: x, cy: 156, rx: 24, ry: 16, class: 'dg-organ2' }), el('ellipse', { cx: x, cy: 156, rx: 24, ry: 16, class: 'dg-ink', 'stroke-width': 1.8 }));
    let f = '';
    for (let k = -2; k <= 2; k++) f += `M${x + (x < 180 ? 0 : 0)},130l${k * 6},10`;
    out.push(el('path', { d: f, class: 'dg-ink2', 'stroke-width': 1.4 }));
  }
  out.push(el('path', { d: uterus, class: 'dg-organ' }), el('path', { d: uterus, class: 'dg-ink', 'stroke-width': 2 }));
  out.push(el('path', { d: inner, class: 'dg-organ2' }), el('path', { d: inner, class: 'dg-ink2', 'stroke-width': 1.2 }));
  out.push(el('path', { d: 'M164,238H196V264H164Z', class: 'dg-organ' }), el('path', { d: 'M164,238V264M196,238V264', class: 'dg-ink', 'stroke-width': 2 }));
  out.push(el('path', { d: 'M160,264H200L204,340H156Z', class: 'dg-organ' }), el('path', { d: 'M160,264L156,340M200,264L204,340', class: 'dg-ink', 'stroke-width': 2 }));
  out.push(el('path', { d: 'M180,214V340', class: 'dg-ink2', 'stroke-width': 1.2, 'stroke-dasharray': '4 3' }));
  return out;
}

/** Male reproductive organs, front view, simplified: testes in the scrotum, sperm ducts, glands, urethra, penis. */
function maleReproductive() {
  const out = [];
  out.push(el('ellipse', { cx: 180, cy: 70, rx: 46, ry: 36, class: 'dg-glass' }), el('ellipse', { cx: 180, cy: 70, rx: 46, ry: 36, class: 'dg-ink2', 'stroke-width': 1.6 }));
  out.push(el('path', { d: 'M102,300Q96,350 150,352Q180,354 210,352Q264,350 258,300Q256,270 230,262H130Q104,270 102,300Z', class: 'dg-organ' }), el('path', { d: 'M102,300Q96,350 150,352Q180,354 210,352Q264,350 258,300Q256,270 230,262H130Q104,270 102,300Z', class: 'dg-ink', 'stroke-width': 1.8 }));
  for (const x of [134, 226]) out.push(el('ellipse', { cx: x, cy: 304, rx: 22, ry: 28, class: 'dg-organ2' }), el('ellipse', { cx: x, cy: 304, rx: 22, ry: 28, class: 'dg-ink', 'stroke-width': 1.8 }));
  const ducts = 'M140,278Q100,230 112,160Q120,118 170,124M220,278Q260,230 248,160Q240,118 190,124';
  out.push(el('path', { d: ducts, class: 'dg-tube', 'stroke-width': 8 }), el('path', { d: ducts, class: 'dg-tube-blue', 'stroke-width': 4 }));
  out.push(el('ellipse', { cx: 180, cy: 126, rx: 26, ry: 14, class: 'dg-organ2' }), el('ellipse', { cx: 180, cy: 126, rx: 26, ry: 14, class: 'dg-ink', 'stroke-width': 1.6 }));
  out.push(el('path', { d: 'M166,140H194V286Q194,298 180,298Q166,298 166,286Z', class: 'dg-organ' }), el('path', { d: 'M166,140H194V286Q194,298 180,298Q166,298 166,286Z', class: 'dg-ink', 'stroke-width': 1.8 }));
  out.push(el('path', { d: 'M180,104V296', class: 'dg-ink2', 'stroke-width': 1.8 }));
  return out;
}

function circulation(flow) {
  const out = [];
  const box = (x, y, w, h, cls, t) => [el('rect', { x, y, width: w, height: h, rx: 14, class: cls }), el('rect', { x, y, width: w, height: h, rx: 14, class: 'dg-ink', 'stroke-width': 2 }), t ? label(x + w / 2, y + h / 2, t, { size: 15, weight: 700, halo: false }) : null];
  const vessel = (d, red) => el('path', { d, class: red ? 'dg-red-l' : 'dg-blue-l', 'stroke-width': 7, fill: 'none', 'stroke-linejoin': 'round' });
  out.push(vessel('M140,160V70', false), vessel('M220,70V160', true), vessel('M240,196H300V356H262', true), vessel('M98,356H60V196H120', false));
  out.push(...box(110, 10, 140, 60, 'dg-organ', ''), ...box(120, 160, 120, 72, 'dg-fill-surface', ''));
  out.push(el('rect', { x: 122, y: 162, width: 57, height: 68, rx: 12, class: 'dg-blue-soft' }), el('rect', { x: 181, y: 162, width: 57, height: 68, rx: 12, class: 'dg-red-soft' }));
  out.push(el('line', { x1: 180, y1: 160, x2: 180, y2: 232, class: 'dg-ink', 'stroke-width': 2 }));
  out.push(...box(98, 320, 164, 64, 'dg-organ', ''));
  if (flow) {
    out.push(arrowHead(140, 106, 90, 13, 'dg-blue'), arrowHead(220, 124, 270, 13, 'dg-red'), arrowHead(300, 280, 270, 13, 'dg-red'), arrowHead(60, 272, 90, 13, 'dg-blue'));
    out.push(arrowHead(276, 196, 0, 13, 'dg-red'), arrowHead(84, 356, 180, 13, 'dg-blue'));
  }
  return out;
}

const organ = {
  size: 'medium',
  schema: {
    organ: F.enum('heart', 'lungs', 'circulation', 'femaleReproductive', 'maleReproductive'), labels: F.enum('names', 'letters', 'none'), parts: F.arr(F.str, 0, 10), flow: F.bool,
  },
  required: ['organ'],
  check(s) {
    const known = Object.keys(PARTS[s.organ] || {});
    return (s.parts || []).filter((p) => !known.includes(p)).map((p) => `unknown part "${p}" for ${s.organ} (parts: ${known.join(', ')})`);
  },
  render(s) {
    const box = new Box();
    const K = 0.8; // the drawing is scaled down; labels keep their full size
    const drawing = s.organ === 'heart' ? heart(s.flow) : s.organ === 'lungs' ? lungs(s.flow) : s.organ === 'femaleReproductive' ? femaleReproductive() : s.organ === 'maleReproductive' ? maleReproductive() : circulation(s.flow);
    const body = [g({ transform: `scale(${K})` }, drawing)];
    if (s.organ === 'femaleReproductive') box.rect(0, 90 * K, 360 * K, 260 * K);
    else box.rect(0, (s.organ === 'lungs' && s.flow ? -30 : 0) * K, 360 * K, (s.organ === 'heart' ? 356 : s.organ === 'maleReproductive' ? 360 : 390) * K);
    const mode = s.labels || 'names';
    if (mode !== 'none') {
      const table = PARTS[s.organ];
      const list = s.parts && s.parts.length ? s.parts : Object.keys(table);
      const size = mode === 'letters' ? 17 : 15;
      list.forEach((key, i) => {
        const p = table[key];
        const at = [p.at[0] * K, p.at[1] * K];
        const text = mode === 'letters' ? LETTERS[i] : p.name;
        const lx = p.side === 'L' ? -12 : p.side === 'R' ? 360 * K + 12 : at[0];
        const ly = p.y * K + (p.side === 'B' ? 6 : 0);
        const anchor = p.side === 'L' ? 'end' : p.side === 'R' ? 'start' : 'middle';
        const end = p.side === 'B' ? [lx, ly - 12] : [lx + (p.side === 'L' ? 5 : -5), ly];
        body.push(el('line', { x1: end[0], y1: end[1], x2: at[0], y2: at[1], class: 'dg-ink', 'stroke-width': 1.3 }), el('circle', { cx: at[0], cy: at[1], r: 3, class: 'dg-fill-ink' }));
        body.push(label(lx, ly, text, { size, anchor, weight: mode === 'letters' ? 700 : 500, maxWidth: 92 }));
        box.text(lx, ly, text, size, anchor, 92);
      });
    }
    return { box, body };
  },
  describe(s) {
    const table = PARTS[s.organ];
    const list = s.parts && s.parts.length ? s.parts : Object.keys(table);
    const mode = s.labels || 'names';
    const what = { heart: 'A simple diagram of the human heart, seen from the front (the body\'s right side is on the left of the picture), cut open to show the four chambers.', lungs: 'A simple diagram of the human lungs and airways, seen from the front, with the ribs behind and the diaphragm below.', circulation: 'A simple diagram of the double circulation: the heart in the middle, the lungs above and the rest of the body below. Red shows blood rich in oxygen and blue shows blood poor in oxygen.', femaleReproductive: 'A simple diagram of the female reproductive system, seen from the front: two ovaries, an oviduct from each ovary to the uterus, the uterus, the cervix at its neck, and the vagina below.', maleReproductive: 'A simple diagram of the male reproductive system, seen from the front: two testes in the scrotum, a sperm duct from each testis up and round to the glands below the bladder, and the urethra running down through the penis.' }[s.organ];
    const parts = [what];
    if (s.flow) parts.push(s.organ === 'lungs' ? 'An arrow shows air going down the trachea.' : 'Arrows show the direction the blood flows.');
    if (mode === 'names') parts.push(`Labelled parts: ${listText(list.map((k) => table[k].name))}.`);
    else if (mode === 'letters') parts.push(`${list.length} parts are labelled with the letters ${listText(list.map((_, i) => LETTERS[i]))}.`);
    return parts.join(' ');
  },
};

export const BODY = { organ };
export { PARTS as ORGAN_PARTS, tidy, say, dirOf, pt, g };
