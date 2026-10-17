// Independent answers for the m05 (addition and subtraction) generators, worked out again from the
// question text, and the misconception rules that must reproduce each wrong option from its code.

import { Q, qadd, qsub, qmul, qnum, parseQ, numbersIn } from './lib.js';

const v = (q) => qnum(q);
const num = (t) => parseQ(String(t).replace(/ /g, ''));
const N = (t) => Number(String(t).replace(/ /g, ''));
const NUM = String.raw`-?\d{1,3}(?: \d{3})+(?:\.\d+)?|-?\d+(?:\.\d+)?`;
const dpOf = (t) => { const m = String(t).match(/\.(\d+)/); return m ? m[1].length : 0; };

// column slips, worked on whole numbers (units digit first)
const ds = (n) => String(n).split('').map(Number).reverse();
function noCarry(a, b) { const A = ds(a); const B = ds(b); const L = Math.max(A.length, B.length); let r = 0; for (let i = 0; i < L; i++) { const s = (A[i] || 0) + (B[i] || 0); r += (i === L - 1 ? s : s % 10) * 10 ** i; } return r; }
function smallFromLarge(a, b) { const A = ds(a); const B = ds(b); let r = 0; A.forEach((x, i) => { r += Math.abs(x - (B[i] || 0)) * 10 ** i; }); return r; }
function noReduce(a, b) { const A = ds(a); const B = ds(b); let r = 0; A.forEach((x, i) => { const y = B[i] || 0; r += (x >= y ? x - y : x + 10 - y) * 10 ** i; }); return r; }
/** Two decimals written as whole numbers of the smallest unit they share. */
function scaled(ta, tb) { const p = Math.max(dpOf(ta), dpOf(tb)); const k = 10 ** p; return { A: Math.round(qnum(num(ta)) * k), B: Math.round(qnum(num(tb)) * k), k }; }

/** "-7 + 12 - 3" evaluated left to right. */
function evalLR(expr) {
  const t = expr.trim().match(/-?\d{1,3}(?: \d{3})+(?:\.\d+)?|-?\d+(?:\.\d+)?|[+-]/g);
  let r = num(t[0]);
  for (let i = 1; i < t.length; i += 2) r = t[i] === '+' ? qadd(r, num(t[i + 1])) : qsub(r, num(t[i + 1]));
  return r;
}

// ---------------------------------------------------------------- column

function colParts(q) {
  const t = q.prompt; let m;
  if ((m = t.match(new RegExp(`^Work out (${NUM}) ([+-]) (${NUM})\\.$`)))) return { kind: 'calc', a: N(m[1]), b: N(m[3]), add: m[2] === '+' };
  if ((m = t.match(new RegExp(`adds (${NUM}) to it, then subtracts (${NUM})\\. The answer is (${NUM})`)))) return { kind: 't1', A: N(m[1]), B: N(m[2]), C: N(m[3]) };
  if ((m = t.match(new RegExp(`number from (${NUM}), then adds (${NUM}) to the result\\. .* ends up with (${NUM})`)))) return { kind: 't2', X: N(m[1]), Y: N(m[2]), C: N(m[3]) };
  const ns = numbersIn(t).map(N);
  return { kind: 'calc', a: ns[0], b: ns[1], add: /altogether|in the two months/.test(t) };
}

// ---------------------------------------------------------------- estimate

const PLACES = { 'ten thousand': 10000, thousand: 1000, hundred: 100, ten: 10 };
const rnd = (n, q) => Math.floor((n + q / 2) / q) * q;
function estParts(q) {
  const m = q.prompt.match(new RegExp(`nearest (ten thousand|thousand|hundred|ten), then estimate (${NUM}) ([+-]) (${NUM})`));
  return { q: PLACES[m[1]], a: N(m[2]), add: m[3] === '+', b: N(m[4]) };
}
const comb = (p, x, y) => (p.add ? x + y : x - y);

// ---------------------------------------------------------------- inverse check

function invParts(q) {
  const m = q.prompt.match(new RegExp(`check that (${NUM}) ([+-]) (${NUM}) = (${NUM})`));
  return { A: m[1], op: m[2], B: m[3], C: m[4] };
}

// ---------------------------------------------------------------- missing digit

function mdParts(q) {
  const m = q.prompt.match(/\?:\s+([\d?]+) ([+-]) (\d+) = (\d+)\./);
  const pat = m[1]; const add = m[2] === '+'; const b = N(m[3]); const r = N(m[4]);
  let D = null;
  for (let x = 0; x <= 9; x++) { const a = N(pat.replace('?', x)); if ((add ? a + b : a - b) === r && !(pat[0] === '?' && x === 0)) D = x; }
  const pos = pat.length - 1 - pat.indexOf('?');
  const rDig = Math.floor(r / 10 ** pos) % 10; const bDig = Math.floor(b / 10 ** pos) % 10;
  return { D, wrong: add ? (((rDig - bDig) % 10) + 10) % 10 : (rDig + bDig) % 10 };
}

// ---------------------------------------------------------------- decimals

function decParts(q) {
  const t = q.prompt; let m;
  if ((m = t.match(new RegExp(`^Work out (${NUM}) ([+-]) (${NUM})\\.$`)))) return { kind: 'calc', ta: m[1], add: m[2] === '+', tb: m[3] };
  if ((m = t.match(new RegExp(`add to (${NUM}) to make exactly (\\d+)`))) || (m = t.match(new RegExp(`missing number: (${NUM}) \\+ \\? = (\\d+)`)))) return { kind: 'comp', tx: m[1], T: N(m[2]) };
  return null;
}

// ---------------------------------------------------------------- money and measures

function moneyParts(q) {
  const t = q.prompt; let m;
  if ((m = t.match(/costing RM (\d+(?:\.\d+)?) with a RM (\d+) note/))) return { kind: 'change', items: [num(m[1])], note: num(m[2]) };
  if ((m = t.match(/pays with a RM (\d+) note/))) {
    const items = [...t.matchAll(/for RM (\d+(?:\.\d+)?)/g)].map((x) => num(x[1]));
    return { kind: 'change', items, note: num(m[1]) };
  }
  if ((m = t.match(/is (\d+(?:\.\d+)?) m long\. .* a piece (\d+(?:\.\d+)?) m long, and then another piece (\d+(?:\.\d+)?) m long/))) return { kind: 'plank', L: num(m[1]), c1: num(m[2]), c2: num(m[3]) };
  if ((m = t.match(/masses are (\d+(?:\.\d+)?) kg, (\d+(?:\.\d+)?) kg and (\d+) g/))) return { kind: 'mass', a: num(m[1]), b: num(m[2]), g: num(m[3]) };
  m = t.match(/runs (\d+(?:\.\d+)?) km on Monday\. .* runs (\d+) m more/);
  return { kind: 'dist', k: num(m[1]), mm: num(m[2]) };
}
const sum = (arr) => arr.reduce((a, b) => qadd(a, b), Q(0));
const k1000 = (x) => qmul(x, Q(1, 1000));

// ---------------------------------------------------------------- integers in context

function ctxParts(q) {
  const t = q.prompt; let m;
  if ((m = t.match(/starts on floor (-?\d+)\. It goes (.*)\. Which floor/))) {
    const moves = [...m[2].matchAll(/(up|down) (\d+) floors?/g)].map((x) => (x[1] === 'up' ? 1 : -1) * N(x[2]));
    const path = [N(m[1])]; for (const x of moves) path.push(path[path.length - 1] + x);
    return { kind: 'lift', s: N(m[1]), moves, path, r: path[path.length - 1] };
  }
  if ((m = t.match(/diver is (\d+) m below sea level .* flies (\d+) m above sea level/))) return { kind: 'bird', D: N(m[1]), H: N(m[2]), r: N(m[1]) + N(m[2]) };
  if ((m = t.match(/diver is at -(\d+) m .* swims up (\d+) m/))) return { kind: 'swim', D: N(m[1]), U: N(m[2]), r: N(m[2]) - N(m[1]) };
  if ((m = t.match(/is (\d+) m above sea level\. .* is at -(\d+) m\./))) return { kind: 'height', T: N(m[1]), B: N(m[2]), r: N(m[1]) + N(m[2]) };
  if ((m = t.match(/freezer is at (-?\d+) °C\. .* rises by (\d+) °C every hour\. .* after (\d+) hours/))) return { kind: 'freezer', A: N(m[1]), P: N(m[2]), H: N(m[3]), r: N(m[1]) + N(m[2]) * N(m[3]) };
  m = t.match(new RegExp(`drops by (\\d+) °C for every 1000 m .* hut (${NUM}) m above sea level the temperature is (-?\\d+) °C\\. .* top, (${NUM}) m above`));
  const D = N(m[1]); const H = N(m[2]); const T0 = N(m[3]); const TOP = N(m[4]);
  return { kind: 'mountain', D, H, T0, TOP, r: T0 - (D * (TOP - H)) / 1000 };
}

// ---------------------------------------------------------------- unknowns and equations

function unkParts(q) {
  const m = q.prompt.match(new RegExp(`^(.*) = (${NUM})\\. What is the value of ([a-z])\\?`));
  const lhs = m[1]; const c = m[2]; const L = m[3];
  let k;
  if ((k = lhs.match(new RegExp(`^${L} \\+ (${NUM})$`))) || (k = lhs.match(new RegExp(`^(${NUM}) \\+ ${L}$`)))) return { kind: 'plus', b: k[1], c, x: qsub(num(c), num(k[1])) };
  if ((k = lhs.match(new RegExp(`^${L} - (${NUM})$`)))) return { kind: 'minus', b: k[1], c, x: qadd(num(c), num(k[1])) };
  k = lhs.match(new RegExp(`^(${NUM}) - ${L}$`));
  return { kind: 'from', b: k[1], c, x: qsub(num(k[1]), num(c)) };
}
function storyParts(q) {
  const t = q.prompt;
  const ns = numbersIn(t).map(Number);
  const plus = /gave (?:him|her|them) RM|poured in/.test(t);
  const L = t.match(/Let ([a-z]) stand/)[1];
  return { a: ns[0], b: ns[1], L, plus, start: plus ? ns[1] - ns[0] : ns[1] + ns[0] };
}
/** Does "m - 12 = 30" hold when the letter has value x? */
function holds(eq, L, x) {
  const [l, r] = eq.split(' = ');
  const ev = (side) => evalLR(side.split(' ').map((tok) => (tok === L ? String(x) : tok)).join(' '));
  return qnum(ev(l)) === qnum(ev(r));
}

// ---------------------------------------------------------------- bar models

function barParts(q) {
  const t = q.prompt; let m;
  if ((m = t.match(new RegExp(`has (${NUM}) seats\\. On Friday, (\\d+) .* On Saturday, (\\d+) more`)))) return { kind: 'left', cap: N(m[1]), F: N(m[2]), M: N(m[3]) };
  if ((m = t.match(/On Friday, (\d+) tickets .* On Saturday, (\d+) more/))) return { kind: 'total', F: N(m[1]), M: N(m[2]) };
  m = t.match(/^(.+?) and (.+?) have (?:saved |read )?(?:RM )?(\d+) .*?altogether\. .*? (\d+) .*more than/);
  const A = m[1]; const B = m[2]; const T = N(m[3]); const D = N(m[4]);
  const last = t.slice(t.lastIndexOf('. ') + 2);
  const askA = new RegExp(`\\b${A}\\b`).test(last);
  return { kind: 'sumdiff', T, D, askA };
}

// ---------------------------------------------------------------- solvers

export const SOLVERS = {
  'm05.column-add-subtract': (q) => {
    const p = colParts(q);
    if (p.kind === 't1') return { value: p.C + p.B - p.A };
    if (p.kind === 't2') return { value: p.X + p.Y - p.C };
    return { value: p.add ? p.a + p.b : p.a - p.b };
  },
  'm05.estimate': (q) => { const p = estParts(q); return { value: comb(p, rnd(p.a, p.q), rnd(p.b, p.q)) }; },
  'm05.inverse-check': (q) => {
    const p = invParts(q);
    if (q.type === 'truefalse') {
      const m = q.prompt.match(new RegExp(`by working out ((?:${NUM}) [+-] (?:${NUM}))\\. If you get (${NUM})`));
      return { bool: qnum(evalLR(m[1])) === N(m[2]) };
    }
    const targets = [N(p.A), N(p.B)];
    return { text: q.options.find((o) => o.startsWith(`${p.C} `) && targets.includes(qnum(evalLR(o)))) };
  },
  'm05.missing-digit': (q) => ({ value: mdParts(q).D }),
  'm05.decimals': (q) => {
    const p = decParts(q);
    if (p.kind === 'calc') return { value: v(p.add ? qadd(num(p.ta), num(p.tb)) : qsub(num(p.ta), num(p.tb))) };
    return { value: v(qsub(Q(p.T), num(p.tx))) };
  },
  'm05.money-measures': (q) => {
    const p = moneyParts(q);
    if (p.kind === 'change') return { value: v(qsub(p.note, sum(p.items))) };
    if (p.kind === 'plank') return { value: v(qsub(qsub(p.L, p.c1), p.c2)) };
    if (p.kind === 'mass') return { value: v(qadd(qadd(p.a, p.b), k1000(p.g))) };
    return { value: v(qadd(qmul(p.k, Q(2)), k1000(p.mm))) };
  },
  'm05.integers': (q) => {
    let m;
    if ((m = q.prompt.match(/^Which calculation has the answer (-?\d+)\?/))) return { text: q.options.find((o) => qnum(evalLR(o)) === N(m[1])) };
    m = q.prompt.match(/^Work out (.*)\.$/);
    return { value: v(evalLR(m[1])) };
  },
  'm05.integers-context': (q) => ({ value: ctxParts(q).r }),
  'm05.unknown': (q) => {
    if (/Which equation is correct/.test(q.prompt)) { const s = storyParts(q); return { text: q.options.find((o) => holds(o, s.L, s.start)) }; }
    return { value: v(unkParts(q).x) };
  },
  'm05.bar-model': (q) => {
    const p = barParts(q);
    if (p.kind === 'left') return { value: p.cap - (2 * p.F + p.M) };
    if (p.kind === 'total') return { value: 2 * p.F + p.M };
    return { value: p.askA ? (p.T + p.D) / 2 : (p.T - p.D) / 2 };
  },
};

// ---------------------------------------------------------------- misconception rules

export const MIS = {
  'm05.column-add-subtract': {
    'COL-NO-CARRY': (q) => { const p = colParts(q); return [noCarry(p.a, p.b)]; },
    'COL-SMALLER-FROM-LARGER': (q) => { const p = colParts(q); return [smallFromLarge(p.a, p.b)]; },
    'COL-EXCHANGE-NOT-REDUCED': (q) => { const p = colParts(q); return [noReduce(p.a, p.b)]; },
    'INVERSE-WRONG': (q) => { const p = colParts(q); return [p.C + p.A - p.B]; },
    'INVERSE-ONE-STEP': (q) => { const p = colParts(q); return p.kind === 't1' ? [p.C - p.A - p.B, p.C + p.A + p.B] : [p.X - p.C - p.Y]; },
    'SUB-REVERSED': (q) => { const p = colParts(q); return [p.C - p.Y + p.X]; },
    'ONE-STEP-ONLY': (q) => { const p = colParts(q); return [p.C - p.Y]; },
  },
  'm05.estimate': {
    'EST-EXACT': (q) => { const p = estParts(q); return [comb(p, p.a, p.b)]; },
    'ROUND-TRUNCATE': (q) => { const p = estParts(q); return [comb(p, Math.floor(p.a / p.q) * p.q, Math.floor(p.b / p.q) * p.q)]; },
    'ROUND-WRONG-PLACE': (q) => { const p = estParts(q); return [comb(p, rnd(p.a, p.q / 10), rnd(p.b, p.q / 10))]; },
  },
  'm05.inverse-check': {
    'INVERSE-WRONG': (q) => { const p = invParts(q); return [`${p.C} ${p.op} ${p.B}`]; },
    'SUB-REVERSED': (q) => { const p = invParts(q); return [`${p.B} - ${p.C}`]; },
    'INV-CHECK-WRONG-PAIR': (q) => { const p = invParts(q); return [`${p.A} ${p.op === '+' ? '-' : '+'} ${p.B}`]; },
  },
  'm05.missing-digit': { 'MISSING-DIGIT-NO-CARRY': (q) => [mdParts(q).wrong] },
  'm05.decimals': {
    'DEC-ALIGN-RIGHT': (q) => {
      const p = decParts(q);
      const da = N(p.ta.replace('.', '')); const db = N(p.tb.replace('.', ''));
      const k = 10 ** Math.max(dpOf(p.ta), dpOf(p.tb));
      return [(p.add ? da + db : da - db) / k];
    },
    'COL-NO-CARRY': (q) => { const p = decParts(q); const s = scaled(p.ta, p.tb); return [noCarry(s.A, s.B) / s.k]; },
    'COL-SMALLER-FROM-LARGER': (q) => { const p = decParts(q); const s = scaled(p.ta, p.tb); return [smallFromLarge(s.A, s.B) / s.k]; },
    'COL-EXCHANGE-NOT-REDUCED': (q) => { const p = decParts(q); const s = scaled(p.ta, p.tb); return [noReduce(s.A, s.B) / s.k]; },
    'DEC-NO-EXCHANGE-WHOLE': (q) => {
      const p = decParts(q); const dp = dpOf(p.tx);
      let extra = Q(0); for (let i = 1; i < dp; i++) extra = qadd(extra, Q(1, 10 ** i));
      const each = qadd(qsub(Q(p.T), num(p.tx)), extra);
      return [v(each), v(qadd(each, Q(1)))];
    },
    'OP-SWAP': (q) => { const p = decParts(q); return [v(qadd(Q(p.T), num(p.tx)))]; },
  },
  'm05.money-measures': {
    'CHANGE-SPLIT': (q) => [SOLVERS['m05.money-measures'](q).value + 1],
    'OP-SWAP': (q) => { const p = moneyParts(q); return [v(qadd(p.note, sum(p.items)))]; },
    'WRONG-QUANTITY': (q) => { const p = moneyParts(q); return p.kind === 'plank' ? [v(qadd(p.c1, p.c2))] : [v(sum(p.items))]; },
    'ITEM-LEFT-OUT': (q) => {
      const p = moneyParts(q);
      if (p.kind === 'change') { const ch = qsub(p.note, sum(p.items)); return p.items.map((x) => v(qadd(ch, x))); }
      if (p.kind === 'plank') return [v(qsub(p.L, p.c1))];
      return [v(qadd(p.a, p.b))];
    },
    'COL-EXCHANGE-NOT-REDUCED': (q) => { const p = moneyParts(q); return [noReduce(Math.round(qnum(p.note) * 100), Math.round(qnum(sum(p.items)) * 100)) / 100]; },
    'UNIT-MIXED-SAME': (q) => { const p = moneyParts(q); return p.kind === 'mass' ? [v(qadd(qadd(p.a, p.b), p.g))] : [v(qadd(qmul(p.k, Q(2)), p.mm))]; },
    'UNIT-FACTOR-WRONG': (q) => { const p = moneyParts(q); return p.kind === 'mass' ? [v(qadd(qadd(p.a, p.b), qmul(p.g, Q(1, 100))))] : [v(qadd(qmul(p.k, Q(2)), qmul(p.mm, Q(1, 100))))]; },
    'MORE-THAN-AS-AMOUNT': (q) => { const p = moneyParts(q); return [v(qadd(p.k, k1000(p.mm)))]; },
  },
  'm05.integers': {
    'NEG-WRONG-SIGN': (q) => {
      let m;
      if ((m = q.prompt.match(/^Which calculation has the answer (-?\d+)\?/))) return q.options.filter((o) => qnum(evalLR(o)) === -N(m[1]));
      m = q.prompt.match(/^Work out (.*)\.$/); return [-v(evalLR(m[1]))];
    },
    'NEG-SIGN-DROP': (q) => { const t = q.prompt.match(/^Work out (.*)\.$/)[1].split(' '); t[0] = String(Math.abs(N(t[0]))); return [v(evalLR(t.join(' ')))]; },
    'OP-SWAP': (q) => {
      const t = q.prompt.match(/^Work out (.*)\.$/)[1].split(' ');
      const flip = (i) => { const u = t.slice(); u[i] = u[i] === '+' ? '-' : '+'; return v(evalLR(u.join(' '))); };
      return t.length === 3 ? [flip(1)] : [flip(1), flip(3)];
    },
    'NEG-ADD-SIZES': (q) => { const t = q.prompt.match(/^Work out (.*)\.$/)[1].split(' '); return [N(t[0]) - N(t[2])]; },
    'ONE-STEP-ONLY': (q) => { const t = q.prompt.match(/^Work out (.*)\.$/)[1].split(' '); return [v(evalLR(t.slice(0, 3).join(' ')))]; },
    'NEG-SUB-SIZES': (q) => { const T = N(q.prompt.match(/answer (-?\d+)/)[1]); return q.options.filter((o) => { const t = o.split(' '); return t[1] === '-' && N(t[0]) < 0 && -(Math.abs(N(t[0])) - N(t[2])) === T; }); },
  },
  'm05.integers-context': {
    'NEG-WRONG-SIGN': (q) => [-ctxParts(q).r],
    'NEG-SKIP-ZERO': (q) => { const p = ctxParts(q); return p.kind === 'lift' ? [p.r + Math.sign(p.moves[0])] : [p.r - 1]; },
    'ONE-STEP-ONLY': (q) => {
      const p = ctxParts(q);
      if (p.kind === 'lift') return [p.path[1]];
      if (p.kind === 'bird') return [p.H];
      if (p.kind === 'height') return [p.T];
      if (p.kind === 'freezer') return [p.A + p.P];
      return [p.T0 - p.D];
    },
    'OP-SWAP': (q) => {
      const p = ctxParts(q);
      if (p.kind === 'lift') return [p.s - p.moves[0] + p.moves.slice(1).reduce((a, b) => a + b, 0)];
      if (p.kind === 'swim') return [-p.D - p.U];
      if (p.kind === 'freezer') return [p.A - p.P * p.H];
      return [p.T0 + (p.D * (p.TOP - p.H)) / 1000];
    },
    'NEG-SIGN-DROP': (q) => { const p = ctxParts(q); return [p.D + p.U]; },
    'NEG-DIFF-ADD-SIGNS': (q) => { const p = ctxParts(q); return p.kind === 'bird' ? [Math.abs(p.H - p.D)] : [Math.abs(p.T - p.B)]; },
    'WRONG-START': (q) => { const p = ctxParts(q); return [p.T0 - (p.D * p.TOP) / 1000]; },
  },
  'm05.unknown': {
    'INVERSE-WRONG': (q) => {
      if (/Which equation/.test(q.prompt)) { const s = storyParts(q); return [`${s.L} = ${s.b} ${s.plus ? '+' : '-'} ${s.a}`]; }
      const p = unkParts(q);
      if (p.kind === 'plus') return [v(qadd(num(p.c), num(p.b)))];
      if (p.kind === 'minus') return [v(qsub(num(p.c), num(p.b)))];
      return [v(qadd(num(p.b), num(p.c)))];
    },
    'SUB-REVERSED': (q) => {
      if (/Which equation/.test(q.prompt)) { const s = storyParts(q); return [`${s.a} - ${s.L} = ${s.b}`]; }
      const p = unkParts(q); return [v(qsub(num(p.b), num(p.c)))];
    },
    'OP-SWAP': (q) => { const s = storyParts(q); return [`${s.L} ${s.plus ? '-' : '+'} ${s.a} = ${s.b}`]; },
    'COL-SMALLER-FROM-LARGER': (q) => { const p = unkParts(q); const [top, sm] = p.kind === 'from' ? [p.b, p.c] : [p.c, p.b]; const s = scaled(top, sm); return [smallFromLarge(s.A, s.B) / s.k]; },
    'COL-EXCHANGE-NOT-REDUCED': (q) => { const p = unkParts(q); const [top, sm] = p.kind === 'from' ? [p.b, p.c] : [p.c, p.b]; const s = scaled(top, sm); return [noReduce(s.A, s.B) / s.k]; },
  },
  'm05.bar-model': {
    'MORE-THAN-AS-AMOUNT': (q) => { const p = barParts(q); return p.kind === 'left' ? [p.cap - p.F - p.M] : [2 * p.F]; },
    'ITEM-LEFT-OUT': (q) => { const p = barParts(q); return [p.cap - p.F]; },
    'WRONG-QUANTITY': (q) => { const p = barParts(q); if (p.kind === 'left') return [2 * p.F + p.M]; if (p.kind === 'total') return [p.M]; return [p.askA ? (p.T - p.D) / 2 : (p.T + p.D) / 2]; },
    'ONE-STEP-ONLY': (q) => { const p = barParts(q); return [p.F + p.M]; },
    'BAR-NO-HALVE': (q) => { const p = barParts(q); return [p.T - p.D]; },
    'BAR-HALVE-FIRST': (q) => { const p = barParts(q); return [p.askA ? p.T / 2 + p.D : p.T / 2 - p.D]; },
  },
};
