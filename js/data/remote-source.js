// What the parent area reads in linked mode: his daughter's sessions, answers and reports,
// fetched from Supabase with HIS token (Row Level Security only returns a linked child's rows).
//
// It offers the same read methods as the on-device database (get, getAll, getAllByIndex), so
// the parent pages work unchanged on either. It is read-only: a parent never writes her data.
// Results are kept for a short while so moving between tabs does not refetch everything.

import { checkSession, checkAttempt, checkReport } from '../exportimport.js';

const TTL = 60000;
// her rows are checked field by field, like an imported file, before any page uses them; a
// damaged or hand-made row is left out (and counted in `skipped`)
const CHECK = { sessions: checkSession, attempts: checkAttempt, reports: checkReport };
const STORES = { sessions: 'sessions', attempts: 'attempts', reports: 'reports' };

export class RemoteSource {
  constructor(backend, studentId, opts = {}) {
    this.backend = backend;
    this.studentId = studentId;
    this.now = opts.now || (() => Date.now());
    this.cache = new Map();
    this.working = new Map();
    this.readOnly = true;
  }

  refresh() {
    this.cache.clear();
  }

  async _all(store) {
    const hit = this.cache.get(store);
    if (hit && this.now() - hit.at < TTL) return hit.rows;
    const eq = { student_id: this.studentId };
    let rows;
    if (store === 'sessions') {
      rows = (await this.backend.select('sessions', { select: 'data', eq, order: 'started_at.asc' })).map((r) => r.data);
    } else if (store === 'attempts') {
      // her working strokes are not fetched in bulk: see workingStrokes()
      rows = (await this.backend.select('attempts', { select: 'id,data,working_path', eq, order: 'answered_at.asc' }))
        .map((r) => ({ ...r.data, workingPath: r.working_path || null }));
    } else if (store === 'reports') {
      rows = (await this.backend.select('reports', { select: 'data', eq, order: 'created_at.asc' })).map((r) => r.data);
    } else {
      rows = [];
    }
    const ok = rows.filter((r) => { try { return CHECK[store](r); } catch { return false; } });
    this.skipped = { ...(this.skipped || {}), [store]: rows.length - ok.length };
    rows = ok;
    this.cache.set(store, { at: this.now(), rows });
    return rows;
  }

  async getAll(store) {
    if (!STORES[store]) return [];
    return (await this._all(store)).map((x) => x);
  }

  async get(store, key) {
    const rows = await this._all(store);
    if (store === 'reports') return rows.find((r) => r.sessionId === key) || null;
    return rows.find((r) => r.id === key) || null;
  }

  async getAllByIndex(store, index, value) {
    return (await this._all(store)).filter((r) => r[index] === value);
  }

  /** Her vector working for one answer (fetched on demand, then kept). */
  async workingStrokes(attemptId) {
    if (this.working.has(attemptId)) return this.working.get(attemptId);
    const rows = await this.backend.select('attempts', { select: 'id,working_strokes', eq: { id: attemptId, student_id: this.studentId }, limit: 1 });
    const strokes = rows[0] ? rows[0].working_strokes : null;
    this.working.set(attemptId, strokes);
    return strokes;
  }

  async getSetting() {
    return null;
  }
}

/** Her working on one answer, wherever it is stored (on the device, or online). */
export async function workingFor(source, attempt) {
  if (attempt.working && attempt.working.strokes) return attempt.working.strokes;
  if (source && source.workingStrokes && (attempt.hasWorking || attempt.workingPath)) return source.workingStrokes(attempt.id);
  return null;
}
