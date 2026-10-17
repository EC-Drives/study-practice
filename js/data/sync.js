// The offline queue (linked mode, student side).
//
// Every finished session is first saved on the device, exactly as in local mode, and its id is
// put in the "outbox". The queue then sends it online: her working images to private storage,
// then the session, its answers and its report as rows. When there is no connection the item
// simply waits; it is sent when the device is back online, when the app is opened again, or on
// the next attempt a minute later. Sending is safe to repeat: rows and images are keyed by id,
// so a session sent twice is still one session.

import { BackendError } from './supabase-backend.js';

export const WORKING_BUCKET = 'working';
const RETRY_MS = 60000;

const iso = (ms) => (Number.isFinite(ms) ? new Date(ms).toISOString() : null);
const safe = (s) => String(s).replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 120);

/** Storage path of the PNG of her working on one question. */
export function workingPath(userId, sessionId, questionId) {
  return `${userId}/${safe(sessionId)}/${safe(questionId)}.png`;
}

export function dataUrlToBlob(url) {
  const m = /^data:([^;,]+)(;base64)?,(.*)$/s.exec(String(url || ''));
  if (!m) return null;
  const bytes = m[2] ? Uint8Array.from(atob(m[3]), (c) => c.charCodeAt(0)) : new TextEncoder().encode(decodeURIComponent(m[3]));
  return new Blob([bytes], { type: m[1] });
}

/** The database rows for one finished session (see supabase/migrations). */
export function rowsFor(userId, session, attempts, report) {
  const s = session.score || {};
  const sessionRow = {
    id: session.id,
    student_id: userId,
    subject: session.subject,
    topic_id: session.topicId || null,
    mode: session.mode || null,
    started_at: iso(session.startedAt),
    ended_at: iso(session.endedAt),
    score_pct: Number.isFinite(s.pct) ? Math.max(0, Math.min(1, s.pct)) : null,
    questions: (session.questionIds || []).length,
    data: { ...session, state: null, syncedAt: undefined },
  };
  const uploads = [];
  const attemptRows = attempts.map((a) => {
    const { working, ...rest } = a;
    let path = null;
    if (working && working.thumb) {
      path = workingPath(userId, a.sessionId, a.questionId);
      uploads.push({ path, dataUrl: working.thumb });
    }
    return {
      id: a.id,
      session_id: a.sessionId,
      student_id: userId,
      question_id: a.questionId,
      correct: !!a.correct,
      answered_at: iso(a.answeredAt),
      data: { ...rest, hasWorking: !!(working && working.strokes) },
      working_strokes: working && working.strokes ? working.strokes : null,
      working_path: path,
    };
  });
  const reportRow = report ? { session_id: report.sessionId, student_id: userId, created_at: iso(report.createdAt) || iso(Date.now()), data: report } : null;
  return { sessionRow, attemptRows, reportRow, uploads };
}

export class SyncQueue {
  /** opts: { db (the student's local Db), backend, userId, onStatus(status), now } */
  constructor(opts) {
    this.db = opts.db;
    this.backend = opts.backend;
    this.userId = opts.userId;
    this.onStatus = opts.onStatus || (() => {});
    this.now = opts.now || (() => Date.now());
    this.running = null;
    this.timer = null;
    this.listeners = [];
    this.lastStatus = null;
  }

  async enqueue(sessionId) {
    const existing = await this.db.get('outbox', sessionId);
    await this.db.put('outbox', { sessionId, queuedAt: existing ? existing.queuedAt : this.now(), tries: 0, nextTryAt: 0, lastError: '' });
    await this.report();
  }

  async pending() {
    return (await this.db.getAll('outbox')).length;
  }

  async report(extra = {}) {
    const n = await this.pending();
    const status = { pending: n, ...extra };
    this.lastStatus = status;
    this.onStatus(status);
    return status;
  }

  /** Send everything waiting. Only one run at a time; a second call joins the first. */
  flush(opts = {}) {
    if (!this.running) {
      this.running = this._flush(opts).finally(() => { this.running = null; });
    }
    return this.running;
  }

  async _flush({ force = false } = {}) {
    const items = (await this.db.getAll('outbox')).sort((a, b) => a.queuedAt - b.queuedAt);
    const result = { sent: 0, failed: 0, offline: false, signedOut: false };
    for (const item of items) {
      if (!force && item.nextTryAt && item.nextTryAt > this.now()) continue;
      try {
        await this._send(item.sessionId);
        await this.db.delete('outbox', item.sessionId);
        result.sent += 1;
      } catch (e) {
        if (e instanceof BackendError && e.offline) { result.offline = true; break; }
        if (e instanceof BackendError && e.status === 401) { result.signedOut = true; break; }
        const tries = (item.tries || 0) + 1;
        await this.db.put('outbox', { ...item, tries, lastError: String(e && e.message ? e.message : e).slice(0, 300), nextTryAt: this.now() + Math.min(30 * 60000, RETRY_MS * 2 ** (tries - 1)) });
        result.failed += 1;
      }
    }
    await this.report(result);
    return result;
  }

  async _send(sessionId) {
    const session = await this.db.get('sessions', sessionId);
    if (!session || session.status !== 'complete') return; // nothing to send (removed or unfinished)
    const attempts = await this.db.getAllByIndex('attempts', 'sessionId', sessionId);
    const report = await this.db.get('reports', sessionId);
    const { sessionRow, attemptRows, reportRow, uploads } = rowsFor(this.userId, session, attempts, report);
    for (const u of uploads) {
      const blob = dataUrlToBlob(u.dataUrl);
      if (blob) await this.backend.upload(WORKING_BUCKET, u.path, blob);
    }
    // rows are keyed per student (student_id + id): safe to send again, and no one else's ids matter
    await this.backend.upsert('sessions', [sessionRow], 'student_id,id');
    for (let i = 0; i < attemptRows.length; i += 200) await this.backend.upsert('attempts', attemptRows.slice(i, i + 200), 'student_id,id');
    if (reportRow) await this.backend.upsert('reports', [reportRow], 'student_id,session_id');
    await this.db.put('sessions', { ...session, syncedAt: this.now() });
  }

  /** Send now and whenever the connection comes back, the app returns to the screen, or a minute passes. */
  start(win = globalThis) {
    const kick = () => { this.flush().catch(() => {}); };
    const onVis = () => { if (!win.document || !win.document.hidden) kick(); };
    if (win.addEventListener) {
      win.addEventListener('online', kick);
      this.listeners.push(['online', kick, win]);
    }
    if (win.document && win.document.addEventListener) {
      win.document.addEventListener('visibilitychange', onVis);
      this.listeners.push(['visibilitychange', onVis, win.document]);
    }
    this.timer = setInterval(kick, RETRY_MS);
    kick();
  }

  stop() {
    for (const [ev, fn, target] of this.listeners) target.removeEventListener(ev, fn);
    this.listeners = [];
    clearInterval(this.timer);
    this.timer = null;
  }
}
