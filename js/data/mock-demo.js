// LAPTOP-ONLY demo data for the mock back-end (?backend=mock&demo=1 on localhost), used for
// screenshots and hands-on checks of linked mode without a Supabase project. Loaded only from
// js/app.js when the mock back-end is in use, which js/data/backend.js allows only on localhost.
//
// It goes through the real code paths: sessions are planned, answered, finished and reported by
// js/practice.js on the student's own device database, then sent by the real offline queue.
// The made-up handwriting is drawn with a tiny stroke alphabet below.

import { Db } from '../db.js';
import { loadSubject, indexQuestions, indexTopics } from '../content.js';
import { planSession, submitSession } from '../practice.js';
import { startingOrder } from '../marking.js';
import { encodePoints, emptyWorking, thumbnailDataUrl } from '../working.js';
import { MockBackend } from './mock-backend.js';
import { SyncQueue } from './sync.js';
import { userDbName } from './store.js';
import { studentEmail } from './backend.js';
import { makeRng } from '../sampler.js';

export const DEMO_STUDENT = { username: 'demo-student', password: 'mock-student-pass', displayName: 'Demo' };

// a small handwriting alphabet on a 10 x 16 box: lists of polylines
const GLYPHS = {
  0: [[[5, 0], [1, 3], [0, 8], [1, 13], [5, 16], [9, 13], [10, 8], [9, 3], [5, 0]]],
  1: [[[3, 3], [6, 0], [6, 16]]],
  2: [[[1, 3], [5, 0], [9, 3], [9, 6], [1, 16], [10, 16]]],
  3: [[[1, 1], [8, 1], [4, 7], [9, 10], [9, 13], [5, 16], [1, 14]]],
  4: [[[7, 16], [7, 0], [0, 11], [10, 11]]],
  5: [[[9, 0], [2, 0], [1, 7], [6, 6], [9, 10], [8, 15], [4, 16], [1, 14]]],
  6: [[[8, 1], [3, 4], [1, 10], [3, 15], [7, 15], [9, 11], [6, 8], [2, 10]]],
  7: [[[0, 0], [10, 0], [4, 16]]],
  8: [[[5, 8], [1, 4], [5, 0], [9, 4], [5, 8], [0, 12], [5, 16], [10, 12], [5, 8]]],
  9: [[[9, 6], [5, 9], [1, 6], [4, 1], [9, 3], [9, 9], [6, 16]]],
  '+': [[[1, 8], [9, 8]], [[5, 4], [5, 12]]],
  '-': [[[1, 8], [9, 8]]],
  '=': [[[1, 6], [9, 6]], [[1, 11], [9, 11]]],
  '/': [[[9, 0], [1, 16]]],
  x: [[[2, 5], [8, 13]], [[8, 5], [2, 13]]],
  '.': [[[5, 15], [5.5, 15.6]]],
  '?': [[[1, 3], [5, 0], [9, 3], [5, 8], [5, 11]], [[5, 15], [5.5, 15.6]]],
};

/** Made-up handwriting of a few lines of text, as a working record. */
export function fakeHandwriting(lines, rng = Math.random) {
  const w = emptyWorking(420);
  const size = 2.6; // units per glyph unit
  lines.forEach((line, li) => {
    let x = 40;
    const y0 = 50 + li * 80;
    for (const ch of String(line)) {
      const g = GLYPHS[ch];
      if (g) {
        for (const poly of g) {
          const pts = [];
          for (let i = 0; i < poly.length; i++) {
            const [a, b] = poly[i];
            const [c, d] = poly[Math.min(i + 1, poly.length - 1)];
            for (let t = 0; t < 1; t += 0.25) {
              pts.push({ x: x + (a + (c - a) * t) * size + (rng() - 0.5) * 1.2, y: y0 + (b + (d - b) * t) * size + (rng() - 0.5) * 1.2, p: 0.45 + rng() * 0.35 });
            }
            if (i === poly.length - 1) pts.push({ x: x + a * size, y: y0 + b * size, p: 0.5 });
          }
          w.s.push({ w: 32, p: encodePoints(pts) });
        }
      }
      x += ch === ' ' ? 18 : 32;
    }
  });
  return w;
}

function rightResponse(q) {
  switch (q.type) {
    case 'mcq':
    case 'truefalse':
    case 'order':
      return q.answer;
    case 'multi':
      return [...q.answer].sort((a, b) => a - b);
    case 'numeric':
      return (q.answer.accept && q.answer.accept[0]) || String(q.answer.value);
    case 'short':
      return q.answer.accept[0];
    case 'match': {
      const arr = new Array(q.options.left.length).fill(null);
      for (const [l, r] of q.answer) arr[l] = r;
      return arr;
    }
    default:
      return null;
  }
}

function wrongResponse(q) {
  switch (q.type) {
    case 'mcq': return (q.answer + 1) % q.options.length;
    case 'truefalse': return !q.answer;
    case 'multi': return q.options.map((_, i) => i).filter((i) => !q.answer.includes(i)).slice(0, 1);
    case 'numeric': return String(Number(q.answer.value) + 3);
    case 'short': return 'not sure';
    case 'order': return startingOrder(q);
    case 'match': return rightResponse(q).map((r, i, a) => a[(i + 1) % a.length]);
    default: return null;
  }
}

/** Fill the mock server with a student and a fortnight of practice (once). */
export async function seedDemo(server, studentDomain) {
  if ([...server.tables.profiles.values()].some((p) => p.username === DEMO_STUDENT.username)) return;
  const parent = [...server.tables.profiles.values()].find((p) => p.role === 'parent');
  if (!parent) return;
  const asParent = new MockBackend(server);
  const pu = server.users.get(parent.id);
  await asParent.signIn(pu.email, pu.password);
  const { studentId } = await asParent.invoke('manage-student', { action: 'create', username: DEMO_STUDENT.username, password: DEMO_STUDENT.password, displayName: DEMO_STUDENT.displayName });
  const asStudent = new MockBackend(server);
  await asStudent.signIn(`${DEMO_STUDENT.username}@${studentDomain}`, DEMO_STUDENT.password);
  const db = await Db.open(userDbName(studentId));
  const queue = new SyncQueue({ db, backend: asStudent, userId: studentId });
  const rng = makeRng(20261017);
  const plan = [
    ['maths', 'm09', 0.55, 13], ['maths', 'm09', 0.65, 12], ['science', 's05', 0.6, 11], ['maths', 'm10', 0.5, 9],
    ['maths', 'm09', 0.75, 7], ['science', 's05', 0.72, 6], ['maths', 'm10', 0.62, 4], ['science', 's08', 0.7, 3],
    ['maths', 'm10', 0.7, 1], ['maths', 'm10', 0.62, 0],
  ];
  const day = 86400000;
  const now = Date.now();
  let attempts = [];
  for (const [k, [subject, prefix, skill, ago]] of plan.entries()) {
    const topics = await loadSubject(subject);
    const topic = topics.find((t) => t.topicId.startsWith(prefix)) || topics[0];
    const t0 = now - ago * day - (ago ? 3 * 3600000 : 1800000);
    const ses = planSession({ subject, topic, topics: [topic], mode: 'topic', durationMin: 15, attempts, deviceId: 'demo', contentVersion: 'demo', now: t0, seed: Math.floor(rng() * 1e9) });
    if (k === plan.length - 1) ses.id = 'ses-demo-last'; // a fixed address for screenshots
    const qmap = indexQuestions([topic]);
    const st = ses.state;
    const thumbs = {};
    ses.questionIds.forEach((id, i) => {
      const q = qmap.get(id);
      const roll = rng();
      st.responses[id] = roll < skill ? rightResponse(q) : roll < skill + 0.08 ? null : wrongResponse(q);
      st.times[id] = Math.round(12 + rng() * (q.difficulty * 45));
      if (subject === 'maths' && (i % 2 === 0 || roll >= skill)) {
        const a = 2 + Math.floor(rng() * 7);
        const b = 2 + Math.floor(rng() * 7);
        st.working[id] = fakeHandwriting([`${a}/${b} + 1/${b}`, `= ${a + 1}/${b}`, roll >= skill ? `${a}x${b} = ?` : `${a + 1}/${b}`], rng);
        thumbs[id] = thumbnailDataUrl(st.working[id]);
      }
    });
    const elapsed = Object.values(st.times).reduce((t, x) => t + x, 0);
    const res = await submitSession(db, ses, { questions: qmap, topics: indexTopics([topic]), topicOrder: topics }, { now: t0 + elapsed * 1000, elapsedSec: Math.min(elapsed, ses.limitSec), early: elapsed < ses.limitSec, timedOut: elapsed >= ses.limitSec, thumbs });
    attempts = attempts.concat(res.attempts);
    await queue.enqueue(ses.id);
  }
  await queue.flush({ force: true });
  // and one practice in progress, with working on the first question
  const topics = await loadSubject('maths');
  const topic = topics.find((t) => t.topicId.startsWith('m10')) || topics[0];
  const live = planSession({ subject: 'maths', topic, topics: [topic], mode: 'topic', durationMin: 30, attempts, deviceId: 'demo', contentVersion: 'demo', seed: 77 });
  live.id = 'ses-demo-live';
  live.state.working[live.questionIds[0]] = fakeHandwriting(['3/4 + 1/8', '= 6/8 + 1/8', '= 7/8'], rng);
  live.state.elapsedSec = 140;
  await db.put('sessions', live);
  db.close();
}

/** Sign this tab in as the demo parent or student (laptop preview only). */
export async function demoSignIn(backend, who, studentDomain) {
  if (who === 'student') return backend.signIn(studentEmail(DEMO_STUDENT.username, { studentEmailDomain: studentDomain }), DEMO_STUDENT.password);
  const parent = [...backend.server.tables.profiles.values()].find((p) => p.role === 'parent');
  const u = parent && backend.server.users.get(parent.id);
  return u ? backend.signIn(u.email, u.password) : null;
}
