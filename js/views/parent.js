// Parent area. Local mode (version 1): behind a PIN set on first use, reading this device.
// Linked mode (v2): the parent's own sign-in, reading his daughter's data online.
// Pages: overview (her latest session as a visual report, then time and questions per day,
// week and month, and the analysis), chapters and mastery, the report archive, and settings
// (local: email, PIN, export/import; linked: her account, export).

import { h, clear, icon, button, dialog, toast, shareOrDownload, downloadFile, pct } from '../ui.js';
import { SUBJECTS, loadAll, subjectTitle, indexQuestions, indexTopics, papersFor, bookOrder, chapterLabel } from '../content.js';
import { questionsForSession } from '../hooks.js';
import { hashPin, verifyPin, validPin, lockoutSeconds } from '../pin.js';
import { activity, totals, streak, longestStreak, subtopicMastery, topicSummary, currentTopic, formatDate, formatTime, levelFor, sectionTally } from '../stats.js';
import { progressAnalysis } from '../analysis.js';
import { columnChart, levelBadge, meter } from '../charts.js';
import { formatDuration } from '../timer.js';
import { reportBodyHtml, reportFileName, attemptLabel } from '../report.js';
import { buildExport, importExport, exportFileName, MAX_IMPORT_BYTES } from '../exportimport.js';
import { APP_VERSION } from '../practice.js';
import { sendReport, shareReport, copyReport } from './results.js';
import { visualReport, trendChart } from '../visual-report.js';
import { connect } from '../data/store.js';

const UNLOCK_MS = 15 * 60 * 1000;
const TABS = [
  ['overview', 'Overview', 'chart'],
  ['chapters', 'Chapters', 'book'],
  ['reports', 'Reports', 'mail'],
  ['settings', 'Settings', 'settings'],
];

const linkedParent = (app) => app.mode === 'linked' && app.profile && app.profile.role === 'parent';
const childName = (app) => (app.child ? app.child.display_name || app.child.username : 'Your daughter');

export async function parentView(el, app, tab, arg) {
  if (app.mode === 'linked') {
    if (!linkedParent(app)) {
      studentDeviceNotice(el, app);
      return;
    }
  } else if (Date.now() > app.parentUnlockedUntil) {
    await gate(el, app, () => parentView(el, app, tab, arg));
    return;
  } else {
    app.parentUnlockedUntil = Date.now() + UNLOCK_MS;
  }
  const linked = app.mode === 'linked';
  const current = tab === 'report' ? 'reports' : TABS.some((t) => t[0] === tab) ? tab : 'overview';
  const nav = h('nav', { class: 'tabs', 'aria-label': 'Parent area' }, ...TABS.map(([id, label, ic]) => h('a', { href: `#/parent/${id}`, class: `tab${id === current ? ' is-on' : ''}`, 'aria-current': id === current ? 'page' : null }, icon(ic, { size: 20 }), h('span', { text: label }))));
  const body = h('div', { class: 'stack' });
  let resetNote = null;
  const resetAt = linked ? null : await app.db.getSetting('pinResetAt', null);
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
  let headRight;
  if (linked) {
    const picker = app.children.length > 1
      ? h('select', { class: 'select', 'aria-label': 'Whose progress', onChange: async (e) => { await connect(app, { childId: e.target.value }); parentView(el, app, tab, arg); } },
        ...app.children.map((c) => h('option', { value: c.id, text: c.display_name || c.username, selected: !!(app.child && c.id === app.child.id) })))
      : null;
    headRight = h('div', { class: 'row wrap' }, picker,
      app.source ? button('Refresh', { icon: 'again', cls: 'btn-ghost btn-small', onClick: () => { app.source.refresh(); parentView(el, app, tab, arg); } }) : null);
  } else {
    headRight = h('a', { href: '#/', class: 'btn btn-ghost btn-small' }, icon('home', { size: 20 }), h('span', { text: 'Lock and leave' }));
  }
  clear(el).append(h('div', { class: 'stack parent' },
    h('div', { class: 'row space' },
      h('h1', {}, icon(linked ? 'chart' : 'lock', { size: 28 }), h('span', { text: linked && app.child ? `${childName(app)}: progress` : 'Parent area' })),
      headRight),
    resetNote, nav, body));

  if (linked && !app.child && app.offline) {
    body.append(h('section', { class: 'card' },
      h('h2', {}, icon('info'), h('span', { text: 'No connection' })),
      h('p', { text: 'The parent area reads her progress online, and the server cannot be reached. Check the internet connection and try again.' }),
      button('Try again', { icon: 'again', cls: 'btn-primary', onClick: async () => { await connect(app); parentView(el, app, tab, arg); } })));
    return;
  }
  if (linked && !app.child) {
    // first visit: no student account yet
    await linkedSettingsPage(body, app, null, true);
    return;
  }
  const src = app.source;
  let sessions;
  let attempts;
  let topics;
  try {
    [sessions, attempts, topics] = await Promise.all([src.getAll('sessions'), src.getAll('attempts'), loadAll()]);
  } catch (e) {
    body.append(h('section', { class: 'card' },
      h('h2', {}, icon('info'), h('span', { text: 'Her progress could not be loaded' })),
      h('p', { text: e && e.offline ? 'There is no internet connection. Her sessions are kept online, so this page needs the internet.' : `The server said: ${(e && e.message) || e}` }),
      button('Try again', { icon: 'again', cls: 'btn-primary', onClick: () => { if (src.refresh) src.refresh(); parentView(el, app, tab, arg); } })));
    return;
  }
  const done = sessions.filter((s) => s.status === 'complete');
  const data = { sessions: done, attempts, topics, papers: await papersFor(done) };
  if (tab === 'report') await reportPage(body, app, arg, data);
  else if (current === 'chapters') chaptersPage(body, data);
  else if (current === 'reports') await reportsPage(body, app, data);
  else if (current === 'settings') {
    if (linked) await linkedSettingsPage(body, app, data, false);
    else await settingsPage(body, app, data);
  } else await overviewPage(body, app, data);
}

/** Linked mode, on the student's sign-in: the parent area is on Dad's own account. */
function studentDeviceNotice(el, app) {
  clear(el).append(h('div', { class: 'stack narrow' },
    h('h1', {}, icon('lock', { size: 28 }), h('span', { text: 'Parent area' })),
    h('section', { class: 'card stack' },
      h('p', { text: 'Your reports go to Dad by themselves. He sees them when he signs in with his own account.' }),
      app.profile ? h('p', { class: 'small muted', text: 'To open the parent area on this device, sign out first, then choose "I am the parent".' }) : null,
      h('p', {}, h('a', { href: '#/', class: 'btn btn-primary' }, icon('home'), h('span', { text: 'Back to practice' }))))));
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

/** Her most recent session as a visual report: the first thing the parent sees. */
async function latestSession(body, app, data) {
  const reports = (await app.source.getAll('reports')).filter((r) => r && r.score).sort((a, b) => b.startedAt - a.startedAt);
  const r = reports[0];
  if (!r) {
    body.append(h('section', { class: 'card' },
      h('h2', {}, icon('star'), h('span', { text: 'Her latest session' })),
      h('p', { text: app.mode === 'linked'
        ? 'No sessions yet. When she finishes a practice, its report appears here by itself.'
        : 'No sessions yet. A report is made after every practice session.' })));
    return;
  }
  const atts = data.attempts.filter((a) => a.sessionId === r.sessionId);
  const questions = sessionQuestions(data, r.sessionId, atts);
  const sec = h('section', { class: 'card latest' },
    h('div', { class: 'row space' },
      h('h2', {}, icon('star'), h('span', { text: 'Her latest session' })),
      h('a', { href: `#/parent/report/${encodeURIComponent(r.sessionId)}`, class: 'btn btn-ghost btn-small' }, h('span', { text: 'Open the full report' }), icon('right', { size: 20 }))));
  body.append(sec);
  sec.append(visualReport(r, { attempts: atts, sessions: data.sessions, source: app.source, host: sec, questions }));
}

/** The questions of one session as she saw them: the bank, with that session's generated ones. */
function sessionQuestions(data, sessionId, attempts) {
  const session = data.sessions.find((x) => x.id === sessionId) || null;
  data.qmap ||= indexQuestions(data.topics, data.papers || []);
  data.tmap ||= indexTopics(data.topics);
  return questionsForSession(data.qmap, session, attempts, data.tmap);
}

async function overviewPage(body, app, data) {
  if (app.mode !== 'linked') await backupReminder(body, app, data);
  await latestSession(body, app, data);
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
    if (an.namedMistakes.length) {
      sec.append(h('h3', { text: 'Named mistakes in the last 30 days' }),
        h('ul', { class: 'named-mistakes' }, ...an.namedMistakes.map((m) => h('li', {},
          h('span', { text: m.label }),
          h('strong', { text: ` ${m.count} time${m.count === 1 ? '' : 's'}` }),
          h('span', { class: 'muted small', text: `${m.week ? ` (${m.week} this week)` : ''}${m.subtopics.length ? ` · ${m.subtopics.slice(0, 3).join('; ')}` : ''}` })))));
    }
    if (an.misconceptions.length) sec.append(h('h3', { text: 'Misconceptions seen in the last 30 days' }), h('ul', {}, ...an.misconceptions.map((m) => h('li', { text: `${m.note}${m.count > 1 ? ` (seen ${m.count} times)` : ''}` }))));
  }
  sec.append(h('h3', { text: 'Recommended next' }), h('ol', {}, ...an.recommendations.map((r) => h('li', { text: r }))));
  sec.append(h('p', { class: 'muted small', text: 'For a deeper written analysis by Claude, use Settings, Back up progress, and pass the file to the Chief Learning Officer.' }));
  body.append(sec);
}

// ---------------------------------------------------------------- backup (local mode)

export const BACKUP_DAYS = 7;

/**
 * The backup file's text, made ahead of the tap: Safari only opens the share sheet straight from
 * a tap, so nothing slow may run between the tap and navigator.share().
 */
export async function prepareBackup(app) {
  const exp = await buildExport(app.db, { appVersion: APP_VERSION, contentVersion: app.manifest.contentVersion });
  return { name: exportFileName(), text: JSON.stringify(exp, null, 1) };
}

/**
 * Save a backup file (share sheet on a tablet or phone, a download on a laptop) and remember when.
 * `ready` is a promise from prepareBackup(), started when the page was drawn. The date is recorded
 * only when the share sheet completed, or when a download is confirmed: a backup that did not
 * really happen must not silence the reminder.
 */
export async function backUpNow(app, ready = null) {
  let file;
  try {
    file = await (ready || prepareBackup(app));
  } catch (e) {
    toast(`The backup could not be made: ${(e && e.message) || e}`);
    return false;
  }
  const res = await shareOrDownload(file.name, file.text, 'application/json', 'Study Practice backup');
  if (res === 'cancelled') return false;
  if (res === 'downloaded') {
    const ok = await dialog('Did the backup save?', `A file called ${file.name} should now be in your Downloads (or Files). Keep it somewhere safe.`, [
      { label: 'No, it did not', value: false, cls: 'btn-ghost' },
      { label: 'Yes, it saved', value: true, cls: 'btn-primary', icon: 'check' },
    ]);
    if (!ok) {
      toast('Nothing recorded. Try again, or try on another device.');
      return false;
    }
  }
  await app.db.setSetting('lastBackupAt', Date.now());
  toast('Backup done. Keep the file somewhere safe.');
  const card = document.getElementById('backup-reminder');
  if (card) card.remove();
  return true;
}

/** Is a backup due? Never backed up (with something to lose), or the last one older than 7 days. */
export function backupDue(lastBackupAt, sessions, now = Date.now()) {
  const finished = (sessions || []).filter((s) => s.status === 'complete');
  if (!finished.length) return false;
  if (!lastBackupAt) return true;
  const newer = finished.some((s) => (s.endedAt || s.startedAt) > lastBackupAt);
  return newer && now - lastBackupAt > BACKUP_DAYS * 86400000;
}

async function backupReminder(body, app, data) {
  const last = await app.db.getSetting('lastBackupAt', null);
  if (!backupDue(last, data.sessions)) return;
  let ready = prepareBackup(app);
  ready.catch(() => {});
  body.append(h('section', { class: 'card alert backup-reminder', id: 'backup-reminder', role: 'status' },
    h('h2', {}, icon('download'), h('span', { text: 'Time for a backup' })),
    h('p', { text: last
      ? `The last backup of her progress was on ${formatDate(last, true)}, more than ${BACKUP_DAYS} days ago. Her progress is kept only on this device, so a fresh backup protects her recent work.`
      : 'Her progress is kept only on this device and has not been backed up yet. A backup takes a few seconds.' }),
    h('div', { class: 'row wrap' },
      button('Back up now', { icon: 'download', cls: 'btn-primary', onClick: () => { backUpNow(app, ready); ready = prepareBackup(app); ready.catch(() => {}); } }),
      h('a', { href: '#/parent/settings', class: 'btn btn-ghost' }, h('span', { text: 'More about backups' })))));
}

function tile(ic, value, label) {
  return h('div', { class: 'tile' }, icon(ic), h('b', { text: value }), h('span', { text: label }));
}

// ---------------------------------------------------------------- chapters

function chaptersPage(body, data) {
  const { sessions, attempts, topics } = data;
  const mastery = subtopicMastery(attempts);
  // answers by book section; an answer saved before sections existed is placed by its question
  data.qmap ||= indexQuestions(topics, data.papers || []);
  const secs = sectionTally(attempts, (a) => a.bookSection || (data.qmap.get(a.questionId) || {}).bookSection);
  const cur = currentTopic(sessions);
  const lastAt = new Map();
  for (const a of attempts) lastAt.set(a.topicId, Math.max(lastAt.get(a.topicId) || 0, a.answeredAt));
  const curTopic = topics.find((t) => t.topicId === cur);
  body.append(h('section', { class: 'card' }, h('p', {}, h('strong', { text: 'Chapter she is on now: ' }), curTopic ? `${subjectTitle(curTopic.subject)}, ${curTopic.title}` : 'none yet')));
  for (const s of SUBJECTS) {
    const list = bookOrder(topics.filter((t) => t.subject === s.id));
    if (!list.length) continue;
    const sec = h('section', { class: 'card' }, h('h2', {}, icon(s.id), h('span', { text: s.title })));
    const covered = list.filter((t) => attempts.some((a) => a.topicId === t.topicId)).length;
    sec.append(h('p', { class: 'muted', text: `${covered} of ${list.length} chapters covered.` }));
    for (const t of list) {
      const sum = topicSummary(t, mastery, attempts);
      const det = h('details', { class: `chapter${t.topicId === cur ? ' is-current' : ''}` },
        h('summary', {},
          h('span', { class: 'topic-num', 'aria-hidden': (t.bookSections || []).length ? 'true' : null, text: Number.isInteger(t.bookChapterNumber) ? String(t.bookChapterNumber) : (t.bookSections || []).length ? '+' : String(t.order) }),
          h('span', { class: 'chapter-body' },
            (t.bookSections || []).length ? h('span', { class: 'muted small', text: Number.isInteger(t.bookChapterNumber) ? chapterLabel(t) : 'Extra topic (not a book chapter)' }) : null,
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
      if ((t.bookSections || []).length) {
        // the same chapter by book section, with the page, from every answer she has given
        det.append(h('table', { class: 'tbl' },
          h('thead', {}, h('tr', {}, h('th', { text: 'Book section' }), h('th', { class: 'num', text: 'Page' }), h('th', { class: 'num', text: 'Answers' }), h('th', { text: 'Right' }))),
          h('tbody', {}, ...t.bookSections.map((b) => {
            const g = secs.get(b.id);
            return h('tr', {},
              h('td', { text: `${b.id} ${b.title}` }),
              h('td', { class: 'num', text: b.page != null ? String(b.page) : '–' }),
              h('td', { class: 'num', text: String(g ? g.answers : 0) }),
              h('td', {}, g ? meter(g.correct / g.answers, { label: `${b.id}: ${pct(g.correct / g.answers)} right` }) : h('span', { class: 'muted', text: '–' })));
          }))));
      }
      sec.append(det);
    }
    body.append(sec);
  }
  // mock papers: every attempt, with its score
  const paperSessions = sessions.filter((s) => s.mode === 'paper').sort((a, b) => a.startedAt - b.startedAt);
  if (paperSessions.length) {
    body.append(h('section', { class: 'card' }, h('h2', {}, icon('paper'), h('span', { text: 'Mock papers' })),
      h('table', { class: 'tbl' },
        h('thead', {}, h('tr', {}, h('th', { text: 'Paper' }), h('th', { text: 'Date' }), h('th', { class: 'num', text: 'Marks' }), h('th', { class: 'num', text: 'Time' }))),
        h('tbody', {}, ...paperSessions.map((s) => h('tr', {},
          h('td', {}, h('a', { href: `#/parent/report/${encodeURIComponent(s.id)}`, text: `${s.paperTitle || s.topicTitle}${s.attemptNo > 1 ? `, ${attemptLabel(s.attemptNo)}` : ''}` })),
          h('td', { text: formatDate(s.startedAt) }),
          h('td', { class: 'num', text: s.score ? `${s.score.earned} / ${s.score.max}` : '–' }),
          h('td', { class: 'num', text: formatDuration(s.timeUsedSec) })))))));
  }
  body.append(h('p', { class: 'muted small', text: 'Mastery weighs her most recent 20 answers in each subtopic, with newer and harder questions counting more. "Mastered" needs 85% or more over at least 6 answers.' }));
}

// ---------------------------------------------------------------- reports

/** The archive: a score trend, then every report by month, newest first. Built automatically. */
async function reportsPage(body, app, data) {
  const reports = (await app.source.getAll('reports')).filter((r) => r && r.score).sort((a, b) => b.startedAt - a.startedAt);
  if (!reports.length) {
    body.append(h('section', { class: 'card' }, h('p', { text: app.mode === 'linked' ? 'No reports yet. Each finished session adds one here by itself.' : 'No reports yet. A report is made after every practice session.' })));
    return;
  }
  const trendCard = h('section', { class: 'card' }, h('h2', {}, icon('chart'), h('span', { text: 'How her scores are moving' })));
  body.append(trendCard);
  const trend = trendChart(data.sessions, { host: trendCard, width: Math.max(280, Math.min(840, (trendCard.clientWidth || 640) - 40)) });
  trendCard.append(trend || h('p', { class: 'muted', text: 'The trend appears after her second session.' }));
  const byMonth = new Map();
  for (const r of reports) {
    const d = new Date(r.startedAt);
    const k = `${d.toLocaleString('en-GB', { month: 'long' })} ${d.getFullYear()}`;
    if (!byMonth.has(k)) byMonth.set(k, []);
    byMonth.get(k).push(r);
  }
  for (const [month, list] of byMonth) {
    const avg = list.reduce((t, r) => t + (r.score.pct || 0), 0) / list.length;
    body.append(h('section', { class: 'card' },
      h('div', { class: 'row space' }, h('h2', { text: month }), h('span', { class: 'muted small', text: `${list.length} session${list.length === 1 ? '' : 's'} · average ${pct(avg)}` })),
      h('ul', { class: 'report-list' }, ...list.map((r) => h('li', {}, h('a', { href: `#/parent/report/${encodeURIComponent(r.sessionId)}`, class: 'report-row' },
        h('span', { class: 'rr-date', text: `${formatDate(r.startedAt, true)}, ${formatTime(r.startedAt)}` }),
        h('span', { class: 'rr-title', text: r.title }),
        h('span', { class: 'rr-score' }, meter(r.score.pct, { label: `Score ${pct(r.score.pct)}` })),
        h('span', { class: 'rr-time muted small', text: `${r.score.correct} of ${r.score.total} right · ${formatDuration(r.timeUsedSec)}` }),
        icon('right', { cls: 'chev' })))))));
  }
}

async function reportPage(body, app, id, data) {
  const r = await app.source.get('reports', id);
  if (!r) {
    body.append(h('p', { class: 'card', text: 'That report was not found.' }));
    return;
  }
  const linked = app.mode === 'linked';
  const attempts = data.attempts.filter((a) => a.sessionId === r.sessionId);
  const details = h('div', { class: 'report-body' });
  details.innerHTML = reportBodyHtml(r); // every value in it is escaped by reportBodyHtml
  const card = h('section', { class: 'card' },
    h('p', {}, h('a', { href: '#/parent/reports' }, icon('left', { size: 18 }), h('span', { text: 'All reports' }))));
  body.append(card);
  card.append(visualReport(r, { attempts, sessions: data.sessions, source: app.source, host: card, questions: sessionQuestions(data, r.sessionId, attempts) }));
  card.append(
    h('div', { class: 'row wrap report-actions' },
      linked ? null : button('Send to Dad by email', { icon: 'mail', cls: 'btn-primary', onClick: () => sendReport(app, r) }),
      button('Copy report', { icon: 'download', cls: linked ? 'btn-primary' : 'btn-ghost', onClick: () => copyReport(r) }),
      button('Save or share (web page)', { icon: 'share', cls: 'btn-ghost', onClick: () => shareReport(r) }),
      button('Download data (JSON)', { icon: 'download', cls: 'btn-ghost', onClick: () => downloadFile(reportFileName(r, 'json'), JSON.stringify(r, null, 2), 'application/json') })),
    h('details', { class: 'report-details' }, h('summary', { text: 'Every detail in words (by part, by skill, every question not fully right)' }), details));
}

// ---------------------------------------------------------------- settings (linked mode)

const USERNAME = /^[a-z0-9][a-z0-9._-]{2,29}$/;

/** Show a page, even when it is the one already in the address bar (then no hashchange fires). */
function goTo(hash) {
  if (location.hash === hash) window.dispatchEvent(new HashChangeEvent('hashchange'));
  else location.hash = hash;
}

function field(id, label, attrs) {
  const input = h('input', { id, class: 'answer-input', ...attrs });
  return { input, el: h('div', { class: 'field' }, h('label', { for: id, text: label }), input) };
}

/** Linked mode settings: her account (create, reset password), export, about. */
async function linkedSettingsPage(body, app, data, firstRun) {
  const backend = app.backend;
  // her account(s)
  const kids = app.children || [];
  const accounts = h('section', { class: 'card stack' }, h('h2', {}, icon('lock'), h('span', { text: kids.length ? 'Her account' : 'Create her account' })));
  if (firstRun) {
    accounts.append(h('p', { text: 'Make a username and password for your daughter. She signs in with them on her own device, and every session she finishes then appears here by itself.' }));
  }
  for (const c of kids) {
    const pw = field(`pw-${c.id}`, `New password for ${c.username}`, { type: 'password', autocomplete: 'new-password', maxlength: '72', minlength: '8' });
    const msg = h('p', { class: 'form-msg', role: 'status' });
    const form = h('form', { class: 'stack' }, pw.el, msg, h('button', { type: 'submit', class: 'btn btn-ghost' }, icon('lock'), h('span', { text: 'Change her password' })));
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (pw.input.value.length < 8) { msg.textContent = 'Use at least 8 characters.'; return; }
      try {
        const res = await backend.invoke('manage-student', { action: 'set-password', studentId: c.id, password: pw.input.value });
        pw.input.value = '';
        msg.textContent = res && res.signedOut
          ? 'Password changed, and she is signed out on her devices. She signs in again with the new one.'
          : 'Password changed. Devices she is already signed in on could not be signed out, so they stay signed in until she signs out there.';
      } catch (err) {
        msg.textContent = err.message || 'Could not change the password.';
      }
    });
    accounts.append(h('div', { class: 'account-row' },
      h('p', {}, h('strong', { text: c.display_name || c.username }), h('span', { class: 'muted', text: ` · username ${c.username}` })),
      h('details', {}, h('summary', { text: 'Reset her password' }), form)));
  }
  if (kids.length < 5) {
    const u = field('new-user', 'Username for her (small letters and numbers, 3 to 30)', { type: 'text', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', maxlength: '30' });
    const n = field('new-name', 'Name shown in the app (optional)', { type: 'text', autocomplete: 'off', maxlength: '40' });
    const p1 = field('new-pw', 'Password for her (8 or more characters)', { type: 'password', autocomplete: 'new-password', maxlength: '72' });
    const p2 = field('new-pw2', 'Type the password again', { type: 'password', autocomplete: 'new-password', maxlength: '72' });
    const msg = h('p', { class: 'form-msg', role: 'alert' });
    const submit = h('button', { type: 'submit', class: 'btn btn-primary' }, icon('check'), h('span', { text: 'Create her account' }));
    const form = h('form', { class: 'stack' }, u.el, n.el, p1.el, p2.el, msg, submit);
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = u.input.value.trim().toLowerCase();
      if (!USERNAME.test(username)) { msg.textContent = 'The username must be 3 to 30 characters: small letters, numbers, dots, dashes or underscores, starting with a letter or number.'; return; }
      if (p1.input.value.length < 8) { msg.textContent = 'The password must be at least 8 characters.'; return; }
      if (p1.input.value !== p2.input.value) { msg.textContent = 'The two passwords do not match.'; return; }
      submit.disabled = true;
      try {
        await backend.invoke('manage-student', { action: 'create', username, password: p1.input.value, displayName: n.input.value.trim() });
        p1.input.value = '';
        p2.input.value = '';
        await connect(app);
        await dialog('Her account is ready', `She signs in on her own device with the username "${username}" and the password you chose. Choose "I am practising" on the sign-in page.`, [{ label: 'OK', value: true, cls: 'btn-primary' }]);
        goTo('#/parent/overview');
      } catch (err) {
        msg.textContent = err.message || 'The account could not be created.';
      } finally {
        submit.disabled = false;
      }
    });
    if (kids.length) accounts.append(h('details', {}, h('summary', { text: 'Add another student account' }), form));
    else accounts.append(form);
  }
  accounts.append(h('p', { class: 'small muted', text: 'Her account has no email address: she signs in with the username. You can reset her password here at any time; that also signs her out on every device.' }));
  body.append(accounts);

  if (data) {
    // export for the Chief Learning Officer
    const t = totals(data.sessions);
    body.append(h('section', { class: 'card' }, h('h2', {}, icon('download'), h('span', { text: 'Her progress file' })),
      h('p', { class: 'small', text: `Her account holds ${t.sessions} sessions and ${data.attempts.length} answers.` }),
      button('Export her progress (a backup file)', { icon: 'download', cls: 'btn-primary', onClick: async () => {
        const exp = await buildExport(app.source, { appVersion: APP_VERSION, contentVersion: app.manifest.contentVersion });
        const res = await shareOrDownload(exportFileName(), JSON.stringify(exp, null, 1), 'application/json', 'Study Practice progress');
        if (res === 'downloaded') toast('Progress file saved.');
      } }),
      h('p', { class: 'small muted', text: 'The file has every answer with its question, timing and result, for a deeper analysis by the Chief Learning Officer.' })));
  }

  body.append(h('section', { class: 'card' }, h('h2', {}, icon('info'), h('span', { text: 'About' })),
    h('p', { class: 'small muted', text: `Study Practice ${APP_VERSION}, linked mode${backend && backend.kind === 'mock' ? ' (laptop preview with a pretend server)' : ''}. Her sessions are stored in your Supabase project; only you and she can see them. Question banks version ${app.manifest.contentVersion || '-'}.` })));
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
      await dialog('Backup restored', `Added ${a.sessions} sessions, ${a.attempts} answers and ${a.reports} reports${res.fromDevice ? ` from "${res.fromDevice}"` : ''}. ${res.skipped.sessions} sessions were already on this device and were kept as they were.${res.invalid ? ` ${res.invalid} damaged records were skipped.` : ''}`, [{ label: 'OK', value: true, cls: 'btn-primary' }]);
    } catch (e) {
      await dialog('Could not restore', e.message, [{ label: 'OK', value: true, cls: 'btn-primary' }]);
    }
    fileIn.value = '';
  });
  const t = totals(data.sessions);
  const lastBackup = await db.getSetting('lastBackupAt', null);
  let ready = prepareBackup(app);
  ready.catch(() => {});
  body.append(h('section', { class: 'card', id: 'backup' }, h('h2', {}, icon('download'), h('span', { text: 'Back up her progress' })),
    h('p', { class: 'notice' }, icon('info'), h('span', { text: 'Her progress is kept only on this device. If the device is lost or reset, or the browser clears its data, it is gone. A backup is a small file you keep somewhere safe (Files, iCloud Drive, or email it to yourself). Restoring a backup adds what is missing and never deletes anything, so it is also how to move her progress to another device.' })),
    h('p', { class: 'small', text: `This device holds ${t.sessions} session${t.sessions === 1 ? "" : "s"} and ${data.attempts.length} answer${data.attempts.length === 1 ? "" : "s"}. ${lastBackup ? `Last backup: ${formatDate(lastBackup, true)} at ${formatTime(lastBackup)}.` : 'No backup made on this device yet.'}` }),
    h('div', { class: 'row wrap' },
      button('Back up progress', { icon: 'download', cls: 'btn-primary', onClick: () => { backUpNow(app, ready); ready = prepareBackup(app); ready.catch(() => {}); } }),
      h('label', { for: 'importfile', class: 'btn btn-ghost', tabindex: '0', role: 'button', onKeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileIn.click(); } } }, icon('upload'), h('span', { text: 'Restore from a backup' })),
      fileIn),
    h('p', { class: 'small muted', text: 'On an iPad or iPhone, "Back up progress" opens the share sheet: choose "Save to Files". The file has every answer with its question, timing and result, so it is also what the Chief Learning Officer needs for a deeper analysis. It does not contain the PIN or the parent email.' }),
    labelForm));

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
    storageText = `${persisted ? 'The browser has agreed to keep this data.' : 'The browser may clear this data if the device runs short of space, so back up now and then.'}${est && est.usage != null ? ` About ${Math.max(1, Math.round(est.usage / 1024))} KB used.` : ''}`;
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
