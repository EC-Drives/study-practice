// Loads the question banks. tools/build_content.py copies the Chief Learning Officer's topic
// files into content/ and writes content/manifest.json, which lists them. All paths are
// relative, so the app works from any folder (for example a GitHub Pages project address).

import { powers } from './marking.js';
import { currentSubtopicId } from './bookmap.js';

let manifestPromise = null;
const topicCache = new Map();

export const SUBJECTS = [
  { id: 'maths', title: 'Mathematics', short: 'Maths' },
  { id: 'science', title: 'Science', short: 'Science' },
];

export function subjectTitle(id) {
  const s = SUBJECTS.find((x) => x.id === id);
  return s ? s.title : id;
}

// where content/ is, relative to the page (the test page sits one folder down)
let root = '';
export function setContentRoot(r) {
  root = r;
}

async function getJson(url) {
  const res = await fetch(`${root}${url}`, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`Could not load ${url} (${res.status})`);
  return res.json();
}

export function loadManifest(base = 'content/') {
  if (!manifestPromise) {
    manifestPromise = getJson(`${base}manifest.json`).catch((e) => {
      manifestPromise = null;
      throw e;
    });
  }
  return manifestPromise;
}

/** Topics of one subject from the manifest, in book order. */
export async function topicList(subject) {
  const m = await loadManifest();
  const s = (m.subjects || []).find((x) => x.id === subject);
  return s ? [...s.topics].sort((a, b) => a.order - b.order) : [];
}

export async function loadTopic(topicId) {
  if (topicCache.has(topicId)) return topicCache.get(topicId);
  const m = await loadManifest();
  let entry = null;
  for (const s of m.subjects || []) for (const t of s.topics) if (t.topicId === topicId) entry = t;
  if (!entry) throw new Error(`Unknown topic ${topicId}`);
  const p = getJson(entry.file).then((t) => prepareTopic(t));
  topicCache.set(topicId, p);
  p.catch(() => topicCache.delete(topicId));
  return p;
}

/** Add topicId and subject to every question, so a question can stand on its own. */
export function prepareTopic(t) {
  const pre = t.preamble;
  if (pre) {
    pre.whatYouWillLearn = powers(pre.whatYouWillLearn);
    pre.whyItMatters = powers(pre.whyItMatters);
    if (Array.isArray(pre.realWorld)) pre.realWorld = pre.realWorld.map(powers);
    for (const s of pre.subtopics || []) s.summary = powers(s.summary);
  }
  for (const q of t.questions) {
    q.topicId = t.topicId;
    q.subject = t.subject;
    // display text only: answers and accepted forms stay exactly as written, for marking
    q.prompt = powers(q.prompt);
    q.solution = powers(q.solution);
    if (Array.isArray(q.options)) q.options = q.options.map(powers);
    else if (q.options && q.options.left) q.options = { left: q.options.left.map(powers), right: q.options.right.map(powers) };
    if (q.misconceptions) for (const k of Object.keys(q.misconceptions)) q.misconceptions[k] = powers(q.misconceptions[k]);
  }
  return t;
}

export async function loadSubject(subject) {
  const list = await topicList(subject);
  return Promise.all(list.map((t) => loadTopic(t.topicId)));
}

export async function loadAll() {
  const out = [];
  for (const s of SUBJECTS) out.push(...(await loadSubject(s.id)));
  return out;
}

/** Map question id -> question, over topics and (optionally) mock papers. Ids are unique across both. */
export function indexQuestions(topics, papers = []) {
  const m = new Map();
  for (const t of topics) for (const q of t.questions) m.set(q.id, q);
  for (const p of papers || []) for (const q of p.questions) m.set(q.id, q);
  return m;
}

// ---------------------------------------------------------------- book chapters and sections

/** "Chapter 11", or "Extra topic" for a topic that is not a book chapter (m15). */
export function chapterLabel(t) {
  return Number.isInteger(t.bookChapterNumber) ? `Chapter ${t.bookChapterNumber}` : 'Extra topic';
}

/** Topics in book order: by chapter number, topics without one (extra topics) last. */
export function bookOrder(topics) {
  const key = (t) => (Number.isInteger(t.bookChapterNumber) ? t.bookChapterNumber : 1000 + (t.order || 0));
  return [...topics].sort((a, b) => key(a) - key(b) || (a.order || 0) - (b.order || 0));
}

/**
 * Every book section of the given topics: Map sectionId -> { id, title, page, topicId, topicTitle,
 * chapter (number or null), chapterLabel, rank (book order) }.
 */
export function sectionIndex(topics) {
  const m = new Map();
  let rank = 0;
  for (const t of bookOrder(topics)) {
    for (const s of t.bookSections || []) {
      m.set(s.id, { id: s.id, title: s.title, page: s.page ?? null, topicId: t.topicId, topicTitle: t.title, chapter: Number.isInteger(t.bookChapterNumber) ? t.bookChapterNumber : null, chapterLabel: chapterLabel(t), rank: rank++ });
    }
  }
  return m;
}

/** "12D Read and Make Scatter Graphs (p. 191)" */
export function sectionLabel(s, { page = true } = {}) {
  if (!s) return '';
  return `${s.id} ${s.title}${page && s.page != null ? ` (p. ${s.page})` : ''}`;
}

// ---------------------------------------------------------------- mock papers

const paperCache = new Map();

/** The mock papers of a subject, from the manifest (no questions loaded). */
export async function paperList(subject = 'maths') {
  const m = await loadManifest();
  return (m.papers || []).filter((p) => p.subject === subject);
}

/** The topic a question belongs to, from its subtopic id ("m12-s4" -> "m12-data-handling"). */
function topicIdForSubtopic(manifest, subtopicId) {
  const prefix = String(currentSubtopicId(subtopicId) || '').split('-')[0];
  for (const s of manifest.subjects || []) for (const t of s.topics) if (t.topicId.split('-')[0] === prefix) return t.topicId;
  return null;
}

/**
 * One mock paper, ready to sit: every question gets its topicId and subject (so it counts towards
 * her progress like any question), and a question in a group carries the group's stem and
 * diagram (groupStem, groupDiagram). Everything under `print` is for the printed paper and is
 * left alone.
 */
export async function loadPaper(paperId) {
  if (paperCache.has(paperId)) return paperCache.get(paperId);
  const m = await loadManifest();
  const entry = (m.papers || []).find((p) => p.id === paperId);
  if (!entry) throw new Error(`Unknown paper ${paperId}`);
  const p = getJson(entry.file).then((paper) => preparePaper(paper, m));
  paperCache.set(paperId, p);
  p.catch(() => paperCache.delete(paperId));
  return p;
}

export function preparePaper(paper, manifest = { subjects: [] }) {
  const groups = new Map((paper.groups || []).map((g) => [g.id, g]));
  paper.instructions = (paper.instructions || []).map(powers);
  for (const q of paper.questions) {
    q.paperId = paper.id;
    q.subject = paper.subject;
    q.topicId = topicIdForSubtopic(manifest, q.subtopicId);
    const g = q.group != null ? groups.get(q.group) : null;
    if (g) {
      q.groupStem = powers(g.stem || '');
      if (g.diagram) q.groupDiagram = g.diagram;
    }
    q.prompt = powers(q.prompt);
    q.solution = powers(q.solution);
    if (Array.isArray(q.options)) q.options = q.options.map(powers);
    else if (q.options && q.options.left) q.options = { left: q.options.left.map(powers), right: q.options.right.map(powers) };
    if (q.misconceptions) for (const k of Object.keys(q.misconceptions)) q.misconceptions[k] = powers(q.misconceptions[k]);
    if (Array.isArray(q.markScheme)) q.markScheme = q.markScheme.map((x) => ({ code: x.code, text: powers(x.text) }));
  }
  return paper;
}

/** The papers a list of sessions used (for indexing their questions). */
export async function papersFor(sessions) {
  const ids = [...new Set((sessions || []).filter((s) => s && s.mode === 'paper' && typeof s.paperId === 'string').map((s) => s.paperId))];
  const out = [];
  for (const id of ids) {
    try { out.push(await loadPaper(id)); } catch { /* a paper that no longer exists: its review shows what was saved */ }
  }
  return out;
}

export function indexTopics(topics) {
  return new Map(topics.map((t) => [t.topicId, t]));
}
