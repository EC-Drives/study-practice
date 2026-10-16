// Chapter page (preamble and practice set-up) and mixed revision set-up.

import { h, clear, icon, button, toast } from '../ui.js';
import { SUBJECTS, loadTopic, loadSubject, subjectTitle } from '../content.js';
import { subtopicMastery, levelFor } from '../stats.js';
import { levelBadge, meter } from '../charts.js';
import { estimateCount } from '../sampler.js';
import { planSession } from '../practice.js';
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
  if (!ses.questionIds.length) {
    toast('There are no questions for that choice yet.');
    return;
  }
  // only one unfinished session at a time: an older unfinished one is replaced
  const old = (await app.db.getAll('sessions')).filter((s) => s.status === 'in-progress');
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
      h('span', { class: 'topic-num big', text: String(topic.order) }),
      h('div', {}, h('h1', { text: topic.title }), h('p', { class: 'muted', text: topic.bookChapter }))));

  page.append(h('section', { class: 'card preamble' },
    h('div', { class: 'pre-block' }, h('h2', {}, icon('bulb'), h('span', { text: 'What you will learn' })), h('p', { text: pre.whatYouWillLearn })),
    h('div', { class: 'pre-block' }, h('h2', {}, icon('heart'), h('span', { text: 'Why it matters' })), h('p', { text: pre.whyItMatters })),
    h('div', { class: 'pre-block' }, h('h2', {}, icon('globe'), h('span', { text: 'Where you see it in real life' })),
      h('ul', { class: 'realworld' }, ...pre.realWorld.map((x) => h('li', {}, icon('check', { size: 18 }), h('span', { text: x })))))));

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
