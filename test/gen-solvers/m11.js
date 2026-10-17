// Independent answers and misconception rules for the m11 generators (ratio and proportion),
// worked out again from the question text and diagram data.

import { numbersIn } from './lib.js';

const G = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a; };
const simp = (xs) => { const g = xs.reduce(G); return xs.map((x) => x / g); };
const R = (xs) => xs.join(' : ');
const num = (t) => Number(String(t).replace(/ /g, ''));
const ratioIn = (text) => { const m = text.match(/(\d+(?: : \d+)+)/); return m[1].split(' : ').map(Number); };

function writeParts(q) {
  const m = q.prompt.match(/There are (\d+) (.+?) and (\d+) (.+?) (?:in|on) .*Write the ratio of (.+?) to (.+?)(?: in its simplest form)?\.$/);
  return { a: Number(m[1]), b: Number(m[3]), whole: /^all the /.test(m[6]) };
}
const PAIRS = { 'h|min': 60, 'm|cm': 100, 'kg|g': 1000, 'L|ml': 1000, 'km|m': 1000 };
/** Multipliers that put both quantities into the smaller unit of the pair. */
function factors(ux, uy, wrong = false) {
  const k = PAIRS[`${ux}|${uy}`] || PAIRS[`${uy}|${ux}`];
  const bigIsX = !!PAIRS[`${ux}|${uy}`];
  const kk = wrong ? (k === 60 ? 100 : k / 10) : k;
  return bigIsX ? [kk, 1] : [1, kk];
}
function simplifyParts(q) {
  let m = q.prompt.match(/^Write the ratio (\d+) (\w+) : (\d+) (\w+) in its simplest form\.$/);
  if (m) return { units: true, x: Number(m[1]), ux: m[2], y: Number(m[3]), uy: m[4] };
  m = q.prompt.match(/^Write (.+) in its simplest form\.$/);
  return { units: false, nums: m[1].split(' : ').map(Number) };
}
function equivParts(q) {
  const m = q.prompt.match(/(\d+) : (\d+) = (\d+|\?) : (\d+|\?)/);
  return { p1: Number(m[1]), q1: Number(m[2]), p2: m[3] === '?' ? null : Number(m[3]), q2: m[4] === '?' ? null : Number(m[4]) };
}
function shareParts(q) {
  const ratio = ratioIn(q.prompt.split('ratio ')[1]);
  const namesPart = q.prompt.split(' share ')[0];
  const names = namesPart.split(/, | and /);
  let m = q.prompt.match(/share (?:RM )?([\d ]+)(?: \w+)? in the ratio/);
  const total = m ? num(m[1]) : null;
  m = q.prompt.match(/does (.+?) get\?$/);
  const who = m ? names.indexOf(m[1]) : null;
  m = q.prompt.match(/\. (.+?) gets RM ([\d ]+)\. How much money is there altogether\?$/);
  return { ratio, names, total, who, knownWho: m ? names.indexOf(m[1]) : null, known: m ? num(m[2]) : null };
}
function diffParts(q) {
  const m = q.prompt.match(/^The ratio of (.+?)'s \w+ to (.+?)'s \w+ is (\d+) : (\d+)\. .+? has (\d+) more \w+ than .+?\. How many \w+ (do they have altogether|does (.+?) have)\?$/);
  return { p: m[1], q: m[2], a: Number(m[3]), b: Number(m[4]), diff: Number(m[5]), ask: m[6].startsWith('do they') ? 'total' : m[7] === m[1] ? 'small' : 'big' };
}
function fracParts(q) {
  const m = q.prompt.match(/the ratio of (.+?) to (.+?) is (\d+) : (\d+)\. What fraction of the .+? are (.+?)\?$/);
  return { a: Number(m[3]), b: Number(m[4]), askA: m[5] === m[1] };
}
function propParts(q) {
  let m = q.prompt.match(/^A recipe for (\d+) people uses ([\d ]+) (\w+) of .+?\. .+? makes it for (\d+) people from a (\d+) (kg|L) (?:bag|carton) of .+?\. How much .+ is left\?$/);
  if (m) return { kind: 'left', n: Number(m[1]), amount: num(m[2]), m: Number(m[4]), bag: Number(m[5]) * 1000 };
  m = q.prompt.match(/^A recipe for (\d+) people uses ([\d ]+) (\w+) of .+?\. How much .+ is needed for (\d+) people\?$/);
  if (m) return { kind: 'recipe', n: Number(m[1]), amount: num(m[2]), m: Number(m[4]) };
  m = q.prompt.match(/^(\d+) .+? cost RM ([\d.]+)\. .+? buys (\d+) .+? and pays with RM ([\d.]+)\./);
  if (m) return { kind: 'change', n: Number(m[1]), amount: Number(m[2]) * 100, m: Number(m[3]), pay: Number(m[4]) * 100 };
  m = q.prompt.match(/^(\d+) .+? cost RM ([\d.]+)\. How much do (\d+) .+? cost\?$/);
  return { kind: 'price', n: Number(m[1]), amount: Math.round(Number(m[2]) * 100), m: Number(m[3]) };
}
function rm2(sen) { const c = Math.round(sen); return c % 100 === 0 ? `RM ${c / 100}` : `RM ${Math.floor(c / 100)}.${String(c % 100).padStart(2, '0')}`; }
function baParts(q) {
  const m = q.prompt.match(/^The ratio of (.+?) to (.+?) (?:in|at|on) .+? is (\d+) : (\d+)\. Then (\d+) (more )?.+?, and the ratio becomes (\d+) : (\d+)\. How many (.+?) are there( at first| now)?\?$/);
  const p1 = Number(m[3]); const q1 = Number(m[4]); const p2 = Number(m[7]); const q2 = Number(m[8]);
  // the first quantity does not change: give it the same number of parts in both ratios
  const L = (p1 * p2) / G(p1, p2);
  const before = (q1 * L) / p1; const after = (q2 * L) / p2;
  const unit = Number(m[5]) / Math.abs(after - before);
  return { L, before, after, change: Number(m[5]), unit, grew: !!m[6], ask: !m[10] ? 'fixed' : m[10] === ' at first' ? 'before' : 'after' };
}
const baAsked = (p) => (p.ask === 'fixed' ? p.L : p.ask === 'before' ? p.before : p.after);
/** Best-buy packs from the table: [{ label, size, sen }]. */
function packs(q) {
  return q.diagram.rows.map(([letter, size, price]) => ({ size: num(size.replace(/ [a-zA-Z]+$/, '')), unit: size.split(' ').pop(), sen: Math.round(Number(price.replace('RM ', '')) * 100), label: `Pack ${letter}: ${size} for ${price}` }));
}

export const SOLVERS = {
  'm11.write-ratio': (q) => { const p = writeParts(q); return { text: R(simp(p.whole ? [p.a, p.a + p.b] : [p.a, p.b])) }; },
  'm11.simplify-ratio': (q) => {
    const p = simplifyParts(q);
    if (!p.units) return { text: R(simp(p.nums)) };
    const [fx, fy] = factors(p.ux, p.uy);
    return { text: R(simp([p.x * fx, p.y * fy])) };
  },
  'm11.equivalent-ratio': (q) => { const p = equivParts(q); return { value: p.q2 == null ? (p.q1 * p.p2) / p.p1 : (p.p1 * p.q2) / p.q1 }; },
  'm11.share-ratio': (q) => {
    const p = shareParts(q);
    const sum = p.ratio.reduce((a, b) => a + b, 0);
    if (p.known != null) return { value: (p.known / p.ratio[p.knownWho]) * sum };
    return { value: (p.total * p.ratio[p.who]) / sum };
  },
  'm11.ratio-difference': (q) => {
    const p = diffParts(q);
    const part = p.diff / (p.b - p.a);
    return { value: part * (p.ask === 'small' ? p.a : p.ask === 'big' ? p.b : p.a + p.b) };
  },
  'm11.ratio-fraction': (q) => { const p = fracParts(q); return { value: (p.askA ? p.a : p.b) / (p.a + p.b) }; },
  'm11.direct-proportion': (q) => {
    const p = propParts(q);
    const total = (p.amount * p.m) / p.n;
    if (p.kind === 'recipe') return { value: total };
    if (p.kind === 'left') return { value: p.bag - total };
    if (p.kind === 'change') return { value: (p.pay - total) / 100 };
    return { value: total / 100 };
  },
  'm11.best-buy': (q) => { const ps = packs(q); const best = ps.reduce((a, b) => (b.sen / b.size < a.sen / a.size ? b : a)); return { text: best.label }; },
  'm11.before-after': (q) => { const p = baParts(q); if ((p.after > p.before) !== p.grew) throw new Error('the change goes the wrong way for the ratios'); return { value: p.unit * baAsked(p) }; },
};

export const MIS = {
  'm11.write-ratio': {
    'RATIO-REVERSED': (q) => { const p = writeParts(q); return [R(simp(p.whole ? [p.a + p.b, p.a] : [p.b, p.a]))]; },
    'RATIO-PART-TO-WHOLE': (q) => { const p = writeParts(q); return p.whole ? [R(simp([p.a, p.b]))] : [R(simp([p.a, p.a + p.b])), R(simp([p.b, p.a + p.b]))]; },
    'RATIO-GIVES-ONE-SHARE': (q) => { const p = writeParts(q); return [R(simp([p.b, p.a + p.b]))]; },
    'RATIO-PART-SIMPLIFIED': (q) => { const p = writeParts(q); const xs = p.whole ? [p.a, p.a + p.b] : [p.a, p.b]; return [R(xs.map((x) => x / 2))]; },
  },
  'm11.simplify-ratio': {
    'RATIO-PART-SIMPLIFIED': (q) => { const p = simplifyParts(q); return [2, 3, 5].map((f) => R(p.nums.map((x) => x / f))); },
    'RATIO-REVERSED': (q) => [R([...SOLVERS['m11.simplify-ratio'](q).text.split(' : ')].reverse())],
    'FR-SIMPLIFY-ONE-PART': (q) => { const p = simplifyParts(q); const s = simp(p.nums); return p.nums.length === 2 ? [R([s[0], p.nums[1]])] : [R([s[0], s[1], p.nums[2]])]; },
    'UNIT-MIXED': (q) => { const p = simplifyParts(q); return [R(simp([p.x, p.y]))]; },
    'UNIT-FACTOR-WRONG': (q) => {
      const p = simplifyParts(q);
      const [fx, fy] = factors(p.ux, p.uy, true);
      return [R(simp([p.x * fx, p.y * fy]))];
    },
  },
  'm11.equivalent-ratio': {
    'RATIO-ADDITIVE': (q) => { const p = equivParts(q); return [p.q2 == null ? p.q1 + (p.p2 - p.p1) : p.p1 + (p.q2 - p.q1)]; },
    'FR-EQUIV-CROSS': (q) => { const p = equivParts(q); return [p.q2 == null ? p.q1 * p.p2 : p.p1 * p.q2]; },
    'RATIO-FACTOR-ONLY': (q) => { const p = equivParts(q); const [x, y] = p.q2 == null ? [p.p1, p.p2] : [p.q1, p.q2]; return [Math.max(x, y) / Math.min(x, y)]; },
    'FR-EQUIV-SIMPLIFIED-ONLY': (q) => { const p = equivParts(q); return [p.q1 / G(p.p1, p.q1)]; },
  },
  'm11.share-ratio': {
    'RATIO-SHARE-BY-PARTS-COUNT': (q) => { const p = shareParts(q); return [p.total / p.ratio.length]; },
    'RATIO-ONE-PART-ONLY': (q) => { const p = shareParts(q); const sum = p.ratio.reduce((a, b) => a + b, 0); return [p.known != null ? p.known / p.ratio[p.knownWho] : p.total / sum]; },
    'RATIO-PART-AS-WHOLE': (q) => { const p = shareParts(q); return [(p.total * p.ratio[p.who]) / p.ratio[1 - p.who]]; },
    'RATIO-GIVES-ONE-SHARE': (q) => {
      const p = shareParts(q); const sum = p.ratio.reduce((a, b) => a + b, 0);
      if (p.known != null) { const unit = p.known / p.ratio[p.knownWho]; return p.ratio.map((r) => r * unit); }
      return [p.total - (p.total * p.ratio[p.who]) / sum];
    },
    'RATIO-SHARE-AS-PART': (q) => { const p = shareParts(q); return [p.known * p.ratio.reduce((a, b) => a + b, 0)]; },
    'RATIO-WHOLE-AS-SHARE': (q) => { const p = shareParts(q); return [p.total]; },
  },
  'm11.ratio-difference': {
    'RATIO-ONE-PART-ONLY': (q) => { const p = diffParts(q); return [p.diff / (p.b - p.a)]; },
    'RATIO-DIFF-AS-PART': (q) => { const p = diffParts(q); return [p.diff * (p.ask === 'small' ? p.a : p.ask === 'big' ? p.b : p.a + p.b)]; },
    'RATIO-GIVES-ONE-SHARE': (q) => { const p = diffParts(q); const u = p.diff / (p.b - p.a); return [p.a * u, p.b * u]; },
  },
  'm11.ratio-fraction': {
    'RATIO-PART-AS-WHOLE': (q) => { const p = fracParts(q); return [p.askA ? p.a / p.b : p.b / p.a]; },
    'RATIO-GIVES-ONE-SHARE': (q) => { const p = fracParts(q); return [(p.askA ? p.b : p.a) / (p.a + p.b)]; },
    'RATIO-ONE-PART-ONLY': (q) => { const p = fracParts(q); return [1 / (p.a + p.b)]; },
  },
  'm11.direct-proportion': {
    'PROP-ADDITIVE': (q) => { const p = propParts(q); const v = p.amount + (p.m - p.n) * 100; return p.kind === 'change' ? [(p.pay - v) / 100] : [v / 100]; },
    'PROP-UNIT-ONLY': (q) => { const p = propParts(q); const u = p.amount / p.n; return p.kind === 'left' ? [p.bag - p.amount] : p.kind === 'recipe' ? [u] : p.kind === 'change' ? [(p.pay - u) / 100] : [u / 100]; },
    'PROP-TIMES-WHOLE': (q) => { const p = propParts(q); return p.kind === 'left' ? [p.bag - p.amount * p.m] : p.kind === 'recipe' ? [p.amount * p.m] : [(p.amount * p.m) / 100]; },
    'OP-SWAP': (q) => { const p = propParts(q); return [p.bag + (p.amount * p.m) / p.n]; },
    'PROP-INVERSE-SCALE': (q) => { const p = propParts(q); return [(p.amount * p.n) / p.m]; },
    'ONE-STEP-ONLY': (q) => { const p = propParts(q); return p.kind === 'left' ? [(p.amount * p.m) / p.n] : [(p.amount * p.m) / p.n / 100]; },
  },
  'm11.best-buy': {
    'BUY-CHEAPEST-PRICE': (q) => { const ps = packs(q); return [ps.reduce((a, b) => (b.sen < a.sen ? b : a)).label]; },
    'BUY-BIGGEST-PACK': (q) => { const ps = packs(q); return [ps.reduce((a, b) => (b.size > a.size ? b : a)).label]; },
  },
  'm11.before-after': {
    'RATIO-ONE-PART-ONLY': (q) => { const p = baParts(q); return [p.unit]; },
    'RATIO-CHANGE-AS-PART': (q) => { const p = baParts(q); return [p.change * baAsked(p)]; },
    'RATIO-GIVES-ONE-SHARE': (q) => { const p = baParts(q); return [p.before * p.unit, p.after * p.unit]; },
  },
};
export { numbersIn, rm2 };
