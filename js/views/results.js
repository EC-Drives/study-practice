// Results: score summary with pictograms, celebration, a review of every question, and "what
// went wrong" grouped by skill. Also the buttons that send or share the parent report.

import { h, clear, icon, button, link, dialog, toast, shareOrDownload, pct } from '../ui.js';
import { loadSubject, indexQuestions, subjectTitle } from '../content.js';
import { responseText, correctAnswerText } from '../marking.js';
import { scoreRing, pictograms, attemptKind, meter } from '../charts.js';
import { formatDuration } from '../timer.js';
import { reportMailto, reportHtmlDocument, reportFileName, emailSubject, pinResetNotice } from '../report.js';
import { streak } from '../stats.js';
import { aiAvailable } from '../ai.js';

function cheer(p) {
  if (p >= 0.9) return ['Brilliant work!', 'You really know this chapter.'];
  if (p >= 0.75) return ['Great job!', 'You got most of these right.'];
  if (p >= 0.5) return ['Good effort!', 'You are getting there. The review below shows what to look at next.'];
  return ['Well done for practising!', 'Every try helps you learn. Let\'s look at the answers together.'];
}

/** Open the email app with the report, addressed to the parent email saved on this device. */
export async function sendReport(app, report) {
  const to = await app.db.getSetting('parentEmail', '');
  if (!to) {
    const ok = await dialog('No email address saved yet',
      'The parent email has not been set up on this device. You can still open an email and type the address yourself.',
      [{ label: 'Cancel', value: false, cls: 'btn-ghost' }, { label: 'Open email', value: true, cls: 'btn-primary', icon: 'mail' }]);
    if (!ok) return;
  }
  const resetAt = await app.db.getSetting('pinResetAt', null);
  const a = h('a', { href: reportMailto(report, to, pinResetNotice(resetAt)), style: { display: 'none' } });
  document.body.append(a);
  a.click();
  a.remove();
  toast('Your email app should open now. Press Send there to send it.');
}

export async function shareReport(report) {
  const res = await shareOrDownload(reportFileName(report, 'html'), reportHtmlDocument(report), 'text/html', emailSubject(report));
  if (res === 'downloaded') toast('The report was saved as a file.');
}

export async function resultsView(el, app, sessionId) {
  const session = await app.db.get('sessions', sessionId);
  if (!session || session.status !== 'complete') {
    location.replace(session ? `#/session/${encodeURIComponent(sessionId)}` : '#/');
    return;
  }
  const [attempts, report, topics, sessions] = await Promise.all([
    app.db.getAllByIndex('attempts', 'sessionId', sessionId),
    app.db.get('reports', sessionId),
    loadSubject(session.subject),
    app.db.getAll('sessions'),
  ]);
  attempts.sort((a, b) => a.position - b.position);
  const qmap = indexQuestions(topics);
  const subTitle = new Map();
  for (const t of topics) for (const s of t.preamble.subtopics) subTitle.set(s.id, s.title);
  const sc = session.score;
  const [big, small] = cheer(sc.pct);
  const title = session.mode === 'mixed' ? `Mixed revision: ${subjectTitle(session.subject)}` : session.topicTitle;

  const page = h('div', { class: 'stack results' });
  page.append(h('nav', { class: 'crumbs', 'aria-label': 'Breadcrumb' },
    h('a', { href: '#/' }, icon('home', { size: 18 }), h('span', { text: 'Home' })),
    h('span', { 'aria-hidden': 'true', text: '›' }),
    session.topicId ? h('a', { href: `#/topic/${encodeURIComponent(session.topicId)}`, text: session.topicTitle }) : h('a', { href: `#/subject/${session.subject}`, text: subjectTitle(session.subject) })));

  if (session.timedOut) page.append(h('p', { class: 'banner', role: 'status' }, icon('clock'), h('span', { text: "Time's up! Here is how you did." })));

  // ---- summary
  const cmp = report ? report.comparison : null;
  const badges = h('div', { class: 'badges' });
  if (cmp && cmp.personalBest === true) badges.append(h('div', { class: 'badge badge-gold' }, icon('trophy', { size: 32 }), h('strong', { text: 'New personal best!' }), h('small', { text: `Beat your best of ${pct(cmp.previousBest)}` })));
  if (cmp && cmp.personalBest === 'first') badges.append(h('div', { class: 'badge' }, icon('star', { size: 32 }), h('strong', { text: 'First score set' }), h('small', { text: 'Beat it next time!' })));
  if (cmp && cmp.improvement != null && cmp.improvement > 0.005) badges.append(h('div', { class: 'badge badge-up' }, icon('up', { size: 32 }), h('strong', { text: `Up ${Math.round(cmp.improvement * 100)} points` }), h('small', { text: 'on your last try' })));
  const stk = streak(sessions);
  if (stk.days >= 2) badges.append(h('div', { class: 'badge badge-flame' }, icon('flame', { size: 32 }), h('strong', { text: `${stk.days}-day streak` }), h('small', { text: 'Keep it going!' })));

  const reviewList = h('ol', { class: 'review-list' });
  const jump = (i) => {
    const item = reviewList.children[i];
    if (item) {
      const still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      item.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'start' });
      item.querySelector('h3').focus({ preventScroll: true });
    }
  };

  page.append(h('section', { class: 'card summary' },
    h('div', { class: 'summary-top' },
      scoreRing(sc.pct, { size: 170, sub: `${sc.earned} of ${sc.max} marks`, label: `Score ${Math.round(sc.pct * 100)} percent, ${sc.earned} of ${sc.max} marks` }),
      h('div', { class: 'summary-text' },
        h('h1', { text: big }),
        h('p', { class: 'lead', text: small }),
        h('p', { class: 'muted', text: title }))),
    h('div', { class: 'tiles' },
      h('div', { class: 'tile' }, icon('star'), h('b', { text: `${sc.correct} / ${sc.total}` }), h('span', { text: 'right' })),
      h('div', { class: 'tile' }, icon('clock'), h('b', { text: formatDuration(session.timeUsedSec) }), h('span', { text: `of ${formatDuration(session.limitSec)}` })),
      h('div', { class: 'tile' }, icon('check'), h('b', { text: String(sc.answered) }), h('span', { text: 'answered' })),
      h('div', { class: 'tile' }, icon('flag'), h('b', { text: String(attempts.filter((a) => a.flagged).length) }), h('span', { text: 'flagged' }))),
    badges.childNodes.length ? badges : null,
    h('h2', { class: 'small-title', text: 'Question by question (tap one to see it)' }),
    pictograms(attempts, jump)));

  // ---- by part
  if (report && report.bySubtopic.length) {
    page.append(h('section', { class: 'card' },
      h('h2', {}, icon('chart'), h('span', { text: 'How you did in each part' })),
      h('ul', { class: 'part-list' }, ...report.bySubtopic.map((g) => h('li', {},
        h('span', { class: 'part-name', text: g.title }),
        h('span', { class: 'part-score', text: `${g.correct} of ${g.total} right` }),
        meter(g.pct, { label: `${g.title}: ${Math.round(g.pct * 100)} percent of marks` }))))));
  }

  // ---- actions
  const actions = h('section', { class: 'card actions' },
    h('h2', {}, icon('mail'), h('span', { text: 'Tell Dad how it went' })),
    h('p', { class: 'muted small', text: 'This opens your email app with the report ready. You press Send.' }),
    h('div', { class: 'row wrap' },
      button('Send report to Dad', { icon: 'mail', cls: 'btn-primary', onClick: () => report && sendReport(app, report) }),
      button('Save or share the report', { icon: 'share', cls: 'btn-ghost', onClick: () => report && shareReport(report) })),
    h('div', { class: 'row wrap' },
      session.topicId ? link('Practise again', `#/topic/${encodeURIComponent(session.topicId)}`, { icon: 'again' }) : link('Practise again', `#/mixed/${session.subject}`, { icon: 'again' }),
      link('Home', '#/', { icon: 'home', cls: 'btn-ghost' })));
  page.append(actions);

  // ---- review
  let onlyMistakes = false;
  const filterBtn = button('Show only the ones to look at again', { icon: 'eye', cls: 'btn-ghost btn-small', pressed: false, onClick: () => {
    onlyMistakes = !onlyMistakes;
    filterBtn.setAttribute('aria-pressed', String(onlyMistakes));
    for (const li of reviewList.children) li.hidden = onlyMistakes && li.dataset.kind === 'right';
  } });
  attempts.forEach((a, i) => {
    const q = qmap.get(a.questionId);
    const kind = attemptKind(a);
    const status = { right: ['check', 'Right!'], part: ['star', `Part right: ${a.earned} of ${a.marks} marks`], wrong: ['bulb', 'Not yet: here is how it works'], skip: ['dash', 'Not answered'] }[kind];
    const item = h('li', { class: `review review-${kind}`, 'data-kind': kind },
      h('h3', { tabindex: '-1' }, h('span', { class: 'rv-num', text: `Question ${i + 1}` }), h('span', { class: `rv-status rv-${kind}` }, icon(status[0], { size: 20 }), h('span', { text: status[1] }))),
      h('p', { class: 'rv-prompt', text: q ? q.prompt : '(This question is no longer in the bank.)' }));
    if (q) {
      item.append(h('dl', { class: 'rv-answers' },
        h('dt', { text: 'Your answer' }), h('dd', { text: responseText(q, a.response) }),
        kind !== 'right' ? h('dt', { text: 'Correct answer' }) : null, kind !== 'right' ? h('dd', { class: 'rv-correct', text: correctAnswerText(q) }) : null));
      for (const m of a.misconceptions || []) {
        item.append(h('div', { class: 'rv-why' }, icon('bulb'), h('div', {}, h('strong', { text: q.type === 'mcq' || q.type === 'multi' ? 'Why you might have picked this' : 'A common slip' }), h('p', { text: m.note }))));
      }
      item.append(h('details', { class: 'rv-solution', open: kind !== 'right' ? true : null }, h('summary', { text: 'How to solve it' }), h('p', { text: q.solution })));
      item.append(h('p', { class: 'small muted', text: `${subTitle.get(q.subtopicId) || ''} · ${q.skill}` }));
      if (aiAvailable() && kind !== 'right') item.append(h('p', { class: 'small muted', text: 'More help is available from the AI helper.' }));
    }
    reviewList.append(item);
  });
  page.append(h('section', { class: 'card', id: 'review' },
    h('div', { class: 'row space' }, h('h2', {}, icon('eye'), h('span', { text: 'Review every question' })), filterBtn),
    reviewList));

  // ---- what went wrong, by skill
  const bySkill = new Map();
  attempts.forEach((a, i) => {
    if (a.correct) return;
    const k = a.skill || 'General';
    const g = bySkill.get(k) || { skill: k, items: [], notes: new Set() };
    g.items.push(i);
    for (const m of a.misconceptions || []) g.notes.add(m.note);
    bySkill.set(k, g);
  });
  if (bySkill.size) {
    const groups = [...bySkill.values()].sort((a, b) => b.items.length - a.items.length);
    page.append(h('section', { class: 'card' },
      h('h2', {}, icon('target'), h('span', { text: 'What to work on, by skill' })),
      h('ul', { class: 'skill-groups' }, ...groups.map((g) => h('li', {},
        h('h3', { text: g.skill }),
        h('p', { class: 'small' }, `${g.items.length} question${g.items.length === 1 ? '' : 's'} to look at again: `,
          ...g.items.map((i, k) => [k ? ', ' : '', h('a', { href: '#review', onClick: (e) => { e.preventDefault(); jump(i); }, text: `Q${i + 1}` })])),
        g.notes.size ? h('ul', { class: 'notes' }, ...[...g.notes].slice(0, 3).map((n) => h('li', { text: n }))) : null)))));
  } else {
    page.append(h('section', { class: 'card' }, h('h2', {}, icon('trophy'), h('span', { text: 'Nothing went wrong!' })), h('p', { text: 'Every answer was right. Try a longer session or the next chapter.' })));
  }
  clear(el).append(page);
}
