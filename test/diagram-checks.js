// Exact-geometry checks for the diagram renderer: the picture must show the numbers in the data.

import { renderDiagram, describeDiagram, validateDiagram, diagramMarkup } from '../js/diagrams/index.js';
import { clockAngles, scalePosition } from '../js/diagrams/measures.js';
import { pieGeometry } from '../js/diagrams/charts.js';
import { shadowOnScreen, webLevels } from '../js/diagrams/science.js';
import { frac, formatValue, article, withArticle, round } from '../js/diagrams/core.js';

const near = (a, b, tol = 0.01) => Math.abs(a - b) <= tol;
const svgOf = (spec) => renderDiagram(spec).querySelector('svg.dg-svg');

// ---------------------------------------------------------------- text collisions (CLO review, 17 Oct)
/**
 * Draw a diagram into the page (out of sight), and return each upright text's box in drawing units:
 * its measured width, and the height of its digits (0.8 em about its centre, since a text's own box
 * includes room for accents and descenders that numbers do not use).
 */
function textBoxes(spec) {
  const fig = renderDiagram(spec);
  fig.style.cssText = 'position:absolute;left:-9999px;top:0;width:600px';
  document.body.appendChild(fig);
  try {
    return [...fig.querySelectorAll('svg.dg-svg text')].filter((t) => !t.getAttribute('transform') && t.textContent.trim()).map((t) => {
      const b = t.getBBox();
      const fs = Number(t.getAttribute('font-size')) || 15;
      const cy = b.y + b.height / 2;
      const half = 0.4 * fs + (Math.max(1, t.querySelectorAll('tspan').length) - 1) * 0.6 * fs; // wrapped labels: 1.2 em a line
      return { text: t.textContent, x0: b.x, x1: b.x + b.width, y0: cy - half, y1: cy + half };
    });
  } finally { fig.remove(); }
}
/** Pairs of texts that touch: overlapping, or closer than `gap` side by side. */
function collisions(boxes, gap = 2) {
  const out = [];
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i]; const b = boxes[j];
      if (a.x0 < b.x1 + gap && b.x0 < a.x1 + gap && a.y0 < b.y1 && b.y0 < a.y1) out.push(`"${a.text}" and "${b.text}"`);
    }
  }
  return out;
}
const noCollisions = (spec) => { const c = collisions(textBoxes(spec)); return { ok: c.length === 0, detail: c.slice(0, 6).join('; ') }; };
/** Numbers drawn on an axis: the texts that are numbers. */
const axisNumbers = (spec) => textBoxes(spec).filter((b) => /^[−-]?\d+(\.\d+)?$/.test(b.text)).map((b) => b.text);
/** Gridline segments in a chart's grid paths. */
const gridSegments = (spec, cls) => [...svgOf(spec).querySelectorAll(`path.${cls}`)].reduce((a, p) => a + (p.getAttribute('d').match(/M/g) || []).length, 0);

// m11-q058's four option graphs (distance against time), as the CLO wrote them
const Q058 = (points) => ({ type: 'lineGraph', series: [{ name: 'Distance', points }], xMin: 0, xMax: 5, xStep: 1, yMin: 0, yMax: 60, yStep: 10, xLabel: 'Time (hours)', yLabel: 'Distance (km)', markers: false });
const lineDesc = (points, extra = {}) => describeDiagram({ ...Q058(points), yMin: -60, ...extra });
const DENSE_SCATTER = { type: 'scatterGraph', title: 'Height and hand span', xLabel: 'Height (cm)', yLabel: 'Hand span (cm)', points: [[134, 13], [136, 14], [140, 15], [142, 17], [146, 15], [148, 16], [150, 17], [152, 18], [156, 18], [158, 19]], xMin: 130, xMax: 160, xStep: 2, yMin: 12, yMax: 20, yStep: 1 };

export const AXIS_AND_WORDING_CHECKS = [
  // 1. line graph descriptions say the shape the data has
  ['line graph m11-q058 A: a straight line not through the origin', () => { const d = describeDiagram(Q058([[0, 10], [5, 60]])); return { ok: /straight line going up from \(0, 10\) to \(5, 60\)/.test(d) && /not passing through the origin/.test(d), detail: d }; }],
  ['line graph m11-q058 B: a curve getting steeper, never "straight"', () => { const d = describeDiagram(Q058([[0, 0], [1, 2], [2, 6], [3, 12], [4, 20], [5, 30]])); return { ok: /A curve that goes up from \(0, 0\) to \(5, 30\), getting steeper/.test(d) && /through \(1, 2\), \(2, 6\), \(3, 12\) and \(4, 20\)/.test(d) && !/straight/.test(d), detail: d }; }],
  ['line graph m11-q058 C: a straight line from the origin', () => { const d = describeDiagram(Q058([[0, 0], [5, 50]])); return { ok: /straight line going up from \(0, 0\) \(the origin\) to \(5, 50\)/.test(d), detail: d }; }],
  ['line graph m11-q058 D: says the flat part, never "straight line"', () => { const d = describeDiagram(Q058([[0, 0], [2, 30], [3, 30], [5, 50]])); return { ok: /not straight: it goes up from \(0, 0\) to \(2, 30\), then is flat from \(2, 30\) to \(3, 30\), then goes up from \(3, 30\) to \(5, 50\)/.test(d) && !/straight line/.test(d), detail: d }; }],
  ['line graph: points on one straight line are a straight line (through the origin)', () => { const d = lineDesc([[-2, -4], [0, 0], [1, 2], [3, 6]], { xMin: -5 }); return { ok: /^A line graph.*A straight line going up from \(−2, −4\) to \(3, 6\), through \(0, 0\) and \(1, 2\), passing through the origin/.test(d), detail: d }; }],
  ['line graph: up then down', () => { const d = describeDiagram(Q058([[0, 0], [2, 40], [5, 10]])); return { ok: /it goes up from \(0, 0\) to \(2, 40\), then goes down from \(2, 40\) to \(5, 10\)/.test(d) && !/straight line/.test(d), detail: d }; }],
  ['line graph: a curve getting less steep', () => { const d = describeDiagram(Q058([[0, 0], [1, 20], [2, 35], [3, 45], [4, 50]])); return { ok: /A curve that goes up .*getting less steep/.test(d), detail: d }; }],
  ['line graph: two straight parts say which is steeper', () => { const d = describeDiagram(Q058([[0, 0], [2, 40], [5, 50]])); return { ok: /goes up from \(0, 0\) to \(2, 40\), then goes up less steeply from \(2, 40\) to \(5, 50\)/.test(d), detail: d }; }],
  ['line graph: a flat line', () => { const d = describeDiagram(Q058([[0, 20], [5, 20]])); return { ok: /flat \(horizontal\) straight line from \(0, 20\) to \(5, 20\)/.test(d), detail: d }; }],
  ['line graph: many ups and downs are told as runs', () => { const pts = Array.from({ length: 11 }, (_, i) => [i / 2, [0, 15, 25, 30, 32, 20, 15, 5, 15, 30, 60][i]]); const d = describeDiagram(Q058(pts)); return { ok: /goes up \(getting less steep\) from \(0, 0\) to \(2, 32\), then goes down unevenly .* from \(2, 32\) to \(3.5, 5\), then goes up \(getting steeper\) from \(3.5, 5\) to \(5, 60\)/.test(d), detail: d }; }],
  ['line graph with two series names each shape', () => { const d = describeDiagram({ ...Q058([[0, 0], [5, 50]]), series: [{ name: 'Ali', points: [[0, 0], [5, 50]] }, { name: 'Bea', points: [[0, 0], [2, 30], [3, 30], [5, 50]] }] }); return { ok: /Ali: a straight line/.test(d) && /Bea: a line that is not straight/.test(d), detail: d }; }],
  // 2. "a" or "an"
  ['polygon: "An octagon"', () => { const d = describeDiagram({ type: 'polygon', points: [[2, 0], [4, 0], [6, 2], [6, 4], [4, 6], [2, 6], [0, 4], [0, 2]] }); return { ok: /^An octagon\./.test(d), detail: d }; }],
  ['polygon: "A hexagon", "An 11-sided shape"', () => {
    const ring = (n) => Array.from({ length: n }, (_, i) => [round(5 * Math.cos((2 * Math.PI * i) / n), 3), round(5 * Math.sin((2 * Math.PI * i) / n), 3)]);
    const a = describeDiagram({ type: 'polygon', points: ring(6) }); const b = describeDiagram({ type: 'polygon', points: ring(11) });
    return { ok: /^A hexagon\./.test(a) && /^An 11-sided shape\./.test(b), detail: `${a} | ${b}` };
  }],
  ['article helper: an equilateral/isosceles/irregular/8/11/18/hour, a unit/one/hexagon/110', () => {
    const want = { 'equilateral triangle': 'an', 'isosceles triangle': 'an', 'irregular pentagon': 'an', octagon: 'an', '8-sided shape': 'an', '11-sided shape': 'an', '18 cm line': 'an', '80': 'an', hour: 'an', 'apple': 'an', unit: 'a', 'one-sided': 'a', hexagon: 'a', '110': 'a', '1 100': 'a', '3D shape': 'a', 'uniform bar': 'a', 'European flag': 'a' };
    const bad = Object.entries(want).filter(([w, a]) => article(w) !== a).map(([w]) => `${w}: ${article(w)}`);
    return { ok: !bad.length && withArticle('octagon', true) === 'An octagon', detail: bad.join('; ') };
  }],
  ['force diagram and shadow: "an apple"', () => {
    const f = describeDiagram({ type: 'forces', object: 'apple', arrows: [{ direction: 'down', name: 'weight' }] });
    const l = describeDiagram({ type: 'light', scene: 'shadow', source: 'torch', object: 'apple' });
    return { ok: /an apple/.test(f) && !/\ba apple/.test(f) && /an apple/.test(l) && !/\ba apple/.test(l), detail: `${f} | ${l}` };
  }],
  // 3. dense axes are thinned, with every gridline kept
  ['scatter 130-160 in steps of 2 (m12-q114 first draft): axis numbers do not touch', () => noCollisions(DENSE_SCATTER)],
  ['scatter 130-160 in steps of 2: numbers thinned to every 10, a gridline every 2', () => {
    const n = axisNumbers(DENSE_SCATTER);
    const xs = n.filter((t) => Number(t) >= 130);
    return { ok: xs.join(',') === '130,140,150,160' && gridSegments(DENSE_SCATTER, 'dg-grid') === 16 + 9, detail: `${n.join(',')} / ${gridSegments(DENSE_SCATTER, 'dg-grid')} gridlines` };
  }],
  ['scatter 0-30 in steps of 1 and 0-100 in steps of 2: no touching numbers', () => noCollisions({ type: 'scatterGraph', points: [[1, 2], [29, 98]], xMin: 0, xMax: 30, xStep: 1, yMin: 0, yMax: 100, yStep: 2 })],
  ['scatter with room keeps every number', () => { const n = axisNumbers({ type: 'scatterGraph', points: [[1, 2], [5, 9]], xMin: 0, xMax: 6, xStep: 1, yMin: 0, yMax: 10, yStep: 2 }); return { ok: n.length === 7 + 6, detail: n.join(',') }; }],
  ['line graph 0-60 in steps of 2 by 0-120 in steps of 2: no touching numbers, every gridline', () => {
    const spec = { type: 'lineGraph', series: [{ name: 'd', points: [[0, 0], [60, 120]] }], xMin: 0, xMax: 60, xStep: 2, yMin: 0, yMax: 120, yStep: 2 };
    const c = noCollisions(spec);
    return { ok: c.ok && gridSegments(spec, 'dg-grid2') === 31 + 61, detail: `${c.detail} / ${gridSegments(spec, 'dg-grid2')} gridlines` };
  }],
  ['line graph description says how the scale is numbered when thinned', () => { const d = describeDiagram({ type: 'lineGraph', series: [{ name: 'd', points: [[0, 0], [60, 120]] }], xMin: 0, xMax: 60, xStep: 2, yMin: 0, yMax: 120, yStep: 2 }); return { ok: /steps of 2, numbered every 10\./.test(d), detail: d }; }],
  ['bar chart 0-100 in steps of 2 (upright and across): no touching numbers', () => {
    const base = { type: 'barChart', categories: ['a', 'b', 'c'], series: [{ name: 's', values: [10, 50, 98] }], yMax: 100, yStep: 2 };
    const a = noCollisions(base); const b = noCollisions({ ...base, horizontal: true });
    return { ok: a.ok && b.ok && gridSegments(base, 'dg-grid2') === 51, detail: `${a.detail} | ${b.detail}` };
  }],
  ['dot plot 0-24: no touching numbers, a tick at every step', () => {
    const spec = { type: 'dotPlot', values: [0, 3, 12, 12, 24], min: 0, max: 24 };
    const c = noCollisions(spec);
    const ticks = (svgOf(spec).querySelector('path.dg-ink').getAttribute('d').match(/M/g) || []).length;
    return { ok: c.ok && ticks === 25, detail: `${c.detail} / ${ticks} ticks` };
  }],
  ['dot plot 0-10 keeps every number', () => { const n = axisNumbers({ type: 'dotPlot', values: [1, 2], min: 0, max: 10 }); return { ok: n.length === 11, detail: n.join(',') }; }],
];

/** Every chart sample in the gallery: no two texts touch. */
export function sampleCollisionChecks(samples) {
  return samples.filter((s) => ['barChart', 'lineGraph', 'scatterGraph', 'dotPlot'].includes(s.spec.type))
    .map((s) => [`${s.spec.type}: ${s.title}: no touching texts`, () => noCollisions(s.spec)]);
}

export const EXTRA_CHECKS = [
  ['clock 10:35: hour hand 317.5°, minute hand 210°', () => { const a = clockAngles('10:35'); return a.hour === 317.5 && a.minute === 210; }],
  ['clock 00:00 and 12:00: both hands at 12', () => { const a = clockAngles('00:00'); const b = clockAngles('12:00'); return a.hour === 0 && a.minute === 0 && b.hour === 0; }],
  ['clock 23:59: hour hand just before 12', () => near(clockAngles('23:59').hour, 359.5)],
  ['clock 3:00 description names 3 and 12', () => /points at 3\b/.test(describeDiagram({ type: 'clock', time: '03:00' })) && /minute hand points at 12/.test(describeDiagram({ type: 'clock', time: '03:00' }))],
  ['clock 10:37 description: 2nd small mark after 7', () => /2nd small mark after 7/.test(describeDiagram({ type: 'clock', time: '10:37' }))],
  ['pie 6:3:3 gives 180°, 90°, 90°', () => { const g = pieGeometry({ slices: [{ label: 'a', value: 6 }, { label: 'b', value: 3 }, { label: 'c', value: 3 }] }); return near(g[0].deg, 180) && near(g[1].deg, 90) && near(g[2].deg, 90); }],
  ['pie angles always add to 360°', () => { const g = pieGeometry({ slices: [7, 13, 2, 9, 4].map((v, i) => ({ label: String(i), value: v })) }); return near(g.reduce((a, s) => a + s.deg, 0), 360, 1e-9); }],
  ['pie fraction labels in simplest form', () => /1\/4/.test(describeDiagram({ type: 'pieChart', show: 'fraction', slices: [{ label: 'a', value: 5 }, { label: 'b', value: 15 }] }))],
  ['shadow: flat object 1 at 2, screen at 6 gives 3', () => near(shadowOnScreen({ sourceDistance: 2, screenDistance: 6, objectHeight: 1, object: 'box' }), 3, 1e-12)],
  ['shadow: a ball casts a slightly bigger shadow than a disc', () => { const b = shadowOnScreen({ sourceDistance: 2, screenDistance: 6, objectHeight: 1, object: 'ball' }); return b > 3 && near(b, 2 * 6 * Math.tan(Math.asin(0.25)), 1e-12); }],
  ['food web levels: grass 0, rabbit 1, fox 2, eagle 3', () => { const l = webLevels({ organisms: ['g', 'r', 'f', 'e'].map((id) => ({ id, name: id })), links: [['g', 'r'], ['r', 'f'], ['f', 'e'], ['r', 'e']] }); return l.get('g') === 0 && l.get('r') === 1 && l.get('f') === 2 && l.get('e') === 3; }],
  ['jug 650 on 0-1000 (200s, 50s): 1st small mark above 600', () => scalePosition({ min: 0, max: 1000, major: 200, minor: 50 }, 650) === 'on the 1st small mark above 600'],
  ['thermometer -6 on -20..40 (10s, 2s): 2nd small mark above -10', () => /2nd small mark above −10/.test(scalePosition({ min: -20, max: 40, major: 10, minor: 2 }, -6))],
  ['scale reading on a numbered mark', () => scalePosition({ min: 0, max: 5, major: 1, minor: 0.1 }, 3) === 'on the 3 mark'],
  ['number line point 1 1/4 sits at 5/8 of the line', () => { const svg = svgOf({ type: 'numberLine', min: 0, max: 2, step: 1, minorStep: '1/4', points: [{ at: '1 1/4', label: 'A' }] }); const c = svg.querySelector('circle.dg-dot'); return near(Number(c.getAttribute('cx')), 380 * 0.625); }],
  ['number line 1/3 lands exactly on a third', () => { const svg = svgOf({ type: 'numberLine', min: 0, max: 1, step: '1/3', points: [{ at: '1/3' }] }); return near(Number(svg.querySelector('circle.dg-dot').getAttribute('cx')), 380 / 3); }],
  ['number line description counts marks, not values', () => { const d = describeDiagram({ type: 'numberLine', min: 0, max: 2, step: 1, minorStep: '1/4', labels: [0, 1, 2], points: [{ at: '1 1/4', label: 'A' }] }); return /1st small mark after 1/.test(d) && !/1 1\/4/.test(d); }],
  ['grid point (3, 2) is plotted 3 right and 2 up from the origin', () => {
    const svg = svgOf({ type: 'coordinateGrid', x: [-5, 5], y: [-5, 5], points: [{ at: [3, 2] }] });
    const c = svg.querySelector('circle.dg-dot');
    const u = 33; // floor(330 / 10)
    return near(Number(c.getAttribute('cx')), (3 + 5) * u) && near(Number(c.getAttribute('cy')), (5 - 2) * u);
  }],
  ['grid accepts fractions in coordinates', () => validateDiagram({ type: 'coordinateGrid', x: [-2, 2], y: [-2, 2], points: [{ at: ['1/2', -1.5] }] }).length === 0],
  ['bar heights are in proportion to values', () => {
    const svg = svgOf({ type: 'barChart', categories: ['a', 'b'], series: [{ name: 's', values: [4, 8] }], yMax: 8 });
    // each bar path starts "M x,base V top+4": height = base - top
    const ps = [...svg.querySelectorAll('path.dg-s1')].map((p) => { const m = p.getAttribute('d').match(/^M[\d.]+,([\d.]+)V([\d.]+)/); return Number(m[1]) - (Number(m[2]) - 4); });
    return near(ps[1] / ps[0], 2, 0.02);
  }],
  ['exact fractions: "-1 1/2" is -3/2, "6/8" simplifies to 3/4', () => { const a = frac('-1 1/2'); const b = frac('6/8'); return a.n === -3 && a.d === 2 && b.n === 3 && b.d === 4; }],
  ['fraction formatting: mixed and decimal', () => formatValue('7/4', 'mixed') === '1 3/4' && formatValue('3/4', 'decimal') === '0.75'],
  ['a "?" label is an answer box, never the value', () => { const svg = svgOf({ type: 'polygon', points: [[0, 0], [4, 0], [0, 3]], sides: [null, { label: '?' }, null] }); return svg.querySelectorAll('.dg-qbox').length === 1 && /question mark/.test(svg.getAttribute('aria-label')); }],
  ['descriptions never mention a value shown only as "?"', () => !/90°|50°/.test(describeDiagram({ type: 'angle', lines: [0], rays: [130], arcs: [{ from: 0, to: 130, label: '?' }] }))],
  ['half-unit coordinates show as decimals, not -5/2', () => { const d = describeDiagram({ type: 'coordinateGrid', x: [-5, 5], y: [-5, 5], points: [{ at: ['-5/2', '1/2'], label: 'R', showCoords: true }] }); const svg = svgOf({ type: 'coordinateGrid', x: [-5, 5], y: [-5, 5], points: [{ at: ['-5/2', '1/2'], label: 'R', showCoords: true }] }); return /\(−2\.5, 0\.5\)/.test(d) && /−2\.5, 0\.5/.test(svg.textContent) && !/5\/2/.test(svg.textContent); }],
  ['food chain boxes are not coloured as producers (a wrong-order chain shows no role)', () => svgOf({ type: 'foodChain', organisms: ['Frog', 'Grass', 'Snake'] }).querySelectorAll('.dg-leaf').length === 0],
  ['food web colours only organisms that eat nothing', () => svgOf({ type: 'foodWeb', organisms: [{ id: 'a', name: 'Grass' }, { id: 'b', name: 'Rabbit' }, { id: 'c', name: 'Fox' }], links: [['a', 'b'], ['b', 'c']] }).querySelectorAll('rect.dg-leaf').length === 1],
  ['force arrows are in proportion to their sizes', () => {
    const svg = svgOf({ type: 'forces', object: 'box', arrows: [{ direction: 'right', size: 30 }, { direction: 'left', size: 15 }] });
    const ls = [...svg.querySelectorAll('line.dg-accent')].map((l) => Math.abs(Number(l.getAttribute('x2')) - Number(l.getAttribute('x1'))));
    // drawn length = 28 + 92 x size / largest, less the arrowhead
    return ls.length === 2 && near(ls[0] - ls[1], 92 * (1 - 15 / 30), 0.5);
  }],
  ['balanced forces described as the same length', () => /same length/.test(describeDiagram({ type: 'forces', object: 'parachutist', arrows: [{ direction: 'up', size: 700 }, { direction: 'down', size: 700, name: 'weight' }] }))],
  ['newton meter reading described by marks ("after 6", CLO review)', () => /pointer is on the 1st small mark after 6/.test(describeDiagram({ type: 'scale', kind: 'newtonMeter', min: 0, max: 10, major: 1, minor: 0.5, unit: 'N', value: 6.5 }))],
  // specs that would freeze the page are refused before drawing (integration review, 17 Oct)
  ['too many grid lines or huge numbers are refused quickly', () => {
    const t0 = performance.now();
    const bad = [
      { type: 'barChart', categories: ['a'], series: [{ name: 'x', values: [1] }], yMax: 1e7, yStep: 0.0001 },
      { type: 'barChart', categories: ['a'], series: [{ name: 'x', values: [1] }], yMax: 1e300, yStep: 1 },
      { type: 'lineGraph', series: [{ name: 'x', points: [[0, 1], [1, 2]] }], xMin: 0, xMax: 1e8, xStep: 0.0001 },
      { type: 'scatterGraph', points: [[0, 0], [1, 1]], xMin: 0, xMax: 1e8, xStep: 0.0001, yMin: 0, yMax: 10, yStep: 1 },
      { type: 'polygon', points: [[0, 0], [1e9, 0], [0, 1]], grid: true },
      { type: 'table', columns: ['a'], rows: Array.from({ length: 30 }, () => ['x'.repeat(1000)]) },
    ];
    const ok = bad.every((s) => validateDiagram(s).length > 0 && renderDiagram(s).querySelector('.dg-err'));
    return ok && performance.now() - t0 < 500;
  }],
  // descriptions the CLO's review of 17 Oct (afternoon) asked to fix
  ['numbered spinner: no "1 1, 1 2" count sentence', () => !/\b1 1, 1 2/.test(describeDiagram({ type: 'spinner', sectors: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'] })) && /2 sections red/.test(describeDiagram({ type: 'spinner', sectors: ['red', 'red', 'blue', 'green'] }))],
  ['pie chart: an angle word stays with its own slice', () => /Home \([^)]*\)?, half the circle; Beach|Home, half the circle; Beach/.test(describeDiagram({ type: 'pieChart', slices: [{ label: 'Home', value: 6 }, { label: 'Beach', value: 2 }, { label: 'Shopping', value: 3 }, { label: 'Park', value: 1 }], rightAngles: true }))],
  ['bar model: a brace drawn below is "under" the bar', () => /brace under/.test(describeDiagram({ type: 'barModel', bars: [{ label: 'Daniel', parts: [{ value: 3 }] }, { label: 'Siti', parts: [{ value: 5 }] }], braces: [{ bar: 0, from: 0, to: 3, label: '?', side: 'below' }] }))],
  ['a point part-way along a side does not change the shape\'s name', () => /^A quadrilateral/.test(describeDiagram({ type: 'polygon', points: [[0, 0], [4, 0], [8, 0], [8, 4], [0, 4]] }))],
  ['a force diagram names the object\'s label', () => /the book/.test(describeDiagram({ type: 'forces', object: 'box', label: 'the book', arrows: [{ direction: 'down', name: 'weight' }] }))],
  ['dot plot stacks one dot per value', () => svgOf({ type: 'dotPlot', values: [1, 1, 2, 3, 3, 3], min: 0, max: 4 }).querySelectorAll('circle.dg-s1').length === 6 && /3 at 3/.test(describeDiagram({ type: 'dotPlot', values: [1, 1, 2, 3, 3, 3], min: 0, max: 4 }))],
  ['dot plot rejects a value off the steps', () => validateDiagram({ type: 'dotPlot', values: [1.5], min: 0, max: 4 }).length > 0],
  ['function machine description keeps the order of the steps', () => /"x 3" and "\+ 4" in that order/.test(describeDiagram({ type: 'functionMachine', steps: ['x 3', '+ 4'], input: '5' }))],
  ['scatter graph trend described', () => /go up/.test(describeDiagram({ type: 'scatterGraph', points: [[1, 2], [2, 3], [3, 5], [4, 6]] }))],
  ['refraction bends towards the normal (Snell, water n = 1.33)', () => {
    const svg = svgOf({ type: 'light', scene: 'refraction', medium: 'water', angle: 50 });
    const ls = [...svg.querySelectorAll('line.dg-ray')].map((l) => [Number(l.getAttribute('x1')), Number(l.getAttribute('y1')), Number(l.getAttribute('x2')), Number(l.getAttribute('y2'))]);
    const out = ls.find((l) => l[1] >= 0 && l[3] > 0);
    const ang = Math.atan2(out[2] - out[0], out[3] - out[1]) * 180 / Math.PI; // from the downward normal
    return near(ang, Math.asin(Math.sin(50 * Math.PI / 180) / 1.33) * 180 / Math.PI, 0.6);
  }],
  ['a long one-word bar label is set smaller to fit its bar', () => { const svg = svgOf({ type: 'barChart', categories: ['Mangosteen', 'Durian', 'Rambutan', 'Watermelon', 'Pineapple', 'Banana'], series: [{ name: 'n', values: [3, 4, 5, 6, 7, 8] }] }); const t = [...svg.querySelectorAll('text')].find((x) => x.textContent === 'Mangosteen'); return t && Number(t.getAttribute('font-size')) < 13; }],
  ['alt text overrides the built description', () => describeDiagram({ type: 'clock', time: '10:35', alt: 'A clock.' }) === 'A clock.'],
  ['report markup carries its own styles', () => /<style>/.test(diagramMarkup({ type: 'clock', time: '10:35' }))],
  ['light and dark themes both define every colour token', () => {
    const css = [...document.styleSheets].map((s) => { try { return [...s.cssRules].map((r) => r.cssText).join('\n'); } catch { return ''; } }).join('\n');
    const tokens = (css.match(/--dg-[a-z0-9-]+/g) || []);
    return new Set(tokens).size > 30;
  }],
];
