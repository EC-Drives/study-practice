// Diagram renderer core: a tiny node builder (renders to DOM or to an HTML string), exact
// fractions, text helpers, labels with halos, answer boxes, arrowheads, and the field checker.
// Pure data in, pure data out: nothing here touches the page except toDom().

// ---------------------------------------------------------------- nodes

const SVG_NS = 'http://www.w3.org/2000/svg';
const SVG_TAGS = new Set(['svg', 'g', 'path', 'line', 'polyline', 'polygon', 'rect', 'circle', 'ellipse', 'text', 'tspan', 'title', 'desc', 'defs', 'clipPath', 'mask', 'use', 'pattern', 'linearGradient', 'radialGradient', 'stop']);

/** A node: { tag, attrs, kids }. Children may be nodes, strings, numbers, null/false (skipped) or arrays. */
export function el(tag, attrs, ...kids) {
  return { tag, attrs: attrs || {}, kids: flat(kids) };
}
function flat(kids) {
  const out = [];
  for (const k of kids) {
    if (k == null || k === false) continue;
    if (Array.isArray(k)) out.push(...flat(k));
    else out.push(k);
  }
  return out;
}
export const g = (attrs, ...kids) => el('g', attrs, ...kids);

const r2 = (v) => (typeof v === 'number' ? String(Math.round(v * 100) / 100) : v);

/** Render a node tree as DOM. `svg` is true inside an <svg>. */
export function toDom(node, svg = false) {
  if (typeof node === 'string' || typeof node === 'number') return document.createTextNode(String(node));
  const isSvg = svg || node.tag === 'svg' || (SVG_TAGS.has(node.tag) && svg);
  const e = isSvg ? document.createElementNS(SVG_NS, node.tag) : document.createElement(node.tag);
  for (const [k, v] of Object.entries(node.attrs)) {
    if (v == null || v === false) continue;
    e.setAttribute(k, v === true ? '' : r2(v));
  }
  for (const k of node.kids) e.appendChild(toDom(k, isSvg && node.tag !== 'foreignObject'));
  return e;
}

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const VOID = new Set(['br', 'img', 'input', 'meta', 'link', 'hr', 'col']);
/** Render a node tree as an HTML/SVG string. */
export function toHtml(node) {
  if (typeof node === 'string' || typeof node === 'number') return escapeHtml(node);
  let s = `<${node.tag}`;
  if (node.tag === 'svg' && !node.attrs.xmlns) s += ` xmlns="${SVG_NS}"`;
  for (const [k, v] of Object.entries(node.attrs)) {
    if (v == null || v === false) continue;
    s += v === true ? ` ${k}` : ` ${k}="${escapeHtml(r2(v))}"`;
  }
  if (VOID.has(node.tag)) return `${s}>`;
  return `${s}>${node.kids.map(toHtml).join('')}</${node.tag}>`;
}

// ---------------------------------------------------------------- numbers and fractions

const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a; };

/** An exact fraction { n, d } (d > 0) from a number or a string "3/4", "-1 1/2", "0.25". */
export function frac(v) {
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) return null;
    if (Number.isInteger(v)) return { n: v, d: 1 };
    // a decimal with up to 6 places is exact
    const s = String(v);
    const m = s.match(/^(-?)(\d+)\.(\d{1,6})$/);
    if (m) {
      const d = 10 ** m[3].length;
      const n = (Number(m[2]) * d + Number(m[3])) * (m[1] ? -1 : 1);
      const k = gcd(n, d);
      return { n: n / k, d: d / k };
    }
    return { n: v, d: 1, approx: true };
  }
  if (typeof v !== 'string') return null;
  const t = v.trim().replace(/[−–]/g, '-');
  let m;
  if ((m = t.match(/^(-?)(\d+)\s+(\d+)\/(\d+)$/))) {
    const d = Number(m[4]);
    if (!d) return null;
    const n = (Number(m[2]) * d + Number(m[3])) * (m[1] ? -1 : 1);
    const k = gcd(n, d);
    return { n: n / k, d: d / k };
  }
  if ((m = t.match(/^(-?\d+)\/(\d+)$/))) {
    const n = Number(m[1]);
    const d = Number(m[2]);
    if (!d) return null;
    const k = gcd(n, d) || 1;
    return { n: n / k, d: d / k };
  }
  if (/^-?\d+(\.\d+)?$/.test(t)) return frac(Number(t));
  return null;
}
export const fval = (f) => f.n / f.d;
export const num = (v) => { const f = frac(v); return f ? fval(f) : NaN; };

/** Write a value as text: "3/4", "1 1/4", "0.75" or "-2". */
export function formatValue(v, format = 'auto') {
  const f = typeof v === 'object' && v ? v : frac(v);
  if (!f) return String(v);
  const neg = f.n < 0;
  const n = Math.abs(f.n);
  if (f.d === 1 || f.approx) return `${neg ? '-' : ''}${f.approx ? round(n, 3) : n}`;
  if (format === 'decimal') return `${neg ? '-' : ''}${round(n / f.d, 4)}`;
  if (format === 'mixed' && n > f.d) return `${neg ? '-' : ''}${Math.floor(n / f.d)} ${n % f.d}/${f.d}`;
  return `${neg ? '-' : ''}${n}/${f.d}`;
}
export function round(x, dp = 2) {
  const p = 10 ** dp;
  return Math.round(x * p + (x >= 0 ? 1e-9 : -1e-9)) / p;
}

/** A clean step (1, 2, 2.5 or 5 times a power of ten) giving about `n` intervals. */
export function niceStep(range, n = 5) {
  if (!(range > 0)) return 1;
  const raw = range / n;
  const p = 10 ** Math.floor(Math.log10(raw));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= raw - 1e-12) return m * p;
  return 10 * p;
}

// ---------------------------------------------------------------- text

const SUPER = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹', '-': '⁻' };
/** "cm^2" -> "cm²", "7^2" -> "7²", and a hyphen-minus before a digit becomes a true minus. */
export function tidy(text) {
  return String(text ?? '')
    .replace(/\^(-?\d+)/g, (_, d) => [...d].map((c) => SUPER[c]).join(''))
    .replace(/(^|[\s(\[,=])-(?=\d)/g, '$1−');
}

/** Rough width of a string in a sans font at `size` px (no DOM needed). */
export function textWidth(text, size = 15) {
  let w = 0;
  for (const c of String(text)) {
    if (/[ilI.,:;'|!]/.test(c)) w += 0.28;
    else if (/[mwMW]/.test(c)) w += 0.86;
    else if (/[A-Z0-9?]/.test(c)) w += 0.64;
    else if (c === ' ') w += 0.28;
    else w += 0.54;
  }
  return w * size;
}

/** Split text into lines no wider than `max` px. */
export function wrap(text, max, size = 15) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let cur = '';
  for (const w of words) {
    const t = cur ? `${cur} ${w}` : w;
    if (cur && textWidth(t, size) > max) { lines.push(cur); cur = w; } else cur = t;
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [''];
}

/**
 * A text label. "?" becomes an answer box. Options: anchor (start|middle|end), size, cls, halo
 * (a surface-coloured outline so the text reads over lines), weight, baseline (middle default).
 */
export function label(x, y, text, o = {}) {
  const s = tidy(text);
  const size = o.size || 15;
  if (s === '?' || s === '') {
    if (s === '') return null;
    return answerBox(x, y, o.anchor, size);
  }
  const lines = o.maxWidth ? wrap(s, o.maxWidth, size) : [s];
  const lh = size * 1.2;
  const y0 = y - ((lines.length - 1) * lh) / 2;
  return el('text', {
    x, y: y0, class: `dg-t${o.cls ? ` ${o.cls}` : ''}${o.halo === false ? '' : ' dg-halo'}`,
    'text-anchor': o.anchor || 'middle', 'dominant-baseline': 'central', 'font-size': size,
    'font-weight': o.weight || null, 'font-style': o.italic ? 'italic' : null,
  }, lines.length === 1 ? lines[0] : lines.map((t, i) => el('tspan', { x, dy: i === 0 ? 0 : lh }, t)));
}

/** A dashed box with a "?" in it: the thing the question asks for. */
export function answerBox(x, y, anchor = 'middle', size = 15) {
  const w = size * 1.6;
  const h = size * 1.5;
  const left = anchor === 'start' ? x : anchor === 'end' ? x - w : x - w / 2;
  return g({ class: 'dg-qbox' },
    el('rect', { x: left, y: y - h / 2, width: w, height: h, rx: 4, class: 'dg-qbox-r' }),
    el('text', { x: left + w / 2, y, 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': size, class: 'dg-t dg-qbox-t' }, '?'));
}

/** A stacked fraction label (numerator over a bar over denominator), or plain text for whole numbers. */
export function fracLabel(x, y, text, o = {}) {
  const s = String(text);
  const size = o.size || 14;
  let m = s.match(/^(−|-)?(?:(\d+)\s+)?(\d+)\/(\d+)$/);
  if (!m) return label(x, y, s, o);
  const [, sign, whole, n, d] = m;
  const fw = Math.max(textWidth(n, size), textWidth(d, size)) + 4;
  const ww = whole ? textWidth(whole, size * 1.05) + 2 : 0;
  const sw = sign ? textWidth('−', size) : 0;
  const total = sw + ww + fw;
  const left = x - total / 2;
  const fx = left + sw + ww + fw / 2;
  return g({ class: 'dg-frac' },
    sign ? el('text', { x: left, y, 'dominant-baseline': 'central', 'font-size': size, class: 'dg-t dg-halo' }, '−') : null,
    whole ? el('text', { x: left + sw, y, 'dominant-baseline': 'central', 'font-size': size * 1.05, class: 'dg-t dg-halo' }, whole) : null,
    el('text', { x: fx, y: y - size * 0.62, 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': size, class: 'dg-t dg-halo' }, n),
    el('line', { x1: fx - fw / 2, x2: fx + fw / 2, y1: y, y2: y, class: 'dg-ink', 'stroke-width': 1.3 }),
    el('text', { x: fx, y: y + size * 0.66, 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': size, class: 'dg-t dg-halo' }, d));
}

// ---------------------------------------------------------------- shapes

export const pt = (p) => `${r2(p[0])},${r2(p[1])}`;
export const pathOf = (pts, close = true) => `M${pts.map(pt).join('L')}${close ? 'Z' : ''}`;
export const rad = (deg) => (deg * Math.PI) / 180;
/** A point at `dist` from (x, y) in direction `deg` (anticlockwise from east, screen y down). */
export const polar = (x, y, dist, deg) => [x + dist * Math.cos(rad(deg)), y - dist * Math.sin(rad(deg))];

/** A filled arrowhead with its tip at (x, y), pointing along `deg` (screen angle, anticlockwise from east). */
export function arrowHead(x, y, deg, size = 9, cls = 'dg-fill-ink') {
  const a = polar(x, y, size, deg + 180 - 24);
  const b = polar(x, y, size, deg + 180 + 24);
  return el('path', { d: pathOf([[x, y], a, b]), class: cls });
}
/** Direction (degrees, anticlockwise from east, for screen coordinates) from p to q. */
export const dirOf = (p, q) => (Math.atan2(-(q[1] - p[1]), q[0] - p[0]) * 180) / Math.PI;

/** A line from p to q with an arrowhead at q (and optionally one in the middle instead). */
export function arrowLine(p, q, o = {}) {
  const d = dirOf(p, q);
  const cls = o.cls || 'dg-ink';
  if (o.mid) {
    const m = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
    const tip = polar(m[0], m[1], (o.size || 9) / 2, d);
    return g({}, el('line', { x1: p[0], y1: p[1], x2: q[0], y2: q[1], class: cls, 'stroke-width': o.width || 2 }), arrowHead(tip[0], tip[1], d, o.size || 9, o.headCls || 'dg-fill-ink'));
  }
  const end = polar(q[0], q[1], (o.size || 9) * 0.7, d + 180);
  return g({}, el('line', { x1: p[0], y1: p[1], x2: end[0], y2: end[1], class: cls, 'stroke-width': o.width || 2, 'stroke-dasharray': o.dashed ? '6 4' : null }), arrowHead(q[0], q[1], d, o.size || 9, o.headCls || 'dg-fill-ink'));
}

/** Tick marks across a segment (equal sides). */
export function sideTicks(p, q, n = 1, len = 10, shift = 0) {
  const m0 = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
  const m = polar(m0[0], m0[1], shift, dirOf(p, q));
  const d = dirOf(p, q);
  const out = [];
  for (let i = 0; i < n; i++) {
    const off = (i - (n - 1) / 2) * 5;
    const c = polar(m[0], m[1], off, d);
    const a = polar(c[0], c[1], len / 2, d + 90);
    const b = polar(c[0], c[1], len / 2, d - 90);
    out.push(el('line', { x1: a[0], y1: a[1], x2: b[0], y2: b[1], class: 'dg-ink', 'stroke-width': 1.8 }));
  }
  return out;
}

/** Parallel-side arrows (chevrons) on a segment. */
export function sideArrows(p, q, n = 1, shift = 0) {
  // parallel sides get arrows pointing the same way: always rightwards (or upwards)
  let d = dirOf(p, q);
  const nd = ((d % 360) + 360) % 360;
  if (nd > 90.001 && nd <= 270.001) d += 180;
  const m0 = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
  const m = polar(m0[0], m0[1], shift, d);
  const out = [];
  for (let i = 0; i < n; i++) {
    const c = polar(m[0], m[1], (i - (n - 1) / 2) * 7 + 3, d);
    const a = polar(c[0], c[1], 8, d + 180 - 35);
    const b = polar(c[0], c[1], 8, d + 180 + 35);
    out.push(el('path', { d: `M${pt(a)}L${pt(c)}L${pt(b)}`, class: 'dg-ink', fill: 'none', 'stroke-width': 1.8, 'stroke-linejoin': 'round' }));
  }
  return out;
}

/** Arc path centred (cx, cy) from direction a1 anticlockwise to a2 (degrees, screen). */
export function arcPath(cx, cy, r, a1, a2) {
  let sweep = a2 - a1;
  while (sweep < 0) sweep += 360;
  while (sweep > 360) sweep -= 360;
  const p = polar(cx, cy, r, a1);
  const q = polar(cx, cy, r, a1 + sweep);
  if (sweep >= 359.99) {
    const m = polar(cx, cy, r, a1 + 180);
    return `M${pt(p)}A${r2(r)},${r2(r)} 0 1 0 ${pt(m)}A${r2(r)},${r2(r)} 0 1 0 ${pt(p)}`;
  }
  return `M${pt(p)}A${r2(r)},${r2(r)} 0 ${sweep > 180 ? 1 : 0} 0 ${pt(q)}`;
}
/** A pie-slice path. */
export function sectorPath(cx, cy, r, a1, a2) {
  return `M${r2(cx)},${r2(cy)}L${arcPath(cx, cy, r, a1, a2).slice(1)}Z`;
}

// ---------------------------------------------------------------- field checker

/**
 * Field validators. Each takes (value, path) and returns an error string or null.
 * `fields(spec, schema, path)` checks required keys, unknown keys and each value.
 */
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
export const F = {
  any: () => null,
  str: (v, p) => (typeof v === 'string' ? null : `${p} should be text`),
  bool: (v, p) => (typeof v === 'boolean' ? null : `${p} should be true or false`),
  num: (min = -Infinity, max = Infinity) => (v, p) => (isNum(v) && v >= min && v <= max ? null : `${p} should be a number${min > -Infinity ? ` from ${min}` : ''}${max < Infinity ? ` to ${max}` : ''}`),
  int: (min = -Infinity, max = Infinity) => (v, p) => (Number.isInteger(v) && v >= min && v <= max ? null : `${p} should be a whole number${min > -Infinity ? ` from ${min}` : ''}${max < Infinity ? ` to ${max}` : ''}`),
  frac: (v, p) => (frac(v) && !frac(v).approx ? null : `${p} should be a number or a fraction such as "3/4"`),
  enum: (...vals) => (v, p) => (vals.includes(v) ? null : `${p} should be one of: ${vals.join(', ')}`),
  label: (v, p) => (typeof v === 'string' || isNum(v) ? null : `${p} should be text`),
  point: (v, p) => (Array.isArray(v) && v.length === 2 && v.every((x) => frac(x) && !frac(x).approx) ? null : `${p} should be [x, y]`),
  arr: (item, min = 0, max = Infinity) => (v, p) => {
    if (!Array.isArray(v)) return `${p} should be a list`;
    if (v.length < min || v.length > max) return `${p} should have ${min === max ? min : `${min} to ${max === Infinity ? 'any number of' : max}`} items (has ${v.length})`;
    for (let i = 0; i < v.length; i++) {
      const e = item(v[i], `${p}[${i}]`);
      if (e) return e;
    }
    return null;
  },
  nullable: (f) => (v, p) => (v === null ? null : f(v, p)),
  obj: (schema, required = []) => (v, p) => {
    if (!v || typeof v !== 'object' || Array.isArray(v)) return `${p} should be an object`;
    const errs = fields(v, schema, p, required);
    return errs.length ? errs[0] : null;
  },
  oneOf: (...fs) => (v, p) => {
    const errs = fs.map((f) => f(v, p));
    return errs.every(Boolean) ? errs[0] : null;
  },
};

export const COMMON_FIELDS = {
  type: F.str, alt: F.str, caption: F.str, size: F.enum('small', 'medium', 'large'), notToScale: F.bool,
};

export function fields(spec, schema, path = 'diagram', required = []) {
  const errs = [];
  for (const k of required) if (!(k in spec)) errs.push(`${path}.${k} is missing`);
  for (const [k, v] of Object.entries(spec)) {
    const f = schema[k] || (path === 'diagram' ? COMMON_FIELDS[k] : null);
    if (!f) { errs.push(`${path}.${k} is not a field of this diagram type`); continue; }
    const e = f(v, `${path}.${k}`);
    if (e) errs.push(e);
  }
  return errs;
}

// ---------------------------------------------------------------- description helpers

export const listText = (items) => {
  const a = items.filter((x) => x !== '' && x != null).map(String);
  if (a.length <= 1) return a.join('');
  return `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`;
};
/** Text as it should be read: "?" becomes "a box to fill in". */
export const say = (t) => (String(t).trim() === '?' ? 'a question mark (the value to find)' : tidy(t));
export const plural = (n, word, many = `${word}s`) => `${n} ${n === 1 ? word : many}`;

/** "a" or "an" for the sound the phrase starts with: an octagon, an 8-sided shape, an 11, a unit, an hour. */
export function article(phrase) {
  const t = String(phrase ?? '').trim().toLowerCase().replace(/^["'(]+/, '');
  const m = t.match(/^\d[\d,]*/);
  if (m) {
    // said as a number: 8, 80, 800, 8000 ("eight ..."), 11, 18, 11 000, 18 000 ("eleven ...", "eighteen ...")
    const d = m[0].replace(/,/g, '');
    if (d[0] === '8') return 'an';
    return /^1[18]$/.test(d.slice(0, ((d.length - 1) % 3) + 1)) ? 'an' : 'a';
  }
  if (/^(hour|honest|honou?r|heir)/.test(t)) return 'an';
  if (/^(uni|use|usu|uti|ura|ure|uro|eu|ewe|one\b|once)/.test(t)) return 'a';
  return /^[aeiou]/.test(t) ? 'an' : 'a';
}
/** The phrase with "a" or "an" in front; `cap` starts it with a capital ("An octagon"). */
export const withArticle = (phrase, cap = false) => {
  const a = article(phrase);
  return `${cap ? a[0].toUpperCase() + a.slice(1) : a} ${phrase}`;
};

/**
 * Which marks on a chart axis carry a number, so the numbers never touch: every mark when there is
 * room, otherwise every 2nd, 5th, 10th ... mark (gridlines and ticks stay at every mark).
 *   min, step   the first mark's value and the gap between marks
 *   count       number of gaps (marks are 0..count)
 *   stepPx      distance between neighbouring marks on screen
 *   need        room one number takes along the axis, gap included (its width on a horizontal
 *               axis, its height on a vertical one)
 * Prefers a spacing that numbers both ends when the next spacing up would do that, and round values
 * (0, 10, 20 rather than 2, 12, 22). Returns { every, first, shows(i) } where i is the mark's index.
 */
export function axisLabels(min, step, count, stepPx, need) {
  const KS = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000];
  const fits = KS.filter((k) => k * stepPx >= need - 1e-9);
  let every = fits.length ? fits[0] : KS[KS.length - 1];
  if (every > 1 && count % every !== 0 && fits[1] != null && count % fits[1] === 0) every = fits[1];
  let first = 0;
  if (every > 1) {
    const big = step * every;
    for (let i = 0; i < every; i++) {
      const v = (min + i * step) / big;
      if (Math.abs(v - Math.round(v)) < 1e-6) { first = i; break; }
    }
  }
  return { every, first, shows: (i) => i >= first && (i - first) % every === 0 };
}
/** Room a vertical axis's numbers need, one above the next. */
export const rowNeed = (size) => size * 1.25;
/** Room a horizontal axis's numbers need, side by side: the widest number and a gap. */
export const colNeed = (texts, size) => Math.max(0, ...texts.map((t) => textWidth(t, size))) + 8;
const axisNum = (v) => tidy(String(round(v, 4)));
/**
 * The marks of a number scale from min to max (worked out by index, so no rounding drift) and which
 * of them carry a number: { vals, every, first, shows(i) }. lenPx is the axis length on screen;
 * horizontal is true for an axis that runs across (numbers side by side); size is the font size.
 */
export function scaleMarks(min, max, step, lenPx, horizontal, size, fmt = axisNum) {
  const vals = [];
  for (let i = 0; min + i * step <= max + 1e-9; i++) vals.push(min + i * step);
  const count = vals.length - 1;
  const stepPx = max > min ? (lenPx * step) / (max - min) : lenPx;
  const need = horizontal ? colNeed(vals.map(fmt), size) : rowNeed(size);
  return { vals, ...axisLabels(min, step, count, stepPx, need) };
}

// ---------------------------------------------------------------- bounds

/** Collects the extent of everything drawn, so the picture's frame always fits its labels. */
export class Box {
  constructor() { this.x0 = Infinity; this.y0 = Infinity; this.x1 = -Infinity; this.y1 = -Infinity; }
  add(x, y) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return this;
    this.x0 = Math.min(this.x0, x); this.y0 = Math.min(this.y0, y);
    this.x1 = Math.max(this.x1, x); this.y1 = Math.max(this.y1, y);
    return this;
  }
  addPts(pts) { for (const p of pts) this.add(p[0], p[1]); return this; }
  rect(x, y, w, h) { return this.add(x, y).add(x + w, y + h); }
  circle(cx, cy, r) { return this.add(cx - r, cy - r).add(cx + r, cy + r); }
  /** Room for a text label placed with label(). */
  text(x, y, text, size = 15, anchor = 'middle', maxWidth = 0) {
    const s = tidy(text);
    if (s === '?') {
      const w = size * 1.6;
      const left = anchor === 'start' ? x : anchor === 'end' ? x - w : x - w / 2;
      return this.rect(left, y - size * 0.75, w, size * 1.5);
    }
    const lines = maxWidth ? wrap(s, maxWidth, size) : [s];
    const w = Math.max(...lines.map((l) => textWidth(l, size))) + 4;
    const h = lines.length * size * 1.2;
    const left = anchor === 'start' ? x - 2 : anchor === 'end' ? x - w + 2 : x - w / 2;
    return this.rect(left, y - h / 2, w, h);
  }
  get w() { return this.x1 - this.x0; }
  get h() { return this.y1 - this.y0; }
}

/** Offset needed to push a w x h label clear of a point along unit direction (ux, uy). */
export function clearance(w, h, ux, uy, gap = 6) {
  return gap + Math.abs(ux) * (w / 2) + Math.abs(uy) * (h / 2);
}

/** Place a label beside an anchor point in direction `deg`, clear of it. Returns { node, x, y }. */
export function labelAt(box, ax, ay, deg, text, o = {}) {
  const size = o.size || 15;
  const s = tidy(text);
  const w = s === '?' ? size * 1.6 : textWidth(s, size) + 4;
  const h = s === '?' ? size * 1.5 : size * 1.2;
  const ux = Math.cos(rad(deg));
  const uy = -Math.sin(rad(deg));
  const d = clearance(w, h, ux, uy, o.gap ?? 6);
  const x = ax + ux * d;
  const y = ay + uy * d;
  box.text(x, y, s, size);
  return { node: label(x, y, s, o), x, y };
}
