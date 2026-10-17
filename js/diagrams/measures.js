// Measures: clock faces, measuring scales (ruler, jug, thermometer, weighing scale), spinners.

import { el, g, F, Box, label, tidy, polar, pathOf, arcPath, sectorPath, arrowHead, listText, say, plural, round, pt, textWidth } from './core.js';
import { ordinal } from './geometry.js';

const TIME = /^([01]?\d|2[0-3]):([0-5]\d)$/;

// ---------------------------------------------------------------- clock

/** Hand angles in degrees clockwise from 12. */
export function clockAngles(time) {
  const [, hh, mm] = time.match(TIME);
  const h = Number(hh); const m = Number(mm);
  return { hour: ((h % 12) * 30 + m * 0.5) % 360, minute: m * 6, h, m };
}
const ROMAN = ['XII', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];

const clock = {
  size: 'small',
  schema: { time: (v, p) => (typeof v === 'string' && TIME.test(v) ? null : `${p} should be a time such as "10:35" (24-hour)`), style: F.enum('analogue', 'digital'), numerals: F.enum('arabic', 'roman', 'none'), hour24: F.bool, label: F.str },
  required: ['time'],
  render(s) {
    const box = new Box();
    const body = [];
    const { hour, minute, h, m } = clockAngles(s.time);
    if (s.style === 'digital') {
      const t = s.hour24 === false ? `${(h % 12) || 12}:${String(m).padStart(2, '0')}` : `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      body.push(el('rect', { x: 0, y: 0, width: 220, height: 96, rx: 14, class: 'dg-fill-ink' }));
      body.push(el('rect', { x: 10, y: 10, width: 200, height: 76, rx: 8, class: 'dg-fill-surface' }));
      body.push(el('text', { x: 110, y: 50, 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': 52, 'font-weight': 700, class: 'dg-t', style: 'font-variant-numeric: tabular-nums; letter-spacing: 2px' }, t));
      box.rect(0, 0, 220, 96);
      if (s.label) { body.push(label(110, 116, s.label, { size: 15 })); box.text(110, 116, s.label, 15); }
      return { box, body };
    }
    const R = 100;
    body.push(el('circle', { cx: 0, cy: 0, r: R + 6, class: 'dg-fill-ink' }), el('circle', { cx: 0, cy: 0, r: R, class: 'dg-fill-surface' }));
    let d = '';
    for (let i = 0; i < 60; i++) {
      const a = 90 - i * 6;
      const p = polar(0, 0, R - 3, a); const q = polar(0, 0, R - (i % 5 === 0 ? 14 : 8), a);
      d += `M${pt(p)}L${pt(q)}`;
    }
    body.push(el('path', { d, class: 'dg-ink', 'stroke-width': 1.4 }));
    let d5 = '';
    for (let i = 0; i < 12; i++) { const a = 90 - i * 30; d5 += `M${pt(polar(0, 0, R - 3, a))}L${pt(polar(0, 0, R - 14, a))}`; }
    body.push(el('path', { d: d5, class: 'dg-ink', 'stroke-width': 3.2 }));
    if (s.numerals !== 'none') {
      for (let i = 0; i < 12; i++) {
        const p = polar(0, 0, R - 28, 90 - i * 30);
        const t = s.numerals === 'roman' ? ROMAN[i] : String(i || 12);
        body.push(el('text', { x: p[0], y: p[1], 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': s.numerals === 'roman' ? 15 : 19, 'font-weight': 600, class: 'dg-t' }, t));
      }
    }
    const hand = (ang, len, w, cls) => { const p = polar(0, 0, len, 90 - ang); const q = polar(0, 0, 12, 270 - ang); return el('line', { x1: q[0], y1: q[1], x2: p[0], y2: p[1], class: cls, 'stroke-width': w, 'stroke-linecap': 'round' }); };
    body.push(hand(hour, 52, 7, 'dg-ink'), hand(minute, 80, 4, 'dg-ink'));
    body.push(el('circle', { cx: 0, cy: 0, r: 6, class: 'dg-fill-ink' }));
    box.circle(0, 0, R + 6);
    if (s.label) { body.push(label(0, R + 26, s.label, { size: 15 })); box.text(0, R + 26, s.label, 15); }
    return { box, body };
  },
  describe(s) {
    const { hour, minute, h, m } = clockAngles(s.time);
    if (s.style === 'digital') {
      const t = s.hour24 === false ? `${(h % 12) || 12}:${String(m).padStart(2, '0')}` : `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      return `A digital clock showing ${t}${s.label ? ` (${tidy(s.label)})` : ''}.`;
    }
    const num = (k) => String(((k + 11) % 12) + 1);
    const hp = hour / 30; // position in hours
    const hourText = Math.abs(hp - Math.round(hp)) < 0.02 ? `points at ${num(Math.round(hp) % 12 || 12)}` : hp - Math.floor(hp) < 0.25 ? `is just past ${num(Math.floor(hp) || 12)}` : hp - Math.floor(hp) > 0.75 ? `is nearly at ${num((Math.floor(hp) + 1) % 12 || 12)}` : `is between ${num(Math.floor(hp) || 12)} and ${num((Math.floor(hp) + 1) % 12 || 12)}`;
    const mp = minute / 30;
    const mk = m % 5;
    const mBase = Math.floor(m / 5) || 12;
    const minuteText = mk === 0 ? `points at ${num(Math.round(mp) % 12 || 12)}` : `points at the ${ordinal(mk)} small mark after ${num(mBase)}`;
    return `An analogue clock${s.numerals === 'roman' ? ' with Roman numerals' : s.numerals === 'none' ? ' without numbers' : ''}. The short hour hand ${hourText}. The long minute hand ${minuteText}.${s.label ? ` Underneath: ${tidy(s.label)}.` : ''}`;
  },
};

// ---------------------------------------------------------------- scales

function scaleTicks(s) {
  const out = [];
  const minor = s.minor || s.major;
  const n = Math.round((s.max - s.min) / minor);
  const per = Math.round(s.major / minor);
  for (let i = 0; i <= n; i++) {
    const v = round(s.min + i * minor, 9);
    const major = i % per === 0;
    const half = !major && per % 2 === 0 && i % (per / 2) === 0;
    const lab = major && (Math.round(i / per) % (s.labelEvery || 1) === 0);
    out.push({ v, major, half, lab });
  }
  return out;
}
const fmt = (v) => tidy(String(round(v, 6)));

/** Where a value sits on a scale, in words: "on the 600 mark", "on the 3rd small mark above 600". */
export function scalePosition(s, v, word = 'above') {
  const minor = s.minor || s.major;
  const k = (v - s.min) / minor;
  const labelStep = s.major * (s.labelEvery || 1);
  const base = s.min + Math.floor((v - s.min) / labelStep + 1e-9) * labelStep;
  if (Math.abs(k - Math.round(k)) > 1e-6) {
    const below = s.min + Math.floor(k + 1e-9) * minor;
    const kb = Math.round((below - base) / minor);
    return kb === 0 ? `between the ${fmt(base)} mark and the next small mark` : `between the ${ordinal(kb)} and ${ordinal(kb + 1)} small marks ${word} ${fmt(base)}`;
  }
  const steps = Math.round((v - base) / minor);
  if (steps === 0) return `on the ${fmt(base)} mark`;
  return `on the ${ordinal(steps)} ${minor < s.major ? 'small ' : ''}mark ${word} ${fmt(base)}`;
}

function rulerRender(s, box, body) {
  const L = 380; const pad = 14;
  const X = (v) => pad + ((v - s.min) / (s.max - s.min)) * L;
  body.push(el('rect', { x: 0, y: 0, width: L + 2 * pad, height: 58, rx: 4, class: 'dg-glass' }), el('rect', { x: 0, y: 0, width: L + 2 * pad, height: 58, rx: 4, class: 'dg-ink2', 'stroke-width': 1.4 }));
  let d = '';
  for (const t of scaleTicks(s)) {
    const x = round(X(t.v), 2);
    d += `M${x},0V${t.major ? 20 : t.half ? 14 : 9}`;
    if (t.lab) body.push(label(x, 31, fmt(t.v), { size: 12, halo: false }));
  }
  body.push(el('path', { d, class: 'dg-ink', 'stroke-width': 1.2 }));
  if (s.unit) body.push(label(pad + 4, 48, s.unit, { size: 12, anchor: 'start', cls: 'dg-t2', halo: false }));
  box.rect(0, 0, L + 2 * pad, 58);
  if (s.value != null) {
    const a = X(s.from != null ? s.from : s.min); const b = X(s.value);
    const y = -34; const h = 20;
    if (s.object === 'pencil') {
      const tip = Math.min(26, (b - a) * 0.25);
      body.push(el('path', { d: pathOf([[a, y], [b - tip, y], [b, y + h / 2], [b - tip, y + h], [a, y + h]]), class: 'dg-glow' }));
      body.push(el('path', { d: pathOf([[b - tip * 0.35, y + h * 0.33], [b, y + h / 2], [b - tip * 0.35, y + h * 0.67]]), class: 'dg-fill-ink2' }));
      body.push(el('path', { d: pathOf([[a, y], [b - tip, y], [b, y + h / 2], [b - tip, y + h], [a, y + h]]), class: 'dg-ink', 'stroke-width': 1.6 }));
      body.push(el('line', { x1: b - tip, y1: y, x2: b - tip, y2: y + h, class: 'dg-ink', 'stroke-width': 1.2 }));
    } else {
      body.push(el('rect', { x: a, y, width: b - a, height: h, rx: s.object === 'ribbon' ? 0 : 3, class: s.object === 'ribbon' ? 'dg-red' : 'dg-part' }));
      body.push(el('rect', { x: a, y, width: b - a, height: h, rx: 3, class: 'dg-ink', 'stroke-width': 1.4 }));
    }
    body.push(el('path', { d: `M${round(a, 2)},${y + h}V0M${round(b, 2)},${y + h / 2}V0`, class: 'dg-ink2', 'stroke-width': 1, 'stroke-dasharray': '3 3' }));
    box.add(a, y).add(b, y);
  }
}

function jugRender(s, box, body, ctx) {
  const Hs = 230; const top = 20; const bot = top + Hs; // scale from bot (min) to top (max)
  const Y = (v) => bot - ((v - s.min) / (s.max - s.min)) * Hs;
  const xl = 40; const xr = 170; const flare = 10;
  const outline = [[xl - flare, top - 18], [xr + flare, top - 18], [xr, bot + 12], [xl, bot + 12]];
  const clipId = `${ctx.id}-jug`;
  body.push(el('defs', {}, el('clipPath', { id: clipId }, el('path', { d: pathOf(outline) }))));
  body.push(el('path', { d: pathOf(outline), class: 'dg-glass' }));
  if (s.value != null) body.push(el('g', { 'clip-path': `url(#${clipId})` }, el('rect', { x: 0, y: Y(s.value), width: 260, height: bot + 20 - Y(s.value), class: 'dg-liquid' })));
  // handle and spout
  body.push(el('path', { d: `M${xr + 7},${top + 10}C${xr + 60},${top + 10} ${xr + 60},${top + 120} ${xr + 4},${top + 130}`, class: 'dg-ink', 'stroke-width': 7, fill: 'none' }));
  body.push(el('path', { d: `M${xl - flare},${top - 18}L${xl - flare - 18},${top - 28}`, class: 'dg-ink', 'stroke-width': 2.4 }));
  body.push(el('path', { d: pathOf(outline), class: 'dg-ink', 'stroke-width': 2.4 }));
  let d = '';
  for (const t of scaleTicks(s)) {
    const y = round(Y(t.v), 2);
    d += `M${xl + 2},${y}H${xl + (t.major ? 26 : t.half ? 18 : 11)}`;
    if (t.lab) body.push(label(xl + 32, y, fmt(t.v), { size: 12, anchor: 'start' }));
  }
  body.push(el('path', { d, class: 'dg-ink', 'stroke-width': 1.3 }));
  if (s.unit) body.push(label(xr - 10, top, s.unit, { size: 13, anchor: 'end', weight: 600 }));
  box.addPts(outline).add(xl - flare - 22, top - 32).add(xr + 52, top + 130);
}

/** A measuring cylinder: a tall narrow tube with a foot, the scale up its side, liquid to the reading. */
function cylinderRender(s, box, body) {
  const top = 10; const Hs = 260; const bot = top + Hs;
  const Y = (v) => bot - ((v - s.min) / (s.max - s.min)) * (Hs - 10);
  const xl = 0; const xr = 64;
  if (s.value != null) body.push(el('path', { d: `M${xl + 2},${round(Y(s.value) + 4, 2)}Q${(xl + xr) / 2},${round(Y(s.value) + 10, 2)} ${xr - 2},${round(Y(s.value) + 4, 2)}V${bot}H${xl + 2}Z`, class: 'dg-liquid' }));
  body.push(el('path', { d: `M${xl - 6},${top - 4}L${xl},${top}V${bot}H${xr}V${top}`, class: 'dg-ink', 'stroke-width': 2.2, fill: 'none' }));
  body.push(el('path', { d: `M${xl - 22},${bot + 12}H${xr + 22}`, class: 'dg-ink', 'stroke-width': 6 }), el('path', { d: `M${xl},${bot}L${xl - 10},${bot + 10}M${xr},${bot}L${xr + 10},${bot + 10}`, class: 'dg-ink', 'stroke-width': 2 }));
  let d = '';
  for (const t of scaleTicks(s)) {
    const y = round(Y(t.v), 2);
    d += `M${xr - 2},${y}H${xr - (t.major ? 22 : t.half ? 15 : 9)}`;
    if (t.lab) body.push(label(xr + 8, y, fmt(t.v), { size: 12, anchor: 'start', halo: false }));
  }
  body.push(el('path', { d, class: 'dg-ink', 'stroke-width': 1.3 }));
  if (s.unit) body.push(label(xl + 6, top + 14, s.unit, { size: 13, anchor: 'start', weight: 600 }));
  box.rect(xl - 24, top - 8, xr + 70, Hs + 26);
}

function thermoRender(s, box, body) {
  const Hs = 260; const top = 0; const bot = top + Hs;
  const Y = (v) => bot - ((v - s.min) / (s.max - s.min)) * Hs;
  const x = 0; const w = 16; const br = 17;
  body.push(el('rect', { x: x - w / 2, y: top - 16, width: w, height: Hs + 30, rx: w / 2, class: 'dg-glass' }));
  body.push(el('circle', { cx: x, cy: bot + 28, r: br, class: 'dg-red' }));
  if (s.value != null) body.push(el('rect', { x: x - 4.5, y: Y(s.value), width: 9, height: bot + 20 - Y(s.value), class: 'dg-red' }));
  body.push(el('path', { d: `M${x - w / 2},${bot + 14}V${top - 8}A${w / 2},${w / 2} 0 0 1 ${x + w / 2},${top - 8}V${bot + 14}`, class: 'dg-ink', 'stroke-width': 2 }));
  body.push(el('path', { d: `M${x - w / 2},${bot + 14}A${br},${br} 0 1 0 ${x + w / 2},${bot + 14}`, class: 'dg-ink', 'stroke-width': 2 }));
  let d = '';
  for (const t of scaleTicks(s)) {
    const y = round(Y(t.v), 2);
    d += `M${x + w / 2 + 3},${y}H${x + w / 2 + (t.major ? 22 : t.half ? 16 : 10)}`;
    if (t.lab) body.push(label(x + w / 2 + 28, y, fmt(t.v), { size: 12, anchor: 'start', halo: false }));
  }
  body.push(el('path', { d, class: 'dg-ink', 'stroke-width': 1.3 }));
  if (s.unit) body.push(label(x + w / 2 + 28, top - 22, s.unit, { size: 13, anchor: 'start', weight: 600 }));
  box.rect(x - br, top - 34, 2 * br + 70, Hs + 34 + 46);
}

function dialRender(s, box, body) {
  const R = 110; const A0 = 225; const SW = 270; // from 225 degrees clockwise through the top to -45
  const ang = (v) => A0 - ((v - s.min) / (s.max - s.min)) * SW;
  // platform on top
  body.push(el('rect', { x: -90, y: -R - 46, width: 180, height: 10, rx: 4, class: 'dg-fill-ink2' }), el('rect', { x: -10, y: -R - 36, width: 20, height: 24, class: 'dg-fill-ink2' }));
  body.push(el('circle', { cx: 0, cy: 0, r: R + 12, class: 'dg-fill-ink2' }), el('circle', { cx: 0, cy: 0, r: R + 4, class: 'dg-fill-surface' }));
  let d = '';
  for (const t of scaleTicks(s)) {
    const a = ang(t.v);
    d += `M${pt(polar(0, 0, R, a))}L${pt(polar(0, 0, R - (t.major ? 16 : t.half ? 11 : 7), a))}`;
    if (t.lab) { const p = polar(0, 0, R - 30, a); body.push(label(p[0], p[1], fmt(t.v), { size: 13, halo: false, weight: 600 })); }
  }
  body.push(el('path', { d, class: 'dg-ink', 'stroke-width': 1.4 }));
  body.push(el('path', { d: arcPath(0, 0, R, A0 - SW, A0), class: 'dg-ink', 'stroke-width': 1.4 }));
  if (s.unit) body.push(label(0, R * 0.5, s.unit, { size: 15, weight: 700 }));
  if (s.value != null) {
    const a = ang(s.value);
    const tip = polar(0, 0, R - 4, a); const tail = polar(0, 0, 16, a + 180);
    body.push(el('line', { x1: tail[0], y1: tail[1], x2: tip[0], y2: tip[1], class: 'dg-red-l', 'stroke-width': 3, 'stroke-linecap': 'round' }));
  }
  body.push(el('circle', { cx: 0, cy: 0, r: 7, class: 'dg-fill-ink' }));
  box.circle(0, 0, R + 12).add(0, -R - 46);
}

const KIND_NAME = { ruler: 'ruler', jug: 'measuring jug', thermometer: 'thermometer', weighing: 'weighing scale with a dial', cylinder: 'measuring cylinder', newtonMeter: 'newton meter (spring balance)' };

/** A newton meter: a spring balance hanging from a ring, scale downwards from 0, pointer at the reading. */
function newtonRender(s, box, body) {
  const top = 40; const Hs = 240; const bot = top + Hs;
  const Y = (v) => top + ((v - s.min) / (s.max - s.min)) * Hs;
  const W = 46;
  body.push(el('circle', { cx: 0, cy: 4, r: 11, class: 'dg-ink', 'stroke-width': 3 }), el('line', { x1: 0, y1: 15, x2: 0, y2: top - 14, class: 'dg-ink', 'stroke-width': 3 }));
  body.push(el('rect', { x: -W / 2, y: top - 16, width: W, height: Hs + 32, rx: 8, class: 'dg-glass' }), el('rect', { x: -W / 2, y: top - 16, width: W, height: Hs + 32, rx: 8, class: 'dg-ink', 'stroke-width': 2 }));
  // the spring down to the pointer
  const v = s.value != null ? s.value : s.min;
  const py = Y(v);
  let z = `M0,${top - 14}`;
  const coils = 10; const span = Math.max(8, py - (top - 6));
  for (let i = 1; i <= coils; i++) z += `L${i % 2 ? -8 : 8},${round(top - 10 + (span * i) / coils, 2)}`;
  z += `L0,${round(py, 2)}`;
  body.push(el('path', { d: z, class: 'dg-ink2', 'stroke-width': 1.6, fill: 'none' }));
  let d = '';
  for (const t of scaleTicks(s)) {
    const y = round(Y(t.v), 2);
    d += `M${W / 2 - 2},${y}H${W / 2 - (t.major ? 14 : t.half ? 10 : 6)}`;
    if (t.lab) body.push(label(W / 2 + 6, y, fmt(t.v), { size: 12, anchor: 'start', halo: false }));
  }
  body.push(el('path', { d, class: 'dg-ink', 'stroke-width': 1.3 }));
  body.push(el('rect', { x: -W / 2 + 4, y: py - 2, width: W - 8, height: 4, rx: 2, class: 'dg-red' }));
  if (s.unit) body.push(label(W / 2 + 6, top - 26, s.unit, { size: 13, anchor: 'start', weight: 600 }));
  // the hook and the load
  body.push(el('line', { x1: 0, y1: py + 2, x2: 0, y2: bot + 30, class: 'dg-ink', 'stroke-width': 3 }));
  body.push(el('path', { d: `M0,${bot + 30}q0,12 -9,12q-9,0 -9,-9`, class: 'dg-ink', 'stroke-width': 3, fill: 'none' }));
  body.push(el('path', { d: `M-26,${bot + 52}H26L34,${bot + 92}H-34Z`, class: 'dg-fill-ink2' }), el('line', { x1: 0, y1: bot + 42, x2: 0, y2: bot + 52, class: 'dg-ink', 'stroke-width': 2 }));
  if (s.load) { body.push(label(40, bot + 72, s.load, { size: 14, weight: 600, anchor: 'start' })); box.text(40, bot + 72, s.load, 14, 'start'); }
  box.rect(-W / 2 - 14, -8, W + 60, bot + 104);
}
const scale = {
  size: 'medium',
  schema: {
    kind: F.enum('ruler', 'jug', 'cylinder', 'thermometer', 'weighing', 'newtonMeter'), min: F.num(), max: F.num(), major: F.num(0.000001), minor: F.num(0.000001), load: F.str,
    labelEvery: F.int(1, 10), unit: F.str, value: F.num(), from: F.num(), object: F.enum('bar', 'pencil', 'ribbon'),
  },
  required: ['kind', 'min', 'max', 'major'],
  check(s) {
    const e = [];
    if (!(s.max > s.min)) e.push('max must be more than min');
    const n = (s.max - s.min) / s.major;
    if (Math.abs(n - Math.round(n)) > 1e-9) e.push('max - min must be a whole number of major steps');
    if (n > 30) e.push('at most 30 major steps');
    if (s.minor) { const r = s.major / s.minor; if (Math.abs(r - Math.round(r)) > 1e-9) e.push('minor must divide major exactly'); if ((s.max - s.min) / s.minor > 200) e.push('at most 200 small steps'); }
    if (s.value != null && (s.value < s.min - 1e-9 || s.value > s.max + 1e-9)) e.push('value is outside the scale');
    if (s.from != null && s.kind !== 'ruler') e.push('from is for rulers');
    if (s.load != null && s.kind !== 'newtonMeter') e.push('load is for newton meters');
    if (s.from != null && s.value != null && s.from >= s.value) e.push('from must be less than value');
    return e;
  },
  render(s, ctx) {
    const box = new Box();
    const body = [];
    if (s.kind === 'ruler') rulerRender(s, box, body);
    else if (s.kind === 'jug') jugRender(s, box, body, ctx);
    else if (s.kind === 'cylinder') cylinderRender(s, box, body);
    else if (s.kind === 'thermometer') thermoRender(s, box, body);
    else if (s.kind === 'newtonMeter') newtonRender(s, box, body);
    else dialRender(s, box, body);
    return { box, body, scale: s.kind === 'thermometer' ? 0.9 : 1 };
  },
  describe(s) {
    const u = s.unit ? ` ${tidy(s.unit)}` : '';
    const parts = [`A ${KIND_NAME[s.kind]} marked from ${fmt(s.min)} to ${fmt(s.max)}${u}, numbered every ${fmt(s.major * (s.labelEvery || 1))}${s.minor && s.minor < s.major ? `, with ${Math.round(s.major / s.minor)} small divisions between large marks` : ''}.`];
    if (s.value != null) {
      if (s.kind === 'ruler') parts.push(`The ${s.object || 'bar'} starts ${scalePosition(s, s.from != null ? s.from : s.min, 'after')} and ends ${scalePosition(s, s.value, 'after')}.`);
      else if (s.kind === 'jug' || s.kind === 'cylinder') parts.push(`The liquid comes up to the level ${scalePosition(s, s.value)}.`);
      else if (s.kind === 'thermometer') parts.push(`The liquid in the tube reaches ${scalePosition(s, s.value)}.`);
      else if (s.kind === 'newtonMeter') parts.push(`${s.load ? `A load labelled ${say(s.load)} hangs from the hook. ` : 'A load hangs from the hook. '}The pointer is ${scalePosition(s, s.value, 'after')}.`);
      else parts.push(`The pointer is ${scalePosition(s, s.value, 'after')}.`);
    }
    return parts.join(' ');
  },
};

// ---------------------------------------------------------------- spinner

const COLOURS = { red: '#f28b82', blue: '#8ab4f8', green: '#81c995', yellow: '#fdd663', orange: '#fcad70', purple: '#c58af9', pink: '#ff8bcb', white: '#ffffff', black: '#3c4043', grey: '#bdc1c6', gray: '#bdc1c6' };
const spinner = {
  size: 'small',
  schema: { sectors: F.arr(F.label, 2, 12), sizes: F.arr(F.num(0.0001), 2, 12), pointer: F.nullable(F.num(-360, 720)) },
  required: ['sectors'],
  check(s) { return s.sizes && s.sizes.length !== s.sectors.length ? ['sizes needs one number per sector'] : []; },
  render(s) {
    const R = 100;
    const box = new Box().circle(0, 0, R + 4);
    const body = [];
    const sizes = s.sizes || s.sectors.map(() => 1);
    const total = sizes.reduce((a, b) => a + b, 0);
    let a = 90;
    s.sectors.forEach((name, i) => {
      const sw = (sizes[i] / total) * 360;
      const key = String(name).toLowerCase().trim();
      const fill = COLOURS[key];
      body.push(el('path', { d: sectorPath(0, 0, R, a - sw, a), fill: fill || null, class: fill ? null : (i % 2 ? 'dg-shade2' : 'dg-fill-surface') }));
      const m = polar(0, 0, R * (s.sectors.length > 8 ? 0.74 : 0.68), a - sw / 2);
      body.push(el('text', { x: m[0], y: m[1], 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': s.sectors.length > 8 ? 12 : 14, 'font-weight': 600, fill: fill ? (key === 'black' ? '#ffffff' : '#1b1b1a') : null, class: fill ? null : 'dg-t' }, tidy(String(name))));
      a -= sw;
    });
    a = 90;
    let d = '';
    for (const sz of sizes) { const p = polar(0, 0, R, a); d += `M0,0L${pt(p)}`; a -= (sz / total) * 360; }
    body.push(el('path', { d, class: 'dg-ink', 'stroke-width': 1.8 }), el('circle', { cx: 0, cy: 0, r: R, class: 'dg-ink', 'stroke-width': 2.4 }));
    if (s.pointer !== null) {
      const ang = s.pointer ?? 60;
      const tip = polar(0, 0, R * 0.46, ang);
      body.push(el('line', { x1: 0, y1: 0, x2: polar(0, 0, R * 0.46 - 10, ang)[0], y2: polar(0, 0, R * 0.46 - 10, ang)[1], class: 'dg-ink', 'stroke-width': 4 }), arrowHead(tip[0], tip[1], ang, 15));
    }
    body.push(el('circle', { cx: 0, cy: 0, r: 6, class: 'dg-fill-ink' }));
    return { box, body };
  },
  describe(s) {
    const sizes = s.sizes || s.sectors.map(() => 1);
    const equal = sizes.every((x) => x === sizes[0]);
    const counts = {};
    s.sectors.forEach((n, i) => { const k = tidy(String(n)); counts[k] = (counts[k] || 0) + sizes[i]; });
    const parts = [`A spinner with ${s.sectors.length} ${equal ? 'equal' : 'unequal'} sections, clockwise from the top: ${listText(s.sectors.map((x) => say(x)))}.`];
    if (equal && Object.values(counts).some((v) => v > 1)) parts.push(`${cap(listText(Object.entries(counts).map(([k, v]) => `${v} ${v === 1 ? 'section' : 'sections'} ${/^-?\d/.test(k) ? `show ${k}` : k}`)))}.`);
    else {
      const total = sizes.reduce((a, b) => a + b, 0);
      parts.push(`${cap(listText(s.sectors.map((n, i) => `the ${tidy(String(n))} section is ${round((sizes[i] / total) * 360, 1)}°`)))}.`);
    }
    return parts.join(' ');
  },
};
const cap = (t) => (t ? t[0].toUpperCase() + t.slice(1) : t);

export const MEASURES = { clock, scale, spinner };
export { plural, textWidth, g };
