// The up-to-date analysis summary on the parent dashboard. Rule-based and computed on the
// device from every finished session. (Claude's deeper analysis is done by the Chief Learning
// Officer from exported progress files; see ai.js.)

import { subtopicMastery, misconceptionTally, skillTally, totals, streak, activity, currentTopic } from './stats.js';
import { formatDuration } from './timer.js';

const DAY = 86400000;

/**
 * ctx: { sessions, attempts, topics: topic[] (all loaded), now }
 * Returns { empty, headline, strengths[], weaknesses[], misconceptions[], skills{strong, weak},
 *           trend, week, recommendations[], current }
 */
export function progressAnalysis(ctx) {
  const now = ctx.now ?? Date.now();
  const sessions = ctx.sessions.filter((s) => s.status === 'complete');
  const attempts = ctx.attempts;
  if (!sessions.length) {
    return { empty: true, headline: 'No practice sessions yet on this device.', strengths: [], weaknesses: [], misconceptions: [], skills: { strong: [], weak: [] }, trend: null, week: null, recommendations: ['Start with a 15- or 30-minute session on the current maths chapter.'], current: null };
  }
  const subInfo = new Map();
  for (const t of ctx.topics) for (const s of t.preamble.subtopics) subInfo.set(s.id, { title: s.title, topicTitle: t.title, topicId: t.topicId, subject: t.subject });
  const mastery = subtopicMastery(attempts);
  const rows = [...mastery.entries()].map(([id, m]) => ({ id, ...m, ...(subInfo.get(id) || { title: id, topicTitle: '' }) }));
  const strengths = rows.filter((r) => r.n >= 4 && r.score >= 0.8).sort((a, b) => b.score - a.score).slice(0, 5);
  const weaknesses = rows.filter((r) => r.n >= 2 && r.score < 0.6).sort((a, b) => a.score - b.score).slice(0, 5);
  const mis = misconceptionTally(attempts, now - 30 * DAY).slice(0, 5).map((m) => ({ ...m, subtopic: (subInfo.get(m.subtopicId) || {}).title || '' }));
  const skills = skillTally(attempts.filter((a) => a.answeredAt >= now - 60 * DAY));
  const strongSkills = skills.filter((s) => s.total >= 4 && s.pct >= 0.8).sort((a, b) => b.pct - a.pct).slice(0, 4);
  const weakSkills = skills.filter((s) => s.total >= 3 && s.pct < 0.6).sort((a, b) => a.pct - b.pct).slice(0, 4);

  // trend: average score of the last five sessions against the five before
  const ordered = [...sessions].sort((a, b) => a.startedAt - b.startedAt);
  const avg = (list) => list.reduce((s, x) => s + (x.score ? x.score.pct : 0), 0) / list.length;
  let trend = null;
  if (ordered.length >= 4) {
    const k = Math.min(5, Math.floor(ordered.length / 2));
    const recent = ordered.slice(-k);
    const before = ordered.slice(-2 * k, -k);
    trend = { recent: avg(recent), before: avg(before), change: avg(recent) - avg(before), n: k };
  }
  const wk = activity(sessions, 'week', 2, now);
  const week = { thisWeek: wk[1], lastWeek: wk[0] };
  const t = totals(sessions);
  const st = streak(sessions, now);
  const cur = currentTopic(sessions);
  const curTopic = ctx.topics.find((x) => x.topicId === cur);

  const recommendations = [];
  for (const w of weaknesses.slice(0, 2)) recommendations.push(`Practise "${w.title}" (${w.topicTitle}) with a 15-minute one-subtopic session.`);
  if (mis[0]) recommendations.push(`Talk through a repeated mistake: ${mis[0].note}`);
  if (week.thisWeek.sessions < 2) recommendations.push('Aim for three or four short sessions a week; short regular practice beats one long session.');
  const untouched = ctx.topics.filter((tp) => tp.subject === 'maths' && !attempts.some((a) => a.topicId === tp.topicId)).sort((a, b) => a.order - b.order);
  if (untouched[0] && weaknesses.length < 2) recommendations.push(`Start a new maths chapter: "${untouched[0].title}".`);
  if (!recommendations.length) recommendations.push('Keep going with mixed revision sessions to keep every chapter fresh before the exams.');

  const headline = `${t.sessions} session${t.sessions === 1 ? '' : 's'}, ${t.questions} questions, ${formatDuration(t.seconds)} in total.`
    + (st.days >= 2 ? ` Current streak: ${st.days} days.` : '')
    + (trend ? ` Recent average ${Math.round(trend.recent * 100)}% (${trend.change >= 0 ? 'up' : 'down'} ${Math.abs(Math.round(trend.change * 100))} points on the sessions before).` : '');
  return {
    empty: false,
    headline,
    strengths,
    weaknesses,
    misconceptions: mis,
    skills: { strong: strongSkills, weak: weakSkills },
    trend,
    week,
    recommendations: recommendations.slice(0, 5),
    current: curTopic ? curTopic.title : null,
  };
}
