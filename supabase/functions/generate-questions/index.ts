// generate-questions (Step B, NOT DEPLOYED): Claude writes fresh practice questions for one part
// of a chapter, in the Chief Learning Officer's question format, aimed at her weak spots.
//
// Request (parent only):
//   POST { "topic": { "topicId", "title", "subtopic": { "id", "title", "summary" } },
//          "examples": [ up to 5 existing questions from that part, CLO format ],
//          "count": 1-10, "difficulty": 1-3, "focusSkills": ["..."], "misconceptions": ["..."] }
// Response: { ok: true, questions: [ ...CLO-format question objects... ], model: "..." }
//
// * The questions come back as DRAFTS. The app must check every one with the same rules as the
//   CLO's validate.py (structure, answer present, options, marks), and the plan is that the CLO
//   (or EC) approves them before she sees them: generated questions go into a review queue, not
//   straight into practice. Their ids are prefixed "gen-" so they never collide with the bank.
// * Only the chapter, the part and example questions are sent: no data about her.
// * Model: the latest Opus (MODELS.generate), effort "high": writing correct, well-pitched
//   questions is the quality-sensitive job here.
// Client seam: js/ai.js generateQuestions(); format: tools/sample-content/maths/*.json.

import { ask, MODELS, Problem, serve } from '../_shared/common.ts';

const SYSTEM = `You write practice questions for an 11-year-old preparing for the Cambridge Primary
Stage 6 checkpoint in Mathematics or Science, in British English.
Return only a JSON array of question objects in exactly the format of the examples given
(same keys: id, subtopicId, type, difficulty, marks, skill, prompt, options, answer, solution,
misconceptions). Allowed types: mcq, multi, short, numeric, truefalse, order, match.
Every question must be correct, unambiguous, answerable without a diagram, and have a short
worked solution a child can follow. For mcq and multi, each wrong option should reflect a real
misconception, explained in "misconceptions". Never copy an example question.`;

serve(async (req, who) => {
  if (who.role !== 'parent') throw new Problem(403, 'Only a parent can request new questions.');
  const body = await req.json().catch(() => ({}));
  const topic = body.topic ?? {};
  const sub = topic.subtopic ?? {};
  if (typeof sub.id !== 'string' || typeof topic.title !== 'string') throw new Problem(400, 'Say which chapter and part.');
  const count = Math.max(1, Math.min(10, Number(body.count) || 5));
  const difficulty = [1, 2, 3].includes(Number(body.difficulty)) ? Number(body.difficulty) : 2;
  const examples = Array.isArray(body.examples) ? body.examples.slice(0, 5) : [];

  const res = await ask(MODELS.generate, SYSTEM, [
    {
      type: 'text',
      text: [
        `Chapter: ${String(topic.title).slice(0, 200)} (${String(topic.topicId ?? '').slice(0, 60)})`,
        `Part: ${String(sub.title ?? '').slice(0, 200)} (subtopicId ${sub.id.slice(0, 60)})`,
        sub.summary ? `What the part covers: ${String(sub.summary).slice(0, 1000)}` : '',
        `Write ${count} new questions at difficulty ${difficulty} of 3.`,
        Array.isArray(body.focusSkills) && body.focusSkills.length ? `Focus on these skills: ${body.focusSkills.slice(0, 5).join('; ')}` : '',
        Array.isArray(body.misconceptions) && body.misconceptions.length ? `Target these misconceptions: ${body.misconceptions.slice(0, 5).join('; ')}` : '',
        `Examples of the format:\n${JSON.stringify(examples).slice(0, 30000)}`,
      ].filter(Boolean).join('\n'),
    },
  ], { maxTokens: 12000, effort: 'high' });

  let questions: unknown;
  try {
    questions = JSON.parse(res.text.replace(/^```(?:json)?|```$/g, '').trim());
  } catch {
    throw new Problem(502, 'Claude did not return questions in the expected format. Please try again.');
  }
  if (!Array.isArray(questions)) throw new Problem(502, 'Claude did not return a list of questions.');
  const stamped = questions.slice(0, count).map((q, i) => ({ ...(q as Record<string, unknown>), id: `gen-${sub.id}-${Date.now().toString(36)}-${i}`, subtopicId: sub.id, generated: true }));
  return { ok: true, questions: stamped, model: res.model, status: 'draft-needs-review' };
});
