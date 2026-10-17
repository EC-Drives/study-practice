// m10 Calculations with Fractions: adding and subtracting fractions and mixed numbers, fractions
// of amounts, multiplying and dividing fractions by whole numbers, word problems.
// Patterns and ranges follow the CLO's generator guide (section 2, m10). Every wrong option is
// built by one named misconception (misconceptions.js) and carries its code.

import { F, choices, typedMisconceptions, nearMiss, numericAnswer, fmtInt, rm, lcm, person, denWord, capFirst, valueOf } from './core.js';

const T = 'm10-calculations-with-fractions';
const SKILL = {
  add: 'adding fractions with unlike denominators', sub: 'subtracting fractions with unlike denominators',
  addMixed: 'adding mixed numbers', subMixed: 'subtracting mixed numbers', of: 'fraction of an amount',
  times: 'multiplying a fraction by a whole number', div: 'dividing a fraction by a whole number', words: 'fraction word problems',
};

/** A proper fraction a/b in simplest form with b from the list (a from 1 to b - 1). */
function properFrac(rng, dens) {
  for (;;) {
    const b = rng.pick(dens);
    const a = rng.int(1, b - 1);
    if (F(a, b).d === b) return F(a, b);
  }
}
/** Simplest form, as a mixed number when it is more than 1. */
const simplest = (f) => (Math.abs(f.n) > f.d && f.d !== 1 ? f.mixed() : f.toString());
/** A fraction written over a given denominator (it must divide exactly). */
const over = (f, L) => `${f.n * (L / f.d)}/${L}`;
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const D2_12 = range(2, 12);
/** "in twelfths", or "with denominator 21" when there is no everyday word (never "21sts": CLO review m10 item 6). */
const inDen = (L) => (L <= 12 ? `in ${denWord(L)}` : `with denominator ${L}`);

/** The numbers written in a prompt, read the way the tests read them. */
const promptNums = (prompt) => (String(prompt).replace(/(\d) (\d{3})/g, '$1$2').match(/-?\d+(?:\.\d+)?(?:\/\d+)?/g) || []).map((t) => valueOf(t)).filter((x) => x != null);
/** A near miss is never a number that already appears in the question (CLO review X3): null if it does. */
const fresh = (prompt, d) => { if (!d) return null; const v = valueOf(d.text); return v != null && promptNums(prompt).some((x) => Math.abs(x - v) < 1e-9) ? null : d; };

// ---------------------------------------------------------------- g01, g03 adding and subtracting fractions

const addSub = {
  id: 'm10.add-sub-unlike', topicId: T, subtopicId: 'm10-s1', skill: SKILL.add,
  title: 'Add or subtract two fractions with different denominators (D3: find the missing fraction)',
  difficulties: [1, 2, 3],
  check: { min: 0 },
  make(rng, d) {
    if (d === 3) return missingAddend(rng);
    for (;;) {
      const op = rng.chance(0.5) ? '+' : '-';
      let x; let y;
      if (d === 1) { // one denominator a multiple of the other
        const [b, c] = rng.pick([[2, 4], [2, 6], [2, 8], [2, 10], [2, 12], [3, 6], [3, 9], [3, 12], [4, 8], [4, 12], [5, 10], [6, 12]]);
        x = properFrac(rng, [b]); y = properFrac(rng, [c]);
        if (rng.chance(0.5)) [x, y] = [y, x];
      } else {
        x = properFrac(rng, D2_12); y = properFrac(rng, D2_12);
        if (x.d % y.d === 0 || y.d % x.d === 0 || lcm(x.d, y.d) > 60) continue; // unrelated denominators at D2
      }
      if (op === '-' && x.cmp(y) < 0) [x, y] = [y, x];
      if (x.eq(y)) continue;
      if (op === '-' && x.n === y.n) continue; // both named slips would give 0 (CLO review m10 item 1)
      const r = op === '+' ? x.add(y) : x.sub(y);
      if (d === 1 && r.cmp(1) >= 0) continue;
      if (op === '+' && F(x.n + y.n, x.d + y.d).eq(r)) continue; // a misconception must not hit the answer
      const L = lcm(x.d, y.d);
      const word = op === '+' ? 'add' : 'subtract';
      const rawN = x.n * (L / x.d) + (op === '+' ? 1 : -1) * y.n * (L / y.d);
      const raw = `${rawN}/${L}`;
      const prompt = `Work out ${x} ${op} ${y}. Give your answer in its simplest form.`;
      const conv = [x.d !== L ? `${x} = ${over(x, L)}` : '', y.d !== L ? `${y} = ${over(y, L)}` : ''].filter(Boolean).join(' and ');
      const solution = `Make the denominators the same: the lowest common multiple of ${x.d} and ${y.d} is ${L}, so ${conv}. Then ${over(x, L)} ${op} ${over(y, L)} = ${raw}${raw !== simplest(r) ? `, which simplifies to ${simplest(r)}` : ''}. Remember: ${word} only the numerators, never the denominators. Answer: ${simplest(r)}`;
      const big = x.d > y.d ? x : y; const small = x.d > y.d ? y : x;
      const kb = op === '+' ? x.n + y.n : x.n - y.n;
      const distractors = [
        op === '+' ? { text: `${x.n + y.n}/${x.d + y.d}`, code: 'FR-ADD-TOPS-BOTTOMS', why: `It looks like you added the top numbers (${x.n} + ${y.n}) and the bottom numbers (${x.d} + ${y.d}). Fractions need the same denominator before you add; then add only the numerators.` }
          : (x.n !== y.n && Math.abs(x.d - y.d) > 1 ? { text: `${Math.abs(x.n - y.n)}/${Math.abs(x.d - y.d)}`, code: 'FR-ADD-TOPS-BOTTOMS', why: `It looks like you subtracted the top numbers (${Math.max(x.n, y.n)} - ${Math.min(x.n, y.n)}) and the bottom numbers (${Math.max(x.d, y.d)} - ${Math.min(x.d, y.d)}). Make the denominators the same first, then subtract only the numerators.` } : null),
        kb > 0 ? { text: `${kb}/${big.d}`, code: 'FR-ADD-TOPS-KEEP-BOTTOM', why: `It looks like you ${op === '+' ? 'added' : 'subtracted'} the numerators and kept the denominator ${big.d}, without changing ${small} into ${denWord(big.d)} first.` } : null,
        { text: simplest(op === '+' ? (x.cmp(y) > 0 ? x.sub(y) : y.sub(x)) : x.add(y)), code: 'OP-SWAP', why: `It looks like you ${op === '+' ? 'subtracted' : 'added'}. This question asks you to ${word}.` },
      ];
      const skill = op === '+' ? SKILL.add : SKILL.sub;
      try {
        if (d === 2 && rng.chance(0.4)) {
          const t = typedMisconceptions(simplest(r), distractors, { code: 'FR-ADD-TOPS-BOTTOMS', why: `Make the denominators the same before you ${word}; then ${word} only the numerators, and simplify.` });
          // simplest form: the lowest-terms mixed number or improper fraction both count
          return { type: 'short', prompt, answer: { accept: [...new Set([simplest(r), r.toString()])], keywords: [] }, solution, ...t, skill };
        }
        const c = choices(rng, simplest(r), distractors, (i) => fresh(prompt, nearMiss(simplest(r.add(F(i, L))), `Write both fractions ${inDen(L)}, then ${word} the numerators.`)));
        return { type: 'mcq', prompt, ...c, solution, skill };
      } catch { /* draw again */ }
    }
  },
};

/** D3: the missing fraction in an addition or subtraction (work backwards with the inverse). */
function missingAddend(rng) {
  for (;;) {
    const kind = rng.pick(['a+?=c', '?+a=c', 'c-?=a', '?-a=c']);
    const a = properFrac(rng, D2_12); const c = properFrac(rng, D2_12);
    if (a.d === c.d || lcm(a.d, c.d) > 48 || a.eq(c)) continue;
    if (kind !== '?-a=c' && c.cmp(a) <= 0) continue;
    if (kind === '?-a=c' && a.add(c).cmp(1) >= 0) continue;
    // a + ? = c and c - ? = a: the missing part is c - a. ? - a = c: it is c + a.
    const ans = kind === '?-a=c' ? c.add(a) : c.sub(a);
    const wrongInverse = kind === '?-a=c' ? (c.cmp(a) > 0 ? c.sub(a) : a.sub(c)) : c.add(a);
    const L = lcm(a.d, c.d);
    const prompts = {
      'a+?=c': `What is the missing fraction? ${a} + ? = ${c}. Give your answer in its simplest form.`,
      '?+a=c': `What is the missing fraction? ? + ${a} = ${c}. Give your answer in its simplest form.`,
      'c-?=a': `What is the missing fraction? ${c} - ? = ${a}. Give your answer in its simplest form.`,
      '?-a=c': `What is the missing fraction? ? - ${a} = ${c}. Give your answer in its simplest form.`,
    };
    const plus = kind === '?-a=c';
    const rawN = plus ? c.n * (L / c.d) + a.n * (L / a.d) : c.n * (L / c.d) - a.n * (L / a.d);
    const solution = `Use the inverse: the missing fraction is ${plus ? `${c} + ${a}` : `${c} - ${a}`}. With denominator ${L}: ${over(c, L)} ${plus ? '+' : '-'} ${over(a, L)} = ${rawN}/${L}${`${rawN}/${L}` !== simplest(ans) ? ` = ${simplest(ans)}` : ''}. Check by putting it back into the calculation. Answer: ${simplest(ans)}`;
    const distractors = [
      { text: simplest(wrongInverse), code: 'INVERSE-WRONG', why: plus ? `It looks like you subtracted. To undo "- ${a}", add ${a} to ${c}.` : `It looks like you added. To find the missing part, subtract: ${c} - ${a}.` },
      !plus && c.n > a.n && c.d > a.d + 1 ? { text: `${c.n - a.n}/${c.d - a.d}`, code: 'FR-ADD-TOPS-BOTTOMS', why: 'It looks like you subtracted the top numbers and the bottom numbers. Make the denominators the same first.' } : null,
      plus ? { text: `${c.n + a.n}/${c.d + a.d}`, code: 'FR-ADD-TOPS-BOTTOMS', why: 'It looks like you added the top numbers and the bottom numbers. Make the denominators the same first.' } : null,
      (plus ? c.n + a.n : c.n - a.n) > 0 ? { text: F(plus ? c.n + a.n : c.n - a.n, Math.max(a.d, c.d)).toString(), code: 'FR-ADD-TOPS-KEEP-BOTTOM', why: `It looks like you ${plus ? 'added' : 'subtracted'} the numerators ${c.n} and ${a.n} and kept the denominator ${Math.max(a.d, c.d)}, without writing both fractions ${inDen(L)} first.` } : null,
    ];
    try {
      const ch = choices(rng, simplest(ans), distractors, (i) => fresh(prompts[kind], nearMiss(simplest(ans.add(F(i, L))), `Use the inverse operation, with both fractions written ${inDen(L)}.`)));
      return { type: 'mcq', prompt: prompts[kind], ...ch, solution, marks: 2, skill: plus ? SKILL.add : SKILL.sub };
    } catch { /* draw again */ }
  }
}

// ---------------------------------------------------------------- g02 mixed numbers

const RELATED = [[2, 4], [2, 6], [2, 8], [2, 10], [3, 6], [3, 9], [3, 12], [4, 8], [4, 12], [5, 10], [6, 12]];

const mixedAddSub = {
  id: 'm10.mixed-add-sub', topicId: T, subtopicId: 'm10-s2', skill: SKILL.addMixed,
  title: 'Add or subtract mixed numbers (D2 with exchanging; D3 three steps or a whole minus a mixed number)',
  difficulties: [1, 2, 3],
  check: { min: 0 },
  make(rng, d) {
    if (d === 3) return mixedThree(rng);
    for (;;) {
      const op = rng.chance(0.5) ? '+' : '-';
      let da; let db;
      if (d === 1) { [da, db] = rng.pick(RELATED); if (rng.chance(0.5)) [da, db] = [db, da]; } else { da = rng.pick(D2_12); db = rng.pick(D2_12); if (da === db || lcm(da, db) > 24) continue; }
      const fa = properFrac(rng, [da]); const fb = properFrac(rng, [db]);
      const wa = rng.int(2, 9); const wb = rng.int(1, wa - 1);
      const exchange = op === '+' ? fa.add(fb).cmp(1) >= 0 : fa.cmp(fb) < 0;
      if (d === 1 && exchange) continue;
      if (op === '-' && fa.n === fb.n) continue; // both named slips would give a whole number (CLO review m10 item 1)
      if (d === 2 && !exchange) continue;
      if (op === '-' && wa - wb < (exchange ? 2 : 1)) continue;
      const a = F(wa).add(fa); const b = F(wb).add(fb);
      const r = op === '+' ? a.add(b) : a.sub(b);
      if (r.isInt) continue;
      const L = lcm(da, db);
      const prompt = `Work out ${a.mixed()} ${op} ${b.mixed()}. Give your answer as a mixed number in its simplest form.`;
      let solution;
      const fs = fa.add(fb);
      if (op === '+') {
        const rawS = `${fa.n * (L / fa.d) + fb.n * (L / fb.d)}/${L}`;
        solution = `Add the whole numbers: ${wa} + ${wb} = ${wa + wb}. Add the fractions: ${over(fa, L)} + ${over(fb, L)} = ${rawS}${rawS !== fs.mixed() ? ` = ${fs.mixed()}` : ''}${fs.cmp(1) >= 0 ? ', which is more than 1, so carry 1 whole' : ''}. ${wa + wb} + ${fs.mixed()} = ${r.mixed()}. Answer: ${r.mixed()}`;
      } else if (!exchange) {
        const dn = fa.n * (L / fa.d) - fb.n * (L / fb.d);
        solution = `Subtract the whole numbers: ${wa} - ${wb} = ${wa - wb}. Subtract the fractions: ${over(fa, L)} - ${over(fb, L)} = ${dn}/${L}${fa.sub(fb).toString() !== `${dn}/${L}` ? ` = ${fa.sub(fb)}` : ''}. So the answer is ${r.mixed()}. Answer: ${r.mixed()}`;
      } else {
        const ex = fa.add(1);
        solution = `${over(fa, L)} is smaller than ${over(fb, L)}, so exchange 1 whole: ${a.mixed()} = ${wa - 1} and ${ex.n * (L / ex.d)}/${L}. Then ${wa - 1} - ${wb} = ${wa - 1 - wb}, and ${ex.n * (L / ex.d)}/${L} - ${over(fb, L)} = ${ex.sub(fb)}. So the answer is ${r.mixed()}. Answer: ${r.mixed()}`;
      }
      const distractors = [];
      if (op === '-' && exchange) {
        distractors.push({ text: F(wa - wb).add(fb.sub(fa)).mixed(), code: 'FR-MIXED-WHOLE-ONLY', why: `It looks like you took the smaller fraction from the larger one (${fb} - ${fa}). When the first fraction is smaller, exchange 1 whole for fraction pieces first.` });
        distractors.push({ text: r.add(1).mixed(), code: 'FR-MIXED-WHOLE-ONLY', why: `It looks like you exchanged 1 whole for fraction pieces but still worked out ${wa} - ${wb}. After the exchange, ${wa} becomes ${wa - 1}.` });
      }
      if (op === '+' && exchange) distractors.push({ text: F(wa + wb).add(fs.sub(1)).mixed(), code: 'FR-MIXED-NO-CARRY', why: `The fractions add up to ${fs.mixed()}, which is more than 1. It looks like you kept only the ${fs.sub(1)} and did not carry the 1 whole.` });
      if (op === '+') distractors.push({ text: `${wa + wb} ${fa.n + fb.n}/${fa.d + fb.d}`, code: 'FR-ADD-TOPS-BOTTOMS', why: `It looks like you added the top numbers and the bottom numbers of the fractions. Write them ${inDen(L)} first, then add only the numerators.` });
      if (op === '-' && fa.n > fb.n && fa.d > fb.d + 1) distractors.push({ text: `${wa - wb} ${fa.n - fb.n}/${fa.d - fb.d}`, code: 'FR-ADD-TOPS-BOTTOMS', why: `It looks like you subtracted the top numbers and the bottom numbers of the fractions. Write them ${inDen(L)} first.` });
      distractors.push({ text: (op === '+' ? a.sub(b) : a.add(b)).mixed(), code: 'OP-SWAP', why: `It looks like you ${op === '+' ? 'subtracted' : 'added'}. This question asks you to ${op === '+' ? 'add' : 'subtract'}.` });
      const big = Math.max(da, db);
      const kb = op === '+' ? fa.n + fb.n : fa.n - fb.n;
      if (kb > 0 && kb < big) distractors.push({ text: `${op === '+' ? wa + wb : wa - wb} ${kb}/${big}`, code: 'FR-ADD-TOPS-KEEP-BOTTOM', why: `It looks like you ${op === '+' ? 'added' : 'subtracted'} the numerators ${fa.n} and ${fb.n} and kept the denominator ${big}, without changing the other fraction into ${denWord(big)} first.` });
      try {
        const c = choices(rng, r.mixed(), distractors, (i) => fresh(prompt, nearMiss(r.add(F(i, L)).mixed(), `Write both fractions ${inDen(L)}, then work with the whole numbers and the fractions.`)));
        return { type: 'mcq', prompt, ...c, solution, marks: d === 2 ? 2 : 1, skill: op === '+' ? SKILL.addMixed : SKILL.subMixed };
      } catch { /* draw again */ }
    }
  },
};

/** D3: three mixed numbers, or a whole number minus a mixed number. */
function mixedThree(rng) {
  for (;;) {
    if (rng.chance(0.35)) {
      // a whole number minus a mixed number: 5 - 2 3/4
      const w = rng.int(3, 10);
      const wb = rng.int(1, w - 2);
      const fb = properFrac(rng, D2_12);
      const b = F(wb).add(fb);
      const r = F(w).sub(b);
      const prompt = `Work out ${w} - ${b.mixed()}. Give your answer as a mixed number.`;
      const solution = `Exchange 1 whole: ${w} = ${w - 1} and ${fb.d}/${fb.d}. Then ${w - 1} - ${wb} = ${w - 1 - wb}, and ${fb.d}/${fb.d} - ${fb} = ${F(1).sub(fb)}. So ${w} - ${b.mixed()} = ${r.mixed()}. Answer: ${r.mixed()}`;
      const distractors = [
        { text: F(w - wb).add(fb).mixed(), code: 'FR-MIXED-WHOLE-ONLY', why: `It looks like you worked out ${w} - ${wb} = ${w - wb} and kept the ${fb}. Taking away ${fb} as well leaves less than ${w - wb}: exchange 1 whole first.` },
        { text: F(w - wb).add(F(1).sub(fb)).mixed(), code: 'FR-MIXED-WHOLE-ONLY', why: `You found 1 - ${fb} = ${F(1).sub(fb)}, but the whole you exchanged has gone: ${w} becomes ${w - 1}.` },
        { text: F(w + wb).add(fb).mixed(), code: 'OP-SWAP', why: 'It looks like you added instead of subtracting.' },
      ];
      try {
        return { type: 'mcq', prompt, ...choices(rng, r.mixed(), distractors, (i) => (r.add(F(i, fb.d)).n > 0 ? fresh(prompt, nearMiss(r.add(F(i, fb.d)).mixed(), 'Exchange 1 whole, then subtract the whole numbers and the fractions.')) : null)), solution, marks: 2, skill: SKILL.subMixed };
      } catch { continue; }
    }
    const [da, db] = rng.pick(RELATED);
    const dc = rng.pick([da, db]);
    const fa = properFrac(rng, [da]); const fb = properFrac(rng, [db]); const fc = properFrac(rng, [dc]);
    const wa = rng.int(2, 6); const wb = rng.int(1, 4); const wc = rng.int(1, 3);
    const a = F(wa).add(fa); const b = F(wb).add(fb); const c = F(wc).add(fc);
    const op2 = rng.chance(0.6) ? '-' : '+';
    const r = op2 === '-' ? a.add(b).sub(c) : a.add(b).add(c);
    if (r.cmp(1) <= 0 || r.isInt) continue;
    const L = Math.max(da, db);
    const step1 = a.add(b);
    if (step1.isInt) continue;
    const prompt = `Work out ${a.mixed()} + ${b.mixed()} ${op2} ${c.mixed()}. Give your answer as a mixed number in its simplest form.`;
    const f1 = fa.add(fb);
    // the second step written out in full, including any exchange or carry (CLO review m10 item 2)
    const w1 = Math.floor(step1.value); const st1f = step1.sub(w1);
    let second;
    if (op2 === '-') {
      if (st1f.cmp(fc) < 0) {
        const ex = st1f.add(1);
        second = `${st1f} is smaller than ${fc}, so exchange 1 whole: ${step1.mixed()} = ${w1 - 1} and ${over(ex, L)}. Then ${w1 - 1} - ${wc} = ${w1 - 1 - wc} and ${over(ex, L)} - ${over(fc, L)} = ${ex.sub(fc)}`;
      } else second = `${w1} - ${wc} = ${w1 - wc} and ${over(st1f, L)} - ${over(fc, L)} = ${st1f.sub(fc)}`;
    } else {
      const fs = st1f.add(fc);
      second = `${w1} + ${wc} = ${w1 + wc} and ${over(st1f, L)} + ${over(fc, L)} = ${fs.n * (L / fs.d)}/${L}${fs.cmp(1) >= 0 ? ` = ${fs.mixed()}, so carry 1 whole` : ''}`;
    }
    const solution = `Work from left to right, with the fractions ${inDen(L)}. First ${a.mixed()} + ${b.mixed()}: ${wa} + ${wb} = ${wa + wb} and ${over(fa, L)} + ${over(fb, L)} = ${f1.n * (L / f1.d)}/${L}${f1.cmp(1) >= 0 ? ` = ${f1.mixed()}, so carry 1 whole` : ''}, giving ${step1.mixed()}. Then ${step1.mixed()} ${op2} ${c.mixed()}: ${second}. So the answer is ${r.mixed()}. Answer: ${r.mixed()}`;
    const wholes = wa + wb + (op2 === '-' ? -wc : wc);
    const fracPart = op2 === '-' ? fa.add(fb).sub(fc) : fa.add(fb).add(fc);
    const carried = Math.floor(fracPart.value); // wholes made by the fraction parts (0, 1 or 2)
    const keepN = fa.n * (L / fa.d) === fa.n && fb.n * (L / fb.d) === fb.n && fc.n * (L / fc.d) === fc.n ? null : fa.n + fb.n + (op2 === '-' ? -fc.n : fc.n);
    const distractors = [
      op2 === '-' ? { text: a.add(b).add(c).mixed(), code: 'OP-SWAP', why: `It looks like you added ${c.mixed()} instead of subtracting it. Check each sign.` } : null,
      carried >= 1 ? { text: F(wholes).add(fracPart.sub(carried)).mixed(), code: 'FR-MIXED-NO-CARRY', why: `The fraction parts make ${fracPart.mixed()}, which is more than ${carried === 1 ? '1 whole' : `${carried} wholes`}. It looks like ${carried === 1 ? 'that whole was' : 'those wholes were'} not carried into the whole numbers.` } : null,
      fracPart.n < 0 ? { text: F(wholes).add(fracPart.add(1)).mixed(), code: 'FR-MIXED-WHOLE-ONLY', why: 'The fraction parts need an exchange. It looks like you exchanged 1 whole for fraction pieces but did not take it from the whole numbers.' } : null,
      { text: step1.mixed(), code: 'ONE-STEP-ONLY', why: `${step1.mixed()} is ${a.mixed()} + ${b.mixed()}, the first step. Now ${op2 === '-' ? 'take away' : 'add'} ${c.mixed()}.` },
      keepN != null && keepN > 0 && keepN < L ? { text: F(wholes).add(F(keepN, L)).mixed(), code: 'FR-ADD-TOPS-KEEP-BOTTOM', why: `It looks like you ${op2 === '-' ? 'combined' : 'added'} the numerators ${fa.n}, ${fb.n} and ${fc.n} and kept the denominator ${L}, without changing the fractions into ${denWord(L)} first.` } : null,
    ].filter(Boolean);
    try {
      return { type: 'mcq', prompt, ...choices(rng, r.mixed(), rng.shuffle(distractors), (i) => { const w = r.add(F(i % 2 ? Math.ceil(i / 2) : -Math.ceil(i / 2), L)); return w.n > 0 && !w.isInt ? fresh(prompt, nearMiss(w.mixed(), `Write the fractions ${inDen(L)} and work one step at a time.`)) : null; }), solution, marks: 3, skill: op2 === '-' ? SKILL.subMixed : SKILL.addMixed };
    } catch { /* draw again */ }
  }
}

// ---------------------------------------------------------------- g04, g05 fraction of an amount; whole from a part

const UNITS = [{ pre: '', post: '' }, { pre: 'RM ', post: '' }, { pre: '', post: ' kg' }, { pre: '', post: ' m' }, { pre: '', post: ' ml' }];

const ofAmount = {
  id: 'm10.fraction-of-amount', topicId: T, subtopicId: 'm10-s3', skill: SKILL.of,
  title: 'Find a fraction of an amount (D2 includes improper fractions; D3 find the whole from a part)',
  difficulties: [1, 2, 3],
  check: { integer: true, min: 0 },
  make(rng, d) {
    const unit = rng.pick(UNITS);
    const show = (v) => `${unit.pre}${fmtInt(v)}${unit.post}`;
    if (d === 3) {
      for (;;) {
        const f = properFrac(rng, range(3, 12));
        if (f.n === 1) continue;
        const one = rng.int(2, 15);
        const part = f.n * one;
        const whole = one * f.d;
        if (whole > 500) continue;
        const hall = rng.chance(0.3);
        const show3 = hall ? (v) => fmtInt(v) : show;
        const prompt = hall
          ? `${f} of the pupils in a school hall are girls. There are ${fmtInt(part)} girls. How many pupils are in the hall altogether?`
          : `${f} of an amount is ${show(part)}. What is the whole amount?`;
        const solution = `${f} means ${f.n} equal parts out of ${f.d}. ${fmtInt(part)} ÷ ${f.n} = ${fmtInt(one)}, so one part is ${fmtInt(one)}. The whole is ${f.d} parts: ${fmtInt(one)} x ${f.d} = ${fmtInt(whole)}. Answer: ${show3(whole)}`;
        const distractors = [
          { text: show3(one), code: 'FR-WHOLE-ONE-PART', why: `${fmtInt(one)} is one part (one ${denWord(f.d, false)}). The whole has ${f.d} of these parts, so multiply by ${f.d}.` },
          { text: show3(part * f.d), code: 'FR-WHOLE-DEN-ONLY', why: `It looks like you multiplied ${fmtInt(part)} by ${f.d} without first dividing by ${f.n}. ${fmtInt(part)} is ${f.n} parts, not one part.` },
          (part * f.n) % f.d === 0 ? { text: show3((part * f.n) / f.d), code: 'FR-WHOLE-TIMES-FRACTION', why: `It looks like you found ${f} of ${fmtInt(part)}. Here ${fmtInt(part)} is already ${f} of the whole, so the whole is bigger.` } : null,
        ];
        try {
          return { type: 'mcq', prompt, ...choices(rng, show3(whole), distractors, (i) => fresh(prompt, nearMiss(show3(whole + i * one), `Find one part (divide by ${f.n}), then multiply by ${f.d}.`))), solution, marks: 2 };
        } catch { /* draw again */ }
      }
    }
    for (;;) {
      let f;
      if (d === 2 && rng.chance(0.4)) { const b = rng.pick(range(2, 8)); f = F(rng.int(b + 1, 2 * b - 1), b); if (f.d !== b) continue; } else f = properFrac(rng, d === 1 ? range(2, 10) : D2_12);
      const amount = f.d * rng.int(2, d === 1 ? 10 : 50);
      if (amount > (d === 1 ? 100 : 600)) continue;
      const one = amount / f.d;
      const ans = one * f.n;
      const prompt = rng.chance(0.5) ? `What is ${f} of ${show(amount)}?` : `Find ${f} of ${show(amount)}.`;
      const solution = f.n === 1
        ? `To find 1/${f.d}, divide by ${f.d}: ${fmtInt(amount)} ÷ ${f.d} = ${fmtInt(one)}. Answer: ${show(ans)}`
        : `Find 1/${f.d} first: ${fmtInt(amount)} ÷ ${f.d} = ${fmtInt(one)}. Then multiply by ${f.n}: ${fmtInt(one)} x ${f.n} = ${fmtInt(ans)}.${f.n > f.d ? ` (${f} is more than 1, so the answer is more than ${fmtInt(amount)}.)` : ''} Answer: ${show(ans)}`;
      const distractors = [
        f.n > 1 ? { text: show(one), code: 'FR-OF-DIVIDE-ONLY', why: `You found 1/${f.d} of ${fmtInt(amount)} (${fmtInt(one)}) but did not multiply by the numerator, ${f.n}.` } : null,
        f.n > 1 && amount % f.n === 0 ? { text: show((amount / f.n) * f.d), code: 'FR-OF-WRONG-OP', why: `It looks like you divided by ${f.n} and multiplied by ${f.d}. Divide by the denominator (${f.d}), then multiply by the numerator (${f.n}).` } : null,
        f.n === 1 ? { text: show(amount * f.d), code: 'FR-OF-WRONG-OP', why: `It looks like you multiplied by ${f.d}. Finding 1/${f.d} means dividing by ${f.d}.` } : null,
        f.n < f.d ? { text: show(amount - ans), code: 'PCT-OF-WRONG-WHOLE', why: `${fmtInt(amount - ans)} is the part that is left (${F(f.d - f.n, f.d)}), not ${f} of the amount.` } : null,
        f.n > 1 ? { text: show(amount * f.n), code: 'FR-OF-MULT-ONLY', why: `It looks like you multiplied by ${f.n} but did not divide by ${f.d}.` } : null,
      ];
      try {
        // a unit fraction has too few believable wrong answers for four options: she types it instead
        if ((d === 2 && rng.chance(0.35)) || f.n === 1) {
          const strip = (t) => String(t).replace(unit.pre, '').replace(unit.post, '');
          const t = typedMisconceptions(String(ans), distractors.filter(Boolean).map((x) => ({ ...x, text: strip(x.text) })), { code: 'FR-OF-DIVIDE-ONLY', why: `Divide by the denominator (${f.d}) to find one part, then multiply by the numerator (${f.n}).` });
          return { type: 'numeric', prompt, answer: numericAnswer(ans, [show(ans), String(ans)]), solution, ...t };
        }
        const c = choices(rng, show(ans), distractors, null);
        return { type: 'mcq', prompt, ...c, solution };
      } catch { /* draw again */ }
    }
  },
};

// ---------------------------------------------------------------- g06 multiplying a fraction by a whole number

const timesWhole = {
  id: 'm10.fraction-times-whole', topicId: T, subtopicId: 'm10-s4', skill: SKILL.times,
  title: 'Multiply a fraction by a whole number (D3: find the missing numerator)',
  difficulties: [1, 2, 3],
  check: { min: 0 },
  make(rng, d) {
    if (d === 3) {
      for (;;) {
        const den = rng.pick(range(3, 12)); const w = rng.int(2, 12); const a = rng.int(1, den - 1);
        const r = F(w * a, den);
        if (r.isInt || r.d === den) continue; // the product must simplify, so she has to work back
        const prompt = `Find the missing numerator: ${w} x ?/${den} = ${simplest(r)}.`;
        const solution = `Write ${simplest(r)} with denominator ${den}: ${simplest(r)} = ${w * a}/${den}. Multiplying by ${w} multiplies the numerator by ${w}, so the missing numerator is ${w * a} ÷ ${w} = ${a}. Check: ${w} x ${a}/${den} = ${w * a}/${den} = ${simplest(r)}. Answer: ${a}`;
        const distractors = [
          { text: String(w * a), code: 'FR-MISSING-NO-DIVIDE', why: `${w * a}/${den} is the result of the multiplication. The missing numerator is the number you multiply by ${w} to get ${w * a}.` },
          r.n % w === 0 ? { text: String(r.n / w), code: 'FR-MISSING-WRONG-DEN', why: `It looks like you divided the numerator of ${r} by ${w}. Write the answer in ${denWord(den)} first: ${w * a}/${den}.` } : { text: String(r.n), code: 'FR-MISSING-WRONG-DEN', why: `${r.n} is the numerator of ${r}, the answer in its simplest form. Write the answer in ${denWord(den)} first (${w * a}/${den}), then divide by ${w}.` },
          { text: String(r.n), code: 'FR-MISSING-WRONG-DEN', why: `${r.n} is the numerator of ${r}, the answer in its simplest form. Write the answer in ${denWord(den)} first (${w * a}/${den}), then divide by ${w}.` },
        ];
        try { return { type: 'mcq', prompt, ...choices(rng, String(a), distractors, (i) => { const x = a + (i % 2 ? 1 : -1) * Math.ceil(i / 2); return x > 0 && x < den ? fresh(prompt, nearMiss(String(x), `Check: ${w} x ${x}/${den} = ${simplest(F(w * x, den))}, not ${simplest(r)}.`)) : null; }), solution, marks: 2 }; } catch { /* draw again */ }
      }
    }
    for (;;) {
      const f = properFrac(rng, d === 1 ? range(2, 10) : D2_12);
      const n = d === 1 ? rng.int(2, 6) : rng.int(5, 12); // D2 does not repeat the D1 range (CLO review m10 item 4)
      const r = f.mul(n);
      if (d === 1 && r.cmp(3) > 0) continue;
      const prompt = `Work out ${rng.chance(0.5) ? `${f} x ${n}` : `${n} x ${f}`}. Give your answer in its simplest form.`;
      const raw = `${f.n * n}/${f.d}`;
      const solution = `Multiply the numerator by ${n} and keep the denominator: ${f.n} x ${n} = ${f.n * n}, so the answer is ${raw}.${raw !== simplest(r) ? ` In its simplest form this is ${simplest(r)}.` : ''} Remember: the denominator does not change. Answer: ${simplest(r)}`;
      const distractors = [
        { text: `${f.n * n}/${f.d * n}`, code: 'FR-MULT-BOTH', why: `It looks like you multiplied the numerator and the denominator by ${n}. That gives a fraction equal to ${f}, not ${n} lots of it. Multiply only the numerator.` },
        { text: `${f.n}/${f.d * n}`, code: 'FR-MULT-DEN', why: `It looks like you multiplied the denominator by ${n}. That makes the pieces smaller (it divides by ${n}). ${n} lots of ${f} should be bigger.` },
        { text: `${f.n + n}/${f.d}`, code: 'FR-MULT-ADDS', why: `It looks like you added ${n} to the numerator instead of multiplying it by ${n}.` },
      ];
      try {
        if (d === 2 && rng.chance(0.4)) {
          const t = typedMisconceptions(simplest(r), distractors, { code: 'FR-MULT-BOTH', why: `Multiply only the numerator by ${n}; keep the denominator ${f.d}. Then simplify.` });
          return { type: 'short', prompt, answer: { accept: [...new Set([simplest(r), r.toString()])], keywords: [] }, solution, ...t };
        }
        const c = choices(rng, simplest(r), distractors, (i) => fresh(prompt, nearMiss(simplest(r.add(F(i, f.d))), `Multiply the numerator by ${n} and keep the denominator ${f.d}.`)));
        return { type: 'mcq', prompt, ...c, solution };
      } catch { /* draw again */ }
    }
  },
};

// ---------------------------------------------------------------- g07 dividing a fraction by a whole number

const SHARE = [['cake', 'friends', 'friend', 'shares it equally between'], ['pizza', 'children', 'child', 'shares it equally between'], ['bottle of juice', 'cups', 'cup', 'pours it equally into'], ['bag of rice', 'containers', 'container', 'shares it equally between'], ['ribbon', 'pieces', 'piece', 'cuts it into'], ['tray of kuih', 'plates', 'plate', 'shares it equally between']];
const divWhole = {
  id: 'm10.fraction-divide-whole', topicId: T, subtopicId: 'm10-s5', skill: SKILL.div,
  title: 'Divide a fraction by a whole number (D1 numerator divides; D3 sharing in a story)',
  difficulties: [1, 2, 3],
  check: { min: 0 },
  make(rng, d) {
    for (;;) {
      let f; let n;
      if (d === 1) {
        n = rng.int(2, 9); const b = rng.int(3, 12); const kMax = Math.floor((rng.chance(0.3) ? 2 * b - 1 : b - 1) / n); // sometimes an improper fraction, for variety // the guide's denominators 2-12 (CLO review m10 item 5)
        if (kMax < 1) continue;
        const k = kMax >= 2 && rng.chance(0.6) ? rng.int(2, kMax) : rng.int(1, kMax);
        f = F(k * n, b); if (f.d !== b) continue;
      } else { f = properFrac(rng, D2_12); n = rng.int(2, 9); if (f.n % n === 0) continue; }
      const r = f.div(n);
      let prompt; let words = null;
      if (d === 3) {
        words = rng.pick(SHARE);
        const p = person(rng);
        prompt = `${p.name} has ${f} of a ${words[0]}. ${p.He} ${words[3]} ${n} ${words[3] === 'cuts it into' ? 'equal ' : ''}${words[1]}. ${words[2] === 'piece' ? `What fraction of the whole ${words[0]} is each piece?` : `What fraction of the whole ${words[0]} does each ${words[2]} get?`} Give your answer in its simplest form.`;
      } else prompt = rng.chance(0.5) ? `Work out ${f} ÷ ${n}. Give your answer in its simplest form.` : `Divide ${f} by ${n}. Give your answer in its simplest form.`;
      const solution = f.n % n === 0
        ? `Share the numerator: ${f.n} ÷ ${n} = ${f.n / n}, so ${f} ÷ ${n} = ${f.n / n}/${f.d}${simplest(r) !== `${f.n / n}/${f.d}` ? ` = ${simplest(r)}` : ''}. Answer: ${simplest(r)}`
        : `Dividing by ${n} cuts every piece into ${n} smaller pieces, so multiply the denominator by ${n}: ${f} ÷ ${n} = ${f.n}/${f.d * n}${simplest(r) !== `${f.n}/${f.d * n}` ? ` = ${simplest(r)}` : ''}. The answer is smaller than ${f}. Answer: ${simplest(r)}`;
      const distractors = [
        { text: simplest(f.mul(n)), code: 'FR-DIV-WRONG-PART', why: `It looks like you multiplied by ${n} instead of dividing. Sharing ${f} between ${n} gives each a smaller amount.` },
        f.d % n === 0 ? { text: simplest(F(f.n, f.d / n)), code: 'FR-DIV-WRONG-PART', why: `It looks like you divided the denominator by ${n}. That makes the pieces bigger. Multiply the denominator by ${n} instead.` } : null,
        { text: f.toString(), code: 'FR-DIV-UNCHANGED', why: `${f} is the amount before it is shared. Each share is smaller: divide by ${n}.` },
        d === 3 ? { text: `1/${n}`, code: 'FR-DIV-WHOLE-ONLY', why: `1/${n} would be each share of a WHOLE ${words[0]}. Only ${f} is shared, so each gets 1/${n} of ${f}.` } : { text: `1/${n}`, code: 'FR-DIV-WHOLE-ONLY', why: `1/${n} is 1 ÷ ${n}. It looks like you left out the ${f}: here ${f}, not 1 whole, is divided by ${n}.` },
      ];
      try {
        if (d === 2 && rng.chance(0.4)) {
          const t = typedMisconceptions(simplest(r), distractors, { code: 'FR-DIV-WRONG-PART', why: `To divide a fraction by ${n}, multiply the denominator by ${n} (or divide the numerator by ${n}), then simplify.` });
          return { type: 'short', prompt, answer: { accept: [simplest(r)], keywords: [] }, solution, ...t };
        }
        const c = choices(rng, simplest(r), distractors, null);
        return { type: 'mcq', prompt, ...c, solution, marks: d === 3 ? 2 : 1 };
      } catch { /* draw again */ }
    }
  },
};

// ---------------------------------------------------------------- g09 fraction of the remainder

const THINGS = [['books', 'lunch'], ['a bag', 'a T-shirt'], ['stationery', 'snacks'], ['a gift', 'bus fares'], ['durians', 'drinks'], ['a game', 'a book'], ['nasi lemak', 'teh tarik']];
const remainder = {
  id: 'm10.remainder-problem', topicId: T, subtopicId: 'm10-s6', skill: SKILL.words,
  title: 'Two steps: a fraction of the money, then a fraction of what is left',
  difficulties: [2, 3],
  check: { integer: true, min: 0 },
  make(rng, d) {
    for (;;) {
      const f1 = properFrac(rng, range(2, 8)); const f2 = properFrac(rng, range(2, 6));
      if (d === 2 && f1.n !== 1) continue;
      if (d === 3 && f1.n === 1 && f2.n === 1) continue;
      const total = f1.d * f2.d * rng.int(2, 20);
      if (total > 600 || total < 20) continue;
      const p = person(rng);
      const first = (total / f1.d) * f1.n;
      const rest = total - first;
      const second = (rest / f2.d) * f2.n;
      const left = rest - second;
      const [a, b] = rng.pick(THINGS);
      const ask = d === 3 && rng.chance(0.4) ? 'spent' : 'left';
      const ans = ask === 'left' ? left : first + second;
      const prompt = `${p.name} had ${rm(total)}. ${p.He} spent ${f1} of it on ${a}, then ${f2} of the money that was left on ${b}. ${ask === 'left' ? `How much money did ${p.he} have left?` : `How much did ${p.he} spend altogether?`}`;
      const solution = `${f1} of ${rm(total)} = ${rm(first)}, so ${rm(rest)} was left. ${f2} of ${rm(rest)} = ${rm(second)}. ${ask === 'left' ? `${rm(rest)} - ${rm(second)} = ${rm(left)}` : `${rm(first)} + ${rm(second)} = ${rm(first + second)}`}. Remember: the second fraction is of what was LEFT, not of ${rm(total)}. Answer: ${rm(ans)}`;
      const wrongSecond = (total * f2.n) % f2.d === 0 ? (total * f2.n) / f2.d : null;
      const distractors = [
        wrongSecond != null && (ask === 'spent' || rest - wrongSecond > 0) ? { text: rm(ask === 'left' ? rest - wrongSecond : first + wrongSecond), code: 'FR-REMAINDER-OF-WHOLE', why: `It looks like you took ${f2} of the whole ${rm(total)}. The ${f2} is of the money left after the first spend (${rm(rest)}).` } : null,
        { text: rm(ask === 'left' ? rest : first), code: 'FR-REMAINDER-ONE-STEP', why: `It looks like you stopped after the first step. ${p.He} also spent ${f2} of the money that was left.` },
        ask === 'left' ? { text: rm(first + second), code: 'PCT-OF-WRONG-WHOLE', why: `${rm(first + second)} is how much ${p.he} spent. The question asks how much was left.` } : { text: rm(left), code: 'PCT-OF-WRONG-WHOLE', why: `${rm(left)} is how much was left. The question asks how much ${p.he} spent altogether.` },
        ask === 'left' ? { text: rm(second), code: 'FR-REMAINDER-ONE-STEP', why: `${rm(second)} is only what ${p.he} spent on ${b}.` } : null,
      ];
      try {
        if (d === 3 && rng.chance(0.5)) {
          const t = typedMisconceptions(String(ans), distractors.filter(Boolean).map((x) => ({ ...x, text: x.text.replace('RM ', '') })), { code: 'FR-REMAINDER-OF-WHOLE', why: 'Work in two steps. The second fraction is of the money left after the first spend.' });
          return { type: 'numeric', prompt, answer: numericAnswer(ans, [rm(ans), String(ans)]), solution, ...t, marks: 3 };
        }
        return { type: 'mcq', prompt, ...choices(rng, rm(ans), distractors, (i) => fresh(prompt, nearMiss(rm(ans + i * (rest / f2.d)), 'Work in two steps, and take the second fraction of what was left.'))), solution, marks: d === 3 ? 3 : 2 };
      } catch { /* draw again */ }
    }
  },
};

// ---------------------------------------------------------------- g10 working back from what is left (bar model)

const fromLeft = {
  id: 'm10.whole-from-left', topicId: T, subtopicId: 'm10-s6', skill: SKILL.words,
  title: 'Spent a fraction and has an amount left: how much at first? (with a bar model)',
  difficulties: [3],
  check: { integer: true, min: 0 },
  make(rng) {
    for (;;) {
      const f = properFrac(rng, range(3, 9));
      const leftParts = f.d - f.n;
      const unit = rng.int(2, 30);
      const left = unit * leftParts;
      const total = unit * f.d;
      if (total > 400 || leftParts === f.n || leftParts < 2) continue; // with 1 part left, two named slips vanish (CLO review m10 item 3)
      const p = person(rng);
      const prompt = `${p.name} spent ${f} of ${p.his} money and had ${rm(left)} left. The bar model shows this. How much money did ${p.he} have at first?`;
      const diagram = { type: 'barModel', bars: [{ label: 'Money', units: f.d, shadedUnits: f.n }], braces: [{ bar: 0, from: 0, to: f.n, label: 'spent', side: 'above' }, { bar: 0, from: f.n, to: f.d, label: rm(left), side: 'below' }], totalBrace: { label: '?' } };
      const solution = `${p.He} spent ${f.n} of ${f.d} equal parts, so ${leftParts} part${leftParts > 1 ? 's are' : ' is'} left. ${leftParts > 1 ? `${leftParts} parts = ${rm(left)}, so 1 part = ${rm(left)} ÷ ${leftParts} = ${rm(unit)}.` : `So 1 part = ${rm(left)}.`} At first: ${f.d} parts = ${rm(unit)} x ${f.d} = ${rm(total)}. Answer: ${rm(total)}`;
      const distractors = [
        left % f.n === 0 ? { text: rm((left / f.n) * f.d), code: 'FR-LEFT-AS-SPENT', why: `It looks like you treated ${rm(left)} as the ${f} that was spent. ${rm(left)} is what was LEFT: ${F(leftParts, f.d)} of the money.` } : null,
        { text: rm(unit), code: 'FR-WHOLE-ONE-PART', why: `${rm(unit)} is one part. ${p.He} started with all ${f.d} parts.` },
        leftParts > 1 ? { text: rm(left * f.d), code: 'FR-WHOLE-DEN-ONLY', why: `It looks like you multiplied ${rm(left)} by ${f.d}. ${rm(left)} is ${leftParts} parts, so find one part first.` } : null,
      ];
      try {
        return { type: 'mcq', prompt, ...choices(rng, rm(total), distractors, (i) => fresh(prompt, nearMiss(rm(total + (i % 2 ? 1 : -1) * Math.ceil(i / 2) * unit), 'Find one part from what is left, then multiply by the number of parts at the start.'))), solution, marks: 3, diagram };
      } catch { /* draw again */ }
    }
  },
};

export default [addSub, mixedAddSub, ofAmount, timesWhole, divWhole, remainder, fromLeft];
