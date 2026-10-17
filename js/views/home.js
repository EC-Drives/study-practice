// Home page and subject (chapter list) page.

import { h, clear, icon, link, button, dialog, pct } from '../ui.js';
import { SUBJECTS, topicList, loadSubject, subjectTitle, bookOrder, chapterLabel, paperList, indexQuestions } from '../content.js';
import { streak, personalBests, subtopicMastery, topicSummary, currentTopic, totals, sectionTally, scopeKey } from '../stats.js';
import { sessionTitle } from '../report.js';
import { levelBadge, meter } from '../charts.js';
import { formatClock } from '../timer.js';
import { legacyProgress, importLegacy, declineLegacy } from '../data/migrate.js';

export async function loadProgress(app) {
  const [sessions, attempts] = await Promise.all([app.db.getAll('sessions'), app.db.getAll('attempts')]);
  return { sessions, attempts };
}

function greeting() {
  const hr = new Date().getHours();
  if (hr < 12) return 'Good morning!';
  if (hr < 18) return 'Good afternoon!';
  return 'Good evening!';
}

export async function homeView(el, app) {
  const { sessions, attempts } = await loadProgress(app);
  const st = streak(sessions);
  const tot = totals(sessions);
  const inProgress = sessions.filter((s) => s.status === 'in-progress').sort((a, b) => b.startedAt - a.startedAt);
  const page = h('div', { class: 'stack' });

  const chips = h('div', { class: 'chips' });
  if (st.days > 0) chips.append(h('span', { class: 'chip chip-flame' }, icon('flame'), h('span', { text: `${st.days}-day streak` })));
  if (st.practisedToday) chips.append(h('span', { class: 'chip chip-good' }, icon('check'), h('span', { text: 'Practised today' })));
  if (tot.questions) chips.append(h('span', { class: 'chip' }, icon('star'), h('span', { text: `${tot.questions} questions answered` })));

  page.append(h('section', { class: 'hero' },
    h('h1', { text: greeting() }),
    h('p', { class: 'lead', text: st.practisedToday ? 'Nice work today. Ready for a bit more?' : 'What would you like to practise today?' }),
    chips.childNodes.length ? chips : null));

  for (const s of inProgress.slice(0, 1)) {
    const left = Math.max(0, s.limitSec - ((s.state && s.state.elapsedSec) || 0));
    const answered = s.state ? Object.values(s.state.responses || {}).filter((r) => r != null && r !== '').length : 0;
    const card = h('section', { class: 'card card-resume' },
      h('h2', {}, icon('play'), h('span', { text: 'Carry on where you stopped' })),
      h('p', { text: `${sessionTitle(s)}. ${answered} of ${s.questionIds.length} answered, ${formatClock(left)} left.` }),
      h('div', { class: 'row' },
        link('Continue', `#/session/${encodeURIComponent(s.id)}`, { icon: 'play', cls: 'btn-primary' }),
        button('Start fresh instead', {
          icon: 'trash',
          cls: 'btn-ghost',
          onClick: async () => {
            const ok = await dialog('Start fresh?', 'This unfinished practice will be removed. Finished practice is not affected.', [
              { label: 'Keep it', value: false },
              { label: 'Remove it', value: true, cls: 'btn-primary' },
            ]);
            if (ok) {
              await app.db.delete('sessions', s.id);
              homeView(el, app);
            }
          },
        })));
    page.append(card);
  }

  // linked mode, first sign-in on a device that already has her version 1 progress: offer to
  // bring it into her account (once)
  if (app.mode === 'linked' && app.profile && app.profile.role === 'student') {
    const old = await legacyProgress(app.profile.id).catch(() => null);
    if (old && !old.already) {
      const card = h('section', { class: 'card card-resume' },
        h('h2', {}, icon('upload'), h('span', { text: 'Bring your earlier practice with you' })),
        h('p', { text: `This device has ${old.sessions} practice session${old.sessions === 1 ? '' : 's'} from before you had an account. Add ${old.sessions === 1 ? 'it' : 'them'} to your account so Dad can see ${old.sessions === 1 ? 'it' : 'them'} too?` }),
        h('div', { class: 'row wrap' },
          button('Add to my account', { icon: 'upload', cls: 'btn-primary', onClick: async (e) => {
            e.currentTarget.disabled = true;
            try {
              const res = await importLegacy(app);
              await dialog('Added to your account', `${res.added.sessions} session${res.added.sessions === 1 ? '' : 's'} added. ${res.skipped.sessions ? `${res.skipped.sessions} were already there. ` : ''}They go online now, or as soon as there is internet.`, [{ label: 'OK', value: true, cls: 'btn-primary' }]);
            } catch (err) {
              await dialog('Could not add them', err.message || String(err), [{ label: 'OK', value: true, cls: 'btn-primary' }]);
            }
            homeView(el, app);
          } }),
          button('Not now', { cls: 'btn-ghost', onClick: async () => { await declineLegacy(app.profile.id); card.remove(); } })),
        h('p', { class: 'small muted', text: 'Nothing is deleted from this device. This is offered once.' }));
      page.append(card);
    }
  }

  const subjects = h('section', { class: 'grid2', 'aria-label': 'Subjects' });
  const mastery = subtopicMastery(attempts);
  for (const s of SUBJECTS) {
    const list = await topicList(s.id);
    const subAtt = attempts.filter((a) => a.subject === s.id);
    const m = [...new Set(subAtt.map((a) => a.subtopicId))].map((id) => mastery.get(id)).filter(Boolean);
    const score = m.length ? m.reduce((t, x) => t + x.score, 0) / m.length : null;
    subjects.append(h('a', { class: `card subject subject-${s.id}`, href: `#/subject/${s.id}` },
      h('span', { class: 'subject-icon' }, icon(s.id, { size: 40 })),
      h('span', { class: 'subject-body' },
        h('span', { class: 'subject-title', text: s.title }),
        h('span', { class: 'muted', text: list.length ? `${list.length} chapter${list.length === 1 ? '' : 's'}` : 'Coming soon' }),
        score != null ? meter(score, { label: `${s.title}: ${pct(score)} so far` }) : null),
      icon('right', { cls: 'chev' })));
  }
  page.append(h('h2', { class: 'section-title', text: 'Choose a subject' }), subjects);

  const bests = [...personalBests(sessions).entries()].sort((a, b) => b[1].at - a[1].at).slice(0, 3);
  if (bests.length) {
    const titleOf = (k) => {
      const ses = sessions.find((x) => x.status === 'complete' && scopeKey(x) === k);
      return ses ? sessionTitle({ ...ses, attemptNo: 1 }) : k;
    };
    page.append(h('section', { class: 'card' },
      h('h2', {}, icon('trophy'), h('span', { text: 'Your personal bests' })),
      h('ul', { class: 'plain' }, ...bests.map(([k, v]) => h('li', { class: 'pb' }, h('span', { text: titleOf(k) }), h('strong', { text: pct(v.pct) }))))));
  }

  page.append(h('footer', { class: 'home-foot' },
    app.mode === 'linked'
      ? h('p', { class: 'muted small' }, icon('check', { size: 18 }), h('span', { text: ' Every practice you finish is saved online for Dad by itself.' }))
      : h('a', { href: '#/parent', class: 'btn btn-ghost' }, icon('lock'), h('span', { text: 'Parent area' })),
    app.manifest && app.manifest.samples ? h('p', { class: 'muted small', text: 'Showing sample questions for testing.' }) : null));
  clear(el).append(page);
}

export async function subjectView(el, app, subject) {
  const sub = SUBJECTS.find((s) => s.id === subject);
  if (!sub) {
    location.replace('#/');
    return;
  }
  el.dataset.title = sub.title;
  const [topics, { sessions, attempts }] = await Promise.all([loadSubject(subject), loadProgress(app)]);
  const mastery = subtopicMastery(attempts);
  const cur = currentTopic(sessions);
  const page = h('div', { class: 'stack' },
    h('nav', { class: 'crumbs', 'aria-label': 'Breadcrumb' }, h('a', { href: '#/' }, icon('home', { size: 18 }), h('span', { text: 'Home' }))),
    h('h1', {}, icon(subject, { size: 32 }), h('span', { text: sub.title })));
  if (!topics.length) {
    page.append(h('p', { class: 'card', text: 'The chapters for this subject are being written. Check back soon!' }));
    clear(el).append(page);
    return;
  }
  page.append(h('a', { class: 'card mixed-card', href: `#/mixed/${subject}` },
    h('span', { class: 'subject-icon' }, icon('shuffle', { size: 32 })),
    h('span', { class: 'subject-body' },
      h('span', { class: 'subject-title', text: 'Mixed revision' }),
      h('span', { class: 'muted', text: 'Questions from every chapter. Great before exams.' })),
    icon('right', { cls: 'chev' })));
  // mock papers (maths): timed exam practice, before the chapter list so she finds them quickly
  const papers = await paperList(subject);
  if (papers.length) {
    const chs = [...new Set(papers.flatMap((p) => p.bookChapters || []))].sort((a, b) => a - b);
    const done = sessions.filter((x) => x.status === 'complete' && x.mode === 'paper').length;
    page.append(h('a', { class: 'card mixed-card paper-card', href: `#/papers/${subject}` },
      h('span', { class: 'subject-icon' }, icon('paper', { size: 32 })),
      h('span', { class: 'subject-body' },
        h('span', { class: 'subject-title', text: 'Mock papers' }),
        h('span', { class: 'muted', text: `${papers.length} timed exam papers${chs.length ? ` on Chapters ${chs[0]}-${chs[chs.length - 1]}` : ''}.${done ? ` You have sat ${done}.` : ''}` })),
      icon('right', { cls: 'chev' })));
  }
  const book = topics.some((t) => Array.isArray(t.bookSections) && t.bookSections.length);
  page.append(h('h2', { class: 'section-title', text: book ? 'Chapters in your book' : 'Chapters' }));
  if (book) page.append(h('p', { class: 'muted small', text: 'Tap a chapter to read about it and practise all of it, or tap a section to practise just that part of your book.' }));
  const qIndex = indexQuestions(topics);
  const secAnswers = sectionTally(attempts, (a) => a.bookSection || (qIndex.get(a.questionId) || {}).bookSection);
  const list = h('ol', { class: 'topic-list' });
  for (const t of bookOrder(topics)) {
    const sum = topicSummary(t, mastery, attempts);
    const numText = Number.isInteger(t.bookChapterNumber) ? String(t.bookChapterNumber) : book ? '+' : String(t.order);
    const head = h('a', { class: `card topic-card${t.topicId === cur ? ' is-current' : ''}`, href: `#/topic/${encodeURIComponent(t.topicId)}` },
      h('span', { class: 'topic-num', 'aria-hidden': book ? 'true' : null, text: numText }),
      h('span', { class: 'topic-body' },
        book ? h('span', { class: 'muted small chapter-label', text: Number.isInteger(t.bookChapterNumber) ? chapterLabel(t) : 'Extra topic (not a book chapter)' }) : null,
        h('span', { class: 'topic-title', text: t.title }),
        h('span', { class: 'muted small', text: `${book && (t.bookSections || []).length ? `${t.bookSections.length} sections` : `${t.preamble.subtopics.length} parts`} · ${t.questions.length} questions${t.topicId === cur ? ' · you are here' : ''}` }),
        h('span', { class: 'row tight' }, levelBadge(sum.level), sum.score != null ? meter(sum.score, { label: `${t.title}: ${pct(sum.score)}` }) : null)),
      icon('right', { cls: 'chev' }));
    const li = h('li', { class: 'chapter-item' }, head);
    if ((t.bookSections || []).length) {
      li.append(h('ul', { class: 'section-list', 'aria-label': `Sections of ${t.title}` }, ...t.bookSections.map((sec) => {
        const n = t.questions.filter((q) => q.bookSection === sec.id).length;
        const g = secAnswers.get(sec.id);
        return h('li', {}, h('a', { class: 'section-row', href: `#/section/${encodeURIComponent(t.topicId)}/${encodeURIComponent(sec.id)}` },
          h('span', { class: 'section-id', text: sec.id }),
          h('span', { class: 'section-title' }, h('span', { text: sec.title }),
            h('span', { class: 'muted small', text: `${sec.page != null ? `Book page ${sec.page} · ` : ''}${n} question${n === 1 ? '' : 's'}${g ? ` · ${Math.round((g.correct / g.answers) * 100)}% right so far` : ''}` })),
          icon('right', { cls: 'chev', size: 20 })));
      })));
    }
    list.append(li);
  }
  page.append(list);
  clear(el).append(page);
}
