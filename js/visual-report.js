// The visual parent report: pictures first, words second. Works in both modes (on the device in
// local mode, from Supabase in linked mode).
//
//   hero score          one big number, marks, the change on last time
//   summary             two or three plain-English lines
//   pictograms          a star, half star or ring for every question
//   mastery bars        one bar per part of the chapter, after this session
//   skill chips         skills to work on (and going well), with icon and words, not colour alone
//   time per question   a column per question, coloured by result, with a legend and a table
//   named mistakes      catalogue misconceptions her wrong answers showed, counted
//   wrong questions     each question she got wrong: its picture, her answer, her working
//   trend               score across sessions (Mathematics and Science), this one marked
//
// Chart rules (from the team's data-viz guide): one axis per chart, thin marks with rounded data
// ends, hairline grid, a legend whenever two or more colours carry meaning, selective direct
// labels, hover and keyboard tooltips, and a table view for every chart.

import { h, icon, pct } from './ui.js';
import { starSvg, levelBadge } from './charts.js';
import { LEVELS, formatDate, formatTime } from './stats.js';
import { formatDuration } from './timer.js';
import { summaryLines, namedMistakes } from './report.js';
import { workingView } from './working.js';
import { workingFor } from './data/remote-source.js';
import { diagramFor, optionDiagramFor } from './hooks.js';

const SVG = 'http://www.w3.org/2000/svg';
function s(tag, attrs = {}, ...kids) {
  const el = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null) el.setAttribute(k, String(v));
  for (const k of kids) if (k) el.appendChild(typeof k === 'string' ? document.createTextNode(k) : k);
  return el;
}

export const KIND = {
  right: { label: 'Right', icon: 'check' },
  part: { label: 'Part right', icon: 'star' },
  wrong: { label: 'Not yet', icon: 'bulb' },
  skip: { label: 'Not answered', icon: 'dash' },
};
const KINDS = ['right', 'part', 'wrong', 'skip'];

const num = (x, d = 0) => (Number.isFinite(Number(x)) ? Number(x) : d);

/** Per-question rows, from the report (v2) or from the attempts (older reports). */
export function questionRows(report, attempts = []) {
  if (Array.isArray(report.perQuestion) && report.perQuestion.length) {
    return report.perQuestion.filter((q) => q && KIND[q.kind]).map((q) => ({ ...q, n: num(q.n), timeSec: Math.max(0, num(q.timeSec)) }));
  }
  return [...attempts].sort((a, b) => a.position - b.position).map((a) => ({
    n: num(a.position) + 1,
    questionId: a.questionId,
    kind: !a.answered ? 'skip' : a.correct ? 'right' : a.earned > 0 ? 'part' : 'wrong',
    timeSec: Math.max(0, num(a.timeSec)),
    earned: a.earned,
    marks: a.marks,
    hasWorking: !!((a.working && a.working.strokes) || a.hasWorking || a.workingPath),
  }));
}

function chartWidth(host) {
  const main = document.getElementById('main');
  const w = (host && host.clientWidth) || (main && main.clientWidth - 72) || 640;
  return Math.max(280, Math.min(840, w));
}

// ------------------------------------------------------------------ hero

function hero(r) {
  const sc = r.score || {};
  const c = r.comparison || {};
  let delta = null;
  if (c.personalBest === true) delta = h('span', { class: 'vr-delta up' }, icon('trophy', { size: 18 }), h('span', { text: 'New personal best' }));
  else if (c.improvement != null) {
    const pts = Math.round(c.improvement * 100);
    if (pts > 0) delta = h('span', { class: 'vr-delta up' }, icon('up', { size: 18 }), h('span', { text: `Up ${pts} points on last time` }));
    else if (pts < 0) delta = h('span', { class: 'vr-delta down' }, icon('down', { size: 18 }), h('span', { text: `Down ${-pts} points on last time` }));
    else delta = h('span', { class: 'vr-delta' }, icon('dash', { size: 18 }), h('span', { text: 'Same as last time' }));
  } else if (c.personalBest === 'first') delta = h('span', { class: 'vr-delta' }, icon('star', { size: 18 }), h('span', { text: 'First score on this' }));
  const answered = num(sc.answered);
  return h('section', { class: 'vr-hero', 'aria-label': 'Score' },
    h('div', { class: 'vr-hero-main' },
      h('p', { class: 'vr-hero-num', text: pct(sc.pct) }),
      h('p', { class: 'vr-hero-sub', text: `${num(sc.earned)} of ${num(sc.max)} marks` }),
      delta),
    h('div', { class: 'vr-hero-side' },
      h('p', { class: 'vr-hero-title', text: r.title }),
      h('p', { class: 'muted small', text: `${formatDate(r.startedAt, true)}, ${formatTime(r.startedAt)} · ${r.focus}` }),
      h('ul', { class: 'vr-facts' },
        h('li', {}, icon('star', { size: 18 }), h('span', { text: `${num(sc.correct)} of ${num(sc.total)} right` })),
        h('li', {}, icon('clock', { size: 18 }), h('span', { text: `${formatDuration(r.timeUsedSec)} of ${formatDuration(r.limitSec)}${r.timedOut ? ' (time ran out)' : ''}` })),
        h('li', {}, icon('target', { size: 18 }), h('span', { text: answered ? `${Math.round(num(r.timeUsedSec) / answered)} s per answer` : 'no answers' })),
        r.flagged ? h('li', {}, icon('flag', { size: 18 }), h('span', { text: `${num(r.flagged)} flagged` })) : null)));
}

// ------------------------------------------------------------------ pictograms

function pictoStrip(rows) {
  const counts = { right: 0, part: 0, wrong: 0, skip: 0 };
  for (const q of rows) counts[q.kind] += 1;
  const strip = h('ol', { class: 'vr-pictos', 'aria-label': 'Every question, in order' },
    ...rows.map((q) => h('li', { title: `Question ${q.n}: ${KIND[q.kind].label}`, 'aria-label': `Question ${q.n}: ${KIND[q.kind].label}` }, starSvg(q.kind), h('span', { text: String(q.n) }))));
  const legend = h('ul', { class: 'picto-legend' },
    ...KINDS.filter((k) => counts[k]).map((k) => h('li', {}, starSvg(k), h('span', { text: `${KIND[k].label}: ${counts[k]}` }))));
  return h('section', { class: 'vr-block' }, h('h3', { text: 'Question by question' }), strip, legend);
}

// ------------------------------------------------------------------ mastery bars

function masteryBars(r) {
  const list = (r.masteryAfter && r.masteryAfter.length ? r.masteryAfter : (r.bySubtopic || []).map((g) => ({ title: g.title, score: g.pct, level: '', n: g.total })))
    .filter((m) => m && typeof m.title === 'string');
  if (!list.length) return null;
  const levelOf = (m) => LEVELS.find((l) => l.label === m.level) || [...LEVELS].reverse().find((l) => num(m.score) >= l.min) || LEVELS[0];
  const rows = list.map((m) => {
    const f = Math.max(0, Math.min(1, num(m.score)));
    return h('li', { class: 'vr-mbar' },
      h('span', { class: 'vr-mbar-name', text: m.title }),
      h('span', { class: 'vr-mbar-track', role: 'img', 'aria-label': `${m.title}: ${Math.round(f * 100)} percent` },
        h('span', { class: 'vr-mbar-fill', style: { width: `${(f * 100).toFixed(1)}%` } })),
      h('span', { class: 'vr-mbar-val', text: pct(f) }),
      levelBadge(levelOf(m)));
  });
  return h('section', { class: 'vr-block' },
    h('h3', { text: 'Mastery in each part, after this session' }),
    h('ul', { class: 'vr-mbars' }, ...rows),
    h('p', { class: 'muted small', text: 'Mastery counts her recent answers in each part, not only this session.' }));
}

// ------------------------------------------------------------------ skill chips

export function skillBand(p) {
  if (p < 0.5) return { id: 'work', label: 'Work on', icon: 'target' };
  if (p < 0.75) return { id: 'getting', label: 'Getting there', icon: 'up' };
  return { id: 'good', label: 'Going well', icon: 'check' };
}

function skillChips(r) {
  const skills = (r.bySkill || []).filter((g) => g && typeof g.title === 'string' && num(g.total) > 0);
  if (!skills.length) return null;
  const chip = (g) => {
    const b = skillBand(num(g.pct));
    return h('li', { class: `vr-chip vr-chip-${b.id}` }, icon(b.icon, { size: 18 }),
      h('span', { class: 'vr-chip-name', text: g.title }),
      h('span', { class: 'vr-chip-val', text: `${num(g.correct)}/${num(g.total)}` }),
      h('span', { class: 'visually-hidden', text: `, ${b.label}` }));
  };
  const weak = skills.filter((g) => num(g.pct) < 0.75).sort((a, b) => num(a.pct) - num(b.pct));
  const strong = skills.filter((g) => num(g.pct) >= 0.75).sort((a, b) => num(b.pct) - num(a.pct));
  return h('section', { class: 'vr-block' },
    h('h3', { text: 'Skills to work on' }),
    weak.length ? h('ul', { class: 'vr-chips' }, ...weak.map(chip)) : h('p', { class: 'muted', text: 'No weak skills in this session.' }),
    strong.length ? h('h4', { class: 'vr-sub', text: 'Going well' }) : null,
    strong.length ? h('ul', { class: 'vr-chips' }, ...strong.map(chip)) : null,
    h('ul', { class: 'vr-key small muted', 'aria-label': 'Key' },
      ...['work', 'getting', 'good'].map((id) => {
        const b = skillBand(id === 'work' ? 0 : id === 'getting' ? 0.6 : 1);
        return h('li', { class: `vr-key-${id}` }, icon(b.icon, { size: 16 }), h('span', { text: id === 'work' ? 'under 50%' : id === 'getting' ? '50 to 74%' : '75% or more' }));
      })));
}

// ------------------------------------------------------------------ time per question

function niceMax(v) {
  const steps = [30, 60, 90, 120, 180, 240, 300, 600, 900, 1200];
  return steps.find((x) => x >= v) || Math.ceil(v / 600) * 600;
}

export function timeChart(rows, o = {}) {
  const W = Math.round(o.width || 640);
  const H = 190;
  const padL = 44;
  const padR = 8;
  const padT = 12;
  const padB = 28;
  const max = niceMax(Math.max(30, ...rows.map((q) => q.timeSec)));
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const band = innerW / Math.max(1, rows.length);
  const bw = Math.max(3, Math.min(24, band - 2)); // a 2px surface gap between neighbours
  const y = (v) => padT + innerH - (v / max) * innerH;
  const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'colchart vr-time', role: 'img', 'aria-label': 'Seconds spent on each question, coloured by result' });
  const ticks = 4;
  for (let i = 0; i <= ticks; i++) {
    const v = (max / ticks) * i;
    svg.appendChild(s('line', { x1: padL, x2: W - padR, y1: y(v), y2: y(v), class: i === 0 ? 'axis' : 'grid' }));
    svg.appendChild(s('text', { x: padL - 6, y: y(v), 'text-anchor': 'end', 'dominant-baseline': 'middle', class: 'tick' }, max <= 180 ? `${Math.round(v)} s` : `${Math.round((v / 60) * 10) / 10} min`));
  }
  const tip = h('div', { class: 'tip', role: 'status' });
  const labelEvery = Math.ceil(rows.length / Math.max(2, Math.floor(innerW / 28)));
  rows.forEach((q, i) => {
    const cx = padL + band * i + band / 2;
    const top = y(q.timeSec);
    const hgt = padT + innerH - top;
    if (hgt > 0.5) {
      const r = Math.min(4, hgt, bw / 2);
      const x0 = cx - bw / 2;
      const yb = padT + innerH;
      svg.appendChild(s('path', { d: `M${x0},${yb} V${top + r} Q${x0},${top} ${x0 + r},${top} H${x0 + bw - r} Q${x0 + bw},${top} ${x0 + bw},${top + r} V${yb} Z`, class: `bar bar-${q.kind}` }));
    }
    if (i % labelEvery === 0 || i === rows.length - 1) svg.appendChild(s('text', { x: cx, y: H - 9, 'text-anchor': 'middle', class: 'tick' }, String(q.n)));
    const text = `Question ${q.n}: ${formatDuration(q.timeSec)}, ${KIND[q.kind].label.toLowerCase()}`;
    const hit = s('rect', { x: padL + band * i, y: padT, width: band, height: innerH, class: 'hit', tabindex: 0, 'aria-label': text });
    const show = () => {
      tip.textContent = text;
      tip.style.left = `${((cx / W) * 100).toFixed(1)}%`;
      tip.style.top = `${((Math.max(top, padT + 12) / H) * 100).toFixed(1)}%`;
      tip.classList.add('show');
    };
    hit.addEventListener('mouseenter', show);
    hit.addEventListener('focus', show);
    hit.addEventListener('click', show);
    hit.addEventListener('mouseleave', () => tip.classList.remove('show'));
    hit.addEventListener('blur', () => tip.classList.remove('show'));
    svg.appendChild(hit);
  });
  const present = KINDS.filter((k) => rows.some((q) => q.kind === k));
  const legend = h('ul', { class: 'vr-legend' }, ...present.map((k) => h('li', {}, h('span', { class: `vr-swatch sw-${k}`, 'aria-hidden': 'true' }), icon(KIND[k].icon, { size: 16 }), h('span', { text: KIND[k].label }))));
  const answered = rows.filter((q) => q.kind !== 'skip');
  const avg = answered.length ? answered.reduce((t, q) => t + q.timeSec, 0) / answered.length : 0;
  const table = h('details', { class: 'table-view' }, h('summary', { text: 'Show as a table' }),
    h('table', { class: 'tbl' },
      h('thead', {}, h('tr', {}, h('th', { text: 'Question' }), h('th', { text: 'Result' }), h('th', { class: 'num', text: 'Time' }))),
      h('tbody', {}, ...rows.map((q) => h('tr', {}, h('td', { text: String(q.n) }), h('td', { text: KIND[q.kind].label }), h('td', { class: 'num', text: formatDuration(q.timeSec) }))))));
  return h('figure', { class: 'chart vr-block' },
    h('figcaption', { text: `Time on each question (average ${formatDuration(avg)} per answered question)` }),
    legend, h('div', { class: 'chart-wrap' }, svg, tip), table);
}

// ------------------------------------------------------------------ trend

/**
 * Score across sessions: one line per subject, oldest to newest, this session marked.
 * sessions: completed session records.
 */
export function trendChart(sessions, o = {}) {
  const done = sessions.filter((x) => x && x.status === 'complete' && x.score && Number.isFinite(x.score.pct)).sort((a, b) => a.startedAt - b.startedAt).slice(-(o.last || 20));
  if (done.length < 2) return null;
  const W = Math.round(o.width || 640);
  const H = 210;
  const padL = 44;
  const padR = 40;
  const padT = 14;
  const padB = 30;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const step = done.length > 1 ? innerW / (done.length - 1) : 0;
  const x = (i) => padL + step * i;
  const y = (p) => padT + innerH - Math.max(0, Math.min(1, p)) * innerH;
  const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'linechart', role: 'img', 'aria-label': o.title || 'Score in each session' });
  for (const v of [0, 0.25, 0.5, 0.75, 1]) {
    svg.appendChild(s('line', { x1: padL, x2: W - padR, y1: y(v), y2: y(v), class: v === 0 ? 'axis' : 'grid' }));
    svg.appendChild(s('text', { x: padL - 6, y: y(v), 'text-anchor': 'end', 'dominant-baseline': 'middle', class: 'tick' }, `${v * 100}%`));
  }
  const subjects = ['maths', 'science'].filter((sub) => done.some((d) => d.subject === sub));
  const NAMES = { maths: 'Mathematics', science: 'Science' };
  for (const sub of subjects) {
    const pts = done.map((d, i) => ({ d, i })).filter(({ d }) => d.subject === sub);
    if (pts.length > 1) {
      svg.appendChild(s('path', { d: pts.map(({ d, i }, k) => `${k ? 'L' : 'M'}${x(i).toFixed(1)},${y(d.score.pct).toFixed(1)}`).join(' '), class: `tline tline-${sub}`, fill: 'none' }));
    }
    for (const { d, i } of pts) {
      const isThis = d.id === o.highlightId;
      svg.appendChild(s('circle', { cx: x(i), cy: y(d.score.pct), r: isThis ? 6 : 4, class: `tdot tdot-${sub}${isThis ? ' is-this' : ''}` }));
    }
    const last = pts[pts.length - 1];
    svg.appendChild(s('text', { x: x(last.i) + 9, y: y(last.d.score.pct), 'dominant-baseline': 'middle', class: 'tlabel' }, `${Math.round(last.d.score.pct * 100)}%`));
  }
  const labelEvery = Math.ceil(done.length / Math.max(2, Math.floor(innerW / 64)));
  done.forEach((d, i) => {
    if (i % labelEvery === 0 || i === done.length - 1) {
      const dt = new Date(d.startedAt);
      svg.appendChild(s('text', { x: x(i), y: H - 9, 'text-anchor': 'middle', class: 'tick' }, `${dt.getDate()}/${dt.getMonth() + 1}`));
    }
  });
  const tip = h('div', { class: 'tip', role: 'status' });
  const band = done.length > 1 ? step : innerW;
  done.forEach((d, i) => {
    const title = d.mode === 'mixed' ? `Mixed revision, ${NAMES[d.subject]}` : (d.topicTitle || NAMES[d.subject]);
    const text = `${formatDate(d.startedAt)}: ${title}, ${pct(d.score.pct)}`;
    const hit = s('rect', { x: Math.max(padL - band / 2, x(i) - band / 2), y: padT, width: band, height: innerH, class: 'hit', tabindex: 0, 'aria-label': text });
    const show = () => {
      tip.textContent = text;
      tip.style.left = `${((x(i) / W) * 100).toFixed(1)}%`;
      tip.style.top = `${((Math.max(y(d.score.pct), padT + 12) / H) * 100).toFixed(1)}%`;
      tip.classList.add('show');
    };
    hit.addEventListener('mouseenter', show);
    hit.addEventListener('focus', show);
    hit.addEventListener('click', show);
    hit.addEventListener('mouseleave', () => tip.classList.remove('show'));
    hit.addEventListener('blur', () => tip.classList.remove('show'));
    svg.appendChild(hit);
  });
  const legend = subjects.length > 1 || o.highlightId
    ? h('ul', { class: 'vr-legend' },
      ...(subjects.length > 1 ? subjects.map((sub) => h('li', {}, h('span', { class: `vr-line-key tline-key-${sub}`, 'aria-hidden': 'true' }), h('span', { text: NAMES[sub] }))) : []),
      o.highlightId && done.some((d) => d.id === o.highlightId) ? h('li', {}, h('span', { class: 'vr-dot-key', 'aria-hidden': 'true' }), h('span', { text: 'This session' })) : null)
    : null;
  const table = h('details', { class: 'table-view' }, h('summary', { text: 'Show as a table' }),
    h('table', { class: 'tbl' },
      h('thead', {}, h('tr', {}, h('th', { text: 'Date' }), h('th', { text: 'Practice' }), h('th', { class: 'num', text: 'Score' }))),
      h('tbody', {}, ...done.slice().reverse().map((d) => h('tr', {},
        h('td', { text: formatDate(d.startedAt) }),
        h('td', { text: d.mode === 'mixed' ? `Mixed revision, ${NAMES[d.subject]}` : (d.topicTitle || NAMES[d.subject]) }),
        h('td', { class: 'num', text: pct(d.score.pct) }))))));
  return h('figure', { class: 'chart vr-block' },
    h('figcaption', { text: o.title || `Score in her last ${done.length} sessions` }),
    legend, h('div', { class: 'chart-wrap' }, svg, tip), table);
}

// ------------------------------------------------------------------ named mistakes

function namedMistakesBlock(report) {
  const codes = namedMistakes(report);
  if (!codes.length) return null;
  const max = Math.max(...codes.map((c) => c.count));
  return h('section', { class: 'vr-block' },
    h('h3', { text: 'Named mistakes in this session' }),
    h('ul', { class: 'vr-named' }, ...codes.map((c) => h('li', {},
      h('span', { class: 'vr-named-label', text: c.label }),
      h('span', { class: 'vr-named-count', role: 'img', 'aria-label': `${c.count} time${c.count === 1 ? '' : 's'}` },
        ...Array.from({ length: Math.min(c.count, 10) }, () => icon('bulb', { size: 16 })),
        h('b', { 'aria-hidden': 'true', text: `${c.count}×` })),
      c.subtopics.length ? h('span', { class: 'muted small vr-named-where', text: c.subtopics.join('; ') }) : null))),
    h('p', { class: 'muted small', text: max > 1 ? 'A mistake made more than once is worth talking through together.' : 'The wrong options of generated questions are built from known mistakes, so the reason can be named.' }));
}

// ------------------------------------------------------------------ the questions she got wrong

/**
 * For a picture-choice question: the option pictures, with her choice and the right one marked.
 * Returns null when the question has no option pictures.
 */
export function choicePictures(q, response, where = 'review', words = { mine: 'Her answer', picked: 'She picked this' }) {
  if (!q || !Array.isArray(q.optionDiagrams) || !Array.isArray(q.options) || !q.optionDiagrams.some((d) => d != null)) return null;
  const mine = new Set(Array.isArray(response) ? response : response == null ? [] : [response]);
  const right = new Set(Array.isArray(q.answer) ? q.answer : [q.answer]);
  const items = q.options.map((text, i) => {
    const tags = [];
    if (mine.has(i)) tags.push(h('span', { class: 'cp-tag cp-mine' }, icon(right.has(i) ? 'check' : 'cross', { size: 16 }), h('span', { text: q.type === 'multi' ? words.picked : words.mine })));
    if (right.has(i)) tags.push(h('span', { class: 'cp-tag cp-right' }, icon('check', { size: 16 }), h('span', { text: 'Correct' })));
    return h('li', { class: `cp-item${mine.has(i) ? ' is-mine' : ''}${right.has(i) ? ' is-right' : ''}` },
      h('span', { class: 'cp-letter', text: String.fromCharCode(65 + i) }),
      optionDiagramFor(q, i, where),
      h('span', { class: 'cp-text', text }),
      ...tags);
  });
  return h('ul', { class: 'choice-pictures', 'aria-label': 'The answer pictures' }, ...items);
}

function wrongQuestions(report, rows, attempts, source, questions) {
  const wrongRows = rows.filter((q) => q.kind === 'wrong' || q.kind === 'part');
  const byQ = new Map(attempts.map((a) => [a.questionId, a]));
  const mistakes = new Map((report.mistakes || []).map((m) => [m.questionId, m]));
  const labels = new Map(namedMistakes(report).map((c) => [c.code, c.label]));
  const sec = h('section', { class: 'vr-block' }, h('h3', { text: 'The questions she got wrong, with her working' }));
  if (!wrongRows.length) {
    sec.append(h('p', { class: 'muted', text: 'No wrong answers in this session.' }));
    return sec;
  }
  const grid = h('ul', { class: 'vr-working' });
  for (const row of wrongRows) {
    const a = byQ.get(row.questionId) || null;
    const m = mistakes.get(row.questionId);
    const q = questions ? questions.get(row.questionId) : null;
    const n = a && Number.isFinite(a.position) ? a.position + 1 : row.n;
    const hasWork = a && ((a.working && a.working.strokes) || a.hasWorking || a.workingPath);
    const codes = (m && Array.isArray(m.codes) ? m.codes : []).filter((c) => typeof c === 'string');
    const slot = hasWork ? h('div', { class: 'vr-working-img' }, h('p', { class: 'muted small', text: 'Loading her working…' })) : null;
    grid.append(h('li', { class: 'vr-working-card' },
      h('p', { class: 'vr-working-q' }, h('strong', { text: `Question ${n}` }), ' ', h('span', { text: q ? q.prompt : m ? m.prompt : '' })),
      q ? diagramFor(q, 'report') : null,
      q ? choicePictures(q, a ? a.response : null, 'report') : null,
      m ? h('p', { class: 'small' }, 'Her answer: ', h('strong', { text: m.yourAnswer }), ' · Correct: ', h('strong', { text: m.correctAnswer })) : null,
      codes.length ? h('p', { class: 'small vr-why' }, icon('bulb', { size: 16 }), h('span', { text: `Likely mistake: ${codes.map((c) => labels.get(c) || c).join('; ')}` })) : null,
      slot || h('p', { class: 'muted small', text: 'No working written on this one.' })));
    if (slot) {
      workingFor(source, a).then((strokes) => {
        slot.replaceChildren(strokes ? workingView(strokes, { label: `Her working for question ${n}` }) : h('p', { class: 'muted small', text: 'Her working could not be loaded.' }));
      }).catch(() => slot.replaceChildren(h('p', { class: 'muted small', text: 'Her working could not be loaded (no connection?).' })));
    }
  }
  sec.append(grid);
  return sec;
}

// ------------------------------------------------------------------ the whole report

/**
 * report: a report record. ctx: { attempts (this session's), sessions (all, for the trend),
 * source (for loading working online), compact (leave out the trend), questions (Map id ->
 * question for this session, the bank plus its generated questions; draws their pictures) }
 */
export function visualReport(report, ctx = {}) {
  const attempts = ctx.attempts || [];
  const rows = questionRows(report, attempts);
  const lines = Array.isArray(report.summary) && report.summary.length ? report.summary : summaryLines(report);
  const root = h('div', { class: 'vreport' });
  root.append(hero(report));
  root.append(h('section', { class: 'vr-summary', 'aria-label': 'Summary' }, ...lines.slice(0, 3).map((t) => h('p', { text: t }))));
  if (rows.length) root.append(pictoStrip(rows));
  const mb = masteryBars(report);
  if (mb) root.append(mb);
  const chips = skillChips(report);
  if (chips) root.append(chips);
  const named = namedMistakesBlock(report);
  if (named) root.append(named);
  if (rows.length) root.append(timeChart(rows, { width: chartWidth(ctx.host) }));
  root.append(wrongQuestions(report, rows, attempts, ctx.source, ctx.questions || null));
  if (!ctx.compact && ctx.sessions) {
    const t = trendChart(ctx.sessions, { highlightId: report.sessionId, width: chartWidth(ctx.host) });
    if (t) root.append(t);
  }
  return root;
}
