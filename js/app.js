// Start-up and page routing. Pages are addressed by the part after "#", so the app works from
// any folder (a GitHub Pages project address included) and from the Home Screen.

import { Db, requestPersistence } from './db.js';
import { loadManifest } from './content.js';
import { newId } from './practice.js';
import { h, clear, icon } from './ui.js';
import { homeView, subjectView } from './views/home.js';
import { topicView, mixedView } from './views/topic.js';
import { sessionView } from './views/session.js';
import { resultsView } from './views/results.js';
import { parentView } from './views/parent.js';

export const app = {
  db: null,
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
  const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  const [page, a, b] = parts;
  if (page !== 'parent') app.parentUnlockedUntil = 0; // leaving the parent area locks it again
  document.body.dataset.page = page || 'home';
  window.scrollTo(0, 0);
  try {
    switch (page) {
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

async function start() {
  try {
    app.db = await Db.open();
  } catch (err) {
    errorView(main(), err);
    return;
  }
  app.deviceId = await app.db.getSetting('deviceId');
  if (!app.deviceId) {
    app.deviceId = newId('dev');
    await app.db.setSetting('deviceId', app.deviceId);
    await app.db.setSetting('createdAt', Date.now());
  }
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
    navigator.serviceWorker.register('sw.js').catch((e) => console.warn('Offline mode unavailable:', e));
  }
}

start();
