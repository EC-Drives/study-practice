// Picks the data back-end at start-up.
//
//   config.js empty                -> null: LOCAL mode (version 1 behaviour, IndexedDB only)
//   config.js has url + anonKey    -> SupabaseBackend: LINKED mode
//   on this laptop only:
//     ?backend=mock                -> MockBackend kept in this browser (linked mode, no Supabase)
//     ?backend=local               -> local mode even if config.js is filled in

import { SUPABASE } from '../../config.js';
import { SupabaseBackend } from './supabase-backend.js';

export const DEV_HOSTS = ['localhost', '127.0.0.1', '[::1]'];
const MOCK_STATE = 'study-practice-mock-server';

export function isDevHost(loc = globalThis.location) {
  return !!loc && DEV_HOSTS.includes(loc.hostname);
}

/** Which mode the config and address ask for: 'local', 'supabase' or 'mock'. */
export function chooseMode(config = SUPABASE, loc = globalThis.location) {
  const ask = isDevHost(loc) ? new URLSearchParams(loc.search || '').get('backend') : null;
  if (ask === 'local') return 'local';
  if (ask === 'mock') return 'mock';
  return config && config.url && config.anonKey ? 'supabase' : 'local';
}

export async function createBackend(config = SUPABASE, loc = globalThis.location) {
  const mode = chooseMode(config, loc);
  if (mode === 'supabase') return new SupabaseBackend({ url: config.url, anonKey: config.anonKey });
  if (mode !== 'mock') return null;
  const { MockServer, MockBackend } = await import('./mock-backend.js');
  let state = null;
  try { state = JSON.parse(localStorage.getItem(MOCK_STATE) || 'null'); } catch { /* none */ }
  const server = new MockServer(state);
  server.studentDomain = config.studentEmailDomain || server.studentDomain;
  if (!server.users.size) {
    // test account for the laptop preview, from tools/mock-seed.json (never a real account)
    try {
      const seed = await (await fetch('tools/mock-seed.json', { cache: 'no-store' })).json();
      const email = [seed.parent.user, seed.parent.domain].join('@');
      server.addUser(email, seed.parent.password);
      server.makeParent(email, seed.parent.displayName);
    } catch { /* no seed: the preview starts empty */ }
  }
  server.onChange = (s) => { try { localStorage.setItem(MOCK_STATE, JSON.stringify(s.dump())); } catch { /* full */ } };
  server.changed();
  // sessionStorage: two tabs can be two people (parent in one, student in the other)
  let storage;
  try { storage = sessionStorage; } catch { storage = undefined; }
  return new MockBackend(server, { storage });
}

/** The internal sign-in address for a student's username. */
export function studentEmail(username, config = SUPABASE) {
  return `${String(username).trim().toLowerCase()}@${config.studentEmailDomain || 'students.study-practice.invalid'}`;
}
