// Progress arithmetic: mastery per subtopic and chapter, time and questions per day / week /
// month, streaks, personal bests and question history. Pure functions over stored records.

import { currentSubtopicId } from './bookmap.js';

const DAY = 86400000;
const DIFF_WEIGHT = { 1: 1, 2: 1.25, 3: 1.5 };

const pad = (n) => String(n).padStart(2, '0');

/** Local calendar day, e.g. "2026-10-16". */
export function dayKey(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** The Monday that starts the week containing ts, as a day key. */
export function weekKey(ts) {
  const d = new Date(ts);
  const back = (d.getDay() + 6) % 7;
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - back);
  return dayKey(monday.getTime());
}

export function monthKey(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

function startOfDay(ts) {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function formatDate(ts, withDay = false) {
  const d = new Date(ts);
  const base = `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  return withDay ? `${DAYS[d.getDay()]} ${base}` : base;
}

export function formatTime(ts) {
  const d = new Date(ts);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const completed = (sessions) => sessions.filter((s) => s.status === 'complete');

/**
 * Questions answered and time spent per day, week or month, for the last n periods (oldest
 * first). Time comes from completed sessions; questions are the ones she answered.
 */
export function activity(sessions, unit, n, now = Date.now()) {
  const keyOf = unit === 'month' ? monthKey : unit === 'week' ? weekKey : dayKey;
  const buckets = [];
  const index = new Map();
  for (let i = n - 1; i >= 0; i--) {
    let ts;
    if (unit === 'month') {
      const d = new Date(now);
      ts = new Date(d.getFullYear(), d.getMonth() - i, 1).getTime();
    } else if (unit === 'week') {
      ts = startOfDay(now) - i * 7 * DAY;
    } else {
      const d = new Date(now);
      ts = new Date(d.getFullYear(), d.getMonth(), d.getDate() - i, 12).getTime();
    }
    const key = keyOf(ts);
    if (index.has(key)) continue;
    const b = { key, ts, questions: 0, seconds: 0, sessions: 0 };
    index.set(key, b);
    buckets.push(b);
  }
  for (const s of completed(sessions)) {
    const b = index.get(keyOf(s.startedAt));
    if (!b) continue;
    b.sessions += 1;
    b.seconds += s.timeUsedSec || 0;
    b.questions += s.score ? s.score.answered : 0;
  }
  for (const b of buckets) {
    const d = new Date(b.ts);
    b.label = unit === 'month' ? `${MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`
      : unit === 'week' ? `${d.getDate()} ${MONTHS[d.getMonth()]}`
        : `${d.getDate()} ${MONTHS[d.getMonth()]}`;
  }
  return buckets;
}

export function totals(sessions) {
  const done = completed(sessions);
  return {
    sessions: done.length,
    questions: done.reduce((s, x) => s + (x.score ? x.score.answered : 0), 0),
    seconds: done.reduce((s, x) => s + (x.timeUsedSec || 0), 0),
  };
}

export const LEVELS = [
  { id: 'none', label: 'Not started', min: -1 },
  { id: 'work', label: 'Needs work', min: 0 },
  { id: 'getting', label: 'Getting there', min: 0.5 },
  { id: 'good', label: 'Good', min: 0.7 },
  { id: 'mastered', label: 'Mastered', min: 0.85 },
];

export function levelFor(score, n) {
  if (!n) return LEVELS[0];
  if (score >= 0.85 && n >= 6) return LEVELS[4];
  if (score >= 0.7) return LEVELS[3];
  if (score >= 0.5) return LEVELS[2];
  return LEVELS[1];
}

/**
 * Mastery for each subtopic from her attempts: the most recent 20 attempts, newer ones and
 * harder ones counting more. Returns Map subtopicId -> { score, n, correct, lastAt, level }.
 * `adjusted` pulls a score with few attempts towards 50%, for question selection.
 */
export function subtopicMastery(attempts) {
  const by = new Map();
  for (const a of attempts) {
    // answers saved before the book mapping (17 Oct 2026) count under the subtopic's new id
    const sid = currentSubtopicId(a.subtopicId);
    if (!by.has(sid)) by.set(sid, []);
    by.get(sid).push(a);
  }
  const out = new Map();
  for (const [sid, list] of by) {
    list.sort((x, y) => y.answeredAt - x.answeredAt);
    const recent = list.slice(0, 20);
    let sw = 0;
    let sf = 0;
    recent.forEach((a, i) => {
      const w = 0.9 ** i * (DIFF_WEIGHT[a.difficulty] || 1);
      sw += w;
      sf += w * (a.fraction ?? (a.correct ? 1 : 0));
    });
    const score = sw ? sf / sw : 0;
    const adjusted = (sf + 0.5) / (sw + 1);
    out.set(sid, {
      score,
      adjusted,
      n: list.length,
      correct: list.filter((a) => a.correct).length,
      lastAt: list[0].answeredAt,
      level: levelFor(score, list.length),
    });
  }
  return out;
}

/** For the sampler: Map subtopicId -> { score (shrunk towards 50%), n }. */
export function masteryForSampling(attempts) {
  const m = subtopicMastery(attempts);
  const out = new Map();
  for (const [k, v] of m) out.set(k, { score: v.adjusted, n: v.n });
  return out;
}

/** Map questionId -> { lastSeen, lastCorrect, seen, wrong } */
export function questionHistory(attempts) {
  const out = new Map();
  for (const a of attempts) {
    const h = out.get(a.questionId) || { lastSeen: 0, lastCorrect: true, seen: 0, wrong: 0 };
    h.seen += 1;
    if (!a.correct) h.wrong += 1;
    if (a.answeredAt >= h.lastSeen) {
      h.lastSeen = a.answeredAt;
      h.lastCorrect = !!a.correct;
    }
    out.set(a.questionId, h);
  }
  return out;
}

/**
 * Chapter summary: mastery averaged over the subtopics she has tried, coverage = share of the
 * chapter's questions she has seen at least once.
 */
export function topicSummary(topic, mastery, attempts) {
  const subs = topic.preamble.subtopics.map((s) => ({ ...s, m: mastery.get(s.id) || null }));
  const tried = subs.filter((s) => s.m);
  const score = tried.length ? tried.reduce((t, s) => t + s.m.score, 0) / tried.length : null;
  const ids = new Set(topic.questions.map((q) => q.id));
  const seen = new Set(attempts.filter((a) => ids.has(a.questionId)).map((a) => a.questionId));
  const n = attempts.filter((a) => a.topicId === topic.topicId).length;
  return {
    topicId: topic.topicId,
    title: topic.title,
    subtopics: subs,
    score,
    n,
    coverage: ids.size ? seen.size / ids.size : 0,
    level: levelFor(score ?? 0, n),
    started: tried.length > 0,
  };
}

/** Consecutive days with at least one finished session, counting back from today (or yesterday). */
export function streak(sessions, now = Date.now()) {
  const days = new Set(completed(sessions).map((s) => dayKey(s.endedAt || s.startedAt)));
  let count = 0;
  let d = startOfDay(now);
  if (!days.has(dayKey(d))) d -= DAY;
  while (days.has(dayKey(d + 12 * 3600000))) {
    count += 1;
    d = startOfDay(d - 12 * 3600000);
  }
  return { days: count, practisedToday: days.has(dayKey(now)) };
}

export function longestStreak(sessions) {
  const days = [...new Set(completed(sessions).map((s) => dayKey(s.endedAt || s.startedAt)))].sort();
  let best = 0;
  let run = 0;
  let prev = null;
  for (const k of days) {
    const [y, m, dd] = k.split('-').map(Number);
    const t = new Date(y, m - 1, dd, 12).getTime();
    run = prev != null && Math.round((t - prev) / DAY) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = t;
  }
  return best;
}

export const scopeKey = (s) => {
  if (s.mode === 'mixed') return `mixed:${s.subject}`;
  if (s.mode === 'paper') return `paper:${s.paperId}`;
  if (s.mode === 'section') return `section:${s.bookSection}`;
  return s.topicId;
};

const pct = (s) => (s.score && s.score.max ? s.score.earned / s.score.max : 0);

/** Best percentage per chapter (or mixed revision), from sessions with at least 5 answers. */
export function personalBests(sessions) {
  const out = new Map();
  for (const s of completed(sessions)) {
    if (!s.score || s.score.answered < 5) continue;
    const k = scopeKey(s);
    const p = pct(s);
    const cur = out.get(k);
    if (!cur || p > cur.pct) out.set(k, { pct: p, sessionId: s.id, at: s.startedAt });
  }
  return out;
}

/** How this session compares with earlier ones on the same chapter. */
export function celebrate(session, sessions) {
  const k = scopeKey(session);
  const earlier = completed(sessions)
    .filter((s) => s.id !== session.id && scopeKey(s) === k && s.startedAt < session.startedAt)
    .sort((a, b) => b.startedAt - a.startedAt);
  const p = pct(session);
  const prev = earlier[0] ? pct(earlier[0]) : null;
  const eligible = earlier.filter((s) => s.score && s.score.answered >= 5);
  const best = eligible.length ? Math.max(...eligible.map(pct)) : null;
  const eligibleNow = !!(session.score && session.score.answered >= 5);
  let personalBest = false;
  if (eligibleNow) personalBest = best == null ? 'first' : p > best + 1e-9;
  return { pct: p, previousPct: prev, improvement: prev == null ? null : p - prev, personalBest, previousBest: best };
}

/** The chapter she worked on most recently. */
export function currentTopic(sessions) {
  const s = completed(sessions).filter((x) => x.topicId).sort((a, b) => b.startedAt - a.startedAt)[0];
  return s ? s.topicId : null;
}

/** Misconceptions shown by wrong answers, most frequent first. */
export function misconceptionTally(attempts, sinceTs = 0) {
  // A finding with a catalogue code (generated questions) is counted by its code, so the same
  // mistake adds up across questions; near misses and unclassified slips are not misconceptions
  // and are left out. A bank question's note (no code) is counted per question and option.
  const by = new Map();
  for (const a of attempts) {
    if (a.correct || a.answeredAt < sinceTs || !Array.isArray(a.misconceptions)) continue;
    const seen = new Set();
    for (const m of a.misconceptions) {
      if (!m) continue;
      const code = typeof m.code === 'string' && m.code ? m.code : null;
      if (code && (code === 'NEAR-MISS' || code === 'UNCLASSIFIED')) continue;
      const k = code ? `code:${code}` : `${a.questionId}|${m.key}`;
      if (seen.has(k)) continue;
      seen.add(k);
      const cur = by.get(k) || { questionId: a.questionId, subtopicId: currentSubtopicId(a.subtopicId), topicId: a.topicId, skill: a.skill, note: m.note, code, count: 0, lastAt: 0 };
      cur.count += 1;
      cur.lastAt = Math.max(cur.lastAt, a.answeredAt);
      by.set(k, cur);
    }
  }
  return [...by.values()].sort((x, y) => y.count - x.count || y.lastAt - x.lastAt);
}

/**
 * Named misconceptions (catalogue codes, e.g. FR-ADD-TOPS-BOTTOMS) counted across answers since
 * a time: [{ code, count, lastAt, subtopicIds, skills }], most frequent first. Generated questions
 * carry these codes; bank questions without codes are counted by misconceptionTally() instead.
 */
export function misconceptionCodeTally(attempts, sinceTs = 0) {
  const by = new Map();
  for (const a of attempts) {
    if (!a || a.correct || !(a.answeredAt >= sinceTs) || !Array.isArray(a.misconceptionCodes)) continue;
    for (const code of new Set(a.misconceptionCodes)) {
      if (typeof code !== 'string' || !code || code.length > 100 || code === 'NEAR-MISS' || code === 'UNCLASSIFIED') continue;
      const cur = by.get(code) || { code, count: 0, lastAt: 0, subtopicIds: [], skills: [] };
      cur.count += 1;
      cur.lastAt = Math.max(cur.lastAt, a.answeredAt);
      const sid = currentSubtopicId(a.subtopicId);
      if (sid && !cur.subtopicIds.includes(sid)) cur.subtopicIds.push(sid);
      if (a.skill && !cur.skills.includes(a.skill)) cur.skills.push(a.skill);
      by.set(code, cur);
    }
  }
  return [...by.values()].sort((x, y) => y.count - x.count || y.lastAt - x.lastAt || (x.code < y.code ? -1 : 1));
}

/**
 * Answers per book section over all her attempts: Map sectionId -> { answers, correct, earned,
 * max, lastAt }. `sectionOf(attempt)` gives an attempt's section (attempts saved before sections
 * existed carry none; the caller can look the question up).
 */
export function sectionTally(attempts, sectionOf = (a) => a.bookSection) {
  const out = new Map();
  for (const a of attempts) {
    const id = sectionOf(a);
    if (typeof id !== 'string' || !id) continue;
    const g = out.get(id) || { id, answers: 0, correct: 0, earned: 0, max: 0, lastAt: 0 };
    g.answers += 1;
    if (a.correct) g.correct += 1;
    g.earned += a.earned || 0;
    g.max += a.marks || 1;
    g.lastAt = Math.max(g.lastAt, a.answeredAt || 0);
    out.set(id, g);
  }
  return out;
}

/** Correct / total per skill. */
export function skillTally(attempts) {
  const by = new Map();
  for (const a of attempts) {
    const k = a.skill || 'general';
    const cur = by.get(k) || { skill: k, total: 0, correct: 0, earned: 0, max: 0 };
    cur.total += 1;
    if (a.correct) cur.correct += 1;
    cur.earned += a.earned || 0;
    cur.max += a.marks || 1;
    by.set(k, cur);
  }
  return [...by.values()].map((s) => ({ ...s, pct: s.total ? s.correct / s.total : 0 }));
}
