// m11 Ratio and Proportion: writing and simplifying ratios, equivalent ratios, sharing in a
// ratio, ratio problems using the difference (bar model), ratio and fractions, direct proportion,
// best buy, before-and-after problems. Patterns follow the CLO's generator guide (m11).

import { F, gcd, lcm, choices, typedMisconceptions, nearMiss, numericAnswer, fmtInt, dec, rm, person, PEOPLE, capFirst, countOf } from './core.js';

const T = 'm11-ratio-and-proportion';
const SKILL = {
  write: 'writing a ratio', simplify: 'simplifying a ratio', partWhole: 'ratio of part to whole', units: 'ratio with different units',
  equiv: 'finding a missing value in equivalent ratios', share: 'sharing in a ratio', fraction: 'ratio and fractions', diff: 'ratio problems using the difference',
  direct: 'direct proportion', recipe: 'scaling a recipe', unitary: 'unitary method', best: 'best buy', multi: 'multi-step ratio problems', beforeAfter: 'before-and-after ratio problems',
};

// Misconception codes: all declared once in misconceptions.js (the CLO's catalogue).

const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const R = (...xs) => xs.join(' : ');
const names2 = (rng) => { const [a, b] = rng.sample(PEOPLE, 2); return [a.name, b.name]; };
/** Every number written in a prompt (thousands spaces joined), as the tests read them. */
const promptNums = (prompt) => (String(prompt).replace(/(\d) (\d{3})/g, '$1$2').match(/-?\d+(?:\.\d+)?(?:\/\d+)?/g) || []).map((t) => { const [x, y] = t.split('/'); return y ? Number(x) / Number(y) : Number(x); });
/** Is v a number that already appears in the prompt? (A near miss must never be one: CLO review X3.) */
const inPrompt = (prompt, v) => promptNums(prompt).some((x) => Math.abs(x - v) < 1e-9);
/** Money in sen as a typed answer with two decimal places ("16.90"). */
const money2 = (sen) => (sen / 100).toFixed(2);

const THINGS = [['red pens', 'blue pens', 'pens', 'in a box'], ['boys', 'girls', 'pupils', 'in a class'], ['cats', 'dogs', 'pets', 'on a street'], ['mangoes', 'durians', 'fruits', 'on a stall'], ['buses', 'cars', 'vehicles', 'in a car park'], ['story books', 'comics', 'books', 'on a shelf']];

// ---------------------------------------------------------------- g01 writing a ratio (part : part and part : whole)

const writeRatio = {
  id: 'm11.write-ratio', topicId: T, subtopicId: 'm11-s1', skill: SKILL.write,
  title: 'Write a ratio from a description (part to part, or part to whole), in its simplest form at D2',
  difficulties: [1, 2],
  check: {},
  make(rng, d) {
    for (;;) {
      const [A, B, whole0, where] = rng.pick(THINGS);
      const a = rng.int(2, d === 1 ? 12 : 30); const b = rng.int(2, d === 1 ? 12 : 30);
      if (a === b) continue;
      const g = gcd(a, b);
      if (d === 1 && g > 1 && rng.chance(0.6)) continue;
      if (d === 2 && g === 1) continue;
      const whole = rng.chance(0.35);
      const total = a + b;
      const [x, y] = whole ? [a / gcd(a, total), total / gcd(a, total)] : [a / g, b / g];
      const ans = R(x, y);
      const prompt = `There are ${a} ${A} and ${b} ${B} ${where}. Write the ratio of ${A} to ${whole ? `all the ${whole0}` : B}${d === 2 || g > 1 || gcd(a, total) > 1 ? ' in its simplest form' : ''}.`;
      const solution = whole
        ? `There are ${a} + ${b} = ${total} ${whole0} altogether. ${capFirst(A)} : all = ${R(a, total)}${gcd(a, total) > 1 ? `. Divide both by ${gcd(a, total)}: ${ans}` : ''}. Answer: ${ans}`
        : `${capFirst(A)} first, then ${B}: ${R(a, b)}${g > 1 ? `. Divide both by ${g}: ${ans}` : ''}. The order matters. Answer: ${ans}`;
      const distractors = whole ? [
        { text: R(y, x), code: 'RATIO-REVERSED', why: `It looks like you wrote the ratio the wrong way round. ${capFirst(A)} come first.` },
        { text: R(a / g, b / g), code: 'RATIO-PART-TO-WHOLE', why: `${R(a / g, b / g)} compares ${A} with ${B}. The question asks for ${A} compared with ALL the ${whole0} (${total}).` },
        { text: R(b / gcd(b, total), total / gcd(b, total)), code: 'RATIO-GIVES-ONE-SHARE', why: `${R(b / gcd(b, total), total / gcd(b, total))} compares the ${B} with all the ${whole0}. The question asks about the ${A}.` },
        gcd(a, total) > 2 && gcd(a, total) % 2 === 0 ? { text: R(a / 2, total / 2), code: 'RATIO-PART-SIMPLIFIED', why: `${R(a / 2, total / 2)} is equal, but not in its simplest form: both numbers can still be divided by ${gcd(a, total) / 2}.` } : null,
      ] : [
        { text: R(y, x), code: 'RATIO-REVERSED', why: `It looks like you wrote the ratio the wrong way round. The question says ${A} to ${B}, so ${A} come first.` },
        { text: R(a / gcd(a, total), total / gcd(a, total)), code: 'RATIO-PART-TO-WHOLE', why: `It looks like you compared the ${A} with all ${total}. The question asks for ${A} to ${B}.` },
        { text: R(b / gcd(b, total), total / gcd(b, total)), code: 'RATIO-PART-TO-WHOLE', why: `It looks like you compared the ${B} with all ${total}. The question asks for ${A} to ${B}.` },
        g > 2 && g % 2 === 0 ? { text: R(a / 2, b / 2), code: 'RATIO-PART-SIMPLIFIED', why: `${R(a / 2, b / 2)} is equal, but not in its simplest form: both numbers can still be divided by ${g / 2}.` } : null,
      ];
      try {
        return { type: 'mcq', prompt, ...choices(rng, ans, distractors, null), solution, skill: whole ? SKILL.partWhole : d === 2 ? SKILL.simplify : SKILL.write };
      } catch { /* draw again */ }
    }
  },
};

// ---------------------------------------------------------------- g02 simplifying a ratio (two or three parts; units at D3)

const UNIT_PAIRS = [
  { big: 'h', small: 'min', k: 60, fmt: (v, u) => `${v} ${u}` }, { big: 'm', small: 'cm', k: 100, fmt: (v, u) => `${v} ${u}` },
  { big: 'kg', small: 'g', k: 1000, fmt: (v, u) => `${v} ${u}` }, { big: 'L', small: 'ml', k: 1000, fmt: (v, u) => `${v} ${u}` },
  { big: 'km', small: 'm', k: 1000, fmt: (v, u) => `${v} ${u}` },
];
const simplify = {
  id: 'm11.simplify-ratio', topicId: T, subtopicId: 'm11-s1', skill: SKILL.simplify,
  title: 'Simplify a ratio (D2 three parts; D3 change to the same units first)',
  difficulties: [1, 2, 3],
  check: {},
  make(rng, d) {
    for (;;) {
      if (d === 3) {
        const u = rng.pick(UNIT_PAIRS);
        const smallVal = u.k === 60 ? rng.pick([5, 10, 15, 20, 25, 30, 35, 40, 45, 50]) : u.k === 100 ? rng.int(1, 19) * 5 : rng.int(1, 19) * 50;
        const bigVal = rng.int(1, 4);
        const bigInSmall = bigVal * u.k;
        if (bigInSmall % smallVal === 0 && bigInSmall / smallVal > 40) continue;
        const g = gcd(smallVal, bigInSmall);
        const smallFirst = rng.chance(0.5);
        const [p, q] = smallFirst ? [smallVal / g, bigInSmall / g] : [bigInSmall / g, smallVal / g];
        if (Math.max(p, q) > 60) continue;
        const ans = R(p, q);
        const firstText = smallFirst ? u.fmt(smallVal, u.small) : u.fmt(bigVal, u.big);
        const secondText = smallFirst ? u.fmt(bigVal, u.big) : u.fmt(smallVal, u.small);
        const prompt = `Write the ratio ${firstText} : ${secondText} in its simplest form.`;
        const solution = `Change to the same units first: ${bigVal} ${u.big} = ${fmtInt(bigInSmall)} ${u.small}. So the ratio is ${smallFirst ? R(smallVal, fmtInt(bigInSmall)) : R(fmtInt(bigInSmall), smallVal)}. Divide both by ${g}: ${ans}. Answer: ${ans}`;
        const gm = gcd(smallVal, bigVal);
        const distractors = [
          { text: smallFirst ? R(smallVal / gm, bigVal / gm) : R(bigVal / gm, smallVal / gm), code: 'UNIT-MIXED', why: `It looks like you used the numbers without changing the units. ${bigVal} ${u.big} is ${fmtInt(bigInSmall)} ${u.small}, so change both to ${u.small} first.` },
          { text: R(q, p), code: 'RATIO-REVERSED', why: `The ratio is the wrong way round. Keep the order of the question: ${firstText} first.` },
          u.k !== 60 && (bigVal * (u.k / 10)) % 1 === 0 ? { text: (() => { const b2 = bigVal * (u.k / 10); const g2 = gcd(smallVal, b2); return smallFirst ? R(smallVal / g2, b2 / g2) : R(b2 / g2, smallVal / g2); })(), code: 'UNIT-FACTOR-WRONG', why: `Check the conversion: 1 ${u.big} = ${fmtInt(u.k)} ${u.small}.` } : (u.k === 60 ? { text: (() => { const b2 = bigVal * 100; const g2 = gcd(smallVal, b2); return smallFirst ? R(smallVal / g2, b2 / g2) : R(b2 / g2, smallVal / g2); })(), code: 'UNIT-FACTOR-WRONG', why: `It looks like you used 1 h = 100 min. An hour is 60 minutes.` } : null),
        ];
        try { return { type: 'mcq', prompt, ...choices(rng, ans, distractors, (i) => nearMiss(R(p + i, q), 'Change both to the same unit, then divide by the highest common factor.')), solution, marks: 2, skill: SKILL.units }; } catch { continue; }
      }
      const three = d === 2 && rng.chance(0.5);
      const base = three ? [rng.int(1, 9), rng.int(1, 9), rng.int(1, 9)] : [rng.int(1, 12), rng.int(1, 12)];
      if (base.reduce((a, b) => gcd(a, b)) !== 1 || new Set(base).size < base.length) continue;
      const h = rng.pick(d === 1 ? [2, 3, 4, 5, 10] : [4, 6, 8, 12, 15, 20, 25]);
      const nums = base.map((x) => x * h);
      if (Math.max(...nums) > 100) continue;
      const ans = R(...base);
      const prompt = `Write ${R(...nums)} in its simplest form.`;
      const solution = `The highest common factor of ${nums.join(three ? ', ' : ' and ')} is ${h}. Divide every part by ${h}: ${ans}. Answer: ${ans}`;
      const sub = [2, 3, 5].find((x) => h % x === 0 && h !== x);
      const distractors = [
        sub ? { text: R(...nums.map((x) => x / sub)), code: 'RATIO-PART-SIMPLIFIED', why: `${R(...nums.map((x) => x / sub))} is equal, but it can be simplified further: every part can still be divided by ${h / sub}.` } : null,
        { text: R(...[...base].reverse()), code: 'RATIO-REVERSED', why: 'The numbers are right but in the wrong order. Keep the order of the question.' },
        !three ? { text: R(base[0], nums[1]), code: 'FR-SIMPLIFY-ONE-PART', why: `It looks like you divided only the first number by ${h}. Divide EVERY part of a ratio by the same number.` } : { text: R(base[0], base[1], nums[2]), code: 'FR-SIMPLIFY-ONE-PART', why: `It looks like you did not divide the last part by ${h}. Divide every part by the same number.` },
      ];
      try {
        if (rng.chance(0.35)) {
          const t = typedMisconceptions(ans, distractors, { code: 'UNCLASSIFIED', why: `Divide every part by the highest common factor, ${h}.` });
          return { type: 'short', prompt, answer: { accept: [ans, base.join(':')], keywords: [] }, solution, ...t };
        }
        return { type: 'mcq', prompt, ...choices(rng, ans, distractors, (i) => nearMiss(R(...base.map((x, j) => (j === 0 ? x + i : x))), `Divide every part by ${h}.`)), solution };
      } catch { /* draw again */ }
    }
  },
};

// ---------------------------------------------------------------- g03 equivalent ratios, missing number

const equivalent = {
  id: 'm11.equivalent-ratio', topicId: T, subtopicId: 'm11-s2', skill: SKILL.equiv,
  title: 'Find the missing number in equivalent ratios (D3: simplify first or three parts)',
  difficulties: [1, 2, 3],
  check: { integer: true, min: 1 },
  make(rng, d) {
    for (;;) {
      if (d === 3) {
        // 6 : 9 = 10 : ?  (no whole-number factor from 6 to 10)
        const a = rng.int(2, 9); const b = rng.int(2, 12);
        if (gcd(a, b) !== 1 || a === b) continue;
        const k1 = rng.int(2, 5); const k2 = rng.int(2, 7);
        if (k1 === k2 || k2 % k1 === 0 || k1 % k2 === 0) continue;
        const prompt = `Find the missing number: ${R(a * k1, b * k1)} = ${R(a * k2, '?')}`;
        const ans = b * k2;
        const solution = `Simplify first: ${R(a * k1, b * k1)} = ${R(a, b)} (divide by ${k1}). ${a} x ${k2} = ${a * k2}, so the missing number is ${b} x ${k2} = ${ans}. Answer: ${ans}`;
        const distractors = [
          b * k1 + (a * k2 - a * k1) > 0 ? { text: String(b * k1 + (a * k2 - a * k1)), code: 'RATIO-ADDITIVE', why: `It looks like you ${a * k2 > a * k1 ? 'added' : 'took away'} ${Math.abs(a * k2 - a * k1)} ${a * k2 > a * k1 ? 'to' : 'from'} both numbers. Equivalent ratios come from multiplying or dividing both parts by the same number.` } : null,
          { text: String(b), code: 'FR-EQUIV-SIMPLIFIED-ONLY', why: `You simplified to ${R(a, b)} (well done) but stopped. Now multiply by ${k2} so the first part is ${a * k2}.` },
          b * k1 * a * k2 <= 400 && { text: String(b * k1 * a * k2), code: 'FR-EQUIV-CROSS', why: `It looks like you multiplied ${b * k1} by ${a * k2}. Simplify ${R(a * k1, b * k1)} to ${R(a, b)} first, then multiply both parts by ${k2}.` },
        ];
        const near = (i) => { const v = ans + (i % 2 ? Math.ceil(i / 2) : -i / 2); return v > 0 && !inPrompt(prompt, v) ? nearMiss(String(v), `Simplify the first ratio to ${R(a, b)}, then multiply both parts by ${k2}.`) : null; };
        try { return { type: 'mcq', prompt, ...choices(rng, String(ans), distractors, near), solution, marks: 2 }; } catch { continue; }
      }
      const a = rng.int(1, d === 1 ? 9 : 12); const b = rng.int(1, d === 1 ? 9 : 12);
      if (a === b) continue;
      const k = rng.int(2, d === 1 ? 6 : 9);
      const down = d === 2 && rng.chance(0.4);
      const missSecond = rng.chance(0.6);
      const [p1, q1, p2, q2] = down ? [a * k, b * k, a, b] : [a, b, a * k, b * k];
      const ans = missSecond ? q2 : p2;
      const prompt = missSecond ? `Find the missing number: ${R(p1, q1)} = ${R(p2, '?')}` : `Find the missing number: ${R(p1, q1)} = ${R('?', q2)}`;
      const op = down ? '÷' : 'x';
      const solution = missSecond
        ? `${p1} ${op} ${k} = ${p2}, so ${op === 'x' ? 'multiply' : 'divide'} the second part by ${k} too: ${q1} ${op} ${k} = ${q2}. Answer: ${ans}`
        : `${q1} ${op} ${k} = ${q2}, so ${op === 'x' ? 'multiply' : 'divide'} the first part by ${k} too: ${p1} ${op} ${k} = ${p2}. Answer: ${ans}`;
      const add = missSecond ? q1 + (p2 - p1) : p1 + (q2 - q1);
      const distractors = [
        add > 0 ? { text: String(add), code: 'RATIO-ADDITIVE', why: `It looks like you ${missSecond ? (p2 > p1 ? 'added' : 'took away') : (q2 > q1 ? 'added' : 'took away')} ${Math.abs(missSecond ? p2 - p1 : q2 - q1)}, as for the other part. For equivalent ratios, MULTIPLY or DIVIDE both parts by the same number.` } : null,
        { text: String(k), code: 'RATIO-FACTOR-ONLY', why: `${k} is the number you ${op === 'x' ? 'multiply' : 'divide'} by. Now use it on the other part.` },
        { text: String(missSecond ? q1 * p2 : p1 * q2), code: 'FR-EQUIV-CROSS', why: `It looks like you multiplied ${missSecond ? `${q1} by ${p2}` : `${p1} by ${q2}`}. Find what ${missSecond ? p1 : q1} was ${op === 'x' ? 'multiplied' : 'divided'} by, and do the same to the other part.` },
      ];
      try {
        if (d === 2 && rng.chance(0.4)) {
          const t = typedMisconceptions(String(ans), distractors.filter(Boolean), { code: 'UNCLASSIFIED', why: 'Multiply or divide both parts of the ratio by the same number.' });
          return { type: 'numeric', prompt, answer: numericAnswer(ans, [String(ans)]), solution, ...t };
        }
        const near = (i) => { const v = ans + (i % 2 ? Math.ceil(i / 2) : -i / 2); return v > 0 && !inPrompt(prompt, v) ? nearMiss(String(v), `Check: ${op === 'x' ? 'multiply' : 'divide'} BOTH parts by ${k}.`) : null; };
        return { type: 'mcq', prompt, ...choices(rng, String(ans), distractors, near), solution };
      } catch { /* draw again */ }
    }
  },
};

// ---------------------------------------------------------------- g04 sharing in a ratio

const share = {
  id: 'm11.share-ratio', topicId: T, subtopicId: 'm11-s3', skill: SKILL.share,
  title: 'Share an amount in a ratio (D2 three people; D3 given one share, find the total)',
  difficulties: [1, 2, 3],
  check: { min: 0, maxDp: 2 },
  make(rng, d) {
    for (;;) {
      const three = d === 2 && rng.chance(0.5);
      const parts = three ? [rng.int(1, 6), rng.int(1, 6), rng.int(1, 6)] : [rng.int(1, 9), rng.int(1, 9)];
      if (parts.reduce((a, b) => gcd(a, b)) !== 1 || new Set(parts).size < parts.length) continue;
      const sum = parts.reduce((a, b) => a + b, 0);
      const unit = rng.int(2, d === 1 ? 15 : 60);
      const total = unit * sum;
      if (total > (d === 1 ? 150 : 900)) continue;
      const ppl = rng.sample(PEOPLE, parts.length).map((p) => p.name);
      const money = rng.chance(0.6);
      const show = (v) => (money ? rm(v) : `${fmtInt(v)} ${rng.__noun || 'sweets'}`);
      const who = rng.int(0, parts.length - 1);
      const ans = unit * parts[who];
      if (d === 3) {
        const known = (who + 1) % parts.length;
        const knownVal = unit * parts[known];
        const prompt = `${ppl[0]} and ${ppl[1]} share some money in the ratio ${R(...parts)}. ${ppl[known]} gets ${rm(knownVal)}. How much money is there altogether?`;
        const solution = `${ppl[known]}'s ${parts[known]} part${parts[known] > 1 ? 's are' : ' is'} ${rm(knownVal)}, so 1 part = ${rm(knownVal)} ÷ ${parts[known]} = ${rm(unit)}. Altogether there are ${parts.join(' + ')} = ${sum} parts: ${sum} x ${rm(unit)} = ${rm(total)}. Answer: ${rm(total)}`;
        const distractors = [
          { text: rm(knownVal * sum), code: 'RATIO-SHARE-AS-PART', why: `It looks like you multiplied ${rm(knownVal)} by ${sum}, as if ${rm(knownVal)} were one part. ${rm(knownVal)} is ${countOf(parts[known], 'part')}, so find ONE part first.` },
          { text: rm(unit * parts[who]), code: 'RATIO-GIVES-ONE-SHARE', why: `That is ${ppl[who]}'s share. The question asks for the total.` },
          { text: rm(unit), code: 'RATIO-ONE-PART-ONLY', why: `${rm(unit)} is the value of one part. Altogether there are ${sum} parts.` },
        ];
        const near = (i) => { const k = sum + (i % 2 ? Math.ceil(i / 2) : -i / 2); return k > 0 && !parts.includes(k) && !inPrompt(prompt, k * unit) ? nearMiss(rm(k * unit), `Find one part (${rm(knownVal)} ÷ ${parts[known]}), then multiply by the total number of parts, ${sum}.`) : null; };
        try { return { type: 'mcq', prompt, ...choices(rng, rm(total), distractors, near), solution, marks: 2 }; } catch { continue; }
      }
      const noun = rng.pick(['sweets', 'stickers', 'marbles', 'cards']);
      const showN = (v) => (money ? rm(v) : `${fmtInt(v)} ${noun}`);
      const what = money ? rm(total) : `${fmtInt(total)} ${noun}`;
      const prompt = `${ppl.slice(0, -1).join(', ')} and ${ppl[ppl.length - 1]} share ${what} in the ratio ${R(...parts)}. How ${money ? 'much' : 'many'} does ${ppl[who]} get?`;
      const solution = `Add the parts: ${parts.join(' + ')} = ${sum}. One part is ${fmtInt(total)} ÷ ${sum} = ${fmtInt(unit)}. ${ppl[who]} has ${parts[who]} part${parts[who] > 1 ? 's' : ''}: ${parts[who]} x ${fmtInt(unit)} = ${fmtInt(ans)}. Answer: ${showN(ans)}`;
      const byPeople = total / parts.length;
      const partAsWhole = !three ? (total * parts[who]) / parts[1 - who] : null;
      const distractors = [
        Number.isInteger(byPeople * (money ? 100 : 1)) ? { text: showN(byPeople), code: 'RATIO-SHARE-BY-PARTS-COUNT', why: `It looks like you shared equally between the ${parts.length} people. Share by the number of PARTS: ${parts.join(' + ')} = ${sum}.` } : null,
        parts[who] > 1 ? { text: showN(unit), code: 'RATIO-ONE-PART-ONLY', why: `${showN(unit)} is the value of one part. ${ppl[who]} has ${parts[who]} parts.` } : null,
        partAsWhole != null && Number.isInteger(partAsWhole * (money ? 100 : 1)) && partAsWhole < total ? { text: showN(partAsWhole), code: 'RATIO-PART-AS-WHOLE', why: `It looks like you found ${parts[who]}/${parts[1 - who]} of ${fmtInt(total)}. ${ppl[who]}'s share is ${parts[who]}/${sum} of the total, because there are ${sum} parts altogether.` } : null,
        { text: showN(total - ans), code: 'RATIO-GIVES-ONE-SHARE', why: `${showN(total - ans)} is what the ${three ? 'others get' : 'other person gets'}. The question asks about ${ppl[who]}.` },
        { text: showN(total), code: 'RATIO-WHOLE-AS-SHARE', why: `${showN(total)} is the whole amount. ${ppl[who]} gets only ${parts[who]} of the ${sum} equal parts.` },
      ];
      void show;
      try {
        if (d === 2 && !money && rng.chance(0.35)) {
          const t = typedMisconceptions(String(ans), distractors.filter(Boolean).map((x) => ({ ...x, text: x.text.replace(` ${noun}`, '') })), { code: 'UNCLASSIFIED', why: `Add the parts (${sum}), find one part, then multiply by ${ppl[who]}'s number of parts.` });
          return { type: 'numeric', prompt, answer: numericAnswer(ans, [String(ans), showN(ans)]), solution, ...t };
        }
        // near misses: a different number of parts (never someone's share, the whole or a number in the question)
        const shares = parts.map((x) => x * unit);
        const near = (i) => { const k = parts[who] + (i % 2 ? Math.ceil(i / 2) : -i / 2); const v = k * unit; return k > 0 && k < sum && !shares.includes(v) && !inPrompt(prompt, v) ? nearMiss(showN(v), `Find the value of one part (${fmtInt(total)} ÷ ${sum}), then multiply by ${ppl[who]}'s ${countOf(parts[who], 'part')}.`) : null; };
        return { type: 'mcq', prompt, ...choices(rng, showN(ans), distractors, near), solution, marks: three ? 2 : 1 };
      } catch { /* draw again */ }
    }
  },
};

// ---------------------------------------------------------------- g05 ratio problems using the difference (bar model)

const difference = {
  id: 'm11.ratio-difference', topicId: T, subtopicId: 'm11-s3', skill: SKILL.diff,
  title: 'One has more than the other: find a share or the total from the difference (with a bar model)',
  difficulties: [2, 3],
  check: { integer: true, min: 1 },
  make(rng, d) {
    for (;;) {
      // b - a is at least 2, so "used the difference as one part" never gives the right answer
      const a = rng.int(1, 7); const b = rng.int(a + 2, 9);
      if (gcd(a, b) !== 1) continue;
      const unit = rng.int(2, 15);
      const diff = (b - a) * unit;
      const [p, q] = names2(rng);
      const noun = rng.pick(['stamps', 'marbles', 'stickers', 'beads', 'cards']);
      const ask = d === 2 ? rng.pick(['small', 'big']) : 'total';
      const ans = ask === 'small' ? a * unit : ask === 'big' ? b * unit : (a + b) * unit;
      const prompt = `The ratio of ${p}'s ${noun} to ${q}'s ${noun} is ${R(a, b)}. ${q} has ${diff} more ${noun} than ${p}. How many ${noun} ${ask === 'total' ? 'do they have altogether' : `does ${ask === 'small' ? p : q} have`}?`;
      const diagram = { type: 'barModel', bars: [{ label: p, units: a }, { label: q, units: b }], braces: [{ bar: 1, from: a, to: b, label: String(diff), side: 'below' }] };
      if (ask === 'total') diagram.totalBrace = { label: '?' };
      else diagram.bars[ask === 'small' ? 0 : 1].right = '?';
      // the automatic description reads a brace below the bar as "over" it (CLO review): say what is drawn
      diagram.alt = `A bar model. ${p}'s bar has ${a} equal units and ${q}'s bar has ${b}. A brace under the last ${b - a} units of ${q}'s bar is labelled ${diff}. ${ask === 'total' ? 'A brace spanning both bars is labelled "?"' : `${ask === 'small' ? p : q}'s bar is marked "?"`}.`;
      const solution = `${q} has ${b - a} more parts than ${p} (${b} - ${a}). ${b - a} parts = ${diff}, so 1 part = ${diff} ÷ ${b - a} = ${unit}. ${ask === 'small' ? `${p} has ${a} x ${unit} = ${ans}` : ask === 'big' ? `${q} has ${b} x ${unit} = ${ans}` : `Altogether: ${a + b} parts x ${unit} = ${ans}`}. Answer: ${ans}`;
      const distractors = [
        { text: String(unit), code: 'RATIO-ONE-PART-ONLY', why: `${unit} is the value of one part. Now multiply by the number of parts ${ask === 'total' ? `altogether (${a + b})` : `${ask === 'small' ? p : q} has`}.` },
        { text: String(diff * (ask === 'small' ? a : ask === 'big' ? b : a + b)), code: 'RATIO-DIFF-AS-PART', why: `It looks like you used ${diff} as one part. ${diff} is the difference: it is ${b - a} parts.` },
        ask !== 'total' ? { text: String(ask === 'small' ? b * unit : a * unit), code: 'RATIO-GIVES-ONE-SHARE', why: `That is how many ${ask === 'small' ? q : p} has. Read the question again.` } : { text: String(b * unit), code: 'RATIO-GIVES-ONE-SHARE', why: `That is how many ${q} has. The question asks for both together.` },
      ];
      const askedParts = ask === 'small' ? a : ask === 'big' ? b : a + b;
      const near = (i) => { const k = askedParts + (i % 2 ? Math.ceil(i / 2) : -i / 2); const v = k * unit; return k > 0 && k !== a && k !== b && !inPrompt(prompt, v) ? nearMiss(String(v), `Find one part first: ${b - a} parts = ${diff}. Then count the parts asked for.`) : null; };
      try { return { type: 'mcq', prompt, ...choices(rng, String(ans), distractors, near), solution, diagram, marks: d === 3 ? 3 : 2 }; } catch { /* draw again */ }
    }
  },
};

// ---------------------------------------------------------------- g06 ratio and fractions

const asFraction = {
  id: 'm11.ratio-fraction', topicId: T, subtopicId: 'm11-s3', skill: SKILL.fraction,
  title: 'From a ratio to a fraction of the whole',
  difficulties: [1, 2],
  check: { min: 0 },
  make(rng, d) {
    for (;;) {
      const [A, B, whole0] = rng.pick(THINGS);
      const a = rng.int(1, d === 1 ? 7 : 12); const b = rng.int(1, d === 1 ? 7 : 12);
      if (a === b || gcd(a, b) !== 1) continue;
      const askA = rng.chance(0.5);
      const f = F(askA ? a : b, a + b);
      const prompt = `In a group of ${whole0}, the ratio of ${A} to ${B} is ${R(a, b)}. What fraction of the ${whole0} are ${askA ? A : B}?`;
      const solution = `The ratio ${R(a, b)} means ${a} + ${b} = ${a + b} parts altogether. ${capFirst(askA ? A : B)} are ${askA ? a : b} of those parts: ${f}. Answer: ${f}`;
      const distractors = [
        { text: F(askA ? a : b, askA ? b : a).toString(), code: 'RATIO-PART-AS-WHOLE', why: `It looks like you wrote ${askA ? a : b}/${askA ? b : a}. The whole is ALL the parts: ${a} + ${b} = ${a + b}.` },
        { text: F(askA ? b : a, a + b).toString(), code: 'RATIO-GIVES-ONE-SHARE', why: `${F(askA ? b : a, a + b)} is the fraction that are ${askA ? B : A}.` },
        { text: F(1, a + b).toString(), code: 'RATIO-ONE-PART-ONLY', why: `1/${a + b} is one part. The ${askA ? A : B} have ${countOf(askA ? a : b, 'part')}.` },
      ];
      try { return { type: 'mcq', prompt, ...choices(rng, f.toString(), distractors, null), solution }; } catch { /* draw again */ }
    }
  },
};

// ---------------------------------------------------------------- g07 direct proportion, unitary method, recipes

// item, plural, price range for one item in sen
const ITEMS = [['pens', 'pen', 80, 300], ['exercise books', 'exercise book', 100, 400], ['bottles of water', 'bottle of water', 100, 250], ['curry puffs', 'curry puff', 80, 200], ['bus tickets', 'bus ticket', 100, 500], ['packets of kuih', 'packet of kuih', 150, 500]];
// ingredient, unit, amount per person (step, lowest, highest)
const RECIPES = [['flour', 'g', 25, 50, 150], ['sugar', 'g', 10, 20, 60], ['milk', 'ml', 25, 50, 250], ['rice', 'g', 25, 50, 125], ['coconut milk', 'ml', 25, 25, 100]];
const proportion = {
  id: 'm11.direct-proportion', topicId: T, subtopicId: 'm11-s4', skill: SKILL.unitary,
  title: 'Direct proportion with the unitary method: prices and recipes (D3 two steps)',
  difficulties: [1, 2, 3],
  check: { min: 0, maxDp: 2 },
  make(rng, d) {
    for (;;) {
      if (rng.chance(0.45)) {
        const [ing, unit, step, lo, hi] = rng.pick(RECIPES);
        const people = rng.pick([2, 3, 4, 5, 6, 8]);
        const per = step * rng.int(Math.ceil(lo / step), Math.floor(hi / step));
        const amount = per * people;
        const want = rng.intNot(2, 12, [people]);
        if (d === 1 && want % people !== 0 && people % want !== 0) continue;
        const need = per * want;
        if (d === 3) {
          // scale the recipe, then find what is left in a bag or carton
          const bag = unit === 'g' ? rng.pick([1000, 2000]) : rng.pick([1000, 2000]);
          if (need >= bag) continue;
          const left = bag - need;
          const pr = person(rng);
          const prompt = `A recipe for ${people} people uses ${fmtInt(amount)} ${unit} of ${ing}. ${pr.name} makes it for ${want} people from a ${unit === 'g' ? `${bag / 1000} kg bag` : `${bag / 1000} L carton`} of ${ing}. How much ${ing} is left?`;
          const solution = `For 1 person: ${fmtInt(amount)} ÷ ${people} = ${fmtInt(per)} ${unit}. For ${want} people: ${fmtInt(per)} x ${want} = ${fmtInt(need)} ${unit}. The ${unit === 'g' ? 'bag' : 'carton'} holds ${bag / 1000} ${unit === 'g' ? 'kg' : 'L'} = ${fmtInt(bag)} ${unit}, so ${fmtInt(bag)} - ${fmtInt(need)} = ${fmtInt(left)} ${unit} is left. Answer: ${fmtInt(left)} ${unit}`;
          const distractors = [
            { text: `${fmtInt(need)} ${unit}`, code: 'ONE-STEP-ONLY', why: `${fmtInt(need)} ${unit} is how much ${ing} ${pr.he} uses. The question asks how much is left, so take it away from ${fmtInt(bag)} ${unit}.` },
            bag - amount > 0 ? { text: `${fmtInt(bag - amount)} ${unit}`, code: 'PROP-UNIT-ONLY', why: `It looks like you took away the amount for ${people} people. ${pr.He} cooks for ${want} people.` } : null,
            { text: `${fmtInt(bag + need)} ${unit}`, code: 'OP-SWAP', why: `It looks like you added the ${ing} used to the ${unit === 'g' ? 'bag' : 'carton'}. What is used is taken away.` },
            bag - amount * want > 0 ? { text: `${fmtInt(bag - amount * want)} ${unit}`, code: 'PROP-TIMES-WHOLE', why: `It looks like you multiplied the amount for ${people} people by ${want}. Find the amount for 1 person first.` } : null,
          ];
          try { return { type: 'mcq', prompt, ...choices(rng, `${fmtInt(left)} ${unit}`, distractors, null), solution, skill: SKILL.recipe, marks: 3 }; } catch { continue; }
        }
        const prompt = `A recipe for ${people} people uses ${fmtInt(amount)} ${unit} of ${ing}. How much ${ing} is needed for ${want} people?`;
        const solution = `For 1 person: ${fmtInt(amount)} ÷ ${people} = ${fmtInt(per)} ${unit}. For ${want} people: ${fmtInt(per)} x ${want} = ${fmtInt(need)} ${unit}. Answer: ${fmtInt(need)} ${unit}`;
        const distractors = [
          (amount * people) % want === 0 ? { text: `${fmtInt((amount * people) / want)} ${unit}`, code: 'PROP-INVERSE-SCALE', why: `It looks like you scaled the wrong way (x ${people} ÷ ${want}). ${want > people ? 'More' : 'Fewer'} people need ${want > people ? 'more' : 'less'} ${ing}: find the amount for 1 person, then multiply by ${want}.` } : null,
          { text: `${fmtInt(per)} ${unit}`, code: 'PROP-UNIT-ONLY', why: `${fmtInt(per)} ${unit} is the amount for 1 person. Now multiply by ${want}.` },
          { text: `${fmtInt(amount * want)} ${unit}`, code: 'PROP-TIMES-WHOLE', why: `It looks like you multiplied the amount for ${people} people by ${want}. Find the amount for 1 person first.` },
        ];
        try { return { type: 'mcq', prompt, ...choices(rng, `${fmtInt(need)} ${unit}`, distractors, null), solution, skill: SKILL.recipe }; } catch { continue; }
      }
      const [items, item, lo, hi] = rng.pick(ITEMS);
      const n = rng.int(2, d === 1 ? 6 : 12);
      const unitC = 10 * rng.int(Math.ceil(lo / 10), Math.floor(hi / 10)) * (d === 1 ? 1 : 1);
      if (d === 1 && unitC % 50 !== 0) continue;
      const cost = n * unitC;
      const m = rng.intNot(2, d === 1 ? 10 : 20, [n]);
      const ans = m * unitC;
      const p = person(rng);
      if (d === 3) {
        const pay = Math.ceil((ans + 1) / 1000) * 1000;
        const change = pay - ans;
        // the "add the difference" slip must not land on the price of one item (or another amount
        // in the question), or the diagnosis is ambiguous (CLO review, m11 SHOULD 5)
        const addVal = pay - (cost + (m - n) * 100);
        if ([unitC, cost, pay, ans].includes(addVal)) continue;
        const moreFewer = `there ${Math.abs(m - n) === 1 ? 'is' : 'are'} ${Math.abs(m - n)} ${m > n ? 'more' : 'fewer'} ${Math.abs(m - n) === 1 ? item : items}`;
        const prompt = `${n} ${items} cost ${rm(cost / 100)}. ${p.name} buys ${m} ${items} and pays with ${rm(pay / 100)}. How much change does ${p.he} get?`;
        const solution = `1 ${item} costs ${rm(cost / 100)} ÷ ${n} = ${rm(unitC / 100)}. ${m} cost ${m} x ${rm(unitC / 100)} = ${rm(ans / 100)}. Change: ${rm(pay / 100)} - ${rm(ans / 100)} = ${rm(change / 100)}. Answer: ${rm(change / 100)}`;
        const distractors = [
          { text: rm(ans / 100), code: 'ONE-STEP-ONLY', why: `${rm(ans / 100)} is what the ${items} cost. The question asks for the change, so take it away from ${rm(pay / 100)}.` },
          addVal > 0 ? { text: rm(addVal / 100), code: 'PROP-ADDITIVE', why: `It looks like you ${m > n ? 'added' : 'took away'} RM ${Math.abs(m - n)} to the cost because ${moreFewer}. Find the price of 1 first, then multiply.` } : null,
          pay - unitC > 0 ? { text: rm((pay - unitC) / 100), code: 'PROP-UNIT-ONLY', why: `It looks like you took away the price of just 1 ${item}. ${p.He} buys ${m}.` } : null,
        ];
        try { return { type: 'mcq', prompt, ...choices(rng, rm(change / 100), distractors, null), solution, marks: 3, skill: SKILL.unitary }; } catch { continue; }
      }
      const prompt = `${n} ${items} cost ${rm(cost / 100)}. How much do ${m} ${items} cost?`;
      const solution = `Find the cost of 1 ${item}: ${rm(cost / 100)} ÷ ${n} = ${rm(unitC / 100)}. Then ${m} x ${rm(unitC / 100)} = ${rm(ans / 100)}. Answer: ${rm(ans / 100)}`;
      const distractors = [
        cost + (m - n) * 100 > 0 ? { text: rm((cost + (m - n) * 100) / 100), code: 'PROP-ADDITIVE', why: `It looks like you ${m > n ? 'added' : 'took away'} RM ${Math.abs(m - n)} because there ${Math.abs(m - n) === 1 ? 'is' : 'are'} ${Math.abs(m - n)} ${m > n ? 'more' : 'fewer'} ${Math.abs(m - n) === 1 ? item : items}. Find the cost of 1 first, then multiply.` } : null,
        { text: rm(unitC / 100), code: 'PROP-UNIT-ONLY', why: `${rm(unitC / 100)} is the cost of 1 ${item}. Now multiply by ${m}.` },
        { text: rm((cost * m) / 100), code: 'PROP-TIMES-WHOLE', why: `It looks like you multiplied the cost of ${n} ${items} by ${m}. Find the cost of 1 first.` },
      ];
      try {
        if (d === 2 && rng.chance(0.4)) {
          const t = typedMisconceptions(dec(ans / 100), distractors.filter(Boolean).map((x) => ({ ...x, text: x.text.replace('RM ', '') })), { code: 'UNCLASSIFIED', why: 'Find the cost of one, then multiply by the number you need.' });
          return { type: 'numeric', prompt, answer: numericAnswer(ans / 100, [rm(ans / 100), dec(ans / 100), money2(ans)]), solution, ...t, skill: SKILL.direct };
        }
        return { type: 'mcq', prompt, ...choices(rng, rm(ans / 100), distractors, null), solution, skill: d === 1 ? SKILL.unitary : SKILL.direct };
      } catch { /* draw again */ }
    }
  },
};

// ---------------------------------------------------------------- g08 best buy

// name, unit, compare per `per` units, pack sizes (whole numbers of `per`), price range per `per` units in sen
const PRODUCTS = [['rice', 'kg', 1, [1, 2, 5, 10], [280, 600]], ['cooking oil', 'L', 1, [1, 2, 3, 5], [500, 1000]], ['washing powder', 'g', 100, [500, 1000, 1500, 2000], [70, 180]], ['orange juice', 'ml', 100, [500, 1000, 1500, 2000], [30, 80]]];
const bestBuy = {
  id: 'm11.best-buy', topicId: T, subtopicId: 'm11-s4', skill: SKILL.best,
  title: 'Which pack is the best buy? (compare the price per unit)',
  difficulties: [2, 3],
  check: {},
  make(rng, d) {
    for (;;) {
      const [name, unit, per, sizes, [lo, hi]] = rng.pick(PRODUCTS);
      const count = d === 3 && rng.chance(0.5) ? 4 : 3;
      const packs = rng.sample(sizes, count).sort((x, y) => x - y);
      // Prices per unit mostly fall as the packs get bigger (as in real shops). The best buy is never
      // the smallest pack, so choosing the lowest price never earns the mark (CLO review, m11 MUST 2);
      // it is the biggest pack only about a third of the time, so "biggest is best" does not either.
      const best = rng.chance(0.35) ? count - 1 : rng.int(1, count - 2);
      const mid = rng.int(lo, hi);
      const stepPct = d === 2 ? [6, 15] : [3, 7]; // gap between neighbouring prices per unit, in %
      const rates = new Array(count);
      rates[best] = 5 * Math.round(mid / 5);
      for (let i = best - 1; i >= 0; i--) rates[i] = 5 * Math.round((rates[i + 1] * (1 + rng.int(...stepPct) / 100)) / 5);
      // a bigger pack after the best one costs a little more per unit than the best (a "bulk" trap)
      for (let i = best + 1; i < count; i++) rates[i] = 5 * Math.round((rates[best] * (1 + rng.int(...stepPct) / 100)) / 5);
      const prices = packs.map((sz, i) => (sz / per) * rates[i]);
      const sorted = [...rates].sort((x, y) => x - y);
      if (sorted[1] / sorted[0] < 1.02 || new Set(rates).size < count) continue;
      const cheapest = prices.indexOf(Math.min(...prices));
      if (cheapest === best || new Set(prices).size < count) continue;
      const biggest = count - 1;
      const letter = (i) => String.fromCharCode(65 + i);
      const label = (i) => `Pack ${letter(i)}: ${fmtInt(packs[i])} ${unit} for ${rm(prices[i] / 100)}`;
      const unitWord = per === 1 ? `1 ${unit}` : `100 ${unit}`;
      const prompt = `A shop sells ${name} in ${count} packs. Which pack is the best buy?`;
      const solution = `Find the price of ${unitWord} in each pack: ${packs.map((sz, i) => `Pack ${letter(i)}: ${rm(prices[i] / 100)} ÷ ${sz / per} = ${rm(rates[i] / 100)}`).join('; ')}. The lowest price for ${unitWord} is the best buy. Answer: ${label(best)}`;
      const distractors = packs.map((_, i) => i).filter((i) => i !== best).map((i) => (i === cheapest
        ? { text: label(i), code: 'BUY-CHEAPEST-PRICE', why: `Pack ${letter(i)} has the lowest price, but it also has the least ${name}. Compare the price of ${unitWord}: here it is ${rm(rates[i] / 100)}, more than ${rm(rates[best] / 100)}.` }
        : i === biggest
          ? { text: label(i), code: 'BUY-BIGGEST-PACK', why: `The biggest pack is not always the best value. Its price for ${unitWord} is ${rm(rates[i] / 100)}, more than ${rm(rates[best] / 100)}.` }
          : { text: label(i), code: 'NEAR-MISS', why: `Not quite: Pack ${letter(i)} is not the best buy. Its price for ${unitWord} is ${rm(rates[i] / 100)}, more than ${rm(rates[best] / 100)} for Pack ${letter(best)}.` }));
      try {
        const c = choices(rng, label(best), distractors, null, count);
        return { type: 'mcq', prompt, ...c, solution, marks: 2, diagram: { type: 'table', columns: ['Pack', 'Size', 'Price'], rows: packs.map((sz, i) => [letter(i), `${fmtInt(sz)} ${unit}`, rm(prices[i] / 100)]) } };
      } catch { /* draw again */ }
    }
  },
};

// ---------------------------------------------------------------- g09 before-and-after ratio problems

const BA_CONTEXTS = [
  ['boys', 'girls', 'in a group', 'join the group', 'leave the group'],
  ['red beads', 'blue beads', 'in a box', 'are put into the box', 'are taken out of the box'],
  ['adults', 'children', 'at a party', 'arrive', 'go home'],
  ['ducks', 'chickens', 'on a farm', 'are added to the farm', 'are sold'],
];
const beforeAfter = {
  id: 'm11.before-after', topicId: T, subtopicId: 'm11-s5', skill: SKILL.beforeAfter,
  title: 'Before and after: one quantity changes, the other stays the same (sometimes the ratios must be rescaled first, as in 3 : 4 becomes 1 : 1)',
  difficulties: [3],
  check: { integer: true, min: 1 },
  make(rng) {
    for (;;) {
      // A stays the same. Before A : B = p1 : q1, after p2 : q2 (both in simplest form).
      // Simple form: p1 = p2. Harder form (the bank's P6 type): p1 differs from p2, so both ratios
      // are first rescaled to give A the same number of parts, L = lcm(p1, p2).
      const rescale = rng.chance(0.5);
      let p1; let q1; let p2; let q2;
      if (rescale) {
        p1 = rng.int(1, 6); q1 = rng.int(1, 8); p2 = rng.int(1, 6); q2 = rng.int(1, 8);
        if (p1 === p2 || gcd(p1, q1) !== 1 || gcd(p2, q2) !== 1 || (p1 === q1 && p2 === q2)) continue;
      } else {
        p1 = rng.int(1, 6); p2 = p1; q1 = rng.int(1, 8); q2 = rng.int(1, 10);
        if (gcd(p1, q1) !== 1 || gcd(p2, q2) !== 1 || q1 === q2) continue;
      }
      const L = lcm(p1, p2);
      if (L > 12) continue;
      const qb = (q1 * L) / p1; const qa = (q2 * L) / p2; // parts of B before and after, when A is L parts
      const dp = qa - qb;
      // at least 2 parts of change, so "used the change as one part" never earns the mark
      if (Math.abs(dp) < 2 || qb > 16 || qa > 16) continue;
      const k = rng.int(2, rescale ? 6 : 9);
      const change = Math.abs(dp) * k;
      const [A, B, place, joinWord, leaveWord] = rng.pick(BA_CONTEXTS);
      const ask = rng.pick(['fixed', 'before', 'after']);
      const askedParts = ask === 'fixed' ? L : ask === 'before' ? qb : qa;
      const ans = askedParts * k;
      if (ans > 150) continue;
      const moveText = dp > 0 ? `${change} more ${B} ${joinWord}` : `${change} ${B} ${leaveWord}`;
      const prompt = `The ratio of ${A} to ${B} ${place} is ${R(p1, q1)}. Then ${moveText}, and the ratio becomes ${R(p2, q2)}. How many ${ask === 'fixed' ? A : B} are there${ask === 'before' ? ' at first' : ask === 'after' ? ' now' : ''}?`;
      const same = rescale
        ? `The number of ${A} does not change, so give it the same number of parts (${L}) in both ratios: ${[[p1, q1, qb], [p2, q2, qa]].filter(([x]) => x !== L).map(([x, y, z]) => `${R(x, y)} = ${R(L, z)}`).join(' and ')}.`
        : `The number of ${A} does not change, and it is ${countOf(p1, 'part')} in both ratios.`;
      const step = `So the ${B} go from ${countOf(qb, 'part')} to ${countOf(qa, 'part')}: ${Math.abs(dp)} parts = ${change}, so 1 part = ${change} ÷ ${Math.abs(dp)} = ${k}.`;
      const last = ask === 'fixed' ? `${capFirst(A)}: ${L} x ${k} = ${ans}` : ask === 'before' ? `${capFirst(B)} at first: ${qb} x ${k} = ${ans}` : `${capFirst(B)} now: ${qa} x ${k} = ${ans}`;
      const solution = `${same} ${step} ${last}. Answer: ${ans}`;
      const others = [L * k, qb * k, qa * k].filter((v) => v !== ans);
      const confuse = ask === 'before' ? qa * k : qb * k; // the other count of the quantity that changes
      const distractors = [
        { text: String(k), code: 'RATIO-ONE-PART-ONLY', why: `${k} is the value of one part. Multiply by the number of parts asked for (${askedParts}).` },
        { text: String(change * askedParts), code: 'RATIO-CHANGE-AS-PART', why: `It looks like you used ${change} as one part. The ${change} ${B} are ${Math.abs(dp)} parts (${Math.max(qa, qb)} - ${Math.min(qa, qb)}).` },
        { text: String(confuse), code: 'RATIO-GIVES-ONE-SHARE', why: `That is the number of ${confuse === qa * k ? `${B} now` : `${B} at first`}. Read the question again: it asks for the ${ask === 'fixed' ? A : ask === 'before' ? `${B} at first` : `${B} now`}.` },
      ];
      const near = (i) => { const m = askedParts + (i % 2 ? Math.ceil(i / 2) : -i / 2); const v = m * k; return m > 0 && !others.includes(v) && !inPrompt(prompt, v) ? nearMiss(String(v), `Find the value of one part from the change (${change} ${B} is ${Math.abs(dp)} parts), then multiply by ${askedParts}.`) : null; };
      try { return { type: 'mcq', prompt, ...choices(rng, String(ans), distractors, near), solution, marks: 3 }; } catch { /* draw again */ }
    }
  },
};

export default [writeRatio, simplify, equivalent, share, difference, asFraction, proportion, bestBuy, beforeAfter];
