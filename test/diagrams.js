// Diagram gallery and checks. Open test/diagrams.html through the local server.

import { renderDiagram, describeDiagram, validateDiagram, validateQuestionDiagrams, diagramMarkup, DIAGRAM_TYPES } from '../js/diagrams/index.js';
import { SAMPLES, PICTURE_CHOICE, BAD } from './diagram-samples.js';
import { EXTRA_CHECKS } from './diagram-checks.js';

const $ = (s) => document.querySelector(s);
const results = [];
const check = (name, ok, detail = '') => results.push({ name, ok: !!ok, detail });

// ---------------------------------------------------------------- theme
function setTheme(t) {
  if (t === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', t);
  document.querySelectorAll('[data-theme-btn]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.themeBtn === t)));
  try { localStorage.setItem('dg-gallery-theme', t); } catch { /* private mode */ }
}
document.querySelectorAll('[data-theme-btn]').forEach((b) => b.addEventListener('click', () => setTheme(b.dataset.themeBtn)));
try { const t = localStorage.getItem('dg-gallery-theme'); if (t) setTheme(t); } catch { /* ignore */ }
const params = new URLSearchParams(location.search);
if (params.get('theme')) setTheme(params.get('theme'));
// review helpers: ?compact=1 hides descriptions and JSON; ?zoom=0.6 shrinks the page
if (params.get('compact')) document.documentElement.classList.add('compact');
if (params.get('zoom')) document.body.style.zoom = params.get('zoom');
if (params.get('cols')) document.documentElement.style.setProperty('--cols', params.get('cols'));
if (params.get('cols')) document.documentElement.classList.add('fixed-cols');
if (params.get('only')) document.documentElement.classList.add('only');

// ---------------------------------------------------------------- cards
function card(title, spec, extraClass = '') {
  const c = document.createElement('article');
  c.className = `card ${extraClass}`;
  c.dataset.type = spec && spec.type;
  const h = document.createElement('h3');
  h.textContent = title;
  const t = document.createElement('div');
  t.className = 'type';
  t.textContent = spec && spec.type;
  c.append(h, t);
  const errs = validateDiagram(spec);
  const fig = renderDiagram(spec, { showErrors: true });
  c.appendChild(fig);
  const d = document.createElement('p');
  d.className = 'desc';
  d.textContent = `Description: ${describeDiagram(spec)}`;
  c.appendChild(d);
  if (errs.length) {
    const e = document.createElement('div');
    e.className = 'errs';
    e.textContent = errs.join('; ');
    c.appendChild(e);
    c.classList.add('fail');
  }
  const det = document.createElement('details');
  const sum = document.createElement('summary');
  sum.textContent = 'JSON';
  const pre = document.createElement('pre');
  pre.textContent = JSON.stringify(spec, null, 1).replace(/\n\s*(?=[\]\d-])/g, ' ');
  det.append(sum, pre);
  c.appendChild(det);
  return { c, fig, errs };
}

const gallery = $('#gallery');
const filter = $('#filter');
for (const t of DIAGRAM_TYPES) { const o = document.createElement('option'); o.value = t; o.textContent = t; filter.appendChild(o); }
filter.addEventListener('change', () => {
  for (const c of gallery.children) c.hidden = !!filter.value && !filter.value.split(',').includes(c.dataset.type);
});
if (params.get('type')) { const o = document.createElement('option'); o.value = params.get('type'); o.textContent = params.get('type'); filter.appendChild(o); filter.value = params.get('type'); }

for (const s of SAMPLES) {
  const { c, fig, errs } = card(s.title, s.spec);
  gallery.appendChild(c);
  const name = `${s.spec.type}: ${s.title}`;
  check(`${name}: spec is valid`, errs.length === 0, errs.join('; '));
  check(`${name}: drawn without error`, !fig.querySelector('.dg-err'));
  const svg = fig.querySelector('svg.dg-svg');
  const table = fig.querySelector('table');
  check(`${name}: picture or table present`, svg || table);
  if (svg) {
    const label = svg.getAttribute('aria-label') || '';
    check(`${name}: role="img" with a description`, svg.getAttribute('role') === 'img' && label.length > 20, label);
    check(`${name}: description has no NaN/undefined`, !/NaN|undefined|Infinity|\[object/.test(label), label);
    const html = svg.outerHTML;
    check(`${name}: drawing has no NaN/undefined`, !/NaN|undefined|Infinity/.test(html), (html.match(/.{30}(NaN|undefined|Infinity).{30}/) || [''])[0]);
    const vb = (svg.getAttribute('viewBox') || '').split(' ').map(Number);
    check(`${name}: sensible frame`, vb.length === 4 && vb[2] > 60 && vb[3] > 30 && vb[2] < 1400 && vb[3] < 1400, svg.getAttribute('viewBox'));
  }
  const markup = diagramMarkup(s.spec);
  check(`${name}: markup string`, /<svg|<table/.test(markup) && !/NaN|undefined/.test(markup));
}
if (params.get('type')) filter.dispatchEvent(new Event('change'));

for (const t of DIAGRAM_TYPES) check(`type ${t} has a sample`, SAMPLES.some((s) => s.spec.type === t));

for (const b of BAD) {
  const errs = validateDiagram(b.spec);
  let threw = false;
  let fig = null;
  try { fig = renderDiagram(b.spec); } catch { threw = true; }
  check(`rejects ${b.why}`, errs.length > 0 && !threw && fig && fig.querySelector('.dg-err'), errs.join('; '));
}

// ---------------------------------------------------------------- picture choice
{
  const q = PICTURE_CHOICE;
  const wrap = $('#picture');
  const p = document.createElement('p');
  p.textContent = q.prompt;
  wrap.appendChild(p);
  const opts = document.createElement('div');
  opts.className = 'opts';
  q.options.forEach((o, i) => {
    const d = document.createElement('div');
    d.className = 'opt';
    const b = document.createElement('b');
    b.textContent = `${String.fromCharCode(65 + i)}. ${o}`;
    d.append(b, renderDiagram(q.optionDiagrams[i]));
    opts.appendChild(d);
  });
  wrap.appendChild(opts);
  check('picture-choice question validates', validateQuestionDiagrams(q).length === 0, validateQuestionDiagrams(q).join('; '));
  check('optionDiagrams length mismatch is caught', validateQuestionDiagrams({ ...q, optionDiagrams: q.optionDiagrams.slice(1) }).length > 0);
}

// ---------------------------------------------------------------- exact-geometry checks
for (const [name, fn] of EXTRA_CHECKS) {
  try {
    const r = fn();
    check(name, r === true || (r && r.ok), r && r.detail);
  } catch (e) {
    check(name, false, String(e && e.stack || e));
  }
}

// ---------------------------------------------------------------- results
const fails = results.filter((r) => !r.ok);
const sum = $('#summary');
sum.textContent = `${results.length - fails.length} of ${results.length} checks pass`;
sum.className = fails.length ? 'bad' : 'ok';
const list = $('#checks');
for (const r of [...fails, ...results.filter((x) => x.ok)]) {
  const li = document.createElement('li');
  li.className = r.ok ? 'ok' : 'bad';
  li.textContent = `${r.ok ? 'PASS' : 'FAIL'} ${r.name}${!r.ok && r.detail ? ` - ${r.detail}` : ''}`;
  list.appendChild(li);
}
window.__diagramResults = { total: results.length, failed: fails.length, fails: fails.map((f) => `${f.name}: ${f.detail}`) };
// for runs from the command line (tools/run_tests.py): report the result to the local server
if (params.has('beacon')) fetch(`./__result?${encodeURIComponent(JSON.stringify({ total: results.length, failed: fails.slice(0, 50).map((f) => `${f.name}: ${f.detail}`) }))}`).catch(() => {});

// ---------------------------------------------------------------- paste box
function collect(data) {
  const out = [];
  const visit = (x, where) => {
    if (Array.isArray(x)) { x.forEach((y, i) => visit(y, `${where}[${i}]`)); return; }
    if (!x || typeof x !== 'object') return;
    if (typeof x.type === 'string' && !('prompt' in x) && !('questions' in x)) { out.push({ title: where, spec: x }); return; }
    if (Array.isArray(x.questions)) { visit(x.questions, x.topicId || 'topic'); return; }
    if ('prompt' in x) {
      if (x.diagram) out.push({ title: `${x.id || where} diagram`, spec: x.diagram, q: x });
      (x.optionDiagrams || []).forEach((d, i) => { if (d) out.push({ title: `${x.id || where} option ${String.fromCharCode(65 + i)}`, spec: d }); });
      const qe = validateQuestionDiagrams(x).filter((e) => /optionDiagrams should/.test(e));
      if (qe.length) out.push({ title: `${x.id || where}`, error: qe.join('; ') });
    }
  };
  visit(data, 'pasted');
  return out;
}
$('#draw').addEventListener('click', () => {
  const out = $('#pasteOut');
  out.textContent = '';
  let data;
  try { data = JSON.parse($('#paste').value); } catch (e) {
    out.textContent = `That is not valid JSON: ${e.message}`;
    return;
  }
  const items = collect(data);
  if (!items.length) { out.textContent = 'No diagrams found.'; return; }
  for (const it of items) {
    if (it.error) { const d = document.createElement('div'); d.className = 'errs'; d.textContent = `${it.title}: ${it.error}`; out.appendChild(d); continue; }
    out.appendChild(card(it.title, it.spec).c);
  }
});
