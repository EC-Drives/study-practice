// Visuals: score ring, question pictograms, column chart with hover, mastery meters.
// Colours come from CSS custom properties (see css/app.css), so light and dark both work.
// Every chart has its numbers available as text too (labels, a table, or a tooltip).

import { h, icon } from './ui.js';
import { LEVELS } from './stats.js';

const SVG = 'http://www.w3.org/2000/svg';
function s(tag, attrs = {}, ...kids) {
  const el = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null) el.setAttribute(k, String(v));
  for (const k of kids) if (k) el.appendChild(typeof k === 'string' ? document.createTextNode(k) : k);
  return el;
}

/** Big ring showing a percentage, with the number in the middle. */
export function scoreRing(fraction, o = {}) {
  const size = o.size || 180;
  const stroke = o.stroke || 18;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const f = Math.max(0, Math.min(1, fraction || 0));
  const svg = s('svg', { viewBox: `0 0 ${size} ${size}`, width: size, height: size, class: 'ring', role: 'img', 'aria-label': o.label || `${Math.round(f * 100)} percent` },
    s('circle', { cx: size / 2, cy: size / 2, r, fill: 'none', class: 'ring-track', 'stroke-width': stroke }),
    s('circle', {
      cx: size / 2, cy: size / 2, r, fill: 'none', class: 'ring-fill', 'stroke-width': stroke, 'stroke-linecap': 'round',
      'stroke-dasharray': `${(c * f).toFixed(2)} ${c.toFixed(2)}`, transform: `rotate(-90 ${size / 2} ${size / 2})`,
    }),
    s('text', { x: size / 2, y: size / 2 + (o.sub ? -2 : 4), 'text-anchor': 'middle', 'dominant-baseline': 'middle', class: 'ring-num' }, `${Math.round(f * 100)}%`),
    o.sub ? s('text', { x: size / 2, y: size / 2 + 28, 'text-anchor': 'middle', class: 'ring-sub' }, o.sub) : null);
  if (f === 0) svg.querySelector('.ring-fill').setAttribute('stroke-dasharray', `0 ${c}`);
  return svg;
}

export function starSvg(kind) {
  const path = 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z';
  const svg = s('svg', { viewBox: '0 0 24 24', width: 30, height: 30, 'aria-hidden': 'true' });
  if (kind === 'right') svg.appendChild(s('path', { d: path, class: 'pg-star', 'stroke-width': 1.5, 'stroke-linejoin': 'round' }));
  else if (kind === 'part') {
    const id = `half-${Math.random().toString(36).slice(2, 8)}`;
    svg.appendChild(s('defs', {}, s('clipPath', { id }, s('rect', { x: 0, y: 0, width: 12, height: 24 }))));
    svg.appendChild(s('path', { d: path, class: 'pg-star-outline', fill: 'none', 'stroke-width': 1.6, 'stroke-linejoin': 'round' }));
    svg.appendChild(s('path', { d: path, class: 'pg-star', 'clip-path': `url(#${id})`, 'stroke-width': 1.5, 'stroke-linejoin': 'round' }));
  } else if (kind === 'wrong') {
    svg.appendChild(s('circle', { cx: 12, cy: 12, r: 8, class: 'pg-notyet', fill: 'none', 'stroke-width': 2.2 }));
  } else {
    svg.appendChild(s('circle', { cx: 12, cy: 12, r: 8, class: 'pg-skip', fill: 'none', 'stroke-width': 2, 'stroke-dasharray': '3 3' }));
  }
  return svg;
}

export function attemptKind(a) {
  if (!a.answered) return 'skip';
  if (a.correct) return 'right';
  if (a.earned > 0) return 'part';
  return 'wrong';
}

const KIND_LABEL = { right: 'Right', part: 'Part right', wrong: 'Not yet', skip: 'Not answered' };

/** One pictogram per question (star = right, half star = part right, ring = not yet). */
export function pictograms(attempts, onPick, labelOf = (i) => String(i + 1)) {
  const wrap = h('div', { class: 'pictos' });
  const row = h('ol', { class: 'picto-row', 'aria-label': 'Your answers, question by question' });
  attempts.forEach((a, i) => {
    const kind = attemptKind(a);
    const lab = labelOf(i);
    const btn = h('button', { type: 'button', class: `picto picto-${kind}`, title: `Question ${lab}: ${KIND_LABEL[kind]}`, 'aria-label': `Question ${lab}: ${KIND_LABEL[kind]}`, onClick: () => onPick && onPick(i) },
      starSvg(kind), h('span', { class: 'picto-n', text: lab }));
    row.appendChild(h('li', {}, btn));
  });
  const counts = { right: 0, part: 0, wrong: 0, skip: 0 };
  for (const a of attempts) counts[attemptKind(a)] += 1;
  const legend = h('ul', { class: 'picto-legend' },
    ...['right', 'part', 'wrong', 'skip'].filter((k) => counts[k]).map((k) => h('li', {}, starSvg(k), h('span', { text: `${KIND_LABEL[k]}: ${counts[k]}` }))));
  wrap.append(row, legend);
  return wrap;
}

/** A clean tick step (1, 2 or 5 times a power of ten) giving about four gridlines. */
function niceStep(v) {
  const raw = Math.max(v, 1) / 4;
  const p = 10 ** Math.floor(Math.log10(raw));
  for (const m of [1, 2, 5, 10]) if (m * p >= raw) return Math.max(1, m * p);
  return 10 * p;
}

/**
 * Single-series column chart with a hover/tap tooltip and a table view.
 * buckets: [{label, ...}], value: (b) => number, fmt: (n) => string
 */
export function columnChart(buckets, o) {
  const W = Math.round(o.width || 640);
  const H = 200;
  const padL = 40;
  const padR = 8;
  const padT = 14;
  const padB = 30;
  const vals = buckets.map(o.value);
  const step = niceStep(Math.max(...vals, o.minMax || 0));
  const nTicks = Math.max(1, Math.ceil(Math.max(...vals, o.minMax || 0, 1) / step));
  const max = step * nTicks;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const band = innerW / buckets.length;
  const bw = Math.min(24, band * 0.62);
  const y = (v) => padT + innerH - (v / max) * innerH;
  const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'colchart', role: 'img', 'aria-label': o.title });
  for (let i = 0; i <= nTicks; i++) {
    const v = step * i;
    const yy = y(v);
    svg.appendChild(s('line', { x1: padL, x2: W - padR, y1: yy, y2: yy, class: i === 0 ? 'axis' : 'grid' }));
    svg.appendChild(s('text', { x: padL - 6, y: yy, 'text-anchor': 'end', 'dominant-baseline': 'middle', class: 'tick' }, o.tick ? o.tick(v) : String(Math.round(v * 10) / 10)));
  }
  const labelEvery = Math.ceil(buckets.length / Math.max(2, Math.floor(innerW / 56)));
  const tip = h('div', { class: 'tip', role: 'status' });
  const wrap = h('div', { class: 'chart-wrap' });
  buckets.forEach((b, i) => {
    const v = vals[i];
    const cx = padL + band * i + band / 2;
    const top = y(v);
    const hgt = padT + innerH - top;
    if (v > 0) {
      const r = Math.min(4, hgt / 2, bw / 2);
      const x0 = cx - bw / 2;
      const yb = padT + innerH;
      const d = `M${x0},${yb} V${top + r} Q${x0},${top} ${x0 + r},${top} H${x0 + bw - r} Q${x0 + bw},${top} ${x0 + bw},${top + r} V${yb} Z`;
      svg.appendChild(s('path', { d, class: 'bar' }));
    }
    if (i % labelEvery === 0 || i === buckets.length - 1) {
      svg.appendChild(s('text', { x: cx, y: H - 10, 'text-anchor': 'middle', class: 'tick' }, b.label));
    }
    const hit = s('rect', { x: padL + band * i, y: padT, width: band, height: innerH, class: 'hit', tabindex: 0, 'aria-label': `${b.label}: ${o.fmt(v, b)}` });
    const show = () => {
      tip.textContent = `${b.label}: ${o.fmt(v, b)}`;
      tip.style.left = `${((cx / W) * 100).toFixed(1)}%`;
      tip.style.top = `${((Math.max(top, padT + 10) / H) * 100).toFixed(1)}%`;
      tip.classList.add('show');
    };
    hit.addEventListener('mouseenter', show);
    hit.addEventListener('focus', show);
    hit.addEventListener('click', show);
    hit.addEventListener('mouseleave', () => tip.classList.remove('show'));
    hit.addEventListener('blur', () => tip.classList.remove('show'));
    svg.appendChild(hit);
  });
  wrap.append(svg, tip);
  const table = h('details', { class: 'table-view' }, h('summary', { text: 'Show as a table' }),
    h('table', { class: 'tbl' }, h('thead', {}, h('tr', {}, h('th', { text: o.unitLabel || 'Period' }), h('th', { class: 'num', text: o.valueLabel || 'Value' }))),
      h('tbody', {}, ...buckets.map((b, i) => h('tr', {}, h('td', { text: b.label }), h('td', { class: 'num', text: o.fmt(vals[i], b) }))))));
  return h('figure', { class: 'chart' }, o.title ? h('figcaption', { text: o.title }) : null, wrap, table);
}

const LEVEL_ICON = { none: 'dash', work: 'target', getting: 'up', good: 'check', mastered: 'star' };

/** A level badge: icon plus words, never colour alone. */
export function levelBadge(level) {
  const lv = level || LEVELS[0];
  return h('span', { class: `lvl lvl-${lv.id}` }, icon(LEVEL_ICON[lv.id] || 'dash', { size: 18 }), h('span', { text: lv.label }));
}

/** Horizontal meter with its percentage written beside it. */
export function meter(fraction, o = {}) {
  const f = fraction == null ? 0 : Math.max(0, Math.min(1, fraction));
  return h('span', { class: `meter ${o.cls || ''}`.trim(), role: 'img', 'aria-label': o.label || `${Math.round(f * 100)} percent` },
    h('span', { class: 'meter-track' }, h('span', { class: 'meter-fill', style: { width: `${(f * 100).toFixed(1)}%` } })),
    h('span', { class: 'meter-num', text: fraction == null ? '–' : `${Math.round(f * 100)}%` }));
}
