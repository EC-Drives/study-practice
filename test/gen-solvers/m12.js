// Independent answers for the m12 Data handling generators, worked out again from the question
// text and the diagram data (chart values, table rows, Venn regions), and the misconception rules
// that must reproduce each wrong option from its code. Shares no code with js/generators.

import { Q, qadd, qsub, qmul, qdiv, qnum, qtext, parseQ, numbersIn } from './lib.js';

const n = (t) => qnum(parseQ(String(t)));
const total = (a) => a.reduce((s, x) => s + x, 0);
const asc = (a) => [...a].sort((x, y) => x - y);
const midOf = (a) => { const s = asc(a); const k = s.length; return k % 2 ? s[(k - 1) / 2] : (s[k / 2 - 1] + s[k / 2]) / 2; };
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** Where a name appears in a text (whole words, any case, an optional plural s), or -1. */
const at = (text, name) => { const m = new RegExp(`(?<![\\w])${esc(name)}s?(?![\\w])`, 'i').exec(text); return m ? m.index : -1; };
/** The names from a list that appear in the text, in the order they appear. */
const mentioned = (text, names) => names.map((c) => [c, at(text, c)]).filter(([, i]) => i >= 0).sort((a, b) => a[1] - b[1]).map(([c]) => c);
/** The question part of a prompt: everything after its first sentence. */
const ask = (q) => q.prompt.slice(q.prompt.indexOf('. ') + 2);

// ---------------------------------------------------------------- averages

function avgData(q) {
  const stat = q.prompt.match(/\b(mean|median|mode|range)\b/)[1];
  if (q.diagram) {
    const rows = q.diagram.rows.map(([x, f]) => [n(x), Number(f)]);
    const data = rows.flatMap(([x, f]) => Array(f).fill(x));
    return { stat, table: true, xs: rows.map((r) => r[0]), fs: rows.map((r) => r[1]), data, raw: null };
  }
  const list = q.prompt.match(/:\s*((?:\d+, )+\d+)\./)[1].split(', ').map(Number);
  return { stat, table: false, data: list, raw: list };
}
function stats(a) {
  const cnt = {};
  for (const x of a) cnt[x] = (cnt[x] || 0) + 1;
  const top = Math.max(...Object.values(cnt));
  const mode = Number(Object.keys(cnt).find((k) => cnt[k] === top));
  return { mean: total(a) / a.length, median: midOf(a), mode, top, range: Math.max(...a) - Math.min(...a), max: Math.max(...a), min: Math.min(...a), sum: total(a), count: a.length };
}

// ---------------------------------------------------------------- bar charts and line graphs

function barRead(q) {
  const dg = q.diagram;
  const cats = dg.categories;
  const v = dg.series[0].values;
  const line = dg.minorStep || dg.yStep;
  const t = ask(q);
  const named = mentioned(t, cats);
  if (/How many more/.test(t)) { const [a, b] = named; return { kind: 'more', ans: v[cats.indexOf(a)] - v[cats.indexOf(b)], a: v[cats.indexOf(a)], b: v[cats.indexOf(b)], line, v }; }
  if (/altogether/.test(t)) return { kind: 'all', ans: total(v), line, v };
  const i = cats.indexOf(named[0]);
  return { kind: 'value', ans: v[i], i, line, v };
}
function dualRead(q) {
  const dg = q.diagram;
  const cats = dg.categories;
  const [a, b] = dg.series.map((s) => s.values);
  const t = ask(q);
  if (/fraction/.test(t)) {
    const cat = mentioned(t, cats)[0];
    const i = cats.indexOf(cat);
    const s = mentioned(t, dg.series.map((x) => x.name));
    const which = dg.series.findIndex((x) => x.name === s[s.length - 1]);
    const mine = which === 0 ? a[i] : b[i];
    const other = which === 0 ? b[i] : a[i];
    return { kind: 'frac', mine, other, all: total(which === 0 ? a : b) };
  }
  const diffs = a.map((x, j) => Math.abs(x - b[j]));
  return { kind: 'widest', cat: cats[diffs.indexOf(Math.max(...diffs))], a, b, cats };
}
function lineRead(q) {
  const dg = q.diagram;
  const cats = dg.categories;
  const v = dg.series[0].values;
  const w = dg.series[1] ? dg.series[1].values : null;
  const line = dg.minorStep || dg.yStep;
  const t = ask(q);
  if (/Between which two readings/.test(t)) {
    const ch = v.slice(1).map((x, j) => x - v[j]);
    const iv = (j) => `Between ${cats[j]} and ${cats[j + 1]}`;
    return { kind: 'most', text: iv(ch.indexOf(Math.max(...ch))), ch, iv, v };
  }
  if (/furthest apart/.test(t)) {
    const gaps = v.map((x, j) => Math.abs(x - w[j]));
    return { kind: 'widest', text: cats[gaps.indexOf(Math.max(...gaps))], v, w, cats };
  }
  const named = mentioned(t, cats);
  if (/By how much did/.test(t)) { const [i, j] = named.map((c) => cats.indexOf(c)); return { kind: 'change', ans: Math.abs(v[j] - v[i]), vi: v[i], vj: v[j], line }; }
  if (w) {
    const i = cats.indexOf(named[0]);
    return { kind: 'gap', ans: Math.abs(v[i] - w[i]), hv: Math.max(v[i], w[i]), lv: Math.min(v[i], w[i]), line };
  }
  const i = cats.indexOf(named[0]);
  return { kind: 'value', ans: v[i], i, v, line };
}

// ---------------------------------------------------------------- pie charts

function pieRead(q) {
  const N = n(numbersIn(q.prompt)[0]);
  if (q.diagram.type === 'table') {
    const cat = q.prompt.match(/should the (.+) sector be\?/)[1];
    const count = Number(q.diagram.rows.find((r) => r[0] === cat)[1]);
    return { draw: true, N, count, ans: (count * 360) / N };
  }
  const slices = q.diagram.slices;
  const cat = mentioned(ask(q).replace(/^.*?\. /, ''), slices.map((s) => s.label)).pop();
  const sl = slices.find((s) => s.label === cat);
  const sliceTotal = total(slices.map((s) => s.value));
  const m = q.prompt.match(/angle of (\d+)°/);
  const angle = m ? Number(m[1]) : (sl.value * 360) / sliceTotal;
  return { draw: false, N, angle, ans: (N * angle) / 360, fromChart: (N * sl.value) / sliceTotal };
}

// ---------------------------------------------------------------- Venn and Carroll

function property(label) {
  let m;
  const t = label.trim();
  if ((m = t.match(/^Not (.*)$/))) { const p = property(t.slice(4).replace(/^a /, '').replace(/^(\w)/, (c) => c.toUpperCase())); return { test: (x) => !p.test(x), t: p.t }; }
  if (/^Even/.test(t)) return { test: (x) => x % 2 === 0 };
  if (/^Odd/.test(t)) return { test: (x) => x % 2 === 1 };
  if ((m = t.match(/^Multiples? of (\d+)/i))) return { test: (x) => x % Number(m[1]) === 0 };
  if ((m = t.match(/^Greater than (\d+)/i))) return { test: (x) => x > Number(m[1]), t: Number(m[1]) };
  if ((m = t.match(/^Less than (\d+)/i))) return { test: (x) => x < Number(m[1]), t: Number(m[1]) };
  if (/^Square numbers?/i.test(t)) return { test: (x) => Math.round(Math.sqrt(x)) ** 2 === x };
  if ((m = t.match(/^Factors? of (\d+)/i))) return { test: (x) => Number(m[1]) % x === 0 };
  throw new Error(`unknown property ${label}`);
}
function vennSetup(q) {
  const dg = q.diagram;
  if (dg.type === 'venn') {
    const [A, B] = dg.sets.map(property);
    const name = (a, b) => (a && b ? 'In the overlap of both circles' : a ? `In '${dg.sets[0]}' only` : b ? `In '${dg.sets[1]}' only` : 'Outside both circles');
    const placed = [];
    for (const [r, items] of Object.entries(dg.regions || {})) for (const it of items) placed.push({ x: Number(it), a: r === 'A' || r === 'AB', b: r === 'B' || r === 'AB' });
    return { A, B, name, placed };
  }
  const A = property(dg.columns[0]); const B = property(dg.rows[0]);
  const name = (a, b) => `'${a ? dg.columns[0] : dg.columns[1]}' and '${b ? dg.rows[0] : dg.rows[1]}'`;
  const placed = [];
  dg.cells.forEach((row, ri) => row.forEach((items, ci) => items.forEach((it) => placed.push({ x: Number(it), a: ci === 0, b: ri === 0 }))));
  return { A, B, name, placed };
}
function vennCountNums(q) {
  const [N, a, b, both] = numbersIn(q.prompt).map(Number);
  const t = q.prompt.slice(q.prompt.lastIndexOf('. ', q.prompt.indexOf('How many')) + 2);
  const kind = /neither/.test(t) ? 'neither' : /but not/.test(t) ? 'aOnly' : 'atLeast';
  const ans = kind === 'neither' ? N - (a + b - both) : kind === 'aOnly' ? a - both : a + b - both;
  return { N, a, b, both, kind, ans };
}

// ---------------------------------------------------------------- tallies and frequency tables

function tallyRead(q) {
  const dg = q.diagram;
  const t = ask(q);
  if (/^The (table|dot plot) shows/.test(q.prompt)) {
    const rows = dg.type === 'dotPlot'
      ? [...new Set(dg.values)].sort((a, b2) => a - b2).map((x) => [x, dg.values.filter((y) => y === x).length])
      : dg.rows.map(([x, f]) => [n(x), Number(f)]);
    const m = t.match(/more than (\d+)/);
    if (m) { const k = Number(m[1]); const big = rows.filter(([x]) => x > k); return { kind: 'more', ans: total(big.map((r) => r[1])), rows, k, big }; }
    return { kind: 'sum', ans: total(rows.map(([x, f]) => x * f)), rows };
  }
  const cats = dg.rows.map((r) => r[0]);
  const freq = (r) => { const last = r[r.length - 1]; return last === '?' ? r[1].tally : Number(last); };
  const named = mentioned(t, cats);
  if (/altogether/.test(t)) return { kind: 'all', ans: total(dg.rows.map(freq)), fs: dg.rows.map(freq) };
  if (/How many more/.test(t)) { const [a, b] = named.map((c) => freq(dg.rows[cats.indexOf(c)])); return { kind: 'more', ans: a - b, a, b }; }
  const tl = dg.rows[cats.indexOf(named[0])][1].tally;
  return { kind: 'tally', ans: tl, g: Math.floor(tl / 5), r: tl % 5 };
}

// ---------------------------------------------------------------- solvers

function missingNums(q) {
  const nums = numbersIn(q.prompt).map((x) => parseQ(x));
  if (/durian/.test(q.prompt)) { const [k, m1, k1, m2] = nums; return { ans: qsub(qmul(k1, m2), qmul(k, m1)), wrongCount: qsub(qmul(k, m2), qmul(k, m1)), totalAll: qmul(k1, m2), mean: m2 }; }
  if (/quiz/.test(q.prompt)) { const [k, m1, , k1, m2] = nums; return { ans: qsub(qmul(k1, m2), qmul(k, m1)), wrongCount: qsub(qmul(k, m2), qmul(k, m1)), totalAll: qmul(k1, m2), mean: m2 }; }
  const [cnt, mean, , ...known] = nums;
  const s = known.reduce((a, b) => qadd(a, b), Q(0));
  return { ans: qsub(qmul(cnt, mean), s), wrongCount: qsub(qmul(qsub(cnt, Q(1)), mean), s), totalAll: qmul(cnt, mean), mean };
}
function outlierNums(q) {
  const nums = numbersIn(q.prompt).map(Number);
  if (/removed/.test(q.prompt)) {
    const [n6, m, bad, k] = nums;
    const left = n6 * m - bad;
    return { kind: 'remove', ans: left / k, old: m, wrongCount: left / n6, totalOnly: left };
  }
  const k = nums[0];
  const vals = nums.slice(1, k + 1);
  const X = nums[k + 1];
  const S = total(vals);
  const newMean = (S + X) / (k + 1);
  const old = S / k;
  if (/go up/.test(q.prompt)) return { kind: 'change', ans: newMean - old, newMean, old, wrongCount: (S + X) / k - old };
  return { kind: 'mean', ans: newMean, old, wrongCount: (S + X) / k, median: midOf([...vals, X]) };
}

export const SOLVERS = {
  'm12.averages': (q) => {
    const d = avgData(q);
    const s = stats(d.data);
    return { value: s[d.stat] };
  },
  'm12.mean-missing': (q) => ({ value: qnum(missingNums(q).ans) }),
  'm12.outlier': (q) => ({ value: outlierNums(q).ans }),
  'm12.read-bar-chart': (q) => {
    if (q.diagram.series.length === 2) {
      const r = dualRead(q);
      if (r.kind === 'frac') { const f = Q(r.mine, r.mine + r.other); return { value: qnum(f), text: qtext(f) }; }
      return { text: r.cat };
    }
    return { value: barRead(q).ans };
  },
  'm12.line-graph': (q) => {
    const r = lineRead(q);
    if (r.kind === 'most' || r.kind === 'widest') return { text: r.text };
    return { value: r.ans };
  },
  'm12.pie-chart': (q) => {
    const r = pieRead(q);
    if (!r.draw && Math.abs(r.ans - r.fromChart) > 1e-9) throw new Error('the chart does not match the angle in the text');
    return { value: r.ans };
  },
  'm12.venn-carroll': (q) => {
    if (/There are \d+/.test(q.prompt)) return { value: vennCountNums(q).ans };
    const s = vennSetup(q);
    if (/wrong place/.test(q.prompt)) {
      const bad = s.placed.filter((p) => s.A.test(p.x) !== p.a || s.B.test(p.x) !== p.b);
      if (bad.length !== 1) throw new Error(`${bad.length} misplaced numbers`);
      return { value: bad[0].x };
    }
    const x = Number(q.prompt.match(/the number (\d+)/)[1]);
    return { text: s.name(s.A.test(x), s.B.test(x)) };
  },
  'm12.tally-frequency': (q) => ({ value: tallyRead(q).ans }),
};

// ---------------------------------------------------------------- misconception rules

const avgRule = (fn) => (q) => { const d = avgData(q); return fn(d, stats(d.data)); };

export const MIS = {
  'm12.averages': {
    'AVG-MEAN-MEDIAN-SWAP': avgRule((d, s) => [s.mean, s.median]),
    'AVG-WRONG-AVERAGE': avgRule((d, s) => [s.mean, s.median]),
    'AVG-MEAN-WRONG-COUNT': avgRule((d, s) => (d.table ? [s.sum / d.xs.length] : [s.sum / (s.count - 1), s.sum / (s.count + 1)])),
    'AVG-TOTAL-ONLY': avgRule((d, s) => [s.sum]),
    'AVG-MEDIAN-UNSORTED': avgRule((d) => { const r = d.raw; const k = r.length; return [k % 2 ? r[(k - 1) / 2] : (r[k / 2 - 1] + r[k / 2]) / 2]; }),
    'AVG-MEDIAN-EVEN-ONE': avgRule((d) => { const s = asc(d.data); const k = s.length; return [s[k / 2 - 1], s[k / 2]]; }),
    'AVG-MEDIAN-POSITION': avgRule((d, s) => [(s.count + 1) / 2]),
    'AVG-MODE-FREQ': avgRule((d, s) => [s.top]),
    'AVG-MODE-LARGEST': avgRule((d, s) => [s.max]),
    'AVG-RANGE-AS-MAX': avgRule((d, s) => [s.max]),
    'AVG-RANGE-ADD': avgRule((d, s) => [s.max + s.min]),
    'AVG-RANGE-UNSORTED': avgRule((d) => [Math.abs(d.raw[d.raw.length - 1] - d.raw[0])]),
    'AVG-FREQ-IGNORED': avgRule((d) => [total(d.xs) / d.xs.length, midOf(d.xs)]),
    'AVG-FREQ-AS-DATA': avgRule((d) => [total(d.fs) / d.fs.length, midOf(d.fs), Math.max(...d.fs) - Math.min(...d.fs)]),
  },
  'm12.mean-missing': {
    'AVG-MEAN-WRONG-COUNT': (q) => [qnum(missingNums(q).wrongCount)],
    'AVG-TOTAL-ONLY': (q) => [qnum(missingNums(q).totalAll)],
    'AVG-MISSING-IS-MEAN': (q) => [qnum(missingNums(q).mean)],
  },
  'm12.outlier': {
    'AVG-OLD-MEAN': (q) => [outlierNums(q).old],
    'AVG-MEAN-WRONG-COUNT': (q) => [outlierNums(q).wrongCount],
    'AVG-TOTAL-ONLY': (q) => [outlierNums(q).totalOnly],
    'AVG-MEAN-MEDIAN-SWAP': (q) => [outlierNums(q).median],
    'AVG-CHANGE-AS-MEAN': (q) => [outlierNums(q).newMean],
  },
  'm12.read-bar-chart': {
    'DATA-SCALE-AS-ONE': (q) => { const r = barRead(q); return [r.ans / r.line]; },
    'DATA-NEXT-GRIDLINE': (q) => { const r = barRead(q); return [r.ans + r.line, r.ans - r.line]; },
    'DATA-WRONG-ITEM': (q) => { const r = barRead(q); return [r.v[r.i - 1], r.v[r.i + 1]].filter((x) => x != null); },
    'DATA-ONE-VALUE': (q) => { const r = barRead(q); return [r.a, r.b]; },
    'OP-SWAP': (q) => { const r = barRead(q); return [r.a + r.b]; },
    'DATA-TOTAL-MISSED-ITEM': (q) => { const r = barRead(q); return r.v.map((x) => r.ans - x); },
    'DATA-HIGHEST-NOT-DIFFERENCE': (q) => {
      const r = dualRead(q);
      const all = [...r.a, ...r.b];
      const tots = r.a.map((x, j) => x + r.b[j]);
      return [r.cats[all.indexOf(Math.max(...all)) % r.cats.length], r.cats[tots.indexOf(Math.max(...tots))]];
    },
    'RATIO-PART-AS-WHOLE': (q) => { const r = dualRead(q); return [r.mine / r.other]; },
    'PCT-OF-WRONG-WHOLE': (q) => { const r = dualRead(q); return [r.other / (r.mine + r.other), r.mine / r.all]; },
  },
  'm12.line-graph': {
    'DATA-NEXT-GRIDLINE': (q) => { const r = lineRead(q); return [r.ans + r.line, r.ans - r.line]; },
    'DATA-WRONG-ITEM': (q) => { const r = lineRead(q); return [r.v[r.i - 1], r.v[r.i + 1]].filter((x) => x != null); },
    'DATA-HIGHEST-NOT-CHANGE': (q) => { const r = lineRead(q); const h = r.v.indexOf(Math.max(...r.v)); return [r.iv(h - 1)]; },
    'DATA-FALL-AS-RISE': (q) => { const r = lineRead(q); return [r.iv(r.ch.indexOf(Math.min(...r.ch)))]; },
    'DATA-ONE-VALUE': (q) => { const r = lineRead(q); return r.kind === 'change' ? [r.vi, r.vj] : [r.hv, r.lv]; },
    'OP-SWAP': (q) => { const r = lineRead(q); return r.kind === 'change' ? [r.vi + r.vj] : [r.hv + r.lv]; },
    'DATA-SCALE-AS-ONE': (q) => { const r = lineRead(q); return [r.ans / r.line]; },
    'DATA-HIGHEST-NOT-DIFFERENCE': (q) => { const r = lineRead(q); const all = [...r.v, ...r.w]; return [r.cats[all.indexOf(Math.max(...all)) % r.cats.length]]; },
  },
  'm12.pie-chart': {
    'DATA-ANGLE-AS-COUNT': (q) => [pieRead(q).angle],
    'DATA-PIE-PERCENT': (q) => { const r = pieRead(q); return r.draw ? [(r.count * 100) / r.N] : [(r.N * r.angle) / 100]; },
    'PCT-OF-WRONG-WHOLE': (q) => { const r = pieRead(q); return r.draw ? [360 - r.ans] : [r.N - r.ans]; },
    'DATA-COUNT-AS-ANGLE': (q) => [pieRead(q).count],
    'DATA-PIE-DIVIDE-GROUP': (q) => [360 / pieRead(q).count],
  },
  'm12.venn-carroll': {
    'VENN-PROPERTY-SLIP': (q) => {
      const s = vennSetup(q);
      if (/wrong place/.test(q.prompt)) return s.placed.filter((p) => s.A.test(p.x) === p.a && s.B.test(p.x) === p.b).map((p) => p.x);
      const x = Number(q.prompt.match(/the number (\d+)/)[1]);
      const a = s.A.test(x); const b = s.B.test(x);
      return [s.name(!a, b), s.name(a, !b), s.name(!a, !b)];
    },
    'VENN-BOUNDARY': (q) => {
      const s = vennSetup(q);
      const x = Number(q.prompt.match(/the number (\d+)/)[1]);
      const a = s.A.test(x); const b = s.B.test(x);
      return [s.A.t === x ? s.name(!a, b) : null, s.B.t === x ? s.name(a, !b) : null].filter(Boolean);
    },
    'VENN-OVERLAP-TWICE': (q) => { const r = vennCountNums(q); return [r.N - r.a - r.b, r.a + r.b]; },
    'VENN-OVERLAP-ADDED': (q) => { const r = vennCountNums(q); return [r.N - r.a - r.b - r.both, r.a + r.b + r.both]; },
    'VENN-OVERLAP-IGNORED': (q) => [vennCountNums(q).a],
    'PCT-OF-WRONG-WHOLE': (q) => { const r = vennCountNums(q); return [r.a + r.b - r.both, r.N - r.b, r.N - (r.a + r.b - r.both)]; },
  },
  'm12.tally-frequency': {
    'DATA-TALLY-GATE-FOUR': (q) => { const r = tallyRead(q); return [4 * r.g + r.r]; },
    'DATA-TALLY-GATE-ONE': (q) => { const r = tallyRead(q); return [r.g + r.r]; },
    'DATA-TALLY-SINGLES-MISSED': (q) => { const r = tallyRead(q); return [5 * r.g]; },
    'DATA-TOTAL-MISSED-ITEM': (q) => { const r = tallyRead(q); return r.kind === 'sum' ? r.rows.map(([x, f]) => r.ans - x * f) : r.fs.map((f) => r.ans - f); },
    'DATA-ONE-VALUE': (q) => { const r = tallyRead(q); return [r.a, r.b]; },
    'OP-SWAP': (q) => { const r = tallyRead(q); return [r.a + r.b]; },
    'DATA-FREQ-SUM-ONLY': (q) => [total(tallyRead(q).rows.map((x) => x[1]))],
    'DATA-VALUES-SUM-ONLY': (q) => [total(tallyRead(q).rows.map((x) => x[0]))],
    'DATA-BOUNDARY': (q) => { const r = tallyRead(q); const row = r.rows.find(([x]) => x === r.k); return [r.ans + (row ? row[1] : 0)]; },
    'DATA-TIMES-VALUES': (q) => { const r = tallyRead(q); return [total(r.big.map(([x, f]) => x * f))]; },
    'DATA-ROWS-NOT-FREQ': (q) => [tallyRead(q).big.length],
  },
};
void qdiv;
