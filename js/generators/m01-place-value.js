// m01 Place value: the value of a digit, reading and writing large numbers, x and ÷ by 10, 100
// and 1000, composing / decomposing / regrouping decimals, rounding, comparing and ordering
// decimals, reading a number line. Patterns and ranges follow the CLO's generator guide (m01).
// Every wrong option is built by one named misconception and carries its code. Decimals are held
// as whole numbers of thousandths (or hundredths) and only turned into text at the end.

import { choices, typedMisconceptions, nearMiss, numericAnswer, fmtInt, countOf, ordinal, capFirst, valueOf } from './core.js';

const T = 'm01-place-value';
const SKILL = {
  digitDec: 'value of a digit in a decimal', digitWhole: 'value of a digit in a whole number', words: 'reading and writing large numbers',
  composePV: 'composing a decimal from place values', times: 'multiplying by 10, 100 and 1000', divide: 'dividing by 10, 100 and 1000',
  both: 'multiplying and dividing by 10, 100 and 1000', compose: 'composing decimals', decompose: 'decomposing decimals', regroup: 'regrouping decimals',
  tenth: 'rounding to the nearest tenth', whole: 'rounding to the nearest whole number', roundWhole: 'rounding whole numbers',
  compare: 'comparing decimals', order: 'ordering decimals',
};

// Misconception codes: all declared once in misconceptions.js (the CLO's catalogue).

/** The numbers written in a prompt ("48 650" read as one number). */
const promptNumbers = (t) => (String(t).replace(/(\d) (\d{3})/g, '$1$2').match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
/** A near miss for this prompt, or null when its value already appears in the question (CLO review X3). */
const nearFor = (prompt) => (text, hint) => {
  const v = valueOf(text);
  if (v == null || promptNumbers(prompt).some((x) => Math.abs(x - v) < 1e-9)) return null;
  return nearMiss(text, hint);
};

// ---------------------------------------------------------------- exact decimals

/** u / 10^p as text: trailing zeros dropped, thousands spaced as in the bank. */
function fx(u, p = 0) {
  const neg = u < 0; const a = Math.abs(u); const s = 10 ** p;
  const ip = Math.floor(a / s);
  const fp = p ? String(a % s).padStart(p, '0').replace(/0+$/, '') : '';
  return `${neg ? '-' : ''}${fmtInt(ip)}${fp ? `.${fp}` : ''}`;
}
/** u / 10^p with exactly k decimal places (u must be a whole number of 10^-k). */
function fxk(u, p, k) {
  const v = u / 10 ** (p - k);
  if (!Number.isInteger(v)) throw new Error(`fxk ${u} ${p} ${k}`);
  const neg = v < 0; const a = Math.abs(v);
  const ip = Math.floor(a / 10 ** k); const fp = String(a % 10 ** k).padStart(k, '0');
  return `${neg ? '-' : ''}${fmtInt(ip)}${k ? `.${fp}` : ''}`;
}
/** Decimal places of u / 10^p (0 to p). */
function dpsOf(u, p) { let k = p; while (k > 0 && u % 10 === 0) { u /= 10; k--; } return k; }

const NAMES = { 7: 'ten millions', 6: 'millions', 5: 'hundred thousands', 4: 'ten thousands', 3: 'thousands', 2: 'hundreds', 1: 'tens', 0: 'ones', '-1': 'tenths', '-2': 'hundredths', '-3': 'thousandths' };
const ONE_NAME = { 7: 'ten million', 6: 'million', 5: 'hundred thousand', 4: 'ten thousand', 3: 'thousand', 2: 'hundred', 1: 'ten', 0: 'one', '-1': 'tenth', '-2': 'hundredth', '-3': 'thousandth' };
/** "1 tenth", "3 tenths" (CLO review X4). */
const nOf = (n, e) => `${n} ${n === 1 ? ONE_NAME[e] : NAMES[e]}`;
/** The value of digit d in place e (10^e) as text. */
const dv = (d, e) => (e >= 0 ? fmtInt(d * 10 ** e) : fx(d, -e));
/** Digit of the number held as thousandths (u) in place e. */
const digitAt = (u, e) => Math.floor(u / 10 ** (e + 3)) % 10;

/** A number (as thousandths) with digit `d` only at the places in `at`, whole part of `wd` digits and `dp` decimals. */
function numberWith(rng, d, at, wd, dp) {
  for (;;) {
    let u = 0;
    for (let e = wd - 1; e >= -dp; e--) {
      let x;
      if (at.includes(e)) x = d;
      else if (e === wd - 1) x = rng.intNot(1, 9, [d]);
      else if (e === -dp) x = rng.intNot(1, 9, [d]);
      else x = rng.intNot(0, 9, [d]);
      u += x * 10 ** (e + 3);
    }
    return u;
  }
}

// ---------------------------------------------------------------- g01 value of a digit (D3: how many times greater; composing)

const digitValue = {
  id: 'm01.digit-value', topicId: T, subtopicId: 'm01-s1', skill: SKILL.digitDec,
  title: 'The value of a digit (D1 decimals, D2 whole numbers to millions; D3 how many times greater, or build a number with a zero place holder)',
  difficulties: [1, 2, 3],
  check: { min: 0 },
  make(rng, d) {
    if (d === 3) return rng.chance(0.5) ? timesGreater(rng) : composeFromPlaces(rng);
    for (;;) {
      if (d === 2 && rng.chance(0.35)) {
        const r = whichNumber(rng);
        if (r) return r;
        continue;
      }
      if (d === 1 && rng.chance(0.3)) {
        const r = whichPlace(rng);
        if (r) return r;
        continue;
      }
      let u; let e; let dig; let shown; let whole;
      if (d === 1) {
        const wd = rng.int(1, 2); const dp = rng.int(2, 3);
        e = -rng.int(1, dp); dig = rng.int(1, 9);
        u = numberWith(rng, dig, [e], wd, dp);
        shown = fx(u, 3); whole = false;
      } else {
        const len = rng.int(5, 7);
        e = rng.int(1, len - 1); dig = rng.int(1, 9);
        u = numberWith(rng, dig, [e], len, 0);
        shown = fx(u, 3); whole = true;
      }
      const value = dv(dig, e);
      const prompt = rng.chance(0.5) ? `What is the value of the digit ${dig} in ${shown}?` : `In the number ${shown}, what is the digit ${dig} worth?`;
      const solution = whole
        ? `Count the places from the right: ones, tens, hundreds, thousands, ten thousands, hundred thousands, millions. The ${dig} is in the ${NAMES[e]} place, so it is worth ${dig} x ${fmtInt(10 ** e)} = ${value}. Answer: ${value}`
        : `After the decimal point the places are tenths, hundredths, thousandths. The ${dig} is in the ${NAMES[e]} place, so it is worth ${nOf(dig, e)} = ${value}. Answer: ${value}`;
      const distractors = rng.shuffle([
        { text: dv(dig, e + 1), code: 'PV-WRONG-PLACE', why: `It looks like you read the ${dig} as being in the ${NAMES[e + 1]} place. Count the places again: the ${dig} is in the ${NAMES[e]} place.` },
        (whole ? e - 1 >= 0 : e - 1 >= -3) ? { text: dv(dig, e - 1), code: 'PV-WRONG-PLACE', why: `It looks like you read the ${dig} as being in the ${NAMES[e - 1]} place. It is one place further ${whole ? 'left' : 'left'}: the ${NAMES[e]} place.` } : null,
        { text: String(dig), code: 'PV-DIGIT-ONLY', why: `${dig} is the digit, not its value. It is in the ${NAMES[e]} place, so it is worth ${value}.` },
        !whole ? { text: dv(dig, -e), code: 'PV-TH-NAMES', why: `${dv(dig, -e)} would be ${nOf(dig, -e)}. The ${dig} is after the decimal point, so it is ${nOf(dig, e)}: ${value}.` } : null,
      ]);
      try {
        const c = choices(rng, value, distractors, (i) => nearFor(prompt)(dv(dig, e + 1 + i), `Name the place of the ${dig} first, then write its value.`));
        return { type: 'mcq', prompt, ...c, solution, skill: whole ? SKILL.digitWhole : SKILL.digitDec };
      } catch { /* draw again */ }
    }
  },
};

/** D1 short answer: which place is the digit in? */
function whichPlace(rng) {
  const wd = rng.int(1, 2); const dp = 3;
  const e = -rng.int(1, 3); const dig = rng.int(1, 9);
  const u = numberWith(rng, dig, [e], wd, dp);
  const name = NAMES[e];
  const prompt = `In the number ${fx(u, 3)}, which place is the digit ${dig} in? (For example: ones, tenths, hundredths or thousandths)`;
  const solution = `After the decimal point the places are tenths, hundredths, thousandths. The ${dig} is ${ordinal(-e)} after the point, so it is in the ${name} place. Answer: ${name}`;
  const items = [
    { text: NAMES[-e], code: 'PV-TH-NAMES', why: `The ${NAMES[-e]} place is in whole numbers, before the decimal point. After the point the names end in "ths": the ${dig} is in the ${name} place.` },
    { text: NAMES[e + 1], code: 'PV-WRONG-PLACE', why: `Count the places after the point again: tenths, hundredths, thousandths. The ${dig} is in the ${name} place.` },
    e - 1 >= -3 ? { text: NAMES[e - 1], code: 'PV-WRONG-PLACE', why: `The ${NAMES[e - 1]} place is one further to the right. The ${dig} is in the ${name} place.` } : null,
  ];
  const t = typedMisconceptions(name, items, { code: 'PV-WRONG-PLACE', why: 'After the decimal point the places are tenths, hundredths, thousandths, counting from the point.' });
  return { type: 'short', prompt, answer: { accept: [name, ONE_NAME[e], `${name} place`, `the ${name}`], keywords: [] }, solution, ...t, skill: SKILL.digitDec };
}

/** D2: in which number is the digit d worth d hundredths? */
function whichNumber(rng) {
  const dig = rng.int(1, 9);
  const e = -rng.int(1, 3);
  const places = [e, e + 1, e - 1 >= -3 ? e - 1 : null, -e].filter((x) => x != null);
  const opts = places.map((p) => {
    const wd = Math.max(p >= 0 ? p + 1 : 1, rng.int(1, 2));
    const dp = Math.max(p < 0 ? -p : 1, rng.int(1, 3));
    return { p, text: fx(numberWith(rng, dig, [p], wd, dp), 3) };
  });
  const correct = opts[0].text;
  if (new Set(opts.map((o) => o.text)).size !== opts.length) return null;
  const word = `${dig} ${dig === 1 ? ONE_NAME[e] : NAMES[e]}`;
  const prompt = `In which number is the digit ${dig} worth ${word} (${dv(dig, e)})?`;
  const solution = `Find the ${NAMES[e]} place in each number: it is the ${ordinal(-e)} digit after the decimal point. Only in ${correct} is the ${dig} in that place. Answer: ${correct}`;
  const distractors = opts.slice(1).map((o) => (o.p === -e
    ? { text: o.text, code: 'PV-TH-NAMES', why: `In ${o.text} the ${dig} is in the ${NAMES[o.p]} place, before the decimal point. ${NAMES[e]} come after the point.` }
    : { text: o.text, code: 'PV-WRONG-PLACE', why: `In ${o.text} the ${dig} is in the ${NAMES[o.p]} place, so it is worth ${dv(dig, o.p)}, not ${dv(dig, e)}.` }));
  try {
    const c = choices(rng, correct, distractors, null);
    return { type: 'mcq', prompt, ...c, solution, skill: SKILL.digitDec };
  } catch { return null; }
}

/** D3: how many times greater is one digit's value than the same digit's value in another place? */
function timesGreater(rng) {
  for (;;) {
    const e1 = rng.int(-2, 2); const gap = rng.pick([1, 2, 2, 3, 3]); const e2 = e1 - gap;
    if (e2 < -3) continue;
    const dig = rng.int(1, 9);
    const wd = Math.max(e1 + 1, rng.int(1, 3)); const dp = Math.max(-e2, rng.int(1, 3));
    const u = numberWith(rng, dig, [e1, e2], wd, dp);
    const ans = 10 ** gap;
    const prompt = `In the number ${fx(u, 3)}, how many times greater is the value of the ${dig} in the ${NAMES[e1]} place than the value of the ${dig} in the ${NAMES[e2]} place?`;
    const solution = `The first ${dig} is worth ${dv(dig, e1)} and the second is worth ${dv(dig, e2)}. Each place to the left is worth 10 times more, and the first ${dig} is ${gap} place${gap > 1 ? 's' : ''} to the left, so it is ${gap > 1 ? `${Array(gap).fill(10).join(' x ')} = ` : ''}${fmtInt(ans)} times greater. Answer: ${fmtInt(ans)}`;
    const items = [
      { text: String(gap), code: 'PV-PLACES-AS-TIMES', why: `${gap} is the number of places between the two digits. Each place is worth 10 times more, so ${gap} place${gap > 1 ? 's' : ''} means ${fmtInt(ans)} times.` },
      gap > 1 ? { text: fmtInt(ans / 10), code: 'PV-WRONG-PLACE', why: `That is one place too few. Count the places from the ${NAMES[e2]} to the ${NAMES[e1]}: there are ${gap} steps of x 10.` } : null,
      { text: fmtInt(ans * 10), code: 'PV-WRONG-PLACE', why: `That is one place too many. Count the steps from the ${NAMES[e2]} to the ${NAMES[e1]}: there ${gap > 1 ? `are ${gap} steps` : 'is 1 step'}, each x 10.` },
    ];
    const skill = e2 < 0 ? SKILL.digitDec : SKILL.digitWhole;
    try {
      if (rng.chance(0.5)) {
        const t = typedMisconceptions(fmtInt(ans), items, { code: 'PV-PLACES-AS-TIMES', why: 'Each place to the left is worth 10 times more. Count the places between the digits and multiply by 10 for each one.' });
        return { type: 'numeric', prompt, answer: numericAnswer(ans, [fmtInt(ans), String(ans)]), solution, ...t, marks: 2, skill };
      }
      const c = choices(rng, fmtInt(ans), items, (i) => nearFor(prompt)(fmtInt(ans * 10 ** (i + 1)), 'Each place to the left is worth 10 times more.'));
      return { type: 'mcq', prompt, ...c, solution, marks: 2, skill };
    } catch { /* draw again */ }
  }
}

const PLACE_WORD = { 1: 'tens', 0: 'ones', '-1': 'tenths', '-2': 'hundredths', '-3': 'thousandths' };
/** D3: build a number from its places, one of them zero ("no tenths"), listed in a mixed order. */
function composeFromPlaces(rng) {
  for (;;) {
    const places = [];
    if (rng.chance(0.35)) places.push(1);
    places.push(0, -1, -2, -3);
    const zero = rng.pick([-1, -2]);
    const digits = {};
    for (const p of places) digits[p] = p === zero ? 0 : rng.int(1, 9);
    let u = 0;
    for (const p of places) u += digits[p] * 10 ** (p + 3);
    const parts = rng.shuffle(places).map((p) => (p === zero ? `no ${PLACE_WORD[p]}` : `${digits[p]} ${digits[p] === 1 ? PLACE_WORD[p].replace(/s$/, '') : PLACE_WORD[p]}`));
    const listed = parts.slice(0, -1).join(', ') + ' and ' + parts[parts.length - 1];
    const ans = fx(u, 3);
    const prompt = `A number has ${listed}. What is the number?`;
    const solution = `Write each digit in its place: ${places.map((p) => `${digits[p]} in the ${NAMES[p]}`).join(', ')}. The ${NAMES[zero]} place is empty, so it needs a 0 as a place holder. Answer: ${ans}`;
    const whole = places.filter((p) => p >= 0).map((p) => digits[p]).join('');
    const dec = [-1, -2, -3].filter((p) => p !== zero).map((p) => digits[p]).join('');
    const listedDec = parts.filter((t) => /tenth|hundredth|thousandth/.test(t) && !/^no /.test(t)).map((t) => t.split(' ')[0]).join('');
    const swaps = [zero + 1, zero - 1].filter((p) => p <= -1 && p >= -3).map((p) => {
      const dd = { ...digits }; dd[zero] = digits[p]; dd[p] = 0;
      let v = 0; for (const q of places) v += dd[q] * 10 ** (q + 3);
      return { v, p };
    });
    const distractors = [
      { text: `${whole}.${dec}`, code: 'PV-PLACEHOLDER-DROPPED', why: `It looks like you left out the 0 for "no ${PLACE_WORD[zero]}". Without it, the other digits slide into the wrong places.` },
      listedDec !== dec ? { text: `${whole}.${listedDec}`, code: 'PV-ORDER-AS-GIVEN', why: 'It looks like you wrote the decimal digits in the order they are listed. Put each digit in its own place: tenths, then hundredths, then thousandths.' } : null,
      ...swaps.map((s) => ({ text: fx(s.v, 3), code: 'PV-WRONG-PLACE', why: `It looks like you put the ${digits[s.p]} in the ${NAMES[zero]} place. The ${digits[s.p]} belongs in the ${NAMES[s.p]} place, and the ${NAMES[zero]} place gets the 0.` })),
    ];
    try {
      const c = choices(rng, ans, distractors, null);
      return { type: 'mcq', prompt, ...c, solution, marks: 2, skill: SKILL.composePV };
    } catch { /* draw again */ }
  }
}

// ---------------------------------------------------------------- g02 numbers in words -> figures

const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
const w100 = (n) => (n < 20 ? ONES[n] : TENS[Math.floor(n / 10)] + (n % 10 ? `-${ONES[n % 10]}` : ''));
const w1000 = (n) => [Math.floor(n / 100) ? `${ONES[Math.floor(n / 100)]} hundred` : '', n % 100 ? w100(n % 100) : ''].filter(Boolean).join(' and ');
function inWords(n) {
  const g = [Math.floor(n / 1e6), Math.floor(n / 1000) % 1000, n % 1000];
  const names = [' million', ' thousand', ''];
  const parts = [];
  g.forEach((x, i) => { if (x) parts.push({ t: w1000(x) + names[i], last: i === 2 }); });
  let s = parts[0].t;
  for (let i = 1; i < parts.length; i++) s += (parts[i].last && g[2] < 100 ? ' and ' : ', ') + parts[i].t;
  return s;
}

const wordsToFigures = {
  id: 'm01.words-to-figures', topicId: T, subtopicId: 'm01-s1', skill: SKILL.words,
  title: 'Write a number given in words in figures (D1 up to 999 999, D2 millions), with zero place holders',
  difficulties: [1, 2],
  check: { min: 0, integer: true },
  make(rng, d) {
    for (;;) {
      const m = d === 2 ? rng.int(1, 9) : 0;
      let th; let un;
      if (d === 1) { th = rng.int(10, 999); un = rng.int(1, 99); } else {
        th = rng.chance(0.25) ? 0 : rng.chance(0.6) ? rng.int(1, 99) : rng.int(100, 999);
        un = rng.chance(0.15) ? 0 : rng.chance(0.6) ? rng.int(1, 99) : rng.int(100, 999);
        if (th >= 100 && un >= 100) continue;
        if (th === 0 && un === 0) continue;
      }
      const n = m * 1e6 + th * 1000 + un;
      const groups = d === 2 ? [m, th, un] : [th, un];
      const words = inWords(n);
      const ans = fmtInt(n);
      const pad = (x) => String(x).padStart(3, '0');
      // the misconceptions work on the groups of three digits
      const unpadOne = groups.map((x, i) => (i > 0 && x > 0 && x < 100 ? Number(groups.map((y, j) => (j === 0 ? String(y) : j === i ? String(y) : pad(y))).join('')) : null));
      const padRight = groups.map((x, i) => (i > 0 && x > 0 && x < 100 ? Number(groups.map((y, j) => (j === 0 ? String(y) : j === i ? String(y).padEnd(3, '0') : pad(y))).join('')) : null));
      const gName = (i) => (d === 2 ? ['millions', 'thousands', 'ones'] : ['thousands', 'ones'])[i];
      const items = [];
      groups.forEach((x, i) => {
        if (unpadOne[i] != null) items.push({ text: fmtInt(unpadOne[i]), code: 'PV-PLACEHOLDER-DROPPED', why: `It looks like you wrote the ${gName(i)} group as "${x}" instead of "${pad(x)}". Every group after the first needs three digits, so put in the zero place holders.` });
        if (padRight[i] != null) items.push({ text: fmtInt(padRight[i]), code: 'PV-PAD-WRONG-SIDE', why: `It looks like you wrote the ${gName(i)} group as "${String(x).padEnd(3, '0')}". ${capFirst(w100(x))} is ${x}, so its group is "${pad(x)}": the zeros go in front.` });
      });
      const solution = `Split the words at "million" and "thousand". ${groups.map((x, i) => `${gName(i)}: ${x} -> ${i === 0 ? x : pad(x)}`).join('; ')}. Every group after the first has three digits, so fill the gaps with zeros. Answer: ${ans}`;
      const prompt = `Write the number ${words} in figures.`;
      try {
        if (rng.chance(0.5)) {
          const t = typedMisconceptions(ans, items, { code: 'PV-PLACEHOLDER-DROPPED', why: 'Write each group of three digits in full, with zeros as place holders where a group has fewer than three digits.' });
          if (Object.keys(t.misconceptions).length < 2) continue;
          return { type: 'numeric', prompt, answer: numericAnswer(n, [ans, String(n)]), solution, ...t, marks: d };
        }
        const c = choices(rng, ans, items, (i) => nearFor(prompt)(fmtInt(n + (i % 2 ? 1 : -1) * 10 ** (3 + Math.floor(i / 2))), 'Write each group of three digits in full, with zero place holders.'));
        return { type: 'mcq', prompt, ...c, solution, marks: d };
      } catch { /* draw again */ }
    }
  },
};

// ---------------------------------------------------------------- g03, g04 x and ÷ by 10, 100, 1000

const POW = { 10: 1, 100: 2, 1000: 3, 10000: 4 };
// contexts with realistic sizes: x(rng, P) gives the start number in thousandths
const CONTEXT_TIMES = [
  { unit: 'mm', x: (rng) => rng.int(70, 130), make: (x, P) => `One sheet of paper is ${x} mm thick. How thick is a pile of ${fmtInt(P)} sheets? Give your answer in mm.` },
  { unit: 'g', x: (rng) => rng.int(18, 32), make: (x, P) => `One grain of rice has a mass of ${x} g. What is the mass of ${fmtInt(P)} grains of rice? Give your answer in g.` },
  { unit: 'cm', x: (rng) => rng.int(201, 399) * 10, make: (x, P) => `A stamp is ${x} cm wide. ${fmtInt(P)} stamps are placed in a row, edge to edge. How long is the row? Give your answer in cm.` },
];
const CONTEXT_DIVIDE = [
  { unit: 'g', x: (rng, P) => rng.int(41, 69) * 100 * P, make: (x, P) => `${fmtInt(P)} identical marbles have a total mass of ${x} g. What is the mass of one marble? Give your answer in g.` },
  { unit: 'cm', x: (rng, P) => rng.int(150, 250) * P, make: (x, P) => `A pile of ${fmtInt(P)} identical coins is ${x} cm tall. How thick is one coin? Give your answer in cm.` },
  { unit: 'cm', x: (rng, P) => rng.int(201, 399) * 10 * P, make: (x, P) => `A roll of ${fmtInt(P)} identical stickers is ${x} cm long. How long is one sticker? Give your answer in cm.` },
];

const timesDivide = {
  id: 'm01.times-divide-10-100-1000', topicId: T, subtopicId: 'm01-s2', skill: SKILL.times,
  title: 'Multiply or divide by 10, 100 or 1000 (D2 longer numbers and contexts; D3 missing number or two steps)',
  difficulties: [1, 2, 3],
  check: { min: 0, maxDp: 3 },
  make(rng, d) {
    if (d === 3) return timesDivideD3(rng);
    for (;;) {
      const s = d === 1 ? rng.int(1, 3) : rng.int(2, 4);
      let m = rng.int(10 ** (s - 1), 10 ** s - 1);
      if (m % 10 === 0) continue;
      const k = rng.int(-3, 3); // x = m x 10^k
      if (k + 3 < 0) continue;
      let xu = m * 10 ** (k + 3); // thousandths
      if (xu > 9999000 || xu < 1) continue;
      const op = rng.chance(0.5) ? 'x' : '÷';
      const P = rng.pick([10, 100, 1000]);
      const n = POW[P];
      let ru = op === 'x' ? xu * P : xu / P;
      if (!Number.isInteger(ru) || ru > 1e9 || ru < 1) continue;
      const ctx = d === 2 && rng.chance(0.4) ? rng.pick(op === 'x' ? CONTEXT_TIMES : CONTEXT_DIVIDE) : null;
      if (ctx) { xu = ctx.x(rng, P); ru = op === 'x' ? xu * P : xu / P; if (!Number.isInteger(ru) || ru < 1 || xu > 9999000) continue; }
      const x = fx(xu, 3); const r = fx(ru, 3);
      const u = ctx ? ` ${ctx.unit}` : '';
      const show = (v) => `${fx(v, 3)}${u}`;
      const prompt = ctx ? ctx.make(x, P) : `Work out ${x} ${op} ${fmtInt(P)}.`;
      const bigger = op === 'x';
      const solution = `${bigger ? 'Multiplying' : 'Dividing'} by ${fmtInt(P)} moves every digit ${n} place${n > 1 ? 's' : ''} to the ${bigger ? 'left' : 'right'}, so the number gets ${fmtInt(P)} times ${bigger ? 'bigger' : 'smaller'}: ${x} ${op} ${fmtInt(P)} = ${r}. ${bigger ? (dpsOf(xu, 3) ? 'Do not just add zeros to a decimal. ' : '') : (dpsOf(ru, 3) ? 'Fill empty places with zeros. ' : '')}Answer: ${show(ru)}`;
      const alt = (o, Q) => (o === 'x' ? xu * Q : xu / Q);
      const ok = (v) => Number.isInteger(v) && v >= 1 && v <= 1e10;
      const cands = [];
      if (n > 1 && ok(alt(op, P / 10))) cands.push({ text: show(alt(op, P / 10)), code: 'PV-SHIFT-WRONG', why: `It looks like you moved the digits ${n - 1} place${n - 1 > 1 ? 's' : ''}. ${op === 'x' ? 'Multiplying' : 'Dividing'} by ${fmtInt(P)} moves them ${n} places.` });
      if (ok(alt(op, P * 10))) cands.push({ text: show(alt(op, P * 10)), code: 'PV-SHIFT-WRONG', why: `It looks like you moved the digits ${n + 1} places. ${fmtInt(P)} has ${n} zero${n > 1 ? 's' : ''}, so the digits move ${n} place${n > 1 ? 's' : ''}.` });
      const other = op === 'x' ? '÷' : 'x';
      if (ok(alt(other, P))) cands.push({ text: show(alt(other, P)), code: 'OP-SWAP', why: `It looks like you ${op === 'x' ? 'divided' : 'multiplied'}. ${op === 'x' ? 'Multiplying makes the number bigger' : 'Dividing makes the number smaller'}, so the digits move to the ${bigger ? 'left' : 'right'}.` });
      const xdp = dpsOf(xu, 3);
      if (op === 'x' && xdp > 0 && xdp + n <= 3) cands.push({ text: `${x}${'0'.repeat(n)}${u}`, code: 'PV-ADD-ZERO', why: `It looks like you added ${n === 1 ? 'a zero' : `${n} zeros`} on the end. Zeros on the end of a decimal do not change it: ${x}${'0'.repeat(n)} is still ${x}. Move the digits ${n} place${n > 1 ? 's' : ''} to the left.` });
      const distractors = op === 'x' && cands.length && cands[cands.length - 1].code === 'PV-ADD-ZERO' ? [cands.pop(), ...rng.shuffle(cands)] : rng.shuffle(cands);
      const skill = op === 'x' ? SKILL.times : SKILL.divide;
      try {
        if (d === 2 && rng.chance(0.4)) {
          const t = typedMisconceptions(r, distractors.map((c) => ({ ...c, text: c.text.replace(u, '') })), { code: 'PV-SHIFT-WRONG', why: `${bigger ? 'Multiplying' : 'Dividing'} by ${fmtInt(P)} moves every digit ${n} place${n > 1 ? 's' : ''} to the ${bigger ? 'left' : 'right'}.` });
          return { type: 'numeric', prompt, answer: numericAnswer(ru / 1000, [r, ...(u ? [`${r}${u}`] : [])]), solution, ...t, skill };
        }
        const c = choices(rng, show(ru), distractors, (i) => nearFor(prompt)(show(ru + i * 10 ** (3 - dpsOf(ru, 3))), `Move every digit ${n} place${n > 1 ? 's' : ''}.`));
        return { type: 'mcq', prompt, ...c, solution, skill };
      } catch { /* draw again */ }
    }
  },
};

function timesDivideD3(rng) {
  for (;;) {
    const kind = rng.pick(['power', 'power', 'start', 'chain']);
    const s = rng.int(1, 3);
    const m = rng.int(10 ** (s - 1), 10 ** s - 1);
    if (m % 10 === 0) continue;
    const k = rng.int(-3, 2);
    const xu = m * 10 ** (k + 3);
    if (!Number.isInteger(xu) || xu < 1 || xu > 999000) continue;
    const x = fx(xu, 3);
    if (kind === 'power') {
      const op = rng.chance(0.5) ? 'x' : '÷';
      const P = rng.pick([10, 100, 1000]);
      const ru = op === 'x' ? xu * P : xu / P;
      if (!Number.isInteger(ru) || ru < 1) continue;
      // D3: a decimal on at least one side, so it is not "6 x ? = 600" (CLO review m01 item 5)
      if (xu % 1000 === 0 && ru % 1000 === 0) continue;
      const r = fx(ru, 3);
      const prompt = `Find the missing number: ${x} ${op} ? = ${r}`;
      const n = POW[P];
      const solution = `Compare the numbers: the digits of ${x} have moved ${n} place${n > 1 ? 's' : ''} to the ${op === 'x' ? 'left' : 'right'} to make ${r}. Moving ${n} place${n > 1 ? 's' : ''} means ${op === 'x' ? 'multiplying' : 'dividing'} by ${fmtInt(P)}. Answer: ${fmtInt(P)}`;
      const distractors = [10, 100, 1000, 10000].filter((Q) => Q !== P).map((Q) => ({ text: fmtInt(Q), code: 'PV-SHIFT-WRONG', why: `${op} ${fmtInt(Q)} moves the digits ${POW[Q]} place${POW[Q] > 1 ? 's' : ''}, but from ${x} to ${r} they move ${n} place${n > 1 ? 's' : ''}. Count the places the digits move.` }));
      try {
        if (rng.chance(0.35)) {
          const t = typedMisconceptions(fmtInt(P), distractors, { code: 'PV-SHIFT-WRONG', why: 'Count how many places the digits move: 1 place is 10, 2 places is 100, 3 places is 1000.' });
          return { type: 'numeric', prompt, answer: numericAnswer(P, [fmtInt(P), String(P)]), solution, ...t, marks: 2, skill: SKILL.both };
        }
        return { type: 'mcq', prompt, ...choices(rng, fmtInt(P), rng.shuffle(distractors), null), solution, marks: 2, skill: SKILL.both };
      } catch { continue; }
    }
    if (kind === 'start') {
      const op = rng.chance(0.5) ? 'x' : '÷';
      const P = rng.pick([10, 100, 1000]);
      const ru = op === 'x' ? xu * P : xu / P;
      if (!Number.isInteger(ru) || ru < 1 || ru > 9999000) continue;
      const r = fx(ru, 3);
      const n = POW[P];
      const prompt = `Find the missing number: ? ${op} ${fmtInt(P)} = ${r}`;
      const inv = op === 'x' ? '÷' : 'x';
      const solution = `Work backwards with the inverse operation: ? = ${r} ${inv} ${fmtInt(P)} = ${x}. Check: ${x} ${op} ${fmtInt(P)} = ${r}. Answer: ${x}`;
      const same = op === 'x' ? ru * P : ru / P;
      const back = (Q) => (op === 'x' ? ru / Q : ru * Q);
      const distractors = [
        Number.isInteger(same) && same >= 1 && same <= 1e10 ? { text: fx(same, 3), code: 'INVERSE-WRONG', why: `It looks like you ${op === 'x' ? 'multiplied' : 'divided'} ${r} by ${fmtInt(P)} again. To find the start number, do the inverse: ${r} ${inv} ${fmtInt(P)}.` } : null,
        Number.isInteger(back(P / 10)) && back(P / 10) >= 1 && P > 10 ? { text: fx(back(P / 10), 3), code: 'PV-SHIFT-WRONG', why: `That moves the digits ${n - 1} place${n - 1 > 1 ? 's' : ''}. Undoing ${op} ${fmtInt(P)} moves them ${n} places.` } : null,
        Number.isInteger(back(P * 10)) && back(P * 10) >= 1 ? { text: fx(back(P * 10), 3), code: 'PV-SHIFT-WRONG', why: `That moves the digits ${n + 1} places. Undoing ${op} ${fmtInt(P)} moves them ${n} place${n > 1 ? 's' : ''}.` } : null,
      ];
      try { return { type: 'mcq', prompt, ...choices(rng, x, distractors, null), solution, marks: 2, skill: SKILL.both }; } catch { continue; }
    }
    // a chain of two steps
    const P1 = rng.pick([10, 100, 1000]); const P2 = rng.pick([10, 100, 1000].filter((q) => q !== P1));
    const first = rng.chance(0.5) ? 'x' : '÷';
    const second = first === 'x' ? '÷' : 'x';
    const ap = (u, o, Q) => (o === 'x' ? u * Q : u / Q);
    const mid = ap(xu, first, P1); const ru = ap(mid, second, P2);
    if (![mid, ru].every((v) => Number.isInteger(v) && v >= 1 && v <= 9999000)) continue;
    const r = fx(ru, 3);
    const prompt = `Work out ${x} ${first} ${fmtInt(P1)} ${second} ${fmtInt(P2)}.`;
    const solution = `Work from left to right. ${x} ${first} ${fmtInt(P1)} = ${fx(mid, 3)}. Then ${fx(mid, 3)} ${second} ${fmtInt(P2)} = ${r}. Answer: ${r}`;
    const both = ap(mid, first, P2);
    const okv = (v) => Number.isInteger(v) && v >= 1 && v <= 1e10;
    const distractors = [
      { text: fx(mid, 3), code: 'ONE-STEP-ONLY', why: `${fx(mid, 3)} is the answer after the first step only. You still need to ${second === 'x' ? 'multiply' : 'divide'} by ${fmtInt(P2)}.` },
      okv(both) ? { text: fx(both, 3), code: 'OP-SWAP', why: `It looks like you ${first === 'x' ? 'multiplied' : 'divided'} by ${fmtInt(P2)} as well. The second step is ${second} ${fmtInt(P2)}.` } : null,
      // one of the two steps moved the digits one place too many or too few
      ...rng.shuffle([ru * 10, ru / 10]).map((v) => (okv(v) && v !== xu ? { text: fx(v, 3), code: 'PV-SHIFT-WRONG', why: `That is ${v > ru ? '10 times too big' : '10 times too small'}, so in one of the steps the digits moved one place too far or not far enough. ${first === 'x' ? 'Multiplying' : 'Dividing'} by ${fmtInt(P1)} moves them ${POW[P1]} place${POW[P1] > 1 ? 's' : ''}; ${second === 'x' ? 'multiplying' : 'dividing'} by ${fmtInt(P2)} moves them ${POW[P2]} place${POW[P2] > 1 ? 's' : ''}.` } : null)),
    ];
    try { return { type: 'mcq', prompt, ...choices(rng, r, distractors, (i) => { const v = ru * 10 ** (i + 1); return okv(v) ? nearFor(prompt)(fx(v, 3), 'Do one step at a time, from left to right.') : null; }), solution, marks: 2, skill: SKILL.both }; } catch { /* draw again */ }
  }
}

// ---------------------------------------------------------------- g05, g06 compose, decompose, regroup

const UNIT_OF = { '-1': 'tenths', '-2': 'hundredths', '-3': 'thousandths', 0: 'ones' };

const composeRegroup = {
  id: 'm01.compose-regroup', topicId: T, subtopicId: 'm01-s3', skill: SKILL.regroup,
  title: 'Compose, decompose and regroup decimals (D1 parts, D2 tenths and hundredths, D3 more than 9 of a place, or regrouping across three places)',
  difficulties: [1, 2, 3],
  check: { min: 0 },
  make(rng, d) {
    if (d === 1) return rng.chance(0.45) ? composeSum(rng) : decompose(rng);
    if (d === 2) { const k = rng.int(0, 2); return k === 0 ? regroupMissing(rng) : k === 1 ? howMany(rng) : equalTo(rng); }
    return rng.chance(0.5) ? overflow(rng) : regroupThree(rng);
  },
};

function composeSum(rng) {
  for (;;) {
    const w = rng.int(1, 20);
    const dp = rng.int(2, 3);
    const digs = [-1, -2, -3].slice(0, dp).map((p) => ({ p, x: rng.int(0, 9) }));
    if (digs[digs.length - 1].x === 0 || digs.filter((g) => g.x).length < 2) continue;
    const parts = [{ p: 0, x: w }, ...digs.filter((g) => g.x)];
    const order = rng.shuffle(parts);
    if (rng.chance(0.4)) order.sort((a, b) => b.p - a.p);
    const txt = (g) => (g.p === 0 ? String(g.x) : fx(g.x, -g.p));
    let u = w * 1000; for (const g of digs) u += g.x * 10 ** (g.p + 3);
    const ans = fx(u, 3);
    const prompt = `Work out ${order.map(txt).join(' + ')}.`;
    const solution = `Put each part in its place: ${parts.map((g) => `${txt(g)} is ${g.x} ${g.x === 1 ? ONE_NAME[g.p] : NAMES[g.p]}`).join(', ')}.${digs.some((g) => g.x === 0) ? ` There are no ${NAMES[digs.find((g) => g.x === 0).p]}, so write a 0 there.` : ''} Answer: ${ans}`;
    const decDigits = digs.filter((g) => g.x).map((g) => g.x).join('');
    const listed = order.filter((g) => g.p < 0).map((g) => g.x).join('');
    const distractors = [
      digs.some((g) => g.x === 0) ? { text: `${w}.${decDigits}`, code: 'PV-PLACEHOLDER-DROPPED', why: `It looks like you wrote the digits next to each other and left out the 0 for the empty ${NAMES[digs.find((g) => g.x === 0).p]} place.` } : null,
      listed !== decDigits ? { text: `${w}.${listed}`, code: 'PV-ORDER-AS-GIVEN', why: 'It looks like you wrote the digits in the order the parts are listed. Each digit goes in its own place: tenths, hundredths, thousandths.' } : null,
    ];
    // one part written one place out
    for (const g of digs.filter((gg) => gg.x)) {
      const q = g.p - 1;
      if (q < -3) continue;
      const v = u - g.x * 10 ** (g.p + 3) + g.x * 10 ** (q + 3);
      distractors.push({ text: fx(v, 3), code: 'PV-WRONG-PLACE', why: `It looks like you put the ${g.x} from ${txt(g)} in the ${NAMES[q]} place. ${txt(g)} is ${g.x} ${g.x === 1 ? NAMES[g.p].replace(/s$/, '') : NAMES[g.p]}.` });
    }
    try {
      const c = choices(rng, ans, distractors, null);
      return { type: 'mcq', prompt, ...c, solution, skill: SKILL.compose };
    } catch { /* draw again */ }
  }
}

function decompose(rng) {
  for (;;) {
    const w = rng.int(1, 30);
    const digs = [-1, -2, -3].map((p) => ({ p, x: rng.int(0, 9) }));
    if (digs[2].x === 0 || digs.filter((g) => g.x).length < 2) continue;
    let u = w * 1000; for (const g of digs) u += g.x * 10 ** (g.p + 3);
    const nz = digs.filter((g) => g.x);
    const miss = rng.pick(nz);
    const txt = (g) => fx(g.x, -g.p);
    const terms = [String(w), ...nz.map((g) => (g === miss ? '?' : txt(g)))];
    if (rng.chance(0.3)) { const i = rng.int(1, terms.length - 1); [terms[0], terms[i]] = [terms[i], terms[0]]; }
    const prompt = `Fill in the missing part: ${fx(u, 3)} = ${terms.join(' + ')}`;
    const ans = txt(miss);
    const solution = `In ${fx(u, 3)} the ${miss.x} is in the ${NAMES[miss.p]} place, so it is worth ${ans}. Check: ${[String(w), ...nz.map(txt)].join(' + ')} = ${fx(u, 3)}. Answer: ${ans}`;
    const distractors = [
      ...[-1, -2, -3].filter((q) => q !== miss.p).map((q) => ({ text: fx(miss.x, -q), code: 'PV-WRONG-PLACE', why: `${fx(miss.x, -q)} is ${miss.x} ${miss.x === 1 ? ONE_NAME[q] : NAMES[q]}. In ${fx(u, 3)} the ${miss.x} is in the ${NAMES[miss.p]} place, so the missing part is ${ans}.` })),
      { text: String(miss.x), code: 'PV-DIGIT-ONLY', why: `${miss.x} is the digit, but the missing part is its value. The ${miss.x} is in the ${NAMES[miss.p]} place, so the part is ${ans}.` },
    ];
    try { return { type: 'mcq', prompt, ...choices(rng, ans, distractors, null), solution, skill: SKILL.decompose }; } catch { /* draw again */ }
  }
}

/** D2: 2.45 = ? tenths + 5 hundredths (or ones + ? hundredths). */
function regroupMissing(rng) {
  for (;;) {
    const w = rng.int(1, 9); const t = rng.int(1, 9); const h = rng.int(1, 9);
    const u = w * 100 + t * 10 + h; // hundredths
    const form = rng.int(0, 1);
    let prompt; let ans; let solution; let items;
    if (form === 0) {
      ans = w * 10 + t;
      prompt = `Find the missing number: ${fx(u, 2)} = ? tenths + ${nOf(h, -2)}`;
      solution = `${fx(u, 2)} is ${nOf(w, 0)}, ${nOf(t, -1)} and ${nOf(h, -2)}. Each one is 10 tenths, so ${nOf(w, 0)} and ${nOf(t, -1)} make ${w * 10} + ${t} = ${ans} tenths. Answer: ${ans}`;
      items = [
        { text: String(t), code: 'PV-DIGIT-NOT-TOTAL', why: `${t} is only the tenths digit. The ${nOf(w, 0)} ${w === 1 ? 'is' : 'are'} tenths too: ${nOf(w, 0)} = ${w * 10} tenths, so there are ${ans} tenths altogether.` },
        { text: String(u), code: 'PV-WRONG-UNIT', why: `${u} is the number of hundredths in ${fx(u, 2)}. The question asks for tenths, with the ${h} hundredth${h === 1 ? '' : 's'} written separately.` },
        { text: String(w), code: 'PV-DIGIT-NOT-TOTAL', why: `${w} is the ones digit. Count all the tenths: ${nOf(w, 0)} and ${nOf(t, -1)} make ${ans} tenths.` },
      ];
    } else {
      ans = t * 10 + h;
      prompt = `Find the missing number: ${fx(u, 2)} = ${nOf(w, 0)} + ? hundredths`;
      solution = `${fx(u, 2)} is ${nOf(w, 0)}, ${nOf(t, -1)} and ${nOf(h, -2)}. Each tenth is 10 hundredths, so ${nOf(t, -1)} and ${nOf(h, -2)} make ${t * 10} + ${h} = ${ans} hundredths. Answer: ${ans}`;
      items = [
        { text: String(h), code: 'PV-DIGIT-NOT-TOTAL', why: `${h} is only the hundredths digit. The ${nOf(t, -1)} ${t === 1 ? 'is' : 'are'} hundredths too: ${nOf(t, -1)} = ${t * 10} hundredths, so there are ${ans} hundredths.` },
        { text: String(u), code: 'PV-WRONG-UNIT', why: `${u} hundredths is the whole of ${fx(u, 2)}, but the ${w} ${w === 1 ? 'one is' : 'ones are'} already written separately.` },
        { text: String(t), code: 'PV-DIGIT-NOT-TOTAL', why: `${t} is the tenths digit. Change the tenths to hundredths: ${nOf(t, -1)} and ${nOf(h, -2)} make ${ans} hundredths.` },
      ];
    }
    try {
      if (rng.chance(0.45)) {
        const tm = typedMisconceptions(String(ans), items, { code: 'PV-DIGIT-NOT-TOTAL', why: 'Exchange the bigger places: 1 one = 10 tenths, 1 tenth = 10 hundredths.' });
        return { type: 'numeric', prompt, answer: numericAnswer(ans, [String(ans)]), solution, ...tm, skill: SKILL.regroup };
      }
      return { type: 'mcq', prompt, ...choices(rng, String(ans), items, null), solution, skill: SKILL.regroup };
    } catch { /* draw again */ }
  }
}

/** D2: how many hundredths are there in 3.75 altogether? */
function howMany(rng) {
  for (;;) {
    const unit = rng.pick([-1, -2, -2, -3]);
    const dp = rng.int(1, -unit);
    const w = rng.int(1, 30);
    let u = w; for (let i = 0; i < dp; i++) u = u * 10 + (i === dp - 1 ? rng.int(1, 9) : rng.int(0, 9)); // u in 10^-dp
    const ans = u * 10 ** (-unit - dp);
    const x = fx(u, dp);
    const prompt = `How many ${NAMES[unit]} are there in ${x} altogether?`;
    const solution = `1 whole = ${fmtInt(10 ** -unit)} ${NAMES[unit]}. So ${x} = ${x} x ${fmtInt(10 ** -unit)} = ${fmtInt(ans)} ${NAMES[unit]}. Answer: ${fmtInt(ans)}`;
    const dig = Math.floor(u * 10 ** (-unit - dp) % 10);
    const items = [
      { text: fmtInt(Math.floor(ans / 10)), code: 'PV-WRONG-UNIT', why: `${fmtInt(Math.floor(ans / 10))} is the number of whole ${NAMES[unit + 1] || 'ones'} in ${x}. Each of those is 10 ${NAMES[unit]}, so count in ${NAMES[unit]} instead.` },
      { text: fmtInt(ans * 10), code: 'PV-WRONG-UNIT', why: `${fmtInt(ans * 10)} would be ${unit - 1 >= -3 ? NAMES[unit - 1] : 'ten-thousandths'}. 1 whole = ${fmtInt(10 ** -unit)} ${NAMES[unit]}, so multiply ${x} by ${fmtInt(10 ** -unit)}.` },
      { text: String(dig), code: 'PV-DIGIT-NOT-TOTAL', why: `${dig} is only the digit in the ${NAMES[unit]} place. The question asks how many ${NAMES[unit]} there are in the whole of ${x}.` },
    ];
    try {
      if (rng.chance(0.4)) {
        const tm = typedMisconceptions(fmtInt(ans), items, { code: 'PV-WRONG-UNIT', why: `Multiply by ${fmtInt(10 ** -unit)}: there are ${fmtInt(10 ** -unit)} ${NAMES[unit]} in 1 whole.` });
        return { type: 'numeric', prompt, answer: numericAnswer(ans, [fmtInt(ans), String(ans)]), solution, ...tm, skill: SKILL.regroup };
      }
      return { type: 'mcq', prompt, ...choices(rng, fmtInt(ans), items, null), solution, skill: SKILL.regroup };
    } catch { /* draw again */ }
  }
}

/** D2: which of these is equal to 3.08? (written in other units) */
function equalTo(rng) {
  for (;;) {
    const a = rng.int(1, 9); const b = rng.chance(0.4) ? 0 : rng.int(1, 9); const c = rng.int(1, 9);
    const x = fx(a * 100 + b * 10 + c, 2);
    const form = rng.int(0, 2);
    const correct = form === 0 ? `${nOf(a * 10 + b, -1)} and ${nOf(c, -2)}` : form === 1 ? `${nOf(a, 0)} and ${nOf(b * 10 + c, -2)}` : `${nOf(a * 100 + b * 10 + c, -2)}`;
    const prompt = `Which of these is equal to ${x}?`;
    const solution = `${x} is ${nOf(a, 0)}, ${nOf(b, -1)} and ${nOf(c, -2)}. 1 one = 10 tenths = 100 hundredths, so ${x} = ${nOf(a * 10 + b, -1)} and ${nOf(c, -2)} = ${nOf(a * 100 + b * 10 + c, -2)}. Answer: ${correct}`;
    const distractors = [
      { text: `${nOf(a, -1)} and ${nOf(b * 10 + c, -2)}`, code: 'PV-WRONG-UNIT', why: `${nOf(a, -1)} and ${nOf(b * 10 + c, -2)} is ${fx(a * 10 + b * 10 + c, 2)}. The ${a} in ${x} is ${nOf(a, 0)}, not tenths.` },
      b === 0 ? { text: `${a}${c} hundredths`, code: 'PV-PLACEHOLDER-DROPPED', why: `${a}${c} hundredths is ${fx(a * 10 + c, 2)}. It looks like the 0 in the tenths place was left out.` } : { text: `${nOf(a, 0)} and ${nOf(c, -2)}`, code: 'PV-DIGIT-NOT-TOTAL', why: `This leaves out the ${nOf(b, -1)}. ${nOf(a, 0)} and ${nOf(c, -2)} is ${fx(a * 100 + c, 2)}.` },
      { text: `${nOf(a * 10 + b, -2)} and ${nOf(c, -3)}`, code: 'PV-WRONG-UNIT', why: `Each unit here is ten times too small: ${nOf(a * 10 + b, -2)} and ${nOf(c, -3)} is ${fx((a * 10 + b) * 10 + c, 3)}.` },
      { text: `${nOf(a * 10 + b, -1)} and ${nOf(c, -1)}`, code: 'PV-WRONG-UNIT', why: `The ${c} in ${x} is ${nOf(c, -2)}, not ${nOf(c, -1)}.` },
    ];
    try { return { type: 'mcq', prompt, ...choices(rng, correct, distractors, null), solution, skill: SKILL.regroup }; } catch { /* draw again */ }
  }
}

/** D3: 2 ones, 15 tenths, 23 hundredths and 4 thousandths: what is the number? */
function overflow(rng) {
  for (;;) {
    const w = rng.int(1, 9);
    const t = rng.chance(0.75) ? rng.int(10, 29) : rng.int(1, 9);
    const h = rng.chance(0.75) ? rng.int(10, 39) : rng.int(1, 9);
    const th = rng.int(1, 9);
    if ((t >= 10) + (h >= 10) < 1 || t % 10 === 0 || h % 10 === 0) continue;
    const u = w * 1000 + t * 100 + h * 10 + th;
    const ans = fx(u, 3);
    const parts = [nOf(w, 0), nOf(t, -1), nOf(h, -2), nOf(th, -3)];
    const prompt = `A number is made of ${parts.slice(0, 3).join(', ')} and ${parts[3]}. What is the number? Give your answer as a decimal.`;
    const solution = `Change each part to a decimal and add: ${w} + ${fx(t, 1)} + ${fx(h, 2)} + ${fx(th, 3)}.${t >= 10 ? ` ${t} tenths = ${fx(t, 1)}.` : ''}${h >= 10 ? ` ${h} hundredths = ${fx(h, 2)}.` : ''} The total is ${ans}. Answer: ${ans}`;
    const noCarry = w * 1000 + (t % 10) * 100 + (h % 10) * 10 + th;
    const asDigits = w * 1000 + (t >= 10 ? t * 10 : t * 100) + (h >= 10 ? h : h * 10) + th;
    // every part with 10 or more is named, so the text always produces the option (CLO review m01 item 2)
    const big = [t >= 10 ? { n: t, e: -1 } : null, h >= 10 ? { n: h, e: -2 } : null].filter(Boolean);
    const and = (arr) => (arr.length > 1 ? `${arr.slice(0, -1).join(', ')} and ${arr[arr.length - 1]}` : arr[0]);
    const split = (g) => `${g.n} ${NAMES[g.e]} is ${nOf(Math.floor(g.n / 10), g.e + 1)} and ${nOf(g.n % 10, g.e)}`;
    const items = [
      { text: fx(noCarry, 3), code: 'COL-NO-CARRY', why: `It looks like you kept only the last digit of ${and(big.map((g) => `the ${g.n} ${NAMES[g.e]}`))}. ${capFirst(and(big.map(split)))}: carry the extra into the next place.` },
      { text: fx(asDigits, 3), code: 'PV-REGROUP-AS-DIGITS', why: `It looks like you wrote ${and(big.map((g) => `${g.n} ${NAMES[g.e]} as ${fx(g.n, -g.e + 1)}`))}. ${capFirst(and(big.map((g) => `${g.n} ${NAMES[g.e]} = ${fx(g.n, -g.e)}`)))}.` },
    ];
    const g0 = big[0];
    try {
      if (rng.chance(0.4)) {
        const tm = typedMisconceptions(ans, items, { why: `Change each part into a decimal (${g0.n} ${NAMES[g0.e]} = ${fx(g0.n, -g0.e)}), then add them, carrying where a place goes over 9.` });
        return { type: 'numeric', prompt, answer: numericAnswer(u / 1000, [ans]), solution, ...tm, skill: SKILL.regroup };
      }
      return { type: 'mcq', prompt, ...choices(rng, ans, items, (i) => nearFor(prompt)(fx(u + (i % 2 ? 1 : -1) * 10 ** Math.ceil(i / 2), 3), 'Change each part into a decimal first, then add.')), solution, skill: SKILL.regroup };
    } catch { /* draw again */ }
  }
}

/** D3: 3.457 = 34 tenths + ? thousandths (regrouping across three places; CLO review m01 item 7). */
function regroupThree(rng) {
  for (;;) {
    const w = rng.int(1, 9); const t = rng.int(1, 9); const h = rng.int(1, 9); const th = rng.int(1, 9);
    const u = w * 1000 + t * 100 + h * 10 + th; const x = fx(u, 3);
    const form = rng.int(0, 2);
    let prompt; let ans; let solution; let items;
    if (form === 0) {
      ans = h * 10 + th;
      prompt = `Find the missing number: ${x} = ${nOf(w * 10 + t, -1)} + ? thousandths`;
      solution = `${x} is ${nOf(w * 10 + t, -1)} (${fx(w * 10 + t, 1)}) and ${fx(h * 10 + th, 3)} more. ${fx(h * 10 + th, 3)} is ${nOf(h, -2)} and ${nOf(th, -3)}, and each hundredth is 10 thousandths: ${h * 10} + ${th} = ${ans} thousandths. Answer: ${ans}`;
      items = [
        { text: String(th), code: 'PV-DIGIT-NOT-TOTAL', why: `${th} is only the thousandths digit. The ${nOf(h, -2)} must be changed to thousandths too: ${h} x 10 + ${th} = ${ans}.` },
        { text: String(h), code: 'PV-DIGIT-NOT-TOTAL', why: `${h} is only the hundredths digit. Count everything after the ${nOf(w * 10 + t, -1)} in thousandths: ${ans}.` },
        { text: String(u), code: 'PV-WRONG-UNIT', why: `${u} thousandths is the whole of ${x}, but the ${nOf(w * 10 + t, -1)} are already written separately.` },
      ];
    } else if (form === 1) {
      ans = w * 100 + t * 10 + h;
      prompt = `Find the missing number: ${x} = ? hundredths + ${nOf(th, -3)}`;
      solution = `Take away the ${nOf(th, -3)}: ${x} - ${fx(th, 3)} = ${fx(ans, 2)}. 1 whole = 100 hundredths, so ${fx(ans, 2)} = ${fx(ans, 2)} x 100 = ${ans} hundredths. Answer: ${ans}`;
      items = [
        { text: String(h), code: 'PV-DIGIT-NOT-TOTAL', why: `${h} is only the hundredths digit. The ones and tenths are hundredths too: ${fx(ans, 2)} = ${ans} hundredths.` },
        { text: String(w * 10 + t), code: 'PV-WRONG-UNIT', why: `${w * 10 + t} is the number of tenths. Count in hundredths: ${fx(ans, 2)} = ${ans} hundredths.` },
        { text: String(u), code: 'PV-WRONG-UNIT', why: `${u} is the number of thousandths in ${x}. The question asks for hundredths, with the ${nOf(th, -3)} written separately.` },
      ];
    } else {
      ans = t * 100 + h * 10 + th;
      prompt = `Find the missing number: ${x} = ${nOf(w, 0)} + ? thousandths`;
      solution = `Take away the ${nOf(w, 0)}: ${x} - ${w} = ${fx(ans, 3)}. 1 whole = 1000 thousandths, so ${fx(ans, 3)} = ${ans} thousandths. Answer: ${ans}`;
      items = [
        { text: String(th), code: 'PV-DIGIT-NOT-TOTAL', why: `${th} is only the thousandths digit. The tenths and hundredths are thousandths too: ${fx(ans, 3)} = ${ans} thousandths.` },
        { text: String(t * 10 + h), code: 'PV-WRONG-UNIT', why: `${t * 10 + h} is the number of whole hundredths after the ones. Count in thousandths: ${fx(ans, 3)} = ${ans} thousandths.` },
        { text: String(u), code: 'PV-WRONG-UNIT', why: `${u} thousandths is the whole of ${x}, but the ${nOf(w, 0)} ${w === 1 ? 'is' : 'are'} already written separately.` },
      ];
    }
    try {
      if (rng.chance(0.4)) {
        const tm = typedMisconceptions(String(ans), items, { why: 'Exchange the bigger places: 1 one = 10 tenths, 1 tenth = 10 hundredths, 1 hundredth = 10 thousandths.' });
        return { type: 'numeric', prompt, answer: numericAnswer(ans, [String(ans)]), solution, ...tm, marks: 2, skill: SKILL.regroup };
      }
      return { type: 'mcq', prompt, ...choices(rng, String(ans), items, null), solution, marks: 2, skill: SKILL.regroup };
    } catch { /* draw again */ }
  }
}

// ---------------------------------------------------------------- g07, g08 rounding

const ROUND_CONTEXT = [
  (x) => `A durian has a mass of ${x} kg. Round its mass to the nearest PLACE.`,
  (x) => `Siti ran ${x} km on Saturday. Round this distance to the nearest PLACE.`,
  (x) => `A bottle holds ${x} L of water. Round this to the nearest PLACE.`,
  (x) => `Wei Ming's long jump was ${x} m. Round this length to the nearest PLACE.`,
];
const CTX_UNIT = ['kg', 'km', 'L', 'm'];
// realistic sizes for each context, in hundredths (CLO review X6): a durian 1-5 kg, a run of
// 1-13 km, a bottle 0.25-2.5 L, a Year 6 long jump 1.5-4.5 m
const CTX_RANGE = [[100, 499], [100, 1299], [25, 250], [150, 450]];
const PLACE_OF = { 10: 'tenth', 100: 'whole number' };
const WHOLE_PLACE = { 1: 'one', 10: 'ten', 100: 'hundred', 1000: 'thousand', 10000: 'ten thousand', 100000: 'hundred thousand' };

const rounding = {
  id: 'm01.rounding', topicId: T, subtopicId: 'm01-s4', skill: SKILL.tenth,
  title: 'Round decimals to the nearest tenth or whole number, and whole numbers to 10, 100, 1000 (D2 carrying 9s, contexts; D3 the smallest or largest number that rounds to a value)',
  difficulties: [1, 2, 3],
  check: { min: 0 },
  make(rng, d) {
    if (d === 3) return roundingBounds(rng);
    for (;;) {
      if (rng.chance(d === 1 ? 0.35 : 0.3)) { const r = roundWhole(rng, d); if (r) return r; continue; }
      // a 2 dp decimal held as hundredths
      let u;
      const q = d === 2 && rng.chance(0.5) ? 10 : rng.pick([10, 100]); // tenth or whole
      const ctxI = d === 2 && rng.chance(0.4) ? rng.int(0, ROUND_CONTEXT.length - 1) : -1;
      const [lo, hi] = ctxI >= 0 ? CTX_RANGE[ctxI] : [5, 9999];
      if (d === 2 && q === 10 && rng.chance(0.6)) { // 9 carry: x.9y with y >= 5
        u = rng.int(Math.floor(lo / 100), Math.floor(hi / 100) - 1) * 100 + 90 + rng.int(5, 9);
      } else u = rng.int(lo, hi);
      if (u < lo || u > hi) continue;
      if (u % 10 === 0 || (q === 100 && (u % 100 === 0 || u < 100))) continue;
      const fl = Math.floor(u / q) * q; const ce = fl + q;
      const corr = u - fl >= q / 2 ? ce : fl;
      const show = (v, qq) => (qq === 10 ? fxk(v, 2, 1) : fmtInt(v / 100));
      const x = fx(u, 2);
      const place = PLACE_OF[q];
      const nd = q === 10 ? u % 10 : Math.floor(u / 10) % 10;
      const unit = ctxI >= 0 ? ` ${CTX_UNIT[ctxI]}` : '';
      const prompt = ctxI >= 0 ? ROUND_CONTEXT[ctxI](x).replace('PLACE', q === 10 ? 'tenth' : 'whole number') : `Round ${x} to the nearest ${place}.`;
      const ans = show(corr, q) + unit;
      const up = corr === ce;
      const solution = `Look at the digit after the ${q === 10 ? 'tenths' : 'ones'} place: it is ${nd}. ${up ? `${nd} is 5 or more, so round up` : `${nd} is less than 5, so round down`}: ${x} is closer to ${show(corr, q)} than to ${show(up ? fl : ce, q)}.${up && q === 10 && Math.floor(u / 10) % 10 === 9 ? ` The 9 tenths become 10 tenths, which is 1 whole, so the answer is ${show(corr, q)}.` : ''} Answer: ${ans}`;
      const items = [];
      if (up) items.push({ text: show(fl, q) + unit, code: 'ROUND-TRUNCATE', why: `It looks like you chopped off the digits after the ${q === 10 ? 'tenths' : 'ones'}. The next digit is ${nd}, which is 5 or more, so round up to ${show(corr, q)}.` });
      else items.push({ text: show(ce, q) + unit, code: 'ROUND-WRONG-WAY', why: `It looks like you rounded up. The next digit is ${nd}, which is less than 5, so round down to ${show(corr, q)}.` });
      if (up && q === 10 && Math.floor(u / 10) % 10 === 9) items.push({ text: `${Math.floor(u / 100)}.10${unit}`, code: 'ROUND-9-CARRY', why: `It looks like you wrote 9 + 1 = 10 in the tenths place. 10 tenths make 1 whole, so carry it: ${x} rounds to ${show(corr, q)}.` });
      const q2 = q === 10 ? 100 : 10;
      const fl2 = Math.floor(u / q2) * q2; const c2 = u - fl2 >= q2 / 2 ? fl2 + q2 : fl2;
      items.push({ text: show(c2, q2) + unit, code: 'ROUND-WRONG-PLACE', why: `That is ${x} rounded to the nearest ${PLACE_OF[q2]}. The question asks for the nearest ${place}.` });
      const skill = q === 10 ? SKILL.tenth : SKILL.whole;
      try {
        if (d === 2 && rng.chance(0.35)) {
          const t = typedMisconceptions(show(corr, q), items.map((it) => ({ ...it, text: it.text.replace(unit, '') })), { code: 'ROUND-TRUNCATE', why: `Look at the digit after the ${q === 10 ? 'tenths' : 'ones'} place: 5 or more rounds up, less than 5 rounds down.` });
          return { type: 'numeric', prompt: prompt + (unit ? ` Give your answer in ${CTX_UNIT[ctxI]}.` : ''), answer: numericAnswer(corr / 100, [show(corr, q), ...(unit ? [ans] : []), ...(q === 10 && corr % 100 === 0 ? [fmtInt(corr / 100)] : [])]), solution, ...t, skill };
        }
        const c = choices(rng, ans, items, (i) => { const v = corr + (i % 2 ? 1 : -1) * q * Math.ceil(i / 2); return v > 0 ? nearFor(prompt)(show(v, q) + unit, `Round to the nearest ${place}: look at the next digit only.`) : null; });
        return { type: 'mcq', prompt, ...c, solution, skill };
      } catch { /* draw again */ }
    }
  },
};

function roundWhole(rng, d) {
  const q = d === 1 ? rng.pick([10, 100, 1000]) : rng.pick([100, 1000, 10000]);
  // a full Bukit Jalil Stadium holds about 87 000 people (CLO review X6)
  const stadium = d === 2 && rng.chance(0.35);
  const n = d === 1 ? rng.int(1001, 9999) : stadium ? rng.int(15001, 86999) : rng.int(10001, 999999);
  if (n % q === 0 || n < q) return null;
  const fl = Math.floor(n / q) * q; const ce = fl + q;
  const nd = Math.floor(n / (q / 10)) % 10;
  const corr = nd >= 5 ? ce : fl;
  const up = corr === ce;
  const place = WHOLE_PLACE[q];
  const prompt = stadium
    ? `${fmtInt(n)} people watched a football match at Bukit Jalil Stadium. Round this number to the nearest ${place}.`
    : `Round ${fmtInt(n)} to the nearest ${place}.`;
  const solution = `Look at the digit after the ${place}s place: it is ${nd}. ${up ? `${nd} is 5 or more, so round up` : `${nd} is less than 5, so round down`}: ${fmtInt(n)} is between ${fmtInt(fl)} and ${fmtInt(ce)} and is closer to ${fmtInt(corr)}. Answer: ${fmtInt(corr)}`;
  const items = [];
  if (up) items.push({ text: fmtInt(fl), code: 'ROUND-TRUNCATE', why: `It looks like you changed the digits after the ${place}s place to zeros without rounding up. The next digit is ${nd}, which is 5 or more.` });
  else items.push({ text: fmtInt(ce), code: 'ROUND-WRONG-WAY', why: `It looks like you rounded up. The next digit is ${nd}, which is less than 5, so round down.` });
  for (const q2 of [q / 10, q * 10]) {
    if (q2 < 10 || q2 > n) continue;
    const f2 = Math.floor(n / q2) * q2; const c2 = Math.floor(n / (q2 / 10)) % 10 >= 5 ? f2 + q2 : f2;
    if (c2 === n) continue; // the number unchanged is no distractor (CLO review m01 item 4)
    items.push({ text: fmtInt(c2), code: 'ROUND-WRONG-PLACE', why: `That is ${fmtInt(n)} rounded to the nearest ${WHOLE_PLACE[q2]}. The question asks for the nearest ${place}.` });
  }
  try {
    const c = choices(rng, fmtInt(corr), items, (i) => { const v = corr + (i % 2 ? 1 : -1) * q * Math.ceil(i / 2); return v > 0 ? nearFor(prompt)(fmtInt(v), `Round to the nearest ${place}: look at the next digit only.`) : null; });
    return { type: 'mcq', prompt, ...c, solution, skill: SKILL.roundWhole };
  } catch { return null; }
}

/**
 * D3: which of these numbers rounds to R? (a second D3 shape, CLO review m01 item 7). The right
 * one starts with a different digit (4.27 rounds to 4.3); the wrong ones start with R's digits
 * but round up past it, sit exactly on the halfway point above, or sit just below the halfway point.
 */
function whichRoundsTo(rng) {
  for (;;) {
    const tenth = rng.chance(0.6);
    // in units of the shown numbers: hundredths (to the nearest tenth) or tenths (to the nearest whole)
    const R = tenth ? rng.int(11, 99) * 10 : rng.int(2, 30) * 10; // R in those units, a multiple of 10
    if (tenth && R % 100 === 0) continue;
    const p = tenth ? 2 : 1;
    const show = (v) => fxk(v, p, p === 2 ? 2 : 1);
    const sr = tenth ? fxk(R, 2, 1) : fmtInt(R / 10);
    const place = tenth ? 'tenth' : 'whole number';
    const right = R - rng.int(1, 4); // below R, from the halfway point up: rounds up to R
    const same = R + rng.int(6, 9); // starts like R but rounds up to the next one
    const half = R + 5; // exactly halfway: rounds up, away from R
    const under = R - rng.int(6, 9); // just below the lower halfway point: rounds down
    const prompt = `Which of these numbers rounds to ${sr} when it is rounded to the nearest ${place}?`;
    const solution = `${sr} is the rounded value of every number from ${show(R - 5)} up to (but not including) ${show(R + 5)}. ${show(right)} is in that range: the digit after the ${tenth ? 'tenths' : 'ones'} place is ${right % 10}, so it rounds up to ${sr}. Answer: ${show(right)}`;
    const items = [
      { text: show(same), code: 'ROUND-BOUND-SAME-DIGIT', why: `${show(same)} starts like ${sr}, but the next digit is ${same % 10}, so it rounds UP to ${tenth ? fxk(R + 10, 2, 1) : fmtInt(R / 10 + 1)}. Numbers a little below ${sr} can round to it too.` },
      { text: show(half), code: 'ROUND-BOUND-HALFWAY', why: `${show(half)} is exactly halfway, and halfway rounds UP, to ${tenth ? fxk(R + 10, 2, 1) : fmtInt(R / 10 + 1)}.` },
      { text: show(under), code: 'ROUND-WRONG-WAY', why: `The digit after the ${tenth ? 'tenths' : 'ones'} place in ${show(under)} is ${under % 10}, less than 5, so it rounds DOWN to ${tenth ? fxk(R - 10, 2, 1) : fmtInt(R / 10 - 1)}, not up to ${sr}.` },
    ];
    try { return { type: 'mcq', prompt, ...choices(rng, show(right), items, null), solution, marks: 2, skill: tenth ? SKILL.tenth : SKILL.whole }; } catch { /* draw again */ }
  }
}

function roundingBounds(rng) {
  if (rng.chance(0.4)) return whichRoundsTo(rng);
  for (;;) {
    const kind = rng.pick(['tenth', 'tenth', 'whole', 'big']);
    const small = rng.chance(0.5);
    let R; let step; let unit; let prompt; let show; let half; let skill; let placeName;
    if (kind === 'tenth') {
      R = rng.int(11, 199) * 10; step = 1; half = 5; // hundredths
      if (R % 100 === 0) continue;
      show = (v) => fxk(v, 2, 2);
      placeName = 'tenth';
      prompt = `A number has two decimal places. When it is rounded to the nearest tenth, the answer is ${fxk(R, 2, 1)}. What is the ${small ? 'SMALLEST' : 'LARGEST'} the number could be?`;
      skill = SKILL.tenth; unit = 10;
    } else if (kind === 'whole') {
      R = rng.int(3, 99) * 10; step = 1; half = 5; // tenths
      show = (v) => fxk(v, 1, 1);
      placeName = 'whole number';
      const thing = rng.pick(['A ribbon is measured to one decimal place, in cm. Rounded to the nearest whole number it is', 'A parcel is weighed to one decimal place, in kg. Rounded to the nearest whole number its mass is']);
      prompt = `${thing} ${R / 10}. What is the ${small ? 'SMALLEST' : 'LARGEST'} the measurement could be?`;
      skill = SKILL.whole; unit = 10;
    } else {
      const q = rng.pick([100, 1000, 1000, 10000]);
      R = rng.int(q === 10000 ? 2 : 11, q === 100 ? 99 : 99) * q;
      if (R > 999999) continue;
      step = 1; half = q / 2; unit = q;
      show = (v) => fmtInt(v);
      placeName = WHOLE_PLACE[q];
      const [noun, where] = rng.pick([['people', 'at a concert'], ['people', 'living in a town'], ['visitors', 'to Penang Hill in a month'], ['runners', 'in the KL marathon'], ['books', 'in a school library']]);
      prompt = `The number of ${noun} ${where} is ${fmtInt(R)}, rounded to the nearest ${placeName}. What is the ${small ? 'SMALLEST' : 'LARGEST'} number of ${noun} there could be?`;
      skill = SKILL.roundWhole;
    }
    const lo = R - half; const hi = R + half - step;
    const sr = (x) => (kind === 'tenth' ? fxk(x, 2, 1) : kind === 'whole' ? fmtInt(x / 10) : fmtInt(x));
    const ans = small ? lo : hi;
    const solution = small
      ? `Numbers from halfway between ${sr(R - unit)} and ${sr(R)} round up to ${sr(R)}. Halfway is ${show(lo)}, and halfway rounds up, so ${show(lo)} is the smallest. Answer: ${show(lo)}`
      : `Numbers below halfway between ${sr(R)} and ${sr(R + unit)} round down to ${sr(R)}. Halfway is ${show(R + half)}, which rounds up, so the largest is one step less: ${show(hi)}. Answer: ${show(hi)}`;
    const items = small ? [
      { text: show(R), code: 'ROUND-BOUND-SAME-DIGIT', why: `Numbers a little smaller than ${sr(R)} also round to it. Any number from ${show(lo)} upwards rounds up to ${sr(R)}.` },
      { text: show(lo - step), code: 'ROUND-BOUND-HALFWAY', why: `${show(lo - step)} is just below halfway, so it rounds down, not up to ${sr(R)}. The halfway number ${show(lo)} rounds up.` },
      { text: show(hi), code: 'BOUND-OTHER-END', why: `${show(hi)} is the LARGEST number that rounds to ${sr(R)}. The question asks for the smallest.` },
    ] : [
      { text: show(R + unit - step), code: 'ROUND-BOUND-SAME-DIGIT', why: `${show(R + unit - step)} is closer to ${sr(R + unit)}, so it rounds up. Only numbers below halfway (${show(R + half)}) round down to ${sr(R)}.` },
      { text: show(R + half), code: 'ROUND-BOUND-HALFWAY', why: `${show(R + half)} is exactly halfway, and halfway rounds UP, to ${sr(R + unit)}. The largest is one step less.` },
      { text: show(lo), code: 'BOUND-OTHER-END', why: `${show(lo)} is the SMALLEST number that rounds to ${sr(R)}. The question asks for the largest.` },
    ];
    try {
      if (kind === 'big' && rng.chance(0.4)) {
        const t = typedMisconceptions(show(ans), items, { code: 'ROUND-BOUND-HALFWAY', why: 'Find the halfway numbers on each side. Halfway rounds up.' });
        return { type: 'numeric', prompt, answer: numericAnswer(ans, [show(ans), String(ans)]), solution, ...t, marks: 2, skill };
      }
      return { type: 'mcq', prompt, ...choices(rng, show(ans), items, null), solution, marks: 2, skill };
    } catch { /* draw again */ }
  }
}

// ---------------------------------------------------------------- g09 compare and order decimals

/** n decimals (thousandths) sharing a whole part, with traps (0.8, 0.808, 0.81, 0.088). */
function decimalSet(rng, n, w) {
  for (let tries = 0; tries < 200; tries++) {
    const base = rng.int(1, 9);
    const pool = [
      base * 100, // 0.b
      base * 100 + rng.int(1, 9) * 10, // 0.bx
      (base - 1 >= 0 ? base - 1 : base) * 100 + rng.int(1, 9) * 10 + rng.int(1, 9), // 0.(b-1)xy
      rng.int(0, 9) * 10 + rng.int(1, 9), // 0.0xy
      base * 100 + rng.int(0, 9) * 10 + rng.int(1, 9), // 0.bxy
      rng.int(1, 9) * 100 + base * 10, // 0.xb
      base * 110, // 0.bb
      base * 100 + base, // 0.b0b
      base * 10 + base, // 0.0bb
    ].map((v) => w * 1000 + v);
    const set = [...new Set(rng.shuffle(pool))].filter((v) => v % 1000 !== 0).slice(0, n);
    if (set.length === n) return set;
  }
  return null;
}
const fracDigits = (t) => (t.split('.')[1] || '');

const compareOrder = {
  id: 'm01.compare-order', topicId: T, subtopicId: 'm01-s5', skill: SKILL.compare,
  title: 'Compare and order decimals (D1 largest/smallest; D2 order, true/false, race times; D3 numbers between, halfway)',
  difficulties: [1, 2, 3],
  check: { min: 0 },
  make(rng, d) {
    if (d === 3) return rng.chance(0.5) ? countBetween(rng) : halfway(rng);
    if (d === 2) { const k = rng.int(0, 2); if (k === 0) return orderSet(rng); if (k === 1) return trueFalseCompare(rng); return extreme(rng, true); }
    return extreme(rng, false);
  },
};

function extreme(rng, race) {
  for (;;) {
    // three numbers: the right one and the two her slips would pick, so every wrong option is a
    // named error (a fourth number from the list could only be a near miss already in the question)
    const w = race ? rng.int(13, 19) : rng.int(0, 12);
    const set = decimalSet(rng, 3, w);
    if (!set) continue;
    const texts = set.map((v) => fx(v, 3));
    const largest = race ? false : rng.chance(0.5);
    const best = largest ? Math.max(...set) : Math.min(...set);
    const correct = fx(best, 3);
    // her rules: digits after the point read as a whole number; or fewer places means bigger
    const asWhole = texts.map((t) => Number(fracDigits(t)));
    const len = texts.map((t) => fracDigits(t).length);
    const pickBy = (arr, wantMax) => { const m = wantMax ? Math.max(...arr) : Math.min(...arr); const idx = arr.map((x, i) => (x === m ? i : -1)).filter((i) => i >= 0); return idx.length === 1 ? texts[idx[0]] : null; };
    const longer = pickBy(asWhole, largest);
    const shorter = pickBy(len.map((l) => -l), largest);
    if (!longer || !shorter || longer === correct || shorter === correct || longer === shorter) continue;
    const people = rng.shuffle(['Siti', 'Priya', 'Aisha', 'Mei Lin', 'Lina', 'Omar', 'Arjun', 'Daniel']).slice(0, 3);
    const label = (t) => (race ? `${people[texts.indexOf(t)]} (${t} s)` : t);
    const prompt = race
      ? `Three friends ran 100 m on sports day. Their times were: ${texts.map((t, i) => `${people[i]} ${t} s`).join(', ')}. Who was the fastest?`
      : `Which number is the ${largest ? 'largest' : 'smallest'}: ${texts.slice(0, -1).join(', ')} or ${texts[texts.length - 1]}?`;
    const pad = set.map((v) => fxk(v, 3, 3));
    const solution = `${race ? 'The fastest runner takes the least time, so find the smallest number. ' : ''}Write every number with three decimal places: ${pad.join(', ')}. Compare the tenths first, then the hundredths, then the thousandths. The ${largest ? 'largest' : 'smallest'} is ${correct}. Answer: ${label(correct)}`;
    const distractors = [
      { text: label(longer), code: 'DEC-LONGER-BIGGER', why: `It looks like you read the digits after the point as whole numbers (${fracDigits(longer)} looks ${largest ? 'bigger' : 'smaller'} than ${fracDigits(correct)}). Compare place by place, with three decimal places: ${fxk(set[texts.indexOf(longer)], 3, 3)} and ${fxk(best, 3, 3)}.` },
      { text: label(shorter), code: 'DEC-SHORTER-BIGGER', why: `It looks like you thought the number with ${largest ? 'fewest' : 'most'} decimal places is the ${largest ? 'largest' : 'smallest'}. Write them all with three decimal places and compare: ${fxk(set[texts.indexOf(shorter)], 3, 3)} and ${fxk(best, 3, 3)}.` },
    ];
    try {
      return { type: 'mcq', prompt, ...choices(rng, label(correct), distractors, null, 3), solution, skill: SKILL.compare };
    } catch { /* draw again */ }
  }
}

function orderSet(rng) {
  for (;;) {
    const w = rng.int(0, 12);
    const n = rng.int(4, 5);
    const set = decimalSet(rng, n, w);
    if (!set) continue;
    const desc = rng.chance(0.4);
    const texts = set.map((v) => fx(v, 3));
    const sorted = [...set].sort((a, b) => (desc ? b - a : a - b)).map((v) => fx(v, 3));
    // her slip: order by the digits after the point read as whole numbers. Only ask when that gives a different order.
    const slip = [...texts].sort((a, b) => (desc ? Number(fracDigits(b)) - Number(fracDigits(a)) : Number(fracDigits(a)) - Number(fracDigits(b))));
    if (slip.join() === sorted.join()) continue;
    const prompt = `Put these numbers in order from ${desc ? 'LARGEST to smallest' : 'smallest to largest'}: ${texts.join(', ')}.`;
    const solution = `Write each number with three decimal places: ${set.map((v) => fxk(v, 3, 3)).join(', ')}. Now compare: ${sorted.join(desc ? ' > ' : ' < ')}. Answer: ${sorted.join(', ')}`;
    return {
      type: 'order', prompt, options: texts, answer: sorted.map((t) => texts.indexOf(t)), solution,
      misconceptions: { common: `It looks like you ordered the numbers by the digits after the point, as if they were whole numbers. Write them all with three decimal places (${fxk(set[0], 3, 3)}) and compare place by place.` },
      codes: { common: 'DEC-LONGER-BIGGER' }, skill: SKILL.order,
    };
  }
}

function trueFalseCompare(rng) {
  for (;;) {
    const w = rng.int(0, 20);
    const set = decimalSet(rng, 2, w);
    if (!set) continue;
    const [a, b] = set;
    const ta = fx(a, 3); const tb = fx(b, 3);
    const sym = rng.chance(0.5) ? '>' : '<';
    const truth = sym === '>' ? a > b : a < b;
    const slip = sym === '>' ? Number(fracDigits(ta)) > Number(fracDigits(tb)) : Number(fracDigits(ta)) < Number(fracDigits(tb));
    if (slip === truth) continue; // only ask when the "longer is bigger" slip gets it wrong
    const prompt = `True or false: ${ta} ${sym} ${tb}`;
    const solution = `Write both with three decimal places: ${fxk(a, 3, 3)} and ${fxk(b, 3, 3)}. Compare place by place from the tenths: ${a > b ? `${ta} > ${tb}` : `${ta} < ${tb}`}. So the statement is ${truth ? 'true' : 'false'}. Answer: ${truth ? 'true' : 'false'}`;
    return { type: 'truefalse', prompt, answer: truth, solution, misconceptions: { common: `It looks like you compared ${fracDigits(ta)} and ${fracDigits(tb)} as whole numbers. Compare the tenths first, then the hundredths.` }, codes: { common: 'DEC-LONGER-BIGGER' }, skill: SKILL.compare };
  }
}

function countBetween(rng) {
  for (;;) {
    const three = rng.chance(0.5);
    let lo; let hi; let p; let prompt; let ans; let solution;
    // counted in steps of 0.01 (or 0.001), with both ends written to that place, so a number like
    // 1.70 between 1.60 and 1.80 clearly counts (CLO review m01 item 1)
    if (!three) { // between a.b0 and a.c0, in hundredths
      const g = rng.int(1, 3); const a = rng.int(0, 20) * 10 + rng.int(0, 9);
      lo = a; hi = a + g; p = 1;
      ans = 10 * g - 1;
      prompt = `Count in hundredths (steps of 0.01). How many numbers are greater than ${fxk(lo * 10, 2, 2)} but less than ${fxk(hi * 10, 2, 2)}?`;
      solution = `Counting in steps of 0.01 from ${fxk(lo * 10, 2, 2)}: ${fxk(lo * 10 + 1, 2, 2)}, ${fxk(lo * 10 + 2, 2, 2)}, ... ${fxk(hi * 10 - 1, 2, 2)}. From ${fxk(lo * 10, 2, 2)} to ${fxk(hi * 10, 2, 2)} is ${10 * g} steps, and the end numbers do not count, so there are ${10 * g} - 1 = ${ans} numbers. Answer: ${ans}`;
    } else {
      const g = rng.int(1, 3); const a = rng.int(1, 999);
      if (a % 10 === 0 || (a + g) % 10 === 0) continue;
      lo = a; hi = a + g; p = 2;
      ans = 10 * g - 1;
      prompt = `Count in thousandths (steps of 0.001). How many numbers are greater than ${fxk(lo * 10, 3, 3)} but less than ${fxk(hi * 10, 3, 3)}?`;
      solution = `Counting in steps of 0.001 from ${fxk(lo * 10, 3, 3)}: ${fxk(lo * 10 + 1, 3, 3)}, ${fxk(lo * 10 + 2, 3, 3)}, ... ${fxk(hi * 10 - 1, 3, 3)}. From ${fxk(lo * 10, 3, 3)} to ${fxk(hi * 10, 3, 3)} is ${10 * g} steps, and the end numbers do not count, so there are ${10 * g} - 1 = ${ans} numbers. Answer: ${ans}`;
    }
    void p;
    const items = [
      { text: String(ans + 1), code: 'COUNT-ENDS', why: `It looks like you counted one of the end numbers. "Greater than" and "less than" leave out both ends.` },
      { text: String(ans + 2), code: 'COUNT-ENDS', why: 'It looks like you counted both end numbers. "Greater than" and "less than" leave them out.' },
    ];
    const t = typedMisconceptions(String(ans), items, { why: 'Count the steps from one end to the other, then leave out the end numbers.' });
    return { type: 'numeric', prompt, answer: numericAnswer(ans, [String(ans)]), solution, ...t, marks: 2, skill: SKILL.compare };
  }
}

function halfway(rng) {
  for (;;) {
    let a; let b; let p;
    if (rng.chance(0.5)) { a = rng.int(1, 199); b = a + 1; p = 1; } else { a = rng.int(10, 990); b = a + 2 * rng.int(1, 6); p = 2; if (a % 10 === 0 || b % 10 === 0) continue; }
    // work in units one place smaller
    const A = a * 10; const B = b * 10; const M = (A + B) / 2;
    const q = p + 1;
    const ans = fx(M, q);
    const prompt = `Which number is exactly halfway between ${fx(a, p)} and ${fx(b, p)}?`;
    const solution = `Write both with ${q} decimal places: ${fxk(A, q, q)} and ${fxk(B, q, q)}. The gap is ${fx(B - A, q)}, and half of it is ${fx((B - A) / 2, q)}. ${fxk(A, q, q)} + ${fx((B - A) / 2, q)} = ${ans}. Answer: ${ans}`;
    const items = [
      { text: fx((B - A) / 2, q), code: 'MID-HALF-DIFF', why: `${fx((B - A) / 2, q)} is half of the gap between the numbers. Add it to the smaller number to find the halfway point.` },
      { text: fx(B + (B - A) / 2, q), code: 'MID-WRONG-END', why: `${fx(B + (B - A) / 2, q)} is bigger than both numbers. Add half the gap to the SMALLER number.` },
      p === 1 ? { text: fx(A * 10 + 5, 3), code: 'PV-WRONG-PLACE', why: `This puts the 5 in the thousandths place. Halfway between ${fxk(A, q, q)} and ${fxk(B, q, q)} needs the 5 in the hundredths: ${ans}.` } : null,
    ];
    try { return { type: 'mcq', prompt, ...choices(rng, ans, items, (i) => nearFor(prompt)(fx(M + (i % 2 ? 1 : -1) * Math.ceil(i / 2), q), 'Write both numbers with one more decimal place, then find the middle.')), solution, marks: 2, skill: SKILL.compare }; } catch { /* draw again */ }
  }
}

// ---------------------------------------------------------------- g10 number line (diagram)

const LINES = [
  // labelled step and small step, in thousandths
  { step: 1000, minor: 100 },
  { step: 1000, minor: 200 },
  { step: 1000, minor: 250 },
  { step: 100, minor: 10 },
  { step: 100, minor: 20 },
  { step: 500, minor: 100 },
  { step: 10, minor: 1 },
  { step: 100, minor: 50 },
];

const numberLine = {
  id: 'm01.number-line', topicId: T, subtopicId: 'm01-s5', skill: SKILL.compare,
  title: 'Read a decimal from a number line (D1 steps of 0.1; D2 steps of 0.01, 0.02, 0.2, 0.25)',
  difficulties: [1, 2],
  check: { min: 0 },
  make(rng, d) {
    for (;;) {
      const L = d === 1 ? LINES[0] : rng.pick(LINES.slice(1));
      const nSteps = rng.int(2, Math.min(3, Math.floor(40 / (L.step / L.minor))));
      const start = rng.int(0, 30) * L.step;
      const end = start + nSteps * L.step;
      const k = rng.int(1, (end - start) / L.minor - 1);
      const v = start + k * L.minor;
      if (v % L.step === 0) continue;
      const left = Math.floor(v / L.step) * L.step;
      const j = (v - left) / L.minor; // small steps from the labelled number on the left
      const diagram = { type: 'numberLine', min: fx(start, 3), max: fx(end, 3), step: fx(L.step, 3), minorStep: fx(L.minor, 3), points: [{ at: fx(v, 3), label: 'A' }], alt: `A number line from ${fx(start, 3)} to ${fx(end, 3)} with labelled marks every ${fx(L.step, 3)} and smaller marks between. A point A is marked.` };
      const ans = fx(v, 3);
      const prompt = `What number is at point A on the number line?`;
      const perLabel = L.step / L.minor;
      const solution = `Between ${fx(left, 3)} and ${fx(left + L.step, 3)} there are ${perLabel} equal steps, so each small step is ${fx(L.step, 3)} ÷ ${perLabel} = ${fx(L.minor, 3)}. A is ${countOf(j, 'small step')} after ${fx(left, 3)}: ${fx(left, 3)} + ${j} x ${fx(L.minor, 3)} = ${ans}. Answer: ${ans}`;
      const wrong = L.step / 10 !== L.minor ? L.step / 10 : L.minor === 100 ? 10 : L.minor * 10;
      // every wrong option is a point on the drawn line, between its ends, and not on a labelled
      // mark (CLO review m01 item 6)
      const onLine = (x) => x > start && x < end && x % L.step !== 0;
      const items = [
        { text: fx(left + j * wrong, 3), code: 'SCALE-INTERVAL-WRONG', why: `It looks like you counted each small step as ${fx(wrong, 3)}. There are ${perLabel} steps between ${fx(left, 3)} and ${fx(left + L.step, 3)}, so each step is ${fx(L.minor, 3)}.`, x: left + j * wrong },
        { text: fx(v + L.minor, 3), code: 'NL-COUNT-LINES', why: `It looks like you counted the marks, including the one at ${fx(left, 3)}. Count the gaps (steps) instead.`, x: v + L.minor },
        { text: fx(left + L.step - j * L.minor, 3), code: 'NL-FROM-WRONG-END', why: `It looks like you counted ${countOf(j, 'step')} back from ${fx(left + L.step, 3)}. A is ${countOf(j, 'step')} AFTER ${fx(left, 3)}.`, x: left + L.step - j * L.minor },
      ].filter((it) => onLine(it.x)).map(({ x, ...it }) => it);
      const near = (i) => { const x = v + (i % 2 ? -1 : 1) * Math.ceil(i / 2) * L.minor; return onLine(x) && x !== v + L.minor ? nearMiss(fx(x, 3), 'Work out the size of one small step first, then count the steps from the labelled mark on the left.') : null; };
      try { return { type: 'mcq', prompt, ...choices(rng, ans, items, near), solution, diagram, skill: SKILL.compare }; } catch { /* draw again */ }
    }
  },
};

export default [digitValue, wordsToFigures, timesDivide, composeRegroup, rounding, compareOrder, numberLine];
