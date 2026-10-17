// Independent answers for the m06 (multiplication and division) generators, worked out again from
// the question text, and the misconception rules that must reproduce each wrong option from its code.

import { Q, qadd, qsub, qmul, qdiv, qnum, parseQ, numbersIn } from './lib.js';

const v = (q) => qnum(q);
const num = (t) => parseQ(String(t).replace(/ /g, ''));
const N = (t) => Number(String(t).replace(/ /g, ''));
const NUM = String.raw`\d{1,3}(?: \d{3})+(?:\.\d+)?|\d+(?:\.\d+)?`;

// ---------------------------------------------------------------- expressions

const tokenize = (s) => s.match(new RegExp(`${NUM}|[+\\-×÷()]`, 'g')).map((t) => (/\d/.test(t) ? num(t) : t));
const OPS = { '+': qadd, '-': qsub, '×': qmul, '÷': qdiv };
/** mode: bodmas | lr (brackets first, then left to right) | mulfirst (brackets, then × before ÷) | nobr (brackets ignored) */
function calc(text, mode = 'bodmas') {
  let toks = tokenize(text);
  if (mode === 'nobr') { toks = toks.filter((t) => t !== '(' && t !== ')'); mode = 'bodmas'; }
  let i = 0;
  const group = () => {
    const seq = [];
    while (i < toks.length && toks[i] !== ')') { if (toks[i] === '(') { i++; seq.push(group()); i++; } else seq.push(toks[i++]); }
    const run = (arr, set) => { const out = [arr[0]]; for (let k = 1; k < arr.length; k += 2) { if (set.includes(arr[k])) out[out.length - 1] = OPS[arr[k]](out[out.length - 1], arr[k + 1]); else out.push(arr[k], arr[k + 1]); } return out; };
    let a = seq;
    if (mode === 'lr') a = run(a, ['+', '-', '×', '÷']);
    else if (mode === 'mulfirst') { a = run(a, ['×']); a = run(a, ['÷']); a = run(a, ['+', '-']); } else { a = run(a, ['×', '÷']); a = run(a, ['+', '-']); }
    return a[0];
  };
  return group();
}
/** The first step on its own: the bracket, or the first × or ÷. */
function firstStep(text) {
  const b = text.match(/\(([^)]*)\)/);
  if (b) return calc(b[1]);
  const m = text.match(new RegExp(`(${NUM}) ([×÷]) (${NUM})`));
  return calc(`${m[1]} ${m[2]} ${m[3]}`);
}

// ---------------------------------------------------------------- written methods

const dg = (n) => String(n).split('').map(Number).reverse();
function noCarry(a, b) { const A = dg(a); return A.reduce((s, x, i) => s + (i === A.length - 1 ? x * b : (x * b) % 10) * 10 ** i, 0); }
function carryFirst(a, b) { const A = dg(a); let c = 0; let s = 0; A.forEach((x, i) => { const p = (x + c) * b; s += (p % 10) * 10 ** i; c = Math.floor(p / 10); }); return s + c * 10 ** A.length; }
const rnd = (n, q) => Math.round(n / q) * q;

// ---------------------------------------------------------------- remainders in stories

function story(q) {
  const t = q.prompt; let m;
  if ((m = t.match(/(\d+) pupils and (\d+) teachers .* carry (\d+) people/))) return { kind: 'up3', n: N(m[1]), e: N(m[2]), c: N(m[3]), total: N(m[1]) + N(m[2]) };
  if ((m = t.match(/has RM (\d+)\. .* spends RM (\d+) on lunch\. .* cost RM (\d+) each/))) return { kind: 'down3', h: N(m[1]), s: N(m[2]), c: N(m[3]), total: N(m[1]) - N(m[2]) };
  if ((m = t.match(/carry (\d+) pupils\. (\d+) pupils/))) return { kind: 'up', c: N(m[1]), total: N(m[2]) };
  if ((m = t.match(/box holds (\d+) eggs\. A farmer has (\d+) eggs/))) return { kind: 'up', c: N(m[1]), total: N(m[2]) };
  if ((m = t.match(/read (\d+) pages\. .* reads (\d+) pages a day/))) return { kind: 'up', c: N(m[2]), total: N(m[1]) };
  if ((m = t.match(/has (\d+) cm of ribbon\. Each bow needs (\d+) cm/))) return { kind: 'down', c: N(m[2]), total: N(m[1]) };
  if ((m = t.match(/has RM (\d+)\. A ticket .* costs RM (\d+)\./))) return { kind: 'down', c: N(m[2]), total: N(m[1]) };
  if ((m = t.match(/has (\d+) curry puffs\. .* boxes of (\d+)\./))) return { kind: 'down', c: N(m[2]), total: N(m[1]) };
  if ((m = t.match(/has (\d+) ml of juice\. .* hold (\d+) ml/))) return { kind: 'left', c: N(m[2]), total: N(m[1]) };
  m = t.match(/(\d+) sweets are shared equally between (\d+) children/);
  return { kind: 'left', c: N(m[2]), total: N(m[1]) };
}
function storyAnswer(p) {
  const q = Math.floor(p.total / p.c); const r = p.total % p.c;
  if (p.kind === 'up' || p.kind === 'up3') return r ? q + 1 : q;
  if (p.kind === 'left') return r;
  return q;
}

// ---------------------------------------------------------------- word problems

function wp(q) {
  const t = q.prompt; let m;
  if ((m = t.match(/cost RM (\d+(?:\.\d+)?) each\. .* buys (\d+) .* pays with a RM (\d+) note/))) return { kind: 'buy', P: num(m[1]), n: N(m[2]), note: num(m[3]) };
  if ((m = t.match(/takes (\d+) Grab rides\. Each ride costs RM (\d+(?:\.\d+)?)\. They pay with RM (\d+)\./))) return { kind: 'buy', P: num(m[2]), n: N(m[1]), note: num(m[3]) };
  if ((m = t.match(/sells (\d+) .+? at RM (\d+(?:\.\d+)?) each and (\d+) .+? at RM (\d+(?:\.\d+)?) each/))) return { kind: 'two', n1: N(m[1]), p1: num(m[2]), n2: N(m[3]), p2: num(m[4]) };
  if ((m = t.match(/buys (\d+) boxes of markers\. Each box has (\d+) markers\. .* among (\d+) classes/))) return { kind: 'share', b: N(m[1]), per: N(m[2]), c: N(m[3]) };
  if ((m = t.match(/rope (\d+(?:\.\d+)?) m long is cut into (\d+) equal pieces\. .* uses (\d+) of/))) return { kind: 'rope', L: num(m[1]), n: N(m[2]), u: N(m[3]) };
  const ns = numbersIn(t).map(N);
  return { kind: 'pack', a: ns[0], b: ns[1] };
}
const tens = (b) => Math.floor(b / 10); const ones = (b) => b % 10;

// ---------------------------------------------------------------- solvers

export const SOLVERS = {
  'm06.order-of-operations': (q) => {
    let m;
    if ((m = q.prompt.match(/so that (.*) equals (\d+)\?/))) return { text: q.options.find((o) => v(calc(o)) === N(m[2])) };
    m = q.prompt.match(/^Work out (.*)\.$/);
    return { value: v(calc(m[1])) };
  },
  'm06.laws': (q) => {
    let m;
    if ((m = q.prompt.match(/same answer as (\d+) × (\d+)\?/))) return { text: q.options.find((o) => v(calc(o)) === N(m[1]) * N(m[2])) };
    m = q.prompt.match(/^Work out (\d+) × (\d+) in your head/);
    return { value: N(m[1]) * N(m[2]) };
  },
  'm06.multiply': (q) => {
    let m;
    if ((m = q.prompt.match(/\?:\s+([\d?]+) × (\d+) = (.+)\. What/))) {
      for (let x = 0; x <= 9; x++) if (N(m[1].replace('?', x)) * N(m[2]) === N(m[3])) return { value: x };
    }
    m = q.prompt.match(new RegExp(`^Work out (${NUM}) × (\\d+)\\.$`));
    return { value: N(m[1]) * N(m[2]) };
  },
  'm06.estimate-product': (q) => {
    let m;
    if ((m = q.prompt.match(new RegExp(`Round (${NUM}) to the nearest (hundred|thousand) and (\\d+) to the nearest ten`)))) return { value: rnd(N(m[1]), m[2] === 'hundred' ? 100 : 1000) * rnd(N(m[3]), 10) };
    m = q.prompt.match(new RegExp(`Estimate (${NUM}) × (\\d+) by first rounding .* to the nearest (hundred|thousand)`));
    return { value: rnd(N(m[1]), m[3] === 'hundred' ? 100 : 1000) * N(m[2]) };
  },
  'm06.divide': (q) => {
    let m;
    if ((m = q.prompt.match(/divided by (\d+), the answer is (\d+) remainder (\d+)/))) return { value: N(m[2]) * N(m[1]) + N(m[3]) };
    m = q.prompt.match(new RegExp(`^Work out (${NUM}) ÷ (\\d+)\\.`));
    const a = N(m[1]); const b = N(m[2]);
    if (/with a remainder/.test(q.prompt)) return { text: `${Math.floor(a / b)} r ${a % b}` };
    return { value: a / b };
  },
  'm06.interpret-remainder': (q) => ({ value: storyAnswer(story(q)) }),
  'm06.decimals': (q) => {
    let m;
    if ((m = q.prompt.match(/costs RM (\d+(?:\.\d+)?)\. How much do (\d+) of them cost/))) return { value: v(qmul(num(m[1]), Q(m[2]))) };
    m = q.prompt.match(new RegExp(`^Work out (${NUM}) ([×÷]) (\\d+)\\.$`));
    return { value: v(m[2] === '×' ? qmul(num(m[1]), Q(m[3])) : qdiv(num(m[1]), Q(m[3]))) };
  },
  'm06.word-problems': (q) => {
    const p = wp(q);
    if (p.kind === 'buy') return { value: v(qsub(p.note, qmul(p.P, Q(p.n)))) };
    if (p.kind === 'two') return { value: v(qadd(qmul(p.p1, Q(p.n1)), qmul(p.p2, Q(p.n2)))) };
    if (p.kind === 'share') return { value: (p.b * p.per) / p.c };
    if (p.kind === 'rope') return { value: v(qmul(qdiv(p.L, Q(p.n)), Q(p.n - p.u))) };
    return { value: p.a * p.b };
  },
};

// ---------------------------------------------------------------- misconception rules

const decParts = (q) => { const m = q.prompt.match(new RegExp(`^Work out (${NUM}) ([×÷]) (\\d+)\\.$`)); return m ? { a: m[1], n: N(m[3]) } : null; };

export const MIS = {
  'm06.order-of-operations': {
    'BODMAS-LEFT-RIGHT': (q) => [v(calc(q.prompt.match(/^Work out (.*)\.$/)[1], 'lr'))],
    'BRACKETS-IGNORED': (q) => [v(calc(q.prompt.match(/^Work out (.*)\.$/)[1], 'nobr'))],
    'DIV-LEFT-RIGHT': (q) => [v(calc(q.prompt.match(/^Work out (.*)\.$/)[1], 'mulfirst'))],
    'ONE-STEP-ONLY': (q) => [v(firstStep(q.prompt.match(/^Work out (.*)\.$/)[1]))],
    'BRACKETS-WRONG-PLACE': (q) => { const T = N(q.prompt.match(/equals (\d+)\?/)[1]); return q.options.filter((o) => v(calc(o)) !== T); },
  },
  'm06.laws': {
    'DIST-PARTIAL': (q) => {
      let m;
      if ((m = q.prompt.match(/same answer as (\d+) × (\d+)\?/))) return q.options.filter((o) => (o.match(/×/g) || []).length === 1 && o.startsWith(`${m[1]} × `));
      m = q.prompt.match(/Work out (\d+) × (\d+) in your head\. \(Hint: \d+ = (\d+) ([+-]) (\d+)\.\)/);
      return [N(m[1]) * N(m[3]) + (m[4] === '-' ? -1 : 1) * N(m[5])];
    },
    'DIST-WRONG-SIGN': (q) => {
      let m;
      if ((m = q.prompt.match(/same answer as (\d+) × (\d+)\?/))) {
        const n = N(m[2]);
        return q.options.filter((o) => { const k = o.match(/^(\d+) × (\d+) ([+-]) \d+ × (\d+)$/); return k && (k[3] === '+' ? N(k[2]) - N(k[4]) : N(k[2]) + N(k[4])) === n; });
      }
      m = q.prompt.match(/Work out (\d+) × (\d+) in your head\. \(Hint: \d+ = (\d+) ([+-]) (\d+)\.\)/);
      return [N(m[1]) * N(m[3]) + (m[4] === '-' ? 1 : -1) * N(m[1]) * N(m[5])];
    },
    'ONE-STEP-ONLY': (q) => { const m = q.prompt.match(/Work out (\d+) × (\d+) in your head\. \(Hint: \d+ = (\d+)/); return [N(m[1]) * N(m[3])]; },
  },
  'm06.multiply': {
    'MULT-NO-CARRY': (q) => { const m = q.prompt.match(new RegExp(`^Work out (${NUM}) × (\\d+)\\.$`)); return [noCarry(N(m[1]), N(m[2]))]; },
    'MULT-CARRY-FIRST': (q) => { const m = q.prompt.match(new RegExp(`^Work out (${NUM}) × (\\d+)\\.$`)); return [carryFirst(N(m[1]), N(m[2]))]; },
    'PLACE-HOLDER': (q) => { const m = q.prompt.match(new RegExp(`^Work out (${NUM}) × (\\d+)\\.$`)); const a = N(m[1]); const b = N(m[2]); return [a * ones(b) + a * tens(b)]; },
    'PARTIAL-PRODUCT': (q) => { const m = q.prompt.match(new RegExp(`^Work out (${NUM}) × (\\d+)\\.$`)); const a = N(m[1]); const b = N(m[2]); return [a * tens(b) * 10, a * ones(b)]; },
    'MISSING-DIGIT-NO-CARRY': (q) => {
      const m = q.prompt.match(/\?:\s+([\d?]+) × (\d+) = (.+)\. What/);
      const pos = m[1].length - 1 - m[1].indexOf('?'); const b = N(m[2]); const r = N(m[3]);
      const rk = Math.floor(r / 10 ** pos) % 10;
      const out = []; for (let x = 0; x <= 9; x++) if ((x * b) % 10 === rk) out.push(x);
      return out;
    },
  },
  'm06.estimate-product': {
    'EST-POWER-OF-TEN': (q) => { const e = SOLVERS['m06.estimate-product'](q).value; return [e / 10, e * 10]; },
    'ROUND-TRUNCATE': (q) => {
      let m;
      if ((m = q.prompt.match(new RegExp(`Round (${NUM}) to the nearest (hundred|thousand) and (\\d+) to the nearest ten`)))) { const k = m[2] === 'hundred' ? 100 : 1000; return [Math.floor(N(m[1]) / k) * k * Math.floor(N(m[3]) / 10) * 10]; }
      m = q.prompt.match(new RegExp(`Estimate (${NUM}) × (\\d+) by first rounding .* to the nearest (hundred|thousand)`)); const k = m[3] === 'hundred' ? 100 : 1000;
      return [Math.floor(N(m[1]) / k) * k * N(m[2])];
    },
    'EST-EXACT': (q) => { const ns = numbersIn(q.prompt).map(N).filter((x) => x > 9); const m = q.prompt.match(new RegExp(`estimate (${NUM}) × (\\d+)|Estimate (${NUM}) × (\\d+)`)); return [m[1] ? N(m[1]) * N(m[2]) : N(m[3]) * N(m[4]), ns[0] * ns[1]]; },
  },
  'm06.divide': {
    'DIV-ZERO-DROPPED': (q) => { const s = SOLVERS['m06.divide'](q).value; return [N(String(s).replace(/0/g, ''))]; },
    'DIV-DIGITWISE': (q) => { const m = q.prompt.match(new RegExp(`^Work out (${NUM}) ÷ (\\d+)\\.`)); return [N(m[1].replace(/ /g, '').split('').map((c) => Math.floor(Number(c) / N(m[2]))).join(''))]; },
    'REMAINDER-AS-DECIMAL': (q) => { const t = SOLVERS['m06.divide'](q).text.split(' r '); return [`${t[0]}.${t[1]}`]; },
    'REM-TOO-BIG': (q) => { const m = q.prompt.match(new RegExp(`^Work out (${NUM}) ÷ (\\d+)\\.`)); const a = N(m[1]); const b = N(m[2]); return [`${Math.floor(a / b) - 1} r ${(a % b) + b}`]; },
    'REM-LEFT-OUT': (q) => { const m = q.prompt.match(/divided by (\d+), the answer is (\d+) remainder (\d+)/); return [N(m[1]) * N(m[2])]; },
    'REM-SUBTRACTED': (q) => { const m = q.prompt.match(/divided by (\d+), the answer is (\d+) remainder (\d+)/); return [N(m[1]) * N(m[2]) - N(m[3])]; },
    'ONE-STEP-ONLY': (q) => { const m = q.prompt.match(/divided by (\d+), the answer is (\d+) remainder (\d+)/); return [N(m[1]) * (N(m[2]) + N(m[3]))]; },
  },
  'm06.interpret-remainder': {
    'REMAINDER-IGNORED': (q) => { const p = story(q); const k = Math.floor(p.total / p.c); return [p.kind.startsWith('up') ? k : k + 1]; },
    'REM-NOT-INTERPRETED': (q) => { const p = story(q); return [`${Math.floor(p.total / p.c)} r ${p.total % p.c}`]; },
    'ITEM-LEFT-OUT': (q) => { const p = story(q); return p.kind === 'up3' ? [Math.ceil(p.n / p.c)] : [Math.floor(p.h / p.c)]; },
    'WRONG-QUANTITY': (q) => { const p = story(q); return [Math.floor(p.total / p.c)]; },
  },
  'm06.decimals': {
    'DEC-MULT-POINT': (q) => { const r = SOLVERS['m06.decimals'](q).value; return [r * 10, r / 10]; },
    'DEC-DIV-POINT': (q) => { const r = SOLVERS['m06.decimals'](q).value; return [r * 10, r / 10]; },
    'DEC-MULT-PARTS': (q) => { const p = decParts(q); const [w, f] = p.a.split('.'); return [`${N(w) * p.n}.${N(f) * p.n}`]; },
  },
  'm06.word-problems': {
    'ONE-STEP-ONLY': (q) => { const p = wp(q); if (p.kind === 'buy') return [v(qmul(p.P, Q(p.n)))]; if (p.kind === 'share') return [p.b * p.per]; return [v(qdiv(p.L, Q(p.n)))]; },
    'ITEM-LEFT-OUT': (q) => {
      const p = wp(q);
      if (p.kind === 'buy') return [v(qsub(p.note, p.P))];
      if (p.kind === 'two') return [v(qmul(p.p1, Q(p.n1))), v(qmul(p.p2, Q(p.n2)))];
      if (p.kind === 'share') return [p.per / p.c];
      return [v(qsub(p.L, Q(p.u)))];
    },
    'DEC-MULT-POINT': (q) => {
      const p = wp(q);
      if (p.kind === 'buy') return [v(qsub(p.note, qdiv(qmul(p.P, Q(p.n)), Q(10))))];
      return [v(qdiv(qadd(qmul(p.p1, Q(p.n1)), qmul(p.p2, Q(p.n2))), Q(10)))];
    },
    'WRONG-QUANTITY': (q) => { const p = wp(q); if (p.kind === 'two') return [v(qmul(qadd(p.p1, p.p2), Q(p.n1 + p.n2)))]; return [v(qmul(qdiv(p.L, Q(p.n)), Q(p.u)))]; },
    'PLACE-HOLDER': (q) => { const p = wp(q); return [p.a * ones(p.b) + p.a * tens(p.b)]; },
    'PARTIAL-PRODUCT': (q) => { const p = wp(q); return [p.a * tens(p.b) * 10, p.a * ones(p.b)]; },
    'OP-SWAP': (q) => { const p = wp(q); return [p.a + p.b]; },
  },
};
