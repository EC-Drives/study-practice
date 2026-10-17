// Independent answers for the m02 (number system) generators, worked out again from the question
// text, and the misconception rules that must reproduce each wrong option from its code.

import { Q, qadd, qsub, qmul, qdiv, qnum, parseQ, numbersIn, valueIn } from './lib.js';

const v = (q) => qnum(q);
const num = (t) => parseQ(String(t).replace(/ /g, ''));
const N = (t) => Number(String(t).replace(/ /g, ''));
const g = (a, b) => (b ? g(b, a % b) : Math.abs(a));
const l = (a, b) => (a / g(a, b)) * b;
const isPrime = (n) => { if (n < 2) return false; for (let k = 2; k * k <= n; k++) if (n % k === 0) return false; return true; };
const divisors = (n) => { const out = []; for (let k = 1; k <= n; k++) if (n % k === 0) out.push(k); return out; };
const listAfterColon = (t) => t.slice(t.indexOf(':') + 1).replace(/\?.*$/, '').split(/, | or /).map((x) => x.trim()).filter(Boolean);

// ---------------------------------------------------------------- temperatures

function temp(q) {
  const t = q.prompt; let m;
  if ((m = t.match(/was (-?\d+) °C\. By noon it had (risen|fallen) by (\d+) degrees\. By midnight it had (risen|fallen) by (\d+) degrees/))) {
    const A = N(m[1]); const s1 = m[2] === 'risen' ? 1 : -1; const s2 = m[4] === 'risen' ? 1 : -1;
    return { kind: 'two', A, c1: s1 * N(m[3]), c2: s2 * N(m[5]), r: A + s1 * N(m[3]) + s2 * N(m[5]) };
  }
  if ((m = t.match(/was (-?\d+) °C\. .* it was (-?\d+) °C\. By how many degrees did the temperature rise/))) return { kind: 'diff', A: N(m[1]), B: N(m[2]), r: N(m[2]) - N(m[1]) };
  if ((m = t.match(/(-?\d+) °C\. .*(rises|falls) by (\d+) °C every hour\. What is (?:its|the) temperature (?:after )?(\d+) hours/))) {
    const A = N(m[1]); const s = m[2] === 'rises' ? 1 : -1;
    return { kind: 'rate', A, step: s * N(m[3]), h: N(m[4]), r: A + s * N(m[3]) * N(m[4]) };
  }
  if ((m = t.match(/is (-?\d+) °C\. .* has (risen|fallen) by (\d+) degrees/))) {
    const A = N(m[1]); const s = m[2] === 'risen' ? 1 : -1;
    return { kind: 'one', A, c: s * N(m[3]), r: A + s * N(m[3]) };
  }
  const temps = [...t.matchAll(/[A-Z][a-z]+(?: [A-Z][a-z]+)? (-?\d+) °C/g)].map((x) => N(x[1]));
  const hi = Math.max(...temps); const lo = Math.min(...temps);
  return { kind: 'cities', temps, hi, lo, r: hi - lo };
}

// ---------------------------------------------------------------- sequences across zero

function seqParts(q) {
  const body = q.prompt.replace(/^.*?(?:sequence\? |sequence: )/, '');
  const toks = body.split(', ').map((x) => x.trim()).filter((x) => x !== '...' && x !== '');
  const vals = toks.map((x) => (x === '?' ? null : num(x)));
  const hid = vals.indexOf(null);
  let step = null;
  for (let i = 0; i + 1 < vals.length; i++) if (vals[i] && vals[i + 1]) { step = qsub(vals[i + 1], vals[i]); break; }
  if (hid < 0) { const last = vals[vals.length - 1]; return { step, ans: qadd(last, step), prev: last }; }
  const ans = hid > 0 ? qadd(vals[hid - 1], step) : qsub(vals[hid + 1], step);
  const prev = hid > 0 ? vals[hid - 1] : qsub(ans, step);
  return { step, ans, prev };
}

// ---------------------------------------------------------------- midpoint

const ends = (q) => numbersIn(q.prompt).slice(0, 2).map(Number);

function riddleParts(q) {
  const m = q.prompt.match(/between (\d+) and (\d+)\. I am (a multiple of (\d+)|a prime number|a square number), and I am (.*)\. What number/);
  const c = m[5]; let k;
  let clue;
  if ((k = c.match(/a factor of (\d+)/))) clue = (x) => N(k[1]) % x === 0;
  else if ((k = c.match(/1 more than a multiple of (\d+)/))) clue = (x) => x % N(k[1]) === 1;
  else { k = c.match(/digits add up to (\d+)/); clue = (x) => String(x).split('').reduce((a, d) => a + Number(d), 0) === N(k[1]); }
  const first = m[4] ? (x) => x % N(m[4]) === 0 : /prime/.test(m[3]) ? isPrime : (x) => Number.isInteger(Math.sqrt(x));
  return { lo: N(m[1]), hi: N(m[2]), first, clue };
}

// ---------------------------------------------------------------- HCF / LCM

function hl(q) {
  const t = q.prompt; let m;
  if ((m = t.match(/highest common factor of (\d+) and (\d+)/))) return { ask: 'hcf', a: N(m[1]), b: N(m[2]) };
  if ((m = t.match(/lowest common multiple of (\d+) and (\d+)/))) return { ask: 'lcm', a: N(m[1]), b: N(m[2]) };
  if ((m = t.match(/every (\d+) (?:minutes|seconds).*?every (\d+) (?:minutes|seconds)/)) || (m = t.match(/packs of (\d+) .* packs of (\d+)/))) return { ask: 'lcm', a: N(m[1]), b: N(m[2]) };
  m = t.match(/has (\d+) (.+?) and (\d+) (.+?)\. /);
  const a = N(m[1]); const b = N(m[3]);
  const e = t.match(/How many (.+) are in each one\?/);
  if (e) return { ask: 'each', a, b, n: e[1] === m[2] ? a : b, other: e[1] === m[2] ? b : a };
  return { ask: 'hcf', a, b };
}
const lowerFactor = (h) => Math.max(...divisors(h).filter((x) => x < h));

// ---------------------------------------------------------------- divisibility

const dsum = (n) => String(n).split('').reduce((s, c) => s + Number(c), 0);
function missing(q) {
  const m = q.prompt.match(/number ([\d?]+) is divisible by (\d+)/);
  const ok = []; const all = [];
  for (let x = 0; x <= 9; x++) { const s = m[1].replace('?', x); all.push({ x, n: Number(s) }); if (Number(s) % Number(m[2]) === 0 && !(s[0] === '0')) ok.push(x); }
  return { pattern: m[1], n: Number(m[2]), ok, all };
}

// ---------------------------------------------------------------- squares and cubes

function block(q) {
  const n = N(q.prompt.match(/is (\d+) cubes long/)[1]);
  const tk = q.prompt.match(/block of small cubes that is (\d+) cubes? long/);
  return { n, t: tk ? N(tk[1]) : 0 };
}
function countSq(q) {
  const m = q.prompt.match(/between (\d+) and (\d+)/);
  const lo = N(m[1]); const hi = N(m[2]);
  let c = 0; for (let k = 1; k * k < hi; k++) if (k * k > lo) c++;
  const isSq = (x) => Number.isInteger(Math.sqrt(x));
  return { c, extra: (isSq(lo) ? 1 : 0) + (isSq(hi) ? 1 : 0) };
}

// ---------------------------------------------------------------- solvers

export const SOLVERS = {
  'm02.temperature': (q) => ({ value: temp(q).r }),
  'm02.count-past-zero': (q) => ({ value: v(seqParts(q).ans) }),
  'm02.compare-negatives': (q) => {
    if (q.type === 'truefalse') { const m = q.prompt.match(/(-?\d+(?:\.\d+)?) ([<>]) (-?\d+(?:\.\d+)?)/); return { bool: m[2] === '>' ? N(m[1]) > N(m[3]) : N(m[1]) < N(m[3]) }; }
    if (q.type === 'order') { const desc = /LARGEST/.test(q.prompt); return { order: [...q.options].sort((a, b) => (desc ? -1 : 1) * (valueIn(a) - valueIn(b))) }; }
    const vals = q.options.map(valueIn);
    const want = /coldest|smallest/.test(q.prompt) ? Math.min(...vals) : Math.max(...vals);
    return { text: q.options[vals.indexOf(want)] };
  },
  'm02.midpoint': (q) => { const [a, b] = ends(q); return { value: (a + b) / 2 }; },
  'm02.factors-primes': (q) => {
    const t = q.prompt; let m;
    if ((m = t.match(/is a multiple of (\d+)\?/))) return { text: q.options.find((o) => N(o) % N(m[1]) === 0) };
    if (/Which of these is a prime number\?/.test(t)) return { text: q.options.find((o) => isPrime(N(o))) };
    if (/Select ALL the prime/.test(t)) return { set: q.options.filter((o) => isPrime(N(o))) };
    if ((m = t.match(/Select ALL the factors of (\d+)/))) return { set: q.options.filter((o) => N(m[1]) % N(o) === 0) };
    if ((m = t.match(/common factor of (\d+) and (\d+)/))) return { text: q.options.find((o) => N(m[1]) % N(o) === 0 && N(m[2]) % N(o) === 0) };
    if ((m = t.match(/a factor of (\d+)\?$/))) return { text: q.options.find((o) => N(m[1]) % N(o) === 0) };
    const r = riddleParts(q);
    const out = []; for (let x = r.lo + 1; x < r.hi; x++) if (r.first(x) && r.clue(x)) out.push(x);
    return { value: out.length === 1 ? out[0] : NaN };
  },
  'm02.hcf-lcm': (q) => {
    const p = hl(q);
    if (p.ask === 'hcf') return { value: g(p.a, p.b) };
    if (p.ask === 'lcm') return { value: l(p.a, p.b) };
    return { value: p.n / g(p.a, p.b) };
  },
  'm02.divisibility': (q) => {
    let m;
    if ((m = q.prompt.match(/True or false: ([\d ]+) is divisible by (\d+)/))) return { bool: N(m[1]) % N(m[2]) === 0 };
    if ((m = q.prompt.match(/Which of these numbers is divisible by (\d+)\?/))) return { text: q.options.find((o) => N(o) % N(m[1]) === 0) };
    const mm = missing(q);
    if (/LARGEST/.test(q.prompt)) return { value: Math.max(...mm.ok) };
    if (/SMALLEST/.test(q.prompt)) return { value: Math.min(...mm.ok) };
    return { value: mm.ok.length === 1 ? mm.ok[0] : NaN };
  },
  'm02.squares-cubes': (q) => {
    const t = q.prompt; let m;
    if ((m = t.match(/^What is (\d+)\^(\d+)\?/))) return { value: N(m[1]) ** N(m[2]) };
    if (/is a square number\?/.test(t)) return { text: q.options.find((o) => Number.isInteger(Math.sqrt(N(o)))) };
    if (/is a cube number\?/.test(t)) return { text: q.options.find((o) => Number.isInteger(Math.round(Math.cbrt(N(o)))) && Math.round(Math.cbrt(N(o))) ** 3 === N(o)) };
    if ((m = t.match(/area of (\d+) (?:m|cm)\^2/))) return { value: Math.sqrt(N(m[1])) };
    if ((m = t.match(/^Work out (\d+)\^2 ([+-]) (\d+)\^3/))) return { value: m[2] === '+' ? N(m[1]) ** 2 + N(m[3]) ** 3 : N(m[1]) ** 2 - N(m[3]) ** 3 };
    if (q.type === 'order') { const val = (o) => { const [b, e] = o.split('^').map(Number); return b ** e; }; return { order: [...q.options].sort((a, b) => val(a) - val(b)) }; }
    if (/How many square numbers/.test(t)) return { value: countSq(q).c };
    const b = block(q);
    return { value: b.n ** 3 - b.t ** 3 };
  },
};

// ---------------------------------------------------------------- misconception rules

export const MIS = {
  'm02.temperature': {
    'OP-SWAP': (q) => {
      const p = temp(q);
      if (p.kind === 'one') return [p.A - p.c];
      if (p.kind === 'two') return [p.A + p.c1 - p.c2, p.A - p.c1 - p.c2];
      return [p.A - p.step * p.h];
    },
    'NEG-SIGN-DROP': (q) => { const p = temp(q); return p.kind === 'one' ? [-p.r, Math.abs(p.A) + Math.abs(p.c)] : [-p.r]; },
    'NEG-SKIP-ZERO': (q) => { const p = temp(q); return p.kind === 'one' ? [p.r + Math.sign(p.c)] : [p.r - 1]; },
    'NEG-DIFF-ADD-SIGNS': (q) => { const p = temp(q); return p.kind === 'diff' ? [Math.abs(p.B + p.A)] : [Math.abs(p.hi + p.lo)]; },
    'NEG-DIFF-ADD-BOTH': (q) => { const p = temp(q); return [-p.A - p.B]; },
    'ONE-STEP-ONLY': (q) => { const p = temp(q); if (p.kind === 'diff') return [p.B]; if (p.kind === 'two') return [p.A + p.c1]; return [p.A + p.step]; },
    'NEG-ORDER': (q) => { const p = temp(q); const neg = p.temps.filter((x) => x < 0); const c = neg.reduce((x, y) => (Math.abs(y) < Math.abs(x) ? y : x)); return [p.hi - c]; },
  },
  'm02.count-past-zero': {
    'NEG-SIGN-DROP': (q) => [-v(seqParts(q).ans)],
    'NEG-SKIP-ZERO': (q) => { const p = seqParts(q); const unit = qnum(p.step) % 1 ? 0.5 : 1; return [v(p.ans) + Math.sign(qnum(p.step)) * unit]; },
    'OP-SWAP': (q) => { const p = seqParts(q); return [v(qsub(p.prev, p.step))]; },
  },
  'm02.compare-negatives': {
    'NEG-ORDER': (q) => {
      const vals = q.options.map(valueIn);
      const neg = vals.filter((x) => x < 0);
      const small = /coldest|smallest/.test(q.prompt);
      const pick = small ? neg.reduce((x, y) => (Math.abs(y) < Math.abs(x) ? y : x)) : neg.reduce((x, y) => (Math.abs(y) > Math.abs(x) ? y : x));
      return [pick];
    },
    'NEG-SIGN-DROP': (q) => { const vals = q.options.map(valueIn); return [vals.reduce((x, y) => (Math.abs(y) < Math.abs(x) ? y : x))]; },
  },
  'm02.midpoint': {
    'MID-HALF-DIFF': (q) => { const [a, b] = ends(q); return [(b - a) / 2]; },
    'MID-WRONG-END': (q) => { const [a, b] = ends(q); const h = (b - a) / 2; return [b + h, a - h]; },
    'NEG-SIGN-DROP': (q) => { const [a, b] = ends(q); return [-(a + b) / 2]; },
  },
  'm02.factors-primes': {
    'MULT-LAST-DIGIT': (q) => { const n = N(q.prompt.match(/is a multiple of (\d+)\?/)[1]); return q.options.filter((o) => N(o) % 10 === n && N(o) % n); },
    'FACTOR-MULTIPLE-SWAP': (q) => {
      const t = q.prompt; let m;
      if ((m = t.match(/is a multiple of (\d+)\?/))) return q.options.filter((o) => N(m[1]) % N(o) === 0);
      if ((m = t.match(/common factor of (\d+) and (\d+)/))) return q.options.filter((o) => N(o) % N(m[1]) === 0 && N(o) % N(m[2]) === 0);
      m = t.match(/factors? of (\d+)/);
      return q.options.filter((o) => N(o) % N(m[1]) === 0 && N(o) > N(m[1]));
    },
    'PRIME-ODD': (q) => q.options.filter((o) => N(o) % 2 === 1 && N(o) > 1 && !isPrime(N(o))),
    'PRIME-ONE': () => [1],
    'ONE-CONDITION-ONLY': (q) => {
      let m = q.prompt.match(/common factor of (\d+) and (\d+)/);
      if (m) return q.options.filter((o) => (N(m[1]) % N(o) === 0) !== (N(m[2]) % N(o) === 0));
      const r = riddleParts(q);
      const out = []; for (let x = r.lo + 1; x < r.hi; x++) if (r.first(x) !== r.clue(x)) out.push(x);
      return out;
    },
  },
  'm02.hcf-lcm': {
    'HCF-LCM-SWAP': (q) => { const p = hl(q); return [p.ask === 'hcf' ? l(p.a, p.b) : g(p.a, p.b)]; },
    'HCF-NOT-HIGHEST': (q) => { const p = hl(q); const h = g(p.a, p.b); return p.ask === 'each' ? [p.n / lowerFactor(h)] : divisors(h).filter((x) => x < h); },
    'LCM-PRODUCT': (q) => { const p = hl(q); return [p.a * p.b]; },
    'LCM-NOT-LOWEST': (q) => { const p = hl(q); return [2 * l(p.a, p.b)]; },
    'WRONG-QUANTITY': (q) => { const p = hl(q); const h = g(p.a, p.b); return p.ask === 'each' ? [p.other / h] : [(p.a + p.b) / h]; },
    'ONE-STEP-ONLY': (q) => { const p = hl(q); return [g(p.a, p.b)]; },
  },
  'm02.divisibility': {
    'DIV-LAST-DIGIT': (q) => {
      const n = N(q.prompt.match(/divisible by (\d+)/)[1]); const ld = n === 3 ? [3, 6, 9] : [9];
      if (!q.options) { const p = missing(q); return p.all.filter((x) => ld.includes(x.n % 10) && x.n % n).map((x) => x.x); }
      return q.options.filter((o) => ld.includes(N(o) % 10) && N(o) % n);
    },
    'DIV9-AS-DIV3': (q) => {
      if (q.options && /divisible by 9\?/.test(q.prompt)) return q.options.filter((o) => N(o) % 3 === 0 && N(o) % 9);
      const p = missing(q); return p.all.filter((x) => x.n % 3 === 0 && x.n % 9).map((x) => x.x);
    },
    'DIV6-EVEN-ONLY': (q) => {
      if (q.options && /divisible by 6\?/.test(q.prompt)) return q.options.filter((o) => N(o) % 2 === 0 && N(o) % 3);
      const p = missing(q); return p.all.filter((x) => x.n % 2 === 0 && x.n % 3).map((x) => x.x);
    },
    'WRONG-QUANTITY': (q) => { const p = missing(q); return [/LARGEST/.test(q.prompt) ? Math.min(...p.ok) : Math.max(...p.ok)]; },
    'DIV6-THREE-ONLY': (q) => {
      if (q.options && /divisible by 6\?/.test(q.prompt)) return q.options.filter((o) => N(o) % 2 && N(o) % 3 === 0);
      const p = missing(q); return p.all.filter((x) => x.n % 3 === 0 && x.n % 2).map((x) => x.x);
    },
    'DIV4-LAST-DIGIT': (q) => q.options.filter((o) => N(o) % 2 === 0 && N(o) % 4),
  },
  'm02.squares-cubes': {
    'POW-MULT': (q) => {
      const t = q.prompt; let m;
      if ((m = t.match(/^What is (\d+)\^(\d+)\?/))) return [N(m[1]) * N(m[2])];
      if (/is a cube number\?/.test(t)) return q.options.filter((o) => N(o) % 3 === 0);
      if (/is a square number\?/.test(t)) return q.options.filter((o) => N(o) % 2 === 0 && !Number.isInteger(Math.sqrt(N(o))));
      if ((m = t.match(/^Work out (\d+)\^2 ([+-]) (\d+)\^3/))) return [m[2] === '+' ? N(m[1]) * 2 + N(m[3]) * 3 : N(m[1]) * 2 - N(m[3]) * 3];
      const b = block(q); return [b.n * 3 - b.t * 3, b.n ** 3 - b.t];
    },
    'POW-SWAP': (q) => {
      let m;
      if ((m = q.prompt.match(/^What is (\d+)\^(\d+)\?/))) return [N(m[2]) ** N(m[1])];
      m = q.prompt.match(/^Work out (\d+)\^2 ([+-]) (\d+)\^3/); return [m[2] === '+' ? 2 ** N(m[1]) + 3 ** N(m[3]) : 2 ** N(m[1]) - 3 ** N(m[3])];
    },
    'SQ-CUBE-MIX': (q) => {
      const t = q.prompt; let m;
      if ((m = t.match(/^What is (\d+)\^(\d+)\?/))) return [N(m[2]) === 3 ? N(m[1]) ** 2 : N(m[1]) ** 3];
      if (/is a cube number\?/.test(t)) return q.options.filter((o) => Number.isInteger(Math.sqrt(N(o))));
      if (/is a square number\?/.test(t)) return q.options.filter((o) => Math.round(Math.cbrt(N(o))) ** 3 === N(o));
      if ((m = t.match(/^Work out (\d+)\^2 ([+-]) (\d+)\^3/))) return [m[2] === '+' ? N(m[1]) ** 2 + N(m[3]) ** 2 : N(m[1]) ** 2 - N(m[3]) ** 2];
      const b = block(q); return [b.n * b.n];
    },
    'SQ-SIDE-HALF': (q) => [N(q.prompt.match(/area of (\d+)/)[1]) / 2],
    'SQ-SIDE-QUARTER': (q) => [N(q.prompt.match(/area of (\d+)/)[1]) / 4],
    'COUNT-ENDS': (q) => { const c = countSq(q); return [c.c + c.extra]; },
    'SA-FACES-NOT-CUBES': (q) => { const b = block(q); return [6 * b.n * b.n]; },
    'ONE-STEP-ONLY': (q) => { const b = block(q); return [b.n ** 3]; },
  },
};

void qmul; void qdiv; void listAfterColon;
