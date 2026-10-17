// The parent report made after every session: what she understands and what she does not,
// strengths and weaknesses by subtopic and skill, misconceptions shown by wrong answers, time
// used, and what to practise next. Also the email (mailto:) text and a standalone HTML file.

import { responseText, correctAnswerText } from './marking.js';
import { subtopicMastery, formatDate, formatTime, celebrate, streak } from './stats.js';
import { formatDuration } from './timer.js';

export const SUBJECT_TITLES = { maths: 'Mathematics', science: 'Science' };
export const MAILTO_LIMIT = 1900; // longest mailto: link we create; some Windows mail apps cut at about 2,000

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/** A number for HTML: always a plain finite number (a report can come from an imported file). */
const num = (x) => {
  const v = Number(x);
  return Number.isFinite(v) ? String(Math.round(v * 100) / 100) : '0';
};

const pctText = (x) => `${Math.round((x || 0) * 100)}%`;
// cuts by characters, never inside a surrogate pair (which would break encodeURIComponent)
const shorten = (s, n) => {
  const t = [...String(s || '').replace(/\s+/g, ' ').trim()];
  return t.length > n ? `${t.slice(0, Math.max(0, n - 1)).join('').trimEnd()}…` : t.join('');
};

export function focusLabel(session) {
  switch (session.mode) {
    case 'subtopic': return `one subtopic: ${session.subtopicTitle || ''}`;
    case 'weak': return 'weak spots';
    case 'mixed': return 'mixed revision across the subject';
    default: return 'whole chapter';
  }
}

export function scopeTitle(session) {
  if (session.mode === 'mixed') return `Mixed revision (${SUBJECT_TITLES[session.subject] || session.subject})`;
  return `${SUBJECT_TITLES[session.subject] || session.subject}: ${session.topicTitle || session.topicId}`;
}

/**
 * Build the report object.
 * ctx: { questions: Map id->question, topics: Map topicId->topic, sessions: all sessions
 *        (including this one), attempts: all attempts (including this session's),
 *        topicOrder: topics of the subject sorted by order }
 */
export function buildReport(session, sessionAttempts, ctx) {
  const qmap = ctx.questions;
  const subTitle = new Map();
  const subTopic = new Map();
  for (const t of ctx.topics.values()) {
    for (const s of t.preamble.subtopics) {
      subTitle.set(s.id, s.title);
      subTopic.set(s.id, t.title);
    }
  }
  const atts = [...sessionAttempts].sort((a, b) => a.position - b.position);
  const answered = atts.filter((a) => a.answered);
  const score = {
    earned: atts.reduce((s, a) => s + a.earned, 0),
    max: atts.reduce((s, a) => s + a.marks, 0),
    correct: atts.filter((a) => a.correct).length,
    total: atts.length,
    answered: answered.length,
    unanswered: atts.length - answered.length,
  };
  score.pct = score.max ? score.earned / score.max : 0;

  const group = (keyFn, labelFn) => {
    const m = new Map();
    for (const a of atts) {
      const k = keyFn(a);
      const g = m.get(k) || { id: k, title: labelFn(a), total: 0, correct: 0, earned: 0, max: 0, answered: 0 };
      g.total += 1;
      if (a.correct) g.correct += 1;
      if (a.answered) g.answered += 1;
      g.earned += a.earned;
      g.max += a.marks;
      m.set(k, g);
    }
    return [...m.values()].map((g) => ({ ...g, pct: g.max ? g.earned / g.max : 0 }));
  };
  const bySubtopic = group((a) => a.subtopicId, (a) => subTitle.get(a.subtopicId) || a.subtopicId)
    .map((g) => ({ ...g, topicTitle: subTopic.get(g.id) || '' }))
    .sort((a, b) => b.pct - a.pct);
  const bySkill = group((a) => a.skill || 'general', (a) => a.skill || 'general').sort((a, b) => b.pct - a.pct);
  const byDifficulty = {};
  for (const d of [1, 2, 3]) {
    const list = atts.filter((a) => a.difficulty === d);
    byDifficulty[d] = { total: list.length, correct: list.filter((a) => a.correct).length };
  }

  const understands = bySubtopic.filter((g) => g.total >= 2 && g.pct >= 0.75).map((g) => g.title);
  const needsWork = bySubtopic.filter((g) => g.pct < 0.5 && g.answered > 0).map((g) => g.title).reverse();
  const strongSkills = bySkill.filter((g) => g.total >= 2 && g.pct >= 0.75).map((g) => g.title);
  const weakSkills = bySkill.filter((g) => g.pct < 0.5 && g.answered > 0).map((g) => g.title).reverse();

  const wrong = atts.filter((a) => a.answered && !a.correct);
  const misconceptions = [];
  const seenNotes = new Set();
  for (const a of wrong) {
    for (const m of a.misconceptions || []) {
      if (seenNotes.has(m.note)) continue;
      seenNotes.add(m.note);
      misconceptions.push({ questionId: a.questionId, subtopic: subTitle.get(a.subtopicId) || '', skill: a.skill, note: m.note });
    }
  }
  const mistakes = atts.filter((a) => !a.correct).map((a) => {
    const q = qmap.get(a.questionId);
    return {
      questionId: a.questionId,
      position: a.position + 1,
      subtopic: subTitle.get(a.subtopicId) || '',
      skill: a.skill,
      prompt: q ? shorten(q.prompt, 160) : a.questionId,
      yourAnswer: a.answered ? (q ? responseText(q, a.response) : String(a.response)) : 'No answer',
      correctAnswer: q ? correctAnswerText(q) : '',
      earned: a.earned,
      marks: a.marks,
    };
  });
  const quickWrong = wrong.filter((a) => a.timeSec < 15).length;
  const timeUsedSec = session.timeUsedSec || 0;
  const limitSec = session.limitSec || session.durationMin * 60;

  // mastery after this session for the subtopics it touched
  const mastery = subtopicMastery(ctx.attempts);
  const masteryAfter = bySubtopic.map((g) => {
    const m = mastery.get(g.id);
    return { id: g.id, title: g.title, score: m ? m.score : g.pct, level: m ? m.level.label : '', n: m ? m.n : g.total };
  });

  const cel = celebrate(session, ctx.sessions);
  const st = streak(ctx.sessions, session.endedAt || Date.now());

  // what to practise next
  const recs = [];
  const weakest = bySubtopic.filter((g) => g.pct < 0.7 && g.answered > 0).slice(-2).reverse();
  for (const g of weakest) {
    recs.push(`Practise "${g.title}"${session.mode === 'mixed' && g.topicTitle ? ` (${g.topicTitle})` : ''}: a 15-minute session focused on that one subtopic.`);
  }
  if (misconceptions[0]) recs.push(`Talk through this mistake together: ${shorten(misconceptions[0].note, 140)}`);
  if (score.unanswered >= Math.max(2, score.total * 0.2) && session.timedOut) {
    recs.push('Pace: several questions were left when time ran out. Try answering the ones she is sure of first, then come back to flagged ones.');
  } else if (score.unanswered >= 2) {
    recs.push(`${score.unanswered} questions were left unanswered. Encourage a best guess: a try can earn marks, a blank cannot.`);
  }
  if (quickWrong >= 2) recs.push(`${quickWrong} wrong answers were given in under 15 seconds. Slowing down and checking each answer may win easy marks.`);
  const d1 = byDifficulty[1];
  const d3 = byDifficulty[3];
  if (d1.total >= 2 && d1.correct / d1.total < 0.6) recs.push('Some basic questions were missed: revisit the key ideas of this chapter before moving to harder problems.');
  if (d3.total >= 2 && d3.correct / d3.total < 0.4 && d1.total && d1.correct / d1.total >= 0.8) recs.push('The basics are secure; the harder multi-step questions are the next step. Practise reading them slowly and writing down each step.');
  if (score.pct >= 0.85 && score.answered >= 5) {
    const order = ctx.topicOrder || [];
    const i = order.findIndex((t) => t.topicId === session.topicId);
    const next = i >= 0 ? order[i + 1] : null;
    if (session.mode !== 'mixed' && next) recs.push(`Ready to move on: start "${next.title}" next, and come back to this chapter for a mixed revision later.`);
    else recs.push('Excellent work: try a longer session or a mixed revision to keep it fresh.');
  }
  if (!recs.length) recs.push('Keep going: another session on this chapter in a day or two will help it stick.');

  // per question, for the visual report (time per question, pictograms, her working)
  const kindOf = (a) => (!a.answered ? 'skip' : a.correct ? 'right' : a.earned > 0 ? 'part' : 'wrong');
  const perQuestion = atts.map((a) => ({
    n: a.position + 1,
    questionId: a.questionId,
    kind: kindOf(a),
    timeSec: Math.round((a.timeSec || 0) * 10) / 10,
    earned: a.earned,
    marks: a.marks,
    hasWorking: !!(a.working && a.working.strokes),
  }));

  const report = {
    v: 2,
    sessionId: session.id,
    createdAt: Date.now(),
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    subject: session.subject,
    subjectTitle: SUBJECT_TITLES[session.subject] || session.subject,
    topicId: session.topicId || null,
    title: scopeTitle(session),
    focus: focusLabel(session),
    mode: session.mode,
    durationMin: session.durationMin,
    limitSec,
    timeUsedSec,
    submittedEarly: !!session.submittedEarly,
    timedOut: !!session.timedOut,
    avgSecPerAnswer: score.answered ? timeUsedSec / score.answered : 0,
    score,
    bySubtopic,
    bySkill,
    byDifficulty,
    understands,
    needsWork,
    strongSkills,
    weakSkills,
    misconceptions,
    mistakes,
    quickWrong,
    flagged: atts.filter((a) => a.flagged).length,
    masteryAfter,
    comparison: { previousPct: cel.previousPct, improvement: cel.improvement, personalBest: cel.personalBest, previousBest: cel.previousBest },
    streakDays: st.days,
    recommendations: recs.slice(0, 5),
    perQuestion,
  };
  report.summary = summaryLines(report);
  return report;
}

// ---------------------------------------------------------------- plain-English summary

/**
 * Two or three short lines for the top of the visual report: how it went, what was strong and
 * weak, and the one thing worth knowing. Works for older reports too (built from their fields).
 */
export function summaryLines(r) {
  const s = r.score || {};
  const lines = [];
  const c = r.comparison || {};
  let cmp = '';
  if (c.personalBest === true) cmp = ' A new personal best.';
  else if (c.improvement != null) {
    const pts = Math.round(c.improvement * 100);
    cmp = pts > 0 ? ` Up ${pts} points on last time.` : pts < 0 ? ` Down ${-pts} points on last time.` : ' The same score as last time.';
  }
  lines.push(`She scored ${pctText(s.pct)} on ${r.title} (${r.focus}): ${s.correct} of ${s.total} questions fully right in ${formatDuration(r.timeUsedSec)}.${cmp}`);
  const parts = (r.bySubtopic || []).filter((g) => g.answered > 0 || g.total > 0);
  const best = parts.filter((g) => g.pct >= 0.75 && g.total >= 2).sort((a, b) => b.pct - a.pct)[0];
  const worst = parts.filter((g) => g.pct < 0.6).sort((a, b) => a.pct - b.pct)[0];
  if (best && worst) lines.push(`Strongest: ${best.title} (${pctText(best.pct)}). Needs work: ${worst.title} (${pctText(worst.pct)}).`);
  else if (worst) lines.push(`Needs work: ${worst.title} (${pctText(worst.pct)}).`);
  else if (best) lines.push(`Every part went well; strongest was ${best.title} (${pctText(best.pct)}).`);
  if (s.unanswered >= 2 && r.timedOut) lines.push(`Time ran out with ${s.unanswered} questions unanswered: pace is the thing to practise.`);
  else if (r.quickWrong >= 2) lines.push(`${r.quickWrong} wrong answers came in under 15 seconds: slowing down to check would win easy marks.`);
  else if (r.misconceptions && r.misconceptions[0]) lines.push(`Worth talking through: ${shorten(r.misconceptions[0].note, 140)}`);
  else if (s.unanswered >= 2) lines.push(`${s.unanswered} questions were left blank.`);
  return lines.slice(0, 3);
}

/** The whole report as plain text, for "Copy report" (no length limit, unlike the email link). */
export function reportPlainText(r, notice = '') {
  const lines = emailLines(r, notice).map((x) => x[1]);
  const i = lines.lastIndexOf('The full report with every question is in the parent area on her device (Reports).');
  if (i >= 0) lines.splice(i, 1);
  if (r.mistakes && r.mistakes.length) {
    lines.push('', 'Questions not fully right:');
    for (const m of r.mistakes) lines.push(`Q${m.position}. ${m.prompt}`, `   Her answer: ${m.yourAnswer}. Correct: ${m.correctAnswer}.`);
  }
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

// ---------------------------------------------------------------- email text

export function emailSubject(r) {
  return `Practice report: ${r.title}, ${formatDate(r.startedAt)} (${pctText(r.score.pct)})`;
}

function comparisonLine(r) {
  const c = r.comparison;
  const parts = [];
  if (c.personalBest === true) parts.push('New personal best!');
  if (c.improvement != null) {
    const pts = Math.round(c.improvement * 100);
    parts.push(pts > 0 ? `Up ${pts} points on last time.` : pts < 0 ? `Down ${-pts} points on last time.` : 'Same score as last time.');
  }
  if (r.streakDays >= 2) parts.push(`${r.streakDays}-day practice streak.`);
  return parts.join(' ');
}

/** Plain-text body, in order of importance. Each entry is [priority, line]; lower is kept longer. */
function emailLines(r, notice = '') {
  const s = r.score;
  const L = [];
  if (notice) L.push([0, notice], [0, '']);
  L.push([0, `Practice report, ${formatDate(r.startedAt, true)} at ${formatTime(r.startedAt)}`]);
  L.push([0, `${r.title} (${r.focus}), ${r.durationMin}-minute session`]);
  L.push([0, `Score: ${s.earned} of ${s.max} marks (${pctText(s.pct)}); ${s.correct} of ${s.total} questions fully right${s.unanswered ? `, ${s.unanswered} not answered` : ''}.`]);
  L.push([0, `Time used: ${formatDuration(r.timeUsedSec)} of ${formatDuration(r.limitSec)}${r.timedOut ? ' (time ran out)' : r.submittedEarly ? ' (finished early)' : ''}.`]);
  const cmp = comparisonLine(r);
  if (cmp) L.push([1, cmp]);
  L.push([0, '']);
  if (r.understands.length) L.push([1, `Understands well: ${r.understands.join('; ')}`]);
  if (r.needsWork.length) L.push([0, `Needs more work: ${r.needsWork.join('; ')}`]);
  if (r.strongSkills.length) L.push([3, `Strong skills: ${r.strongSkills.join('; ')}`]);
  if (r.weakSkills.length) L.push([2, `Weaker skills: ${r.weakSkills.join('; ')}`]);
  if (r.misconceptions.length) {
    L.push([2, '']);
    L.push([1, 'Misconceptions her wrong answers showed:']);
    r.misconceptions.slice(0, 4).forEach((m, i) => L.push([i < 2 ? 1 : 3, `- ${shorten(m.note, 150)}`]));
  }
  L.push([0, '']);
  L.push([0, 'What to practise next:']);
  r.recommendations.slice(0, 4).forEach((x, i) => L.push([i < 2 ? 0 : 2, `${i + 1}. ${shorten(x, 170)}`]));
  L.push([0, '']);
  L.push([0, 'The full report with every question is in the parent area on her device (Reports).']);
  return L;
}

export function mailtoUrl(to, subject, body) {
  const enc = (x) => encodeURIComponent(x);
  return `mailto:${to ? encodeURIComponent(to).replace(/%40/g, '@') : ''}?subject=${enc(subject)}&body=${enc(body.replace(/\r?\n/g, '\r\n'))}`;
}

/** The subject, shortened if it alone would push the link over the limit. */
function fittedSubject(r, to, limit) {
  let subject = emailSubject(r);
  while (subject.length > 20 && mailtoUrl(to, subject, '').length > limit * 0.5) subject = shorten(subject, Math.floor(subject.length * 0.8));
  return subject;
}

/**
 * Email body text that keeps the whole mailto: link under `limit` characters. `notice` is a line
 * that must come first (for example that the parent PIN was reset).
 */
export function emailBody(r, to = '', limit = MAILTO_LIMIT, notice = '') {
  let lines = emailLines(r, notice);
  const subject = fittedSubject(r, to, limit);
  const fits = (b) => mailtoUrl(to, subject, b).length <= limit;
  const build = (ls) => ls.map((x) => x[1]).join('\n').replace(/\n{3,}/g, '\n\n').trim();
  for (let p = 3; p >= 1; p--) {
    if (fits(build(lines))) break;
    lines = lines.filter((x) => x[0] < p);
  }
  let body = build(lines);
  // next: shorten the longest lines (a fixed number of rounds, so this always ends)
  for (let round = 0; round < 60 && !fits(body) && body.length > 80; round++) {
    const parts = body.split('\n');
    const i = parts.reduce((bi, x, k) => (x.length > parts[bi].length ? k : bi), 0);
    if (parts[i].length <= 30) break;
    parts[i] = shorten(parts[i], Math.max(30, Math.floor(parts[i].length * 0.7)));
    body = parts.join('\n');
  }
  // last resort: cut the body to the longest start that fits
  if (!fits(body)) {
    const chars = [...body];
    let lo = 0;
    let hi = chars.length;
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      if (fits(`${chars.slice(0, mid).join('')}…`)) lo = mid;
      else hi = mid - 1;
    }
    body = lo > 0 ? `${chars.slice(0, lo).join('')}…` : '';
  }
  return body;
}

export function reportMailto(r, to, notice = '') {
  const t = to || '';
  return mailtoUrl(t, fittedSubject(r, t, MAILTO_LIMIT), emailBody(r, t, MAILTO_LIMIT, notice));
}

/** The line that goes first in every report email after the parent PIN was reset on the device. */
export function pinResetNotice(at) {
  return at ? `NOTE FOR DAD: the parent PIN on this device was reset on ${formatDate(at, true)} at ${formatTime(at)}, which also cleared the saved email address. If you did not do this, open the parent area and check Settings.` : '';
}

// ---------------------------------------------------------------- HTML

function bar(p) {
  const w = Math.round(Math.max(0, Math.min(1, p)) * 100);
  return `<span class="rbar" aria-hidden="true"><span style="width:${w}%"></span></span>`;
}

/** Report body as HTML (every value escaped). Used in the app and in the downloadable file. */
export function reportBodyHtml(r) {
  const s = r.score;
  const cmp = comparisonLine(r);
  const rows = (list) => list.map((g) => `<tr><td>${esc(g.title)}${g.topicTitle && r.mode === 'mixed' ? `<br><small>${esc(g.topicTitle)}</small>` : ''}</td><td class="num">${num(g.correct)} / ${num(g.total)}</td><td class="num">${pctText(g.pct)}</td><td>${bar(g.pct)}</td></tr>`).join('');
  const li = (xs) => xs.map((x) => `<li>${esc(x)}</li>`).join('');
  const out = [];
  out.push(`<p class="rmeta">${esc(formatDate(r.startedAt, true))}, ${esc(formatTime(r.startedAt))}. ${esc(r.focus)}; ${num(r.durationMin)}-minute session.</p>`);
  out.push(`<div class="rtiles">
    <div class="rtile"><b>${pctText(s.pct)}</b><span>score (${num(s.earned)} of ${num(s.max)} marks)</span></div>
    <div class="rtile"><b>${num(s.correct)} / ${num(s.total)}</b><span>questions fully right</span></div>
    <div class="rtile"><b>${esc(formatDuration(r.timeUsedSec))}</b><span>time used of ${esc(formatDuration(r.limitSec))}${r.timedOut ? ', time ran out' : ''}</span></div>
    <div class="rtile"><b>${num(s.unanswered)}</b><span>not answered</span></div>
  </div>`);
  if (cmp) out.push(`<p class="rcmp">${esc(cmp)}</p>`);
  out.push('<h3>What she understands, and what she does not yet</h3>');
  out.push(`<p><strong>Understands well:</strong> ${r.understands.length ? esc(r.understands.join('; ')) : 'not enough evidence yet from this session.'}</p>`);
  out.push(`<p><strong>Needs more work:</strong> ${r.needsWork.length ? esc(r.needsWork.join('; ')) : 'nothing stood out as weak in this session.'}</p>`);
  out.push(`<h3>By subtopic</h3><table class="rtable"><thead><tr><th>Subtopic</th><th class="num">Right</th><th class="num">Marks</th><th><span class="sr">Bar</span></th></tr></thead><tbody>${rows(r.bySubtopic)}</tbody></table>`);
  out.push(`<h3>By skill</h3><table class="rtable"><thead><tr><th>Skill</th><th class="num">Right</th><th class="num">Marks</th><th><span class="sr">Bar</span></th></tr></thead><tbody>${rows(r.bySkill)}</tbody></table>`);
  const d = r.byDifficulty;
  out.push(`<p class="rmeta">By difficulty: easier ${num(d[1].correct)}/${num(d[1].total)}, medium ${num(d[2].correct)}/${num(d[2].total)}, harder ${num(d[3].correct)}/${num(d[3].total)}. Average ${num(Math.round(r.avgSecPerAnswer))} s per answered question.${r.quickWrong ? ` ${num(r.quickWrong)} wrong answer(s) in under 15 s.` : ''}</p>`);
  if (r.misconceptions.length) {
    out.push(`<h3>Misconceptions her wrong answers showed</h3><ul>${r.misconceptions.map((m) => `<li>${esc(m.note)}${m.subtopic ? ` <small>(${esc(m.subtopic)})</small>` : ''}</li>`).join('')}</ul>`);
  }
  out.push(`<h3>What to practise next</h3><ol>${li(r.recommendations)}</ol>`);
  if (r.mistakes.length) {
    out.push(`<h3>Questions not fully right</h3><ol class="rmist">${r.mistakes.map((m) => `<li value="${num(m.position)}"><p>${esc(m.prompt)}</p><p><small>${esc(m.subtopic)} · ${esc(m.skill)}</small></p><p>Her answer: <strong>${esc(m.yourAnswer)}</strong>${m.earned ? ` (${num(m.earned)} of ${num(m.marks)} marks)` : ''}<br>Correct answer: <strong>${esc(m.correctAnswer)}</strong></p></li>`).join('')}</ol>`);
  }
  if (r.masteryAfter.length) {
    out.push(`<h3>Mastery after this session</h3><table class="rtable"><tbody>${r.masteryAfter.map((m) => `<tr><td>${esc(m.title)}</td><td class="num">${pctText(m.score)}</td><td>${esc(m.level)}</td><td>${bar(m.score)}</td></tr>`).join('')}</tbody></table>`);
  }
  return out.join('\n');
}

export const REPORT_CSS = `
body{font:16px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;color:#1b1b1a;background:#fbfaf7;margin:0;padding:20px;max-width:820px}
h1{font-size:24px;margin:0 0 4px}h3{font-size:18px;margin:22px 0 6px}
.rmeta{color:#55534e}.rcmp{font-weight:600}
.rtiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:12px 0}
.rtile{background:#fff;border:1px solid #e3e1da;border-radius:12px;padding:10px 12px}.rtile b{display:block;font-size:24px}.rtile span{color:#55534e;font-size:14px}
.rtable{border-collapse:collapse;width:100%}.rtable td,.rtable th{padding:6px 8px;border-bottom:1px solid #e3e1da;text-align:left;vertical-align:top}
.num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
.rbar{display:inline-block;width:110px;height:10px;background:#dfe8f5;border-radius:5px;overflow:hidden;vertical-align:middle}.rbar span{display:block;height:100%;background:#2a78d6;border-radius:5px}
.rmist li{margin-bottom:10px}.rmist p{margin:2px 0}.sr{position:absolute;left:-9999px}
small{color:#55534e}
`;

/** A complete, self-contained HTML file of the report (for download or the share sheet). */
export function reportHtmlDocument(r) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'">
<title>${esc(emailSubject(r))}</title><style>${REPORT_CSS}</style></head>
<body><h1>${esc(r.title)}</h1>
${reportBodyHtml(r)}
<p class="rmeta">Made on the device by Study Practice. Session id ${esc(r.sessionId)}.</p>
</body></html>`;
}

export function reportFileName(r, ext) {
  const d = new Date(r.startedAt);
  const p = (n) => String(n).padStart(2, '0');
  const slug = String(r.topicId || `mixed-${r.subject}`).replace(/[^a-z0-9-]/gi, '');
  return `practice-report-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}-${slug}.${ext}`;
}
