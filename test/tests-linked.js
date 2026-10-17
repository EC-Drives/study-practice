// v2 tests: linked accounts (adapter, Supabase requests, Row Level Security intent, SQL review
// checklist), the offline queue, the working area, the visual reports, the one-time migration
// and the integration hooks. Run from test/index.html (imported by tests.js).

import { SUPABASE, AI_FEATURES } from '../config.js';
import { chooseMode, createBackend, studentEmail } from '../js/data/backend.js';
import { SupabaseBackend, BackendError, memoryStorage, validProjectUrl, isServiceRoleJwt } from '../js/data/supabase-backend.js';
import { MockServer, MockBackend } from '../js/data/mock-backend.js';
import { SyncQueue, rowsFor, workingPath, dataUrlToBlob } from '../js/data/sync.js';
import { RemoteSource, workingFor } from '../js/data/remote-source.js';
import { legacyProgress, importLegacy } from '../js/data/migrate.js';
import { userDbName } from '../js/data/store.js';
import { Db } from '../js/db.js';
import { planSession, finishSession, submitSession } from '../js/practice.js';
import { buildReport, summaryLines, reportPlainText } from '../js/report.js';
import { buildExport, importExport } from '../js/exportimport.js';
import { visualReport, questionRows, trendChart, skillBand } from '../js/visual-report.js';
import { encodePoints, decodePoints, emptyWorking, validWorking, thumbnailDataUrl, workingPad, hasInk, penDetected, resetPenDetection, workingView } from '../js/working.js';
import { diagramFor, optionDiagramFor, setExtensions, questionsForSession, instantiate, canGenerate } from '../js/hooks.js';
import { aiAvailable, connectAi, askProgress } from '../js/ai.js';
import { resultsView } from '../js/views/results.js';
import { setContentRoot } from '../js/content.js';

const ANON = 'test-anon-key';
const URL_ = 'https://abcdefghijklmnop.supabase.co';
const b64url = (o) => btoa(JSON.stringify(o)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
const fakeJwt = (payload) => `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url(payload)}.sig`;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const testWorking = (n = 40, pressure = 0.7) => {
  const w = emptyWorking(400);
  const pts = Array.from({ length: n }, (_, i) => ({ x: 100 + i * 5, y: 120 + Math.sin(i / 4) * 30, p: pressure }));
  w.s.push({ w: 40, p: encodePoints(pts) });
  return w;
};

/** A fake fetch that records requests and answers from a list of handlers. */
function fakeFetch(handler) {
  const calls = [];
  const f = async (url, init = {}) => {
    const call = { url: String(url), method: init.method || 'GET', headers: { ...(init.headers || {}) }, body: init.body };
    calls.push(call);
    const r = await handler(call, calls.length);
    if (r instanceof Error) throw r;
    const status = r.status || 200;
    const body = r.body === undefined ? '' : typeof r.body === 'string' ? r.body : JSON.stringify(r.body);
    return new Response(status === 204 ? null : body, { status, headers: { 'Content-Type': 'application/json' } });
  };
  f.calls = calls;
  return f;
}

const tokenBody = (n, uid = 'u-1', now = Date.now()) => ({ access_token: `access-${n}`, refresh_token: `refresh-${n}`, expires_in: 3600, expires_at: Math.floor(now / 1000) + 3600, user: { id: uid, email: 'x' } });

export async function run({ check, setGroup, fixtures }) {
  const { sampleTopic, qmapT, goodResp, someWrong } = fixtures;

  // ================================================================ adapter and modes
  setGroup('v2 data adapter: which mode');
  {
    const gh = { hostname: 'ec-drives.github.io', search: '' };
    const lh = (q) => ({ hostname: 'localhost', search: q });
    check('config.js ships empty, so the live site stays in local mode (version 1 behaviour)', SUPABASE.url === '' && SUPABASE.anonKey === '' && chooseMode(SUPABASE, gh) === 'local');
    check('config.js holds no key of any kind', !/eyJ|sb_secret|sb_publishable|service_role/.test(JSON.stringify(SUPABASE)));
    check('AI switches are all off in Step A', Object.values(AI_FEATURES).every((v) => v === false));
    check('url + anon key -> linked (supabase) mode', chooseMode({ url: URL_, anonKey: ANON }, gh) === 'supabase');
    check('?backend=mock is ignored on the published site', chooseMode({ url: '', anonKey: '' }, { hostname: 'ec-drives.github.io', search: '?backend=mock' }) === 'local');
    check('?backend=mock works on this laptop only', chooseMode({ url: '', anonKey: '' }, lh('?backend=mock')) === 'mock');
    check('?backend=local forces local mode on this laptop', chooseMode({ url: URL_, anonKey: ANON }, lh('?backend=local')) === 'local');
    check('local mode has no back-end', (await createBackend({ url: '', anonKey: '' }, gh)) === null);
    const be = await createBackend({ url: URL_, anonKey: ANON }, gh);
    check('linked mode gets the Supabase client', be instanceof SupabaseBackend && be.kind === 'supabase');
    check('username maps to an internal address', studentEmail(' Mia.B ') === `mia.b@${SUPABASE.studentEmailDomain}` && SUPABASE.studentEmailDomain.endsWith('.invalid'));
    check('project URL check', validProjectUrl(URL_) && !validProjectUrl('http://abc.supabase.co') && !validProjectUrl('https://evil.example.com') && !validProjectUrl('nonsense'));
    let refused = 0;
    for (const key of [fakeJwt({ role: 'service_role' }), 'sb_secret_abc123', '']) {
      try { new SupabaseBackend({ url: URL_, anonKey: key, storage: memoryStorage() }); } catch { refused += 1; }
    }
    check('refuses a service-role or secret key (or none) in config.js', refused === 3 && isServiceRoleJwt(fakeJwt({ role: 'service_role' })) && !isServiceRoleJwt(fakeJwt({ role: 'anon' })));
    let ok = true;
    try { new SupabaseBackend({ url: URL_, anonKey: fakeJwt({ role: 'anon' }), storage: memoryStorage() }); new SupabaseBackend({ url: URL_, anonKey: 'sb_publishable_abc', storage: memoryStorage() }); } catch { ok = false; }
    check('accepts a legacy anon key or a publishable key', ok);
    check('user database is per account, separate from the version 1 one', userDbName('1234-abcd') === 'study-practice-u-1234-abcd');
  }

  // ================================================================ Supabase requests
  setGroup('v2 Supabase client: requests');
  {
    const store = memoryStorage();
    let n = 0;
    const f = fakeFetch((c) => {
      if (c.url.includes('/auth/v1/token?grant_type=password')) return { body: tokenBody(++n) };
      if (c.url.includes('/rest/v1/sessions')) return { body: [{ data: { id: 's1' } }] };
      if (c.url.includes('/rest/v1/attempts') && c.method === 'POST') return { status: 201 };
      if (c.url.includes('/storage/v1/object/')) return { body: { Key: 'x' } };
      if (c.url.includes('/functions/v1/manage-student')) return { status: 400, body: { ok: false, error: 'The username must be 3 to 30 characters.' } };
      return { status: 404, body: {} };
    });
    const be = new SupabaseBackend({ url: `${URL_}/`, anonKey: ANON, storage: store, fetch: f });
    const ses = await be.signIn('someone@students.study-practice.invalid', 'pw-123456');
    const c0 = f.calls[0];
    check('sign-in: password grant on the Auth API with only the anon key', c0.url === `${URL_}/auth/v1/token?grant_type=password` && c0.method === 'POST' && c0.headers.apikey === ANON && !c0.headers.Authorization && JSON.parse(c0.body).email.endsWith('.invalid'));
    check('sign-in: session kept (tokens, expiry, user id)', ses.accessToken === 'access-1' && be.user().id === 'u-1' && JSON.parse(store.getItem('study-practice-auth')).refreshToken === 'refresh-1');
    const rows = await be.select('sessions', { select: 'data', eq: { student_id: 'u-1' }, order: 'started_at.asc' });
    const c1 = f.calls[1];
    const q = new URL(c1.url).searchParams;
    check('select: PostgREST query with filter, order and paging', rows.length === 1 && c1.url.startsWith(`${URL_}/rest/v1/sessions?`) && q.get('student_id') === 'eq.u-1' && q.get('order') === 'started_at.asc' && q.get('limit') === '1000' && q.get('offset') === '0');
    check('select: the user\'s own token, plus the anon key', c1.headers.Authorization === 'Bearer access-1' && c1.headers.apikey === ANON);
    await be.upsert('attempts', [{ id: 'a' }, { id: 'b' }], 'id');
    const c2 = f.calls[2];
    check('upsert: one POST, merge on the key, no rows sent back', c2.method === 'POST' && c2.url === `${URL_}/rest/v1/attempts?on_conflict=id` && c2.headers.Prefer === 'resolution=merge-duplicates,return=minimal' && JSON.parse(c2.body).length === 2);
    await be.upload('working', 'u-1/ses-1/q 1.png', new Blob([new Uint8Array([1, 2])], { type: 'image/png' }));
    const c3 = f.calls[3];
    check('upload: private bucket path, PNG, replace if present', c3.url === `${URL_}/storage/v1/object/working/u-1/ses-1/q%201.png` && c3.headers['x-upsert'] === 'true' && c3.headers['Content-Type'] === 'image/png');
    let msg = '';
    try { await be.invoke('manage-student', { action: 'create' }); } catch (e) { msg = e.message; }
    const c4 = f.calls[4];
    check('functions: POST with the user token; the function\'s own message comes back', c4.url === `${URL_}/functions/v1/manage-student` && c4.headers.Authorization === 'Bearer access-1' && msg.startsWith('The username'));
    check('every request carried only the anon key (never another key)', f.calls.every((c) => c.headers.apikey === ANON));
    await be.signOut();
    check('sign-out clears the session on the device', be.session() === null && store.getItem('study-practice-auth') === null);
  }
  {
    // paging beyond 1,000 rows
    const f = fakeFetch((c) => {
      const off = Number(new URL(c.url).searchParams.get('offset'));
      return { body: Array.from({ length: off === 0 ? 1000 : 5 }, (_, i) => ({ i: off + i })) };
    });
    const store = memoryStorage();
    store.setItem('study-practice-auth', JSON.stringify({ accessToken: 'a', refreshToken: 'r', expiresAt: Date.now() + 3600000, user: { id: 'u' } }));
    const be = new SupabaseBackend({ url: URL_, anonKey: ANON, storage: store, fetch: f });
    const rows = await be.select('attempts', {});
    check('select pages through more than 1,000 rows', rows.length === 1005 && f.calls.length === 2);
  }
  {
    // 401 -> refresh -> retry; expired token refreshed first; revoked refresh -> signed out
    const store = memoryStorage();
    store.setItem('study-practice-auth', JSON.stringify({ accessToken: 'old', refreshToken: 'r0', expiresAt: Date.now() + 3600000, user: { id: 'u' } }));
    let restCalls = 0;
    const f = fakeFetch((c) => {
      if (c.url.includes('grant_type=refresh_token')) return { body: tokenBody(2, 'u') };
      restCalls += 1;
      return restCalls === 1 ? { status: 401, body: { message: 'JWT expired' } } : { body: [] };
    });
    const be = new SupabaseBackend({ url: URL_, anonKey: ANON, storage: store, fetch: f });
    await be.select('reports', {});
    check('a 401 refreshes the token once and retries', f.calls.length === 3 && f.calls[1].url.includes('grant_type=refresh_token') && JSON.parse(f.calls[1].body).refresh_token === 'r0' && f.calls[2].headers.Authorization === 'Bearer access-2');
    store.setItem('study-practice-auth', JSON.stringify({ accessToken: 'stale', refreshToken: 'r1', expiresAt: Date.now() + 1000, user: { id: 'u' } }));
    const before = f.calls.length;
    await be.select('reports', {});
    check('a token about to expire is refreshed before the request', f.calls[before].url.includes('refresh_token') && f.calls[before + 1].headers.Authorization === 'Bearer access-2');
    const g = fakeFetch(() => ({ status: 400, body: { error: 'invalid_grant' } }));
    const store2 = memoryStorage();
    store2.setItem('study-practice-auth', JSON.stringify({ accessToken: 'stale', refreshToken: 'bad', expiresAt: Date.now() - 1, user: { id: 'u' } }));
    const be2 = new SupabaseBackend({ url: URL_, anonKey: ANON, storage: store2, fetch: g });
    let st = 0;
    try { await be2.select('reports', {}); } catch (e) { st = e.status; }
    check('a revoked refresh token signs out (sign in again)', st === 401 && be2.session() === null);
    const h = fakeFetch(() => new TypeError('Failed to fetch'));
    const be3 = new SupabaseBackend({ url: URL_, anonKey: ANON, storage: store, fetch: h });
    store.setItem('study-practice-auth', JSON.stringify({ accessToken: 'a', refreshToken: 'r', expiresAt: Date.now() + 3600000, user: { id: 'u' } }));
    let off = null;
    try { await be3.select('x', {}); } catch (e) { off = e; }
    check('no connection is reported as offline (status 0), not as a failure', off instanceof BackendError && off.offline);
    const wrong = fakeFetch(() => ({ status: 400, body: { error: 'invalid_grant', error_description: 'Invalid login credentials' } }));
    const be4 = new SupabaseBackend({ url: URL_, anonKey: ANON, storage: memoryStorage(), fetch: wrong });
    let m = '';
    try { await be4.signIn('a', 'b'); } catch (e) { m = e.message; }
    check('wrong password gives a plain message', m === 'That username or password is not right.');
  }

  // ================================================================ RLS intent (mock mirrors the SQL)
  setGroup('v2 access rules (Row Level Security intent)');
  const server = new MockServer();
  const P = server.addUser('p@example.test', 'parent-pass-1');
  server.makeParent('p@example.test');
  const Q = server.addUser('q@example.test', 'parent-pass-2');
  server.makeParent('q@example.test');
  const asP = new MockBackend(server);
  const asQ = new MockBackend(server);
  const asS = new MockBackend(server);
  const asT = new MockBackend(server);
  const anon = new MockBackend(server);
  await asP.signIn('p@example.test', 'parent-pass-1');
  await asQ.signIn('q@example.test', 'parent-pass-2');
  const S = (await asP.invoke('manage-student', { action: 'create', username: 'stu-s', password: 'student-pass-1', displayName: 'S' })).studentId;
  const T = (await asQ.invoke('manage-student', { action: 'create', username: 'stu-t', password: 'student-pass-2' })).studentId;
  await asS.signIn(studentEmail('stu-s'), 'student-pass-1');
  await asT.signIn(studentEmail('stu-t'), 'student-pass-2');
  const sesRow = (id, sid) => ({ id, student_id: sid, subject: 'maths', topic_id: 'm91-test', mode: 'topic', started_at: new Date().toISOString(), ended_at: null, score_pct: 0.5, questions: 1, data: { id } });
  const denied = async (fn) => { try { await fn(); return false; } catch (e) { return e instanceof BackendError && (e.status === 403 || e.status === 401 || e.code === '42501'); } };
  {
    check('a student is created by the parent with a username (no email needed)', (await asS.profile()).role === 'student' && (await asS.profile()).parent_id === P);
    await asS.upsert('sessions', [sesRow('ses-s1', S)]);
    check('student writes her own session', (await asS.select('sessions', {})).length === 1);
    check('student cannot write a session as another student', await denied(() => asS.upsert('sessions', [sesRow('ses-x', T)])));
    await asT.upsert('sessions', [sesRow('ses-t1', T)]);
    await asS.upsert('sessions', [sesRow('ses-t1', S)]);
    check('rows are keyed per student: the same id used by someone else neither blocks nor touches hers', server.tables.sessions.get(`${T}|ses-t1`).student_id === T && server.tables.sessions.get(`${S}|ses-t1`).student_id === S);
    check('a student cannot change another student\'s row', await denied(() => asS.upsert('sessions', [{ ...sesRow('ses-t1', T), score_pct: 1 }])) && server.tables.sessions.get(`${T}|ses-t1`).score_pct === 0.5);
    check('student cannot read another student\'s sessions', (await asT.select('sessions', {})).every((r) => r.student_id === T) && !(await asS.select('sessions', {})).some((r) => r.student_id === T));
    check('parent reads his linked child\'s sessions', (await asP.select('sessions', { eq: { student_id: S } })).length === 2);
    check('another parent sees nothing of her', (await asQ.select('sessions', { eq: { student_id: S } })).length === 0);
    check('a parent cannot write her data', await denied(() => asP.upsert('sessions', [sesRow('ses-p', S)])) && await denied(() => asP.upsert('sessions', [sesRow('ses-p2', P)])));
    check('signed out: nothing at all', (await anon.select('sessions', {})).length === 0 && (await anon.select('profiles', {})).length === 0 && await denied(() => anon.upsert('sessions', [sesRow('ses-a', S)])));
    let fk = '';
    try { await asS.upsert('attempts', [{ id: 'ses-t9|q', session_id: 'ses-t9', student_id: S, question_id: 'q', correct: true, answered_at: 'x', data: {} }]); } catch (e) { fk = e.code; }
    check('an answer cannot be attached to someone else\'s session', fk === '23503');
    const profS = await asS.select('profiles', {});
    const profP = await asP.select('profiles', {});
    check('profiles: a student sees only herself; a parent sees himself and his child', profS.length === 1 && profS[0].id === S && profP.length === 2 && profP.some((p) => p.id === S) && !(await asQ.select('profiles', {})).some((p) => p.id === S));
    check('profiles and ask_log cannot be written from the app', await denied(() => asS.upsert('profiles', [{ id: S, role: 'parent' }])) && await denied(() => asP.upsert('ask_log', [{ id: 1, parent_id: P }])));
    const png = new Blob([new Uint8Array([137, 80, 78, 71])], { type: 'image/png' });
    await asS.upload('working', `${S}/ses-s1/q1.png`, png);
    check('working images: student writes in her own folder only', server.objects.has(`working/${S}/ses-s1/q1.png`) && await denied(() => asS.upload('working', `${T}/x/q.png`, png)));
    check('working images: a parent cannot upload', await denied(() => asP.upload('working', `${S}/x/q.png`, png)));
    let notPng = 0;
    try { await asS.upload('working', `${S}/x/q.txt`, new Blob(['x'], { type: 'text/plain' })); } catch (e) { notPng = e.status; }
    check('working images: PNG only', notPng === 415);
    const got = await asP.download('working', `${S}/ses-s1/q1.png`);
    let qGot = 0;
    try { await asQ.download('working', `${S}/ses-s1/q1.png`); } catch (e) { qGot = e.status; }
    check('working images: her parent can see them, another parent cannot', got.size === 4 && qGot === 404);
    const tries = [];
    for (const [who, body] of [[asS, { action: 'create', username: 'abc', password: 'password-1' }], [asQ, { action: 'set-password', studentId: S, password: 'password-1' }], [asP, { action: 'create', username: 'stu-s', password: 'password-1' }], [asP, { action: 'create', username: 'A!', password: 'password-1' }], [asP, { action: 'create', username: 'okname', password: 'short' }]]) {
      try { await who.invoke('manage-student', body); tries.push(200); } catch (e) { tries.push(e.status); }
    }
    check('manage-student: only a parent, only his own child, unique usernames, sensible passwords', JSON.stringify(tries) === JSON.stringify([403, 403, 409, 400, 400]), JSON.stringify(tries));
    await asP.invoke('manage-student', { action: 'set-password', studentId: S, password: 'new-student-pass' });
    let oldOk = true;
    try { await new MockBackend(server).signIn(studentEmail('stu-s'), 'student-pass-1'); } catch { oldOk = false; }
    check('the parent can reset her password (old one stops working, and she is signed out everywhere)', !oldOk && asS.session() === null);
    await asS.signIn(studentEmail('stu-s'), 'new-student-pass');
  }

  // ================================================================ SQL review checklist
  setGroup('v2 SQL review checklist (docs/rls-review-checklist.md)');
  {
    const sqlA = await (await fetch('../supabase/migrations/20261017000100_linked_accounts.sql', { cache: 'no-store' })).text();
    const sqlB = await (await fetch('../supabase/migrations/20261017000200_working_storage.sql', { cache: 'no-store' })).text();
    const sql = `${sqlA}\n${sqlB}`.replace(/--[^\n]*/g, ''); // comments out
    const tables = [...sql.matchAll(/create table public\.(\w+)/g)].map((m) => m[1]);
    check('five tables', JSON.stringify(tables) === JSON.stringify(['profiles', 'sessions', 'attempts', 'reports', 'ask_log']), tables.join());
    check('C1 Row Level Security is enabled on every table', tables.every((t) => new RegExp(`alter table public\\.${t} enable row level security`).test(sql)));
    const policies = [...sql.matchAll(/create policy (\w+) on ([\w.]+)\s+for (\w+) to (\w+)([\s\S]*?);/g)].map((m) => ({ name: m[1], table: m[2], cmd: m[3], role: m[4], body: m[5] }));
    check('C2 every policy is for signed-in users only (none for anon or public)', policies.length >= 14 && policies.every((p) => p.role === 'authenticated'), `${policies.length} policies`);
    check('C3 no policy is always-true', !/using\s*\(\s*true\s*\)|with check\s*\(\s*true\s*\)/i.test(sql));
    check('C4 no delete or catch-all policies (nothing can be deleted from the app)', policies.every((p) => ['select', 'insert', 'update'].includes(p.cmd)));
    const pol = (t, cmd) => policies.filter((p) => p.table === `public.${t}` && p.cmd === cmd);
    check('C5 students write only their own rows, and only as a student', ['sessions', 'attempts', 'reports'].every((t) => ['insert', 'update'].every((cmd) => pol(t, cmd).length === 1 && /student_id = \(select auth\.uid\(\)\) and public\.is_student\(\)/.test(pol(t, cmd)[0].body))));
    check('C6 updates can only touch the student\'s own existing rows', ['sessions', 'attempts', 'reports'].every((t) => /using \(student_id = \(select auth\.uid\(\)\)\)/.test(pol(t, 'update')[0].body)));
    check('C7 reads: own rows, or a linked parent', ['sessions', 'attempts', 'reports'].every((t) => /student_id = \(select auth\.uid\(\)\) or public\.is_parent_of\(student_id\)/.test(pol(t, 'select')[0].body)));
    check('C8 profiles and ask_log are read-only from the app', pol('profiles', 'insert').length + pol('profiles', 'update').length + pol('ask_log', 'insert').length + pol('ask_log', 'update').length === 0 && pol('ask_log', 'select').length === 1);
    const definers = [...sql.matchAll(/create function ([\w.]+)\(([\s\S]*?)\$\$/g)].filter((m) => /security definer/.test(m[2]));
    check('C9 every SECURITY DEFINER function has a fixed, empty search_path', definers.length === 6 && definers.every((m) => /set search_path = ''/.test(m[2])));
    check('C10 make_parent() cannot be called from the app', /revoke execute on function public\.make_parent\(text, text\) from public, anon, authenticated/.test(sql) && !/grant execute on function public\.make_parent/.test(sql));
    check('C11 table privileges: nothing for anon, no delete for anyone', /revoke all on table public\.profiles, public\.sessions, public\.attempts, public\.reports, public\.ask_log from public, anon, authenticated/.test(sql) && !/grant[^;]*to anon/.test(sql) && !/grant[^;]*delete/.test(sql));
    check('C12 answers and reports must belong to the same student as their session', /foreign key \(student_id, session_id\)\s+references public\.sessions \(student_id, id\)/.test(sql) && (sql.match(/references public\.sessions \(student_id, id\)/g) || []).length === 2);
    check('C21 her rows are keyed per student (no one can take an id first)', (sql.match(/primary key \(student_id, (id|session_id)\)/g) || []).length === 3);
    check('C22 end_sessions() and the student cap: only the server may call them', /revoke execute on function public\.end_sessions\(uuid\) from public, anon, authenticated/.test(sql) && /grant execute on function public\.end_sessions\(uuid\) to service_role/.test(sql) && /revoke execute on function public\.limit_students\(\) from public, anon, authenticated/.test(sql) && /before insert on public\.profiles/.test(sql));
    check('C13 a student always has a parent; nobody is their own parent', /profiles_role_shape/.test(sql) && /parent_id <> id/.test(sql));
    check('C14 the working bucket is private, PNG only, size-capped', /values \('working', 'working', false, 524288, array\['image\/png'\]\)/.test(sql) && /set public = false/.test(sql));
    const st = (cmd) => policies.find((p) => p.table === 'storage.objects' && p.cmd === cmd);
    check('C15 storage: write only into your own folder, as a student; read own or linked child', /\(storage\.foldername\(name\)\)\[1\] = \(select auth\.uid\(\)\)::text\s+and public\.is_student\(\)/.test(st('insert').body) && /public\.can_read_student_folder/.test(st('select').body) && !st('delete'));
    check('C16 stored sizes are capped (no unbounded rows)', (sql.match(/octet_length\(/g) || []).length >= 4);
    // secrets: nothing in client files or functions
    const files = ['../config.js', '../js/data/supabase-backend.js', '../js/data/backend.js', '../js/data/sync.js', '../js/ai.js', '../supabase/functions/manage-student/index.ts', '../supabase/functions/_shared/common.ts', '../supabase/functions/ask-progress/index.ts', '../supabase/functions/read-handwriting/index.ts', '../supabase/functions/generate-questions/index.ts', '../index.html', '../tools/mock-seed.json'];
    const texts = await Promise.all(files.map(async (p) => (await fetch(p, { cache: 'no-store' })).text()));
    check('C17 no key, token or password in the client or functions (no JWT, sb_secret_, sk-ant-)', texts.every((t) => !/eyJ[A-Za-z0-9_-]{20,}|sb_secret_[A-Za-z0-9]|sk-ant-[A-Za-z0-9]/.test(t)));
    check('C18 the Anthropic key is read only from the function environment', /Deno\.env\.get\('ANTHROPIC_API_KEY'\)/.test(texts[6]) && texts.slice(7, 10).every((t) => !/ANTHROPIC_API_KEY'\)/.test(t) || /Deno\.env/.test(t)));
    check('C19 the page may talk only to itself and *.supabase.co', /connect-src 'self' https:\/\/\*\.supabase\.co;/.test(texts[10]) && /script-src 'self';/.test(texts[10]));
    check('C20 the student-account function checks the caller is a parent and owns the child, and signs her out after a reset', /who\.role !== 'parent'/.test(texts[5]) && /parent_id=eq\./.test(texts[5]) && /email_confirm: true/.test(texts[5]) && /rpc\/end_sessions/.test(texts[5]));
  }

  // ================================================================ offline queue
  setGroup('v2 offline queue (sessions done offline sync later)');
  const DBN = `study-practice-test-sync-${Date.now()}`;
  const sdb = await Db.open(DBN);
  try {
    const statuses = [];
    const q = new SyncQueue({ db: sdb, backend: asS, userId: S, onStatus: (st) => statuses.push(st) });
    const ctx = { questions: qmapT, topics: new Map([[sampleTopic.topicId, sampleTopic]]), topicOrder: [sampleTopic] };
    const s1 = planSession({ subject: 'maths', topic: sampleTopic, topics: [sampleTopic], mode: 'topic', durationMin: 15, attempts: [], seed: 3 });
    s1.questionIds = sampleTopic.questions.map((x) => x.id);
    s1.state.responses = someWrong;
    const w = testWorking();
    s1.state.working = { 'm91-q001': w, 'm91-q007': testWorking(20) };
    const thumbs = { 'm91-q001': thumbnailDataUrl(w), 'm91-q007': thumbnailDataUrl(testWorking(20)) };
    const { session: done } = await submitSession(sdb, s1, ctx, { early: true, elapsedSec: 300, thumbs });
    await q.enqueue(done.id);
    check('a finished session goes into the outbox', (await q.pending()) === 1 && statuses.at(-1).pending === 1);
    server.offline = true;
    const r1 = await q.flush();
    check('offline: nothing is lost, the session waits', r1.offline && (await q.pending()) === 1 && !server.tables.sessions.has(`${S}|${done.id}`));
    server.offline = false;
    const r2 = await q.flush();
    const remote = server.tables.sessions.get(`${S}|${done.id}`);
    const rAtt = [...server.tables.attempts.values()].filter((a) => a.session_id === done.id);
    check('back online: sent, outbox empty', r2.sent === 1 && (await q.pending()) === 0 && statuses.at(-1).pending === 0);
    check('session, every answer and the report are online', remote && remote.student_id === S && rAtt.length === 7 && server.tables.reports.has(`${S}|${done.id}`));
    const a1 = rAtt.find((a) => a.question_id === 'm91-q001');
    check('her working: strokes in the answer row, picture in her private folder', a1.working_strokes && a1.working_strokes.s.length === 1 && a1.working_path === workingPath(S, done.id, 'm91-q001') && server.objects.has(`working/${a1.working_path}`));
    check('the answer data itself carries no picture (kept small)', !('working' in a1.data) && a1.data.hasWorking === true && rAtt.filter((a) => a.working_path).length === 2);
    check('the device marks the session as sent', !!(await sdb.get('sessions', done.id)).syncedAt);
    const before = server.log.filter((x) => x === 'upsert sessions').length;
    await q.enqueue(done.id);
    const [fa, fb] = [q.flush(), q.flush()];
    check('two sends at once share one run', fa === fb);
    await fa;
    check('sending again is harmless (still one session, seven answers)', server.log.filter((x) => x === 'upsert sessions').length === before + 1 && [...server.tables.attempts.values()].filter((a) => a.session_id === done.id).length === 7 && server.tables.sessions.size === 4);
    // a server error: retried later with a back-off, not in a tight loop
    const s2 = planSession({ subject: 'maths', topic: sampleTopic, topics: [sampleTopic], mode: 'topic', durationMin: 15, attempts: [], seed: 4 });
    s2.questionIds = sampleTopic.questions.map((x) => x.id);
    s2.state.responses = goodResp;
    const { session: done2 } = await submitSession(sdb, s2, ctx, { early: true, elapsedSec: 200 });
    await q.enqueue(done2.id);
    server.failNext = 1;
    const r3 = await q.flush();
    const item = await sdb.get('outbox', done2.id);
    check('a server error keeps the session and waits before retrying', r3.failed === 1 && item.tries === 1 && item.nextTryAt > Date.now() && item.lastError.includes('unavailable'));
    const r4 = await q.flush();
    check('not retried before its time', r4.sent === 0 && (await q.pending()) === 1);
    const r5 = await q.flush({ force: true });
    check('retried later and sent', r5.sent === 1 && (await q.pending()) === 0);
    // signed out: wait for the next sign-in
    const loggedOut = new MockBackend(server);
    const q2 = new SyncQueue({ db: sdb, backend: loggedOut, userId: S });
    await q2.enqueue(done2.id);
    const r6 = await q2.flush();
    check('signed out: the session waits for the next sign-in', r6.signedOut && (await q2.pending()) === 1);
    await sdb.delete('outbox', done2.id);
    const rows = rowsFor(S, done, [], null);
    check('rows: dates as ISO text, score kept, unfinished state left out', rows.sessionRow.started_at.endsWith('Z') && rows.sessionRow.data.state === null && rows.sessionRow.score_pct === done.score.pct);
    check('data URL to PNG blob', dataUrlToBlob(thumbs['m91-q001']).type === 'image/png' && dataUrlToBlob('nonsense') === null);

    // the parent's view of the same data
    setGroup('v2 parent reads her data online');
    const src = new RemoteSource(asP, S);
    const rs = await src.getAll('sessions');
    const ra = await src.getAll('attempts');
    const rr = await src.get('reports', done.id);
    check('parent sees her sessions, answers and reports', rs.length === 4 && ra.length === 14 && rr && rr.sessionId === done.id);
    check('parent can open one session\'s answers', (await src.getAllByIndex('attempts', 'sessionId', done.id)).length === 7);
    const one = ra.find((a) => a.sessionId === done.id && a.questionId === 'm91-q001');
    const strokes = await workingFor(src, one);
    check('her working is fetched on demand and matches what she wrote', JSON.stringify(strokes) === JSON.stringify(w));
    const other = new RemoteSource(asQ, S);
    check('another parent gets nothing, even asking for her by id', (await other.getAll('sessions')).length === 0 && (await other.workingStrokes(one.id)) === null);
    const exp = await buildExport(src, { appVersion: 'test' });
    check('her progress can be exported from the online data (for the CLO)', exp.sessions.length === 2 && exp.attempts.length === 14 && exp.reports.length === 2);

    // ================================================================ migration
    setGroup('v2 one-time import of earlier progress');
    const LEG = `study-practice-test-legacy-${Date.now()}`;
    const legacy = await Db.open(LEG);
    for (const [k, resp] of [[0, goodResp], [1, someWrong]]) {
      const sx = planSession({ subject: 'maths', topic: sampleTopic, topics: [sampleTopic], mode: 'topic', durationMin: 15, attempts: [], seed: 20 + k, now: Date.now() - (3 - k) * 86400000 });
      sx.questionIds = sampleTopic.questions.map((x) => x.id);
      sx.state.responses = resp;
      await submitSession(legacy, sx, ctx, { early: true, elapsedSec: 100 });
    }
    legacy.close();
    try {
      const offer = await legacyProgress(S, LEG);
      check('earlier progress on the device is found and offered', offer && offer.sessions === 2 && !offer.already);
      const fakeApp = { profile: { id: S, role: 'student' }, db: sdb, sync: q };
      const res = await importLegacy(fakeApp, LEG);
      check('it is copied into her account on this device and queued', res.added.sessions === 2 && res.added.attempts === 14 && (await q.pending()) >= 0);
      await q.flush({ force: true });
      check('and goes online', [...server.tables.sessions.values()].filter((x) => x.student_id === S).length === 6);
      const again = await legacyProgress(S, LEG);
      check('offered only once', again.already === true && again.sameAccount === true);
      const leg2 = await Db.open(LEG);
      const kept = (await leg2.getAll('sessions')).length;
      leg2.close();
      check('the earlier data on the device is left as it was', kept === 2);
    } finally {
      await Db.deleteDatabase(LEG);
    }

    // ================================================================ results page in each mode
    setGroup('v2 results page: no email step in linked mode');
    {
      setContentRoot('../');
      const host = document.createElement('div');
      document.body.append(host);
      const linkedApp = { mode: 'linked', db: sdb, sync: q, syncStatus: { pending: 0 } };
      await resultsView(host, linkedApp, done.id);
      const labels = [...host.querySelectorAll('button')].map((b) => b.textContent.trim());
      check('linked: no "Send report to Dad" (email) button', !labels.some((l) => /Send report/.test(l)) && !host.innerHTML.includes('mailto:'));
      check('linked: "Copy report" is there, and the sending status', labels.includes('Copy report') && /Saved online\. Dad can see this report\./.test(host.querySelector('.sync-line').textContent));
      check('linked: her working is shown in the review', host.querySelectorAll('.rv-working .workview').length === 2);
      const localApp = { mode: 'local', db: sdb };
      await resultsView(host, localApp, done.id);
      const labels2 = [...host.querySelectorAll('button')].map((b) => b.textContent.trim());
      check('local: email button kept as in version 1, plus "Copy report"', labels2.includes('Send report to Dad') && labels2.includes('Copy report'));
      host.remove();
      setContentRoot('');
    }
  } finally {
    sdb.close();
    await Db.deleteDatabase(DBN);
  }

  // ================================================================ working area
  setGroup('v2 working area: storage format');
  {
    const pts = Array.from({ length: 200 }, (_, i) => ({ x: 10 + i * 3.3, y: 200 + Math.cos(i / 9) * 60, p: 0.2 + (i % 10) / 20 }));
    const enc = encodePoints(pts);
    const dec = decodePoints(enc);
    check('vector points round-trip (half-unit and 1% precision)', dec.length === 200 && dec.every((d, i) => Math.abs(d.x - pts[i].x) <= 0.25 && Math.abs(d.y - pts[i].y) <= 0.25 && Math.abs(d.p - pts[i].p) <= 0.005));
    check('compact: whole numbers only, 200 points in under 2 KB of JSON', enc.every(Number.isInteger) && JSON.stringify(enc).length < 2048, `${JSON.stringify(enc).length} bytes`);
    const w = testWorking();
    check('format check accepts good data and rejects damaged data', validWorking(w) && !validWorking({ v: 2 }) && !validWorking({ ...w, s: [{ w: 10, p: [1, 2] }] }) && !validWorking({ ...w, s: [{ w: 10, p: [1.5, 2, 3] }] }) && !validWorking(null));
    const png = thumbnailDataUrl(w);
    check('a small PNG is made for reports', png.startsWith('data:image/png;base64,') && dataUrlToBlob(png).size < 40000, `${dataUrlToBlob(png).size} bytes`);
    const erasedOnly = emptyWorking();
    erasedOnly.s.push({ e: 1, w: 200, p: encodePoints([{ x: 1, y: 1, p: 0.5 }]) });
    check('no picture when there is no ink', thumbnailDataUrl(emptyWorking()) === null && thumbnailDataUrl(erasedOnly) === null && !hasInk(erasedOnly));
    const fin = finishSession({ ...planSession({ subject: 'maths', topic: sampleTopic, topics: [sampleTopic], mode: 'topic', durationMin: 15, attempts: [], seed: 7 }), questionIds: sampleTopic.questions.map((x) => x.id), state: { responses: goodResp, flagged: [], times: {}, working: { 'm91-q003': w } } }, qmapT, { thumbs: { 'm91-q003': png } });
    const withW = fin.attempts.find((a) => a.questionId === 'm91-q003');
    check('her working is saved with her answer (strokes + picture)', withW.working && withW.working.strokes === w && withW.working.thumb === png && fin.attempts.filter((a) => 'working' in a).length === 1);
    const XDB = `study-practice-test-xw-${Date.now()}`;
    const xdb = await Db.open(XDB);
    try {
      await xdb.putMany([{ store: 'sessions', value: fin.session }, ...fin.attempts.map((a) => ({ store: 'attempts', value: a }))]);
      const exported = JSON.stringify(await buildExport(xdb, {}));
      const YDB = `study-practice-test-yw-${Date.now()}`;
      const ydb = await Db.open(YDB);
      try {
        await importExport(ydb, exported);
        const back = await ydb.get('attempts', withW.id);
        check('export and import keep her working', JSON.stringify(back.working.strokes) === JSON.stringify(w));
      } finally {
        ydb.close();
        await Db.deleteDatabase(YDB);
      }
    } finally {
      xdb.close();
      await Db.deleteDatabase(XDB);
    }
  }

  setGroup('v2 working area: pen, palm, eraser, undo, clear');
  {
    resetPenDetection();
    const changes = [];
    const pad = workingPad({ onChange: (x) => changes.push(x) });
    pad.el.style.width = '600px';
    document.body.append(pad.el);
    const c = pad.canvas;
    c.style.height = '300px';
    pad.redraw();
    const r = c.getBoundingClientRect();
    const fire = (type, id, pointerType, x, y, pressure = 0.5, extra = {}) => c.dispatchEvent(new PointerEvent(type, { pointerId: id, pointerType, clientX: r.left + x, clientY: r.top + y, pressure, bubbles: true, cancelable: true, button: 0, buttons: type === 'pointerup' ? 0 : 1, ...extra }));
    const stroke = (id, type, pressure, x0 = 20) => {
      fire('pointerdown', id, type, x0, 40, pressure);
      for (let i = 1; i <= 20; i++) fire('pointermove', id, type, x0 + i * 6, 40 + i * 2, pressure);
      fire('pointerup', id, type, x0 + 120, 80, pressure);
    };
    check('the pad never scrolls the page while she writes', getComputedStyle(c).touchAction === 'none');
    stroke(1, 'mouse', 0.5);
    check('mouse draws a line', pad.get().s.length === 1 && decodePoints(pad.get().s[0].p).length >= 15);
    check('fingers draw while no pen has been used', (stroke(2, 'touch', 0), pad.get().s.length === 2));
    await wait(1700); // older than a resting palm: kept when the pen arrives
    stroke(3, 'pen', 0.95);
    const penStroke = pad.get().s[2];
    check('a pen is detected, and its pressure is kept', penDetected() && Math.abs(decodePoints(penStroke.p)[3].p - 0.95) < 0.011);
    stroke(4, 'touch', 0);
    check('palm rejection: once a pen is used, touches leave no marks', pad.get().s.length === 3);
    fire('pointerdown', 5, 'pen', 300, 100, 0.5);
    fire('pointerdown', 6, 'mouse', 10, 10, 0.5);
    fire('pointermove', 5, 'pen', 330, 120, 0.5);
    fire('pointerup', 5, 'pen', 340, 130, 0.5);
    fire('pointerup', 6, 'mouse', 10, 10, 0.5);
    check('one line at a time (a second pointer is ignored)', pad.get().s.length === 4);
    pad.tool('eraser');
    stroke(7, 'pen', 0.5, 40);
    check('the eraser is stored as an eraser stroke', pad.get().s.length === 5 && pad.get().s[4].e === 1);
    pad.tool('pen');
    fire('pointerdown', 8, 'pen', 200, 200, 0.5, { button: 5, buttons: 32 });
    fire('pointermove', 8, 'pen', 220, 210, 0.5, { buttons: 32 });
    fire('pointerup', 8, 'pen', 230, 220, 0.5);
    check('a stylus\'s eraser end erases', pad.get().s[5].e === 1);
    pad.undo();
    check('undo removes the last line', pad.get().s.length === 5);
    pad.clear();
    check('clear empties the pad (and tells the session)', pad.get() === null && changes.at(-1) === null);
    pad.undo();
    check('undo brings back what was cleared', pad.get().s.length === 5 && validWorking(pad.get()));
    const saved = pad.get();
    pad.destroy();
    pad.el.remove();
    // a palm resting on the screen before the pen's first touch
    resetPenDetection();
    const pad2 = workingPad({});
    pad2.el.style.width = '600px';
    document.body.append(pad2.el);
    const c2 = pad2.canvas;
    const r2 = c2.getBoundingClientRect();
    const fire2 = (type, id, pointerType, x, y) => c2.dispatchEvent(new PointerEvent(type, { pointerId: id, pointerType, clientX: r2.left + x, clientY: r2.top + y, pressure: 0.6, bubbles: true, cancelable: true, button: 0, buttons: type === 'pointerup' ? 0 : 1 }));
    fire2('pointerdown', 20, 'touch', 400, 200);
    fire2('pointermove', 20, 'touch', 420, 210);
    fire2('pointerup', 20, 'touch', 430, 215);
    fire2('pointerdown', 21, 'touch', 380, 220);
    fire2('pointermove', 21, 'touch', 390, 230);
    fire2('pointerdown', 22, 'pen', 50, 50);
    fire2('pointermove', 22, 'pen', 90, 60);
    fire2('pointermove', 22, 'pen', 130, 70);
    fire2('pointerup', 22, 'pen', 140, 75);
    fire2('pointerup', 21, 'touch', 395, 235);
    check('palm before the first pen touch: its marks are removed and the pen is not blocked', pad2.get() && pad2.get().s.length === 1 && decodePoints(pad2.get().s[0].p)[0].x < 200);
    pad2.destroy();
    pad2.el.remove();
    const again = workingPad({ working: saved });
    check('saved working reopens on the pad', again.get().s.length === 5);
    const view = workingView(saved);
    check('read-only view for the review and reports', view.querySelector('canvas') && view.classList.contains('workview'));
    resetPenDetection();
  }

  // ================================================================ visual reports
  setGroup('v2 visual reports');
  {
    const t0 = Date.UTC(2026, 9, 12, 8);
    const ctxBase = { questions: qmapT, topics: new Map([[sampleTopic.topicId, sampleTopic]]), topicOrder: [sampleTopic] };
    const mk = (resp, t, working) => {
      const s = planSession({ subject: 'maths', topic: sampleTopic, topics: [sampleTopic], mode: 'topic', durationMin: 15, attempts: [], seed: 1, now: t });
      s.questionIds = sampleTopic.questions.map((x) => x.id);
      s.state.responses = resp;
      s.state.times = Object.fromEntries(s.questionIds.map((id, i) => [id, 10 + i * 12]));
      s.state.working = working || {};
      return finishSession(s, qmapT, { now: t + 600000, elapsedSec: 600, early: true, thumbs: {} });
    };
    const a = mk(goodResp, t0);
    const b = mk(someWrong, t0 + 86400000, { 'm91-q001': testWorking(), 'm91-q003': testWorking(10), 'm91-q004': testWorking(12) });
    const sessions = [a.session, b.session];
    const rep = buildReport(b.session, b.attempts, { ...ctxBase, sessions, attempts: [...a.attempts, ...b.attempts] });
    check('report v2 carries one row per question (result, time, working)', rep.v === 2 && rep.perQuestion.length === 7 && rep.perQuestion[0].kind === 'wrong' && rep.perQuestion[0].hasWorking && rep.perQuestion[0].timeSec === 10);
    check('a 2-3 line plain-English summary', rep.summary.length >= 2 && rep.summary.length <= 3 && rep.summary[0].startsWith('She scored') && /Down \d+ points/.test(rep.summary[0]), rep.summary.join(' | '));
    const old = { ...rep };
    delete old.perQuestion;
    delete old.summary;
    check('older reports (version 1) still get a summary and rows', summaryLines(old).length >= 2 && questionRows(old, b.attempts).length === 7);
    const text = reportPlainText(rep);
    check('"Copy report" text: full, with every question not fully right', text.includes('Score:') && text.includes('Questions not fully right:') && text.split('\n').length > 15 && !text.includes('parent area on her device'));
    const host = document.createElement('div');
    host.style.width = '700px';
    document.body.append(host);
    const vr = visualReport(rep, { attempts: b.attempts, sessions, source: null, host });
    host.append(vr);
    check('hero score: one big number', vr.querySelector('.vr-hero-num').textContent === `${Math.round(rep.score.pct * 100)}%` && vr.querySelectorAll('.vr-hero-num').length === 1);
    check('summary lines shown', vr.querySelectorAll('.vr-summary p').length === rep.summary.length);
    check('pictogram row: one per question, with a legend', vr.querySelectorAll('.vr-pictos li').length === 7 && vr.querySelectorAll('.picto-legend li').length >= 3);
    check('mastery bar for every part', vr.querySelectorAll('.vr-mbar').length === rep.masteryAfter.length && vr.querySelectorAll('.vr-mbar .lvl').length === rep.masteryAfter.length);
    check('skills as coloured chips with icon and words', vr.querySelectorAll('.vr-chip').length === rep.bySkill.length && vr.querySelector('.vr-chip-work .ic') && skillBand(0.4).id === 'work' && skillBand(0.6).id === 'getting' && skillBand(0.8).id === 'good');
    const bars = vr.querySelectorAll('.vr-time .bar');
    check('time per question: a bar each, coloured by result, legend and table', bars.length === 7 && vr.querySelector('.vr-time .bar-wrong') && vr.querySelector('.vr-time .bar-right') && vr.querySelectorAll('.vr-legend li').length >= 3 && vr.querySelectorAll('.table-view').length >= 2);
    check('time chart: keyboard and hover reach every bar', vr.querySelectorAll('.vr-time .hit[tabindex="0"]').length === 7);
    await wait(30);
    check('her working shown for wrong answers only', vr.querySelectorAll('.vr-working-card').length === 2 && vr.querySelectorAll('.vr-working-card .workview').length === 2);
    const tr = vr.querySelector('.linechart');
    check('trend across sessions, this one marked', tr && tr.querySelectorAll('.tdot').length === 2 && tr.querySelectorAll('.tdot.is-this').length === 1 && tr.querySelectorAll('.tline').length === 1);
    const sci = { ...b.session, id: 'sci-1', subject: 'science', startedAt: t0 + 2 * 86400000 };
    const sci2 = { ...sci, id: 'sci-2', startedAt: t0 + 3 * 86400000 };
    const t2 = trendChart([...sessions, sci, sci2], {});
    check('trend: Mathematics and Science as two lines with a legend', t2.querySelectorAll('.tline').length === 2 && t2.querySelectorAll('.vr-legend li').length === 2);
    check('trend needs two sessions', trendChart([a.session]) === null);
    const evil = { ...rep, title: '<img src=x onerror=alert(1)>', summary: ['<b>x</b>'], bySkill: [{ title: '<script>1</script>', total: 1, correct: 0, pct: 0 }] };
    const ev = visualReport(evil, { attempts: [], sessions: [] });
    check('report text is shown as text, never as HTML', !ev.querySelector('img, script, b') && ev.textContent.includes('<img src=x onerror=alert(1)>'));
    host.remove();
  }

  // ================================================================ hooks
  setGroup('v2 integration hooks (diagrams and generated questions)');
  {
    const q = { id: 'h-1', type: 'mcq', prompt: 'p', diagram: { kind: 'bar-model' } };
    check('without the diagram engine nothing is drawn', diagramFor(q) === null);
    setExtensions({ diagram: { renderDiagram: (spec, ctx) => { const d = document.createElement('div'); d.className = 'dg'; d.textContent = `${spec.kind}/${ctx.where}`; return d; } } });
    const node = diagramFor(q, 'review');
    check('with it, question.diagram is drawn by renderDiagram()', node && node.textContent === 'bar-model/review');
    const oq = { id: 'h-2', type: 'mcq', options: ['a', 'b'], optionDiagrams: [{ kind: 'p0' }, null] };
    const on = optionDiagramFor(oq, 0);
    check('picture choices: question.optionDiagrams[i] drawn for that option only', on && on.textContent === 'p0/session' && optionDiagramFor(oq, 1) === null && optionDiagramFor(q, 0) === null);
    setExtensions({ diagram: { renderDiagram: () => { throw new Error('bad'); } } });
    check('a failing diagram never breaks the question', diagramFor(q) === null);
    setExtensions({ diagram: { renderDiagram: () => '<b>html</b>' } });
    check('only DOM nodes are accepted (no HTML strings)', diagramFor(q) === null);
    const tmpl = { ...sampleTopic.questions[5], id: 'm91-q099', generator: { kind: 'fraction' }, prompt: 'template', answer: { value: 0, tolerance: 0, accept: [] } };
    const topic2 = { ...sampleTopic, questions: [...sampleTopic.questions, tmpl] };
    const plain = planSession({ subject: 'maths', topic: topic2, topics: [topic2], mode: 'topic', durationMin: 60, attempts: [], seed: 5 });
    check('without a generator, templates are left out of practice', !canGenerate() && !plain.questionIds.includes('m91-q099'));
    setExtensions({ generator: { generate: (qq, rng) => { const n = 1 + Math.floor(rng() * 9); return { ...qq, prompt: `What is ${n} + ${n}?`, answer: { value: n * 2, tolerance: 0, accept: [] }, solution: `${n} + ${n} = ${n * 2}` }; } } });
    const gen = planSession({ subject: 'maths', topic: topic2, topics: [topic2], mode: 'topic', durationMin: 60, attempts: [], seed: 5 });
    const inst = gen.instances['m91-q099'];
    check('with a generator, the concrete question is made once and kept in the session', canGenerate() && gen.questionIds.includes('m91-q099') && inst && /What is \d \+ \d\?/.test(inst.prompt) && !('generator' in inst) && inst.id === 'm91-q099');
    const gen2 = planSession({ subject: 'maths', topic: topic2, topics: [topic2], mode: 'topic', durationMin: 60, attempts: [], seed: 5 });
    check('same seed, same numbers', gen2.instances['m91-q099'].prompt === inst.prompt);
    const map = questionsForSession(new Map(topic2.questions.map((x) => [x.id, x])), gen);
    check('the session\'s own version is used everywhere (overlay on the bank)', map.get('m91-q099').prompt === inst.prompt);
    gen.state.responses = { 'm91-q099': String(inst.answer.value) };
    const fin = finishSession(gen, new Map(topic2.questions.map((x) => [x.id, x])), {});
    check('marking uses the generated answer', fin.attempts.find((x) => x.questionId === 'm91-q099').correct === true);
    setExtensions({ generator: { generate: () => null } });
    check('a generator that fails gives no question (never a broken one)', instantiate(tmpl, Math.random) === null);
    setExtensions({ diagram: null, generator: null });
  }

  // ================================================================ AI seam
  setGroup('v2 Step B seam (switched off)');
  {
    connectAi(null);
    check('local mode: no AI', aiAvailable() === false && aiAvailable('askProgress') === false);
    connectAi(new MockBackend(new MockServer()));
    check('mock back-end: no AI', aiAvailable('askProgress') === false);
    let called = false;
    connectAi({ kind: 'supabase', invoke: async () => { called = true; return {}; } });
    check('linked mode with the switches off: no AI, no call', aiAvailable() === false && (await askProgress('x', 'y')) === null && !called);
    connectAi(null);
  }
}
