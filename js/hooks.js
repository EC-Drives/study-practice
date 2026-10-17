// INTEGRATION POINTS for diagrams and generated questions (v2).
//
// The diagram renderers and question generators live in js/diagrams/ and js/generators/ (their
// contracts: docs/diagram-spec.md and js/generators/README.md). The app calls them only through
// this file, and works exactly as version 1 when they are absent.
//
//   js/diagrams/index.js    renderDiagram(spec, opts) -> Element (never throws)
//       spec: question.diagram, or question.optionDiagrams[i] for picture choices
//       opts: { question, where: 'session' | 'review' | 'report', option, idPrefix }
//       Builds DOM/SVG only (no HTML strings), so data from her device is safe to draw.
//
//   js/generators/index.js  generate(generatorId, seed, difficulty) -> question
//                           generateSet(topicId, count, seed, { subtopicId, difficulty })
//                           generatorsFor(topicId, subtopicId?, difficulty?) -> ids
//                           MISCONCEPTION_CODES   code -> description
//       A generated question is a complete bank-format question plus generatorId, seed and
//       misconceptionCodes; (generatorId, seed, difficulty) rebuilds it exactly.
//
// Generated questions are made once, when a session is planned, and the concrete question is
// stored in the session record (session.instances[id]); each attempt also carries the recipe
// (attempt.generated = { generatorId, seed, difficulty }). Review, reports and the parent's
// device use the stored question (exactly what she saw); if it is missing or damaged, it is
// rebuilt from the recipe. Stored questions are checked field by field before use, because in
// linked mode they come from rows her device wrote.
//
// loadExtensions() is called once at start-up (js/app.js). Tests can inject stand-ins with
// setExtensions().

import { powers } from './marking.js';

let diagrams = null;
let generators = null;

async function tryImport(path) {
  try {
    return await import(path);
  } catch (e) {
    console.warn('Could not load', path, e);
    return null; // not built, or failed to load: carry on without it
  }
}

export async function loadExtensions() {
  const [d, g] = await Promise.all([tryImport('./diagrams/index.js'), tryImport('./generators/index.js')]);
  diagrams = d && typeof d.renderDiagram === 'function' ? d : null;
  generators = g && typeof g.generate === 'function' ? g : null;
  return { diagrams: !!diagrams, generators: !!generators };
}

/** For tests: { renderDiagram } and/or { generate, generateSet, generatorsFor }, or null to remove. */
export function setExtensions({ diagram = undefined, generator = undefined } = {}) {
  if (diagram !== undefined) diagrams = diagram;
  if (generator !== undefined) generators = generator;
}

// ------------------------------------------------------------------ diagrams

/** The picture for a question, or null. Never throws. */
export function diagramFor(question, where = 'session') {
  if (!question || question.diagram == null || typeof question.diagram !== 'object' || !diagrams) return null;
  try {
    const node = diagrams.renderDiagram(question.diagram, { question, where });
    return node && typeof node === 'object' && 'nodeType' in node ? node : null;
  } catch (e) {
    console.warn('Diagram could not be drawn for', question.id, e);
    return null;
  }
}

/** The picture for answer option i (question.optionDiagrams[i], picture choices), or null. */
export function optionDiagramFor(question, i, where = 'session') {
  if (!question || !Array.isArray(question.optionDiagrams) || question.optionDiagrams[i] == null || typeof question.optionDiagrams[i] !== 'object' || !diagrams) return null;
  const tag = String(question.id || 'q').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 80);
  try {
    const node = diagrams.renderDiagram(question.optionDiagrams[i], { question, where, option: i, idPrefix: `${tag}-${where}-o${i}-` });
    return node && typeof node === 'object' && 'nodeType' in node ? node : null;
  } catch (e) {
    console.warn('Option picture could not be drawn for', question.id, e);
    return null;
  }
}

/** True when a question has any picture (its own or on its options). */
export function hasPictures(question) {
  return !!(question && (question.diagram != null || (Array.isArray(question.optionDiagrams) && question.optionDiagrams.some((d) => d != null))));
}

// ------------------------------------------------------------------ generators

/** Is a generator loaded? */
export function canGenerate() {
  return !!generators;
}

/** Can this generator engine make fresh questions for a topic (not only fill templates)? */
export function canTopUp() {
  return !!(generators && typeof generators.generateSet === 'function' && typeof generators.generatorsFor === 'function');
}

/** Generator ids for a topic (and subtopic, and difficulty); [] when none. */
export function generatorIds(topicId, subtopicId = null, difficulty = null) {
  if (!canTopUp()) return [];
  try {
    return generators.generatorsFor(topicId, subtopicId, difficulty) || [];
  } catch {
    return [];
  }
}

/** What a misconception code means ("Adds the tops and the bottoms"), or null. */
export function misconceptionLabel(code) {
  const all = generators && generators.MISCONCEPTION_CODES;
  if (!all || typeof code !== 'string' || !Object.prototype.hasOwnProperty.call(all, code)) return null;
  return powers(all[code]);
}

/** Display preparation, as content.js does for bank questions (answers stay as written). */
export function prepareGenerated(q, topic) {
  const out = { ...q, topicId: topic.topicId, subject: topic.subject };
  if (q.generatorId && generators && generators.GENERATOR_VERSION) out.generatorVersion = generators.GENERATOR_VERSION;
  out.prompt = powers(out.prompt);
  out.solution = powers(out.solution);
  if (Array.isArray(out.options)) out.options = out.options.map(powers);
  else if (out.options && out.options.left) out.options = { left: out.options.left.map(powers), right: out.options.right.map(powers) };
  if (out.misconceptions) out.misconceptions = Object.fromEntries(Object.entries(out.misconceptions).map(([k, v]) => [k, powers(v)]));
  return out;
}

/** The recipe that rebuilds a generated question, or null for a bank question. */
export function generatedRef(q) {
  if (!q || typeof q.generatorId !== 'string' || !Number.isFinite(q.seed)) return null;
  return { generatorId: q.generatorId, seed: q.seed, difficulty: Number.isInteger(q.difficulty) ? q.difficulty : null, v: typeof q.generatorVersion === 'string' ? q.generatorVersion : null };
}

/** True when a question is a template that needs the generator. */
export function isTemplate(question) {
  return !!(question && question.generator != null);
}

/**
 * A concrete question for a bank template (`"generator": "m10.add-sub-unlike"` or
 * `{ "id": ..., "difficulty": 2 }`), or null when no generator is loaded or it fails. The result
 * keeps the template's id, topic and subject.
 */
export function instantiate(question, rng) {
  if (!isTemplate(question) || !generators) return null;
  try {
    const ref = typeof question.generator === 'string' ? { id: question.generator } : question.generator;
    if (!ref || typeof ref.id !== 'string') return null;
    const seed = Math.floor(rng() * 4294967296) >>> 0;
    const q = generators.generate(ref.id, seed, ref.difficulty ?? question.difficulty);
    if (!validQuestion(q)) return null;
    const out = prepareGenerated({ ...q, id: question.id, subtopicId: q.subtopicId || question.subtopicId }, question);
    delete out.generator;
    return out;
  } catch (e) {
    console.warn('Question could not be generated for', question.id, e);
    return null;
  }
}

/**
 * `count` fresh questions for one topic (optionally one subtopic and difficulty), ready to use.
 * [] when the topic has no generators.
 */
export function freshQuestions(topic, count, seed, opts = {}) {
  if (!canTopUp() || count <= 0) return [];
  try {
    return generators.generateSet(topic.topicId, count, seed, opts)
      .filter(validQuestion)
      .map((q) => prepareGenerated(q, topic));
  } catch (e) {
    console.warn('Fresh questions could not be made for', topic.topicId, e);
    return [];
  }
}

/**
 * Rebuild a generated question from its recipe, or null. Only with the same generator version that
 * made it: a later version may draw different numbers or words for the same seed, and the rebuilt
 * question must be exactly the one she answered (the reports then fall back to their stored text).
 */
export function rebuild(ref, topic) {
  if (!generators || !ref || typeof ref.generatorId !== 'string' || !Number.isFinite(ref.seed)) return null;
  if (!ref.v || ref.v !== generators.GENERATOR_VERSION) return null;
  try {
    const q = generators.generate(ref.generatorId, ref.seed, ref.difficulty ?? undefined);
    return validQuestion(q) ? prepareGenerated(q, topic || { topicId: null, subject: 'maths' }) : null;
  } catch {
    return null;
  }
}

// ------------------------------------------------------------------ checking stored questions

const TYPES = new Set(['mcq', 'multi', 'truefalse', 'short', 'numeric', 'order', 'match']);
const isObj = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
const str = (x, max = 5000) => typeof x === 'string' && x.length <= max;
const int = (x, lo, hi) => Number.isInteger(x) && x >= lo && x <= hi;
const strList = (x, max = 20) => Array.isArray(x) && x.length >= 1 && x.length <= max && x.every((s) => str(s, 1000));
const strMap = (x, max = 1000) => x == null || (isObj(x) && Object.keys(x).length <= 60 && Object.entries(x).every(([k, v]) => k.length <= 300 && str(v, max)));
const optObj = (x) => x == null || isObj(x);

/**
 * Is this a complete, well-formed question (every field the app reads has the right type and a
 * sane size)? Used for generated questions, which in linked mode come from her device's rows.
 */
export function validQuestion(q) {
  if (!isObj(q) || !str(q.id, 120) || !q.id || !TYPES.has(q.type) || !str(q.prompt) || !str(q.solution || '', 10000)) return false;
  if (!(q.marks == null || int(q.marks, 1, 10)) || !(q.difficulty == null || int(q.difficulty, 1, 3))) return false;
  if (!(q.subtopicId == null || str(q.subtopicId, 120)) || !(q.skill == null || str(q.skill, 300)) || !(q.topicId == null || str(q.topicId, 120))) return false;
  if (!strMap(q.misconceptions) || !strMap(q.misconceptionCodes, 100)) return false;
  if (!optObj(q.diagram) || !(q.optionDiagrams == null || (Array.isArray(q.optionDiagrams) && q.optionDiagrams.length <= 20 && q.optionDiagrams.every(optObj)))) return false;
  // pictures: the renderer's own checker (types, fields, and limits that keep drawing cheap)
  if (diagrams && typeof diagrams.validateDiagram === 'function') {
    try {
      if (q.diagram != null && diagrams.validateDiagram(q.diagram).length) return false;
      if (Array.isArray(q.optionDiagrams) && q.optionDiagrams.some((d) => d != null && diagrams.validateDiagram(d).length)) return false;
    } catch {
      return false;
    }
  }
  const a = q.answer;
  switch (q.type) {
    case 'mcq': return strList(q.options) && int(a, 0, q.options.length - 1);
    case 'multi': return strList(q.options) && Array.isArray(a) && a.length >= 1 && a.every((i) => int(i, 0, q.options.length - 1));
    case 'order': return strList(q.options) && Array.isArray(a) && a.length === q.options.length && a.every((i) => int(i, 0, q.options.length - 1));
    case 'match': return isObj(q.options) && strList(q.options.left) && strList(q.options.right) && Array.isArray(a) && a.length >= 1
      && a.every((p) => Array.isArray(p) && p.length === 2 && int(p[0], 0, q.options.left.length - 1) && int(p[1], 0, q.options.right.length - 1));
    case 'truefalse': return typeof a === 'boolean';
    case 'numeric': return isObj(a) && Number.isFinite(a.value) && (a.tolerance == null || Number.isFinite(a.tolerance)) && (a.accept == null || (Array.isArray(a.accept) && a.accept.length <= 50 && a.accept.every((x) => str(x, 300))));
    case 'short': return isObj(a) && Array.isArray(a.accept) && a.accept.length <= 50 && a.accept.every((x) => str(x, 300)) && (a.keywords == null || (Array.isArray(a.keywords) && a.keywords.length <= 30 && a.keywords.every((x) => str(x, 300))));
    default: return false;
  }
}

/**
 * A session's questions: the bank, with that session's generated questions laid over it.
 * attempts (optional): the session's attempts, whose recipes rebuild a question whose stored
 * copy is missing or damaged. topics (optional): Map topicId -> topic, for that rebuild.
 */
export function questionsForSession(qmap, session, attempts = [], topics = null) {
  const inst = session && isObj(session.instances) ? session.instances : {};
  const refs = new Map();
  for (const a of attempts || []) if (a && isObj(a.generated)) refs.set(a.questionId, { ...a.generated, topicId: a.topicId });
  if (!Object.keys(inst).length && !refs.size) return qmap;
  const m = new Map(qmap);
  const stored = new Set();
  for (const [id, q] of Object.entries(inst)) {
    if (validQuestion(q)) {
      m.set(id, q);
      stored.add(id);
    } else if (!refs.has(id) && isObj(q) && typeof q.generatorId === 'string') {
      refs.set(id, { generatorId: q.generatorId, seed: q.seed, difficulty: q.difficulty, topicId: q.topicId, v: q.generatorVersion });
    }
  }
  for (const [id, ref] of refs) {
    if (stored.has(id)) continue;
    const topic = topics && ref.topicId ? topics.get(ref.topicId) : null;
    const q = rebuild(ref, topic || { topicId: ref.topicId || null, subject: (session && session.subject) || 'maths' });
    if (q) m.set(id, { ...q, id });
  }
  return m;
}

/**
 * Codes that are not misconceptions: a near miss, and a typed answer that matches none of the
 * listed wrong answers (the "common" entry). They are never counted or quoted in reports.
 */
export const NOT_COUNTED = new Set(['NEAR-MISS', 'UNCLASSIFIED']);

/** The catalogue code a question gives one misconception key ('1', '3/7', 'common'), or null. */
export function codeFor(q, key) {
  const codes = q && isObj(q.misconceptionCodes) ? q.misconceptionCodes : null;
  const c = codes && Object.prototype.hasOwnProperty.call(codes, key) ? codes[key] : null;
  return typeof c === 'string' && c ? c : null;
}

/** The marking's findings with each one's code added ([{ key, note }] -> [{ key, note, code }]). */
export function withCodes(q, found) {
  if (!Array.isArray(found)) return [];
  return found.map((m) => { const c = m ? codeFor(q, m.key) : null; return c ? { ...m, code: c } : m; });
}

/** The countable catalogue codes of the misconceptions marking found (no near misses, no unclassified). */
export function misconceptionCodesFor(q, found) {
  const out = [];
  for (const m of found || []) {
    const c = m ? codeFor(q, m.key) : null;
    if (c && !NOT_COUNTED.has(c) && !out.includes(c)) out.push(c);
  }
  return out;
}
