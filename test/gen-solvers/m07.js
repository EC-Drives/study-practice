// Independent answers for the m07 (number patterns) generators, worked out again from the question
// text, and the misconception rules that must reproduce each wrong option from its code.

import { Q, qadd, qsub, qmul, qdiv, qnum, qtext, parseQ } from './lib.js';

const v = (q) => qnum(q);
const N = (t) => Number(String(t).replace(/ /g, ''));
const ZERO = Q(0);
const sgn = (a) => (a[0] > 0n ? 1 : a[0] < 0n ? -1 : 0);

// ---------------------------------------------------------------- sequences

function seq(q) {
  const body = q.prompt.replace(/^.*?(?:sequence\? |sequence: )/, '');
  const toks = body.split(', ').map((x) => x.trim()).filter((x) => x && x !== '...');
  const vals = toks.map((x) => (x === '___' ? null : parseQ(x)));
  let hid = vals.indexOf(null);
  let step = null;
  for (let i = 0; i + 1 < vals.length; i++) if (vals[i] && vals[i + 1]) { step = qsub(vals[i + 1], vals[i]); break; }
  if (hid < 0) { vals.push(qadd(vals[vals.length - 1], step)); hid = vals.length - 1; } else vals[hid] = hid > 0 ? qadd(vals[hid - 1], step) : qsub(vals[hid + 1], step);
  return { ans: vals[hid], prev: hid > 0 ? vals[hid - 1] : qsub(vals[0], step), step, first: vals[0], toks };
}
function farApart(q) { const m = q.prompt.match(/The 1st term is (.+?) and the 4th term is (.+?)\. What/); return { a: parseQ(m[1]), b: parseQ(m[2]) }; }
function below(q) {
  const m = q.prompt.match(/starts at (\d+) and counts back in steps of (\d+):.* less than (-?\d+)\?/);
  const s = N(m[1]); const k = N(m[2]); const L = N(m[3]);
  let t = s; while (t >= L) t -= k;
  return { ans: t, k };
}

// ---------------------------------------------------------------- rules

function rule(text) { const m = text.match(/term = (\d+) x position(?: ([+-]) (\d+))?/); return { a: N(m[1]), b: m[2] ? (m[2] === '+' ? 1 : -1) * N(m[3]) : 0 }; }
const ruleText = (a, b) => `term = ${a} x position${b > 0 ? ` + ${b}` : b < 0 ? ` - ${-b}` : ''}`;
const listNums = (t) => t.split(', ').map(N);

// ---------------------------------------------------------------- matchsticks

function sticks(q) {
  const m = q.prompt.match(/use (\d+), (\d+) and (\d+) matchsticks/);
  const A = N(m[1]); const step = N(m[2]) - A;
  return { per: A, step, c: A - step };
}

/** The root of the last term of a list of squares or cubes. */
const rootOf = (list, e) => { const x = listNums(list); return Math.round(x[x.length - 1] ** (1 / e)); };

// ---------------------------------------------------------------- function machines

const APPLY = { x: (x, k) => qmul(x, k), '+': (x, k) => qadd(x, k), '-': (x, k) => qsub(x, k), '÷': (x, k) => qdiv(x, k) };
const UNDO = { x: '÷', '÷': 'x', '+': '-', '-': '+' };
const parseSteps = (t) => t.split(', then ').map((s) => { const [op, k] = s.trim().split(' '); return { op, k: parseQ(k) }; });
const runSteps = (x, steps) => steps.reduce((a, s) => APPLY[s.op](a, s.k), x);
function fm(q) {
  const m = q.prompt.match(/does: (.*)\. The (input|output) is (.+?)\. What/);
  return { steps: parseSteps(m[1]), given: m[2], x: parseQ(m[3]) };
}
const undoAll = (x, steps) => steps.slice().reverse().reduce((a, s) => APPLY[UNDO[s.op]](a, s.k), x);
function pairs(q) { const m = q.prompt.match(/turns (\d+) into (\d+), (\d+) into (\d+) and (\d+) into (\d+)/); return [[N(m[1]), N(m[2])], [N(m[3]), N(m[4])], [N(m[5]), N(m[6])]]; }
const works = (opt, [i, o]) => v(runSteps(Q(i), parseSteps(opt))) === o;

// ---------------------------------------------------------------- letters

function ageParts(q) {
  let m = q.prompt.match(/is ([a-z]) years old\. .* is (\d+) years (older|younger) than .* in (\d+) years' time/);
  if (m) return { L: m[1], k: (m[3] === 'older' ? 1 : -1) * N(m[2]), m: N(m[4]) };
  m = q.prompt.match(/has ([a-z]) (\w+)\. .* has (\d+) (more|fewer) \2 than .*\. Then the \w+ (?:is given (\d+) more|gives away (\d+))\. Which expression/);
  return { L: m[1], k: (m[4] === 'more' ? 1 : -1) * N(m[3]), m: m[5] ? N(m[5]) : -N(m[6]) };
}
const expr = (L, c) => (c === 0 ? L : `${L} ${c > 0 ? '+' : '-'} ${Math.abs(c)}`);
function sumDiff(q) { const m = q.prompt.match(/([a-z]) \+ ([a-z]) = (\d+), and \1 is (\d+) more than \2\. What is ([a-z])\?/); return { n: N(m[3]), k: N(m[4]), askX: m[5] === m[1] }; }

// ---------------------------------------------------------------- solvers

export const SOLVERS = {
  'm07.next-term': (q) => {
    if (/The 1st term is/.test(q.prompt)) { const p = farApart(q); return { value: v(qadd(p.a, qdiv(qsub(p.b, p.a), Q(3)))) }; }
    if (/first term that is less than/.test(q.prompt)) return { value: below(q).ans };
    return { value: v(seq(q).ans) };
  },
  'm07.term-to-term': (q) => {
    let m;
    if ((m = q.prompt.match(/term-to-term rule '(add|subtract) (\d+)'/))) {
      const s = (m[1] === 'add' ? 1 : -1) * N(m[2]);
      return { text: q.options.find((o) => { const x = listNums(o.replace(', ...', '')); return x.slice(1).every((y, i) => y - x[i] === s); }) };
    }
    const p = seq(q);
    const d = v(p.step);
    return { text: `${d > 0 ? 'add' : 'subtract'} ${Math.abs(d)}` };
  },
  'm07.position-to-term': (q) => {
    const t = q.prompt; let m;
    if ((m = t.match(/is: (term = .*?)\. What is the (\d+)\w\w term/))) { const r = rule(m[1]); return { value: r.a * N(m[2]) + r.b }; }
    if ((m = t.match(/Look at the sequence (.*), \.\.\. Which/))) {
      const s = listNums(m[1]);
      return { text: q.options.find((o) => { const mm = o.match(/term = (\d+) x position(?: ([+-]) (\d+))?$/); if (!mm) return false; const r = rule(o); return s.every((y, i) => r.a * (i + 1) + r.b === y); }) };
    }
    if ((m = t.match(/A sequence starts (.*), \.\.\. What is the (\d+)\w\w term/))) { const s = listNums(m[1]); const a = s[1] - s[0]; return { value: a * N(m[2]) + s[0] - a }; }
    if ((m = t.match(/rule for a sequence is (term = .*?)\. Which position has the term (\d+)/))) { const r = rule(m[1]); return { value: (N(m[2]) - r.b) / r.a }; }
    if ((m = t.match(/The number (\d+) is a term in the sequence with the rule (term = .*)\.$/))) { const r = rule(m[2]); const pos = (N(m[1]) - r.b) / r.a; return { bool: Number.isInteger(pos) && pos >= 1 }; }
    m = t.match(/Row 1 has (\d+) chairs\. Each row has (\d+) more .* in Row (\d+)\?/);
    return { value: N(m[1]) + N(m[2]) * (N(m[3]) - 1) };
  },
  'm07.spatial': (q) => {
    const p = sticks(q); let m;
    if ((m = q.prompt.match(/Which pattern uses (\d+) matchsticks/))) return { text: `Pattern ${(N(m[1]) - p.c) / p.step}` };
    m = q.prompt.match(/How many matchsticks are in Pattern (\d+)/);
    return { value: p.step * N(m[1]) + p.c };
  },
  'm07.square-cube': (q) => {
    const t = q.prompt; let m;
    if ((m = t.match(/sequence of (square|cube) numbers\? (.*), \.\.\./))) { const e = m[1] === 'cube' ? 3 : 2; return { value: (rootOf(m[2], e) + 1) ** e }; }
    if (/in the sequence of square numbers/.test(t)) return { text: q.options.find((o) => Number.isInteger(Math.sqrt(N(o)))) };
    if ((m = t.match(/term = position x position\. What is the (\d+)/))) return { value: N(m[1]) ** 2 };
    if ((m = t.match(/made by (adding|subtracting) (\d+) (?:to|from) each square number\. What is the (\d+)/))) return { value: N(m[3]) ** 2 + (m[1] === 'adding' ? 1 : -1) * N(m[2]) };
    m = t.match(/does Pattern (\d+) have than Pattern (\d+)/);
    return { value: N(m[1]) ** 2 - N(m[2]) ** 2 };
  },
  'm07.function-machine': (q) => {
    if (/Which rule works for ALL three/.test(q.prompt)) { const ps = pairs(q); return { text: q.options.find((o) => ps.every((pp) => works(o, pp))) }; }
    const p = fm(q);
    return { value: v(p.given === 'input' ? runSteps(p.x, p.steps) : undoAll(p.x, p.steps)) };
  },
  'm07.letters': (q) => {
    if (/years' time|Which expression/.test(q.prompt)) { const p = ageParts(q); return { text: expr(p.L, p.k + p.m) }; }
    const p = sumDiff(q); const big = (p.n + p.k) / 2;
    return { value: p.askX ? big : p.n - big };
  },
};

// ---------------------------------------------------------------- misconception rules

export const MIS = {
  'm07.next-term': {
    'OP-SWAP': (q) => { const p = seq(q); return [v(qsub(p.prev, p.step))]; },
    'SEQ-STEP-ONE': (q) => { const p = seq(q); return [v(p.prev) + sgn(p.step), v(p.prev) + 1]; },
    'NEG-SIGN-DROP': (q) => [-v(seq(q).ans)],
    'SEQ-FIRST-AS-STEP': (q) => { const p = seq(q); return [v(qadd(p.prev, p.first))]; },
    'PV-REGROUP-AS-DIGITS': (q) => {
      const p = seq(q); const pv = v(p.prev); const st = v(p.step);
      const t = Math.round(pv * 10) % 10; const u = Math.round(st * 10) % 10;
      return [`${Math.floor(pv) + Math.floor(st)}.${t + u}`];
    },
    'FR-ADD-TOPS-BOTTOMS': (q) => { const p = seq(q); return [`${p.prev[0] + p.step[0]}/${p.prev[1] + p.step[1]}`]; },
    'SEQ-OFF-BY-ONE': (q) => {
      if (/The 1st term is/.test(q.prompt)) { const p = farApart(q); return [v(qadd(p.a, qdiv(qsub(p.b, p.a), Q(4))))]; }
      const b = below(q); return [b.ans + b.k, b.ans - b.k];
    },
    'WRONG-QUANTITY': (q) => { const p = farApart(q); const s = qdiv(qsub(p.b, p.a), Q(3)); return [v(s), v(qadd(p.a, qmul(s, Q(2))))]; },
    'NEG-ORDER': (q) => { const b = below(q); return [-(b.ans + b.k)]; },
  },
  'm07.term-to-term': {
    'OP-SWAP': (q) => {
      let m;
      if ((m = q.prompt.match(/term-to-term rule '(add|subtract) (\d+)'/))) { const s = (m[1] === 'add' ? -1 : 1) * N(m[2]); return q.options.filter((o) => { const x = listNums(o.replace(', ...', '')); return x.slice(1).every((y, i) => y - x[i] === s); }); }
      const d = v(seq(q).step); return [`${d > 0 ? 'subtract' : 'add'} ${Math.abs(d)}`];
    },
    'SEQ-FIRST-AS-STEP': (q) => [`add ${v(seq(q).first)}`],
    'SEQ-STEP-ONE': (q) => { const d = v(seq(q).step); return [`${d > 0 ? 'add' : 'subtract'} 1`]; },
    'SEQ-CHECK-ONE-STEP': (q) => {
      const m = q.prompt.match(/term-to-term rule '(add|subtract) (\d+)'/);
      if (!m) return q.options.filter((o) => /^multiply by/.test(o));
      const s = (m[1] === 'add' ? 1 : -1) * N(m[2]);
      return q.options.filter((o) => { const x = listNums(o.replace(', ...', '')); return x[1] - x[0] === s && !x.slice(1).every((y, i) => y - x[i] === s); });
    },
  },
  'm07.position-to-term': {
    'ONE-STEP-ONLY': (q) => { const m = q.prompt.match(/is: (term = .*?)\. What is the (\d+)\w\w term/); const r = rule(m[1]); return [r.a * N(m[2])]; },
    'SEQ-OFF-BY-ONE': (q) => {
      const t = q.prompt; let m;
      if ((m = t.match(/is: (term = .*?)\. What is the (\d+)\w\w term/))) { const r = rule(m[1]); const n = N(m[2]); return [r.a * (n - 1) + r.b, r.a * (n + 1) + r.b]; }
      if ((m = t.match(/Look at the sequence (.*), \.\.\. Which/))) { const s = listNums(m[1]); return [ruleText(s[1] - s[0], s[0])]; }
      if ((m = t.match(/A sequence starts (.*), \.\.\. What is the (\d+)\w\w term/))) { const s = listNums(m[1]); return [s[0] + (s[1] - s[0]) * N(m[2])]; }
      if ((m = t.match(/Which position has the term (\d+)/))) return [SOLVERS['m07.position-to-term'](q).value + 1];
      m = t.match(/Row 1 has (\d+) chairs\. Each row has (\d+) more .* in Row (\d+)\?/); return [N(m[1]) + N(m[2]) * N(m[3])];
    },
    'FM-ORDER': (q) => {
      let m;
      if ((m = q.prompt.match(/is: (term = .*?)\. What is the (\d+)\w\w term/))) { const r = rule(m[1]); return [r.a * (N(m[2]) + r.b)]; }
      m = q.prompt.match(/rule for a sequence is (term = .*?)\. Which position has the term (\d+)/); const r = rule(m[1]); return [N(m[2]) / r.a - r.b];
    },
    'SEQ-ADD-NOT-MULT': (q) => {
      let m;
      if ((m = q.prompt.match(/is: (term = .*?)\. What is the (\d+)\w\w term/))) { const r = rule(m[1]); return [N(m[2]) + r.a + r.b]; }
      m = q.prompt.match(/Look at the sequence (.*), \.\.\. Which/); const s = listNums(m[1]); return [`term = position + ${s[1] - s[0]}`];
    },
    'SEQ-STEP-AS-RULE': (q) => {
      let m;
      if ((m = q.prompt.match(/Look at the sequence (.*), \.\.\. Which/))) { const s = listNums(m[1]); return [ruleText(s[1] - s[0], 0)]; }
      if ((m = q.prompt.match(/A sequence starts (.*), \.\.\. What is the (\d+)\w\w term/))) { const s = listNums(m[1]); return [(s[1] - s[0]) * N(m[2])]; }
      m = q.prompt.match(/Row 1 has (\d+) chairs\. Each row has (\d+) more .* in Row (\d+)\?/); return [N(m[2]) * N(m[3])];
    },
    'INVERSE-WRONG': (q) => { const m = q.prompt.match(/rule for a sequence is (term = .*?)\. Which position has the term (\d+)/); const r = rule(m[1]); return [(N(m[2]) + r.b) / r.a]; },
    'WRONG-QUANTITY': (q) => [N(q.prompt.match(/has the term (\d+)/)[1])],
    'SEQ-FIRST-TIMES-N': (q) => {
      let m;
      if ((m = q.prompt.match(/A sequence starts (.*), \.\.\. What is the (\d+)\w\w term/))) return [listNums(m[1])[0] * N(m[2])];
      m = q.prompt.match(/Row 1 has (\d+) chairs\. .* in Row (\d+)\?/); return [N(m[1]) * N(m[2])];
    },
  },
  'm07.spatial': {
    'SHARED-COUNTED-TWICE': (q) => {
      const p = sticks(q); let m;
      if ((m = q.prompt.match(/Which pattern uses (\d+) matchsticks/))) return [`Pattern ${Math.round(N(m[1]) / p.per)}`];
      return [p.per * N(q.prompt.match(/Pattern (\d+)\?/)[1])];
    },
    'SEQ-STEP-AS-RULE': (q) => {
      const p = sticks(q); let m;
      if ((m = q.prompt.match(/Which pattern uses (\d+) matchsticks/))) return [`Pattern ${N(m[1]) / p.step}`];
      return [p.step * N(q.prompt.match(/Pattern (\d+)\?/)[1])];
    },
    'SEQ-OFF-BY-ONE': (q) => {
      const p = sticks(q); let m;
      if ((m = q.prompt.match(/Which pattern uses (\d+) matchsticks/))) { const n = (N(m[1]) - p.c) / p.step; return [`Pattern ${n - 1}`, `Pattern ${n + 1}`]; }
      return [p.step * (N(q.prompt.match(/Pattern (\d+)\?/)[1]) - 1) + p.c];
    },
    'SEQ-ADD-NOT-MULT': (q) => { const p = sticks(q); return [N(q.prompt.match(/Pattern (\d+)\?/)[1]) + p.step]; },
  },
  'm07.square-cube': {
    'SEQ-SAME-GAP': (q) => { const x = listNums(q.prompt.match(/numbers\? (.*), \.\.\./)[1]); const k = x.length; return [x[k - 1] + x[k - 1] - x[k - 2]]; },
    'POW-MULT': (q) => {
      const t = q.prompt; let m;
      if ((m = t.match(/sequence of (square|cube) numbers\? (.*), \.\.\./))) { const e = m[1] === 'cube' ? 3 : 2; return [(rootOf(m[2], e) + 1) * e]; }
      if (/in the sequence of square numbers/.test(t)) return q.options.filter((o) => N(o) % 2 === 0 && !Number.isInteger(Math.sqrt(N(o))));
      if ((m = t.match(/term = position x position\. What is the (\d+)/))) return [2 * N(m[1])];
      m = t.match(/made by (adding|subtracting) (\d+) (?:to|from) each square number\. What is the (\d+)/); return [2 * N(m[3]) + (m[1] === 'adding' ? 1 : -1) * N(m[2])];
    },
    'SEQ-OFF-BY-ONE': (q) => {
      const t = q.prompt; let m;
      if ((m = t.match(/sequence of (square|cube) numbers\? (.*), \.\.\./))) { const e = m[1] === 'cube' ? 3 : 2; return [(rootOf(m[2], e) + 2) ** e]; }
      if ((m = t.match(/term = position x position\. What is the (\d+)/))) return [(N(m[1]) - 1) ** 2, (N(m[1]) + 1) ** 2];
      if ((m = t.match(/made by (adding|subtracting) (\d+) (?:to|from) each square number\. What is the (\d+)/))) return [(N(m[3]) - 1) ** 2 + (m[1] === 'adding' ? 1 : -1) * N(m[2])];
      return [];
    },
    'CORNER-COUNTED-TWICE': (q) => [2 * N(q.prompt.match(/does Pattern (\d+) have/)[1])],
    'SQ-CUBE-MIX': (q) => q.options.filter((o) => { const r = Math.round(Math.cbrt(N(o))); return r ** 3 === N(o) && !Number.isInteger(Math.sqrt(N(o))); }),
    'ONE-STEP-ONLY': (q) => [N(q.prompt.match(/What is the (\d+)/)[1]) ** 2],
    'WRONG-QUANTITY': (q) => [N(q.prompt.match(/does Pattern (\d+) have/)[1]) ** 2],
    'SEQ-STEP-ONE': () => [1],
  },
  'm07.function-machine': {
    'FM-ORDER': (q) => {
      if (/Which rule works/.test(q.prompt)) return q.options.filter((o) => /^\+ \d+, then x \d+$/.test(o));
      const p = fm(q);
      if (p.given === 'input') return [v(runSteps(p.x, p.steps.slice().reverse()))];
      return [v(p.steps.reduce((a, s) => APPLY[UNDO[s.op]](a, s.k), p.x))];
    },
    'ONE-STEP-ONLY': (q) => { const p = fm(q); if (p.given === 'input') return [v(runSteps(p.x, [p.steps[0]]))]; const last = p.steps[p.steps.length - 1]; return [v(APPLY[UNDO[last.op]](p.x, last.k))]; },
    'FM-NO-INVERSE': (q) => { const p = fm(q); return [v(runSteps(p.x, p.steps))]; },
    'SEQ-CHECK-ONE-STEP': (q) => { const ps = pairs(q); return q.options.filter((o) => works(o, ps[0]) && !ps.every((pp) => works(o, pp))); },
  },
  'm07.letters': {
    'WRONG-QUANTITY': (q) => { const p = sumDiff(q); const big = (p.n + p.k) / 2; return [p.askX ? p.n - big : big]; },
    'BAR-NO-HALVE': (q) => { const p = sumDiff(q); return [p.n - p.k]; },
    'HALF-TOTAL': (q) => [sumDiff(q).n / 2],
    'ONE-STEP-ONLY': (q) => { const p = ageParts(q); return [expr(p.L, p.k)]; },
    'OP-SWAP': (q) => { const p = ageParts(q); return [expr(p.L, -p.k + p.m), expr(p.L, p.k - p.m)]; },
    'ITEM-LEFT-OUT': (q) => { const p = ageParts(q); return [expr(p.L, p.m)]; },
  },
};

void ZERO; void qtext;
