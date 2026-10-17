// The one place where Claude plugs into the app (Step B). Switched off in v2 Step A.
//
// No key is ever in the app: a key in a public web page could be copied by anyone. In linked
// mode the Anthropic key lives only in Supabase's secrets (EC enters it himself,
// docs/SETUP-ANTHROPIC.md) and is used only by the edge functions in supabase/functions/:
//
//   askProgress(studentId, question)   -> ask-progress        (parent: "Ask about her progress")
//   readHandwriting(attemptId | image) -> read-handwriting    (her handwritten final answer)
//   generateQuestions(request)         -> generate-questions  (fresh questions, as drafts)
//
// To switch one on: deploy its function, then set the matching AI_FEATURES flag in config.js
// to true. The parent area and the practice page check aiAvailable(feature) before showing any
// AI button, so nothing appears until then. Every function call carries the signed-in user's
// own token, and the function re-checks who they are (see supabase/functions/_shared).

import { AI_FEATURES } from '../config.js';

let backend = null;

/** Called at start-up with the linked-mode back-end (null in local mode). */
export function connectAi(b) {
  backend = b;
}

/** Is this AI feature available? With no argument: is any? */
export function aiAvailable(feature) {
  if (!backend || backend.kind !== 'supabase') return false;
  if (!feature) return Object.values(AI_FEATURES || {}).some(Boolean);
  return !!(AI_FEATURES && AI_FEATURES[feature]);
}

/** Parent: ask a question about a linked student's progress. Returns { answer, model, askedAt }. */
export async function askProgress(studentId, question) {
  if (!aiAvailable('askProgress')) return null;
  return backend.invoke('ask-progress', { studentId, question });
}

/**
 * Read her handwritten final answer. input: { studentId, attemptId } for a saved answer, or
 * { imagePng (base64, no data: prefix), answerKind: 'number' | 'text' } during practice.
 * Returns { text, confidence, note }: a suggestion she confirms before it is marked.
 */
export async function readHandwriting(input) {
  if (!aiAvailable('readHandwriting')) return null;
  return backend.invoke('read-handwriting', input);
}

/** Parent: draft new questions for one part of a chapter (they need review before use). */
export async function generateQuestions(request) {
  if (!aiAvailable('generateQuestions')) return null;
  return backend.invoke('generate-questions', request);
}

// Kept from version 1 for the results page: explanations of a wrong answer (not built yet).
export async function explainMistake(_input) {
  return null;
}

export async function analyseProgress(_progress) {
  return null;
}
