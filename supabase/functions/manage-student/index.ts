// manage-student: lets the parent create his daughter's account and reset her password from the
// parent area, without her needing an email address.
//
// Step A (needed now). Deploy it once (docs/SETUP-SUPABASE.md, step 7). It is one
// self-contained file so it can be pasted into the Supabase dashboard's function editor.
//
// How it stays safe:
//   * Sign-ups are switched off in the project, so the public anon key cannot create accounts.
//     Only this function can, and it uses the service-role key, which Supabase gives the
//     function itself (it never reaches the browser or the repository).
//   * Every call must carry a signed-in user's token. The function asks Supabase Auth who that
//     is, and acts only if the caller's profile has role "parent".
//   * A parent can reset the password only of a student whose parent_id is him.
//   * A student signs in with a username. Internally the account's email is
//     <username>@<STUDENT_EMAIL_DOMAIN> (a reserved .invalid domain by default), confirmed at
//     creation, so no email is ever sent and none is needed.
//   * Passwords are never logged or returned.
//
// Request: POST with JSON
//   { "action": "create", "username": "...", "password": "...", "displayName": "..." }
//   { "action": "set-password", "studentId": "<uuid>", "password": "..." }
// Response: JSON { ok: true, ... } or { ok: false, error: "plain message" } with an HTTP status.

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SERVICE_KEY = serviceKey();
const STUDENT_DOMAIN = (Deno.env.get('STUDENT_EMAIL_DOMAIN') ?? 'students.study-practice.invalid').toLowerCase();
const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') ?? 'https://ec-drives.github.io,http://localhost:8766')
  .split(',').map((s) => s.trim()).filter(Boolean);
const MAX_STUDENTS = 5;
const USERNAME = /^[a-z0-9][a-z0-9._-]{2,29}$/;

/** The service-role (secret) key, from the variables Supabase sets for every function. */
function serviceKey(): string {
  const legacy = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (legacy) return legacy;
  // newer projects may expose secret keys as JSON, e.g. {"default":"sb_secret_..."}
  const keys = Deno.env.get('SUPABASE_SECRET_KEYS');
  if (keys) {
    try {
      const o = JSON.parse(keys);
      const first = typeof o === 'object' && o ? Object.values(o)[0] : null;
      if (typeof first === 'string') return first;
    } catch { /* not JSON */ }
  }
  return '';
}

function cors(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') ?? '';
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0] ?? 'null',
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}

function reply(req: Request, status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...cors(req), 'Content-Type': 'application/json' } });
}

/** Headers for calls made with the service-role key (admin API, writes that bypass RLS). */
function adminHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const h: Record<string, string> = { apikey: SERVICE_KEY, 'Content-Type': 'application/json', ...extra };
  if (SERVICE_KEY.startsWith('eyJ')) h.Authorization = `Bearer ${SERVICE_KEY}`; // legacy JWT key
  return h;
}

class Problem extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Who is calling? Supabase Auth checks the token; we never trust anything else in the request. */
async function caller(req: Request): Promise<{ id: string; role: string }> {
  const auth = req.headers.get('Authorization') ?? '';
  if (!auth.startsWith('Bearer ')) throw new Problem(401, 'Please sign in first.');
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: ANON_KEY || SERVICE_KEY, Authorization: auth } });
  if (!res.ok) throw new Problem(401, 'Your sign-in has expired. Please sign in again.');
  const user = await res.json();
  if (!user || typeof user.id !== 'string') throw new Problem(401, 'Please sign in first.');
  const p = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&select=id,role`, { headers: adminHeaders() });
  const rows = p.ok ? await p.json() : [];
  if (!Array.isArray(rows) || !rows[0]) throw new Problem(403, 'This account has no profile yet. See SETUP-SUPABASE step 6.');
  return { id: user.id, role: rows[0].role };
}

function checkPassword(pw: unknown): string {
  if (typeof pw !== 'string' || pw.length < 8 || pw.length > 72) throw new Problem(400, 'The password must be 8 to 72 characters.');
  return pw;
}

async function createStudent(parentId: string, body: Record<string, unknown>) {
  const username = String(body.username ?? '').trim().toLowerCase();
  if (!USERNAME.test(username)) {
    throw new Problem(400, 'The username must be 3 to 30 characters: small letters, numbers, dots, dashes or underscores, starting with a letter or number.');
  }
  const password = checkPassword(body.password);
  const displayName = String(body.displayName ?? '').trim().slice(0, 40) || null;

  const count = await fetch(`${SUPABASE_URL}/rest/v1/profiles?parent_id=eq.${encodeURIComponent(parentId)}&select=id`, { headers: adminHeaders() });
  const existing = count.ok ? await count.json() : [];
  if (Array.isArray(existing) && existing.length >= MAX_STUDENTS) throw new Problem(400, `A parent can have at most ${MAX_STUDENTS} student accounts.`);
  const taken = await fetch(`${SUPABASE_URL}/rest/v1/profiles?username=eq.${encodeURIComponent(username)}&select=id`, { headers: adminHeaders() });
  if (taken.ok && (await taken.json()).length) throw new Problem(409, 'That username is already taken. Please choose another.');

  const created = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: adminHeaders(),
    body: JSON.stringify({ email: `${username}@${STUDENT_DOMAIN}`, password, email_confirm: true, app_metadata: { role: 'student' } }),
  });
  const user = await created.json().catch(() => ({}));
  if (!created.ok || typeof user.id !== 'string') {
    const msg = String(user.msg ?? user.message ?? user.error_description ?? '');
    if (created.status === 422 && /already|exists|registered/i.test(msg)) throw new Problem(409, 'That username is already taken. Please choose another.');
    throw new Problem(502, `Supabase could not create the account${msg ? `: ${msg}` : '.'}`);
  }

  const prof = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
    method: 'POST',
    headers: adminHeaders({ Prefer: 'return=minimal' }),
    body: JSON.stringify({ id: user.id, role: 'student', parent_id: parentId, username, display_name: displayName }),
  });
  if (!prof.ok) {
    // do not leave an account without a profile behind
    await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${user.id}`, { method: 'DELETE', headers: adminHeaders() });
    throw new Problem(502, 'The account could not be linked to you, so it was removed again. Please try once more.');
  }
  return { ok: true, studentId: user.id, username };
}

async function setPassword(parentId: string, body: Record<string, unknown>) {
  const studentId = String(body.studentId ?? '');
  if (!/^[0-9a-f-]{36}$/i.test(studentId)) throw new Problem(400, 'Unknown student.');
  const password = checkPassword(body.password);
  const p = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${studentId}&parent_id=eq.${encodeURIComponent(parentId)}&role=eq.student&select=id`, { headers: adminHeaders() });
  const rows = p.ok ? await p.json() : [];
  if (!Array.isArray(rows) || !rows.length) throw new Problem(403, 'That student is not linked to your account.');
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${studentId}`, { method: 'PUT', headers: adminHeaders(), body: JSON.stringify({ password }) });
  if (!res.ok) throw new Problem(502, 'Supabase could not change the password.');
  return { ok: true };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(req) });
  if (req.method !== 'POST') return reply(req, 405, { ok: false, error: 'Use POST.' });
  try {
    if (!SUPABASE_URL || !SERVICE_KEY) throw new Problem(500, 'The function is missing its Supabase settings.');
    const who = await caller(req);
    if (who.role !== 'parent') throw new Problem(403, 'Only a parent account can do this.');
    const body = await req.json().catch(() => ({}));
    if (body.action === 'create') return reply(req, 200, await createStudent(who.id, body));
    if (body.action === 'set-password') return reply(req, 200, await setPassword(who.id, body));
    throw new Problem(400, 'Unknown action.');
  } catch (e) {
    if (e instanceof Problem) return reply(req, e.status, { ok: false, error: e.message });
    console.error('manage-student failed', e instanceof Error ? e.message : 'unknown error');
    return reply(req, 500, { ok: false, error: 'Something went wrong. Please try again.' });
  }
});
