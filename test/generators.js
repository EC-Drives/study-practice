// Generator tests. Open test/generators.html through the local server.
//
// For every generator and every difficulty it supports, 500 seeds. Each question is checked:
// - the answer is worked out again independently (test/gen-solvers, from the question text and
//   diagram data, with its own BigInt fractions) and must match;
// - multiple-choice distractors are all different, never equal to the answer, and every wrong
//   option has a misconception note;
// - every number shown stays in a sensible range for a 12-year-old (generator's own limits, no
//   more than 3 decimal places unless allowed, no floating-point noise, no NaN);
// - the app's own marking (js/marking.js) marks the right answer right and the wrong ones wrong;
// - the worked solution states the answer; diagrams pass the diagram checker;
// - every wrong option (and every known wrong typed answer) carries a misconception code from the
//   catalogue, and recomputing it through that misconception's rule (test/gen-solvers) gives
//   exactly that wrong answer; two different wrong answers never share one explanation;
// - the skill tag is one the bank already uses for that subtopic (so reports merge them);
// - the same (generator, seed, difficulty) gives the same question again.
// Then: can every topic fill a 30-minute session without repeating a question?

import { GENERATORS, REGISTRY, generate, generateFor, generateSet, generatorsFor, MISCONCEPTION_CODES as ALL_CODES, LOAD_ERRORS } from '../js/generators/index.js';
import { SOLVERS, MIS, SOLVER_LOAD_ERRORS } from './gen-solvers/index.js';
import { valueIn, norm } from './gen-solvers/lib.js';
import { markQuestion } from '../js/marking.js';
import { estimateSeconds, budgetSeconds } from '../js/sampler.js';
import { validateDiagram } from '../js/diagrams/index.js';

const params = new URLSearchParams(location.search);
const SEEDS = Number(params.get('seeds')) || 500;
const ONLY = params.get('only'); // a generator id or topic prefix, to run part of the suite
const $ = (s) => document.querySelector(s);

const BAD_TEXT = /NaN|undefined|Infinity|\[object|\$\{|null(?![a-z])/;
const NOISE = /\d\.\d*?(\d)\1{6,}|\d\.\d{7,}/;
const VALID_TYPES = new Set(['mcq', 'multi', 'short', 'numeric', 'truefalse', 'order', 'match']);

function correctText(q) {
  switch (q.type) {
    case 'mcq': return q.options[q.answer];
    case 'numeric': return String(q.answer.value);
    case 'short': return q.answer.accept[0];
    case 'truefalse': return String(q.answer);
    default: return null;
  }
}
function correctResponse(q) {
  switch (q.type) {
    case 'mcq': return q.answer;
    case 'numeric': return q.answer.accept[0] || String(q.answer.value);
    case 'short': return q.answer.accept[0];
    case 'truefalse': return q.answer;
    case 'multi': return q.answer;
    case 'order': return q.answer;
    default: return null;
  }
}
const dpOf = (t) => { const m = String(t).match(/\.(\d+)/); return m ? m[1].length : 0; };

/** Every number written in the prompt (for the near-miss rule). */
function promptNumbers(q) {
  // leave out powers of units (cm^2, cm²), "3D", and digits written next to a missing-digit "?" (7?0)
  const text = String(q.prompt).replace(/(\d) (\d{3})/g, '$1$2').replace(/\^\d+|[²³]/g, ' ').replace(/\b\d+D\b/g, ' ').replace(/[\d?]*\?[\d?]*/g, ' ');
  return (text.match(/-?\d+(?:\.\d+)?(?:\/\d+)?/g) || []).map((t) => valueIn(t)).filter((x) => x != null);
}

/** Check one question. Returns a list of problems (empty = all good). */
function checkQuestion(g, q, solver) {
  const p = [];
  const rules = MIS[g] || {};
  const meta = GENERATORS.find((x) => x.id === g);
  const chk = meta.check || {};
  // shape of the question
  for (const k of ['id', 'subtopicId', 'type', 'difficulty', 'marks', 'prompt', 'answer', 'solution', 'misconceptions', 'skill', 'source', 'generatorId', 'seed']) if (!(k in q)) p.push(`missing ${k}`);
  if (!VALID_TYPES.has(q.type)) p.push(`bad type ${q.type}`);
  if (!Number.isInteger(q.marks) || q.marks < 1 || q.marks > 5) p.push('marks out of range');
  if (q.subtopicId !== meta.subtopicId) p.push('wrong subtopic');
  const texts = [q.prompt, q.solution, ...(q.options || []), ...Object.values(q.misconceptions || {}), ...(q.type === 'short' || q.type === 'numeric' ? q.answer.accept : [])];
  for (const t of texts) if (BAD_TEXT.test(String(t))) { p.push(`bad text: ${String(t).slice(0, 80)}`); break; }
  for (const t of texts) if (NOISE.test(String(t))) { p.push(`number noise: ${String(t).slice(0, 80)}`); break; }
  if (!q.solution || q.solution.length < 20) p.push('solution too short');
  // the answer, worked out independently
  let exp;
  try { exp = solver(q); } catch (e) { p.push(`solver failed: ${e.message}`); return p; }
  const ct = correctText(q);
  if (exp.value != null) {
    const v = q.type === 'numeric' ? q.answer.value : valueIn(ct);
    if (v == null || Math.abs(v - exp.value) > 1e-9 * Math.max(1, Math.abs(exp.value))) p.push(`answer ${ct} but expected ${exp.value}`);
  }
  if (exp.text != null && q.type !== 'numeric' && norm(ct) !== norm(exp.text)) p.push(`answer text "${ct}" but expected "${exp.text}"`);
  if (exp.bool != null && q.answer !== exp.bool) p.push(`true/false answer ${q.answer} but expected ${exp.bool}`);
  if (exp.order) { const got = q.answer.map((i) => q.options[i]); if (got.map(norm).join('|') !== exp.order.map(norm).join('|')) p.push(`order ${got.join(', ')} but expected ${exp.order.join(', ')}`); }
  if (exp.set) { const got = q.answer.map((i) => norm(q.options[i])).sort(); if (got.join('|') !== exp.set.map(norm).sort().join('|')) p.push('multi answer set differs'); }
  // options
  if (q.type === 'mcq' || q.type === 'multi' || q.type === 'order') {
    if (!Array.isArray(q.options) || q.options.length < 3 || q.options.length > 7) p.push('wrong number of options');
    const ns = q.options.map(norm);
    if (new Set(ns).size !== ns.length) p.push(`repeated option: ${q.options.join(' | ')}`);
  }
  if (q.type === 'mcq') {
    if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= q.options.length) p.push('answer index out of range');
    const av = valueIn(ct);
    q.options.forEach((o, i) => {
      if (i === q.answer) return;
      const ov = valueIn(o);
      if (av != null && ov != null && Math.abs(av - ov) < 1e-9) p.push(`distractor ${o} equals the answer ${ct}`);
      if (exp.value != null && ov != null && Math.abs(ov - exp.value) < 1e-9) p.push(`distractor ${o} equals the true answer`);
      if (exp.text != null && norm(o) === norm(exp.text)) p.push(`distractor ${o} is the true answer`);
      const note = q.misconceptions[String(i)];
      if (typeof note !== 'string' || note.length < 15) p.push(`no misconception note for option ${i}`);
    });
    if (q.misconceptions[String(q.answer)]) p.push('misconception note on the right answer');
  } else if (q.type === 'short' || q.type === 'numeric') {
    if (!q.misconceptions || !Object.keys(q.misconceptions).length) p.push('no misconception notes');
  }
  // misconception codes, and each wrong answer recomputed from its code
  const codes = q.misconceptionCodes || {};
  const wrongKeys = q.type === 'mcq' ? q.options.map((_, i) => String(i)).filter((k) => Number(k) !== q.answer) : Object.keys(q.misconceptions || {}).filter((k) => k !== 'common');
  if (q.type === 'mcq' || q.type === 'short' || q.type === 'numeric') {
    for (const k of [...wrongKeys, ...(q.type !== 'mcq' ? ['common'] : [])]) {
      const code = codes[k];
      if (!code) { p.push(`no misconception code for ${k}`); continue; }
      if (!ALL_CODES[code]) p.push(`unknown misconception code ${code}`);
      if (k === 'common') continue;
      const shownText = q.type === 'mcq' ? q.options[Number(k)] : k;
      if (code === 'NEAR-MISS') {
        // X3: a near miss names no error and says "Not quite" (or "This is close" only when one step away)
        if (!/^(Not quite|This is close)/.test(q.misconceptions[k])) p.push(`near miss ${shownText} claims a specific error`);
        // X3: a near miss is never a number that is already in the question
        const nv = valueIn(shownText);
        if (nv != null && promptNumbers(q).some((x) => Math.abs(x - nv) < 1e-9)) p.push(`near miss ${shownText} is a number from the question`);
        continue;
      }
      const rule = rules[code];
      if (!rule) { p.push(`no rule to recompute ${code}`); continue; }
      let vals;
      try { vals = rule(q); } catch (e) { p.push(`rule ${code} failed: ${e.message}`); continue; }
      const ov = valueIn(shownText);
      const hit = vals.some((x) => (typeof x === 'number' ? ov != null && Math.abs(ov - x) < 1e-9 * Math.max(1, Math.abs(x)) : norm(x) === norm(shownText)));
      if (!hit) p.push(`${code} does not give ${shownText} (gives ${vals.join(' or ')})`);
    }
    // X1: the catch-all for typed answers is never a named misconception
    if ((q.type === 'short' || q.type === 'numeric') && codes.common !== 'UNCLASSIFIED') p.push(`"common" is coded ${codes.common}, not UNCLASSIFIED`);
    for (const [k, c] of Object.entries(codes)) if (c === 'UNCLASSIFIED' && k !== 'common') p.push(`wrong answer ${k} is coded UNCLASSIFIED`);
    // two different wrong answers must not share an explanation
    const byText = {};
    for (const k of wrongKeys) { const t = q.misconceptions[k]; const shownText = q.type === 'mcq' ? q.options[Number(k)] : k; (byText[t] ||= new Set()).add(norm(shownText)); }
    for (const [t, set] of Object.entries(byText)) if (set.size > 1) p.push(`one explanation for ${set.size} different wrong answers: ${t.slice(0, 60)}`);
  }
  // X4/X5: ordinals ("3th"), singulars ("1 units") and negatives in working ("1 + -3")
  for (const t of [q.prompt, q.solution, ...(Array.isArray(q.options) ? q.options : []), ...Object.values(q.misconceptions || {})]) {
    const s = String(t);
    const ord = [...s.matchAll(/\b(\d+)(st|nd|rd|th)\b/g)].find((m) => { const v = Number(m[1]) % 100; const want = v >= 11 && v <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[v % 10] || 'th'); return m[2] !== want; });
    const one = s.match(/(?<![\d.,/])1 (units|parts|tenths|hundredths|thousandths|steps|squares|beads|cubes|marbles|counters|sweets)\b/);
    const neg = s.match(/[+\-x×÷] -\d/);
    const bad = ord ? ord[0] : one ? one[0] : neg ? neg[0] : null;
    if (bad) { p.push(`wording: "${bad}" in: ${s.slice(0, 70)}`); break; }
  }
  // the skill tag must be one the bank uses for this subtopic
  if (BANK_SKILLS[q.subtopicId] && !BANK_SKILLS[q.subtopicId].has(q.skill)) p.push(`skill "${q.skill}" is not a bank skill for ${q.subtopicId}`);
  // "as a mixed number" needs a mixed-number answer
  if (/as a mixed number/.test(q.prompt) && !/^\d+ \d+\/\d+$/.test(String(ct).trim())) p.push(`asks for a mixed number but the answer is ${ct}`);
  // ranges
  const shown = q.type === 'mcq' ? q.options : [ct];
  for (const o of shown) {
    const v = valueIn(o);
    if (v == null) continue;
    if (chk.min != null && v < chk.min - 1e-9) p.push(`value ${o} below ${chk.min}`);
    if (chk.max != null && v > chk.max + 1e-9) p.push(`value ${o} above ${chk.max}`);
    if (dpOf(o) > (chk.maxDp ?? 3)) p.push(`too many decimal places: ${o}`);
    if (/^-0(?![.\d])/.test(String(o).trim())) p.push(`negative zero: ${o}`);
  }
  if (chk.integer && q.type !== 'mcq' && !Number.isInteger(valueIn(ct))) p.push(`answer ${ct} is not a whole number`);
  if (chk.integer && q.type === 'mcq' && !Number.isInteger(valueIn(ct))) p.push(`answer ${ct} is not a whole number`);
  // marking by the app
  const right = markQuestion(q, correctResponse(q));
  if (!right.correct) p.push(`app marks the right answer wrong (${JSON.stringify(correctResponse(q))})`);
  if (q.type === 'mcq') q.options.forEach((_, i) => { if (i !== q.answer && markQuestion(q, i).correct) p.push(`app marks option ${i} right`); });
  if (q.type === 'numeric') {
    for (const a of q.answer.accept) if (!markQuestion(q, a).correct) p.push(`accepted form "${a}" is marked wrong`);
    for (const k of Object.keys(q.misconceptions)) if (k !== 'common' && valueIn(k) != null && Math.abs(valueIn(k) - q.answer.value) > 1e-9 && markQuestion(q, k).correct) p.push(`wrong answer "${k}" is marked right`);
  }
  if (q.type === 'short') {
    for (const a of q.answer.accept) if (!markQuestion(q, a).correct) p.push(`accepted form "${a}" is marked wrong`);
    for (const k of Object.keys(q.misconceptions)) if (k !== 'common' && markQuestion(q, k).correct) p.push(`wrong answer "${k}" is marked right`);
  }
  if (q.type === 'truefalse' && markQuestion(q, !q.answer).correct) p.push('the wrong true/false is marked right');
  // the solution states the answer
  const forms = q.type === 'numeric' ? q.answer.accept.concat(String(q.answer.value)) : q.type === 'short' ? q.answer.accept : q.type === 'truefalse' ? [q.answer ? 'true' : 'false'] : q.type === 'mcq' ? [ct] : [];
  if (forms.length && !forms.some((f) => norm(q.solution).includes(norm(f)))) p.push(`solution does not state the answer (${forms[0]})`);
  // diagrams
  if (q.diagram) { const e = validateDiagram(q.diagram); if (e.length) p.push(`diagram: ${e[0]}`); }
  if (q.optionDiagrams) q.optionDiagrams.forEach((d, i) => { if (d) { const e = validateDiagram(d); if (e.length) p.push(`option ${i} diagram: ${e[0]}`); } });
  return p;
}

// ---------------------------------------------------------------- run

const rows = [];
const failures = [];
let total = 0;
const BANK_SKILLS = {};
async function loadBankSkills() {
  const topics = [...new Set(GENERATORS.map((g) => g.topicId))];
  for (const t of topics) {
    try {
      const data = await (await fetch(`../content/maths/${t}.json`)).json();
      for (const q of data.questions) (BANK_SKILLS[q.subtopicId] ||= new Set()).add(q.skill);
    } catch { /* no bank file: skill not checked */ }
  }
}
const tick = () => new Promise((r) => setTimeout(r, 0));

async function run() {
  for (const e of [...LOAD_ERRORS, ...SOLVER_LOAD_ERRORS]) failures.push(`could not load ${e}`);
  await loadBankSkills();
  const list = GENERATORS.filter((g) => !ONLY || g.id === ONLY || g.id.startsWith(ONLY) || g.topicId.startsWith(ONLY));
  $('#summary').textContent = `Running ${list.length} generators x ${SEEDS} seeds per difficulty...`;
  for (const g of list) {
    const solver = SOLVERS[g.id];
    const row = { id: g.id, topic: g.topicId.slice(0, 3), subtopic: g.subtopicId, difficulties: g.difficulties.join(','), questions: 0, failed: 0, distinct: 0, first: '' };
    if (!solver) { row.first = 'no independent solver'; row.failed = 1; rows.push(row); failures.push(`${g.id}: no independent solver`); continue; }
    const prompts = new Set();
    row.perLevel = [];
    const pos = {}; // X9: where the right option lands, and true/false balance
    let tfTrue = 0;
    let tfAll = 0;
    for (const d of g.difficulties) {
      const levelPrompts = new Set();
      for (let s = 1; s <= SEEDS; s++) {
        let q;
        total++;
        row.questions++;
        try { q = generate(g.id, s, d); } catch (e) { row.failed++; if (!row.first) row.first = `seed ${s} d${d}: ${e.message}`; continue; }
        prompts.add(`${q.prompt}|${JSON.stringify(q.options || '')}|${JSON.stringify(q.diagram || '')}`);
        levelPrompts.add(`${q.prompt}|${q.type === 'order' || /Which of these/.test(q.prompt) ? JSON.stringify([...(q.options || [])].sort()) : ''}|${JSON.stringify(q.diagram || '')}|${JSON.stringify(q.optionDiagrams || '')}`);
        if (q.type === 'mcq') { const key = `${q.options.length}:${q.answer}`; pos[key] = (pos[key] || 0) + 1; }
        if (q.type === 'truefalse') { tfAll++; if (q.answer === true) tfTrue++; }
        const probs = checkQuestion(g.id, q, solver);
        if (s % 97 === 0 && JSON.stringify(generate(g.id, s, d)) !== JSON.stringify(q)) probs.push('not reproducible');
        if (q.difficulty !== d) probs.push('difficulty differs');
        if (probs.length) {
          row.failed++;
          if (!row.first) row.first = `seed ${s} d${d}: ${probs[0]}`;
          if (failures.length < 300) failures.push(`${g.id} seed ${s} d${d}: ${probs.join('; ')} | ${q.prompt}`);
        }
      }
      row.perLevel.push(`D${d}: ${levelPrompts.size}`);
      if (levelPrompts.size < Math.min(50, SEEDS / 4)) { row.failed++; failures.push(`${g.id} D${d}: only ${levelPrompts.size} different prompts in ${SEEDS}`); }
      await tick();
    }
    // X9: the right option should land in every position about equally, and true/false both ways
    const byN = {};
    for (const [k, c] of Object.entries(pos)) { const [nOpt, i] = k.split(':').map(Number); (byN[nOpt] ||= Array(nOpt).fill(0))[i] += c; }
    for (const [nOpt, counts] of Object.entries(byN)) {
      const all = counts.reduce((a, b) => a + b, 0);
      if (all >= 200 && counts.some((c) => c / all > 2 / Number(nOpt) || c / all < 0.4 / Number(nOpt))) { row.failed++; failures.push(`${g.id}: right option position unbalanced (${counts.join('/')} for ${nOpt} options)`); }
    }
    if (tfAll >= 100 && (tfTrue / tfAll < 0.25 || tfTrue / tfAll > 0.75)) { row.failed++; failures.push(`${g.id}: true/false answers unbalanced (${tfTrue} true of ${tfAll})`); }
    row.distinct = prompts.size;
    if (row.distinct < 30) { row.failed++; failures.push(`${g.id}: only ${row.distinct} different questions`); if (!row.first) row.first = `only ${row.distinct} different questions`; }
    rows.push(row);
    $('#summary').textContent = `Checked ${rows.length} of ${list.length} generators (${total} questions)...`;
  }

  // ---------------------------------------------------------------- 30-minute sessions
  const sessions = [];
  const target = budgetSeconds(30);
  for (const topicId of Object.keys(REGISTRY)) {
    if (ONLY && !topicId.startsWith(ONLY) && !GENERATORS.some((g) => g.topicId === topicId && g.id.startsWith(ONLY))) continue;
    const scopes = [[topicId, null], ...Object.keys(REGISTRY[topicId]).map((s) => [topicId, s])];
    for (const [t, sub] of scopes) {
      for (const seed of [1, 1000, 77777]) {
        const set = generateSet(t, 60, seed, { subtopicId: sub });
        let secs = 0; let need = 0;
        for (const q of set) { if (secs >= target) break; secs += estimateSeconds(q); need++; }
        const filled = secs >= target;
        // and straight from consecutive seeds, without the de-duplication: how many repeats?
        const raw = []; let rs = 0;
        for (let k = 0; rs < target && k < 80; k++) { let q; try { q = generateFor(t, sub, null, seed + k); } catch (e) { failures.push(`${sub || t} seed ${seed + k}: ${e.message}`); continue; } raw.push(`${q.prompt}|${JSON.stringify(q.options || '')}`); rs += estimateSeconds(q); }
        const repeats = raw.length - new Set(raw).size;
        sessions.push({ scope: sub ? `${t} / ${sub}` : t, seed, need, filled, repeats, gens: generatorsFor(t, sub).length });
        if (!filled) failures.push(`${sub || t} seed ${seed}: a 30-minute session could not be filled without repeats (${set.length} different questions)`);
      }
    }
  }
  render(sessions);
}

function render(sessions) {
  const failedQs = rows.reduce((a, r) => a + r.failed, 0);
  const sessFail = sessions.filter((s) => !s.filled).length;
  const ok = !failures.length;
  const sum = $('#summary');
  sum.textContent = ok
    ? `All good: ${rows.length} generators, ${total} questions checked, 0 problems; ${sessions.length} 30-minute session fills, 0 short.`
    : `${failures.length} problem(s): ${failedQs} question check(s) failed; ${sessFail} session fill(s) short. ${total} questions checked.`;
  sum.className = ok ? 'ok' : 'bad';
  const t = $('#gens');
  t.innerHTML = '<tr><th>Generator</th><th>Topic</th><th>Subtopic</th><th>Levels</th><th>Questions</th><th>Different</th><th>Different prompts per level</th><th>Problems</th><th>First problem</th></tr>';
  for (const r of rows) {
    const tr = document.createElement('tr');
    if (r.failed) tr.className = 'bad';
    for (const v of [r.id, r.topic, r.subtopic, r.difficulties, r.questions, r.distinct, (r.perLevel || []).join(', '), r.failed, r.first]) { const td = document.createElement('td'); td.textContent = v; tr.appendChild(td); }
    t.appendChild(tr);
  }
  const st = $('#sessions');
  st.innerHTML = '<tr><th>Scope</th><th>Generators</th><th>Seed</th><th>Questions for 30 min</th><th>Filled without repeats</th><th>Repeats from raw consecutive seeds</th></tr>';
  for (const s of sessions) {
    const tr = document.createElement('tr');
    if (!s.filled) tr.className = 'bad';
    for (const v of [s.scope, s.gens, s.seed, s.need, s.filled ? 'yes' : 'NO', s.repeats]) { const td = document.createElement('td'); td.textContent = v; tr.appendChild(td); }
    st.appendChild(tr);
  }
  const fl = $('#failures');
  for (const f of failures.slice(0, 300)) { const li = document.createElement('li'); li.textContent = f; fl.appendChild(li); }
  // per topic counts
  const byTopic = {};
  for (const r of rows) { byTopic[r.topic] ||= { gens: 0, questions: 0, failed: 0 }; byTopic[r.topic].gens++; byTopic[r.topic].questions += r.questions; byTopic[r.topic].failed += r.failed; }
  window.__genResults = { ok, total, generators: rows.length, failures: failures.slice(0, 300), byTopic, sessions: sessions.length, sessionsShort: sessFail };
  // for runs from the command line (tools/run_tests.py): report the result to the local server
  if (params.has('beacon')) fetch(`./__result?${encodeURIComponent(JSON.stringify({ total, generators: rows.length, sessions: sessions.length, failed: failures.slice(0, 120).map((f) => f.slice(0, 220)) }))}`).catch(() => {});
  document.body.dataset.done = '1';
}

// sample viewer: ?show=<generatorId>&d=2&n=5 prints example questions
if (params.get('show')) {
  const id = params.get('show');
  const d = Number(params.get('d')) || undefined;
  const n = Number(params.get('n')) || 5;
  const out = [];
  for (let s = 1; s <= n; s++) out.push(generate(id, s, d));
  $('#sample').textContent = JSON.stringify(out, null, 1);
  $('#summary').textContent = `Showing ${n} samples of ${id}`;
} else {
  run().catch((e) => { $('#summary').textContent = `Crashed: ${e.stack || e}`; $('#summary').className = 'bad'; document.body.dataset.done = '1'; if (params.has('beacon')) fetch(`./__result?${encodeURIComponent(JSON.stringify({ total: 0, failed: [`crashed: ${e && e.message}`] }))}`).catch(() => {}); });
}
