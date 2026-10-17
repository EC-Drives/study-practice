// m08 Probability: the probability scale and its words, equally likely outcomes (bags, spinners,
// dice, cards), fractions, decimals and percentages, probabilities adding to 1, mutually exclusive
// events, expected frequency and relative frequency.
// Patterns and ranges follow the CLO's generator guide (section 2, m08). Probabilities are given in
// their simplest form; spinners are drawn from the same sectors that the answer counts.

import { F, choices, typedMisconceptions, nearMiss, numericAnswer, person } from './core.js';

const T = 'm08-probability';
const SK = {
  language: 'probability language', scale: 'probability scale', compare: 'comparing probabilities',
  equal: 'probability of equally likely outcomes', fdp: 'probability as a fraction, decimal or percentage', to1: 'probabilities adding to 1',
  meIdentify: 'identifying mutually exclusive events', meAdd: 'adding probabilities of mutually exclusive events',
  expected: 'expected frequency', relative: 'relative frequency', interpret: 'interpreting experimental results',
};

export const EXTRA_CODES = {
  'PROB-ONE-OVER-TOTAL': 'Gives 1 over the total, ignoring how many outcomes are favourable',
  'PROB-ADD-ONE': 'Adds the probability to 1 instead of taking it away from 1',
  'PROB-COMPLEMENT-DIGITS': 'Takes the tenths away from 1 but leaves the hundredths digit unchanged (1 - 0.35 = 0.75)',
  'PROB-COMPLEMENT-ONE-ONLY': 'Takes only one of the given probabilities away from 1',
  'PROB-PROB-NOT-COUNT': 'Gives the probability when the question asks for a number of things',
  'PROB-LIKELY-AS-CERTAIN': 'Mixes up likely with certain, or unlikely with impossible',
  'PROB-COMPARE-COUNTS': 'Compares the numbers of favourable outcomes instead of the probabilities',
  'PROB-COMPARE-OTHER': 'Picks the bag with fewer of the other colours, without comparing fractions',
  'PROB-COMPARE-DIFFERENCE': 'Thinks two chances are equal because the difference between the colours is the same',
  'PROB-ME-OVERLAP': 'Chooses two events that can happen at the same time (they share an outcome)',
  'PROB-OR-MULTIPLY': 'Multiplies the probabilities of two mutually exclusive events instead of adding them',
  'PROB-OR-ONE-EVENT': 'Gives the probability of only one of the two events',
  'PROB-MISSING-TOTAL': 'Finds the total number of things but not the number asked for',
  'PROB-MISSING-ONE-PART': 'Finds the size of one part (one fifth, say) and stops',
  'PROB-FRACTION-AS-COUNT': 'Takes the numbers in the fraction as the actual numbers of things',
  'PROB-EXP-DIVIDE-COUNT': 'Divides the number of trials by the number of favourable outcomes',
  'PROB-EXP-OLD-COUNT': 'Gives the result from the first experiment instead of scaling it to the new number of trials',
};

// ---------------------------------------------------------------- helpers

const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const sum = (a) => a.reduce((s, x) => s + x, 0);
const andList = (a) => (a.length === 1 ? String(a[0]) : `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`);
const art = (n) => ([8, 11, 18].includes(n) || String(n).startsWith('8') ? `an ${n}` : `a ${n}`);
const COLS = ['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'white'];
const THINGS = ['counters', 'marbles', 'beads', 'sweets', 'cubes'];
const WORDS = ['impossible', 'unlikely', 'even chance', 'likely', 'certain'];
const wordOf = (f) => (f.n === 0 ? 'impossible' : f.cmp(1) === 0 ? 'certain' : f.cmp(F(1, 2)) === 0 ? 'even chance' : f.cmp(F(1, 2)) < 0 ? 'unlikely' : 'likely');
/** Decimal text of a terminating fraction. */
const dTxt = (f) => f.decimal();
const pTxt = (f) => `${f.mul(100).decimal()}%`;
const okDp = (f, dp = 3) => f.terminates && f.mul(10 ** dp).isInt;
/** k-th near miss around a fraction: a/b plus or minus i/b. */
const nearFrac = (f, den, k) => { const w = f.add(F(k % 2 ? Math.ceil(k / 2) : -Math.ceil(k / 2), den)); return w.n <= 0 || w.cmp(1) >= 0 ? null : w; };

/** Number events on 1..N, each { np (noun phrase), set }. */
function events(rng, N) {
  const all = range(1, N);
  const prime = (x) => x > 1 && range(2, x - 1).every((d) => x % d);
  const out = [
    { np: 'an even number', set: all.filter((x) => x % 2 === 0) },
    { np: 'an odd number', set: all.filter((x) => x % 2 === 1) },
    { np: 'a prime number', set: all.filter(prime) },
    { np: 'a square number', set: all.filter((x) => Number.isInteger(Math.sqrt(x))) },
  ];
  for (const k of [3, 4, 5, 6]) if (k * 2 <= N) out.push({ np: `a multiple of ${k}`, set: all.filter((x) => x % k === 0) });
  for (let t = 2; t < N; t++) { out.push({ np: `a number greater than ${t}`, set: all.filter((x) => x > t) }); out.push({ np: `a number less than ${t}`, set: all.filter((x) => x < t) }); }
  for (const m of [6, 8, 10, 12, 18, 20]) if (m <= N * 2 && m >= 6) out.push({ np: `a factor of ${m}`, set: all.filter((x) => m % x === 0) });
  for (const x of all) out.push({ np: art(x), set: [x] });
  return rng.shuffle(out.filter((e) => e.set.length > 0 && e.set.length < N));
}
const capital = (t) => t.charAt(0).toUpperCase() + t.slice(1);

// ---------------------------------------------------------------- the situations: bag, spinner, dice, cards

/** A random situation with a favourable count k out of T. Returns { intro, ask, k, T, colours, diagram }. */
function situation(rng, d, opts = {}) {
  const kind = opts.kind || rng.pick(d === 1 ? ['bag', 'spinner', 'dice'] : ['bag', 'spinner', 'cards', 'dice', 'bag']);
  const p = person(rng);
  if (kind === 'bag') {
    const c = rng.int(2, d === 1 ? 2 : 3);
    const cols = rng.sample(COLS, c);
    for (;;) {
      const counts = cols.map(() => rng.int(1, d === 1 ? 8 : 12));
      const tot = sum(counts);
      if (opts.totals && !opts.totals.includes(tot)) continue;
      if (tot < 4 || tot > 20) continue;
      const i = rng.int(0, c - 1);
      const thing = rng.pick(THINGS);
      const lead = `A bag has ${andList(counts.map((n, j) => `${n} ${cols[j]}`))} ${thing}.`;
      return { kind, lead, intro: `${lead} ${p.name} picks one without looking.`, ask: `that it is ${cols[i]}`, k: counts[i], T: tot, colours: c, what: cols[i], verb: 'picks', thing };
    }
  }
  if (kind === 'spinner') {
    for (;;) {
      const n = opts.totals ? rng.pick(opts.totals.filter((x) => x <= 12 && x >= 4)) : rng.pick(d === 1 ? [4, 5, 6, 8] : [5, 6, 8, 10, 12]);
      const c = rng.int(2, Math.min(4, n - 1));
      const cols = rng.sample(COLS.slice(0, 6), c);
      const sectors = rng.shuffle([...cols, ...Array.from({ length: n - c }, () => rng.pick(cols))]);
      const i = rng.int(0, c - 1);
      const k = sectors.filter((s) => s === cols[i]).length;
      if (opts.notHalf && 2 * k === n) continue;
      return { kind, intro: `The spinner has ${n} equal sections.`, ask: `that it lands on ${cols[i]}`, k, T: n, colours: c, what: cols[i], diagram: { type: 'spinner', sectors, alt: `A spinner with ${n} equal sections, coloured ${andList([...new Set(sectors)])}.` }, verb: 'spins' };
    }
  }
  const N = kind === 'dice' ? 6 : opts.totals ? rng.pick(opts.totals.filter((x) => x >= 10 && x <= 50)) : rng.pick([10, 12, 15, 20]);
  const e = events(rng, N).find((x) => !opts.notHalf || 2 * x.set.length !== N);
  if (kind === 'dice') return { kind, intro: 'You roll an ordinary 6-sided dice numbered 1 to 6.', ask: `of rolling ${e.np}`, k: e.set.length, T: 6, colours: 0, ev: e };
  return { kind, intro: `Cards numbered 1 to ${N} are shuffled. ${p.name} picks one card without looking.`, ask: `that the number on it is ${e.np}`, k: e.set.length, T: N, colours: 0, ev: e };
}
const why = {
  partPart: (s) => `It looks like you compared ${s.k} with the other ${s.T - s.k} (part to part). A probability compares the ${s.k} with ALL ${s.T} equally likely outcomes.`,
  count: (s) => `${s.k} is how many outcomes are favourable. A probability is a fraction: ${s.k} out of ${s.T}.`,
  oneOver: (s) => `1/${s.T} is the chance of one particular outcome. ${s.k} outcomes are favourable here, so it is ${s.k}/${s.T}.`,
  sections: (s) => `There are ${s.colours} colours, but they are not equally likely: they have different numbers of ${s.kind === 'spinner' ? 'sections' : s.thing}. Count them.`,
  complement: (s, f) => `${f} is the probability that it does NOT happen (${s.T - s.k} out of ${s.T}).`,
};

/** The standard wrong answers for a probability k/T (as fractions). */
function probDistractors(s) {
  const f = F(s.k, s.T);
  const ds = [];
  if (s.T - s.k > 0 && s.T - s.k !== s.k) ds.push({ text: `${s.k}/${s.T - s.k}`, code: 'PROB-PART-PART', why: why.partPart(s) });
  ds.push({ text: String(s.k), code: 'PROB-COUNT-NOT-FRACTION', why: why.count(s) });
  if (s.colours >= 2 && !F(1, s.colours).eq(f)) ds.push({ text: `1/${s.colours}`, code: 'PROB-SECTIONS-EQUAL', why: why.sections(s) });
  if (s.k > 1) ds.push({ text: `1/${s.T}`, code: 'PROB-ONE-OVER-TOTAL', why: why.oneOver(s) });
  const c = F(s.T - s.k, s.T);
  ds.push({ text: c.toString(), code: 'PROB-COMPLEMENT-FORGOT', why: why.complement(s, c) });
  return ds;
}

// ---------------------------------------------------------------- g01, g09 equally likely outcomes; missing count

const equallyLikely = {
  id: 'm08.equally-likely', topicId: T, subtopicId: 'm08-s2', skill: SK.equal,
  title: 'Probability from a bag, spinner, dice or cards (D3: find a missing number of counters)',
  difficulties: [1, 2, 3],
  check: { min: 0 },
  make(rng, d) {
    if (d === 3) return missingCount(rng);
    for (;;) {
      const s = situation(rng, d);
      const f = F(s.k, s.T);
      const simp = f.d !== s.T;
      const prompt = `${s.intro} What is the probability ${s.ask}?${simp ? ' Give your answer in its simplest form.' : ''}`;
      const list = s.ev ? `: ${andList(s.ev.set)}` : '';
      const solution = `There are ${s.T} equally likely outcomes, and ${s.k} of them ${s.kind === 'dice' || s.kind === 'cards' ? `are favourable${list}` : `are ${s.what}`}. So the probability is ${s.k}/${s.T}${simp ? `, which simplifies to ${f}` : ''}. Answer: ${f}`;
      const ds = probDistractors(s);
      try {
        if (rng.chance(d === 1 ? 0.25 : 0.4)) {
          const t = typedMisconceptions(f.toString(), ds, { code: 'PROB-PART-PART', why: `Count ALL the equally likely outcomes (${s.T}) for the bottom of the fraction.` });
          const acc = [f.toString(), ...(okDp(f, 2) ? [dTxt(f), pTxt(f)] : [])];
          return { type: 'short', prompt, answer: { accept: acc, keywords: [] }, solution, ...t, diagram: s.diagram };
        }
        const c = choices(rng, f.toString(), ds, (k) => { const w = nearFrac(f, s.T, k); return w && nearMiss(w.toString(), `Count the favourable outcomes and all ${s.T} outcomes again.`); });
        return { type: 'mcq', prompt, ...c, solution, diagram: s.diagram };
      } catch { /* draw again */ }
    }
  },
};

const PFORM = [
  (f) => ({ text: f.toString(), how: (x) => x.toString() }),
  (f) => ({ text: dTxt(f), how: dTxt }),
  (f) => ({ text: pTxt(f), how: pTxt }),
];
function missingCount(rng) {
  for (;;) {
    const p = F(rng.int(1, 9), rng.pick([2, 3, 4, 5, 6, 8, 10]));
    if (p.cmp(1) >= 0 || p.d === 1) continue;
    const unit = rng.int(1, 6);
    const red = p.n * unit; const tot = p.d * unit; const blue = tot - red;
    if (tot > 60 || blue === red) continue;
    const [c1, c2] = rng.sample(COLS, 2);
    const thing = rng.pick(THINGS);
    const form = PFORM[p.terminates && p.mul(100).isInt ? rng.int(0, 2) : 0](p);
    const prompt = `A bag has only ${c1} and ${c2} ${thing}. There are ${red} ${c1} ${thing}. The probability of picking a ${c1} one is ${form.text}. How many ${c2} ${thing} are in the bag?`;
    const solution = `The probability ${form.text} = ${p} means ${p.n} out of every ${p.d} ${thing} are ${c1}. ${p.n} part${p.n > 1 ? 's' : ''} = ${red}, so 1 part = ${unit}${p.n > 1 ? ` (${red} ÷ ${p.n})` : ''}. The whole bag is ${p.d} parts = ${tot} ${thing}. ${c2}: ${tot} - ${red} = ${blue}. Answer: ${blue}`;
    const ds = [
      { text: String(tot), code: 'PROB-MISSING-TOTAL', why: `${tot} is the total number of ${thing} in the bag. Take away the ${red} ${c1} ones.` },
      { text: String(p.d - p.n), code: 'PROB-FRACTION-AS-COUNT', why: `It looks like you used the numbers in ${p} as the numbers of ${thing}. ${p} means ${p.n} out of every ${p.d}; here there are ${red} ${c1} ${thing}.` },
      p.n > 1 ? { text: String(unit), code: 'PROB-MISSING-ONE-PART', why: `${unit} is the size of one part (one ${p.d}th of the bag). The ${c2} ${thing} are ${p.d - p.n} parts.` } : null,
    ].filter(Boolean);
    try {
      if (rng.chance(0.4)) return { type: 'numeric', prompt, answer: numericAnswer(blue, [String(blue)]), ...typedMisconceptions(String(blue), ds, { code: 'PROB-MISSING-TOTAL', why: 'Use the probability to find the total number in the bag first, then take away the ones you know.' }), solution, marks: 2 };
      return { type: 'mcq', prompt, ...choices(rng, String(blue), ds, (k) => { const w = blue + unit * (k % 2 ? Math.ceil(k / 2) : -Math.ceil(k / 2)); return w > 0 ? nearMiss(String(w), 'Find the total number in the bag first.') : null; }), solution, marks: 2 };
    } catch { /* draw again */ }
  }
}

// ---------------------------------------------------------------- g02 as a decimal or a percentage

const fdpForms = {
  id: 'm08.fdp-forms', topicId: T, subtopicId: 'm08-s2', skill: SK.fdp,
  title: 'Write a probability as a decimal (D1) or a decimal or percentage (D2)',
  difficulties: [1, 2],
  check: { min: 0, maxDp: 3 },
  make(rng, d) {
    for (;;) {
      const totals = d === 1 ? [2, 4, 5, 10] : [4, 5, 10, 20, 25, 50];
      const s = situation(rng, d, { kind: rng.pick(d === 1 ? ['bag', 'spinner'] : ['bag', 'spinner', 'cards', 'bag']), totals, notHalf: true });
      if (!totals.includes(s.T)) continue;
      const f = F(s.k, s.T);
      const pct = d === 2 && rng.chance(0.5);
      const show = pct ? pTxt : dTxt;
      const ans = show(f);
      const prompt = `${s.intro} What is the probability ${s.ask}? Give your answer as ${pct ? 'a percentage' : 'a decimal'}.`;
      const scale = 100 / s.T;
      const solution = `${s.k} out of ${s.T} outcomes are favourable, so the probability is ${s.k}/${s.T}.${Number.isInteger(scale) && s.T !== 100 ? ` Multiply top and bottom by ${scale}: ${s.k}/${s.T} = ${s.k * scale}/100` : ''} = ${ans}. Answer: ${ans}`;
      const ds = [];
      const dig = `0.${s.k}${s.T}`;
      if (!pct && s.k < 10 && !/0$/.test(dig) && dig.length <= 5) ds.push({ text: dig, code: 'FDP-DIGITS', why: `It looks like you wrote the digits ${s.k} and ${s.T} after a decimal point. ${s.k}/${s.T} means ${s.k} ÷ ${s.T}: change it to hundredths first.` });
      if (!pct && s.k < 10) ds.push({ text: `0.${s.k}`, code: 'FDP-DIGITS', why: `0.${s.k} is ${s.k} tenths, which is ${s.k}/10, not ${s.k}/${s.T}. Change ${s.k}/${s.T} to tenths or hundredths first.` });
      if (pct && s.T !== 100) ds.push({ text: `${s.k}%`, code: 'FDP-DIGITS', why: `${s.k}% means ${s.k} out of 100, but here it is ${s.k} out of ${s.T}. Change the fraction to hundredths first.` });
      const pp = F(s.k, s.T - s.k);
      if (pp.cmp(1) < 0 && okDp(pp, pct ? 2 : 3)) ds.push({ text: show(pp), code: 'PROB-PART-PART', why: why.partPart(s) });
      const c = F(s.T - s.k, s.T);
      ds.push({ text: show(c), code: 'PROB-COMPLEMENT-FORGOT', why: why.complement(s, show(c)) });
      try {
        if (!pct && rng.chance(0.4)) {
          const t = typedMisconceptions(ans, ds, { code: 'FDP-DIGITS', why: `Write ${s.k}/${s.T} as an equivalent fraction in tenths or hundredths, then as a decimal.` });
          return { type: 'numeric', prompt, answer: numericAnswer(f.value, [ans, f.toString(), pTxt(f)]), solution, ...t, diagram: s.diagram };
        }
        const step = s.T >= 20 ? s.T : 10;
        const c2 = choices(rng, ans, ds, (k) => { const w = nearFrac(f, step, k); return w && okDp(w, 3) ? nearMiss(show(w), 'Change the fraction to hundredths first.') : null; });
        return { type: 'mcq', prompt, ...c2, solution, diagram: s.diagram };
      } catch { /* draw again */ }
    }
  },
};

// ---------------------------------------------------------------- g03 probabilities adding to 1

const NOT_CTX = [
  { a: 'it rains in Kuala Lumpur tomorrow', not: 'it does not rain in Kuala Lumpur tomorrow' },
  { a: 'the school bus is late', not: 'the school bus is not late' },
  { a: 'a seed grows into a plant', not: 'the seed does not grow' },
  { a: "Arjun's team wins its next match (the match cannot be a draw)", not: "Arjun's team does not win" },
  { a: 'a spinner lands on red', not: 'it does not land on red' },
  { a: 'Siti scores a goal from a penalty', not: 'she does not score' },
  { a: 'a light bulb lasts more than a year', not: 'it does not last more than a year' },
  { a: 'Wei Ming is chosen as class captain', not: 'he is not chosen' },
  { a: 'the ferry to Penang leaves on time', not: 'it does not leave on time' },
  { a: 'a durian from a stall is ripe', not: 'it is not ripe' },
  { a: 'Priya wins a prize in the school raffle', not: 'she does not win a prize' },
  { a: 'a Grab car arrives within 5 minutes', not: 'it does not arrive within 5 minutes' },
  { a: 'it is sunny in Penang on Saturday', not: 'it is not sunny in Penang on Saturday' },
  { a: 'Omar hits the target with his first arrow', not: 'he misses the target' },
];
const complement = {
  id: 'm08.complement', topicId: T, subtopicId: 'm08-s2', skill: SK.to1,
  title: 'Probabilities adding to 1: P(not A) (D1 tenths, D2 hundredths, fractions, percentages; D3 three outcomes)',
  difficulties: [1, 2, 3],
  check: { min: 0, maxDp: 3 },
  make(rng, d) {
    for (;;) {
      if (d === 3) { const q = threeOutcomes(rng); if (q) return q; continue; }
      const c = rng.pick(NOT_CTX);
      const form = d === 1 ? rng.pick(['dec1', 'dec1', 'frac1', 'pct1']) : rng.pick(['dec2', 'frac', 'pct']);
      let p;
      if (form === 'dec1' || form === 'pct1') p = F(rng.int(1, 9), 10);
      else if (form === 'frac1') { p = F(rng.int(1, 9), rng.pick([3, 4, 5, 6, 8, 10])); if (p.cmp(1) >= 0) continue; }
      else if (form === 'dec2' || form === 'pct') { p = F(rng.int(11, 89), 100); if (p.mul(10).isInt) continue; } else { p = F(rng.int(1, 11), rng.pick([3, 4, 5, 6, 7, 8, 9, 10, 12])); if (p.cmp(1) >= 0) continue; }
      if (p.eq(F(1, 2))) continue;
      const show = form === 'pct' || form === 'pct1' ? pTxt : form === 'frac' || form === 'frac1' ? (f) => f.toString() : dTxt;
      const isPct = form === 'pct' || form === 'pct1'; const isFrac = form === 'frac' || form === 'frac1';
      const q = F(1).sub(p);
      const ans = show(q);
      const prompt = `The probability that ${c.a} is ${show(p)}. What is the probability that ${c.not}?`;
      const solution = `Either it happens or it does not, so the two probabilities add up to 1${isPct ? ' (100%)' : ''}. ${isPct ? `100% - ${show(p)}` : `1 - ${show(p)}`} = ${ans}. Answer: ${ans}`;
      const ds = [{ text: show(p), code: 'PROB-COMPLEMENT-FORGOT', why: `${show(p)} is the probability that ${c.a}. The question asks for the opposite: take it away from ${isPct ? '100%' : '1'}.` }];
      ds.push({ text: show(F(1).add(p)), code: 'PROB-ADD-ONE', why: `It looks like you added ${show(p)} to ${isPct ? '100%' : '1'}. A probability can never be more than 1: subtract instead.` });
      if (form === 'dec2' || form === 'pct') {
        const hh = p.mul(100).n; const t = Math.floor(hh / 10); const h = hh % 10;
        const w = F((10 - t) * 10 + h, 100);
        if (h && !w.eq(q)) ds.push({ text: show(w), code: 'PROB-COMPLEMENT-DIGITS', why: `It looks like you took the tenths from 1 but kept the ${h} hundredths. ${form === 'pct' ? `100 - ${hh} = ${100 - hh}` : `Line up the decimal points: 1.00 - ${show(p)} = ${ans}`}.` });
      }
      if (isFrac && p.n > 1) ds.push({ text: `${p.n - 1}/${p.d - 1}`, code: 'FR-ADD-TOPS-BOTTOMS', why: `It looks like you took 1 from the top and 1 from the bottom of ${p}. Write 1 as ${p.d}/${p.d} first: ${p.d}/${p.d} - ${p} = ${q}.` });
      try {
        const den = form === 'dec1' || form === 'pct1' ? 10 : isFrac ? p.d : 100;
        const typed = !isPct && rng.chance(0.35);
        if (typed) {
          const t = typedMisconceptions(ans, ds, { code: 'PROB-COMPLEMENT-FORGOT', why: 'The probability that something happens and the probability that it does not add up to 1.' });
          if (isFrac) return { type: 'short', prompt, answer: { accept: [ans, ...(okDp(q, 2) ? [dTxt(q)] : [])], keywords: [] }, solution, ...t };
          return { type: 'numeric', prompt, answer: numericAnswer(q.value, [ans, q.toString()]), solution, ...t };
        }
        const c2 = choices(rng, ans, ds, (k) => { const w = nearFrac(q, den, k); return w ? nearMiss(show(w), 'Take the probability away from 1.') : null; });
        return { type: 'mcq', prompt, ...c2, solution };
      } catch { /* draw again */ }
    }
  },
};

function threeOutcomes(rng) {
  const cols = rng.sample(COLS.slice(0, 6), 3);
  const N = rng.pick([20, 40, 50, 60, 80, 100, 120, 200]);
  const a = F(rng.int(1, 8) * 5, 100); const b = F(rng.int(1, 8) * 5, 100);
  const g = F(1).sub(a).sub(b);
  if (g.n <= 0 || a.eq(b) || g.eq(a) || g.eq(b)) return null;
  const counts = rng.chance(0.5);
  const thing = rng.pick(THINGS);
  const showA = rng.chance(0.5) ? dTxt : (f) => (f.d <= 20 ? f.toString() : dTxt(f));
  const intro = `A bag has ${counts ? `${N} ${thing}. Each one is` : `${thing} that are each`} ${cols[0]}, ${cols[1]} or ${cols[2]}. The probability of picking ${cols[0]} is ${showA(a)} and the probability of picking ${cols[1]} is ${dTxt(b)}.`;
  let prompt; let ans; let solution; const ds = [];
  if (!counts) {
    ans = dTxt(g);
    prompt = `${intro} What is the probability of picking ${cols[2]}? Give your answer as a decimal.`;
    solution = `The three probabilities add up to 1. ${showA(a)} + ${dTxt(b)} = ${dTxt(a.add(b))}. 1 - ${dTxt(a.add(b))} = ${ans}. Answer: ${ans}`;
    ds.push({ text: dTxt(F(1).sub(a)), code: 'PROB-COMPLEMENT-ONE-ONLY', why: `It looks like you took only the ${cols[0]} probability away from 1. Take away the ${cols[1]} one as well.` });
    ds.push({ text: dTxt(F(1).sub(b)), code: 'PROB-COMPLEMENT-ONE-ONLY', why: `It looks like you took only the ${cols[1]} probability away from 1. Take away the ${cols[0]} one as well.` });
    ds.push({ text: dTxt(a.add(b)), code: 'PROB-COMPLEMENT-FORGOT', why: `${dTxt(a.add(b))} is the probability of ${cols[0]} OR ${cols[1]}. ${cap(cols[2])} is everything else: 1 - ${dTxt(a.add(b))}.` });
    try {
      return { type: 'mcq', prompt, ...choices(rng, ans, ds, (k) => { const w = nearFrac(g, 20, k); return w ? nearMiss(dTxt(w), 'Add the two probabilities you know, then take the total from 1.') : null; }), solution, marks: 2 };
    } catch { return null; }
  }
  const n = g.mul(N);
  if (!n.isInt || !a.mul(N).isInt || !b.mul(N).isInt) return null;
  prompt = `${intro} How many ${cols[2]} ${thing} are in the bag?`;
  solution = `${cap(cols[0])}: ${showA(a)} x ${N} = ${a.mul(N)}. ${cap(cols[1])}: ${dTxt(b)} x ${N} = ${b.mul(N)}. ${cap(cols[2])}: ${N} - ${a.mul(N)} - ${b.mul(N)} = ${n}. (Or: P(${cols[2]}) = 1 - ${dTxt(a.add(b))} = ${dTxt(g)}, and ${dTxt(g)} x ${N} = ${n}.) Answer: ${n}`;
  ds.push({ text: String(F(1).sub(a).mul(N)), code: 'PROB-COMPLEMENT-ONE-ONLY', why: `${F(1).sub(a).mul(N)} is the number that are not ${cols[0]}. Some of those are ${cols[1]}: take them away too.` });
  ds.push({ text: String(a.add(b).mul(N)), code: 'PROB-COMPLEMENT-FORGOT', why: `${a.add(b).mul(N)} is the number of ${cols[0]} and ${cols[1]} ${thing}. The rest are ${cols[2]}.` });
  ds.push({ text: dTxt(g), code: 'PROB-PROB-NOT-COUNT', why: `${dTxt(g)} is the probability of ${cols[2]}. The question asks how many ${thing}: multiply by ${N}.` });
  try {
    if (rng.chance(0.4)) return { type: 'numeric', prompt, answer: numericAnswer(n.n, [String(n.n)]), ...typedMisconceptions(String(n.n), ds, { code: 'PROB-COMPLEMENT-ONE-ONLY', why: 'All three probabilities add up to 1. Find the probability of the third colour, then multiply by the number in the bag.' }), solution, marks: 2 };
    return { type: 'mcq', prompt, ...choices(rng, String(n.n), ds, (k) => { const w = n.n + (N / 20) * (k % 2 ? Math.ceil(k / 2) : -Math.ceil(k / 2)); return w > 0 ? nearMiss(String(w), 'Find the probability of the third colour first.') : null; }), solution, marks: 2 };
  } catch { return null; }
}
const cap = capital;

// ---------------------------------------------------------------- g04 probability words and the scale

const LETTERS = ['A', 'B', 'C', 'D'];
const probScale = {
  id: 'm08.prob-scale', topicId: T, subtopicId: 'm08-s1', skill: SK.language,
  title: 'Describe a chance in words (D1), or pick its point on the probability scale (D2)',
  difficulties: [1, 2],
  check: {},
  make(rng, d) {
    for (;;) {
      let s;
      const special = d === 1 && rng.chance(0.25);
      if (special) {
        const e = rng.pick([
          { ask: 'of rolling a 7', k: 0 }, { ask: 'of rolling a 0', k: 0 }, { ask: 'of rolling a number less than 7', k: 6 }, { ask: 'of rolling a whole number', k: 6 },
          { ask: 'of rolling a number greater than 6', k: 0 }, { ask: 'of rolling a number from 1 to 6', k: 6 },
        ]);
        s = { kind: 'dice', intro: 'You roll an ordinary 6-sided dice numbered 1 to 6.', ask: e.ask, k: e.k, T: 6, colours: 0, special: true };
      } else if (d === 1) s = situation(rng, 1);
      else s = situation(rng, 2, { kind: rng.pick(['bag', 'dice', 'cards']), totals: [4, 6, 8, 10, 12] });
      if (d === 2 && (s.T % 2 || s.T > 12)) continue;
      const f = F(s.k, s.T);
      if (d === 1) {
        const w = wordOf(f);
        const prompt = `${s.intro} How likely is it ${s.ask.replace(/^of /, 'that you get ').replace(/^that you get rolling /, 'that you roll ')}? Choose the best word.`;
        const solution = `${s.k} out of ${s.T} outcomes ${s.k === 1 ? 'is' : 'are'} favourable, so the probability is ${f}. ${w === 'impossible' ? 'It can never happen' : w === 'certain' ? 'It always happens' : w === 'even chance' ? 'That is exactly a half' : w === 'unlikely' ? 'That is less than a half' : 'That is more than a half'}, so it is ${w}. Answer: ${w}`;
        const ds = [];
        const cw = wordOf(F(1).sub(f));
        if (cw !== w) ds.push({ text: cw, code: 'PROB-COMPLEMENT-FORGOT', why: `"${cw}" describes the chance that it does NOT happen (${F(1).sub(f)}). Here the probability is ${f}.` });
        const shift = { likely: 'certain', unlikely: 'impossible', impossible: 'unlikely', certain: 'likely' }[w];
        if (shift) ds.push({ text: shift, code: 'PROB-LIKELY-AS-CERTAIN', why: w === 'likely' ? `Certain means it MUST happen. ${f} is less than 1, so it is likely but not certain.` : w === 'unlikely' ? `Impossible means it can NEVER happen. ${f} is more than 0, so it can happen: it is unlikely.` : w === 'impossible' ? 'Unlikely means it could still happen. This can never happen, so it is impossible.' : 'Likely means it might not happen. This always happens, so it is certain.' });
        if (s.colours === 2 && w !== 'even chance') ds.push({ text: 'even chance', code: 'PROB-SECTIONS-EQUAL', why: `There are two colours, but not the same number of each. Count them: ${s.k} out of ${s.T}.` });
        const idx = WORDS.indexOf(w);
        const near = [WORDS[idx - 1], WORDS[idx + 1]].filter(Boolean);
        try {
          const c = choices(rng, w, ds, (k) => nearMiss(near[(k - 1) % near.length], `Work out the probability (${s.k} out of ${s.T}) and compare it with 0, 1/2 and 1.`));
          return { type: 'mcq', prompt, ...c, solution, diagram: s.diagram, skill: SK.language };
        } catch { continue; }
      }
      // D2: which letter on the scale
      if (f.n === 0 || f.cmp(1) === 0) continue;
      const den = s.T;
      const comp = F(1).sub(f);
      const roles = [{ at: f, role: 'ans' }];
      if (!comp.eq(f)) roles.push({ at: comp, role: 'comp' });
      if (s.colours >= 2 && !F(1, s.colours).eq(f) && !F(1, s.colours).eq(comp) && (den % s.colours === 0)) roles.push({ at: F(1, s.colours), role: 'eq' });
      for (let t = 0; t < 50 && roles.length < 4; t++) {
        const x = F(rng.int(1, den - 1), den);
        if (roles.some((r) => Math.abs(r.at.sub(x).value) < 1.5 / den)) continue;
        roles.push({ at: x, role: 'other' });
      }
      if (roles.length < 4 || roles.some((r, i) => roles.some((q2, j) => j !== i && Math.abs(r.at.sub(q2.at).value) < 1.5 / den))) continue;
      const order = rng.shuffle(roles);
      const sortedByPos = [...order].sort((x, y) => x.at.cmp(y.at));
      sortedByPos.forEach((r, i) => { r.label = LETTERS[i]; });
      const diagram = { type: 'numberLine', min: 0, max: 1, step: '1/2', minorStep: `1/${den}`, format: 'fraction', points: sortedByPos.map((r) => ({ at: r.at.toString(), label: r.label })) };
      const ans = roles[0].label;
      const prompt = `${s.intro} The probability scale shows four points, A, B, C and D. Which point shows the probability ${s.ask}?`;
      const solution = `The probability is ${s.k}/${s.T}${f.d !== s.T ? ` = ${f}` : ''}. The scale is split into ${den} equal steps, so count ${f.n * (den / f.d)} step${f.n * (den / f.d) === 1 ? '' : 's'} from 0. That is point ${ans}. Answer: ${ans}`;
      const ds = [];
      for (const r of roles) {
        if (r.role === 'comp') ds.push({ text: r.label, code: 'PROB-COMPLEMENT-FORGOT', why: `Point ${r.label} is at ${r.at}, the probability that it does NOT happen. Count ${f.n * (den / f.d)} steps from 0.` });
        if (r.role === 'eq') ds.push({ text: r.label, code: 'PROB-SECTIONS-EQUAL', why: `Point ${r.label} is at ${r.at}, as if every colour were equally likely. Count the ${s.what}: ${s.k} out of ${s.T}.` });
      }
      const others = roles.filter((r) => r.role === 'other');
      try {
        const c = choices(rng, ans, ds, (k) => { const r = others[(k - 1) % others.length]; return nearMiss(r.label, `Point ${r.label} is at ${r.at}. Work out ${s.k}/${s.T} and count the steps from 0.`); });
        // keep the options in letter order
        const opts = [...c.options].sort();
        const map = c.options.map((o) => opts.indexOf(o));
        const mis = {}; const codes = {};
        Object.keys(c.misconceptions).forEach((k) => { mis[String(map[k])] = c.misconceptions[k]; codes[String(map[k])] = c.codes[k]; });
        return { type: 'mcq', prompt, options: opts, answer: opts.indexOf(ans), misconceptions: mis, codes, solution, diagram, skill: SK.scale };
      } catch { /* draw again */ }
    }
  },
};

// ---------------------------------------------------------------- comparing two bags

const compareBags = {
  id: 'm08.compare-bags', topicId: T, subtopicId: 'm08-s1', skill: SK.compare,
  title: 'Which bag gives the better chance? (D3 with three colours in each bag)',
  difficulties: [2, 3],
  check: {},
  make(rng, d) {
    for (;;) {
      const [cx, cy, cz] = rng.sample(COLS.slice(0, 6), 3);
      const thing = rng.pick(THINGS);
      const x1 = rng.int(2, 12); const y1 = rng.int(2, 12); const x2 = rng.int(2, 15); const y2 = rng.int(2, 15);
      const f1 = F(x1, x1 + y1); const f2 = F(x2, x2 + y2);
      const cmp = f1.cmp(f2);
      const OPT = ['Bag A', 'Bag B', 'Both bags give the same chance'];
      const ans = cmp > 0 ? OPT[0] : cmp < 0 ? OPT[1] : OPT[2];
      const ds = [];
      const rules = [];
      if (x1 !== x2) rules.push({ text: x1 > x2 ? OPT[0] : OPT[1], code: 'PROB-COMPARE-COUNTS', why: `Bag ${x1 > x2 ? 'A' : 'B'} has more ${cx} ${thing} (${Math.max(x1, x2)}), but it also has more ${thing} altogether. Compare the fractions ${x1}/${x1 + y1} and ${x2}/${x2 + y2}.` });
      if (y1 !== y2) rules.push({ text: y1 < y2 ? OPT[0] : OPT[1], code: 'PROB-COMPARE-OTHER', why: `Bag ${y1 < y2 ? 'A' : 'B'} has fewer of the other ${thing}, but that alone does not decide it. Compare the fractions ${x1}/${x1 + y1} and ${x2}/${x2 + y2}.` });
      if (y1 - x1 === y2 - x2) rules.push({ text: OPT[2], code: 'PROB-COMPARE-DIFFERENCE', why: `Both bags have the same DIFFERENCE between the colours (${Math.abs(y1 - x1)}), but the chances are fractions: ${x1}/${x1 + y1} and ${x2}/${x2 + y2} are not equal.` });
      for (const r of rules) if (r.text !== ans && !ds.some((q) => q.text === r.text)) ds.push(r);
      if (ds.length < 2) continue;
      const L = (x1 + y1) * (x2 + y2) / gcd2(x1 + y1, x2 + y2);
      const bag = (x, y) => (d === 3 ? (() => { const a = Math.max(1, Math.floor(y / 2)); return `${x} ${cx}, ${a} ${cy} and ${y - a} ${cz} ${thing}`; })() : `${x} ${cx} and ${y} ${cy} ${thing}`);
      if (d === 3 && (y1 < 2 || y2 < 2)) continue;
      if (d === 2 && x1 + y1 + x2 + y2 > 30) continue;
      if (d === 3 && x1 + y1 + x2 + y2 < 24) continue;
      const prompt = `Bag A has ${bag(x1, y1)}. Bag B has ${bag(x2, y2)}. You want to pick a ${cx} ${thing.replace(/s$/, '').replace(/sweet$/, 'sweet')} without looking. Which bag gives you the better chance?`;
      const solution = `Bag A: ${x1} ${cx} out of ${x1 + y1} = ${x1}/${x1 + y1}. Bag B: ${x2} ${cx} out of ${x2 + y2} = ${x2}/${x2 + y2}. With denominator ${L}: ${x1 * (L / (x1 + y1))}/${L} and ${x2 * (L / (x2 + y2))}/${L}. ${cmp === 0 ? 'They are equal' : `Bag ${cmp > 0 ? 'A' : 'B'} has the bigger fraction`}. Compare fractions, not just the numbers of ${cx} ${thing}. Answer: ${ans}`;
      try {
        const c = choices(rng, ans, ds, null, 3);
        const opts = [...OPT];
        const map = c.options.map((o) => opts.indexOf(o));
        const mis = {}; const codes = {};
        Object.keys(c.misconceptions).forEach((k) => { mis[String(map[k])] = c.misconceptions[k]; codes[String(map[k])] = c.codes[k]; });
        return { type: 'mcq', prompt, options: opts, answer: opts.indexOf(ans), misconceptions: mis, codes, solution, marks: d === 3 ? 2 : 1 };
      } catch { /* draw again */ }
    }
  },
};
function gcd2(a, b) { while (b) [a, b] = [b, a % b]; return a; }

// ---------------------------------------------------------------- g06 mutually exclusive events

const overlapText = (e1, e2) => { const both = e1.set.filter((x) => e2.set.includes(x)); return `${both.length === 1 ? `${both[0]} is` : `${andList(both.slice(0, 3))} are`} ${e1.np.replace(/^an? /, '')} and also ${e2.np.replace(/^an? /, '')}`; };
const meIdentify = {
  id: 'm08.mutually-exclusive', topicId: T, subtopicId: 'm08-s3', skill: SK.meIdentify,
  title: 'Mutually exclusive events: which event cannot happen with a given one (D1 a dice, D2 cards), which pair is mutually exclusive (D3)',
  difficulties: [1, 2, 3],
  check: {},
  make(rng, d) {
    for (;;) {
      const p = person(rng);
      const N = d === 1 ? 6 : rng.pick(d === 2 ? [10, 12, 15, 20] : [12, 15, 16, 18, 20, 24, 30]);
      const verb = d === 1 ? 'rolling' : 'picking';
      const intro = d === 1 ? `${p.name} rolls an ordinary 6-sided dice numbered 1 to 6 once.` : `${p.name} ${rng.pick(['picks one card', 'turns over one card'])} from a set of cards numbered 1 to ${N}.`;
      const evs = events(rng, N);
      const meets = (a, b) => a.set.some((x) => b.set.includes(x));
      const word = (e) => `${verb} ${e.np}`;
      if (d < 3) {
        const A = evs.find((e) => e.set.length >= 2 && e.set.length <= N / 2);
        const good = evs.find((e) => e !== A && !meets(A, e) && e.set.length >= (d === 1 ? 1 : 2));
        if (!good) continue;
        const bad = evs.filter((e) => e !== A && meets(A, e)).slice(0, 3);
        if (bad.length < 3 || new Set(bad.map(word)).size < 3) continue;
        const prompt = `${intro} Event A is '${word(A)}'. Which event is mutually exclusive with event A (cannot happen at the same time)?`;
        const solution = `Event A happens on ${andList(A.set)}. '${capital(word(good))}' happens on ${andList(good.set)}. No number is in both lists, so the two events cannot happen together: they are mutually exclusive. Answer: ${capital(word(good))}`;
        const ds = bad.map((e) => ({ text: capital(word(e)), code: 'PROB-ME-OVERLAP', why: `These can happen together: ${overlapText(e, A)}. Mutually exclusive events share no outcomes.` }));
        try { return { type: 'mcq', prompt, ...choices(rng, capital(word(good)), ds, null) , solution }; } catch { continue; }
      }
      // D3: which pair (four pairs to check)
      const pool = evs.slice(0, 30);
      let goodPair = null;
      for (let i = 0; i < pool.length && !goodPair; i++) for (let j = i + 1; j < pool.length; j++) if (!meets(pool[i], pool[j]) && pool[i].set.length >= 2 && pool[j].set.length >= 2) { goodPair = [pool[i], pool[j]]; break; }
      if (!goodPair) continue;
      const badPairs = [];
      for (let i = 0; i < pool.length && badPairs.length < 3; i++) for (let j = i + 1; j < pool.length && badPairs.length < 3; j++) if (meets(pool[i], pool[j]) && !pool[i].set.every((x) => pool[j].set.includes(x)) && !pool[j].set.every((x) => pool[i].set.includes(x))) badPairs.push([pool[i], pool[j]]);
      if (badPairs.length < 3) continue;
      const pt = ([a, b]) => `${capital(word(a))} and ${word(b)}`;
      const prompt = `${intro} Which pair of events are mutually exclusive (cannot both happen at the same time)?`;
      const [g1, g2] = goodPair;
      const solution = `${capital(word(g1))} happens on ${andList(g1.set)}. ${capital(word(g2))} happens on ${andList(g2.set)}. No number is in both, so they cannot happen together. In each other pair, at least one number makes both events happen. Answer: ${pt(goodPair)}`;
      const ds = badPairs.map(([a, b]) => ({ text: pt([a, b]), code: 'PROB-ME-OVERLAP', why: `These can happen together: ${overlapText(a, b)}.` }));
      try { return { type: 'mcq', prompt, ...choices(rng, pt(goodPair), ds, null), solution, marks: 2 }; } catch { /* draw again */ }
    }
  },
};

// ---------------------------------------------------------------- g05 adding probabilities of mutually exclusive events

const orProb = {
  id: 'm08.or-probability', topicId: T, subtopicId: 'm08-s3', skill: SK.meAdd,
  title: 'P(A or B) for mutually exclusive events (D2 from a numbered spinner or cards, D3 from given probabilities)',
  difficulties: [2, 3],
  check: { min: 0, maxDp: 3 },
  make(rng, d) {
    for (;;) {
      let prompt; let solution; let ansF; let a; let b; let diagram; let tb = null; let show = (f) => f.toString();
      if (d === 2) {
        const N = rng.pick([8, 10, 12, 20]);
        const spin = N <= 12 && rng.chance(0.6);
        const evs = events(rng, N).filter((e) => e.set.length <= N / 2);
        let pair = null;
        for (let i = 0; i < evs.length && !pair; i++) for (let j = i + 1; j < evs.length; j++) if (!evs[i].set.some((x) => evs[j].set.includes(x))) { pair = [evs[i], evs[j]]; break; }
        if (!pair) continue;
        const [e1, e2] = pair;
        a = F(e1.set.length, N); b = F(e2.set.length, N);
        tb = { text: `${e1.set.length + e2.set.length}/${2 * N}`, why: `It looks like you added the tops and the bottoms (${e1.set.length}/${N} + ${e2.set.length}/${N}). The denominators are already the same: add only the numerators.` };
        ansF = a.add(b);
        if (ansF.cmp(1) >= 0) continue;
        const intro = spin ? `The spinner has ${N} equal sections numbered 1 to ${N}.` : `Cards numbered 1 to ${N} are shuffled and you pick one.`;
        if (spin) diagram = { type: 'spinner', sectors: range(1, N).map(String) };
        prompt = `${intro} What is the probability that ${spin ? 'it lands on' : 'you pick'} ${e1.np} or ${e2.np}? Give your answer in its simplest form.`;
        solution = `${capital(e1.np)}: ${andList(e1.set)}, so ${e1.set.length}/${N}. ${capital(e2.np)}: ${andList(e2.set)}, so ${e2.set.length}/${N}. They cannot both happen, so add: ${e1.set.length}/${N} + ${e2.set.length}/${N} = ${e1.set.length + e2.set.length}/${N}${ansF.d !== N ? ` = ${ansF}` : ''}. Answer: ${ansF}`;
      } else {
        const cols = rng.sample(COLS.slice(0, 6), 4);
        const asDec = rng.chance(0.6);
        if (asDec) { a = F(rng.int(1, 9) * 5, 100); b = F(rng.int(1, 9) * 5, 100); show = dTxt; } else { a = F(1, rng.pick([3, 4, 5, 6, 8])); b = F(rng.int(1, 3), rng.pick([4, 5, 6, 8, 10, 12])); if (b.n >= b.d) continue; }
        ansF = a.add(b);
        if (ansF.cmp(1) >= 0 || a.eq(b) || ansF.cmp(F(9, 10)) > 0) continue;
        prompt = `A bag has ${cols[0]}, ${cols[1]}, ${cols[2]} and ${cols[3]} counters. The probability of picking ${cols[0]} is ${show(a)} and the probability of picking ${cols[1]} is ${show(b)}. You pick one counter. What is the probability that it is ${cols[0]} or ${cols[1]}?${asDec ? ' Give your answer as a decimal.' : ' Give your answer in its simplest form.'}`;
        const L = a.d * b.d / gcd2(a.d, b.d);
        solution = `A counter cannot be ${cols[0]} and ${cols[1]} at the same time, so the events are mutually exclusive: add the probabilities. ${asDec ? `${show(a)} + ${show(b)} = ${show(ansF)}` : `With denominator ${L}: ${a.n * (L / a.d)}/${L} + ${b.n * (L / b.d)}/${L} = ${a.n * (L / a.d) + b.n * (L / b.d)}/${L}${ansF.d !== L ? ` = ${ansF}` : ''}`}. Answer: ${show(ansF)}`;
      }
      const ds = [];
      const prod = a.mul(b);
      if (show !== dTxt || okDp(prod, 3)) ds.push({ text: show(prod), code: 'PROB-OR-MULTIPLY', why: `It looks like you multiplied ${show(a)} by ${show(b)}. For "or" with mutually exclusive events, ADD the probabilities.` });
      if (show !== dTxt) ds.push({ text: tb ? tb.text : `${a.n + b.n}/${a.d + b.d}`, code: 'FR-ADD-TOPS-BOTTOMS', why: tb ? tb.why : `It looks like you added the tops and the bottoms (${a.n} + ${b.n} and ${a.d} + ${b.d}). Make the denominators the same, then add only the numerators.` });
      ds.push({ text: show(b.cmp(a) > 0 ? b : a), code: 'PROB-OR-ONE-EVENT', why: `${show(b.cmp(a) > 0 ? b : a)} is the probability of only one of the two events. "Or" means either one: add both.` });
      const rest = F(1).sub(ansF);
      ds.push({ text: show(rest), code: 'PROB-COMPLEMENT-FORGOT', why: `${show(rest)} is the probability of NEITHER event. Add the two probabilities instead.` });
      try {
        const den = show === dTxt ? 20 : ansF.d;
        const c = choices(rng, show(ansF), ds, (k) => { const w = nearFrac(ansF, den, k); return w ? nearMiss(show(w), 'Add the two probabilities.') : null; });
        return { type: 'mcq', prompt, ...c, solution, diagram, marks: d === 3 ? 2 : 1 };
      } catch { /* draw again */ }
    }
  },
};

// ---------------------------------------------------------------- g07 expected frequency

const expected = {
  id: 'm08.expected-frequency', topicId: T, subtopicId: 'm08-s4', skill: SK.expected,
  title: 'Expected frequency: a dice or coin (D1), a spinner or bag (D2), from an experiment (D3)',
  difficulties: [1, 2, 3],
  check: { min: 0, integer: true },
  make(rng, d) {
    for (;;) {
      const p = person(rng);
      let prompt; let ans; let solution; const ds = [];
      if (d < 3) {
        let s;
        if (d === 1) {
          const kind = rng.pick(['dice', 'dice', 'coin', 'spinner']);
          if (kind === 'coin') s = { kind, intro: `${p.name} tosses a fair coin`, ask: 'land on heads', k: 1, T: 2, unit: 'tosses' };
          else if (kind === 'dice') { const e = events(rng, 6).find((x) => x.set.length <= 3); s = { kind, intro: `${p.name} rolls a fair dice numbered 1 to 6`, ask: `roll ${e.np}`, k: e.set.length, T: 6, ev: e }; } else s = { ...situation(rng, 1, { kind: 'spinner' }), unit: 'spins' };
        } else s = situation(rng, 2, { kind: rng.pick(['spinner', 'spinner', 'bag']) });
        const f = F(s.k, s.T);
        const n = f.d * rng.int(d === 1 ? 2 : 4, d === 1 ? 20 : 50);
        if (n < 20 || n > 600) continue;
        ans = f.mul(n).n;
        const him = p.he === 'she' ? 'her' : 'him';
        if (s.kind === 'spinner') prompt = `${s.intro} ${p.name} spins it ${n} times. About how many times would you expect it to land on ${s.what}?`;
        else if (s.kind === 'bag') prompt = `${s.lead} ${p.name} picks one without looking, writes down its colour and puts it back. ${p.He} does this ${n} times. About how many times would you expect ${him} to pick a ${s.what} one?`;
        else if (s.kind === 'coin') prompt = `${s.intro} ${n} times. About how many times would you expect the coin to land on heads?`;
        else prompt = `${s.intro} ${n} times. About how many times would you expect ${him} to ${s.ask}?`;
        solution = `The probability is ${s.k}/${s.T}${f.d !== s.T ? ` = ${f}` : ''}. Expected number = ${f} of ${n} = ${n} ÷ ${f.d}${f.n > 1 ? ` x ${f.n}` : ''} = ${ans}. You may not get exactly ${ans}, but about ${ans}. Answer: ${ans}`;
        if (f.n > 1) ds.push({ text: String(n / f.d), code: 'FR-OF-DIVIDE-ONLY', why: `${n / f.d} is 1/${f.d} of ${n}. The probability is ${f}, so multiply by ${f.n} as well.` });
        ds.push({ text: String(s.k), code: 'PROB-COUNT-NOT-FRACTION', why: `${s.k} is the number of favourable outcomes on one go. Over ${n} goes, expect ${f} of ${n}.` });
        ds.push({ text: String(n - ans), code: 'PROB-COMPLEMENT-FORGOT', why: `${n - ans} is how many times you would expect it NOT to happen.` });
        if (s.k > 1 && n % s.k === 0) ds.push({ text: String(n / s.k), code: 'PROB-EXP-DIVIDE-COUNT', why: `It looks like you divided ${n} by ${s.k}. Multiply ${n} by the probability ${f} instead.` });
        try {
          const typed = rng.chance(0.35);
          if (typed) return { type: 'numeric', prompt, answer: numericAnswer(ans, [String(ans)]), ...typedMisconceptions(String(ans), ds, { code: 'FR-OF-DIVIDE-ONLY', why: 'Expected number = probability x number of trials.' }), solution, diagram: s.diagram };
          return { type: 'mcq', prompt, ...choices(rng, String(ans), ds, (k) => { const w = ans + (n / f.d) * (k % 2 ? Math.ceil(k / 2) : -Math.ceil(k / 2)); return w > 0 ? nearMiss(String(w), 'Multiply the number of trials by the probability.') : null; }), solution, diagram: s.diagram };
        } catch { continue; }
      }
      // D3: from an experiment
      const col = rng.pick(COLS.slice(0, 5));
      const n1 = rng.pick([20, 40, 50, 60, 80, 100, 120, 150, 200]);
      const r = F(rng.int(1, 9), rng.pick([4, 5, 10]));
      if (!r.mul(n1).isInt || r.cmp(1) >= 0) continue;
      const k1 = r.mul(n1).n;
      const n2 = r.d * rng.int(5, 60);
      if (n2 === n1 || n2 > 600) continue;
      ans = r.mul(n2).n;
      const what = rng.pick([{ a: 'spins a spinner', b: `it lands on ${col}`, c: `land on ${col}`, more: 'spin it', u: 'spins' }, { a: 'drops a paper cup', b: 'it lands on its side', c: 'land on its side', more: 'drop it', u: 'drops' }, { a: 'flips a bottle', b: 'it lands standing up', c: 'land standing up', more: 'flip it', u: 'flips' }]);
      prompt = `${p.name} ${what.a} ${n1} times, and ${what.b} ${k1} times. ${p.He} is going to ${what.more} another ${n2} times. Using ${p.his} results, about how many times should ${p.he} expect it to ${what.c}?`;
      solution = `Relative frequency = ${k1} ÷ ${n1} = ${k1}/${n1} = ${r}. Expected number in ${n2} ${what.u} = ${r} x ${n2} = ${ans}. Answer: ${ans}`;
      ds.push({ text: String(k1), code: 'PROB-EXP-OLD-COUNT', why: `${k1} is what happened in the first ${n1} ${what.u}. Scale it to ${n2} ${what.u}: ${r} x ${n2}.` });
      const pp = F(k1, n1 - k1).mul(n2);
      if (pp.isInt && pp.n !== ans) ds.push({ text: String(pp.n), code: 'PROB-PART-PART', why: `It looks like you used ${k1}/${n1 - k1} (part to part). The relative frequency is ${k1} out of ALL ${n1}.` });
      ds.push({ text: String(n2 - ans), code: 'PROB-COMPLEMENT-FORGOT', why: `${n2 - ans} is how many times you would expect it NOT to happen.` });
      try {
        return { type: 'mcq', prompt, ...choices(rng, String(ans), ds, (k) => { const w = ans + (n2 / r.d) * (k % 2 ? Math.ceil(k / 2) : -Math.ceil(k / 2)); return w > 0 ? nearMiss(String(w), 'Find the relative frequency, then multiply by the new number of trials.') : null; }), solution, marks: 2 };
      } catch { /* draw again */ }
    }
  },
};

// ---------------------------------------------------------------- g08 relative frequency

const RF_CTX = [
  { a: (p, n) => `${p.name} spins a spinner ${n} times.`, b: (k, c) => `It lands on ${c} ${k} times.`, of: (c) => c, u: 'spins' },
  { a: (p, n) => `${p.name} drops a drawing pin ${n} times.`, b: (k) => `It lands point up ${k} times.`, of: () => 'the pin landing point up', u: 'drops' },
  { a: (p, n) => `${p.name} flips a bottle ${n} times.`, b: (k) => `It lands standing up ${k} times.`, of: () => 'the bottle landing standing up', u: 'flips' },
  { a: (p, n) => `${p.name} tosses a paper cup ${n} times.`, b: (k) => `It lands on its side ${k} times.`, of: () => 'the cup landing on its side', u: 'tosses' },
];
const relative = {
  id: 'm08.relative-frequency', topicId: T, subtopicId: 'm08-s4', skill: SK.relative,
  title: 'Relative frequency as a fraction (D1) or decimal (D2); estimate the contents of a bag from results (D3)',
  difficulties: [1, 2, 3],
  check: { min: 0, maxDp: 3 },
  make(rng, d) {
    for (;;) {
      const p = person(rng);
      const col = rng.pick(COLS.slice(0, 5));
      if (d < 3) {
        const c = rng.pick(RF_CTX);
        const n = d === 1 ? rng.pick([10, 12, 15, 20, 24, 25, 30, 40, 50]) : rng.pick([20, 25, 40, 50, 100, 200, 250, 400, 500]);
        const k = rng.int(1, n - 1);
        const f = F(k, n);
        if (d === 1 && f.d === n && rng.chance(0.6)) continue;
        if (d === 2 && !okDp(f, 3)) continue;
        const show = d === 1 ? (x) => x.toString() : dTxt;
        const prompt = `${c.a(p, n)} ${c.b(k, col)} What is the relative frequency of ${c.of(col)}? ${d === 1 ? 'Give your answer as a fraction in its simplest form.' : 'Give your answer as a decimal.'}`;
        const solution = `Relative frequency = number of times it happened ÷ number of trials = ${k}/${n}${f.d !== n ? ` = ${f}` : ''}${d === 2 ? ` = ${dTxt(f)}` : ''}. Answer: ${show(f)}`;
        const ds = [];
        const pp = F(k, n - k);
        if (d === 1) ds.push({ text: `${k}/${n - k}`, code: 'PROB-PART-PART', why: `${k}/${n - k} compares the times it happened with the times it did not. Divide by ALL ${n} ${c.u}.` });
        else if (okDp(pp, 3) && pp.cmp(1) < 0) ds.push({ text: dTxt(pp), code: 'PROB-PART-PART', why: `It looks like you divided ${k} by ${n - k} (the times it did not happen). Divide by ALL ${n} ${c.u}.` });
        const cp = F(n - k, n);
        ds.push({ text: show(cp), code: 'PROB-COMPLEMENT-FORGOT', why: `${show(cp)} is the relative frequency of it NOT happening.` });
        if (d === 1) ds.push({ text: String(k), code: 'PROB-COUNT-NOT-FRACTION', why: `${k} is the number of times. The relative frequency is a fraction of all ${n} ${c.u}.` });
        if (d === 2 && k < 1000) { const t = `0.${String(k).padStart(String(n).length - 1, '0')}`; if (!/0$/.test(t) && Math.abs(Number(t) - f.value) > 1e-9) ds.push({ text: t, code: 'FDP-DIGITS', why: `It looks like you put ${k} after a decimal point. Work out ${k} ÷ ${n}: write ${k}/${n} in hundredths or thousandths first.` }); }
        try {
          if (d === 2 && rng.chance(0.4)) return { type: 'numeric', prompt, answer: numericAnswer(f.value, [dTxt(f), f.toString(), `${k}/${n}`, pTxt(f)]), ...typedMisconceptions(dTxt(f), ds, { code: 'PROB-PART-PART', why: 'Relative frequency = number of times it happened ÷ total number of trials.' }), solution };
          const den = d === 1 ? f.d : 20;
          return { type: 'mcq', prompt, ...choices(rng, show(f), ds, (j) => { const w = nearFrac(f, den, j); return w && okDp(w, 3) || (w && d === 1) ? nearMiss(show(w), 'Divide the number of times it happened by the total number of trials.') : null; }), solution };
        } catch { continue; }
      }
      // D3: estimate how many in the bag
      const N = rng.pick([10, 10, 20, 12]);
      const n = rng.pick([100, 200, 300, 400, 500]);
      const k = rng.int(Math.round(n * 0.1), Math.round(n * 0.9));
      const est = (k * N) / n;
      const ans = Math.round(est);
      if (Math.abs(est - ans) > 0.2 || ans < 1 || ans >= N || ans * 2 === N) continue;
      const other = rng.pick(COLS.filter((x) => x !== col).slice(0, 5));
      const prompt = `A bag has ${N} counters. Some are ${col} and the rest are ${other}. ${p.name} picks a counter, writes down its colour and puts it back. ${p.He} does this ${n} times and gets ${col} ${k} times. What is the best estimate of how many of the ${N} counters are ${col}?`;
      const rf = F(k, n);
      const solution = `Relative frequency of ${col} = ${k} ÷ ${n} = ${dTxt(rf)}. So about ${dTxt(rf)} of the counters are ${col}: ${dTxt(rf)} x ${N} = ${+(est.toFixed(3))}. The number of counters must be a whole number, so the best estimate is ${ans}. Answer: ${ans}`;
      const ds = [
        { text: String(k), code: 'PROB-COUNT-NOT-FRACTION', why: `${k} is how many times ${col} was picked, not how many ${col} counters there are. Only ${N} counters are in the bag.` },
        { text: String(N - ans), code: 'PROB-COMPLEMENT-FORGOT', why: `${N - ans} is the estimate for the ${other} counters.` },
      ];
      const pp = Math.round((k / (n - k)) * N);
      if (pp !== ans && pp < N && pp > 0) ds.push({ text: String(pp), code: 'PROB-PART-PART', why: `It looks like you used ${k} ÷ ${n - k} (${col} compared with ${other}). Use ${k} out of ALL ${n} picks.` });
      try {
        return { type: 'mcq', prompt, ...choices(rng, String(ans), ds, (j) => { const w = ans + (j % 2 ? Math.ceil(j / 2) : -Math.ceil(j / 2)); return w > 0 && w < N ? nearMiss(String(w), 'Find the relative frequency, then that fraction of the counters in the bag.') : null; }), solution, marks: 2, skill: SK.interpret };
      } catch { /* draw again */ }
    }
  },
};

export default [equallyLikely, fdpForms, complement, probScale, compareBags, meIdentify, orProb, expected, relative];
