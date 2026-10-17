// Export and import of progress as one JSON file.
//
// The export is complete enough for a later Claude analysis by the Chief Learning Officer:
// every attempt with its question id, the answer given, right or not, marks, time on the
// question, and the session it belonged to (with the session's own details). It never contains
// the parent PIN hash or the parent email address.
//
// Import merges: records already on this device (same id) are kept, new ones are added. So
// progress from a laptop and a tablet can be combined in either direction.

import { validQuestion } from './hooks.js';
export const EXPORT_FORMAT = 'study-practice-progress';
export const EXPORT_VERSION = 1;

export async function buildExport(db, meta = {}) {
  const sessions = (await db.getAll('sessions')).filter((s) => s.status === 'complete');
  const attempts = await db.getAll('attempts');
  const reports = await db.getAll('reports');
  sessions.sort((a, b) => a.startedAt - b.startedAt);
  attempts.sort((a, b) => a.answeredAt - b.answeredAt || a.position - b.position);
  reports.sort((a, b) => a.startedAt - b.startedAt);
  const deviceId = await db.getSetting('deviceId');
  return {
    format: EXPORT_FORMAT,
    formatVersion: EXPORT_VERSION,
    exportedAt: new Date(meta.now ?? Date.now()).toISOString(),
    app: { name: 'Study Practice', version: meta.appVersion || '' },
    contentVersion: meta.contentVersion || '',
    device: { id: deviceId || '', label: (await db.getSetting('deviceLabel')) || '' },
    guide: {
      sessions: 'One record per finished practice session: subject, topicId, mode (topic/subtopic/weak/mixed), durationMin, limitSec, timeUsedSec, startedAt/endedAt (ms since 1970), questionIds in the order shown, score; instances: the generated questions of that session in full (id -> question, with generatorId and seed).',
      attempts: 'One record per question in a finished session: questionId, topicId, subtopicId, skill, type, difficulty, marks, response (raw), responseText, answered, correct, earned, fraction, misconceptions shown, misconceptionCodes (catalogue codes of those misconceptions), generated (generatorId, seed, difficulty for a generated question), timeSec on the question, flagged.',
      reports: 'The parent report made after each session.',
    },
    summary: {
      sessions: sessions.length,
      attempts: attempts.length,
      reports: reports.length,
      first: sessions[0] ? new Date(sessions[0].startedAt).toISOString() : null,
      last: sessions.length ? new Date(sessions[sessions.length - 1].startedAt).toISOString() : null,
    },
    sessions,
    attempts,
    reports,
  };
}

// An imported file is checked field by field: every value the app reads or shows must have the
// right type, so a damaged or hand-edited file can never break a page. Records that fail are
// counted and left out.
export const MAX_IMPORT_BYTES = 50 * 1024 * 1024;

const isObj = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
const isStr = (x) => typeof x === 'string' && x.length > 0 && x.length < 300;
const isText = (x, max = 5000) => typeof x === 'string' && x.length <= max;
const optText = (x, max = 5000) => x == null || isText(x, max);
const isNum = (x) => typeof x === 'number' && Number.isFinite(x);
const optNum = (x) => x == null || isNum(x);
const isBool = (x) => typeof x === 'boolean';
const optBool = (x) => x == null || isBool(x);
const listOf = (x, check, max = 5000) => Array.isArray(x) && x.length <= max && x.every(check);
const SUBJECTS = ['maths', 'science'];
// a session's generated questions: each one complete and well formed (js/hooks.js)
const checkInstances = (x) => x == null || (isObj(x) && Object.keys(x).length <= 1000 && Object.entries(x).every(([k, q]) => isStr(k) && validQuestion(q)));
const checkRef = (g) => g == null || (isObj(g) && isStr(g.generatorId) && isNum(g.seed) && optNum(g.difficulty) && optText(g.v, 50));
const MODES = ['topic', 'subtopic', 'weak', 'mixed'];

function checkScore(s) {
  return isObj(s) && ['earned', 'max', 'pct', 'correct', 'total', 'answered'].every((k) => isNum(s[k])) && optNum(s.unanswered);
}

export function checkSession(s) {
  return isObj(s) && isStr(s.id) && SUBJECTS.includes(s.subject) && MODES.includes(s.mode) && s.status === 'complete'
    && isNum(s.startedAt) && optNum(s.endedAt) && isNum(s.durationMin) && optNum(s.limitSec) && optNum(s.timeUsedSec)
    && optText(s.topicId, 300) && optText(s.topicTitle, 500) && optText(s.subtopicId, 300) && optText(s.subtopicTitle, 500)
    && optBool(s.submittedEarly) && optBool(s.timedOut)
    && listOf(s.questionIds, isStr, 1000) && checkScore(s.score) && checkInstances(s.instances);
}

const isResponse = (r) => r == null || isBool(r) || isNum(r) || isText(r, 1000) || listOf(r, (x) => x == null || isNum(x), 50);

export function checkAttempt(a) {
  return isObj(a) && isStr(a.id) && isStr(a.sessionId) && isStr(a.questionId) && isNum(a.answeredAt)
    && isBool(a.correct) && optBool(a.answered) && optBool(a.flagged)
    && optText(a.topicId, 300) && optText(a.subtopicId, 300) && optText(a.subject, 50) && optText(a.skill, 500) && optText(a.type, 50)
    && optNum(a.difficulty) && optNum(a.marks) && optNum(a.position) && optNum(a.earned) && optNum(a.fraction) && optNum(a.timeSec)
    && isResponse(a.response) && optText(a.responseText)
    && (a.misconceptions == null || listOf(a.misconceptions, (m) => isObj(m) && isText(m.note) && optText(m.key, 300), 50))
    && (a.misconceptionCodes == null || listOf(a.misconceptionCodes, (c) => isStr(c) && c.length <= 100, 20)) && checkRef(a.generated);
}

const isGroup = (g) => isObj(g) && isText(g.title, 500) && ['total', 'correct', 'pct'].every((k) => isNum(g[k])) && optText(g.topicTitle, 500);
const isStrList = (x) => listOf(x, (s) => isText(s), 200);

export function checkReport(r) {
  if (!(isObj(r) && isStr(r.sessionId) && isNum(r.startedAt) && isText(r.title, 500) && isText(r.focus, 500))) return false;
  if (!(checkScore(r.score) && isNum(r.score.unanswered))) return false;
  if (!(isNum(r.durationMin) && isNum(r.limitSec) && isNum(r.timeUsedSec) && isNum(r.avgSecPerAnswer) && isNum(r.quickWrong))) return false;
  if (!(isObj(r.byDifficulty) && [1, 2, 3].every((d) => isObj(r.byDifficulty[d]) && isNum(r.byDifficulty[d].total) && isNum(r.byDifficulty[d].correct)))) return false;
  if (!(listOf(r.bySubtopic, isGroup, 200) && listOf(r.bySkill, isGroup, 200))) return false;
  if (!(isStrList(r.understands) && isStrList(r.needsWork) && isStrList(r.recommendations))) return false;
  if (!(r.strongSkills == null || isStrList(r.strongSkills)) || !(r.weakSkills == null || isStrList(r.weakSkills))) return false;
  if (!listOf(r.misconceptions, (m) => isObj(m) && isText(m.note) && optText(m.subtopic, 500), 200)) return false;
  if (!(r.misconceptionCodes == null || listOf(r.misconceptionCodes, (c) => isObj(c) && isStr(c.code) && isNum(c.count) && optText(c.label, 500), 200))) return false;
  if (!listOf(r.mistakes, (m) => isObj(m) && isNum(m.position) && isNum(m.earned) && isNum(m.marks)
    && ['prompt', 'subtopic', 'yourAnswer', 'correctAnswer'].every((k) => isText(m[k])) && optText(m.skill, 500), 1000)) return false;
  if (!listOf(r.masteryAfter, (m) => isObj(m) && isText(m.title, 500) && isNum(m.score) && optText(m.level, 100), 200)) return false;
  const c = r.comparison;
  if (!(isObj(c) && optNum(c.previousPct) && optNum(c.improvement) && optNum(c.previousBest) && (c.personalBest == null || isBool(c.personalBest) || c.personalBest === 'first'))) return false;
  return optNum(r.streakDays) && optBool(r.timedOut) && optBool(r.submittedEarly);
}

/** Read and check an export file's text. Throws an Error with a plain message if it is not one. */
export function parseExport(text) {
  if (typeof text !== 'string' || text.length > MAX_IMPORT_BYTES) throw new Error('This file is too large to be a progress file.');
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('This file is not a progress file (it is not valid JSON).');
  }
  if (!data || data.format !== EXPORT_FORMAT) throw new Error('This file is not a Study Practice progress file.');
  if (!(data.formatVersion >= 1 && data.formatVersion <= EXPORT_VERSION)) {
    throw new Error('This progress file was made by a newer version of the app. Update the app first.');
  }
  for (const k of ['sessions', 'attempts', 'reports']) {
    if (!Array.isArray(data[k])) throw new Error(`The progress file is damaged (no ${k} list).`);
  }
  const bad = data.sessions.filter((s) => !checkSession(s)).length
    + data.attempts.filter((a) => !checkAttempt(a)).length
    + data.reports.filter((r) => !checkReport(r)).length;
  return { data, bad };
}

/** Merge an export into the database. Returns counts of records added and already present. */
export async function importExport(db, text) {
  const { data, bad } = parseExport(text);
  const have = {
    sessions: new Set((await db.getAll('sessions')).map((s) => s.id)),
    attempts: new Set((await db.getAll('attempts')).map((a) => a.id)),
    reports: new Set((await db.getAll('reports')).map((r) => r.sessionId)),
  };
  const writes = [];
  const added = { sessions: 0, attempts: 0, reports: 0 };
  const skipped = { sessions: 0, attempts: 0, reports: 0 };
  const take = (store, list, check, keyOf) => {
    for (const rec of list) {
      if (!check(rec)) continue;
      if (have[store].has(keyOf(rec))) {
        skipped[store] += 1;
        continue;
      }
      have[store].add(keyOf(rec));
      writes.push({ store, value: rec });
      added[store] += 1;
    }
  };
  take('sessions', data.sessions, checkSession, (s) => s.id);
  take('attempts', data.attempts, checkAttempt, (a) => a.id);
  take('reports', data.reports, checkReport, (r) => r.sessionId);
  await db.putMany(writes);
  return { added, skipped, invalid: bad, fromDevice: data.device && data.device.label ? data.device.label : '' };
}

export function exportFileName(now = Date.now()) {
  const d = new Date(now);
  const p = (n) => String(n).padStart(2, '0');
  return `study-practice-progress-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}.json`;
}
