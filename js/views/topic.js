// Chapter page (preamble and practice set-up), book-section practice, mixed revision set-up,
// and the mock papers (list and the page before the timer starts).

import { h, clear, icon, button, toast, dialog } from '../ui.js';
import { SUBJECTS, loadTopic, loadSubject, subjectTitle, chapterLabel, paperList, loadPaper, indexQuestions } from '../content.js';
import { subtopicMastery, levelFor, sectionTally, formatDate } from '../stats.js';
import { formatDuration } from '../timer.js';
import { attemptLabel } from '../report.js';
import { levelBadge, meter } from '../charts.js';
import { estimateCount } from '../sampler.js';
import { planSession, planPaper } from '../practice.js';
import { loadProgress } from './home.js';

export const LENGTHS = [15, 30, 60, 90];

function lengthLabel(m) {
  return m < 60 ? `${m} min` : m === 60 ? '1 hour' : `${m / 60} hours`;
}

/** Big radio chips. Returns { el, get() }. */
function choiceGroup(name, legend, options, initial, onChange) {
  let value = initial;
  const fs = h('fieldset', { class: 'choices' }, h('legend', { text: legend }));
  const row = h('div', { class: 'choice-row' });
  for (const o of options) {
    const id = `${name}-${o.value}`;
    const input = h('input', { type: 'radio', name, id, value: String(o.value), checked: o.value === initial, disabled: o.disabled });
    input.addEventListener('change', () => {
      value = o.value;
      onChange && onChange(value);
    });
    row.append(h('label', { class: `choice${o.disabled ? ' is-disabled' : ''}`, for: id }, input,
      h('span', { class: 'choice-box' }, o.icon ? icon(o.icon) : null, h('span', { class: 'choice-text' }, h('strong', { text: o.label }), o.hint ? h('small', { text: o.hint }) : null))));
  }
  fs.append(row);
  return { el: fs, get: () => value };
}

async function startSession(app, opts) {
  const { attempts } = await loadProgress(app);
  const ses = planSession({ ...opts, attempts, deviceId: app.deviceId, contentVersion: app.manifest.contentVersion });
  await beginSession(app, ses);
}

/** Save a planned session (practice or paper) and open it, replacing an unfinished one after asking. */
async function beginSession(app, ses) {
  if (!ses.questionIds.length) {
    toast('There are no questions for that choice yet.');
    return;
  }
  // only one unfinished session at a time: an older unfinished one is replaced, after asking
  // if it has any answers in it
  const old = (await app.db.getAll('sessions')).filter((s) => s.status === 'in-progress');
  const answered = old.reduce((n, s) => n + Object.values((s.state && s.state.responses) || {}).filter((r) => r != null && r !== '' && !(Array.isArray(r) && !r.length)).length, 0);
  if (answered) {
    const ok = await dialog('Start a new practice?', `You have an unfinished practice with ${answered} answer${answered === 1 ? '' : 's'}. Starting a new one removes it. To keep it, go Home and press Continue.`, [
      { label: 'Keep it', value: false, cls: 'btn-ghost' },
      { label: 'Start new', value: true, cls: 'btn-primary' },
    ]);
    if (!ok) return;
  }
  for (const s of old) await app.db.delete('sessions', s.id);
  await app.db.put('sessions', ses);
  location.hash = `#/session/${encodeURIComponent(ses.id)}`;
}

export async function topicView(el, app, topicId) {
  const topic = await loadTopic(topicId);
  el.dataset.title = topic.title;
  const { attempts } = await loadProgress(app);
  const mastery = subtopicMastery(attempts);
  const pre = topic.preamble;
  const tried = attempts.some((a) => a.topicId === topic.topicId);

  const page = h('div', { class: 'stack' },
    h('nav', { class: 'crumbs', 'aria-label': 'Breadcrumb' },
      h('a', { href: '#/' }, icon('home', { size: 18 }), h('span', { text: 'Home' })),
      h('span', { 'aria-hidden': 'true', text: '›' }),
      h('a', { href: `#/subject/${topic.subject}`, text: subjectTitle(topic.subject) })),
    h('header', { class: 'topic-head' },
      h('span', { class: 'topic-num big', 'aria-hidden': (topic.bookSections || []).length ? 'true' : null, text: Number.isInteger(topic.bookChapterNumber) ? String(topic.bookChapterNumber) : (topic.bookSections || []).length ? '+' : String(topic.order) }),
      h('div', {}, h('h1', { text: topic.title }), h('p', { class: 'muted', text: topic.bookChapter }))));

  page.append(h('section', { class: 'card preamble' },
    h('div', { class: 'pre-block' }, h('h2', {}, icon('bulb'), h('span', { text: 'What you will learn' })), h('p', { text: pre.whatYouWillLearn })),
    h('div', { class: 'pre-block' }, h('h2', {}, icon('heart'), h('span', { text: 'Why it matters' })), h('p', { text: pre.whyItMatters })),
    h('div', { class: 'pre-block' }, h('h2', {}, icon('globe'), h('span', { text: 'Where you see it in real life' })),
      h('ul', { class: 'realworld' }, ...pre.realWorld.map((x) => h('li', {}, icon('check', { size: 18 }), h('span', { text: x })))))));

  // the chapter's sections, as in her book: each one can be practised on its own
  if ((topic.bookSections || []).length) {
    const qIndex = indexQuestions([topic]);
    const secAnswers = sectionTally(attempts, (a) => a.bookSection || (qIndex.get(a.questionId) || {}).bookSection);
    page.append(h('section', { class: 'card' },
      h('h2', {}, icon('book'), h('span', { text: Number.isInteger(topic.bookChapterNumber) ? `Sections in your book` : 'Sections of this topic' })),
      h('p', { class: 'muted small', text: 'Tap a section to practise just that part.' }),
      h('ul', { class: 'section-list in-card' }, ...topic.bookSections.map((sec) => {
        const n = topic.questions.filter((q) => q.bookSection === sec.id).length;
        const g = secAnswers.get(sec.id);
        return h('li', {}, h('a', { class: 'section-row', href: `#/section/${encodeURIComponent(topic.topicId)}/${encodeURIComponent(sec.id)}` },
          h('span', { class: 'section-id', text: sec.id }),
          h('span', { class: 'section-title' }, h('span', { text: sec.title }),
            h('span', { class: 'muted small', text: `${sec.page != null ? `Book page ${sec.page} · ` : ''}${n} question${n === 1 ? '' : 's'}${g ? ` · ${Math.round((g.correct / g.answers) * 100)}% right so far` : ''}` })),
          icon('right', { cls: 'chev', size: 20 })));
      }))));
  }

  page.append(h('section', { class: 'card' },
    h('h2', {}, icon('book'), h('span', { text: `The ${pre.subtopics.length} parts of this chapter` })),
    h('ol', { class: 'subtopics' }, ...pre.subtopics.map((s) => {
      const m = mastery.get(s.id);
      const n = topic.questions.filter((q) => q.subtopicId === s.id).length;
      return h('li', {},
        h('div', { class: 'sub-head' }, h('strong', { text: s.title }), levelBadge(m ? m.level : levelFor(0, 0))),
        h('p', { text: s.summary }),
        m ? meter(m.score, { label: `${s.title}: ${Math.round(m.score * 100)} percent` }) : h('p', { class: 'muted small', text: `${n} questions to try` }));
    }))));

  // set-up
  const est = h('p', { class: 'estimate', 'aria-live': 'polite' });
  let subPick = pre.subtopics[0].id;
  const subSelect = h('select', { class: 'select', 'aria-label': 'Which part?' }, ...pre.subtopics.map((s) => h('option', { value: s.id, text: s.title })));
  subSelect.addEventListener('change', () => { subPick = subSelect.value; update(); });
  const len = choiceGroup('len', 'How long do you want to practise?', LENGTHS.map((m) => ({ value: m, label: lengthLabel(m), icon: 'clock' })), 30, () => update());
  const focus = choiceGroup('focus', 'What do you want to practise?', [
    { value: 'topic', label: 'The whole chapter', hint: 'A mix of every part', icon: 'book' },
    { value: 'subtopic', label: 'One part', hint: 'Pick the part below', icon: 'target' },
    { value: 'weak', label: 'My weak spots', hint: tried ? 'More of what you find tricky' : 'Practise this chapter once first', icon: 'up', disabled: !tried },
  ], 'topic', () => update());
  const subWrap = h('div', { class: 'sub-pick' }, h('label', { class: 'small', text: 'Which part?' }), subSelect);

  function pool() {
    const f = focus.get();
    if (f === 'subtopic') return topic.questions.filter((q) => q.subtopicId === subPick);
    return topic.questions;
  }
  function update() {
    subWrap.hidden = focus.get() !== 'subtopic';
    const p = pool();
    const n = estimateCount(p, len.get());
    est.textContent = n >= p.length ? `About ${n} questions (all of them for this choice).` : `About ${n} questions.`;
  }
  update();

  const go = button('Start practice', {
    icon: 'play',
    cls: 'btn-primary btn-big',
    onClick: async () => {
      go.disabled = true;
      try {
        await startSession(app, { subject: topic.subject, topic, topics: [topic], mode: focus.get(), subtopicId: focus.get() === 'subtopic' ? subPick : null, durationMin: len.get() });
      } finally {
        go.disabled = false;
      }
    },
  });
  page.append(h('section', { class: 'card setup', 'aria-label': 'Set up your practice' },
    h('h2', {}, icon('play'), h('span', { text: 'Ready to practise?' })), len.el, focus.el, subWrap, est, go));
  clear(el).append(page);
}

export async function mixedView(el, app, subject) {
  const sub = SUBJECTS.find((s) => s.id === subject);
  if (!sub) {
    location.replace('#/');
    return;
  }
  const topics = await loadSubject(subject);
  const all = topics.flatMap((t) => t.questions);
  const est = h('p', { class: 'estimate', 'aria-live': 'polite' });
  const len = choiceGroup('len', 'How long do you want to practise?', LENGTHS.map((m) => ({ value: m, label: lengthLabel(m), icon: 'clock' })), 60, () => update());
  function update() {
    const n = estimateCount(all, len.get());
    est.textContent = `About ${n} questions from ${topics.length} chapter${topics.length === 1 ? '' : 's'}.`;
  }
  update();
  const go = button('Start mixed revision', {
    icon: 'play',
    cls: 'btn-primary btn-big',
    disabled: !all.length,
    onClick: async () => {
      go.disabled = true;
      try {
        await startSession(app, { subject, topic: null, topics, mode: 'mixed', durationMin: len.get() });
      } finally {
        go.disabled = false;
      }
    },
  });
  clear(el).append(h('div', { class: 'stack' },
    h('nav', { class: 'crumbs', 'aria-label': 'Breadcrumb' },
      h('a', { href: '#/' }, icon('home', { size: 18 }), h('span', { text: 'Home' })),
      h('span', { 'aria-hidden': 'true', text: '›' }),
      h('a', { href: `#/subject/${subject}`, text: sub.title })),
    h('h1', {}, icon('shuffle', { size: 32 }), h('span', { text: `Mixed revision: ${sub.title}` })),
    h('section', { class: 'card' },
      h('p', { text: 'Questions from every chapter, with a few more from the parts you find tricky. It is like a practice exam, so it is a great way to get ready for November.' })),
    h('section', { class: 'card setup' }, len.el, est, go)));
}

// ---------------------------------------------------------------- one book section

export async function sectionView(el, app, topicId, sectionId) {
  const topic = await loadTopic(topicId);
  const sec = (topic.bookSections || []).find((x) => x.id === sectionId);
  if (!sec) {
    location.replace(`#/topic/${encodeURIComponent(topicId)}`);
    return;
  }
  el.dataset.title = `${sec.id} ${sec.title}`;
  const { attempts } = await loadProgress(app);
  const qIndex = indexQuestions([topic]);
  const g = sectionTally(attempts, (a) => a.bookSection || (qIndex.get(a.questionId) || {}).bookSection).get(sec.id);
  const bank = topic.questions.filter((q) => q.bookSection === sec.id);
  const est = h('p', { class: 'estimate', 'aria-live': 'polite' });
  const len = choiceGroup('len', 'How long do you want to practise?', LENGTHS.map((m) => ({ value: m, label: lengthLabel(m), icon: 'clock' })), 15, () => update());
  function update() {
    const n = estimateCount(bank, len.get());
    est.textContent = n >= bank.length ? `About ${n} questions from your book's section ${sec.id}, plus some freshly made ones where there are not enough.` : `About ${n} questions.`;
  }
  update();
  const go = button('Start practice', {
    icon: 'play',
    cls: 'btn-primary btn-big',
    onClick: async () => {
      go.disabled = true;
      try {
        await startSession(app, { subject: topic.subject, topic, topics: [topic], mode: 'section', bookSection: sec.id, durationMin: len.get() });
      } finally {
        go.disabled = false;
      }
    },
  });
  const subs = [...new Set(bank.map((q) => q.subtopicId))].map((id) => topic.preamble.subtopics.find((x) => x.id === id)).filter(Boolean);
  clear(el).append(h('div', { class: 'stack' },
    h('nav', { class: 'crumbs', 'aria-label': 'Breadcrumb' },
      h('a', { href: '#/' }, icon('home', { size: 18 }), h('span', { text: 'Home' })),
      h('span', { 'aria-hidden': 'true', text: '›' }),
      h('a', { href: `#/subject/${topic.subject}`, text: subjectTitle(topic.subject) }),
      h('span', { 'aria-hidden': 'true', text: '›' }),
      h('a', { href: `#/topic/${encodeURIComponent(topic.topicId)}`, text: topic.title })),
    h('header', { class: 'topic-head' },
      h('span', { class: 'topic-num big section-badge', text: sec.id }),
      h('div', {}, h('h1', { text: sec.title }),
        h('p', { class: 'muted', text: `${Number.isInteger(topic.bookChapterNumber) ? `${chapterLabel(topic)}: ${topic.title}` : topic.title}${sec.page != null ? ` · book page ${sec.page}` : ''}` }))),
    h('section', { class: 'card' },
      h('p', { text: sec.page != null ? `This is section ${sec.id} of your maths book. Open your book at page ${sec.page} if you want to look at the examples first.` : `This is part ${sec.id} of ${topic.title}.` }),
      subs.length ? h('p', { class: 'small muted', text: `It covers: ${subs.map((x) => x.title).join('; ')}.` }) : null,
      g ? h('p', { class: 'small', text: `So far: ${g.correct} of ${g.answers} answers right in this section.` }) : h('p', { class: 'small muted', text: `${bank.length} questions to try.` })),
    h('section', { class: 'card setup', 'aria-label': 'Set up your practice' },
      h('h2', {}, icon('play'), h('span', { text: 'Ready to practise?' })), len.el, est, go)));
}

// ---------------------------------------------------------------- mock papers

const LEVEL_TEXT = { standard: 'Standard paper', quick: 'Quick check', stretch: 'Stretch paper' };

function paperAttempts(sessions, paperId) {
  return sessions.filter((s) => s.status === 'complete' && s.mode === 'paper' && s.paperId === paperId).sort((a, b) => a.startedAt - b.startedAt);
}

export async function papersView(el, app, subject = 'maths') {
  const sub = SUBJECTS.find((s) => s.id === subject);
  if (!sub) {
    location.replace('#/');
    return;
  }
  const [papers, { sessions }] = await Promise.all([paperList(subject), loadProgress(app)]);
  const list = h('ol', { class: 'topic-list' });
  for (const p of papers) {
    const tries = paperAttempts(sessions, p.id);
    const best = tries.reduce((b, s) => (s.score && (!b || s.score.earned > b.score.earned) ? s : b), null);
    list.append(h('li', {}, h('a', { class: 'card topic-card', href: `#/paper/${encodeURIComponent(p.id)}` },
      h('span', { class: 'topic-num', 'aria-hidden': 'true' }, icon('paper', { size: 26 })),
      h('span', { class: 'topic-body' },
        h('span', { class: 'topic-title', text: p.title }),
        h('span', { class: 'muted small', text: `${LEVEL_TEXT[p.level] || 'Paper'} · ${p.minutes} minutes · ${p.totalMarks} marks · ${p.questions || p.items} questions${p.questions && p.questions !== p.items ? ` (${p.items} parts)` : ''}` }),
        h('span', { class: 'small', text: tries.length ? `Sat ${tries.length} time${tries.length === 1 ? '' : 's'}. Best: ${best.score.earned} of ${best.score.max} marks.` : 'Not sat yet.' })),
      icon('right', { cls: 'chev' }))));
  }
  clear(el).append(h('div', { class: 'stack' },
    h('nav', { class: 'crumbs', 'aria-label': 'Breadcrumb' },
      h('a', { href: '#/' }, icon('home', { size: 18 }), h('span', { text: 'Home' })),
      h('span', { 'aria-hidden': 'true', text: '›' }),
      h('a', { href: `#/subject/${subject}`, text: sub.title })),
    h('h1', {}, icon('paper', { size: 32 }), h('span', { text: 'Mock papers' })),
    h('section', { class: 'card' },
      h('p', { text: 'These are practice exam papers, like the real one. Each paper has one timer. You can move between the questions, flag any you want to come back to, and check that none is left blank before you hand it in.' }),
      h('p', { class: 'small muted', text: 'A paper always has the same questions, so sitting it again shows how much you have improved.' })),
    papers.length ? list : h('p', { class: 'card', text: 'No mock papers yet.' })));
}

export async function paperView(el, app, paperId) {
  const [paper, { sessions }] = await Promise.all([loadPaper(paperId), loadProgress(app)]);
  el.dataset.title = paper.title;
  const tries = paperAttempts(sessions, paper.id);
  const go = button(tries.length ? 'Start the paper again' : 'Start the paper', {
    icon: 'play',
    cls: 'btn-primary btn-big',
    onClick: async () => {
      go.disabled = true;
      try {
        const all = (await loadProgress(app)).sessions;
        await beginSession(app, planPaper({ paper, sessions: all, deviceId: app.deviceId, contentVersion: app.manifest.contentVersion }));
      } finally {
        go.disabled = false;
      }
    },
  });
  const items = new Set(paper.questions.map((q) => String(q.number || q.id).replace(/\(.*$/, ''))).size;
  const parts = paper.questions.length;
  clear(el).append(h('div', { class: 'stack' },
    h('nav', { class: 'crumbs', 'aria-label': 'Breadcrumb' },
      h('a', { href: '#/' }, icon('home', { size: 18 }), h('span', { text: 'Home' })),
      h('span', { 'aria-hidden': 'true', text: '›' }),
      h('a', { href: `#/papers/${paper.subject}`, text: 'Mock papers' })),
    h('header', { class: 'paper-head' },
      h('h1', { text: paper.title }),
      paper.subtitle ? h('p', { class: 'muted', text: paper.subtitle }) : null),
    h('section', { class: 'tiles' },
      h('div', { class: 'tile' }, icon('clock'), h('b', { text: `${paper.minutes} min` }), h('span', { text: 'one timer' })),
      h('div', { class: 'tile' }, icon('star'), h('b', { text: String(paper.totalMarks) }), h('span', { text: 'marks' })),
      h('div', { class: 'tile' }, icon('grid'), h('b', { text: String(items) }), h('span', { text: parts !== items ? `questions (${parts} parts)` : 'questions' })),
      h('div', { class: 'tile' }, icon('cross'), h('b', { text: paper.calculator ? 'Yes' : 'No' }), h('span', { text: 'calculator' }))),
    h('section', { class: 'card paper-instructions' },
      h('h2', {}, icon('info'), h('span', { text: 'Instructions' })),
      h('ul', {}, ...paper.instructions.map((t) => h('li', { text: t }))),
      h('p', { class: 'small muted', text: 'On screen, a correct answer earns all the marks for that question. Use the working area under each question for your working, as you would on paper. The timer pauses if you leave the app, so try to sit the whole paper in one go, like a real exam.' })),
    tries.length ? h('section', { class: 'card' },
      h('h2', {}, icon('chart'), h('span', { text: 'Your attempts' })),
      h('ul', { class: 'plain' }, ...tries.map((s, i) => h('li', { class: 'pb' },
        h('a', { href: `#/results/${encodeURIComponent(s.id)}`, text: `${attemptLabel(s.attemptNo || i + 1).replace(/^./, (c) => c.toUpperCase())}, ${formatDate(s.startedAt)}` }),
        h('strong', { text: `${s.score.earned} of ${s.score.max} (${formatDuration(s.timeUsedSec)})` }))))) : null,
    h('section', { class: 'card setup' },
      h('h2', {}, icon('play'), h('span', { text: 'Ready?' })),
      h('p', { text: `The timer starts when you press Start and runs for ${paper.minutes} minutes.` }),
      go)));
}
