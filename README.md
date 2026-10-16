# Study Practice

A practice website for Cambridge Primary Stage 6 Mathematics and Science (Year 6, exams November 2026). It runs in any modern browser on a laptop, tablet or phone, can be added to the Home Screen, and works offline after the first visit. Built by the Chief Tech Officer; the questions and preambles come from the Chief Learning Officer.

## What it does

**For your daughter (the site calls her "you"):**
- Choose Mathematics or Science, then a chapter. Each chapter opens with what you will learn, why it matters, real-world uses and its parts (subtopics), with her level in each.
- Choose 15 minutes, 30 minutes, 1 hour or 1.5 hours, and the whole chapter, one part, or "my weak spots". "Mixed revision" mixes every chapter of a subject, like a practice exam.
- Questions are drawn fresh each time: ones she has not seen recently, ones she got wrong before, and parts where she is weaker come up more often. Easier questions come first. The number of questions fits the time (harder questions are given more time).
- During practice: a countdown (it pauses if the app is put away), a question map, "flag to check again", back and next, and Finish at any time. Answers are saved as she goes, so closing the page loses nothing.
- Question types: multiple choice, choose-all, short answer, number answer (fractions such as 3/4 and mixed numbers such as 2 1/2 are fine), true/false, put in order, and match up. Everything is large and touch-friendly, and works with a keyboard (arrow keys move between choices).
- Marking forgives case, spacing and punctuation, and one typing slip in a word of five or more letters (a letter missed, an extra letter, or two letters swapped). A changed letter does not count as a slip, and look-alike words never pass for each other (reflection and refraction, waxing and waning, thousands and thousandths). In number answers, when the answer gives a unit, a unit she types must be that one (109 m is not 109 cm); a bare number is fine.
- Afterwards: a score ring, a star for every question, personal bests, improvement on last time and streaks; then every question with her answer, the correct answer, the worked solution and, for a wrong choice, "why you might have picked this"; then "what to work on" grouped by skill.

**For you (the parent area, behind a PIN):**
- Questions answered and time spent by day, week and month, with charts and a table.
- Every chapter with mastery per chapter and per part, how much of it she has seen, and the chapter she is on now.
- An analysis summary: strengths, weaknesses, skills, misconceptions repeated in the last 30 days, the recent trend, and what to practise next.
- An archive of every session report by date. Each one opens in full and can be emailed, shared or saved.
- Settings: your email address, the device name, export and import of progress, PIN change, and erase.

## Reports to you

After each session the app makes a report on the device: score, what she understands and what she does not yet, results by part and by skill, the misconceptions her wrong answers showed, time used, and recommendations.

- **"Send report to Dad"** opens the device's email app, addressed to the email saved in Settings, with a readable summary in the body. **She presses Send herself. The app never sends anything on its own.** The summary is kept short (the email link stays under 1,900 characters, which every mail app accepts); the full report is in the parent area.
- **"Save or share the report"** gives the full report as a web page through the share sheet (iPad, iPhone, Android), or saves it as a file on a laptop.

## Things to know

- **Progress is stored on each device separately** (laptop, tablet and phone each keep their own). To move or combine progress: Parent area, Settings, **Export progress** on one device, then **Import progress** on the other. Import only adds what is missing and never deletes. Export now and then as a backup: a browser can clear site data if the device runs very short of space.
- **The PIN is a light lock, not real security.** It keeps the parent area out of casual reach. The PIN is never stored, only a salted PBKDF2-SHA-256 hash of it, but someone with the device and technical know-how could still read or clear the browser's stored data. "Forgot the PIN?" resets it and also clears the saved email (progress is kept). A reset is recorded with its date: a warning sits at the top of the parent area, and a "NOTE FOR DAD" line opens every report email, until you press "I know about this reset". If you see it and did not reset the PIN, check the email address in Settings.
- **Your email address is stored only on the device**, in the browser's storage. It is not in the code, the repository or the export files.
- **No online accounts, no server, no tracking.** Nothing is fetched from any other website. There is no AI key in the app.
- **Deeper analysis by Claude:** export progress and pass the file to the Chief Learning Officer. The export has every answer with its question id, the answer given, right or wrong, marks, time on the question and the session details. (`js/ai.js` is the single place where a future back-end could add live AI explanations; it is switched off in version 1.)

## Running it on this laptop

Double-click **`Start Study Practice on this laptop.bat`**. It opens http://localhost:8766/ in the browser. Close the black window to stop. (Needs Python, which is installed.)

## Updating the questions

The Chief Learning Officer's folder is the source: `C:\Claude Code\Chief Learning Officer\Content\`. After the CLO changes or adds a chapter, run:

```
python tools\build_content.py
```

It checks every file with the CLO's `validate.py` (a file with errors is left out and listed), copies the good ones into `content\`, writes `content\manifest.json`, and refreshes the offline list in `sw.js`, so devices pick up the new questions the next time they open the site online. Then commit and publish.

**Run the same command after any change to the app itself** (HTML, CSS or JavaScript), not only after new questions. Published devices keep their offline copy until `sw.js` changes, and the build is what stamps `sw.js` with a new version. When a device finds the new version it shows "A new version of Study Practice is ready" with a Reload button (a practice in progress is saved first).

## Tests

With the laptop server running, open http://localhost:8766/test/ . The test page checks the marking of every question type and the edge cases for number and short answers, marks every question in the built banks with its own right answer and with a wrong one, and checks question sampling, the timer, reports and the email link, statistics, the PIN, and the export/import round trip (in a temporary database).

## Publishing (GitHub Pages)

Everything uses relative paths, so the site works at a project address such as `https://ec-drives.github.io/study-practice/`. Push this folder to a repository, then in the repository's Settings, Pages, choose "Deploy from a branch", branch `main`, folder `/ (root)`. The `.nojekyll` file makes Pages serve the files as they are.

**Shared site address.** Every EC-Drives Pages project is served from the same origin, `https://ec-drives.github.io` (Drive Timer is at `/drive-timer/`). Browsers keep storage per origin, so the two apps share one storage area on a device. They cannot get in each other's way: Study Practice uses the IndexedDB database `study-practice` and offline caches named `study-practice-<version>`, and its service worker only reads its own cache; Drive Timer uses `drive-timer` and `drive-timer-<version>`. Two things are shared: the browser's "keep this data" permission, and the storage figure shown in Settings, which counts both apps. Clearing site data for `ec-drives.github.io` in a browser clears both apps, so export progress first.

## Files

| Path | What it is |
|---|---|
| `index.html`, `css/app.css`, `manifest.webmanifest`, `icons/` | The app shell, styles, Home Screen details and icons |
| `js/app.js` | Start-up and page routing |
| `js/views/` | Pages: home and subject, chapter set-up, practice, results, parent area |
| `js/marking.js` | Marking rules for every question type |
| `js/sampler.js`, `js/practice.js` | Choosing questions; creating, saving and finishing sessions |
| `js/stats.js`, `js/analysis.js`, `js/report.js` | Mastery, streaks and totals; the analysis summary; the parent report and email text |
| `js/db.js`, `js/exportimport.js`, `js/pin.js` | On-device storage, export and import, the parent PIN |
| `js/ai.js` | The switched-off seam for future live AI help |
| `content/` | Copies of the CLO's question banks (generated) |
| `sw.js` | Offline support (generated from `tools/sw.template.js`) |
| `tools/` | Build, local server, icon drawing, and a small sample chapter for testing (`--samples`) |
| `test/` | The test page |
