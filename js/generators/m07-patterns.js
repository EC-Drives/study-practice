// m07 Number patterns: sequences with a constant step (whole numbers, decimals, fractions, across
// zero), term-to-term and position-to-term rules, testing whether a number is in a sequence,
// matchstick and tile patterns, square and cube number sequences, function machines and letters.
// Patterns and ranges follow the CLO's generator guide (m07). Every wrong option is built by one
// named misconception and carries its code. Decimal terms are held as whole numbers of hundredths.

import { F, choices, typedMisconceptions, nearMiss, numericAnswer, fmtInt, person, ordinal, valueOf, countOf, term } from './core.js';

const T = 'm07-number-patterns';
const SKILL = {
  next: 'finding the next term (constant step)', zero: 'counting on and back past zero', ttt: 'finding the term-to-term rule', fd: 'sequences with fractions and decimals',
  use: 'using a position-to-term rule', find: 'finding a position-to-term rule', test: 'testing if a number is in a sequence',
  spatial: 'spatial patterns', sqcube: 'square and cube number sequences', fm: 'function machines', fmInv: 'inverse operations in function machines', letters: 'letters for unknown quantities',
};

// Misconception codes: all declared once in misconceptions.js (the CLO's catalogue).

/** u hundredths as text. */
function fx(u) { const neg = u < 0; const a = Math.abs(u); const ip = Math.floor(a / 100); const fp = String(a % 100).padStart(2, '0').replace(/0+$/, ''); return `${neg ? '-' : ''}${fmtInt(ip)}${fp ? `.${fp}` : ''}`; }
const fr = (f) => (Math.abs(f.n) > f.d && f.d !== 1 ? f.mixed() : f.toString());

/** The numbers written in a prompt, read the way the tests read them. */
const promptNums = (prompt) => (String(prompt).replace(/(\d) (\d{3})/g, '$1$2').match(/-?\d+(?:\.\d+)?(?:\/\d+)?/g) || []).map((t) => valueOf(t)).filter((x) => x != null);
/** A near miss is never a number that already appears in the question (CLO review X3): null if it does. */
const fresh = (prompt, d) => { if (!d) return null; const v = valueOf(d.text); return v != null && promptNums(prompt).some((x) => Math.abs(x - v) < 1e-9) ? null : d; };

// ---------------------------------------------------------------- g01 next / missing term

const nextTerm = {
  id: 'm02.next-term', topicId: 'm02-number-system', subtopicId: 'm02-s5', // moved from m07.next-term (m07-s1), book map 17 Oct 2026
  skill: SKILL.next,
  title: 'Next or missing term with a constant step (D1 whole numbers, also past zero; D2 decimals and fractions; D3 terms from far apart, first term below a value)',
  difficulties: [1, 2, 3],
  check: { min: -200 },
  make(rng, d) {
    if (d === 3) return rng.chance(0.55) ? fromFarApart(rng) : firstBelow(rng);
    for (;;) {
      if (d === 2 && rng.chance(0.4)) { const r = fractionSeq(rng); if (r) return r; continue; }
      const step = d === 1 ? rng.int(2, 12) * 100 : rng.pick([10, 20, 30, 40, 50, 25, 75, 15, 120, 150, 250, 35]);
      const up = rng.chance(0.6);
      const start = d === 1 ? rng.int(-10, 40) * 100 : rng.int(0, 100) * 10 + (step % 10 ? 0 : 0);
      const len = 4;
      const terms = Array.from({ length: len + 1 }, (_, i) => start + (up ? 1 : -1) * i * step);
      if (d === 2 && terms.some((t) => t < 0)) continue;
      const ask = rng.chance(0.65) ? len : rng.int(1, len - 1);
      const ans = terms[ask];
      const shown = terms.map((t, i) => (i === ask ? (ask === len ? null : '___') : fx(t))).filter((x) => x != null);
      const prompt = ask === len ? `What is the next term in this sequence? ${shown.join(', ')}, ...` : `Find the missing term in this sequence: ${shown.join(', ')}`;
      const prev = terms[ask - 1];
      const solution = `The sequence ${up ? 'goes up' : 'goes down'} by ${fx(step)} each time. ${fx(prev)} ${up ? '+' : '-'} ${fx(step)} = ${fx(ans)}.${ask < len ? ` Check: ${fx(ans)} ${up ? '+' : '-'} ${fx(step)} = ${fx(terms[ask + 1])}.` : ''} Answer: ${fx(ans)}`;
      const items = [
        { text: fx(up ? prev - step : prev + step), code: 'OP-SWAP', why: `The sequence ${up ? 'goes UP' : 'goes DOWN'} by ${fx(step)}, so ${up ? `add ${fx(step)} to` : `subtract ${fx(step)} from`} ${fx(prev)}.` },
        { text: fx(prev + (up ? 100 : -100)), code: 'SEQ-STEP-ONE', why: `It looks like you counted ${up ? 'on' : 'back'} by 1. The step between terms is ${fx(step)}.` },
        ans < 0 ? { text: fx(-ans), code: 'NEG-SIGN-DROP', why: `The size is right, but the sequence has gone below zero: ${fx(prev)} ${up ? '+' : '-'} ${fx(step)} = ${fx(ans)}.` } : null,
        start !== step && start > 0 && up ? { text: fx(prev + start), code: 'SEQ-FIRST-AS-STEP', why: `It looks like you added the first term, ${fx(start)}. The step is the difference between terms: ${fx(step)}.` } : null,
      ];
      for (let i = items.length - 1; i >= 0; i--) if (items[i] && /^-0\./.test(items[i].text)) items.splice(i, 1);
      const t = Math.floor(Math.abs(prev) / 10) % 10; const u = Math.floor(step / 10) % 10;
      if (d === 2 && up && prev % 10 === 0 && step % 10 === 0 && t + u >= 10) items.push({ text: `${Math.floor(prev / 100) + Math.floor(step / 100)}.${t + u}`, code: 'PV-REGROUP-AS-DIGITS', why: `It looks like you wrote ${t} tenth${t === 1 ? '' : 's'} + ${u} tenth${u === 1 ? '' : 's'} = ${t + u} tenths as ".${t + u}". 10 tenths make 1 whole, so carry 1 into the ones.` });
      const skill = d === 2 ? SKILL.fd : terms.some((x) => x < 0) ? SKILL.zero : SKILL.next;
      try {
        if (rng.chance(0.3)) {
          const tm = typedMisconceptions(fx(ans), items, { code: 'OP-SWAP', why: 'Find the difference between neighbouring terms, then use it on the term before.' });
          return { type: 'numeric', prompt, answer: numericAnswer(ans / 100, [fx(ans)]), solution, ...tm, skill };
        }
        return { type: 'mcq', prompt, ...choices(rng, fx(ans), items, (i) => fresh(prompt, nearMiss(fx(ans + (i % 2 ? 10 : -10) * i), 'Find the difference between neighbouring terms first.'))), solution, skill };
      } catch { /* draw again */ }
    }
  },
};

function fractionSeq(rng) {
  const den = rng.pick([2, 4, 5, 8, 10]);
  const k = rng.int(1, den - 1);
  const step = F(k, den);
  const start = F(rng.int(0, 3 * den), den);
  const terms = Array.from({ length: 5 }, (_, i) => start.add(step.mul(i)));
  const prev = terms[3]; const ans = terms[4];
  if (step.d === 1) return null;
  const prompt = `What is the next term in this sequence? ${terms.slice(0, 4).map(fr).join(', ')}, ...`;
  const solution = `Each term is ${fr(step)} more than the one before. ${fr(prev)} + ${fr(step)} = ${fr(ans)}. Answer: ${fr(ans)}`;
  const items = [
    { text: fr(prev.sub(step)), code: 'OP-SWAP', why: `The sequence goes up by ${fr(step)}, so add ${fr(step)} to ${fr(prev)}.` },
    prev.n < prev.d && prev.n > 0 ? { text: `${prev.n + step.n}/${prev.d + step.d}`, code: 'FR-ADD-TOPS-BOTTOMS', why: `It looks like you added the tops and the bottoms. Write both fractions with the same denominator, then add only the numerators.` } : null,
    { text: fr(prev.add(1)), code: 'SEQ-STEP-ONE', why: `It looks like you added 1. The step between terms is ${fr(step)}.` },
  ];
  try { return { type: 'mcq', prompt, ...choices(rng, fr(ans), items, (i) => fresh(prompt, nearMiss(fr(ans.add(F(i % 2 ? 1 : -1, den * 2))), `Find the step: the difference between two neighbouring terms.`))), solution, skill: SKILL.fd }; } catch { return null; }
}

function fromFarApart(rng) {
  for (;;) {
    const halves = rng.chance(0.5);
    const a = halves ? F(rng.int(1, 12), 4) : F(rng.int(1, 20));
    const step = halves ? F(rng.int(1, 7), 2) : F(rng.int(2, 9));
    if (step.isInt && halves) continue;
    if (a.eq(step)) continue; // the step must not be a number that is already in the question
    const b = a.add(step.mul(3));
    const ans = a.add(step);
    const prompt = `A sequence goes up in equal steps. The 1st term is ${fr(a)} and the 4th term is ${fr(b)}. What is the 2nd term?`;
    const solution = `From the 1st term to the 4th term there are 3 equal steps (not 4). ${fr(b)} - ${fr(a)} = ${fr(b.sub(a))}, so one step is ${fr(b.sub(a))} ÷ 3 = ${fr(step)}. 2nd term: ${fr(a)} + ${fr(step)} = ${fr(ans)}. Answer: ${fr(ans)}`;
    const items = [
      { text: fr(a.add(b.sub(a).div(4))), code: 'SEQ-OFF-BY-ONE', why: 'It looks like you divided the difference by 4. From the 1st to the 4th term there are only 3 steps.' },
      { text: fr(step), code: 'ONE-STEP-ONLY', why: `${fr(step)} is the size of each step. Add it to the 1st term to get the 2nd term.` },
      { text: fr(a.add(step.mul(2))), code: 'WRONG-QUANTITY', why: `${fr(a.add(step.mul(2)))} is the 3rd term. The question asks for the 2nd.` },
    ];
    try {
      if (rng.chance(0.4)) {
        const t = typedMisconceptions(fr(ans), items.slice(0, 2), { code: 'SEQ-OFF-BY-ONE', why: 'Count the steps between the 1st and 4th terms: there are 3.' });
        return { type: 'numeric', prompt, answer: numericAnswer(ans.value, [...new Set([fr(ans), ans.toString(), ...(ans.terminates ? [ans.decimal()] : [])])]), solution, ...t, marks: 2, skill: halves ? SKILL.fd : SKILL.next };
      }
      return { type: 'mcq', prompt, ...choices(rng, fr(ans), items, null), solution, marks: 2, skill: halves ? SKILL.fd : SKILL.next };
    } catch { /* draw again */ }
  }
}

function firstBelow(rng) {
  for (;;) {
    const start = rng.int(5, 40); const step = rng.int(3, 9); const limit = -rng.int(1, 3) * 5 - 5;
    let k = 0; while (start - k * step >= limit) k++;
    const ans = start - k * step; const before = ans + step;
    if (k < 3 || before === limit) continue;
    const prompt = `A sequence starts at ${start} and counts back in steps of ${step}: ${start}, ${start - step}, ${start - 2 * step}, ... What is the first term that is less than ${limit}?`;
    const solution = `Keep subtracting ${step}: ${Array.from({ length: k + 1 }, (_, i) => start - i * step).join(', ')}. ${before} is not less than ${limit}, but ${ans} is. Answer: ${ans}`;
    const items = [
      { text: String(before), code: 'SEQ-OFF-BY-ONE', why: `${before} is the term before. It is not less than ${limit}: on a number line ${before} is to the right of ${limit}.` },
      { text: String(ans - step), code: 'SEQ-OFF-BY-ONE', why: `${ans - step} is less than ${limit}, but it is not the FIRST one: ${ans} comes before it.` },
      { text: String(-before), code: 'NEG-ORDER', why: `It looks like you lost a minus sign. Count back from ${start} in steps of ${step}, past zero.` },
    ];
    try { return { type: 'mcq', prompt, ...choices(rng, String(ans), items, null), solution, marks: 2, skill: SKILL.zero }; } catch { /* draw again */ }
  }
}

// ---------------------------------------------------------------- g02 term-to-term rule

const termToTerm = {
  id: 'm02.term-to-term', topicId: 'm02-number-system', subtopicId: 'm02-s5', // moved from m07.term-to-term (m07-s1), book map 17 Oct 2026
  skill: SKILL.ttt,
  title: 'The term-to-term rule (D1 whole-number steps; D2 decimal steps, or which sequence has a given rule)',
  difficulties: [1, 2],
  check: {},
  make(rng, d) {
    for (;;) {
      if (d === 2 && rng.chance(0.5)) return whichSequence(rng);
      const step = d === 1 ? rng.int(2, 12) * 100 : rng.pick([25, 50, 20, 30, 40, 75, 15, 150]);
      const up = rng.chance(0.6);
      const start = d === 1 ? rng.int(1, 40) * 100 : rng.int(1, 60) * 10;
      const terms = Array.from({ length: 4 }, (_, i) => start + (up ? 1 : -1) * i * step);
      if (terms.some((t) => t < 0)) continue;
      const rule = `${up ? 'add' : 'subtract'} ${fx(step)}`;
      const prompt = `What is the term-to-term rule for this sequence? ${terms.map(fx).join(', ')}, ...`;
      const solution = `Find the difference between neighbouring terms: ${fx(terms[1])} - ${fx(terms[0])} = ${up ? '' : '-'}${fx(step)}, so each term is ${fx(step)} ${up ? 'more' : 'less'} than the one before. Check: ${fx(terms[2])} - ${fx(terms[1])} = ${up ? '' : '-'}${fx(step)} too. The rule is "${rule}". Answer: ${rule}`;
      const items = [
        { text: `${up ? 'subtract' : 'add'} ${fx(step)}`, code: 'OP-SWAP', why: `The terms get ${up ? 'bigger' : 'smaller'}, so the rule ${up ? 'adds' : 'subtracts'}. It looks like you read the sequence the wrong way.` },
        start !== step && up ? { text: `add ${fx(start)}`, code: 'SEQ-FIRST-AS-STEP', why: `${fx(start)} is the first term. The rule is the change from one term to the next: ${fx(step)}.` } : null,
        step !== 100 ? { text: `${up ? 'add' : 'subtract'} 1`, code: 'SEQ-STEP-ONE', why: `The terms change by ${fx(step)} each time, not by 1.` } : null,
        { text: `multiply by ${Math.round(terms[1] / terms[0]) > 1 ? Math.round(terms[1] / terms[0]) : 2}`, code: 'SEQ-CHECK-ONE-STEP', why: 'Check every step: multiplying does not give the same change each time, but this sequence changes by the same amount every time.' },
      ];
      try { return { type: 'mcq', prompt, ...choices(rng, rule, items, null), solution, skill: SKILL.ttt }; } catch { /* draw again */ }
    }
  },
};

function whichSequence(rng) {
  for (;;) {
    const s = rng.int(2, 9); const sub = rng.chance(0.5);
    const a = rng.int(sub ? 3 * s + 1 : 1, 40);
    const seq = (st, steps) => { const out = [st]; for (const x of steps) out.push(out[out.length - 1] + x); return out.join(', ') + ', ...'; };
    const sg = sub ? -1 : 1;
    const correct = seq(a, [sg * s, sg * s, sg * s]);
    const b = rng.int(1, 40);
    const items = [
      { text: seq(b, [-sg * s, -sg * s, -sg * s]), code: 'OP-SWAP', why: `This sequence ${sub ? 'ADDS' : 'SUBTRACTS'} ${s} each time. The rule asks you to ${sub ? 'subtract' : 'add'} ${s}.` },
      { text: seq(rng.int(sub ? 3 * s + 3 : 1, 45), [sg * s, sg * (s + 1), sg * (s + 2)]), code: 'SEQ-CHECK-ONE-STEP', why: `Only the first step is ${sub ? '-' : '+'}${s}. Check every step: the next ones are ${sub ? '-' : '+'}${s + 1} and ${sub ? '-' : '+'}${s + 2}.` },
      { text: seq(rng.int(sub ? 3 * s + 3 : 1, 45), [sg * (s + 1), sg * (s + 1), sg * (s + 1)]), code: 'NEAR-MISS', why: `Not quite: this sequence changes by ${s + 1} each time, not ${s}. Check the size of each step.` },
    ];
    if (items.some((it) => it.text.includes('-'))) continue;
    const rule = `${sub ? 'subtract' : 'add'} ${s}`;
    const prompt = `Which sequence has the term-to-term rule '${rule}'?`;
    const solution = `Check every step of each sequence. In ${correct.replace(', ...', '')} each term is ${s} ${sub ? 'less' : 'more'} than the one before. Answer: ${correct}`;
    try { return { type: 'mcq', prompt, ...choices(rng, correct, items, null), solution, skill: SKILL.ttt }; } catch { /* draw again */ }
  }
}

// ---------------------------------------------------------------- g03, g04, g05 position-to-term rules

const ruleText = (a, b) => `term = ${a} x position${b > 0 ? ` + ${b}` : b < 0 ? ` - ${-b}` : ''}`;

const positionToTerm = {
  id: 'm07.position-to-term', topicId: T, subtopicId: 'm07-s2', skill: SKILL.use,
  title: 'Position-to-term rules (D1 use a rule; D2 find the rule or a far term from a sequence; D3 which position, is it in the sequence, rows of chairs)',
  difficulties: [1, 2, 3],
  check: {},
  make(rng, d) {
    for (;;) {
      const a = rng.int(2, 9); const b = rng.int(-5, 10);
      if (a + b <= 0) continue;
      if (d === 1) {
        const n = rng.int(5, 30);
        const ans = a * n + b;
        const prompt = `The position-to-term rule for a sequence is: ${ruleText(a, b)}. What is the ${ordinalWord(n)} term?`;
        const solution = `Put the position into the rule: ${a} x ${n}${b > 0 ? ` + ${b}` : b < 0 ? ` - ${-b}` : ''} = ${ans}. Answer: ${ans}`;
        const items = [
          { text: String(a * (n - 1) + b), code: 'SEQ-OFF-BY-ONE', why: `That is the term in position ${n - 1}. Use position ${n} in the rule.` },
          b !== 0 ? { text: String(a * n), code: 'ONE-STEP-ONLY', why: `${a} x ${n} = ${a * n} is only the first part of the rule. Now ${b > 0 ? 'add' : 'subtract'} ${Math.abs(b)}.` } : null,
          { text: String(n + a + b), code: 'SEQ-ADD-NOT-MULT', why: `It looks like you added ${a} to the position. The rule says ${a} x position.` },
          { text: String(a * (n + 1) + b), code: 'SEQ-OFF-BY-ONE', why: `That is the term in position ${n + 1}. Use position ${n} in the rule.` },
        ];
        try { return { type: 'mcq', prompt, ...choices(rng, String(ans), items, null), solution, skill: SKILL.use }; } catch { continue; }
      }
      const first = a + b;
      const seq = [1, 2, 3, 4].map((k) => a * k + b).join(', ');
      if (d === 2) {
        if (rng.chance(0.5)) {
          const correct = ruleText(a, b);
          const prompt = `Look at the sequence ${seq}, ... Which is its position-to-term rule?`;
          const solution = `The terms go up by ${a}, so the rule starts "${a} x position". ${a} x 1 = ${a}, and the first term is ${first}, so ${b >= 0 ? `add ${b}` : `subtract ${-b}`}. Check: ${a} x 2 ${b >= 0 ? `+ ${b}` : `- ${-b}`} = ${2 * a + b}. Answer: ${correct}`;
          if (b === 0) continue;
          const items = [
            { text: ruleText(a, 0), code: 'SEQ-STEP-AS-RULE', why: `${a} x position gives ${a}, ${2 * a}, ${3 * a}, ... The sequence starts at ${first}, so you also need to ${b > 0 ? 'add' : 'subtract'} ${Math.abs(b)}.` },
            { text: `term = position + ${a}`, code: 'SEQ-ADD-NOT-MULT', why: `position + ${a} gives ${1 + a}, ${2 + a}, ${3 + a}, ... going up in ones. This sequence goes up by ${a}, so multiply the position by ${a}.` },
            { text: ruleText(a, first), code: 'SEQ-OFF-BY-ONE', why: `This adds the first term. ${a} x 1 + ${first} = ${a + first}, not ${first}. Check the rule with position 1.` },
          ];
          try { return { type: 'mcq', prompt, ...choices(rng, correct, items, null), solution, skill: SKILL.find }; } catch { continue; }
        }
        const nn = rng.pick([10, 12, 15, 20, 25, 30, 50, 100]);
        const ans = a * nn + b;
        const prompt = `A sequence starts ${seq}, ... What is the ${ordinalWord(nn)} term?`;
        const solution = `The step is ${a}, so the rule is ${a} x position ${b >= 0 ? `+ ${b}` : `- ${-b}`} (check: ${a} x 1 ${b >= 0 ? `+ ${b}` : `- ${-b}`} = ${first}). ${ordinalWord(nn)} term: ${a} x ${nn} ${b >= 0 ? `+ ${b}` : `- ${-b}`} = ${ans}. Answer: ${ans}`;
        const items = [
          b !== 0 ? { text: String(a * nn), code: 'SEQ-STEP-AS-RULE', why: `${a} x ${nn} = ${a * nn} uses only the step. The sequence does not start at ${a}, so adjust by ${b > 0 ? '+' : '-'}${Math.abs(b)}.` } : null,
          { text: String(first + a * nn), code: 'SEQ-OFF-BY-ONE', why: `It looks like you added ${nn} steps to the first term. From the 1st term to the ${ordinalWord(nn)} there are only ${nn - 1} steps.` },
          { text: String(first * nn), code: 'SEQ-FIRST-TIMES-N', why: `It looks like you multiplied the first term, ${first}, by ${nn}. The terms go up by ${a} each time, so use ${a} x position, then adjust.` },
        ];
        try {
          if (rng.chance(0.4)) {
            const t = typedMisconceptions(String(ans), items, { code: 'SEQ-OFF-BY-ONE', why: 'Find the rule first (step x position, then adjust), and check it with the first term.' });
            return { type: 'numeric', prompt, answer: numericAnswer(ans, [String(ans)]), solution, ...t, marks: 2, skill: SKILL.use };
          }
          return { type: 'mcq', prompt, ...choices(rng, String(ans), items, null), solution, marks: 2, skill: SKILL.use };
        } catch { continue; }
      }
      // D3
      const kind = rng.int(0, 2);
      if (kind === 0) {
        const n = rng.int(6, 40); const Tm = a * n + b;
        const prompt = `The rule for a sequence is ${ruleText(a, b)}. Which position has the term ${Tm}?`;
        const solution = `Work backwards with inverse operations: ${b > 0 ? `${Tm} - ${b}` : b < 0 ? `${Tm} + ${-b}` : Tm} = ${Tm - b}, then ${Tm - b} ÷ ${a} = ${n}. Check: ${a} x ${n} ${b >= 0 ? `+ ${b}` : `- ${-b}`} = ${Tm}. Answer: ${n}`;
        const items = [
          b !== 0 && (Tm + b) % a === 0 ? { text: String((Tm + b) / a), code: 'INVERSE-WRONG', why: `It looks like you ${b > 0 ? 'added' : 'subtracted'} ${Math.abs(b)} instead of undoing it. Undo "${b > 0 ? '+' : '-'} ${Math.abs(b)}" first, then divide by ${a}.` } : null,
          b !== 0 && Tm % a === 0 && Tm / a - b > 0 ? { text: String(Tm / a - b), code: 'FM-ORDER', why: `It looks like you divided by ${a} first. Undo the operations in reverse order: first undo the ${b > 0 ? '+' : '-'} ${Math.abs(b)}, then the x ${a}.` } : null,
          { text: String(n + 1), code: 'SEQ-OFF-BY-ONE', why: `Check: ${a} x ${n + 1} ${b >= 0 ? `+ ${b}` : `- ${-b}`} = ${a * (n + 1) + b}, not ${Tm}.` },
          { text: String(Tm), code: 'WRONG-QUANTITY', why: `${Tm} is the term. The question asks for its position.` },
        ];
        try { return { type: 'mcq', prompt, ...choices(rng, String(n), items, null), solution, marks: 2, skill: SKILL.test }; } catch { continue; }
      }
      if (kind === 1) {
        const Tm = rng.int(30, 200);
        const truth = (Tm - b) % a === 0 && (Tm - b) / a >= 1;
        if (!truth && rng.chance(0.5)) continue;
        const prompt = `True or false: The number ${Tm} is a term in the sequence with the rule ${ruleText(a, b)}.`;
        const pos = (Tm - b) / a;
        const solution = truth
          ? `Work backwards: (${Tm} ${b >= 0 ? `- ${b}` : `+ ${-b}`}) ÷ ${a} = ${pos}, a whole number. So ${Tm} is the ${ordinalWord(pos)} term. The statement is true. Answer: true`
          : `Work backwards: (${Tm} ${b >= 0 ? `- ${b}` : `+ ${-b}`}) ÷ ${a} = ${Tm - b} ÷ ${a}, which is not a whole number, so no position gives ${Tm}. The statement is false. Answer: false`;
        return { type: 'truefalse', prompt, answer: truth, solution, misconceptions: { common: 'A number is in the sequence only if working backwards gives a WHOLE-number position.' }, codes: { common: 'INVERSE-WRONG' }, marks: 2, skill: SKILL.test };
      }
      const f = rng.int(8, 20); const s = rng.int(2, 4); const n = rng.int(6, 15); // a real hall: at most about 75 chairs in a row (CLO review m07 item 2)
      const ans = f + s * (n - 1);
      const prompt = `In a school hall, Row 1 has ${f} chairs. Each row has ${s} more chairs than the row in front of it. How many chairs are in Row ${n}?`;
      const solution = `From Row 1 to Row ${n} there are ${n - 1} steps of ${s}. ${f} + ${n - 1} x ${s} = ${f} + ${(n - 1) * s} = ${ans}. Answer: ${ans}`;
      const items = [
        { text: String(f + s * n), code: 'SEQ-OFF-BY-ONE', why: `It looks like you added ${n} steps. From Row 1 to Row ${n} there are only ${n - 1} steps.` },
        { text: String(s * n), code: 'SEQ-STEP-AS-RULE', why: `${s} x ${n} uses only the step. Row 1 already has ${f} chairs.` },
        { text: String(f * n), code: 'SEQ-FIRST-TIMES-N', why: `It looks like you multiplied the ${f} chairs in Row 1 by ${n}, the row number. The rows are not all the same: each row has only ${s} more than the row in front.` },
      ];
      try {
        if (rng.chance(0.4)) {
          const t = typedMisconceptions(String(ans), items, { code: 'SEQ-OFF-BY-ONE', why: 'Count the steps from Row 1: there is one step fewer than the row number.' });
          return { type: 'numeric', prompt, answer: numericAnswer(ans, [String(ans), `${ans} chairs`]), solution, ...t, marks: 2, skill: SKILL.use };
        }
        return { type: 'mcq', prompt, ...choices(rng, String(ans), items, null), solution, marks: 2, skill: SKILL.use };
      } catch { /* draw again */ }
    }
  },
};

const ordinalWord = ordinal;

// ---------------------------------------------------------------- g06 matchstick and tile patterns

const SHAPES = [
  { name: 'triangle', per: 3, step: 2, sticks: true, first: 'a triangle made from 3 matchsticks', grow: 'joins one more triangle onto the end, sharing a side' },
  { name: 'square', per: 4, step: 3, sticks: true, first: 'a square made from 4 matchsticks', grow: 'joins one more square onto the end of the row, sharing a side' },
  { name: 'pentagon', per: 5, step: 4, sticks: true, first: 'a house shape (a pentagon) made from 5 matchsticks', grow: 'joins one more house onto the end of the row, sharing a side' },
  { name: 'hexagon', per: 6, step: 5, sticks: true, first: 'a hexagon made from 6 matchsticks', grow: 'joins one more hexagon onto the end of the row, sharing a side' },
];

const spatial = {
  id: 'm07.spatial', topicId: T, subtopicId: 'm07-s3', skill: SKILL.spatial,
  title: 'Matchstick patterns (D1 a near pattern; D2 a far pattern; D3 which pattern uses a given number of matchsticks)',
  difficulties: [1, 2, 3],
  check: { min: 0 },
  make(rng, d) {
    for (;;) {
      const s = rng.pick(SHAPES);
      const c = s.per - s.step; // count = step x n + c
      const count = (n) => s.step * n + c;
      const who = person(rng);
      const intro = `${who.name} makes patterns with matchsticks. Pattern 1 is ${s.first}. Each new pattern ${s.grow}. Patterns 1, 2 and 3 use ${count(1)}, ${count(2)} and ${count(3)} matchsticks.`;
      if (d === 3) {
        const n = rng.int(10, 60); const total = count(n);
        const prompt = `${intro} Which pattern uses ${total} matchsticks?`;
        const solution = `Each new ${s.name} adds ${s.step} matchsticks, so pattern n uses ${s.step} x n + ${c}. Work backwards: (${total} - ${c}) ÷ ${s.step} = ${n}. Answer: Pattern ${n}`;
        const items = [
          { text: `Pattern ${Math.round(total / s.per)}`, code: 'SHARED-COUNTED-TWICE', why: `It looks like you divided by ${s.per}, as if every ${s.name} had its own ${s.per} matchsticks. The ${s.name}s share sides, so each new one adds only ${s.step}.` },
          total % s.step === 0 ? { text: `Pattern ${total / s.step}`, code: 'SEQ-STEP-AS-RULE', why: `It looks like you divided ${total} by ${s.step} without taking off the ${c} first. Pattern n uses ${s.step} x n + ${c}.` } : { text: `Pattern ${n + 1}`, code: 'SEQ-OFF-BY-ONE', why: `Pattern ${n + 1} uses ${count(n + 1)} matchsticks, not ${total}.` },
          { text: `Pattern ${n - 1}`, code: 'SEQ-OFF-BY-ONE', why: `Pattern ${n - 1} uses ${count(n - 1)} matchsticks, not ${total}.` },
        ];
        if (Math.round(total / s.per) === n) items.shift();
        try { return { type: 'mcq', prompt, ...choices(rng, `Pattern ${n}`, items, null), solution, marks: 2 }; } catch { continue; }
      }
      const k = d === 1 ? rng.int(4, 10) : rng.int(11, 40);
      const ans = count(k);
      const prompt = `${intro} How many matchsticks are in Pattern ${k}?`;
      const solution = `Each new ${s.name} adds ${s.step} matchsticks (one side is shared). Pattern ${k} uses ${count(1)} + ${k - 1} x ${s.step} = ${ans} matchsticks. Answer: ${ans}`;
      const items = [
        { text: String(s.per * k), code: 'SHARED-COUNTED-TWICE', why: `It looks like you gave every ${s.name} its own ${s.per} matchsticks. Neighbouring ${s.name}s share a matchstick, so each new one adds only ${s.step}.` },
        { text: String(s.step * k), code: 'SEQ-STEP-AS-RULE', why: `${s.step} x ${k} counts the new matchsticks but forgets the extra ${c} that Pattern 1 starts with.` },
        { text: String(count(k - 1)), code: 'SEQ-OFF-BY-ONE', why: `That is Pattern ${k - 1}. Pattern ${k} has one more ${s.name}.` },
        { text: String(k + s.step), code: 'SEQ-ADD-NOT-MULT', why: `It looks like you added ${s.step} to ${k}. Each pattern adds ${s.step}, so multiply: ${s.step} x ${k} + ${c}.` },
      ];
      try {
        if (d === 2 && rng.chance(0.4)) {
          const t = typedMisconceptions(String(ans), items, { code: 'SHARED-COUNTED-TWICE', why: `Each new ${s.name} adds only ${s.step} matchsticks, because it shares a side.` });
          return { type: 'numeric', prompt, answer: numericAnswer(ans, [String(ans), `${ans} matchsticks`]), solution, ...t, marks: 2 };
        }
        return { type: 'mcq', prompt, ...choices(rng, String(ans), rng.shuffle(items), null), solution, marks: d };
      } catch { /* draw again */ }
    }
  },
};

// ---------------------------------------------------------------- g07 square and cube sequences

const squareCube = {
  id: 'm07.square-cube', topicId: T, subtopicId: 'm07-s3', skill: SKILL.sqcube,
  title: 'Square and cube number sequences (D1 next term, term = position x position; D2 squares plus or minus a number, gaps between squares)',
  difficulties: [1, 2],
  check: { min: 0, integer: true },
  make(rng, d) {
    for (;;) {
      if (d === 1) {
        const kind = rng.int(0, 9);
        if (kind >= 5 && kind < 8) {
          const cube = rng.chance(0.3);
          const e = cube ? 3 : 2;
          const len = cube ? rng.int(3, 4) : rng.int(4, 5); const from = cube ? 1 : rng.int(1, 12 - len);
          const k = from + len - 1; // D1 stays at 12^2 and 5^3 or below (CLO review m07 item 6)
          if (cube && k > 4) continue;
          const shown = Array.from({ length: len }, (_, i) => (from + i) ** e);
          const ans = (k + 1) ** e; const lastGap = shown[len - 1] - shown[len - 2];
          const prompt = `What is the next number in this sequence of ${cube ? 'cube' : 'square'} numbers? ${shown.join(', ')}, ...`;
          const solution = `These are ${cube ? 'cube' : 'square'} numbers: ${from}^${e}, ${from + 1}^${e}, ${from + 2}^${e}, ... The next is ${k + 1}^${e} = ${Array(e).fill(k + 1).join(' x ')} = ${ans}. Answer: ${ans}`;
          const items = [
            { text: String(shown[len - 1] + lastGap), code: 'SEQ-SAME-GAP', why: `It looks like you added the last gap (${lastGap}) again. The gaps grow each time: the next ${cube ? 'cube' : 'square'} is ${k + 1}^${e}.` },
            { text: String((k + 1) * e), code: 'POW-MULT', why: `${k + 1} x ${e} is not ${k + 1}^${e}. ${k + 1}^${e} means ${Array(e).fill(k + 1).join(' x ')}.` },
            { text: String((k + 2) ** e), code: 'SEQ-OFF-BY-ONE', why: `${(k + 2) ** e} is ${k + 2}^${e}, one ${cube ? 'cube' : 'square'} too far. The next is ${k + 1}^${e}.` },
          ];
          try { return { type: 'mcq', prompt, ...choices(rng, String(ans), items, null), solution }; } catch { continue; }
        }
        if (kind < 5) {
          const b = rng.int(5, 12); const sq = b * b;
          const twice = 2 * rng.int(4, 20); const cube = rng.pick([8, 27, 125]);
          if (Number.isInteger(Math.sqrt(twice))) continue;
          const items = [
            { text: String(twice), code: 'POW-MULT', why: `${twice} = ${twice / 2} x 2. Square numbers are a number times ITSELF: ${twice / 2} x ${twice / 2} = ${(twice / 2) ** 2}.` },
            { text: String(cube), code: 'SQ-CUBE-MIX', why: `${cube} is a cube number (${Array(3).fill(Math.round(Math.cbrt(cube))).join(' x ')}), not a square number. A square number is a number times itself once: 1 x 1, 2 x 2, 3 x 3, ...` },
            nearMiss(String(sq + rng.pick([1, 2, -1])), 'Square numbers are 1, 4, 9, 16, 25, ... (1 x 1, 2 x 2, 3 x 3, ...).'),
          ];
          try { const c = choices(rng, String(sq), items, null); return { type: 'mcq', prompt: 'Which of these numbers is in the sequence of square numbers 1, 4, 9, 16, ...?', ...c, solution: `Square numbers are made by multiplying a number by itself. ${b} x ${b} = ${sq}. Answer: ${sq}` }; } catch { continue; }
        }
        const n = rng.int(6, 12); const ans = n * n;
        const prompt = `The sequence 1, 4, 9, 16, ... has the rule term = position x position. What is the ${ordinalWord(n)} term?`;
        const solution = `Put the position into the rule: ${n} x ${n} = ${ans}. Answer: ${ans}`;
        const items = [
          { text: String(2 * n), code: 'POW-MULT', why: `It looks like you worked out ${n} x 2. The rule is position x position: ${n} x ${n}.` },
          { text: String((n - 1) ** 2), code: 'SEQ-OFF-BY-ONE', why: `That is the ${ordinalWord(n - 1)} term. Use position ${n}.` },
          { text: String(n * n + 2 * n + 1), code: 'SEQ-OFF-BY-ONE', why: `That is the ${ordinalWord(n + 1)} term. Use position ${n}.` },
        ];
        try { return { type: 'mcq', prompt, ...choices(rng, String(ans), items, null), solution }; } catch { continue; }
      }
      // D2: squares plus or minus a number, or the gap between two squares
      if (rng.chance(0.55)) {
        const c = rng.int(-5, 9); if (c === 0) continue;
        const shown = [1, 2, 3, 4, 5].map((k) => k * k + c);
        if (shown[0] < 0) continue;
        const n = rng.int(8, 25); const ans = n * n + c;
        const prompt = `The sequence ${shown.join(', ')}, ... is made by ${c > 0 ? `adding ${c} to` : `subtracting ${-c} from`} each square number. What is the ${ordinalWord(n)} term?`;
        const solution = `The ${ordinalWord(n)} square number is ${n} x ${n} = ${n * n}. ${n * n} ${c > 0 ? `+ ${c}` : `- ${-c}`} = ${ans}. Answer: ${ans}`;
        const items = [
          { text: String(n * n), code: 'ONE-STEP-ONLY', why: `${n * n} is the ${ordinalWord(n)} square number. Now ${c > 0 ? `add ${c}` : `subtract ${-c}`}.` },
          { text: String(2 * n + c), code: 'POW-MULT', why: `It looks like you worked out ${n} x 2. The ${ordinalWord(n)} square number is ${n} x ${n}.` },
          { text: String((n - 1) ** 2 + c), code: 'SEQ-OFF-BY-ONE', why: `That is the ${ordinalWord(n - 1)} term. Use the ${ordinalWord(n)} square number.` },
        ];
        try { return { type: 'mcq', prompt, ...choices(rng, String(ans), items, null), solution, marks: 2 }; } catch { continue; }
      }
      const n = rng.int(5, 30); const ans = 2 * n - 1;
      const prompt = `${person(rng).name} makes square patterns with tiles. Pattern 1 is a 1 by 1 square of tiles, Pattern 2 is a 2 by 2 square, Pattern 3 is a 3 by 3 square, and so on. How many more tiles does Pattern ${n} have than Pattern ${n - 1}?`;
      const solution = `Pattern ${n} has ${n} x ${n} = ${n * n} tiles and Pattern ${n - 1} has ${n - 1} x ${n - 1} = ${(n - 1) ** 2}. ${n * n} - ${(n - 1) ** 2} = ${ans}. Answer: ${ans}`;
      const items = [
        { text: String(n * n), code: 'WRONG-QUANTITY', why: `${n * n} is the number of tiles in Pattern ${n}. The question asks how many MORE than Pattern ${n - 1}.` },
        { text: String(2 * n), code: 'CORNER-COUNTED-TWICE', why: `It looks like you added a new row of ${n} and a new column of ${n}. They share the corner tile, so the new tiles are ${n} + ${n} - 1 = ${ans}.` },
        { text: '1', code: 'SEQ-STEP-ONE', why: 'Each pattern is one tile wider, but it gains a whole new row AND column of tiles.' },
      ];
      try { return { type: 'mcq', prompt, ...choices(rng, String(ans), items, null), solution, marks: 2 }; } catch { /* draw again */ }
    }
  },
};

// ---------------------------------------------------------------- g08 function machines

const OP = { mul: (x, k) => x * k, add: (x, k) => x + k, sub: (x, k) => x - k, div: (x, k) => x / k };
const SIGN = { mul: 'x', add: '+', sub: '-', div: '÷' };
const INV = { mul: 'div', add: 'sub', sub: 'add', div: 'mul' };

const functionMachine = {
  id: 'm07.function-machine', topicId: T, subtopicId: 'm07-s4', skill: SKILL.fm,
  title: 'Function machines (D1 forwards; D2 backwards, or find the rule from pairs; D3 backwards with decimals)',
  difficulties: [1, 2, 3],
  check: {},
  make(rng, d) {
    for (;;) {
      if (d === 2 && rng.chance(0.35)) return findRule(rng);
      const o1 = rng.pick(['mul', 'mul', 'div']); const o2 = rng.pick(['add', 'sub']);
      const order = rng.chance(0.7) ? [o1, o2] : [o2, o1];
      // multipliers and divisors are whole numbers 2-9; at D3 the decimals are only in the + and - steps,
      // so working back never means dividing by a decimal (CLO review m07 item 1)
      const k1 = o1 === 'div' ? rng.int(2, d === 3 ? 5 : 9) : rng.int(2, 9);
      const k2 = d === 3 ? rng.pick([0.5, 1.5, 2.5, 3.5, 4.5, 1.2, 2.4, 0.8]) : rng.int(1, 15);
      const ks = order.map((o) => (o === o1 ? k1 : k2));
      const steps = order.map((o, i) => `${SIGN[o]} ${ks[i]}`);
      const run = (x, ops = order, kk = ks) => ops.reduce((v, o, i) => OP[o](v, kk[i]), x);
      const input = d === 1 ? rng.int(2, 20) : d === 2 ? rng.int(2, 30) : rng.int(2, 24);
      const output = run(input);
      const ok = (v) => v != null && Number.isFinite(v) && v >= 0 && Math.abs(v * 10 - Math.round(v * 10)) < 1e-9;
      if (!ok(output) || output === input) continue;
      const fmt = (v) => String(Math.round(v * 10) / 10);
      if (d === 1) {
        const prompt = `A function machine does: ${steps.join(', then ')}. The input is ${input}. What is the output?`;
        const diagram = { type: 'functionMachine', steps, input: String(input), output: '?' };
        const solution = `${input} ${steps[0]} = ${fmt(run(input, [order[0]], [ks[0]]))}. Then ${fmt(run(input, [order[0]], [ks[0]]))} ${steps[1]} = ${fmt(output)}. Answer: ${fmt(output)}`;
        const swapped = run(input, [order[1], order[0]], [ks[1], ks[0]]);
        const items = [
          ok(swapped) ? { text: fmt(swapped), code: 'FM-ORDER', why: `It looks like you did "${steps[1]}" first. Follow the machine in order: ${steps[0]} first, then ${steps[1]}.` } : null,
          { text: fmt(run(input, [order[0]], [ks[0]])), code: 'ONE-STEP-ONLY', why: `That is the number after the first step only. Now ${steps[1]}.` },
        ];
        try { return { type: 'mcq', prompt, ...choices(rng, fmt(output), items, (i) => fresh(prompt, nearMiss(fmt(output + (i % 2 ? i : -i)), 'Do the steps in order, one at a time.'))), solution, diagram, skill: SKILL.fm }; } catch { continue; }
      }
      // backwards
      const prompt = `A function machine does: ${steps.join(', then ')}. The output is ${fmt(output)}. What was the input?`;
      const diagram = { type: 'functionMachine', steps, input: '?', output: fmt(output) };
      const back1 = OP[INV[order[1]]](output, ks[1]);
      const solution = `Work backwards with the inverse operations, in reverse order. Undo "${steps[1]}": ${fmt(output)} ${SIGN[INV[order[1]]]} ${ks[1]} = ${fmt(back1)}. Undo "${steps[0]}": ${fmt(back1)} ${SIGN[INV[order[0]]]} ${ks[0]} = ${input}. Check: ${input} ${steps[0]}, then ${steps[1]}, gives ${fmt(output)}. Answer: ${input}`;
      const same = run(output);
      const wrongOrder = OP[INV[order[1]]](OP[INV[order[0]]](output, ks[0]), ks[1]);
      const items = [
        ok(same) ? { text: fmt(same), code: 'FM-NO-INVERSE', why: `It looks like you put ${fmt(output)} through the machine again. To work backwards, use the inverse of each step.` } : null,
        ok(wrongOrder) ? { text: fmt(wrongOrder), code: 'FM-ORDER', why: `You used the inverses, but in the wrong order. Undo the LAST step first: undo "${steps[1]}", then undo "${steps[0]}".` } : null,
        ok(back1) ? { text: fmt(back1), code: 'ONE-STEP-ONLY', why: `${fmt(back1)} is what goes into the second step. Undo "${steps[0]}" as well.` } : null,
      ];
      try {
        if (rng.chance(0.35)) {
          const t = typedMisconceptions(String(input), items, { code: 'FM-NO-INVERSE', why: 'Work backwards: undo the last step first, using the inverse operation.' });
          return { type: 'numeric', prompt, answer: numericAnswer(input, [String(input)]), solution, ...t, diagram, marks: 2, skill: SKILL.fmInv };
        }
        return { type: 'mcq', prompt, ...choices(rng, String(input), items, (i) => (input + (i % 2 ? i : -i) > 0 ? fresh(prompt, nearMiss(String(input + (i % 2 ? i : -i)), 'Undo the last step first, with the inverse operation.')) : null)), solution, diagram, marks: 2, skill: SKILL.fmInv };
      } catch { /* draw again */ }
    }
  },
};

function findRule(rng) {
  for (;;) {
    const m = rng.int(2, 6); const c = rng.int(1, 9);
    const ins = rng.sample([2, 3, 4, 5, 6, 7, 8, 9, 10], 3).sort((a, b) => a - b);
    const outs = ins.map((x) => m * x + c);
    const correct = `x ${m}, then + ${c}`;
    const d1 = outs[0] - ins[0];
    const alt = m + 1; const altC = outs[0] - alt * ins[0];
    const items = [
      { text: `+ ${d1}`, code: 'SEQ-CHECK-ONE-STEP', why: `+ ${d1} works for ${ins[0]} -> ${outs[0]}, but not for ${ins[1]}: ${ins[1]} + ${d1} = ${ins[1] + d1}, not ${outs[1]}. Check every pair.` },
      altC > 0 ? { text: `x ${alt}, then + ${altC}`, code: 'SEQ-CHECK-ONE-STEP', why: `This works for ${ins[0]} -> ${outs[0]}, but ${ins[1]} x ${alt} + ${altC} = ${ins[1] * alt + altC}, not ${outs[1]}. Check every pair.` } : (altC < 0 ? { text: `x ${alt}, then - ${-altC}`, code: 'SEQ-CHECK-ONE-STEP', why: `This works for ${ins[0]} -> ${outs[0]}, but ${ins[1]} x ${alt} - ${-altC} = ${ins[1] * alt + altC}, not ${outs[1]}. Check every pair.` } : null),
      { text: `+ ${c}, then x ${m}`, code: 'FM-ORDER', why: `The order matters: ${ins[0]} + ${c} = ${ins[0] + c}, then x ${m} gives ${(ins[0] + c) * m}, not ${outs[0]}.` },
    ];
    const prompt = `A function machine turns ${ins[0]} into ${outs[0]}, ${ins[1]} into ${outs[1]} and ${ins[2]} into ${outs[2]}. Which rule works for ALL three?`;
    const solution = `When the input goes up by 1, the output goes up by ${m}, so the machine multiplies by ${m}. ${ins[0]} x ${m} = ${m * ins[0]}, and ${outs[0]} - ${m * ins[0]} = ${c}, so then it adds ${c}. Check: ${ins[2]} x ${m} + ${c} = ${outs[2]}. Answer: ${correct}`;
    try { return { type: 'mcq', prompt, ...choices(rng, correct, items, null), solution, marks: 2, skill: SKILL.fm }; } catch { /* draw again */ }
  }
}

// ---------------------------------------------------------------- g09 letters for unknown quantities

const letters = {
  id: 'm07.letters', topicId: T, subtopicId: 'm07-s4', skill: SKILL.letters,
  title: 'Letters for unknown quantities (D2 two numbers from their sum and difference; D3 write an expression for an age)',
  difficulties: [2, 3],
  check: {},
  make(rng, d) {
    for (;;) {
      if (d === 2) {
        const [x, y] = rng.sample(['a', 'b', 'p', 'q', 'm', 'n'], 2);
        const small = rng.int(2, 40); const k = rng.int(2, 20); const big = small + k; const n = small + big;
        const askBig = rng.chance(0.6);
        const ans = askBig ? big : small;
        const prompt = `${x} and ${y} are two whole numbers. ${x} + ${y} = ${n}, and ${x} is ${k} more than ${y}. What is ${askBig ? x : y}?`;
        const solution = `Take away the difference: ${n} - ${k} = ${n - k}. That is ${y} twice, so ${y} = ${n - k} ÷ 2 = ${small}, and ${x} = ${small} + ${k} = ${big}. Check: ${big} + ${small} = ${n}. Answer: ${ans}`;
        const items = [
          { text: String(askBig ? small : big), code: 'WRONG-QUANTITY', why: askBig ? `${small} is ${y}. ${x} is ${k} more.` : `${big} is ${x}, the bigger number. The question asks for ${y}.` },
          { text: String(n - k), code: 'BAR-NO-HALVE', why: `${n - k} is ${y} twice (after taking away the difference). Halve it.` },
          n % 2 === 0 ? { text: String(n / 2), code: 'HALF-TOTAL', why: `${n / 2} would make ${x} and ${y} equal. ${x} is ${k} more than ${y}.` } : null,
        ];
        try { return { type: 'mcq', prompt, ...choices(rng, String(ans), items, (i) => fresh(prompt, nearMiss(String(ans + i), `Check: the two numbers must add to ${n} and differ by ${k}.`))), solution, marks: 2 }; } catch { continue; }
      }
      const p = person(rng);
      const L0 = p.name[0].toLowerCase(); const L = ['o', 'l', 'i'].includes(L0) ? 'n' : L0;
      const sib = rng.pick(['sister', 'brother', 'cousin']);
      const k = rng.int(2, 9); const m = rng.int(2, 12);
      if (k === m) continue;
      const older = rng.chance(0.4);
      const expr = (c) => (c === 0 ? L : `${L} ${c > 0 ? '+' : '-'} ${Math.abs(c)}`);
      const him = p.he === 'she' ? 'her' : 'him';
      if (rng.chance(0.5)) {
        // a second template: things that someone has, then gains or gives away (CLO review m07 item 7)
        const thing = rng.pick(['marbles', 'stickers', 'stamps', 'cards']);
        const gain = rng.chance(0.5);
        const kk = older ? k : -k; const mm = gain ? m : -m;
        const correct = expr(kk + mm);
        if (kk + mm === 0) continue;
        const prompt = `${p.name} has ${L} ${thing}. ${p.His} ${sib} has ${k} ${older ? 'more' : 'fewer'} ${thing} than ${him}. Then the ${sib} ${gain ? `is given ${m} more` : `gives away ${m}`}. Which expression gives the number of ${thing} the ${sib} has now?`;
        const solution = `The ${sib} has ${expr(kk)} ${thing} at first. After ${gain ? `being given ${m}` : `giving away ${m}`}: ${expr(kk)} ${gain ? '+' : '-'} ${m} = ${correct}. Answer: ${correct}`;
        const items = [
          { text: expr(kk), code: 'ONE-STEP-ONLY', why: `${expr(kk)} is what the ${sib} has at first. Then ${gain ? `add the ${m} more` : `take away the ${m} given away`}.` },
          { text: expr(-kk + mm), code: 'OP-SWAP', why: `The ${sib} has ${k} ${older ? 'MORE' : 'FEWER'} than ${p.name}, so ${older ? 'add' : 'subtract'} ${k}.` },
          { text: expr(kk - mm), code: 'OP-SWAP', why: `${gain ? `Being given ${m} more means ADD ${m}` : `Giving away ${m} means TAKE AWAY ${m}`}.` },
          { text: expr(mm), code: 'ITEM-LEFT-OUT', why: `${expr(mm)} would be ${p.name}'s own ${thing} after the change. The ${sib} has ${k} ${older ? 'more' : 'fewer'} to start with.` },
        ];
        try { return { type: 'mcq', prompt, ...choices(rng, correct, rng.shuffle(items), null), solution, marks: 2 }; } catch { continue; }
      }
      const net = (older ? k : -k) + m;
      const correct = expr(net);
      const prompt = `${p.name} is ${L} years old. ${p.His} ${sib} is ${k} years ${older ? 'older' : 'younger'} than ${him}. Which expression gives the ${sib}'s age in ${m} years' time?`;
      const solution = `The ${sib}'s age now: ${expr(older ? k : -k)}. In ${m} years: ${expr(older ? k : -k)} + ${m} = ${correct}. Answer: ${correct}`;
      const items = [
        { text: expr(older ? k : -k), code: 'ONE-STEP-ONLY', why: `${expr(older ? k : -k)} is the ${sib}'s age NOW. Add ${m} for the age in ${m} years.` },
        { text: expr((older ? -k : k) + m), code: 'OP-SWAP', why: `The ${sib} is ${k} years ${older ? 'OLDER' : 'YOUNGER'}, so ${older ? 'add' : 'subtract'} ${k}.` },
        { text: expr((older ? k : -k) - m), code: 'OP-SWAP', why: `In ${m} years everyone is ${m} years OLDER, so add ${m}.` },
        { text: expr(m), code: 'ITEM-LEFT-OUT', why: `${expr(m)} is ${p.name}'s own age in ${m} years. The ${sib} is ${k} years ${older ? 'older' : 'younger'}.` },
      ];
      try { return { type: 'mcq', prompt, ...choices(rng, correct, rng.shuffle(items), null), solution, marks: 2 }; } catch { /* draw again */ }
    }
  },
};

export default [nextTerm, termToTerm, positionToTerm, spatial, squareCube, functionMachine, letters];
