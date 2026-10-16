// Export and import of progress as one JSON file.
//
// The export is complete enough for a later Claude analysis by the Chief Learning Officer:
// every attempt with its question id, the answer given, right or not, marks, time on the
// question, and the session it belonged to (with the session's own details). It never contains
// the parent PIN hash or the parent email address.
//
// Import merges: records already on this device (same id) are kept, new ones are added. So
// progress from a laptop and a tablet can be combined in either direction.

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
      sessions: 'One record per finished practice session: subject, topicId, mode (topic/subtopic/weak/mixed), durationMin, limitSec, timeUsedSec, startedAt/endedAt (ms since 1970), questionIds in the order shown, score.',
      attempts: 'One record per question in a finished session: questionId, topicId, subtopicId, skill, type, difficulty, marks, response (raw), responseText, answered, correct, earned, fraction, misconceptions shown, timeSec on the question, flagged.',
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

const isStr = (x) => typeof x === 'string' && x.length > 0 && x.length < 300;
const isNum = (x) => typeof x === 'number' && Number.isFinite(x);

function checkSession(s) {
  return s && isStr(s.id) && isStr(s.subject) && isNum(s.startedAt) && s.status === 'complete' && Array.isArray(s.questionIds);
}
function checkAttempt(a) {
  return a && isStr(a.id) && isStr(a.sessionId) && isStr(a.questionId) && isNum(a.answeredAt) && typeof a.correct === 'boolean';
}
function checkReport(r) {
  return r && isStr(r.sessionId) && isNum(r.startedAt) && r.score && typeof r.score === 'object';
}

/** Read and check an export file's text. Throws an Error with a plain message if it is not one. */
export function parseExport(text) {
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
