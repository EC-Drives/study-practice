// m12 Data handling: averages from lists and frequency tables, missing values from a mean, the
// effect of an outlier, reading bar charts, line graphs, pie charts, tally charts and frequency
// tables, drawing pie charts, and Venn and Carroll diagrams.
// Patterns and ranges follow the CLO's generator guide (section 2, m12). Every chart is drawn from
// the same numbers as the answer; the value she must read is never written on the chart.

import { F, choices, typedMisconceptions, nearMiss, numericAnswer, fmtInt, person } from './core.js';

const T = 'm12-data-handling';
const SK = {
  mode: 'finding the mode', median: 'finding the median', mean: 'finding the mean', range: 'finding the range',
  missing: 'using the mean to find a missing value', outlier: 'effect of an outlier', read: 'reading and comparing data',
  trend: 'identifying trends', pie: 'reading pie charts and waffle charts', drawPie: 'drawing pie charts',
  venn: 'Venn and Carroll diagrams', tally: 'reading tally charts and frequency tables',
};

export const EXTRA_CODES = {
  'AVG-TOTAL-ONLY': 'Finds the total but stops there (does not divide, or does not take away the known values)',
  'AVG-MEDIAN-POSITION': 'Gives the position of the middle value ((n + 1) ÷ 2) instead of the value itself',
  'AVG-MEDIAN-EVEN-ONE': 'With an even number of values, takes one of the two middle values instead of halfway between them',
  'AVG-MODE-FREQ': 'Gives how many times the mode appears instead of the mode itself',
  'AVG-MODE-LARGEST': 'Gives the largest value instead of the most common one',
  'AVG-WRONG-AVERAGE': 'Works out a different average from the one asked for',
  'AVG-RANGE-ADD': 'Adds the highest and lowest values instead of subtracting',
  'AVG-RANGE-UNSORTED': 'Subtracts the first value in the list from the last, instead of the lowest from the highest',
  'AVG-FREQ-IGNORED': 'Uses only the list of values in a frequency table and ignores how often each one happens',
  'AVG-FREQ-AS-DATA': 'Works with the frequencies (how many times) instead of the data values',
  'AVG-MISSING-IS-MEAN': 'Gives the mean itself as the missing value',
  'AVG-OLD-MEAN': 'Gives the mean from before the change',
  'AVG-CHANGE-AS-MEAN': 'Gives the new mean when the question asks how much the mean changed',
  'DATA-SCALE-AS-ONE': 'Counts each gridline on the scale as 1 instead of using the scale',
  'DATA-NEXT-GRIDLINE': 'Reads the gridline next to the end of the bar or the point instead of the one it reaches',
  'DATA-WRONG-ITEM': 'Reads the bar or point next to the one asked about',
  'DATA-ONE-VALUE': 'Gives one of the two values instead of the difference between them',
  'DATA-TOTAL-MISSED-ITEM': 'Leaves out one bar or row when adding up a total',
  'DATA-HIGHEST-NOT-CHANGE': 'Picks the highest value instead of the biggest change',
  'DATA-FALL-AS-RISE': 'Picks the steepest fall when the question asks for the biggest rise',
  'DATA-HIGHEST-NOT-DIFFERENCE': 'Picks the tallest bar or the biggest total instead of the biggest difference',
  'DATA-ANGLE-AS-COUNT': 'Gives the angle of a pie chart sector as the number of people',
  'DATA-PIE-PERCENT': 'Treats the angle of a sector as a percentage (out of 100 instead of 360)',
  'DATA-COUNT-AS-ANGLE': 'Uses the number of people as the angle of the sector',
  'DATA-PIE-DIVIDE-GROUP': 'Divides 360 by the number in the group instead of by the total',
  'DATA-TALLY-GATE-FOUR': 'Counts each gate of five tally marks as 4 (only the upright lines)',
  'DATA-TALLY-GATE-ONE': 'Counts each gate of five tally marks as 1',
  'DATA-TALLY-SINGLES-MISSED': 'Counts the gates of five but forgets the single tally marks',
  'DATA-FREQ-SUM-ONLY': 'Adds the frequencies (how many people) instead of the total of the values',
  'DATA-VALUES-SUM-ONLY': 'Adds the values in the first column and ignores the frequencies',
  'DATA-TIMES-VALUES': 'Multiplies by the values when the question only asks how many (just add the frequencies)',
  'DATA-ROWS-NOT-FREQ': 'Counts the rows of the table instead of adding their frequencies',
  'DATA-BOUNDARY': 'Includes the boundary value when the question says more than (or less than)',
  'VENN-PROPERTY-SLIP': 'Tests a number against a property wrongly and puts it in the wrong region',
  'VENN-BOUNDARY': 'Thinks a number equal to the boundary is greater than (or less than) it',
  'VENN-OVERLAP-TWICE': 'Counts the overlap twice by adding the two circle totals',
  'VENN-OVERLAP-IGNORED': 'Gives the whole circle total when the question asks for one set only',
  'VENN-OVERLAP-ADDED': 'Adds the overlap on again, as if "both" were a separate group',
};

// ---------------------------------------------------------------- shared helpers

const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const sum = (a) => a.reduce((s, x) => s + x, 0);
const sorted = (a) => [...a].sort((x, y) => x - y);
/** An exact value (Frac) as text: whole, or a decimal (it must terminate). */
const fx = (f) => (f.isInt ? fmtInt(f.n) : f.decimal());
/** Does n/d have at most `dp` decimal places? */
const dpOk = (n, d, dp = 1) => (n * 10 ** dp) % d === 0;
const medianOf = (a) => { const s = sorted(a); const n = s.length; return n % 2 ? F(s[(n - 1) / 2]) : F(s[n / 2 - 1] + s[n / 2], 2); };
const andList = (a) => (a.length === 1 ? String(a[0]) : `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`);
const lower = (t) => t.charAt(0).toLowerCase() + t.slice(1);

/** A value (a JS number with at most 2 decimal places) as text. */
const nm = (v) => fx(F(Math.round(v * 100), 100));
/** k-th near miss around v: v + step, v - step, v + 2 step, ... (null if negative). */
const around = (v, step, k) => { const w = v + step * (k % 2 ? Math.ceil(k / 2) : -Math.ceil(k / 2)); return w < 0 ? null : w; };

/** A question built from a correct value and distractors, as mcq (or numeric when `typed`). */
function numericOrMcq(rng, { ansText, ansValue, distractors, common, fallbackStep, hint, typed, accept = [] }) {
  const ds = distractors.filter(Boolean);
  if (typed) {
    const t = typedMisconceptions(ansText, ds, common);
    return { type: 'numeric', answer: numericAnswer(ansValue, [ansText, ...accept]), ...t };
  }
  const c = choices(rng, ansText, ds, (k) => { const w = around(ansValue, fallbackStep, k); return w == null ? null : nearMiss(nm(w), hint); });
  return { type: 'mcq', ...c };
}
/** Split `total` into `parts` whole numbers, each at least `min` (default 1). */
function partition(rng, total, parts, min = 1) {
  const t = total - parts * (min - 1);
  const cuts = rng.sample(range(1, t - 1), parts - 1).sort((a, b) => a - b);
  return [...cuts, t].map((c, i) => c - (i ? cuts[i - 1] : 0) + min - 1);
}

// ---------------------------------------------------------------- g01 averages of a list, and from a frequency table

const LIST_CTX = [
  { t: (p) => `${p.name} wrote down the number of goals scored in some football matches`, big: false },
  { t: () => 'These are the marks, out of 100, of some pupils in a test', big: true },
  { t: (p) => `${p.name} counted the cars passing the school gate in some one-minute periods`, big: false },
  { t: () => 'These are the numbers of durians sold at a stall on some days', big: true },
  { t: () => 'These are the ages of the children at a party', big: false },
  { t: (p) => `${p.name} recorded the number of books some pupils read last term`, big: false },
  { t: () => 'These are the points scored by some teams in a quiz', big: true },
  { t: () => 'These are the numbers of pupils on a school bus on some mornings', big: false },
  { t: (p) => `${p.name} counted the number of rambutans on some branches`, big: true },
  { t: () => 'These are the numbers of visitors to a small museum on some days', big: true },
  { t: () => 'These are the heights, in centimetres, of some bean plants', big: true },
];
const STAT_WORD = { mean: 'mean', median: 'median', mode: 'mode', range: 'range' };

function statPrompt(rng, stat, values) {
  const list = values.join(', ');
  if (rng.chance(0.35)) return `Find the ${STAT_WORD[stat]} of these numbers: ${list}.`;
  const p = person(rng);
  return `${rng.pick(LIST_CTX.filter((c) => c.big || Math.max(...values) <= 30)).t(p)}: ${list}. What is the ${STAT_WORD[stat]}?`;
}

/** Values for each statistic. d = 1 or 2. Returns { values } meeting the conditions. */
function makeList(rng, stat, d) {
  for (;;) {
    const n = stat === 'mode' ? rng.int(6, d === 1 ? 8 : 9) : stat === 'median' ? (d === 1 ? rng.pick([5, 7]) : rng.pick([6, 8])) : rng.int(5, d === 1 ? 7 : 8);
    const hi = d === 1 ? 30 : 99;
    const lo = d === 1 ? 1 : 10;
    let v = Array.from({ length: n }, () => rng.int(lo, hi));
    if (stat === 'mode') {
      const m = rng.int(lo, hi);
      const k = rng.int(2, 3);
      const rest = [];
      while (rest.length < n - k) { const x = rng.int(lo, hi); if (x !== m && !rest.includes(x)) rest.push(x); }
      v = rng.shuffle([...Array(k).fill(m), ...rest]);
      if (k === 2 && rng.chance(0.5)) { /* keep */ }
    }
    const s = sum(v);
    if (stat === 'mean') {
      if (d === 1 && s % n) continue;
      if (d === 2 && (s % n === 0 || !dpOk(s, n, 1))) continue;
    }
    if (stat === 'median') {
      const raw = n % 2 ? F(v[(n - 1) / 2]) : F(v[n / 2 - 1] + v[n / 2], 2);
      if (raw.eq(medianOf(v))) continue; // the list must not already be in order at the middle
      if (d === 2 && new Set(v).size < n) continue;
    }
    if (stat === 'range' && Math.abs(v[n - 1] - v[0]) === Math.max(...v) - Math.min(...v)) continue;
    return v;
  }
}

function listQuestion(rng, d) {
  const stat = rng.pick(['mean', 'median', 'mode', 'range']);
  const v = makeList(rng, stat, d);
  const n = v.length;
  const s = sorted(v);
  const tot = sum(v);
  const mean = F(tot, n);
  const med = medianOf(v);
  const prompt = statPrompt(rng, stat, v);
  let ans; let solution; const ds = [];
  if (stat === 'mean') {
    ans = mean;
    solution = `Add all the values: ${v.join(' + ')} = ${tot}. There are ${n} values, so divide by ${n}: ${tot} ÷ ${n} = ${fx(mean)}. Answer: ${fx(mean)}`;
    if (dpOk(tot, n - 1, 1)) ds.push({ text: fx(F(tot, n - 1)), code: 'AVG-MEAN-WRONG-COUNT', why: `It looks like you divided the total ${tot} by ${n - 1}. There are ${n} values, so divide by ${n}.` });
    if (dpOk(tot, n + 1, 1)) ds.push({ text: fx(F(tot, n + 1)), code: 'AVG-MEAN-WRONG-COUNT', why: `It looks like you divided the total ${tot} by ${n + 1}. Count the values again: there are ${n}.` });
    if (med.terminates) ds.push({ text: fx(med), code: 'AVG-MEAN-MEDIAN-SWAP', why: `${fx(med)} is the median (the middle value in order). The mean is the total shared equally: add them all and divide by ${n}.` });
    ds.push({ text: fmtInt(tot), code: 'AVG-TOTAL-ONLY', why: `${tot} is the total of the values. To find the mean, divide the total by the number of values (${n}).` });
  } else if (stat === 'median') {
    ans = med;
    const raw = n % 2 ? F(v[(n - 1) / 2]) : F(v[n / 2 - 1] + v[n / 2], 2);
    if (n % 2) {
      solution = `First put the values in order: ${s.join(', ')}. There are ${n} values, so the median is the ${(n + 1) / 2}th value: ${fx(med)}. Remember: order the values first. Answer: ${fx(med)}`;
      ds.push({ text: fx(raw), code: 'AVG-MEDIAN-UNSORTED', why: `It looks like you took the middle number of the list as it was written. Put the values in order first: ${s.join(', ')}.` });
    } else {
      const a = s[n / 2 - 1]; const b = s[n / 2];
      solution = `First put the values in order: ${s.join(', ')}. There are ${n} values, so there are two middle values, ${a} and ${b}. The median is halfway between them: (${a} + ${b}) ÷ 2 = ${fx(med)}. Answer: ${fx(med)}`;
      ds.push({ text: fx(raw), code: 'AVG-MEDIAN-UNSORTED', why: `It looks like you used the middle of the list as it was written (${v[n / 2 - 1]} and ${v[n / 2]}). Put the values in order first.` });
      ds.push({ text: String(a), code: 'AVG-MEDIAN-EVEN-ONE', why: `${a} is only one of the two middle values. With ${n} values, the median is halfway between ${a} and ${b}.` });
      ds.push({ text: String(b), code: 'AVG-MEDIAN-EVEN-ONE', why: `${b} is only one of the two middle values. With ${n} values, the median is halfway between ${a} and ${b}.` });
    }
    if (dpOk(tot, n, 1)) ds.push({ text: fx(mean), code: 'AVG-MEAN-MEDIAN-SWAP', why: `${fx(mean)} is the mean (the total shared equally). The median is the middle value when the values are in order.` });
    ds.push({ text: fx(F(n + 1, 2)), code: 'AVG-MEDIAN-POSITION', why: `${fx(F(n + 1, 2))} tells you WHERE the middle is ((${n} + 1) ÷ 2), not the median itself. Find the value in that place in the ordered list.` });
  } else if (stat === 'mode') {
    const counts = {}; v.forEach((x) => { counts[x] = (counts[x] || 0) + 1; });
    const m = Number(Object.keys(counts).find((k) => counts[k] === Math.max(...Object.values(counts))));
    const k = counts[m];
    ans = F(m);
    solution = `The mode is the value that appears most often. ${m} appears ${k} times, more than any other value. Answer: ${m}`;
    ds.push({ text: String(k), code: 'AVG-MODE-FREQ', why: `${k} is how many times the mode appears. The mode is the value itself: the one that appears most often.` });
    ds.push({ text: String(s[n - 1]), code: 'AVG-MODE-LARGEST', why: `${s[n - 1]} is the largest value. The mode is the value that appears most often, not the biggest.` });
    if (med.isInt) ds.push({ text: fx(med), code: 'AVG-WRONG-AVERAGE', why: `${fx(med)} is the median (the middle value in order). The mode is the most common value.` });
    if (mean.isInt) ds.push({ text: fx(mean), code: 'AVG-WRONG-AVERAGE', why: `${fx(mean)} is the mean. The mode is the value that appears most often.` });
  } else {
    const hi = s[n - 1]; const lo = s[0];
    ans = F(hi - lo);
    solution = `Range = highest value - lowest value. The highest is ${hi} and the lowest is ${lo}, so the range is ${hi} - ${lo} = ${hi - lo}. Answer: ${hi - lo}`;
    ds.push({ text: String(hi), code: 'AVG-RANGE-AS-MAX', why: `${hi} is the highest value. The range is the highest minus the lowest: ${hi} - ${lo}.` });
    ds.push({ text: String(hi + lo), code: 'AVG-RANGE-ADD', why: `It looks like you added the highest and lowest values. The range is the difference: ${hi} - ${lo}.` });
    const u = Math.abs(v[n - 1] - v[0]);
    if (u > 0) ds.push({ text: String(u), code: 'AVG-RANGE-UNSORTED', why: `It looks like you used the first and last numbers in the list (${v[0]} and ${v[n - 1]}). Use the highest (${hi}) and the lowest (${lo}).` });
  }
  return { stat, ans, prompt, solution, ds };
}

const FREQ_CTX = [
  { desc: (N) => `the number of goals scored in each of ${N} football matches`, col: 'Goals', fcol: 'Number of matches', vals: [0, 1, 2, 3, 4, 5], per: 'goals per match' },
  { desc: (N) => `how many brothers and sisters each of ${N} pupils has`, col: 'Brothers and sisters', fcol: 'Number of pupils', vals: [0, 1, 2, 3, 4], per: 'number of brothers and sisters' },
  { desc: (N) => `the number of books each of ${N} pupils read in a month`, col: 'Books read', fcol: 'Number of pupils', vals: [1, 2, 3, 4, 5, 6], per: 'number of books read' },
  { desc: (N) => `the shoe sizes of ${N} pupils`, col: 'Shoe size', fcol: 'Number of pupils', vals: [32, 33, 34, 35, 36, 37], per: 'shoe size' },
  { desc: (N) => `the number of children in each of ${N} families`, col: 'Children', fcol: 'Number of families', vals: [1, 2, 3, 4, 5], per: 'number of children' },
  { desc: (N) => `the scores of ${N} pupils when they each threw a beanbag at a target five times`, col: 'Hits', fcol: 'Number of pupils', vals: [0, 1, 2, 3, 4, 5], per: 'number of hits' },
];

function freqQuestion(rng) {
  for (;;) {
    const c = rng.pick(FREQ_CTX);
    const k = rng.int(4, c.vals.length);
    const start = rng.int(0, c.vals.length - k);
    const xs = c.vals.slice(start, start + k);
    const fs = xs.map(() => rng.int(1, 9));
    const N = sum(fs);
    if (N < 10 || N > 40) continue;
    const S = sum(xs.map((x, i) => x * fs[i]));
    const stat = rng.pick(['mean', 'median', 'mode', 'range']);
    const data = xs.flatMap((x, i) => Array(fs[i]).fill(x));
    const mean = F(S, N);
    const med = medianOf(data);
    const maxF = Math.max(...fs);
    if (fs.filter((f) => f === maxF).length > 1 && stat === 'mode') continue;
    const mode = xs[fs.indexOf(maxF)];
    const ds = [];
    let ans; let solution;
    const prods = xs.map((x, i) => `${x} x ${fs[i]} = ${x * fs[i]}`).join(', ');
    if (stat === 'mean') {
      if (!dpOk(S, N, 1)) continue;
      ans = mean;
      solution = `Multiply each value by how many times it happens: ${prods}. The total is ${S}. There are ${N} altogether (add the frequencies), so the mean is ${S} ÷ ${N} = ${fx(mean)}. Answer: ${fx(mean)}`;
      if (dpOk(sum(xs), k, 1)) ds.push({ text: fx(F(sum(xs), k)), code: 'AVG-FREQ-IGNORED', why: `It looks like you found the mean of the values ${xs.join(', ')} only. Each value happens a different number of times: multiply by the frequencies first.` });
      if (dpOk(S, k, 1)) ds.push({ text: fx(F(S, k)), code: 'AVG-MEAN-WRONG-COUNT', why: `You found the total ${S} correctly, but divided by ${k} (the number of rows). Divide by the number of ${lower(c.fcol.replace('Number of ', ''))}: ${N}.` });
      if (dpOk(N, k, 1)) ds.push({ text: fx(F(N, k)), code: 'AVG-FREQ-AS-DATA', why: `It looks like you found the mean of the frequencies (${N} ÷ ${k}). The data values are in the first column.` });
      ds.push({ text: fmtInt(S), code: 'AVG-TOTAL-ONLY', why: `${S} is the total. Divide it by ${N} to share it equally.` });
    } else if (stat === 'median') {
      if (N % 2 === 0 && !med.isInt) continue;
      ans = med;
      const pos = N % 2 ? `the ${(N + 1) / 2}th value` : `halfway between the ${N / 2}th and ${N / 2 + 1}th values`;
      solution = `There are ${N} values (add the frequencies), so the median is ${pos}. Count down the table: the values are already in order. That place is in the row for ${fx(med)}. Answer: ${fx(med)}`;
      const mx = medianOf(xs);
      if (!mx.eq(med) && mx.terminates) ds.push({ text: fx(mx), code: 'AVG-FREQ-IGNORED', why: `${fx(mx)} is the middle of the list ${xs.join(', ')}. Each value happens a different number of times, so count through all ${N} values.` });
      const mf = medianOf(fs);
      if (mf.terminates) ds.push({ text: fx(mf), code: 'AVG-FREQ-AS-DATA', why: `It looks like you found the middle of the frequencies. The data values are in the first column.` });
      ds.push({ text: fx(F(N + 1, 2)), code: 'AVG-MEDIAN-POSITION', why: `${fx(F(N + 1, 2))} is the POSITION of the middle value. Find which value is in that place.` });
    } else if (stat === 'mode') {
      ans = F(mode);
      solution = `The mode is the value with the highest frequency. The highest frequency is ${maxF}, in the row for ${mode}. Answer: ${mode}`;
      ds.push({ text: String(maxF), code: 'AVG-MODE-FREQ', why: `${maxF} is the highest frequency: how many times the mode happens. The mode is the value in that row.` });
      ds.push({ text: String(xs[k - 1]), code: 'AVG-MODE-LARGEST', why: `${xs[k - 1]} is the largest value. The mode is the value that happens most often.` });
      if (med.isInt) ds.push({ text: fx(med), code: 'AVG-WRONG-AVERAGE', why: `${fx(med)} is the median. The mode is the value with the highest frequency.` });
    } else {
      ans = F(xs[k - 1] - xs[0]);
      solution = `The range uses the data values, not the frequencies. Highest value ${xs[k - 1]} - lowest value ${xs[0]} = ${xs[k - 1] - xs[0]}. Answer: ${xs[k - 1] - xs[0]}`;
      const fr = Math.max(...fs) - Math.min(...fs);
      ds.push({ text: String(fr), code: 'AVG-FREQ-AS-DATA', why: `It looks like you subtracted the smallest frequency from the largest. Use the data values in the first column.` });
      ds.push({ text: String(xs[k - 1]), code: 'AVG-RANGE-AS-MAX', why: `${xs[k - 1]} is the highest value. The range is highest minus lowest.` });
      ds.push({ text: String(xs[k - 1] + xs[0]), code: 'AVG-RANGE-ADD', why: 'It looks like you added the highest and lowest values. The range is the difference between them.' });
    }
    const prompt = `The table shows ${c.desc(N)}. What is the ${stat}${stat === 'mean' || stat === 'median' ? ` ${c.per}` : ''}?`;
    const diagram = { type: 'table', columns: [c.col, c.fcol], rows: xs.map((x, i) => [String(x), fs[i]]) };
    return { stat, ans, prompt, solution, ds, diagram };
  }
}

const averages = {
  id: 'm12.averages', topicId: T, subtopicId: 'm12-s3', skill: SK.mean,
  title: 'Mean, median, mode or range of a list (D2 one decimal place and even counts; D3 from a frequency table)',
  difficulties: [1, 2, 3],
  check: { min: 0, maxDp: 2 },
  make(rng, d) {
    for (;;) {
      const q = d === 3 ? freqQuestion(rng) : listQuestion(rng, d);
      const ansText = fx(q.ans);
      const common = { code: 'AVG-MEAN-MEDIAN-SWAP', why: 'Check which average the question asks for: mean (share the total equally), median (middle value in order), mode (most common) or range (highest minus lowest).' };
      try {
        const body = numericOrMcq(rng, { ansText, ansValue: q.ans.value, distractors: q.ds, common, fallbackStep: 1, hint: 'Check each step of your working.', typed: d < 3 && rng.chance(0.35) });
        return { ...body, prompt: q.prompt, solution: q.solution, skill: SK[q.stat], diagram: q.diagram, marks: d === 3 ? 2 : 1 };
      } catch { /* draw again */ }
    }
  },
};

// ---------------------------------------------------------------- g02 missing value from a mean

const meanMissing = {
  id: 'm12.mean-missing', topicId: T, subtopicId: 'm12-s3', skill: SK.missing,
  title: 'Find a missing value from the mean (D3: the score needed to reach a new mean)',
  difficulties: [2, 3],
  check: { min: 0, maxDp: 1 },
  make(rng, d) {
    for (;;) {
      const p = person(rng);
      let prompt; let ans; let solution; const ds = [];
      if (d === 2) {
        const n = rng.int(3, 6);
        const m = rng.int(8, 40);
        const known = Array.from({ length: n - 1 }, () => rng.int(Math.max(1, m - 15), m + 15));
        const x = n * m - sum(known);
        if (x < 1 || x > 99 || known.includes(x) || x === m) continue;
        const ctx = rng.int(0, 2);
        if (ctx === 0) prompt = `The mean of ${n} numbers is ${m}. ${n - 1} of the numbers are ${andList(known)}. What is the missing number?`;
        else if (ctx === 1) prompt = `${p.name} played ${n} games. ${p.His} mean score was ${m}. ${p.His} scores in ${n - 1} of the games were ${andList(known)}. What did ${p.he} score in the other game?`;
        else prompt = `${n} boxes of mangoes have a mean of ${m} mangoes in each box. ${n - 1} of the boxes hold ${andList(known)} mangoes. How many mangoes are in the last box?`;
        ans = x;
        solution = `The total of all ${n} values = mean x ${n} = ${m} x ${n} = ${n * m}. The known values add up to ${known.join(' + ')} = ${sum(known)}. Missing value = ${n * m} - ${sum(known)} = ${x}. Answer: ${x}`;
        const w = (n - 1) * m - sum(known);
        if (w > 0) ds.push({ text: String(w), code: 'AVG-MEAN-WRONG-COUNT', why: `It looks like you multiplied the mean by ${n - 1}. There are ${n} values altogether, so the total is ${m} x ${n} = ${n * m}.` });
        ds.push({ text: fmtInt(n * m), code: 'AVG-TOTAL-ONLY', why: `${n * m} is the total of all ${n} values. Take away the ${n - 1} values you know to find the missing one.` });
        ds.push({ text: String(m), code: 'AVG-MISSING-IS-MEAN', why: `${m} is the mean. The missing value has to make the total ${n * m}, so it is ${n * m} - ${sum(known)}.` });
      } else {
        // the next score that makes a new mean (whole numbers, or tenths for masses)
        const k = rng.int(3, 6);
        const tenths = rng.chance(0.35);
        if (!tenths) {
          const m1 = rng.int(10, 30); const m2 = m1 + rng.pick([1, 2, 3, -1, -2]);
          const x = (k + 1) * m2 - k * m1;
          if (x < 1 || x > 50 || x === m2) continue;
          prompt = `${p.name}'s mean score in ${k} quizzes is ${m1}. Each quiz is marked out of 50. What score does ${p.he} need in the next quiz to make ${p.his} mean score for all ${k + 1} quizzes exactly ${m2}?`;
          ans = x;
          solution = `Total so far = ${k} x ${m1} = ${k * m1}. For a mean of ${m2} over ${k + 1} quizzes, the total must be ${k + 1} x ${m2} = ${(k + 1) * m2}. Score needed = ${(k + 1) * m2} - ${k * m1} = ${x}. Answer: ${x}`;
          ds.push({ text: String(m2), code: 'AVG-MISSING-IS-MEAN', why: `${m2} is the mean ${p.he} wants. The new score has to bring the total up to ${(k + 1) * m2}.` });
          ds.push({ text: fmtInt((k + 1) * m2), code: 'AVG-TOTAL-ONLY', why: `${(k + 1) * m2} is the total needed for all ${k + 1} quizzes. Take away the ${k * m1} ${p.he} already has.` });
          const w = k * m2 - k * m1;
          if (w > 0) ds.push({ text: String(w), code: 'AVG-MEAN-WRONG-COUNT', why: `It looks like you used ${k} quizzes for both totals. After the next quiz there are ${k + 1}, so the new total is ${k + 1} x ${m2}.` });
        } else {
          const m1 = rng.int(12, 25); const m2 = m1 + rng.pick([1, 2, 3, 4]); // tenths of a kg
          const x = (k + 1) * m2 - k * m1;
          if (x < 5 || x > 60 || x === m2) continue;
          const t = (v) => fx(F(v, 10));
          prompt = `The mean mass of ${k} durians is ${t(m1)} kg. One more durian is added, and the mean mass of all ${k + 1} durians becomes ${t(m2)} kg. What is the mass of the extra durian? Give your answer in kg.`;
          ans = F(x, 10).value;
          solution = `Total mass of ${k} durians = ${k} x ${t(m1)} = ${t(k * m1)} kg. Total mass of ${k + 1} durians = ${k + 1} x ${t(m2)} = ${t((k + 1) * m2)} kg. Extra durian = ${t((k + 1) * m2)} - ${t(k * m1)} = ${t(x)} kg. Answer: ${t(x)} kg`;
          ds.push({ text: `${t(m2)} kg`, code: 'AVG-MISSING-IS-MEAN', why: `${t(m2)} kg is the new mean. The extra durian must bring the total up to ${t((k + 1) * m2)} kg.` });
          ds.push({ text: `${t((k + 1) * m2)} kg`, code: 'AVG-TOTAL-ONLY', why: `${t((k + 1) * m2)} kg is the total for all ${k + 1} durians. Take away the ${t(k * m1)} kg of the first ${k}.` });
          ds.push({ text: `${t(k * m2 - k * m1)} kg`, code: 'AVG-MEAN-WRONG-COUNT', why: `It looks like you used ${k} durians for both totals. After one is added there are ${k + 1}.` });
          try {
            const c = choices(rng, `${t(x)} kg`, ds, (i) => nearMiss(`${t(x + (i % 2 ? i : -i))} kg`, 'Find both totals, then subtract.'));
            return { type: 'mcq', prompt, ...c, solution, marks: 2, skill: SK.missing };
          } catch { continue; }
        }
      }
      try {
        const typed = rng.chance(0.4);
        const body = numericOrMcq(rng, { ansText: String(ans), ansValue: ans, distractors: ds, common: { code: 'AVG-TOTAL-ONLY', why: 'Find the total from the mean (mean x number of values), then take away the values you know.' }, fallbackStep: 1, hint: 'Find the total from the mean first.', typed });
        return { ...body, prompt, solution, marks: d === 3 ? 2 : 1 };
      } catch { /* draw again */ }
    }
  },
};

// ---------------------------------------------------------------- effect of an outlier

const OUT_CTX = [
  { who: 'pupils', did: 'took', unit: 'minutes', what: 'to walk to school', odd: 'pupil' },
  { who: 'runners', did: 'finished a fun run in', unit: 'minutes', what: '', odd: 'runner' },
  { who: 'hawker stalls', did: 'sold', unit: 'plates of nasi lemak', what: 'on Monday', odd: 'stall' },
  { who: 'pupils', did: 'scored', unit: 'marks', what: 'in a test', odd: 'pupil' },
];

const outlier = {
  id: 'm12.outlier', topicId: T, subtopicId: 'm12-s4', skill: SK.outlier,
  title: 'The effect of an outlier on the mean (D3: how much the mean changes, or removing a value)',
  difficulties: [2, 3],
  check: { min: 0, maxDp: 1 },
  make(rng, d) {
    for (;;) {
      const c = rng.pick(OUT_CTX);
      const n = rng.int(4, 6);
      const vals = Array.from({ length: n }, () => rng.int(8, 20));
      const S = sum(vals);
      const old = F(S, n);
      if (!old.isInt) continue;
      const X = rng.int(30, 60);
      const nw = F(S + X, n + 1);
      if (!nw.isInt) continue;
      const list = vals.join(', ');
      const unitTxt = c.unit;
      const ds = [];
      let prompt; let ans; let solution;
      if (d === 3 && rng.chance(0.4)) {
        // removing a value recorded by mistake
        const n6 = n + 1;
        const m = rng.int(40, 80);
        const bad = rng.int(5, 30);
        const left = n6 * m - bad;
        if (left % n !== 0) continue;
        ans = left / n;
        prompt = `The mean of ${n6} test scores is ${m}. One score of ${bad} turns out to be a recording mistake, so it is removed. What is the mean of the ${n} scores that are left?`;
        solution = `Total of the ${n6} scores = ${n6} x ${m} = ${n6 * m}. Remove the ${bad}: ${n6 * m} - ${bad} = ${left}. Mean of the ${n} scores = ${left} ÷ ${n} = ${ans}. Answer: ${ans}`;
        ds.push({ text: String(m), code: 'AVG-OLD-MEAN', why: `${m} is the mean before the score was removed. Removing a low score changes the mean.` });
        if (left % n6 === 0) ds.push({ text: String(left / n6), code: 'AVG-MEAN-WRONG-COUNT', why: `It looks like you divided by ${n6}. After removing one score there are only ${n} left.` });
        ds.push({ text: fmtInt(left), code: 'AVG-TOTAL-ONLY', why: `${left} is the total of the ${n} scores left. Divide by ${n} to find their mean.` });
      } else {
        const intro = `${n} ${c.who} ${c.did} ${list} ${unitTxt}${c.what ? ` ${c.what}` : ''}. Another ${c.odd} ${c.did} ${X} ${unitTxt}.`;
        if (d === 2) {
          ans = nw.n;
          prompt = `${intro} What is the mean of all ${n + 1} values?`;
          solution = `Total of the first ${n}: ${vals.join(' + ')} = ${S}. Add the new value: ${S} + ${X} = ${S + X}. There are now ${n + 1} values: ${S + X} ÷ ${n + 1} = ${ans}. Answer: ${ans}`;
          ds.push({ text: String(old.n), code: 'AVG-OLD-MEAN', why: `${old.n} is the mean of the first ${n} values only. Include the new value ${X} as well.` });
          if ((S + X) % n === 0) ds.push({ text: String((S + X) / n), code: 'AVG-MEAN-WRONG-COUNT', why: `It looks like you divided by ${n}. With the new value there are ${n + 1} values.` });
          const med = medianOf([...vals, X]);
          if (med.isInt) ds.push({ text: fx(med), code: 'AVG-MEAN-MEDIAN-SWAP', why: `${fx(med)} is the median of all ${n + 1} values. The mean is the total shared equally.` });
        } else {
          ans = nw.n - old.n;
          prompt = `${intro} By how much does the mean go up when this value is included?`;
          solution = `Mean of the first ${n}: ${S} ÷ ${n} = ${old.n}. Mean of all ${n + 1}: (${S} + ${X}) ÷ ${n + 1} = ${S + X} ÷ ${n + 1} = ${nw.n}. The mean goes up by ${nw.n} - ${old.n} = ${ans}. One unusual value (an outlier) can change the mean a lot. Answer: ${ans}`;
          ds.push({ text: String(nw.n), code: 'AVG-CHANGE-AS-MEAN', why: `${nw.n} is the new mean. The question asks how much the mean goes UP: new mean - old mean.` });
          if ((S + X) % n === 0 && (S + X) / n - old.n > 0) ds.push({ text: String((S + X) / n - old.n), code: 'AVG-MEAN-WRONG-COUNT', why: `It looks like you divided the new total by ${n}. With the extra value there are ${n + 1} values.` });
          ds.push({ text: String(old.n), code: 'AVG-OLD-MEAN', why: `${old.n} is the mean before the new value. Find the new mean, then subtract.` });
        }
      }
      try {
        const body = numericOrMcq(rng, { ansText: String(ans), ansValue: ans, distractors: ds, common: { code: 'AVG-MEAN-WRONG-COUNT', why: 'Find each total, and divide by the number of values at that point.' }, fallbackStep: 1, hint: 'Work out the totals first, then divide.', typed: rng.chance(0.35) });
        return { ...body, prompt, solution, marks: d === 3 ? 2 : 1 };
      } catch { /* draw again */ }
    }
  },
};

// ---------------------------------------------------------------- g03 reading a bar chart

const BAR_CTX = [
  { intro: 'The bar chart shows the favourite fruit of the pupils in a class.', title: 'Our favourite fruit', cats: ['Durian', 'Mango', 'Rambutan', 'Papaya', 'Banana', 'Mangosteen'], y: 'Number of pupils', val: (c) => `How many pupils chose ${c}?`, more: (a, b) => `How many more pupils chose ${a} than ${b}?`, all: 'How many pupils were asked altogether?', noun: 'pupils', who: 'chose', series: [['Boys', 'Girls']] },
  { intro: 'The bar chart shows the drinks sold at a school canteen one morning.', title: 'Drinks sold', cats: ['Milo', 'Teh tarik', 'Orange juice', 'Soya milk', 'Water'], y: 'Number of cups', val: (c) => `How many cups of ${c} were sold?`, more: (a, b) => `How many more cups of ${a} than ${b} were sold?`, all: 'How many cups were sold altogether?', noun: 'cups', who: 'were', series: [['Monday', 'Tuesday']] },
  { intro: 'The bar chart shows the number of books borrowed from a library each day.', title: 'Books borrowed', cats: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], y: 'Number of books', val: (c) => `How many books were borrowed on ${c}?`, more: (a, b) => `How many more books were borrowed on ${a} than on ${b}?`, all: 'How many books were borrowed altogether?', noun: 'books', who: 'were', series: [['Fiction', 'Non-fiction']] },
  { intro: 'The bar chart shows the favourite sport of some pupils.', title: 'Favourite sport', cats: ['Football', 'Badminton', 'Swimming', 'Netball', 'Basketball', 'Sepak takraw'], y: 'Number of pupils', val: (c) => `How many pupils chose ${c}?`, more: (a, b) => `How many more pupils chose ${a} than ${b}?`, all: 'How many pupils were asked altogether?', noun: 'pupils', who: 'chose', series: [['Boys', 'Girls']] },
  { intro: 'The bar chart shows the colours of the cars in a car park.', title: 'Car colours', cats: ['Red', 'White', 'Black', 'Silver', 'Blue', 'Grey'], y: 'Number of cars', val: (c) => `How many ${lower(c)} cars were in the car park?`, more: (a, b) => `How many more ${lower(a)} cars than ${lower(b)} cars were there?`, all: 'How many cars were in the car park altogether?', noun: 'cars', who: 'were', series: [['Morning', 'Afternoon']] },
  { intro: 'The bar chart shows the plates of food sold at a hawker stall on Saturday.', title: 'Plates sold', cats: ['Nasi lemak', 'Roti canai', 'Mee goreng', 'Laksa', 'Satay'], y: 'Number of plates', val: (c) => `How many plates of ${c} were sold?`, more: (a, b) => `How many more plates of ${a} than ${b} were sold?`, all: 'How many plates were sold altogether?', noun: 'plates', who: 'were', series: [['Saturday', 'Sunday']] },
];
const DUAL_CTX = [
  { intro: 'The bar chart shows the favourite fruit of the boys and the girls in Year 6.', title: 'Favourite fruit', cats: ['Durian', 'Mango', 'Rambutan', 'Papaya', 'Banana'], y: 'Number of pupils', s: ['Boys', 'Girls'], noun: 'pupils', frac: (x, s) => `What fraction of the pupils who chose ${x} were ${lower(s)}?`, which: 'For which fruit is the difference between the number of boys and the number of girls the greatest?' },
  { intro: 'The bar chart shows the favourite sport of the boys and the girls in a school club.', title: 'Favourite sport', cats: ['Football', 'Badminton', 'Swimming', 'Netball', 'Basketball'], y: 'Number of pupils', s: ['Boys', 'Girls'], noun: 'pupils', frac: (x, s) => `What fraction of the pupils who chose ${x} were ${lower(s)}?`, which: 'For which sport is the difference between the number of boys and the number of girls the greatest?' },
  { intro: 'The bar chart shows the plates of food a hawker stall sold on Saturday and on Sunday.', title: 'Plates sold', cats: ['Nasi lemak', 'Roti canai', 'Mee goreng', 'Laksa', 'Satay'], y: 'Number of plates', s: ['Saturday', 'Sunday'], noun: 'plates', frac: (x, s) => `What fraction of the plates of ${x} were sold on ${s}?`, which: 'For which food is the difference between Saturday and Sunday the greatest?' },
  { intro: 'The bar chart shows the drinks sold at a canteen on Monday and on Tuesday.', title: 'Drinks sold', cats: ['Milo', 'Teh tarik', 'Orange juice', 'Soya milk', 'Water'], y: 'Number of cups', s: ['Monday', 'Tuesday'], noun: 'cups', frac: (x, s) => `What fraction of the cups of ${x} were sold on ${s}?`, which: 'For which drink is the difference between Monday and Tuesday the greatest?' },
];

/** A scale for reading: { step, minor } and values that sit on the lines. */
function readScale(rng, d) {
  if (d === 1) { const step = rng.pick([1, 2, 5, 10]); return { step, minor: null, unit: step, maxV: step === 1 ? 12 : step === 2 ? 20 : step === 5 ? 50 : 100 }; }
  const [step, minor] = rng.pick([[2, 1], [10, 5], [10, 2], [20, 5], [20, 10], [5, 1]]);
  return { step, minor, unit: minor, maxV: step * 6 };
}
const barAlt = (ctx, cats, extra = '') => `A bar chart titled "${ctx.title}" with a bar for each of ${cats.join(', ')}.${extra} Read the values from the scale.`;
/** Vertical bars, or horizontal ones when a label is too long to fit under a bar (and sometimes anyway). */
function orient(rng, dg, axisTitle) {
  const long = dg.categories.some((c) => c.length > 7 && !c.includes(' '));
  if (long || rng.chance(0.2)) { dg.horizontal = true; dg.xLabel = axisTitle; } else dg.yLabel = axisTitle;
}

const readBar = {
  id: 'm12.read-bar-chart', topicId: T, subtopicId: 'm12-s4', skill: SK.read,
  title: 'Read a bar chart: one value (D1), a difference or total on a finer scale (D2), a dual bar chart (D3)',
  difficulties: [1, 2, 3],
  check: { min: 0 },
  make(rng, d) {
    if (d === 3) return dualBar(rng);
    for (;;) {
      const ctx = rng.pick(BAR_CTX);
      const k = rng.int(4, Math.min(6, ctx.cats.length));
      const cats = ctx.cats === BAR_CTX[2].cats ? ctx.cats.slice(0, k) : rng.sample(ctx.cats, k);
      const sc = readScale(rng, d);
      const vals = cats.map(() => sc.unit * rng.int(1, Math.floor(sc.maxV / sc.unit)));
      if (new Set(vals).size < k) continue;
      const yMax = Math.ceil(Math.max(...vals) / sc.step) * sc.step + (rng.chance(0.5) ? sc.step : 0);
      if (yMax / (sc.minor || sc.step) > 30) continue;
      const diagram = { type: 'barChart', title: ctx.title, categories: cats, series: [{ name: ctx.y, values: vals }], yMax, yStep: sc.step, alt: barAlt(ctx, cats) };
      orient(rng, diagram, ctx.y);
      if (sc.minor) diagram.minorStep = sc.minor;
      const line = sc.minor || sc.step;
      const lineWord = sc.minor ? `Each small gridline is worth ${sc.minor}` : `The scale goes up in ${sc.step}s`;
      const kind = d === 1 ? 'value' : rng.pick(['value', 'more', 'more', 'all']);
      let prompt; let ans; let solution; const ds = [];
      if (kind === 'value') {
        const i = rng.int(0, k - 1);
        ans = vals[i];
        prompt = `${ctx.intro} ${ctx.val(cats[i])}`;
        solution = `${lineWord}. The bar for ${cats[i]} reaches ${ans}. Answer: ${ans}`;
        if (line > 1) ds.push({ text: String(ans / line), code: 'DATA-SCALE-AS-ONE', why: `It looks like you counted the gridlines as 1 each. ${lineWord}, so the bar reaches ${ans}.` });
        ds.push({ text: String(ans + line), code: 'DATA-NEXT-GRIDLINE', why: `${ans + line} is the gridline just past the end of the bar. Read the line the bar actually reaches.` });
        if (ans - line > 0) ds.push({ text: String(ans - line), code: 'DATA-NEXT-GRIDLINE', why: `${ans - line} is the gridline just before the end of the bar. Read the line the bar actually reaches.` });
        for (const j of [i - 1, i + 1]) if (j >= 0 && j < k) ds.push({ text: String(vals[j]), code: 'DATA-WRONG-ITEM', why: `${vals[j]} is the bar for ${cats[j]}. Find the bar labelled ${cats[i]}.` });
      } else if (kind === 'more') {
        const [i, j] = rng.sample(range(0, k - 1), 2);
        const [a, b] = vals[i] > vals[j] ? [i, j] : [j, i];
        ans = vals[a] - vals[b];
        prompt = `${ctx.intro} ${ctx.more(cats[a], cats[b])}`;
        solution = `${lineWord}. ${cats[a]}: ${vals[a]}. ${cats[b]}: ${vals[b]}. Difference: ${vals[a]} - ${vals[b]} = ${ans}. Answer: ${ans}`;
        ds.push({ text: String(vals[a]), code: 'DATA-ONE-VALUE', why: `${vals[a]} is the value for ${cats[a]} only. "How many more" means the difference: ${vals[a]} - ${vals[b]}.` });
        ds.push({ text: String(vals[a] + vals[b]), code: 'OP-SWAP', why: `It looks like you added the two bars. "How many more" means subtract: ${vals[a]} - ${vals[b]}.` });
        if (line > 1) ds.push({ text: String(ans / line), code: 'DATA-SCALE-AS-ONE', why: `It looks like you counted the gridlines between the bars as 1 each. ${lineWord}.` });
      } else {
        ans = sum(vals);
        prompt = `${ctx.intro} ${ctx.all}`;
        solution = `${lineWord}. Read every bar: ${vals.join(' + ')} = ${ans}. Answer: ${ans}`;
        for (let j = 0; j < k; j++) ds.push({ text: String(ans - vals[j]), code: 'DATA-TOTAL-MISSED-ITEM', why: `It looks like you left out the bar for ${cats[j]} (${vals[j]}). Add every bar.` });
        if (line > 1) ds.unshift({ text: String(ans / line), code: 'DATA-SCALE-AS-ONE', why: `It looks like you counted the gridlines as 1 each. ${lineWord}.` });
      }
      try {
        const body = numericOrMcq(rng, { ansText: String(ans), ansValue: ans, distractors: ds, common: { code: 'DATA-SCALE-AS-ONE', why: `Check the scale first: ${lower(lineWord)}.` }, fallbackStep: line, hint: `Check the scale: ${lower(lineWord)}.`, typed: d === 2 && rng.chance(0.35) });
        return { ...body, prompt, solution, diagram };
      } catch { /* draw again */ }
    }
  },
};

function dualBar(rng) {
  for (;;) {
    const ctx = rng.pick(DUAL_CTX);
    const k = rng.int(4, 5);
    const cats = rng.sample(ctx.cats, k);
    const [step, minor] = rng.pick([[2, 1], [5, 1], [10, 5], [10, 2]]);
    const maxV = step * 5;
    const a = cats.map(() => minor * rng.int(1, maxV / minor));
    const b = cats.map(() => minor * rng.int(1, maxV / minor));
    const diffs = a.map((x, i) => Math.abs(x - b[i]));
    const yMax = Math.ceil(Math.max(...a, ...b) / step) * step;
    if (yMax / minor > 30) continue;
    const diagram = { type: 'barChart', title: ctx.title, categories: cats, series: [{ name: ctx.s[0], values: a }, { name: ctx.s[1], values: b }], yMax, yStep: step, alt: `A bar chart titled "${ctx.title}" with two bars (${ctx.s[0]} and ${ctx.s[1]}) for each of ${cats.join(', ')}. Read the values from the scale.` };
    orient(rng, diagram, ctx.y);
    if (minor !== step) diagram.minorStep = minor;
    const lineWord = minor !== step ? `Each small gridline is worth ${minor}` : `The scale goes up in ${step}s`;
    if (rng.chance(0.5)) {
      const best = Math.max(...diffs);
      if (diffs.filter((x) => x === best).length > 1) continue;
      const i = diffs.indexOf(best);
      const ds = [];
      const tall = Math.max(...a, ...b);
      const ti = [...a, ...b].indexOf(tall) % k;
      if ([...a, ...b].filter((x) => x === tall).length === 1 && ti !== i) ds.push({ text: cats[ti], code: 'DATA-HIGHEST-NOT-DIFFERENCE', why: `${cats[ti]} has the tallest bar, but the question is about the DIFFERENCE between the two bars. For ${cats[ti]} the difference is ${diffs[ti]}.` });
      const tots = a.map((x, j) => x + b[j]);
      const mt = Math.max(...tots);
      const mi = tots.indexOf(mt);
      if (tots.filter((x) => x === mt).length === 1 && mi !== i && mi !== ti) ds.push({ text: cats[mi], code: 'DATA-HIGHEST-NOT-DIFFERENCE', why: `${cats[mi]} has the biggest total (${mt}), but the question is about the difference between the two bars. For ${cats[mi]} the difference is ${diffs[mi]}.` });
      const prompt = `${ctx.intro} ${ctx.which}`;
      const solution = `${lineWord}. Find the difference for each: ${cats.map((c, j) => `${c} ${Math.max(a[j], b[j])} - ${Math.min(a[j], b[j])} = ${diffs[j]}`).join('; ')}. The greatest difference is ${best}, for ${cats[i]}. Answer: ${cats[i]}`;
      const others = cats.filter((c, j) => j !== i);
      try {
        const c = choices(rng, cats[i], ds, (g) => { const o = others[(g - 1) % others.length]; return nearMiss(o, `For ${o} the difference is ${diffs[cats.indexOf(o)]}. Work out the difference for every pair of bars.`); });
        return { type: 'mcq', prompt, ...c, solution, diagram, marks: 2 };
      } catch { continue; }
    }
    // a fraction of one category
    const i = rng.int(0, k - 1);
    const si = rng.int(0, 1);
    const mine = si === 0 ? a[i] : b[i];
    const other = si === 0 ? b[i] : a[i];
    const tot = mine + other;
    const f = F(mine, tot);
    if (f.d === tot || mine === other) continue; // the fraction must simplify, and not be 1/2
    const prompt = `${ctx.intro} ${ctx.frac(cats[i], ctx.s[si])} Give your answer in its simplest form.`;
    const solution = `${lineWord}. For ${cats[i]}: ${ctx.s[si]} ${mine} and ${ctx.s[1 - si]} ${other}, so ${tot} altogether. Fraction = ${mine}/${tot} = ${f}. Answer: ${f}`;
    const ds = [
      { text: `${mine}/${other}`, code: 'RATIO-PART-AS-WHOLE', why: `${mine}/${other} compares ${ctx.s[si]} with ${ctx.s[1 - si]}. A fraction of all of them needs the total ${mine} + ${other} = ${tot} on the bottom.` },
      { text: F(other, tot).toString(), code: 'PCT-OF-WRONG-WHOLE', why: `${F(other, tot)} is the fraction for ${ctx.s[1 - si]}. The question asks about ${ctx.s[si]}.` },
    ];
    const allMine = sum(si === 0 ? a : b);
    if (F(mine, allMine).d > 1) ds.push({ text: F(mine, allMine).toString(), code: 'PCT-OF-WRONG-WHOLE', why: `${F(mine, allMine)} is ${mine} out of ALL the ${ctx.s[si]} (${allMine}). The question asks about ${cats[i]} only: ${mine} out of ${tot}.` });
    try {
      const c = choices(rng, f.toString(), ds, (g) => nearMiss(F(mine + g, tot + g).toString(), 'Put the total for that bar pair on the bottom, then simplify.'));
      return { type: 'mcq', prompt, ...c, solution, diagram, marks: 2 };
    } catch { /* draw again */ }
  }
}

// ---------------------------------------------------------------- g04 reading a line graph

const LINE_CTX = [
  { intro: 'The line graph shows the temperature in a school garden during one day.', title: 'Temperature in the garden', cats: ['7 am', '9 am', '11 am', '1 pm', '3 pm', '5 pm'], y: 'Temperature (°C)', base: [20, 26], what: 'the temperature', unit: '°C', verb: 'was', rise: 'rise', at: 'at', series2: ['Kuala Lumpur', 'Cameron Highlands'], gap: (c, h, l) => `At ${c}, how much warmer was it in ${h} than in ${l}?` },
  { intro: 'The line graph shows the height of a bean plant at the end of each week.', title: 'Height of a bean plant', cats: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6', 'Week 7'], y: 'Height (cm)', base: [0, 6], what: 'the height of the plant', unit: 'cm', verb: 'was', rise: 'grow', at: 'at the end of', series2: ['Plant A', 'Plant B'], up: true, gap: (c, h, l) => `At the end of ${c}, how much taller was ${h} than ${l}?` },
  { intro: 'The line graph shows the number of visitors to a museum each month.', title: 'Museum visitors', cats: ['January', 'February', 'March', 'April', 'May', 'June', 'July'], y: 'Number of visitors', base: [10, 30], what: 'the number of visitors', unit: '', verb: 'was', rise: 'increase', at: 'in', series2: ['Museum A', 'Museum B'], gap: (c, h, l) => `In ${c}, how many more visitors did ${h} have than ${l}?` },
  { intro: 'The line graph shows the number of customers at a hawker stall each hour.', title: 'Customers at a stall', cats: ['8 am', '9 am', '10 am', '11 am', '12 noon', '1 pm', '2 pm'], y: 'Number of customers', base: [4, 20], what: 'the number of customers', unit: '', verb: 'was', rise: 'increase', at: 'at', series2: ['Stall A', 'Stall B'], gap: (c, h, l) => `At ${c}, how many more customers did ${h} have than ${l}?` },
  { intro: 'The line graph shows how much money a class had saved at the end of each week.', title: 'Class savings', cats: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6', 'Week 7'], y: 'Savings (RM)', base: [0, 20], what: 'the savings', unit: 'RM', verb: 'were', rise: 'increase', at: 'at the end of', series2: ['Class 6A', 'Class 6B'], up: true, gap: (c, h, l) => `At the end of ${c}, how much more had ${h} saved than ${l}?` },
];
const withUnit = (v, u) => (u === 'RM' ? `RM ${v}` : u ? `${v} ${u}` : String(v));

const readLine = {
  id: 'm12.line-graph', topicId: T, subtopicId: 'm12-s4', skill: SK.trend,
  title: 'Read a line graph: a value (D1), the biggest increase or a change (D2), two lines compared (D3)',
  difficulties: [1, 2, 3],
  check: { min: 0 },
  make(rng, d) {
    for (;;) {
      const ctx = rng.pick(LINE_CTX);
      const k = rng.int(5, Math.min(7, ctx.cats.length));
      const cats = ctx.cats.slice(0, k);
      const [step, minor] = d === 1 ? rng.pick([[1, null], [2, null], [5, null]]) : rng.pick([[2, 1], [5, 1], [10, 5], [10, 2], [4, 2]]);
      const unit = minor || step;
      const mkSeries = () => {
        const v = [unit * Math.round(rng.int(ctx.base[0], ctx.base[1]) / unit)];
        for (let i = 1; i < k; i++) {
          const ch = unit * rng.int(ctx.up ? 0 : -4, 5);
          v.push(Math.max(ctx.base[0], v[i - 1] + ch));
        }
        return v;
      };
      const vals = mkSeries();
      const two = d === 3 ? mkSeries() : null;
      const all = two ? [...vals, ...two] : vals;
      const yMin = ctx.base[0] >= 20 ? Math.floor((Math.min(...all) - 1) / step) * step : 0;
      const yMax = Math.ceil(Math.max(...all) / step) * step + step;
      if ((yMax - yMin) / unit > 30 || (yMax - yMin) / step > 12) continue;
      const diagram = { type: 'lineGraph', title: ctx.title, categories: cats, series: [{ name: two ? ctx.series2[0] : ctx.title, values: vals }], yMin, yMax, yStep: step, yLabel: ctx.y, alt: `A line graph titled "${ctx.title}" with points for ${cats.join(', ')}.${two ? ` Two lines: ${ctx.series2[0]} and ${ctx.series2[1]}.` : ''} Read the values from the scale on the left.` };
      if (two) diagram.series.push({ name: ctx.series2[1], values: two });
      if (minor) diagram.minorStep = minor;
      const lineWord = minor ? `Each small gridline is worth ${minor}` : `The scale goes up in ${step}s`;
      const U = (v) => withUnit(v, ctx.unit);
      let prompt; let ansText; let ansVal; let solution; let ds = []; let typedOk = true; let fbStep = unit;
      const kind = d === 1 ? 'value' : d === 2 ? rng.pick(['most', 'change']) : rng.pick(['gap', 'widest']);
      if (kind === 'value') {
        const i = rng.int(0, k - 1);
        ansVal = vals[i]; ansText = U(vals[i]);
        prompt = `${ctx.intro} What ${ctx.verb} ${ctx.what} ${ctx.at} ${cats[i]}?`;
        solution = `${lineWord}. Go up from ${cats[i]} to the point, then across to the scale: ${U(vals[i])}. Answer: ${U(vals[i])}`;
        ds.push({ text: U(vals[i] + unit), code: 'DATA-NEXT-GRIDLINE', why: `${U(vals[i] + unit)} is the gridline just above the point. Read across from the point itself.` });
        if (vals[i] - unit >= 0) ds.push({ text: U(vals[i] - unit), code: 'DATA-NEXT-GRIDLINE', why: `${U(vals[i] - unit)} is the gridline just below the point. Read across from the point itself.` });
        for (const j of [i - 1, i + 1]) if (j >= 0 && j < k && vals[j] !== vals[i]) ds.push({ text: U(vals[j]), code: 'DATA-WRONG-ITEM', why: `${U(vals[j])} is the reading at ${cats[j]}. Find ${cats[i]} on the bottom axis first.` });
      } else if (kind === 'most') {
        const ch = vals.slice(1).map((v, i) => v - vals[i]);
        const best = Math.max(...ch);
        if (best <= 0 || ch.filter((x) => x === best).length > 1) continue;
        const i = ch.indexOf(best);
        const iv = (j) => `Between ${cats[j]} and ${cats[j + 1]}`;
        ansText = iv(i); typedOk = false;
        prompt = `${ctx.intro} Between which two readings did ${ctx.what} ${ctx.rise} the most?`;
        solution = `Find each change: ${ch.map((c, j) => `${cats[j]} to ${cats[j + 1]}: ${c >= 0 ? '+' : ''}${c}`).join('; ')}. The biggest increase is ${best}, ${lower(iv(i))}: the steepest part of the line going up. Answer: ${iv(i)}`;
        const hi = Math.max(...vals);
        if (vals.filter((v) => v === hi).length === 1) { const h = vals.indexOf(hi); if (h > 0 && h - 1 !== i) ds.push({ text: iv(h - 1), code: 'DATA-HIGHEST-NOT-CHANGE', why: `The line reaches its highest point at ${cats[h]}, but the rise from ${cats[h - 1]} was only ${ch[h - 1]}. Look for the steepest climb, not the highest point.` }); }
        const worst = Math.min(...ch);
        if (worst < 0 && ch.filter((x) => x === worst).length === 1) ds.push({ text: iv(ch.indexOf(worst)), code: 'DATA-FALL-AS-RISE', why: `${iv(ch.indexOf(worst))} the line goes DOWN by ${-worst}. The question asks for the biggest rise.` });
        try {
          const c = choices(rng, ansText, ds, (g) => { const j = (i + g) % (k - 1); return nearMiss(iv(j), `${iv(j)} the change is ${ch[j]}. Work out every change and compare.`); });
          return { type: 'mcq', prompt, ...c, solution, diagram };
        } catch { continue; }
      } else if (kind === 'change') {
        const [i, j] = sorted(rng.sample(range(0, k - 1), 2));
        if (vals[i] === vals[j]) continue;
        const up = vals[j] > vals[i];
        ansVal = Math.abs(vals[j] - vals[i]); ansText = U(ansVal);
        prompt = `${ctx.intro} By how much did ${ctx.what} ${up ? 'increase' : 'decrease'} from ${cats[i]} to ${cats[j]}?`;
        solution = `${lineWord}. At ${cats[i]}: ${U(vals[i])}. At ${cats[j]}: ${U(vals[j])}. Change: ${Math.max(vals[i], vals[j])} - ${Math.min(vals[i], vals[j])} = ${ansVal}. Answer: ${U(ansVal)}`;
        ds.push({ text: U(vals[j]), code: 'DATA-ONE-VALUE', why: `${U(vals[j])} is the reading at ${cats[j]}. The change is the difference between the two readings.` });
        ds.push({ text: U(vals[i] + vals[j]), code: 'OP-SWAP', why: 'It looks like you added the two readings. The change is the difference: subtract.' });
        if (unit > 1) ds.push({ text: U(ansVal / unit), code: 'DATA-SCALE-AS-ONE', why: `It looks like you counted the gridlines between the readings as 1 each. ${lineWord}.` });
        fbStep = unit;
      } else if (kind === 'gap') {
        const i = rng.int(0, k - 1);
        if (vals[i] === two[i]) continue;
        const [hiN, loN] = vals[i] > two[i] ? [0, 1] : [1, 0];
        const hv = Math.max(vals[i], two[i]); const lv = Math.min(vals[i], two[i]);
        ansVal = hv - lv; ansText = U(ansVal);
        prompt = `${ctx.intro} ${ctx.gap(cats[i], ctx.series2[hiN], ctx.series2[loN])}`;
        solution = `${lineWord}. At ${cats[i]}: ${ctx.series2[hiN]} ${U(hv)} and ${ctx.series2[loN]} ${U(lv)}. Difference: ${hv} - ${lv} = ${ansVal}. Answer: ${U(ansVal)}`;
        ds.push({ text: U(hv), code: 'DATA-ONE-VALUE', why: `${U(hv)} is the reading for ${ctx.series2[hiN]} only. "How much more" means the difference between the two lines.` });
        ds.push({ text: U(hv + lv), code: 'OP-SWAP', why: 'It looks like you added the two readings. Find the difference: subtract.' });
        if (unit > 1) ds.push({ text: U(ansVal / unit), code: 'DATA-SCALE-AS-ONE', why: `It looks like you counted the gridlines between the two points as 1 each. ${lineWord}.` });
      } else {
        const gaps = vals.map((v, i) => Math.abs(v - two[i]));
        const best = Math.max(...gaps);
        if (gaps.filter((x) => x === best).length > 1) continue;
        const i = gaps.indexOf(best);
        ansText = cats[i]; typedOk = false;
        prompt = `${ctx.intro} At which reading were the two lines furthest apart?`;
        solution = `Find the gap between the two lines at each reading: ${cats.map((c, j) => `${c} ${gaps[j]}`).join(', ')}. The biggest gap is ${best}, at ${cats[i]}. Answer: ${cats[i]}`;
        const hi = Math.max(...vals, ...two);
        const hj = [...vals, ...two].indexOf(hi) % k;
        if ([...vals, ...two].filter((x) => x === hi).length === 1 && hj !== i) ds.push({ text: cats[hj], code: 'DATA-HIGHEST-NOT-DIFFERENCE', why: `${cats[hj]} has the highest point, but the lines are only ${gaps[hj]} apart there. Compare the gaps between the lines.` });
        try {
          const c = choices(rng, ansText, ds, (g) => { const j = (i + g) % k; return nearMiss(cats[j], `At ${cats[j]} the gap is ${gaps[j]}. Compare the gap at every reading.`); });
          return { type: 'mcq', prompt, ...c, solution, diagram, marks: 2 };
        } catch { continue; }
      }
      try {
        const typed = typedOk && ctx.unit !== 'RM' && d >= 1 && rng.chance(0.3);
        const body = typed
          ? { type: 'numeric', answer: numericAnswer(ansVal, [String(ansVal), ...(ctx.unit && ctx.unit !== 'RM' ? [`${ansVal} ${ctx.unit}`] : [])]), ...typedMisconceptions(String(ansVal), ds.map((x) => ({ ...x, text: String(x.text).replace(/ ?(°C|cm)$/, '') })), { code: 'DATA-SCALE-AS-ONE', why: `Check the scale first: ${lower(lineWord)}.` }) }
          : { type: 'mcq', ...choices(rng, ansText, ds, (g) => nearMiss(U(ansVal + fbStep * (g % 2 ? Math.ceil(g / 2) : -Math.ceil(g / 2))), `Check the scale: ${lower(lineWord)}.`)) };
        if (body.type === 'mcq' && body.options.some((o) => /^-/.test(o) || /RM -/.test(o))) continue;
        return { ...body, prompt, solution, diagram, marks: d === 3 ? 2 : 1 };
      } catch { /* draw again */ }
    }
  },
};

// ---------------------------------------------------------------- g05, g06 pie charts

const PIE_CTX = [
  { intro: (N) => `The pie chart shows how ${N} pupils travel to school.`, cats: ['Walk', 'Car', 'Bus', 'Bicycle', 'Train'], noun: 'pupils', q: (c) => `How many pupils chose ${c}?`, title: 'How we travel to school' },
  { intro: (N) => `The pie chart shows the favourite fruit of ${N} pupils.`, cats: ['Durian', 'Mango', 'Rambutan', 'Papaya', 'Banana'], noun: 'pupils', q: (c) => `How many pupils chose ${c}?`, title: 'Favourite fruit' },
  { intro: (N) => `The pie chart shows the drinks chosen by ${N} customers at a stall.`, cats: ['Milo', 'Teh tarik', 'Kopi', 'Soya milk', 'Water'], noun: 'customers', q: (c) => `How many customers chose ${c}?`, title: 'Drinks chosen' },
  { intro: (N) => `The pie chart shows the favourite sport of ${N} members of a sports club.`, cats: ['Football', 'Badminton', 'Swimming', 'Netball', 'Hockey'], noun: 'members', q: (c) => `How many members chose ${c}?`, title: 'Favourite sport' },
  { intro: (N) => `The pie chart shows how ${N} families spend a Saturday morning.`, cats: ['Shopping', 'Park', 'Beach', 'Cinema', 'Home'], noun: 'families', q: (c) => `How many families chose ${c}?`, title: 'Saturday morning' },
];

const readPie = {
  id: 'm12.pie-chart', topicId: T, subtopicId: 'm12-s2', skill: SK.pie,
  title: 'Pie charts: a half or quarter sector (D1), a sector angle to a number (D2), a number to an angle (D3)',
  difficulties: [1, 2, 3],
  check: { min: 0, integer: true },
  make(rng, d) {
    for (;;) {
      const ctx = rng.pick(PIE_CTX);
      const k = rng.int(3, d === 1 ? 4 : 5);
      const cats = rng.sample(ctx.cats, k);
      const ds = [];
      let prompt; let ans; let solution; let diagram; let unit = '';
      if (d === 1) {
        // sectors in eighths; the asked one is a quarter or a half
        const ask = rng.pick([2, 4, 2]);
        const parts = [ask, ...partition(rng, 8 - ask, k - 1)];
        if (parts.slice(1).includes(ask) && rng.chance(0.7)) continue;
        const N = 8 * rng.int(3, 25);
        const order = rng.shuffle(range(0, k - 1));
        const slices = order.map((o) => ({ label: cats[o], value: (N / 8) * parts[o] }));
        diagram = { type: 'pieChart', title: ctx.title, slices, rightAngles: true };
        ans = (N / 8) * ask;
        const frac = ask === 4 ? '1/2' : '1/4';
        prompt = `${ctx.intro(N)} ${ctx.q(cats[0])}`;
        solution = `The ${cats[0]} sector is ${ask === 4 ? 'half the circle (a straight line across the middle)' : 'a right angle, which is a quarter of the circle'}. ${frac} of ${N} = ${N} ÷ ${ask === 4 ? 2 : 4} = ${ans}. Answer: ${ans}`;
        ds.push({ text: String(ask === 4 ? 180 : 90), code: 'DATA-ANGLE-AS-COUNT', why: `${ask === 4 ? 180 : 90} is the angle of the sector in degrees. The sector is ${frac} of the circle, so find ${frac} of ${N} ${ctx.noun}.` });
        if ((N * (ask === 4 ? 180 : 90)) % 100 === 0) ds.push({ text: String((N * (ask === 4 ? 180 : 90)) / 100), code: 'DATA-PIE-PERCENT', why: `It looks like you treated ${ask === 4 ? 180 : 90}° as ${ask === 4 ? 180 : 90}%. A whole circle is 360°, not 100.` });
        ds.push({ text: String(N - ans), code: 'PCT-OF-WRONG-WHOLE', why: `${N - ans} is the number in all the OTHER sectors. Find ${frac} of ${N} for the ${cats[0]} sector.` });
      } else if (d === 2) {
        const angle = 15 * rng.int(2, 14);
        if (angle === 180) continue;
        const N = rng.pick([24, 36, 40, 48, 60, 72, 80, 90, 96, 120, 144, 180, 240, 360]);
        if ((N * angle) % 360) continue;
        ans = (N * angle) / 360;
        // the other sectors share the rest
        const rest = N - ans;
        const minPart = Math.max(1, Math.round(N / 14));
        if (rest < (k - 1) * (minPart + 1)) continue;
        const others = partition(rng, rest, k - 1, minPart);
        const slices = rng.shuffle([{ label: cats[0], value: ans }, ...others.map((v, i) => ({ label: cats[i + 1], value: v }))]);
        diagram = { type: 'pieChart', title: ctx.title, slices };
        const g = gcdN(angle, 360);
        prompt = `${ctx.intro(N)} The ${cats[0]} sector has an angle of ${angle}°. ${ctx.q(cats[0])}`;
        solution = `A full circle is 360°. ${angle}° is ${angle}/360 = ${angle / g}/${360 / g} of the circle. ${angle / g}/${360 / g} of ${N} = ${N} ÷ ${360 / g} x ${angle / g} = ${ans}. Remember: the angle is not the number of ${ctx.noun}. Answer: ${ans}`;
        ds.push({ text: String(angle), code: 'DATA-ANGLE-AS-COUNT', why: `${angle} is the angle in degrees, not the number of ${ctx.noun}. Find ${angle}/360 of ${N}.` });
        if ((N * angle) % 100 === 0) ds.push({ text: String((N * angle) / 100), code: 'DATA-PIE-PERCENT', why: `It looks like you treated ${angle}° as ${angle}% of ${N}. A whole circle is 360°, so use ${angle}/360.` });
        ds.push({ text: String(rest), code: 'PCT-OF-WRONG-WHOLE', why: `${rest} is the number in all the other sectors. The question asks about ${cats[0]}.` });
      } else {
        // drawing: number -> angle, from a frequency table
        const N = rng.pick([18, 20, 24, 30, 36, 40, 45, 60, 72, 90, 120, 180]);
        if (N < k * 3) continue;
        const counts = partition(rng, N, k);
        const i = rng.int(0, k - 1);
        const each = 360 / N;
        ans = counts[i] * each; unit = '°';
        if (ans === 90 || ans === 180) continue;
        diagram = { type: 'table', title: ctx.title, columns: ['Choice', `Number of ${ctx.noun}`], rows: cats.map((c, j) => [c, counts[j]]) };
        prompt = `The table shows the choices of ${N} ${ctx.noun}. ${rng.pick(['Daniel', 'Siti', 'Priya', 'Omar', 'Mei Lin'])} is drawing a pie chart of the results. What angle should the ${cats[i]} sector be?`;
        solution = `A full circle is 360°, shared among ${N} ${ctx.noun}. Each one gets 360 ÷ ${N} = ${each}°. ${cats[i]}: ${counts[i]} x ${each}° = ${ans}°. Answer: ${ans}°`;
        ds.push({ text: `${counts[i]}°`, code: 'DATA-COUNT-AS-ANGLE', why: `${counts[i]} is the number of ${ctx.noun}, not the angle. Each one is worth 360 ÷ ${N} = ${each}°.` });
        if ((counts[i] * 100) % N === 0) ds.push({ text: `${(counts[i] * 100) / N}°`, code: 'DATA-PIE-PERCENT', why: `${(counts[i] * 100) / N} is the percentage of ${ctx.noun}. A pie chart uses 360°, not 100.` });
        if (360 % counts[i] === 0 && counts[i] > 1) ds.push({ text: `${360 / counts[i]}°`, code: 'DATA-PIE-DIVIDE-GROUP', why: `It looks like you divided 360 by ${counts[i]}. Divide 360 by the TOTAL (${N}), then multiply by ${counts[i]}.` });
        ds.push({ text: `${360 - ans}°`, code: 'PCT-OF-WRONG-WHOLE', why: `${360 - ans}° is the angle for all the other choices together.` });
      }
      try {
        const c = choices(rng, `${ans}${unit}`, ds, (g) => nearMiss(`${ans + (unit ? 15 : Math.max(1, Math.round(ans / 6))) * (g % 2 ? Math.ceil(g / 2) : -Math.ceil(g / 2))}${unit}`, 'A full circle is 360°: find what fraction of the circle the sector is.'));
        if (c.options.some((o) => /^-|^0°?$/.test(o))) continue;
        return { type: 'mcq', prompt, ...c, solution, diagram, skill: d === 3 ? SK.drawPie : SK.pie, marks: d === 3 ? 2 : 1 };
      } catch { /* draw again */ }
    }
  },
};
function gcdN(a, b) { while (b) [a, b] = [b, a % b]; return a; }

// ---------------------------------------------------------------- g07 Venn and Carroll diagrams

const isSquare = (n) => Number.isInteger(Math.sqrt(n));
const PROPS = [
  () => ({ label: 'Even numbers', short: 'Even', not: 'Not even', test: (n) => n % 2 === 0, says: (n, y) => `${n} is ${y ? '' : 'not '}even${y ? '' : ' (it is odd)'}` }),
  () => ({ label: 'Odd numbers', short: 'Odd', not: 'Not odd', test: (n) => n % 2 === 1, says: (n, y) => `${n} is ${y ? 'odd' : 'not odd (it is even)'}` }),
  (rng) => { const k = rng.pick([3, 4, 5, 6, 9, 10]); return { label: `Multiples of ${k}`, short: `Multiple of ${k}`, not: `Not a multiple of ${k}`, test: (n) => n % k === 0, says: (n, y) => `${n} is ${y ? '' : 'not '}a multiple of ${k}${y ? ` (${k} x ${n / k} = ${n})` : ''}` }; },
  (rng) => { const t = 10 * rng.int(2, 8); return { label: `Greater than ${t}`, short: `Greater than ${t}`, not: `Not greater than ${t}`, t, test: (n) => n > t, says: (n, y) => (n === t ? `${n} is equal to ${t}, so it is NOT greater than ${t}` : `${n} is ${y ? '' : 'not '}greater than ${t}`) }; },
  (rng) => { const t = 10 * rng.int(2, 8); return { label: `Less than ${t}`, short: `Less than ${t}`, not: `Not less than ${t}`, t, test: (n) => n < t, says: (n, y) => (n === t ? `${n} is equal to ${t}, so it is NOT less than ${t}` : `${n} is ${y ? '' : 'not '}less than ${t}`) }; },
  () => ({ label: 'Square numbers', short: 'Square number', not: 'Not a square number', test: isSquare, says: (n, y) => `${n} is ${y ? `a square number (${Math.sqrt(n)} x ${Math.sqrt(n)})` : 'not a square number'}` }),
  (rng) => { const m = rng.pick([24, 36, 48, 60]); return { label: `Factors of ${m}`, short: `Factor of ${m}`, not: `Not a factor of ${m}`, test: (n) => m % n === 0, says: (n, y) => `${n} is ${y ? `a factor of ${m} (${n} x ${m / n} = ${m})` : `not a factor of ${m}`}` }; },
];
function twoProps(rng) {
  for (;;) {
    const [i, j] = rng.sample(range(0, PROPS.length - 1), 2);
    if ((i === 0 && j === 1) || (i === 1 && j === 0)) continue;
    const A = PROPS[i](rng); const B = PROPS[j](rng);
    if (A.t && B.t) continue;
    return [A, B];
  }
}
const VREG = (A, B) => ({ A: `In '${A.label}' only`, B: `In '${B.label}' only`, AB: 'In the overlap of both circles', outside: 'Outside both circles' });
const regionOf = (a, b) => (a && b ? 'AB' : a ? 'A' : b ? 'B' : 'outside');

const venn = {
  id: 'm12.venn-carroll', topicId: T, subtopicId: 'm12-s2', skill: SK.venn,
  title: 'Venn and Carroll diagrams: place a number (D1 Venn, D2 Carroll with boundary cases), find the misplaced number or count regions (D3)',
  difficulties: [1, 2, 3],
  check: { min: 0 },
  make(rng, d) {
    for (;;) {
      const [A, B] = twoProps(rng);
      const boundary = (A.t || B.t) && rng.chance(d === 2 ? 0.5 : 0.25);
      const n = boundary ? (A.t || B.t) : rng.int(2, 99);
      const a = A.test(n); const b = B.test(n);
      if (d === 3) {
        const q = rng.chance(0.5) ? vennCount(rng) : misplaced(rng, A, B);
        if (q) return q;
        continue;
      }
      // a few example numbers already placed (not n)
      const ex = { A: [], B: [], AB: [], outside: [] };
      for (let t = 0; t < 40 && Object.values(ex).flat().length < 6; t++) {
        const m = rng.int(1, 99);
        if (m === n || Object.values(ex).flat().includes(m)) continue;
        const r = regionOf(A.test(m), B.test(m));
        if (ex[r].length < 2) ex[r].push(m);
      }
      const ds = [];
      const ans = regionOf(a, b);
      const slip = (prop, has) => (prop.t === n ? 'VENN-BOUNDARY' : 'VENN-PROPERTY-SLIP');
      let names; let prompt; let diagram;
      if (d === 1) {
        names = VREG(A, B);
        diagram = { type: 'venn', sets: [A.label, B.label], universe: 'Whole numbers 1 to 99', regions: ex };
        prompt = `The Venn diagram sorts whole numbers. Where should the number ${n} go?`;
      } else {
        const R = (x, y) => `'${x ? A.short : A.not}' and '${y ? B.short : B.not}'`;
        names = { AB: R(true, true), A: R(true, false), B: R(false, true), outside: R(false, false) };
        const cells = [[ex.AB, ex.B], [ex.A, ex.outside]]; // row = B test, column = A test
        diagram = { type: 'carroll', columns: [A.short, A.not], rows: [B.short, B.not], cells };
        prompt = `The Carroll diagram sorts whole numbers. In which box should the number ${n} go?`;
      }
      const flipA = regionOf(!a, b); const flipB = regionOf(a, !b); const flipAB = regionOf(!a, !b);
      ds.push({ text: names[flipA], code: slip(A, a), why: `Check '${d === 1 ? A.label : A.short}' again: ${A.says(n, a)}.` });
      ds.push({ text: names[flipB], code: slip(B, b), why: `Check '${d === 1 ? B.label : B.short}' again: ${B.says(n, b)}.` });
      ds.push({ text: names[flipAB], code: 'VENN-PROPERTY-SLIP', why: `Both tests went wrong here: ${A.says(n, a)}, and ${B.says(n, b)}.` });
      const solution = `Test each property. ${cap(A.says(n, a))}. ${cap(B.says(n, b))}. So ${n} goes ${d === 1 ? lower(names[ans]) : `in the box for ${names[ans]}`}. Answer: ${names[ans]}`;
      try {
        const c = choices(rng, names[ans], ds, null);
        return { type: 'mcq', prompt, ...c, solution, diagram };
      } catch { /* draw again */ }
    }
  },
};
const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);

/** D3: one number is in the wrong place in a Venn or Carroll diagram. */
function misplaced(rng, A, B) {
  const placed = [];
  for (let t = 0; t < 200 && placed.length < 7; t++) {
    const m = rng.int(2, 99);
    if (placed.some((p) => p.n === m)) continue;
    const r = regionOf(A.test(m), B.test(m));
    if (placed.filter((p) => p.r === r).length >= 2) continue;
    placed.push({ n: m, r });
  }
  if (placed.length < 6) return null;
  const regs = ['A', 'B', 'AB', 'outside'];
  if (regs.some((r) => !placed.some((p) => p.r === r))) return null;
  const bad = rng.pick(placed);
  const wrongR = rng.pick(regs.filter((r) => r !== bad.r));
  const shown = { A: [], B: [], AB: [], outside: [] };
  for (const p of placed) shown[p === bad ? wrongR : p.r].push(p.n);
  const carroll = rng.chance(0.5);
  const diagram = carroll
    ? { type: 'carroll', columns: [A.short, A.not], rows: [B.short, B.not], cells: [[shown.AB, shown.B], [shown.A, shown.outside]] }
    : { type: 'venn', sets: [A.label, B.label], regions: shown };
  const others = rng.sample(placed.filter((p) => p !== bad), 3);
  const ds = others.map((p) => ({ text: String(p.n), code: 'VENN-PROPERTY-SLIP', why: `${p.n} is in the right place: ${A.says(p.n, A.test(p.n))}, and ${B.says(p.n, B.test(p.n))}.` }));
  const prompt = `One number in this ${carroll ? 'Carroll' : 'Venn'} diagram is in the wrong place. Which number is it?`;
  const solution = `Test each number against both properties. ${cap(A.says(bad.n, A.test(bad.n)))}, and ${B.says(bad.n, B.test(bad.n))}, so ${bad.n} should be somewhere else. Every other number is in the right place. Answer: ${bad.n}`;
  try {
    return { type: 'mcq', prompt, ...choices(rng, String(bad.n), ds, null), solution, diagram, marks: 2 };
  } catch { return null; }
}

const COUNT_CTX = [
  { who: 'pupils in a class', A: 'have a cat', B: 'have a dog', both: 'have both a cat and a dog', neither: 'have neither a cat nor a dog', sa: 'Cat', sb: 'Dog', aOnly: 'have a cat but not a dog' },
  { who: 'pupils', A: 'play badminton', B: 'play football', both: 'play both', neither: 'play neither sport', sa: 'Badminton', sb: 'Football', aOnly: 'play badminton but not football' },
  { who: 'families on a street', A: 'own a car', B: 'own a motorbike', both: 'own both', neither: 'own neither', sa: 'Car', sb: 'Motorbike', aOnly: 'own a car but not a motorbike' },
  { who: 'pupils', A: 'like durian', B: 'like mangosteen', both: 'like both fruits', neither: 'like neither fruit', sa: 'Durian', sb: 'Mangosteen', aOnly: 'like durian but not mangosteen' },
];
function vennCount(rng) {
  const c = rng.pick(COUNT_CTX);
  const both = rng.int(2, 10); const aO = rng.int(2, 15); const bO = rng.int(2, 15); const nei = rng.int(1, 10);
  const a = aO + both; const b = bO + both; const N = aO + bO + both + nei;
  const ask = rng.pick(['neither', 'neither', 'aOnly', 'atLeast']);
  const ds = [];
  let ans; let q; let solution;
  const intro = `There are ${N} ${c.who}. ${a} ${c.A}, ${b} ${c.B} and ${both} ${c.both}.`;
  if (ask === 'neither') {
    ans = nei; q = `How many ${c.neither}?`;
    solution = `Put ${both} in the overlap. ${c.sa} only = ${a} - ${both} = ${aO}. ${c.sb} only = ${b} - ${both} = ${bO}. In at least one circle: ${aO} + ${both} + ${bO} = ${a + b - both}. Neither = ${N} - ${a + b - both} = ${nei}. Answer: ${nei}`;
    if (N - a - b > 0) ds.push({ text: String(N - a - b), code: 'VENN-OVERLAP-TWICE', why: `It looks like you took ${a} and ${b} from ${N}. The ${both} who are in both circles were then taken away twice.` });
    if (N - a - b - both > 0) ds.push({ text: String(N - a - b - both), code: 'VENN-OVERLAP-ADDED', why: `It looks like you took away ${a}, ${b} and ${both}. The ${both} are already counted inside ${a} and ${b}.` });
    ds.push({ text: String(a + b - both), code: 'PCT-OF-WRONG-WHOLE', why: `${a + b - both} is the number in at least one circle. The question asks how many are in neither.` });
  } else if (ask === 'aOnly') {
    ans = aO; q = `How many ${c.aOnly}?`;
    solution = `${a} ${c.A}, and ${both} of them are also in the other circle (the overlap). ${c.sa} only = ${a} - ${both} = ${aO}. Answer: ${aO}`;
    ds.push({ text: String(a), code: 'VENN-OVERLAP-IGNORED', why: `${a} is everyone in the ${c.sa} circle, including the ${both} in the overlap. Take the overlap away.` });
    ds.push({ text: String(N - b), code: 'PCT-OF-WRONG-WHOLE', why: `${N} - ${b} = ${N - b} includes the ${nei} who are in neither circle.` });
  } else {
    ans = a + b - both; q = `How many are in at least one of the two groups?`;
    solution = `${a} + ${b} counts the ${both} in the overlap twice. So in at least one group: ${a} + ${b} - ${both} = ${ans}. Answer: ${ans}`;
    ds.push({ text: String(a + b), code: 'VENN-OVERLAP-TWICE', why: `${a} + ${b} counts the ${both} in the overlap twice. Take ${both} away once.` });
    ds.push({ text: String(nei), code: 'PCT-OF-WRONG-WHOLE', why: `${nei} is the number in neither group. The question asks how many are in at least one.` });
    ds.push({ text: String(a + b + both), code: 'VENN-OVERLAP-ADDED', why: `It looks like you added the ${both} on again. They are already inside ${a} and ${b}.` });
  }
  const diagram = { type: 'venn', sets: [c.sa, c.sb], regions: { AB: [both] }, alt: `A Venn diagram with two overlapping circles, "${c.sa}" and "${c.sb}". The number ${both} is in the overlap.` };
  const prompt = `${intro} ${q} Use the Venn diagram to help you.`;
  try {
    const typed = rng.chance(0.4);
    if (typed) return { type: 'numeric', prompt, answer: numericAnswer(ans, [String(ans)]), ...typedMisconceptions(String(ans), ds, { code: 'VENN-OVERLAP-TWICE', why: 'Fill in the overlap first, then each circle, then the outside.' }), solution, diagram, marks: 2 };
    return { type: 'mcq', prompt, ...choices(rng, String(ans), ds, (g) => { const w = around(ans, 1, g); return w == null ? null : nearMiss(String(w), 'Fill in the overlap first, then each circle.'); }), solution, diagram, marks: 2 };
  } catch { return null; }
}

// ---------------------------------------------------------------- tally charts and frequency tables

const TALLY_CTX = [
  { title: 'Colours of cars passing the school', col: 'Colour', cats: ['Red', 'White', 'Black', 'Silver', 'Blue'], thing: 'cars', q: (c) => `How many ${lower(c)} cars passed the school?` },
  { title: 'Favourite hawker food', col: 'Food', cats: ['Nasi lemak', 'Roti canai', 'Laksa', 'Satay', 'Mee goreng'], thing: 'pupils', q: (c) => `How many pupils chose ${c}?` },
  { title: 'Birds seen in the school garden', col: 'Bird', cats: ['Mynah', 'Sparrow', 'Pigeon', 'Crow', 'Kingfisher'], thing: 'birds', q: (c) => `How many ${lower(c)}s were seen?` },
  { title: 'Favourite colour', col: 'Colour', cats: ['Pink', 'Green', 'Purple', 'Orange', 'Yellow'], thing: 'pupils', q: (c) => `How many pupils chose ${lower(c)}?` },
];
const DOT_CTX = [
  { desc: 'the number of books each pupil in a class read in a month', col: 'Books read', fcol: 'Number of pupils', xs: [0, 1, 2, 3, 4, 5], total: 'How many books did the pupils read altogether?', more: (t) => `How many pupils read more than ${t} books?`, unit: 'books', one: 'pupil' },
  { desc: 'the number of goals a team scored in each of its matches', col: 'Goals scored', fcol: 'Number of matches', xs: [0, 1, 2, 3, 4, 5], total: 'How many goals did the team score altogether?', more: (t) => `In how many matches did the team score more than ${t} goals?`, unit: 'goals', one: 'match' },
  { desc: 'the number of pets each family on a street has', col: 'Pets', fcol: 'Number of families', xs: [0, 1, 2, 3, 4], total: 'How many pets do these families have altogether?', more: (t) => `How many families have more than ${t} pets?`, unit: 'pets', one: 'family' },
];

const tally = {
  id: 'm12.tally-frequency', topicId: T, subtopicId: 'm12-s2', skill: SK.tally,
  title: 'Tally charts and frequency tables: read a tally (D1), totals and differences (D2), totals from a frequency table (D3)',
  difficulties: [1, 2, 3],
  check: { min: 0, integer: true },
  make(rng, d) {
    for (;;) {
      const ds = [];
      let prompt; let ans; let solution; let diagram; let dot = false;
      if (d < 3) {
        const c = rng.pick(TALLY_CTX);
        const k = rng.int(3, 5);
        const cats = rng.sample(c.cats, k);
        const ns = cats.map(() => rng.int(d === 1 ? 6 : 3, d === 1 ? 24 : 30));
        if (new Set(ns).size < k) continue;
        const i = rng.int(0, k - 1);
        const showTally = d === 1 || rng.chance(0.5);
        const rows = cats.map((x, j) => (showTally ? [x, { tally: ns[j] }, j === i && d === 1 ? '?' : String(ns[j])] : [x, String(ns[j])]));
        diagram = { type: 'table', title: c.title, columns: showTally ? [c.col, 'Tally', 'Frequency'] : [c.col, 'Frequency'], rows };
        if (d === 1) {
          const g = Math.floor(ns[i] / 5); const r = ns[i] % 5;
          if (g < 1 || r < 1) continue;
          ans = ns[i];
          diagram.alt = `A tally chart titled "${c.title}" with a row for each of ${cats.join(', ')}. The frequency for ${cats[i]} is missing.`;
          prompt = `The tally chart shows ${lower(c.title)}. Each gate of five is four lines with a fifth line across them. ${c.q(cats[i])}`;
          solution = `The tally for ${cats[i]} has ${g} gate${g > 1 ? 's' : ''} of five and ${r} more line${r > 1 ? 's' : ''}. ${g} x 5 = ${5 * g}, and ${5 * g} + ${r} = ${ans}. Answer: ${ans}`;
          ds.push({ text: String(4 * g + r), code: 'DATA-TALLY-GATE-FOUR', why: `It looks like you counted only the upright lines in each gate. Each gate (with the line across) stands for 5.` });
          ds.push({ text: String(g + r), code: 'DATA-TALLY-GATE-ONE', why: `It looks like you counted each gate as 1. Each gate stands for 5.` });
          ds.push({ text: String(5 * g), code: 'DATA-TALLY-SINGLES-MISSED', why: `${5 * g} is just the gates. Add the ${r} single line${r > 1 ? 's' : ''} as well.` });
        } else {
          diagram.alt = `A ${showTally ? 'tally chart' : 'frequency table'} titled "${c.title}" with a row for each of ${cats.join(', ')}.`;
          if (rng.chance(0.5)) {
            ans = sum(ns);
            prompt = `The ${showTally ? 'tally chart' : 'frequency table'} shows ${lower(c.title)}. How many ${c.thing} is that altogether?`;
            solution = `Add all the frequencies: ${ns.join(' + ')} = ${ans}. Answer: ${ans}`;
            for (let j = 0; j < k; j++) ds.push({ text: String(ans - ns[j]), code: 'DATA-TOTAL-MISSED-ITEM', why: `It looks like you left out ${cats[j]} (${ns[j]}). Add every row.` });
          } else {
            const [x, y] = rng.sample(range(0, k - 1), 2);
            const [p, q2] = ns[x] > ns[y] ? [x, y] : [y, x];
            ans = ns[p] - ns[q2];
            prompt = `The ${showTally ? 'tally chart' : 'frequency table'} shows ${lower(c.title)}. How many more ${c.thing} are in the ${cats[p]} row than in the ${cats[q2]} row?`;
            solution = `${cats[p]}: ${ns[p]}. ${cats[q2]}: ${ns[q2]}. Difference: ${ns[p]} - ${ns[q2]} = ${ans}. Answer: ${ans}`;
            ds.push({ text: String(ns[p]), code: 'DATA-ONE-VALUE', why: `${ns[p]} is the frequency for ${cats[p]} only. Find the difference: ${ns[p]} - ${ns[q2]}.` });
            ds.push({ text: String(ns[p] + ns[q2]), code: 'OP-SWAP', why: '"How many more" means the difference, so subtract.' });
          }
        }
      } else {
        const c = rng.pick(DOT_CTX);
        const k = rng.int(4, c.xs.length);
        const xs = c.xs.slice(0, k);
        const fs = xs.map(() => rng.int(1, 9));
        const S = sum(xs.map((x, j) => x * fs[j]));
        dot = rng.chance(0.45);
        diagram = dot
          ? { type: 'dotPlot', values: xs.flatMap((x, j) => Array(fs[j]).fill(x)), min: xs[0], max: xs[k - 1], step: 1, xLabel: c.col, alt: `A dot plot of ${c.desc}, with a column of dots above each value of ${c.col.toLowerCase()}. Each dot is one ${c.one}.` }
          : { type: 'table', columns: [c.col, c.fcol], rows: xs.map((x, j) => [String(x), fs[j]]) };
        const shows = dot ? `The dot plot shows ${c.desc}. Each dot stands for one ${c.one}.` : `The table shows ${c.desc}.`;
        if (rng.chance(0.55)) {
          ans = S;
          prompt = `${shows} ${c.total}`;
          solution = `Multiply each number of ${c.unit} by its frequency: ${xs.map((x, j) => `${x} x ${fs[j]} = ${x * fs[j]}`).join(', ')}. Add: ${xs.map((x, j) => x * fs[j]).join(' + ')} = ${S}. Answer: ${S}`;
          ds.push({ text: String(sum(fs)), code: 'DATA-FREQ-SUM-ONLY', why: `${sum(fs)} is the number of ${lower(c.fcol.replace('Number of ', ''))}. Multiply each number of ${c.unit} by its frequency, then add.` });
          ds.push({ text: String(sum(xs)), code: 'DATA-VALUES-SUM-ONLY', why: `It looks like you added the first column only. Each row happens a different number of times: multiply by the frequency.` });
          const j = rng.int(1, k - 1);
          ds.push({ text: String(S - xs[j] * fs[j]), code: 'DATA-TOTAL-MISSED-ITEM', why: `It looks like you left out the row for ${xs[j]} (${xs[j]} x ${fs[j]} = ${xs[j] * fs[j]}).` });
        } else {
          const t = rng.int(1, k - 2);
          ans = sum(fs.filter((_, j) => xs[j] > t));
          prompt = `${shows} ${c.more(t)}`;
          solution = `"More than ${t}" means ${xs.filter((x) => x > t).join(', ')} (not ${t} itself). Add those frequencies: ${fs.filter((_, j) => xs[j] > t).join(' + ')} = ${ans}. Answer: ${ans}`;
          ds.push({ text: String(ans + fs[xs.indexOf(t)]), code: 'DATA-BOUNDARY', why: `It looks like you included the ${fs[xs.indexOf(t)]} with exactly ${t}. "More than ${t}" does not include ${t}.` });
          ds.push({ text: String(sum(xs.filter((x) => x > t).map((x) => x * fs[xs.indexOf(x)]))), code: 'DATA-TIMES-VALUES', why: `It looks like you multiplied by the number of ${c.unit}. The question asks how many ${lower(c.fcol.replace('Number of ', ''))}: just add the frequencies.` });
          ds.push({ text: String(xs.filter((x) => x > t).length), code: 'DATA-ROWS-NOT-FREQ', why: `${xs.filter((x) => x > t).length} is the number of ROWS with more than ${t}. Add the frequencies in those rows.` });
        }
      }
      try {
        const typed = rng.chance(0.35);
        const body = typed
          ? { type: 'numeric', answer: numericAnswer(ans, [String(ans)]), ...typedMisconceptions(String(ans), ds, { code: 'DATA-TOTAL-MISSED-ITEM', why: 'Read every row carefully and check what the question asks for.' }) }
          : { type: 'mcq', ...choices(rng, String(ans), ds, (g) => { const w = around(ans, 1, g); return w == null ? null : nearMiss(String(w), 'Read every row carefully.'); }) };
        return { ...body, prompt, solution, diagram, marks: d === 3 ? 2 : 1, skill: dot ? 'reading dot plots' : SK.tally };
      } catch { /* draw again */ }
    }
  },
};

export default [averages, meanMissing, outlier, readBar, readLine, readPie, venn, tally];
