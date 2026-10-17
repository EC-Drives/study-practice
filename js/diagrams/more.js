// More diagrams from the CLO's v1.1 list: function machines, dot plots and scatter graphs.

import { el, F, Box, label, tidy, textWidth, niceStep, round, arrowLine, listText, say, plural } from './core.js';

const fmt = (v) => tidy(String(round(v, 4)));

// ---------------------------------------------------------------- function machine

const functionMachine = {
  size: 'medium',
  schema: { steps: F.arr(F.str, 1, 3), input: F.label, output: F.label },
  required: ['steps'],
  render(s) {
    const box = new Box();
    const body = [];
    const H = 46;
    let x = 0;
    const inText = s.input != null ? String(s.input) : '';
    const outText = s.output != null ? String(s.output) : '';
    // input
    body.push(label(x + 24, -34, 'IN', { size: 12, cls: 'dg-t2', weight: 700 }));
    body.push(el('rect', { x, y: -H / 2, width: 48, height: H, rx: 23, class: 'dg-shade2' }), el('rect', { x, y: -H / 2, width: 48, height: H, rx: 23, class: 'dg-ink', 'stroke-width': 1.8 }));
    if (inText) body.push(label(x + 24, 0, inText, { size: 17, weight: 700, halo: false }));
    box.rect(x, -H / 2 - 20, 48, H + 20);
    x += 48;
    for (const st of s.steps) {
      const w = Math.max(70, textWidth(tidy(st), 18) + 28);
      body.push(arrowLine([x + 4, 0], [x + 38, 0], { width: 2.2, size: 10 }));
      x += 42;
      body.push(el('rect', { x, y: -H / 2 - 6, width: w, height: H + 12, rx: 6, class: 'dg-glass' }), el('rect', { x, y: -H / 2 - 6, width: w, height: H + 12, rx: 6, class: 'dg-ink', 'stroke-width': 2.2 }));
      body.push(label(x + w / 2, 0, st, { size: 18, weight: 700, halo: false }));
      box.rect(x, -H / 2 - 6, w, H + 12);
      x += w;
    }
    body.push(arrowLine([x + 4, 0], [x + 38, 0], { width: 2.2, size: 10 }));
    x += 42;
    body.push(label(x + 24, -34, 'OUT', { size: 12, cls: 'dg-t2', weight: 700 }));
    body.push(el('rect', { x, y: -H / 2, width: 48, height: H, rx: 23, class: 'dg-shade2' }), el('rect', { x, y: -H / 2, width: 48, height: H, rx: 23, class: 'dg-ink', 'stroke-width': 1.8 }));
    if (outText) body.push(label(x + 24, 0, outText, { size: 17, weight: 700, halo: false }));
    box.rect(x, -H / 2 - 20, 48, H + 20);
    return { box, body };
  },
  describe(s) {
    return `A function machine. The input${s.input != null ? ` is ${say(s.input)}` : ' is not given'}; it goes through ${listText(s.steps.map((t) => `"${tidy(t)}"`))} in that order; the output${s.output != null ? ` is ${say(s.output)}` : ' is not given'}.`;
  },
};

// ---------------------------------------------------------------- dot plot

const dotPlot = {
  size: 'medium',
  schema: { values: F.arr(F.num(-1000, 1000), 1, 60), min: F.num(), max: F.num(), step: F.num(0.0001), title: F.str, xLabel: F.str },
  required: ['values', 'min', 'max'],
  check(s) {
    const e = [];
    if (!(s.max > s.min)) e.push('max must be more than min');
    const st = s.step || 1;
    if ((s.max - s.min) / st > 24) e.push('at most 24 steps');
    if (s.values.some((v) => v < s.min || v > s.max || Math.abs((v - s.min) / st - Math.round((v - s.min) / st)) > 1e-9)) e.push('every value must sit on a step between min and max');
    return e;
  },
  render(s) {
    const box = new Box();
    const body = [];
    const st = s.step || 1;
    const n = Math.round((s.max - s.min) / st);
    const W = Math.min(380, Math.max(200, n * 32));
    const X = (v) => ((v - s.min) / (s.max - s.min)) * W;
    body.push(el('line', { x1: -10, y1: 0, x2: W + 10, y2: 0, class: 'dg-ink', 'stroke-width': 2 }));
    let d = '';
    for (let i = 0; i <= n; i++) {
      const v = s.min + i * st;
      d += `M${round(X(v), 2)},0V7`;
      body.push(label(X(v), 20, fmt(v), { size: 13, halo: false }));
      box.text(X(v), 20, fmt(v), 13);
    }
    body.push(el('path', { d, class: 'dg-ink', 'stroke-width': 1.6 }));
    const counts = new Map();
    const r = Math.min(8, (W / n) * 0.32);
    for (const v of s.values) {
      const k = round(v, 6);
      const c = counts.get(k) || 0;
      counts.set(k, c + 1);
      const cy = -r - 4 - c * (2 * r + 3);
      body.push(el('circle', { cx: X(v), cy, r, class: 'dg-s1', stroke: 'var(--dg-surface)', 'stroke-width': 1.5 }));
      box.add(X(v), cy - r);
    }
    box.add(-10, -10).add(W + 10, 0);
    if (s.xLabel) { const y = box.y1 + 12; body.push(label(W / 2, y, s.xLabel, { size: 13, cls: 'dg-t2', halo: false })); box.text(W / 2, y, s.xLabel, 13); }
    if (s.title) { const y = box.y0 - 16; body.push(label(W / 2, y, s.title, { size: 15, weight: 700, halo: false })); box.text(W / 2, y, s.title, 15); }
    return { box, body };
  },
  describe(s) {
    const counts = {};
    for (const v of s.values) counts[v] = (counts[v] || 0) + 1;
    const keys = Object.keys(counts).map(Number).sort((a, b) => a - b);
    return `A dot plot${s.title ? ` titled "${tidy(s.title)}"` : ''}${s.xLabel ? ` of ${tidy(s.xLabel)}` : ''}, from ${fmt(s.min)} to ${fmt(s.max)}, with ${plural(s.values.length, 'dot')}: ${listText(keys.map((k) => `${counts[k]} at ${fmt(k)}`))}.`;
  },
};

// ---------------------------------------------------------------- scatter graph

const scatterGraph = {
  size: 'medium',
  schema: {
    points: F.arr(F.arr(F.num(), 2, 2), 2, 40), xMin: F.num(), xMax: F.num(), xStep: F.num(0.0001), yMin: F.num(), yMax: F.num(), yStep: F.num(0.0001),
    title: F.str, xLabel: F.str, yLabel: F.str,
  },
  required: ['points'],
  check(s) {
    const xs = s.points.map((p) => p[0]); const ys = s.points.map((p) => p[1]);
    const e = [];
    if (s.xMin != null && Math.min(...xs) < s.xMin) e.push('a point is left of xMin');
    if (s.xMax != null && Math.max(...xs) > s.xMax) e.push('a point is right of xMax');
    if (s.yMin != null && Math.min(...ys) < s.yMin) e.push('a point is below yMin');
    if (s.yMax != null && Math.max(...ys) > s.yMax) e.push('a point is above yMax');
    return e;
  },
  render(s) {
    const box = new Box();
    const body = [];
    const PW = 320; const PH = 240;
    const xs = s.points.map((p) => p[0]); const ys = s.points.map((p) => p[1]);
    const xMin = s.xMin ?? Math.min(0, ...xs); const yMin = s.yMin ?? Math.min(0, ...ys);
    const xStep = s.xStep || niceStep((s.xMax ?? Math.max(...xs)) - xMin, 6);
    const yStep = s.yStep || niceStep((s.yMax ?? Math.max(...ys)) - yMin, 6);
    const xMax = s.xMax ?? Math.ceil((Math.max(...xs) - xMin) / xStep) * xStep + xMin;
    const yMax = s.yMax ?? Math.ceil((Math.max(...ys) - yMin) / yStep) * yStep + yMin;
    const X = (v) => ((v - xMin) / (xMax - xMin)) * PW;
    const Y = (v) => PH - ((v - yMin) / (yMax - yMin)) * PH;
    let d = '';
    for (let v = xMin; v <= xMax + 1e-9; v += xStep) { d += `M${round(X(v), 2)},0V${PH}`; body.push(label(X(v), PH + 14, fmt(v), { size: 12, cls: 'dg-t2', halo: false })); box.text(X(v), PH + 14, fmt(v), 12); }
    for (let v = yMin; v <= yMax + 1e-9; v += yStep) { d += `M0,${round(Y(v), 2)}H${PW}`; body.push(label(-8, Y(v), fmt(v), { size: 12, cls: 'dg-t2', anchor: 'end', halo: false })); box.text(-8, Y(v), fmt(v), 12, 'end'); }
    body.push(el('path', { d, class: 'dg-grid' }), el('path', { d: `M0,0V${PH}H${PW}`, class: 'dg-axis' }));
    box.rect(0, 0, PW, PH);
    for (const [x, y] of s.points) {
      const cx = X(x); const cy = Y(y);
      body.push(el('path', { d: `M${round(cx - 5, 2)},${round(cy - 5, 2)}L${round(cx + 5, 2)},${round(cy + 5, 2)}M${round(cx - 5, 2)},${round(cy + 5, 2)}L${round(cx + 5, 2)},${round(cy - 5, 2)}`, class: 'dg-ink', 'stroke-width': 2.2 }));
    }
    if (s.yLabel) {
      const x = box.x0 - 14;
      body.push(el('text', { x, y: PH / 2, transform: `rotate(-90 ${x} ${PH / 2})`, 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': 13, class: 'dg-t2' }, tidy(s.yLabel)));
      box.add(x - 10, PH / 2);
    }
    if (s.xLabel) { const y = box.y1 + 14; body.push(label(PW / 2, y, s.xLabel, { size: 13, cls: 'dg-t2', halo: false })); box.text(PW / 2, y, s.xLabel, 13); }
    if (s.title) { const y = box.y0 - 16; body.push(label(PW / 2, y, s.title, { size: 15, weight: 700, halo: false })); box.text(PW / 2, y, s.title, 15); }
    return { box, body };
  },
  describe(s) {
    const pts = s.points.map(([x, y]) => `(${fmt(x)}, ${fmt(y)})`);
    const n = s.points.length;
    const mx = s.points.reduce((a, p) => a + p[0], 0) / n; const my = s.points.reduce((a, p) => a + p[1], 0) / n;
    const cov = s.points.reduce((a, p) => a + (p[0] - mx) * (p[1] - my), 0);
    const sx = Math.sqrt(s.points.reduce((a, p) => a + (p[0] - mx) ** 2, 0)); const sy = Math.sqrt(s.points.reduce((a, p) => a + (p[1] - my) ** 2, 0));
    const r = sx && sy ? cov / (sx * sy) : 0;
    const trend = r > 0.5 ? 'The points go up from left to right.' : r < -0.5 ? 'The points go down from left to right.' : 'The points show no clear pattern.';
    return `A scatter graph${s.title ? ` titled "${tidy(s.title)}"` : ''}${s.xLabel && s.yLabel ? ` of ${tidy(s.yLabel)} against ${tidy(s.xLabel)}` : ''} with ${plural(n, 'point')}: ${pts.join(', ')}. ${trend}`;
  },
};

export const MORE = { functionMachine, dotPlot, scatterGraph };
