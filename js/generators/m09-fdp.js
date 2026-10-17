// m09 Fractions, Percentages and Decimals: fractions as division, mixed numbers, equivalent
// fractions and simplest form, converting between forms, percentages of amounts and shapes,
// comparing and ordering. Patterns and ranges follow the CLO's generator guide (m09).

import { F, choices, typedMisconceptions, nearMiss, numericAnswer, fmtInt, dec, rm, person, denWord, capFirst, valueOf, countOf, term } from './core.js';

const T = 'm09-fractions-percentages-decimals';
const SKILL = {
  division: 'fraction as division', mixed: 'mixed numbers and improper fractions', equiv: 'equivalent fractions', simplest: 'simplest form',
  convert: 'converting fractions, decimals and percentages', shape: 'percentage of a shape', amount: 'percentage of an amount',
  compare: 'comparing fractions, decimals and percentages', order: 'ordering fractions, decimals and percentages',
};

// Misconception codes: all declared once in misconceptions.js (the CLO's catalogue).

const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
function properFrac(rng, dens) { for (;;) { const b = rng.pick(dens); const a = rng.int(1, b - 1); if (F(a, b).d === b) return F(a, b); } }
const pct = (f) => `${dec(f.value * 100)}%`;

/** The numbers written in a prompt, read the way the tests read them. */
const promptNums = (prompt) => (String(prompt).replace(/(\d) (\d{3})/g, '$1$2').match(/-?\d+(?:\.\d+)?(?:\/\d+)?/g) || []).map((t) => valueOf(t)).filter((x) => x != null);
/** A near miss is never a number that already appears in the question (CLO review X3): null if it does. */
const fresh = (prompt, d) => { if (!d) return null; const v = valueOf(d.text); return v != null && promptNums(prompt).some((x) => Math.abs(x - v) < 1e-9) ? null : d; };

// ---------------------------------------------------------------- g01 fraction as division

const CONTEXTS = [
  { make: (a, b, p) => `${p.name} shares ${a} pizza${a > 1 ? 's' : ''} equally between ${b} friends. How much pizza does each friend get?`, unit: ' pizza', units: 'pizzas' },
  { make: (a, b) => `A ribbon ${a} m long is cut into ${b} equal pieces. How long is each piece?`, unit: ' m' },
  { make: (a, b) => `${a} litres of juice are poured equally into ${b} jugs. How many litres are in each jug?`, unit: ' litres' },
  { make: (a, b) => `${a} kg of rice is shared equally between ${b} bags. How much rice is in each bag?`, unit: ' kg' },
];
const division = {
  id: 'm09.fraction-as-division', topicId: T, subtopicId: 'm09-s1', skill: SKILL.division,
  title: 'A division as a fraction (D2: more than 1, as a mixed number)',
  difficulties: [1, 2],
  check: { min: 0 },
  make(rng, d) {
    for (;;) {
      const b = rng.int(2, d === 1 ? 10 : 12);
      const a = d === 1 ? rng.int(1, b - 1) : rng.int(b + 1, Math.min(20, 4 * b));
      const f = F(a, b);
      if (f.isInt) continue;
      const words = rng.chance(0.55);
      const ctx = rng.pick(CONTEXTS);
      const p = person(rng);
      const ans = d === 1 ? f.toString() : f.mixed();
      const prompt = words
        ? `${ctx.make(a, b, p)} Give your answer as ${d === 1 ? 'a fraction' : 'a mixed number'} in its simplest form.`
        : `Write ${a} ÷ ${b} as ${d === 1 ? 'a fraction' : 'a mixed number'} in its simplest form.`;
      const q = Math.floor(a / b); const r = a % b;
      const solution = d === 1
        ? `A division can be written as a fraction: ${a} ÷ ${b} = ${a}/${b}${f.toString() !== `${a}/${b}` ? `, which simplifies to ${f}` : ''}. The number being shared goes on top. Answer: ${ans}`
        : `${a} ÷ ${b} = ${a}/${b}. ${b} goes into ${a} ${q} time${q > 1 ? 's' : ''} with ${r} left over, so ${a}/${b} = ${q} ${r}/${b}${F(r, b).toString() !== `${r}/${b}` ? ` = ${f.mixed()}` : ''}. Answer: ${ans}`;
      const distractors = [
        { text: F(b, a).isInt ? null : `${b}/${a}`, code: 'FDP-DIV-REVERSED', why: `It looks like you put ${b} on top. In ${a} ÷ ${b}, the number being shared (${a}) is the numerator: ${a}/${b}.` },
        d === 2 ? { text: `${q}.${r}`, code: 'REMAINDER-AS-DECIMAL', why: `It looks like you wrote the remainder ${r} after a decimal point. The ${r} left over is ${r}/${b} of a whole, not ${r} tenth${r === 1 ? '' : 's'}.` } : (b < 10 ? { text: `${a}.${b}`, code: 'FDP-DIGITS', why: `It looks like you wrote the two numbers with a decimal point between them. ${a} ÷ ${b} is ${a}/${b}, which is less than 1.` } : null),
        d === 2 && r !== q && q < b ? { text: F(r).add(F(q, b)).mixed(), code: 'FR-MIXED-QR-SWAP', why: `It looks like you swapped the whole number and the remainder. ${b} goes into ${a} ${q} time${q === 1 ? '' : 's'} (the whole number) with ${r} left over (the numerator).` } : null,
        d === 1 && a > 1 ? { text: `1/${b}`, code: 'FR-DIV-WHOLE-ONLY', why: `1/${b} is each share of ONE whole. Here ${a} wholes are shared, so each gets ${a}/${b}.` } : null,
      ].filter((x) => x && x.text);
      try {
        if (d === 2 && rng.chance(0.4)) {
          const t = typedMisconceptions(ans, distractors, { code: 'FDP-DIV-REVERSED', why: `Write ${a} ÷ ${b} as ${a}/${b}, then change it to a mixed number: how many times does ${b} go into ${a}, and what is left?` });
          return { type: 'short', prompt, answer: { accept: [ans], keywords: [] }, solution, ...t };
        }
        return { type: 'mcq', prompt, ...choices(rng, ans, distractors, (i) => { const w = d === 1 ? F(a + i, b) : f.add(F(i, b)); return d === 1 && w.cmp(1) >= 0 ? null : fresh(prompt, nearMiss(d === 1 ? w.toString() : w.mixed(), `Write ${a} ÷ ${b} as a fraction with ${a} on top.`)); }), solution };
      } catch { /* draw again */ }
    }
  },
};

// ---------------------------------------------------------------- g02 improper fractions and mixed numbers

const mixedImproper = {
  id: 'm09.mixed-improper', topicId: T, subtopicId: 'm09-s1', skill: SKILL.mixed,
  title: 'Change between improper fractions and mixed numbers',
  difficulties: [1, 2],
  check: { min: 0 },
  make(rng, d) {
    for (;;) {
      const den = rng.int(2, d === 1 ? 10 : 12);
      const w = rng.int(1, d === 1 ? 6 : 9);
      const n = rng.int(1, den - 1);
      if (F(n, den).d !== den) continue;
      const imp = F(w * den + n, den);
      const toMixed = rng.chance(0.5);
      if (toMixed) {
        const prompt = `Write ${imp} as a mixed number.`;
        const ans = imp.mixed();
        const solution = `How many times does ${den} go into ${imp.n}? ${w} times (${w} x ${den} = ${w * den}), with ${n} left over. So ${imp} = ${w} wholes and ${n}/${den}. Answer: ${ans}`;
        const distractors = [
          n !== w && n < den && w < den ? { text: `${n} ${w}/${den}`, code: 'FR-MIXED-QR-SWAP', why: `It looks like you swapped the whole number and the remainder. ${den} goes into ${imp.n} ${w} time${w === 1 ? '' : 's'} (the whole number) with ${n} left over (the numerator).` } : null,
          { text: `${w} ${n}/${imp.n}`, code: 'FR-MIXED-WRONG-DEN', why: `The denominator stays the same: the pieces are still ${denWord(den)}. So the fraction part is ${n}/${den}, not ${n}/${imp.n}.` },
          { text: `${w + 1} ${n}/${den}`, code: 'NEAR-MISS', why: `Not quite: ${w + 1} ${n}/${den} has one whole too many. ${w + 1} x ${den} = ${(w + 1) * den}, which is more than ${imp.n}. Check how many whole ${den}s fit.` },
        ];
        try {
          if (d === 2 && rng.chance(0.4)) {
            const t = typedMisconceptions(ans, distractors.filter((x) => x && x.code !== 'NEAR-MISS'), { code: 'FR-MIXED-QR-SWAP', why: `Divide ${imp.n} by ${den}: the answer is the whole number and the remainder is the numerator. The denominator stays ${den}.` });
            return { type: 'short', prompt, answer: { accept: [ans], keywords: [] }, solution, ...t };
          }
          return { type: 'mcq', prompt, ...choices(rng, ans, distractors, (i) => nearMiss(`${w} ${Math.min(den - 1, n + i)}/${den}`, `Divide ${imp.n} by ${den}; the remainder is the numerator.`)), solution };
        } catch { continue; }
      }
      const mixed = imp.mixed();
      const prompt = `Write ${mixed} as an improper fraction.`;
      const ans = `${imp.n}/${den}`;
      const solution = `Each whole is ${den}/${den}, so ${w} wholes = ${w} x ${den} = ${w * den} ${denWord(den)}. Add the ${n}: ${w * den} + ${n} = ${imp.n}. So ${mixed} = ${imp.n}/${den}. Answer: ${ans}`;
      const distractors = [
        { text: `${w + n}/${den}`, code: 'FR-MIXED-ADD-WHOLE', why: `It looks like you added the whole number to the numerator (${w} + ${n}). Each whole is ${den} pieces, so multiply ${w} by ${den} first.` },
        { text: `${w * n + den}/${den}`, code: 'FR-MIXED-WRONG-PARTS', why: `It looks like you multiplied ${w} by the numerator ${n} and added the denominator. Multiply the whole number by the DENOMINATOR, then add the numerator: ${w} x ${den} + ${n}.` },
        { text: `${w * den}/${den}`, code: 'FR-MIXED-NO-NUMERATOR', why: `${w * den}/${den} is just the ${w} whole${w > 1 ? 's' : ''}. Add the ${n}/${den} as well.` },
        n > 1 && { text: `${imp.n}/${n}`, code: 'FR-MIXED-WRONG-DEN', why: `The denominator stays ${den}: the pieces are still ${denWord(den)}.` },
      ];
      try {
        if (d === 2 && rng.chance(0.4)) {
          const t = typedMisconceptions(ans, distractors, { code: 'FR-MIXED-WRONG-PARTS', why: `Multiply the whole number by the denominator, add the numerator, and keep the denominator.` });
          return { type: 'short', prompt, answer: { accept: [ans], keywords: [] }, solution, ...t };
        }
        return { type: 'mcq', prompt, ...choices(rng, ans, distractors, (i) => nearMiss(`${imp.n + i}/${den}`, `Work out ${w} x ${den} + ${n}.`)), solution };
      } catch { /* draw again */ }
    }
  },
};

// ---------------------------------------------------------------- g03 equivalent fractions, missing number

const equivalent = {
  id: 'm09.equivalent-missing', topicId: T, subtopicId: 'm09-s2', skill: SKILL.equiv,
  title: 'Find the missing number in a pair of equivalent fractions (D3: simplify first)',
  difficulties: [1, 2, 3],
  check: { integer: true, min: 1 },
  make(rng, d) {
    for (;;) {
      let a; let b; let c; let e; let missTop; let ans; let solution;
      if (d === 3) {
        // 6/9 = ?/15: no whole-number factor from 9 to 15, so simplify first
        const base = properFrac(rng, range(2, 9));
        const k1 = rng.int(2, 5); const k2 = rng.int(2, 7);
        if (k1 === k2 || k2 % k1 === 0 || k1 % k2 === 0) continue;
        a = base.n * k1; b = base.d * k1; e = base.d * k2; c = base.n * k2;
        missTop = rng.chance(0.6);
        ans = missTop ? c : e;
        solution = `There is no whole number that takes ${b} to ${missTop ? e : '?'} directly, so simplify first: ${a}/${b} = ${base} (divide by ${k1}). Then ${base} = ${c}/${e} (multiply by ${k2}). Answer: ${ans}`;
        if (!missTop) solution = `Simplify first: ${a}/${b} = ${base} (divide by ${k1}). To get from ${base.n} to ${c}, multiply by ${k2}, so the denominator is ${base.d} x ${k2} = ${e}. Answer: ${ans}`;
        const prompt = missTop ? `Find the missing number: ${a}/${b} = ?/${e}` : `Find the missing number: ${a}/${b} = ${c}/?`;
        const distractors = missTop ? [
          a + (e - b) > 0 ? { text: String(a + (e - b)), code: 'FR-EQUIV-ADDITIVE', why: `It looks like you ${e > b ? 'added' : 'took away'} ${Math.abs(e - b)} ${e > b ? 'to' : 'from'} the top because ${b} ${e > b ? '+' : '-'} ${Math.abs(e - b)} = ${e}. Equivalent fractions come from multiplying or dividing, not adding.` } : null,
          { text: String(base.n), code: 'FR-EQUIV-SIMPLIFIED-ONLY', why: `You simplified ${a}/${b} to ${base} (well done) but stopped. Now write ${base} with denominator ${e}.` },
          { text: String(base.n * e), code: 'FR-EQUIV-CROSS', why: `It looks like you multiplied ${base.n} by ${e}. ${base} has denominator ${base.d}; multiply the top and the bottom by ${k2} to get ${e}.` },
        ] : [
          b + (c - a) > 0 ? { text: String(b + (c - a)), code: 'FR-EQUIV-ADDITIVE', why: `It looks like you ${c > a ? 'added' : 'took away'} ${Math.abs(c - a)} ${c > a ? 'to' : 'from'} the bottom because ${a} ${c > a ? '+' : '-'} ${Math.abs(c - a)} = ${c}. Equivalent fractions come from multiplying or dividing, not adding.` } : null,
          { text: String(base.d), code: 'FR-EQUIV-SIMPLIFIED-ONLY', why: `You simplified ${a}/${b} to ${base} (well done) but stopped. Now write it with numerator ${c}.` },
        ];
        try { return { type: 'mcq', prompt, ...choices(rng, String(ans), distractors, (i) => fresh(prompt, nearMiss(String(ans + i), `Simplify ${a}/${b} first, then scale it.`))), solution, marks: 2 }; } catch { continue; }
      }
      const base = properFrac(rng, d === 1 ? range(2, 10) : range(2, 12));
      const k = rng.int(2, d === 1 ? 6 : 9);
      const down = d === 2 && rng.chance(0.4); // 12/27 = ?/9: dividing
      missTop = rng.chance(0.6);
      const [p1, q1, p2, q2] = down ? [base.n * k, base.d * k, base.n, base.d] : [base.n, base.d, base.n * k, base.d * k];
      if (q2 > 60 || q1 > 60) continue;
      ans = missTop ? p2 : q2;
      const prompt = missTop ? `Find the missing number: ${p1}/${q1} = ?/${q2}` : `Find the missing number: ${p1}/${q1} = ${p2}/?`;
      const op = down ? 'divide' : 'multiply';
      const fac = k;
      solution = missTop
        ? `${q1} ${down ? '÷' : 'x'} ${fac} = ${q2}, so ${op} the numerator by ${fac} too: ${p1} ${down ? '÷' : 'x'} ${fac} = ${p2}. Answer: ${ans}`
        : `${p1} ${down ? '÷' : 'x'} ${fac} = ${p2}, so ${op} the denominator by ${fac} too: ${q1} ${down ? '÷' : 'x'} ${fac} = ${q2}. Answer: ${ans}`;
      const add = missTop ? p1 + (q2 - q1) : q1 + (p2 - p1);
      const distractors = [
        add > 0 ? { text: String(add), code: 'FR-EQUIV-ADDITIVE', why: (() => { const ch = missTop ? q2 - q1 : p2 - p1; const [from, to] = missTop ? [q1, q2] : [p1, p2]; return `It looks like you ${ch > 0 ? 'added' : 'took away'} ${Math.abs(ch)} ${ch > 0 ? 'to' : 'from'} the ${missTop ? 'top' : 'bottom'}, because ${from} ${ch > 0 ? '+' : '-'} ${Math.abs(ch)} = ${to}. Equivalent fractions come from multiplying or dividing the top and the bottom by the same number.`; })() } : null,
        { text: String(fac), code: 'FR-EQUIV-FACTOR-ONLY', why: `${fac} is the number you ${op} by. Now ${op} the ${missTop ? 'numerator' : 'denominator'} ${missTop ? p1 : q1} by ${fac}.` },
        { text: String(missTop ? q2 * p1 : p2 * q1), code: 'FR-EQUIV-CROSS', why: `It looks like you multiplied ${missTop ? `${p1} by ${q2}` : `${q1} by ${p2}`}. Find what ${missTop ? q1 : p1} was ${op === 'multiply' ? 'multiplied' : 'divided'} by to make ${missTop ? q2 : p2}, and do the same to the other number.` },
      ];
      try {
        if (d === 2 && rng.chance(0.45)) {
          const t = typedMisconceptions(String(ans), distractors.filter(Boolean), { code: 'FR-EQUIV-ADDITIVE', why: `Multiply or divide the numerator and the denominator by the SAME number.` });
          return { type: 'numeric', prompt, answer: numericAnswer(ans, [String(ans)]), solution, ...t };
        }
        return { type: 'mcq', prompt, ...choices(rng, String(ans), distractors, (i) => fresh(prompt, nearMiss(String(ans + i), `${op === 'multiply' ? 'Multiply' : 'Divide'} the top and bottom by the same number.`))), solution };
      } catch { /* draw again */ }
    }
  },
};

// ---------------------------------------------------------------- g04 simplest form

const simplestForm = {
  id: 'm09.simplest-form', topicId: T, subtopicId: 'm09-s2', skill: SKILL.simplest,
  title: 'Write a fraction in its simplest form (D2 the common factor is not obvious)',
  difficulties: [1, 2],
  check: { min: 0 },
  make(rng, d) {
    for (;;) {
      const base = properFrac(rng, range(2, 12));
      const h = d === 1 ? rng.pick([2, 3, 4, 5, 10]) : rng.pick([4, 6, 8, 9, 12, 7, 11]);
      const n = base.n * h; const den = base.d * h;
      if (den > 100 || base.n === 1 && d === 2 && rng.chance(0.5)) continue;
      const ans = base.toString();
      const prompt = `Write ${n}/${den} in its simplest form.`;
      const solution = `The highest common factor of ${n} and ${den} is ${h}. Divide both by ${h}: ${n} ÷ ${h} = ${base.n} and ${den} ÷ ${h} = ${base.d}. ${base} cannot be simplified any more. Answer: ${ans}`;
      const distractors = [
        { text: `${base.n}/${den}`, code: 'FR-SIMPLIFY-ONE-PART', why: `It looks like you divided only the numerator by ${h}. Divide the numerator AND the denominator by the same number.` },
        { text: `${n}/${base.d}`, code: 'FR-SIMPLIFY-ONE-PART', why: `It looks like you divided only the denominator by ${h}. Divide the numerator AND the denominator by the same number.` },
        n - h > 0 && den - h > 0 ? { text: `${n - h}/${den - h}`, code: 'FR-SIMPLIFY-SUBTRACT', why: `It looks like you took ${h} away from the top and the bottom. Simplifying means DIVIDING both by a common factor.` } : null,
      ];
      try {
        if (d === 2 && rng.chance(0.5)) {
          // a partly simplified answer is a known wrong answer when the simplest form is asked for
          const g = [2, 3].find((x) => h % x === 0 && h !== x);
          const partial = g ? `${n / g}/${den / g}` : null;
          const t = typedMisconceptions(ans, [
            ...distractors.filter(Boolean),
          ], { code: 'FR-NOT-SIMPLIFIED', why: `Keep dividing until the top and bottom have no common factor except 1. The highest common factor of ${n} and ${den} is ${h}.` });
          if (partial) { t.misconceptions[partial] = `${partial} is equal to ${n}/${den}, but it is not in its simplest form yet: ${n / g} and ${den / g} can both still be divided by ${h / g}.`; t.codes[partial] = 'FR-NOT-SIMPLIFIED'; }
          return { type: 'short', prompt, answer: { accept: [ans], keywords: [] }, solution, ...t };
        }
        return { type: 'mcq', prompt, ...choices(rng, ans, distractors, (i) => nearMiss(F(base.n + i, base.d).toString(), `Divide the top and bottom by ${h}.`)), solution };
      } catch { /* draw again */ }
    }
  },
};

// ---------------------------------------------------------------- g05 converting fractions, decimals and percentages

const KINDS = ['F>D', 'F>P', 'D>P', 'P>D', 'D>F', 'P>F'];
const convert = {
  id: 'm09.fdp-convert', topicId: T, subtopicId: 'm09-s3', skill: SKILL.convert,
  title: 'Convert between fractions, decimals and percentages (D1 halves, quarters, fifths, tenths; D3 eighths and simplifying)',
  difficulties: [1, 2, 3],
  check: { min: 0, maxDp: 3 },
  make(rng, d) {
    for (;;) {
      const dens = d === 1 ? [2, 4, 5, 10] : d === 2 ? [20, 25, 50, 100, 4, 5] : [8, 20, 25, 40, 50];
      const f = properFrac(rng, dens);
      if (!f.terminates) continue;
      const kind = d === 3 ? rng.pick(['F>D', 'F>P', 'D>F', 'P>F']) : rng.pick(KINDS);
      const D = dec(f.value); const P = pct(f);
      const from = { F: f.toString(), D, P }[kind[0]];
      const to = { F: f.toString(), D, P }[kind[2]];
      const name = { F: 'a fraction in its simplest form', D: 'a decimal', P: 'a percentage' }[kind[2]];
      const prompt = `Write ${from} as ${name}.`;
      const steps = {
        'F>D': `Make the denominator 10, 100 or 1000 (or divide the numerator by the denominator): ${fracOver(f)} = ${D}.`,
        'F>P': `Make the denominator 100 (or find the decimal, then x 100): ${fracOver(f)} = ${P}.`,
        'D>P': `Multiply by 100: ${D} x 100 = ${dec(f.value * 100)}, so ${D} = ${P}.`,
        'P>D': `Percent means out of 100, so divide by 100: ${dec(f.value * 100)} ÷ 100 = ${D}.`,
        'D>F': `${D} = ${decAsFrac(f)}.${decAsFrac(f) === f.toString() ? ' It cannot be simplified.' : ` Simplify: ${decAsFrac(f)} = ${f}.`}`,
        'P>F': `${P} = ${dec(f.value * 100)}/100${Number.isInteger(f.value * 100) ? '' : ` = ${dec(f.value * 1000)}/1000`}.${f.d === 100 ? ' It cannot be simplified.' : ` Simplify: ${f}.`}`,
      }[kind];
      const solution = `${steps} Answer: ${to}`;
      const pDigits = `${f.n}${f.d}`;
      const distractors = [];
      if (kind === 'F>D') {
        if (pDigits.length <= 3 && !pDigits.endsWith('0')) distractors.push({ text: `0.${pDigits}`, code: 'FDP-DIGITS', why: `It looks like you wrote the numerator and the denominator after the decimal point. ${f} means ${f.n} ÷ ${f.d}.` });
        if (f.d % 10 !== 0) distractors.push({ text: `0.${f.d}`, code: 'FDP-DEN-AS-DECIMAL', why: `It looks like you wrote the denominator ${f.d} as the decimal. ${f} means ${f.n} ÷ ${f.d} = ${D}.` });
        distractors.push({ text: dec(f.value * 10), code: 'PV-SHIFT-WRONG', why: `The digits are right but the decimal point is in the wrong place. ${f} is less than 1, so the decimal must be less than 1.` });
      } else if (kind === 'F>P') {
        if (pDigits.length <= 3) distractors.push({ text: `${pDigits}%`, code: 'FDP-DIGITS', why: `It looks like you wrote the numerator and denominator together as the percentage. Make the denominator 100 first: ${fracOver(f)}.` });
        distractors.push({ text: `${D}%`, code: 'FDP-DEC-AS-PERCENT', why: `${D} is the decimal. To make a percentage, multiply it by 100: ${P}.` });
        distractors.push({ text: `${f.n}%`, code: 'FDP-DIGITS', why: `It looks like you used just the numerator, ${f.n}. A percentage is out of 100, so change ${f} to hundredths first.` });
      } else if (kind === 'D>P') {
        distractors.push({ text: `${dec(f.value * 10)}%`, code: 'PV-SHIFT-WRONG', why: `It looks like you multiplied by 10. To change a decimal to a percentage, multiply by 100.` });
        distractors.push({ text: `${D}%`, code: 'FDP-DEC-AS-PERCENT', why: `It looks like you put a % sign on the decimal. Multiply by 100 first: ${D} x 100 = ${dec(f.value * 100)}.` });
        distractors.push({ text: `${dec(f.value * 1000)}%`, code: 'PV-SHIFT-WRONG', why: `It looks like you multiplied by 1000. To change a decimal to a percentage, multiply by 100.` });
      } else if (kind === 'P>D') {
        distractors.push({ text: dec(f.value * 10), code: 'PV-SHIFT-WRONG', why: `It looks like you divided by 10. Percent means out of 100, so divide by 100.` });
        distractors.push({ text: dec(f.value * 100), code: 'FDP-PCT-NO-DIVIDE', why: `It looks like you dropped the % sign without dividing by 100.` });
        distractors.push({ text: dec(f.value / 10), code: 'PV-SHIFT-WRONG', why: `It looks like you divided by 1000. Percent means out of 100, so divide by 100.` });
      } else if (kind === 'D>F') {
        const tenths = F(Math.round(f.value * 1000), 100);
        distractors.push({ text: tenths.toString(), code: 'PV-SHIFT-WRONG', why: `${D} has ${dpCount(D)} decimal place${dpCount(D) > 1 ? 's' : ''}, so it is ${decAsFrac(f)}. It looks like you used the wrong place value for the denominator.` });
        const digs = D.replace(/^0\./, '');
        if (digs.length === 2 && digs[1] !== '0' && F(Number(digs[0]), Number(digs[1])).value < 1) distractors.push({ text: F(Number(digs[0]), Number(digs[1])).toString(), code: 'FDP-DIGITS', why: `It looks like you made a fraction from the digits ${digs[0]} and ${digs[1]}. ${D} means ${decAsFrac(f)}.` });
        distractors.push({ text: F(1, Number(digs)).toString(), code: 'FDP-DIGITS', why: `It looks like you wrote 1 over the digits. ${D} means ${decAsFrac(f)}.` });
      } else {
        distractors.push({ text: F(Math.round(f.value * 1000), 100).toString(), code: 'PV-SHIFT-WRONG', why: `It looks like you put the percentage over 10. Percent means out of 100: ${dec(f.value * 100)}/100.` });
        if (Number.isInteger(Math.round(f.value * 1e6) / 1e4)) distractors.push({ text: F(Math.round(f.value * 100), 1000).toString(), code: 'PV-SHIFT-WRONG', why: `It looks like you put the percentage over 1000. Percent means out of 100: ${dec(f.value * 100)}/100.` });
        if (Number.isInteger(f.value * 100) && f.value * 100 < 100) distractors.push({ text: `1/${dec(f.value * 100)}`, code: 'FDP-DIGITS', why: `It looks like you wrote 1 over the percentage. ${P} means ${dec(f.value * 100)} out of 100.` });
      }
      try {
        if (d >= 2 && kind[2] === 'D' && rng.chance(0.35)) {
          const t = typedMisconceptions(to, distractors, { code: 'PV-SHIFT-WRONG', why: 'Check the place value: tenths, hundredths, thousandths.' });
          return { type: 'numeric', prompt, answer: numericAnswer(round6(f.value), [D]), solution, ...t };
        }
        if (d >= 2 && kind[2] !== 'D' && rng.chance(0.35)) {
          const t = typedMisconceptions(to, distractors, { code: 'PV-SHIFT-WRONG', why: kind[2] === 'P' ? 'To change to a percentage, multiply by 100.' : 'Write it over 10, 100 or 1000 using its place value, then simplify.' });
          return { type: 'short', prompt, answer: { accept: kind[2] === 'P' ? [P, dec(f.value * 100)] : [to], keywords: [] }, solution, ...t };
        }
        return { type: 'mcq', prompt, ...choices(rng, to, distractors, null), solution };
      } catch { /* draw again */ }
    }
  },
};
const round6 = (x) => Math.round(x * 1e6) / 1e6;
const dpCount = (s) => (s.split('.')[1] || '').length;
/** The fraction over 100 (or 1000) as written in a solution: 3/8 = 375/1000, 3/5 = 60/100. */
function fracOver(f) {
  if (100 % f.d === 0) return `${f}${f.d === 100 ? '' : ` = ${f.n * (100 / f.d)}/100`}`;
  return `${f} = ${f.n * (1000 / f.d)}/1000`;
}
function decAsFrac(f) {
  const D = dec(f.value);
  const p = dpCount(D);
  return `${Math.round(f.value * 10 ** p)}/${10 ** p}`;
}

// ---------------------------------------------------------------- g06, g08 percentage of an amount; what is left

const PCTS1 = [10, 20, 25, 50, 75];
const PCTS2 = [1, 5, 10, 15, 20, 25, 30, 35, 40, 50, 60, 75];
const ofAmount = {
  id: 'm09.percent-of-amount', topicId: T, subtopicId: 'm09-s4', skill: SKILL.amount,
  title: 'Find a percentage of an amount (D3: the other part, or a price after a discount)',
  difficulties: [1, 2, 3],
  check: { min: 0, maxDp: 2 },
  make(rng, d) {
    for (;;) {
      const p = rng.pick(d === 1 ? PCTS1 : PCTS2);
      const step = 100 / gcdN(p, 100);
      const amount = step * rng.int(1, Math.floor((d === 1 ? 200 : d === 3 && rng.chance(0.5) ? 120 : 900) / step));
      if (amount < (d === 3 ? 10 : 20)) continue;
      const ans = (amount * p) / 100;
      if (d === 3) {
        if (rng.chance(0.5)) {
          // the other part: totals that fit the context
          const [whole, partA, partB, lo, hi] = rng.pick([['pupils in a class', 'boys', 'girls', 20, 40], ['durians in a box', 'ripe', 'not ripe', 10, 60], ['people at a hawker centre', 'children', 'adults', 100, 900], ['books on a shelf', 'story books', 'other books', 20, 200], ['pupils in a school hall', 'in Year 6', 'in other years', 100, 600]]);
          if (p === 50 || amount < lo || amount > hi) continue;
          const total = amount;
          const pr = person(rng);
          const other = total - ans;
          const prompt = `There are ${fmtInt(total)} ${whole}. ${p}% are ${partA}. How many are ${partB}?`;
          const solution = `${p}% of ${fmtInt(total)} = ${fmtInt(total)} x ${p} ÷ 100 = ${dec(ans)} ${partA}. The rest are ${partB}: ${fmtInt(total)} - ${dec(ans)} = ${dec(other)}. (Or: ${100 - p}% of ${fmtInt(total)} = ${dec(other)}.) Answer: ${dec(other)}`;
          void pr;
          if (!Number.isInteger(ans)) continue;
          const distractors = [
            { text: dec(ans), code: 'PCT-OF-WRONG-WHOLE', why: `${dec(ans)} is the number of ${partA} (${p}%). The question asks for the ${partB}.` },
            { text: String(100 - p), code: 'PCT-COUNT-AS-PERCENT', why: `${100 - p}% are ${partB}, but the question asks HOW MANY. Find ${100 - p}% of ${fmtInt(total)}.` },
            total - p > 0 ? { text: fmtInt(total - p), code: 'PCT-SUBTRACT-NUMBER', why: `It looks like you took ${p} away from ${fmtInt(total)}. ${p}% is not ${p} ${whole.split(' ')[0]}: find ${p}% of ${fmtInt(total)} first.` } : null,
          ];
          try { return { type: 'mcq', prompt, ...choices(rng, dec(other), distractors, (i) => fresh(prompt, nearMiss(dec(other + i), `Find ${100 - p}% of ${fmtInt(total)}.`))), solution, marks: 2 }; } catch { continue; }
        }
        // a price after a discount: prices that fit the item, 5% to 45% off
        const [item, lo, hi, them] = rng.pick([['pair of shoes', 40, 300, 'them'], ['school bag', 30, 150, 'it'], ['bicycle', 200, 900, 'it'], ['watch', 60, 600, 'it'], ['football', 20, 120, 'it'], ['set of paints', 10, 80, 'it']]);
        if (p < 5 || p > 45 || amount < lo || amount > hi) continue;
        const price = amount;
        const off = ans;
        const pr = person(rng);
        const prompt = `A ${item} costs ${rm(price)}. In a sale there is ${p}% off. ${pr.name} buys ${them} in the sale. How much does ${pr.he} pay?`;
        const solution = `${p}% of ${rm(price)} = ${rm(price)} x ${p} ÷ 100 = ${rm(off)}. Take it off the price: ${rm(price)} - ${rm(off)} = ${rm(price - off)}. Answer: ${rm(price - off)}`;
        const distractors = [
          { text: rm(off), code: 'PCT-OF-WRONG-WHOLE', why: `${rm(off)} is the amount taken off (the discount), not the sale price.` },
          price - p > 0 ? { text: rm(price - p), code: 'PCT-SUBTRACT-NUMBER', why: `It looks like you took RM ${p} off. ${p}% off means take away ${p}% of the price, which is ${rm(off)}.` } : null,
          { text: rm(price + off), code: 'PCT-ADD-INSTEAD', why: `It looks like you added the discount. In a sale the price goes DOWN by ${rm(off)}.` },
        ];
        try { return { type: 'mcq', prompt, ...choices(rng, rm(price - off), distractors, (i) => fresh(prompt, nearMiss(rm(price - off + i), `Find ${p}% of ${rm(price)}, then take it away.`))), solution, marks: 2 }; } catch { continue; }
      }
      const money = rng.chance(0.4);
      const show = (v) => (money ? rm(v) : dec(v));
      const prompt = `Find ${p}% of ${money ? rm(amount) : fmtInt(amount)}.`;
      const tenStep = p === 50 ? ` 50% is a half: ${fmtInt(amount)} ÷ 2 = ${dec(ans)}.` : p % 10 === 0 && p !== 10 ? ` 10% of ${fmtInt(amount)} is ${dec(amount / 10)}, so ${p}% is ${p / 10} x ${dec(amount / 10)} = ${dec(ans)}.` : p === 25 || p === 75 || p === 50 ? ` ${p}% is ${F(p, 100)} of ${fmtInt(amount)}: ${fmtInt(amount)} ÷ ${100 / gcdN(p, 100)} x ${p / gcdN(p, 100)} = ${dec(ans)}.` : ` ${fmtInt(amount)} x ${p} ÷ 100 = ${dec(ans)}.`;
      const solution = `Percent means out of 100.${tenStep} Answer: ${show(ans)}`;
      const div = amount / p;
      const distractors = [
        { text: show(ans * 10), code: 'PV-SHIFT-WRONG', why: `The digits are right but the answer is 10 times too big. Check the place value: 10% of ${fmtInt(amount)} is ${dec(amount / 10)}.` },
        { text: show(amount - ans), code: 'PCT-OF-WRONG-WHOLE', why: `${show(amount - ans)} is ${100 - p}% of ${fmtInt(amount)}, the part that is left, not ${p}%.` },
        Math.abs(div * 100 - Math.round(div * 100)) < 1e-9 && div !== ans ? { text: show(div), code: 'PCT-AS-DIVISOR', why: `It looks like you divided ${fmtInt(amount)} by ${p}. ${p}% means ${p} out of every 100, so multiply by ${p} and divide by 100.` } : null,
        Number.isInteger(ans * 10) ? { text: show(ans / 10), code: 'PV-SHIFT-WRONG', why: `The digits are right but the answer is 10 times too small. Check the place value.` } : null,
      ];
      try {
        if (d === 2 && rng.chance(0.4)) {
          const t = typedMisconceptions(dec(ans), distractors.filter(Boolean).map((x) => ({ ...x, text: x.text.replace('RM ', '') })), { code: 'PCT-AS-DIVISOR', why: `${p}% of an amount is the amount x ${p} ÷ 100.` });
          return { type: 'numeric', prompt, answer: numericAnswer(round6(ans), money ? [rm(ans), dec(ans)] : [dec(ans)]), solution, ...t };
        }
        return { type: 'mcq', prompt, ...choices(rng, show(ans), distractors, (i) => fresh(prompt, nearMiss(show(ans + i), 'Find 10% first, then build up.'))), solution };
      } catch { /* draw again */ }
    }
  },
};
function gcdN(a, b) { while (b) [a, b] = [b, a % b]; return a; }

// ---------------------------------------------------------------- g07 percentage of a shape (diagram)

const GRIDS = [[2, 5], [4, 5], [5, 5], [5, 10], [10, 10], [2, 10], [4, 10]];
const shape = {
  id: 'm09.percent-of-shape', topicId: T, subtopicId: 'm09-s4', skill: SKILL.shape,
  title: 'What percentage of the grid is shaded? (with the grid drawn)',
  difficulties: [1, 2],
  check: { min: 0, max: 100, maxDp: 1 },
  make(rng, d) {
    for (;;) {
      const [rows, cols] = rng.pick(d === 1 ? [[10, 10], [2, 5], [5, 10]] : GRIDS);
      const n = rows * cols;
      const k = rng.int(1, n - 1);
      const p = (k * 100) / n;
      if (!Number.isInteger(p * 10)) continue;
      const askUnshaded = d === 2 && rng.chance(0.3) && 2 * k !== n; // with half shaded, "not shaded" asks nothing new
      const ans = askUnshaded ? 100 - p : p;
      // shade a random set of squares, not always the first ones
      const order = rng.shuffle(Array.from({ length: n }, (_, i) => i));
      const shaded = n >= 50 || rng.chance(0.5) ? Array.from({ length: k }, (_, i) => i) : order.slice(0, k).sort((a, b) => a - b);
      // a neutral description: the automatic one would count the shaded squares, which is the question (CLO review, renderer notes)
      const diagram = { type: 'fractionModel', shape: 'grid', rows, cols, shaded, alt: `A ${rows} by ${cols} grid of equal squares, with some squares shaded.` };
      // a name and a setting in the prompt, so sessions (which remove repeats by prompt) can use many grids
      const who = person(rng);
      const lead = rng.pick([`${who.name} shades some squares on a grid of ${n} equal squares.`, `${who.name} draws a grid of ${n} equal squares and shades some of them.`, `The grid has ${n} equal squares. ${who.name} has shaded some of them.`]);
      const prompt = `${lead} What percentage of the grid is ${askUnshaded ? 'NOT shaded' : 'shaded'}?`;
      const solution = n === 100
        ? `${k} of the 100 squares ${k === 1 ? 'is' : 'are'} shaded, so ${dec(p)}% is shaded${askUnshaded ? ` and ${dec(100 - p)}% is not` : ''}. Answer: ${dec(ans)}%`
        : `${k} out of ${n} squares ${k === 1 ? 'is' : 'are'} shaded: ${k}/${n}. Each square is 100 ÷ ${n} = ${dec(100 / n)}% of the grid, so ${countOf(k, 'square')} ${k === 1 ? 'is' : 'are'} ${k} x ${dec(100 / n)} = ${dec(p)}%${askUnshaded ? `. Not shaded: 100% - ${dec(p)}% = ${dec(100 - p)}%` : ''}. Answer: ${dec(ans)}%`;
      const distractors = [
        n !== 100 && k !== ans ? { text: `${askUnshaded ? n - k : k}%`, code: 'PCT-COUNT-AS-PERCENT', why: `${askUnshaded ? n - k : k} is the number of squares. The grid has ${n} squares, not 100, so each square is ${dec(100 / n)}%.` } : null,
        { text: `${dec(100 - ans)}%`, code: 'PCT-OF-WRONG-WHOLE', why: askUnshaded ? `${dec(100 - ans)}% is the part that IS shaded. The question asks for the part that is not.` : `${dec(100 - ans)}% is the part that is NOT shaded. Count the shaded squares.` },
      ];
      try { return { type: 'mcq', prompt, ...choices(rng, `${dec(ans)}%`, distractors, (i) => { const w = ans + (i % 2 ? 1 : -1) * Math.ceil(i / 2) * (100 / n); return w > 0 && w < 100 ? fresh(prompt, nearMiss(`${dec(w)}%`, `Count the squares carefully; each square is ${dec(100 / n)}%.`)) : null; }), solution, diagram }; } catch { /* draw again */ }
    }
  },
};

// ---------------------------------------------------------------- g09 comparing and ordering

/** A value written in one of the three forms. */
function writeAs(f, form) { return form === 'F' ? f.toString() : form === 'D' ? dec(f.value) : pct(f); }
const compare = {
  id: 'm09.compare-fdp', topicId: T, subtopicId: 'm09-s5', skill: SKILL.compare,
  title: 'Which is the largest? Fractions, decimals and percentages mixed, with the classic traps (D3 values close together)',
  difficulties: [1, 2, 3],
  check: { min: 0 },
  make(rng, d) {
    const dens = d === 1 ? [2, 4, 5, 10] : [4, 5, 8, 10, 20, 25];
    const near = d === 3 ? 0.08 : 0.25;
    for (;;) {
      const target = properFrac(rng, dens);
      if (target.value < 0.3 || target.value > 0.95) continue;
      const T100 = Math.round(target.value * 1000);
      let tEq = '';
      const items = [];
      // B (the longer decimal is the answer) only at D1-D2: its fraction trap is far from the others
      const mode = d < 3 && rng.chance(0.5) ? 'B' : 'A';
      let tText;
      if (mode === 'A') {
        // the traps look bigger but are smaller: a longer decimal, a bigger denominator
        // the trap decimal must be the longer one: 2 places at D1 (hundredths), 3 places above
        // the answer is a fraction, so the bigger-denominator trap is compared with another fraction (CLO review m09 item 6)
        tText = writeAs(target, 'F');
        tEq = tText === dec(target.value) ? tText : `${tText} = ${dec(target.value)}`;
        const L = d === 1 ? T100 - 10 * rng.int(1, Math.round(near * 100)) : T100 - rng.int(1, Math.round(near * 1000));
        if (L <= 0 || (d === 1 ? L % 100 === 0 : L % 10 === 0)) continue;
        items.push({ text: dec(L / 1000), code: 'DEC-LONGER-BIGGER', why: `${dec(L / 1000)} has more digits, but that does not make it bigger. Compare place by place with ${tEq}.` });
        // terminating denominators only: no recurring decimals at Stage 6 (CLO review m09 item 1)
        const bigDen = rng.pick(d === 1 ? [5, 10].filter((x) => x > target.d) : [8, 10, 20, 25, 40, 50].filter((x) => x > target.d));
        if (!bigDen) continue;
        const bn = Math.ceil(target.value * bigDen) - 1;
        if (bn < 1 || F(bn, bigDen).d <= target.d || target.value - bn / bigDen > near + 0.1) continue;
        items.push({ text: F(bn, bigDen).toString(), code: 'FR-BIGGER-DEN-BIGGER', why: `A bigger denominator means smaller pieces. ${F(bn, bigDen)} is ${dec(bn / bigDen)}, which is less than ${tEq}.` });
      } else {
        // the right answer is the longer decimal; the traps are a shorter decimal and a unit fraction whose
        // denominator looks like a bigger decimal (1/8 read as 0.8)
        const Tdec = dec(target.value);
        if (dpCount(Tdec) < 2) continue;
        tText = Tdec;
        tEq = tText;
        const S = Math.floor(target.value * 10) / 10;
        if (S <= 0 || S === target.value) continue;
        items.push({ text: dec(S), code: 'DEC-SHORTER-BIGGER', why: `${dec(S)} is shorter, but that does not make it bigger. ${tText} has ${dec(S)} and more: compare place by place.` });
        const k = rng.pick([4, 5, 8].filter((x) => x / 10 > target.value && 1 / x < target.value));
        if (!k) continue;
        items.push({ text: `1/${k}`, code: 'FDP-DEN-AS-DECIMAL', why: `1/${k} is not 0.${k}. 1/${k} = 1 ÷ ${k} = ${dec(1 / k)}, which is less than ${tText}.` });
      }
      // the percentage trap: a two-digit number that looks bigger than a decimal
      const pv = rng.int(Math.max(12, Math.round((target.value - near) * 100)), Math.ceil(target.value * 100) - 1);
      if (d === 1 && pv % 5 !== 0) continue;
      items.push({ text: `${pv}%`, code: 'FDP-DIGITS', why: `${pv}% looks big because of the number ${pv}, but ${pv}% = ${dec(pv / 100)}, which is less than ${tEq}.` });
      const vals = [target.value, ...items.map((x) => valueOfText(x.text))];
      if (new Set(vals.map((x) => x.toFixed(6))).size < 4 || vals.slice(1).some((x) => x >= target.value)) continue;
      const all = [tText, ...items.map((x) => x.text)];
      const asDec = (t) => { const x = valueOfText(t); const r = Math.round(x * 1000) / 1000; return `${dec(r)}${Math.abs(x - r) > 1e-9 ? '...' : ''}`; };
      const solution = `Change them all to decimals: ${all.map((t) => (t === asDec(t) ? t : `${t} = ${asDec(t)}`)).join(', ')}. The largest is ${tText}. Answer: ${tText}`;
      // the values are in the prompt, so two questions never look the same (sessions remove repeats by prompt)
      try { const c = choices(rng, tText, items, null); return { type: 'mcq', prompt: `Which of these is the largest: ${c.options.slice(0, -1).join(', ')} or ${c.options[c.options.length - 1]}?`, ...c, solution, marks: d === 3 ? 2 : 1 }; } catch { /* draw again */ }
    }
  },
};
function valueOfText(t) { if (t.endsWith('%')) return Number(t.slice(0, -1)) / 100; if (t.includes('/')) { const [a, b] = t.split('/').map(Number); return a / b; } return Number(t); }

/** Every proper fraction in simplest form with one of these denominators. */
const OPEN_POOL = (dens) => { const out = []; for (const d of dens) for (let n = 1; n < d; n++) if (F(n, d).d === d) out.push(F(n, d)); return out.filter((f, i) => out.findIndex((g) => g.eq(f)) === i); };

const orderFdp = {
  id: 'm09.order-fdp', topicId: T, subtopicId: 'm09-s5', skill: SKILL.order,
  title: 'Put fractions, decimals and percentages in order (smallest first)',
  difficulties: [1, 2, 3],
  check: { min: 0 },
  make(rng, d) {
    for (;;) {
      const dens = d === 1 ? [2, 4, 5, 10] : d === 2 ? [4, 5, 8, 10, 20, 25] : [8, 20, 25, 40, 50];
      const fs = [];
      if (d === 3) {
        // D3: four values within 0.05 to 0.08 of each other (CLO review m09 item 5)
        const anchor = properFrac(rng, dens);
        const spread = rng.pick([0.05, 0.06, 0.08]);
        const pool = OPEN_POOL(dens).filter((f) => f.value > anchor.value && f.value - anchor.value <= spread + 1e-9);
        if (pool.length < 3) continue;
        fs.push(...rng.shuffle([anchor, ...rng.sample(pool, 3)]));
      } else while (fs.length < 4) { const f = properFrac(rng, dens); if (!fs.some((g) => g.eq(f))) fs.push(f); }
      const forms = rng.shuffle(['F', 'D', 'P', rng.pick(['F', 'D', 'P'])]);
      const texts = fs.map((f, i) => writeAs(f, forms[i]));
      // is there a longer decimal that is smaller than a shorter one? Then that is the trap to name
      const decs = fs.map((f, i) => ({ v: f.value, t: texts[i] })).filter((x, i) => forms[i] === 'D');
      const longerTrap = decs.some((x) => decs.some((y) => dpCount(x.t) > dpCount(y.t) && x.v < y.v));
      if (new Set(texts).size < 4) continue;
      const sorted = fs.map((f, i) => ({ f, t: texts[i] })).sort((a, b) => a.f.value - b.f.value);
      const answer = sorted.map((s) => texts.indexOf(s.t));
      if (answer.every((x, i) => x === i)) continue; // shown already in order: draw again
      const prompt = `Put these in order, starting with the smallest: ${texts.join(', ')}.`;
      const solution = `Change them all to decimals: ${sorted.map((s) => `${s.t} = ${dec(s.f.value)}`).join(', ')}. Smallest to largest: ${sorted.map((s) => s.t).join(', ')}. Answer: ${sorted.map((s) => s.t).join(', ')}`;
      return {
        type: 'order', prompt, options: texts, answer, solution,
        misconceptions: { common: longerTrap ? 'Change every number into the same form (decimals are easiest) before you compare. More digits after the point does not make a decimal bigger.' : 'Change every number into the same form (decimals are easiest) before you compare.' },
        codes: { common: longerTrap ? 'DEC-LONGER-BIGGER' : 'UNCLASSIFIED' }, marks: d === 1 ? 1 : 2,
      };
    }
  },
};

export default [division, mixedImproper, equivalent, simplestForm, convert, ofAmount, shape, compare, orderFdp];
