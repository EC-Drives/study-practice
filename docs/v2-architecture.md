# Study Practice v2: how the linked version fits together

For whoever builds on it next (CTO agents, Step B). The owner-facing guides are `SETUP-SUPABASE.md` and `SETUP-ANTHROPIC.md`.

## Two modes, one app

| | Local mode (version 1) | Linked mode (v2) |
|---|---|---|
| Switched on by | `config.js` empty (as shipped) | `config.js` has the project URL and the anon/publishable key |
| Her progress | IndexedDB `study-practice`, on each device | IndexedDB `study-practice-u-<account id>` on her device, **plus** Supabase |
| Parent area | Behind a PIN, on the same device | The parent's own sign-in, on his own device, reading Supabase |
| Reports to Dad | Email link (mailto) that she sends | Automatic; no email step. "Copy report" and "Save or share" stay |
| Works offline | Yes | Yes for her (the queue sends later); the parent area needs the internet |

On this laptop only, `?backend=mock` runs linked mode against an in-memory Supabase stand-in (`js/data/mock-backend.js`), `?backend=mock&demo=1` adds a fortnight of made-up practice, and `&as=parent` or `&as=student` signs that tab in. The test parent account is in `tools/mock-seed.json`.

## Files

| File | Job |
|---|---|
| `config.js` | Project URL, anon key, student address domain; Step B switches (all off) |
| `js/data/backend.js` | Chooses the mode: local, supabase, or mock (mock and `?backend=` only on localhost) |
| `js/data/supabase-backend.js` | Small dependency-free client for Supabase Auth, PostgREST, Storage and Functions. Refuses service-role or secret keys |
| `js/data/mock-backend.js` | Same interface, in memory; a JavaScript copy of the RLS rules (used by the tests and the laptop preview) |
| `js/data/store.js` | The adapter: sets `app.db` (device database), `app.source` (where pages read from), `app.sync`, `app.profile` |
| `js/data/sync.js` | The offline queue (outbox store in IndexedDB): uploads working PNGs, then upserts session, answers, report |
| `js/data/remote-source.js` | The parent's read-only view of her data, with the same get/getAll as IndexedDB |
| `js/data/migrate.js` | One-time import of version 1 progress on a device into her account |
| `js/data/mock-demo.js` | Laptop-only demo data for the mock back-end |
| `js/views/login.js` | Sign-in for "I am practising" (username) and "I am the parent" (email) |
| `js/working.js` | The stylus working area: pad, compact vector format, PNG thumbnail, read-only view |
| `js/visual-report.js` | The visual parent report and the score trend chart |
| `js/hooks.js` | Integration points for diagrams and generated questions (below) |
| `js/ai.js` | Step B seam: `askProgress`, `readHandwriting`, `generateQuestions` (off) |
| `supabase/migrations/*.sql` | Tables, RLS, storage bucket and policies, `make_parent()` |
| `supabase/functions/manage-student` | Step A: the parent creates and resets her account (service role inside the function only) |
| `supabase/functions/ask-progress`, `read-handwriting`, `generate-questions`, `_shared` | Step B stubs, not deployed |

## Data flow

1. She finishes a session. `practice.js` marks it and builds the report; the session, answers (with her working) and report are written to **her device database** in one transaction (as in version 1).
2. `session.js` puts the session id in the **outbox** and asks the queue to send.
3. `sync.js` sends: each working PNG to `working/<her id>/<session>/<question>.png`, then rows to `sessions`, `attempts` (strokes in `working_strokes`, picture path in `working_path`, the rest in `data`) and `reports`. Upserts by `(student_id, id)`, so repeating is harmless and nobody else's ids can collide with hers. Offline: it waits and retries on `online`, on returning to the screen, and every minute. A server error backs off (1, 2, 4 ... up to 30 minutes).
4. The parent signs in. `store.js` finds his linked child; the parent pages read through `RemoteSource` with his token, so RLS returns only her rows. Her vector working is fetched only for the answers being shown.

Authentication: email and password (Supabase Auth). The parent account is created by EC in the dashboard and marked with `make_parent()`. Hers is created by `manage-student`: `<username>@students.study-practice.invalid`, confirmed at creation, so no email is ever sent. Sign-ups are switched off in the project. Tokens are kept in `localStorage` (as supabase-js does); the strict CSP (`script-src 'self'`) is the protection against script injection.

## Security notes

- **Shared site address.** All EC-Drives GitHub Pages sites share one origin (`https://ec-drives.github.io`), and browsers keep `localStorage` and IndexedDB per origin, not per folder. In linked mode her sign-in tokens and her device database therefore sit where any page on that origin (Drive Timer today, any later EC-Drives site) could read them. Recommendation for EC before going linked: give Study Practice its own origin (a custom domain or subdomain set up in Pages, or a separate GitHub account or organisation for the study site), then set the `ALLOWED_ORIGINS` secret of the functions to that address.
- **Framing.** A `<meta>` CSP cannot forbid framing, and GitHub Pages sends no frame headers, so `app.js` refuses to run inside another site's frame (localhost is allowed for the screenshot tool). On its own domain, real headers would be better.
- **Diagram and generated-question data come from her rows.** The parent's views draw `question.diagram` and `session.instances` from data her device wrote (or anyone holding her token). Stored questions are shape-checked before use (`validQuestion` in `js/hooks.js`), all text is set as text, and the diagram engine builds DOM/SVG only. `test/tests-integration.js` feeds markup through every field and checks that nothing runs.
- **Sign-out** ends only this device's session (`scope=local`); a parent's password reset ends all of hers (`end_sessions()`).

## Working area format

`{ v: 1, w: 1000, h, s: [ { w, e?, p: [x, y, pressure, dx, dy, dpressure, ...] } ] }`, with x and y in half-units of a pad 1000 units wide, pressure in percent, and deltas after the first point. `e: 1` marks an eraser stroke. About 2 KB for 200 points. A PNG thumbnail (360 px wide, dark ink on white) is made when the session finishes. Checked by `validWorking()`.

## Diagrams and generated questions (wired 17 Oct 2026)

The content-engines work owns `js/diagrams/` (spec `docs/diagram-spec.md`) and `js/generators/` (contract `js/generators/README.md`). The app calls them only through `js/hooks.js`, which loads both at start-up with `import()`; without them the app behaves as version 1.

- **Diagrams.** `diagramFor(q, where)` draws `question.diagram` under the prompt in practice (`'session'`), in her review (`'review'`) and in the parent report (`'report'`). `optionDiagramFor(q, i)` draws `question.optionDiagrams[i]` inside answer option `i` (picture choices; the practice page lays these out as a grid of cards). `choicePictures()` in `js/visual-report.js` shows every option picture in the review and the report, with her choice and the right one marked. The renderer builds DOM/SVG only, never HTML from strings, and shows a short note for a spec it cannot draw.
- **Generated questions in a session.** `planSession()` (`js/practice.js`) gives about a third of a maths session (by estimated time, `GENERATED_SHARE`) to generated questions, and more (up to 85%) when the bank has too few questions she has not seen in the last 14 days. Candidates are made for every part and level in scope that has a generator (more where the bank is low) with `generateSet()`, then chosen with the same weighting as the bank (her mastery, difficulty mix, spread). Science and parts without generators stay bank-only. Bank templates with a `generator` field are filled the same way (`instantiate`).
- **Storing them.** Each generated question is stored in full in the session record (`session.instances[id]`, which syncs inside `sessions.data`). Each attempt also carries the recipe, `generated: { generatorId, seed, difficulty }`, and the catalogue codes of the misconception her wrong answer showed (`misconceptionCodes`). Generated ids look like `m10-g-add-sub-unlike-d2-123456789` (at most 44 characters; the `attempts.question_id` limit is 120), never clash with bank ids, and nothing in the database refers to a question table, so the schema and RLS need no change: rows are keyed and filtered by `student_id` only.
- **Showing them again, on any device.** `questionsForSession(bank, session, attempts, topics)` lays the stored questions over the bank. A stored question is first checked field by field (`validQuestion`), because in linked mode it comes from rows her device wrote; a missing or damaged one is rebuilt from its recipe (`generate(generatorId, seed, difficulty)` is exact). The stored copy is preferred to a rebuild because it is exactly what she was marked against, even if a later app version changes a generator. Export files carry `instances`, and import checks them the same way.
- **Named mistakes.** `misconceptionCodeTally()` (`js/stats.js`) counts codes over answers; the session report stores `misconceptionCodes: [{ code, count, label, subtopics }]`; the parent analysis shows the last 30 days with this week's count and suggests talking through a mistake made twice or more. Labels come from `MISCONCEPTION_CODES`.
- **Offline.** `tools/build_content.py` lists every file under `css/`, `js/` (including `js/generators/*.js` and `js/diagrams/*.js`) and `icons/` in the service worker; `.md` notes are left out. `tools/e2e.py` checks that a chapter never opened before gets generated questions and pictures with the laptop server stopped.
- **Tests.** `test/tests-integration.js` (run by the app test page), `test/diagrams.html`, `test/generators.html`; `python tools/run_tests.py` runs all three.

## Step B seams (not built)

| Feature | Client | Server | Switch |
|---|---|---|---|
| Ask about her progress | `ai.askProgress(studentId, question)`; a box on the parent Overview when `aiAvailable('askProgress')` | `ask-progress`: reads her data with the parent's token, sends a digest to Claude Sonnet 5.5, logs to `ask_log` | `AI_FEATURES.askProgress` |
| Read handwritten final answer | `ai.readHandwriting({ imagePng, answerKind })` (or `{ studentId, attemptId }` for a saved answer) from the working area; shows "We read: 3/4. Is that right?" and she confirms before marking | `read-handwriting`: Claude Sonnet 5.5 with the image; returns text and confidence, never right or wrong | `AI_FEATURES.readHandwriting` |
| Fresh questions | `ai.generateQuestions(request)` from the parent area, into a review queue (CLO approves), then into practice like bank questions | `generate-questions`: Claude Opus 5.5, CLO format, ids `gen-...`, status draft | `AI_FEATURES.generateQuestions` |

All three use the Anthropic TypeScript SDK (`npm:@anthropic-ai/sdk`; pin the exact version at deployment) with the server-side refusal fallback (`fallbacks: "default"`), and read `ANTHROPIC_API_KEY` only from Supabase secrets. Models can be overridden with the secrets `MODEL_ASK`, `MODEL_HANDWRITING` and `MODEL_GENERATE`. Still to do in Step B: the client UI for each, a `generated_questions` review table (with RLS: parent writes, student reads approved ones), a schema check for generated questions matching the CLO's `validate.py`, deployment, and live tests.
