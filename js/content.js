// Loads the question banks. tools/build_content.py copies the Chief Learning Officer's topic
// files into content/ and writes content/manifest.json, which lists them. All paths are
// relative, so the app works from any folder (for example a GitHub Pages project address).

import { powers } from './marking.js';

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

async function getJson(url) {
  const res = await fetch(url, { cache: 'no-cache' });
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

export function indexQuestions(topics) {
  const m = new Map();
  for (const t of topics) for (const q of t.questions) m.set(q.id, q);
  return m;
}

export function indexTopics(topics) {
  return new Map(topics.map((t) => [t.topicId, t]));
}
