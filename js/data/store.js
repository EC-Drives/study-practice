// The data-layer adapter: what the rest of the app talks to, in either mode.
//
//   LOCAL (no Supabase settings in config.js): version 1 exactly. app.db is the on-device
//     database "study-practice"; the parent area is behind the PIN on the same device.
//   LINKED (config.js filled in):
//     student signed in -> app.db is HER on-device database "study-practice-u-<id>" (so the
//        app works offline as before), and app.sync sends every finished session online;
//     parent signed in  -> app.source reads his linked child's data from Supabase (read-only);
//     nobody signed in  -> the sign-in page.
//
// Pages read progress through app.source (the same get/getAll/getAllByIndex in both modes) and
// write only through app.db (the student's device).

import { Db, DB_NAME } from '../db.js';
import { SyncQueue } from './sync.js';
import { RemoteSource } from './remote-source.js';
import { studentEmail } from './backend.js';
import { BackendError } from './supabase-backend.js';

const PROFILE_CACHE = 'study-practice-profile';

export function userDbName(userId) {
  return `${DB_NAME}-u-${String(userId).replace(/[^A-Za-z0-9-]/g, '')}`;
}

function cacheProfile(p) {
  try { localStorage.setItem(PROFILE_CACHE, JSON.stringify(p)); } catch { /* private mode */ }
}

function cachedProfile(userId) {
  try {
    const p = JSON.parse(localStorage.getItem(PROFILE_CACHE) || 'null');
    return p && p.id === userId ? p : null;
  } catch {
    return null;
  }
}

function clearCachedProfile() {
  try { localStorage.removeItem(PROFILE_CACHE); } catch { /* ignore */ }
}

/**
 * Set app.mode, app.db, app.source, app.sync, app.profile, app.children, app.child for the
 * current sign-in. Works offline for a student who signed in before (profile kept on the device).
 */
export async function connect(app, opts = {}) {
  const backend = app.backend;
  if (app.sync) { app.sync.stop(); app.sync = null; }
  if (app.db && app.db !== opts.keepDb) { try { app.db.close(); } catch { /* closed */ } }
  app.db = null;
  app.source = null;
  app.profile = null;
  app.children = [];
  app.child = null;
  if (!backend) {
    app.mode = 'local';
    app.db = opts.db || (await Db.open(DB_NAME));
    app.source = app.db;
    return app;
  }
  app.mode = 'linked';
  const user = backend.user();
  if (!user) return app; // the sign-in page
  let profile = null;
  try {
    profile = await backend.profile(true);
    if (profile) cacheProfile(profile);
  } catch (e) {
    if (e instanceof BackendError && e.status === 401) {
      await backend.signOut();
      return app;
    }
    profile = cachedProfile(user.id); // offline: carry on as the person who signed in last
  }
  if (!profile) {
    app.problem = 'This account is not set up yet (it has no profile). See SETUP-SUPABASE, step 6 or 9.';
    return app;
  }
  app.profile = profile;
  if (profile.role === 'student') {
    app.db = opts.db || (await Db.open(userDbName(user.id)));
    app.source = app.db;
    app.sync = new SyncQueue({ db: app.db, backend, userId: user.id, onStatus: (st) => { app.syncStatus = st; if (app.onSyncStatus) app.onSyncStatus(st); } });
    if (opts.startSync !== false) app.sync.start();
  } else {
    app.offline = false;
    try {
      app.children = await backend.children();
    } catch {
      app.children = [];
      app.offline = true; // the parent area then says so, rather than offering to create an account
    }
    const pick = opts.childId || (app.children[0] && app.children[0].id);
    app.child = app.children.find((c) => c.id === pick) || null;
    app.source = app.child ? new RemoteSource(backend, app.child.id) : null;
  }
  return app;
}

/** Sign in. who: 'student' (username) or 'parent' (email). */
export async function signIn(app, who, login, password) {
  const email = who === 'student' ? studentEmail(login) : String(login).trim();
  await app.backend.signIn(email, password);
  await connect(app);
  return app.profile;
}

/** Sign out. Her unsent sessions stay on the device and are sent at her next sign-in. */
export async function signOut(app) {
  if (app.sync) { app.sync.stop(); app.sync = null; }
  clearCachedProfile();
  await app.backend.signOut();
  if (app.db) { try { app.db.close(); } catch { /* closed */ } }
  app.db = null;
  app.source = null;
  app.profile = null;
  app.children = [];
  app.child = null;
}
