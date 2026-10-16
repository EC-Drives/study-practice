// Practice sessions: create, save while in progress, and finish (mark, record, report).

import { markQuestion, responseText } from './marking.js';
import { selectQuestions, makeRng, randomSeed } from './sampler.js';
import { questionHistory, masteryForSampling, subtopicMastery } from './stats.js';
import { buildReport } from './report.js';

export const APP_VERSION = '1.0.0';

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
  const sel = selectQuestions({
    pool,
    durationMin: opts.durationMin,
    mode: opts.mode,
    history: questionHistory(attempts),
    mastery,
    overallMastery: overall,
    rng: makeRng(seed),
    now,
  });
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
    questionIds: sel.questions.map((q) => q.id),
    estimatedSec: Math.round(sel.estimatedSeconds),
    seed,
    startedAt: now,
    endedAt: null,
    status: 'in-progress',
    contentVersion: opts.contentVersion || '',
    appVersion: APP_VERSION,
    state: { responses: {}, flagged: [], current: 0, elapsedSec: 0, times: {}, visited: [] },
  };
}

/**
 * Mark a session. Returns the finished session and its attempt records; does not save.
 * questions: Map questionId -> question.
 */
export function finishSession(session, questions, how = {}) {
  const now = how.now ?? Date.now();
  const st = session.state || { responses: {}, flagged: [], times: {} };
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
      misconceptions: m.misconceptions,
      timeSec: Math.round(((st.times || {})[qid] || 0) * 10) / 10,
      flagged: flagged.has(qid),
      answeredAt: now,
    };
  });
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
