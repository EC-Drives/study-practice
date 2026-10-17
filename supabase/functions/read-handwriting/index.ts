// read-handwriting (Step B, NOT DEPLOYED): Claude reads the final answer she wrote by hand in
// the working area, so a handwritten answer can be marked like a typed one.
//
// Request (the student, or her parent):  POST { "studentId": "<uuid>", "attemptId": "<session id>|<question id>" }
//   or, during a session before it is saved: POST { "imagePng": "<base64>", "answerKind": "number" | "text" }
// No free text is accepted from the browser: the function only ever asks Claude to read an
// image, so it cannot be used as a general-purpose Claude. A daily allowance applies.
// Response: { ok: true, text: "3/4", confidence: "high" | "medium" | "low", note: "..." }
//
// * A saved attempt's image is downloaded with the CALLER'S OWN TOKEN (storage policies apply:
//   her own folder, or her parent's view of it).
// * The result is a suggestion: the app shows "We read: 3/4. Is that right?" and she confirms,
//   and the normal marking rules (js/marking.js) then mark the confirmed text. Claude never
//   decides right or wrong here.
// * Model: the latest Sonnet with image input (MODELS.handwriting), effort "low".
// Client seam: js/ai.js readHandwriting().

import { ask, asCaller, base64, downloadAsCaller, MODELS, Problem, serve, takeQuota } from '../_shared/common.ts';

const SYSTEM = `You read a child's handwritten final answer from an image of her working area.
Return only JSON: {"text": "...", "confidence": "high"|"medium"|"low", "note": "..."}.
"text" is the final answer exactly as written (keep fractions as a/b, mixed numbers as "2 1/2",
units as written). If several answers appear, take the one that is boxed, underlined, last, or
labelled as the answer, and say so in "note". If nothing readable is there, text is "".
Do not solve or correct the question.`;

const MAX_BYTES = 600 * 1024;

serve(async (req, who) => {
  const body = await req.json().catch(() => ({}));
  await takeQuota(who.id, 'handwriting');
  let png: Uint8Array;
  if (typeof body.attemptId === 'string') {
    // answer ids are unique per student only, so say whose
    const studentId = who.role === 'student' ? who.id : String(body.studentId ?? '');
    if (!/^[0-9a-f-]{36}$/i.test(studentId)) throw new Problem(400, 'Say which student.');
    const rows = (await asCaller(who.token, `attempts?student_id=eq.${studentId}&id=eq.${encodeURIComponent(body.attemptId)}&select=working_path,data`)) as { working_path: string | null; data: { questionId?: string } }[];
    if (!rows.length || !rows[0].working_path) throw new Problem(404, 'There is no handwriting saved for that question.');
    png = await downloadAsCaller(who.token, 'working', rows[0].working_path);
  } else if (typeof body.imagePng === 'string') {
    if (who.role !== 'student') throw new Problem(403, 'Only the student can send a new image.');
    png = Uint8Array.from(atob(body.imagePng), (c) => c.charCodeAt(0));
  } else {
    throw new Problem(400, 'Send an attemptId or an image.');
  }
  if (png.length > MAX_BYTES) throw new Problem(413, 'The image is too large.');
  const kind = body.answerKind === 'number' ? 'a number (it may be a fraction, decimal or mixed number)' : 'a word or short phrase';

  const res = await ask(MODELS.handwriting, SYSTEM, [
    { type: 'image', source: { type: 'base64', media_type: 'image/png', data: base64(png) } },
    { type: 'text', text: `The answer should be ${kind}. Read her final answer.` },
  ], { maxTokens: 500, effort: 'low' });

  let out: { text?: unknown; confidence?: unknown; note?: unknown } = {};
  try {
    out = JSON.parse(res.text.replace(/^```(?:json)?|```$/g, '').trim());
  } catch {
    throw new Problem(502, 'Claude did not return a readable result. Please type the answer instead.');
  }
  const confidence = ['high', 'medium', 'low'].includes(String(out.confidence)) ? String(out.confidence) : 'low';
  return { ok: true, text: String(out.text ?? '').slice(0, 200), confidence, note: String(out.note ?? '').slice(0, 300), model: res.model };
});
