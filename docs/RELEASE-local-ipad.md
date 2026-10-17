# Release: Study Practice v2 in local mode on her iPad

Version 2.0.0, branch `v2-linked`, 17 October 2026. Prepared by the Chief Tech Officer.

This release runs in **local mode**: `config.js` is empty, so there are no accounts, no sign-in
and no server. Her progress is stored on the iPad itself, and you open the parent area on the
same iPad with a PIN. Online linking (Supabase) can be switched on later without losing anything:
the app offers once to bring her on-device progress into her account.

## What is new for her

- **Maths follows her book.** Chapters 1 to 14 in book order, each with its sections (for
  example 12D Read and Make Scatter Graphs, book page 191). "Time and Measures" comes last as an
  extra topic. Science is unchanged (its book contents have not been mapped yet).
- **Practise one section.** Tap a section to practise just that part of the book, with the page
  number shown so she can look at the examples first.
- **Mock papers.** Four timed papers on Chapters 11 to 14 (45, 45, 25 and 50 minutes). One timer
  for the whole paper; she can move between questions and flag any to come back to; before she
  hands in, the app lists every question still blank and takes her to it with one tap. Marking on
  screen is all or nothing per question. The review shows her answer, the worked solution, why
  her wrong answer happens, and the examiner's mark scheme.
- **Reports by book section.** Every report, and the email you get, has a line per book section
  (for a paper: marks per section).

## What is new for you (parent area)

- Overview: her latest session or paper as a visual report, then time and questions by day, week
  and month, and the analysis.
- Chapters: each chapter by subtopic and now by book section (answers and % right), plus a table
  of every mock paper she has sat.
- Settings: **Back up progress** and **Restore from a backup**. A reminder appears on the
  Overview when there has been practice since the last backup and the last backup is more than
  7 days old (or there has never been one).

## Guide for EC: setting it up on her iPad

1. **Open the address in Safari** on her iPad (the Chief of Staff will send the address once it is
   published). Use Safari: it is the browser this was built and checked for, and Home Screen apps
   added from Safari keep their data best.
   You see the Study Practice home page: "Good morning!" (or afternoon/evening), and the two
   subjects, Mathematics and Science.
2. **Add to Home Screen.** Tap the Share button (the square with an arrow, top right), scroll
   down, tap **Add to Home Screen**, keep the name "Practice", tap **Add**. A blue icon with a
   star appears on the Home Screen. **From now on, always open Study Practice from this icon**,
   not from Safari (see "Why the Home Screen icon matters" below).
3. **Open it once from the icon while online** and wait a few seconds on the home page. The app
   copies itself and every question bank and paper onto the iPad, so it then works with no
   internet at all.
4. **Set the parent PIN.** At the bottom of the home page tap **Parent area**. Choose a PIN of 4
   to 8 digits and type it twice. Do not tell her the PIN. You see the parent area with four tabs:
   Overview, Chapters, Reports, Settings. (The Overview says "No sessions yet" until she
   practises.)
5. **Set the report email.** In the parent area tap **Settings**, type your email address under
   "Reports by email" and tap **Save email**. The address stays on the iPad only. After each
   practice or paper she taps **Send report to Dad**: the Mail app opens with the report written
   and addressed to you, and she taps Send. Nothing is ever sent without her pressing Send.
6. **Name the device** (optional): in Settings, "Name for this device", type for example "iPad"
   and tap **Save name**. The name appears in backup files.
7. **Back up.** In Settings tap **Back up progress**. The iPad's share sheet opens with a file
   called `study-practice-progress-<date>-<time>.json`. Tap **Save to Files**, choose iCloud
   Drive (or On My iPad) and a folder such as "Study Practice backups", tap **Save**. Do this
   about once a week; the Overview reminds you when a backup is due. You can also AirDrop or mail
   the file to yourself. The app records a backup only when the share sheet finishes (or, on a
   laptop, when you confirm that the downloaded file saved), so the reminder is not silenced by a
   backup that did not happen.
8. **To restore** (a new iPad, or after data was lost): set up steps 1 to 4 on the new device,
   then Settings, **Restore from a backup**, and pick the newest backup file in Files. Restoring
   adds what is missing and never deletes anything.
9. Tap **Lock and leave** when you finish. The parent area also locks itself after 15 minutes or
   when you leave it.

### Why the Home Screen icon matters

Her progress lives only on this iPad, inside the app's storage. Safari can clear the stored data
of a website that has not been used for a while (Apple's tracking prevention removes website
data after about 7 days without use when the site is opened in Safari tabs). An app added to the
Home Screen is treated as an app, and its data is kept. The app also asks the iPad to keep its
storage permanently (persistent storage). Even so, the iPad's own storage is a single copy:
weekly backups are the real protection.

Also: do not use Safari's private browsing for it, and do not clear "History and Website Data"
in Settings > Safari, which would erase her progress.

## Checklist: what was verified (17 Oct 2026, on the laptop)

Test pages run in the Claude browser pane (Chromium), not on an iPad.

| Check | Result |
|---|---|
| Content rebuilt from the CLO's live folder; `validate.py`: 27 files and 4 papers | 0 errors, 0 warnings |
| App test page (`test/index.html`), including the new book-map, section and paper tests | all pass (count in the CTO's Activity Log, 17 Oct 2026) |
| Diagram test page (`test/diagrams.html`) | 951 of 951 |
| Generator test page (`test/generators.html`): 125 generators, 500 seeds per level | 157,000 questions, 0 problems; 240 session fills |
| `validate.py --questions` on fresh generator samples (900 + 942 questions) | 0 errors, 0 warnings |
| Local mode with `config.js` empty: no sign-in page, no account or sync wording | checked |
| Chapter list in book order with sections and pages; Extra topic last | checked at phone, iPad portrait and laptop sizes |
| Section practice draws only that section's questions (bank and generated) | tested |
| Mock paper: one timer, numbering 10(a)/10(b), shared stem and graph above each part, flag, list of blanks before hand-in with tap-to-go | tested |
| Paper marking all or nothing; second attempt labelled; marks by section add up | tested |
| Paper review: answer, solution, misconception, mark scheme | tested |
| Report email (mailto) includes paper results and every book section, within the link length limit | tested |
| Parent area with PIN: overview, chapters by section, mock paper table, settings | checked |
| Backup reminder rule (never / older than 7 days with new practice) | tested |
| Backup file restores paper and section sessions on another device | tested |
| Manifest (`display: standalone`, icons 192/512/maskable) and 180 px `apple-touch-icon` | checked |
| Working area: Pointer Events, pen pressure, palm rejection | unit tests (synthetic pen events) |
| Offline: every app file, question bank and paper is on the service worker's list | tested; offline reload checked with the server stopped |

## Not verifiable without a real iPad

- "Add to Home Screen" from Safari and the icon's look on the Home Screen.
- Apple Pencil in the working area (pressure, palm rejection, Scribble not interfering). The
  laptop tests use simulated pen events.
- The share sheet for **Back up progress** ("Save to Files"), that the backup date is recorded only
  after the file is saved, and the Files picker for **Restore**.
- Whether iPadOS grants persistent storage to the Home Screen app (Settings shows "The browser
  has agreed to keep this data" when it has).
- Mail opening from the Home Screen app with the report filled in.
- Offline start from the Home Screen icon in aeroplane mode.
- Real-time behaviour of the timer when she switches apps (it pauses while the app is hidden,
  by design, and carries on when she comes back).

A 10-minute check on the iPad after publishing covers all of these: add to Home Screen, open,
set PIN and email, do a 15-minute section practice with the Pencil, send the report, back up to
Files, then turn on aeroplane mode, close and reopen the app, and open a mock paper.
