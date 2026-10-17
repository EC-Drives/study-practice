// The textbook map, book-section practice and mock papers (17 Oct 2026). Loaded by tests.js;
// exports run({ check, setGroup }).
//
// - the built maths banks follow the book: chapters 1-14 in order, the extra topic last, every
//   question in one of its chapter's sections; ids from before the mapping still resolve;
// - generated questions carry a book section of their own topic;
// - a section practice draws only that section (bank and generated questions);
// - the report and the parent email have a line per book section, with the page;
// - a mock paper: its questions in number order, one timer, all-or-nothing marks, a second attempt
//   labelled as such, marks by book section, its review with the mark scheme and the shared stem;
// - paper and section sessions survive a backup and restore; the backup reminder rule.

import * as G from '../js/generators/index.js';
import { loadExtensions, freshQuestions, validQuestion } from '../js/hooks.js';
import { prepareTopic, preparePaper, setContentRoot, indexQuestions, indexTopics, bookOrder, sectionIndex, sectionLabel, chapterLabel } from '../js/content.js';
import { currentSubtopicId, bookSectionFor, SUBTOPIC_ALIASES } from '../js/bookmap.js';
import { planSession, planPaper, finishSession, submitSession, questionSection } from '../js/practice.js';
import { markQuestion } from '../js/marking.js';
import { buildReport, reportBodyHtml, emailBody, emailSubject, reportMailto, MAILTO_LIMIT, sessionTitle, sectionRows, reportPlainText } from '../js/report.js';
import { subtopicMastery, personalBests, scopeKey, sectionTally } from '../js/stats.js';
import { Db } from '../js/db.js';
import { buildExport, importExport, checkSession, checkReport } from '../js/exportimport.js';
import { resultsView } from '../js/views/results.js';
import { sessionView } from '../js/views/session.js';
import { backupDue } from '../js/views/parent.js';
import { visualReport } from '../js/visual-report.js';

const DAY = 86400000;

function rightResponse(q) {
  switch (q.type) {
    case 'mcq': case 'truefalse': return q.answer;
    case 'multi': case 'order': return [...q.answer];
    case 'match': { const r = []; for (const [L, R] of q.answer) r[L] = R; return r; }
    case 'numeric': return (q.answer.accept && q.answer.accept[0]) || String(q.answer.value);
    case 'short': return q.answer.accept[0];
    default: return null;
  }
}

export async function run({ check, setGroup }) {
  await loadExtensions();
  const man = await (await fetch('../content/manifest.json', { cache: 'no-store' })).json();
  const topics = [];
  for (const s of man.subjects) for (const t of s.topics) topics.push(prepareTopic(await (await fetch(`../${t.file}`, { cache: 'no-store' })).json()));
  const maths = topics.filter((t) => t.subject === 'maths');
  const byId = indexTopics(topics);
  const qmap = indexQuestions(topics);

  // ================================================================ the book map
  setGroup('book map: chapters and sections');
  const ordered = bookOrder(maths);
  check('maths topics in book order: Chapters 1 to 14, then the extra topic', ordered.map((t) => t.bookChapterNumber).join(',') === '1,2,3,4,5,6,7,8,9,10,11,12,13,14,' && ordered[14].topicId === 'm15-time-and-measures',
    ordered.map((t) => `${t.topicId}:${t.bookChapterNumber}`).join(' '));
  check('chapter labels: "Chapter 12", and "Extra topic" for m15', chapterLabel(byId.get('m12-data-handling')) === 'Chapter 12' && chapterLabel(byId.get('m15-time-and-measures')) === 'Extra topic');
  const mEntry = man.subjects.find((s) => s.id === 'maths').topics;
  check('the manifest lists each chapter\'s sections with page and question count', mEntry.every((t) => Array.isArray(t.bookSections) && t.bookSections.length && t.bookSections.every((s) => typeof s.id === 'string' && 'page' in s && Number.isInteger(s.questions))) && mEntry.find((t) => t.topicId === 'm12-data-handling').bookSections.find((s) => s.id === '12D').page === 191);
  const badSec = maths.flatMap((t) => t.questions.filter((q) => !(t.bookSections || []).some((s) => s.id === q.bookSection)).map((q) => q.id));
  check('every maths bank question names one of its chapter\'s sections', badSec.length === 0, badSec.slice(0, 5).join(', '));
  const idx = sectionIndex(maths);
  const s12d = idx.get('12D');
  check('section index: 12D is "Read and Make Scatter Graphs", page 191, in Chapter 12', s12d && s12d.title === 'Read and Make Scatter Graphs' && s12d.page === 191 && s12d.chapter === 12 && s12d.topicId === 'm12-data-handling');
  check('section index in book order (1A first, XC last)', [...idx.keys()][0] === '1A' && [...idx.keys()].pop() === 'XC' && idx.get('11A').rank < idx.get('14C').rank);
  check('section label for her: "12D Read and Make Scatter Graphs (p. 191)"', sectionLabel(s12d) === '12D Read and Make Scatter Graphs (p. 191)');
  check('science keeps its own order (no book sections yet)', topics.filter((t) => t.subject === 'science').every((t) => !t.bookSections || !t.bookSections.length));

  setGroup('book map: ids from before the mapping');
  check('the seven moved subtopics translate to their new ids', Object.keys(SUBTOPIC_ALIASES).length === 7 && currentSubtopicId('m02-s2') === 'm06-s6' && currentSubtopicId('m03-s5') === 'm14-s5' && currentSubtopicId('m15-s1') === 'm09-s6' && currentSubtopicId('m11-s1') === 'm11-s1');
  check('book section from subtopic and skill (a skill listed on its own wins)', bookSectionFor('m12-s2', 'plotting scatter graphs') === '12D' && bookSectionFor('m12-s2', 'something else') === '12E' && bookSectionFor('m02-s2', 'x') === '6C' && bookSectionFor('s01-s1', 'x') === null);
  const q3 = qmap.get('m07-q003');
  check('question ids are permanent: m07-q003 is found by id and now belongs to Chapter 2', q3 && q3.topicId === 'm02-number-system' && q3.subtopicId === 'm02-s5' && q3.bookSection === '2A');
  const old = [{ subtopicId: 'm02-s2', correct: true, fraction: 1, difficulty: 1, answeredAt: 1 }, { subtopicId: 'm06-s6', correct: false, fraction: 0, difficulty: 1, answeredAt: 2 }];
  const mm = subtopicMastery(old);
  check('answers saved under an old subtopic id count towards its new id', mm.has('m06-s6') && mm.get('m06-s6').n === 2 && !mm.has('m02-s2'));

  // ================================================================ generated questions
  setGroup('book map: generated questions carry a book section');
  {
    const bad = [];
    let n = 0;
    for (const g of G.GENERATORS) {
      const topic = byId.get(g.topicId);
      if (!topic) { bad.push(`${g.id}: no topic`); continue; }
      for (const d of g.difficulties) {
        let q;
        try { q = G.generate(g.id, 11 + d, d); } catch (e) { bad.push(`${g.id} d${d}: ${e.message}`); continue; }
        n += 1;
        if (!(topic.bookSections || []).some((s) => s.id === q.bookSection)) bad.push(`${g.id} d${d}: bookSection ${q.bookSection}`);
        if (!q.id.startsWith(`${topic.topicId.slice(0, 3)}-g-`) || !g.id.startsWith(`${topic.topicId.slice(0, 3)}.`)) bad.push(`${g.id}: prefix does not match ${topic.topicId}`);
      }
    }
    check(`every generator stamps a section of its own chapter (${n} questions)`, bad.length === 0, bad.slice(0, 6).join(' | '));
    const fresh = freshQuestions(byId.get('m11-ratio-and-proportion'), 6, 5);
    check('questions made for a session carry their section too', fresh.length > 0 && fresh.every((q) => /^11[AB]$/.test(q.bookSection) && validQuestion(q)));
    const rot = [];
    for (const g of G.GENERATORS.filter((x) => /rotational-symmetry/.test(x.id))) {
      for (const d of g.difficulties) for (let s = 0; s < 200; s++) {
        const q = G.generate(g.id, s, d);
        const nums = [...`${q.prompt} ${(q.options || []).join(' ')} ${q.answer && q.answer.value != null ? q.answer.value : ''}`.matchAll(/order (?:of rotational symmetry )?(?:is )?(\d+)/gi)].map((m) => Number(m[1]));
        const ans = q.type === 'numeric' ? q.answer.value : null;
        if (/hexagon|pentagon|octagon|heptagon/i.test(q.prompt) || nums.some((x) => x > 4) || (ans != null && /order/i.test(q.prompt) && ans > 4)) rot.push(`${q.id}`);
      }
    }
    check('rotational symmetry stays within Stage 6 (order 4 at most, no pentagons to octagons)', rot.length === 0, rot.slice(0, 5).join(', '));
  }

  // ================================================================ section practice
  setGroup('book section practice');
  {
    const topic = byId.get('m12-data-handling');
    const ses = planSession({ subject: 'maths', topic, topics: [topic], mode: 'section', bookSection: '12D', durationMin: 30, attempts: [], seed: 4 });
    const qs = ses.questionIds.map((id) => ses.instances[id] || qmap.get(id));
    check('a 12D session holds only 12D questions (bank and generated)', qs.length >= 8 && qs.every((q) => q && q.bookSection === '12D'), qs.map((q) => q && q.bookSection).join(','));
    const t11 = byId.get('m11-ratio-and-proportion');
    const s11 = planSession({ subject: 'maths', topic: t11, topics: [t11], mode: 'section', bookSection: '11B', durationMin: 30, attempts: [], seed: 4 });
    const q11 = s11.questionIds.map((id) => s11.instances[id] || qmap.get(id));
    check('where generators cover a section, freshly made questions join its bank questions (11B)', q11.every((q) => q.bookSection === '11B') && q11.some((q) => q.source !== 'generated') && q11.some((q) => q.source === 'generated'), q11.map((q) => `${q.id}:${q.bookSection}`).join(' '));
    check('the session records its section and page', ses.mode === 'section' && ses.bookSection === '12D' && ses.bookSectionTitle === 'Read and Make Scatter Graphs' && ses.bookPage === 191 && sessionTitle(ses) === '12D Read and Make Scatter Graphs');
    ses.state.responses = Object.fromEntries(qs.map((q, i) => [q.id, i % 2 ? rightResponse(q) : null]));
    const bank = new Map(qmap);
    const fin = finishSession(ses, bank, { now: Date.now(), elapsedSec: 600 });
    check('every answer carries its book section', fin.attempts.every((a) => a.bookSection === '12D'));
    const rep = buildReport(fin.session, fin.attempts, { questions: bank, topics: byId, sessions: [fin.session], attempts: fin.attempts, topicOrder: ordered });
    const rows = sectionRows(rep);
    check('report: one book-section line, with title and page', rows.length === 1 && rows[0].id === '12D' && rows[0].page === 191 && rows[0].total === qs.length, JSON.stringify(rows));
    const body = emailBody(rep, 'parent@example.com');
    check('parent email: a line per book section (questions, % right)', /By book section:/.test(body) && /- 12D Read and Make Scatter Graphs: \d+ questions, \d+% right/.test(body), body.slice(0, 600));
    check('parent email link stays within the length limit', reportMailto(rep, 'parent@example.com').length <= MAILTO_LIMIT);
    const html = reportBodyHtml(rep);
    check('full report: a "By book section" table with the page', html.includes('By book section') && html.includes('>191<'));
    const vr = visualReport(rep, { attempts: fin.attempts, sessions: [fin.session], questions: bank, compact: true });
    check('visual report: a book-sections block', [...vr.querySelectorAll('h3')].some((x) => x.textContent === 'Book sections practised') && vr.textContent.includes('12D'));
    check('section and chapter practice keep separate personal bests', scopeKey(fin.session) === 'section:12D' && scopeKey({ mode: 'topic', topicId: 'm12-data-handling' }) === 'm12-data-handling');
    // a mixed session: several sections, in book order
    const mixed = planSession({ subject: 'maths', topic: null, topics: maths, mode: 'mixed', durationMin: 60, attempts: [], seed: 9 });
    mixed.state.responses = {};
    const mf = finishSession(mixed, new Map(qmap), { now: Date.now(), elapsedSec: 60 });
    const mr = buildReport(mf.session, mf.attempts, { questions: qmap, topics: byId, sessions: [mf.session], attempts: mf.attempts, topicOrder: ordered });
    const ids = sectionRows(mr).map((g) => g.id);
    const ranks = ids.map((id) => idx.get(id).rank);
    check('mixed revision: sections listed in book order, each answer counted once', ids.length >= 5 && ranks.every((r, i) => i === 0 || r > ranks[i - 1]) && sectionRows(mr).reduce((t, g) => t + g.total, 0) === mf.attempts.filter((a) => a.bookSection).length);
    check('sections over all her answers (parent chapter page)', sectionTally(mf.attempts).size === ids.length);
    check('an answer without a stored section is placed by its question', questionSection({ subtopicId: 'm11-s4', skill: 'x' }) === '11B' && questionSection({ bookSection: '13C' }) === '13C');
  }

  // ================================================================ mock papers
  setGroup('mock papers');
  const papers = [];
  for (const p of man.papers || []) papers.push(preparePaper(await (await fetch(`../${p.file}`, { cache: 'no-store' })).json(), man));
  check('four mock papers in the manifest, each on the offline list', papers.length === 4 && (man.papers || []).every((p) => p.minutes > 0 && p.totalMarks > 0 && p.items > 0));
  const sw = await (await fetch('../sw.js', { cache: 'no-store' })).text();
  check('the papers are cached for offline use', (man.papers || []).every((p) => sw.includes(`"${p.file}"`)));
  const headers = papers.map((p) => `${p.id}:${p.minutes}/${p.totalMarks}/${p.questions.length}`).join(' ');
  check('papers as the CLO set them: 45/40/32, 45/40/33, 25/25/22, 50/40/27', headers === 'mp1-ch11-14:45/40/32 mp2-ch11-14:45/40/33 mp3-ch11-14:25/25/22 mp4-ch11-14:50/40/27', headers);
  const pq = papers.flatMap((p) => p.questions);
  check('paper questions never clash with bank ids', pq.every((q) => !qmap.has(q.id)) && new Set(pq.map((q) => q.id)).size === pq.length);
  check('every paper question belongs to Chapters 11-14 (counts towards her progress there)', pq.every((q) => /^m1[1-4]-/.test(q.topicId || '') && /^1[1-4][A-G]$/.test(q.bookSection)));
  check('every paper question passes the stored-question checker', pq.every((q) => validQuestion(q)), pq.filter((q) => !validQuestion(q)).map((q) => q.id).slice(0, 5).join(', '));
  check('parts of a multi-part question carry the shared stem (and its picture)', pq.filter((q) => q.group != null).length > 0 && pq.filter((q) => q.group != null).every((q) => q.groupStem && q.groupStem.length > 10) && pq.some((q) => q.groupDiagram));
  check('every paper question has its mark scheme', pq.every((q) => Array.isArray(q.markScheme) && q.markScheme.length));

  const p1 = papers[0];
  const all = new Map([...qmap, ...indexQuestions([], papers)]);
  const plan = planPaper({ paper: p1, sessions: [], deviceId: 'test', now: Date.now() });
  check('a paper session: every question in number order, one timer for the paper', plan.mode === 'paper' && plan.questionIds.join() === p1.questions.map((q) => q.id).join() && plan.limitSec === p1.minutes * 60 && plan.attemptNo === 1 && sessionTitle(plan) === 'Mock Paper 1');
  // all right
  plan.state.responses = Object.fromEntries(p1.questions.map((q) => [q.id, rightResponse(q)]));
  const full = finishSession(plan, all, { now: Date.now(), elapsedSec: 1800 });
  check('every answer right: full marks', full.session.score.earned === p1.totalMarks && full.session.score.max === p1.totalMarks, `${full.session.score.earned} / ${full.session.score.max}`);
  // all-or-nothing: a partly right multi / order / match worth 2+ marks earns nothing on a paper
  const multi = pq.find((q) => ['multi', 'order', 'match'].includes(q.type) && q.marks >= 2) || { ...pq.find((q) => q.type === 'multi'), marks: 2 };
  const half = multi.type === 'multi' ? [multi.answer[0]] : multi.type === 'order' ? [...multi.answer].reverse() : multi.answer.map(([, R], i) => (i === 0 ? R : null));
  const practiceMark = markQuestion(multi, half);
  const one = planPaper({ paper: { ...p1, questions: [multi] }, sessions: [] });
  one.state.responses = { [multi.id]: half };
  const oneDone = finishSession(one, new Map([[multi.id, multi]]), { now: Date.now() });
  check('a paper is marked all or nothing (a partly right answer earns 0 on a paper)', oneDone.attempts[0].earned === 0 && oneDone.attempts[0].fraction === 0 && !oneDone.attempts[0].correct, `${multi.id}: practice marking would give ${practiceMark.earned} of ${multi.marks}`);
  // half right, half blank: report
  const plan2 = planPaper({ paper: p1, sessions: [full.session], now: Date.now() + 1000 });
  check('sitting it again: the same questions, labelled "second attempt"', plan2.attemptNo === 2 && plan2.questionIds.join() === plan.questionIds.join() && sessionTitle(plan2) === 'Mock Paper 1 (second attempt)');
  plan2.state.responses = Object.fromEntries(p1.questions.filter((_, i) => i % 2 === 0).map((q) => [q.id, rightResponse(q)]));
  const q10a = p1.questions.find((q) => q.number === '10(a)');
  plan2.state.responses[q10a.id] = (q10a.answer + 1) % q10a.options.length; // a wrong choice on a part
  const part = finishSession(plan2, all, { now: Date.now() + 2000, elapsedSec: 2400 });
  const rep = buildReport(part.session, part.attempts, { questions: all, topics: byId, sessions: [full.session, part.session], attempts: [...full.attempts, ...part.attempts], topicOrder: ordered });
  const rows = sectionRows(rep);
  check('paper report: marks by book section add up to the score', rows.length >= 6 && rows.reduce((t, g) => t + g.earned, 0) === part.session.score.earned && rows.reduce((t, g) => t + g.max, 0) === p1.totalMarks, rows.map((g) => `${g.id} ${g.earned}/${g.max}`).join('; '));
  check('paper report: labelled as a mock paper, second attempt, with time used', /Mock paper: Mock Paper 1/.test(rep.title) && rep.focus === 'mock paper, second attempt' && rep.paperId === p1.id && rep.attemptNo === 2 && rep.timeUsedSec === 2400);
  check('paper report: the summary gives marks', /marks/.test(rep.summary[0]) && /second attempt/.test(rep.summary[0]), rep.summary[0]);
  check('paper report: question numbers as on the paper ("10(a)")', rep.perQuestion.some((x) => x.label === '10(a)'));
  check('paper report: the blanks are pointed out', rep.recommendations.some((x) => /unanswered|blank/i.test(x)) || rep.summary.some((x) => /blank|unanswered/i.test(x)));
  check('paper report: sends her back to the sections where she lost most marks', rep.recommendations.some((x) => /^Section 1[1-4][A-G] \(.*book page \d+\): \d+ marks? lost/.test(x)), rep.recommendations.join(' | '));
  const body = emailBody(rep, 'parent@example.com');
  check('parent email for a paper: marks in every book section, within the link limit', /Marks by book section/.test(body) && rows.every((g) => body.includes(`${g.id} ${g.earned}/${g.max}`)) && reportMailto(rep, 'parent@example.com').length <= MAILTO_LIMIT, body.slice(0, 900));
  check('parent email for a paper: labelled with the attempt and the time allowed', /Mock Paper 1 \(Chapters 11-14\), second attempt: 45 minutes allowed/.test(body) && /Time used: 40 min of 45 min/.test(body), body.slice(0, 300));
  check('email subject names the paper, the attempt and the marks', /^Mock paper report: Mock Paper 1 \(Chapters 11-14\), second attempt, .* \(\d+ of 40 marks\)$/.test(emailSubject(rep)), emailSubject(rep));
  check('paper report: blanks come first in what to practise next', /left blank/.test(rep.recommendations[0]), rep.recommendations[0]);
  const wrong10 = rep.mistakes.find((m) => m.label === '10(a)');
  check('paper report: mistakes carry the paper number (Copy report and the full report say "Q10(a)")', wrong10 && reportPlainText(rep).includes('Q10(a).') && reportBodyHtml(rep).includes('Question 10(a).'));
  const vr2 = visualReport(rep, { attempts: part.attempts, sessions: [part.session], questions: all, compact: true });
  const card10 = [...vr2.querySelectorAll('.vr-working-card')].find((c) => c.textContent.includes('Question 10(a)'));
  check('parent visual report: a part shows its paper number and the shared stem and picture', card10 && card10.querySelector('.group-stem') && card10.querySelector('.group-stem svg'));
  check('copied report text has every section', sectionRows(rep).every((g) => reportPlainText(rep).includes(`${g.id} ${g.earned}/${g.max}`)));
  check('a report and its sessions pass the import checks (paper and section)', checkReport(rep) && checkSession(part.session) && checkSession(full.session));
  check('paper personal bests are kept per paper', scopeKey(part.session) === `paper:${p1.id}` && personalBests([full.session, part.session]).get(`paper:${p1.id}`).pct === 1);

  // review screen of a paper: numbering, the shared stem, the mark scheme, sections with pages
  setContentRoot('../');
  const DBX = 'sp-bookmap-test';
  await Db.deleteDatabase(DBX);
  const db = await Db.open(DBX);
  try {
    const p3 = papers.find((p) => p.questions.some((q) => q.group != null)) || p1;
    const s3 = planPaper({ paper: p3, sessions: [], now: Date.now() });
    s3.state.responses = Object.fromEntries(p3.questions.slice(0, 3).map((q) => [q.id, rightResponse(q)]));
    const ctx = { questions: new Map([...qmap, ...indexQuestions([], [p3])]), topics: byId, topicOrder: ordered };
    const done = await submitSession(db, s3, ctx, { early: true, elapsedSec: 300 });
    const host = document.createElement('div');
    document.body.append(host);
    await resultsView(host, { mode: 'local', db }, done.session.id);
    const nums = [...host.querySelectorAll('.rv-num')].map((x) => x.textContent);
    const grouped = p3.questions.find((q) => q.group != null);
    check('paper review: questions numbered as on the paper', nums.length === p3.questions.length && nums.includes(`Question ${grouped.number}`), nums.slice(0, 12).join(', '));
    check('paper review: the mark scheme is shown for every question', host.querySelectorAll('.rv-scheme').length === p3.questions.length);
    check('paper review: a part shows the shared stem of its question', [...host.querySelectorAll('.review .group-stem')].some((x) => x.textContent.includes(grouped.groupStem.slice(0, 20))));
    check('paper results: marks by book section, with book pages', /Your marks in each book section/.test(host.textContent) && /book page \d+/.test(host.textContent));
    check('paper results: no "part right" (all or nothing)', !host.querySelector('.review-part'));
    host.remove();

    // an unfinished paper whose file cannot be loaded is kept, never deleted
    const lost = planPaper({ paper: { ...p3, id: 'mp9-missing' }, sessions: [], now: Date.now() });
    lost.state.responses = { [p3.questions[0].id]: rightResponse(p3.questions[0]) };
    await db.put('sessions', lost);
    const host2 = document.createElement('div');
    document.body.append(host2);
    const fakeApp = { mode: 'local', db, manifest: { contentVersion: 'test' } };
    await sessionView(host2, fakeApp, lost.id);
    if (fakeApp.cleanup) await fakeApp.cleanup();
    check('an unfinished paper that cannot be opened is kept (Try again), not deleted', !!(await db.get('sessions', lost.id)) && /could not be opened/.test(host2.textContent));
    host2.remove();
    await db.delete('sessions', lost.id);

    // backup and restore keep paper and section sessions
    const exp = await buildExport(db, {});
    const DBY = 'sp-bookmap-test-2';
    await Db.deleteDatabase(DBY);
    const db2 = await Db.open(DBY);
    try {
      const res = await importExport(db2, JSON.stringify(exp));
      const back = await db2.get('sessions', done.session.id);
      check('backup and restore keep a mock paper session, its answers and report', res.added.sessions === 1 && res.added.attempts === p3.questions.length && res.added.reports === 1 && back && back.mode === 'paper' && back.paperId === p3.id, JSON.stringify(res));
    } finally {
      db2.close();
      await Db.deleteDatabase(DBY);
    }
  } finally {
    db.close();
    await Db.deleteDatabase(DBX);
    setContentRoot('');
  }

  // ================================================================ backup reminder
  setGroup('backup reminder (local mode)');
  const now = Date.UTC(2026, 9, 17);
  const ses = (t) => ({ status: 'complete', startedAt: t, endedAt: t + 1000 });
  check('nothing to back up yet: no reminder', !backupDue(null, [], now) && !backupDue(null, [{ status: 'in-progress', startedAt: now }], now));
  check('never backed up, with a finished session: reminder', backupDue(null, [ses(now - DAY)], now));
  check('backed up 3 days ago: no reminder', !backupDue(now - 3 * DAY, [ses(now - DAY)], now));
  check('backed up 8 days ago and practised since: reminder', backupDue(now - 8 * DAY, [ses(now - DAY)], now));
  check('backed up 8 days ago, nothing new since: no reminder', !backupDue(now - 8 * DAY, [ses(now - 9 * DAY)], now));
}
