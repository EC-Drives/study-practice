// Independent answers for the m01 (place value) generators, worked out again from the question
// text (and the number line's data), and the misconception rules that must reproduce each wrong
// option from its code. Exact arithmetic with lib.js rationals; no code shared with js/generators.

import { Q, qadd, qsub, qmul, qdiv, qnum, qeq, parseQ, valueIn } from './lib.js';

const NUM = String.raw`-?\d{1,3}(?: \d{3})+(?:\.\d+)?|-?\d+(?:\.\d+)?`;
const v = (q) => qnum(q);
const P = (k) => (k >= 0 ? Q(10n ** BigInt(k)) : Q(1n, 10n ** BigInt(-k)));
const num = (t) => parseQ(String(t).replace(/ /g, ''));
const floorQ = (a) => { const n = a[0]; const d = a[1]; let f = n / d; if (n < 0n && f * d !== n) f -= 1n; return f; };
/** Round a (>= 0) to a multiple of step, halves up / always down / always up. */
const roundQ = (a, step) => qmul(Q(floorQ(qadd(qdiv(a, step), Q(1, 2)))), step);
const downQ = (a, step) => qmul(Q(floorQ(qdiv(a, step))), step);
const upQ = (a, step) => { const f = downQ(a, step); return f[0] * a[1] === a[0] * f[1] ? f : qadd(f, step); };

const PLACE_EXP = { millions: 6, 'hundred thousands': 5, 'ten thousands': 4, thousands: 3, hundreds: 2, tens: 1, ones: 0, tenths: -1, hundredths: -2, thousandths: -3 };
const EXP_NAME = Object.fromEntries(Object.entries(PLACE_EXP).map(([k, e]) => [e, k]));

/** Exponents (10^e) at which the digit D appears in a number written in figures. */
function placesOf(text, D) {
  const t = String(text).replace(/ /g, '');
  const [ip, fp = ''] = t.split('.');
  const out = [];
  for (let i = 0; i < ip.length; i++) if (ip[i] === String(D)) out.push(ip.length - 1 - i);
  for (let j = 0; j < fp.length; j++) if (fp[j] === String(D)) out.push(-(j + 1));
  return out;
}
const digitVal = (D, e) => qmul(Q(D), P(e));

// ---------------------------------------------------------------- digit value

function digitQ(q) {
  let m;
  if ((m = q.prompt.match(new RegExp(`value of the digit (\\d) in (${NUM})\\?`))) || (m = q.prompt.match(new RegExp(`In the number (${NUM}), what is the digit (\\d) worth`)))) {
    const [D, N] = /value of/.test(q.prompt) ? [m[1], m[2]] : [m[2], m[1]];
    return { kind: 'value', D: Number(D), e: placesOf(N, D)[0] };
  }
  if ((m = q.prompt.match(new RegExp(`In the number (${NUM}), which place is the digit (\\d) in`)))) return { kind: 'place', D: Number(m[2]), e: placesOf(m[1], m[2])[0] };
  if ((m = q.prompt.match(/In which number is the digit (\d) worth .*\(([\d. ]+)\)\?/))) {
    const D = Number(m[1]); const val = num(m[2]);
    const e = Math.round(Math.log10(qnum(val) / D));
    return { kind: 'which', D, e };
  }
  if ((m = q.prompt.match(new RegExp(`In the number (${NUM}), how many times greater is the value of the (\\d)`)))) {
    const ps = placesOf(m[1], m[2]);
    return { kind: 'times', gap: Math.max(...ps) - Math.min(...ps) };
  }
  if (/^A number has /.test(q.prompt)) {
    const parts = [...q.prompt.matchAll(/(\d+|no) (tens?|ones?|tenths?|hundredths?|thousandths?)\b/g)].map((x) => ({ n: x[1] === 'no' ? 0 : Number(x[1]), e: PLACE_EXP[x[2].endsWith('s') ? x[2] : `${x[2]}s`] }));
    return { kind: 'compose', parts };
  }
  return null;
}
const optionWithPlace = (q, D, e) => q.options.filter((o) => placesOf(o, D).includes(e));
function composeParts(parts) {
  const total = parts.reduce((s, p) => qadd(s, qmul(Q(p.n), P(p.e))), Q(0));
  const whole = parts.filter((p) => p.e >= 0).sort((a, b) => b.e - a.e).map((p) => p.n).join('');
  const zero = parts.find((p) => p.n === 0);
  return { total, whole, zero };
}

// ---------------------------------------------------------------- words to figures

const WORD = { zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };
function fromWords(text) {
  let total = 0; let cur = 0;
  for (const w of text.toLowerCase().replace(/,/g, ' ').replace(/-/g, ' ').split(/\s+/).filter(Boolean)) {
    if (w === 'and') continue;
    if (w in WORD) cur += WORD[w];
    else if (w === 'hundred') cur *= 100;
    else if (w === 'thousand') { total += cur * 1000; cur = 0; } else if (w === 'million') { total += cur * 1e6; cur = 0; } else throw new Error(`word ${w}`);
  }
  return total + cur;
}
function groupsOf(n) {
  const g = [Math.floor(n / 1e6), Math.floor(n / 1000) % 1000, n % 1000];
  while (g.length > 1 && g[0] === 0) g.shift();
  return g;
}
const wordsNumber = (q) => fromWords(q.prompt.match(/Write the number (.*) in figures/)[1]);

// ---------------------------------------------------------------- x and ÷ by 10, 100, 1000

const CTX = [
  [/thick\. How thick is a pile of ([\d ]+) sheets/, 'x'], [/mass of ([\d ]+) grains/, 'x'], [/([\d ]+) stamps are placed in a row/, 'x'],
  [/^([\d ]+) identical marbles/, '÷'], [/pile of ([\d ]+) identical coins/, '÷'], [/roll of ([\d ]+) identical stickers/, '÷'],
];
function timesParts(q) {
  const t = q.prompt;
  let m;
  if ((m = t.match(new RegExp(`^Work out (${NUM}) (x|÷) (${NUM}) (x|÷) (${NUM})\\.$`)))) return { kind: 'chain', x: num(m[1]), o1: m[2], p1: num(m[3]), o2: m[4], p2: num(m[5]) };
  if ((m = t.match(new RegExp(`^Work out (${NUM}) (x|÷) (${NUM})\\.$`)))) return { kind: 'one', x: num(m[1]), op: m[2], p: num(m[3]) };
  if ((m = t.match(new RegExp(`missing number: (${NUM}) (x|÷) \\? = (${NUM})`)))) return { kind: 'power', x: num(m[1]), op: m[2], r: num(m[3]) };
  if ((m = t.match(new RegExp(`missing number: \\? (x|÷) (${NUM}) = (${NUM})`)))) return { kind: 'start', op: m[1], p: num(m[2]), r: num(m[3]) };
  for (const [re, op] of CTX) {
    if ((m = t.match(re))) {
      const p = num(m[1]);
      const xs = [...t.matchAll(new RegExp(`(${NUM}) (?:mm|g|cm|ml)\\b`, 'g'))].map((z) => z[1]);
      return { kind: 'one', x: num(xs[0]), op, p };
    }
  }
  return null;
}
const ap = (a, op, p) => (op === 'x' ? qmul(a, p) : qdiv(a, p));
const inv = (op) => (op === 'x' ? '÷' : 'x');

// ---------------------------------------------------------------- compose, decompose, regroup

const UNIT_EXP = { tenths: -1, hundredths: -2, thousandths: -3, ones: 0, one: 0, tenth: -1, hundredth: -2, thousandth: -3 };
const valueOfParts = (text) => [...String(text).matchAll(/(\d+) (ones?|tenths?|hundredths?|thousandths?)\b/g)].reduce((s, x) => qadd(s, qmul(Q(x[1]), P(UNIT_EXP[x[2]]))), Q(0));
const digitIn = (a, e) => Number(floorQ(qdiv(a, P(e))) % 10n);
/** "1 tenth", "3 tenths". */
const cnt = (n, unit) => `${n} ${n === 1 ? unit.replace(/s$/, '') : unit}`;

function regroupParts(q) {
  const t = q.prompt; let m;
  if ((m = t.match(new RegExp(`^Work out (.*)\\.$`)))) return { kind: 'sum', terms: m[1].split(' + ') };
  if ((m = t.match(new RegExp(`^Fill in the missing part: (${NUM}) = (.*)$`)))) return { kind: 'missing', n: num(m[1]), terms: m[2].split(' + ') };
  if (/thousandths?/.test(t) && (m = t.match(new RegExp(`missing number: (${NUM}) = (.*)$`)))) {
    const terms = m[2].split(' + ').map((x) => { const k = x.match(/^(\d+|\?) (ones?|tenths?|hundredths?|thousandths?)$/); return { n: k[1], e: UNIT_EXP[k[2]] }; });
    return { kind: 'parts', n: num(m[1]), terms };
  }
  if ((m = t.match(new RegExp(`missing number: (${NUM}) = \\? tenths \\+ (\\d+) hundredths?`)))) return { kind: 'tenths', n: num(m[1]), h: Q(m[2]) };
  if ((m = t.match(new RegExp(`missing number: (${NUM}) = (\\d+) ones? \\+ \\? hundredths`)))) return { kind: 'hundredths', n: num(m[1]), w: Q(m[2]) };
  if ((m = t.match(new RegExp(`How many (tenths|hundredths|thousandths) are there in (${NUM}) altogether`)))) return { kind: 'howmany', e: UNIT_EXP[m[1]], n: num(m[2]) };
  if ((m = t.match(new RegExp(`Which of these is equal to (${NUM})\\?`)))) return { kind: 'equal', n: num(m[1]), text: m[1] };
  if (/^A number is made of/.test(t)) {
    const c = {}; for (const x of t.matchAll(/(\d+) (ones?|tenths?|hundredths?|thousandths?)\b/g)) c[UNIT_EXP[x[2]]] = Number(x[1]);
    return { kind: 'overflow', c };
  }
  return null;
}

// ---------------------------------------------------------------- rounding

const NEAREST = [['ten thousand', Q(10000)], ['tenth', Q(1, 10)], ['whole number', Q(1)], ['hundred', Q(100)], ['thousand', Q(1000)], ['ten', Q(10)]];
const nearestOf = (t) => { const m = t.match(/nearest (ten thousand|tenth|whole number|hundred|thousand|ten)\b/); return NEAREST.find(([k]) => k === m[1])[1]; };
function roundParts(q) {
  const t = q.prompt;
  if (/Which of these numbers rounds to/.test(t)) return { kind: 'which', R: num(t.match(new RegExp(`rounds to (${NUM}) when`))[1]), place: nearestOf(t) };
  if (/SMALLEST|LARGEST/.test(t)) {
    const R = num(t.match(new RegExp(`\\bis (${NUM})`))[1]);
    const unit = /two decimal places/.test(t) ? Q(1, 100) : /one decimal place/.test(t) ? Q(1, 10) : Q(1);
    return { kind: 'bound', R, unit, place: nearestOf(t), small: /SMALLEST/.test(t) };
  }
  const x = num(t.match(new RegExp(NUM))[0]);
  return { kind: 'round', x, place: nearestOf(t) };
}
function bounds(p) {
  const half = qdiv(p.place, Q(2));
  return { lo: qsub(p.R, half), hi: qsub(qadd(p.R, half), p.unit) };
}

// ---------------------------------------------------------------- compare and order

const fracDigitsNum = (t) => { const m = String(t).match(/\.(\d+)/); return m ? Number(m[1]) : 0; };
const fracLen = (t) => { const m = String(t).match(/\.(\d+)/); return m ? m[1].length : 0; };
const timeOf = (o) => num(o.match(/\(([\d.]+) s\)/)[1]);
function extremeRule(q, key) {
  const race = /Who was the fastest/.test(q.prompt);
  const largest = !race && /largest/.test(q.prompt);
  const nums = q.options.map((o) => (race ? o.match(/\(([\d.]+) s\)/)[1] : o));
  const vals = nums.map(key);
  const target = largest ? Math.max(...vals) : Math.min(...vals);
  return q.options.filter((_, i) => vals[i] === target);
}

// ---------------------------------------------------------------- number line

function lineParts(q) {
  const D = q.diagram;
  const at = num(D.points[0].at); const min = num(D.min); const step = num(D.step); const minor = num(D.minorStep);
  const left = qadd(min, qmul(Q(floorQ(qdiv(qsub(at, min), step))), step));
  const j = qdiv(qsub(at, left), minor);
  return { at, step, minor, left, j };
}

// ---------------------------------------------------------------- solvers

export const SOLVERS = {
  'm01.digit-value': (q) => {
    const p = digitQ(q);
    if (p.kind === 'value') return { value: v(digitVal(p.D, p.e)) };
    if (p.kind === 'place') return { text: EXP_NAME[p.e] };
    if (p.kind === 'which') return { text: optionWithPlace(q, p.D, p.e)[0] };
    if (p.kind === 'times') return { value: 10 ** p.gap };
    return { value: v(composeParts(p.parts).total) };
  },
  'm01.words-to-figures': (q) => ({ value: wordsNumber(q) }),
  'm01.times-divide-10-100-1000': (q) => {
    const p = timesParts(q);
    if (p.kind === 'one') return { value: v(ap(p.x, p.op, p.p)) };
    if (p.kind === 'chain') return { value: v(ap(ap(p.x, p.o1, p.p1), p.o2, p.p2)) };
    if (p.kind === 'power') return { value: v(p.op === 'x' ? qdiv(p.r, p.x) : qdiv(p.x, p.r)) };
    return { value: v(ap(p.r, inv(p.op), p.p)) };
  },
  'm01.compose-regroup': (q) => {
    const p = regroupParts(q);
    if (p.kind === 'sum') return { value: v(p.terms.reduce((s, x) => qadd(s, num(x)), Q(0))) };
    if (p.kind === 'missing') return { value: v(qsub(p.n, p.terms.filter((x) => x !== '?').reduce((s, x) => qadd(s, num(x)), Q(0)))) };
    if (p.kind === 'parts') {
      const known = p.terms.filter((x) => x.n !== '?').reduce((s, x) => qadd(s, qmul(Q(x.n), P(x.e))), Q(0));
      return { value: v(qdiv(qsub(p.n, known), P(p.terms.find((x) => x.n === '?').e))) };
    }
    if (p.kind === 'tenths') return { value: v(qmul(qsub(p.n, qdiv(p.h, Q(100))), Q(10))) };
    if (p.kind === 'hundredths') return { value: v(qmul(qsub(p.n, p.w), Q(100))) };
    if (p.kind === 'howmany') return { value: v(qdiv(p.n, P(p.e))) };
    if (p.kind === 'equal') return { text: q.options.find((o) => { const x = valueOfParts(o); return x[0] === p.n[0] && x[1] === p.n[1]; }) };
    return { value: v(Object.entries(p.c).reduce((s, [e, n]) => qadd(s, qmul(Q(n), P(Number(e)))), Q(0))) };
  },
  'm01.rounding': (q) => {
    const p = roundParts(q);
    if (p.kind === 'which') return { text: q.options.find((o) => qeq(roundQ(num(o), p.place), p.R)) };
    if (p.kind === 'round') return { value: v(roundQ(p.x, p.place)) };
    const b = bounds(p);
    return { value: v(p.small ? b.lo : b.hi) };
  },
  'm01.compare-order': (q) => {
    const t = q.prompt; let m;
    if (q.type === 'order') {
      const desc = /LARGEST to smallest/.test(t);
      return { order: [...q.options].sort((a, b) => (desc ? -1 : 1) * (valueIn(a) - valueIn(b))) };
    }
    if (q.type === 'truefalse') {
      m = t.match(new RegExp(`True or false: (${NUM}) ([<>]) (${NUM})$`));
      const a = valueIn(m[1]); const b = valueIn(m[3]);
      return { bool: m[2] === '>' ? a > b : a < b };
    }
    if ((m = t.match(new RegExp(`Count in (hundredths|thousandths) \\(steps of [\\d.]+\\)\\. How many numbers are greater than (${NUM}) but less than (${NUM})`)))) {
      const k = m[1] === 'hundredths' ? 2 : 3;
      return { value: v(qsub(qmul(qsub(num(m[3]), num(m[2])), P(k)), Q(1))) };
    }
    if ((m = t.match(new RegExp(`halfway between (${NUM}) and (${NUM})`)))) return { value: v(qdiv(qadd(num(m[1]), num(m[2])), Q(2))) };
    if (/Who was the fastest/.test(t)) { const ts = q.options.map((o) => qnum(timeOf(o))); return { text: q.options[ts.indexOf(Math.min(...ts))] }; }
    const vals = q.options.map(valueIn);
    const want = /largest/.test(t) ? Math.max(...vals) : Math.min(...vals);
    return { text: q.options[vals.indexOf(want)] };
  },
  'm01.number-line': (q) => ({ value: v(num(q.diagram.points[0].at)) }),
};

// ---------------------------------------------------------------- misconception rules

export const MIS = {
  'm01.digit-value': {
    'PV-WRONG-PLACE': (q) => {
      const p = digitQ(q);
      if (p.kind === 'value') return [v(digitVal(p.D, p.e + 1)), v(digitVal(p.D, p.e - 1))];
      if (p.kind === 'place') return [EXP_NAME[p.e + 1], EXP_NAME[p.e - 1]].filter(Boolean);
      if (p.kind === 'which') return [...optionWithPlace(q, p.D, p.e + 1), ...optionWithPlace(q, p.D, p.e - 1)];
      if (p.kind === 'times') return [10 ** (p.gap - 1), 10 ** (p.gap + 1)];
      // compose: a decimal digit moved into the empty place
      const c = composeParts(p.parts);
      return p.parts.filter((x) => x.e < 0 && x.n && Math.abs(x.e - c.zero.e) === 1).map((x) => v(qadd(qsub(c.total, qmul(Q(x.n), P(x.e))), qmul(Q(x.n), P(c.zero.e)))));
    },
    'PV-DIGIT-ONLY': (q) => [digitQ(q).D],
    'PV-TH-NAMES': (q) => {
      const p = digitQ(q);
      if (p.kind === 'value') return [v(digitVal(p.D, -p.e))];
      if (p.kind === 'place') return [EXP_NAME[-p.e]];
      return optionWithPlace(q, p.D, -p.e);
    },
    'PV-PLACES-AS-TIMES': (q) => [digitQ(q).gap],
    'PV-PLACEHOLDER-DROPPED': (q) => {
      const p = digitQ(q);
      const c = composeParts(p.parts);
      return [`${c.whole}.${p.parts.filter((x) => x.e < 0 && x.n).sort((a, b) => b.e - a.e).map((x) => x.n).join('')}`];
    },
    'PV-ORDER-AS-GIVEN': (q) => {
      const p = digitQ(q);
      const c = composeParts(p.parts);
      return [`${c.whole}.${p.parts.filter((x) => x.e < 0 && x.n).map((x) => x.n).join('')}`];
    },
  },
  'm01.words-to-figures': {
    'PV-PLACEHOLDER-DROPPED': (q) => {
      const g = groupsOf(wordsNumber(q));
      return g.map((x, i) => (i > 0 && x > 0 && x < 100 ? Number(g.map((y, j) => (j === 0 || j === i ? String(y) : String(y).padStart(3, '0'))).join('')) : null)).filter((x) => x != null);
    },
    'PV-PAD-WRONG-SIDE': (q) => {
      const g = groupsOf(wordsNumber(q));
      return g.map((x, i) => (i > 0 && x > 0 && x < 100 ? Number(g.map((y, j) => (j === 0 ? String(y) : j === i ? String(y).padEnd(3, '0') : String(y).padStart(3, '0'))).join('')) : null)).filter((x) => x != null);
    },
  },
  'm01.times-divide-10-100-1000': {
    'PV-SHIFT-WRONG': (q) => {
      const p = timesParts(q);
      if (p.kind === 'one') return [ap(p.x, p.op, qdiv(p.p, Q(10))), ap(p.x, p.op, qmul(p.p, Q(10))), ap(p.x, inv(p.op), p.p)].map(v);
      if (p.kind === 'power') return [10, 100, 1000, 10000];
      if (p.kind === 'start') return [ap(p.r, inv(p.op), qdiv(p.p, Q(10))), ap(p.r, inv(p.op), qmul(p.p, Q(10)))].map(v);
      // chain: one of the two steps one place out
      const r = ap(ap(p.x, p.o1, p.p1), p.o2, p.p2);
      return [qmul(r, Q(10)), qdiv(r, Q(10))].map(v);
    },
    'PV-ADD-ZERO': (q) => [v(timesParts(q).x)],
    'INVERSE-WRONG': (q) => { const p = timesParts(q); return [v(ap(p.r, p.op, p.p))]; },
    'ONE-STEP-ONLY': (q) => { const p = timesParts(q); return [v(ap(p.x, p.o1, p.p1))]; },
    'OP-SWAP': (q) => { const p = timesParts(q); return [v(ap(ap(p.x, p.o1, p.p1), p.o1, p.p2))]; },
  },
  'm01.compose-regroup': {
    'PV-PLACEHOLDER-DROPPED': (q) => {
      const p = regroupParts(q);
      if (p.kind === 'sum') {
        const whole = p.terms.find((x) => !x.includes('.'));
        const dec = p.terms.filter((x) => x.includes('.')).sort((a, b) => valueIn(b) - valueIn(a)).map((x) => x.replace(/^0\.0*/, ''));
        return [`${whole}.${dec.join('')}`];
      }
      const a = digitIn(p.n, 0); const c = digitIn(p.n, -2);
      return [cnt(Number(`${a}${c}`), 'hundredths')];
    },
    'PV-ORDER-AS-GIVEN': (q) => {
      const p = regroupParts(q);
      const whole = p.terms.find((x) => !x.includes('.'));
      return [`${whole}.${p.terms.filter((x) => x.includes('.')).map((x) => x.replace(/^0\.0*/, '')).join('')}`];
    },
    'PV-WRONG-PLACE': (q) => {
      const p = regroupParts(q);
      if (p.kind === 'sum') {
        const total = p.terms.reduce((s, x) => qadd(s, num(x)), Q(0));
        return p.terms.filter((x) => x.includes('.')).map((x) => v(qadd(qsub(total, num(x)), qdiv(num(x), Q(10)))));
      }
      const ans = qsub(p.n, p.terms.filter((x) => x !== '?').reduce((s, x) => qadd(s, num(x)), Q(0)));
      return [1, 10, 100, 1000].flatMap((k) => [v(qmul(ans, Q(k))), v(qdiv(ans, Q(k)))]);
    },
    'PV-DIGIT-ONLY': (q) => {
      const p = regroupParts(q);
      const ans = qsub(p.n, p.terms.filter((x) => x !== '?').reduce((s, x) => qadd(s, num(x)), Q(0)));
      return [Number(String(qnum(ans)).replace(/[0.]/g, ''))];
    },
    'PV-DIGIT-NOT-TOTAL': (q) => {
      const p = regroupParts(q);
      if (p.kind === 'tenths') return [digitIn(p.n, -1), digitIn(p.n, 0)];
      if (p.kind === 'hundredths') return [digitIn(p.n, -2), digitIn(p.n, -1)];
      if (p.kind === 'howmany') return [digitIn(p.n, p.e)];
      if (p.kind === 'parts') return [digitIn(p.n, -1), digitIn(p.n, -2), digitIn(p.n, -3)];
      const a = digitIn(p.n, 0); const c = digitIn(p.n, -2);
      return [`${cnt(a, 'ones')} and ${cnt(c, 'hundredths')}`];
    },
    'PV-WRONG-UNIT': (q) => {
      const p = regroupParts(q);
      if (p.kind === 'tenths' || p.kind === 'hundredths') return [v(qmul(p.n, Q(100)))];
      if (p.kind === 'howmany') { const ans = qdiv(p.n, P(p.e)); return [Number(floorQ(qdiv(ans, Q(10)))), v(qmul(ans, Q(10)))]; }
      // the whole number in thousandths; the tenths; the hundredths after the ones
      if (p.kind === 'parts') return [v(qmul(p.n, Q(1000))), Number(floorQ(qmul(p.n, Q(10)))), Number(floorQ(qmul(qsub(p.n, Q(floorQ(p.n))), Q(100))))];
      const a = digitIn(p.n, 0); const b = digitIn(p.n, -1); const c = digitIn(p.n, -2);
      return [`${cnt(a, 'tenths')} and ${cnt(b * 10 + c, 'hundredths')}`, `${cnt(a * 10 + b, 'hundredths')} and ${cnt(c, 'thousandths')}`, `${cnt(a * 10 + b, 'tenths')} and ${cnt(c, 'tenths')}`];
    },
    'COL-NO-CARRY': (q) => { const p = regroupParts(q); return [v(Object.entries(p.c).reduce((s, [e, n]) => qadd(s, qmul(Q(Number(e) === 0 ? n : n % 10), P(Number(e)))), Q(0)))]; },
    'PV-REGROUP-AS-DIGITS': (q) => {
      const p = regroupParts(q);
      return [v(Object.entries(p.c).reduce((s, [e, n]) => qadd(s, qmul(Q(n), P(Number(e) - (n >= 10 && Number(e) < 0 ? 1 : 0)))), Q(0)))];
    },
  },
  'm01.rounding': {
    'ROUND-TRUNCATE': (q) => { const p = roundParts(q); return [v(downQ(p.x, p.place))]; },
    'ROUND-WRONG-WAY': (q) => {
      const p = roundParts(q);
      // which rounds to R: an option below the halfway point that would round up to R
      if (p.kind === 'which') return q.options.filter((o) => qeq(upQ(num(o), p.place), p.R) && !qeq(roundQ(num(o), p.place), p.R));
      return [v(upQ(p.x, p.place))];
    },
    'ROUND-WRONG-PLACE': (q) => { const p = roundParts(q); return [v(roundQ(p.x, qmul(p.place, Q(10)))), v(roundQ(p.x, qdiv(p.place, Q(10))))]; },
    'ROUND-9-CARRY': (q) => { const p = roundParts(q); return [v(qadd(Q(floorQ(p.x)), Q(1, 10)))]; },
    'ROUND-BOUND-SAME-DIGIT': (q) => {
      const p = roundParts(q);
      // which rounds to R: an option that starts with R's digits but rounds up past it
      if (p.kind === 'which') return q.options.filter((o) => qeq(downQ(num(o), p.place), p.R) && !qeq(roundQ(num(o), p.place), p.R));
      return [v(p.small ? p.R : qsub(qadd(p.R, p.place), p.unit))];
    },
    'ROUND-BOUND-HALFWAY': (q) => {
      const p = roundParts(q); const half = qdiv(p.place, Q(2));
      if (p.kind === 'which') return [v(qadd(p.R, half))];
      return [v(p.small ? qsub(qsub(p.R, half), p.unit) : qadd(p.R, half))];
    },
    'BOUND-OTHER-END': (q) => { const p = roundParts(q); const b = bounds(p); return [v(p.small ? b.hi : b.lo)]; },
  },
  'm01.compare-order': {
    'DEC-LONGER-BIGGER': (q) => extremeRule(q, fracDigitsNum),
    'DEC-SHORTER-BIGGER': (q) => extremeRule(q, (t) => -fracLen(t)),
    'COUNT-ENDS': (q) => { const a = SOLVERS['m01.compare-order'](q).value; return [a + 1, a + 2]; },
    'MID-HALF-DIFF': (q) => { const m = q.prompt.match(new RegExp(`halfway between (${NUM}) and (${NUM})`)); return [v(qdiv(qsub(num(m[2]), num(m[1])), Q(2)))]; },
    'MID-WRONG-END': (q) => { const m = q.prompt.match(new RegExp(`halfway between (${NUM}) and (${NUM})`)); const a = num(m[1]); const b = num(m[2]); const h = qdiv(qsub(b, a), Q(2)); return [v(qadd(b, h)), v(qsub(a, h))]; },
    'PV-WRONG-PLACE': (q) => { const m = q.prompt.match(new RegExp(`halfway between (${NUM}) and (${NUM})`)); return [v(qadd(num(m[1]), Q(5, 1000)))]; },
  },
  'm01.number-line': {
    'SCALE-INTERVAL-WRONG': (q) => { const p = lineParts(q); return [qdiv(p.step, Q(10)), qdiv(p.minor, Q(10)), qmul(p.minor, Q(10))].map((s) => v(qadd(p.left, qmul(p.j, s)))); },
    'NL-COUNT-LINES': (q) => { const p = lineParts(q); return [v(qadd(p.at, p.minor))]; },
    'NL-FROM-WRONG-END': (q) => { const p = lineParts(q); return [v(qsub(qadd(p.left, p.step), qmul(p.j, p.minor)))]; },
  },
};
