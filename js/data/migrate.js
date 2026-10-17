// One-time import of the progress she already has on a device (version 1, local mode) into her
// online account, the first time she signs in on that device.
//
// The version 1 database ("study-practice") is read, never changed except for one note saying it
// was imported (and into which account), so it is offered only once. Sessions, answers and
// reports are copied into her account's database on the device with the same merge rules as
// "Import progress" (nothing is overwritten, nothing is duplicated), then queued to go online.

import { Db, DB_NAME } from '../db.js';
import { buildExport, importExport } from '../exportimport.js';

const NOTE = 'migratedTo';

/** Does an older on-device database exist? (Opening one would create it, so ask first.) */
async function legacyExists(name = DB_NAME) {
  try {
    if (indexedDB.databases) return (await indexedDB.databases()).some((d) => d.name === name);
  } catch { /* not supported: open it and look */ }
  return true;
}

/** What could be imported: { sessions, already } or null when there is nothing. */
export async function legacyProgress(userId, name = DB_NAME) {
  if (!(await legacyExists(name))) return null;
  const legacy = await Db.open(name);
  try {
    const sessions = (await legacy.getAll('sessions')).filter((s) => s.status === 'complete');
    const note = await legacy.getSetting(NOTE, null);
    if (!sessions.length) return null;
    // offered once per device: after an import or a "not now", for any account
    return { sessions: sessions.length, already: !!note, sameAccount: !!(note && note.userId === userId), note };
  } finally {
    legacy.close();
  }
}

/**
 * Copy the older progress into the student's database and queue every copied session.
 * Returns { added: {sessions, attempts, reports}, skipped }.
 */
export async function importLegacy(app, name = DB_NAME) {
  const userId = app.profile && app.profile.id;
  if (!userId || !app.db || !app.sync) throw new Error('Sign in as the student first.');
  const legacy = await Db.open(name);
  try {
    const exp = await buildExport(legacy, { appVersion: 'v1-device' });
    const before = new Set((await app.db.getAll('sessions')).map((s) => s.id));
    const res = await importExport(app.db, JSON.stringify(exp));
    const after = await app.db.getAll('sessions');
    for (const s of after) if (!before.has(s.id) && s.status === 'complete') await app.sync.enqueue(s.id);
    await legacy.setSetting(NOTE, { userId, at: Date.now(), sessions: res.added.sessions });
    app.sync.flush().catch(() => {});
    return res;
  } finally {
    legacy.close();
  }
}

/** "Not now": remember the choice on this device so the offer does not keep coming back. */
export async function declineLegacy(userId, name = DB_NAME) {
  const legacy = await Db.open(name);
  try {
    await legacy.setSetting(NOTE, { userId, at: Date.now(), declined: true });
  } finally {
    legacy.close();
  }
}
