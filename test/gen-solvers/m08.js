// Independent answers for the m08 Probability generators, worked out again from the question text
// and the spinner sectors, and the misconception rules that reproduce each wrong option.
// Shares no code with js/generators.

import { Q, qadd, qsub, qmul, qnum, qtext, parseQ, numbersIn } from './lib.js';

const WORDS = ['impossible', 'unlikely', 'even chance', 'likely', 'certain'];
const word = (p) => (p === 0 ? 'impossible' : p === 1 ? 'certain' : Math.abs(p - 0.5) < 1e-12 ? 'even chance' : p < 0.5 ? 'unlikely' : 'likely');
const v = (a) => qnum(a);
const isPrime = (x) => x > 1 && Array.from({ length: x - 2 }, (_, i) => i + 2).every((d) => x % d);

/** A probability written as "3/8", "0.35" or "35%". */
function pval(t) {
  const s = String(t).trim();
  if (s.endsWith('%')) return qmul(parseQ(s.slice(0, -1)), Q(1, 100));
  return parseQ(s);
}

/** The outcomes 1..N that an event phrase describes. */
function eventSet(np, N) {
  const all = Array.from({ length: N }, (_, i) => i + 1);
  const t = np.trim();
  let m;
  if (/^an even number$/.test(t)) return all.filter((x) => x % 2 === 0);
  if (/^an odd number$/.test(t)) return all.filter((x) => x % 2 === 1);
  if (/^a prime number$/.test(t)) return all.filter(isPrime);
  if (/^a square number$/.test(t)) return all.filter((x) => Number.isInteger(Math.sqrt(x)));
  if (/^a whole number$/.test(t)) return all;
  if ((m = t.match(/^a number from (\d+) to (\d+)$/))) return all.filter((x) => x >= Number(m[1]) && x <= Number(m[2]));
  if ((m = t.match(/^a multiple of (\d+)$/))) return all.filter((x) => x % Number(m[1]) === 0);
  if ((m = t.match(/^a number greater than (\d+)$/))) return all.filter((x) => x > Number(m[1]));
  if ((m = t.match(/^a number less than (\d+)$/))) return all.filter((x) => x < Number(m[1]));
  if ((m = t.match(/^a factor of (\d+)$/))) return all.filter((x) => Number(m[1]) % x === 0);
  if ((m = t.match(/^an? (\d+)$/))) return all.filter((x) => x === Number(m[1]));
  throw new Error(`unknown event "${np}"`);
}

/** Favourable outcomes k of T equally likely ones, read from the question. */
function chance(q) {
  const p = q.prompt;
  let m;
  if (q.diagram && q.diagram.type === 'spinner') {
    const sec = q.diagram.sectors;
    const col = p.match(/lands? on (\w+)/)[1];
    return { k: sec.filter((s) => s === col).length, T: sec.length, colours: new Set(sec).size };
  }
  if ((m = p.match(/A bag has ((?:\d+ \w+, )*\d+ \w+(?: and \d+ \w+)?) (counters|marbles|beads|sweets|cubes)\./))) {
    const pairs = m[1].split(/, | and /).map((x) => { const [n, c] = x.split(' '); return { n: Number(n), c }; });
    const rest = p.slice(m.index + m[0].length);
    const asked = pairs.map((x) => [x, rest.search(new RegExp(`\\b${x.c}\\b`))]).filter(([, i]) => i >= 0).sort((a, b) => a[1] - b[1])[0][0];
    return { k: asked.n, T: pairs.reduce((s, x) => s + x.n, 0), colours: pairs.length };
  }
  if (/coin/.test(p)) return { k: 1, T: 2, colours: 0 };
  if (/dice numbered 1 to 6/.test(p)) {
    const np = [...p.matchAll(/(?:^|[^a-z])(?:rolling|roll) ([^.?]+)\?/g)].pop()[1];
    return { k: eventSet(np, 6).length, T: 6, colours: 0 };
  }
  if ((m = p.match(/Cards numbered 1 to (\d+)/))) {
    const N = Number(m[1]);
    const np = p.match(/number on it is (.+?)\?/)[1];
    return { k: eventSet(np, N).length, T: N, colours: 0 };
  }
  throw new Error('no situation found');
}

function missing(q) {
  const red = Number(q.prompt.match(/There are (\d+) /)[1]);
  const pr = pval(q.prompt.match(/one is ([\d./%]+)\. How/)[1]);
  const tot = qnum(qmul(Q(red), Q(pr[1], pr[0])));
  return { red, pr, tot, ans: tot - red };
}

function given(q) {
  const ps = [...q.prompt.matchAll(/probability (?:that .*? is|of picking \w+ is) ([\d./]+%?)(?=[. ])/g)].map((m) => pval(m[1].replace(/\.$/, '')));
  return ps;
}
function complementInfo(q) {
  const ps = given(q);
  if (ps.length === 2) {
    const [a, b] = ps;
    const g = qsub(qsub(Q(1), a), b);
    const nm = q.prompt.match(/A bag has (\d+) /);
    return { three: true, a, b, g, N: nm ? Number(nm[1]) : null, counts: /How many/.test(q.prompt) };
  }
  return { three: false, p: ps[0], ans: qsub(Q(1), ps[0]) };
}

function bags(q) {
  const m = q.prompt.match(/Bag A has (.+?)\. Bag B has (.+?)\. You want to pick a (\w+)/);
  const col = m[3];
  const parse = (t) => { const pairs = t.replace(/ (counters|marbles|beads|sweets|cubes)$/, '').split(/, | and /).map((x) => x.split(' ')); const x = pairs.filter(([, c]) => c === col).reduce((s, [n]) => s + Number(n), 0); const y = pairs.filter(([, c]) => c !== col).reduce((s, [n]) => s + Number(n), 0); return { x, y }; };
  return [parse(m[1]), parse(m[2])];
}
const BAGS = ['Bag A', 'Bag B', 'Both bags give the same chance'];

function meInfo(q) {
  const N = /dice/.test(q.prompt) ? 6 : Number(q.prompt.match(/numbered 1 to (\d+)/)[1]);
  const strip = (t) => t.trim().replace(/^(rolling|picking) /i, '');
  const sets = (opt) => opt.split(/ and (?=rolling|picking)/i).map((e) => eventSet(strip(e), N));
  const meets = (a, b) => a.some((x) => b.includes(x));
  const am = q.prompt.match(/Event A is '(.+?)'/);
  if (am) {
    const A = eventSet(strip(am[1]), N);
    return { overlap: (o) => meets(A, eventSet(strip(o), N)) };
  }
  return { overlap: (o) => { const [a, b] = sets(o); return meets(a, b); } };
}

function orInfo(q) {
  let m;
  if ((m = q.prompt.match(/numbered 1 to (\d+)/))) {
    const N = Number(m[1]);
    const e = q.prompt.match(/(?:lands on|you pick) ([^.?]+?) or ([^.?]+?)\? Give/);
    const k1 = eventSet(e[1], N).length; const k2 = eventSet(e[2], N).length;
    return { a: Q(k1, N), b: Q(k2, N), tb: Q(k1 + k2, 2 * N) };
  }
  const [a, b] = [...q.prompt.matchAll(/probability of picking \w+ is ([\d./]+?)(?= and|\. )/g)].map((x) => pval(x[1]));
  return { a, b, tb: Q(a[0] + b[0], a[1] + b[1]) };
}

function expInfo(q) {
  const p = q.prompt;
  const m = p.match(/(\d+) times, and .*? (\d+) times\. .* another (\d+) times/);
  if (m) { const [n1, k1, n2] = m.slice(1).map(Number); return { exp: true, n1, k1, n2, ans: (k1 * n2) / n1 }; }
  const n = Number(p.match(/(\d+) times/)[1]);
  const c = chance(q);
  const f = Q(c.k, c.T);
  return { exp: false, n, k: c.k, f, ans: v(qmul(f, Q(n))) };
}

function relInfo(q) {
  const p = q.prompt;
  if (/best estimate/.test(p)) {
    const [N, n, k] = numbersIn(p).map(Number);
    return { bag: true, N, n, k, ans: Math.round((k * N) / n) };
  }
  const [n, k] = numbersIn(p).map(Number);
  return { bag: false, n, k, f: Q(k, n) };
}

export const SOLVERS = {
  'm08.equally-likely': (q) => {
    if (/has only/.test(q.prompt)) return { value: missing(q).ans };
    const c = chance(q);
    const f = Q(c.k, c.T);
    return { value: v(f), text: qtext(f) };
  },
  'm08.fdp-forms': (q) => { const c = chance(q); return { value: c.k / c.T }; },
  'm08.complement': (q) => {
    const c = complementInfo(q);
    if (c.three) return { value: c.counts ? v(qmul(c.g, Q(c.N))) : v(c.g) };
    return { value: v(c.ans) };
  },
  'm08.prob-scale': (q) => {
    const c = chance(q);
    const p = c.k / c.T;
    if (q.diagram && q.diagram.type === 'numberLine') {
      const pt = q.diagram.points.find((x) => Math.abs(v(parseQ(x.at)) - p) < 1e-12);
      return { text: pt.label };
    }
    return { text: word(p) };
  },
  'm08.compare-bags': (q) => {
    const [A, B] = bags(q);
    const d = A.x * (B.x + B.y) - B.x * (A.x + A.y);
    return { text: d > 0 ? BAGS[0] : d < 0 ? BAGS[1] : BAGS[2] };
  },
  'm08.mutually-exclusive': (q) => {
    const me = meInfo(q);
    const free = q.options.filter((o) => !me.overlap(o));
    if (free.length !== 1) throw new Error(`${free.length} options are mutually exclusive`);
    return { text: free[0] };
  },
  'm08.or-probability': (q) => { const r = orInfo(q); const s = qadd(r.a, r.b); return { value: v(s) }; },
  'm08.expected-frequency': (q) => ({ value: expInfo(q).ans }),
  'm08.relative-frequency': (q) => { const r = relInfo(q); return { value: r.bag ? r.ans : v(r.f) }; },
};

const fracRules = {
  'PROB-PART-PART': (q) => { const c = chance(q); return [c.k / (c.T - c.k)]; },
  'PROB-COUNT-NOT-FRACTION': (q) => [chance(q).k],
  'PROB-SECTIONS-EQUAL': (q) => [1 / chance(q).colours],
  'PROB-ONE-OVER-TOTAL': (q) => [1 / chance(q).T],
  'PROB-COMPLEMENT-FORGOT': (q) => { const c = chance(q); return [(c.T - c.k) / c.T]; },
};

export const MIS = {
  'm08.equally-likely': {
    ...fracRules,
    'PROB-MISSING-TOTAL': (q) => [missing(q).tot],
    'PROB-FRACTION-AS-COUNT': (q) => { const r = missing(q); return [Number(r.pr[1] - r.pr[0])]; },
    'PROB-MISSING-ONE-PART': (q) => { const r = missing(q); return [r.red / Number(r.pr[0])]; },
  },
  'm08.fdp-forms': {
    'FDP-DIGITS': (q) => { const c = chance(q); return [Number(`0.${c.k}${c.T}`), c.k / 10, c.k / 100]; },
    'PROB-PART-PART': fracRules['PROB-PART-PART'],
    'PROB-COMPLEMENT-FORGOT': fracRules['PROB-COMPLEMENT-FORGOT'],
  },
  'm08.complement': {
    'PROB-COMPLEMENT-FORGOT': (q) => { const c = complementInfo(q); return c.three ? [v(qadd(c.a, c.b)), v(qmul(qadd(c.a, c.b), Q(c.N || 0)))] : [v(c.p)]; },
    'PROB-ADD-ONE': (q) => [1 + v(complementInfo(q).p)],
    'PROB-COMPLEMENT-DIGITS': (q) => { const h = Math.round(v(complementInfo(q).p) * 100); return [((10 - Math.floor(h / 10)) * 10 + (h % 10)) / 100]; },
    'FR-ADD-TOPS-BOTTOMS': (q) => { const p = complementInfo(q).p; return [Number(p[0] - 1n) / Number(p[1] - 1n)]; },
    'PROB-COMPLEMENT-ONE-ONLY': (q) => { const c = complementInfo(q); const x = v(qsub(Q(1), c.a)); const y = v(qsub(Q(1), c.b)); return [x, y, x * (c.N || 0), y * (c.N || 0)]; },
    'PROB-PROB-NOT-COUNT': (q) => [v(complementInfo(q).g)],
  },
  'm08.prob-scale': {
    'PROB-COMPLEMENT-FORGOT': (q) => {
      const c = chance(q); const p = 1 - c.k / c.T;
      if (q.diagram && q.diagram.type === 'numberLine') return q.diagram.points.filter((x) => Math.abs(v(parseQ(x.at)) - p) < 1e-12).map((x) => x.label);
      return [word(p)];
    },
    'PROB-SECTIONS-EQUAL': (q) => {
      const c = chance(q);
      if (q.diagram && q.diagram.type === 'numberLine') return q.diagram.points.filter((x) => Math.abs(v(parseQ(x.at)) - 1 / c.colours) < 1e-12).map((x) => x.label);
      return [word(1 / c.colours)];
    },
    'PROB-LIKELY-AS-CERTAIN': (q) => { const c = chance(q); const w = word(c.k / c.T); return [{ likely: 'certain', unlikely: 'impossible', impossible: 'unlikely', certain: 'likely' }[w]]; },
  },
  'm08.compare-bags': {
    'PROB-COMPARE-COUNTS': (q) => { const [A, B] = bags(q); return A.x === B.x ? [] : [A.x > B.x ? BAGS[0] : BAGS[1]]; },
    'PROB-COMPARE-OTHER': (q) => { const [A, B] = bags(q); return A.y === B.y ? [] : [A.y < B.y ? BAGS[0] : BAGS[1]]; },
    'PROB-COMPARE-DIFFERENCE': (q) => { const [A, B] = bags(q); return A.y - A.x === B.y - B.x ? [BAGS[2]] : []; },
  },
  'm08.mutually-exclusive': {
    'PROB-ME-OVERLAP': (q) => { const me = meInfo(q); return q.options.filter((o) => me.overlap(o)); },
  },
  'm08.or-probability': {
    'PROB-OR-MULTIPLY': (q) => { const r = orInfo(q); return [v(qmul(r.a, r.b))]; },
    'FR-ADD-TOPS-BOTTOMS': (q) => [v(orInfo(q).tb)],
    'PROB-OR-ONE-EVENT': (q) => { const r = orInfo(q); return [v(r.a), v(r.b)]; },
    'PROB-COMPLEMENT-FORGOT': (q) => { const r = orInfo(q); return [1 - v(qadd(r.a, r.b))]; },
  },
  'm08.expected-frequency': {
    'FR-OF-DIVIDE-ONLY': (q) => { const r = expInfo(q); return [r.n / Number(r.f[1])]; },
    'PROB-COUNT-NOT-FRACTION': (q) => [expInfo(q).k],
    'PROB-COMPLEMENT-FORGOT': (q) => { const r = expInfo(q); return [r.exp ? r.n2 - r.ans : r.n - r.ans]; },
    'PROB-EXP-DIVIDE-COUNT': (q) => { const r = expInfo(q); return [r.n / r.k]; },
    'PROB-EXP-OLD-COUNT': (q) => [expInfo(q).k1],
    'PROB-PART-PART': (q) => { const r = expInfo(q); return [(r.k1 * r.n2) / (r.n1 - r.k1)]; },
  },
  'm08.relative-frequency': {
    'PROB-PART-PART': (q) => { const r = relInfo(q); return r.bag ? [Math.round((r.k / (r.n - r.k)) * r.N)] : [r.k / (r.n - r.k)]; },
    'PROB-COMPLEMENT-FORGOT': (q) => { const r = relInfo(q); return r.bag ? [r.N - r.ans] : [(r.n - r.k) / r.n]; },
    'PROB-COUNT-NOT-FRACTION': (q) => [relInfo(q).k],
    'FDP-DIGITS': (q) => { const r = relInfo(q); return [Number(`0.${String(r.k).padStart(String(r.n).length - 1, '0')}`)]; },
  },
};
void WORDS;
