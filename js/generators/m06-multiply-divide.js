// m06 Multiplication and division: order of operations, laws of arithmetic, written
// multiplication, estimating, division with and without remainders, interpreting remainders,
// decimals x and ÷ whole numbers, multi-step word problems. Patterns and ranges follow the CLO's
// generator guide (m06). The bank writes × in this topic. Every wrong option is built by one named
// misconception and carries its code. Decimals are held as whole numbers of thousandths.

import { choices, typedMisconceptions, nearMiss, numericAnswer, fmtInt, rm, person, countOf, valueOf } from './core.js';

const T = 'm06-multiplication-and-division';
const SKILL = {
  order: 'order of operations', laws: 'laws of arithmetic', mult1: 'multiplying by a 1-digit number', mult2: 'multiplying by a 2-digit number',
  missing: 'missing digits in calculations', estP: 'estimating products', estQ: 'estimating quotients', div1: 'dividing by a 1-digit number', divRem: 'division with remainders',
  div2: 'dividing by a 2-digit number', interpret: 'interpreting remainders', decMult: 'multiplying decimals by whole numbers',
  decDiv: 'dividing decimals by whole numbers', words: 'multi-step word problems with x and ÷',
};

// Misconception codes: all declared once in misconceptions.js (the CLO's catalogue).

const X = '×';
/** u / 10^p as text: trailing zeros dropped, thousands spaced. */
function fx(u, p = 0) {
  const neg = u < 0; const a = Math.abs(u); const s = 10 ** p;
  const ip = Math.floor(a / s);
  const fp = p ? String(a % s).padStart(p, '0').replace(/0+$/, '') : '';
  return `${neg ? '-' : ''}${fmtInt(ip)}${fp ? `.${fp}` : ''}`;
}
const dpOf = (u, p) => { let k = p; while (k > 0 && u % 10 === 0) { u /= 10; k--; } return k; };

/** The numbers written in a prompt, read the way the tests read them ("21 573" is one number). */
const promptNums = (prompt) => (String(prompt).replace(/(\d) (\d{3})/g, '$1$2').match(/-?\d+(?:\.\d+)?(?:\/\d+)?/g) || []).map((t) => valueOf(t)).filter((x) => x != null);
/** A near miss is never a number that already appears in the question (CLO review X3): null if it does. */
const fresh = (prompt, d) => { if (!d) return null; const v = valueOf(d.text); return v != null && promptNums(prompt).some((x) => Math.abs(x - v) < 1e-9) ? null : d; };

// ---------------------------------------------------------------- expressions (whole numbers)

/** Evaluate tokens like [2, '+', 3, '×', 4] or with '(' ')'. mode: bodmas | lr (brackets, then left to right) | mulfirst (brackets, then × before ÷) | nobr (brackets ignored). Returns null if not whole. */
function evaluate(tokens, mode = 'bodmas') {
  let toks = tokens.slice();
  if (mode === 'nobr') { toks = toks.filter((t) => t !== '(' && t !== ')'); mode = 'bodmas'; }
  let i = 0;
  const flat = () => {
    const out = [];
    while (i < toks.length && toks[i] !== ')') {
      if (toks[i] === '(') { i++; out.push(flat()); i++; } else out.push(toks[i++]);
    }
    return reduce(out);
  };
  const apply = (a, op, b) => (op === '+' ? a + b : op === '-' ? a - b : op === X ? a * b : a / b);
  const reduce = (arr) => {
    if (arr.some((x) => x === null)) return null;
    let a = arr.slice();
    const pass = (ops) => { const out = [a[0]]; for (let k = 1; k < a.length; k += 2) { if (ops.includes(a[k])) out[out.length - 1] = apply(out[out.length - 1], a[k], a[k + 1]); else out.push(a[k], a[k + 1]); } a = out; };
    if (mode === 'lr') pass(['+', '-', X, '÷']);
    else if (mode === 'mulfirst') { pass([X]); pass(['÷']); pass(['+', '-']); } else { pass([X, '÷']); pass(['+', '-']); }
    return a[0];
  };
  const v = flat();
  return Number.isInteger(v) ? v : null;
}
const show = (tokens) => tokens.join(' ').replace(/\( /g, '(').replace(/ \)/g, ')');

// ---------------------------------------------------------------- g01, g02 order of operations

const orderOps = {
  id: 'm02.order-of-operations', topicId: 'm02-number-system', subtopicId: 'm02-s6', // moved from m06.order-of-operations (m06-s1), book map 17 Oct 2026
  skill: SKILL.order,
  title: 'Order of operations (D1 one × or ÷ with + or -; D2 brackets and four numbers; D3 ÷ and × in a row, or where the brackets go)',
  difficulties: [1, 2, 3],
  check: { min: 0 },
  make(rng, d) {
    if (d === 3 && rng.chance(0.5)) return whereBrackets(rng);
    for (;;) {
      let tk;
      const n = () => rng.int(2, 12);
      if (d === 1) {
        const f = rng.int(0, 5); const a = rng.int(2, 30); const b = n(); const c = n();
        tk = [[a, '+', b, X, c], [a, '-', b, X, c], [b, X, c, '+', a], [b, X, c, '-', a], [a, '+', b * c, '÷', c], [a, '-', b * c, '÷', c]][f];
      } else if (d === 2) {
        const f = rng.int(0, 4); const a = n(); const b = n(); const c = n(); const e = rng.int(2, 9);
        tk = [['(', a, '+', b, ')', X, c], [a, X, '(', b + c, '-', c, ')'], ['(', a * c + b * c, '-', b * c, ')', '÷', c], [a, '+', b, X, '(', c + e, '-', e, ')'], [a * b, '-', b, X, c, '+', e]][f];
      } else {
        // three operations with brackets, so D3 is harder than D2 (CLO review m06 item 4)
        const f = rng.int(0, 2); const b = rng.int(2, 6); const c = rng.int(1, 6); const q = rng.int(2, 6); const e = rng.int(2, 5); const g = rng.int(1, 12);
        tk = [[(b + c) * q, '÷', '(', b, '+', c, ')', X, e, '-', g], [g, '+', '(', q * b, '-', q, ')', '÷', q, X, e], ['(', b * q, '+', c * q, ')', '÷', q, X, e, '-', c]][f];
      }
      const r = evaluate(tk);
      if (r == null || r < 3) continue;
      const expr = show(tk);
      const wrong = [];
      const lr = evaluate(tk, 'lr'); const nobr = evaluate(tk, 'nobr'); const mf = evaluate(tk, 'mulfirst');
      if (lr != null && lr >= 0) wrong.push({ text: fmtInt(lr), code: 'BODMAS-LEFT-RIGHT', why: `It looks like you worked from left to right. ${X} and ÷ come before + and - (after any brackets).` });
      if (tk.includes('(') && nobr != null && nobr >= 0) wrong.push({ text: fmtInt(nobr), code: 'BRACKETS-IGNORED', why: 'It looks like you ignored the brackets. Work out the brackets first.' });
      if (tk.includes('÷') && tk.includes(X) && mf != null && mf >= 0) wrong.push({ text: fmtInt(mf), code: 'DIV-LEFT-RIGHT', why: `It looks like you did the ${X} before the ÷. ${X} and ÷ have equal priority: after the brackets, work them from left to right.` });
      // the first step on its own
      let first = null;
      const open = tk.indexOf('(');
      if (open >= 0) first = evaluate(tk.slice(open + 1, tk.indexOf(')')));
      else { const k = tk.findIndex((t) => t === X || t === '÷'); first = evaluate(tk.slice(k - 1, k + 2)); }
      if (first != null && first >= 0) wrong.push({ text: fmtInt(first), code: 'ONE-STEP-ONLY', why: `${first} is only the ${open >= 0 ? 'bracket' : `first step (${show(tk.slice(tk.findIndex((t) => t === X || t === '÷') - 1, tk.findIndex((t) => t === X || t === '÷') + 2))})`}. Finish the rest of the calculation.` });
      const prompt = `Work out ${expr}.`;
      const steps = [];
      if (open >= 0) steps.push(`Brackets first: ${show(tk.slice(open + 1, tk.indexOf(')')))} = ${first}.`);
      steps.push(open >= 0 ? `Then ${X} and ÷ from left to right, then + and - from left to right.` : `${X} and ÷ come first (from left to right), then + and - (from left to right).`);
      const solution = `${steps.join(' ')} ${expr} = ${r}. Answer: ${r}`;
      try {
        if (d === 1 && rng.chance(0.3)) {
          const t = typedMisconceptions(fmtInt(r), wrong, { code: 'BODMAS-LEFT-RIGHT', why: `Brackets first, then ${X} and ÷, then + and -.` });
          return { type: 'numeric', prompt, answer: numericAnswer(r, [fmtInt(r)]), solution, ...t };
        }
        return { type: 'mcq', prompt, ...choices(rng, fmtInt(r), wrong, (i) => (r + (i % 2 ? i : -i) > 0 ? fresh(prompt, nearMiss(fmtInt(r + (i % 2 ? i : -i)), `Brackets first, then ${X} and ÷, then + and -.`)) : null)), solution, marks: d === 3 ? 2 : 1 };
      } catch { /* draw again */ }
    }
  },
};

function whereBrackets(rng) {
  for (;;) {
    const a = rng.int(2, 12); const b = rng.int(2, 9); const c = rng.int(3, 9); const e = rng.int(1, c - 1);
    const base = [a, '+', b, X, c, '-', e];
    const places = [['(', a, '+', b, ')', X, c, '-', e], ['(', a, '+', b, ')', X, '(', c, '-', e, ')'], [a, '+', b, X, '(', c, '-', e, ')'], [a, '+', '(', b, X, c, ')', '-', e]];
    const vals = places.map((p) => evaluate(p));
    const k = rng.int(0, 2);
    const target = vals[k];
    if (vals.filter((x) => x === target).length !== 1) continue;
    const correct = show(places[k]);
    const prompt = `Where should brackets go so that ${show(base)} equals ${target}?`;
    const solution = `Try each one. ${places.map((p, i) => `${show(p)} = ${vals[i]}`).join('; ')}. Only ${correct} makes ${target}. Answer: ${correct}`;
    const items = places.map((p, i) => (i === k ? null : { text: show(p), code: 'BRACKETS-WRONG-PLACE', why: `${show(p)} = ${vals[i]}, not ${target}.${i === 3 ? ` These brackets change nothing, because ${X} is done first anyway.` : ''}` }));
    try { return { type: 'mcq', prompt, ...choices(rng, correct, items, null), solution, marks: 2 }; } catch { /* draw again */ }
  }
}

// ---------------------------------------------------------------- g03 laws of arithmetic (distributive)

const laws = {
  id: 'm02.laws', topicId: 'm02-number-system', subtopicId: 'm02-s6', // moved from m06.laws (m06-s1), book map 17 Oct 2026
  skill: SKILL.laws,
  title: 'The distributive law (D2 which calculation gives the same answer; D3 use it to work out a product in your head)',
  difficulties: [2, 3],
  check: { min: 0 },
  make(rng, d) {
    for (;;) {
      const a = rng.int(3, 12); const N = rng.int(2, 9) * 10 + (d === 3 && rng.chance(0.4) ? 100 : 0); const m = rng.int(1, 3);
      const minus = rng.chance(0.65);
      const n = minus ? N - m : N + m;
      const sg = minus ? '-' : '+'; const other = minus ? '+' : '-';
      if (d === 2) {
        const correct = `${a} ${X} ${N} ${sg} ${a} ${X} ${m}`;
        const T10 = Math.floor(n / 10) * 10; const O = n % 10;
        const items = [
          { text: `${a} ${X} ${N} ${sg} ${m}`, code: 'DIST-PARTIAL', why: `This ${minus ? 'takes away' : 'adds'} ${m} only once. ${n} is ${N} ${sg} ${m}, so you need ${a} lots of ${m}: ${a} ${X} ${m}.` },
          { text: `${a} ${X} ${N} ${other} ${a} ${X} ${m}`, code: 'DIST-WRONG-SIGN', why: `${n} is ${m} ${minus ? 'LESS' : 'MORE'} than ${N}, so ${minus ? 'subtract' : 'add'} ${a} ${X} ${m}.` },
          O ? { text: `${a} ${X} ${T10} + ${O}`, code: 'DIST-PARTIAL', why: `This multiplies the ${T10} by ${a} but not the ${O}. It should be ${a} ${X} ${T10} + ${a} ${X} ${O}.` } : null,
        ];
        const prompt = `Which calculation gives the same answer as ${a} ${X} ${n}?`;
        const solution = `${n} = ${N} ${sg} ${m}. So ${a} ${X} ${n} = ${a} ${X} ${N} ${sg} ${a} ${X} ${m} = ${a * N} ${sg} ${a * m} = ${a * n}. Multiplying each part and then combining is the distributive law. Answer: ${correct}`;
        try { return { type: 'mcq', prompt, ...choices(rng, correct, items, null), solution }; } catch { continue; }
      }
      // no hint: choosing the near multiple of 10 is the skill at D3 (CLO review m06 item 5)
      const prompt = `Work out ${a} ${X} ${n} in your head.`;
      const ans = a * n;
      const solution = `${n} is close to ${N}: ${n} = ${N} ${sg} ${m}. So ${a} ${X} ${n} = ${a} ${X} ${N} ${sg} ${a} ${X} ${m} = ${fmtInt(a * N)} ${sg} ${a * m} = ${fmtInt(ans)}. Answer: ${fmtInt(ans)}`;
      const items = [
        { text: fmtInt(minus ? a * N - m : a * N + m), code: 'DIST-PARTIAL', why: `It looks like you ${minus ? 'took away' : 'added'} ${m} only once. You need ${a} lots of ${m}: ${a} ${X} ${m} = ${a * m}.` },
        { text: fmtInt(minus ? a * N + a * m : a * N - a * m), code: 'DIST-WRONG-SIGN', why: `${n} is ${minus ? 'less' : 'more'} than ${N}, so ${minus ? 'subtract' : 'add'} ${a * m}, not ${minus ? 'add' : 'subtract'} it.` },
        { text: fmtInt(a * N), code: 'ONE-STEP-ONLY', why: `${fmtInt(a * N)} is ${a} ${X} ${N}. Now adjust: ${n} = ${N} ${sg} ${m}, so ${minus ? 'take away' : 'add'} ${a} ${X} ${m}.` },
      ];
      try {
        if (rng.chance(0.4)) {
          const t = typedMisconceptions(fmtInt(ans), items, { code: 'DIST-PARTIAL', why: `Use a multiple of 10 close to ${n}: ${n} = ${N} ${sg} ${m}. Multiply both parts by ${a}, then combine.` });
          return { type: 'numeric', prompt, answer: numericAnswer(ans, [fmtInt(ans), String(ans)]), solution, ...t, marks: 2 };
        }
        return { type: 'mcq', prompt, ...choices(rng, fmtInt(ans), items, null), solution, marks: 2 };
      } catch { /* draw again */ }
    }
  },
};

// ---------------------------------------------------------------- g04 written multiplication

const dig = (n) => String(n).split('').map(Number).reverse();
/** Short multiplication that writes only the last digit of each product (the leftmost in full). */
function multNoCarry(a, b) { const A = dig(a); let v = 0; A.forEach((x, i) => { const p = x * b; v += (i === A.length - 1 ? p : p % 10) * 10 ** i; }); return v; }
/** Short multiplication that adds the carry before multiplying. */
function multCarryFirst(a, b) { const A = dig(a); let v = 0; let c = 0; A.forEach((x, i) => { const p = (x + c) * b; v += (p % 10) * 10 ** i; c = Math.floor(p / 10); }); return v + c * 10 ** A.length; }

const multiply = {
  id: 'm06.multiply', topicId: T, subtopicId: 'm06-s2', skill: SKILL.mult1,
  title: 'Written multiplication (D1 up to 4 digits × 1 digit; D2 × a 2-digit number; D3 find a missing digit)',
  difficulties: [1, 2, 3],
  check: { min: 0, integer: true },
  make(rng, d) {
    for (;;) {
      if (d === 3) {
        const b = rng.pick([3, 7, 9]); const a = rng.int(1000, 3299);
        const r = a * b;
        const pos = rng.int(1, 3);
        const D = Math.floor(a / 10 ** pos) % 10;
        const low = a % 10 ** pos; const carry = Math.floor((low * b) / 10 ** pos);
        if (!carry) continue;
        const rk = Math.floor(r / 10 ** pos) % 10;
        let wrong = null; for (let x = 0; x <= 9; x++) if ((x * b) % 10 === rk) wrong = x;
        if (wrong === D || wrong == null) continue;
        const shown = String(a).split('').map((c, i) => (i === 3 - pos ? '?' : c)).join('');
        const prompt = `In this multiplication one digit is missing, shown by ?:  ${shown} ${X} ${b} = ${fmtInt(r)}. What is the missing digit?`;
        const solution = `Work from the right. The digits to the right of ? give ${low} ${X} ${b} = ${low * b}, so ${carry} is carried into the ? column. ? ${X} ${b} + ${carry} must end in ${rk}, so ? = ${D}. Check: ${a} ${X} ${b} = ${fmtInt(r)}. Answer: ${D}`;
        const items = [{ text: String(wrong), code: 'MISSING-DIGIT-NO-CARRY', why: `It looks like you forgot the carry of ${carry}. ${wrong} ${X} ${b} ends in ${rk}, but the ${carry} carried in must be added too.` }];
        try {
          if (rng.chance(0.6)) {
            const t = typedMisconceptions(String(D), items, { code: 'MISSING-DIGIT-NO-CARRY', why: 'Work from the right and remember the carries. Check your digit in the full calculation.' });
            return { type: 'numeric', prompt, answer: numericAnswer(D, [String(D)]), solution, ...t, marks: 2, skill: SKILL.missing };
          }
          return { type: 'mcq', prompt, ...choices(rng, String(D), items, (i) => { const x = (D + i * 3) % 10; return x !== wrong ? fresh(prompt, nearMiss(String(x), 'Put your digit back into the calculation and check it.')) : null; }), solution, marks: 2, skill: SKILL.missing };
        } catch { continue; }
      }
      if (d === 1) {
        const a = rng.int(100, 9999); const b = rng.int(3, 9);
        const r = a * b;
        if (multNoCarry(a, b) === r) continue;
        const prompt = `Work out ${fmtInt(a)} ${X} ${b}.`;
        const solution = `Multiply each digit by ${b}, starting with the ones, and add the carried digit after multiplying: ${fmtInt(a)} ${X} ${b} = ${fmtInt(r)}. Estimate to check: about ${fmtInt(Math.round(a / 10 ** (String(a).length - 1)) * 10 ** (String(a).length - 1) * b)}. Answer: ${fmtInt(r)}`;
        const items = [
          { text: fmtInt(multNoCarry(a, b)), code: 'MULT-NO-CARRY', why: 'It looks like you wrote down the last digit of each product but did not add the carried digits.' },
          { text: fmtInt(multCarryFirst(a, b)), code: 'MULT-CARRY-FIRST', why: `It looks like you added the carried digit before multiplying by ${b}. Multiply first, then add the carry.` },
        ];
        try {
          if (rng.chance(0.3)) {
            const t = typedMisconceptions(fmtInt(r), items, { code: 'MULT-NO-CARRY', why: 'Multiply each digit, then add the carried digit.' });
            return { type: 'numeric', prompt, answer: numericAnswer(r, [fmtInt(r), String(r)]), solution, ...t, skill: SKILL.mult1 };
          }
          return { type: 'mcq', prompt, ...choices(rng, fmtInt(r), items, (i) => fresh(prompt, nearMiss(fmtInt(r + (i % 2 ? 10 : -10) * 10 ** Math.floor(i / 2)), `Multiply each digit by ${b} and add the carries.`))), solution, skill: SKILL.mult1 };
        } catch { continue; }
      }
      const a = rng.chance(0.5) ? rng.int(100, 999) : rng.int(1000, 2999); const b = rng.int(12, a > 999 ? 39 : 99);
      if (b % 10 === 0) continue;
      const t10 = Math.floor(b / 10); const u = b % 10;
      const r = a * b;
      const prompt = `Work out ${fmtInt(a)} ${X} ${b}.`;
      const solution = `Split ${b} into ${t10 * 10} + ${u}. ${fmtInt(a)} ${X} ${u} = ${fmtInt(a * u)}. ${fmtInt(a)} ${X} ${t10 * 10} = ${fmtInt(a * t10 * 10)} (remember the 0 place holder). Add: ${fmtInt(a * u)} + ${fmtInt(a * t10 * 10)} = ${fmtInt(r)}. Answer: ${fmtInt(r)}`;
      const items = [
        { text: fmtInt(a * u + a * t10), code: 'PLACE-HOLDER', why: `It looks like you multiplied by ${t10} instead of ${t10 * 10} in the second row. Put a 0 place holder first: ${fmtInt(a)} ${X} ${t10 * 10} = ${fmtInt(a * t10 * 10)}.` },
        { text: fmtInt(a * t10 * 10), code: 'PARTIAL-PRODUCT', why: `That is only ${fmtInt(a)} ${X} ${t10 * 10}. Add ${fmtInt(a)} ${X} ${u} as well.` },
        { text: fmtInt(a * u), code: 'PARTIAL-PRODUCT', why: `That is only ${fmtInt(a)} ${X} ${u}. Add ${fmtInt(a)} ${X} ${t10 * 10} as well.` },
      ];
      try {
        if (rng.chance(0.35)) {
          const t = typedMisconceptions(fmtInt(r), items, { code: 'PLACE-HOLDER', why: `Multiply by the ones, then by the tens (with a 0 place holder), then add the two rows.` });
          return { type: 'numeric', prompt, answer: numericAnswer(r, [fmtInt(r), String(r)]), solution, ...t, skill: SKILL.mult2 };
        }
        return { type: 'mcq', prompt, ...choices(rng, fmtInt(r), rng.shuffle(items), null), solution, skill: SKILL.mult2 };
      } catch { /* draw again */ }
    }
  },
};

// ---------------------------------------------------------------- g05 estimating products

const PLACE = { 10: 'ten', 100: 'hundred', 1000: 'thousand' };
const rnd = (n, q) => Math.floor((n + q / 2) / q) * q;

const estimate = {
  id: 'm06.estimate-product', topicId: T, subtopicId: 'm06-s2', skill: SKILL.estP,
  title: 'Estimate a product by rounding (D1 3-digit × 2-digit; D2 4-digit, to the nearest hundred, × 1- or 2-digit)',
  difficulties: [1, 2],
  check: { min: 0, integer: true },
  make(rng, d) {
    for (;;) {
      const a = d === 1 ? rng.int(101, 999) : rng.int(1001, 9999);
      const two = d === 1 || rng.chance(0.5);
      const b = two ? rng.int(11, 99) : rng.int(3, 9);
      // D2 rounds a 4-digit number to the nearest hundred (3800 x 40), so it is harder than D1 (CLO review m06 item 6)
      const qa = 100; const qb = two ? 10 : 1;
      const ra = rnd(a, qa); const rb = rnd(b, qb);
      if (ra === a || (two && rb === b) || ra === 0 || (d === 2 && ra % 1000 === 0)) continue;
      const est = ra * rb;
      const prompt = two
        ? `Round ${fmtInt(a)} to the nearest ${PLACE[qa]} and ${b} to the nearest ten. Then estimate ${fmtInt(a)} ${X} ${b}.`
        : `Estimate ${fmtInt(a)} ${X} ${b} by first rounding ${fmtInt(a)} to the nearest ${PLACE[qa]}.`;
      const solution = `${fmtInt(a)} rounds to ${fmtInt(ra)}${two ? ` and ${b} rounds to ${rb}` : ''}. ${fmtInt(ra)} ${X} ${rb} = ${fmtInt(est)} (multiply the non-zero digits, then put back all the zeros). Answer: ${fmtInt(est)}`;
      const fa = Math.floor(a / qa) * qa; const fb = two ? Math.floor(b / 10) * 10 : b;
      const items = [
        { text: fmtInt(est / 10), code: 'EST-POWER-OF-TEN', why: `The digits are right but there is one zero too few. ${fmtInt(ra)} ${X} ${rb}: count all the zeros in both numbers.` },
        { text: fmtInt(est * 10), code: 'EST-POWER-OF-TEN', why: `The digits are right but there is one zero too many. ${fmtInt(ra)} ${X} ${rb}: count all the zeros in both numbers.` },
        fa * fb !== est && fa * fb > 0 ? { text: fmtInt(fa * fb), code: 'ROUND-TRUNCATE', why: `It looks like you rounded down by cutting off digits (${fmtInt(fa)}${two ? ` and ${fb}` : ''}). Round to the NEAREST ${PLACE[qa]}${two ? ' and ten' : ''}.` } : null,
        { text: fmtInt(a * b), code: 'EST-EXACT', why: `${fmtInt(a * b)} is the exact answer. An estimate uses the rounded numbers.` },
      ];
      try { return { type: 'mcq', prompt, ...choices(rng, fmtInt(est), rng.shuffle(items), null), solution }; } catch { /* draw again */ }
    }
  },
};

// ---------------------------------------------------------------- g06, g08 division

/** Divide digit by digit, throwing remainders away. */
function divDigitwise(a, b) { return Number(String(a).split('').map((c) => Math.floor(Number(c) / b)).join('')); }

const divide = {
  id: 'm06.divide', topicId: T, subtopicId: 'm06-s3', skill: SKILL.div1,
  title: 'Division (D1 exact, by 1 digit, zeros in the answer; D2 remainders, or 3 digits by 2 digits; D3 work back from a remainder)',
  difficulties: [1, 2, 3],
  check: { min: 0 },
  make(rng, d) {
    for (;;) {
      if (d === 1) {
        const b = rng.int(3, 9);
        let q;
        if (rng.chance(0.45)) { q = rng.int(1, 9) * 100 + rng.int(1, 9); } else q = rng.int(25, 999);
        const a = q * b;
        if (a > 9999 || a < 100) continue;
        const prompt = `Work out ${fmtInt(a)} ÷ ${b}.`;
        const solution = `Divide from the left, carrying each remainder into the next digit: ${fmtInt(a)} ÷ ${b} = ${fmtInt(q)}. Where a digit is too small to divide, write 0 in the answer. Check: ${fmtInt(q)} ${X} ${b} = ${fmtInt(a)}. Answer: ${fmtInt(q)}`;
        const z = Number(String(q).replace(/0/g, ''));
        const dw = divDigitwise(a, b);
        const tensQ = Math.floor(q / 10) % 10;
        const items = [
          z !== q ? { text: fmtInt(z), code: 'DIV-ZERO-DROPPED', why: `It looks like you left out a 0 in the answer. When a digit is too small to divide by ${b}, write 0 in that place.` } : null,
          // only when it is believable: the first digit divides, so it has as many digits as the answer (CLO review m06 item 8)
          Number(String(a)[0]) >= b && String(dw).length === String(q).length ? { text: fmtInt(dw), code: 'DIV-DIGITWISE', why: `It looks like you divided each digit on its own and threw away the remainders. Carry each remainder into the next digit.` } : null,
          ...rng.shuffle([
            tensQ < 9 ? { text: fmtInt(q + 10), code: 'DIV-OFF-BY-TEN', why: `The tens digit is one too big: ${fmtInt(q + 10)} ${X} ${b} = ${fmtInt((q + 10) * b)}, not ${fmtInt(a)}. Check by multiplying back.` } : null,
            tensQ > 0 ? { text: fmtInt(q - 10), code: 'DIV-OFF-BY-TEN', why: `The tens digit is one too small: ${fmtInt(q - 10)} ${X} ${b} = ${fmtInt((q - 10) * b)}, not ${fmtInt(a)}. Check by multiplying back.` } : null,
          ].filter(Boolean)),
        ];
        try { return { type: 'mcq', prompt, ...choices(rng, fmtInt(q), items, (i) => fresh(prompt, nearMiss(fmtInt(q + (i % 2 ? 1 : -1) * Math.ceil(i / 2)), `Check by multiplying your answer by ${b}.`))), solution, skill: SKILL.div1 }; } catch { continue; }
      }
      if (d === 2) {
        if (rng.chance(0.25)) return estimateQuotient(rng);
        if (rng.chance(0.5)) {
          const b = rng.int(3, 12); const q = rng.int(12, 150); const r = rng.int(1, b - 1);
          const a = q * b + r;
          if (a > 999 || r * 10 % b === 0 && false) continue;
          const ans = `${q} r ${r}`;
          const prompt = `Work out ${a} ÷ ${b}. Give your answer with a remainder.`;
          const solution = `${b} ${X} ${q} = ${q * b}, and ${a} - ${q * b} = ${r}. The remainder must be less than ${b}. So ${a} ÷ ${b} = ${q} remainder ${r}. Answer: ${ans}`;
          const items = [
            { text: `${q}.${r}`, code: 'REMAINDER-AS-DECIMAL', why: `A remainder is not a decimal: ${q}.${r} is not the same as ${q} remainder ${r}.` },
            { text: `${q - 1} r ${r + b}`, code: 'REM-TOO-BIG', why: `The remainder ${r + b} is bigger than ${b}, so one more ${b} fits: the answer is ${q} r ${r}.` },
            { text: `${q} r ${b - r}`, code: 'NEAR-MISS', why: `Not quite: ${q} r ${b - r} has the wrong remainder. The remainder is what is left after ${q} groups of ${b}: ${a} - ${q * b} = ${r}.` },
          ];
          try { return { type: 'mcq', prompt, ...choices(rng, ans, items, null), solution, skill: SKILL.divRem }; } catch { continue; }
        }
        const b = rng.int(11, 35); const q = rng.int(10, 60);
        const a = q * b;
        if (a > 999) continue;
        const prompt = `Work out ${a} ÷ ${b}.`;
        const T10 = Math.floor(q / 10) * 10;
        const solution = `Use multiples of ${b}: ${b} ${X} ${T10} = ${b * T10}. ${q % 10 ? `${a} - ${b * T10} = ${a - b * T10}, which is ${b} ${X} ${q % 10}. ` : ''}So ${a} ÷ ${b} = ${q}. Check: ${q} ${X} ${b} = ${a}. Answer: ${q}`;
        const items = [
          { text: String(q + 10), code: 'DIV-OFF-BY-TEN', why: `The tens digit is one too big: ${q + 10} ${X} ${b} = ${(q + 10) * b}, not ${a}. Check by multiplying back.` },
          q > 10 ? { text: String(q - 10), code: 'DIV-OFF-BY-TEN', why: `The tens digit is one too small: ${q - 10} ${X} ${b} = ${(q - 10) * b}, not ${a}. Check by multiplying back.` } : null,
          fresh(prompt, { text: String(q + 1), code: 'NEAR-MISS', why: `Not quite: ${q + 1} ${X} ${b} = ${(q + 1) * b}, not ${a}. Check the ones digit of your answer.` }),
          fresh(prompt, { text: String(q - 1), code: 'NEAR-MISS', why: `Not quite: ${q - 1} ${X} ${b} = ${(q - 1) * b}, not ${a}. Check the ones digit of your answer.` }),
        ];
        try {
          const t = typedMisconceptions(String(q), items, { code: 'NEAR-MISS', why: `Not quite. Check by multiplying your answer by ${b}: it should make ${a}.` });
          return { type: 'numeric', prompt, answer: numericAnswer(q, [String(q)]), solution, ...t, skill: SKILL.div2 };
        } catch { continue; }
      }
      // D3: work back from a remainder
      const b = rng.int(6, 25); const q = rng.int(12, 80); const r = rng.int(1, b - 1);
      const n = q * b + r;
      if (n > 2500) continue;
      const prompt = `When a number is divided by ${b}, the answer is ${q} remainder ${r}. What is the number?`;
      const solution = `The number is ${q} lots of ${b}, plus the remainder: ${q} ${X} ${b} + ${r} = ${q * b} + ${r} = ${n}. Check: ${n} ÷ ${b} = ${q} r ${r}. Answer: ${n}`;
      const items = [
        { text: fmtInt(q * b), code: 'REM-LEFT-OUT', why: `${q * b} is ${q} ${X} ${b}, but the remainder ${r} is part of the number too. Add it on.` },
        { text: fmtInt(q * b - r), code: 'REM-SUBTRACTED', why: `It looks like you took the remainder away. The remainder is left over, so it is ADDED: ${q * b} + ${r}.` },
        { text: fmtInt((q + r) * b), code: 'REM-ADDED-BEFORE-MULT', why: `It looks like you added the remainder to ${q} before multiplying. Multiply ${q} by ${b} first, then add ${r}.` },
      ];
      try {
        if (rng.chance(0.4)) {
          const t = typedMisconceptions(fmtInt(n), items, { code: 'REM-LEFT-OUT', why: 'Multiply the answer by the number you divided by, then add the remainder.' });
          return { type: 'numeric', prompt, answer: numericAnswer(n, [fmtInt(n), String(n)]), solution, ...t, marks: 2, skill: SKILL.divRem };
        }
        return { type: 'mcq', prompt, ...choices(rng, fmtInt(n), items, null), solution, marks: 2, skill: SKILL.divRem };
      } catch { /* draw again */ }
    }
  },
};

/** Estimating a quotient with a nearby number that divides easily (guide g05, m06-s3: CLO review m06 item 6). */
function estimateQuotient(rng) {
  for (;;) {
    const b = rng.int(3, 9); const scale = rng.pick([10, 100]); const k = rng.int(2, 9);
    const est = k * scale; const C = b * est;
    const delta = rng.int(-Math.floor((b * scale) / 2) + 1, Math.floor((b * scale) / 2) - 1);
    const a = C + delta;
    if (!delta || a > 9999 || a < 100 || a % 10 === 0) continue;
    const q = Math.floor(a / b); const r = a % b;
    const exact = r ? `${fmtInt(q)} r ${r}` : fmtInt(q);
    const prompt = `Which is the best estimate for ${fmtInt(a)} ÷ ${b}?`;
    const solution = `Change ${fmtInt(a)} to a nearby number that divides easily by ${b}: ${fmtInt(C)}. ${fmtInt(C)} ÷ ${b} = ${fmtInt(est)} (${C / scale} ÷ ${b} = ${k}, then put back the zero${scale === 100 ? 's' : ''}). So ${fmtInt(a)} ÷ ${b} is about ${fmtInt(est)}. Answer: ${fmtInt(est)}`;
    const items = [
      { text: exact, code: 'EST-EXACT', why: `${exact} is the exact answer. An estimate uses a nearby number that is easy to divide: ${fmtInt(C)} ÷ ${b}.` },
      ...rng.shuffle([
        { text: fmtInt(est * 10), code: 'EST-POWER-OF-TEN', why: `The digit is right but there is one zero too many. ${fmtInt(C)} ÷ ${b} = ${fmtInt(est)}: check with ${fmtInt(est)} ${X} ${b} = ${fmtInt(C)}.` },
        est / 10 >= 10 ? { text: fmtInt(est / 10), code: 'EST-POWER-OF-TEN', why: `The digit is right but there is one zero too few. ${fmtInt(C)} ÷ ${b} = ${fmtInt(est)}: check with ${fmtInt(est)} ${X} ${b} = ${fmtInt(C)}.` } : null,
      ].filter(Boolean)),
    ];
    try { return { type: 'mcq', prompt, ...choices(rng, fmtInt(est), items, (i) => { const w = est + (i % 2 ? 1 : -1) * Math.ceil(i / 2) * scale; return w > 0 ? fresh(prompt, nearMiss(fmtInt(w), `Find a number close to ${fmtInt(a)} that ${b} divides exactly.`)) : null; }), solution, skill: SKILL.estQ }; } catch { /* draw again */ }
  }
}

// ---------------------------------------------------------------- g07 interpreting remainders

// each story has its own sizes (CLO review X6): c is the group size, n the amount (n from 3c to nMax)
const UP = [
  { make: (n, c, p) => `A bus can carry ${c} pupils. ${n} pupils are going on a school trip. How many buses are needed?`, unit: 'buses', one: 'bus', c: (rng) => rng.int(24, 45), nMax: 400 },
  { make: (n, c) => `A box holds ${c} eggs. A farmer has ${n} eggs. How many boxes does he need to pack all the eggs?`, unit: 'boxes', one: 'box', c: (rng) => rng.pick([6, 10, 12, 30]), nMax: 600 },
  { make: (n, c, p) => `${p.name} needs to read ${n} pages. ${p.He} reads ${c} pages a day. How many days will ${p.he} take to finish?`, unit: 'days', one: 'day', c: (rng) => rng.int(8, 30), nMax: 400 },
];
const DOWN = [
  { make: (n, c, p) => `${p.name} has ${n} cm of ribbon. Each bow needs ${c} cm of ribbon. How many complete bows can ${p.he} make?`, unit: 'bows', c: (rng) => rng.int(15, 45), nMax: 900 },
  { make: (n, c, p) => `${p.name} has RM ${n}. A ticket to the Penang Hill funicular costs RM ${c}. How many tickets can ${p.he} buy?`, unit: 'tickets', c: (rng) => rng.int(12, 30), nMax: 300 },
  { make: (n, c) => `A baker has ${n} curry puffs. She packs them in boxes of ${c}. How many full boxes can she make?`, unit: 'boxes', c: (rng) => rng.pick([4, 6, 8, 10, 12]), nMax: 200 },
];
const LEFT = [
  { make: (n, c, p) => `${p.name} has ${n} ml of juice. ${p.He} pours it into cups that each hold ${c} ml, and fills as many cups as ${p.he} can. How much juice is left over?`, unit: 'ml', c: (rng) => rng.pick([150, 200, 250, 300]), nMin: 600, nMax: 1999 },
  { make: (n, c) => `${n} sweets are shared equally between ${c} children. Each child gets as many as possible. How many sweets are left over?`, unit: 'sweets', c: (rng) => rng.int(3, 12), nMax: 150 },
];

const interpret = {
  id: 'm06.interpret-remainder', topicId: T, subtopicId: 'm06-s3', skill: SKILL.interpret,
  title: 'Interpret a remainder in a story: round up, round down, or the amount left (D3 with an extra step first)',
  difficulties: [2, 3],
  check: { min: 0, integer: true },
  make(rng, d) {
    for (;;) {
      const p = person(rng);
      const kind = rng.pick(['up', 'down', 'left']);
      let prompt; let ans; let solution; const items = [];
      if (d === 3 && kind !== 'left') {
        if (kind === 'up') {
          const c = rng.int(24, 45); const n = rng.int(60, 400); const extra = rng.int(3, 15);
          const q = Math.floor(n / c); const r = n % c;
          const total = n + extra; const q2 = Math.floor(total / c); const r2 = total % c;
          if (!r2) continue;
          prompt = `${n} pupils and ${extra} teachers are going on a school trip. A bus can carry ${c} people. How many buses are needed?`;
          ans = q2 + 1;
          solution = `People: ${n} + ${extra} = ${total}. ${total} ÷ ${c} = ${q2} r ${r2}. ${countOf(q2, 'bus', 'buses')} carry ${q2 * c} people, so ${countOf(r2, 'person', 'people')} still need${r2 === 1 ? 's' : ''} a bus: ${ans} buses. Answer: ${ans}`;
          items.push({ text: String(q2), code: 'REMAINDER-IGNORED', why: `${countOf(q2, 'bus', 'buses')} leave${q2 === 1 ? 's' : ''} ${countOf(r2, 'person', 'people')} behind. You need one more bus.` });
          if (r) items.push({ text: String(q + 1), code: 'ITEM-LEFT-OUT', why: `That counts only the ${n} pupils. The ${extra} teachers need seats too.` });
          items.push({ text: `${q2} r ${r2}`, code: 'REM-NOT-INTERPRETED', why: 'You cannot have part of a bus. Decide what the remainder means: those people still need a bus.' });
        } else {
          const c = rng.int(8, 30); const n = rng.int(40, 300); const spend = rng.int(8, 40);
          const q = Math.floor(n / c); const r = n % c;
          if (!r || q < 2) continue;
          const have = n + spend;
          prompt = `${p.name} has RM ${have}. ${p.He} spends RM ${spend} on lunch. With the rest, ${p.he} buys tickets that cost RM ${c} each. How many tickets can ${p.he} buy?`;
          ans = q;
          solution = `Money left: RM ${have} - RM ${spend} = RM ${n}. ${n} ÷ ${c} = ${q} r ${r}. The RM ${r} left is not enough for another ticket, so ${p.he} can buy ${q}. Answer: ${q}`;
          items.push({ text: String(q + 1), code: 'REMAINDER-IGNORED', why: `${q + 1} tickets would cost RM ${(q + 1) * c}, more than RM ${n}. Round DOWN: the RM ${r} left over cannot buy a ticket.` });
          items.push({ text: String(Math.floor(have / c)), code: 'ITEM-LEFT-OUT', why: `That uses all RM ${have}. ${p.He} spent RM ${spend} on lunch first.` });
          items.push({ text: `${q} r ${r}`, code: 'REM-NOT-INTERPRETED', why: `You cannot buy part of a ticket. The answer is a whole number of tickets: ${q}.` });
        }
      } else {
        const s = rng.pick(kind === 'up' ? UP : kind === 'down' ? DOWN : LEFT);
        const c = s.c(rng); const n = rng.int(Math.max(3 * c, s.nMin || 0), s.nMax);
        const q = Math.floor(n / c); const r = n % c;
        if (r === 0) continue;
        prompt = s.make(n, c, p);
        if (kind === 'up') {
          ans = q + 1;
          solution = `${n} ÷ ${c} = ${q} r ${r}. ${q} ${s.unit} are not enough: ${r} still left over, so one more ${s.one} is needed. Answer: ${ans}`;
          items.push({ text: String(q), code: 'REMAINDER-IGNORED', why: `${q} ${s.unit} leave ${r} over. You need one more, so round UP.` });
          items.push({ text: `${q} r ${r}`, code: 'REM-NOT-INTERPRETED', why: `The answer must be a whole number of ${s.unit}. The remainder ${r} means one more is needed.` });
        } else if (kind === 'down') {
          ans = q;
          solution = `${n} ÷ ${c} = ${q} r ${r}. The ${r} left over is not enough for another one, so the answer is ${q}. Answer: ${ans}`;
          items.push({ text: String(q + 1), code: 'REMAINDER-IGNORED', why: `There is not enough for ${q + 1}: that needs ${(q + 1) * c}. Round DOWN.` });
          items.push({ text: `${q} r ${r}`, code: 'REM-NOT-INTERPRETED', why: `The question asks how many ${s.unit}: a whole number. The ${r} left over cannot make another one.` });
        } else {
          ans = r;
          solution = `${n} ÷ ${c} = ${q} r ${r}. ${q} ${X} ${c} = ${q * c} is used, so ${n} - ${q * c} = ${r} is left over. Answer: ${ans}`;
          items.push({ text: String(q), code: 'WRONG-QUANTITY', why: `${q} is how many full groups there are. The question asks how much is LEFT OVER: the remainder.` });
          if (c - r !== r) items.push(fresh(prompt, { text: String(c - r), code: 'NEAR-MISS', why: `Not quite: ${c - r} is how much more would be needed for another full group. What is left over is ${n} - ${q} ${X} ${c} = ${r}.` }));
          items.push({ text: `${q} r ${r}`, code: 'REM-NOT-INTERPRETED', why: `The question asks only for the amount left over, which is the remainder, ${r}.` });
        }
      }
      try { return { type: 'mcq', prompt, ...choices(rng, String(ans), items, (i) => { const w = ans + (i % 2 ? 1 : -1) * Math.ceil(i / 2); return w > 0 ? fresh(prompt, nearMiss(String(w), 'Divide, then decide what the remainder means in the story.')) : null; }), solution, marks: d }; } catch { /* draw again */ }
    }
  },
};

// ---------------------------------------------------------------- g09, g10 decimals x and ÷ whole numbers

const decimals = {
  id: 'm06.decimals', topicId: T, subtopicId: 'm06-s4', skill: SKILL.decMult,
  title: 'Multiply or divide a decimal by a whole number (D1 1 dp by 2-9; D2 2 dp and money; D3 × a 2-digit number or ÷ 11-12)',
  difficulties: [1, 2, 3],
  check: { min: 0, maxDp: 3 },
  make(rng, d) {
    for (;;) {
      const mult = rng.chance(0.5);
      const p = d === 1 ? 1 : 2;
      // D3 divides by 6-9 only (no long division by 11 or 12: CLO review m06 item 9), with a bigger dividend
      const n = d === 3 ? (mult ? rng.int(12, 48) : rng.int(6, 9)) : rng.int(2, 9);
      let a; let r;
      if (mult) { a = rng.int(11, d === 1 ? 99 : 999); if (a % 10 === 0) continue; r = a * n; } else { r = rng.int(d === 3 ? 101 : 11, d === 1 ? 99 : 999); if (r % 10 === 0) continue; a = r * n; }
      // a and r are in units of 10^-p
      const money = d === 2 && mult && rng.chance(0.35);
      const ta = fx(a, p); const tr = fx(r, p);
      const prompt = money
        ? `${rng.pick(['A pen', 'A packet of tissues', 'A curry puff', 'A bottle of water', 'A pencil'])} costs ${rm(a / 100)}. How much do ${n} of them cost?`
        : `Work out ${ta} ${mult ? X : '÷'} ${n}.`;
      const showR = money ? rm(r / 100) : tr;
      const intA = a; const intR = r;
      const trFull = `${fmtInt(Math.floor(r / 10 ** p))}.${String(r % 10 ** p).padStart(p, '0')}`;
      // estimates: to the nearest whole number, or to 1 decimal place when the number is less than 1,
      // so an estimate is never "0 x 14 = 0" (CLO review m06 item 1)
      const est = (u) => (u >= 10 ** p ? fx(Math.round(u / 10 ** p), 0) : fx(Math.max(1, Math.round(u / 10 ** (p - 1))), 1));
      const estVal = (u) => valueOf(est(u));
      const multEst = `${est(a)} ${X} ${n} = ${fx(Math.round(estVal(a) * n * 10), 1)}`;
      const qe = est(r);
      const divEst = `${n} ${X} ${qe} = ${fx(Math.round(estVal(r) * n * 10), 1)}, which is close to ${ta}, so the answer is about ${qe}`;
      const solution = mult
        ? `Multiply as if there were no decimal point: ${intA} ${X} ${n} = ${fmtInt(intR)}. ${ta} has ${countOf(p, 'decimal place')}, so the answer has ${p} too: ${trFull}${trFull !== tr ? ` = ${tr}` : ''}. Estimate to check: ${ta} is about ${est(a)}, and ${multEst}. Answer: ${showR}`
        : `Estimate first: ${divEst}. Divide as usual and keep the decimal point in line: ${ta} ÷ ${n} = ${tr}. Check: ${tr} ${X} ${n} = ${ta}. Answer: ${tr}`;
      const items = [];
      const shift = (v, k) => (k > 0 ? fx(v * 10, p) : fx(v, p + 1));
      if (mult) {
        items.push({ text: money ? rm(r / 10) : shift(r, 1), code: 'DEC-MULT-POINT', why: `The digits are right but the decimal point is in the wrong place: the answer is 10 times too big. ${ta} has ${p} decimal place${p > 1 ? 's' : ''}, so the answer has ${p}.` });
        if (!money && dpOf(r, p) + 1 <= 3) items.push({ text: shift(r, -1), code: 'DEC-MULT-POINT', why: `The digits are right but the decimal point is in the wrong place: the answer is 10 times too small. Estimate: ${multEst}.` });
        const w = Math.floor(a / 10 ** p); const f = a % 10 ** p;
        if (n < 10 && f * n >= 10 ** p && !money) items.push({ text: `${w * n}.${f * n}`, code: 'DEC-MULT-PARTS', why: `It looks like you multiplied ${w} and ${String(f).padStart(p, '0')} separately and wrote them side by side. ${countOf(f, p === 1 ? 'tenth' : 'hundredth')} ${X} ${n} = ${countOf(f * n, p === 1 ? 'tenth' : 'hundredth')}, which carries into the ones.` });
      } else {
        items.push({ text: shift(r, 1), code: 'DEC-DIV-POINT', why: `The digits are right but the decimal point is in the wrong place: the answer is 10 times too big. Keep the point in line with the point in ${ta}.` });
        if (dpOf(r, p) + 1 <= 3) items.push({ text: shift(r, -1), code: 'DEC-DIV-POINT', why: `The digits are right but the decimal point is in the wrong place: the answer is 10 times too small. Estimate: ${divEst}.` });
      }
      const skill = mult ? SKILL.decMult : SKILL.decDiv;
      try {
        if (!money && rng.chance(0.3)) {
          const t = typedMisconceptions(tr, items, { code: mult ? 'DEC-MULT-POINT' : 'DEC-DIV-POINT', why: 'Work with the digits, then place the decimal point and check with an estimate.' });
          return { type: 'numeric', prompt, answer: numericAnswer(r / 10 ** p, [tr]), solution, ...t, marks: d === 3 ? 2 : 1, skill };
        }
        return { type: 'mcq', prompt, ...choices(rng, showR, items, (i) => fresh(prompt, nearMiss(money ? rm((r + i) / 100) : fx(r + (i % 2 ? 1 : -1) * Math.ceil(i / 2), p), 'Work with the digits, then place the decimal point.'))), solution, marks: d === 3 ? 2 : 1, skill };
      } catch { /* draw again */ }
    }
  },
};

// ---------------------------------------------------------------- g11 multi-step word problems

/** Money always with two decimal places, so one question never mixes "RM 44" with "RM 88.80" (CLO review m06 item 10). */
const rm2 = (x) => { const c = Math.round(x * 100); return `RM ${fmtInt(Math.floor(c / 100))}.${String(c % 100).padStart(2, '0')}`; };

const words = {
  id: 'm06.word-problems', topicId: T, subtopicId: 'm06-s5', skill: SKILL.words,
  title: 'Multi-step word problems with × and ÷ (D1 buy and get change; D2 share a bill, or a 2-digit multiplication; D3 three steps with money, sharing or lengths)',
  difficulties: [1, 2, 3],
  check: { min: 0 },
  make(rng, d) {
    for (;;) {
      const p = person(rng);
      if (d === 1) {
        const price = rng.int(3, 40) * 10; const n = rng.int(2, 9);
        const cost = price * n; const note = [1000, 2000, 5000].find((x) => x > cost);
        if (!note) continue;
        const thing = rng.pick(['pencils', 'erasers', 'curry puffs', 'stickers', 'kuih']);
        const prompt = `${thing[0].toUpperCase()}${thing.slice(1)} cost ${rm2(price / 100)} each. ${p.name} buys ${n} ${thing} and pays with a ${rm(note / 100)} note. How much change does ${p.he} get?`;
        const ch = note - cost;
        const solution = `Cost: ${n} ${X} ${rm2(price / 100)} = ${rm2(cost / 100)}. Change: ${rm(note / 100)} - ${rm2(cost / 100)} = ${rm2(ch / 100)}. Answer: ${rm2(ch / 100)}`;
        const items = [
          { text: rm2(cost / 100), code: 'ONE-STEP-ONLY', why: `${rm2(cost / 100)} is the cost of the ${thing}. Now take it away from ${rm(note / 100)} to find the change.` },
          { text: rm2((note - price) / 100), code: 'ITEM-LEFT-OUT', why: `That is the change for only one. ${p.He} buys ${n}: ${n} ${X} ${rm2(price / 100)} first.` },
        ];
        try { return { type: 'mcq', prompt, ...choices(rng, rm2(ch / 100), items, (i) => (ch - 10 * i > 0 ? fresh(prompt, nearMiss(rm2((ch + (i % 2 ? 10 : -10) * i) / 100), 'Find the total cost first, then the change.')) : null)), solution, marks: 2 }; } catch { continue; }
      }
      // D2 is not D1 again: share a bill (x then ÷), or a bigger 2-digit multiplication (CLO review m06 item 3)
      const kind = d === 2 ? rng.pick(['split', 'split', 'pack']) : rng.pick(['two-items', 'share', 'rope']);
      if (kind === 'split') {
        const k = rng.int(1, 5); const people = k + 1; const n = rng.int(2, 9); const price = rng.int(12, 90) * 10;
        const total = n * price;
        if (total % (people * 10) || total / people < 100) continue;
        const thing = rng.pick([['plates of satay', 'plate'], ['bowls of cendol', 'bowl'], ['roti canai', 'roti canai'], ['cups of teh tarik', 'cup'], ['pieces of kuih', 'piece']]);
        const each = total / people;
        const prompt = `${p.name} and ${countOf(k, 'friend')} buy ${n} ${thing[0]} at ${rm2(price / 100)} each. They share the cost equally. How much does each person pay?`;
        const solution = `Total cost: ${n} ${X} ${rm2(price / 100)} = ${rm2(total / 100)}. There are ${people} people (${p.name} and ${countOf(k, 'friend')}). Each pays ${rm2(total / 100)} ÷ ${people} = ${rm2(each / 100)}. Answer: ${rm2(each / 100)}`;
        const items = [
          { text: rm2(total / 100), code: 'ONE-STEP-ONLY', why: `${rm2(total / 100)} is the total cost. Now share it between the ${people} people.` },
          k > 1 && total % (k * 10) === 0 ? { text: rm2(total / k / 100), code: 'ITEM-LEFT-OUT', why: `It looks like you shared between the ${k} friends only. ${p.name} pays too, so there are ${people} people.` } : null,
          price % people === 0 && price / people !== each ? { text: rm2(price / people / 100), code: 'WRONG-QUANTITY', why: `That shares the price of only one ${thing[1]}. They buy ${n}: find the total cost first.` } : null,
        ];
        try { return { type: 'mcq', prompt, ...choices(rng, rm2(each / 100), items, (i) => { const x = each + (i % 2 ? 1 : -1) * Math.ceil(i / 2) * 50; return x > 0 ? fresh(prompt, nearMiss(rm2(x / 100), 'Find the total cost first, then share it equally between everyone.')) : null; }), solution, marks: 2 }; } catch { continue; }
      }
      if (kind === 'change') {
        const price = rng.int(60, 300) * 5; const n = rng.int(2, 6);
        const cost = price * n; const note = [5000, 10000].find((x) => x > cost);
        if (!note || price % 100 === 0) continue;
        const prompt = `${p.name}'s family takes ${n} Grab rides. Each ride costs ${rm2(price / 100)}. They pay with ${rm(note / 100)}. How much change do they get?`;
        const ch = note - cost;
        const solution = `Rides: ${n} ${X} ${rm2(price / 100)} = ${rm2(cost / 100)}. Change: ${rm(note / 100)} - ${rm2(cost / 100)} = ${rm2(ch / 100)}. Answer: ${rm2(ch / 100)}`;
        const items = [
          { text: rm2(cost / 100), code: 'ONE-STEP-ONLY', why: `${rm2(cost / 100)} is what the rides cost. The question asks for the change.` },
          { text: rm2((note - price) / 100), code: 'ITEM-LEFT-OUT', why: `That is the change for one ride only. There are ${n} rides.` },
          { text: rm2((note - cost / 10) / 100), code: 'DEC-MULT-POINT', why: `It looks like the decimal point slipped in ${n} ${X} ${rm2(price / 100)}: it is ${rm2(cost / 100)}.` },
        ];
        if (note - cost / 10 <= 0 || cost % 10) items.pop();
        try { return { type: 'mcq', prompt, ...choices(rng, rm2(ch / 100), items, null), solution, marks: 2 }; } catch { continue; }
      }
      if (kind === 'pack') {
        const a = rng.int(105, 1999); const b = rng.int(12, 48);
        if (a * b > 99999) continue;
        const t = rng.pick([['A factory packs', 'boxes each day. Each box holds', 'bottles. How many bottles does the factory pack each day?'], ['A school orders', 'packs of paper. Each pack has', 'sheets. How many sheets is that?'], ['A durian farm sends', 'crates to KL. Each crate holds', 'durians. How many durians is that?']]);
        const prompt = `${t[0]} ${fmtInt(a)} ${t[1]} ${b} ${t[2]}`;
        const r = a * b; const tt = Math.floor(b / 10); const u = b % 10;
        const solution = `${fmtInt(a)} ${X} ${b} = ${fmtInt(a)} ${X} ${u} + ${fmtInt(a)} ${X} ${tt * 10} = ${fmtInt(a * u)} + ${fmtInt(a * tt * 10)} = ${fmtInt(r)}. Answer: ${fmtInt(r)}`;
        if (!u) continue;
        const items = [
          { text: fmtInt(a * u + a * tt), code: 'PLACE-HOLDER', why: `It looks like the second row was ${fmtInt(a)} ${X} ${tt}, without the 0 place holder. It should be ${fmtInt(a)} ${X} ${tt * 10}.` },
          { text: fmtInt(a * tt * 10), code: 'PARTIAL-PRODUCT', why: `That is only ${fmtInt(a)} ${X} ${tt * 10}. Add ${fmtInt(a)} ${X} ${u} too.` },
          { text: fmtInt(a + b), code: 'OP-SWAP', why: 'It looks like you added. Each box holds the same number, so multiply.' },
        ];
        try { return { type: 'mcq', prompt, ...choices(rng, fmtInt(r), items, null), solution, marks: 1 }; } catch { continue; }
      }
      if (kind === 'two-items') {
        const n1 = rng.int(12, 60); const p1 = rng.int(30, 90) * 10; const n2 = rng.int(12, 60); const p2 = rng.int(30, 90) * 10;
        if (p1 === p2) continue;
        const total = n1 * p1 + n2 * p2;
        const [f1, f2] = rng.sample(['bowls of laksa', 'plates of chicken rice', 'cups of cendol', 'plates of nasi lemak', 'bowls of mee rebus'], 2);
        const prompt = `A hawker sells ${n1} ${f1} at ${rm2(p1 / 100)} each and ${n2} ${f2} at ${rm2(p2 / 100)} each. How much money does the hawker take altogether?`;
        const solution = `${n1} ${X} ${rm2(p1 / 100)} = ${rm2(n1 * p1 / 100)}. ${n2} ${X} ${rm2(p2 / 100)} = ${rm2(n2 * p2 / 100)}. Total: ${rm2(n1 * p1 / 100)} + ${rm2(n2 * p2 / 100)} = ${rm2(total / 100)}. Answer: ${rm2(total / 100)}`;
        const items = [
          { text: rm2(n1 * p1 / 100), code: 'ITEM-LEFT-OUT', why: `That is only the ${f1}. Add the money for the ${f2} too.` },
          { text: rm2((n1 + n2) * (p1 + p2) / 100), code: 'WRONG-QUANTITY', why: `It looks like you multiplied the total number of dishes by the total of the two prices. Work out each kind separately, then add.` },
          total % 10 === 0 ? { text: rm2(total / 1000), code: 'DEC-MULT-POINT', why: 'The digits are right but the decimal point slipped: the answer is 10 times too small. Check with an estimate.' } : null,
        ];
        try { return { type: 'mcq', prompt, ...choices(rng, rm2(total / 100), items, null), solution, marks: 3 }; } catch { continue; }
      }
      if (kind === 'share') {
        const boxes = rng.int(6, 30); const per = rng.int(8, 36); const classes = rng.int(4, 18);
        const total = boxes * per;
        if (total % classes || total / classes < 3) continue;
        if ([boxes, per, classes].includes(total / classes)) continue; // the answer must not be a number from the question (CLO review m06 item 7)
        const prompt = `A school buys ${boxes} boxes of markers. Each box has ${per} markers. The markers are shared equally among ${classes} classes. How many markers does each class get?`;
        const ans = total / classes;
        const solution = `Markers: ${boxes} ${X} ${per} = ${total}. Each class: ${total} ÷ ${classes} = ${ans}. Answer: ${ans}`;
        const items = [
          { text: fmtInt(total), code: 'ONE-STEP-ONLY', why: `${total} is the total number of markers. Now share them among ${classes} classes.` },
          per % classes === 0 ? { text: String(per / classes), code: 'ITEM-LEFT-OUT', why: `That shares only one box. There are ${boxes} boxes: ${boxes} ${X} ${per} = ${total} markers first.` } : null,
        ];
        try { return { type: 'mcq', prompt, ...choices(rng, String(ans), items, (i) => (ans + (i % 2 ? i : -i) > 0 ? fresh(prompt, nearMiss(String(ans + (i % 2 ? i : -i)), 'Multiply to find all the markers, then divide by the number of classes.')) : null)), solution, marks: 3 }; } catch { continue; }
      }
      // rope: cut into equal pieces, some used, what is left
      const n = rng.int(3, 9); const piece = rng.int(11, 99); const used = rng.int(1, n - 1);
      const L = piece * n; // tenths of a metre
      const left = piece * (n - used);
      const prompt = `A rope ${fx(L, 1)} m long is cut into ${n} equal pieces. ${p.name} uses ${used} of the pieces. What is the total length of rope that is left?`;
      const solution = `One piece: ${fx(L, 1)} ÷ ${n} = ${fx(piece, 1)} m. Pieces left: ${n} - ${used} = ${n - used}. Length left: ${n - used} ${X} ${fx(piece, 1)} = ${fx(left, 1)} m. Answer: ${fx(left, 1)} m`;
      const items = [
        { text: `${fx(piece, 1)} m`, code: 'ONE-STEP-ONLY', why: `${fx(piece, 1)} m is the length of one piece. ${n - used} pieces are left.` },
        { text: `${fx(piece * used, 1)} m`, code: 'WRONG-QUANTITY', why: `That is the rope ${p.name} used. The question asks how much is left.` },
        { text: `${fx(L - used * 10, 1)} m`, code: 'ITEM-LEFT-OUT', why: `It looks like you took away ${used} m instead of ${used} pieces. Find the length of one piece first.` },
      ];
      try { return { type: 'mcq', prompt, ...choices(rng, `${fx(left, 1)} m`, items, null), solution, marks: 3 }; } catch { /* draw again */ }
    }
  },
};

export default [orderOps, laws, multiply, estimate, divide, interpret, decimals, words];
