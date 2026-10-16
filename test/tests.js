// Study Practice test suite. Open test/index.html through the local server (tools/serve.py).

import { markQuestion, parseNumber, textMatches, normaliseText, isAnswered, responseText, correctAnswerText, levenshtein, powers, inSimplestForm } from '../js/marking.js';
import { selectQuestions, makeRng, estimateSeconds, budgetSeconds, estimateCount, MIN_QUESTIONS } from '../js/sampler.js';
import { Countdown, QuestionClock, formatClock } from '../js/timer.js';
import { planSession, finishSession, submitSession } from '../js/practice.js';
import { buildReport, emailBody, reportMailto, MAILTO_LIMIT, reportHtmlDocument, reportBodyHtml, esc } from '../js/report.js';
import { Db } from '../js/db.js';
import { buildExport, importExport, parseExport } from '../js/exportimport.js';
import { hashPin, verifyPin, lockoutSeconds, validPin } from '../js/pin.js';
import { dayKey, weekKey, activity, streak, longestStreak, subtopicMastery, levelFor, personalBests, celebrate, questionHistory } from '../js/stats.js';
import { prepareTopic } from '../js/content.js';
import { progressAnalysis } from '../js/analysis.js';
import { aiAvailable, explainMistake } from '../js/ai.js';

const results = [];
let group = 'general';
function check(name, ok, detail = '') {
  results.push({ group, name, ok: !!ok, detail });
}
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// A reserved example domain; never a real person's address.
const TEST_EMAIL = ['someone', 'example.com'].join('@');

const mcq = { id: 't-q1', type: 'mcq', marks: 1, options: ['a', 'b', 'c', 'd'], answer: 2, misconceptions: { 0: 'note0', 1: 'note1', 3: 'note3' } };
const multi = { id: 't-q2', type: 'multi', marks: 2, options: ['a', 'b', 'c', 'd', 'e'], answer: [0, 2, 4], misconceptions: { 1: 'bad1', 3: 'bad3' } };
const multi1 = { ...multi, id: 't-q2b', marks: 1 };
const tf = { id: 't-q3', type: 'truefalse', marks: 1, answer: false, misconceptions: { common: 'tf note' } };
const order = { id: 't-q4', type: 'order', marks: 2, options: ['w', 'x', 'y', 'z'], answer: [2, 0, 3, 1], misconceptions: { common: 'order note' } };
const match = { id: 't-q5', type: 'match', marks: 3, options: { left: ['A', 'B', 'C'], right: ['1', '2', '3', '4'] }, answer: [[0, 1], [1, 3], [2, 0]], misconceptions: { common: 'match note' } };
const num = (value, accept = [], tolerance = 0, mis = { common: 'num note' }) => ({ id: 't-n', type: 'numeric', marks: 1, answer: { value, tolerance, accept }, misconceptions: mis });
const short = (accept, keywords = [], mis = { common: 'short note' }) => ({ id: 't-s', type: 'short', marks: 1, answer: { accept, keywords }, misconceptions: mis });

// ---------------------------------------------------------------- marking: each type
group = 'marking: mcq, multi, true/false';
{
  check('mcq right', markQuestion(mcq, 2).correct && markQuestion(mcq, 2).earned === 1);
  const w = markQuestion(mcq, 0);
  check('mcq wrong gives that option\'s misconception', !w.correct && w.earned === 0 && w.misconceptions[0].note === 'note0');
  check('mcq unanswered', !markQuestion(mcq, null).answered && markQuestion(mcq, null).earned === 0);
  check('multi exact (any order)', markQuestion(multi, [4, 0, 2]).correct && markQuestion(multi, [4, 0, 2]).earned === 2);
  const p = markQuestion(multi, [0, 2]);
  check('multi 2 of 3, no wrong picks: part marks 1 of 2', !p.correct && p.earned === 1, JSON.stringify(p));
  const pw = markQuestion(multi, [0, 2, 4, 1]);
  check('multi all right plus one wrong: not correct, 1 mark, misconception for the wrong pick', !pw.correct && pw.earned === 1 && pw.misconceptions.some((m) => m.note === 'bad1'), JSON.stringify(pw));
  check('multi choosing everything earns little', markQuestion(multi, [0, 1, 2, 3, 4]).earned === 0);
  check('multi worth 1 mark: partly right earns 0', markQuestion(multi1, [0, 2]).earned === 0);
  check('multi empty = unanswered', !markQuestion(multi, []).answered);
  check('true/false right (false)', markQuestion(tf, false).correct);
  check('true/false wrong shows common note', !markQuestion(tf, true).correct && markQuestion(tf, true).misconceptions[0].note === 'tf note');
  check('true/false null unanswered', !isAnswered(tf, null));
}

group = 'marking: order and match';
{
  check('order right', markQuestion(order, [2, 0, 3, 1]).correct && markQuestion(order, [2, 0, 3, 1]).earned === 2);
  const o = markQuestion(order, [0, 2, 3, 1]);
  check('order two swapped: half the positions, 1 of 2 marks', !o.correct && o.earned === 1 && o.misconceptions[0].note === 'order note', JSON.stringify(o));
  check('order untouched (null) is unanswered', !markQuestion(order, null).answered);
  check('match right', markQuestion(match, [1, 3, 0]).correct && markQuestion(match, [1, 3, 0]).earned === 3);
  const m = markQuestion(match, [1, 0, 3]);
  check('match 1 of 3 pairs: 1 mark', !m.correct && m.earned === 1, JSON.stringify(m));
  check('match partly filled is answered and marked by pairs', markQuestion(match, [1, null, null]).answered && markQuestion(match, [1, null, null]).earned === 1);
  check('match nothing chosen is unanswered', !markQuestion(match, [null, null, null]).answered);
}

group = 'marking: numbers';
{
  const cases = [
    ['12', 12], [' 12 ', 12], ['-3.5', -3.5], ['−3.5', -3.5], ['.5', 0.5], ['5.', 5], ['3/4', 0.75], ['3 / 4', 0.75],
    ['1 3/4', 1.75], ['-1 1/2', -1.5], ['½', 0.5], ['1,250', 1250], ['12 000', 12000], ['12 000.5', 12000.5], ['25%', 25],
    ['12 cm', 12], ['12cm', 12], ['40 cm^2', 40], ['40 cm²', 40], ['50 N', 50], ['3 km/h', 3], ['RM 4.50', 4.5], ['$12', 12], ['= 7', 7],
    ['1,5', null], ['12 5', null], ['abc', null], ['3/0', null], ['1.2.3', null], ['', null], ['12 cm 5', null], ['2e3', null],
  ];
  for (const [t, v] of cases) {
    const got = parseNumber(t);
    check(`parse "${t}" -> ${v}`, v === null ? got === null : got != null && Math.abs(got - v) < 1e-12, `got ${got}`);
  }
  check('numeric exact', markQuestion(num(0.75, ['3/4']), '0.75').correct);
  check('numeric fraction form 3/4 for 0.75', markQuestion(num(0.75), '3/4').correct);
  check('numeric equivalent fraction 6/8 accepted (value is equal)', markQuestion(num(0.75), '6/8').correct);
  check('numeric mixed number 2 1/4 for 2.25', markQuestion(num(2.25), '2 1/4').correct);
  check('numeric with a unit', markQuestion(num(45, ['45 minutes']), '45 mins').correct);
  check('numeric tolerance inside', markQuestion(num(3.14, [], 0.01), '3.15').correct);
  check('numeric tolerance outside', !markQuestion(num(3.14, [], 0.01), '3.16').correct);
  check('numeric floating point (0.1+0.2 style)', markQuestion(num(0.3), '0.30000000000000004').correct);
  check('numeric wrong value', !markQuestion(num(12), '13').correct);
  check('numeric word answer from accept list ("none" for 0)', markQuestion(num(0, ['none', 'zero']), 'None').correct);
  check('numeric negative vs positive', !markQuestion(num(-1), '1').correct && markQuestion(num(-1), '-1').correct);
  const wm = markQuestion(num(6, [], 0, { 150: 'multiplied', common: 'general' }), '150');
  check('numeric specific wrong-answer note', wm.misconceptions[0].note === 'multiplied');
  check('numeric other wrong answer gets the common note', markQuestion(num(6, [], 0, { 150: 'multiplied', common: 'general' }), '7').misconceptions[0].note === 'general');
  check('numeric blank is unanswered', !markQuestion(num(6), '   ').answered);
  const sf = (value, prompt, accept = []) => ({ ...num(value, accept), prompt });
  const q34 = sf(0.75, 'Write 18/24 as a fraction in its simplest form.');
  check('simplest form: 3/4 right', markQuestion(q34, '3/4').correct);
  check('simplest form: 6/8 (equal but not simplified) wrong', !markQuestion(q34, '6/8').correct);
  check('simplest form: decimal 0.75 is not a fraction, wrong', !markQuestion(q34, '0.75').correct);
  check('simplest form: a form in the accept list is still right', markQuestion(sf(0.75, 'Give 0.75 in lowest terms.', ['0.75']), '0.75').correct);
  check('lowest terms wording also triggers the rule', !markQuestion(sf(0.5, 'Write 4/8 in lowest terms.'), '2/4').correct && markQuestion(sf(0.5, 'Write 4/8 in lowest terms.'), '1/2').correct);
  const qMixed = sf(4 + 1 / 6, 'Work out 1 2/3 + 2 1/2. Give your answer as a mixed number in its simplest form.');
  check('mixed number in simplest form right; unsimplified or improper wrong', markQuestion(qMixed, '4 1/6').correct && !markQuestion(qMixed, '4 2/12').correct && !markQuestion(qMixed, '25/6').correct && !markQuestion(qMixed, '3 7/6').correct);
  check('simplest form: whole-number answer, 4/2 wrong and 2 right', !markQuestion(sf(2, 'Simplify 8/4 to its simplest form.'), '4/2').correct && markQuestion(sf(2, 'Simplify 8/4 to its simplest form.'), '2').correct);
  check('simplest form: improper fraction allowed unless a mixed number is asked', markQuestion(sf(1.25, 'Write 10/8 in its simplest form.'), '5/4').correct && markQuestion(sf(1.25, 'Write 10/8 in its simplest form.'), '1 1/4').correct);
  check('simplest form: negative and with a unit', markQuestion(sf(-0.75, 'Simplest form please.'), '−3/4').correct && inSimplestForm('3/4 kg') && !inSimplestForm('3/1'));
  check('without the wording, equal values stay accepted', markQuestion(num(0.75), '6/8').correct);
}

group = 'marking: short answers';
{
  const q = short(['evaporation']);
  check('case and spaces', markQuestion(q, '  EVAPORATION ').correct);
  check('trailing full stop', markQuestion(q, 'Evaporation.').correct);
  check('one typo in a long word', markQuestion(q, 'evaporaton').correct);
  check('two typos in a long word', markQuestion(q, 'evapuraton').correct);
  check('three typos rejected', !markQuestion(q, 'evapuratan x').correct);
  check('different word rejected', !markQuestion(q, 'condensation').correct);
  check('increase is not decrease', !markQuestion(short(['increase']), 'decrease').correct);
  check('insoluble is not soluble', !markQuestion(short(['insoluble']), 'soluble').correct);
  check('short words need exact spelling (mass vs moss)', !markQuestion(short(['mass']), 'moss').correct);
  check('leading "the" ignored', markQuestion(short(['denominator']), 'the denominator').correct);
  check('spacing inside a word', markQuestion(short(['photosynthesis']), 'photo synthesis').correct);
  check('hyphen between words', markQuestion(short(['non magnetic']), 'non-magnetic').correct);
  check('coordinates with spaces/brackets', markQuestion(short(['(0, 3)']), '(0,3)').correct && markQuestion(short(['(0, 3)']), '0 , 3').correct);
  check('coordinates in the wrong order rejected', !markQuestion(short(['(0, 3)']), '(3, 0)').correct);
  check('coordinates never run together ("1 2" is not "12")', !markQuestion(short(['(1, 2)']), '12').correct);
  check('negative coordinate keeps its sign', !markQuestion(short(['(-1, 1)']), '(1, 1)').correct && markQuestion(short(['(-1, 1)']), '(-1,1)').correct);
  check('numbers in a short answer need to be exact', !markQuestion(short(['4 hours 15 minutes']), '4 hours 16 minutes').correct);
  check('time phrase squashed', markQuestion(short(['4 h 15 min']), '4h15min').correct);
  check('time 15:00', markQuestion(short(['15:00', '3 pm']), '3 PM').correct && !markQuestion(short(['15:00']), '16:00').correct);
  const kw = short(['multiply by 2'], ['multiply', '2']);
  check('keywords: all present', markQuestion(kw, 'You multiply it by 2').correct);
  check('keywords: one missing', !markQuestion(kw, 'multiply it').correct);
  check('keywords: negation rejected', !markQuestion(kw, 'do not multiply by 2').correct);
  check('keywords: typo inside keyword', markQuestion(short(['heat and pressure'], ['heat', 'pressure']), 'heat and presure').correct);
  check('short wrong: note keyed by that wrong answer', markQuestion(short(['denominator'], [], { numerator: 'top number', common: 'c' }), 'Numerator').misconceptions[0].note === 'top number');
  check('levenshtein basic', levenshtein('kitten', 'sitting') === 3);
  check('normalise curly quotes and dashes', normaliseText('Don’t – stop') === "don't - stop");
  check('textMatches empty is false', !textMatches('', 'a'));
  check('times sign and ratio spacing', markQuestion(short(['4 x 7']), '4 × 7').correct && markQuestion(short(['4:7']), '4 : 7').correct);
  check('cm² typed or cm^2 in the key', markQuestion(short(['cm^2']), 'cm²').correct && parseNumber('40 cm³') === 40);
  check('powers shown as superscripts', powers('7^2 = 49 and 2 cm^3, 10^-2') === '7² = 49 and 2 cm³, 10⁻²' && powers('no power') === 'no power');
}

group = 'readable answers';
{
  check('mcq text', responseText(mcq, 2) === 'C. c' && correctAnswerText(mcq) === 'C. c');
  check('order text', correctAnswerText(order) === 'y → w → z → x');
  check('match text', correctAnswerText(match).startsWith('A → 2'));
  check('no answer', responseText(mcq, null) === 'No answer');
}

// ---------------------------------------------------------------- the real banks
group = 'every question in the built banks';
let bankTopics = [];
try {
  const man = await (await fetch('../content/manifest.json', { cache: 'no-store' })).json();
  for (const s of man.subjects) for (const t of s.topics) bankTopics.push(prepareTopic(await (await fetch(`../${t.file}`, { cache: 'no-store' })).json()));
  let n = 0;
  const bad = [];
  for (const t of bankTopics) {
    for (const q of t.questions) {
      const right = [];
      const wrong = [];
      switch (q.type) {
        case 'mcq': right.push(q.answer); q.options.forEach((_, i) => i !== q.answer && wrong.push(i)); break;
        case 'multi': right.push([...q.answer].reverse()); wrong.push(q.answer.slice(1).length ? q.answer.slice(1) : q.options.map((_, i) => i).filter((i) => !q.answer.includes(i))); break;
        case 'truefalse': right.push(q.answer); wrong.push(!q.answer); break;
        case 'order': right.push(q.answer.slice()); wrong.push([q.answer[1], q.answer[0], ...q.answer.slice(2)]); break;
        case 'match': { const r = []; for (const [L, R] of q.answer) r[L] = R; right.push(r); wrong.push(r.map((x, i) => r[(i + 1) % r.length])); break; }
        case 'numeric': right.push(String(q.answer.value), ...q.answer.accept); wrong.push(String(q.answer.value + Math.max(1, q.answer.tolerance * 3 + 1))); break;
        case 'short': right.push(...q.answer.accept); wrong.push('zzzz qqqq'); break;
        default: bad.push(`${q.id}: unknown type`);
      }
      for (const r of right) { n++; const m = markQuestion(q, r); if (!m.correct || m.earned !== q.marks) bad.push(`${q.id} (${q.type}) correct answer ${JSON.stringify(r)} marked wrong`); }
      for (const r of wrong) { n++; const m = markQuestion(q, r); if (m.correct) bad.push(`${q.id} (${q.type}) wrong answer ${JSON.stringify(r)} marked right`); }
      if (q.type === 'mcq') for (const i of q.options.keys()) if (i !== q.answer && !(markQuestion(q, i).misconceptions[0] || {}).note) bad.push(`${q.id}: no note for option ${i}`);
    }
  }
  check(`${bankTopics.length} chapters, ${bankTopics.reduce((s, t) => s + t.questions.length, 0)} questions: every right answer marks right and every wrong one marks wrong (${n} checks)`, bad.length === 0, bad.slice(0, 12).join(' | '));
} catch (e) {
  check('banks loaded', false, String(e));
}

// ---------------------------------------------------------------- sampling
group = 'question sampling';
function fakeBank(nSub = 4, perSub = 15) {
  const qs = [];
  for (let s = 1; s <= nSub; s++) for (let i = 0; i < perSub; i++) qs.push({ id: `x-q${s}-${i}`, subtopicId: `x-s${s}`, topicId: 'x', type: 'mcq', difficulty: (i % 3) + 1, marks: 1 });
  return qs;
}
{
  const bank = fakeBank();
  for (const d of [15, 30, 60, 90]) {
    const sel = selectQuestions({ pool: bank, durationMin: d, rng: makeRng(d) });
    const ids = sel.questions.map((q) => q.id);
    check(`${d} min: no repeats, within the time budget`, new Set(ids).size === ids.length && (sel.estimatedSeconds <= budgetSeconds(d) || ids.length <= MIN_QUESTIONS), `${ids.length} questions, ${Math.round(sel.estimatedSeconds / 60)} of ${budgetSeconds(d) / 60} min`);
  }
  const n15 = selectQuestions({ pool: bank, durationMin: 15, rng: makeRng(1) }).questions.length;
  const n60 = selectQuestions({ pool: bank, durationMin: 60, rng: makeRng(1) }).questions.length;
  check('longer sessions get more questions', n60 > n15 * 2.5, `${n15} vs ${n60}`);
  const hard = bank.map((q) => ({ ...q, difficulty: 3 }));
  const easy = bank.map((q) => ({ ...q, difficulty: 1 }));
  check('difficulty-3 questions take longer, so fewer fit', selectQuestions({ pool: hard, durationMin: 30, rng: makeRng(2) }).questions.length < selectQuestions({ pool: easy, durationMin: 30, rng: makeRng(2) }).questions.length);
  check('estimate: difficulty 3 > 1', estimateSeconds({ difficulty: 3, marks: 1 }) > estimateSeconds({ difficulty: 1, marks: 1 }));
  check('small bank: uses all questions, no repeats', (() => { const s = selectQuestions({ pool: bank.slice(0, 7), durationMin: 90, rng: makeRng(3) }); return s.questions.length === 7 && s.allUsed; })());
  check('duplicate ids in the pool never repeat', (() => { const s = selectQuestions({ pool: [...bank.slice(0, 6), ...bank.slice(0, 6)], durationMin: 90, rng: makeRng(4) }); return new Set(s.questions.map((q) => q.id)).size === s.questions.length; })());
  check('easier questions come first', (() => { const qs = selectQuestions({ pool: bank, durationMin: 30, rng: makeRng(5) }).questions; return qs.every((q, i) => i === 0 || qs[i - 1].difficulty <= q.difficulty); })());

  // a fresh attempt gets a different set: mark the first set as seen today
  const now = Date.now();
  const first = selectQuestions({ pool: bank, durationMin: 15, rng: makeRng(11), now }).questions;
  const history = new Map(first.map((q) => [q.id, { lastSeen: now - 60000, lastCorrect: true, seen: 1, wrong: 0 }]));
  const second = selectQuestions({ pool: bank, durationMin: 15, rng: makeRng(12), now, history }).questions;
  const overlap = second.filter((q) => history.has(q.id)).length;
  check('second attempt is mostly new questions', overlap <= Math.ceil(second.length * 0.2), `${overlap} of ${second.length} repeated`);
  // weighting towards weak subtopics
  const mastery = new Map([['x-s1', { score: 0.1, n: 10 }], ['x-s2', { score: 0.95, n: 10 }], ['x-s3', { score: 0.95, n: 10 }], ['x-s4', { score: 0.95, n: 10 }]]);
  let weakCount = 0;
  let total = 0;
  for (let k = 0; k < 40; k++) {
    const s = selectQuestions({ pool: bank, durationMin: 15, mode: 'weak', mastery, rng: makeRng(100 + k) }).questions;
    weakCount += s.filter((q) => q.subtopicId === 'x-s1').length;
    total += s.length;
  }
  check('weak-spot mode leans to the weak subtopic', weakCount / total > 0.45, `${Math.round((weakCount / total) * 100)}% from the weak subtopic (25% if even)`);
  check('estimateCount is sensible', estimateCount(bank, 15) >= 5 && estimateCount(bank, 90) <= bank.length);
  check('same seed gives the same set (reproducible)', eq(selectQuestions({ pool: bank, durationMin: 30, rng: makeRng(9) }).questions.map((q) => q.id), selectQuestions({ pool: bank, durationMin: 30, rng: makeRng(9) }).questions.map((q) => q.id)));
  check('different seeds give different sets', !eq(selectQuestions({ pool: bank, durationMin: 30, rng: makeRng(9) }).questions.map((q) => q.id), selectQuestions({ pool: bank, durationMin: 30, rng: makeRng(10) }).questions.map((q) => q.id)));

  if (bankTopics.length) {
    const maths = bankTopics.filter((t) => t.subject === 'maths');
    const sp = planSession({ subject: 'maths', topic: null, topics: maths, mode: 'mixed', durationMin: 60, attempts: [], seed: 7 });
    const tset = new Set(sp.questionIds.map((id) => id.split('-')[0]));
    check('mixed revision spreads across chapters', tset.size >= Math.min(maths.length, 6), `${sp.questionIds.length} questions from ${tset.size} chapters`);
    const t0 = bankTopics[0];
    const sub = t0.preamble.subtopics[0].id;
    const ss = planSession({ subject: t0.subject, topic: t0, topics: [t0], mode: 'subtopic', subtopicId: sub, durationMin: 30, attempts: [], seed: 3 });
    check('one-subtopic mode only uses that subtopic', ss.questionIds.every((id) => t0.questions.find((q) => q.id === id).subtopicId === sub));
  }
}

// ---------------------------------------------------------------- timer
group = 'timer';
{
  let t = 0;
  const clock = () => t;
  const c = new Countdown(600, { now: clock }).start();
  t = 100000;
  check('elapsed counts', Math.abs(c.elapsed() - 100) < 1e-9 && Math.abs(c.remaining() - 500) < 1e-9);
  c.pause();
  t = 400000;
  check('paused time is not counted', Math.abs(c.elapsed() - 100) < 1e-9);
  c.start();
  t = 600000;
  check('resumes', Math.abs(c.elapsed() - 300) < 1e-9);
  t = 1e9;
  check('never past the limit; expired', c.elapsed() === 600 && c.remaining() === 0 && c.expired());
  const r = new Countdown(600, { now: clock, elapsedSec: 590 });
  check('resume from saved time', Math.abs(r.remaining() - 10) < 1e-9 && !r.running);
  let u = 0;
  const w = new Countdown(400, { now: () => u }).start();
  u = 50000;
  check('no warning early', w.newWarnings().length === 0);
  u = 110000;
  check('5-minute warning once', eq(w.newWarnings(), [300]) && w.newWarnings().length === 0);
  u = 345000;
  check('1-minute warning once', eq(w.newWarnings(), [60]) && w.newWarnings().length === 0);
  check('short session never warns of 5 minutes', new Countdown(200, { now: () => 0 }).start().newWarnings().every((x) => x !== 300));
  let v = 0;
  const qc = new QuestionClock({ now: () => v });
  qc.show('a'); v = 5000; qc.show('b'); v = 8000; qc.stop(); v = 20000; qc.resume(); v = 21000;
  const snap = qc.snapshot();
  check('per-question time, paused while hidden', Math.abs(snap.a - 5) < 1e-9 && Math.abs(snap.b - 4) < 1e-9, JSON.stringify(snap));
  check('clock format', formatClock(65) === '1:05' && formatClock(3600) === '1:00:00' && formatClock(0.2) === '0:01' && formatClock(-3) === '0:00');
}

// ---------------------------------------------------------------- reports
group = 'session finish and report';
const sampleTopic = prepareTopic({
  subject: 'maths', topicId: 'm91-test', title: 'Test <chapter>', order: 91,
  preamble: { subtopics: [{ id: 'm91-s1', title: 'Part one', summary: '' }, { id: 'm91-s2', title: 'Part two', summary: '' }] },
  questions: [
    { ...mcq, id: 'm91-q001', subtopicId: 'm91-s1', difficulty: 1, skill: 'skill A', prompt: 'Pick <b>C</b> & not <script>alert(1)</script>', solution: 's' },
    { ...multi, id: 'm91-q002', subtopicId: 'm91-s1', difficulty: 2, skill: 'skill A', prompt: 'p2', solution: 's' },
    { ...tf, id: 'm91-q003', subtopicId: 'm91-s2', difficulty: 1, skill: 'skill B', prompt: 'p3', solution: 's' },
    { ...order, id: 'm91-q004', subtopicId: 'm91-s2', difficulty: 3, skill: 'skill B', prompt: 'p4', solution: 's' },
    { ...match, id: 'm91-q005', subtopicId: 'm91-s2', difficulty: 2, skill: 'skill C', prompt: 'p5', solution: 's' },
    { ...num(0.75, ['3/4']), id: 'm91-q006', subtopicId: 'm91-s1', difficulty: 2, skill: 'skill C', prompt: 'p6', solution: 's' },
    { ...short(['denominator']), id: 'm91-q007', subtopicId: 'm91-s1', difficulty: 1, skill: 'skill A', prompt: 'p7', solution: 's' },
  ],
});
const qmapT = new Map(sampleTopic.questions.map((q) => [q.id, q]));
function makeFinished(t0, responses, opts = {}) {
  const s = planSession({ subject: 'maths', topic: sampleTopic, topics: [sampleTopic], mode: 'topic', durationMin: 15, attempts: [], seed: 1, now: t0 });
  s.questionIds = sampleTopic.questions.map((q) => q.id);
  s.state.responses = responses;
  s.state.times = Object.fromEntries(s.questionIds.map((id) => [id, opts.fast ? 5 : 40]));
  s.state.flagged = ['m91-q004'];
  return finishSession(s, qmapT, { now: t0 + 600000, elapsedSec: 600, early: true });
}
const goodResp = { 'm91-q001': 2, 'm91-q002': [0, 2, 4], 'm91-q003': false, 'm91-q004': [2, 0, 3, 1], 'm91-q005': [1, 3, 0], 'm91-q006': '3/4', 'm91-q007': 'Denominator' };
const someWrong = { 'm91-q001': 0, 'm91-q002': [0, 2], 'm91-q003': true, 'm91-q005': [1, 0, 3], 'm91-q006': '0.75', 'm91-q007': 'numerater' };
{
  const t0 = Date.UTC(2026, 9, 10, 8);
  const all = makeFinished(t0, goodResp);
  check('all right: full marks', all.session.score.earned === all.session.score.max && all.session.score.max === 11 && all.session.score.correct === 7, JSON.stringify(all.session.score));
  const mixed = makeFinished(t0 + 86400000, someWrong, { fast: true });
  const sc = mixed.session.score;
  check('mixed: score adds up', sc.earned === 0 + 1 + 0 + 0 + 1 + 1 + 0 && sc.answered === 6 && sc.correct === 1, JSON.stringify(sc));
  check('attempt records carry id, answer, correctness and time', mixed.attempts.every((a) => a.questionId && 'response' in a && typeof a.correct === 'boolean' && a.timeSec === 5 && a.sessionId === mixed.session.id));
  check('flag recorded', mixed.attempts.find((a) => a.questionId === 'm91-q004').flagged);
  const ctx = { questions: qmapT, topics: new Map([[sampleTopic.topicId, sampleTopic]]), sessions: [all.session, mixed.session], attempts: [...all.attempts, ...mixed.attempts], topicOrder: [sampleTopic] };
  const rep = buildReport(mixed.session, mixed.attempts, ctx);
  check('report: score and parts', rep.score.earned === sc.earned && rep.bySubtopic.length === 2 && rep.bySkill.length === 3);
  check('report: misconceptions collected from wrong answers', rep.misconceptions.some((m) => m.note === 'note0') && rep.misconceptions.some((m) => m.note === 'tf note'));
  check('report: needs-work list and recommendations', rep.needsWork.length >= 1 && rep.recommendations.length >= 2, rep.recommendations.join(' | '));
  check('report: notices fast wrong answers', rep.quickWrong >= 2 && rep.recommendations.some((r) => r.includes('under 15 seconds')));
  check('report: compares with last time (down)', rep.comparison.improvement < 0 && rep.comparison.previousPct === 1);
  check('report: mistakes list includes unanswered', rep.mistakes.some((m) => m.yourAnswer === 'No answer'));
  const body = emailBody(rep, TEST_EMAIL);
  const url = reportMailto(rep, TEST_EMAIL);
  check(`mailto link within ${MAILTO_LIMIT} characters`, url.length <= MAILTO_LIMIT, `${url.length} characters`);
  check('mailto addressed to the stored address, with subject and body', url.startsWith(`mailto:${TEST_EMAIL}?subject=`) && url.includes('&body=') && decodeURIComponent(url.split('&body=')[1]).includes('Score:'));
  check('mailto uses CRLF line breaks', url.includes('%0D%0A'));
  check('email body keeps the essentials', body.includes('Score:') && body.includes('What to practise next'));
  const longRep = { ...rep, misconceptions: Array.from({ length: 8 }, (_, i) => ({ note: `A long misconception note number ${i} `.repeat(6) })), recommendations: Array.from({ length: 5 }, (_, i) => `Recommendation ${i} `.repeat(10)) };
  check('very long report still fits the mailto limit', reportMailto(longRep, TEST_EMAIL).length <= MAILTO_LIMIT, `${reportMailto(longRep, TEST_EMAIL).length}`);
  check('mailto with no stored address', reportMailto(rep, '').startsWith('mailto:?subject='));
  const html = reportHtmlDocument(rep);
  check('report HTML escapes content (no live tags from question text)', !html.includes('<script>alert') && html.includes('&lt;script&gt;') && !reportBodyHtml(rep).includes('<b>C</b>'));
  check('report HTML is a full document', html.startsWith('<!doctype html>') && html.includes('</html>'));
  check('esc', esc(`<a href="x">'&`) === '&lt;a href=&quot;x&quot;&gt;&#39;&amp;');
  const allRep = buildReport(all.session, all.attempts, { ...ctx, sessions: [all.session], attempts: all.attempts });
  check('perfect score: encouraging recommendation, no misconceptions', allRep.misconceptions.length === 0 && allRep.recommendations.length >= 1 && allRep.comparison.personalBest === 'first');
}

// ---------------------------------------------------------------- stats
group = 'statistics';
{
  const day = (d, h = 10) => new Date(2026, 9, d, h).getTime();
  const ses = (d, pctv, answered = 6, topicId = 'm91-test') => ({ id: `s${d}-${pctv}`, status: 'complete', subject: 'maths', mode: 'topic', topicId, startedAt: day(d), endedAt: day(d) + 600000, timeUsedSec: 600, score: { earned: pctv * 10, max: 10, pct: pctv, answered, total: answered, correct: 0 } });
  const list = [ses(10, 0.5), ses(11, 0.6), ses(12, 0.8), ses(14, 0.7)];
  check('day key', dayKey(day(16)) === '2026-10-16');
  check('week starts Monday', weekKey(day(16)) === '2026-10-12' && weekKey(day(12)) === '2026-10-12' && weekKey(day(11)) === '2026-10-05');
  check('streak counts back from yesterday', streak(list, day(15)).days === 1 && streak(list, day(14, 20)).days === 1 && streak([ses(13, 0.5), ...list], day(14, 20)).days === 5);
  check('longest streak', longestStreak(list) === 3);
  const act = activity(list, 'day', 7, day(16));
  check('activity per day', act.length === 7 && act.find((b) => b.key === '2026-10-12').questions === 6 && act.find((b) => b.key === '2026-10-13').questions === 0);
  check('activity per week and month', activity(list, 'week', 2, day(16)).reduce((s, b) => s + b.sessions, 0) === 4 && activity(list, 'month', 3, day(16))[2].seconds === 2400);
  check('personal best', personalBests(list).get('m91-test').pct === 0.8);
  const cel = celebrate(ses(15, 0.9), [...list, ses(15, 0.9)]);
  check('celebrate improvement and personal best', cel.personalBest === true && Math.abs(cel.improvement - 0.2) < 1e-9);
  check('short sessions never count as a personal best', celebrate(ses(16, 1, 3), list).personalBest === false);
  const atts = [];
  for (let i = 0; i < 10; i++) atts.push({ subtopicId: 'a', difficulty: 2, correct: true, fraction: 1, answeredAt: i, questionId: `q${i}` });
  for (let i = 0; i < 4; i++) atts.push({ subtopicId: 'b', difficulty: 1, correct: false, fraction: 0, answeredAt: i, questionId: `r${i}` });
  const m = subtopicMastery(atts);
  check('mastery levels', m.get('a').level.id === 'mastered' && m.get('b').level.id === 'work' && levelFor(0, 0).id === 'none' && levelFor(0.9, 3).id === 'good');
  const hist = questionHistory([{ questionId: 'q', answeredAt: 1, correct: true }, { questionId: 'q', answeredAt: 5, correct: false }]);
  check('question history keeps the latest result', hist.get('q').lastCorrect === false && hist.get('q').seen === 2);
  const an = progressAnalysis({ sessions: list, attempts: [], topics: [], now: day(16) });
  check('analysis summary', !an.empty && an.headline.includes('4 sessions') && an.recommendations.length >= 1);
  check('analysis with nothing', progressAnalysis({ sessions: [], attempts: [], topics: [] }).empty);
}

// ---------------------------------------------------------------- PIN
group = 'parent PIN';
{
  check('PIN format', validPin('1234') && validPin('12345678') && !validPin('123') && !validPin('12a4') && !validPin(1234));
  const rec = await hashPin('2468', 1000);
  check('hash does not contain the PIN', !JSON.stringify(rec).includes('2468') && rec.salt && rec.hash);
  check('right PIN accepted', await verifyPin('2468', rec));
  check('wrong PIN rejected', !(await verifyPin('2469', rec)) && !(await verifyPin('', rec)));
  const rec2 = await hashPin('2468', 1000);
  check('salted (same PIN, different hash)', rec2.hash !== rec.hash);
  check('lockout grows', lockoutSeconds(4) === 0 && lockoutSeconds(5) === 30 && lockoutSeconds(6) === 60 && lockoutSeconds(20) === 600);
}

// ---------------------------------------------------------------- export / import
group = 'export and import';
{
  const A = `study-practice-test-a-${Date.now()}`;
  const B = `study-practice-test-b-${Date.now()}`;
  const dbA = await Db.open(A);
  const dbB = await Db.open(B);
  try {
    await dbA.setSetting('deviceId', 'dev-test-a');
    await dbA.setSetting('parentEmail', TEST_EMAIL);
    await dbA.setSetting('pinHash', await hashPin('1357', 1000));
    const ctxBase = { questions: qmapT, topics: new Map([[sampleTopic.topicId, sampleTopic]]), topicOrder: [sampleTopic] };
    for (const [k, resp] of [[0, goodResp], [1, someWrong]]) {
      const s = planSession({ subject: 'maths', topic: sampleTopic, topics: [sampleTopic], mode: 'topic', durationMin: 15, attempts: [], seed: k, now: Date.now() - (2 - k) * 86400000 });
      s.questionIds = sampleTopic.questions.map((q) => q.id);
      s.state.responses = resp;
      await dbA.put('sessions', s);
      await submitSession(dbA, s, ctxBase, { early: true, elapsedSec: 300 });
    }
    // an unfinished session must not be exported
    const open = planSession({ subject: 'maths', topic: sampleTopic, topics: [sampleTopic], mode: 'topic', durationMin: 15, attempts: [], seed: 9 });
    await dbA.put('sessions', open);
    const exp = await buildExport(dbA, { appVersion: 'test', contentVersion: 'cv' });
    const text = JSON.stringify(exp);
    check('export has every attempt with answer, result and time', exp.sessions.length === 2 && exp.attempts.length === 14 && exp.reports.length === 2 && exp.attempts.every((a) => 'response' in a && 'correct' in a && 'timeSec' in a && a.questionId));
    check('export has session metadata', exp.sessions.every((s) => s.durationMin === 15 && s.startedAt && s.endedAt && s.mode && s.questionIds.length === 7));
    check('export leaves out unfinished sessions', !exp.sessions.some((s) => s.id === open.id));
    check('export never holds the parent email or PIN hash', !text.includes(TEST_EMAIL) && !text.includes('pinHash') && !text.includes(JSON.parse(JSON.stringify((await dbA.getSetting('pinHash')).hash))));
    const res = await importExport(dbB, text);
    check('import into an empty device adds everything', res.added.sessions === 2 && res.added.attempts === 14 && res.added.reports === 2);
    const exp2 = await buildExport(dbB, { appVersion: 'test', contentVersion: 'cv' });
    const strip = (e) => ({ ...e, exportedAt: null, device: null });
    check('round trip: export -> import -> export is identical', eq(strip(exp), strip(exp2)));
    const again = await importExport(dbB, text);
    check('importing the same file again adds nothing (merge, no duplicates)', again.added.sessions === 0 && again.added.attempts === 0 && again.skipped.sessions === 2);
    // merge: device B has its own extra session, then A imports B
    const extra = planSession({ subject: 'maths', topic: sampleTopic, topics: [sampleTopic], mode: 'topic', durationMin: 30, attempts: [], seed: 5 });
    extra.questionIds = sampleTopic.questions.map((q) => q.id);
    extra.state.responses = goodResp;
    await submitSession(dbB, extra, ctxBase, { early: false, elapsedSec: 900 });
    const back = await importExport(dbA, JSON.stringify(await buildExport(dbB, {})));
    check('merge in the other direction adds only the new session', back.added.sessions === 1 && back.added.attempts === 7 && back.skipped.sessions === 2);
    let threw = '';
    try { parseExport('{"format":"something-else"}'); } catch (e) { threw = e.message; }
    check('rejects a file that is not a progress file', threw.includes('not a Study Practice'));
    threw = '';
    try { parseExport('not json'); } catch (e) { threw = e.message; }
    check('rejects broken JSON', threw.includes('not valid JSON'));
    const damaged = JSON.parse(text);
    damaged.attempts[0] = { id: 5 };
    const dmg = parseExport(JSON.stringify(damaged));
    check('counts damaged records instead of importing them', dmg.bad === 1);
  } finally {
    dbA.close();
    dbB.close();
    await Db.deleteDatabase(A);
    await Db.deleteDatabase(B);
  }
}

group = 'AI seam';
check('no AI connected in version 1', aiAvailable() === false && (await explainMistake({})) === null);

// ---------------------------------------------------------------- output
const out = document.getElementById('out');
let last = '';
for (const r of results) {
  if (r.group !== last) {
    const h2 = document.createElement('h2');
    h2.textContent = r.group;
    out.appendChild(h2);
    last = r.group;
  }
  const row = document.createElement('div');
  row.className = `row ${r.ok ? 'ok' : 'bad'}`;
  row.innerHTML = '<span class="mark"></span><span class="name"></span><span class="detail"></span>';
  row.querySelector('.mark').textContent = r.ok ? 'PASS' : 'FAIL';
  row.querySelector('.name').textContent = r.name;
  row.querySelector('.detail').textContent = r.detail;
  out.appendChild(row);
}
const failed = results.filter((r) => !r.ok);
const sum = document.getElementById('summary');
sum.textContent = `${results.length - failed.length} of ${results.length} passed${failed.length ? `, ${failed.length} FAILED` : ''}`;
sum.className = failed.length ? 'bad' : 'ok';
window.testResults = { total: results.length, failed: failed.map((f) => `${f.group}: ${f.name} ${f.detail}`) };
