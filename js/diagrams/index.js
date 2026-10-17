// Diagram renderer: draws a question's `diagram` (and picture-choice `optionDiagrams`) from JSON
// data as SVG. The spec is docs/diagram-spec.md. No libraries, no image files, no network.
//
//   renderDiagram(spec, opts)  -> <figure class="dg"> (never throws; a bad spec draws a note)
//   diagramMarkup(spec)        -> the same as an HTML string, with its styles, for saved reports
//   describeDiagram(spec)      -> the text description (spec.alt if given)
//   validateDiagram(spec)      -> list of error strings ([] when the spec is good)
//   DIAGRAM_TYPES              -> the type names

import { el, toDom, toHtml, fields, escapeHtml } from './core.js';
import { DIAGRAM_CSS, ensureStyles } from './style.js';
import { GEOMETRY } from './geometry.js';
import { CHARTS } from './charts.js';
import { SOLIDS } from './solids.js';
import { MEASURES } from './measures.js';
import { SCIENCE } from './science.js';
import { BODY } from './body.js';

const REGISTRY = { ...GEOMETRY, ...CHARTS, ...SOLIDS, ...MEASURES, ...SCIENCE, ...BODY };
export const DIAGRAM_TYPES = Object.keys(REGISTRY);

const SIZE_SCALE = { small: 0.85, medium: 1, large: 1.3 };
let counter = 0;

/** Errors in a diagram spec, as readable strings. */
export function validateDiagram(spec, path = 'diagram') {
  if (!spec || typeof spec !== 'object' || Array.isArray(spec)) return [`${path} should be an object`];
  const t = REGISTRY[spec.type];
  if (!t) return [`${path}.type "${spec.type}" is not a diagram type (types: ${DIAGRAM_TYPES.join(', ')})`];
  const errs = fields(spec, t.schema, 'diagram', ['type', ...(t.required || [])]).map((e) => e.replace(/^diagram/, path));
  if (!errs.length && t.check) errs.push(...t.check(spec).map((e) => `${path}: ${e}`));
  return errs;
}

/** Errors in a question's diagram and optionDiagrams (for content checks). */
export function validateQuestionDiagrams(q) {
  const errs = [];
  if (q.diagram != null) errs.push(...validateDiagram(q.diagram, `${q.id || 'question'}.diagram`));
  if (q.optionDiagrams != null) {
    if (!Array.isArray(q.optionDiagrams)) errs.push(`${q.id}.optionDiagrams should be a list`);
    else {
      if (!Array.isArray(q.options) || q.optionDiagrams.length !== q.options.length) errs.push(`${q.id}.optionDiagrams should have one entry per option`);
      q.optionDiagrams.forEach((d, i) => { if (d != null) errs.push(...validateDiagram(d, `${q.id}.optionDiagrams[${i}]`)); });
    }
  }
  return errs;
}

/** The text description of a diagram (the author's `alt`, or one built from the data). */
export function describeDiagram(spec) {
  if (spec && typeof spec.alt === 'string' && spec.alt.trim()) return spec.alt.trim();
  const t = spec && REGISTRY[spec.type];
  if (!t) return 'A diagram.';
  try {
    let d = t.describe(spec);
    if (spec.notToScale) d += ' Not drawn to scale.';
    return d;
  } catch {
    return 'A diagram.';
  }
}

/** Build the figure as a node tree. */
function build(spec, opts = {}) {
  const errs = validateDiagram(spec);
  if (errs.length) {
    return el('figure', { class: 'dg' }, el('div', { class: 'dg-err', role: 'note' }, 'This picture could not be drawn.', opts.showErrors ? el('div', {}, errs.join('; ')) : null));
  }
  const t = REGISTRY[spec.type];
  const ctx = { id: opts.idPrefix || `dg${++counter}` };
  const out = t.render(spec, ctx);
  const description = describeDiagram(spec);
  const size = spec.size || t.size || 'medium';
  const caption = [spec.caption, spec.notToScale ? 'Not drawn to scale' : null].filter(Boolean).join('. ');
  let main;
  if (out.html) {
    main = out.html;
  } else {
    const pad = 6;
    const b = out.box;
    const x0 = b.x0 - pad;
    const y0 = b.y0 - pad;
    const w = b.w + 2 * pad;
    const h = b.h + 2 * pad;
    const k = (SIZE_SCALE[size] || 1) * (out.scale || 1);
    main = el('svg', {
      class: 'dg-svg', viewBox: `${round1(x0)} ${round1(y0)} ${round1(w)} ${round1(h)}`, role: 'img', 'aria-label': description,
      width: Math.round(w * k), height: Math.round(h * k), style: `max-width: ${Math.round(w * k)}px`, focusable: 'false',
    }, out.body);
  }
  return el('figure', { class: `dg dg-${spec.type} dg-size-${size}`, 'data-type': spec.type },
    main,
    caption ? el('figcaption', {}, caption) : null);
}
const round1 = (v) => Math.round(v * 10) / 10;

/** Draw a diagram as a DOM element (a <figure>). Never throws. */
export function renderDiagram(spec, opts = {}) {
  ensureStyles();
  try {
    return toDom(build(spec, opts));
  } catch (e) {
    const f = document.createElement('figure');
    f.className = 'dg';
    const d = document.createElement('div');
    d.className = 'dg-err';
    d.setAttribute('role', 'note');
    d.textContent = 'This picture could not be drawn.';
    f.appendChild(d);
    if (opts.showErrors) { const m = document.createElement('div'); m.textContent = String(e && e.stack || e); d.appendChild(m); }
    return f;
  }
}

/** A diagram as an HTML string with the styles it needs (for a saved report). Never throws. */
export function diagramMarkup(spec, opts = {}) {
  try {
    const css = opts.withStyles === false ? '' : `<style>${DIAGRAM_CSS}</style>`;
    return css + toHtml(build(spec, opts));
  } catch {
    return `<figure class="dg"><div class="dg-err">${escapeHtml('This picture could not be drawn.')}</div></figure>`;
  }
}

/** The diagram stylesheet (for pages that embed several diagrams as strings). */
export const diagramCss = () => DIAGRAM_CSS;
