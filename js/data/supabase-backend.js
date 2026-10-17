// The "supabase" back-end: a small client for the parts of Supabase the app uses, written
// against Supabase's documented HTTP APIs (Auth, PostgREST, Storage, Edge Functions).
//
// Why not the official supabase-js bundle: this file is about 300 lines with no dependencies,
// lives in the repository and is served from the site's own origin, so there is no third-party
// code to vendor, audit or update. Every request carries only the public anon/publishable key
// and the signed-in user's own token; Row Level Security on the server decides what that user
// may read or write. No other key is ever used or accepted here.
//
// The interface (shared with js/data/mock-backend.js, which the tests use):
//   auth:     signIn(email, password), signOut(), session(), user(), ensureFresh()
//   data:     select(table, {select, eq, order, limit}), upsert(table, rows, onConflict)
//   storage:  upload(bucket, path, blob), download(bucket, path)
//   functions: invoke(name, body)
//   profile(): the signed-in user's profile row; children(): a parent's linked students

export class BackendError extends Error {
  constructor(status, message, code = '') {
    super(message);
    this.name = 'BackendError';
    this.status = status; // 0 = no connection
    this.code = code;
  }

  get offline() {
    return this.status === 0;
  }
}

const AUTH_KEY = 'study-practice-auth';
const PAGE = 1000; // PostgREST's usual maximum rows per request on Supabase

/** Session storage that survives reloads (localStorage), or an in-memory stand-in. */
export function memoryStorage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
}

function safeStorage() {
  try {
    const s = globalThis.localStorage;
    s.setItem('__sp_probe', '1');
    s.removeItem('__sp_probe');
    return s;
  } catch {
    return memoryStorage();
  }
}

/** A Supabase URL must be https://<something>.supabase.co (or a local dev address). */
export function validProjectUrl(url) {
  try {
    const u = new URL(url);
    if (u.protocol === 'https:' && /\.supabase\.(co|in)$/.test(u.hostname)) return true;
    return u.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(u.hostname);
  } catch {
    return false;
  }
}

export class SupabaseBackend {
  /**
   * opts: { url, anonKey, storage (localStorage-like), fetch (for tests), now (for tests) }
   */
  constructor(opts) {
    if (!validProjectUrl(opts.url)) throw new Error('The Supabase project URL in config.js does not look right.');
    if (!opts.anonKey || /service_role|sb_secret_/.test(opts.anonKey) || isServiceRoleJwt(opts.anonKey)) {
      // refuse to run with a secret key: it would bypass every security rule
      throw new Error('config.js must hold the anon (public) or publishable key, never a secret or service-role key.');
    }
    this.kind = 'supabase';
    this.url = opts.url.replace(/\/+$/, '');
    this.key = opts.anonKey;
    this.store = opts.storage || safeStorage();
    this.fetch = opts.fetch || globalThis.fetch.bind(globalThis);
    this.now = opts.now || (() => Date.now());
    this._refreshing = null;
    this._profile = null;
  }

  // ------------------------------------------------------------ low level

  async _raw(path, init = {}) {
    let res;
    try {
      res = await this.fetch(`${this.url}${path}`, init);
    } catch {
      throw new BackendError(0, 'No connection to the server.');
    }
    return res;
  }

  async _json(res) {
    const text = await res.text();
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  async _fail(res) {
    const body = await this._json(res).catch(() => null);
    const msg = (body && (body.msg || body.message || body.error_description || body.error)) || `Server error ${res.status}`;
    throw new BackendError(res.status, String(msg), (body && (body.code || body.error_code)) || '');
  }

  _headers(token, extra = {}) {
    const h = { apikey: this.key, ...extra };
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  }

  /** A request as the signed-in user; refreshes the token once on 401. */
  async _authed(path, init = {}, retry = true) {
    const ses = await this.ensureFresh();
    if (!ses) throw new BackendError(401, 'Not signed in.');
    const res = await this._raw(path, { ...init, headers: this._headers(ses.accessToken, init.headers || {}) });
    if (res.status === 401 && retry) {
      await this._refresh(true);
      return this._authed(path, init, false);
    }
    if (!res.ok) await this._fail(res);
    return res;
  }

  // ------------------------------------------------------------ auth

  session() {
    try {
      const s = JSON.parse(this.store.getItem(AUTH_KEY) || 'null');
      return s && s.accessToken && s.refreshToken && s.user && s.user.id ? s : null;
    } catch {
      return null;
    }
  }

  user() {
    const s = this.session();
    return s ? s.user : null;
  }

  _save(data) {
    const expiresAt = data.expires_at ? data.expires_at * 1000 : this.now() + (data.expires_in || 3600) * 1000;
    const s = { accessToken: data.access_token, refreshToken: data.refresh_token, expiresAt, user: { id: data.user.id, email: data.user.email || '' } };
    this.store.setItem(AUTH_KEY, JSON.stringify(s));
    return s;
  }

  async signIn(email, password) {
    const res = await this._raw('/auth/v1/token?grant_type=password', {
      method: 'POST',
      headers: this._headers(null, { 'Content-Type': 'application/json' }),
      body: JSON.stringify({ email, password }),
    });
    if (res.status === 400 || res.status === 401) throw new BackendError(401, 'That username or password is not right.');
    if (!res.ok) await this._fail(res);
    this._profile = null;
    return this._save(await this._json(res));
  }

  async signOut() {
    const s = this.session();
    this.store.removeItem(AUTH_KEY);
    this._profile = null;
    if (s) {
      try {
        // this device only: signing out on her iPad must not sign her out on the laptop
        await this._raw('/auth/v1/logout?scope=local', { method: 'POST', headers: this._headers(s.accessToken) });
      } catch { /* offline: the local sign-out is what matters */ }
    }
  }

  /** The current session, refreshed first if it expires within a minute. Null if signed out. */
  async ensureFresh() {
    const s = this.session();
    if (!s) return null;
    if (s.expiresAt - this.now() > 60000) return s;
    return this._refresh(false);
  }

  _refresh(force) {
    if (!this._refreshing) {
      this._refreshing = (async () => {
        const s = this.session();
        if (!s) return null;
        if (!force && s.expiresAt - this.now() > 60000) return s;
        const res = await this._raw('/auth/v1/token?grant_type=refresh_token', {
          method: 'POST',
          headers: this._headers(null, { 'Content-Type': 'application/json' }),
          body: JSON.stringify({ refresh_token: s.refreshToken }),
        });
        if (res.status === 400 || res.status === 401) {
          // the refresh token was revoked or has expired: sign in again
          this.store.removeItem(AUTH_KEY);
          throw new BackendError(401, 'Please sign in again.');
        }
        if (!res.ok) await this._fail(res);
        return this._save(await this._json(res));
      })().finally(() => { this._refreshing = null; });
    }
    return this._refreshing;
  }

  // ------------------------------------------------------------ data (PostgREST)

  /**
   * Read rows. q: { select: 'col,col', eq: {col: value}, isNotNull: [col], order: 'col.desc', limit }
   * Pages through results beyond 1,000 rows unless a limit is given.
   */
  async select(table, q = {}) {
    const params = new URLSearchParams();
    params.set('select', q.select || '*');
    for (const [k, v] of Object.entries(q.eq || {})) params.set(k, `eq.${v}`);
    for (const k of q.isNotNull || []) params.set(k, 'not.is.null');
    if (q.order) params.set('order', q.order);
    const out = [];
    const want = q.limit || Infinity;
    for (let offset = 0; out.length < want; offset += PAGE) {
      const n = Math.min(PAGE, want - out.length);
      params.set('limit', String(n));
      params.set('offset', String(offset));
      const res = await this._authed(`/rest/v1/${encodeURIComponent(table)}?${params}`);
      const rows = (await this._json(res)) || [];
      out.push(...rows);
      if (rows.length < n) break;
    }
    return out;
  }

  /** Insert or update rows by their key (safe to repeat: the same row twice is one row). */
  async upsert(table, rows, onConflict) {
    if (!rows.length) return;
    const qs = onConflict ? `?on_conflict=${encodeURIComponent(onConflict)}` : '';
    await this._authed(`/rest/v1/${encodeURIComponent(table)}${qs}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(rows),
    });
  }

  async profile(force = false) {
    if (this._profile && !force) return this._profile;
    const u = this.user();
    if (!u) return null;
    const rows = await this.select('profiles', { select: 'id,role,parent_id,username,display_name', eq: { id: u.id }, limit: 1 });
    this._profile = rows[0] || null;
    return this._profile;
  }

  async children() {
    const u = this.user();
    if (!u) return [];
    return this.select('profiles', { select: 'id,role,username,display_name,created_at', eq: { parent_id: u.id, role: 'student' }, order: 'created_at.asc' });
  }

  // ------------------------------------------------------------ storage

  _objectPath(bucket, path) {
    return `${encodeURIComponent(bucket)}/${String(path).split('/').map(encodeURIComponent).join('/')}`;
  }

  async upload(bucket, path, blob) {
    await this._authed(`/storage/v1/object/${this._objectPath(bucket, path)}`, {
      method: 'POST',
      headers: { 'Content-Type': blob.type || 'application/octet-stream', 'x-upsert': 'true', 'cache-control': '3600' },
      body: blob,
    });
    return path;
  }

  async download(bucket, path) {
    const res = await this._authed(`/storage/v1/object/authenticated/${this._objectPath(bucket, path)}`);
    return res.blob();
  }

  // ------------------------------------------------------------ edge functions

  async invoke(name, body) {
    const ses = await this.ensureFresh();
    if (!ses) throw new BackendError(401, 'Not signed in.');
    const res = await this._raw(`/functions/v1/${encodeURIComponent(name)}`, {
      method: 'POST',
      headers: this._headers(ses.accessToken, { 'Content-Type': 'application/json' }),
      body: JSON.stringify(body || {}),
    });
    const data = await this._json(res);
    if (!res.ok || (data && data.ok === false)) {
      const msg = data && data.error ? data.error : res.status === 404 ? `The ${name} function has not been set up yet.` : `The server said no (${res.status}).`;
      throw new BackendError(res.status, msg);
    }
    return data;
  }
}

/** True for a legacy JWT key whose role is service_role (it must never be in the browser). */
export function isServiceRoleJwt(key) {
  const parts = String(key).split('.');
  if (parts.length !== 3) return false;
  try {
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload && payload.role === 'service_role';
  } catch {
    return false;
  }
}
