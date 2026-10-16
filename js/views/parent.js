// Parent area, behind a PIN set on first use: overview with time and questions per day, week
// and month; chapters and mastery; the report archive; and settings (parent email, PIN,
// export and import of progress).

import { h, clear, icon, button, dialog, toast, shareOrDownload, downloadFile, pct } from '../ui.js';
import { SUBJECTS, loadAll, subjectTitle } from '../content.js';
import { hashPin, verifyPin, validPin, lockoutSeconds } from '../pin.js';
import { activity, totals, streak, longestStreak, subtopicMastery, topicSummary, currentTopic, formatDate, formatTime, levelFor } from '../stats.js';
import { progressAnalysis } from '../analysis.js';
import { columnChart, levelBadge, meter } from '../charts.js';
import { formatDuration } from '../timer.js';
import { reportBodyHtml, reportFileName } from '../report.js';
import { buildExport, importExport, exportFileName, MAX_IMPORT_BYTES } from '../exportimport.js';
import { APP_VERSION } from '../practice.js';
import { sendReport, shareReport } from './results.js';

const UNLOCK_MS = 15 * 60 * 1000;
const TABS = [
  ['overview', 'Overview', 'chart'],
  ['chapters', 'Chapters', 'book'],
  ['reports', 'Reports', 'mail'],
  ['settings', 'Settings', 'settings'],
];

export async function parentView(el, app, tab, arg) {
  if (Date.now() > app.parentUnlockedUntil) {
    await gate(el, app, () => parentView(el, app, tab, arg));
    return;
  }
  app.parentUnlockedUntil = Date.now() + UNLOCK_MS;
  const current = tab === 'report' ? 'reports' : TABS.some((t) => t[0] === tab) ? tab : 'overview';
  const nav = h('nav', { class: 'tabs', 'aria-label': 'Parent area' }, ...TABS.map(([id, label, ic]) => h('a', { href: `#/parent/${id}`, class: `tab${id === current ? ' is-on' : ''}`, 'aria-current': id === current ? 'page' : null }, icon(ic, { size: 20 }), h('span', { text: label }))));
  const body = h('div', { class: 'stack' });
  const resetAt = await app.db.getSetting('pinResetAt', null);
  let resetNote = null;
  if (resetAt) {
    const history = (await app.db.getSetting('pinResetHistory', [])) || [];
    resetNote = h('section', { class: 'card alert', role: 'alert' },
      h('h2', {}, icon('info'), h('span', { text: 'The parent PIN was reset' })),
      h('p', { text: `The PIN on this device was reset on ${formatDate(resetAt, true)} at ${formatTime(resetAt)}. Resetting also cleared the saved email address, so check that the address in Settings is yours.${history.length > 1 ? ` It has been reset ${history.length} times in all.` : ''}` }),
      h('p', { class: 'small muted', text: 'Until you confirm below, this note also goes at the top of every report email.' }),
      button('I know about this reset', { icon: 'check', cls: 'btn-ghost', onClick: async () => {
        await app.db.deleteSetting('pinResetAt');
        resetNote.remove();
        toast('Noted.');
      } }));
  }
  clear(el).append(h('div', { class: 'stack parent' },
    h('div', { class: 'row space' },
      h('h1', {}, icon('lock', { size: 28 }), h('span', { text: 'Parent area' })),
      h('a', { href: '#/', class: 'btn btn-ghost btn-small' }, icon('home', { size: 20 }), h('span', { text: 'Lock and leave' }))),
    resetNote, nav, body));
  const [sessions, attempts, topics] = await Promise.all([app.db.getAll('sessions'), app.db.getAll('attempts'), loadAll()]);
  const data = { sessions: sessions.filter((s) => s.status === 'complete'), attempts, topics };
  if (tab === 'report') await reportPage(body, app, arg);
  else if (current === 'chapters') chaptersPage(body, data);
  else if (current === 'reports') await reportsPage(body, app);
  else if (current === 'settings') await settingsPage(body, app, data);
  else overviewPage(body, data);
}

// ---------------------------------------------------------------- PIN gate

function pinInput(id, label, autocomplete) {
  const input = h('input', { id, type: 'password', inputmode: 'numeric', pattern: '[0-9]*', autocomplete, maxlength: '8', class: 'answer-input pin', required: true });
  return { input, el: h('div', { class: 'field' }, h('label', { for: id, text: label }), input) };
}

async function gate(el, app, onOpen) {
  const record = await app.db.getSetting('pinHash');
  const msg = h('p', { class: 'form-msg', role: 'alert' });
  const card = h('section', { class: 'card gate' });
  clear(el).append(h('div', { class: 'stack narrow' },
    h('nav', { class: 'crumbs' }, h('a', { href: '#/' }, icon('home', { size: 18 }), h('span', { text: 'Home' }))),
    h('h1', {}, icon('lock', { size: 28 }), h('span', { text: 'Parent area' })), card));

  if (!record) {
    const a = pinInput('pin1', 'Choose a PIN (4 to 8 digits)', 'new-password');
    const b = pinInput('pin2', 'Type it again', 'new-password');
    const form = h('form', { class: 'stack' }, a.el, b.el, msg, h('button', { type: 'submit', class: 'btn btn-primary' }, icon('lock'), h('span', { text: 'Set PIN and open' })));
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!validPin(a.input.value)) { msg.textContent = 'The PIN must be 4 to 8 digits.'; return; }
      if (a.input.value !== b.input.value) { msg.textContent = 'The two PINs do not match.'; return; }
      await app.db.setSetting('pinHash', await hashPin(a.input.value));
      app.parentUnlockedUntil = Date.now() + UNLOCK_MS;
      toast('Parent PIN set.');
      onOpen();
    });
    card.append(h('h2', { text: 'Set a parent PIN' }),
      h('p', { text: 'This keeps your daughter\'s reports and the settings out of casual reach on this device.' }),
      h('p', { class: 'muted small', text: 'It is a light lock, not real security: someone with the device and technical know-how could still read the stored progress. The PIN itself is never stored, only a scrambled (hashed) form of it.' }),
      form);
    a.input.focus();
    return;
  }

  const p = pinInput('pin', 'Parent PIN', 'current-password');
  const submit = h('button', { type: 'submit', class: 'btn btn-primary' }, icon('lock'), h('span', { text: 'Open' }));
  const form = h('form', { class: 'stack' }, p.el, msg, submit);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const lockUntil = (await app.db.getSetting('pinLockUntil', 0)) || 0;
    if (Date.now() < lockUntil) {
      msg.textContent = `Too many tries. Please wait ${Math.ceil((lockUntil - Date.now()) / 1000)} seconds.`;
      return;
    }
    submit.disabled = true;
    const ok = await verifyPin(p.input.value, record);
    submit.disabled = false;
    if (ok) {
      await app.db.setSetting('pinFailures', 0);
      app.parentUnlockedUntil = Date.now() + UNLOCK_MS;
      onOpen();
      return;
    }
    const fails = ((await app.db.getSetting('pinFailures', 0)) || 0) + 1;
    await app.db.setSetting('pinFailures', fails);
    const wait = lockoutSeconds(fails);
    if (wait) await app.db.setSetting('pinLockUntil', Date.now() + wait * 1000);
    msg.textContent = wait ? `That PIN is not right. Please wait ${wait} seconds before trying again.` : 'That PIN is not right.';
    p.input.value = '';
    p.input.focus();
  });
  const forgot = button('Forgot the PIN?', { cls: 'btn-link', onClick: async () => {
    const box = h('input', { type: 'text', class: 'answer-input', 'aria-label': 'Type RESET to confirm', autocomplete: 'off' });
    const ok = await dialog('Reset the parent PIN?', h('div', {},
      h('p', { text: 'Resetting removes the PIN and the saved parent email address from this device. Progress and reports are kept. You will then set a new PIN and enter the email again.' }),
      h('p', { class: 'small muted', text: 'The reset is recorded with its date. It is shown at the top of the parent area and in report emails until a parent confirms it.' }),
      h('p', { text: 'Type RESET to confirm.' }), box), [{ label: 'Cancel', value: false, cls: 'btn-ghost' }, { label: 'Reset', value: true, cls: 'btn-primary' }]);
    if (ok && box.value.trim().toUpperCase() === 'RESET') {
      for (const k of ['pinHash', 'parentEmail', 'pinFailures', 'pinLockUntil']) await app.db.deleteSetting(k);
      // keep a record: shown at the top of the parent area and in every report email until a
      // parent confirms it, so a reset (and a changed email address) cannot go unnoticed
      const at = Date.now();
      const history = (await app.db.getSetting('pinResetHistory', [])) || [];
      await app.db.setSetting('pinResetHistory', [...history, at].slice(-50));
      await app.db.setSetting('pinResetAt', at);
      toast('PIN removed. Please set a new one.');
      gate(el, app, onOpen);
    } else if (ok) toast('Nothing changed (RESET was not typed).');
  } });
  card.append(h('h2', { text: 'Enter the parent PIN' }), form, forgot);
  p.input.focus();
}

// ---------------------------------------------------------------- overview

function overviewPage(body, data) {
  const { sessions, attempts, topics } = data;
  const t = totals(sessions);
  const st = streak(sessions);
  const today = activity(sessions, 'day', 1)[0];
  const week = activity(sessions, 'week', 1)[0];
  const month = activity(sessions, 'month', 1)[0];
  body.append(h('section', { class: 'tiles tiles-wide' },
    tile('star', String(t.questions), 'questions answered'),
    tile('clock', formatDuration(t.seconds), 'practice time'),
    tile('play', String(t.sessions), 'sessions'),
    tile('flame', `${st.days} day${st.days === 1 ? '' : 's'}`, `streak (best ${longestStreak(sessions)})`)));

  body.append(h('section', { class: 'card' },
    h('h2', {}, icon('clock'), h('span', { text: 'Today, this week, this month' })),
    h('table', { class: 'tbl' },
      h('thead', {}, h('tr', {}, h('th', { text: '' }), h('th', { class: 'num', text: 'Questions' }), h('th', { class: 'num', text: 'Time' }), h('th', { class: 'num', text: 'Sessions' }))),
      h('tbody', {}, ...[['Today', today], ['This week', week], ['This month', month]].map(([l, b]) => h('tr', {}, h('th', { scope: 'row', text: l }), h('td', { class: 'num', text: String(b.questions) }), h('td', { class: 'num', text: formatDuration(b.seconds) }), h('td', { class: 'num', text: String(b.sessions) })))))));

  const charts = h('div', { class: 'charts' });
  let unit = 'day';
  const seg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Show by' });
  const draw = () => {
    const n = unit === 'day' ? 14 : unit === 'week' ? 8 : 6;
    const b = activity(sessions, unit, n);
    const width = Math.max(300, Math.min(840, (document.getElementById('main').clientWidth || 640) - 72));
    const what = unit === 'day' ? 'last 14 days' : unit === 'week' ? 'last 8 weeks (week starting)' : 'last 6 months';
    clear(charts).append(
      columnChart(b, { title: `Questions answered, ${what}`, value: (x) => x.questions, fmt: (v) => `${v} question${v === 1 ? '' : 's'}`, unitLabel: unit === 'day' ? 'Day' : unit === 'week' ? 'Week starting' : 'Month', valueLabel: 'Questions', minMax: 5, width }),
      columnChart(b, { title: `Minutes of practice, ${what}`, value: (x) => Math.round(x.seconds / 60), fmt: (v) => `${v} min`, unitLabel: unit === 'day' ? 'Day' : unit === 'week' ? 'Week starting' : 'Month', valueLabel: 'Minutes', minMax: 10, width }));
    seg.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.u === unit)));
  };
  for (const [u, l] of [['day', 'By day'], ['week', 'By week'], ['month', 'By month']]) {
    const b = button(l, { cls: 'btn-small btn-ghost', onClick: () => { unit = u; draw(); } });
    b.dataset.u = u;
    seg.append(b);
  }
  draw();
  body.append(h('section', { class: 'card' }, h('div', { class: 'row space' }, h('h2', {}, icon('chart'), h('span', { text: 'Practice over time' })), seg), charts));

  const an = progressAnalysis({ sessions, attempts, topics });
  const sec = h('section', { class: 'card analysis' }, h('h2', {}, icon('bulb'), h('span', { text: 'Analysis summary' })), h('p', { class: 'lead', text: an.headline }));
  if (an.current) sec.append(h('p', {}, h('strong', { text: 'Chapter she is on now: ' }), an.current));
  if (!an.empty) {
    sec.append(h('h3', { text: 'Strengths' }), an.strengths.length ? h('ul', {}, ...an.strengths.map((s) => h('li', { text: `${s.title} (${s.topicTitle}): ${pct(s.score)} over ${s.n} questions` }))) : h('p', { class: 'muted', text: 'Not enough practice yet to call anything a strength (needs 4 or more questions at 80% or above).' }));
    sec.append(h('h3', { text: 'Needs work' }), an.weaknesses.length ? h('ul', {}, ...an.weaknesses.map((s) => h('li', { text: `${s.title} (${s.topicTitle}): ${pct(s.score)} over ${s.n} questions` }))) : h('p', { class: 'muted', text: 'Nothing is below 60% so far.' }));
    if (an.skills.strong.length || an.skills.weak.length) {
      sec.append(h('h3', { text: 'Skills (last 60 days)' }), h('ul', {},
        ...an.skills.strong.map((s) => h('li', { text: `Strong: ${s.skill} (${s.correct}/${s.total} right)` })),
        ...an.skills.weak.map((s) => h('li', { text: `Weaker: ${s.skill} (${s.correct}/${s.total} right)` }))));
    }
    if (an.misconceptions.length) sec.append(h('h3', { text: 'Misconceptions seen in the last 30 days' }), h('ul', {}, ...an.misconceptions.map((m) => h('li', { text: `${m.note}${m.count > 1 ? ` (seen ${m.count} times)` : ''}` }))));
  }
  sec.append(h('h3', { text: 'Recommended next' }), h('ol', {}, ...an.recommendations.map((r) => h('li', { text: r }))));
  sec.append(h('p', { class: 'muted small', text: 'For a deeper written analysis by Claude, use Settings, Export progress, and pass the file to the Chief Learning Officer.' }));
  body.append(sec);
}

function tile(ic, value, label) {
  return h('div', { class: 'tile' }, icon(ic), h('b', { text: value }), h('span', { text: label }));
}

// ---------------------------------------------------------------- chapters

function chaptersPage(body, data) {
  const { sessions, attempts, topics } = data;
  const mastery = subtopicMastery(attempts);
  const cur = currentTopic(sessions);
  const lastAt = new Map();
  for (const a of attempts) lastAt.set(a.topicId, Math.max(lastAt.get(a.topicId) || 0, a.answeredAt));
  const curTopic = topics.find((t) => t.topicId === cur);
  body.append(h('section', { class: 'card' }, h('p', {}, h('strong', { text: 'Chapter she is on now: ' }), curTopic ? `${subjectTitle(curTopic.subject)}, ${curTopic.title}` : 'none yet')));
  for (const s of SUBJECTS) {
    const list = topics.filter((t) => t.subject === s.id).sort((a, b) => a.order - b.order);
    if (!list.length) continue;
    const sec = h('section', { class: 'card' }, h('h2', {}, icon(s.id), h('span', { text: s.title })));
    const covered = list.filter((t) => attempts.some((a) => a.topicId === t.topicId)).length;
    sec.append(h('p', { class: 'muted', text: `${covered} of ${list.length} chapters covered.` }));
    for (const t of list) {
      const sum = topicSummary(t, mastery, attempts);
      const det = h('details', { class: `chapter${t.topicId === cur ? ' is-current' : ''}` },
        h('summary', {},
          h('span', { class: 'topic-num', text: String(t.order) }),
          h('span', { class: 'chapter-body' },
            h('span', { class: 'topic-title', text: `${t.title}${t.topicId === cur ? ' (current)' : ''}` }),
            h('span', { class: 'row tight' }, levelBadge(sum.level), sum.score != null ? meter(sum.score) : null),
            h('span', { class: 'muted small', text: `${sum.n} answers · seen ${Math.round(sum.coverage * 100)}% of the questions${lastAt.get(t.topicId) ? ` · last ${formatDate(lastAt.get(t.topicId))}` : ''}` }))),
        h('table', { class: 'tbl' },
          h('thead', {}, h('tr', {}, h('th', { text: 'Subtopic' }), h('th', { text: 'Level' }), h('th', { text: 'Mastery' }), h('th', { class: 'num', text: 'Answers' }))),
          h('tbody', {}, ...sum.subtopics.map((x) => h('tr', {},
            h('td', { text: x.title }),
            h('td', {}, levelBadge(x.m ? x.m.level : levelFor(0, 0))),
            h('td', {}, x.m ? meter(x.m.score) : h('span', { class: 'muted', text: '–' })),
            h('td', { class: 'num', text: String(x.m ? x.m.n : 0) }))))));
      sec.append(det);
    }
    body.append(sec);
  }
  body.append(h('p', { class: 'muted small', text: 'Mastery weighs her most recent 20 answers in each subtopic, with newer and harder questions counting more. "Mastered" needs 85% or more over at least 6 answers.' }));
}

// ---------------------------------------------------------------- reports

async function reportsPage(body, app) {
  const reports = (await app.db.getAll('reports')).sort((a, b) => b.startedAt - a.startedAt);
  if (!reports.length) {
    body.append(h('section', { class: 'card' }, h('p', { text: 'No reports yet. A report is made after every practice session.' })));
    return;
  }
  const byMonth = new Map();
  for (const r of reports) {
    const d = new Date(r.startedAt);
    const k = `${d.toLocaleString('en-GB', { month: 'long' })} ${d.getFullYear()}`;
    if (!byMonth.has(k)) byMonth.set(k, []);
    byMonth.get(k).push(r);
  }
  for (const [month, list] of byMonth) {
    body.append(h('section', { class: 'card' }, h('h2', { text: month }),
      h('ul', { class: 'report-list' }, ...list.map((r) => h('li', {}, h('a', { href: `#/parent/report/${encodeURIComponent(r.sessionId)}`, class: 'report-row' },
        h('span', { class: 'rr-date', text: `${formatDate(r.startedAt, true)}, ${formatTime(r.startedAt)}` }),
        h('span', { class: 'rr-title', text: r.title }),
        h('span', { class: 'rr-score', text: pct(r.score.pct) }),
        h('span', { class: 'rr-time muted small', text: `${r.score.total} questions · ${formatDuration(r.timeUsedSec)}` }),
          icon('right', { cls: 'chev' })))))));
  }
}

async function reportPage(body, app, id) {
  const r = await app.db.get('reports', id);
  if (!r) {
    body.append(h('p', { class: 'card', text: 'That report was not found.' }));
    return;
  }
  const content = h('div', { class: 'report-body' });
  content.innerHTML = reportBodyHtml(r); // every value in it is escaped by reportBodyHtml
  body.append(h('section', { class: 'card' },
    h('p', {}, h('a', { href: '#/parent/reports' }, icon('left', { size: 18 }), h('span', { text: 'All reports' }))),
    h('h2', { text: r.title }),
    h('div', { class: 'row wrap' },
      button('Send to Dad by email', { icon: 'mail', cls: 'btn-primary', onClick: () => sendReport(app, r) }),
      button('Save or share (web page)', { icon: 'share', cls: 'btn-ghost', onClick: () => shareReport(r) }),
      button('Download data (JSON)', { icon: 'download', cls: 'btn-ghost', onClick: () => downloadFile(reportFileName(r, 'json'), JSON.stringify(r, null, 2), 'application/json') })),
    content));
}

// ---------------------------------------------------------------- settings

async function settingsPage(body, app, data) {
  const db = app.db;
  // parent email
  const email = h('input', { id: 'pemail', type: 'email', class: 'answer-input', autocomplete: 'email', value: (await db.getSetting('parentEmail', '')) || '', placeholder: 'Parent email address' });
  const emailMsg = h('p', { class: 'form-msg', role: 'status' });
  const emailForm = h('form', { class: 'stack' },
    h('div', { class: 'field' }, h('label', { for: 'pemail', text: 'Parent email address (for "Send report to Dad")' }), email),
    emailMsg,
    h('button', { type: 'submit', class: 'btn btn-primary' }, icon('check'), h('span', { text: 'Save email' })));
  emailForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const v = email.value.trim();
    if (v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { emailMsg.textContent = 'That does not look like an email address.'; return; }
    if (v) await db.setSetting('parentEmail', v);
    else await db.deleteSetting('parentEmail');
    emailMsg.textContent = v ? 'Saved on this device.' : 'Email removed from this device.';
  });
  body.append(h('section', { class: 'card' }, h('h2', {}, icon('mail'), h('span', { text: 'Reports by email' })),
    h('p', { class: 'small muted', text: 'The address is stored only on this device. It is never part of the app\'s code or of exported progress files. The app never sends anything by itself: "Send report to Dad" opens the email app with the report ready, and your daughter presses Send.' }),
    emailForm));

  // device name
  const label = h('input', { id: 'dlabel', type: 'text', class: 'answer-input', value: (await db.getSetting('deviceLabel', '')) || '', placeholder: 'For example: Laptop, iPad, Phone', maxlength: '40' });
  const labelForm = h('form', { class: 'row wrap' }, h('div', { class: 'field grow' }, h('label', { for: 'dlabel', text: 'Name for this device (shown in exported files)' }), label),
    h('button', { type: 'submit', class: 'btn btn-ghost' }, h('span', { text: 'Save name' })));
  labelForm.addEventListener('submit', async (e) => { e.preventDefault(); await db.setSetting('deviceLabel', label.value.trim()); toast('Device name saved.'); });

  // export / import
  const fileIn = h('input', { type: 'file', accept: '.json,application/json', class: 'visually-hidden', id: 'importfile' });
  fileIn.addEventListener('change', async () => {
    const f = fileIn.files && fileIn.files[0];
    if (!f) return;
    try {
      if (f.size > MAX_IMPORT_BYTES) throw new Error('This file is too large to be a progress file.');
      const res = await importExport(db, await f.text());
      const a = res.added;
      await dialog('Progress imported', `Added ${a.sessions} sessions, ${a.attempts} answers and ${a.reports} reports${res.fromDevice ? ` from "${res.fromDevice}"` : ''}. ${res.skipped.sessions} sessions were already on this device and were kept as they were.${res.invalid ? ` ${res.invalid} damaged records were skipped.` : ''}`, [{ label: 'OK', value: true, cls: 'btn-primary' }]);
    } catch (e) {
      await dialog('Could not import', e.message, [{ label: 'OK', value: true, cls: 'btn-primary' }]);
    }
    fileIn.value = '';
  });
  const t = totals(data.sessions);
  body.append(h('section', { class: 'card' }, h('h2', {}, icon('download'), h('span', { text: 'Progress on this device' })),
    h('p', { class: 'notice' }, icon('info'), h('span', { text: 'Progress is saved on each device separately (this laptop, tablet or phone). To move it or combine devices, export it here and import the file on the other device. Importing adds what is missing and never deletes anything.' })),
    h('p', { class: 'small', text: `This device holds ${t.sessions} sessions and ${data.attempts.length} answers.` }),
    labelForm,
    h('div', { class: 'row wrap' },
      button('Export progress', { icon: 'download', cls: 'btn-primary', onClick: async () => {
        const exp = await buildExport(db, { appVersion: APP_VERSION, contentVersion: app.manifest.contentVersion });
        const res = await shareOrDownload(exportFileName(), JSON.stringify(exp, null, 1), 'application/json', 'Study Practice progress');
        if (res === 'downloaded') toast('Progress file saved.');
      } }),
      h('label', { for: 'importfile', class: 'btn btn-ghost', tabindex: '0', role: 'button', onKeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileIn.click(); } } }, icon('upload'), h('span', { text: 'Import progress' })),
      fileIn),
    h('p', { class: 'small muted', text: 'The export file contains every answer with its question, timing and result, ready for a deeper analysis by the Chief Learning Officer. It does not contain the PIN or the parent email.' })));

  // PIN
  body.append(h('section', { class: 'card' }, h('h2', {}, icon('lock'), h('span', { text: 'Parent PIN' })),
    h('p', { class: 'small muted', text: 'A light lock to keep the parent area out of casual reach. It is not real security.' }),
    button('Change PIN', { icon: 'lock', cls: 'btn-ghost', onClick: async () => {
      const a = h('input', { type: 'password', inputmode: 'numeric', class: 'answer-input', 'aria-label': 'New PIN', autocomplete: 'new-password', maxlength: '8' });
      const b = h('input', { type: 'password', inputmode: 'numeric', class: 'answer-input', 'aria-label': 'New PIN again', autocomplete: 'new-password', maxlength: '8' });
      const ok = await dialog('Change the parent PIN', h('div', { class: 'stack' }, h('label', { text: 'New PIN (4 to 8 digits)' }), a, h('label', { text: 'Type it again' }), b), [{ label: 'Cancel', value: false, cls: 'btn-ghost' }, { label: 'Save', value: true, cls: 'btn-primary' }]);
      if (!ok) return;
      if (!validPin(a.value) || a.value !== b.value) { toast('PIN not changed: it must be 4 to 8 digits, typed the same twice.'); return; }
      await db.setSetting('pinHash', await hashPin(a.value));
      toast('PIN changed.');
    } })));

  // storage + erase
  let storageText = '';
  try {
    const persisted = navigator.storage && navigator.storage.persisted ? await navigator.storage.persisted() : false;
    const est = navigator.storage && navigator.storage.estimate ? await navigator.storage.estimate() : null;
    storageText = `${persisted ? 'The browser has agreed to keep this data.' : 'The browser may clear this data if the device runs short of space, so export now and then.'}${est && est.usage != null ? ` About ${Math.max(1, Math.round(est.usage / 1024))} KB used.` : ''}`;
  } catch { /* ignore */ }
  body.append(h('section', { class: 'card' }, h('h2', {}, icon('info'), h('span', { text: 'Storage and about' })),
    h('p', { class: 'small', text: storageText }),
    h('p', { class: 'small muted', text: `Study Practice ${APP_VERSION}. Question banks version ${app.manifest.contentVersion || '-'}, built ${app.manifest.generatedAt ? formatDate(Date.parse(app.manifest.generatedAt)) : '-'}${app.manifest.samples ? ' (includes sample questions for testing)' : ''}. ${(app.manifest.subjects || []).map((s) => `${subjectTitle(s.id)}: ${s.topics.length} chapters, ${s.topics.reduce((n, x) => n + x.questions, 0)} questions`).join('; ')}.` }),
    button('Erase all progress on this device', { icon: 'trash', cls: 'btn-ghost btn-danger', onClick: async () => {
      const box = h('input', { type: 'text', class: 'answer-input', 'aria-label': 'Type ERASE to confirm', autocomplete: 'off' });
      const ok = await dialog('Erase all progress?', h('div', {}, h('p', { text: 'This removes every session, answer and report from this device. It cannot be undone. Export first if you may want them later. The PIN and email stay.' }), h('p', { text: 'Type ERASE to confirm.' }), box), [{ label: 'Cancel', value: false, cls: 'btn-ghost' }, { label: 'Erase', value: true, cls: 'btn-primary' }]);
      if (ok && box.value.trim().toUpperCase() === 'ERASE') {
        await db.clearStores(['sessions', 'attempts', 'reports']); // one transaction: all or nothing
        toast('All progress erased from this device.');
        location.hash = '#/parent/overview';
      } else if (ok) toast('Nothing erased (ERASE was not typed).');
    } })));
}
