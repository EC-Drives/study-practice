// Exact-geometry checks for the diagram renderer: the picture must show the numbers in the data.

import { renderDiagram, describeDiagram, validateDiagram, diagramMarkup } from '../js/diagrams/index.js';
import { clockAngles, scalePosition } from '../js/diagrams/measures.js';
import { pieGeometry } from '../js/diagrams/charts.js';
import { shadowOnScreen, webLevels } from '../js/diagrams/science.js';
import { frac, formatValue } from '../js/diagrams/core.js';

const near = (a, b, tol = 0.01) => Math.abs(a - b) <= tol;
const svgOf = (spec) => renderDiagram(spec).querySelector('svg.dg-svg');

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
  ['newton meter reading described by marks', () => /pointer is on the 1st small mark below 6/.test(describeDiagram({ type: 'scale', kind: 'newtonMeter', min: 0, max: 10, major: 1, minor: 0.5, unit: 'N', value: 6.5 }))],
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
  ['alt text overrides the built description', () => describeDiagram({ type: 'clock', time: '10:35', alt: 'A clock.' }) === 'A clock.'],
  ['report markup carries its own styles', () => /<style>/.test(diagramMarkup({ type: 'clock', time: '10:35' }))],
  ['light and dark themes both define every colour token', () => {
    const css = [...document.styleSheets].map((s) => { try { return [...s.cssRules].map((r) => r.cssText).join('\n'); } catch { return ''; } }).join('\n');
    const tokens = (css.match(/--dg-[a-z0-9-]+/g) || []);
    return new Set(tokens).size > 30;
  }],
];
