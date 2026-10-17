// Start-up and page routing. Pages are addressed by the part after "#", so the app works from
// any folder (a GitHub Pages project address included) and from the Home Screen.

import { requestPersistence } from './db.js';
import { loadManifest } from './content.js';
import { newId } from './practice.js';
import { h, clear, icon, dialog, toast } from './ui.js';
import { createBackend } from './data/backend.js';
import { connect, signOut } from './data/store.js';
import { loadExtensions } from './hooks.js';
import { connectAi } from './ai.js';
import { loginView } from './views/login.js';
import { homeView, subjectView } from './views/home.js';
import { topicView, mixedView, sectionView, papersView, paperView } from './views/topic.js';
import { sessionView } from './views/session.js';
import { resultsView } from './views/results.js';
import { parentView } from './views/parent.js';

export const app = {
  mode: 'local', // 'local' (version 1, on this device only) or 'linked' (Supabase accounts)
  backend: null, // linked mode: SupabaseBackend (or the laptop-only mock)
  db: null, // the on-device database (local mode, or the signed-in student's)
  source: null, // where pages read progress from (app.db, or the parent's RemoteSource)
  sync: null, // linked student: the offline queue that sends finished sessions online
  profile: null, // linked: { id, role: 'parent' | 'student', username, display_name }
  children: [],
  child: null,
  manifest: null,
  deviceId: '',
  cleanup: null, // the current page's tidy-up function (the session page stops its timer)
  parentUnlockedUntil: 0,
};

const main = () => document.getElementById('main');

function setTitle(t) {
  document.title = t ? `${t} · Study Practice` : 'Study Practice';
}

function errorView(el, err) {
  clear(el).append(h('section', { class: 'card' },
    h('h1', { text: 'Something went wrong' }),
    h('p', { text: err && err.message ? err.message : String(err) }),
    h('p', {}, h('a', { href: '#/', class: 'btn' }, icon('home'), h('span', { text: 'Back to the start' })))));
}

async function route() {
  const el = main();
  if (app.cleanup) {
    try { await app.cleanup(); } catch { /* ignore */ }
    app.cleanup = null;
  }
  let parts;
  try {
    parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  } catch {
    parts = ['bad-address']; // a damaged link ("%E0%A4"): go home rather than stop
  }
  let [page, a, b] = parts;
  if (page !== 'parent') app.parentUnlockedUntil = 0; // leaving the parent area locks it again
  if (app.mode === 'linked') {
    // linked mode: nobody signed in -> sign-in page; a parent's home is the parent area
    if (!app.profile && page !== 'login') {
      location.replace('#/login');
      return;
    }
    if (app.profile && page === 'login') {
      location.replace(app.profile.role === 'parent' ? '#/parent/overview' : '#/');
      return;
    }
    if (app.profile && app.profile.role === 'parent' && page !== 'parent') {
      location.replace('#/parent/overview');
      return;
    }
  } else if (page === 'login') {
    page = '';
  }
  document.body.dataset.page = page || 'home';
  app.syncWatcher = null; // a page that shows the sending status sets it again
  renderAccount();
  window.scrollTo(0, 0);
  try {
    switch (page) {
      case 'login':
        setTitle('Sign in');
        await loginView(el, app, a === 'parent' ? 'parent' : 'student');
        break;
      case undefined:
      case '':
        setTitle('');
        await homeView(el, app);
        break;
      case 'subject':
        await subjectView(el, app, a);
        setTitle(el.dataset.title);
        break;
      case 'topic':
        await topicView(el, app, a);
        setTitle(el.dataset.title);
        break;
      case 'mixed':
        await mixedView(el, app, a);
        setTitle('Mixed revision');
        break;
      case 'section':
        await sectionView(el, app, a, b);
        setTitle(el.dataset.title);
        break;
      case 'papers':
        await papersView(el, app, a || 'maths');
        setTitle('Mock papers');
        break;
      case 'paper':
        await paperView(el, app, a);
        setTitle(el.dataset.title);
        break;
      case 'session':
        setTitle('Practice');
        await sessionView(el, app, a);
        break;
      case 'results':
        setTitle('Your results');
        await resultsView(el, app, a);
        break;
      case 'parent':
        setTitle('Parent area');
        await parentView(el, app, a, b);
        break;
      default:
        location.replace('#/');
    }
  } catch (err) {
    console.error(err);
    errorView(el, err);
  }
  const h1 = el.querySelector('h1');
  if (h1 && page !== 'session') {
    h1.setAttribute('tabindex', '-1');
    h1.focus({ preventScroll: true });
  }
}

/** After a sign-in (or at start-up): this device's id in the database now in use. */
async function afterConnect() {
  app.deviceId = '';
  if (!app.db) return;
  app.deviceId = await app.db.getSetting('deviceId');
  if (!app.deviceId) {
    app.deviceId = newId('dev');
    await app.db.setSetting('deviceId', app.deviceId);
    await app.db.setSetting('createdAt', Date.now());
  }
}

// ------------------------------------------------------------ account bar (linked mode)

function syncText(st) {
  if (!st) return null;
  if (st.pending && st.offline) return ['clock', `${st.pending} waiting for internet`];
  if (st.pending) return ['clock', `${st.pending} to send`];
  return ['check', 'All saved online'];
}

export function renderAccount() {
  let bar = document.getElementById('account');
  if (!bar) {
    bar = h('div', { id: 'account', class: 'account' });
    document.querySelector('.topbar').append(bar);
  }
  clear(bar);
  if (app.mode !== 'linked' || !app.profile) return;
  const who = app.profile.role === 'parent' ? (app.profile.display_name || 'Parent') : (app.profile.display_name || app.profile.username);
  if (app.profile.role === 'student') {
    const st = syncText(app.syncStatus);
    if (st) bar.append(h('span', { class: `sync-chip${app.syncStatus && app.syncStatus.pending ? ' is-waiting' : ''}`, role: 'status' }, icon(st[0], { size: 18 }), h('span', { text: st[1] })));
  }
  bar.append(h('span', { class: 'account-name', text: who }),
    h('button', { type: 'button', class: 'btn btn-ghost btn-small', onClick: confirmSignOut }, h('span', { text: 'Sign out' })));
}

async function confirmSignOut() {
  const pending = app.sync ? await app.sync.pending() : 0;
  const ok = await dialog('Sign out?', pending
    ? `${pending} finished session${pending === 1 ? ' has' : 's have'} not gone online yet. They stay safely on this device and are sent the next time you sign in here.`
    : 'You can sign in again at any time.', [
    { label: 'Stay signed in', value: false, cls: 'btn-ghost' },
    { label: 'Sign out', value: true, cls: 'btn-primary' },
  ]);
  if (!ok) return;
  if (app.cleanup) { try { await app.cleanup(); } catch { /* ignore */ } app.cleanup = null; }
  await signOut(app);
  toast('Signed out.');
  location.hash = '#/login';
  renderAccount();
}

/** Laptop preview only (mock back-end): ?demo=1 adds demo data, ?as=parent|student signs in. */
async function mockPreview(backend) {
  const qs = new URLSearchParams(location.search);
  if (!qs.has('demo') && !qs.has('as')) return;
  const demo = await import('./data/mock-demo.js');
  if (qs.has('demo')) await demo.seedDemo(backend.server, backend.server.studentDomain);
  const as = qs.get('as');
  if (as && (!backend.user() || qs.has('switch'))) {
    await backend.signOut();
    await demo.demoSignIn(backend, as, backend.server.studentDomain);
  }
}

async function start() {
  // never run inside someone else's frame (a page that frames it could trick taps); the
  // laptop's own screenshot tool frames it on localhost, which is allowed
  if (window.top !== window.self && !['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)) {
    document.body.textContent = 'Study Practice must be opened on its own page.';
    return;
  }
  try {
    app.backend = await createBackend();
    connectAi(app.backend);
    await loadExtensions();
    if (app.backend && app.backend.kind === 'mock') await mockPreview(app.backend);
    await connect(app);
    await afterConnect();
  } catch (err) {
    errorView(main(), err);
    return;
  }
  app.onSignedIn = () => afterConnect().then(renderAccount);
  app.onSyncStatus = (st) => {
    renderAccount();
    if (app.syncWatcher) app.syncWatcher(st);
  };
  try {
    app.manifest = await loadManifest();
  } catch (err) {
    errorView(main(), new Error('The question banks could not be loaded. Check the internet connection the first time the app is opened.'));
    return;
  }
  requestPersistence();
  window.addEventListener('hashchange', route);
  await route();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    // an update: the new version takes over in the background; offer a reload rather than
    // reloading by itself (she may be in the middle of a question)
    // (the very first install also takes control, and that is not an update)
    let controlled = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (controlled) offerReload();
      controlled = true;
    });
    navigator.serviceWorker.register('sw.js').then((reg) => {
      // an app left open for days still finds updates when it comes back to the screen
      document.addEventListener('visibilitychange', () => { if (!document.hidden) reg.update().catch(() => {}); });
    }).catch((e) => console.warn('Offline mode unavailable:', e));
  }
}

function offerReload() {
  if (document.getElementById('update-bar')) return;
  const bar = h('div', { id: 'update-bar', class: 'update-bar', role: 'status' },
    h('span', { text: 'A new version of Study Practice is ready.' }),
    h('button', { type: 'button', class: 'btn btn-primary btn-small', onClick: async () => {
      if (app.cleanup) { try { await app.cleanup(); } catch { /* ignore */ } } // saves a practice in progress
      location.reload();
    } }, icon('again', { size: 20 }), h('span', { text: 'Reload' })),
    h('button', { type: 'button', class: 'btn btn-ghost btn-small', onClick: () => bar.remove() }, h('span', { text: 'Later' })));
  document.body.append(bar);
}

start();
