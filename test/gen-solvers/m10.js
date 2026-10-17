// Independent answers for the m10 generators, worked out again from the question text, and the
// misconception rules that must reproduce each wrong option from its code.
// SOLVERS[id](q) -> { value } (and { text } where the exact form matters)
// MIS[id][code](q) -> list of the values (numbers) that misconception gives for this question

import { Q, qadd, qsub, qmul, qdiv, qnum, qtext, parseQ, numbersIn } from './lib.js';

const FR = String.raw`(\d+ \d+\/\d+|\d+\/\d+|\d+)`;
const v = (q) => qnum(q);
const one = Q(1);
const whole = (m) => { const q = parseQ(m); return Q(q[0] / q[1]); }; // whole-number part (positive)
const fracPart = (m) => qsub(parseQ(m), whole(m));
const absQ = (a) => (a[0] < 0n ? Q(-a[0], a[1]) : a);

/** a op b from "Work out a op b." */
function twoTerms(q) {
  const m = q.prompt.match(new RegExp(`Work out ${FR} ([+-]) ${FR}\\.`));
  return m ? { a: m[1], op: m[2], b: m[3] } : null;
}
/** a + b op c from "Work out a + b op c." */
function threeTerms(q) {
  const m = q.prompt.match(new RegExp(`Work out ${FR} \\+ ${FR} ([+-]) ${FR}\\.`));
  return m ? { a: m[1], b: m[2], op: m[3], c: m[4] } : null;
}
/** "What is the missing fraction? ..." -> { kind, a, c } */
function missing(q) {
  let m;
  if ((m = q.prompt.match(/\? (\d+\/\d+) \+ \? = (\d+\/\d+)/))) return { kind: 'a+?=c', a: parseQ(m[1]), c: parseQ(m[2]) };
  if ((m = q.prompt.match(/\? \? \+ (\d+\/\d+) = (\d+\/\d+)/))) return { kind: '?+a=c', a: parseQ(m[1]), c: parseQ(m[2]) };
  if ((m = q.prompt.match(/\? (\d+\/\d+) - \? = (\d+\/\d+)/))) return { kind: 'c-?=a', c: parseQ(m[1]), a: parseQ(m[2]) };
  if ((m = q.prompt.match(/\? \? - (\d+\/\d+) = (\d+\/\d+)/))) return { kind: '?-a=c', a: parseQ(m[1]), c: parseQ(m[2]) };
  return null;
}
const babs = (n) => (n < 0n ? -n : n);
const tb = (x, y, plus) => (plus ? Q(x[0] + y[0], x[1] + y[1]) : Q(babs(x[0] - y[0]), babs(x[1] - y[1])));
const keep = (x, y, plus) => Q(plus ? x[0] + y[0] : x[0] - y[0], x[1] > y[1] ? x[1] : y[1]);

/** Fraction-of-amount numbers: { f, amount } or, for the whole-from-part form, { f, part }. */
function ofParts(q) {
  let m = q.prompt.match(/(?:What is|Find) (\d+)\/(\d+) of (?:RM )?([\d ]+)/);
  if (m) return { f: Q(m[1], m[2]), amount: Q(m[3].replace(/ /g, '')) };
  m = q.prompt.match(/^(\d+)\/(\d+) of (?:an amount is (?:RM )?([\d ]+)|the pupils.* There are ([\d ]+) girls)/);
  return { f: Q(m[1], m[2]), part: Q((m[3] || m[4]).replace(/ /g, '')) };
}
function remParts(q) {
  const [total, f1, f2] = numbersIn(q.prompt);
  const T = parseQ(total); const a = parseQ(f1); const b = parseQ(f2);
  const first = qmul(T, a); const rest = qsub(T, first); const second = qmul(rest, b);
  return { T, a, b, first, rest, second, left: qsub(rest, second), spent: /spend altogether/.test(q.prompt) };
}
function divParts(q) {
  let m = q.prompt.match(/(?:Work out|Divide) (\d+)\/(\d+) (?:÷|by) (\d+)\./);
  if (!m) m = q.prompt.match(/has (\d+)\/(\d+) of a .* (?:between|into) (\d+) /);
  return { f: Q(m[1], m[2]), n: Q(m[3]) };
}
function timesParts(q) {
  let m = q.prompt.match(/Work out (\d+)\/(\d+) x (\d+)\./);
  if (m) return { f: Q(m[1], m[2]), n: Q(m[3]) };
  m = q.prompt.match(/Work out (\d+) x (\d+)\/(\d+)\./);
  if (m) return { f: Q(m[2], m[3]), n: Q(m[1]) };
  m = q.prompt.match(/(\d+) x \?\/(\d+) = (\d+ \d+\/\d+|\d+\/\d+)/);
  return { w: Q(m[1]), den: Q(m[2]), r: parseQ(m[3]) };
}

export const SOLVERS = {
  'm10.add-sub-unlike': (q) => {
    const t = twoTerms(q);
    let r;
    if (t) r = t.op === '+' ? qadd(parseQ(t.a), parseQ(t.b)) : qsub(parseQ(t.a), parseQ(t.b));
    else { const m = missing(q); r = m.kind === '?-a=c' ? qadd(m.c, m.a) : qsub(m.c, m.a); }
    return { value: v(r), text: qtext(r) };
  },
  'm10.mixed-add-sub': (q) => {
    let m = q.prompt.match(new RegExp(`Work out ${FR} \\+ ${FR} ([+-]) ${FR}\\.`));
    let r;
    if (m) { const s = qadd(parseQ(m[1]), parseQ(m[2])); r = m[3] === '+' ? qadd(s, parseQ(m[4])) : qsub(s, parseQ(m[4])); } else {
      m = twoTerms(q);
      r = m.op === '+' ? qadd(parseQ(m.a), parseQ(m.b)) : qsub(parseQ(m.a), parseQ(m.b));
    }
    return { value: v(r), text: qtext(r) };
  },
  'm10.fraction-of-amount': (q) => {
    const p = ofParts(q);
    return { value: v(p.amount ? qmul(p.f, p.amount) : qdiv(p.part, p.f)) };
  },
  'm10.fraction-times-whole': (q) => {
    const p = timesParts(q);
    if (p.f) { const r = qmul(p.f, p.n); return { value: v(r), text: qtext(r) }; }
    // missing numerator: ? = r x den ÷ w
    return { value: v(qdiv(qmul(p.r, p.den), p.w)) };
  },
  'm10.fraction-divide-whole': (q) => {
    const p = divParts(q);
    const r = qdiv(p.f, p.n);
    return { value: v(r), text: qtext(r) };
  },
  'm10.remainder-problem': (q) => {
    const p = remParts(q);
    return { value: v(p.spent ? qadd(p.first, p.second) : p.left) };
  },
  'm10.whole-from-left': (q) => {
    const m = q.prompt.match(/spent (\d+)\/(\d+) of .* had RM ([\d ]+) left/);
    // what is left is (d - n)/d of the money, so money = left ÷ ((d - n)/d)
    return { value: v(qdiv(Q(m[3].replace(/ /g, '')), Q(Number(m[2]) - Number(m[1]), m[2]))) };
  },
};

export const MIS = {
  'm10.add-sub-unlike': {
    'FR-ADD-TOPS-BOTTOMS': (q) => {
      const t = twoTerms(q);
      if (t) return [v(tb(parseQ(t.a), parseQ(t.b), t.op === '+'))];
      const m = missing(q);
      return [v(tb(m.c, m.a, m.kind === '?-a=c'))];
    },
    'FR-ADD-TOPS-KEEP-BOTTOM': (q) => {
      const t = twoTerms(q);
      if (t) return [v(keep(parseQ(t.a), parseQ(t.b), t.op === '+'))];
      const m = missing(q); return [v(keep(m.c, m.a, m.kind === '?-a=c'))];
    },
    'OP-SWAP': (q) => { const t = twoTerms(q); const a = parseQ(t.a); const b = parseQ(t.b); return [v(t.op === '+' ? absQ(qsub(a, b)) : qadd(a, b))]; },
    'INVERSE-WRONG': (q) => { const m = missing(q); return [v(m.kind === '?-a=c' ? absQ(qsub(m.c, m.a)) : qadd(m.c, m.a))]; },
  },
  'm10.mixed-add-sub': {
    'FR-MIXED-WHOLE-ONLY': (q) => {
      const t = twoTerms(q);
      const r = SOLVERS['m10.mixed-add-sub'](q).value;
      if (t && !/\//.test(t.a)) { // whole minus mixed
        const w = parseQ(t.a); const wb = whole(t.b); const fb = fracPart(t.b);
        return [v(qadd(qsub(w, wb), fb))];
      }
      if (t) { const wa = whole(t.a); const wb = whole(t.b); return [v(qadd(qsub(wa, wb), qsub(fracPart(t.b), fracPart(t.a))))]; }
      return [];
    },
    // exchanged 1 whole for fraction pieces but did not take it from the whole numbers
    'COL-EXCHANGE-NOT-REDUCED': (q) => {
      const t = twoTerms(q);
      if (t && !/\//.test(t.a)) { const w = parseQ(t.a); return [v(qadd(qsub(w, whole(t.b)), qsub(one, fracPart(t.b))))]; }
      return [SOLVERS['m10.mixed-add-sub'](q).value + 1];
    },
    'FR-MIXED-NO-CARRY': (q) => { const r = SOLVERS['m10.mixed-add-sub'](q).value; return [r - 1, r - 2]; },
    'ONE-STEP-ONLY': (q) => { const m = threeTerms(q); return [v(qadd(parseQ(m.a), parseQ(m.b)))]; },
    'FR-ADD-TOPS-BOTTOMS': (q) => {
      const t = twoTerms(q); const plus = t.op === '+';
      const w = plus ? qadd(whole(t.a), whole(t.b)) : qsub(whole(t.a), whole(t.b));
      return [v(qadd(w, tb(fracPart(t.a), fracPart(t.b), plus)))];
    },
    'FR-ADD-TOPS-KEEP-BOTTOM': (q) => {
      const m3 = threeTerms(q);
      if (m3) {
        const sg = m3.op === '+' ? 1n : -1n;
        const w = qadd(qadd(whole(m3.a), whole(m3.b)), m3.op === '+' ? whole(m3.c) : Q(-whole(m3.c)[0]));
        const fs = [fracPart(m3.a), fracPart(m3.b), fracPart(m3.c)];
        const L = fs[0][1] > fs[1][1] ? fs[0][1] : fs[1][1];
        return [v(qadd(w, Q(fs[0][0] + fs[1][0] + sg * fs[2][0], L)))];
      }
      const t = twoTerms(q); const plus = t.op === '+';
      const w = plus ? qadd(whole(t.a), whole(t.b)) : qsub(whole(t.a), whole(t.b));
      return [v(qadd(w, keep(fracPart(t.a), fracPart(t.b), plus)))];
    },
    'OP-SWAP': (q) => {
      const m = q.prompt.match(new RegExp(`Work out ${FR} \\+ ${FR} - ${FR}\\.`));
      if (m) return [v(qadd(qadd(parseQ(m[1]), parseQ(m[2])), parseQ(m[3])))];
      const t = twoTerms(q);
      return [v(t.op === '+' ? qsub(parseQ(t.a), parseQ(t.b)) : qadd(parseQ(t.a), parseQ(t.b)))];
    },
  },
  'm10.fraction-of-amount': {
    'FR-OF-DIVIDE-ONLY': (q) => { const p = ofParts(q); return [v(qdiv(p.amount, Q(p.f[1])))]; },
    'FR-OF-WRONG-OP': (q) => { const p = ofParts(q); return [v(qmul(qdiv(p.amount, Q(p.f[0])), Q(p.f[1])))]; },
    'PCT-OF-WRONG-WHOLE': (q) => { const p = ofParts(q); return [v(qsub(p.amount, qmul(p.amount, p.f)))]; },
    'FR-OF-MULT-ONLY': (q) => { const p = ofParts(q); return [v(qmul(p.amount, Q(p.f[0])))]; },
    'FR-WHOLE-ONE-PART': (q) => { const p = ofParts(q); return [v(qdiv(p.part, Q(p.f[0])))]; },
    'FR-WHOLE-DEN-ONLY': (q) => { const p = ofParts(q); return [v(qmul(p.part, Q(p.f[1])))]; },
    'FR-WHOLE-TIMES-FRACTION': (q) => { const p = ofParts(q); return [v(qmul(p.part, p.f))]; },
  },
  'm10.fraction-times-whole': {
    'FR-MULT-BOTH': (q) => { const p = timesParts(q); return [v(p.f)]; },
    'FR-MULT-DEN': (q) => { const p = timesParts(q); return [v(Q(p.f[0], p.f[1] * p.n[0]))]; },
    'FR-MULT-ADDS': (q) => { const p = timesParts(q); return [v(Q(p.f[0] + p.n[0], p.f[1]))]; },
    'FR-MISSING-NO-DIVIDE': (q) => { const p = timesParts(q); return [v(qmul(p.r, p.den))]; },
    'FR-MISSING-WRONG-DEN': (q) => { const p = timesParts(q); return [v(qdiv(Q(p.r[0]), p.w))]; },
    'WRONG-QUANTITY': (q) => [Number(timesParts(q).r[0])],
  },
  'm10.fraction-divide-whole': {
    'FR-DIV-WRONG-PART': (q) => { const p = divParts(q); return [v(qmul(p.f, p.n)), v(qmul(p.f, p.n))].concat(p.f[1] % p.n[0] === 0n ? [v(Q(p.f[0], p.f[1] / p.n[0]))] : []); },
    'FR-DIV-UNCHANGED': (q) => [v(divParts(q).f)],
    'FR-DIV-WHOLE-ONLY': (q) => [v(Q(1n, divParts(q).n[0]))],
  },
  'm10.remainder-problem': {
    'FR-REMAINDER-OF-WHOLE': (q) => { const p = remParts(q); const w = qmul(p.T, p.b); return [v(p.spent ? qadd(p.first, w) : qsub(p.rest, w))]; },
    'FR-REMAINDER-ONE-STEP': (q) => { const p = remParts(q); return p.spent ? [v(p.first)] : [v(p.rest), v(p.second)]; },
    'PCT-OF-WRONG-WHOLE': (q) => { const p = remParts(q); return [v(p.spent ? p.left : qadd(p.first, p.second))]; },
  },
  'm10.whole-from-left': {
    'FR-LEFT-AS-SPENT': (q) => { const m = q.prompt.match(/spent (\d+)\/(\d+) of .* had RM ([\d ]+) left/); return [v(qmul(qdiv(Q(m[3].replace(/ /g, '')), Q(m[1])), Q(m[2])))]; },
    'FR-WHOLE-ONE-PART': (q) => { const m = q.prompt.match(/spent (\d+)\/(\d+) of .* had RM ([\d ]+) left/); return [v(qdiv(Q(m[3].replace(/ /g, '')), Q(Number(m[2]) - Number(m[1]))))]; },
    'FR-WHOLE-DEN-ONLY': (q) => { const m = q.prompt.match(/spent (\d+)\/(\d+) of .* had RM ([\d ]+) left/); return [v(qmul(Q(m[3].replace(/ /g, '')), Q(m[2])))]; },
  },
};
