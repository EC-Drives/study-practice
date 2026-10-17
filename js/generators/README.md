# Maths question generators

Fresh Stage 6 maths questions on demand, so a topic no longer repeats after three sessions. Each generator is a parameterised pattern from the Chief Learning Officer's guide (`C:\Claude Code\Chief Learning Officer\Content\generator-guide.md`, section 2): it draws numbers from a seed, works out the answer exactly (integers and exact fractions, never raw floating point), writes a short worked solution, and builds the wrong options from named misconceptions.

## What a generated question looks like

Exactly the bank's question shape (`id`, `subtopicId`, `type`, `difficulty`, `marks`, `prompt`, `options`, `answer`, `solution`, `misconceptions`, `skill`, `source`, optional `diagram`), plus:

| Key | Meaning |
|---|---|
| `generatorId` | Which pattern made it, e.g. `m10.add-sub-unlike`. |
| `seed` | The seed. `generate(q.generatorId, q.seed, q.difficulty)` rebuilds the identical question (for the mistake review and the parent report). |
| `misconceptionCodes` | For each wrong option (mcq: keyed by option index, like `misconceptions`) or each known wrong typed answer (short/numeric: keyed by that answer), the catalogue code of the misconception that produces it, e.g. `{"1": "FR-ADD-TOPS-BOTTOMS"}`. `NEAR-MISS` marks a plain near miss with no named error. The descriptions are in `MISCONCEPTION_CODES`. |

Other details: `id` is `<prefix>-g-<pattern>-d<difficulty>-<seed>` (cannot clash with the bank's `-q001` ids); `source` is `"generated"`; `skill` is always one of the bank's own skill tags for that subtopic, so reports merge generated and bank results. Numeric and short questions key `misconceptions` by the typical wrong answers as well as `common` (the marking already looks these up for numeric answers).

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

## Integration hook (for the app side)

1. **Explicit generator in the bank.** If a bank question has `"generator": "m10.add-sub-unlike"` (or `{ "id": "...", "difficulty": 2 }`), replace it at session start by `generate(id, freshSeed, difficulty ?? question.difficulty)`.
2. **Pool running low.** In the sampler, when the unseen-recently pool for the chosen topic/subtopic/difficulty is smaller than the session needs, top it up with `generateSet(topicId, missing, freshSeed, { subtopicId, difficulty })`. A good rule: always mix in about one third generated questions for maths topics that have generators.
3. **Storing attempts.** Store the whole generated question (it is small) or at least `generatorId`, `seed`, `difficulty` with the attempt, because the generated `id` is not in the bank files. History and mastery can key on `skill` and `subtopicId` as now.
4. **Drawing diagrams.** If a question has `diagram`, draw it with `renderDiagram(q.diagram)` from `js/diagrams/index.js` between the prompt and the answer area; for `optionDiagrams`, draw one under each option.
5. **Order questions.** Generated `order` questions list their options in a scrambled order already; the app's `startingOrder()` still applies.
6. **Reports.** `misconceptionCodes` lets the parent report count named misconceptions across sessions ("added tops and bottoms: 4 times this week").

## Tests

`test/generators.html` (with the laptop server running): every generator, every difficulty, 500 seeds each. Each answer is worked out again independently from the question text and diagram (`test/gen-solvers/`, own BigInt fractions, no shared code) and compared; every wrong option is recomputed from its misconception code; distractors must be distinct, never equal the answer, and stay in range; the app's own marking must mark the right answer right and the wrong ones wrong; the solution must state the answer; diagrams must pass the diagram checker; skill tags must be the bank's. Then every topic and every subtopic is filled to a 30-minute session without repeats. `?seeds=100`, `?only=m10` and `?show=<id>&d=2&n=5` are handy.
