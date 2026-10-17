// INTEGRATION POINTS for diagrams and generated questions (v2).
//
// The diagram renderers and question generators are built separately, in js/diagrams/ and
// js/generators/ (owned by the content-engines work; this file does not change them). The app
// calls them only through the two functions below, and works exactly as before when they are
// absent. Contract:
//
//   js/diagrams/index.js    export function renderDiagram(spec, ctx) -> Element | null
//       spec: question.diagram, or question.optionDiagrams[i] for picture choices
//       ctx:  { question, where: 'session' | 'review', option (index, for option pictures),
//               idPrefix (unique per option picture) }
//       Must build DOM/SVG safely (no innerHTML from question text). Returning null or
//       throwing shows nothing (the question still works without its picture).
//
//   js/generators/index.js  export function generate(question, rng) -> question
//       Called once, when a session is planned, for every chosen question that has a
//       `generator` field. rng() returns a number in [0, 1) from the session's seed, so the same
//       session always gets the same numbers. Must return a complete, concrete question in the
//       normal bank format (same id, type, marks, subtopicId, skill, difficulty; concrete prompt,
//       options, answer, solution, misconceptions; it may carry its own `diagram`). Synchronous.
//       The concrete question is stored in the session record (session.instances[id]), so
//       marking, review and reports all see exactly what she saw, on every device.
//
// loadExtensions() is called once at start-up (js/app.js). Tests can inject stand-ins with
// setExtensions().

let diagrams = null;
let generators = null;

async function tryImport(path) {
  try {
    return await import(path);
  } catch {
    return null; // not built yet, or failed to load: carry on without it
  }
}

export async function loadExtensions() {
  const [d, g] = await Promise.all([tryImport('./diagrams/index.js'), tryImport('./generators/index.js')]);
  diagrams = d && typeof d.renderDiagram === 'function' ? d : null;
  generators = g && typeof g.generate === 'function' ? g : null;
  return { diagrams: !!diagrams, generators: !!generators };
}

/** For tests: { renderDiagram } and/or { generate }, or null to remove. */
export function setExtensions({ diagram = undefined, generator = undefined } = {}) {
  if (diagram !== undefined) diagrams = diagram;
  if (generator !== undefined) generators = generator;
}

/** The picture for a question, or null. Never throws. */
export function diagramFor(question, where = 'session') {
  if (!question || question.diagram == null || !diagrams) return null;
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
  if (!question || !Array.isArray(question.optionDiagrams) || question.optionDiagrams[i] == null || !diagrams) return null;
  try {
    const node = diagrams.renderDiagram(question.optionDiagrams[i], { question, where, option: i, idPrefix: `${question.id}-o${i}-` });
    return node && typeof node === 'object' && 'nodeType' in node ? node : null;
  } catch (e) {
    console.warn('Option picture could not be drawn for', question.id, e);
    return null;
  }
}

/** Is a generator loaded? */
export function canGenerate() {
  return !!generators;
}

/** True when a question is a template that needs the generator. */
export function isTemplate(question) {
  return !!(question && question.generator != null);
}

/**
 * A concrete question for a template, or null when no generator is loaded or it fails. The
 * result keeps the template's id and its bookkeeping fields.
 */
export function instantiate(question, rng) {
  if (!isTemplate(question) || !generators) return null;
  try {
    const q = generators.generate(question, rng);
    if (!q || typeof q !== 'object' || typeof q.prompt !== 'string' || !q.type) return null;
    const out = { ...q, id: question.id, topicId: question.topicId, subject: question.subject, subtopicId: q.subtopicId || question.subtopicId };
    delete out.generator;
    return out;
  } catch (e) {
    console.warn('Question could not be generated for', question.id, e);
    return null;
  }
}

/** A session's questions: the bank, with that session's generated versions laid over it. */
export function questionsForSession(qmap, session) {
  const inst = session && session.instances;
  if (!inst || !Object.keys(inst).length) return qmap;
  const m = new Map(qmap);
  for (const [id, q] of Object.entries(inst)) if (q && typeof q === 'object') m.set(id, q);
  return m;
}
