// Shared helpers for the Step B edge functions (ask-progress, read-handwriting,
// generate-questions). NOT DEPLOYED in Step A. Nothing here holds a key: the Anthropic key is
// read from the function's environment (Supabase secret ANTHROPIC_API_KEY, which EC enters
// himself, docs/SETUP-ANTHROPIC.md).
//
// Data access rule for Step B: read her data WITH THE CALLER'S OWN TOKEN, so Row Level Security
// decides what the function may see (a parent sees only his linked child). The service-role key
// is used only to write the ask_log row.

import Anthropic from 'npm:@anthropic-ai/sdk'; // pin an exact version when deploying (see README)

export const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
export const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

// Model choice. Routine calls use the latest Sonnet; question writing uses the latest Opus.
// Override per function with the secrets MODEL_ASK, MODEL_HANDWRITING, MODEL_GENERATE.
export const MODELS = {
  ask: Deno.env.get('MODEL_ASK') ?? 'claude-sonnet-5-5',
  handwriting: Deno.env.get('MODEL_HANDWRITING') ?? 'claude-sonnet-5-5',
  generate: Deno.env.get('MODEL_GENERATE') ?? 'claude-opus-5-5',
};

const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') ?? 'https://ec-drives.github.io,http://localhost:8766')
  .split(',').map((s) => s.trim()).filter(Boolean);

export class Problem extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function cors(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') ?? '';
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0] ?? 'null',
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}

export function reply(req: Request, status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...cors(req), 'Content-Type': 'application/json' } });
}

export function serviceKey(): string {
  const legacy = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (legacy) return legacy;
  try {
    const o = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '');
    const first = o && typeof o === 'object' ? Object.values(o)[0] : null;
    if (typeof first === 'string') return first;
  } catch { /* not set */ }
  return '';
}

export interface Caller {
  id: string;
  role: 'parent' | 'student';
  token: string;
}

/** Ask Supabase Auth who sent the request, then read their profile with their own token. */
export async function getCaller(req: Request): Promise<Caller> {
  const auth = req.headers.get('Authorization') ?? '';
  if (!auth.startsWith('Bearer ')) throw new Problem(401, 'Please sign in first.');
  const token = auth.slice(7);
  const u = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: ANON_KEY, Authorization: auth } });
  if (!u.ok) throw new Problem(401, 'Your sign-in has expired. Please sign in again.');
  const user = await u.json();
  const rows = await asCaller(token, `profiles?id=eq.${encodeURIComponent(user.id)}&select=id,role`);
  if (!Array.isArray(rows) || !rows[0]) throw new Problem(403, 'This account has no profile.');
  return { id: user.id, role: rows[0].role, token };
}

/** A PostgREST read as the caller (Row Level Security applies). */
export async function asCaller(token: string, pathAndQuery: string): Promise<unknown> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${pathAndQuery}`, { headers: { apikey: ANON_KEY, Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Problem(502, 'Could not read the progress data.');
  return res.json();
}

/** Download a private storage object as the caller (storage policies apply). */
export async function downloadAsCaller(token: string, bucket: string, path: string): Promise<Uint8Array> {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/authenticated/${bucket}/${path.split('/').map(encodeURIComponent).join('/')}`, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Problem(404, 'That image was not found.');
  return new Uint8Array(await res.arrayBuffer());
}

/** Insert a row with the service-role key (used only for ask_log). */
export async function insertAsService(table: string, row: Record<string, unknown>): Promise<void> {
  const key = serviceKey();
  const headers: Record<string, string> = { apikey: key, 'Content-Type': 'application/json', Prefer: 'return=minimal' };
  if (key.startsWith('eyJ')) headers.Authorization = `Bearer ${key}`;
  await fetch(`${SUPABASE_URL}/rest/v1/${table}`, { method: 'POST', headers, body: JSON.stringify(row) });
}

export function base64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

/** The Anthropic client. The key comes only from the environment; never from code or the request. */
export function claude(): Anthropic {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) throw new Problem(501, 'Claude is not connected yet (no ANTHROPIC_API_KEY secret). See docs/SETUP-ANTHROPIC.md.');
  return new Anthropic({ apiKey });
}

export interface ClaudeResult {
  text: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
}

/**
 * One Messages API call. Uses the server-side refusal fallback ("default" form), so a request
 * a safety classifier declines is re-run on Anthropic's recommended fallback model instead of
 * failing. A refusal by the whole chain comes back as Problem(422).
 */
export async function ask(model: string, system: string, content: Anthropic.Beta.BetaContentBlockParam[] | string, opts: { maxTokens?: number; effort?: 'low' | 'medium' | 'high' } = {}): Promise<ClaudeResult> {
  const client = claude();
  const params = {
    model,
    max_tokens: opts.maxTokens ?? 4000,
    system,
    output_config: { effort: opts.effort ?? 'medium' },
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    messages: [{ role: 'user' as const, content }],
  };
  // deno-lint-ignore no-explicit-any
  const res = await client.beta.messages.create(params as any);
  if (res.stop_reason === 'refusal') throw new Problem(422, 'Claude could not help with that request.');
  const text = res.content.filter((b) => b.type === 'text').map((b) => (b as { text: string }).text).join('\n').trim();
  return { text, model: res.model, inputTokens: res.usage.input_tokens, outputTokens: res.usage.output_tokens };
}

/** Wraps a handler with CORS, method check and plain-English errors. */
export function serve(handler: (req: Request, who: Caller) => Promise<unknown>) {
  Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(req) });
    if (req.method !== 'POST') return reply(req, 405, { ok: false, error: 'Use POST.' });
    try {
      const who = await getCaller(req);
      return reply(req, 200, await handler(req, who));
    } catch (e) {
      if (e instanceof Problem) return reply(req, e.status, { ok: false, error: e.message });
      if (e instanceof Anthropic.RateLimitError) return reply(req, 429, { ok: false, error: 'Claude is busy. Please try again in a minute.' });
      if (e instanceof Anthropic.AuthenticationError) return reply(req, 502, { ok: false, error: 'The Anthropic key was not accepted. Check the ANTHROPIC_API_KEY secret.' });
      if (e instanceof Anthropic.APIError) return reply(req, 502, { ok: false, error: `Claude could not answer (error ${e.status}).` });
      console.error('function failed', e instanceof Error ? e.message : 'unknown');
      return reply(req, 500, { ok: false, error: 'Something went wrong. Please try again.' });
    }
  });
}
