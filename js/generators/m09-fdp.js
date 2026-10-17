// m09 Fractions, Percentages and Decimals: fractions as division, mixed numbers, equivalent
// fractions and simplest form, converting between forms, percentages of amounts and shapes,
// comparing and ordering. Patterns and ranges follow the CLO's generator guide (m09).

import { F, choices, typedMisconceptions, nearMiss, numericAnswer, fmtInt, dec, rm, person , denWord, capFirst } from './core.js';

const T = 'm09-fractions-percentages-decimals';
const SKILL = {
  division: 'fraction as division', mixed: 'mixed numbers and improper fractions', equiv: 'equivalent fractions', simplest: 'simplest form',
  convert: 'converting fractions, decimals and percentages', shape: 'percentage of a shape', amount: 'percentage of an amount',
  compare: 'comparing fractions, decimals and percentages', order: 'ordering fractions, decimals and percentages',
};

export const EXTRA_CODES = {
  'FDP-DIV-REVERSED': 'Writes a ÷ b as b/a (divides the wrong way round)',
  'FR-MIXED-QR-SWAP': 'Swaps the whole number and the numerator when changing an improper fraction to a mixed number (17/5 = 2 3/5)',
  'FR-MIXED-WRONG-DEN': 'Uses the wrong denominator when changing between mixed numbers and improper fractions (17/5 = 3 2/17)',
  'FR-MIXED-ADD-WHOLE': 'Adds the whole number to the numerator (3 2/5 = 5/5)',
  'FR-MIXED-WRONG-PARTS': 'Multiplies the whole number by the numerator and adds the denominator (3 2/5 = 11/5)',
  'FR-MIXED-NO-NUMERATOR': 'Multiplies the whole number by the denominator but forgets to add the numerator (3 2/5 = 15/5)',
  'FR-EQUIV-ADDITIVE': 'Adds the same number to the numerator and the denominator to make an equivalent fraction (3/5 = 18/20)',
  'FR-EQUIV-FACTOR-ONLY': 'Gives the scale factor instead of the missing numerator or denominator',
  'FR-EQUIV-SIMPLIFIED-ONLY': 'Simplifies the fraction but stops before scaling it to the new denominator',
  'FR-SIMPLIFY-ONE-PART': 'Divides only the numerator or only the denominator when simplifying',
  'FR-SIMPLIFY-SUBTRACT': 'Subtracts the same number from the numerator and the denominator instead of dividing',
  'FDP-DEN-AS-DECIMAL': 'Writes the denominator as the decimal (1/8 = 0.8, 3/5 = 0.5)',
  'FDP-DEC-AS-PERCENT': 'Puts a % sign on the decimal without multiplying by 100 (0.35 = 0.35%)',
  'FDP-PCT-NO-DIVIDE': 'Drops the % sign without dividing by 100 (35% = 35)',
  'PCT-COUNT-AS-PERCENT': 'Gives the number of shaded squares as the percentage, whatever the size of the grid',
  'PCT-SUBTRACT-NUMBER': 'Subtracts the percentage number itself from the amount (20% off RM 80 = RM 60)',
  'PCT-ADD-INSTEAD': 'Adds the percentage on when it should be taken off (a discount added to the price)',
  'FR-BIGGER-DEN-BIGGER': 'Thinks a fraction with a bigger denominator is bigger',
  'FR-SMALLER-DEN-BIGGER': 'Thinks a fraction with a smaller denominator is bigger, whatever the numerator',
  'FR-EQUIV-CROSS': 'Multiplies across (one numerator by the other denominator) instead of scaling the fraction',
};

const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
function properFrac(rng, dens) { for (;;) { const b = rng.pick(dens); const a = rng.int(1, b - 1); if (F(a, b).d === b) return F(a, b); } }
const pct = (f) => `${dec(f.value * 100)}%`;

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
        { text: F(b, a).isInt ? null : (d === 1 ? F(b, a).mixed() : F(b, a).toString()), code: 'FDP-DIV-REVERSED', why: `It looks like you put ${b} on top. In ${a} ÷ ${b}, the number being shared (${a}) is the numerator: ${a}/${b}.` },
        d === 2 ? { text: `${q}.${r}`, code: 'REMAINDER-AS-DECIMAL', why: `It looks like you wrote the remainder ${r} after a decimal point. The ${r} left over is ${r}/${b} of a whole, not ${r} tenth${r === 1 ? '' : 's'}.` } : (b < 10 ? { text: `${a}.${b}`, code: 'FDP-DIGITS', why: `It looks like you wrote the two numbers with a decimal point between them. ${a} ÷ ${b} is ${a}/${b}, which is less than 1.` } : null),
        d === 2 && r !== q && q < b ? { text: F(r).add(F(q, b)).mixed(), code: 'FR-MIXED-QR-SWAP', why: `It looks like you swapped the whole number and the remainder. ${b} goes into ${a} ${q} time${q === 1 ? '' : 's'} (the whole number) with ${r} left over (the numerator).` } : null,
        d === 1 && a > 1 ? { text: `1/${b}`, code: 'FR-DIV-WHOLE-ONLY', why: `1/${b} is each share of ONE whole. Here ${a} wholes are shared, so each gets ${a}/${b}.` } : null,
      ].filter((x) => x && x.text);
      try {
        if (d === 2 && rng.chance(0.4)) {
          const t = typedMisconceptions(ans, distractors, { code: 'FDP-DIV-REVERSED', why: `Write ${a} ÷ ${b} as ${a}/${b}, then change it to a mixed number: how many times does ${b} go into ${a}, and what is left?` });
          return { type: 'short', prompt, answer: { accept: [ans], keywords: [] }, solution, ...t };
        }
        return { type: 'mcq', prompt, ...choices(rng, ans, distractors, (i) => nearMiss(d === 1 ? F(a + i, b).toString() : f.add(F(i, b)).mixed(), `Write ${a} ÷ ${b} as a fraction with ${a} on top.`)), solution };
      } catch { /* draw again */ }
    }
  },
};
// the code FR-DIV-WHOLE-ONLY is defined by m10's EXTRA codes in misconceptions.js

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
          { text: `${w + 1} ${n}/${den}`, code: 'NEAR-MISS', why: `This is close, but ${w + 1} ${n}/${den} is not right. ${w + 1} x ${den} = ${(w + 1) * den}, which is more than ${imp.n}. Check how many whole ${den}s fit.` },
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
          a + (e - b) > 0 ? { text: String(a + (e - b)), code: 'FR-EQUIV-ADDITIVE', why: `It looks like you added ${e - b} to the top because ${b} + ${e - b} = ${e}. Equivalent fractions come from multiplying or dividing, not adding.` } : null,
          { text: String(base.n), code: 'FR-EQUIV-SIMPLIFIED-ONLY', why: `You simplified ${a}/${b} to ${base} (well done) but stopped. Now write ${base} with denominator ${e}.` },
          { text: String(base.n * e), code: 'FR-EQUIV-CROSS', why: `It looks like you multiplied ${base.n} by ${e}. ${base} has denominator ${base.d}; multiply the top and the bottom by ${k2} to get ${e}.` },
        ] : [
          b + (c - a) > 0 ? { text: String(b + (c - a)), code: 'FR-EQUIV-ADDITIVE', why: `It looks like you added ${c - a} to the bottom because ${a} + ${c - a} = ${c}. Equivalent fractions come from multiplying or dividing, not adding.` } : null,
          { text: String(base.d), code: 'FR-EQUIV-SIMPLIFIED-ONLY', why: `You simplified ${a}/${b} to ${base} (well done) but stopped. Now write it with numerator ${c}.` },
        ];
        try { return { type: 'mcq', prompt, ...choices(rng, String(ans), distractors, (i) => nearMiss(String(ans + i), `Simplify ${a}/${b} first, then scale it.`)), solution, marks: 2 }; } catch { continue; }
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
        return { type: 'mcq', prompt, ...choices(rng, String(ans), distractors, (i) => nearMiss(String(ans + i), `${op === 'multiply' ? 'Multiply' : 'Divide'} the top and bottom by the same number.`)), solution };
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
          try { return { type: 'mcq', prompt, ...choices(rng, dec(other), distractors, (i) => nearMiss(dec(other + i), `Find ${100 - p}% of ${fmtInt(total)}.`)), solution, marks: 2 }; } catch { continue; }
        }
        // a price after a discount: prices that fit the item, 5% to 45% off
        const [item, lo, hi] = rng.pick([['pair of shoes', 40, 300], ['school bag', 30, 150], ['bicycle', 200, 900], ['watch', 60, 600], ['football', 20, 120], ['set of paints', 10, 80]]);
        if (p < 5 || p > 45 || amount < lo || amount > hi) continue;
        const price = amount;
        const off = ans;
        const pr = person(rng);
        const prompt = `A ${item} costs ${rm(price)}. In a sale there is ${p}% off. ${pr.name} buys it in the sale. How much does ${pr.he} pay?`;
        const solution = `${p}% of ${rm(price)} = ${rm(price)} x ${p} ÷ 100 = ${rm(off)}. Take it off the price: ${rm(price)} - ${rm(off)} = ${rm(price - off)}. Answer: ${rm(price - off)}`;
        const distractors = [
          { text: rm(off), code: 'PCT-OF-WRONG-WHOLE', why: `${rm(off)} is the amount taken off (the discount), not the sale price.` },
          price - p > 0 ? { text: rm(price - p), code: 'PCT-SUBTRACT-NUMBER', why: `It looks like you took RM ${p} off. ${p}% off means take away ${p}% of the price, which is ${rm(off)}.` } : null,
          { text: rm(price + off), code: 'PCT-ADD-INSTEAD', why: `It looks like you added the discount. In a sale the price goes DOWN by ${rm(off)}.` },
        ];
        try { return { type: 'mcq', prompt, ...choices(rng, rm(price - off), distractors, (i) => nearMiss(rm(price - off + i), `Find ${p}% of ${rm(price)}, then take it away.`)), solution, marks: 2 }; } catch { continue; }
      }
      const money = rng.chance(0.4);
      const show = (v) => (money ? rm(v) : dec(v));
      const prompt = `Find ${p}% of ${money ? rm(amount) : fmtInt(amount)}.`;
      const tenStep = p % 10 === 0 && p !== 10 ? ` 10% of ${fmtInt(amount)} is ${dec(amount / 10)}, so ${p}% is ${p / 10} x ${dec(amount / 10)} = ${dec(ans)}.` : p === 25 || p === 75 || p === 50 ? ` ${p}% is ${F(p, 100)} of ${fmtInt(amount)}: ${fmtInt(amount)} ÷ ${100 / gcdN(p, 100)} x ${p / gcdN(p, 100)} = ${dec(ans)}.` : ` ${fmtInt(amount)} x ${p} ÷ 100 = ${dec(ans)}.`;
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
        return { type: 'mcq', prompt, ...choices(rng, show(ans), distractors, (i) => nearMiss(show(ans + i), 'Find 10% first, then build up.')), solution };
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
      const askUnshaded = d === 2 && rng.chance(0.3);
      const ans = askUnshaded ? 100 - p : p;
      // shade a random set of squares, not always the first ones
      const order = rng.shuffle(Array.from({ length: n }, (_, i) => i));
      const shaded = n >= 50 || rng.chance(0.5) ? Array.from({ length: k }, (_, i) => i) : order.slice(0, k).sort((a, b) => a - b);
      const diagram = { type: 'fractionModel', shape: 'grid', rows, cols, shaded };
      const prompt = `The grid has ${n} equal squares. What percentage of the grid is ${askUnshaded ? 'NOT shaded' : 'shaded'}?`;
      const solution = n === 100
        ? `${k} of the 100 squares are shaded, so ${dec(p)}% is shaded${askUnshaded ? ` and ${dec(100 - p)}% is not` : ''}. Answer: ${dec(ans)}%`
        : `${k} out of ${n} squares are shaded: ${k}/${n}. Each square is 100 ÷ ${n} = ${dec(100 / n)}% of the grid, so ${k} squares are ${k} x ${dec(100 / n)} = ${dec(p)}%${askUnshaded ? `. Not shaded: 100% - ${dec(p)}% = ${dec(100 - p)}%` : ''}. Answer: ${dec(ans)}%`;
      const distractors = [
        n !== 100 && k !== ans ? { text: `${askUnshaded ? n - k : k}%`, code: 'PCT-COUNT-AS-PERCENT', why: `${askUnshaded ? n - k : k} is the number of squares. The grid has ${n} squares, not 100, so each square is ${dec(100 / n)}%.` } : null,
        { text: `${dec(100 - ans)}%`, code: 'PCT-OF-WRONG-WHOLE', why: askUnshaded ? `${dec(100 - ans)}% is the part that IS shaded. The question asks for the part that is not.` : `${dec(100 - ans)}% is the part that is NOT shaded. Count the shaded squares.` },
      ];
      try { return { type: 'mcq', prompt, ...choices(rng, `${dec(ans)}%`, distractors, (i) => nearMiss(`${dec(ans + i * (100 / n))}%`, `Count the squares carefully; each square is ${dec(100 / n)}%.`)), solution, diagram }; } catch { /* draw again */ }
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
      const items = [];
      const mode = rng.chance(0.5) ? 'A' : 'B';
      let tText;
      if (mode === 'A') {
        // the traps look bigger but are smaller: a longer decimal, a bigger denominator
        // the trap decimal must be the longer one: 2 places at D1 (hundredths), 3 places above
        tText = writeAs(target, dpCount(dec(target.value)) >= (d === 1 ? 2 : 3) ? 'F' : rng.pick(['F', 'D']));
        const L = d === 1 ? T100 - 10 * rng.int(1, Math.round(near * 100)) : T100 - rng.int(1, Math.round(near * 1000));
        if (L <= 0 || (d === 1 ? L % 100 === 0 : L % 10 === 0)) continue;
        items.push({ text: dec(L / 1000), code: 'DEC-LONGER-BIGGER', why: `${dec(L / 1000)} has more digits, but that does not make it bigger. Compare place by place with ${tText} = ${dec(target.value)}.` });
        const bigDen = rng.pick(d === 1 ? [5, 10].filter((x) => x > target.d) : [7, 9, 11, 12, 15, 16].filter((x) => x > target.d));
        if (!bigDen) continue;
        const bn = Math.ceil(target.value * bigDen) - 1;
        if (bn < 1 || F(bn, bigDen).d <= target.d || target.value - bn / bigDen > near + 0.1) continue;
        items.push({ text: F(bn, bigDen).toString(), code: 'FR-BIGGER-DEN-BIGGER', why: `A bigger denominator means smaller pieces. ${F(bn, bigDen)} is ${bigDen % 2 && bigDen % 5 ? 'about ' : ''}${dec(Math.round((bn / bigDen) * 1000) / 1000)}, which is less than ${tText} = ${dec(target.value)}.` });
      } else {
        // the right answer is the longer decimal; the traps are a shorter decimal and a smaller denominator
        const Tdec = dec(target.value);
        if (dpCount(Tdec) < 2) continue;
        tText = Tdec;
        const S = Math.floor(target.value * 10) / 10;
        if (S <= 0 || S === target.value) continue;
        items.push({ text: dec(S), code: 'DEC-SHORTER-BIGGER', why: `${dec(S)} is shorter, but that does not make it bigger. ${tText} has ${dec(S)} and more: compare place by place.` });
        const sd = rng.pick([2, 3, 4, 5].filter((x) => x < target.d));
        if (!sd) continue;
        const sn = Math.ceil(target.value * sd) - 1;
        if (sn < 1 || F(sn, sd).d !== sd || target.value - sn / sd > near + 0.15) continue;
        items.push({ text: F(sn, sd).toString(), code: 'FR-SMALLER-DEN-BIGGER', why: `${F(sn, sd)} has bigger pieces, but only ${sn} of them: it is ${sd === 3 ? 'about ' : ''}${dec(Math.round((sn / sd) * 1000) / 1000)}, less than ${tText}.` });
      }
      // the percentage trap: a two-digit number that looks bigger than a decimal
      const pv = rng.int(Math.max(12, Math.round((target.value - near) * 100)), Math.ceil(target.value * 100) - 1);
      if (d === 1 && pv % 5 !== 0) continue;
      items.push({ text: `${pv}%`, code: 'FDP-DIGITS', why: `${pv}% looks big because of the number ${pv}, but ${pv}% = ${dec(pv / 100)}, which is less than ${tText} = ${dec(target.value)}.` });
      const vals = [target.value, ...items.map((x) => valueOfText(x.text))];
      if (new Set(vals.map((x) => x.toFixed(6))).size < 4 || vals.slice(1).some((x) => x >= target.value)) continue;
      const all = [tText, ...items.map((x) => x.text)];
      const asDec = (t) => { const x = valueOfText(t); const r = Math.round(x * 1000) / 1000; return `${dec(r)}${Math.abs(x - r) > 1e-9 ? '...' : ''}`; };
      const solution = `Change them all to decimals: ${all.map((t) => `${t} = ${asDec(t)}`).join(', ')}. The largest is ${tText}. Answer: ${tText}`;
      try { return { type: 'mcq', prompt: 'Which of these is the largest?', ...choices(rng, tText, items, null), solution, marks: d === 3 ? 2 : 1 }; } catch { /* draw again */ }
    }
  },
};
function valueOfText(t) { if (t.endsWith('%')) return Number(t.slice(0, -1)) / 100; if (t.includes('/')) { const [a, b] = t.split('/').map(Number); return a / b; } return Number(t); }

const orderFdp = {
  id: 'm09.order-fdp', topicId: T, subtopicId: 'm09-s5', skill: SKILL.order,
  title: 'Put fractions, decimals and percentages in order (smallest first)',
  difficulties: [1, 2, 3],
  check: { min: 0 },
  make(rng, d) {
    for (;;) {
      const dens = d === 1 ? [2, 4, 5, 10] : d === 2 ? [4, 5, 8, 10, 20, 25] : [8, 20, 25, 40, 50];
      const fs = [];
      while (fs.length < 4) { const f = properFrac(rng, dens); if (!fs.some((g) => g.eq(f))) fs.push(f); }
      const vals = fs.map((f) => f.value).sort((a, b) => a - b);
      if (d === 3 && vals[3] - vals[0] > 0.3) continue;
      const forms = rng.shuffle(['F', 'D', 'P', rng.pick(['F', 'D', 'P'])]);
      const texts = fs.map((f, i) => writeAs(f, forms[i]));
      if (new Set(texts).size < 4) continue;
      const sorted = fs.map((f, i) => ({ f, t: texts[i] })).sort((a, b) => a.f.value - b.f.value);
      const answer = sorted.map((s) => texts.indexOf(s.t));
      if (answer.every((x, i) => x === i)) continue; // shown already in order: draw again
      const prompt = 'Put these in order, starting with the smallest.';
      const solution = `Change them all to decimals: ${sorted.map((s) => `${s.t} = ${dec(s.f.value)}`).join(', ')}. Smallest to largest: ${sorted.map((s) => s.t).join(', ')}. Answer: ${sorted.map((s) => s.t).join(', ')}`;
      return {
        type: 'order', prompt, options: texts, answer, solution,
        misconceptions: { common: 'Change every number into the same form (decimals are easiest) before you compare. More digits after the point does not make a decimal bigger.' },
        codes: { common: 'DEC-LONGER-BIGGER' }, marks: d === 1 ? 1 : 2,
      };
    }
  },
};

export default [division, mixedImproper, equivalent, simplestForm, convert, ofAmount, shape, compare, orderFdp];
