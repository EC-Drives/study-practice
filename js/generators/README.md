# Maths question generators

Fresh Stage 6 maths questions on demand, so a topic no longer repeats after three sessions. Each generator is a parameterised pattern from the Chief Learning Officer's guide (`C:\Claude Code\Chief Learning Officer\Content\generator-guide.md`, section 2): it draws numbers from a seed, works out the answer exactly (integers and exact fractions, never raw floating point), writes a short worked solution, and builds the wrong options from named misconceptions.

## What a generated question looks like

Exactly the bank's question shape (`id`, `subtopicId`, `type`, `difficulty`, `marks`, `prompt`, `options`, `answer`, `solution`, `misconceptions`, `skill`, `source`, optional `diagram`), plus:

| Key | Meaning |
|---|---|
| `bookSection` | The textbook section, e.g. `"6C"` (key straight after `subtopicId`). Stamped in `finish()` (core.js) by `bookSectionFor(subtopicId, skill)` from `js/bookmap.js`: by skill where a subtopic spans sections, else by subtopic (the CLO's `id-map-2026-10-17.json`). Always one of the topic's `bookSections`, so generated questions join section practice and section reports. |
| `generatorId` | Which pattern made it, e.g. `m10.add-sub-unlike`. |
| `seed` | The seed. `generate(q.generatorId, q.seed, q.difficulty)` rebuilds the identical question (for the mistake review and the parent report). |
| `misconceptionCodes` | For each wrong option (mcq: keyed by option index, like `misconceptions`) or each known wrong typed answer (short/numeric: keyed by that answer), the catalogue code of the misconception that produces it, e.g. `{"1": "FR-ADD-TOPS-BOTTOMS"}`. `NEAR-MISS` marks a plain near miss with no named error. The descriptions are in `MISCONCEPTION_CODES`. |

Other details: `id` is `<prefix>-g-<pattern>-d<difficulty>-<seed>` (cannot clash with the bank's `-q001` ids), where the prefix is that of the generator's topic; `source` is `"generated"`; `skill` is always one of the bank's own skill tags for that subtopic, so reports merge generated and bank results. Numeric and short questions key `misconceptions` by the typical wrong answers as well as `common` (the marking already looks these up for numeric answers).

## Functions (`js/generators/index.js`)

| Function | Returns |
|---|---|
| `generate(generatorId, seed, difficulty?)` | One question. Difficulty from the seed when left out. Throws only if the pattern cannot be built (never seen in testing; catch it and fall back to the bank). |
| `generateFor(topicId, subtopicId, difficulty, seed)` | A question for a topic, optionally one subtopic and difficulty (`null` = any). `null` when no generator fits. |
| `generateSet(topicId, count, seed, opts?)` | `count` different questions for a topic (no repeated prompt and options). `opts`: `{ subtopicId, difficulty }`. |
| `generatorsFor(topicId, subtopicId?, difficulty?)` | Matching generator ids. |
| `GENERATORS`, `REGISTRY`, `GENERATED_TOPICS` | Metadata; `REGISTRY[topicId][subtopicId]` lists generator ids. |
| `MISCONCEPTION_CODES` | Code to description, for every code in use. |

A generator that keeps redrawing without finding suitable numbers stops after 200 000 random draws and throws, so it can never freeze the page.

Each topic file loads on its own (`index.js` uses dynamic `import()` with a top-level `await`), so a problem in one topic file only removes that topic's generators; `LOAD_ERRORS` lists any that failed. The offline cache must include every `js/generators/*.js` file (the build's file list should pick them up like the other scripts).

## Book map re-mapping (17 Oct 2026)

The CLO moved seven subtopics to the chapter the textbook teaches them in (`id-map-2026-10-17.json`, `subtopicIdsChanged`). Their generators moved with them: new `topicId`, new `subtopicId`, and the new topic prefix in the generator id and so in every generated question id. The code stays in its old file (a comment marks each one); `REGISTRY` lists them under the new topic.

| Old generator id | New generator id | New subtopic |
|---|---|---|
| `m02.factors-primes` | `m06.factors-primes` | m06-s6 |
| `m02.hcf-lcm` | `m06.hcf-lcm` | m06-s6 |
| `m02.divisibility` | `m06.divisibility` | m06-s7 |
| `m02.squares-cubes` | `m07.squares-cubes` | m07-s5 |
| `m06.order-of-operations` | `m02.order-of-operations` | m02-s6 |
| `m06.laws` | `m02.laws` | m02-s6 |
| `m07.next-term` | `m02.next-term` | m02-s5 |
| `m07.term-to-term` | `m02.term-to-term` | m02-s5 |
| `m03.rotational-symmetry` | `m14.rotational-symmetry` | m14-s5 |
| `m15.decimal-hours` | `m09.decimal-hours` | m09-s6 |

A question saved with an old generator id cannot be rebuilt by `generate()` (and `GENERATOR_VERSION` changed anyway): keep the stored question itself. Also on 17 Oct: rotational symmetry stops at order 4 (Stage 6), the m08 prompts no longer demand one form of answer (any equal form is accepted where she types), two wrong options share a misconception code only when they are the same error on different parts (each with its own text), and every prompt with a diagram refers to it.

## What is covered (17 Oct 2026)

125 generators across all 15 maths topics (by topic after the book map): m01 7, m02 8, m03 9, m04 6, m05 10, m06 9, m07 6, m08 9, m09 10, m10 7, m11 9, m12 8, m13 11, m14 8, m15 8. Most offer D1, D2 and D3 as the CLO's guide defines them. Diagrams are drawn for angles, triangles, shapes, grids, charts, tables, Venn and Carroll diagrams, spinners, nets, cuboids, solids, clocks, scales, number lines, bar models and function machines. Patterns not generated (vocabulary, explaining, planning an investigation, quadrilateral properties) stay with the bank. Misconception codes a topic needed beyond the CLO's catalogue are in that topic file's `EXTRA_CODES` (and the shared ones in `misconceptions.js`); a few generic codes are declared in more than one topic with slightly different wording, and the last one loaded wins. They are proposed to the CLO for the catalogue.

## Integration hook (for the app side)

Wired into the app on 17 Oct 2026 through `js/hooks.js`; how it was done is in `docs/v2-architecture.md`, "Diagrams and generated questions". The notes below are the original contract.

1. **Explicit generator in the bank.** If a bank question has `"generator": "m10.add-sub-unlike"` (or `{ "id": "...", "difficulty": 2 }`), replace it at session start by `generate(id, freshSeed, difficulty ?? question.difficulty)`.
2. **Pool running low.** In the sampler, when the unseen-recently pool for the chosen topic/subtopic/difficulty is smaller than the session needs, top it up with `generateSet(topicId, missing, freshSeed, { subtopicId, difficulty })`. A good rule: always mix in about one third generated questions for maths topics that have generators.
3. **Storing attempts.** Store the whole generated question (it is small) or at least `generatorId`, `seed`, `difficulty` with the attempt, because the generated `id` is not in the bank files. History and mastery can key on `skill` and `subtopicId` as now.
4. **Drawing diagrams.** If a question has `diagram`, draw it with `renderDiagram(q.diagram)` from `js/diagrams/index.js` between the prompt and the answer area; for `optionDiagrams`, draw one under each option.
5. **Order questions.** Generated `order` questions list their options in a scrambled order already; the app's `startingOrder()` still applies.
6. **Reports.** `misconceptionCodes` lets the parent report count named misconceptions across sessions ("added tops and bottoms: 4 times this week").

## Tests

`test/generators.html` (with the laptop server running): every generator, every difficulty, 500 seeds each. Each answer is worked out again independently from the question text and diagram (`test/gen-solvers/`, own BigInt fractions, no shared code) and compared; every wrong option is recomputed from its misconception code; distractors must be distinct, never equal the answer, and stay in range; the app's own marking must mark the right answer right and the wrong ones wrong; the solution must state the answer; diagrams must pass the diagram checker; skill tags must be the bank's; the bookSection must be one of the topic's and both ids must carry the topic prefix; a rotational symmetry above order 4 fails. Then every topic and every subtopic is filled to a 30-minute session without repeats. `?seeds=100`, `?only=m10` and `?show=<id>&d=2&n=5` are handy.
