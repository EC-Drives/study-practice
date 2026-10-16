// The practice screen: countdown, one question at a time, question map, flag for review,
// finish early. Answers are saved on the device as she goes, so closing the page loses nothing.

import { h, clear, icon, button, dialog, announce, toast, rovingRadios, closeDialogs } from '../ui.js';
import { loadSubject, indexQuestions, indexTopics, subjectTitle } from '../content.js';
import { isAnswered, startingOrder } from '../marking.js';
import { Countdown, QuestionClock, formatClock } from '../timer.js';
import { submitSession } from '../practice.js';

const LETTERS = 'ABCDEFGH';
const TYPE_HINT = {
  mcq: 'Choose one answer.',
  multi: 'Choose all the answers that are correct.',
  short: 'Type a short answer.',
  numeric: 'Type a number. Fractions like 3/4 are fine.',
  truefalse: 'Is it true or false?',
  order: 'Put these in the right order with the arrow buttons.',
  match: 'Match each item on the left with one on the right.',
};

export async function sessionView(el, app, sessionId) {
  const session = await app.db.get('sessions', sessionId);
  if (!session) {
    location.replace('#/');
    return;
  }
  if (session.status === 'complete') {
    location.replace(`#/results/${encodeURIComponent(sessionId)}`);
    return;
  }
  const topics = await loadSubject(session.subject);
  const qmap = indexQuestions(topics);
  const questions = session.questionIds.map((id) => qmap.get(id)).filter(Boolean);
  if (questions.length !== session.questionIds.length) {
    // a question bank changed under an unfinished session: keep the questions that still exist
    session.questionIds = questions.map((q) => q.id);
  }
  if (!questions.length) {
    await app.db.delete('sessions', session.id);
    toast('That practice could not be continued because its questions have changed. Please start a new one.');
    location.replace('#/');
    return;
  }
  const st = session.state || (session.state = { responses: {}, flagged: [], current: 0, elapsedSec: 0, times: {}, visited: [] });
  st.flagged = st.flagged || [];
  const flagged = new Set(st.flagged);
  let index = Math.min(st.current || 0, questions.length - 1);
  let finishing = false;

  const countdown = new Countdown(session.limitSec, { elapsedSec: st.elapsedSec || 0 });
  const qclock = new QuestionClock({ times: st.times || {} });

  // ------------------------------------------------------------ saving
  let saveTimer = null;
  async function saveNow() {
    clearTimeout(saveTimer);
    saveTimer = null;
    if (finishing) return;
    st.elapsedSec = countdown.elapsed();
    st.times = qclock.snapshot();
    st.current = index;
    st.flagged = [...flagged];
    try {
      await app.db.put('sessions', session);
    } catch (e) {
      console.warn('Could not save progress', e);
    }
  }
  function saveSoon() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveNow, 400);
  }

  function setResponse(qid, value) {
    st.responses[qid] = value;
    saveSoon();
    updateNav();
  }

  // ------------------------------------------------------------ layout
  const timerEl = h('span', { class: 'timer', role: 'timer', 'aria-label': 'Time left' }, icon('clock'), h('span', { class: 'timer-num' }));
  const progressEl = h('span', { class: 'qprogress', 'aria-live': 'polite' });
  const navToggle = button('Questions', { icon: 'grid', cls: 'btn-ghost btn-small qnav-toggle', onClick: () => toggleNav() });
  navToggle.setAttribute('aria-expanded', 'false');
  navToggle.setAttribute('aria-controls', 'qnav');
  const finishBtn = button('Finish', { icon: 'check', cls: 'btn-small btn-finish', onClick: () => confirmFinish() });
  const bar = h('div', { class: 'session-bar' }, timerEl, progressEl, h('span', { class: 'spacer' }), navToggle, finishBtn);
  const nav = h('nav', { id: 'qnav', class: 'qnav', 'aria-label': 'All questions', hidden: true });
  const qwrap = h('div', { class: 'qwrap' });
  const prevBtn = button('Back', { icon: 'left', cls: 'btn-ghost', onClick: () => go(index - 1) });
  const flagBtn = button('Flag', { icon: 'flag', cls: 'btn-ghost btn-flag', onClick: () => toggleFlag() });
  const nextBtn = button('Next', { icon: 'right', cls: 'btn-primary', onClick: () => (index === questions.length - 1 ? confirmFinish() : go(index + 1)) });
  const foot = h('div', { class: 'session-foot' }, prevBtn, flagBtn, nextBtn);
  const title = session.mode === 'mixed' ? `Mixed revision: ${subjectTitle(session.subject)}` : session.topicTitle;
  clear(el).append(h('div', { class: 'session' }, bar, nav, h('p', { class: 'session-title muted small', text: title }), qwrap, foot));

  function toggleNav(force) {
    const open = force ?? nav.hidden;
    nav.hidden = !open;
    navToggle.setAttribute('aria-expanded', String(open));
    if (open) updateNav();
  }

  function updateNav() {
    clear(nav);
    const grid = h('ol', { class: 'qnav-grid' });
    questions.forEach((q, i) => {
      const ans = isAnswered(q, st.responses[q.id]);
      const fl = flagged.has(q.id);
      const label = `Question ${i + 1}${ans ? ', answered' : ', not answered'}${fl ? ', flagged' : ''}${i === index ? ', showing now' : ''}`;
      grid.append(h('li', {}, h('button', {
        type: 'button',
        class: `qnav-btn${ans ? ' is-answered' : ''}${fl ? ' is-flagged' : ''}${i === index ? ' is-current' : ''}`,
        'aria-label': label,
        'aria-current': i === index ? 'step' : null,
        onClick: () => { go(i); toggleNav(false); },
      }, h('span', { text: String(i + 1) }), fl ? icon('flag', { size: 14 }) : null)));
    });
    const answered = questions.filter((q) => isAnswered(q, st.responses[q.id])).length;
    nav.append(grid, h('p', { class: 'small muted', text: `${answered} of ${questions.length} answered${flagged.size ? `, ${flagged.size} flagged to check again` : ''}.` }));
    // a live region: only touch it when it changes, or a screen reader repeats it at every key press
    const progress = `Question ${index + 1} of ${questions.length}`;
    if (progressEl.textContent !== progress) progressEl.textContent = progress;
  }

  function toggleFlag() {
    const q = questions[index];
    if (flagged.has(q.id)) flagged.delete(q.id);
    else flagged.add(q.id);
    flagBtn.setAttribute('aria-pressed', String(flagged.has(q.id)));
    flagBtn.querySelector('span:last-child').textContent = flagged.has(q.id) ? 'Flagged' : 'Flag';
    announce(flagged.has(q.id) ? 'Flagged to check again' : 'Flag removed');
    saveSoon();
    updateNav();
  }

  function go(i) {
    if (i < 0 || i >= questions.length) return;
    index = i;
    render();
    saveSoon();
  }

  // ------------------------------------------------------------ question widgets
  function render() {
    const q = questions[index];
    qclock.show(q.id);
    const r = st.responses[q.id];
    const promptId = `prompt-${index}`;
    const card = h('section', { class: 'qcard', 'aria-labelledby': promptId },
      h('div', { class: 'qmeta' },
        h('span', { class: 'qnum', text: `Question ${index + 1}` }),
        h('span', { class: 'qmarks', text: `${q.marks} mark${q.marks === 1 ? '' : 's'}` }),
        h('span', { class: `qdiff d${q.difficulty}`, 'aria-label': `Difficulty ${q.difficulty} of 3` }, ...[1, 2, 3].map((d) => h('span', { class: d <= q.difficulty ? 'on' : '' })))),
      h('h2', { class: 'prompt', id: promptId, tabindex: '-1', text: q.prompt }),
      h('p', { class: 'hint', text: TYPE_HINT[q.type] || '' }),
      widget(q, r, promptId));
    clear(qwrap).append(card);
    prevBtn.disabled = index === 0;
    const last = index === questions.length - 1;
    nextBtn.querySelector('span:last-child').textContent = last ? 'Finish' : 'Next';
    flagBtn.setAttribute('aria-pressed', String(flagged.has(q.id)));
    flagBtn.querySelector('span:last-child').textContent = flagged.has(q.id) ? 'Flagged' : 'Flag';
    updateNav();
    card.querySelector('.prompt').focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }

  function widget(q, r, promptId) {
    switch (q.type) {
      case 'mcq':
      case 'truefalse': {
        const opts = q.type === 'truefalse' ? [['True', true], ['False', false]] : q.options.map((o, i) => [o, i]);
        const group = h('div', { class: `options${q.type === 'truefalse' ? ' tf' : ''}`, role: 'radiogroup', 'aria-labelledby': promptId });
        opts.forEach(([text, val], i) => {
          const b = h('button', { type: 'button', role: 'radio', class: 'opt', 'aria-checked': String(r === val), onClick: () => {
            setResponse(q.id, val);
            group.querySelectorAll('.opt').forEach((x) => x.setAttribute('aria-checked', 'false'));
            b.setAttribute('aria-checked', 'true');
          } },
          h('span', { class: 'opt-mark', 'aria-hidden': 'true' }, q.type === 'truefalse' ? icon(val ? 'check' : 'cross', { size: 22 }) : LETTERS[i]),
          h('span', { class: 'opt-text', text }));
          group.append(b);
        });
        return rovingRadios(group);
      }
      case 'multi': {
        const picked = new Set(Array.isArray(r) ? r : []);
        const group = h('div', { class: 'options', role: 'group', 'aria-labelledby': promptId });
        q.options.forEach((text, i) => {
          const b = h('button', { type: 'button', role: 'checkbox', class: 'opt opt-multi', 'aria-checked': String(picked.has(i)), onClick: () => {
            if (picked.has(i)) picked.delete(i);
            else picked.add(i);
            b.setAttribute('aria-checked', String(picked.has(i)));
            setResponse(q.id, [...picked].sort((a, c) => a - c));
          } },
          h('span', { class: 'opt-mark', 'aria-hidden': 'true' }, LETTERS[i]),
          h('span', { class: 'opt-text', text }),
          h('span', { class: 'opt-tick', 'aria-hidden': 'true' }, icon('check', { size: 20 })));
          group.append(b);
        });
        return group;
      }
      case 'short':
      case 'numeric': {
        const input = h('input', {
          type: 'text',
          class: 'answer-input',
          value: typeof r === 'string' ? r : '',
          'aria-labelledby': promptId,
          autocomplete: 'off',
          autocapitalize: 'off',
          autocorrect: 'off',
          spellcheck: 'false',
          inputmode: 'text',
          enterkeyhint: 'next',
          placeholder: q.type === 'numeric' ? 'Your number' : 'Your answer',
          maxlength: '200',
        });
        input.addEventListener('input', () => setResponse(q.id, input.value));
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            if (index < questions.length - 1) go(index + 1);
            else confirmFinish();
          }
        });
        return h('div', { class: 'answer-box' }, input);
      }
      case 'order':
        return orderWidget(q, r);
      case 'match':
        return matchWidget(q, r);
      default:
        return h('p', { text: 'This question type is not supported.' });
    }
  }

  function orderWidget(q, r) {
    const wrap = h('div', { class: 'order' });
    // before she moves anything, no item is in its correct place (no free marks)
    let arr = Array.isArray(r) && r.length === q.options.length ? r.slice() : startingOrder(q);
    function draw(focusSel) {
      clear(wrap);
      const list = h('ol', { class: 'order-list' });
      arr.forEach((oi, pos) => {
        const text = q.options[oi];
        list.append(h('li', { class: 'order-item' },
          h('span', { class: 'order-pos', text: String(pos + 1) }),
          h('span', { class: 'order-text', text }),
          h('span', { class: 'order-btns' },
            h('button', { type: 'button', class: 'icon-btn', 'data-k': `u${oi}`, 'aria-label': `Move up: ${text}`, disabled: pos === 0, onClick: () => move(pos, -1, `u${oi}`) }, icon('up')),
            h('button', { type: 'button', class: 'icon-btn', 'data-k': `d${oi}`, 'aria-label': `Move down: ${text}`, disabled: pos === arr.length - 1, onClick: () => move(pos, 1, `d${oi}`) }, icon('down')))));
      });
      wrap.append(list);
      if (!Array.isArray(st.responses[q.id])) {
        wrap.append(button('This order is my answer', { icon: 'check', cls: 'btn-ghost btn-small', onClick: () => { setResponse(q.id, arr.slice()); draw(); announce('Order saved'); } }));
      } else {
        wrap.append(h('p', { class: 'small muted', text: 'Your order is saved. You can still change it.' }));
      }
      if (focusSel) {
        const b = wrap.querySelector(`[data-k="${focusSel}"]`);
        if (b && !b.disabled) b.focus();
        else {
          const other = wrap.querySelector(`[data-k="${focusSel[0] === 'u' ? 'd' : 'u'}${focusSel.slice(1)}"]`);
          if (other) other.focus();
        }
      }
    }
    function move(pos, dir, key) {
      const to = pos + dir;
      if (to < 0 || to >= arr.length) return;
      [arr[pos], arr[to]] = [arr[to], arr[pos]];
      setResponse(q.id, arr.slice());
      announce(`${q.options[arr[to]]} is now number ${to + 1}`);
      draw(key);
    }
    draw();
    return wrap;
  }

  function matchWidget(q, r) {
    const nL = q.options.left.length;
    const cur = Array.isArray(r) && r.length === nL ? r.slice() : new Array(nL).fill(null);
    const wrap = h('div', { class: 'match' });
    let open = -1;
    function draw(focusIdx) {
      clear(wrap);
      q.options.left.forEach((L, i) => {
        const chosen = Number.isInteger(cur[i]) ? q.options.right[cur[i]] : null;
        const listId = `match-${q.id}-${i}`;
        const toggle = h('button', {
          type: 'button',
          class: `match-pick${chosen ? ' is-set' : ''}`,
          'aria-expanded': String(open === i),
          'aria-controls': open === i ? listId : null,
          'aria-label': `Match for ${L}: ${chosen || 'not chosen yet'}`,
          'data-i': String(i),
          onClick: () => { open = open === i ? -1 : i; draw(i); },
        }, h('span', { text: chosen || 'Choose a match' }), icon(open === i ? 'up' : 'down', { size: 20 }));
        const row = h('div', { class: 'match-row' }, h('div', { class: 'match-left', text: L }), toggle);
        if (open === i) {
          const list = h('div', { class: 'match-options', id: listId, role: 'radiogroup', 'aria-label': `Match for ${L}` });
          q.options.right.forEach((R, j) => {
            const usedBy = cur.findIndex((x, k) => x === j && k !== i);
            list.append(h('button', { type: 'button', role: 'radio', class: 'opt opt-small', 'aria-checked': String(cur[i] === j), onClick: () => {
              if (usedBy >= 0) cur[usedBy] = null;
              cur[i] = j;
              open = -1;
              setResponse(q.id, cur.slice());
              draw(i);
            } }, h('span', { class: 'opt-text', text: R }), usedBy >= 0 ? h('small', { class: 'muted', text: `(now with ${q.options.left[usedBy]})` }) : null));
          });
          row.append(rovingRadios(list, { select: false }));
        }
        wrap.append(row);
      });
      if (focusIdx != null) {
        const t = open >= 0 ? wrap.querySelector('.match-options .opt[tabindex="0"]') : wrap.querySelector(`.match-pick[data-i="${focusIdx}"]`);
        if (t) t.focus();
      }
    }
    draw();
    return wrap;
  }

  // ------------------------------------------------------------ finishing
  async function confirmFinish() {
    const answered = questions.filter((q) => isAnswered(q, st.responses[q.id])).length;
    const left = questions.length - answered;
    const msg = h('div', {},
      h('p', { text: `You have answered ${answered} of ${questions.length} questions.` }),
      left ? h('p', { text: `${left} still ${left === 1 ? 'has' : 'have'} no answer. A best guess can still earn marks.` }) : h('p', { text: 'Every question has an answer. Well done!' }),
      flagged.size ? h('p', { text: `You flagged ${flagged.size} to check again.` }) : null,
      h('p', { class: 'muted', text: `Time left: ${formatClock(countdown.remaining())}.` }));
    const choice = await dialog('Finish and see your results?', msg, [
      { label: 'Keep going', value: false, cls: 'btn-ghost' },
      { label: 'Finish', value: true, cls: 'btn-primary', icon: 'check' },
    ]);
    if (choice) finish({ early: countdown.remaining() > 1, timedOut: false });
  }

  async function finish(how) {
    if (finishing) return;
    closeDialogs(); // e.g. the "Finish?" question still open when time runs out
    qclock.stop();
    countdown.pause();
    st.times = qclock.snapshot();
    st.flagged = [...flagged];
    const elapsedSec = countdown.elapsed();
    finishing = true;
    clearInterval(tick);
    clearTimeout(saveTimer);
    try {
      await submitSession(app.db, session, { questions: qmap, topics: indexTopics(topics), topicOrder: [...topics].sort((a, b) => a.order - b.order) }, { ...how, elapsedSec });
      location.hash = `#/results/${encodeURIComponent(session.id)}`;
    } catch (e) {
      console.error(e);
      // carry on as before: clock running, answers still saved as she goes, Finish can be tried again
      finishing = false;
      retryAt = Date.now() + 5000;
      if (!document.hidden) {
        countdown.start();
        qclock.resume();
      }
      tick = startTick();
      saveNow();
      toast('Your answers could not be saved. Please try Finish again.');
    }
  }

  // ------------------------------------------------------------ clock
  function drawClock() {
    const rem = countdown.remaining();
    timerEl.querySelector('.timer-num').textContent = formatClock(rem);
    timerEl.classList.toggle('warn', rem <= 300 && rem > 60);
    timerEl.classList.toggle('urgent', rem <= 60);
    for (const t of countdown.newWarnings([300, 60])) {
      toast(t === 300 ? 'Five minutes left.' : 'One minute left.'); // the toast is a live region: it is read out once
    }
  }
  let ticks = 0;
  let timeUpShown = false;
  let retryAt = 0;
  function startTick() {
    return setInterval(() => {
      if (finishing) return;
      drawClock();
      if (countdown.expired()) {
        if (Date.now() < retryAt) return; // a save just failed: wait a moment before trying again
        if (!timeUpShown) toast("Time's up! Let's see how you did.");
        timeUpShown = true;
        finish({ early: false, timedOut: true });
        return;
      }
      if (++ticks % 20 === 0) saveNow();
    }, 250);
  }
  let tick = startTick();

  function onVisibility() {
    if (finishing) return;
    if (document.hidden) {
      countdown.pause();
      qclock.stop();
      saveNow();
    } else {
      countdown.start();
      qclock.resume();
    }
  }
  const onPageHide = () => saveNow();
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('pagehide', onPageHide);

  app.cleanup = async () => {
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('pagehide', onPageHide);
    clearInterval(tick);
    if (!finishing) {
      countdown.pause();
      qclock.stop();
      await saveNow();
    }
  };

  countdown.newWarnings([300, 60].filter((t) => countdown.remaining() <= t)); // no repeat warnings on resume
  if (!document.hidden) countdown.start();
  drawClock();
  render();
  await app.db.put('sessions', session);
}
