-- Study Practice: book-section practice and mock papers (17 Oct 2026).
--
-- Two new session modes: 'section' (practice of one book section, e.g. 12D) and 'paper' (a timed
-- mock paper). Everything else about them lives in the session's data column, so only the mode
-- check changes. Not yet applied anywhere: the app is released in local mode first.

alter table public.sessions drop constraint if exists sessions_mode_check;
alter table public.sessions add constraint sessions_mode_check
  check (mode in ('topic', 'subtopic', 'section', 'weak', 'mixed', 'paper'));
