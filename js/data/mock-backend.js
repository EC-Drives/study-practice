// An in-memory stand-in for Supabase, with the same interface as SupabaseBackend.
//
// Used by the tests (test/tests-linked.js) and, on this laptop only, by the "?backend=mock"
// preview (the app then works in linked mode without any Supabase project). It is never used on
// the published site: js/data/backend.js only picks it on localhost.
//
// The access rules below are a line-by-line JavaScript copy of the Row Level Security policies
// and constraints in supabase/migrations/*.sql, so the tests exercise the same intent: a student
// reads and writes only her own rows, a parent reads his linked child's rows and writes nothing,
// a signed-out visitor sees nothing, nothing can be deleted.

import { BackendError, memoryStorage } from './supabase-backend.js';

// primary keys, as in the SQL: her rows are keyed per student (student_id + id)
const KEYS = { profiles: ['id'], sessions: ['student_id', 'id'], attempts: ['student_id', 'id'], reports: ['student_id', 'session_id'], ask_log: ['id'] };
export const keyOf = (table, row) => KEYS[table].map((k) => row[k]).join('|');
const WRITABLE = new Set(['sessions', 'attempts', 'reports']); // insert/update policies exist only here
const USERNAME = /^[a-z0-9][a-z0-9._-]{2,29}$/;
const AUTH_KEY = 'study-practice-auth';

let counter = 0;
const uuid = () => {
  if (globalThis.crypto && crypto.randomUUID) return crypto.randomUUID();
  counter += 1;
  return `00000000-0000-4000-8000-${String(counter).padStart(12, '0')}`;
};

const rlsError = () => new BackendError(403, 'new row violates row-level security policy', '42501');

export class MockServer {
  constructor(state = null) {
    this.users = new Map(); // id -> { id, email, password }
    this.tables = Object.fromEntries(Object.keys(KEYS).map((t) => [t, new Map()]));
    this.objects = new Map(); // "bucket/path" -> { type, b64, size, owner }
    this.offline = false; // simulate no connection
    this.failNext = 0; // simulate server errors (count)
    this.studentDomain = 'students.study-practice.invalid';
    this.sessionEpoch = new Map(); // user id -> number: end_sessions() bumps it, signing them out everywhere
    this.log = []; // every call, for tests
    this.onChange = null;
    if (state) this.load(state);
  }

  // ------------------------------------------------------------ persistence (laptop preview)
  dump() {
    return {
      users: [...this.users.values()],
      tables: Object.fromEntries(Object.entries(this.tables).map(([t, m]) => [t, [...m.values()]])),
      objects: [...this.objects.entries()],
    };
  }

  load(s) {
    for (const u of s.users || []) this.users.set(u.id, u);
    for (const [t, rows] of Object.entries(s.tables || {})) for (const r of rows) this.tables[t].set(keyOf(t, r), r);
    for (const [k, v] of s.objects || []) this.objects.set(k, v);
  }

  changed() {
    if (this.onChange) this.onChange(this);
  }

  // ------------------------------------------------------------ admin (service role / SQL editor)
  addUser(email, password) {
    const id = uuid();
    this.users.set(id, { id, email: email.toLowerCase(), password });
    this.changed();
    return id;
  }

  /** The make_parent() SQL function. */
  makeParent(email, displayName = 'Parent') {
    const u = [...this.users.values()].find((x) => x.email === email.toLowerCase());
    if (!u) throw new Error('No user has that email address.');
    this.tables.profiles.set(u.id, { id: u.id, role: 'parent', parent_id: null, username: null, display_name: displayName, created_at: new Date().toISOString() });
    this.changed();
    return u.id;
  }

  // ------------------------------------------------------------ policy helpers (mirror the SQL)
  profile(uid) {
    return this.tables.profiles.get(uid) || null;
  }

  isStudent(uid) {
    const p = this.profile(uid);
    return !!p && p.role === 'student';
  }

  isParentOf(uid, studentId) {
    const p = this.profile(studentId);
    return !!uid && !!p && p.role === 'student' && p.parent_id === uid;
  }

  canReadFolder(uid, folder) {
    return !!uid && (folder === uid || this.isParentOf(uid, folder));
  }

  canSelect(table, row, uid) {
    if (!uid) return false; // anon: no policy grants anything
    switch (table) {
      case 'profiles': return row.id === uid || row.parent_id === uid;
      case 'sessions':
      case 'attempts':
      case 'reports': return row.student_id === uid || this.isParentOf(uid, row.student_id);
      case 'ask_log': return row.parent_id === uid;
      default: return false;
    }
  }

  /** Insert/update check, including the table constraints the database would enforce. */
  checkWrite(table, row, uid, existing) {
    if (!uid || !WRITABLE.has(table)) throw rlsError();
    if (existing && existing.student_id !== uid) throw rlsError(); // update USING
    if (!(row.student_id === uid && this.isStudent(uid))) throw rlsError(); // WITH CHECK
    if (table === 'sessions') {
      if (!['maths', 'science'].includes(row.subject)) throw new BackendError(400, 'subject check failed', '23514');
      if (!row.data || !row.started_at) throw new BackendError(400, 'not null', '23502');
    } else {
      // composite foreign key (student_id, session_id) -> sessions(student_id, id)
      const ses = this.tables.sessions.get(`${row.student_id}|${row.session_id}`);
      if (!ses || ses.student_id !== row.student_id) throw new BackendError(409, 'foreign key violation', '23503');
      if (table === 'attempts' && row.working_path && row.working_path.split('/')[0] !== row.student_id) {
        throw new BackendError(400, 'working_path check failed', '23514');
      }
    }
  }

  gate(what) {
    this.log.push(what);
    if (this.offline) throw new BackendError(0, 'No connection to the server.');
    if (this.failNext > 0) {
      this.failNext -= 1;
      throw new BackendError(503, 'Service unavailable');
    }
  }
}

export class MockBackend {
  constructor(server, opts = {}) {
    this.kind = 'mock';
    this.server = server;
    this.store = opts.storage || memoryStorage();
    this._profile = null;
  }

  _uid() {
    const s = this.session();
    return s ? s.user.id : null;
  }

  session() {
    try {
      const s = JSON.parse(this.store.getItem(AUTH_KEY) || 'null');
      const epoch = s && s.user ? this.server.sessionEpoch.get(s.user.id) || 0 : 0;
      return s && s.user && this.server.users.has(s.user.id) && (s.epoch || 0) === epoch ? s : null;
    } catch {
      return null;
    }
  }

  user() {
    const s = this.session();
    return s ? s.user : null;
  }

  async ensureFresh() {
    return this.session();
  }

  async signIn(email, password) {
    this.server.gate('signIn');
    const u = [...this.server.users.values()].find((x) => x.email === String(email).toLowerCase());
    if (!u || u.password !== password) throw new BackendError(401, 'That username or password is not right.');
    const s = { accessToken: `mock-${u.id}`, refreshToken: `mock-r-${u.id}`, expiresAt: Date.now() + 3600000, epoch: this.server.sessionEpoch.get(u.id) || 0, user: { id: u.id, email: u.email } };
    this.store.setItem(AUTH_KEY, JSON.stringify(s));
    this._profile = null;
    return s;
  }

  async signOut() {
    this.store.removeItem(AUTH_KEY);
    this._profile = null;
  }

  async select(table, q = {}) {
    this.server.gate(`select ${table}`);
    if (!KEYS[table]) throw new BackendError(404, 'relation does not exist');
    const uid = this._uid();
    let rows = [...this.server.tables[table].values()].filter((r) => this.server.canSelect(table, r, uid));
    for (const [k, v] of Object.entries(q.eq || {})) rows = rows.filter((r) => String(r[k]) === String(v));
    for (const k of q.isNotNull || []) rows = rows.filter((r) => r[k] != null);
    if (q.order) {
      const [col, dir] = q.order.split('.');
      rows.sort((a, b) => (a[col] < b[col] ? -1 : a[col] > b[col] ? 1 : 0) * (dir === 'desc' ? -1 : 1));
    }
    if (q.limit) rows = rows.slice(0, q.limit);
    const cols = !q.select || q.select === '*' ? null : q.select.split(',').map((c) => c.trim());
    return rows.map((r) => JSON.parse(JSON.stringify(cols ? Object.fromEntries(cols.map((c) => [c, r[c] ?? null])) : r)));
  }

  /** Like SupabaseBackend: writes need a signed-in user (the client refuses before sending). */
  _needUser() {
    const uid = this._uid();
    if (!uid) throw new BackendError(401, 'Not signed in.');
    return uid;
  }

  async upsert(table, rows) {
    this.server.gate(`upsert ${table}`);
    const uid = this._needUser();
    const map = this.server.tables[table];
    if (!map) throw new BackendError(404, 'relation does not exist');
    // all or nothing, like one INSERT statement
    for (const r of rows) this.server.checkWrite(table, r, uid, map.get(keyOf(table, r)));
    for (const r of rows) map.set(keyOf(table, r), { ...map.get(keyOf(table, r)), ...JSON.parse(JSON.stringify(r)) });
    this.server.changed();
  }

  async profile(force = false) {
    if (this._profile && !force) return this._profile;
    const u = this.user();
    if (!u) return null;
    this._profile = (await this.select('profiles', { eq: { id: u.id } }))[0] || null;
    return this._profile;
  }

  async children() {
    const u = this.user();
    if (!u) return [];
    return this.select('profiles', { eq: { parent_id: u.id, role: 'student' }, order: 'created_at.asc' });
  }

  async upload(bucket, path, blob) {
    this.server.gate(`upload ${bucket}/${path}`);
    const uid = this._needUser();
    const folder = String(path).split('/')[0];
    if (bucket !== 'working' || !uid || folder !== uid || !this.server.isStudent(uid)) throw rlsError();
    if (blob.type !== 'image/png') throw new BackendError(415, 'mime type not allowed');
    if (blob.size > 524288) throw new BackendError(413, 'The object exceeded the maximum allowed size');
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let s = '';
    for (const b of bytes) s += String.fromCharCode(b);
    this.server.objects.set(`${bucket}/${path}`, { type: blob.type, b64: btoa(s), size: blob.size, owner: uid });
    this.server.changed();
    return path;
  }

  async download(bucket, path) {
    this.server.gate(`download ${bucket}/${path}`);
    const uid = this._uid();
    const o = this.server.objects.get(`${bucket}/${path}`);
    if (!o || !this.server.canReadFolder(uid, String(path).split('/')[0])) throw new BackendError(404, 'Object not found');
    const bin = atob(o.b64);
    return new Blob([Uint8Array.from(bin, (c) => c.charCodeAt(0))], { type: o.type });
  }

  /** The manage-student edge function, with the same checks. */
  async invoke(name, body = {}) {
    this.server.gate(`invoke ${name}`);
    const uid = this._uid();
    if (!uid) throw new BackendError(401, 'Please sign in first.');
    if (name !== 'manage-student') throw new BackendError(404, `The ${name} function has not been set up yet.`);
    const me = this.server.profile(uid);
    if (!me || me.role !== 'parent') throw new BackendError(403, 'Only a parent account can do this.');
    const pwOk = (p) => typeof p === 'string' && p.length >= 8 && p.length <= 72;
    if (body.action === 'create') {
      const username = String(body.username || '').trim().toLowerCase();
      if (!USERNAME.test(username)) throw new BackendError(400, 'The username must be 3 to 30 characters: small letters, numbers, dots, dashes or underscores, starting with a letter or number.');
      if (!pwOk(body.password)) throw new BackendError(400, 'The password must be 8 to 72 characters.');
      if ([...this.server.tables.profiles.values()].some((p) => p.username === username)) throw new BackendError(409, 'That username is already taken. Please choose another.');
      const id = this.server.addUser(`${username}@${this.server.studentDomain}`, body.password);
      this.server.tables.profiles.set(id, { id, role: 'student', parent_id: uid, username, display_name: String(body.displayName || '').slice(0, 40) || null, created_at: new Date().toISOString() });
      this.server.changed();
      return { ok: true, studentId: id, username };
    }
    if (body.action === 'set-password') {
      const p = this.server.profile(body.studentId);
      if (!p || p.parent_id !== uid) throw new BackendError(403, 'That student is not linked to your account.');
      if (!pwOk(body.password)) throw new BackendError(400, 'The password must be 8 to 72 characters.');
      this.server.users.get(p.id).password = body.password;
      this.server.sessionEpoch.set(p.id, (this.server.sessionEpoch.get(p.id) || 0) + 1); // like public.end_sessions()
      this.server.changed();
      return { ok: true, signedOut: true };
    }
    throw new BackendError(400, 'Unknown action.');
  }
}
