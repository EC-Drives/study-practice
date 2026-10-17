// Maths question generators: fresh questions with exactly computed answers, worked solutions and
// distractors built from named misconceptions. Seeded, so a question can be reproduced.
//
//   GENERATORS                    every generator's metadata (id, topicId, subtopicId, skill, title, difficulties)
//   REGISTRY                      { topicId: { subtopicId: [generatorId, ...] } }
//   generate(id, seed, difficulty?)            one question (difficulty from the seed when left out)
//   generateFor(topicId, subtopicId, difficulty, seed)   a question for a topic, optionally a subtopic
//                                 and difficulty (null = any); null when nothing fits
//   generatorsFor(topicId, subtopicId?, difficulty?)     the matching generator ids
//   generateSet(topicId, count, seed, opts?)   `count` different questions for a topic (no repeats)
//   MISCONCEPTION_CODES           code -> description for every misconception code in use
//
// A generated question has every key of a bank question plus `generatorId` and `seed`:
// generate(q.generatorId, q.seed, q.difficulty) gives the same question again.

import { makeRng, finish } from './core.js';
import { ALL_CODES, MERGED_CODES } from './misconceptions.js';
// Topic modules load one by one, so a problem in one topic file cannot stop the others (or the app).
const TOPIC_FILES = ['m01-place-value', 'm02-number-system', 'm03-shapes-angles', 'm04-volume-capacity', 'm05-add-subtract', 'm06-multiply-divide', 'm07-patterns', 'm08-probability', 'm09-fdp', 'm10-fractions-calc', 'm11-ratio', 'm12-data', 'm13-coordinates', 'm14-reflection-rotation', 'm15-time-measures'];
export const LOAD_ERRORS = [];
/** Changes whenever a generator's output for a given (id, seed, difficulty) may change, so an app
 * only rebuilds a saved question from its recipe with the same generators that made it. */
export const GENERATOR_VERSION = '2026-10-17.2';
const MODULES = await Promise.all(TOPIC_FILES.map((f) => import(`./${f}.js`).catch((e) => {
  LOAD_ERRORS.push(`${f}: ${e && e.message}`);
  console.error(`Generators: could not load ${f}.js`, e);
  return { default: [] };
})));
const ALL = MODULES.flatMap((m) => m.default);

/** Every misconception code a generated question may carry, with its one wording: the CLO's
 * catalogue in misconceptions.js (declared there once). Old codes that were merged into another
 * keep a label (the new code's wording), so answers saved before the merge still read well. */
export const MISCONCEPTION_CODES = { ...Object.fromEntries(Object.entries(MERGED_CODES).map(([o, n]) => [o, ALL_CODES[n]])), ...ALL_CODES };
const BY_ID = new Map(ALL.map((g) => [g.id, g]));
if (BY_ID.size !== ALL.length) throw new Error('two generators share an id');

const prefixOf = (topicId) => topicId.slice(0, 3);

export const GENERATORS = ALL.map((g) => ({ id: g.id, topicId: g.topicId, subtopicId: g.subtopicId, skill: g.skill, title: g.title, difficulties: [...g.difficulties], check: { ...(g.check || {}) } }));

export const REGISTRY = {};
for (const g of ALL) {
  REGISTRY[g.topicId] ||= {};
  (REGISTRY[g.topicId][g.subtopicId] ||= []).push(g.id);
}

/** One question from a generator. Same (id, seed, difficulty), same question. */
export function generate(generatorId, seed, difficulty) {
  const g = BY_ID.get(generatorId);
  if (!g) throw new Error(`no generator ${generatorId}`);
  const s = Number.isFinite(Number(seed)) ? Math.abs(Math.trunc(Number(seed))) >>> 0 : 0;
  const d = g.difficulties.includes(difficulty) ? difficulty : g.difficulties[makeRng('difficulty', generatorId, s).int(0, g.difficulties.length - 1)];
  const rng = makeRng(generatorId, s, d);
  let lastErr;
  for (let attempt = 0; attempt < 25; attempt++) {
    try {
      const body = g.make(rng, d);
      return finish({ id: g.id, prefix: prefixOf(g.topicId), subtopicId: g.subtopicId, skill: g.skill }, s, d, body);
    } catch (e) {
      lastErr = e; // rare: not enough distinct distractors for these numbers; draw again from the same stream
      if (/ran too long/.test(e.message)) break;
    }
  }
  throw new Error(`${generatorId} seed ${s}: ${lastErr && lastErr.message}`);
}

/** Generator ids for a topic, optionally one subtopic and one difficulty. */
export function generatorsFor(topicId, subtopicId = null, difficulty = null) {
  return ALL.filter((g) => g.topicId === topicId && (!subtopicId || g.subtopicId === subtopicId) && (!difficulty || g.difficulties.includes(difficulty))).map((g) => g.id);
}

/** A fresh question for a topic (and subtopic, and difficulty, when given). Null when none fits. */
export function generateFor(topicId, subtopicId, difficulty, seed) {
  const ids = generatorsFor(topicId, subtopicId, difficulty);
  if (!ids.length) return null;
  const s = Math.abs(Math.trunc(Number(seed) || 0)) >>> 0;
  const rng = makeRng('pick', topicId, subtopicId || '', difficulty || '', s);
  const id = ids[rng.int(0, ids.length - 1)];
  return generate(id, s, difficulty || undefined);
}

/**
 * `count` different questions for a topic: no two with the same prompt (the same question with
 * its options shuffled counts as a repeat, CLO review X7). Seeds run on from `seed`.
 * opts: { subtopicId, difficulty }.
 */
export function generateSet(topicId, count, seed, opts = {}) {
  const out = [];
  const seen = new Set();
  let s = Math.abs(Math.trunc(Number(seed) || 0)) >>> 0;
  for (let tries = 0; out.length < count && tries < count * 20; tries++, s = (s + 1) >>> 0) {
    let q;
    try { q = generateFor(topicId, opts.subtopicId || null, opts.difficulty || null, s); } catch { continue; } // a seed that cannot be built is skipped
    if (!q) break;
    // the same prompt with shuffled options is a repeat (CLO review X7); a different picture is not
    const key = `${q.prompt}|${JSON.stringify(q.diagram || null)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(q);
  }
  return out;
}

/** Topics with at least one generator. */
export const GENERATED_TOPICS = Object.keys(REGISTRY);
