// Data-handling diagrams: bar chart, line graph, pie chart, tally/frequency table, Venn and
// Carroll diagrams.
//
// Charts follow the dataviz method: series colours in fixed order (never cycled), a legend for
// two or more series, thin marks with a 4px rounded data end, a 2px surface gap between touching
// fills, hairline gridlines. Exam reading needs gridlines to read values from, so gridlines are a
// little stronger than in a dashboard, and there is deliberately no hover tooltip (it would give
// the answer away). Every value is also in the text description.

import { el, g, F, Box, label, tidy, textWidth, wrap, frac, niceStep, round, polar, sectorPath, listText, say, plural, pt, scaleMarks, withArticle } from './core.js';

const SERIES = ['dg-s1', 'dg-s2', 'dg-s3'];
const MARKERS = ['circle', 'square', 'triangle'];

function marker(kind, x, y, cls, r = 4.5) {
  if (kind === 'square') return el('rect', { x: x - r, y: y - r, width: 2 * r, height: 2 * r, class: cls, stroke: 'var(--dg-surface)', 'stroke-width': 2 });
  if (kind === 'triangle') return el('path', { d: `M${x},${y - r * 1.2}L${x + r * 1.1},${y + r * 0.8}L${x - r * 1.1},${y + r * 0.8}Z`, class: cls, stroke: 'var(--dg-surface)', 'stroke-width': 2 });
  return el('circle', { cx: x, cy: y, r, class: cls, stroke: 'var(--dg-surface)', 'stroke-width': 2 });
}

const fmtNum = (v) => tidy(String(round(v, 4)));

/** A bar with a 4px rounded data end and a square base. Vertical bars grow up from y0. */
function barPath(x, y0, w, len, horizontal = false) {
  const r = Math.min(4, Math.abs(len) / 2, w / 2);
  if (len <= 0) return '';
  if (!horizontal) {
    const top = y0 - len;
    return `M${x},${y0}V${top + r}Q${x},${top} ${x + r},${top}H${x + w - r}Q${x + w},${top} ${x + w},${top + r}V${y0}Z`;
  }
  const end = y0 + len; // here y0 is the x start, x is the y position
  return `M${y0},${x}H${end - r}Q${end},${x} ${end},${x + r}V${x + w - r}Q${end},${x + w} ${end - r},${x + w}H${y0}Z`;
}

function legend(series, x, y, box, kind = 'swatch') {
  const out = [];
  let cx = x;
  series.forEach((s, i) => {
    const w = textWidth(tidy(s.name), 13) + 30;
    if (kind === 'swatch') out.push(el('rect', { x: cx, y: y - 6, width: 12, height: 12, rx: 2, class: SERIES[i] }));
    else { out.push(el('line', { x1: cx - 2, y1: y, x2: cx + 16, y2: y, class: `dg-l${i + 1}`, 'stroke-width': 2.5 })); out.push(marker(MARKERS[i], cx + 7, y, SERIES[i], 4)); }
    out.push(label(cx + (kind === 'swatch' ? 18 : 22), y, s.name, { size: 13, anchor: 'start', halo: false }));
    box.text(cx + 18, y, s.name, 13, 'start').add(cx, y - 8);
    cx += w + (kind === 'swatch' ? 0 : 6);
  });
  return out;
}

function axisTitleY(text, x, y, box) {
  box.add(x - 10, y - textWidth(tidy(text), 13) / 2).add(x + 10, y + textWidth(tidy(text), 13) / 2);
  return el('text', { x, y, transform: `rotate(-90 ${x} ${y})`, 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': 13, class: 'dg-t2' }, tidy(text));
}

/** Scale for a value axis: { min, max, step } with clean numbers. */
function valueScale(values, o) {
  const lo = o.min != null ? o.min : Math.min(0, ...values);
  let step = o.step;
  const hiData = Math.max(...values, lo + 1e-9);
  if (!step) step = niceStep((o.max != null ? o.max : hiData) - lo, 5);
  const hi = o.max != null ? o.max : Math.ceil((hiData - lo) / step - 1e-9) * step + lo;
  return { min: lo, max: hi > lo ? hi : lo + step, step };
}

/** ", numbered every 10" when the numbers on a scale were thinned out. */
const numberedEvery = (marks, step) => (marks.every > 1 ? `, numbered every ${fmtNum(step * marks.every)}` : '');

// ---------------------------------------------------------------- bar chart

// the value axis is 220 long (upright bars) or 300 long (bars running across)
const barMarks = (s, sc) => scaleMarks(sc.min, sc.max, sc.step, s.horizontal ? 300 : 220, !!s.horizontal, 12, fmtNum);

const seriesSpec = F.obj({ name: F.str, values: F.arr(F.num(0), 1, 12) }, ['name', 'values']);
const barChart = {
  size: 'medium',
  schema: {
    categories: F.arr(F.label, 1, 12), series: F.arr(seriesSpec, 1, 3), title: F.str, xLabel: F.str, yLabel: F.str,
    yMax: F.num(0), yStep: F.num(0.0001), minorStep: F.num(0.0001), horizontal: F.bool, valueLabels: F.bool,
  },
  required: ['categories', 'series'],
  check(s) {
    const e = [];
    s.series.forEach((sr, i) => { if (sr.values.length !== s.categories.length) e.push(`series ${i + 1} has ${sr.values.length} values for ${s.categories.length} categories`); });
    if (s.yMax != null && s.series.some((sr) => sr.values.some((v) => v > s.yMax))) e.push('a value is above yMax');
    if (s.minorStep && s.yStep && Math.abs(s.yStep / s.minorStep - Math.round(s.yStep / s.minorStep)) > 1e-9) e.push('minorStep must divide yStep exactly');
    return e;
  },
  render(s) {
    const box = new Box();
    const body = [];
    const n = s.categories.length;
    const k = s.series.length;
    const all = s.series.flatMap((x) => x.values);
    const sc = valueScale(all, { min: 0, max: s.yMax, step: s.yStep });
    const H = s.horizontal;
    const PW = H ? 300 : Math.max(220, Math.min(360, n * (k * 30 + 26)));
    const PH = H ? Math.max(120, n * (k * 22 + 16)) : 220;
    const len = H ? PW : PH; // value axis length
    const V = (v) => ((v - sc.min) / (sc.max - sc.min)) * len;
    let top = 0;
    if (s.title) { body.push(label(PW / 2, -40, s.title, { size: 15, weight: 700, halo: false })); box.text(PW / 2, -40, s.title, 15); }
    if (k > 1) body.push(...legend(s.series, 0, -16, box));
    box.add(0, top);
    // gridlines
    let d1 = ''; let d2 = '';
    if (s.minorStep) for (let v = sc.min; v <= sc.max + 1e-9; v += s.minorStep) { const p = round(V(v), 2); if (H) d1 += `M${p},0V${PH}`; else d1 += `M0,${PH - p}H${PW}`; }
    // gridlines at every step; numbers thinned when they would touch (axisLabels)
    const marks = barMarks(s, sc);
    marks.vals.forEach((v, i) => {
      const p = round(V(v), 2);
      if (H) d2 += `M${p},0V${PH}`; else d2 += `M0,${PH - p}H${PW}`;
      if (!marks.shows(i)) return;
      const t = fmtNum(v);
      if (H) { body.push(label(p, PH + 14, t, { size: 12, cls: 'dg-t2', halo: false })); box.text(p, PH + 14, t, 12); }
      else { body.push(label(-8, PH - p, t, { size: 12, cls: 'dg-t2', anchor: 'end', halo: false })); box.text(-8, PH - p, t, 12, 'end'); }
    });
    if (d1) body.push(el('path', { d: d1, class: 'dg-grid' }));
    body.push(el('path', { d: d2, class: 'dg-grid2' }));
    // bars
    const band = (H ? PH : PW) / n;
    const bw = Math.min(28, (band * 0.7 - 2 * (k - 1)) / k);
    const groupW = k * bw + 2 * (k - 1);
    s.categories.forEach((c, i) => {
      const start = band * i + (band - groupW) / 2;
      s.series.forEach((sr, j) => {
        const v = sr.values[i];
        const pos = start + j * (bw + 2);
        const l = V(v);
        if (H) body.push(el('path', { d: barPath(pos, 0, bw, l, true), class: SERIES[j] }));
        else body.push(el('path', { d: barPath(pos, PH, bw, l), class: SERIES[j] }));
        if (s.valueLabels) {
          const t = fmtNum(v);
          if (H) { body.push(label(l + 6, pos + bw / 2, t, { size: 12, anchor: 'start' })); box.text(l + 6, pos + bw / 2, t, 12, 'start'); }
          else { body.push(label(pos + bw / 2, PH - l - 10, t, { size: 12 })); box.text(pos + bw / 2, PH - l - 10, t, 12); }
        }
      });
      const t = tidy(String(c));
      if (H) { body.push(label(-8, band * i + band / 2, t, { size: 13, anchor: 'end', halo: false })); box.text(-8, band * i + band / 2, t, 13, 'end'); }
      else {
        // a single long word that cannot wrap is set smaller so it fits its band
        const longest = Math.max(...t.split(/\s+/).map((w) => textWidth(w, 13)));
        const fs = Math.max(9, Math.min(13, (13 * (band - 4)) / longest));
        const lines = wrap(t, band - 4, fs);
        const y = PH + 14 + (lines.length - 1) * fs * 0.6;
        body.push(label(band * i + band / 2, y, t, { size: fs, maxWidth: band - 4, halo: false }));
        box.text(band * i + band / 2, y, t, fs, 'middle', band - 4);
      }
    });
    // axes
    body.push(el('path', { d: H ? `M0,0V${PH}` : `M0,${PH}H${PW}`, class: 'dg-axis' }));
    body.push(el('path', { d: H ? `M0,${PH}H${PW}` : `M0,0V${PH}`, class: 'dg-axis', 'stroke-width': 1 }));
    box.rect(0, 0, PW, PH);
    const vTitle = H ? s.xLabel : s.yLabel;
    const cTitle = H ? s.yLabel : s.xLabel;
    if (vTitle) {
      if (H) { body.push(label(PW / 2, PH + 40, vTitle, { size: 13, cls: 'dg-t2', halo: false })); box.text(PW / 2, PH + 40, vTitle, 13); }
      else body.push(axisTitleY(vTitle, box.x0 - 14, PH / 2, box));
    }
    if (cTitle) {
      if (H) body.push(axisTitleY(cTitle, box.x0 - 14, PH / 2, box));
      else { const y = box.y1 + 14; body.push(label(PW / 2, y, cTitle, { size: 13, cls: 'dg-t2', halo: false })); box.text(PW / 2, y, cTitle, 13); }
    }
    return { box, body };
  },
  describe(s) {
    const parts = [`${withArticle(`${s.horizontal ? 'horizontal ' : ''}bar chart`, true)}${s.title ? ` titled "${tidy(s.title)}"` : ''}.`];
    const sc = valueScale(s.series.flatMap((x) => x.values), { min: 0, max: s.yMax, step: s.yStep });
    const vAxis = s.horizontal ? s.xLabel : s.yLabel;
    parts.push(`The scale${vAxis ? ` (${tidy(vAxis)})` : ''} goes from 0 to ${fmtNum(sc.max)} in steps of ${fmtNum(sc.step)}${numberedEvery(barMarks(s, sc), sc.step)}${s.minorStep ? `, with lighter lines every ${fmtNum(s.minorStep)}` : ''}.`);
    for (const sr of s.series) parts.push(`${s.series.length > 1 ? `${tidy(sr.name)}: ` : ''}${listText(s.categories.map((c, i) => `${tidy(String(c))} ${fmtNum(sr.values[i])}`))}.`);
    return parts.join(' ');
  },
};

// ---------------------------------------------------------------- line graph

/** A line graph's scales and which marks carry numbers (shared by the drawing and the description). */
function lineScales(s) {
  const PW = 340; const PH = 220;
  const ys = s.series.flatMap((sr) => sr.values || sr.points.map((p) => p[1]));
  const sc = valueScale(ys, { min: s.yMin != null ? s.yMin : Math.min(0, ...ys), max: s.yMax, step: s.yStep });
  const xs = s.categories ? null : { min: s.xMin, max: s.xMax, step: s.xStep || niceStep(s.xMax - s.xMin, 6) };
  const yMarks = scaleMarks(sc.min, sc.max, sc.step, PH, false, 12, fmtNum);
  const xMarks = xs ? scaleMarks(xs.min, xs.max, xs.step, PW, true, 12, fmtNum) : null;
  return { PW, PH, sc, xs, yMarks, xMarks };
}

const ptText = ([x, y]) => `(${fmtNum(x)}, ${fmtNum(y)})`;
/**
 * The shape of a line through `points` in words, from the data (CLO review, 17 Oct: never "straight"
 * unless every part has the same gradient). Straight parts with the same gradient are one piece;
 * pieces going the same way (up, down, flat) are one run.
 *   one piece                       "a straight line going up from (0, 0) (the origin) to (5, 50)"
 *   one run of 3+ pieces whose      "a curve that goes up from (0, 0) to (5, 30), getting steeper,
 *   steepness keeps changing         through (1, 2), ..."
 *   anything else                   "a line that is not straight: it goes up from (0, 0) to (2, 30),
 *                                    is flat from (2, 30) to (3, 30), then goes up from ..."
 * `origin` is true when the point (0, 0) is on the graph, so a straight line says whether it
 * passes through it.
 */
export function lineShape(points, origin = false) {
  const P = points.filter((p, i) => i === 0 || p[0] !== points[i - 1][0] || p[1] !== points[i - 1][1]);
  if (P.length < 2) return `a single point at ${ptText(P[0])}`;
  const yr = Math.max(1, ...P.map((p) => Math.abs(p[1])));
  const pieces = [];
  for (let i = 0; i + 1 < P.length; i++) {
    const [x0, y0] = P[i]; const [x1, y1] = P[i + 1];
    const dx = x1 - x0; const dy = y1 - y0;
    const dir = Math.abs(dx) < 1e-12 ? (dy > 0 ? 'upright' : 'downright') : Math.abs(dy) <= 1e-12 * yr ? 'flat' : dy > 0 ? 'up' : 'down';
    const slope = Math.abs(dx) < 1e-12 ? Infinity : dy / dx;
    const last = pieces[pieces.length - 1];
    const same = last && last.dir === dir && (slope === Infinity ? last.slope === Infinity : Math.abs(slope - last.slope) <= 1e-9 * Math.max(1, Math.abs(slope), Math.abs(last.slope)));
    if (same) { last.to = P[i + 1]; last.n += 1; } else pieces.push({ from: P[i], to: P[i + 1], dir, slope, n: 1 });
  }
  const goes = { up: 'goes up', down: 'goes down', flat: 'is flat', upright: 'goes straight up', downright: 'goes straight down' };
  const span = (a, b) => `from ${ptText(a)} to ${ptText(b)}`;
  const isO = (p) => Math.abs(p[0]) < 1e-12 && Math.abs(p[1]) < 1e-12;
  const named = (p) => `${ptText(p)}${isO(p) ? ' (the origin)' : ''}`;
  const corners = new Set(pieces.flatMap((pc) => [ptText(pc.from), ptText(pc.to)]));
  const through = (mentioned) => {
    const rest = P.filter((p) => !mentioned.has(ptText(p)));
    return rest.length ? `, through ${listText(rest.map(ptText))}` : '';
  };
  if (pieces.length === 1) {
    const pc = pieces[0];
    const a = P[0]; const b = P[P.length - 1];
    const kind = { up: 'a straight line going up', down: 'a straight line going down', flat: 'a flat (horizontal) straight line', upright: 'a straight upright (vertical) line', downright: 'a straight upright (vertical) line' }[pc.dir];
    let o = '';
    if (origin && !isO(a) && !isO(b)) {
      // does the drawn line pass through (0, 0)?
      const lo = Math.min(a[0], b[0]); const hi = Math.max(a[0], b[0]);
      const on = pc.slope === Infinity ? Math.abs(a[0]) < 1e-12 && Math.min(a[1], b[1]) <= 0 && Math.max(a[1], b[1]) >= 0
        : lo <= 1e-12 && hi >= -1e-12 && Math.abs(a[1] - pc.slope * a[0]) <= 1e-9 * yr;
      o = on ? ', passing through the origin (0, 0)' : ', not passing through the origin';
    }
    return `${kind} from ${named(a)} to ${named(b)}${through(new Set([ptText(a), ptText(b)]))}${o}`;
  }
  // runs: pieces going the same way, with how their steepness changes
  const runs = [];
  for (const pc of pieces) {
    const last = runs[runs.length - 1];
    if (last && last.dir === pc.dir) { last.to = pc.to; last.pieces.push(pc); } else runs.push({ from: pc.from, to: pc.to, dir: pc.dir, pieces: [pc] });
  }
  const trend = (run) => {
    const m = run.pieces.map((pc) => Math.abs(pc.slope));
    if (m.length < 2 || run.dir === 'flat' || m.includes(Infinity)) return '';
    if (m.every((v, i) => i === 0 || v > m[i - 1])) return 'getting steeper';
    if (m.every((v, i) => i === 0 || v < m[i - 1])) return 'getting less steep';
    return 'unevenly (its steepness changes)';
  };
  if (runs.length === 1 && pieces.length >= 3 && /steep(er)?$/.test(trend(runs[0]))) {
    const r = runs[0];
    return `a curve that ${goes[r.dir]} ${span(r.from, r.to)}, ${trend(r)}${through(new Set([ptText(r.from), ptText(r.to)]))}`;
  }
  let steps;
  let mentioned;
  if (pieces.length <= 6) {
    steps = pieces.map((pc, i) => {
      const prev = pieces[i - 1];
      let how = '';
      if (prev && prev.dir === pc.dir && (pc.dir === 'up' || pc.dir === 'down')) how = Math.abs(pc.slope) > Math.abs(prev.slope) ? ' more steeply' : ' less steeply';
      return `${goes[pc.dir]}${how} ${span(pc.from, pc.to)}`;
    });
    mentioned = corners;
  } else {
    steps = runs.map((r) => { const t = trend(r); return `${goes[r.dir]}${t ? ` ${t.startsWith('getting') ? `(${t})` : t}` : ''} ${span(r.from, r.to)}`; });
    mentioned = new Set(runs.flatMap((r) => [ptText(r.from), ptText(r.to)]));
  }
  const said = steps.map((t, i) => (i === 0 ? `it ${t}` : `then ${t}`)).join(', ');
  const rest = P.filter((p) => !mentioned.has(ptText(p)));
  return `a line that is not straight: ${said}${rest.length ? `; it passes through ${listText(rest.map(ptText))}` : ''}`;
}

const lineSeries = F.obj({ name: F.str, values: F.arr(F.num(), 1, 24), points: F.arr(F.arr(F.num(), 2, 2), 2, 40) }, ['name']);
const lineGraph = {
  size: 'medium',
  schema: {
    series: F.arr(lineSeries, 1, 3), categories: F.arr(F.label, 2, 24), xMin: F.num(), xMax: F.num(), xStep: F.num(0.0001),
    yMin: F.num(), yMax: F.num(), yStep: F.num(0.0001), minorStep: F.num(0.0001), title: F.str, xLabel: F.str, yLabel: F.str, markers: F.bool,
  },
  required: ['series'],
  check(s) {
    const e = [];
    for (const [i, sr] of s.series.entries()) {
      if ((sr.values == null) === (sr.points == null)) e.push(`series ${i + 1} needs values or points (not both)`);
      if (sr.values && !s.categories) e.push(`series ${i + 1} has values, so categories are needed`);
      if (sr.values && s.categories && sr.values.length !== s.categories.length) e.push(`series ${i + 1} has ${sr.values.length} values for ${s.categories.length} categories`);
      if (sr.points && (s.xMin == null || s.xMax == null)) e.push('points need xMin and xMax');
    }
    const ys = s.series.flatMap((sr) => sr.values || (sr.points || []).map((p) => p[1]));
    if (s.yMax != null && ys.some((v) => v > s.yMax + 1e-9)) e.push('a value is above yMax');
    if (s.yMin != null && ys.some((v) => v < s.yMin - 1e-9)) e.push('a value is below yMin');
    return e;
  },
  render(s) {
    const box = new Box();
    const body = [];
    const { PW, PH, sc, xs, yMarks, xMarks } = lineScales(s);
    const Y = (v) => PH - ((v - sc.min) / (sc.max - sc.min)) * PH;
    const cat = !!s.categories;
    const n = cat ? s.categories.length : 0;
    const X = cat ? (i) => (PW * (i + 0.5)) / n : (v) => ((v - xs.min) / (xs.max - xs.min)) * PW;
    if (s.title) { body.push(label(PW / 2, -40, s.title, { size: 15, weight: 700, halo: false })); box.text(PW / 2, -40, s.title, 15); }
    if (s.series.length > 1) body.push(...legend(s.series, 0, -16, box, 'line'));
    let d1 = ''; let d2 = '';
    if (s.minorStep) for (let v = sc.min; v <= sc.max + 1e-9; v += s.minorStep) d1 += `M0,${round(Y(v), 2)}H${PW}`;
    // gridlines at every step; numbers thinned when they would touch (axisLabels)
    yMarks.vals.forEach((v, i) => {
      d2 += `M0,${round(Y(v), 2)}H${PW}`;
      if (yMarks.shows(i)) { body.push(label(-8, Y(v), fmtNum(v), { size: 12, cls: 'dg-t2', anchor: 'end', halo: false })); box.text(-8, Y(v), fmtNum(v), 12, 'end'); }
    });
    if (cat) {
      s.categories.forEach((c, i) => {
        d1 += `M${round(X(i), 2)},0V${PH}`;
        const t = tidy(String(c));
        const bw = PW / n - 4;
        const lines = wrap(t, bw, 12);
        const y = PH + 14 + (lines.length - 1) * 7.2;
        body.push(label(X(i), y, t, { size: 12, maxWidth: bw, halo: false })); box.text(X(i), y, t, 12, 'middle', bw);
      });
    } else {
      xMarks.vals.forEach((v, i) => {
        d2 += `M${round(X(v), 2)},0V${PH}`;
        if (xMarks.shows(i)) { body.push(label(X(v), PH + 14, fmtNum(v), { size: 12, cls: 'dg-t2', halo: false })); box.text(X(v), PH + 14, fmtNum(v), 12); }
      });
      if (s.minorStep) for (let v = xs.min; v <= xs.max + 1e-9; v += s.minorStep * (xs.step / sc.step)) d1 += `M${round(X(v), 2)},0V${PH}`;
    }
    if (d1) body.push(el('path', { d: d1, class: 'dg-grid' }));
    body.push(el('path', { d: d2, class: 'dg-grid2' }));
    body.push(el('path', { d: `M0,0V${PH}H${PW}`, class: 'dg-axis' }));
    if (sc.min < 0 && sc.max > 0) body.push(el('line', { x1: 0, x2: PW, y1: Y(0), y2: Y(0), class: 'dg-axis', 'stroke-width': 1 }));
    box.rect(0, 0, PW, PH);
    s.series.forEach((sr, j) => {
      const pts = sr.values ? sr.values.map((v, i) => [X(i), Y(v)]) : sr.points.map(([x, y]) => [X(x), Y(y)]);
      body.push(el('path', { d: `M${pts.map(pt).join('L')}`, class: `dg-l${j + 1}`, fill: 'none', 'stroke-width': 2.5, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));
      if (s.markers !== false) for (const p of pts) body.push(marker(MARKERS[j], p[0], p[1], SERIES[j]));
    });
    if (s.yLabel) body.push(axisTitleY(s.yLabel, box.x0 - 14, PH / 2, box));
    if (s.xLabel) { const y = box.y1 + 14; body.push(label(PW / 2, y, s.xLabel, { size: 13, cls: 'dg-t2', halo: false })); box.text(PW / 2, y, s.xLabel, 13); }
    return { box, body };
  },
  describe(s) {
    const { sc, xs, yMarks, xMarks } = lineScales(s);
    const parts = [`A line graph${s.title ? ` titled "${tidy(s.title)}"` : ''}.`];
    parts.push(`The vertical scale${s.yLabel ? ` (${tidy(s.yLabel)})` : ''} goes from ${fmtNum(sc.min)} to ${fmtNum(sc.max)} in steps of ${fmtNum(sc.step)}${numberedEvery(yMarks, sc.step)}.`);
    if (xs) parts.push(`The horizontal scale${s.xLabel ? ` (${tidy(s.xLabel)})` : ''} goes from ${fmtNum(xs.min)} to ${fmtNum(xs.max)} in steps of ${fmtNum(xs.step)}${numberedEvery(xMarks, xs.step)}.`);
    const origin = !!xs && xs.min <= 0 && xs.max >= 0 && sc.min <= 0 && sc.max >= 0;
    for (const sr of s.series) {
      const many = s.series.length > 1;
      const text = sr.values ? listText(s.categories.map((c, i) => `${tidy(String(c))} ${fmtNum(sr.values[i])}`)) : lineShape(sr.points, origin);
      parts.push(`${many ? `${tidy(sr.name)}: ${text}` : cap(text)}.`);
    }
    return parts.join(' ');
  },
};

// ---------------------------------------------------------------- pie chart

const PIE = ['dg-s1', 'dg-s2', 'dg-s3', 'dg-s4', 'dg-s5', 'dg-s6'];
const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a; };

/** Each slice's start and end direction (clockwise from startAngle) and its share. */
export function pieGeometry(s) {
  const total = s.slices.reduce((a, x) => a + x.value, 0);
  let a = s.startAngle != null ? s.startAngle : 90;
  return s.slices.map((x) => {
    const deg = (x.value / total) * 360;
    const out = { label: x.label, value: x.value, share: x.value / total, deg, from: a - deg, to: a };
    a -= deg;
    return out;
  });
}
function shareText(sl, s, total) {
  switch (s.show) {
    case 'percent': return `${round(sl.share * 100, 1)}%`;
    case 'value': return fmtNum(sl.value);
    case 'degrees': return `${round(sl.deg, 1)}°`;
    case 'fraction': {
      const isInt = Number.isInteger(sl.value) && Number.isInteger(total);
      if (!isInt) return `${round(sl.share, 3)}`;
      const k = gcd(sl.value, total);
      return `${sl.value / k}/${total / k}`;
    }
    default: return '';
  }
}
const pieChart = {
  size: 'medium',
  schema: {
    slices: F.arr(F.obj({ label: F.label, value: F.num(0.000001) }, ['label', 'value']), 2, 6), title: F.str,
    show: F.enum('label', 'percent', 'fraction', 'value', 'degrees'), rightAngles: F.bool, startAngle: F.num(-360, 360),
  },
  required: ['slices'],
  render(s, ctx) {
    const box = new Box();
    const body = [];
    const R = 105;
    const geo = pieGeometry(s);
    const total = s.slices.reduce((a, x) => a + x.value, 0);
    geo.forEach((sl, i) => body.push(el('path', { d: sectorPath(0, 0, R, sl.from, sl.to), class: `${PIE[i]} dg-gap`, 'stroke-linejoin': 'round' })));
    box.circle(0, 0, R);
    if (s.rightAngles) {
      geo.forEach((sl) => {
        if (Math.abs(sl.deg - 90) > 1e-9) return;
        const u = polar(0, 0, 16, sl.from); const v = polar(0, 0, 16, sl.to); const w = [u[0] + v[0], u[1] + v[1]];
        body.push(el('path', { d: `M${pt(u)}L${pt(w)}L${pt(v)}`, fill: 'none', stroke: '#ffffff', 'stroke-width': 1.8 }));
      });
    }
    geo.forEach((sl) => {
      const mid = (sl.from + sl.to) / 2;
      const a = polar(0, 0, R - 6, mid); const b = polar(0, 0, R + 12, mid);
      body.push(el('line', { x1: a[0], y1: a[1], x2: b[0], y2: b[1], class: 'dg-ink2', 'stroke-width': 1.2 }));
      const extra = shareText(sl, s, total);
      const t = extra ? `${tidy(String(sl.label))} ${extra}` : tidy(String(sl.label));
      const c = Math.cos((mid * Math.PI) / 180);
      const anchor = c > 0.25 ? 'start' : c < -0.25 ? 'end' : 'middle';
      const p = polar(0, 0, R + 18, mid);
      const y = p[1] + (anchor === 'middle' ? (p[1] < 0 ? -6 : 6) : 0);
      body.push(label(p[0], y, t, { size: 14, anchor, halo: false }));
      box.text(p[0], y, t, 14, anchor);
    });
    void ctx;
    if (s.title) { const y = box.y0 - 18; body.push(label(0, y, s.title, { size: 15, weight: 700, halo: false })); box.text(0, y, s.title, 15); }
    return { box, body };
  },
  describe(s) {
    const geo = pieGeometry(s);
    const total = s.slices.reduce((a, x) => a + x.value, 0);
    const parts = [`A pie chart${s.title ? ` titled "${tidy(s.title)}"` : ''} with ${s.slices.length} slices, clockwise from the top.`];
    parts.push(`The slices: ${geo.map((sl) => `${tidy(String(sl.label))}${shareText(sl, s, total) ? ` (${shareText(sl, s, total)})` : ''}${Math.abs(sl.deg - 90) < 1e-9 && s.rightAngles ? ', a right angle' : Math.abs(sl.deg - 180) < 1e-9 ? ', half the circle' : ''}`).join('; ')}.`);
    if (!s.show || s.show === 'label') {
      const bigs = [...geo].sort((a, b) => b.share - a.share);
      parts.push(`The largest slice is ${tidy(String(bigs[0].label))}${bigs.length > 1 && Math.abs(bigs[0].share - bigs[1].share) < 1e-9 ? ` (as large as ${tidy(String(bigs[1].label))})` : ''}.`);
    }
    return parts.join(' ');
  },
};

// ---------------------------------------------------------------- table (tally / frequency)

/** Tally marks. countHidden: when the question asks her to count them (the spec has a neutral `alt`), a
 * screen reader hears "tally marks" without the number. */
export function tallySvg(n, countHidden = false) {
  const groups = Math.floor(n / 5);
  const rest = n % 5;
  const kids = [];
  let x = 2;
  for (let gi = 0; gi < groups; gi++) {
    for (let i = 0; i < 4; i++) kids.push(el('line', { x1: x + i * 6, y1: 3, x2: x + i * 6, y2: 21, class: 'dg-ink', 'stroke-width': 1.8 }));
    kids.push(el('line', { x1: x - 3, y1: 18, x2: x + 21, y2: 6, class: 'dg-ink', 'stroke-width': 1.8 }));
    x += 32;
  }
  for (let i = 0; i < rest; i++) kids.push(el('line', { x1: x + i * 6, y1: 3, x2: x + i * 6, y2: 21, class: 'dg-ink', 'stroke-width': 1.8 }));
  const w = Math.max(10, x + rest * 6 + 2);
  return el('svg', { class: 'dg-tally', viewBox: `0 0 ${w} 24`, width: w, height: 24, role: 'img', 'aria-label': countHidden ? 'tally marks' : `tally marks: ${n}` }, kids);
}
function cell(v, countHidden = false) {
  if (v && typeof v === 'object' && 'tally' in v) return tallySvg(v.tally, countHidden);
  const t = tidy(String(v));
  return t.trim() === '?' ? el('span', { class: 'dg-q', 'aria-label': 'value to find' }, '?') : t;
}
const cellSpec = F.oneOf(F.label, F.obj({ tally: F.int(0, 60) }, ['tally']));
const table = {
  size: 'medium',
  schema: { columns: F.arr(F.str, 1, 8), rows: F.arr(F.arr(cellSpec, 1, 8), 1, 14), title: F.str, rowHeaders: F.bool },
  required: ['columns', 'rows'],
  check(s) { return s.rows.some((r) => r.length !== s.columns.length) ? ['every row needs one cell per column'] : []; },
  render(s) {
    const rh = s.rowHeaders !== false;
    const t = el('table', { class: 'dg-table' },
      s.title ? el('caption', {}, tidy(s.title)) : null,
      el('thead', {}, el('tr', {}, s.columns.map((c) => el('th', { scope: 'col' }, tidy(c))))),
      el('tbody', {}, s.rows.map((r) => el('tr', {}, r.map((v, i) => (i === 0 && rh ? el('th', { scope: 'row' }, cell(v, !!s.alt)) : el('td', {}, cell(v, !!s.alt))))))));
    return { html: t };
  },
  describe(s) {
    const txt = (v) => (v && typeof v === 'object' ? `${v.tally} tally marks` : say(v));
    return `A table${s.title ? ` titled "${tidy(s.title)}"` : ''} with columns ${listText(s.columns.map(tidy))}. ${s.rows.map((r) => `${r.map(txt).join(', ')}.`).join(' ')}`;
  },
};

// ---------------------------------------------------------------- Venn diagram

const REGIONS2 = ['A', 'B', 'AB', 'outside'];
const REGIONS3 = ['A', 'B', 'C', 'AB', 'AC', 'BC', 'ABC', 'outside'];
const itemSpec = F.arr(F.label, 0, 12);
const venn = {
  size: 'medium',
  schema: {
    sets: F.arr(F.str, 2, 3), universe: F.str, shade: F.arr(F.str, 0, 8),
    regions: F.obj({ A: itemSpec, B: itemSpec, C: itemSpec, AB: itemSpec, AC: itemSpec, BC: itemSpec, ABC: itemSpec, outside: itemSpec }),
  },
  required: ['sets'],
  check(s) {
    const ok = s.sets.length === 2 ? REGIONS2 : REGIONS3;
    const e = [];
    for (const k of Object.keys(s.regions || {})) if (!ok.includes(k)) e.push(`region ${k} needs ${s.sets.length === 2 ? 'three' : ''} sets (regions: ${ok.join(', ')})`);
    for (const k of s.shade || []) if (!ok.includes(k)) e.push(`cannot shade region ${k}`);
    return e;
  },
  render(s, ctx) {
    const box = new Box();
    const body = [];
    const three = s.sets.length === 3;
    const W = 400; const Hh = three ? 330 : 270;
    const C = three
      ? [{ x: 160, y: 130, r: 80 }, { x: 240, y: 130, r: 80 }, { x: 200, y: 199, r: 80 }]
      : [{ x: 155, y: 140, r: 92 }, { x: 245, y: 140, r: 92 }];
    const keys = ['A', 'B', 'C'];
    body.push(el('rect', { x: 0, y: 0, width: W, height: Hh, rx: 6, class: 'dg-ink', 'stroke-width': 1.8 }));
    box.rect(0, 0, W, Hh);
    if (s.universe) { body.push(label(10, 14, s.universe, { size: 13, anchor: 'start', cls: 'dg-t2' })); box.text(10, 14, s.universe, 13, 'start'); }
    // shading: a region is inside some sets and outside the others
    const defs = [];
    (s.shade || []).forEach((key, n) => {
      const inSets = key === 'outside' ? [] : [...key];
      const outSets = keys.slice(0, s.sets.length).filter((k) => !inSets.includes(k));
      const mid = `${ctx.id}-m${n}`;
      defs.push(el('mask', { id: mid }, el('rect', { x: 0, y: 0, width: W, height: Hh, fill: '#fff' }), outSets.map((k) => { const c = C[keys.indexOf(k)]; return el('circle', { cx: c.x, cy: c.y, r: c.r, fill: '#000' }); })));
      let shape = el('rect', { x: 0, y: 0, width: W, height: Hh, class: 'dg-shade', mask: `url(#${mid})` });
      inSets.forEach((k, j) => {
        const c = C[keys.indexOf(k)];
        const cid = `${ctx.id}-c${n}-${j}`;
        defs.push(el('clipPath', { id: cid }, el('circle', { cx: c.x, cy: c.y, r: c.r })));
        shape = el('g', { 'clip-path': `url(#${cid})` }, shape);
      });
      body.push(shape);
    });
    if (defs.length) body.unshift(el('defs', {}, defs));
    C.forEach((c) => body.push(el('circle', { cx: c.x, cy: c.y, r: c.r, class: 'dg-ink', 'stroke-width': 2 })));
    // set labels
    const pos = three
      ? [[C[0].x - 52, C[0].y - C[0].r - 14, 'middle'], [C[1].x + 52, C[1].y - C[1].r - 14, 'middle'], [C[2].x + C[2].r + 6, C[2].y + 50, 'start']]
      : [[C[0].x - 40, C[0].y - C[0].r - 14, 'middle'], [C[1].x + 40, C[1].y - C[1].r - 14, 'middle']];
    s.sets.forEach((name, i) => {
      const [x, y, anc] = pos[i];
      body.push(label(x, y, name, { size: 14, weight: 700, anchor: anc, maxWidth: three && i === 2 ? 90 : 150 }));
      box.text(x, y, name, 14, anc, three && i === 2 ? 90 : 150);
    });
    // items
    const anchors = three
      ? { A: [118, 108, 2], B: [282, 108, 2], C: [200, 248, 3], AB: [200, 92, 2], AC: [167, 178, 1], BC: [233, 178, 1], ABC: [200, 153, 1], outside: [W - 12, Hh - 14, 0] }
      : { A: [108, 140, 2], B: [292, 140, 2], AB: [200, 140, 1], outside: [W - 12, Hh - 14, 0] };
    for (const [key, items] of Object.entries(s.regions || {})) {
      if (!items.length) continue;
      const [ax, ay, cols] = anchors[key];
      if (key === 'outside') {
        // along the bottom-right corner, right to left
        let x = ax;
        [...items].reverse().forEach((it) => {
          const t = tidy(String(it));
          const w = t === '?' ? 24 : textWidth(t, 14);
          body.push(label(x, ay, t, { size: 14, anchor: 'end' }));
          x -= w + 14;
        });
        continue;
      }
      const nc = Math.max(1, Math.min(cols || 1, items.length));
      const rows = Math.ceil(items.length / nc);
      const colW = Math.max(30, ...items.map((it) => textWidth(tidy(String(it)), 14) + 10));
      items.forEach((it, i) => {
        const r = Math.floor(i / nc); const c = i % nc;
        const inRow = Math.min(nc, items.length - r * nc);
        const x = ax + (c - (inRow - 1) / 2) * colW;
        const y = ay + (r - (rows - 1) / 2) * 22;
        body.push(label(x, y, String(it), { size: 14 }));
      });
    }
    return { box, body };
  },
  describe(s) {
    const names = s.sets.map(tidy);
    const regionWords = (k) => {
      if (k === 'outside') return `outside all the circles`;
      const inS = [...k].map((c) => names['ABC'.indexOf(c)]);
      const outS = names.filter((_, i) => !k.includes('ABC'[i]));
      return `in ${listText(inS.map((n) => `"${n}"`))}${outS.length ? ` but not in ${listText(outS.map((n) => `"${n}"`))}` : ''}`;
    };
    const parts = [`A Venn diagram with ${s.sets.length} overlapping circles: ${listText(names.map((n) => `"${n}"`))}${s.universe ? `, inside a box labelled "${tidy(s.universe)}"` : ''}.`];
    for (const [k, items] of Object.entries(s.regions || {})) if (items.length) parts.push(`${cap(regionWords(k))}: ${listText(items.map(say))}.`);
    for (const k of s.shade || []) parts.push(`The region ${regionWords(k)} is shaded.`);
    return parts.join(' ');
  },
};
const cap = (t) => (t ? t[0].toUpperCase() + t.slice(1) : t);

// ---------------------------------------------------------------- Carroll diagram

const carroll = {
  size: 'medium',
  schema: { columns: F.arr(F.str, 2, 3), rows: F.arr(F.str, 2, 3), cells: F.arr(F.arr(F.arr(F.label, 0, 12), 2, 3), 2, 3) },
  required: ['columns', 'rows', 'cells'],
  check(s) {
    if (s.cells.length !== s.rows.length || s.cells.some((r) => r.length !== s.columns.length)) return ['cells must have one list per row and column'];
    return [];
  },
  render(s) {
    const t = el('table', { class: 'dg-table dg-carroll' },
      el('thead', {}, el('tr', {}, el('td', {}), s.columns.map((c) => el('th', { scope: 'col' }, tidy(c))))),
      el('tbody', {}, s.rows.map((r, i) => el('tr', {}, el('th', { scope: 'row' }, tidy(r)),
        s.columns.map((_, j) => el('td', {}, s.cells[i][j].map((it) => (String(it).trim() === '?' ? el('span', { class: 'dg-q', 'aria-label': 'value to find' }, '?') : el('span', {}, tidy(String(it)))))))))));
    return { html: t };
  },
  describe(s) {
    const parts = [`A Carroll diagram with columns ${listText(s.columns.map((c) => `"${tidy(c)}"`))} and rows ${listText(s.rows.map((r) => `"${tidy(r)}"`))}.`];
    s.rows.forEach((r, i) => s.columns.forEach((c, j) => {
      const items = s.cells[i][j];
      parts.push(`"${tidy(r)}" and "${tidy(c)}": ${items.length ? listText(items.map(say)) : 'empty'}.`);
    }));
    return parts.join(' ');
  },
};

export const CHARTS = { barChart, lineGraph, pieChart, table, venn, carroll };
export { plural };
