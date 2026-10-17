# Row Level Security review checklist

Applies to `supabase/migrations/20261017000100_linked_accounts.sql` and `20261017000200_working_storage.sql`.

**The intent, in one line:** a student reads and writes only her own rows; a parent reads his linked child's rows and writes nothing; anyone signed out sees nothing; nothing can be deleted through the app.

Each item below is checked automatically by the test page (`test/tests-linked.js`, group "v2 SQL review checklist", items C1 to C22) against the SQL text. The same rules are mirrored line by line in `js/data/mock-backend.js` and exercised as real reads and writes (group "v2 access rules"). Re-run the tests after any change to the migrations: `python tools\run_tests.py`.

| # | Check | Why |
|---|---|---|
| C1 | `enable row level security` on all five tables (profiles, sessions, attempts, reports, ask_log) | Without RLS, the public anon key could read every row |
| C2 | Every policy is `to authenticated`; none for `anon` or `public` | Signed-out visitors get nothing |
| C3 | No `using (true)` or `with check (true)` | No policy may open a table to every user |
| C4 | Only `select`, `insert` and `update` policies; no `delete` and no `for all` | Nothing can be deleted from the app |
| C5 | Insert and update on sessions, attempts and reports require `student_id = auth.uid()` **and** `is_student()` | A parent, or someone posing as another student, cannot write her data |
| C6 | Update `using (student_id = auth.uid())` | You cannot take over another student's existing row by reusing its id |
| C7 | Select on sessions, attempts and reports: own rows, or `is_parent_of(student_id)` | The parent sees only a child linked to him |
| C8 | profiles and ask_log have no insert or update policies; ask_log is readable by its parent only | Roles and parent links cannot be changed from the app (no promoting yourself to parent, or linking yourself to someone else's child); only the edge function writes ask_log |
| C9 | Every `security definer` function has `set search_path = ''` and fully qualified names | Stops search-path hijacking of the helper functions |
| C10 | `make_parent()` has execute revoked from public, anon and authenticated | Making a parent is possible only from the SQL editor |
| C11 | `revoke all` on the five tables from public, anon and authenticated, then minimal grants; no grant to anon; no delete grant | Defence in depth: even a policy mistake cannot let a visitor in or allow deletes |
| C12 | attempts and reports carry `foreign key (student_id, session_id) references sessions (student_id, id)` | An answer or report cannot be attached to another student's session |
| C13 | `profiles_role_shape`: a parent has no parent; a student always has a parent and a username; nobody is their own parent | Keeps the parent-child links well formed |
| C14 | Bucket `working`: private, PNG only, 512 KB cap | Her working is never reachable by a public link |
| C15 | Storage insert and update only into `<own id>/...` and only as a student; read own folder or a linked child's; no delete | The same rules for pictures as for rows |
| C16 | Size limits on every JSON column (`octet_length`) | No unbounded rows |
| C17 | No JWT, `sb_secret_` or `sk-ant-` text in the client, the config or the functions | No key in the repository |
| C18 | The Anthropic key is read only via `Deno.env.get('ANTHROPIC_API_KEY')` in `_shared/common.ts` | The key lives only in Supabase secrets |
| C19 | The page's CSP allows network calls only to itself and `*.supabase.co` | Nothing else can be contacted, even by injected content |
| C20 | `manage-student` checks that the caller's profile role is parent, links the child to the caller, confirms the internal address itself, and ends her sessions after a password reset | Only a parent can create an account, only for himself; a lost device is signed out by a reset |
| C21 | sessions, attempts and reports have primary keys `(student_id, id)` / `(student_id, session_id)` | Nobody (a sibling, say) can take one of her ids first and block her sessions from syncing |
| C22 | `end_sessions()` executable only by `service_role`; `limit_students()` trigger (at most 5 students per parent) not callable from the app | Server-only powers stay server-only |

## Accepted by design

- **Marking happens on her device.** She writes her own sessions, answers and reports, so in principle a determined student could send made-up scores. The rows are size-capped, but there is no per-student quota. This is accepted for a family practice app; the server cannot re-mark without the question banks.
- **She can change her own password** through Supabase Auth with her own token (any signed-in user can). Dad can always reset it, which also signs her out everywhere. She cannot change the account's address: secure email change needs both the old (`.invalid`) and the new address confirmed.

## Live check, once EC's project exists (CTO)

Run these with two throwaway test families (parent A with student A1, parent B with student B1), created through the app and deleted afterwards:

1. Signed out, with only the anon key: `GET /rest/v1/sessions?select=*` and `GET /rest/v1/profiles` are refused (401, or 42501 "permission denied", because the tables are revoked from anon). An empty `[]` would also be acceptable; any rows are a failure.
2. As A1: insert a session for A1 succeeds; insert one with `student_id` of B1 returns 403 (code 42501).
3. As B1: `GET sessions` returns only B1's rows.
4. As parent A: `GET sessions?student_id=eq.<A1>` returns A1's rows; `?student_id=eq.<B1>` returns `[]`; any insert returns 403.
5. As A1: `PATCH /rest/v1/profiles?id=eq.<A1>` with `{"role":"parent"}` changes nothing (no update policy, no grant).
6. As A1: upload to `working/<B1>/x.png` returns 403; as parent B: download `working/<A1>/...` returns 404.
7. As A1: `POST /functions/v1/manage-student` returns 403 ("Only a parent account can do this").
8. Supabase dashboard, **Advisors**, **Security Advisor**: no errors for these tables or functions.
9. Password reset signs her out: as parent A, reset A1's password in the app; the message must say she is signed out (if it says devices could not be signed out, `end_sessions()` lacks permission on `auth.sessions` on this project: fix before relying on it). Then confirm in the SQL editor that `select count(*) from auth.sessions where user_id = '<A1>'` and `select count(*) from auth.refresh_tokens where user_id = '<A1>'::text` are 0 (deleting sessions should cascade to refresh tokens), and that A1's old refresh token gets 400 from `POST /auth/v1/token?grant_type=refresh_token`. This is the one platform detail not yet tested live.
