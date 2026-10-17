// Practice sessions: create, save while in progress, and finish (mark, record, report).

import { markQuestion, responseText } from './marking.js';
import { selectQuestions, makeRng, randomSeed, estimateSeconds, budgetSeconds, easierFirst, FILL_SHARE } from './sampler.js';
import { questionHistory, masteryForSampling, subtopicMastery } from './stats.js';
import { buildReport } from './report.js';
import { isTemplate, canGenerate, instantiate, questionsForSession, canTopUp, generatorIds, freshQuestions, generatedRef, misconceptionCodesFor, withCodes } from './hooks.js';

// Generated maths questions (js/generators): about a third of every maths session, and more when
// the bank has few questions left that she has not seen recently.
export const GENERATED_SHARE = 1 / 3;
export const MAX_GENERATED_SHARE = 0.85;
const FRESH_DAYS = 14; // a bank question seen within this many days does not count as fresh
const LOW_FRESH = 3; // fewer fresh bank questions than this in a part and level: make more there

/** A small stable hash of a string, for per-part seeds. */
function hashSeed(...parts) {
  let h = 2166136261;
  for (const ch of parts.join('|')) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * The generated part of a session: candidates for every part (subtopic) and level in scope that
 * has generators, more where the bank is running low, then chosen with the same weighting as
 * the bank (her mastery, the difficulty mix, spread across parts).
 */
function generatedCandidates(pool, topicById, history, now, seed) {
  const cells = new Map();
  const freshSince = now - FRESH_DAYS * 86400000;
  for (const q of pool) {
    const key = `${q.topicId}|${q.subtopicId}`;
    const c = cells.get(key) || { topicId: q.topicId, subtopicId: q.subtopicId, fresh: { 1: 0, 2: 0, 3: 0 }, freshSec: 0 };
    const h = history.get(q.id);
    if (!h || h.lastSeen < freshSince) {
      c.fresh[q.difficulty] = (c.fresh[q.difficulty] || 0) + 1;
      c.freshSec += estimateSeconds(q);
    }
    cells.set(key, c);
  }
  const out = [];
  const seen = new Set();
  for (const c of cells.values()) {
    const topic = topicById.get(c.topicId);
    if (!topic || topic.subject !== 'maths') continue;
    for (const d of [1, 2, 3]) {
      if (!generatorIds(c.topicId, c.subtopicId, d).length) continue;
      const n = (c.fresh[d] || 0) < LOW_FRESH ? 4 : 2;
      for (const q of freshQuestions(topic, n, hashSeed(seed, c.subtopicId, d), { subtopicId: c.subtopicId, difficulty: d })) {
        const k = `${q.prompt}|${JSON.stringify(q.diagram || null)}`;
        if (seen.has(q.id) || seen.has(k)) continue;
        seen.add(q.id);
        seen.add(k);
        out.push(q);
      }
    }
  }
  return out;
}

export const APP_VERSION = '2.0.0';

export function newId(prefix) {
  const r = globalThis.crypto && crypto.getRandomValues ? crypto.getRandomValues(new Uint32Array(2)) : [Math.random() * 2 ** 32, Math.random() * 2 ** 32];
  return `${prefix}-${Date.now().toString(36)}-${(r[0] >>> 0).toString(36)}${(r[1] >>> 0).toString(36)}`;
}

/**
 * Build a new session record (not yet saved).
 * opts: { subject, topic (or null for mixed), topics (all topics in scope), mode, subtopicId,
 *         durationMin, attempts (all past attempts), deviceId, contentVersion, seed, now }
 */
export function planSession(opts) {
  const now = opts.now ?? Date.now();
  const seed = opts.seed ?? randomSeed();
  const topics = opts.topics;
  let pool = topics.flatMap((t) => t.questions);
  // a question template can only be used when its generator is loaded (js/hooks.js)
  if (!canGenerate()) pool = pool.filter((q) => !isTemplate(q));
  if (opts.mode === 'subtopic') pool = pool.filter((q) => q.subtopicId === opts.subtopicId);
  const attempts = opts.attempts || [];
  const mastery = masteryForSampling(attempts);
  if (opts.mode === 'weak') {
    // weak spots: subtopics below 70%, or the three lowest if none is below 70%
    const subs = [...new Set(pool.map((q) => q.subtopicId))];
    const scored = subs.map((id) => ({ id, s: mastery.has(id) ? mastery.get(id).score : 0.5 })).sort((a, b) => a.s - b.s);
    let weak = scored.filter((x) => x.s < 0.7).map((x) => x.id);
    if (!weak.length) weak = scored.slice(0, 3).map((x) => x.id);
    const restricted = pool.filter((q) => weak.includes(q.subtopicId));
    if (restricted.length >= 5) pool = restricted;
  }
  const scopeIds = new Set(pool.map((q) => q.subtopicId));
  const scoped = [...mastery.entries()].filter(([k]) => scopeIds.has(k));
  const overall = scoped.length ? scoped.reduce((s, [, v]) => s + v.score, 0) / scoped.length : null;
  const history = questionHistory(attempts);
  // fresh generated maths questions: a third of the session, more when the bank runs low
  const topicById = new Map(topics.map((t) => [t.topicId, t]));
  const budget = budgetSeconds(opts.durationMin);
  let genShare = 0;
  let candidates = [];
  if (canTopUp() && opts.generated !== false && pool.some((q) => q.subject === 'maths' || (topicById.get(q.topicId) || {}).subject === 'maths')) {
    candidates = generatedCandidates(pool, topicById, history, now, seed);
    if (candidates.length) {
      const freshSince = now - FRESH_DAYS * 86400000;
      const freshSec = pool.filter((q) => { const h = history.get(q.id); return !h || h.lastSeen < freshSince; }).reduce((t, q) => t + estimateSeconds(q), 0);
      genShare = Math.min(MAX_GENERATED_SHARE, Math.max(GENERATED_SHARE, 1 - freshSec / budget));
    }
  }
  const sel = selectQuestions({
    pool,
    durationMin: opts.durationMin * (1 - genShare),
    mode: opts.mode,
    history,
    mastery,
    overallMastery: overall,
    rng: makeRng(seed),
    now,
    minQuestions: genShare > 0 ? 0 : undefined,
  });
  let picked = sel.questions;
  let estimated = sel.estimatedSeconds;
  if (genShare > 0) {
    const left = Math.max(0, budget - sel.estimatedSeconds);
    const gen = selectQuestions({
      pool: candidates,
      durationMin: left / (60 * FILL_SHARE),
      mode: opts.mode,
      history: new Map(),
      mastery,
      overallMastery: overall,
      rng: makeRng(hashSeed(seed, 'generated')),
      now,
      minQuestions: picked.length ? 0 : undefined,
    });
    if (gen.questions.length) {
      picked = easierFirst([...picked, ...gen.questions], makeRng(hashSeed(seed, 'order')));
      estimated += gen.estimatedSeconds;
    }
  }
  // generated questions: made once, from the session's seed, and kept in the session record
  const instances = {};
  const genRng = makeRng((seed ^ 0x5bd1e995) >>> 0);
  for (const q of picked) {
    if (q.generatorId && !isTemplate(q)) {
      instances[q.id] = q;
      continue;
    }
    const inst = isTemplate(q) ? instantiate(q, genRng) : null;
    if (inst) instances[q.id] = inst;
  }
  const chosen = picked.filter((q) => !isTemplate(q) || instances[q.id]);
  const topic = opts.topic || null;
  const sub = topic && opts.subtopicId ? topic.preamble.subtopics.find((s) => s.id === opts.subtopicId) : null;
  return {
    id: newId('ses'),
    deviceId: opts.deviceId || '',
    subject: opts.subject,
    topicId: topic ? topic.topicId : null,
    topicTitle: topic ? topic.title : null,
    mode: opts.mode,
    subtopicId: sub ? sub.id : null,
    subtopicTitle: sub ? sub.title : null,
    durationMin: opts.durationMin,
    limitSec: opts.durationMin * 60,
    questionIds: chosen.map((q) => q.id),
    instances,
    estimatedSec: Math.round(estimated),
    seed,
    startedAt: now,
    endedAt: null,
    status: 'in-progress',
    contentVersion: opts.contentVersion || '',
    appVersion: APP_VERSION,
    state: { responses: {}, flagged: [], current: 0, elapsedSec: 0, times: {}, visited: [], working: {} },
  };
}

/**
 * Mark a session. Returns the finished session and its attempt records; does not save.
 * questions: Map questionId -> question (the session's generated questions are laid over it).
 * how.thumbs: { questionId: PNG data URL } of her working, made by the practice page.
 */
export function finishSession(session, bank, how = {}) {
  const now = how.now ?? Date.now();
  const questions = questionsForSession(bank, session);
  const st = session.state || { responses: {}, flagged: [], times: {} };
  const working = st.working || {};
  const thumbs = how.thumbs || {};
  const flagged = new Set(st.flagged || []);
  const attempts = session.questionIds.map((qid, position) => {
    const q = questions.get(qid);
    const r = Object.prototype.hasOwnProperty.call(st.responses, qid) ? st.responses[qid] : null;
    const m = q ? markQuestion(q, r) : { answered: false, correct: false, earned: 0, fraction: 0, misconceptions: [] };
    return {
      id: `${session.id}|${qid}`,
      sessionId: session.id,
      questionId: qid,
      topicId: q ? q.topicId : null,
      subtopicId: q ? q.subtopicId : null,
      subject: session.subject,
      skill: q ? q.skill : '',
      type: q ? q.type : '',
      difficulty: q ? q.difficulty : null,
      marks: q && Number.isInteger(q.marks) ? q.marks : 1,
      position,
      response: r,
      responseText: q ? responseText(q, r) : '',
      answered: m.answered,
      correct: m.correct,
      earned: m.earned,
      fraction: m.fraction,
      misconceptions: q ? withCodes(q, m.misconceptions) : m.misconceptions,
      // catalogue codes of those misconceptions (generated questions carry them), for the reports
      misconceptionCodes: q ? misconceptionCodesFor(q, m.misconceptions) : [],
      // a generated question: the recipe that rebuilds it (the full question is in session.instances)
      generated: generatedRef(q) || undefined,
      timeSec: Math.round(((st.times || {})[qid] || 0) * 10) / 10,
      flagged: flagged.has(qid),
      answeredAt: now,
      // her working for this question (vector strokes + a small picture), when she wrote any
      working: working[qid] ? { strokes: working[qid], thumb: thumbs[qid] || null } : undefined,
    };
  });
  for (const a of attempts) {
    if (a.working === undefined) delete a.working;
    if (a.generated === undefined) delete a.generated;
  }
  const earned = attempts.reduce((s, a) => s + a.earned, 0);
  const max = attempts.reduce((s, a) => s + a.marks, 0);
  const done = {
    ...session,
    status: 'complete',
    endedAt: now,
    timeUsedSec: Math.round(how.elapsedSec ?? st.elapsedSec ?? 0),
    submittedEarly: !!how.early,
    timedOut: !!how.timedOut,
    score: {
      earned,
      max,
      pct: max ? earned / max : 0,
      correct: attempts.filter((a) => a.correct).length,
      total: attempts.length,
      answered: attempts.filter((a) => a.answered).length,
    },
    state: null,
    responses: Object.fromEntries(session.questionIds.map((id) => [id, st.responses[id] ?? null])),
  };
  return { session: done, attempts };
}

/** Finish, build the report, and save everything in one transaction. */
export async function submitSession(db, session, ctx, how) {
  const { session: done, attempts } = finishSession(session, ctx.questions, how);
  ctx = { ...ctx, questions: questionsForSession(ctx.questions, session) };
  const allSessions = (await db.getAll('sessions')).filter((s) => s.id !== done.id).concat(done);
  const allAttempts = (await db.getAll('attempts')).concat(attempts);
  const report = buildReport(done, attempts, { ...ctx, sessions: allSessions, attempts: allAttempts });
  await db.putMany([
    { store: 'sessions', value: done },
    ...attempts.map((a) => ({ store: 'attempts', value: a })),
    { store: 'reports', value: report },
  ]);
  return { session: done, attempts, report };
}

export { subtopicMastery };
