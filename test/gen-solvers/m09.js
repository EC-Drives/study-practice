// Independent answers and misconception rules for the m09 generators (fractions, decimals and
// percentages), worked out again from the question text and diagram data.

import { Q, qadd, qsub, qmul, qdiv, qnum, qtext, parseQ, numbersIn, valueIn } from './lib.js';

const v = qnum;
const bg = (a, b) => { a = a < 0n ? -a : a; b = b < 0n ? -b : b; while (b) [a, b] = [b, a % b]; return a; };
/** A decimal from a number with up to 6 places, no float noise. */
const d6 = (x) => String(Math.round(x * 1e6) / 1e6);

function divisionParts(q) {
  let m = q.prompt.match(/Write (\d+) ÷ (\d+) as/);
  if (m) return [Number(m[1]), Number(m[2])];
  const n = numbersIn(q.prompt).map(Number);
  return [n[0], n[1]];
}
function mixedImproperParts(q) {
  let m = q.prompt.match(/Write (\d+)\/(\d+) as a mixed number/);
  if (m) { const n = Number(m[1]); const d = Number(m[2]); return { toMixed: true, n, d, w: Math.floor(n / d), r: n % d }; }
  m = q.prompt.match(/Write (\d+) (\d+)\/(\d+) as an improper fraction/);
  const w = Number(m[1]); const r = Number(m[2]); const d = Number(m[3]);
  return { toMixed: false, w, r, d, n: w * d + r };
}
function equivParts(q) {
  let m = q.prompt.match(/(\d+)\/(\d+) = \?\/(\d+)/);
  if (m) return { top: true, p1: Number(m[1]), q1: Number(m[2]), q2: Number(m[3]) };
  m = q.prompt.match(/(\d+)\/(\d+) = (\d+)\/\?/);
  return { top: false, p1: Number(m[1]), q1: Number(m[2]), p2: Number(m[3]) };
}
function convertParts(q) {
  const m = q.prompt.match(/^Write (.+) as (a fraction in its simplest form|a decimal|a percentage)\.$/);
  const from = m[1];
  const target = m[2].startsWith('a fraction') ? 'F' : m[2] === 'a decimal' ? 'D' : 'P';
  const fromKind = from.endsWith('%') ? 'P' : from.includes('/') ? 'F' : 'D';
  return { from, fromKind, target, v: valueIn(from) };
}
function pctParts(q) {
  let m = q.prompt.match(/^Find (\d+)% of (?:RM )?([\d ]+)\.$/);
  if (m) return { kind: 'of', p: Number(m[1]), amount: Number(m[2].replace(/ /g, '')) };
  m = q.prompt.match(/^There are ([\d ]+) .*?\. (\d+)% are /);
  if (m) return { kind: 'other', p: Number(m[2]), amount: Number(m[1].replace(/ /g, '')) };
  m = q.prompt.match(/costs RM ([\d ]+)\. In a sale there is (\d+)% off/);
  return { kind: 'sale', p: Number(m[2]), amount: Number(m[1].replace(/ /g, '')) };
}

export const SOLVERS = {
  'm09.fraction-as-division': (q) => {
    const [a, b] = divisionParts(q);
    const f = Q(a, b);
    return { value: v(f), text: qtext(f) };
  },
  'm09.mixed-improper': (q) => {
    const p = mixedImproperParts(q);
    return p.toMixed ? { value: p.n / p.d, text: qtext(Q(p.n, p.d)) } : { value: p.n / p.d, text: `${p.n}/${p.d}` };
  },
  'm09.equivalent-missing': (q) => {
    const p = equivParts(q);
    // cross-multiply: p1/q1 = x/q2 means x = p1 x q2 / q1
    return { value: p.top ? (p.p1 * p.q2) / p.q1 : (p.q1 * p.p2) / p.p1 };
  },
  'm09.simplest-form': (q) => {
    const m = q.prompt.match(/Write (\d+)\/(\d+) in its simplest form/);
    const f = Q(m[1], m[2]);
    return { value: v(f), text: qtext(f) };
  },
  'm09.fdp-convert': (q) => {
    const p = convertParts(q);
    const f = parseQ(p.fromKind === 'P' ? `${p.from.slice(0, -1)}` : p.from);
    const exact = p.fromKind === 'P' ? qdiv(f, Q(100)) : f;
    if (p.target === 'F') return { value: v(exact), text: qtext(exact) };
    if (p.target === 'D') return { value: v(exact) };
    return { value: v(exact), text: `${d6(v(exact) * 100)}%` };
  },
  'm09.percent-of-amount': (q) => {
    const p = pctParts(q);
    const part = (p.amount * p.p) / 100;
    return { value: p.kind === 'of' ? part : p.amount - part };
  },
  'm09.percent-of-shape': (q) => {
    const g = q.diagram;
    const n = g.rows * g.cols;
    const k = Array.isArray(g.shaded) ? g.shaded.length : g.shaded;
    const shadedPart = k / n;
    return { value: /NOT shaded/.test(q.prompt) ? 1 - shadedPart : shadedPart };
  },
  'm09.compare-fdp': (q) => {
    const best = q.options.reduce((a, b) => (valueIn(b) > valueIn(a) ? b : a));
    return { text: best };
  },
  'm09.order-fdp': (q) => ({ order: [...q.options].sort((a, b) => valueIn(a) - valueIn(b)) }),
};

const dp = (t) => (String(t).split('.')[1] || '').length;

export const MIS = {
  'm09.fraction-as-division': {
    'FDP-DIV-REVERSED': (q) => { const [a, b] = divisionParts(q); return [b / a]; },
    'REMAINDER-AS-DECIMAL': (q) => { const [a, b] = divisionParts(q); return [`${Math.floor(a / b)}.${a % b}`]; },
    'FDP-DIGITS': (q) => { const [a, b] = divisionParts(q); return [`${a}.${b}`]; },
    'FR-MIXED-QR-SWAP': (q) => { const [a, b] = divisionParts(q); return [(a % b) + Math.floor(a / b) / b]; },
    'FR-DIV-WHOLE-ONLY': (q) => { const [, b] = divisionParts(q); return [1 / b]; },
  },
  'm09.mixed-improper': {
    'FR-MIXED-QR-SWAP': (q) => { const p = mixedImproperParts(q); return [p.r + p.w / p.d]; },
    'FR-MIXED-WRONG-DEN': (q) => { const p = mixedImproperParts(q); return p.toMixed ? [p.w + p.r / p.n] : [p.n / p.r]; },
    'FR-MIXED-ADD-WHOLE': (q) => { const p = mixedImproperParts(q); return [(p.w + p.r) / p.d]; },
    'FR-MIXED-WRONG-PARTS': (q) => { const p = mixedImproperParts(q); return [(p.w * p.r + p.d) / p.d]; },
    'FR-MIXED-NO-NUMERATOR': (q) => { const p = mixedImproperParts(q); return [p.w]; },
  },
  'm09.equivalent-missing': {
    'FR-EQUIV-ADDITIVE': (q) => { const p = equivParts(q); return [p.top ? p.p1 + (p.q2 - p.q1) : p.q1 + (p.p2 - p.p1)]; },
    'FR-EQUIV-FACTOR-ONLY': (q) => { const p = equivParts(q); const [x, y] = p.top ? [p.q1, p.q2] : [p.p1, p.p2]; return [Math.max(x, y) / Math.min(x, y)]; },
    'FR-EQUIV-CROSS': (q) => { const p = equivParts(q); const g = Number(bg(BigInt(p.p1), BigInt(p.q1))); return p.top ? [p.p1 * p.q2, (p.p1 / g) * p.q2] : [p.q1 * p.p2]; },
    'FR-EQUIV-SIMPLIFIED-ONLY': (q) => { const p = equivParts(q); const g = Number(bg(BigInt(p.p1), BigInt(p.q1))); return [p.top ? p.p1 / g : p.q1 / g]; },
  },
  'm09.simplest-form': {
    'FR-SIMPLIFY-ONE-PART': (q) => { const m = q.prompt.match(/(\d+)\/(\d+)/); const n = Number(m[1]); const d = Number(m[2]); const h = Number(bg(BigInt(n), BigInt(d))); return [(n / h) / d, n / (d / h)]; },
    'FR-SIMPLIFY-SUBTRACT': (q) => { const m = q.prompt.match(/(\d+)\/(\d+)/); const n = Number(m[1]); const d = Number(m[2]); const h = Number(bg(BigInt(n), BigInt(d))); return [(n - h) / (d - h)]; },
    'FR-NOT-SIMPLIFIED': (q) => { const m = q.prompt.match(/(\d+)\/(\d+)/); return [Number(m[1]) / Number(m[2])]; },
  },
  'm09.fdp-convert': {
    'FDP-DIGITS': (q) => {
      const p = convertParts(q);
      const f = p.fromKind === 'F' ? p.from.split('/') : null;
      if (p.fromKind === 'F' && p.target === 'D') return [`0.${f[0]}${f[1]}`];
      if (p.fromKind === 'F' && p.target === 'P') return [`${f[0]}${f[1]}%`, `${f[0]}%`];
      const digs = p.fromKind === 'D' ? p.from.replace(/^0\./, '') : p.from.slice(0, -1);
      const out = [1 / Number(digs)];
      if (p.fromKind === 'D' && digs.length === 2) out.push(Number(digs[0]) / Number(digs[1]));
      return out;
    },
    'FDP-DEN-AS-DECIMAL': (q) => { const p = convertParts(q); return [`0.${p.from.split('/')[1]}`]; },
    'FDP-DEC-AS-PERCENT': (q) => { const p = convertParts(q); return [p.v / 100]; },
    'FDP-PCT-NO-DIVIDE': (q) => { const p = convertParts(q); return [p.v * 100]; },
    'PV-SHIFT-WRONG': (q) => { const p = convertParts(q); return [p.v * 10, p.v / 10]; },
  },
  'm09.percent-of-amount': {
    'PV-SHIFT-WRONG': (q) => { const p = pctParts(q); const part = (p.amount * p.p) / 100; return [part * 10, part / 10]; },
    'PCT-OF-WRONG-WHOLE': (q) => { const p = pctParts(q); const part = (p.amount * p.p) / 100; return p.kind === 'of' ? [p.amount - part] : [part]; },
    'PCT-AS-DIVISOR': (q) => { const p = pctParts(q); return [p.amount / p.p]; },
    'PCT-COUNT-AS-PERCENT': (q) => { const p = pctParts(q); return [100 - p.p]; },
    'PCT-SUBTRACT-NUMBER': (q) => { const p = pctParts(q); return [p.amount - p.p]; },
    'PCT-ADD-INSTEAD': (q) => { const p = pctParts(q); return [p.amount + (p.amount * p.p) / 100]; },
  },
  'm09.percent-of-shape': {
    'PCT-COUNT-AS-PERCENT': (q) => { const g = q.diagram; const n = g.rows * g.cols; const k = g.shaded.length ?? g.shaded; return [(/NOT shaded/.test(q.prompt) ? n - k : k) / 100]; },
    'PCT-OF-WRONG-WHOLE': (q) => [1 - SOLVERS['m09.percent-of-shape'](q).value],
  },
  'm09.compare-fdp': {
    'DEC-LONGER-BIGGER': (q) => { const decs = q.options.filter((o) => !o.includes('/') && !o.endsWith('%')); return [decs.reduce((a, b) => (dp(b) > dp(a) ? b : a))]; },
    'DEC-SHORTER-BIGGER': (q) => { const decs = q.options.filter((o) => !o.includes('/') && !o.endsWith('%')); return [decs.reduce((a, b) => (dp(b) < dp(a) ? b : a))]; },
    'FR-SMALLER-DEN-BIGGER': (q) => { const fr = q.options.filter((o) => o.includes('/')); return [fr.reduce((a, b) => (Number(b.split('/')[1]) < Number(a.split('/')[1]) ? b : a))]; },
    'FR-BIGGER-DEN-BIGGER': (q) => { const fr = q.options.filter((o) => o.includes('/')); return [fr.reduce((a, b) => (Number(b.split('/')[1]) > Number(a.split('/')[1]) ? b : a))]; },
    'FDP-DIGITS': (q) => q.options.filter((o) => o.endsWith('%') && o !== SOLVERS['m09.compare-fdp'](q).text),
    'FDP-DEN-AS-DECIMAL': (q) => q.options.filter((o) => /^1\/\d$/.test(o) && Number(`0.${o.split('/')[1]}`) > valueIn(SOLVERS['m09.compare-fdp'](q).text)),
  },
};
export { qadd, qsub, qmul };
