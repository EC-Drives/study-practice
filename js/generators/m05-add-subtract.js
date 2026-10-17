// m05 Addition and subtraction: column methods, estimating, checking with the inverse, missing
// digits, decimals and money, integers (negative numbers) and their contexts, finding an unknown,
// writing an equation, bar-model word problems. Patterns and ranges follow the CLO's generator
// guide (m05). Every wrong option is built by one named misconception and carries its code.
// Decimals are held as whole numbers of hundredths or thousandths and only turned into text at the end.

import { choices, typedMisconceptions, nearMiss, numericAnswer, fmtInt, rm, person } from './core.js';

const T = 'm05-addition-and-subtraction';
const SKILL = {
  colAdd: 'column addition of whole numbers', colSub: 'column subtraction of whole numbers', estimate: 'estimating sums and differences',
  inverse: 'checking with the inverse operation', mixed: 'mixed addition and subtraction of whole numbers', missing: 'missing digits in calculations',
  backwards: 'working backwards with inverse operations', addDec: 'adding decimals', subDec: 'subtracting decimals', context: 'adding and subtracting decimals in context',
  integers: 'adding and subtracting integers', intContext: 'integers in context (temperature, floors)',
  unknown: 'finding an unknown in an addition or subtraction', equation: 'writing an equation with a letter', bar: 'multi-step word problems (bar models)',
};

export const EXTRA_CODES = {
  'COL-EXCHANGE-NOT-REDUCED': 'Exchanges from the next column but forgets to take 1 away from that column',
  'EST-EXACT': 'Works out the exact answer instead of rounding first to estimate',
  'SUB-REVERSED': 'Takes the numbers away the wrong way round (b - a instead of a - b)',
  'INV-CHECK-WRONG-PAIR': 'Uses the inverse operation on the wrong pair of numbers',
  'INVERSE-ONE-STEP': 'Working backwards, undoes only one of the steps with the inverse operation',
  'MISSING-DIGIT-NO-CARRY': 'Finds a missing digit from its own column but forgets the carry (or exchange) from the column before',
  'DEC-NO-EXCHANGE-WHOLE': 'Makes every decimal digit up to 10 (instead of 9) when finding what to add to reach a whole number',
  'CHANGE-SPLIT': 'Takes the ringgit and the sen away separately and forgets the ringgit used for the sen (RM 20 - RM 7.65 = RM 13.35)',
  'ITEM-LEFT-OUT': 'Leaves out one of the amounts in a multi-step problem',
  'WRONG-QUANTITY': 'Answers with a different quantity from the one the question asks for',
  'MORE-THAN-AS-AMOUNT': 'Uses "n more than" as the amount itself instead of adding n on',
  'NEG-WRONG-SIGN': 'Gets the size of the answer right but gives it the wrong sign',
  'NEG-ADD-SIZES': 'Adds the sizes of the numbers and keeps the minus sign (-7 + 12 = -19)',
  'NEG-SUB-SIZES': 'Subtracts the sizes of the numbers and keeps the minus sign (-5 - 3 = -2)',
  'NEG-SKIP-ZERO': 'Does not count zero (or floor 0) as a step when counting across it',
  'ONE-STEP-ONLY': 'Does only the first step (or only one of the repeated steps) of a multi-step problem',
  'BAR-NO-HALVE': 'Takes away the difference but forgets to halve what is left (two equal bars)',
  'BAR-HALVE-FIRST': 'Halves the total first and then takes away the difference',
  'WRONG-START': 'Measures from zero instead of from the given starting point',
  'UNIT-MIXED-SAME': 'Treats a measurement in one unit as if it were in the other unit (875 g as 875 kg)',
};

// ---------------------------------------------------------------- helpers

/** u / 10^p as text: trailing zeros dropped, thousands spaced. */
function fx(u, p = 0) {
  const neg = u < 0; const a = Math.abs(u); const s = 10 ** p;
  const ip = Math.floor(a / s);
  const fp = p ? String(a % s).padStart(p, '0').replace(/0+$/, '') : '';
  return `${neg ? '-' : ''}${fmtInt(ip)}${fp ? `.${fp}` : ''}`;
}
const dpOf = (u, p) => { let k = p; while (k > 0 && u % 10 === 0) { u /= 10; k--; } return k; };
const digits = (n) => String(n).split('').map(Number).reverse(); // units first
/** Column addition that writes only the units digit of each column total (the last column in full). */
function addNoCarry(a, b) {
  const A = digits(a); const B = digits(b); const L = Math.max(A.length, B.length); let v = 0;
  for (let i = 0; i < L; i++) { const s = (A[i] || 0) + (B[i] || 0); v += (i === L - 1 ? s : s % 10) * 10 ** i; }
  return v;
}
/** Column subtraction that takes the smaller digit from the larger in every column. */
function subSmallFromLarge(a, b) { const A = digits(a); const B = digits(b); let v = 0; for (let i = 0; i < A.length; i++) v += Math.abs(A[i] - (B[i] || 0)) * 10 ** i; return v; }
/** Column subtraction that exchanges but never takes 1 from the next column. */
function subNoReduce(a, b) { const A = digits(a); const B = digits(b); let v = 0; for (let i = 0; i < A.length; i++) { const x = A[i]; const y = B[i] || 0; v += (x < y ? x + 10 - y : x - y) * 10 ** i; } return v; }
const carries = (a, b) => { const A = digits(a); const B = digits(b); let c = 0; let n = 0; for (let i = 0; i < Math.max(A.length, B.length); i++) { const s = (A[i] || 0) + (B[i] || 0) + c; c = s >= 10 ? 1 : 0; n += c; } return n; };
const exchanges = (a, b) => { const A = digits(a); const B = digits(b); let br = 0; let n = 0; for (let i = 0; i < A.length; i++) { const x = A[i] - br; const y = B[i] || 0; br = x < y ? 1 : 0; n += br; } return n; };

// ---------------------------------------------------------------- g01 column addition and subtraction

const ADD_CTX = [
  (a, b) => `On Saturday, ${fmtInt(a)} people visited the Penang Bird Park. On Sunday, ${fmtInt(b)} people visited. How many people visited altogether?`,
  (a, b) => `A shop sold ${fmtInt(a)} durians in June and ${fmtInt(b)} durians in July. How many durians did it sell in the two months?`,
  (a, b) => `A library has ${fmtInt(a)} fiction books and ${fmtInt(b)} non-fiction books. How many books does it have altogether?`,
];
const SUB_CTX = [
  (a, b) => `On Saturday, ${fmtInt(a)} people watched a football match at a stadium in Kuala Lumpur. On Sunday, ${fmtInt(b)} people watched. How many more people watched on Saturday than on Sunday?`,
  (a, b) => `A factory made ${fmtInt(a)} cans of drink. It has sold ${fmtInt(b)} of them. How many cans are left?`,
  (a, b) => `A school wants to raise RM ${fmtInt(a)} for a new library. So far it has raised RM ${fmtInt(b)}. How much more does it need?`,
];

const column = {
  id: 'm05.column-add-subtract', topicId: T, subtopicId: 'm05-s1', skill: SKILL.colAdd,
  title: 'Column addition and subtraction (D1 4-digit; D2 5-digit and word problems; D3 work backwards: think of a number)',
  difficulties: [1, 2, 3],
  check: { min: 0, integer: true },
  make(rng, d) {
    if (d === 3) return thinkOfNumber(rng);
    for (;;) {
      const add = rng.chance(0.5);
      const lo = d === 1 ? 1000 : 10000; const hi = d === 1 ? 9999 : 99999;
      let a; let b;
      if (add) { a = rng.int(lo, hi); b = rng.int(lo, hi); if (a + b > (d === 1 ? 9999 : 99999)) continue; if (carries(a, b) < (d === 1 ? 1 : 2)) continue; } else {
        a = rng.chance(0.25) ? (d === 1 ? rng.int(2, 9) * 1000 + (rng.chance(0.5) ? 0 : rng.int(1, 9) * 100) : rng.int(2, 9) * 10000 + (rng.chance(0.5) ? 0 : rng.int(1, 9) * 1000)) : rng.int(lo + 1000, hi);
        b = rng.int(lo, a - 200);
        if (b < lo || exchanges(a, b) < (d === 1 ? 1 : 2)) continue;
      }
      const r = add ? a + b : a - b;
      const ctx = d === 2 && rng.chance(0.45);
      const prompt = ctx ? (add ? rng.pick(ADD_CTX)(a, b) : rng.pick(SUB_CTX)(a, b)) : `Work out ${fmtInt(a)} ${add ? '+' : '-'} ${fmtInt(b)}.`;
      const realMoney = ctx && /RM/.test(prompt);
      const show = (v) => (realMoney ? `RM ${fmtInt(v)}` : fmtInt(v));
      const solution = add
        ? `Line up the digits and add each column from the right, carrying when a column makes 10 or more: ${fmtInt(a)} + ${fmtInt(b)} = ${fmtInt(r)}. Check: ${fmtInt(r)} - ${fmtInt(b)} = ${fmtInt(a)}. Answer: ${show(r)}`
        : `Line up the digits and subtract each column from the right. When the top digit is smaller, exchange 1 from the next column (and take 1 off that column): ${fmtInt(a)} - ${fmtInt(b)} = ${fmtInt(r)}. Check: ${fmtInt(r)} + ${fmtInt(b)} = ${fmtInt(a)}. Answer: ${show(r)}`;
      const items = add ? [
        { text: show(addNoCarry(a, b)), code: 'COL-NO-CARRY', why: 'It looks like you wrote down each column total but did not carry the extra ten into the next column.' },
      ] : [
        { text: show(subSmallFromLarge(a, b)), code: 'COL-SMALLER-FROM-LARGER', why: 'It looks like you took the smaller digit from the larger one in every column. When the top digit is smaller, exchange from the next column instead.' },
        { text: show(subNoReduce(a, b)), code: 'COL-EXCHANGE-NOT-REDUCED', why: 'It looks like you exchanged from the next column but did not take 1 away from that column afterwards.' },
      ];
      items.push(nearMiss(show(r + (rng.chance(0.5) ? 10 : -10)), 'Check each column again, and check with the inverse operation.'));
      items.push(nearMiss(show(r + (rng.chance(0.5) ? 100 : -100)), 'Check each column again, and check with the inverse operation.'));
      const skill = add ? SKILL.colAdd : SKILL.colSub;
      try {
        if (d === 2 && rng.chance(0.4)) {
          const t = typedMisconceptions(fmtInt(r), items.filter((i) => i.code !== 'NEAR-MISS').map((i) => ({ ...i, text: i.text.replace('RM ', '') })), { code: add ? 'COL-NO-CARRY' : 'COL-SMALLER-FROM-LARGER', why: add ? 'Carry the extra ten into the next column.' : 'When the top digit is smaller, exchange 1 from the next column.' });
          return { type: 'numeric', prompt, answer: numericAnswer(r, [fmtInt(r), String(r), ...(realMoney ? [`RM ${fmtInt(r)}`] : [])]), solution, ...t, skill };
        }
        return { type: 'mcq', prompt, ...choices(rng, show(r), items, null), solution, skill };
      } catch { /* draw again */ }
    }
  },
};

function thinkOfNumber(rng) {
  for (;;) {
    const p = person(rng);
    if (rng.chance(0.5)) {
      // n + A - B = C
      const n = rng.int(1000, 50000); const A = rng.int(1000, 30000); const B = rng.int(1000, 30000);
      const C = n + A - B;
      if (C <= 0 || C === n) continue;
      const prompt = `${p.name} thinks of a number. ${p.He} adds ${fmtInt(A)} to it, then subtracts ${fmtInt(B)}. The answer is ${fmtInt(C)}. What number did ${p.he} think of?`;
      const solution = `Work backwards and undo each step with the inverse operation. Undo "subtract ${fmtInt(B)}": ${fmtInt(C)} + ${fmtInt(B)} = ${fmtInt(C + B)}. Undo "add ${fmtInt(A)}": ${fmtInt(C + B)} - ${fmtInt(A)} = ${fmtInt(n)}. Check: ${fmtInt(n)} + ${fmtInt(A)} - ${fmtInt(B)} = ${fmtInt(C)}. Answer: ${fmtInt(n)}`;
      const items = [
        C + A - B > 0 ? { text: fmtInt(C + A - B), code: 'INVERSE-WRONG', why: `It looks like you did the same operations again (add ${fmtInt(A)}, subtract ${fmtInt(B)}). Working backwards, use the inverse of each step.` } : null,
        C - A - B > 0 ? { text: fmtInt(C - A - B), code: 'INVERSE-ONE-STEP', why: `You undid "add ${fmtInt(A)}" correctly, but "subtract ${fmtInt(B)}" must be undone by ADDING ${fmtInt(B)}.` } : null,
        { text: fmtInt(C + A + B), code: 'INVERSE-ONE-STEP', why: `You undid "subtract ${fmtInt(B)}" correctly, but "add ${fmtInt(A)}" must be undone by SUBTRACTING ${fmtInt(A)}.` },
      ];
      try { return { type: 'mcq', prompt, ...choices(rng, fmtInt(n), items, (i) => nearMiss(fmtInt(n + i * 1000), 'Undo each step with the inverse operation, starting from the last step.')), solution, marks: 2, skill: SKILL.backwards }; } catch { continue; }
    }
    // X - n + Y = C
    const X = rng.int(2, 9) * 10000; const n = rng.int(1000, X - 1000); const Y = rng.int(1000, 30000);
    const C = X - n + Y;
    const prompt = `${p.name} thinks of a number. ${p.He} subtracts ${p.his} number from ${fmtInt(X)}, then adds ${fmtInt(Y)} to the result. ${p.He} ends up with ${fmtInt(C)}. What number did ${p.he} think of?`;
    const solution = `Work backwards. Before adding ${fmtInt(Y)}, ${p.he} had ${fmtInt(C)} - ${fmtInt(Y)} = ${fmtInt(C - Y)}. So ${fmtInt(X)} - (the number) = ${fmtInt(C - Y)}, and the number is ${fmtInt(X)} - ${fmtInt(C - Y)} = ${fmtInt(n)}. Answer: ${fmtInt(n)}`;
    const items = [
      { text: fmtInt(C - Y + X), code: 'SUB-REVERSED', why: `It looks like you treated it as (the number) - ${fmtInt(X)}. ${p.He} took the number away FROM ${fmtInt(X)}, so the number is ${fmtInt(X)} - ${fmtInt(C - Y)}.` },
      { text: fmtInt(C - Y), code: 'ONE-STEP-ONLY', why: `${fmtInt(C - Y)} is what ${p.he} had before adding ${fmtInt(Y)}. That is ${fmtInt(X)} minus the number, so one more step is needed.` },
      X - C - Y > 0 ? { text: fmtInt(X - C - Y), code: 'INVERSE-ONE-STEP', why: `It looks like you subtracted ${fmtInt(Y)} at the wrong point. Undo "add ${fmtInt(Y)}" first: ${fmtInt(C)} - ${fmtInt(Y)}.` } : null,
    ];
    try { return { type: 'mcq', prompt, ...choices(rng, fmtInt(n), items, (i) => nearMiss(fmtInt(n + i * 1000), 'Undo each step with the inverse operation, starting from the last step.')), solution, marks: 2, skill: SKILL.backwards }; } catch { /* draw again */ }
  }
}

// ---------------------------------------------------------------- g02 estimating

const roundTo = (n, q) => Math.floor((n + q / 2) / q) * q;
const PLACE = { 10: 'ten', 100: 'hundred', 1000: 'thousand', 10000: 'ten thousand' };

const estimate = {
  id: 'm05.estimate', topicId: T, subtopicId: 'm05-s1', skill: SKILL.estimate,
  title: 'Estimate a sum or difference by rounding first (D1 4-digit to the nearest 1000 or 100; D2 5-digit)',
  difficulties: [1, 2],
  check: { min: 0, integer: true },
  make(rng, d) {
    for (;;) {
      const q = d === 1 ? rng.pick([1000, 1000, 100]) : rng.pick([1000, 10000]);
      const lo = d === 1 ? 1000 : 10000; const hi = d === 1 ? 9999 : 99999;
      const add = rng.chance(0.55);
      const a = rng.int(lo, hi); const b = rng.int(lo, add ? hi : a);
      if (add && a + b > 2 * hi) continue;
      const ra = roundTo(a, q); const rb = roundTo(b, q);
      const est = add ? ra + rb : ra - rb;
      if (est <= 0) continue;
      const exact = add ? a + b : a - b;
      const q2 = q / 10;
      const est2 = add ? roundTo(a, q2) + roundTo(b, q2) : roundTo(a, q2) - roundTo(b, q2);
      const fa = Math.floor(a / q) * q; const fb = Math.floor(b / q) * q;
      const trunc = add ? fa + fb : fa - fb;
      if (fa === ra && fb === rb) continue; // rounding must matter
      const prompt = `Round each number to the nearest ${PLACE[q]}, then estimate ${fmtInt(a)} ${add ? '+' : '-'} ${fmtInt(b)}.`;
      const solution = `${fmtInt(a)} rounds to ${fmtInt(ra)} and ${fmtInt(b)} rounds to ${fmtInt(rb)}. ${fmtInt(ra)} ${add ? '+' : '-'} ${fmtInt(rb)} = ${fmtInt(est)}. Answer: ${fmtInt(est)}`;
      const items = [
        { text: fmtInt(exact), code: 'EST-EXACT', why: `${fmtInt(exact)} is the exact answer. An estimate rounds the numbers first, which makes the calculation easy.` },
        trunc > 0 ? { text: fmtInt(trunc), code: 'ROUND-TRUNCATE', why: `It looks like you rounded by cutting off digits (${fmtInt(a)} -> ${fmtInt(fa)}, ${fmtInt(b)} -> ${fmtInt(fb)}). Round to the NEAREST ${PLACE[q]}.` } : null,
        { text: fmtInt(est2), code: 'ROUND-WRONG-PLACE', why: `It looks like you rounded to the nearest ${PLACE[q2]}. The question asks for the nearest ${PLACE[q]}.` },
      ];
      try { return { type: 'mcq', prompt, ...choices(rng, fmtInt(est), items, (i) => nearMiss(fmtInt(est + (i % 2 ? q : -q) * Math.ceil(i / 2)), `Round each number to the nearest ${PLACE[q]} first.`)), solution }; } catch { /* draw again */ }
    }
  },
};

// ---------------------------------------------------------------- g03 checking with the inverse

const inverseCheck = {
  id: 'm05.inverse-check', topicId: T, subtopicId: 'm05-s1', skill: SKILL.inverse,
  title: 'Which calculation checks this one? (inverse operations; D1 4-digit, D2 5-digit and true or false)',
  difficulties: [1, 2],
  check: {},
  make(rng, d) {
    for (;;) {
      const lo = d === 1 ? 1000 : 10000; const hi = d === 1 ? 9999 : 99999;
      const add = rng.chance(0.5);
      let a; let b; let c;
      if (add) { a = rng.int(lo, hi); b = rng.int(lo, hi); c = a + b; if (c > hi) continue; } else { a = rng.int(lo * 2, hi); b = rng.int(lo, a - lo); c = a - b; }
      if (a === b || b === c || a === c) continue;
      const F = fmtInt;
      const calc = `${F(a)} ${add ? '+' : '-'} ${F(b)} = ${F(c)}`;
      if (d === 2 && rng.chance(0.4)) {
        const good = rng.chance(0.5);
        const check = add ? (good ? `${F(c)} - ${F(b)}` : `${F(c)} + ${F(b)}`) : (good ? `${F(c)} + ${F(b)}` : `${F(c)} - ${F(b)}`);
        const target = add ? a : a;
        const prompt = `True or false: You can check that ${calc} by working out ${check}. If you get ${F(target)}, the ${add ? 'addition' : 'subtraction'} is correct.`;
        const solution = good
          ? `The inverse of ${add ? 'adding' : 'subtracting'} ${F(b)} is ${add ? 'subtracting' : 'adding'} ${F(b)}, so ${check} should give ${F(target)}. The statement is true. Answer: true`
          : `${check} uses the same operation again; it does not undo the calculation. The check should be ${add ? `${F(c)} - ${F(b)}` : `${F(c)} + ${F(b)}`}. The statement is false. Answer: false`;
        return { type: 'truefalse', prompt, answer: good, solution, misconceptions: { common: `To check, use the inverse: ${add ? 'subtraction undoes addition' : 'addition undoes subtraction'}.` }, codes: { common: 'INVERSE-WRONG' } };
      }
      const correct = add ? `${F(c)} - ${F(b)}` : `${F(c)} + ${F(b)}`;
      const items = add ? [
        { text: `${F(c)} + ${F(b)}`, code: 'INVERSE-WRONG', why: 'This adds again. To check an addition, use the inverse: subtraction.' },
        { text: `${F(b)} - ${F(c)}`, code: 'SUB-REVERSED', why: `This takes the larger number from the smaller one. Start with the answer: ${F(c)} - ${F(b)}.` },
        { text: `${F(a)} - ${F(b)}`, code: 'INV-CHECK-WRONG-PAIR', why: `This uses the two numbers that were added. Start with the answer, ${F(c)}, and take away one of the numbers.` },
      ] : [
        { text: `${F(c)} - ${F(b)}`, code: 'INVERSE-WRONG', why: 'This subtracts again. To check a subtraction, use the inverse: addition.' },
        { text: `${F(b)} - ${F(c)}`, code: 'SUB-REVERSED', why: `This is a subtraction the wrong way round. Add the answer and the number taken away: ${F(c)} + ${F(b)} should give ${F(a)}.` },
        { text: `${F(a)} + ${F(b)}`, code: 'INV-CHECK-WRONG-PAIR', why: `This adds the first two numbers. Add the ANSWER and the number taken away: ${F(c)} + ${F(b)} should give ${F(a)}.` },
      ];
      const prompt = `Which calculation could you use to check that ${calc}?`;
      const solution = add
        ? `Subtraction is the inverse of addition. Start with the answer and take away one of the numbers: ${correct} should give ${F(a)}. Answer: ${correct}`
        : `Addition is the inverse of subtraction. Add the answer and the number that was taken away: ${correct} should give ${F(a)}. Answer: ${correct}`;
      try { return { type: 'mcq', prompt, ...choices(rng, correct, items, null), solution }; } catch { /* draw again */ }
    }
  },
};

// ---------------------------------------------------------------- g04 missing digits

const missingDigit = {
  id: 'm05.missing-digit', topicId: T, subtopicId: 'm05-s1', skill: SKILL.missing,
  title: 'Find a missing digit in a column calculation (D2 addition with a carry; D3 subtraction with an exchange)',
  difficulties: [2, 3],
  check: { min: 0, max: 9, integer: true },
  make(rng, d) {
    for (;;) {
      const add = d === 2 ? rng.chance(0.8) : rng.chance(0.2);
      const len = 4;
      const lo = 10 ** (len - 1); const hi = 10 ** len - 1;
      let a; let b; let r;
      if (add) { a = rng.int(lo, hi); b = rng.int(lo, hi); r = a + b; if (r > hi) continue; } else { a = rng.int(lo * 2, hi); b = rng.int(lo, a - lo); r = a - b; }
      // hide one digit of the first number, in a column that receives a carry (or gives up an exchange)
      const pos = rng.int(1, len - 1); // place value 10^pos
      const lowA = a % 10 ** pos; const lowB = b % 10 ** pos;
      const flow = add ? (lowA + lowB >= 10 ** pos ? 1 : 0) : (lowA < lowB ? 1 : 0);
      if (!flow) continue;
      const D = Math.floor(a / 10 ** pos) % 10;
      if (pos === len - 1 && D === 0) continue;
      const shown = String(a).split('').map((c, i) => (i === len - 1 - pos ? '?' : c)).join('');
      const rDigit = Math.floor(r / 10 ** pos) % 10; const bDigit = Math.floor(b / 10 ** pos) % 10;
      const wrong = add ? ((rDigit - bDigit) % 10 + 10) % 10 : (rDigit + bDigit) % 10;
      if (wrong === D) continue;
      const prompt = `In this ${add ? 'addition' : 'subtraction'} one digit is missing, shown by ?:  ${shown} ${add ? '+' : '-'} ${b} = ${r}. What is the missing digit?`;
      const solution = add
        ? `Work from the right. The columns before it make a carry of 1 into the ${['ones', 'tens', 'hundreds', 'thousands', 'ten thousands'][pos]} column. So ? + ${bDigit} + 1 must end in ${rDigit}: ? = ${D}. Check: ${a} + ${b} = ${r}. Answer: ${D}`
        : `Work from the right. The ${['ones', 'tens', 'hundreds', 'thousands'][pos - 1]} column needs an exchange, so 1 is taken from the ${['ones', 'tens', 'hundreds', 'thousands', 'ten thousands'][pos]} column. So ? - 1 - ${bDigit} must end in ${rDigit}: ? = ${D}. Check: ${a} - ${b} = ${r}. Answer: ${D}`;
      const items = [{ text: String(wrong), code: 'MISSING-DIGIT-NO-CARRY', why: add ? `It looks like you forgot the carry of 1 from the column on the right. ${wrong} + ${bDigit} + 1 does not end in ${rDigit}.` : `It looks like you forgot the 1 taken away by the exchange in the column on the right. Check: ${shown.replace('?', wrong)} - ${b} is not ${r}.` }];
      try {
        if (rng.chance(0.6)) {
          const t = typedMisconceptions(String(D), items, { code: 'MISSING-DIGIT-NO-CARRY', why: 'Work from the right and remember the carries (or exchanges) between columns. Check your digit in the full calculation.' });
          return { type: 'numeric', prompt, answer: numericAnswer(D, [String(D)]), solution, ...t, marks: d };
        }
        return { type: 'mcq', prompt, ...choices(rng, String(D), items, (i) => { const x = (D + 2 * i) % 10; return x !== wrong ? nearMiss(String(x), 'Put your digit back into the calculation and check it.') : null; }), solution, marks: d };
      } catch { /* draw again */ }
    }
  },
};

// ---------------------------------------------------------------- g05 adding and subtracting decimals

/** A decimal with exactly p places, as thousandths. */
function decimal(rng, p, maxWhole) { for (;;) { const w = rng.int(0, maxWhole); const f = rng.int(1, 10 ** p - 1); if (f % 10 === 0 && p > 0) continue; return w * 1000 + f * 10 ** (3 - p); } }
const digitsOnly = (u) => { const t = fx(u, 3); return Number(t.replace('.', '').replace(/ /g, '')); };

const decimals = {
  id: 'm05.decimals', topicId: T, subtopicId: 'm05-s2', skill: SKILL.addDec,
  title: 'Add and subtract decimals (D1 1-2 dp; D2 different numbers of decimal places, up to 3 dp; D3 what must you add to make a whole number)',
  difficulties: [1, 2, 3],
  check: { min: 0 },
  make(rng, d) {
    if (d === 3) return complement(rng);
    for (;;) {
      const add = rng.chance(0.5);
      const pa = d === 1 ? rng.int(1, 2) : rng.int(1, 3); const pb = d === 1 ? rng.int(1, 2) : rng.int(1, 3);
      if (d === 2 && pa === pb) continue;
      let a = decimal(rng, pa, d === 1 ? 20 : 50); let b = decimal(rng, pb, d === 1 ? 20 : 50);
      if (!add && a < b) [a, b] = [b, a];
      if (a === b) continue;
      const P = Math.max(dpOf(a, 3), dpOf(b, 3));
      const s = 10 ** (3 - P); const A = a / s; const B = b / s; // in units of 10^-P
      const R = add ? A + B : A - B;
      if (R <= 0) continue;
      const ta = fx(a, 3); const tb = fx(b, 3);
      const items = [];
      // lining up the last digits instead of the points
      const da = digitsOnly(a); const db = digitsOnly(b);
      if (dpOf(a, 3) !== dpOf(b, 3)) { const w = add ? da + db : da - db; if (w > 0) items.push({ text: fx(w, P), code: 'DEC-ALIGN-RIGHT', why: `It looks like you lined up the last digits of ${ta} and ${tb}. Line up the decimal points instead (write ${dpOf(a, 3) < P ? `${ta} as ${fx(a, 3)}${'0'.repeat(P - dpOf(a, 3))}` : `${tb} as ${fx(b, 3)}${'0'.repeat(P - dpOf(b, 3))}`}).` }); }
      if (add) items.push({ text: fx(addNoCarry(A, B), P), code: 'COL-NO-CARRY', why: 'It looks like you did not carry when a column made 10 or more. Ten tenths make 1 whole; ten hundredths make 1 tenth.' });
      else {
        items.push({ text: fx(subSmallFromLarge(A, B), P), code: 'COL-SMALLER-FROM-LARGER', why: 'It looks like you took the smaller digit from the larger in each column. Fill empty places with zeros and exchange when the top digit is smaller.' });
        items.push({ text: fx(subNoReduce(A, B), P), code: 'COL-EXCHANGE-NOT-REDUCED', why: 'It looks like you exchanged but did not take 1 away from the next column.' });
      }
      const prompt = `Work out ${ta} ${add ? '+' : '-'} ${tb}.`;
      const pad = (u) => { const t = fx(u, 3); const k = dpOf(u, 3); return k < P ? `${t}${k ? '' : '.'}${'0'.repeat(P - k)}` : t; };
      const solution = `Line up the decimal points and fill empty places with zeros: ${pad(a)} ${add ? '+' : '-'} ${pad(b)}. ${add ? 'Add' : 'Subtract'} column by column from the right${add ? ', carrying when a column makes 10 or more' : ', exchanging when the top digit is smaller'}: ${fx(R, P)}. Answer: ${fx(R, P)}`;
      const skill = add ? SKILL.addDec : SKILL.subDec;
      try {
        if (d === 2 && rng.chance(0.35)) {
          const t = typedMisconceptions(fx(R, P), items, { code: 'DEC-ALIGN-RIGHT', why: 'Line up the decimal points, fill empty places with zeros, then work column by column.' });
          return { type: 'numeric', prompt, answer: numericAnswer(R / 10 ** P, [fx(R, P)]), solution, ...t, skill };
        }
        return { type: 'mcq', prompt, ...choices(rng, fx(R, P), items, (i) => { const v = R + (i % 2 ? 1 : -1) * 10 ** (Math.ceil(i / 2) - 1); return v > 0 ? nearMiss(fx(v, P), 'Line up the decimal points and work column by column.') : null; }), solution, skill };
      } catch { /* draw again */ }
    }
  },
};

function complement(rng) {
  for (;;) {
    const target = rng.pick([1, 10, 10, 20, 100]);
    const p = target === 1 ? rng.int(2, 3) : 2;
    const x = rng.int(1, target * 10 ** p - 1);
    if (String(x % 10 ** p).padStart(p, '0').includes('0')) continue;
    const ans = target * 10 ** p - x;
    if (ans % 10 === 0) continue;
    const tx = fx(x, p);
    const prompt = rng.chance(0.5) ? `What must you add to ${tx} to make exactly ${target}?` : `Find the missing number: ${tx} + ? = ${target}`;
    const solution = `Work out ${target} - ${tx}. Write ${target} as ${target}.${'0'.repeat(p)} and subtract, exchanging as you go: ${target}.${'0'.repeat(p)} - ${tx} = ${fx(ans, p)}. Check: ${tx} + ${fx(ans, p)} = ${target}. Answer: ${fx(ans, p)}`;
    // "make every digit up to 10": too big by 1 in each decimal place but the last
    const each = ans + Array.from({ length: p - 1 }, (_, i) => 10 ** (p - 1 - i)).reduce((s, v) => s + v, 0);
    const items = [
      { text: fx(each, p), code: 'DEC-NO-EXCHANGE-WHOLE', why: `It looks like you made every decimal digit up to 10. Only the last digit makes 10; the others make 9, because of the exchange. Check: ${tx} + ${fx(each, p)} = ${fx(x + each, p)}, not ${target}.` },
      target > 1 && x >= 10 ** p ? { text: fx(each + 10 ** p, p), code: 'DEC-NO-EXCHANGE-WHOLE', why: `It looks like you made every digit up to 10, including the ones. Check: ${tx} + ${fx(each + 10 ** p, p)} = ${fx(x + each + 10 ** p, p)}, not ${target}.` } : null,
      { text: fx(x + target * 10 ** p, p), code: 'OP-SWAP', why: `It looks like you added ${target}. To find what to add, work out ${target} - ${tx}.` },
    ];
    try { return { type: 'mcq', prompt, ...choices(rng, fx(ans, p), items, null), solution, marks: 2, skill: SKILL.subDec }; } catch { /* draw again */ }
  }
}

// ---------------------------------------------------------------- g06, g07 money and measures in context

const FOOD = [['nasi lemak', 350, 650], ['teh tarik', 180, 320], ['a piece of kuih', 80, 250], ['roti canai', 150, 300], ['char kway teow', 700, 1200], ['cendol', 300, 600], ['a curry puff', 120, 250], ['iced Milo', 250, 450]];
const SHOP = [['a book', 500, 1890], ['a pencil case', 450, 1550], ['a T-shirt', 1590, 3990], ['a notebook', 290, 990], ['a water bottle', 690, 2490]];

const money = {
  id: 'm05.money-measures', topicId: T, subtopicId: 'm05-s2', skill: SKILL.context,
  title: 'Decimals in context (D1 change from a note; D2 several items or lengths; D3 mixed units: kg and g, km and m)',
  difficulties: [1, 2, 3],
  check: { min: 0 },
  make(rng, d) {
    if (d === 3) return mixedUnits(rng);
    if (d === 2 && rng.chance(0.35)) return plank(rng);
    for (;;) {
      const p = person(rng);
      const n = d === 1 ? 1 : rng.int(2, 3);
      const items = d === 1 ? [rng.pick(SHOP)] : rng.sample(FOOD, n);
      const prices = items.map(([, lo, hi]) => rng.int(lo / 5, hi / 5) * 5);
      const total = prices.reduce((a, b) => a + b, 0);
      const note = [1000, 2000, 5000, 10000].find((x) => x > total + 100);
      if (!note || total % 100 === 0) continue;
      const change = note - total;
      const list = items.map(([w], i) => `${w} for ${rm(prices[i] / 100)}`);
      const prompt = d === 1
        ? `${p.name} pays for ${items[0][0]} costing ${rm(total / 100)} with a ${rm(note / 100)} note. How much change does ${p.he} get?`
        : `At a hawker stall, ${p.name} buys ${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}. ${p.He} pays with a ${rm(note / 100)} note. How much change does ${p.he} get?`;
      const solution = d === 1
        ? `Change = ${rm(note / 100)} - ${rm(total / 100)}. Write ${rm(note / 100)} as ${(note / 100).toFixed(2)} and subtract: ${(note / 100).toFixed(2)} - ${(total / 100).toFixed(2)} = ${(change / 100).toFixed(2)}. Answer: ${rm(change / 100)}`
        : `Total: ${prices.map((x) => rm(x / 100)).join(' + ')} = ${rm(total / 100)}. Change: ${rm(note / 100)} - ${rm(total / 100)} = ${rm(change / 100)}. Answer: ${rm(change / 100)}`;
      const wrong = [];
      if (total % 100) wrong.push({ text: rm((change + 100) / 100), code: 'CHANGE-SPLIT', why: `It looks like you took away the ringgit and the sen separately (${rm(note / 100)} - RM ${Math.floor(total / 100)} and 100 - ${total % 100} sen). One more ringgit is used up by the sen, so take away 1 more.` });
      if (d === 1) wrong.push({ text: rm((note + total) / 100), code: 'OP-SWAP', why: 'It looks like you added. Change is what is left: take the cost away from the money paid.' });
      else {
        wrong.push({ text: rm(total / 100), code: 'WRONG-QUANTITY', why: `${rm(total / 100)} is how much ${p.he} spent. The question asks for the change: ${rm(note / 100)} - ${rm(total / 100)}.` });
        const miss = rng.int(0, n - 1);
        wrong.push({ text: rm((change + prices[miss]) / 100), code: 'ITEM-LEFT-OUT', why: `It looks like you left out the ${items[miss][0]} (${rm(prices[miss] / 100)}). Add up all ${n} items first.` });
      }
      const noRed = subNoReduce(note, total);
      if (noRed !== change) wrong.push({ text: rm(noRed / 100), code: 'COL-EXCHANGE-NOT-REDUCED', why: 'It looks like you exchanged but did not take 1 away from the next column. Write the note as RM __.00 and subtract carefully.' });
      try {
        if (d === 2 && rng.chance(0.35)) {
          const t = typedMisconceptions(fx(change, 2), wrong.map((w) => ({ ...w, text: w.text.replace('RM ', '') })), { code: 'WRONG-QUANTITY', why: 'Add up what was bought, then take the total away from the note.' });
          return { type: 'numeric', prompt: `${prompt} Give your answer in RM.`, answer: numericAnswer(change / 100, [rm(change / 100), (change / 100).toFixed(2), fx(change, 2)]), solution, ...t, marks: 2, skill: SKILL.context };
        }
        return { type: 'mcq', prompt, ...choices(rng, rm(change / 100), wrong, (i) => nearMiss(rm((change + (i % 2 ? 10 : -10) * i) / 100), 'Line up the decimal points and check with addition.')), solution, marks: d, skill: SKILL.context };
      } catch { /* draw again */ }
    }
  },
};

function plank(rng) {
  for (;;) {
    const p = person(rng);
    const L = rng.int(15, 60) * 10; const c1 = rng.int(20, 150) * (rng.chance(0.5) ? 5 : 1); const c2 = rng.int(20, 150);
    const left = L - c1 - c2;
    if (left <= 10 || c1 % 100 === 0 || c2 % 100 === 0 || c1 === c2) continue;
    const thing = rng.pick([['plank of wood', 'cuts off'], ['ribbon', 'cuts off'], ['rope', 'cuts off']]);
    const prompt = `A ${thing[0]} is ${fx(L, 2)} m long. ${p.name} ${thing[1]} a piece ${fx(c1, 2)} m long, and then another piece ${fx(c2, 2)} m long. How long is the ${thing[0]} that is left?`;
    const solution = `Pieces cut off: ${fx(c1, 2)} + ${fx(c2, 2)} = ${fx(c1 + c2, 2)} m. Left: ${fx(L, 2)} - ${fx(c1 + c2, 2)} = ${fx(left, 2)} m. Answer: ${fx(left, 2)} m`;
    const items = [
      { text: `${fx(L - c1, 2)} m`, code: 'ITEM-LEFT-OUT', why: `That is what is left after the first piece only. ${p.He} also cut off ${fx(c2, 2)} m.` },
      { text: `${fx(c1 + c2, 2)} m`, code: 'WRONG-QUANTITY', why: `${fx(c1 + c2, 2)} m is the length cut off. The question asks how much is left.` },
    ];
    try { return { type: 'mcq', prompt, ...choices(rng, `${fx(left, 2)} m`, items, (i) => nearMiss(`${fx(left + (i % 2 ? 10 : -10) * i, 2)} m`, 'Add the two pieces, then take the total from the full length.')), solution, marks: 2, skill: SKILL.context }; } catch { /* draw again */ }
  }
}

function mixedUnits(rng) {
  for (;;) {
    const p = person(rng);
    if (rng.chance(0.5)) {
      // masses: two in kg, one in g
      const a = rng.int(5, 40) * 50; const b = rng.int(2, 19) * 100; const g = rng.int(105, 950);
      if (g % 5 || a % 1000 === 0) continue;
      const total = a + b + g; // grams
      const prompt = `A parcel holds three items. Their masses are ${fx(a, 3)} kg, ${fx(b, 3)} kg and ${g} g. What is the total mass of the three items in kg?`;
      const solution = `Change ${g} g into kg first: ${g} g = ${fx(g, 3)} kg (1000 g = 1 kg). Then add: ${fx(a, 3)} + ${fx(b, 3)} + ${fx(g, 3)} = ${fx(total, 3)} kg. Answer: ${fx(total, 3)} kg`;
      const items = [
        { text: `${fx(a + b + g * 1000, 3)} kg`, code: 'UNIT-MIXED-SAME', why: `It looks like you added ${g} as if it were ${g} kg. ${g} g is only ${fx(g, 3)} kg.` },
        { text: `${fx(a + b + g * 10, 3)} kg`, code: 'UNIT-FACTOR-WRONG', why: `It looks like you divided ${g} by 100. There are 1000 g in 1 kg, so ${g} g = ${fx(g, 3)} kg.` },
        { text: `${fx(a + b, 3)} kg`, code: 'ITEM-LEFT-OUT', why: `That is only the two items in kg. Change ${g} g into kg and add it too.` },
      ];
      try { return { type: 'mcq', prompt, ...choices(rng, `${fx(total, 3)} kg`, items, null), solution, marks: 3, skill: SKILL.context }; } catch { continue; }
    }
    // distances: km, then "n m more"
    const k = rng.int(8, 45) * 100; const more = rng.int(105, 950);
    if (more % 5) continue;
    const second = k + more; const total = k + second; // metres
    const prompt = `${p.name} runs ${fx(k, 3)} km on Monday. On Tuesday ${p.he} runs ${more} m more than on Monday. How far does ${p.he} run on the two days altogether, in km?`;
    const solution = `${more} m = ${fx(more, 3)} km. Tuesday: ${fx(k, 3)} + ${fx(more, 3)} = ${fx(second, 3)} km. Altogether: ${fx(k, 3)} + ${fx(second, 3)} = ${fx(total, 3)} km. Answer: ${fx(total, 3)} km`;
    const items = [
      { text: `${fx(k + more, 3)} km`, code: 'MORE-THAN-AS-AMOUNT', why: `${fx(k + more, 3)} km is how far ${p.he} ran on Tuesday only. Add Monday's ${fx(k, 3)} km as well.` },
      { text: `${fx(2 * k + more * 1000, 3)} km`, code: 'UNIT-MIXED-SAME', why: `It looks like you added ${more} as if it were ${more} km. ${more} m is only ${fx(more, 3)} km.` },
      { text: `${fx(2 * k + more * 10, 3)} km`, code: 'UNIT-FACTOR-WRONG', why: `It looks like you divided ${more} by 100. There are 1000 m in 1 km, so ${more} m = ${fx(more, 3)} km.` },
    ];
    try { return { type: 'mcq', prompt, ...choices(rng, `${fx(total, 3)} km`, items, null), solution, marks: 3, skill: SKILL.context }; } catch { /* draw again */ }
  }
}

// ---------------------------------------------------------------- g08 integers

const integers = {
  id: 'm05.integers', topicId: T, subtopicId: 'm05-s3', skill: SKILL.integers,
  title: 'Add and subtract integers (D1 two numbers; D2 three numbers, or which calculation gives a negative answer)',
  difficulties: [1, 2],
  check: { min: -100, max: 100 },
  make(rng, d) {
    if (d === 2 && rng.chance(0.4)) return whichCalc(rng);
    for (;;) {
      if (d === 1) {
        const x = rng.int(-20, 20); const y = rng.int(2, 20); const plus = rng.chance(0.5);
        const r = plus ? x + y : x - y;
        if (x === 0 || r === 0) continue;
        if (Math.sign(x) === Math.sign(r) && rng.chance(0.75)) continue; // mostly crossing zero
        const prompt = `Work out ${x} ${plus ? '+' : '-'} ${y}.`;
        const solution = plus
          ? `Start at ${x} on a number line and move ${y} steps UP (to the right). ${x < 0 ? `${-x} steps take you to 0, and ${y + x} more take you to ${r}.` : `You reach ${r}.`} Answer: ${r}`
          : `Start at ${x} on a number line and move ${y} steps DOWN (to the left). ${x > 0 && r < 0 ? `${x} steps take you to 0, and ${y - x} more take you to ${r}.` : `You reach ${r}.`} Answer: ${r}`;
        const items = [
          { text: String(-r), code: 'NEG-WRONG-SIGN', why: `The size, ${Math.abs(r)}, is right but the sign is wrong. Check on a number line which side of zero you end up.` },
          x < 0 ? { text: String(plus ? -x + y : -x - y), code: 'NEG-SIGN-DROP', why: `It looks like you ignored the minus sign on ${x}. ${x} is below zero.` } : null,
          { text: String(plus ? x - y : x + y), code: 'OP-SWAP', why: `It looks like you moved the wrong way. ${plus ? 'Adding' : 'Subtracting'} ${y} moves you ${plus ? 'up' : 'down'} the number line.` },
          x < 0 && plus ? { text: String(x - y), code: 'NEG-ADD-SIZES', why: `It looks like you added ${-x} and ${y} and kept the minus sign. Start at ${x} and move ${y} steps UP.` } : null,
        ];
        try {
          if (rng.chance(0.35)) {
            const t = typedMisconceptions(String(r), items, { code: 'NEG-WRONG-SIGN', why: 'Use a number line: start at the first number, move up to add and down to subtract.' });
            return { type: 'numeric', prompt, answer: numericAnswer(r, [String(r)]), solution, ...t };
          }
          return { type: 'mcq', prompt, ...choices(rng, String(r), items, null), solution };
        } catch { continue; }
      }
      // three numbers
      const x = rng.int(-15, 15); const y = rng.int(2, 15); const z = rng.int(2, 15);
      const o1 = rng.chance(0.5) ? '+' : '-'; const o2 = o1 === '+' ? '-' : rng.chance(0.5) ? '+' : '-';
      const m = o1 === '+' ? x + y : x - y; const r = o2 === '+' ? m + z : m - z;
      if (x === 0 || r === 0 || m === 0 || Math.abs(r) > 40) continue;
      if (Math.sign(m) === Math.sign(r) && Math.sign(x) === Math.sign(m)) continue;
      const prompt = `Work out ${x} ${o1} ${y} ${o2} ${z}.`;
      const solution = `Work from left to right. ${x} ${o1} ${y} = ${m}. Then ${m} ${o2} ${z} = ${r}. Answer: ${r}`;
      const items = [
        { text: String(-r), code: 'NEG-WRONG-SIGN', why: `The size is right but the sign is wrong: ${m} ${o2} ${z} = ${r}.` },
        { text: String(o2 === '+' ? m - z : m + z), code: 'OP-SWAP', why: `The last step is ${o2} ${z}: move ${o2 === '+' ? 'up' : 'down'} the number line, not ${o2 === '+' ? 'down' : 'up'}.` },
        { text: String(o1 === '+' ? (x - y) + (o2 === '+' ? z : -z) : (x + y) + (o2 === '+' ? z : -z)), code: 'OP-SWAP', why: `The first step is ${x} ${o1} ${y} = ${m}. Check which way each sign moves you.` },
        { text: String(m), code: 'ONE-STEP-ONLY', why: `${m} is the answer after the first step. You still need to ${o2 === '+' ? 'add' : 'subtract'} ${z}.` },
      ];
      try { return { type: 'mcq', prompt, ...choices(rng, String(r), items, null), solution, marks: 2 }; } catch { /* draw again */ }
    }
  },
};

function whichCalc(rng) {
  for (;;) {
    const a = rng.int(3, 15); const b = rng.int(2, 14);
    if (a <= b) continue;
    const T = b - a; // -a + b, a negative answer
    const correct = `-${a} + ${b}`;
    const items = [
      { text: `-${a} - ${b}`, code: 'NEG-SUB-SIZES', why: `-${a} - ${b} = ${-a - b}. Taking ${b} away from -${a} moves you further below zero.` },
      { text: `${a} - ${b}`, code: 'NEG-WRONG-SIGN', why: `${a} - ${b} = ${a - b}. You start at ${a}, above zero, so the answer stays above zero.` },
      { text: `-${b} + ${a}`, code: 'NEG-WRONG-SIGN', why: `-${b} + ${a} = ${a - b}. Start at -${b} and move ${a} up: you pass 0.` },
    ];
    const prompt = `Which calculation has the answer ${T}?`;
    const solution = `Work out each one on a number line. -${a} + ${b}: start at -${a} and move ${b} up to reach ${T}. Answer: ${correct}`;
    try { return { type: 'mcq', prompt, ...choices(rng, correct, items, null), solution, marks: 2 }; } catch { /* draw again */ }
  }
}

// ---------------------------------------------------------------- g09 integers in context

const intContext = {
  id: 'm05.integers-context', topicId: T, subtopicId: 'm05-s3', skill: SKILL.intContext,
  title: 'Integers in context: lifts, divers, freezers (D1 one move; D2 several moves or a difference across zero; D3 rates and a mountain climb)',
  difficulties: [1, 2, 3],
  check: { min: -100, max: 9999, integer: true },
  make(rng, d) {
    for (;;) {
      if (d === 3) return rng.chance(0.5) ? mountain(rng) : freezerRate(rng);
      const kind = rng.pick(['lift', 'lift', 'diver', d === 2 ? 'height' : 'lift']);
      if (kind === 'lift') {
        const s = rng.int(-3, 8);
        const moves = d === 1 ? [rng.int(2, 9) * (s > 0 ? -1 : 1)] : [rng.int(2, 9) * -1, rng.int(2, 9), rng.int(2, 9) * -1];
        if (d === 2 && rng.chance(0.5)) moves.forEach((_, i) => { moves[i] = -moves[i]; });
        const path = [s]; for (const m of moves) path.push(path[path.length - 1] + m);
        const r = path[path.length - 1];
        if (path.some((x) => x < -5 || x > 15) || r === 0 || (d === 1 && Math.sign(s) === Math.sign(r)) || (d === 2 && !path.some((x) => x < 0))) continue;
        const desc = moves.map((m) => `${m > 0 ? 'up' : 'down'} ${Math.abs(m)} floor${Math.abs(m) > 1 ? 's' : ''}`);
        const prompt = `In a shopping mall in KL, the ground floor is floor 0. The car park floors below it are numbered -1, -2, -3 and so on. A lift starts on floor ${s}. It goes ${desc.slice(0, -1).join(', then ')}${desc.length > 1 ? ', then ' : ''}${desc[desc.length - 1]}. Which floor does it stop at?`;
        const solution = `Start at ${s}. ${moves.map((m, i) => `${m > 0 ? 'Up' : 'Down'} ${Math.abs(m)}: ${path[i]} ${m > 0 ? '+' : '-'} ${Math.abs(m)} = ${path[i + 1]}`).join('. ')}. Floor 0 counts as a floor. Answer: ${r}`;
        const items = [
          { text: String(-r), code: 'NEG-WRONG-SIGN', why: `The size is right but the sign is wrong. Floor ${r} is ${r < 0 ? 'below' : 'above'} the ground floor.` },
          d === 1 ? { text: String(r + (moves[0] > 0 ? 1 : -1)), code: 'NEG-SKIP-ZERO', why: 'It looks like you did not count floor 0 when the lift passed it. Floor 0 is a floor too.' } : null,
          d === 2 ? { text: String(path[1]), code: 'ONE-STEP-ONLY', why: `Floor ${path[1]} is where the lift is after the first move. It moves ${moves.length - 1} more times.` } : { text: String(s - moves[0]), code: 'OP-SWAP', why: `It looks like the lift moved the wrong way. It goes ${moves[0] > 0 ? 'up' : 'down'}.` },
          d === 2 ? { text: String(s - moves[0] + moves[1] + moves[2]), code: 'OP-SWAP', why: 'It looks like the first move went the wrong way. Check each move: up adds, down subtracts.' } : null,
        ];
        try { return { type: 'mcq', prompt, ...choices(rng, String(r), items, null), solution, marks: d }; } catch { continue; }
      }
      if (kind === 'diver') {
        const s = -rng.int(5, 30); const up = rng.int(3, 40);
        const r = s + up;
        if (r === 0 || r > 20) continue;
        const prompt = r > 0
          ? `A diver is ${-s} m below sea level (at -${-s} m). A bird flies ${r} m above sea level. How far above the diver is the bird?`
          : `A diver is at -${-s} m (${-s} m below sea level). She swims up ${up} m. At what height is she now?`;
        const ans = r > 0 ? r - s : r;
        const solution = r > 0
          ? `From -${-s} m up to sea level (0 m) is ${-s} m. From 0 m up to ${r} m is ${r} m. Altogether ${-s} + ${r} = ${ans} m. Answer: ${ans}`
          : `Start at ${s} and move up ${up}: ${s} + ${up} = ${r}. She is at ${r} m, still below sea level. Answer: ${r}`;
        const items = r > 0 ? [
          { text: String(Math.abs(r + s)), code: 'NEG-DIFF-ADD-SIGNS', why: `It looks like you worked out ${Math.max(r, -s)} - ${Math.min(r, -s)}. The diver is below sea level: count ${-s} m up to 0, then ${r} m more.` },
          { text: String(ans - 1), code: 'NEG-SKIP-ZERO', why: 'Count the distance up to sea level and the distance above it, then add them.' },
          { text: String(r), code: 'ONE-STEP-ONLY', why: `${r} m is only the height above sea level. Add the ${-s} m from the diver up to sea level.` },
        ] : [
          { text: String(-r), code: 'NEG-WRONG-SIGN', why: `The size is right but the sign is wrong: she is still below sea level, at ${r} m.` },
          { text: String(s - up), code: 'OP-SWAP', why: 'It looks like you moved down. Swimming up makes the number bigger (closer to 0).' },
          { text: String(-s + up), code: 'NEG-SIGN-DROP', why: `It looks like you ignored the minus sign on ${s}. She starts BELOW sea level.` },
        ];
        try { return { type: 'mcq', prompt, ...choices(rng, String(ans), items, null), solution, marks: d }; } catch { continue; }
      }
      // height: difference across sea level
      const top = rng.int(20, 900); const bottom = -rng.int(10, 300);
      const where = rng.pick([['the top of a cliff', 'the sea bed'], ['the top of a hill', 'the bottom of a mine shaft'], ['the roof of a tower', 'the bottom of its car park']]);
      const prompt = `${where[0][0].toUpperCase()}${where[0].slice(1)} is ${top} m above sea level. ${where[1][0].toUpperCase()}${where[1].slice(1)} is at ${bottom} m. What is the difference in height between them?`;
      const ans = top - bottom;
      const solution = `From ${bottom} m up to sea level is ${-bottom} m. From sea level up to ${top} m is ${top} m. Difference: ${-bottom} + ${top} = ${ans} m. Answer: ${ans}`;
      const items = [
        { text: String(Math.abs(top + bottom)), code: 'NEG-DIFF-ADD-SIGNS', why: `It looks like you worked out ${Math.max(top, -bottom)} - ${Math.min(top, -bottom)}. ${bottom} m is below sea level, so add the two distances from sea level: ${-bottom} + ${top}.` },
        { text: String(top), code: 'ONE-STEP-ONLY', why: `${top} m is the height above sea level only. Add the ${-bottom} m below sea level.` },
      ];
      try {
        const t = typedMisconceptions(String(ans), items, { code: 'NEG-DIFF-ADD-SIGNS', why: 'Find the distance from each height to sea level (0 m), then add them.' });
        return { type: 'numeric', prompt: `${prompt} Give your answer in metres.`, answer: numericAnswer(ans, [String(ans), `${ans} m`]), solution, ...t, marks: 2 };
      } catch { /* draw again */ }
    }
  },
};

function freezerRate(rng) {
  for (;;) {
    const a = -rng.int(12, 25); const per = rng.int(2, 5); const h = rng.int(3, 7);
    const r = a + per * h;
    if (r === 0 || Math.abs(r) > 20) continue;
    const prompt = `A freezer is at ${a} °C. It is switched off, and its temperature rises by ${per} °C every hour. What is its temperature after ${h} hours?`;
    const solution = `In ${h} hours the temperature rises ${h} x ${per} = ${h * per} °C. ${a} + ${h * per} = ${r}. Answer: ${r} °C`;
    const items = [
      { text: `${a - per * h} °C`, code: 'OP-SWAP', why: `It looks like you moved down. The temperature RISES, so add the ${h * per} degrees: ${a} + ${h * per}.` },
      { text: `${-r} °C`, code: 'NEG-WRONG-SIGN', why: `The size is right but the sign is wrong: ${a} + ${h * per} = ${r}.` },
      { text: `${a + per} °C`, code: 'ONE-STEP-ONLY', why: `That is the temperature after 1 hour. In ${h} hours it rises ${h} x ${per} = ${h * per} degrees.` },
    ];
    try { return { type: 'mcq', prompt, ...choices(rng, `${r} °C`, items, null), solution, marks: 2 }; } catch { /* draw again */ }
  }
}

function mountain(rng) {
  for (;;) {
    const drop = rng.int(5, 7); const hut = rng.int(2, 10) * 100; const climbK = rng.int(2, 4); const t0 = rng.int(4, 12);
    const top = hut + climbK * 1000;
    const r = t0 - drop * climbK;
    if (r >= 0) continue;
    const prompt = `On a mountain, the temperature drops by ${drop} °C for every 1000 m you climb. At a hut ${fmtInt(hut)} m above sea level the temperature is ${t0} °C. What is the temperature at the top, ${fmtInt(top)} m above sea level?`;
    const solution = `Height climbed from the hut: ${fmtInt(top)} - ${fmtInt(hut)} = ${fmtInt(climbK * 1000)} m. That is ${climbK} lots of 1000 m, so the temperature drops ${climbK} x ${drop} = ${climbK * drop} °C. ${t0} - ${climbK * drop} = ${r}. Answer: ${r} °C`;
    const wrongStart = top % 1000 === 0 ? t0 - drop * (top / 1000) : null;
    const items = [
      wrongStart != null ? { text: `${wrongStart} °C`, code: 'WRONG-START', why: `It looks like you used the whole height, ${fmtInt(top)} m. Only the climb from the hut (${fmtInt(climbK * 1000)} m) counts.` } : null,
      { text: `${-r} °C`, code: 'NEG-WRONG-SIGN', why: `The size is right but the sign is wrong: ${t0} - ${climbK * drop} = ${r}.` },
      { text: `${t0 - drop} °C`, code: 'ONE-STEP-ONLY', why: `That is the drop for only 1000 m. The climb is ${fmtInt(climbK * 1000)} m.` },
      { text: `${t0 + drop * climbK} °C`, code: 'OP-SWAP', why: 'The temperature DROPS as you climb, so subtract.' },
    ];
    try { return { type: 'mcq', prompt, ...choices(rng, `${r} °C`, items, null), solution, marks: 3 }; } catch { /* draw again */ }
  }
}

// ---------------------------------------------------------------- g10 finding an unknown (and writing the equation)

const LETTERS = ['a', 'n', 'm', 'x', 'p', 'k', 'y', 't'];

const unknown = {
  id: 'm05.unknown', topicId: T, subtopicId: 'm05-s4', skill: SKILL.unknown,
  title: 'Find the unknown in an addition or subtraction (D1 whole numbers; D2 decimals and contexts; D3 write the equation for a story)',
  difficulties: [1, 2, 3],
  check: { min: 0 },
  make(rng, d) {
    if (d === 3) return writeEquation(rng);
    for (;;) {
      const L = rng.pick(LETTERS);
      const kind = rng.pick(['x+b=c', 'b+x=c', 'x-b=c', 'b-x=c']);
      const p = d === 1 ? 0 : rng.int(1, 2);
      const s = 10 ** p;
      const xv = d === 1 ? rng.int(50, 900) : rng.int(50, 3000); const bv = d === 1 ? rng.int(5, 500) : rng.int(10, 2000);
      if (p && (xv % 10 === 0 || bv % 10 === 0)) continue;
      let c; let eq;
      const X = fx(xv, p); const Bt = fx(bv, p);
      if (kind === 'x+b=c') { c = xv + bv; eq = `${L} + ${Bt} = ${fx(c, p)}`; } else if (kind === 'b+x=c') { c = xv + bv; eq = `${Bt} + ${L} = ${fx(c, p)}`; } else if (kind === 'x-b=c') { c = xv - bv; eq = `${L} - ${Bt} = ${fx(c, p)}`; } else { c = bv - xv; eq = `${Bt} - ${L} = ${fx(c, p)}`; }
      if (c <= 0) continue;
      const C = fx(c, p);
      const prompt = `${eq}. What is the value of ${L}?`;
      let solution; const items = [];
      if (kind === 'x+b=c' || kind === 'b+x=c') {
        solution = `To find ${L}, undo "add ${Bt}" by subtracting: ${C} - ${Bt} = ${X}. Check: ${X} + ${Bt} = ${C}. Answer: ${X}`;
        items.push({ text: fx(c + bv, p), code: 'INVERSE-WRONG', why: `It looks like you added ${Bt} to ${C}. ${L} has ${Bt} added to it to make ${C}, so ${L} is ${Bt} LESS than ${C}.` });
      } else if (kind === 'x-b=c') {
        solution = `To find ${L}, undo "subtract ${Bt}" by adding: ${C} + ${Bt} = ${X}. Check: ${X} - ${Bt} = ${C}. Answer: ${X}`;
        if (c - bv > 0) items.push({ text: fx(c - bv, p), code: 'INVERSE-WRONG', why: `It looks like you subtracted ${Bt} from ${C}. ${L} had ${Bt} taken away to leave ${C}, so ${L} is ${Bt} MORE than ${C}.` });
        if (bv - c > 0) items.push({ text: fx(bv - c, p), code: 'SUB-REVERSED', why: `It looks like you worked out ${Bt} - ${C}. Undo "subtract ${Bt}" by adding: ${C} + ${Bt}.` });
      } else {
        solution = `${Bt} take away ${L} leaves ${C}, so ${L} is the part taken away: ${L} = ${Bt} - ${C} = ${X}. Check: ${Bt} - ${X} = ${C}. Answer: ${X}`;
        items.push({ text: fx(bv + c, p), code: 'INVERSE-WRONG', why: `It looks like you added ${Bt} and ${C}. If ${Bt} - ${L} = ${C}, then ${L} = ${Bt} - ${C}.` });
      }
      if (p) {
        // decimal slips in the subtraction that finds the unknown
        const big = Math.max(c, bv); const small = kind === 'b-x=c' ? c : bv;
        if (kind === 'x+b=c' || kind === 'b+x=c' || kind === 'b-x=c') {
          const top = kind === 'b-x=c' ? bv : c;
          const v1 = subSmallFromLarge(top, small);
          if (v1 !== xv) items.push({ text: fx(v1, p), code: 'COL-SMALLER-FROM-LARGER', why: 'It looks like you took the smaller digit from the larger in each column. Exchange when the top digit is smaller.' });
          const v2 = subNoReduce(top, small);
          if (v2 !== xv && v2 !== v1) items.push({ text: fx(v2, p), code: 'COL-EXCHANGE-NOT-REDUCED', why: 'It looks like you exchanged but did not take 1 away from the next column.' });
        }
        void big;
      }
      try {
        if (rng.chance(0.4)) {
          const t = typedMisconceptions(X, items, { code: 'INVERSE-WRONG', why: `Use the inverse operation to get ${L} on its own, then check by putting your answer back in.` });
          return { type: 'numeric', prompt, answer: numericAnswer(xv / s, [X, `${L} = ${X}`, `${L}=${X}`]), solution, ...t };
        }
        return { type: 'mcq', prompt, ...choices(rng, X, items, (i) => nearMiss(fx(xv + (i % 2 ? 1 : -1) * Math.ceil(i / 2) * (p ? 1 : 10), p), 'Use the inverse operation, then check by putting your answer back in.')), solution };
      } catch { /* draw again */ }
    }
  },
};

const STORIES = [
  { op: '-', make: (p, L, a, b) => `${p.name} had some money. ${p.He} spent RM ${a} and had RM ${b} left. Let ${L} stand for the amount of money, in RM, that ${p.he} had at first.` },
  { op: '-', make: (p, L, a, b) => `A bus had some passengers. At a stop, ${a} passengers got off and ${b} passengers were left on the bus. Let ${L} stand for the number of passengers at first.` },
  { op: '-', make: (p, L, a, b) => `${p.name} had a box of stickers. ${p.He} gave away ${a} stickers and had ${b} left. Let ${L} stand for the number of stickers ${p.he} had at first.` },
  { op: '+', make: (p, L, a, b) => `${p.name} had some money. ${p.His} aunt gave ${p.him || 'them'} RM ${a}, and then ${p.he} had RM ${b}. Let ${L} stand for the amount of money, in RM, that ${p.he} had at first.` },
  { op: '+', make: (p, L, a, b) => `A tank had some water in it. ${a} litres were poured in, and then it held ${b} litres. Let ${L} stand for the number of litres in the tank at first.` },
];

function writeEquation(rng) {
  for (;;) {
    const p = person(rng); p.him = p.he === 'she' ? 'her' : 'him';
    const L = rng.pick(['m', 'n', 'p', 'k']);
    const st = rng.pick(STORIES);
    const a = rng.int(5, 60); const b = rng.int(st.op === '-' ? 5 : a + 5, 120);
    const prompt = `${st.make(p, L, a, b)} Which equation is correct?`;
    const correct = st.op === '-' ? `${L} - ${a} = ${b}` : `${L} + ${a} = ${b}`;
    const start = st.op === '-' ? b + a : b - a;
    const items = st.op === '-' ? [
      { text: `${L} + ${a} = ${b}`, code: 'OP-SWAP', why: 'Spending (or giving away, or getting off) makes the amount go down, so it is a subtraction, not an addition.' },
      { text: `${a} - ${L} = ${b}`, code: 'SUB-REVERSED', why: `This takes ${L} away from ${a}. The story starts with ${L} and takes ${a} away, so ${L} comes first.` },
      { text: `${L} = ${b} - ${a}`, code: 'INVERSE-WRONG', why: `This would make ${L} = ${b - a}, less than what was left. ${L} is what there was at first: ${b} + ${a} = ${b + a}.` },
    ] : [
      { text: `${L} - ${a} = ${b}`, code: 'OP-SWAP', why: 'Getting more (being given money, pouring in water) makes the amount go up, so it is an addition.' },
      { text: `${L} = ${b} + ${a}`, code: 'INVERSE-WRONG', why: `This would make ${L} = ${b + a}, more than the amount at the end. ${L} is what there was BEFORE the ${a} was added.` },
      { text: `${a} - ${L} = ${b}`, code: 'SUB-REVERSED', why: `This is a subtraction, and it takes ${L} away from ${a}. The story starts with ${L} and adds ${a}.` },
    ];
    const solution = `The story starts with ${L}, then ${st.op === '-' ? `${a} is taken away` : `${a} is added`}, and the result is ${b}. So ${correct}. (Solving it: ${L} = ${st.op === '-' ? `${b} + ${a}` : `${b} - ${a}`} = ${start}.) Answer: ${correct}`;
    try { return { type: 'mcq', prompt, ...choices(rng, correct, items, null), solution, marks: 2, skill: SKILL.equation }; } catch { /* draw again */ }
  }
}

// ---------------------------------------------------------------- g11 bar-model word problems

const PAIRS = [['stickers', 'has'], ['marbles', 'has'], ['RM', 'has saved'], ['stamps', 'has'], ['books', 'has read']];

const barModel = {
  id: 'm05.bar-model', topicId: T, subtopicId: 'm05-s4', skill: SKILL.bar,
  title: 'Word problems with a bar model (D2 "more than" in two steps; D3 total and difference, find the smaller part, or seats left)',
  difficulties: [2, 3],
  check: { min: 0, integer: true },
  make(rng, d) {
    for (;;) {
      if (d === 2 || rng.chance(0.3)) {
        // more-than, then total or what is left
        const cap = rng.int(10, 30) * 100; const f = rng.int(150, Math.floor(cap / 2) - 100); const more = rng.int(30, 200);
        const s = f + more; const sold = f + s; const left = cap - sold;
        if (left <= 0) continue;
        const askLeft = d === 3;
        const what = rng.pick([['A concert hall', 'seats', 'tickets were sold', 'seats were still unsold'], ['A cinema', 'seats', 'tickets were sold', 'seats were still empty'], ['A train', 'seats', 'seats were booked', 'seats were still free']]);
        const prompt = askLeft
          ? `${what[0]} has ${fmtInt(cap)} ${what[1]}. On Friday, ${f} ${what[2]}. On Saturday, ${more} more ${what[2].split(' ')[0]} than on Friday ${what[2].split(' ').slice(1).join(' ')}. How many ${what[3].split(' ')[0]} ${what[3].split(' ').slice(1).join(' ')} after Saturday?`
          : `On Friday, ${f} tickets were sold for a concert. On Saturday, ${more} more tickets were sold than on Friday. How many tickets were sold on the two days altogether?`;
        const ans = askLeft ? left : sold;
        const solution = askLeft
          ? `Saturday: ${f} + ${more} = ${s}. Both days: ${f} + ${s} = ${sold}. Left: ${fmtInt(cap)} - ${sold} = ${left}. Answer: ${left}`
          : `Saturday: ${f} + ${more} = ${s}. Both days: ${f} + ${s} = ${sold}. Answer: ${sold}`;
        const items = askLeft ? [
          { text: fmtInt(cap - f - more), code: 'MORE-THAN-AS-AMOUNT', why: `It looks like you used ${more} as the number on Saturday. Saturday had ${more} MORE than Friday: ${f} + ${more} = ${s}.` },
          { text: fmtInt(cap - f), code: 'ITEM-LEFT-OUT', why: `That only takes away Friday's ${f}. Saturday's ${s} must be taken away too.` },
          { text: fmtInt(sold), code: 'WRONG-QUANTITY', why: `${sold} is the number used on the two days. The question asks how many were NOT used: ${fmtInt(cap)} - ${sold}.` },
        ] : [
          { text: fmtInt(s), code: 'ONE-STEP-ONLY', why: `${s} is the number sold on Saturday only (${f} + ${more}). Add Friday's ${f} too.` },
          { text: fmtInt(2 * f), code: 'MORE-THAN-AS-AMOUNT', why: `It looks like you counted Friday's ${f} twice and left out the ${more} extra. Saturday sold ${f} + ${more} = ${s}.` },
          { text: fmtInt(more), code: 'WRONG-QUANTITY', why: `${more} is how many MORE were sold on Saturday. The question asks for the total on both days.` },
        ];
        try { return { type: 'mcq', prompt, ...choices(rng, fmtInt(ans), items, null), solution, marks: d }; } catch { continue; }
      }
      // total and difference: find the smaller part
      const small = rng.int(12, 400); const diff = rng.int(5, 200);
      const big = small + diff; const total = small + big;
      if (total > 1000) continue;
      const [A, B] = rng.sample(['Wei Ming', 'Aisha', 'Daniel', 'Priya', 'Omar', 'Mei Lin', 'Kumar', 'Lina'], 2);
      const [thing, verb] = rng.pick(PAIRS);
      const money = thing === 'RM';
      const amt = (v) => (money ? `RM ${v}` : `${v} ${thing}`);
      const askBig = rng.chance(0.3);
      const prompt = `${A} and ${B} ${money ? 'have saved' : thing === 'books' ? 'have read' : 'have'} ${amt(total)} altogether. ${A} ${verb} ${amt(diff)} more than ${B}. How ${money ? 'much' : 'many'} ${money ? 'money has' : thing === 'books' ? 'books has' : `${thing} does`} ${askBig ? A : B} ${money ? 'saved' : thing === 'books' ? 'read' : 'have'}?`;
      const ans = askBig ? big : small;
      const scale = 8 / Math.max(small, 1);
      const diagram = { type: 'barModel', bars: [{ label: A, parts: [{ size: 8, text: '?' }, { size: Math.min(12, Math.max(0.6, Math.round(diff * scale * 10) / 10)), text: money ? `RM ${diff}` : String(diff) }] }, { label: B, parts: [{ size: 8, text: '?' }] }], totalBrace: { label: amt(total) } };
      const solution = `Take away the extra ${diff}: ${total} - ${diff} = ${total - diff}. Now the two bars are equal, so each is ${total - diff} ÷ 2 = ${small}. ${B} has ${small}${askBig ? `, and ${A} has ${small} + ${diff} = ${big}` : ''}. Check: ${small} + ${big} = ${total}. Answer: ${money ? `RM ${ans}` : ans}`;
      const items = [
        { text: fmtInt(total - diff), code: 'BAR-NO-HALVE', why: `${total - diff} is two equal bars together (${B}'s amount twice). Halve it to find one bar.` },
        { text: fmtInt(askBig ? small : big), code: 'WRONG-QUANTITY', why: askBig ? `${small} is ${B}'s amount. ${A} has ${diff} more.` : `${big} is ${A}'s amount (the bigger one). The question asks about ${B}.` },
        total % 2 === 0 && total / 2 - diff > 0 ? { text: fmtInt(askBig ? total / 2 + diff : total / 2 - diff), code: 'BAR-HALVE-FIRST', why: `It looks like you halved ${total} first and then ${askBig ? 'added' : 'took away'} ${diff}. Take away the difference FIRST, then halve.` } : null,
      ];
      try {
        const show = (t) => (money ? `RM ${t}` : t);
        if (rng.chance(0.4)) {
          const t = typedMisconceptions(String(ans), items, { code: 'BAR-NO-HALVE', why: 'Take away the difference so the bars are equal, then halve.' });
          return { type: 'numeric', prompt, answer: numericAnswer(ans, [String(ans), ...(money ? [`RM ${ans}`] : [`${ans} ${thing}`])]), solution, ...t, marks: 3, diagram };
        }
        return { type: 'mcq', prompt, ...choices(rng, show(fmtInt(ans)), items.filter(Boolean).map((i) => ({ ...i, text: show(i.text) })), null), solution, marks: 3, diagram };
      } catch { /* draw again */ }
    }
  },
};

export default [column, estimate, inverseCheck, missingDigit, decimals, money, integers, intContext, unknown, barModel];
