// Integration of the content engines (js/diagrams, js/generators) with the app (v2, 17 Oct 2026).
// Loaded by tests.js; exports run({ check, setGroup }).
//
// - the real engines load through js/hooks.js;
// - every built bank loads, and every bank picture is valid and draws;
// - every generator, at every difficulty, gives questions the app accepts and marks correctly,
//   with misconception codes found for wrong answers;
// - sessions mix in about a third generated questions on maths, more when the bank runs low;
// - a generated question is rebuilt identically on another device: through an export file
//   (local mode), through Supabase rows read by the parent (mock back-end), and from its recipe
//   when the stored copy is missing or damaged;
// - the parent report counts named misconceptions;
// - diagrams and picture choices are drawn in the review and the parent report, and question
//   data from her device is shown as text only;
// - every generator and diagram file is on the service worker's offline list.

import * as G from '../js/generators/index.js';
import { renderDiagram, validateQuestionDiagrams, DIAGRAM_TYPES } from '../js/diagrams/index.js';
import { loadExtensions, canGenerate, canTopUp, setExtensions, validQuestion, questionsForSession, rebuild, prepareGenerated, misconceptionCodesFor, misconceptionLabel, diagramFor, optionDiagramFor, generatedRef } from '../js/hooks.js';
import { markQuestion } from '../js/marking.js';
import { prepareTopic, setContentRoot, indexQuestions, indexTopics } from '../js/content.js';
import { planSession, finishSession, submitSession, GENERATED_SHARE } from '../js/practice.js';
import { estimateSeconds } from '../js/sampler.js';
import { buildReport, reportBodyHtml, reportPlainText } from '../js/report.js';
import { progressAnalysis } from '../js/analysis.js';
import { misconceptionCodeTally, misconceptionTally } from '../js/stats.js';
import { visualReport } from '../js/visual-report.js';
import { Db } from '../js/db.js';
import { buildExport, importExport } from '../js/exportimport.js';
import { MockServer, MockBackend } from '../js/data/mock-backend.js';
import { SyncQueue, rowsFor } from '../js/data/sync.js';
import { RemoteSource } from '../js/data/remote-source.js';
import { studentEmail } from '../js/data/backend.js';
import { resultsView } from '../js/views/results.js';

const DAY = 86400000;
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/** A right response for any question type. */
function rightResponse(q) {
  switch (q.type) {
    case 'mcq': case 'truefalse': return q.answer;
    case 'multi': return [...q.answer];
    case 'order': return [...q.answer];
    case 'match': { const r = []; for (const [L, R] of q.answer) r[L] = R; return r; }
    case 'numeric': return (q.answer.accept && q.answer.accept[0]) || String(q.answer.value);
    case 'short': return q.answer.accept[0];
    default: return null;
  }
}

/** A wrong response that carries a misconception code, or null. */
function codedWrong(q) {
  const codes = q.misconceptionCodes || {};
  if (q.type === 'mcq') {
    for (const i of q.options.keys()) if (i !== q.answer && codes[String(i)] && codes[String(i)] !== 'NEAR-MISS') return { r: i, code: codes[String(i)] };
  }
  if (q.type === 'numeric' || q.type === 'short') {
    for (const k of Object.keys(codes)) if (k !== 'common' && codes[k] !== 'NEAR-MISS' && Object.prototype.hasOwnProperty.call(q.misconceptions || {}, k)) return { r: k, code: codes[k] };
  }
  return null;
}

export async function run({ check, setGroup }) {
  // ================================================================ the engines
  setGroup('integration: the engines load through the hooks');
  const loaded = await loadExtensions();
  check('diagram engine and generators load', loaded.diagrams && loaded.generators && canGenerate() && canTopUp(), JSON.stringify(loaded));
  check('every generator topic file loaded', G.LOAD_ERRORS.length === 0 && G.GENERATORS.length >= 125 && G.GENERATED_TOPICS.length === 15, G.LOAD_ERRORS.join('; '));
  check('misconception codes have readable labels', misconceptionLabel('FR-ADD-TOPS-BOTTOMS') && misconceptionLabel('nope') === null);

  // ================================================================ the built banks
  setGroup('integration: the built banks and their pictures');
  const man = await (await fetch('../content/manifest.json', { cache: 'no-store' })).json();
  const topics = [];
  const loadErrors = [];
  for (const s of man.subjects) {
    for (const t of s.topics) {
      try {
        topics.push(prepareTopic(await (await fetch(`../${t.file}`, { cache: 'no-store' })).json()));
      } catch (e) {
        loadErrors.push(`${t.file}: ${e.message}`);
      }
    }
  }
  const allQ = topics.flatMap((t) => t.questions);
  const withPics = allQ.filter((q) => q.diagram != null || q.optionDiagrams != null);
  check(`every topic file loads (${topics.length} of ${man.subjects.reduce((n, s) => n + s.topics.length, 0)})`, loadErrors.length === 0 && topics.length === 27, loadErrors.join('; '));
  check(`${allQ.length} questions, ${withPics.length} with pictures`, allQ.length >= 1334 && withPics.length >= 442 && allQ.length === man.subjects.reduce((t, x) => t + x.topics.reduce((u, y) => u + y.questions, 0), 0), `${allQ.length} / ${withPics.length}`);
  const badSpec = [];
  const badDraw = [];
  let drawn = 0;
  for (const q of withPics) {
    const errs = validateQuestionDiagrams(q);
    if (errs.length) badSpec.push(`${q.id}: ${errs[0]}`);
    const nodes = [diagramFor(q, 'session'), ...(q.optionDiagrams || []).map((_, i) => optionDiagramFor(q, i))].filter(Boolean);
    for (const n of nodes) {
      drawn += 1;
      if (n.querySelector('.dg-err') || !(n.querySelector('svg[role="img"][aria-label]') || n.querySelector('table'))) badDraw.push(q.id);
    }
  }
  check(`every bank picture passes the diagram checker (${withPics.length} questions)`, badSpec.length === 0, badSpec.slice(0, 6).join(' | '));
  check(`every bank picture draws, with a text description (${drawn} pictures)`, badDraw.length === 0 && drawn >= withPics.length, [...new Set(badDraw)].slice(0, 8).join(', '));
  const invalidBank = allQ.filter((q) => !validQuestion(q));
  check('the stored-question checker accepts every bank question (it is not too strict)', invalidBank.length === 0, invalidBank.slice(0, 5).map((q) => q.id).join(', '));
  const types = new Set(withPics.map((q) => q.diagram && q.diagram.type).filter(Boolean));
  check('bank pictures use only known diagram types', [...types].every((t) => DIAGRAM_TYPES.includes(t)), [...types].filter((t) => !DIAGRAM_TYPES.includes(t)).join(', '));

  // ================================================================ every generator through the app
  setGroup('integration: generated questions in the app (every generator, every level)');
  const topicById = indexTopics(topics);
  const SEEDS = 12;
  const problems = [];
  let n = 0;
  let codedN = 0;
  let longestId = 0;
  for (const g of G.GENERATORS) {
    const topic = topicById.get(g.topicId);
    if (!topic) { problems.push(`${g.id}: no bank topic ${g.topicId}`); continue; }
    if (!topic.preamble.subtopics.some((s) => s.id === g.subtopicId)) problems.push(`${g.id}: subtopic ${g.subtopicId} not in the bank`);
    for (const d of g.difficulties) {
      for (let s = 0; s < SEEDS; s++) {
        const seed = 1000003 * (s + 1) + d;
        let raw;
        try { raw = G.generate(g.id, seed, d); } catch (e) { problems.push(`${g.id} d${d} s${seed}: ${e.message}`); continue; }
        n += 1;
        longestId = Math.max(longestId, `${raw.id.replace(/\d+$/, '')}4294967295`.length);
        const q = prepareGenerated(raw, topic);
        if (!validQuestion(q)) { problems.push(`${raw.id}: not a valid question for the app`); continue; }
        if (!same(G.generate(g.id, seed, d), raw)) problems.push(`${raw.id}: not reproducible`);
        const ref = generatedRef(q);
        if (!ref || ref.generatorId !== g.id || ref.seed !== seed || ref.difficulty !== d) problems.push(`${raw.id}: recipe wrong`);
        if (!same(rebuild(ref, topic), q)) problems.push(`${raw.id}: rebuilt question differs`);
        const m = markQuestion(q, rightResponse(q));
        if (!m.correct || m.earned !== (q.marks || 1)) problems.push(`${raw.id}: right answer ${JSON.stringify(rightResponse(q))} not marked right`);
        const w = codedWrong(q);
        if (w) {
          const mw = markQuestion(q, w.r);
          const codes = misconceptionCodesFor(q, mw.misconceptions);
          if (mw.correct) problems.push(`${raw.id}: wrong answer ${JSON.stringify(w.r)} marked right`);
          else if (!codes.includes(w.code)) problems.push(`${raw.id}: wrong answer ${JSON.stringify(w.r)} should give ${w.code}, gave ${codes.join(',') || 'none'}`);
          else codedN += 1;
        }
        if (q.diagram || q.optionDiagrams) {
          const nodes = [diagramFor(q, 'review'), ...(q.optionDiagrams || []).map((_, i) => optionDiagramFor(q, i, 'review'))].filter(Boolean);
          if (!nodes.length || nodes.some((x) => x.querySelector('.dg-err'))) problems.push(`${raw.id}: picture not drawn`);
        }
      }
    }
  }
  check(`${n} generated questions: valid, reproducible, rebuilt identically, right answer marked right`, problems.length === 0, problems.slice(0, 10).join(' | '));
  check(`wrong answers give their misconception code (${codedN} checked)`, codedN > n * 0.5, `${codedN} of ${n}`);
  check(`generated ids fit the database (longest ${longestId} of 120 characters)`, longestId <= 120);

  // ================================================================ sessions
  setGroup('integration: sessions mix bank and generated questions');
  const m10 = topicById.get('m10-calculations-with-fractions');
  const m03 = topicById.get('m03-2d-shapes-and-angles');
  const s01 = topics.find((t) => t.subject === 'science');
  const maths = topics.filter((t) => t.subject === 'maths');
  const genShare = (ses) => {
    const all = ses.questionIds.map((id) => ses.instances[id] || m10.questions.find((q) => q.id === id) || allQ.find((q) => q.id === id));
    const sec = (list) => list.reduce((t, q) => t + estimateSeconds(q), 0);
    return sec(all.filter((q) => q && q.generatorId)) / sec(all.filter(Boolean));
  };
  const t0 = performance.now();
  const s30 = planSession({ subject: 'maths', topic: m10, topics: [m10], mode: 'topic', durationMin: 30, attempts: [], seed: 4242 });
  const ms30 = performance.now() - t0;
  const gen30 = s30.questionIds.filter((id) => s30.instances[id]);
  check('a 30-minute maths session mixes in about a third generated questions', gen30.length >= 2 && genShare(s30) > 0.2 && genShare(s30) < 0.5, `${gen30.length} of ${s30.questionIds.length}, share ${genShare(s30).toFixed(2)} (target ${GENERATED_SHARE.toFixed(2)})`);
  check('every generated question is stored in full in the session', gen30.every((id) => validQuestion(s30.instances[id]) && s30.instances[id].generatorId && s30.instances[id].topicId === m10.topicId));
  check('the bank questions are still most of it, easier first', s30.questionIds.length - gen30.length > gen30.length && (() => { const d = s30.questionIds.map((id) => (s30.instances[id] || m10.questions.find((q) => q.id === id)).difficulty); return d.every((x, i) => i === 0 || x >= d[i - 1]); })());
  const again = planSession({ subject: 'maths', topic: m10, topics: [m10], mode: 'topic', durationMin: 30, attempts: [], seed: 4242 });
  check('same seed, same session (questions and numbers)', same(again.questionIds, s30.questionIds) && same(again.instances, s30.instances));
  check(`planning is quick (${Math.round(ms30)} ms)`, ms30 < 1500);
  const sci = planSession({ subject: 'science', topic: s01, topics: [s01], mode: 'topic', durationMin: 30, attempts: [], seed: 7 });
  check('science sessions stay bank-only', Object.keys(sci.instances).length === 0 && sci.questionIds.length >= 5);
  const t1 = performance.now();
  const mixed = planSession({ subject: 'maths', topic: null, topics: maths, mode: 'mixed', durationMin: 90, attempts: [], seed: 99 });
  const msMixed = performance.now() - t1;
  const mixedTopics = new Set(Object.values(mixed.instances).map((q) => q.topicId));
  check(`mixed maths revision (90 min) mixes generated questions across chapters (${Math.round(msMixed)} ms)`, Object.keys(mixed.instances).length >= 6 && mixedTopics.size >= 4 && msMixed < 3000, `${Object.keys(mixed.instances).length} generated from ${mixedTopics.size} chapters`);
  const sub = m10.preamble.subtopics[0].id;
  const subS = planSession({ subject: 'maths', topic: m10, topics: [m10], mode: 'subtopic', subtopicId: sub, durationMin: 15, attempts: [], seed: 11 });
  check('one-part sessions: generated questions only from that part', Object.keys(subS.instances).length >= 1 && Object.values(subS.instances).every((q) => q.subtopicId === sub));
  // the bank runs low: she has seen every bank question in this chapter today
  const now = Date.now();
  const seenAll = m10.questions.map((q, i) => ({ id: `x|${q.id}`, sessionId: 'x', questionId: q.id, topicId: m10.topicId, subtopicId: q.subtopicId, skill: q.skill, correct: i % 3 !== 0, answeredAt: now - 3600000, marks: 1, earned: 1, answered: true }));
  const low = planSession({ subject: 'maths', topic: m10, topics: [m10], mode: 'topic', durationMin: 30, attempts: seenAll, seed: 4242, now });
  check('when the bank has nothing fresh, generated questions fill most of the session', genShare(low) > 0.6, `share ${genShare(low).toFixed(2)}`);
  const m03Sub = m03.preamble.subtopics.map((x) => x.id).find((id) => !G.generatorsFor(m03.topicId, id).length);
  if (m03Sub) {
    const noGen = planSession({ subject: 'maths', topic: m03, topics: [m03], mode: 'subtopic', subtopicId: m03Sub, durationMin: 15, attempts: [], seed: 3 });
    check('a part with no generators stays bank-only', Object.keys(noGen.instances).length === 0);
  }
  const offS = planSession({ subject: 'maths', topic: m10, topics: [m10], mode: 'topic', durationMin: 30, attempts: [], seed: 4242, generated: false });
  check('without generated questions the session is the bank-only plan (as version 1)', Object.keys(offS.instances).length === 0);

  // ================================================================ marking, attempts, reports
  setGroup('integration: marking, stored recipes and named misconceptions');
  const bank = indexQuestions(topics);
  const qs30 = questionsForSession(bank, s30);
  // answer everything right except: one generated question wrong with a coded misconception
  const resp = {};
  let codedId = null;
  let expectCode = null;
  for (const id of s30.questionIds) {
    const q = qs30.get(id);
    const w = q.generatorId && !codedId ? codedWrong(q) : null;
    if (w) { codedId = id; expectCode = w.code; resp[id] = w.r; } else resp[id] = rightResponse(q);
  }
  s30.state.responses = resp;
  const fin = finishSession(s30, bank, { now: now - 2 * DAY });
  const genAtts = fin.attempts.filter((a) => a.generated);
  check('generated questions are marked against the stored question', fin.attempts.filter((a) => a.questionId !== codedId).every((a) => a.correct) && codedId && !fin.attempts.find((a) => a.questionId === codedId).correct, codedId);
  check('each generated answer keeps its recipe (generatorId, seed, difficulty)', genAtts.length === gen30.length && genAtts.every((a) => a.generated.generatorId === s30.instances[a.questionId].generatorId && a.generated.seed === s30.instances[a.questionId].seed && a.generated.difficulty === s30.instances[a.questionId].difficulty));
  const ca = fin.attempts.find((a) => a.questionId === codedId);
  check('a wrong answer records its misconception code', ca && same(ca.misconceptionCodes, [expectCode]), JSON.stringify(ca && ca.misconceptionCodes));
  const ctx = { questions: qs30, topics: topicById, topicOrder: maths, sessions: [fin.session], attempts: fin.attempts };
  const rep = buildReport(fin.session, fin.attempts, ctx);
  check('the report counts named misconceptions, with a readable label', rep.misconceptionCodes.length === 1 && rep.misconceptionCodes[0].code === expectCode && rep.misconceptionCodes[0].count === 1 && rep.misconceptionCodes[0].label === misconceptionLabel(expectCode));
  check('the report text and saved page name it', reportPlainText(rep).includes(rep.misconceptionCodes[0].label.slice(0, 20)) && reportBodyHtml(rep).includes('Named mistakes'));
  // a second session a day later with the same mistake: counted twice over the month
  const s2 = planSession({ subject: 'maths', topic: m10, topics: [m10], mode: 'topic', durationMin: 15, attempts: fin.attempts, seed: 777 });
  s2.instances[codedId] = s30.instances[codedId];
  s2.questionIds = [codedId, ...s2.questionIds.filter((id) => id !== codedId)];
  s2.state.responses = { [codedId]: resp[codedId] };
  const fin2 = finishSession(s2, bank, { now: now - DAY / 2 });
  const an = progressAnalysis({ sessions: [fin.session, fin2.session], attempts: [...fin.attempts, ...fin2.attempts], topics, now });
  const nm = an.namedMistakes.find((x) => x.code === expectCode);
  check('the parent analysis counts each named misconception across sessions', nm && nm.count === 2 && nm.week === 2 && nm.subtopics.length >= 1, JSON.stringify(an.namedMistakes.slice(0, 3)));
  check('and suggests talking it through', an.recommendations.some((r) => r.includes('2 times this month')));
  check('tally ignores right answers, near misses, unclassified slips and junk', misconceptionCodeTally([{ correct: true, answeredAt: 1, misconceptionCodes: ['A'] }, { correct: false, answeredAt: 1, misconceptionCodes: ['B', 'B', 7, '', 'NEAR-MISS', 'UNCLASSIFIED'] }]).map((c) => `${c.code}${c.count}`).join() === 'B1');
  // X1/X2 (CLO review): the catch-all is UNCLASSIFIED and never counted; the same code adds up across questions
  const typed = G.GENERATORS.map((g) => G.generate(g.id, 7, g.difficulties[0])).find((q) => q.type === 'numeric' || q.type === 'short');
  check('a typed question\'s catch-all ("common") is coded UNCLASSIFIED', typed && typed.misconceptionCodes.common === 'UNCLASSIFIED', typed && typed.id);
  const unmatched = markQuestion(typed, typed.type === 'numeric' ? '987654321' : 'zzqq');
  check('an unmatched slip is recorded with code UNCLASSIFIED but counts as no misconception', !unmatched.correct && misconceptionCodesFor(typed, unmatched.misconceptions).length === 0);
  const att = (qid, code, t) => ({ questionId: qid, correct: false, answeredAt: t, misconceptions: [{ key: '1', note: `n-${qid}`, code }], misconceptionCodes: code === 'NEAR-MISS' || code === 'UNCLASSIFIED' ? [] : [code] });
  const tally = misconceptionTally([att('m10-g-a-d1-1', 'FR-ADD-TOPS-BOTTOMS', 5), att('m10-g-a-d1-2', 'FR-ADD-TOPS-BOTTOMS', 6), att('m10-g-b-d1-3', 'NEAR-MISS', 7), att('m10-g-b-d1-4', 'UNCLASSIFIED', 8), { questionId: 'm10-q001', correct: false, answeredAt: 9, misconceptions: [{ key: '2', note: 'bank note' }] }]);
  check('misconceptionTally counts generated mistakes by code (two questions, one entry, count 2), leaves out near misses and unclassified', tally.length === 2 && tally[0].code === 'FR-ADD-TOPS-BOTTOMS' && tally[0].count === 2 && tally[1].note === 'bank note', JSON.stringify(tally.map((x) => [x.code, x.count])));

  // ================================================================ another device: local mode (export file)
  setGroup('integration: generated questions rebuilt on another device');
  const DB1 = 'sp-int-a';
  const DB2 = 'sp-int-b';
  await Db.deleteDatabase(DB1);
  await Db.deleteDatabase(DB2);
  const dbA = await Db.open(DB1);
  const dbB = await Db.open(DB2);
  try {
    const plan = planSession({ subject: 'maths', topic: m10, topics: [m10], mode: 'topic', durationMin: 30, attempts: [], seed: 5151 });
    const qsA = questionsForSession(bank, plan);
    plan.state.responses = Object.fromEntries(plan.questionIds.map((id, i) => [id, i % 2 ? rightResponse(qsA.get(id)) : null]));
    const sub1 = await submitSession(dbA, plan, { questions: bank, topics: topicById, topicOrder: maths }, { early: true, elapsedSec: 600 });
    const exp = await buildExport(dbA, {});
    const res = await importExport(dbB, JSON.stringify(exp));
    const sB = await dbB.get('sessions', sub1.session.id);
    const aB = await dbB.getAllByIndex('attempts', 'sessionId', sub1.session.id);
    check('local: the export file carries every generated question and imports cleanly', res.added.sessions === 1 && res.invalid === 0 && same(sB.instances, sub1.session.instances));
    const qsB = questionsForSession(indexQuestions(topics), sB, aB, topicById);
    check('local: the other device shows exactly the same questions', sub1.session.questionIds.every((id) => same(qsB.get(id), qsA.get(id))));
    // the stored copies lost: rebuilt from the recipes in the answers
    const bare = { ...sB, instances: {} };
    const qsR = questionsForSession(indexQuestions(topics), bare, aB, topicById);
    check('without the stored copies, every generated question is rebuilt identically from its recipe', Object.keys(sub1.session.instances).length > 0 && Object.keys(sub1.session.instances).every((id) => same(qsR.get(id), qsA.get(id))));
    const aRef = aB.find((a) => a.generated);
    check('a recipe from another generator version is not rebuilt (the reports show their stored text instead)', aRef && aRef.generated.v === G.GENERATOR_VERSION && rebuild({ ...aRef.generated, v: 'an-older-version' }, m10) === null && rebuild(aRef.generated, m10) !== null);
    // a damaged stored copy is not used
    const gid = Object.keys(sub1.session.instances)[0];
    const damaged = { ...sB, instances: { ...sB.instances, [gid]: { ...sB.instances[gid], options: 'oops', answer: { value: 'x' } } } };
    const qsD = questionsForSession(indexQuestions(topics), damaged, aB, topicById);
    check('a damaged stored copy is replaced by the rebuilt question', same(qsD.get(gid), qsA.get(gid)));
    const badFile = JSON.parse(JSON.stringify(exp));
    badFile.sessions[0].instances[gid] = { id: gid, type: 'mcq', prompt: 5 };
    badFile.sessions[0].id = 'ses-bad';
    const res2 = await importExport(dbB, JSON.stringify(badFile));
    check('an import with a damaged generated question is refused for that session', res2.added.sessions === 0 && res2.invalid >= 1);
  } finally {
    dbA.close();
    dbB.close();
    await Db.deleteDatabase(DB1);
    await Db.deleteDatabase(DB2);
  }

  // ================================================================ another device: linked mode (mock Supabase)
  {
    const server = new MockServer();
    server.addUser('p@example.test', 'parent-pass-1');
    server.makeParent('p@example.test');
    const asP = new MockBackend(server);
    const asS = new MockBackend(server);
    await asP.signIn('p@example.test', 'parent-pass-1');
    const S = (await asP.invoke('manage-student', { action: 'create', username: 'int-s', password: 'student-pass-1', displayName: 'S' })).studentId;
    await asS.signIn(studentEmail('int-s'), 'student-pass-1');
    const DBS = 'sp-int-s';
    await Db.deleteDatabase(DBS);
    const sdb = await Db.open(DBS);
    try {
      const plan = planSession({ subject: 'maths', topic: m10, topics: [m10], mode: 'topic', durationMin: 60, attempts: [], seed: 6161 });
      const qsS = questionsForSession(bank, plan);
      let wrongId = null;
      plan.state.responses = {};
      for (const id of plan.questionIds) {
        const q = qsS.get(id);
        const w = q.generatorId && !wrongId ? codedWrong(q) : null;
        if (w) { wrongId = id; plan.state.responses[id] = w.r; } else plan.state.responses[id] = rightResponse(q);
      }
      const done = await submitSession(sdb, plan, { questions: bank, topics: topicById, topicOrder: maths }, { early: true, elapsedSec: 900 });
      const q = new SyncQueue({ db: sdb, backend: asS, userId: S });
      await q.enqueue(done.session.id);
      const r = await q.flush();
      const rows = rowsFor(S, done.session, done.attempts, done.report);
      const sizes = { session: JSON.stringify(rows.sessionRow.data).length, attempt: Math.max(...rows.attemptRows.map((x) => JSON.stringify(x.data).length)), report: JSON.stringify(rows.reportRow.data).length };
      check('linked: the session with generated questions is sent', r.sent === 1 && server.tables.sessions.has(`${S}|${done.session.id}`));
      check('linked: rows fit the table limits (ids and data sizes)', rows.attemptRows.every((x) => x.question_id.length <= 120 && x.id.length <= 250) && sizes.session < 1000000 && sizes.attempt < 200000 && sizes.report < 500000, JSON.stringify(sizes));
      check('linked: no bank lookup is needed for her rows (generated ids are not in the bank, nothing refers to a question table)', rows.attemptRows.some((x) => !bank.has(x.question_id)));
      const src = new RemoteSource(asP, S);
      const rs = await src.get('sessions', done.session.id);
      const ra = await src.getAllByIndex('attempts', 'sessionId', done.session.id);
      const qsP = questionsForSession(indexQuestions(topics), rs, ra, topicById);
      check('linked: the parent\'s device shows exactly the questions she saw', done.session.questionIds.every((id) => same(qsP.get(id), qsS.get(id))));
      check('linked: the recipes and misconception codes reach the parent', ra.filter((a) => a.generated).length === Object.keys(done.session.instances).length && ra.find((a) => a.questionId === wrongId).misconceptionCodes.length === 1);
      const rep2 = await src.get('reports', done.session.id);
      // the parent's visual report draws the pictures of the questions she got wrong
      const host = document.createElement('div');
      host.style.width = '760px';
      document.body.append(host);
      const vr = visualReport(rep2, { attempts: ra, sessions: [rs], source: src, host, questions: qsP });
      host.append(vr);
      check('parent report: the named-mistakes block counts them', vr.querySelectorAll('.vr-named li').length === 1 && vr.querySelector('.vr-named-label').textContent === misconceptionLabel(rep2.misconceptionCodes[0].code));
      const wrongQ = qsP.get(wrongId);
      const card = [...vr.querySelectorAll('.vr-working-card')].find((c) => c.textContent.includes(wrongQ.prompt.slice(0, 30)));
      check('parent report: her wrong generated question is shown, with its picture when it has one', card && (!(wrongQ.diagram || wrongQ.optionDiagrams) || card.querySelector('.dg')) && card.querySelector('.vr-why'));
      host.remove();
      // untrusted data: a hand-made row with markup in every text field and in the picture
      const evil = '<img src=x onerror="window.__pwn=1"><script>window.__pwn=1</script>';
      const fakeQ = { id: 'm10-g-evil-d1-1', type: 'mcq', subtopicId: sub, difficulty: 1, marks: 1, prompt: `What? ${evil}`, options: [evil, 'b', 'c'], answer: 1, solution: evil, misconceptions: { 0: evil }, misconceptionCodes: { 0: evil }, skill: evil, topicId: m10.topicId, subject: 'maths', generatorId: 'm10.nope', seed: 1, diagram: { type: 'table', alt: evil, caption: evil, columns: [evil, 'x'], rows: [[evil, '1']] }, optionDiagrams: [{ type: 'table', columns: [evil], rows: [[evil]] }, null, null] };
      check('a hand-made question with well-formed pictures passes the shape check (so the drawing itself must be safe)', validQuestion(fakeQ));
      check('a stored question with a picture the renderer cannot draw, or one too big to draw quickly, is refused', !validQuestion({ ...fakeQ, optionDiagrams: [{ type: 'nonsense', label: evil }, null, null] }) && !validQuestion({ ...fakeQ, diagram: { type: 'barChart', categories: ['a'], series: [{ name: 'x', values: [1] }], yMax: 1e7, yStep: 0.0001 } }));
      const fakeSession = { ...rs, id: 'ses-evil', questionIds: [fakeQ.id], instances: { [fakeQ.id]: fakeQ } };
      const fakeAtt = { ...ra[0], id: 'ses-evil|x', sessionId: 'ses-evil', questionId: fakeQ.id, correct: false, answered: true, earned: 0, response: 0, misconceptionCodes: [evil], position: 0, generated: { generatorId: 'm10.nope', seed: 1, difficulty: 1 } };
      const fakeRep = { ...rep2, sessionId: 'ses-evil', perQuestion: [{ n: 1, questionId: fakeQ.id, kind: 'wrong', timeSec: 3 }], mistakes: [{ questionId: fakeQ.id, position: 1, prompt: evil, yourAnswer: evil, correctAnswer: evil, subtopic: evil, skill: evil, earned: 0, marks: 1, codes: [evil] }], misconceptionCodes: [{ code: evil, count: 3, label: evil, subtopics: [evil] }], title: evil };
      const host2 = document.createElement('div');
      document.body.append(host2);
      window.__pwn = 0;
      host2.append(visualReport(fakeRep, { attempts: [fakeAtt], sessions: [fakeSession], source: null, host: host2, questions: questionsForSession(new Map(), fakeSession, [fakeAtt], topicById) }));
      await new Promise((res) => setTimeout(res, 50));
      check('parent report: markup in her data is shown as text, never run', window.__pwn === 0 && !host2.querySelector('img, script, iframe, object, foreignObject, a[href^="javascript"]') && host2.textContent.includes('<script>'));
      check('parent report: her pictures are drawn as pictures', host2.querySelectorAll('.dg table, .dg svg').length >= 1);
      host2.innerHTML = '';
      host2.remove();
      // review page on her device: diagrams and picture choices drawn
      setContentRoot('../');
      const host3 = document.createElement('div');
      document.body.append(host3);
      await resultsView(host3, { mode: 'linked', db: sdb, sync: q, syncStatus: { pending: 0 } }, done.session.id);
      const picQs = done.session.questionIds.filter((id) => qsS.get(id).diagram);
      check('review: every question with a picture shows it', picQs.length === 0 || host3.querySelectorAll('.review .dg').length >= picQs.length, `${host3.querySelectorAll('.review .dg').length} drawn for ${picQs.length}`);
      host3.remove();
      setContentRoot('');
    } finally {
      sdb.close();
      await Db.deleteDatabase(DBS);
    }
  }

  // ================================================================ picture choices
  setGroup('integration: picture-choice questions');
  {
    const pc = allQ.find((q) => q.optionDiagrams && q.type === 'mcq');
    check('the bank has picture-choice questions', !!pc);
    if (pc) {
      setContentRoot('../');
      const DBP = 'sp-int-p';
      await Db.deleteDatabase(DBP);
      const pdb = await Db.open(DBP);
      try {
        const topic = topicById.get(pc.topicId);
        const plan = planSession({ subject: topic.subject, topic, topics: [topic], mode: 'topic', durationMin: 15, attempts: [], seed: 1, generated: false });
        plan.questionIds = [pc.id];
        plan.state.responses = { [pc.id]: (pc.answer + 1) % pc.options.length };
        const done = await submitSession(pdb, plan, { questions: indexQuestions([topic]), topics: indexTopics([topic]), topicOrder: [topic] }, { early: true, elapsedSec: 30 });
        const host = document.createElement('div');
        document.body.append(host);
        await resultsView(host, { mode: 'local', db: pdb }, done.session.id);
        const items = host.querySelectorAll('.choice-pictures .cp-item');
        check('review: every option picture is shown, her choice and the right one marked', items.length === pc.options.length && host.querySelector('.cp-item.is-right .dg') && host.querySelector('.cp-item.is-mine:not(.is-right)'));
        host.remove();
      } finally {
        pdb.close();
        await Db.deleteDatabase(DBP);
        setContentRoot('');
      }
    }
  }

  // ================================================================ offline list
  setGroup('integration: offline file list');
  {
    const sw = await (await fetch('../sw.js', { cache: 'no-store' })).text();
    const files = JSON.parse(sw.slice(sw.indexOf('const FILES = ') + 14, sw.indexOf('];', sw.indexOf('const FILES = ')) + 1));
    const listDir = async (dir) => {
      const html = await (await fetch(`../${dir}/`, { cache: 'no-store' })).text();
      return [...html.matchAll(/href="([^"?/]+\.js)"/g)].map((m) => `${dir}/${decodeURIComponent(m[1])}`);
    };
    const gen = await listDir('js/generators');
    const dia = await listDir('js/diagrams');
    const missing = [...gen, ...dia].filter((f) => !files.includes(f));
    check(`every generator and diagram file is kept offline (${gen.length} + ${dia.length})`, gen.length >= 18 && dia.length >= 12 && missing.length === 0, missing.join(', '));
    check('every content file and the hooks are on the list', files.includes('js/hooks.js') && files.includes('content/manifest.json') && man.subjects.every((s) => s.topics.every((t) => files.includes(t.file))));
    check('no notes or test files on the list', !files.some((f) => f.endsWith('.md') || f.startsWith('test/') || f.startsWith('tools/')));
  }

  // leave the hooks as the other suites expect them (no engines)
  setExtensions({ diagram: null, generator: null });
}
