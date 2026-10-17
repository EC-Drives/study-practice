// Sign-in page (linked mode only). She signs in with the username and password her dad made for
// her; he signs in with his email and password. Nothing here is needed in local mode.

import { h, clear, icon } from '../ui.js';
import { signIn } from '../data/store.js';

export async function loginView(el, app, who = 'student') {
  const isParent = who === 'parent';
  const msg = h('p', { class: 'form-msg', role: 'alert' });
  const loginId = isParent ? 'login-email' : 'login-user';
  const login = h('input', isParent
    ? { id: loginId, type: 'email', class: 'answer-input', autocomplete: 'username', required: true, maxlength: '200', inputmode: 'email', autocapitalize: 'off', spellcheck: 'false' }
    : { id: loginId, type: 'text', class: 'answer-input', autocomplete: 'username', required: true, maxlength: '30', autocapitalize: 'off', autocorrect: 'off', spellcheck: 'false' });
  const pw = h('input', { id: 'login-pw', type: 'password', class: 'answer-input', autocomplete: 'current-password', required: true, maxlength: '72' });
  const submit = h('button', { type: 'submit', class: 'btn btn-primary btn-big' }, icon('lock'), h('span', { text: 'Sign in' }));
  const form = h('form', { class: 'stack', novalidate: true },
    h('div', { class: 'field' }, h('label', { for: loginId, text: isParent ? 'Your email address' : 'Your username' }), login),
    h('div', { class: 'field' }, h('label', { for: 'login-pw', text: 'Password' }), pw),
    msg, submit);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    msg.textContent = '';
    if (!login.value.trim() || !pw.value) {
      msg.textContent = isParent ? 'Please type your email address and password.' : 'Please type your username and password.';
      return;
    }
    submit.disabled = true;
    submit.querySelector('span:last-child').textContent = 'Signing in…';
    try {
      const profile = await signIn(app, isParent ? 'parent' : 'student', login.value, pw.value);
      pw.value = '';
      if (!profile) {
        msg.textContent = app.problem || 'This account is not set up yet.';
        return;
      }
      if (app.onSignedIn) await app.onSignedIn();
      location.hash = profile.role === 'parent' ? '#/parent/overview' : '#/';
    } catch (err) {
      msg.textContent = err && err.offline ? 'There is no internet connection. Signing in needs the internet the first time.' : (err && err.message) || 'Could not sign in.';
    } finally {
      submit.disabled = false;
      submit.querySelector('span:last-child').textContent = 'Sign in';
    }
  });

  const switcher = h('nav', { class: 'seg login-switch', 'aria-label': 'Who is signing in' },
    h('a', { href: '#/login/student', class: `btn btn-small ${isParent ? 'btn-ghost' : 'btn-primary'}`, 'aria-current': isParent ? null : 'page' }, icon('star', { size: 20 }), h('span', { text: 'I am practising' })),
    h('a', { href: '#/login/parent', class: `btn btn-small ${isParent ? 'btn-primary' : 'btn-ghost'}`, 'aria-current': isParent ? 'page' : null }, icon('lock', { size: 20 }), h('span', { text: 'I am the parent' })));

  const card = h('section', { class: 'card' },
    h('h2', { text: isParent ? 'Parent sign-in' : 'Sign in to practise' }),
    h('p', { class: 'muted small', text: isParent
      ? 'Your daughter\'s sessions appear here automatically after she finishes each one.'
      : 'Use the username and password your dad set up for you. Your practice is saved online by itself.' }),
    form);
  const notes = [];
  if (app.backend && app.backend.kind === 'mock') {
    notes.push(h('p', { class: 'notice small' }, icon('info'), h('span', { text: 'Laptop preview with a pretend server (nothing goes online). The test parent account is in tools/mock-seed.json.' })));
  }
  if (app.problem) notes.push(h('p', { class: 'notice small' }, icon('info'), h('span', { text: app.problem })));
  clear(el).append(h('div', { class: 'stack narrow' },
    h('h1', {}, icon('lock', { size: 28 }), h('span', { text: 'Welcome to Study Practice' })),
    switcher, card, ...notes));
  login.focus();
}
