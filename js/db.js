// IndexedDB storage. Everything the app remembers lives here, on this device only.
//
// Stores:
//   settings  { key, value }            parent PIN hash, parent email, device id, preferences
//   sessions  { id, ... }               one per practice session (in progress or complete)
//   attempts  { id, sessionId, ... }    one per question in a completed session
//   reports   { sessionId, ... }        the parent report generated after each session

export const DB_NAME = 'study-practice';
const DB_VERSION = 1;

function req(r) {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

function done(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error || new Error('Transaction aborted'));
    tx.onerror = () => reject(tx.error);
  });
}

export class Db {
  constructor(idb) {
    this.idb = idb;
  }

  static open(name = DB_NAME) {
    return new Promise((resolve, reject) => {
      if (!globalThis.indexedDB) {
        reject(new Error('This browser cannot store progress (IndexedDB is unavailable).'));
        return;
      }
      const r = indexedDB.open(name, DB_VERSION);
      r.onupgradeneeded = () => {
        const db = r.result;
        if (!db.objectStoreNames.contains('settings')) db.createObjectStore('settings', { keyPath: 'key' });
        if (!db.objectStoreNames.contains('sessions')) {
          const s = db.createObjectStore('sessions', { keyPath: 'id' });
          s.createIndex('startedAt', 'startedAt');
          s.createIndex('status', 'status');
        }
        if (!db.objectStoreNames.contains('attempts')) {
          const a = db.createObjectStore('attempts', { keyPath: 'id' });
          a.createIndex('sessionId', 'sessionId');
          a.createIndex('questionId', 'questionId');
          a.createIndex('answeredAt', 'answeredAt');
        }
        if (!db.objectStoreNames.contains('reports')) {
          const p = db.createObjectStore('reports', { keyPath: 'sessionId' });
          p.createIndex('createdAt', 'createdAt');
        }
      };
      r.onsuccess = () => {
        const idb = r.result;
        idb.onversionchange = () => idb.close();
        resolve(new Db(idb));
      };
      r.onerror = () => reject(r.error);
      r.onblocked = () => reject(new Error('Storage is busy in another tab. Close other copies of the app and try again.'));
    });
  }

  static deleteDatabase(name) {
    return new Promise((resolve, reject) => {
      const r = indexedDB.deleteDatabase(name);
      r.onsuccess = () => resolve();
      r.onerror = () => reject(r.error);
      r.onblocked = () => resolve();
    });
  }

  close() {
    this.idb.close();
  }

  async get(store, key) {
    const tx = this.idb.transaction(store, 'readonly');
    return req(tx.objectStore(store).get(key));
  }

  async getAll(store) {
    const tx = this.idb.transaction(store, 'readonly');
    return req(tx.objectStore(store).getAll());
  }

  async getAllByIndex(store, index, value) {
    const tx = this.idb.transaction(store, 'readonly');
    return req(tx.objectStore(store).index(index).getAll(value));
  }

  async put(store, value) {
    const tx = this.idb.transaction(store, 'readwrite');
    tx.objectStore(store).put(value);
    await done(tx);
    return value;
  }

  /** Write several records across stores in one transaction: all or nothing. */
  async putMany(writes) {
    const stores = [...new Set(writes.map((w) => w.store))];
    if (!stores.length) return;
    const tx = this.idb.transaction(stores, 'readwrite');
    for (const w of writes) tx.objectStore(w.store).put(w.value);
    await done(tx);
  }

  async delete(store, key) {
    const tx = this.idb.transaction(store, 'readwrite');
    tx.objectStore(store).delete(key);
    await done(tx);
  }

  async clearAll() {
    const names = ['sessions', 'attempts', 'reports', 'settings'];
    const tx = this.idb.transaction(names, 'readwrite');
    for (const n of names) tx.objectStore(n).clear();
    await done(tx);
  }

  async getSetting(key, fallback = null) {
    const row = await this.get('settings', key);
    return row ? row.value : fallback;
  }

  async setSetting(key, value) {
    return this.put('settings', { key, value });
  }

  async deleteSetting(key) {
    return this.delete('settings', key);
  }
}

/** Ask the browser to keep this site's storage (not cleared under storage pressure). */
export async function requestPersistence() {
  try {
    if (navigator.storage && navigator.storage.persist) {
      if (await navigator.storage.persisted()) return true;
      return await navigator.storage.persist();
    }
  } catch {
    /* not supported */
  }
  return false;
}
