// m02 The number system: negative numbers (temperatures, counting past zero, ordering, the
// number halfway), factors, multiples, primes, HCF and LCM, divisibility tests, square and cube
// numbers. Patterns and ranges follow the CLO's generator guide (m02). Every wrong option is built
// by one named misconception and carries its code.

import { choices, typedMisconceptions, nearMiss, numericAnswer, fmtInt, gcd, lcm, countOf, valueOf } from './core.js';

const T = 'm02-number-system';
const SKILL = {
  back: 'counting back past zero', on: 'counting on past zero', compare: 'comparing negative numbers', order: 'ordering negative numbers',
  diff: 'difference between temperatures', line: 'number line reasoning with negative numbers',
  fm: 'factors and multiples', prime: 'prime numbers', hcf: 'highest common factor', lcm: 'lowest common multiple', common: 'common factors',
  div369: 'divisibility by 3, 6 and 9', divTests: 'divisibility tests', sq: 'square numbers', cube: 'cube numbers', sqcube: 'square and cube numbers',
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

const deg = (t) => `${fmtInt(t)} °C`;
/** "a, b, c or d" */
const orList = (arr) => `${arr.slice(0, -1).join(', ')} or ${arr[arr.length - 1]}`;
/** n tenths as text: -0.5, 2.5, -3. */
const tx = (n) => { const s = n < 0 ? '-' : ''; const a = Math.abs(n); return a % 10 ? `${s}${Math.floor(a / 10)}.${a % 10}` : `${s}${a / 10}`; };

// ---------------------------------------------------------------- g01 temperatures across zero

const PLACES = ['in Seoul', 'in Beijing', 'in Tokyo', 'in London', 'on a mountain top', 'in Moscow', 'at a ski resort', 'in Oslo'];
const TIMES = [['at night', 'in the morning'], ['at 6 am', 'at noon'], ['at midnight', 'at 8 am'], ['at noon', 'at midnight'], ['at 4 pm', 'at 10 pm']];

const temperature = {
  id: 'm02.temperature', topicId: T, subtopicId: 'm02-s1', skill: SKILL.back,
  title: 'Temperatures across zero: rise and fall (D1), difference or two changes (D2), changes every hour and the biggest difference (D3)',
  difficulties: [1, 2, 3],
  check: { min: -60, max: 60, integer: true },
  make(rng, d) {
    if (d === 3) return rng.chance(0.55) ? tempRate(rng) : tempCities(rng);
    if (d === 2) return rng.chance(0.55) ? tempDifference(rng) : tempTwoSteps(rng);
    for (;;) {
      const a = rng.int(-10, 15); const c = rng.int(2, 15);
      const rise = a < 0 ? rng.chance(0.7) : rng.chance(0.2);
      const r = rise ? a + c : a - c;
      if (a === 0 || r === 0 || Math.sign(a) === Math.sign(r)) continue;
      const [t1, t2] = rng.pick(TIMES); const where = rng.pick(PLACES);
      const prompt = `The temperature ${where} ${t1} is ${deg(a)}. ${rng.chance(0.5) ? `By ${t2.replace(/^(at|in) /, '')}` : `${t2[0].toUpperCase()}${t2.slice(1)}`} it has ${rise ? 'risen' : 'fallen'} by ${c} degrees. What is the temperature ${t2}?`;
      const toZero = Math.abs(a);
      const steps = `${countOf(toZero, 'step')} take${toZero === 1 ? 's' : ''} you to 0, and ${c - toZero} more ${c - toZero === 1 ? 'step takes' : 'steps take'} you to ${r}`;
      const solution = rise
        ? `Start at ${a} and count up ${c}. ${steps}. So ${a} + ${c} = ${r}. Answer: ${deg(r)}`
        : `Start at ${a} and count down ${c}. ${steps}. So ${a} - ${c} = ${r}. Answer: ${deg(r)}`;
      const items = [
        { text: deg(rise ? a - c : a + c), code: 'OP-SWAP', why: `It looks like you moved the wrong way. The temperature ${rise ? 'rose, so count up' : 'fell, so count down'}.` },
        { text: deg(-r), code: 'NEG-SIGN-DROP', why: `You found the right size, ${Math.abs(r)}, but the wrong sign. ${rise ? `Rising ${c} from ${a} passes 0 and goes above zero` : `Falling ${c} from ${a} passes 0 and goes below zero`}, so the answer is ${r}.` },
        { text: deg(rise ? r + 1 : r - 1), code: 'NEG-SKIP-ZERO', why: 'It looks like you did not count 0 as a step. Count every step on the number line, including the one to 0 and the one away from it.' },
        a < 0 && rise ? { text: deg(-a + c), code: 'NEG-SIGN-DROP', why: `It looks like you ignored the minus sign on ${a}. The temperature started ${-a} degrees BELOW zero.` } : null,
      ];
      try {
        return { type: 'mcq', prompt, ...choices(rng, deg(r), items, null), solution, skill: rise ? SKILL.on : SKILL.back };
      } catch { /* draw again */ }
    }
  },
};

function tempDifference(rng) {
  for (;;) {
    const both = rng.chance(0.3);
    let a; let b;
    if (both) { a = rng.int(-20, -3); b = rng.int(-15, -1); if (b <= a + 1) continue; } else { a = rng.int(-15, -1); b = rng.int(2, 32); }
    const where = rng.pick(PLACES); const [t1, t2] = rng.pick(TIMES.slice(0, 3));
    const prompt = `${t1[0].toUpperCase()}${t1.slice(1)} the temperature ${where} was ${deg(a)}. ${t2[0].toUpperCase()}${t2.slice(1)} it was ${deg(b)}. By how many degrees did the temperature rise?`;
    const ans = b - a;
    const solution = both
      ? `Both temperatures are below zero. Count up from ${a} to ${b}: ${b} - (${a}) = ${ans}. Answer: ${ans} °C`
      : `Count up from ${a} to 0: that is ${-a} degrees. Then from 0 up to ${b}: ${b} degrees. Altogether ${-a} + ${b} = ${ans}. Answer: ${ans} °C`;
    const items = both ? [
      { text: `${-a - b} °C`, code: 'NEG-DIFF-ADD-BOTH', why: `It looks like you added ${-a} and ${-b}. Both temperatures are below zero, so the gap between them is ${-a} - ${-b} = ${ans}.` },
      { text: `${-ans} °C`, code: 'NEG-SIGN-DROP', why: 'A rise in temperature is a positive number of degrees. Count the steps up from the lower temperature to the higher one.' },
    ] : [
      Math.abs(b + a) !== ans ? { text: `${Math.abs(b + a)} °C`, code: 'NEG-DIFF-ADD-SIGNS', why: `It looks like you worked out ${Math.max(b, -a)} - ${Math.min(b, -a)}. But ${a} °C is below zero: count ${-a} degrees up to 0, then ${b} more, so ${-a} + ${b} = ${ans}.` } : null,
      { text: `${ans - 1} °C`, code: 'NEG-SKIP-ZERO', why: 'It looks like you did not count the step to 0 (or the one away from it). Count the gap to 0 and the gap from 0, then add them.' },
      { text: `${b} °C`, code: 'ONE-STEP-ONLY', why: `${b} is only the rise from 0 up to ${b}. The temperature also rose ${-a} degrees from ${a} up to 0.` },
    ];
    try {
      if (rng.chance(0.4)) {
        const t = typedMisconceptions(String(ans), items.filter(Boolean).map((i) => ({ ...i, text: i.text.replace(' °C', '') })), { code: 'NEG-DIFF-ADD-SIGNS', why: 'Count the steps from the lower temperature up to 0, then from 0 up to the higher one, and add them.' });
        return { type: 'numeric', prompt: `${prompt} Give your answer as a number of degrees.`, answer: numericAnswer(ans, [String(ans), `${ans} °C`, `${ans} degrees`]), solution, ...t, skill: SKILL.diff };
      }
      return { type: 'mcq', prompt, ...choices(rng, `${ans} °C`, items, (i) => nearFor(prompt)(`${ans + i + 1} °C`, 'Count up to 0, then up from 0, and add the two parts.')), solution, skill: SKILL.diff };
    } catch { /* draw again */ }
  }
}

function tempTwoSteps(rng) {
  for (;;) {
    const a = rng.int(-8, 12); const c1 = rng.int(3, 12); const c2 = rng.int(3, 15);
    const up1 = rng.chance(0.5);
    const m = up1 ? a + c1 : a - c1; const r = up1 ? m - c2 : m + c2;
    if (Math.sign(a) === Math.sign(r) && Math.sign(m) === Math.sign(r)) continue;
    if (r === 0 || m === 0 || a === 0) continue;
    const where = rng.pick(PLACES);
    const prompt = `At 6 am the temperature ${where} was ${deg(a)}. By noon it had ${up1 ? 'risen' : 'fallen'} by ${c1} degrees. By midnight it had ${up1 ? 'fallen' : 'risen'} by ${c2} degrees from the noon temperature. What was the temperature at midnight?`;
    const solution = `Noon: ${a} ${up1 ? '+' : '-'} ${c1} = ${m}. Midnight: ${m} ${up1 ? '-' : '+'} ${c2} = ${r}. Answer: ${deg(r)}`;
    const items = [
      { text: deg(m), code: 'ONE-STEP-ONLY', why: `${deg(m)} is the temperature at noon. It then ${up1 ? 'fell' : 'rose'} by ${c2} degrees by midnight.` },
      { text: deg(up1 ? m + c2 : m - c2), code: 'OP-SWAP', why: `It looks like the second change went the wrong way. After noon the temperature ${up1 ? 'fell' : 'rose'}.` },
      { text: deg(-r), code: 'NEG-SIGN-DROP', why: `The size is right but the sign is wrong. ${m} ${up1 ? '-' : '+'} ${c2} = ${r}.` },
      { text: deg(up1 ? a - c1 + c2 : a + c1 - c2), code: 'OP-SWAP', why: 'It looks like both changes went the wrong way. Read again which change is a rise and which is a fall.' },
    ];
    try { return { type: 'mcq', prompt, ...choices(rng, deg(r), items, null), solution, marks: 2, skill: r < m ? SKILL.back : SKILL.on }; } catch { /* draw again */ }
  }
}

function tempRate(rng) {
  for (;;) {
    const rise = rng.chance(0.5);
    const a = rise ? rng.int(-24, -6) : rng.int(2, 15);
    const per = rng.int(2, 6); const h = rng.int(3, 8);
    const r = rise ? a + per * h : a - per * h;
    if (r === 0 || (Math.sign(r) === Math.sign(a) && rng.chance(0.7)) || r < -40 || r > 30) continue;
    if (Math.abs(rise ? a - per * h : a + per * h) > 55) continue;
    const thing = rise ? rng.pick(['A freezer is at', 'A block of ice is taken out of a freezer at', 'A cold room in a fish market is at']) : rng.pick(['At sunset the temperature on top of a mountain is', 'In the evening the temperature in a desert is', 'At 6 pm the temperature in Seoul is']);
    const prompt = rise
      ? `${thing} ${deg(a)}. ${/freezer is/.test(thing) ? 'It is switched off, and its' : /cold room/.test(thing) ? 'The power goes off, and its' : 'Its'} temperature rises by ${per} °C every hour. What is its temperature after ${h} hours?`
      : `${thing} ${deg(a)}. It falls by ${per} °C every hour. What is the temperature ${h} hours later?`;
    const solution = `In ${h} hours the temperature ${rise ? 'rises' : 'falls'} ${h} x ${per} = ${h * per} °C. ${a} ${rise ? '+' : '-'} ${h * per} = ${r}. Answer: ${deg(r)}`;
    const items = [
      { text: deg(rise ? a - per * h : a + per * h), code: 'OP-SWAP', why: `It looks like you moved the wrong way. The temperature ${rise ? 'rises, so add' : 'falls, so subtract'} the ${h * per} degrees.` },
      { text: deg(rise ? a + per : a - per), code: 'ONE-STEP-ONLY', why: `That is the temperature after 1 hour. In ${h} hours it ${rise ? 'rises' : 'falls'} ${h} x ${per} = ${h * per} degrees.` },
      { text: deg(-r), code: 'NEG-SIGN-DROP', why: `The size is right but the sign is wrong: ${a} ${rise ? '+' : '-'} ${h * per} = ${r}.` },
    ];
    try { return { type: 'mcq', prompt, ...choices(rng, deg(r), items, null), solution, marks: 2, skill: rise ? SKILL.on : SKILL.back }; } catch { /* draw again */ }
  }
}

const CITIES = ['Oslo', 'Seoul', 'Tokyo', 'Moscow', 'Penang', 'Kuala Lumpur', 'Beijing', 'London', 'Ottawa', 'Helsinki'];
function tempCities(rng) {
  for (;;) {
    const names = rng.sample(CITIES, 5);
    const temps = names.map((c) => (c === 'Penang' || c === 'Kuala Lumpur' ? rng.int(26, 34) : rng.int(-20, 10)));
    if (new Set(temps).size !== 5) continue;
    const neg = temps.filter((t) => t < 0);
    if (neg.length < 2) continue;
    const hi = Math.max(...temps); const lo = Math.min(...temps);
    if (hi <= 0) continue;
    const ans = hi - lo;
    const closest = neg.reduce((x, y) => (Math.abs(y) < Math.abs(x) ? y : x));
    const list = names.map((c, i) => `${c} ${deg(temps[i])}`).join(', ');
    const prompt = `One morning the temperatures in five cities were: ${list}. What is the difference between the highest and the lowest temperature?`;
    const solution = `The highest is ${deg(hi)} and the lowest is ${deg(lo)} (the negative number furthest from zero). From ${lo} up to 0 is ${-lo} degrees, and from 0 up to ${hi} is ${hi} degrees: ${-lo} + ${hi} = ${ans}. Answer: ${ans} °C`;
    const items = [
      { text: `${Math.abs(hi + lo)} °C`, code: 'NEG-DIFF-ADD-SIGNS', why: `It looks like you worked out ${Math.max(hi, -lo)} - ${Math.min(hi, -lo)}. ${lo} °C is below zero, so count ${-lo} up to 0 and then ${hi} more: ${-lo} + ${hi}.` },
      { text: `${hi - closest} °C`, code: 'NEG-ORDER', why: `It looks like you took ${deg(closest)} as the lowest. ${deg(lo)} is colder: the further below zero, the lower the temperature.` },
    ];
    try {
      if (rng.chance(0.4)) {
        const t = typedMisconceptions(String(ans), items.map((i) => ({ ...i, text: i.text.replace(' °C', '') })), { code: 'NEG-DIFF-ADD-SIGNS', why: 'Find the highest and the lowest temperature, then count the steps up to 0 and from 0.' });
        return { type: 'numeric', prompt: `${prompt} Give your answer as a number of degrees.`, answer: numericAnswer(ans, [String(ans), `${ans} °C`, `${ans} degrees`]), solution, ...t, marks: 2, skill: SKILL.diff };
      }
      return { type: 'mcq', prompt, ...choices(rng, `${ans} °C`, items, (i) => nearFor(prompt)(`${ans + (i % 2 ? i : -i)} °C`, 'Find the highest and lowest first, then count up to 0 and on from 0.')), solution, marks: 2, skill: SKILL.diff };
    } catch { /* draw again */ }
  }
}

// ---------------------------------------------------------------- g03 sequences across zero

const countPastZero = {
  id: 'm02.count-past-zero', topicId: T, subtopicId: 'm02-s1', skill: SKILL.back,
  title: 'Count on or back past zero in steps (D1 whole steps 2-7; D2 steps of 0.5, 1.5, 2.5 or a missing term)',
  difficulties: [1, 2],
  check: { min: -60, max: 60 },
  make(rng, d) {
    for (;;) {
      const step = d === 1 ? rng.int(2, 9) * 10 : rng.pick([15, 25, 35, 45, 80, 90, 110, 120]); // tenths
      const unit = step % 10 ? 5 : 10;
      const up = rng.chance(0.5);
      const len = rng.int(3, 6); // terms shown before the one asked for
      const ask = d === 2 && rng.chance(0.4) ? rng.int(1, len - 1) : len; // index of the hidden term
      // the hidden term is the first one past zero
      const k = rng.int(1, Math.floor((step - 1) / unit));
      const crossing = (up ? 1 : -1) * k * unit;
      const terms = Array.from({ length: (ask === len ? len : len + 1) + (ask === len ? 1 : 0) }, (_, i) => crossing + (i - ask) * (up ? step : -step));
      const prev = terms[ask - 1];
      if (Math.abs(terms[0]) > 600 || Math.abs(terms[terms.length - 1]) > 600) continue;
      const ans = terms[ask];
      // the test page reads -0.5 as a 'negative zero', so keep every value away from (-1, 0)
      if ([ans, -ans, ans + unit, ans - unit, up ? prev - step : prev + step].some((x) => x < 0 && x > -10)) continue;
      const shown = terms.map((t, i) => (i === ask ? '?' : tx(t)));
      const seq = ask === len ? `${shown.slice(0, len).join(', ')}, ...` : `${shown.join(', ')}`;
      const prompt = ask === len ? `What is the next number in this sequence? ${seq}` : `Find the missing number in this sequence: ${seq}`;
      const solution = `The sequence ${up ? 'goes up' : 'goes down'} by ${tx(step)} each time. ${tx(prev)} ${up ? '+' : '-'} ${tx(step)} = ${tx(ans)}: count ${tx(Math.abs(prev))} to 0, then ${tx(Math.abs(ans))} more. Answer: ${tx(ans)}`;
      const items = [
        { text: tx(-ans), code: 'NEG-SIGN-DROP', why: `The size is right but the sign is wrong. After passing 0 the numbers are ${up ? 'above' : 'below'} zero: ${tx(ans)}.` },
        { text: tx(up ? ans + unit : ans - unit), code: 'NEG-SKIP-ZERO', why: `It looks like you did not count 0 as a step. From ${tx(prev)}, count ${tx(Math.abs(prev))} to 0, then ${tx(step - Math.abs(prev))} more.` },
        { text: tx(up ? prev - step : prev + step), code: 'OP-SWAP', why: `The sequence ${up ? 'goes up' : 'goes down'}, so ${up ? 'add' : 'subtract'} ${tx(step)}.` },
      ];
      try {
        if (rng.chance(0.35)) {
          const t = typedMisconceptions(tx(ans), items, { code: 'NEG-SKIP-ZERO', why: 'Count on or back one step at a time on a number line, including 0.' });
          return { type: 'numeric', prompt, answer: numericAnswer(ans / 10, [tx(ans)]), solution, ...t, skill: up ? SKILL.on : SKILL.back };
        }
        return { type: 'mcq', prompt, ...choices(rng, tx(ans), items, null), solution, skill: up ? SKILL.on : SKILL.back };
      } catch { /* draw again */ }
    }
  },
};

// ---------------------------------------------------------------- g02 comparing and ordering negative numbers

const compareNegatives = {
  id: 'm02.compare-negatives', topicId: T, subtopicId: 'm02-s1', skill: SKILL.compare,
  title: 'Compare and order negative numbers (D1 coldest / smallest, true or false; D2 order lists with halves)',
  difficulties: [1, 2],
  check: { min: -60, max: 60 },
  make(rng, d) {
    for (;;) {
      if (rng.chance(d === 1 ? 0.3 : 0.25)) {
        // in tenths; D2 uses halves so it is harder than D1 (CLO review m02 item 4)
        const draw = () => -(rng.int(1, 20) * 10 + (d === 2 && rng.chance(0.7) ? 5 : 0));
        const a = draw(); const b = draw();
        if (a === b || (d === 2 && a % 10 === 0 && b % 10 === 0)) continue;
        const sym = rng.pick(['>', '<']);
        const truth = sym === '>' ? a > b : a < b;
        const prompt = `True or false: ${tx(a)} ${sym} ${tx(b)}`;
        const solution = `On a number line, ${tx(Math.max(a, b))} is closer to zero, so it is greater: ${tx(Math.max(a, b))} > ${tx(Math.min(a, b))}. The statement is ${truth ? 'true' : 'false'}. Answer: ${truth ? 'true' : 'false'}`;
        return { type: 'truefalse', prompt, answer: truth, solution, misconceptions: { common: `It looks like you compared ${tx(-a)} and ${tx(-b)} without the minus signs. With negative numbers, the one further below zero is smaller.` }, codes: { common: 'NEG-ORDER' }, skill: SKILL.compare };
      }
      if (d === 2 && rng.chance(0.55)) {
        const n = 5;
        const vals = new Set();
        while (vals.size < n) vals.add(rng.chance(0.4) ? rng.int(-9, 9) * 10 + 5 * (rng.chance(0.5) ? 1 : -1) : rng.int(-15, 10) * 10);
        const arr = [...vals];
        if (arr.filter((x) => x < 0).length < 3) continue;
        const desc = rng.chance(0.35);
        const texts = arr.map(tx);
        const sorted = [...arr].sort((x, y) => (desc ? y - x : x - y)).map(tx);
        const prompt = `Put these numbers in order from ${desc ? 'LARGEST to smallest' : 'smallest to largest'}: ${texts.join(', ')}.`;
        const solution = `Negative numbers are below zero; the further below zero, the smaller the number. ${desc ? 'Largest to smallest' : 'Smallest to largest'}: ${sorted.join(', ')}. Answer: ${sorted.join(', ')}`;
        return { type: 'order', prompt, options: texts, answer: sorted.map((t) => texts.indexOf(t)), solution, misconceptions: { common: 'It looks like you ordered the negative numbers by their size without the minus sign. -8 is smaller than -2, because it is further below zero.' }, codes: { common: 'NEG-ORDER' }, skill: SKILL.order };
      }
      // which is the coldest / warmest (or smallest / largest)?
      const temps = rng.chance(0.5);
      const half = d === 2;
      const set = new Set();
      while (set.size < 4) set.add(set.size < 2 ? -rng.int(1, 20) * 10 - (half && rng.chance(0.5) ? 5 : 0) : rng.int(-20, 15) * 10);
      const arr = [...set];
      const neg = arr.filter((x) => x < 0);
      if (neg.length < 2 || !arr.some((x) => x > 0)) continue;
      const smallest = rng.chance(0.65);
      if (!smallest && arr.filter((x) => x > 0).length < 2) continue;
      const ans = smallest ? Math.min(...arr) : Math.max(...arr);
      const show = (x) => (temps ? `${tx(x)} °C` : tx(x));
      const items = [];
      if (smallest) {
        const closest = neg.reduce((x, y) => (Math.abs(y) < Math.abs(x) ? y : x));
        items.push({ text: show(closest), code: 'NEG-ORDER', why: `It looks like you thought ${tx(closest)} is smaller than ${tx(ans)} because ${tx(-closest)} is smaller than ${tx(-ans)}. ${tx(ans)} is further below zero, so it is ${temps ? 'colder' : 'smaller'}.` });
        const nearest = arr.reduce((x, y) => (Math.abs(y) < Math.abs(x) ? y : x));
        if (nearest >= 0) items.push({ text: show(nearest), code: 'NEG-SIGN-DROP', why: `${tx(nearest)} is the number closest to zero, but every negative number is ${temps ? 'colder' : 'smaller'} than it. Look at the minus signs.` });
      } else {
        const far = neg.reduce((x, y) => (Math.abs(y) > Math.abs(x) ? y : x));
        if (-far <= ans) continue; // the NEG-ORDER trap must be there
        items.push({ text: show(far), code: 'NEG-ORDER', why: `It looks like you read ${tx(far)} as ${tx(-far)}. ${tx(far)} is far BELOW zero, so it is the ${temps ? 'coldest' : 'smallest'}, not the ${temps ? 'warmest' : 'largest'}.` });
      }
      for (const x of arr) if (x !== ans && !items.some((it) => it.text === show(x))) items.push(nearMiss(show(x), `Picture the numbers on a number line: ${temps ? 'warmer' : 'larger'} numbers are further to the right.`));
      const word = temps ? (smallest ? 'coldest' : 'warmest') : (smallest ? 'smallest' : 'largest');
      // the numbers to choose from are the options (not repeated in the prompt)
      const prompt = temps ? `Which of these temperatures is the ${word}?` : `Which of these numbers is the ${word}?`;
      const solution = `On a number line, numbers get ${smallest ? 'smaller to the left' : 'larger to the right'}. Negative numbers are below zero, and the further below zero, the smaller. The ${word} is ${show(ans)}. Answer: ${show(ans)}`;
      try { return { type: 'mcq', prompt, ...choices(rng, show(ans), items, null), solution, skill: SKILL.compare }; } catch { /* draw again */ }
    }
  },
};

// ---------------------------------------------------------------- g04 the number halfway

const midpoint = {
  id: 'm02.midpoint', topicId: T, subtopicId: 'm02-s1', skill: SKILL.line,
  title: 'The number exactly halfway between two numbers on a number line, at least one negative',
  difficulties: [3],
  check: { min: -60, max: 60, integer: true },
  make(rng) {
    for (;;) {
      const a = rng.int(-20, 10); const b = rng.int(a + 4, 20);
      if ((b - a) % 2 || a >= 0 || b === 0) continue;
      const m = (a + b) / 2; const h = (b - a) / 2;
      if (m === 0) continue;
      const ctx = rng.int(0, 2);
      const prompt = ctx === 0 ? `Which number is exactly halfway between ${a} and ${b} on a number line?`
        : ctx === 1 ? `The temperature at midnight was ${deg(a)} and at noon it was ${deg(b)}. At 6 am it was exactly halfway between the two. What was the temperature at 6 am?`
          : `On a number line, point P is at ${a} and point Q is at ${b}. Point M is exactly halfway between P and Q. What number is M at?`;
      const u = ctx === 1 ? ' °C' : '';
      const show = (x) => `${x}${u}`;
      const solution = `The distance from ${a} to ${b} is ${b} - (${a}) = ${b - a}. Half of it is ${h}. Halfway is ${h} more than the smaller number: ${a} + ${h} = ${m}. Check: ${m} + ${h} = ${b}. Answer: ${show(m)}`;
      const items = [
        { text: show(h), code: 'MID-HALF-DIFF', why: `${h} is half of the distance between the numbers. Add it to the smaller number: ${a} + ${h}.` },
        { text: show(b + h), code: 'MID-WRONG-END', why: `${b + h} is not between ${a} and ${b}. Add half the distance to the SMALLER number, ${a}.` },
        { text: show(a - h), code: 'MID-WRONG-END', why: `${a - h} is not between ${a} and ${b}. Start at ${a} and move ${h} UP.` },
        { text: show(-m), code: 'NEG-SIGN-DROP', why: `The size is right but the sign is wrong: ${a} + ${h} = ${m}.` },
      ];
      try {
        const it = rng.shuffle(items);
        return { type: 'mcq', prompt, ...choices(rng, show(m), it, null), solution, marks: 2 };
      } catch { /* draw again */ }
    }
  },
};

// ---------------------------------------------------------------- g05 factors, multiples, primes

const PRIMES = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97];
const ODD_COMPOSITE = [9, 15, 21, 25, 27, 33, 35, 39, 45, 49, 51, 55, 57, 63, 65, 69, 75, 77, 81, 85, 87, 91, 93, 95, 99];
const isPrime = (n) => PRIMES.includes(n);
const factorsOf = (n) => Array.from({ length: n }, (_, i) => i + 1).filter((k) => n % k === 0);

const factorsPrimes = {
  id: 'm02.factors-primes', topicId: T, subtopicId: 'm02-s2', skill: SKILL.fm,
  title: 'Factors, multiples and primes (D1 pick one; D2 select all, common factors; D3 number riddles)',
  difficulties: [1, 2, 3],
  check: { min: 0 },
  make(rng, d) {
    if (d === 3) return riddle(rng);
    if (d === 2) { const k = rng.int(0, 2); return k === 0 ? selectFactors(rng) : k === 1 ? selectPrimes(rng) : commonFactor(rng); }
    const k = rng.int(0, 2);
    return k === 0 ? whichMultiple(rng) : k === 1 ? whichPrime(rng) : whichFactor(rng);
  },
};

function whichMultiple(rng) {
  for (;;) {
    const n = rng.int(3, 12); const k = rng.int(3, 12);
    const ans = n * k;
    const items = [];
    if (n <= 9) { const t = rng.int(1, 9) * 10 + n; if (t % n) items.push({ text: String(t), code: 'MULT-LAST-DIGIT', why: `${t} ends in ${n}, but that does not make it a multiple of ${n}: ${t} ÷ ${n} is not a whole number.` }); }
    const f = factorsOf(n).filter((x) => x > 1 && x < n);
    if (f.length) items.push({ text: String(rng.pick(f)), code: 'FACTOR-MULTIPLE-SWAP', why: `That is a factor of ${n} (it divides into ${n}). A multiple of ${n} is in the ${n} times table, like ${n}, ${2 * n}, ${3 * n}.` });
    const other = rng.intNot(3, 12, [n]); const om = other * rng.int(3, 12);
    if (om % n) items.push({ text: String(om), code: 'NEAR-MISS', why: `Not quite: ${om} is in the ${other} times table, not the ${n} times table. Check by dividing by ${n}.` });
    items.push(nearMiss(String(ans + 1), `Check by dividing by ${n}: a multiple divides exactly.`));
    const solution = `A multiple of ${n} is in the ${n} times table. ${ans} = ${n} x ${k}, so ${ans} is a multiple of ${n}. Answer: ${ans}`;
    try { const c = choices(rng, String(ans), items, null); return { type: 'mcq', prompt: `Which of these numbers is a multiple of ${n}?`, ...c, solution, skill: SKILL.fm }; } catch { /* draw again */ }
  }
}

function whichPrime(rng) {
  const p = rng.pick(PRIMES.filter((x) => x > 10));
  const odd = rng.sample(ODD_COMPOSITE.filter((x) => Math.abs(x - p) < 40), 3);
  const items = [
    ...odd.slice(0, 2).map((x) => ({ text: String(x), code: 'PRIME-ODD', why: `${x} is odd, but it is not prime: ${x} = ${factorsOf(x)[1]} x ${x / factorsOf(x)[1]}.` })),
    rng.chance(0.5) ? { text: '1', code: 'PRIME-ONE', why: '1 is not a prime number. A prime has exactly two factors (1 and itself), and 1 has only one factor.' } : { text: String(odd[2]), code: 'PRIME-ODD', why: `${odd[2]} is odd, but it is not prime: ${odd[2]} = ${factorsOf(odd[2])[1]} x ${odd[2] / factorsOf(odd[2])[1]}.` },
  ];
  const solution = `A prime number has exactly two factors: 1 and itself. ${p} cannot be divided exactly by 2, 3, 5 or 7, so its only factors are 1 and ${p}. Answer: ${p}`;
  const c = choices(rng, String(p), items, null);
  return { type: 'mcq', prompt: 'Which of these is a prime number?', ...c, solution, skill: SKILL.prime };
}

function whichFactor(rng) {
  for (;;) {
    const N = rng.int(12, 96);
    const fs = factorsOf(N).filter((x) => x > 2 && x < N);
    if (fs.length < 2) continue;
    const f = rng.pick(fs);
    const items = [
      { text: String(2 * N), code: 'FACTOR-MULTIPLE-SWAP', why: `${2 * N} is a multiple of ${N}, not a factor. A factor divides exactly INTO ${N}, so it cannot be bigger than ${N}.` },
    ];
    const nf = Array.from({ length: 12 }, (_, i) => i + 3).filter((x) => N % x && x < N);
    for (const x of rng.sample(nf, 2)) items.push(nearMiss(String(x), `Check by dividing: ${N} ÷ ${x} is not a whole number.`));
    const prompt = `Which number is a factor of ${N}?`;
    const solution = `A factor of ${N} divides into ${N} exactly. ${N} ÷ ${f} = ${N / f}, so ${f} is a factor of ${N}. Answer: ${f}`;
    try { return { type: 'mcq', prompt, ...choices(rng, String(f), items, null), solution, skill: SKILL.fm }; } catch { /* draw again */ }
  }
}

function selectFactors(rng) {
  for (;;) {
    const N = rng.int(12, 100);
    const fs = factorsOf(N);
    if (fs.length < 6) continue;
    const right = rng.sample(fs.filter((x) => x !== N), rng.int(3, 4));
    const wrong = [{ x: 2 * N, code: 'FACTOR-MULTIPLE-SWAP', why: `${2 * N} is a multiple of ${N}, not a factor. Factors of ${N} are never bigger than ${N}.` }];
    const nf = Array.from({ length: Math.min(N - 1, 30) }, (_, i) => i + 2).filter((x) => N % x);
    for (const x of rng.sample(nf, 2)) wrong.push({ x, code: 'NEAR-MISS', why: `Not quite: ${x} is not a factor. ${N} ÷ ${x} = ${Math.floor(N / x)} remainder ${N % x}.` });
    const all = rng.shuffle([...right.map((x) => ({ x, ok: true })), ...wrong]);
    const options = all.map((o) => String(o.x));
    const answer = all.map((o, i) => (o.ok ? i : -1)).filter((i) => i >= 0);
    const misconceptions = {}; const codes = {};
    all.forEach((o, i) => { if (!o.ok) { misconceptions[String(i)] = o.why; codes[String(i)] = o.code; } });
    misconceptions.common = `Find the factors in pairs that multiply to ${N}: ${fs.filter((x) => x * x <= N).map((x) => `${x} x ${N / x}`).join(', ')}.`;
    codes.common = 'FACTOR-MULTIPLE-SWAP';
    const prompt = `Select ALL the factors of ${N} in this list: ${options.join(', ')}.`;
    const solution = `List the factor pairs of ${N}: ${fs.filter((x) => x * x <= N).map((x) => `${x} x ${N / x}`).join(', ')}. From the list, the factors are ${right.slice().sort((a, b) => a - b).join(', ')}. Answer: ${right.slice().sort((a, b) => a - b).join(', ')}`;
    return { type: 'multi', prompt, options, answer, solution, misconceptions, codes, marks: 2, skill: SKILL.fm };
  }
}

function selectPrimes(rng) {
  const ps = rng.sample(PRIMES, rng.int(2, 3));
  const wrong = rng.sample(ODD_COMPOSITE, 2).map((x) => ({ x, code: 'PRIME-ODD', why: `${x} is odd but not prime: it divides by ${factorsOf(x)[1]}.` }));
  if (!ps.includes(2) && rng.chance(0.5)) wrong.push({ x: rng.pick([4, 6, 8, 10, 12, 14]), code: 'NEAR-MISS', why: 'Not quite: an even number bigger than 2 is never prime, because it divides by 2.' });
  wrong.push({ x: 1, code: 'PRIME-ONE', why: '1 is not prime. A prime number has exactly two factors, and 1 has only one.' });
  const all = rng.shuffle([...ps.map((x) => ({ x, ok: true })), ...wrong]);
  const options = all.map((o) => String(o.x));
  const answer = all.map((o, i) => (o.ok ? i : -1)).filter((i) => i >= 0);
  const misconceptions = {}; const codes = {};
  all.forEach((o, i) => { if (!o.ok) { misconceptions[String(i)] = o.why; codes[String(i)] = o.code; } });
  misconceptions.common = 'A prime number has exactly two factors: 1 and itself. Check each number by dividing by 2, 3, 5 and 7.';
  codes.common = 'PRIME-ODD';
  const sorted = ps.slice().sort((a, b) => a - b);
  const solution = `Check each number for factors other than 1 and itself. ${wrong.map((w) => (w.x === 1 ? '1 has only one factor' : `${w.x} = ${factorsOf(w.x)[1]} x ${w.x / factorsOf(w.x)[1]}`)).join('; ')}. The primes are ${sorted.join(', ')}. Answer: ${sorted.join(', ')}`;
  return { type: 'multi', prompt: `Select ALL the prime numbers in this list: ${options.join(', ')}.`, options, answer, solution, misconceptions, codes, marks: 2, skill: SKILL.prime };
}

function commonFactor(rng) {
  for (;;) {
    const h = rng.int(4, 15); const p = rng.int(2, 7); const q = rng.int(2, 9);
    if (p === q || gcd(p, q) !== 1) continue;
    const a = h * p; const b = h * q;
    if (b > 120 || a > 120) continue;
    const cfs = factorsOf(h).filter((x) => x > 1);
    const f = rng.pick(cfs);
    const onlyA = factorsOf(a).filter((x) => b % x && x > 1);
    const onlyB = factorsOf(b).filter((x) => a % x && x > 1);
    if (!onlyA.length || !onlyB.length) continue;
    const xa = rng.pick(onlyA); const xb = rng.pick(onlyB);
    const items = [
      { text: String(xa), code: 'ONE-CONDITION-ONLY', why: `${xa} is a factor of ${a}, but not of ${b}. A common factor must divide both numbers.` },
      { text: String(xb), code: 'ONE-CONDITION-ONLY', why: `${xb} is a factor of ${b}, but not of ${a}. A common factor must divide both numbers.` },
      { text: String(lcm(a, b)), code: 'FACTOR-MULTIPLE-SWAP', why: `${lcm(a, b)} is a common MULTIPLE of ${a} and ${b}. A common factor divides into both numbers.` },
    ];
    const prompt = `Which number is a common factor of ${a} and ${b}?`;
    const solution = `A common factor divides exactly into both numbers. ${a} ÷ ${f} = ${a / f} and ${b} ÷ ${f} = ${b / f}, so ${f} is a common factor. Answer: ${f}`;
    try { return { type: 'mcq', prompt, ...choices(rng, String(f), items, null), solution, skill: SKILL.common }; } catch { /* draw again */ }
  }
}

const CLUES = [
  { make: (rng) => { const F = rng.int(30, 200); return { test: (x) => F % x === 0, text: `a factor of ${F}`, not: (x) => `${x} is not a factor of ${F} (${F} ÷ ${x} is not a whole number)`, yes: (x) => `${F} ÷ ${x} = ${F / x}` }; } },
  { make: (rng) => { const k = rng.int(4, 9); return { test: (x) => x % k === 1, text: `1 more than a multiple of ${k}`, not: (x) => `${x} is not 1 more than a multiple of ${k} (${x} ÷ ${k} has remainder ${x % k})`, yes: (x) => `${x} = ${(x - 1) / k} x ${k} + 1` }; } },
  { make: (rng) => { const t = rng.int(5, 15); return { test: (x) => String(x).split('').reduce((a, c) => a + Number(c), 0) === t, text: `a number whose digits add up to ${t}`, not: (x) => `the digits of ${x} add up to ${String(x).split('').reduce((a, c) => a + Number(c), 0)}, not ${t}`, yes: (x) => `${String(x).split('').join(' + ')} = ${t}` }; } },
];
// the first clue: a multiple of m, a prime number or a square number (CLO review m02 item 3: more than one riddle shape)
const FIRST = [
  (rng) => { const m = rng.int(3, 9); return { test: (x) => x % m === 0, text: `a multiple of ${m}`, list: `Multiples of ${m}`, notIt: (x) => `it is not a multiple of ${m}` }; },
  () => ({ test: isPrime, text: 'a prime number', list: 'Prime numbers', notIt: (x) => `it is not prime (it divides by ${factorsOf(x)[1]})` }),
  () => ({ test: (x) => Number.isInteger(Math.sqrt(x)), text: 'a square number', list: 'Square numbers', notIt: () => 'it is not a square number' }),
];

function riddle(rng) {
  for (;;) {
    const width = rng.pick([10, 10, 20]);
    const lo = rng.int(1, 9) * 10; const hi = lo + width;
    if (hi > 100) continue;
    const first = rng.pick([0, 0, 1, 1, 2]);
    const f = FIRST[first](rng);
    const clue = CLUES[first === 2 ? rng.pick([0, 2]) : rng.pick([0, 1, 2, 0, 2])].make(rng);
    const fits = (x) => f.test(x) && clue.test(x);
    const range = Array.from({ length: width - 1 }, (_, i) => lo + 1 + i);
    const sols = range.filter(fits);
    if (sols.length !== 1) continue;
    const ans = sols[0];
    const onlyM = range.filter((x) => f.test(x) && !clue.test(x));
    const onlyC = range.filter((x) => clue.test(x) && !f.test(x));
    if (!onlyM.length) continue;
    const prompt = `I am a number between ${lo} and ${hi}. I am ${f.text}, and I am ${clue.text}. What number am I?`;
    const solution = `${f.list} between ${lo} and ${hi}: ${range.filter((x) => f.test(x)).join(', ')}. Check the other clue for each one: only ${ans} works (${clue.yes(ans)}). Answer: ${ans}`;
    const items = [
      ...onlyM.map((x) => ({ text: String(x), code: 'ONE-CONDITION-ONLY', why: `${x} is ${f.text}, but ${clue.not(x)}. Check both clues.` })),
      ...onlyC.map((x) => ({ text: String(x), code: 'ONE-CONDITION-ONLY', why: `${x} fits the second clue, but ${f.notIt(x)}. Check both clues.` })),
    ];
    try { return { type: 'mcq', prompt, ...choices(rng, String(ans), rng.shuffle(items), (i) => { const x = lo + 1 + ((ans - lo - 1 + i) % (width - 1)); return x !== ans && !fits(x) ? nearFor(prompt)(String(x), `Check both clues: ${f.text} AND ${clue.text}.`) : null; }), solution, marks: 2, skill: first === 1 ? SKILL.prime : SKILL.fm }; } catch { /* draw again */ }
  }
}

// ---------------------------------------------------------------- g06, g07 HCF and LCM

/** Two numbers h x p and h x q with HCF h (p and q coprime). */
function pairWithHcf(rng, maxN, hMin = 2, hMax = 12) {
  for (;;) {
    const h = rng.int(hMin, hMax); const p = rng.int(1, 9); const q = rng.int(2, 9);
    if (p >= q || gcd(p, q) !== 1) continue;
    const a = h * p; const b = h * q;
    if (b > maxN || a < 4) continue;
    return { a, b, h, l: h * p * q };
  }
}
const lowerCommonFactor = (h) => Math.max(...factorsOf(h).filter((x) => x < h));

const BEADS = [
  { thing: 'bracelets', a: 'red beads', b: 'blue beads', who: true },
  { thing: 'party bags', a: 'sweets', b: 'stickers', who: true },
  { thing: 'gift boxes', a: 'kuih', b: 'mandarin oranges', who: true },
  { thing: 'teams', a: 'girls', b: 'boys', who: true },
];

const hcfLcm = {
  id: 'm02.hcf-lcm', topicId: T, subtopicId: 'm02-s2', skill: SKILL.hcf,
  title: 'Highest common factor and lowest common multiple (D2 two numbers; D3 word problems: buses, lights, beads, packs)',
  difficulties: [2, 3],
  check: { min: 0, integer: true },
  make(rng, d) {
    for (;;) {
      const hcfQ = rng.chance(0.5);
      if (d === 2) {
        const { a, b, h, l } = pairWithHcf(rng, 60);
        // neither number a multiple of the other, so it is not "LCM(4, 8)" (CLO review m02 item 4)
        if (a === h) continue;
        const [x, y] = rng.chance(0.5) ? [a, b] : [b, a];
        const lower = factorsOf(h).filter((z) => z < h).reverse();
        const items = hcfQ ? [
          { text: String(l), code: 'HCF-LCM-SWAP', why: `${l} is the LOWEST COMMON MULTIPLE of ${x} and ${y}. The highest common factor is the biggest number that divides into both.` },
          ...lower.slice(0, 2).map((z) => ({ text: String(z), code: 'HCF-NOT-HIGHEST', why: `${z} is a common factor of ${x} and ${y}, but not the highest. ${h} also divides into both.` })),
        ] : [
          { text: String(a * b), code: 'LCM-PRODUCT', why: `${a * b} = ${x} x ${y} is a common multiple, but not the lowest. ${l} is in both times tables too.` },
          { text: String(h), code: 'HCF-LCM-SWAP', why: `${h} is the HIGHEST COMMON FACTOR of ${x} and ${y}. The lowest common multiple is the smallest number in both times tables.` },
          { text: String(2 * l), code: 'LCM-NOT-LOWEST', why: `${2 * l} is a common multiple of ${x} and ${y}, but ${l} is a smaller one.` },
        ];
        const prompt = hcfQ ? `What is the highest common factor of ${x} and ${y}?` : `What is the lowest common multiple of ${x} and ${y}?`;
        const solution = hcfQ
          ? `Factors of ${x}: ${factorsOf(x).join(', ')}. Factors of ${y}: ${factorsOf(y).join(', ')}. The biggest number in both lists is ${h}. Answer: ${h}`
          : `Multiples of ${Math.max(x, y)}: ${Array.from({ length: l / Math.max(x, y) }, (_, i) => (i + 1) * Math.max(x, y)).join(', ')}. The first one that is also a multiple of ${Math.min(x, y)} is ${l}. Answer: ${l}`;
        const ans = hcfQ ? h : l;
        try {
          return { type: 'mcq', prompt, ...choices(rng, String(ans), items, (i) => nearFor(prompt)(String(ans + (i % 2 ? 1 : -1) * Math.ceil(i / 2)), hcfQ ? 'List the factors of both numbers and find the biggest one in both lists.' : 'List the multiples of the bigger number until one is also a multiple of the smaller.')), solution, skill: hcfQ ? SKILL.hcf : SKILL.lcm };
        } catch { continue; }
      }
      // D3 word problems
      if (hcfQ) {
        const { a, b, h, l } = pairWithHcf(rng, 96, 3, 16);
        if (a < 6 || a === h) continue;
        const ctx = rng.pick(BEADS);
        const ask = rng.int(0, 2);
        const name = rng.pick(['Wei Ming', 'Siti', 'Aisha', 'Kumar', 'Mei Lin', 'Arjun']);
        let prompt; let ans; let solution; let items;
        if (ctx.thing === 'teams') {
          prompt = `A class has ${a} girls and ${b} boys. The teacher makes teams so that every team has the same number of girls and the same number of boys, with nobody left out. What is the largest number of teams she can make?`;
        } else {
          prompt = `${name} has ${a} ${ctx.a} and ${b} ${ctx.b}. ${name} uses ALL of them to make identical ${ctx.thing}: each has the same number of ${ctx.a} and the same number of ${ctx.b}. What is the largest number of ${ctx.thing} ${name} can make?`;
        }
        if (ask === 0 || ctx.thing === 'teams') {
          ans = h;
          solution = `The number of ${ctx.thing} must divide exactly into ${a} and into ${b}, so it is a common factor. The largest is the HCF of ${a} and ${b}, which is ${h}. Answer: ${h}`;
          items = [
            { text: String(l), code: 'HCF-LCM-SWAP', why: `${l} is the lowest common multiple. The number of ${ctx.thing} must divide INTO ${a} and ${b}, so it is a common factor.` },
            { text: String(lowerCommonFactor(h)), code: 'HCF-NOT-HIGHEST', why: `${lowerCommonFactor(h)} ${ctx.thing} would work, but it is not the largest number. ${h} also divides into ${a} and ${b}.` },
            { text: String(a / h + b / h), code: 'WRONG-QUANTITY', why: `${a / h + b / h} is the number of things in each of the ${h} ${ctx.thing}. The question asks how many ${ctx.thing}.` },
          ];
        } else {
          const which = ask === 1 ? 'a' : 'b';
          const n = which === 'a' ? a : b;
          ans = n / h;
          prompt = prompt.replace(/What is the largest number of .*$/, `${name} makes as many ${ctx.thing} as possible. How many ${which === 'a' ? ctx.a : ctx.b} are in each one?`);
          solution = `The largest number of ${ctx.thing} is the HCF of ${a} and ${b}, which is ${h}. Then ${n} ÷ ${h} = ${ans} ${which === 'a' ? ctx.a : ctx.b} in each. Answer: ${ans}`;
          items = [
            { text: String(h), code: 'ONE-STEP-ONLY', why: `${h} is the number of ${ctx.thing}. Now share the ${which === 'a' ? ctx.a : ctx.b} between them: ${n} ÷ ${h}.` },
            { text: String(n / lowerCommonFactor(h)), code: 'HCF-NOT-HIGHEST', why: `That uses ${lowerCommonFactor(h)} ${ctx.thing}, which is not the largest number possible. Use the HCF, ${h}.` },
            { text: String(which === 'a' ? b / h : a / h), code: 'WRONG-QUANTITY', why: `${which === 'a' ? b / h : a / h} is the number of ${which === 'a' ? ctx.b : ctx.a} in each. Read which item the question asks about.` },
          ];
        }
        try {
          if (rng.chance(0.35)) {
            const t = typedMisconceptions(String(ans), items, { code: 'HCF-LCM-SWAP', why: 'Sharing into equal groups with nothing left over needs a common FACTOR. The largest number of groups is the HCF.' });
            return { type: 'numeric', prompt, answer: numericAnswer(ans, [String(ans)]), solution, ...t, marks: 2, skill: SKILL.hcf };
          }
          return { type: 'mcq', prompt, ...choices(rng, String(ans), items, null), solution, marks: 2, skill: SKILL.hcf };
        } catch { continue; }
      }
      const { a, b, h, l } = pairWithHcf(rng, 30, 2, 6);
      if (a < 3 || a === h || l > 180) continue;
      const kind = rng.int(0, 2);
      let prompt; let unit;
      if (kind === 0) { unit = 'minutes'; prompt = `Route A buses leave the bus station every ${a} minutes. Route B buses leave every ${b} minutes. A bus from each route leaves together at 7:00 am. After how many minutes will buses from both routes next leave together?`; } else if (kind === 1) { unit = 'seconds'; prompt = `On a Penang ferry, a red light flashes every ${a} seconds and a green light flashes every ${b} seconds. They flash together now. After how many seconds will they next flash together?`; } else { unit = 'items'; prompt = `Hot dog sausages come in packs of ${a} and hot dog buns come in packs of ${b}. Kumar wants exactly the same number of sausages and buns. What is the smallest number of each he can buy?`; }
      const solution = `The answer must be in the ${a} times table and the ${b} times table: a common multiple. Multiples of ${b}: ${Array.from({ length: l / b }, (_, i) => (i + 1) * b).join(', ')}. The first that is also a multiple of ${a} is ${l}. Answer: ${l}`;
      const items = [
        { text: String(a * b), code: 'LCM-PRODUCT', why: `${a * b} = ${a} x ${b} works, but it is not the first time. ${l} is a smaller common multiple.` },
        { text: String(h), code: 'HCF-LCM-SWAP', why: `${h} is the highest common factor. ${unit === 'items' ? `Packs of ${a} and packs of ${b} give equal totals` : `Things that repeat every ${a} and every ${b} ${unit} happen together again`} at a common MULTIPLE.` },
        { text: String(2 * l), code: 'LCM-NOT-LOWEST', why: `${2 * l} is a common multiple of ${a} and ${b}, but ${l} comes first.` },
        { text: String(a + b), code: 'NEAR-MISS', why: `Not quite: ${a} + ${b} = ${a + b} is not a multiple of both ${a} and ${b}. Look for the first number in both times tables.` },
      ];
      try {
        if (rng.chance(0.35)) {
          const t = typedMisconceptions(String(l), items, { code: 'LCM-PRODUCT', why: 'Find the lowest common multiple: list the multiples of the bigger number until one is also a multiple of the smaller.' });
          return { type: 'numeric', prompt, answer: numericAnswer(l, [String(l), `${l} ${unit}`]), solution, ...t, marks: 2, skill: SKILL.lcm };
        }
        return { type: 'mcq', prompt, ...choices(rng, String(l), items, null), solution, marks: 2, skill: SKILL.lcm };
      } catch { /* draw again */ }
    }
  },
};

// ---------------------------------------------------------------- g08, g09 divisibility

const digitSum = (n) => String(n).split('').reduce((s, c) => s + Number(c), 0);
const fmtN = (n) => fmtInt(n);

const divisibility = {
  id: 'm02.divisibility', topicId: T, subtopicId: 'm02-s3', skill: SKILL.div369,
  title: 'Divisibility tests for 3, 4, 6 and 9 (D1 which number; D2 true or false, missing digit for 9; D3 largest or smallest digit for 6)',
  difficulties: [1, 2, 3],
  check: { min: 0 },
  make(rng, d) {
    if (d === 3) return rng.chance(0.6) ? largestDigit6(rng) : extremeDigit3(rng);
    if (d === 2) return rng.chance(0.5) ? missingDigit(rng, 9) : divTrueFalse(rng);
    for (;;) {
      const n = rng.pick([3, 3, 9, 9, 6, 6, 4]);
      const big = () => rng.int(100, 9999);
      const pickWhere = (cond) => { for (let i = 0; i < 500; i++) { const x = big(); if (cond(x)) return x; } return null; };
      const ans = pickWhere((x) => x % n === 0);
      const items = [];
      if (n === 3 || n === 9) {
        const ld = n === 3 ? [3, 6, 9] : [9];
        const t = pickWhere((x) => ld.includes(x % 10) && x % 3 !== 0);
        if (t) items.push({ text: fmtN(t), code: 'DIV-LAST-DIGIT', why: `${fmtN(t)} ends in ${t % 10}, but that is not the test. Its digit sum is ${digitSum(t)}, which is not a multiple of ${n === 3 ? 3 : 9}.` });
      }
      if (n === 9) { const t = pickWhere((x) => x % 3 === 0 && x % 9 !== 0); items.push({ text: fmtN(t), code: 'DIV9-AS-DIV3', why: `The digit sum of ${fmtN(t)} is ${digitSum(t)}: a multiple of 3, but not of 9. So ${fmtN(t)} divides by 3, but not by 9.` }); }
      if (n === 6) {
        const t1 = pickWhere((x) => x % 2 === 0 && x % 3 !== 0); items.push({ text: fmtN(t1), code: 'DIV6-EVEN-ONLY', why: `${fmtN(t1)} is even, but its digit sum is ${digitSum(t1)}, not a multiple of 3. A number divisible by 6 must pass the tests for 2 AND 3.` });
        const t2 = pickWhere((x) => x % 2 === 1 && x % 3 === 0); items.push({ text: fmtN(t2), code: 'DIV6-THREE-ONLY', why: `${fmtN(t2)} passes the test for 3 (digit sum ${digitSum(t2)}), but it is odd. A number divisible by 6 must also be even.` });
      }
      if (n === 4) {
        for (let k = 0; k < 2; k++) { const t = pickWhere((x) => x % 2 === 0 && x % 4 !== 0); items.push({ text: fmtN(t), code: 'DIV4-LAST-DIGIT', why: `${fmtN(t)} ends in an even digit, but its last two digits, ${String(t % 100).padStart(2, '0')}, are not a multiple of 4.` }); }
      }
      while (items.length < 3) { const t = pickWhere((x) => x % n !== 0 && x % 2 !== 0 && x % 10 !== 3 && x % 10 !== 9); items.push(nearMiss(fmtN(t), `Use the test for ${n}: ${n === 4 ? 'look at the last two digits' : 'add up the digits'}.`)); }
      const hint = n === 4 ? 'look at the last two digits' : n === 6 ? 'it must be even, and its digit sum a multiple of 3' : 'add up the digits';

      const test = n === 3 ? `the digit sum of ${fmtN(ans)} is ${digitSum(ans)}, a multiple of 3` : n === 9 ? `the digit sum of ${fmtN(ans)} is ${digitSum(ans)}, a multiple of 9` : n === 6 ? `${fmtN(ans)} is even and its digit sum is ${digitSum(ans)}, a multiple of 3` : `the last two digits of ${fmtN(ans)}, ${String(ans % 100).padStart(2, '0')}, make a multiple of 4`;
      const solution = `Test each number: ${test}. Answer: ${fmtN(ans)}`;
      try { const c = choices(rng, fmtN(ans), items, null); return { type: 'mcq', prompt: `Which of these numbers is divisible by ${n}? (Hint: ${hint}.)`, ...c, solution, skill: n === 4 ? SKILL.divTests : SKILL.div369 }; } catch { /* draw again */ }
    }
  },
};

function divTrueFalse(rng) {
  for (;;) {
    const n = rng.pick([3, 6, 9, 9]);
    const x = rng.int(1000, 9999);
    const truth = x % n === 0;
    // the false ones are traps: they pass a weaker test
    if (!truth) {
      if (n === 9 && x % 3 !== 0) continue;
      if (n === 6 && x % 3 !== 0 && x % 2 !== 0) continue;
      if (n === 3 && ![3, 6, 9].includes(x % 10)) continue;
    } else if (rng.chance(0.3)) continue;
    const prompt = `True or false: ${fmtN(x)} is divisible by ${n}.`;
    const ds = digitSum(x);
    const solution = n === 6
      ? `${fmtN(x)} is ${x % 2 ? 'odd' : 'even'} and its digit sum is ${ds}${ds % 3 ? ', not a multiple of 3' : ', a multiple of 3'}. It needs both, so the statement is ${truth ? 'true' : 'false'}. Answer: ${truth ? 'true' : 'false'}`
      : `Add the digits: ${String(x).split('').join(' + ')} = ${ds}. ${ds} is ${ds % n ? 'not ' : ''}a multiple of ${n}, so the statement is ${truth ? 'true' : 'false'}. Answer: ${truth ? 'true' : 'false'}`;
    // when the statement is true, the wrong answer ("false") comes from not applying the test,
    // not from a weaker test (CLO review m02 item 1)
    const code = truth ? 'DIV-TEST-NOT-APPLIED' : n === 9 ? 'DIV9-AS-DIV3' : n === 6 ? (x % 2 ? 'DIV6-THREE-ONLY' : 'DIV6-EVEN-ONLY') : 'DIV-LAST-DIGIT';
    const why = truth
      ? (n === 6 ? `Apply the test before deciding: ${fmtN(x)} is even and its digit sum, ${ds}, is a multiple of 3, so it IS divisible by 6.` : `Apply the test before deciding: the digit sum of ${fmtN(x)} is ${ds}, a multiple of ${n}, so it IS divisible by ${n}.`)
      : n === 9 ? `A digit sum that is a multiple of 3 is not enough: for 9 the digit sum must be a multiple of 9 (here it is ${ds}).` : n === 6 ? 'For 6 a number must be even AND have a digit sum that is a multiple of 3.' : `For 3, add the digits (here ${ds}); the last digit does not tell you.`;
    return { type: 'truefalse', prompt, answer: truth, solution, misconceptions: { common: why }, codes: { common: code }, skill: SKILL.div369 };
  }
}

/** The 3- or 4-digit number with one digit missing is divisible by n (9: any place; 6: last place). */
/** D3: the largest (or smallest) digit that makes the number divisible by 6. */
function largestDigit6(rng) {
  for (;;) {
    const len = rng.pick([3, 4, 4, 5]);
    const digits = Array.from({ length: len }, (_, i) => (i === 0 ? rng.int(1, 9) : rng.int(0, 9)));
    const pos = rng.chance(0.5) ? len - 1 : rng.int(1, len - 2);
    if (pos !== len - 1 && digits[len - 1] % 2) continue;
    const num = (x) => { const dd = digits.slice(); dd[pos] = x; return Number(dd.join('')); };
    const ok = []; for (let x = 0; x <= 9; x++) if (num(x) % 6 === 0) ok.push(x);
    if (ok.length < 2) continue;
    const largest = rng.chance(0.65);
    const ans = largest ? Math.max(...ok) : Math.min(...ok);
    const shown = digits.map((x, i) => (i === pos ? '?' : String(x))).join('');
    const others = digits.reduce((s2, x, i) => s2 + (i === pos ? 0 : x), 0);
    const prompt = `The ${len}-digit number ${shown} is divisible by 6. The ? stands for a missing digit. What is the ${largest ? 'LARGEST' : 'SMALLEST'} digit it could be?`;
    const solution = `For 6 the number must be even AND its digit sum a multiple of 3. The other digits add up to ${others}.${pos === len - 1 ? ' The missing digit is the last digit, so it must be even.' : ` The last digit is ${digits[len - 1]}, so the number is already even.`} The digits that work are ${ok.join(', ')}, so the ${largest ? 'largest' : 'smallest'} is ${ans}. Answer: ${ans}`;
    const items = [];
    const other = largest ? Math.min(...ok) : Math.max(...ok);
    items.push({ text: String(other), code: 'WRONG-QUANTITY', why: `${other} works too, but it is the ${largest ? 'smallest' : 'largest'} digit that works. The question asks for the ${largest ? 'largest' : 'smallest'}.` });
    if (pos === len - 1) {
      const odd = []; const even = [];
      for (let x = 0; x <= 9; x++) { if ((others + x) % 3 === 0 && x % 2) odd.push(x); if ((others + x) % 3 && x % 2 === 0) even.push(x); }
      const o = largest ? odd.filter((x) => x > ans) : odd.filter((x) => x < ans);
      const e = largest ? even.filter((x) => x > ans) : even.filter((x) => x < ans);
      if (o.length) { const x = largest ? Math.max(...o) : Math.min(...o); items.push({ text: String(x), code: 'DIV6-THREE-ONLY', why: `With ${x} the digit sum is ${others + x}, a multiple of 3, but ${num(x)} is odd. A number divisible by 6 must be even too.` }); }
      if (e.length) { const x = largest ? Math.max(...e) : Math.min(...e); items.push({ text: String(x), code: 'DIV6-EVEN-ONLY', why: `With ${x} the number is even, but the digit sum is ${others + x}, not a multiple of 3.` }); }
    } else {
      const s3 = []; for (let x = 0; x <= 9; x++) if ((others + x) % 3 && (largest ? x > ans : x < ans)) s3.push(x);
      if (s3.length) { const x = largest ? Math.max(...s3) : Math.min(...s3); items.push({ text: String(x), code: 'DIV6-EVEN-ONLY', why: `${num(x)} is even, but its digit sum is ${others + x}, not a multiple of 3. For 6 it must pass both tests.` }); }
    }
    if (items.length < 2) continue;
    try {
      if (rng.chance(0.5)) {
        const t = typedMisconceptions(String(ans), items, { code: 'DIV6-THREE-ONLY', why: 'For 6 the number must be even and its digit sum a multiple of 3. Try each digit.' });
        return { type: 'numeric', prompt, answer: numericAnswer(ans, [String(ans)]), solution, ...t, marks: 2, skill: SKILL.div369 };
      }
      return { type: 'mcq', prompt, ...choices(rng, String(ans), items, (i) => { const x = (ans + i) % 10; return !ok.includes(x) && !items.some((it) => it.text === String(x)) ? nearFor(prompt)(String(x), 'Check both tests for 6: even, and a digit sum that is a multiple of 3.') : null; }), solution, marks: 2, skill: SKILL.div369 };
    } catch { /* draw again */ }
  }
}

/** D3: the largest (or smallest) digit that makes the number divisible by 3 (typed; a second D3 shape). */
function extremeDigit3(rng) {
  for (;;) {
    const len = rng.pick([3, 4, 4, 5]);
    const digits = Array.from({ length: len }, (_, i) => (i === 0 ? rng.int(1, 9) : rng.int(0, 9)));
    const pos = rng.chance(0.5) ? len - 1 : rng.int(1, len - 2);
    const num = (x) => { const dd = digits.slice(); dd[pos] = x; return Number(dd.join('')); };
    const ok = []; for (let x = 0; x <= 9; x++) if (num(x) % 3 === 0) ok.push(x);
    const largest = rng.chance(0.6);
    const ans = largest ? Math.max(...ok) : Math.min(...ok);
    const other = largest ? Math.min(...ok) : Math.max(...ok);
    const shown = digits.map((x, i) => (i === pos ? '?' : String(x))).join('');
    const others = digits.reduce((s2, x, i) => s2 + (i === pos ? 0 : x), 0);
    const prompt = `The ${len}-digit number ${shown} is divisible by 3. The ? stands for a missing digit. What is the ${largest ? 'LARGEST' : 'SMALLEST'} digit it could be?`;
    const solution = `For 3 the digit sum must be a multiple of 3. The other digits add up to ${others}. The digits that work are ${ok.join(', ')} (digit sums ${ok.map((x) => others + x).join(', ')}), so the ${largest ? 'largest' : 'smallest'} is ${ans}. Answer: ${ans}`;
    const items = [{ text: String(other), code: 'WRONG-QUANTITY', why: `${other} works too, but it is the ${largest ? 'smallest' : 'largest'} digit that works. The question asks for the ${largest ? 'largest' : 'smallest'}.` }];
    if (pos === len - 1) {
      // "ends in 3, 6 or 9, so it divides by 3"
      const ld = [3, 6, 9].filter((x) => !ok.includes(x) && (largest ? x > ans : x < ans));
      if (ld.length) { const x = largest ? Math.max(...ld) : Math.min(...ld); items.push({ text: String(x), code: 'DIV-LAST-DIGIT', why: `${num(x)} ends in ${x}, but that is not the test for 3. Its digit sum is ${others + x}, which is not a multiple of 3.` }); }
    }
    if (ok.length < 2 || items.length < 2) continue;
    const t = typedMisconceptions(String(ans), items, { why: 'For 3 the digit sum must be a multiple of 3. Try each digit from 9 down (or from 0 up).' });
    return { type: 'numeric', prompt, answer: numericAnswer(ans, [String(ans)]), solution, ...t, marks: 2, skill: SKILL.div369 };
  }
}

function missingDigit(rng, n) {
  for (;;) {
    const len = rng.pick([3, 4, 4, 4, 5]);
    const digits = Array.from({ length: len }, (_, i) => (i === 0 ? rng.int(1, 9) : rng.int(0, 9)));
    const pos = n === 6 ? len - 1 : rng.int(1, len - 1);
    const ok = []; for (let x = 0; x <= 9; x++) { const dd = digits.slice(); dd[pos] = x; if (Number(dd.join('')) % n === 0) ok.push(x); }
    if (ok.length !== 1) continue;
    const ans = ok[0];
    const shown = digits.map((x, i) => (i === pos ? '?' : String(x))).join('');
    const others = digits.reduce((s, x, i) => s + (i === pos ? 0 : x), 0);
    const prompt = `The ${len}-digit number ${shown} is divisible by ${n}. The ? stands for a missing digit. What is the missing digit?`;
    const items = [];
    for (let x = 0; x <= 9; x++) {
      if (x === ans) continue;
      const s = others + x;
      if (n === 9 && s % 3 === 0) items.push({ text: String(x), code: 'DIV9-AS-DIV3', why: `With ${x} the digit sum is ${s}, which is a multiple of 3 but not of 9. For 9 the digit sum must be a multiple of 9.` });
      if (n === 6 && s % 3 === 0 && x % 2) items.push({ text: String(x), code: 'DIV6-THREE-ONLY', why: `With ${x} the digit sum is ${s}, a multiple of 3, but ${shown.replace('?', x)} is odd. A number divisible by 6 must be even too.` });
    }
    const solution = n === 9
      ? `The digit sum must be a multiple of 9. The other digits add up to ${others}. The next multiple of 9 is ${others + ans}, so the missing digit is ${others + ans} - ${others} = ${ans}. Check: ${fmtN(Number(shown.replace('?', ans)))} ÷ 9 = ${fmtN(Number(shown.replace('?', ans)) / 9)}. Answer: ${ans}`
      : `For 6 the number must be even AND its digit sum a multiple of 3. The other digits add up to ${others}. The missing digit is the last digit, so it must be even: only ${ans} also makes the digit sum (${others + ans}) a multiple of 3. Answer: ${ans}`;
    if (!items.length) continue;
    try {
      if (rng.chance(0.5)) {
        const t = typedMisconceptions(String(ans), items, { code: n === 9 ? 'DIV9-AS-DIV3' : 'DIV6-THREE-ONLY', why: n === 9 ? 'For 9 the digit sum must be a multiple of 9.' : 'For 6 the number must be even and its digit sum a multiple of 3.' });
        return { type: 'numeric', prompt, answer: numericAnswer(ans, [String(ans)]), solution, ...t, marks: 2, skill: SKILL.div369 };
      }
      return { type: 'mcq', prompt, ...choices(rng, String(ans), items, (i) => { const x = (ans + i * 2) % 10; return x !== ans && !items.some((it) => it.text === String(x)) ? nearFor(prompt)(String(x), `Check the digit sum (and, for 6, that the number is even).`) : null; }), solution, marks: 2, skill: SKILL.div369 };
    } catch { /* draw again */ }
  }
}

// ---------------------------------------------------------------- g10, g11 squares and cubes

const squaresCubes = {
  id: 'm02.squares-cubes', topicId: T, subtopicId: 'm02-s4', skill: SKILL.sq,
  title: 'Square and cube numbers (D1 values and which is a cube; D2 side from area, sums of powers, order; D3 counting squares, cube blocks)',
  difficulties: [1, 2, 3],
  check: { min: 0 },
  make(rng, d) {
    if (d === 1) { const k = rng.int(0, 9); return k < 4 ? powerValue(rng) : k < 7 ? whichCube(rng) : whichSquare(rng); }
    if (d === 2) { const k = rng.int(0, 2); return k === 0 ? sideFromArea(rng) : k === 1 ? powerSum(rng) : powerOrder(rng); }
    return rng.chance(0.5) ? countSquares(rng) : cubeBlock(rng);
  },
};

function powerValue(rng) {
  for (;;) {
    const cube = rng.chance(0.4);
    const b = cube ? rng.int(2, 5) : rng.int(3, 15);
    const e = cube ? 3 : 2;
    const ans = b ** e;
    const prompt = `What is ${b}^${e}?`;
    const solution = `${b}^${e} means ${Array(e).fill(b).join(' x ')}${e === 3 ? ` = ${b * b} x ${b}` : ''} = ${ans}. It does not mean ${b} x ${e}. Answer: ${ans}`;
    const items = [
      { text: String(b * e), code: 'POW-MULT', why: `It looks like you worked out ${b} x ${e}. ${b}^${e} means ${e === 2 ? `${b} x ${b}` : `${b} x ${b} x ${b}`}.` },
      e ** b <= 1024 && e ** b !== ans ? { text: fmtInt(e ** b), code: 'POW-SWAP', why: `That is ${e}^${b} (${e} multiplied by itself ${b} times). ${b}^${e} means ${b} multiplied by itself ${e} times.` } : null,
      { text: String(b + e), code: 'NEAR-MISS', why: `Not quite: ${b}^${e} is ${b} multiplied by itself, not ${b} + ${e}.` },
      { text: String(e === 3 ? b * b : b * b * b), code: 'SQ-CUBE-MIX', why: e === 3 ? `${b * b} is ${b}^2 (${b} squared). ${b}^3 means ${b} x ${b} x ${b}.` : `${b ** 3} is ${b}^3 (${b} cubed). ${b}^2 means ${b} x ${b}.` },
    ];
    try {
      if (rng.chance(0.3)) {
        const t = typedMisconceptions(fmtInt(ans), items, { code: 'POW-MULT', why: `${b}^${e} means ${b} multiplied by itself ${e} times.` });
        return { type: 'numeric', prompt, answer: numericAnswer(ans, [fmtInt(ans), String(ans)]), solution, ...t, skill: cube ? SKILL.cube : SKILL.sq };
      }
      return { type: 'mcq', prompt, ...choices(rng, fmtInt(ans), items, null), solution, skill: cube ? SKILL.cube : SKILL.sq };
    } catch { /* draw again */ }
  }
}

function whichCube(rng) {
  for (;;) {
    const b = rng.int(2, 5); const ans = b ** 3;
    const sq = rng.pick([4, 9, 16, 25, 36, 49, 81, 100].filter((x) => x !== 64));
    const m3 = 3 * rng.pick([2, 3, 4, 5, 6, 7, 8, 10, 11]);
    const items = [
      { text: String(sq), code: 'SQ-CUBE-MIX', why: `${sq} is a SQUARE number (${Math.sqrt(sq)} x ${Math.sqrt(sq)}). A cube number is a number multiplied by itself three times.` },
      { text: String(m3), code: 'POW-MULT', why: `${m3} = ${m3 / 3} x 3, but a cube number is ${m3 / 3} x ${m3 / 3} x ${m3 / 3}, not ${m3 / 3} x 3.` },
      nearMiss(String(ans + rng.pick([-2, 2, 1])), 'The cube numbers are 1, 8, 27, 64, 125, ...'),
    ];
    const solution = `A cube number is made by multiplying a number by itself three times: ${b} x ${b} x ${b} = ${ans}. Answer: ${ans}`;
    try { const c = choices(rng, String(ans), items, null); return { type: 'mcq', prompt: 'Which of these is a cube number?', ...c, solution, skill: SKILL.cube }; } catch { /* draw again */ }
  }
}

function whichSquare(rng) {
  for (;;) {
    const b = rng.int(4, 12); const ans = b * b;
    const twice = 2 * rng.int(3, 12);
    if (Number.isInteger(Math.sqrt(twice))) continue;
    const cube = rng.pick([8, 27, 125]);
    const items = [
      { text: String(twice), code: 'POW-MULT', why: `${twice} = ${twice / 2} x 2, but a square number is a number times ITSELF, like ${twice / 2} x ${twice / 2} = ${(twice / 2) ** 2}.` },
      { text: String(cube), code: 'SQ-CUBE-MIX', why: `${cube} is a CUBE number (${Math.round(Math.cbrt(cube))} x ${Math.round(Math.cbrt(cube))} x ${Math.round(Math.cbrt(cube))}). It is not a square number.` },
      nearMiss(String(ans + rng.pick([-1, 1, 2])), 'The square numbers are 1, 4, 9, 16, 25, 36, 49, 64, 81, 100, ...'),
    ];
    const solution = `A square number is a number multiplied by itself: ${b} x ${b} = ${ans}. Answer: ${ans}`;
    try { const c = choices(rng, String(ans), items, null); return { type: 'mcq', prompt: 'Which of these is a square number?', ...c, solution, skill: SKILL.sq }; } catch { /* draw again */ }
  }
}

function sideFromArea(rng) {
  for (;;) {
    // each thing with its own unit and a sensible size (CLO review X6)
    const [thing, unit, lo] = rng.pick([['A square garden', 'm', 5], ['A square playground', 'm', 10], ['A square room', 'm', 3], ['A square sticker', 'cm', 3], ['A square photo', 'cm', 8], ['A square cushion', 'cm', 12]]);
    const s = rng.int(lo, Math.min(15, lo + 9)); const A = s * s;
    if (thing === 'A square room' && s > 8) continue;
    const prompt = `${thing} has an area of ${A} ${unit}^2. How long is one side?`;
    const solution = `The area of a square is side x side. Which number times itself makes ${A}? ${s} x ${s} = ${A}, so each side is ${s} ${unit}. Answer: ${s} ${unit}`;
    const items = [
      A % 2 === 0 ? { text: `${A / 2} ${unit}`, code: 'SQ-SIDE-HALF', why: `It looks like you halved ${A}. The side is the number that multiplies by ITSELF to make ${A}.` } : { text: `${(A - 1) / 2}.5 ${unit}`, code: 'SQ-SIDE-HALF', why: `It looks like you halved ${A}. The side is the number that multiplies by ITSELF to make ${A}.` },
      A % 4 === 0 ? { text: `${A / 4} ${unit}`, code: 'SQ-SIDE-QUARTER', why: `It looks like you divided ${A} by 4, as if it were the perimeter. For the area, find the number that times itself makes ${A}.` } : null,
      nearFor(prompt)(`${s + 1} ${unit}`, `${s + 1} x ${s + 1} = ${(s + 1) ** 2}, not ${A}. Find the number that times itself makes ${A}.`),
      nearFor(prompt)(`${s - 1} ${unit}`, `${s - 1} x ${s - 1} = ${(s - 1) ** 2}, not ${A}. Find the number that times itself makes ${A}.`),
      nearFor(prompt)(`${s + 2} ${unit}`, `${s + 2} x ${s + 2} = ${(s + 2) ** 2}, not ${A}. Find the number that times itself makes ${A}.`),
    ];
    try { return { type: 'mcq', prompt, ...choices(rng, `${s} ${unit}`, items, null), solution, skill: SKILL.sq }; } catch { /* draw again */ }
  }
}

function powerSum(rng) {
  for (;;) {
    const a = rng.int(2, 12); const b = rng.int(2, 5);
    const op = rng.pick(['+', '-', '+']);
    const A = a * a; const B = b ** 3;
    const ans = op === '+' ? A + B : A - B;
    if (ans <= 0 || a === b) continue;
    const prompt = `Work out ${a}^2 ${op} ${b}^3.`;
    const solution = `${a}^2 = ${a} x ${a} = ${A}. ${b}^3 = ${b} x ${b} x ${b} = ${B}. ${A} ${op} ${B} = ${ans}. Answer: ${ans}`;
    const mult = op === '+' ? a * 2 + b * 3 : a * 2 - b * 3;
    const swap = op === '+' ? 2 ** a + 3 ** b : 2 ** a - 3 ** b;
    const items = [
      mult >= 0 ? { text: String(mult), code: 'POW-MULT', why: `It looks like you worked out ${a} x 2 and ${b} x 3. ${a}^2 means ${a} x ${a}, and ${b}^3 means ${b} x ${b} x ${b}.` } : null,
      swap > 0 && swap <= 1000 ? { text: fmtInt(swap), code: 'POW-SWAP', why: `It looks like you worked out 2^${a} and 3^${b}. ${a}^2 means ${a} x ${a}, and ${b}^3 means ${b} x ${b} x ${b}.` } : null,
      (op === '+' || A > b * b) ? { text: String(op === '+' ? A + b * b : A - b * b), code: 'SQ-CUBE-MIX', why: `It looks like you squared ${b} (${b * b}). ${b}^3 is ${b} cubed: ${b} x ${b} x ${b} = ${B}.` } : null,
    ];
    try { return { type: 'mcq', prompt, ...choices(rng, String(ans), items, (i) => { const x = ans + i * (i % 2 ? 1 : -1); return x > 0 ? nearFor(prompt)(String(x), 'Work out each power first, then add or subtract.') : null; }), solution, skill: SKILL.sqcube }; } catch { /* draw again */ }
  }
}

function powerOrder(rng) {
  for (;;) {
    const items = new Map();
    while (items.size < 5) {
      const cube = rng.chance(0.45);
      const b = cube ? rng.int(1, 5) : rng.int(1, 12);
      const t = `${b}^${cube ? 3 : 2}`;
      items.set(t, b ** (cube ? 3 : 2));
    }
    const vals = [...items.values()];
    if (new Set(vals).size !== 5) continue;
    const texts = [...items.keys()];
    // only ask when reading a^n as a x n would give a different order
    const slip = (t) => { const [b, e] = t.split('^').map(Number); return b * e; };
    const sorted = [...texts].sort((x, y) => items.get(x) - items.get(y));
    const slipSorted = [...texts].sort((x, y) => slip(x) - slip(y));
    if (sorted.join() === slipSorted.join()) continue;
    const prompt = `Work out each value, then put them in order from smallest to largest: ${texts.join(', ')}.`;
    const solution = `${texts.map((t) => `${t} = ${items.get(t)}`).join(', ')}. Smallest to largest: ${sorted.join(', ')}. Answer: ${sorted.join(', ')}`;
    return { type: 'order', prompt, options: texts, answer: sorted.map((t) => texts.indexOf(t)), solution, misconceptions: { common: 'It looks like you read a power such as 4^3 as 4 x 3. 4^3 means 4 x 4 x 4 = 64.' }, codes: { common: 'POW-MULT' }, skill: SKILL.sqcube };
  }
}

function countSquares(rng) {
  for (;;) {
    // squares up to 15^2 = 225 only (CLO review m02 item 2)
    const lo = rng.chance(0.4) ? rng.int(4, 12) ** 2 : rng.int(10, 180);
    const hi = rng.chance(0.4) ? rng.int(Math.ceil(Math.sqrt(lo + 30)), 15) ** 2 : lo + rng.int(30, 100);
    if (hi - lo < 30 || hi > 230) continue;
    const sq = []; for (let k = 1; k * k < hi; k++) if (k * k > lo) sq.push(k * k);
    if (sq.length < 2) continue;
    const loSq = Number.isInteger(Math.sqrt(lo)); const hiSq = Number.isInteger(Math.sqrt(hi));
    const ans = sq.length;
    const prompt = `How many square numbers are there between ${lo} and ${hi}?`;
    const solution = `List the square numbers: ${Math.floor(Math.sqrt(lo))}^2 = ${Math.floor(Math.sqrt(lo)) ** 2}, ... The ones between ${lo} and ${hi} are ${sq.join(', ')}.${loSq || hiSq ? ` ${[loSq ? lo : null, hiSq ? hi : null].filter(Boolean).join(' and ')} ${loSq && hiSq ? 'are' : 'is'} not between the numbers, so ${loSq && hiSq ? 'they do' : 'it does'} not count.` : ''} That is ${ans} numbers. Answer: ${ans}`;
    const items = [
      loSq || hiSq ? { text: String(ans + (loSq ? 1 : 0) + (hiSq ? 1 : 0)), code: 'COUNT-ENDS', why: `It looks like you counted ${loSq && hiSq ? `${lo} and ${hi}` : loSq ? lo : hi} as well. "Between" leaves out the end numbers.` } : null,
      nearMiss(String(ans + 1), `List the squares between the two numbers and count them again: ${sq.join(', ')}.`),
    ];
    const t = typedMisconceptions(String(ans), items, { code: 'COUNT-ENDS', why: 'List the square numbers in order and count only those strictly between the two numbers.' });
    return { type: 'numeric', prompt, answer: numericAnswer(ans, [String(ans)]), solution, ...t, marks: 2, skill: SKILL.sq };
  }
}

function cubeBlock(rng) {
  for (;;) {
    const n = rng.int(3, 5);
    const take = rng.int(1, n - 1);
    const name = rng.pick(['Daniel', 'Siti', 'Omar', 'Priya', 'Arjun', 'Lina']);
    const ans = n ** 3 - take ** 3;
    const prompt = take
      ? `${name} builds a large cube from small 1 cm cubes. The large cube is ${n} cubes long, ${n} cubes wide and ${n} cubes high. ${name} then takes away a block of small cubes that is ${take} cube${take > 1 ? 's' : ''} long, ${take} wide and ${take} high from one corner. How many small cubes are left?`
      : `${name} builds a large cube from small 1 cm cubes. It is ${n} cubes long, ${n} cubes wide and ${n} cubes high. How many small cubes does ${name} use?`;
    const solution = take
      ? `The large cube has ${n} x ${n} x ${n} = ${n ** 3} small cubes. The block taken away has ${take} x ${take} x ${take} = ${take ** 3}. ${n ** 3} - ${take ** 3} = ${ans}. Answer: ${ans}`
      : `The number of small cubes is ${n} x ${n} x ${n} = ${n}^3 = ${ans}. Answer: ${ans}`;
    const items = [
      { text: String(take ? n * 3 - take * 3 : n * 3), code: 'POW-MULT', why: `It looks like you worked out ${n} x 3${take ? ` and ${take} x 3` : ''}. A cube ${n} long, wide and high has ${n} x ${n} x ${n} small cubes.` },
      { text: String(6 * n * n), code: 'SA-FACES-NOT-CUBES', why: `It looks like you counted the squares on the outside faces. Count the cubes in the whole solid: ${n} x ${n} x ${n}.` },
      take ? { text: String(n ** 3), code: 'ONE-STEP-ONLY', why: `${n ** 3} is the number of cubes before any were taken away. Take away the ${take ** 3} cube${take ** 3 === 1 ? '' : 's'} in the corner block.` } : { text: String(n * n), code: 'SQ-CUBE-MIX', why: `${n * n} is one layer (${n} x ${n}). There are ${n} layers, so multiply by ${n} again.` },
      take ? { text: String(n ** 3 - take), code: 'POW-MULT', why: `The corner block is ${take} x ${take} x ${take} = ${take ** 3} cube${take ** 3 === 1 ? '' : 's'}, not ${take}.` } : null,
    ];
    if (take === 1) items.pop();
    try {
      if (rng.chance(0.35)) {
        const t = typedMisconceptions(String(ans), items, { code: 'POW-MULT', why: 'A cube that is n long, n wide and n high is made of n x n x n small cubes.' });
        return { type: 'numeric', prompt, answer: numericAnswer(ans, [String(ans), `${ans} cubes`]), solution, ...t, marks: 2, skill: SKILL.cube };
      }
      return { type: 'mcq', prompt, ...choices(rng, String(ans), items, null), solution, marks: 2, skill: SKILL.cube };
    } catch { /* draw again */ }
  }
}

export default [temperature, countPastZero, compareNegatives, midpoint, factorsPrimes, hcfLcm, divisibility, squaresCubes];
