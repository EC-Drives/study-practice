// Chooses the questions for a practice session.
//
// - The number of questions fits the time chosen: each question has an estimated time from its
//   difficulty and marks, and the set is filled to about 80% of the session (the rest is
//   thinking and checking time).
// - Questions are drawn without repeats, weighted towards ones not seen recently, ones she got
//   wrong before, and subtopics where her mastery is low. Each draw uses fresh randomness, so a
//   repeat attempt gets a different set.
// - The difficulty mix follows her mastery, and subtopics are spread rather than bunched.
// - The final order goes from easier to harder (to build confidence), shuffled within a level.

export const SECONDS_BY_DIFFICULTY = { 1: 50, 2: 80, 3: 130 };
export const FILL_SHARE = 0.8;
export const MIN_QUESTIONS = 5;

/** Small fast seeded random number generator (mulberry32). Returns numbers in [0, 1). */
export function makeRng(seed) {
  let a = seed >>> 0;
  return function rng() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomSeed() {
  const c = globalThis.crypto;
  if (c && c.getRandomValues) return c.getRandomValues(new Uint32Array(1))[0];
  return Math.floor(Math.random() * 2 ** 32);
}

export function estimateSeconds(q) {
  const base = SECONDS_BY_DIFFICULTY[q.difficulty] || 100;
  const marks = Number.isInteger(q.marks) ? q.marks : 1;
  return Math.round(base * (1 + 0.2 * Math.max(0, marks - 1)));
}

/** How many seconds of question time a session of this length should hold. */
export function budgetSeconds(durationMin) {
  return durationMin * 60 * FILL_SHARE;
}

/** Target share of difficulty 1/2/3 for a given mastery (0-1, or null when unknown). */
export function difficultyTargets(mastery) {
  if (mastery == null) return { 1: 0.35, 2: 0.45, 3: 0.2 };
  if (mastery < 0.5) return { 1: 0.45, 2: 0.4, 3: 0.15 };
  if (mastery < 0.75) return { 1: 0.3, 2: 0.45, 3: 0.25 };
  return { 1: 0.2, 2: 0.4, 3: 0.4 };
}

/**
 * Weight for one question.
 * history: Map questionId -> { lastSeen: ms, lastCorrect: bool, seen: n, wrong: n }
 * mastery: Map subtopicId -> { score (0-1), n }
 */
export function questionWeight(q, ctx) {
  const { history, mastery, now, mode } = ctx;
  const h = history.get(q.id);
  // recency: unseen questions are preferred; a seen one regains weight over about two weeks
  let recency;
  if (!h) recency = 3;
  else {
    const days = Math.max(0, (now - h.lastSeen) / 86400000);
    recency = Math.min(2.5, 0.15 + days / 6);
    if (!h.lastCorrect) recency *= 1.8; // bring back what she got wrong (spaced repetition)
  }
  const m = mastery.get(q.subtopicId);
  const score = m && m.n > 0 ? m.score : 0.5;
  let weakness = 0.6 + (1 - score) * 1.4;
  if (mode === 'weak') weakness = 0.15 + (1 - score) ** 2 * 5;
  return recency * weakness;
}

function weightedPick(items, weights, rng) {
  let total = 0;
  for (const w of weights) total += w;
  if (total <= 0) return Math.floor(rng() * items.length);
  let x = rng() * total;
  for (let i = 0; i < items.length; i++) {
    x -= weights[i];
    if (x < 0) return i;
  }
  return items.length - 1;
}

function shuffle(arr, rng) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Pick the questions for a session.
 * opts: { pool: question[], durationMin, mode: 'topic'|'subtopic'|'weak'|'mixed',
 *         history: Map, mastery: Map, overallMastery: number|null, rng, now, maxQuestions,
 *         minQuestions (default MIN_QUESTIONS) }
 * Each question should carry topicId (used to spread mixed revision across topics).
 * Returns { questions, estimatedSeconds, budgetSeconds, allUsed }.
 */
export function selectQuestions(opts) {
  const rng = opts.rng || makeRng(randomSeed());
  const now = opts.now ?? Date.now();
  const history = opts.history || new Map();
  const mastery = opts.mastery || new Map();
  const mode = opts.mode || 'topic';
  const budget = budgetSeconds(opts.durationMin);
  const seenIds = new Set();
  const pool = opts.pool.filter((q) => (seenIds.has(q.id) ? false : (seenIds.add(q.id), true)));
  const targets = difficultyTargets(opts.overallMastery ?? null);
  const poolShare = { 1: 0, 2: 0, 3: 0 };
  for (const q of pool) poolShare[q.difficulty] = (poolShare[q.difficulty] || 0) + 1 / pool.length;

  const ctx = { history, mastery, now, mode };
  const remaining = pool.slice();
  let weights = remaining.map((q) => {
    const dFactor = poolShare[q.difficulty] ? (targets[q.difficulty] || 0.2) / poolShare[q.difficulty] : 1;
    return questionWeight(q, ctx) * dFactor;
  });
  const chosen = [];
  let used = 0;
  const maxQ = opts.maxQuestions || Infinity;
  const minQ = opts.minQuestions ?? MIN_QUESTIONS;
  let misses = 0;
  while (remaining.length && chosen.length < maxQ) {
    const i = weightedPick(remaining, weights, rng);
    const q = remaining[i];
    const est = estimateSeconds(q);
    if (used + est > budget && chosen.length >= minQ) {
      // too long for the time left: try a few others, then stop
      if (++misses > 12 || used >= budget * 0.97) break;
      if (remaining.every((x) => used + estimateSeconds(x) > budget)) break;
      continue;
    }
    chosen.push(q);
    used += est;
    remaining.splice(i, 1);
    weights.splice(i, 1);
    // spread: each pick makes its own subtopic (and topic) a little less likely next time
    weights = weights.map((w, k) => {
      let f = 1;
      if (remaining[k].subtopicId === q.subtopicId) f *= 0.7;
      if (mode === 'mixed' && remaining[k].topicId === q.topicId) f *= 0.75;
      return w * f;
    });
  }
  return { questions: easierFirst(chosen, rng), estimatedSeconds: used, budgetSeconds: budget, allUsed: remaining.length === 0 };
}

/** Easier first, shuffled within each difficulty. */
export function easierFirst(list, rng) {
  const byLevel = [1, 2, 3].map((d) => shuffle(list.filter((q) => q.difficulty === d), rng));
  const other = list.filter((q) => ![1, 2, 3].includes(q.difficulty));
  return [...byLevel.flat(), ...other];
}

/** Quick estimate for the set-up screen ("about 14 questions"). */
export function estimateCount(pool, durationMin) {
  if (!pool.length) return 0;
  const avg = pool.reduce((s, q) => s + estimateSeconds(q), 0) / pool.length;
  return Math.max(Math.min(MIN_QUESTIONS, pool.length), Math.min(pool.length, Math.round(budgetSeconds(durationMin) / avg)));
}
