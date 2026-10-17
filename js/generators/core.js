// Shared tools for the maths question generators: seeded randomness, exact fractions, number
// formatting in the Cambridge style, and question builders that turn a correct answer and a set
// of named misconceptions into a bank-format question.
//
// Every generated question has the same keys as a bank question (docs: CLO Content README) plus
// `generatorId` and `seed`, so generate(generatorId, seed, difficulty) reproduces it exactly.

// ---------------------------------------------------------------- randomness

export const MAX_DRAWS = 200000;

/** A seeded random number generator (mulberry32) from any number of seed parts. */
export function makeRng(...parts) {
  let h = 2166136261;
  for (const p of parts) for (const c of String(p)) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  let a = h >>> 0;
  let draws = 0;
  const next = () => {
    // a safety net: a generator that keeps redrawing without finding numbers that fit must not
    // freeze the page; generate() reports it as an error instead
    if (++draws > MAX_DRAWS) throw new Error('generator ran too long without finding suitable numbers');
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const rng = {
    next,
    /** Whole number from lo to hi inclusive. */
    int: (lo, hi) => lo + Math.floor(next() * (hi - lo + 1)),
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    chance: (p) => next() < p,
    /** A shuffled copy. */
    shuffle: (arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(next() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; },
    /** k different items. */
    sample: (arr, k) => rng.shuffle(arr).slice(0, k),
    /** Whole number from lo to hi that is not in `avoid`. */
    intNot: (lo, hi, avoid) => { const s = new Set(avoid); for (let i = 0; i < 200; i++) { const v = rng.int(lo, hi); if (!s.has(v)) return v; } return lo; },
  };
  return rng;
}

// ---------------------------------------------------------------- exact fractions

export const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a; };
export const lcm = (a, b) => (a / gcd(a, b)) * b;

export class Frac {
  constructor(n, d = 1) {
    if (!Number.isInteger(n) || !Number.isInteger(d) || d === 0) throw new Error(`bad fraction ${n}/${d}`);
    const s = d < 0 ? -1 : 1;
    const g = gcd(n, d) || 1;
    this.n = (s * n) / g;
    this.d = (s * d) / g;
  }
  static of(x) { return x instanceof Frac ? x : new Frac(x, 1); }
  add(o) { o = Frac.of(o); return new Frac(this.n * o.d + o.n * this.d, this.d * o.d); }
  sub(o) { o = Frac.of(o); return new Frac(this.n * o.d - o.n * this.d, this.d * o.d); }
  mul(o) { o = Frac.of(o); return new Frac(this.n * o.n, this.d * o.d); }
  div(o) { o = Frac.of(o); return new Frac(this.n * o.d, this.d * o.n); }
  eq(o) { o = Frac.of(o); return this.n === o.n && this.d === o.d; }
  cmp(o) { o = Frac.of(o); return this.n * o.d - o.n * this.d; }
  get value() { return this.n / this.d; }
  get isInt() { return this.d === 1; }
  /** Does it have an exact decimal (denominator made only of 2s and 5s)? */
  get terminates() { let d = this.d; while (d % 2 === 0) d /= 2; while (d % 5 === 0) d /= 5; return d === 1; }
  /** "3/4", "-5/2" or "3". */
  toString() { return this.d === 1 ? String(this.n) : `${this.n}/${this.d}`; }
  /** "1 1/4" for an improper fraction, else as toString(). */
  mixed() {
    if (this.d === 1 || Math.abs(this.n) < this.d) return this.toString();
    const w = Math.trunc(this.n / this.d);
    const r = Math.abs(this.n % this.d);
    return r ? `${w} ${r}/${this.d}` : String(w);
  }
  /** The exact decimal as text (only when it terminates). */
  decimal() { if (!this.terminates) throw new Error('does not terminate'); return dec(this.value, 6); }
}
export const F = (n, d = 1) => new Frac(n, d);

// ---------------------------------------------------------------- formatting

/** A whole number as the bank writes it: 4567 (no space), 48 650 and 7 040 006 (spaces from five digits). */
export function fmtInt(n) {
  const s = String(Math.abs(n));
  const out = s.length <= 4 ? s : s.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return n < 0 ? `-${out}` : out;
}
/** A decimal without floating-point noise, up to `dp` places, trailing zeros removed; thousands spaced. */
export function dec(x, dp = 6) {
  const r = Math.round(x * 10 ** dp) / 10 ** dp;
  let s = r.toFixed(dp).replace(/\.?0+$/, '');
  if (s === '-0') s = '0';
  const [i, f] = s.split('.');
  const neg = i.startsWith('-');
  const ip = fmtInt(Math.abs(Number(i)));
  return `${neg ? '-' : ''}${ip}${f ? `.${f}` : ''}`;
}
/** Money in ringgit: RM 4.50 (always two decimal places unless whole). */
export function rm(x) {
  const c = Math.round(x * 100);
  return c % 100 === 0 ? `RM ${fmtInt(c / 100)}` : `RM ${fmtInt(Math.floor(c / 100))}.${String(c % 100).padStart(2, '0')}`;
}
/** Number of decimal places needed to write x exactly (up to 6). */
export function dps(x) {
  for (let d = 0; d <= 6; d++) if (Math.abs(Math.round(x * 10 ** d) - x * 10 ** d) < 1e-7) return d;
  return 7;
}
export const plural = (n, w, many = `${w}s`) => `${n === 1 ? w : many}`;
/** "3 units", "1 unit": the number with its word, singular for exactly 1 (CLO review X4). */
export const countOf = (n, w, many = `${w}s`) => `${n} ${plural(Number(n), w, many)}`;
/** A number inside working: negatives in brackets, so "1 + (-3)", never "1 + -3" (CLO review X5). */
export const term = (n) => (Number(n) < 0 ? `(${n})` : `${n}`);
export const ordinal = (n) => { const s = ['th', 'st', 'nd', 'rd']; const v = n % 100; return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`; };

// ---------------------------------------------------------------- reading numbers back (for checks)

/** The value of an option or answer text: "3/4", "1 1/2", "0.75", "48 650", "RM 4.50", "25%", "-3". */
export function valueOf(text) {
  const t = String(text).replace(/[−–]/g, '-').replace(/^RM\s*/i, '').replace(/\s*(cm|m|km|mm|g|kg|ml|l|L|°|°C|h|min|s|cm\^2|cm\^3|m\^2|m\^3)$/, '').trim();
  let m;
  if ((m = t.match(/^(-?)(\d+) (\d+)\/(\d+)$/))) return (m[1] ? -1 : 1) * (Number(m[2]) + Number(m[3]) / Number(m[4]));
  if ((m = t.match(/^(-?\d+)\/(\d+)$/))) return Number(m[1]) / Number(m[2]);
  if ((m = t.match(/^(-?[\d ]+(?:\.\d+)?)%$/))) return Number(m[1].replace(/ /g, '')) / 100;
  if (/^-?\d{1,3}( \d{3})*(\.\d+)?$/.test(t) || /^-?\d+(\.\d+)?$/.test(t)) return Number(t.replace(/ /g, ''));
  return null;
}

// ---------------------------------------------------------------- question builders

const TYPES_WITH_OPTIONS = new Set(['mcq', 'multi', 'order', 'match']);

/** Same answer? Equal numbers (any form), or the same text ignoring case and spaces. */
export function sameAnswer(a, b) {
  const va = valueOf(a);
  const vb = valueOf(b);
  if (va != null && vb != null) return Math.abs(va - vb) < 1e-9;
  return String(a).toLowerCase().replace(/\s+/g, '') === String(b).toLowerCase().replace(/\s+/g, '');
}

/**
 * A multiple-choice question from the correct answer and candidate distractors.
 * distractors: [{ text, why, code }] in order of preference. `code` names the misconception that
 * produces that wrong answer (misconceptions.js); `why` says, to her, what she probably did.
 * Candidates that equal the answer (in value) or each other are dropped. `fallback(k)` supplies
 * near misses (code NEAR-MISS, an honest generic text) only if the named ones run out.
 * Returns { options, answer, misconceptions, codes }.
 */
export function choices(rng, correct, distractors, fallback, n = 4) {
  const picked = [];
  const ok = (d) => d && d.text != null && String(d.text).trim() !== '' && !sameAnswer(d.text, correct) && !picked.some((p) => sameAnswer(p.text, d.text));
  const take = (d) => {
    if (!d.why || !d.code) throw new Error(`distractor ${d.text} has no ${d.why ? 'code' : 'misconception text'}`);
    picked.push(d);
  };
  for (const d of distractors) { if (picked.length >= n - 1) break; if (ok(d)) take(d); }
  let guard = 0;
  while (picked.length < n - 1 && fallback && guard++ < 60) { const d = fallback(guard); if (ok(d)) take(d); }
  if (picked.length < n - 1) throw new Error(`not enough distractors for ${correct}`);
  const all = rng.shuffle([{ text: String(correct), correct: true }, ...picked.map((d) => ({ text: String(d.text), why: d.why, code: d.code }))]);
  const misconceptions = {};
  const codes = {};
  all.forEach((o, i) => { if (!o.correct) { misconceptions[String(i)] = o.why; codes[String(i)] = o.code; } });
  return { options: all.map((o) => o.text), answer: all.findIndex((o) => o.correct), misconceptions, codes };
}

/**
 * Misconception notes for a typed (short or numeric) answer: one per known wrong answer, keyed by
 * that wrong answer, plus `common`. items: [{ text, why, code }]. Wrong answers equal to the right
 * one, or repeated, are dropped. Returns { misconceptions, codes }.
 */
export function typedMisconceptions(correct, items, common) {
  const misconceptions = {};
  const codes = {};
  for (const d of items) {
    if (!d || d.text == null || sameAnswer(d.text, correct) || Object.keys(misconceptions).some((k) => sameAnswer(k, d.text))) continue;
    if (!d.why || !d.code) throw new Error(`wrong answer ${d.text} has no ${d.why ? 'code' : 'text'}`);
    misconceptions[String(d.text)] = d.why;
    codes[String(d.text)] = d.code;
  }
  // the catch-all for a typed answer that matches none of the listed wrong answers: its text is a
  // hint, and its code is UNCLASSIFIED, so an unmatched slip is never reported as a named
  // misconception (CLO review X1)
  misconceptions.common = common.why;
  codes.common = 'UNCLASSIFIED';
  return { misconceptions, codes };
}

/**
 * A near-miss fallback distractor: no claim of a specific error, and no claim that it is "close"
 * (CLO review X3). The hint says what to check. Use only plausible values, never a number that
 * already appears in the question.
 */
export const nearMiss = (text, hint) => ({ text, code: 'NEAR-MISS', why: `Not quite: ${text} is not right. ${hint}` });

// ---------------------------------------------------------------- people (names from the bank)

export const PEOPLE = [
  { name: 'Siti', he: 'she', his: 'her' }, { name: 'Wei Ming', he: 'he', his: 'his' }, { name: 'Aisha', he: 'she', his: 'her' },
  { name: 'Daniel', he: 'he', his: 'his' }, { name: 'Priya', he: 'she', his: 'her' }, { name: 'Omar', he: 'he', his: 'his' },
  { name: 'Arjun', he: 'he', his: 'his' }, { name: 'Mei Lin', he: 'she', his: 'her' }, { name: 'Ahmad', he: 'he', his: 'his' },
  { name: 'Lina', he: 'she', his: 'her' }, { name: 'Kumar', he: 'he', his: 'his' }, { name: 'Rahim', he: 'he', his: 'his' },
];
/** Capital first letter, for sentences that start with a word from the data. */
export const capFirst = (t) => (t ? t[0].toUpperCase() + t.slice(1) : t);
/** A person with He/She and His/Her ready for the start of a sentence. */
export function person(rng) { const p = rng.pick(PEOPLE); return { ...p, He: capFirst(p.he), His: capFirst(p.his) }; }

/** A numeric answer: value plus the forms a pupil may type (fractions, mixed numbers, units). */
export function numericAnswer(value, accept = []) {
  return { value, tolerance: 0, accept: [...new Set(accept.map(String))] };
}

/**
 * Assemble the final question in bank format. `meta` comes from the registry (generatorId,
 * topic prefix, subtopic, skill); `body` from the generator.
 */
export function finish(meta, seed, difficulty, body) {
  const q = {
    id: `${meta.prefix}-g-${meta.id.split('.').pop()}-d${difficulty}-${seed}`,
    subtopicId: meta.subtopicId,
    type: body.type,
    difficulty,
    marks: body.marks || (difficulty === 3 ? 2 : 1),
    prompt: body.prompt,
  };
  if (TYPES_WITH_OPTIONS.has(body.type)) q.options = body.options;
  if (body.optionDiagrams) q.optionDiagrams = body.optionDiagrams;
  q.answer = body.answer;
  q.solution = body.solution;
  q.misconceptions = body.misconceptions;
  q.skill = body.skill || meta.skill;
  q.source = 'generated';
  if (body.codes) q.misconceptionCodes = body.codes;
  if (body.diagram) q.diagram = body.diagram;
  q.generatorId = meta.id;
  q.seed = seed;
  return q;
}

// ---------------------------------------------------------------- fraction words

const DEN_WORDS = { 2: ['half', 'halves'], 3: ['third', 'thirds'], 4: ['quarter', 'quarters'], 5: ['fifth', 'fifths'], 6: ['sixth', 'sixths'], 7: ['seventh', 'sevenths'], 8: ['eighth', 'eighths'], 9: ['ninth', 'ninths'], 10: ['tenth', 'tenths'], 11: ['eleventh', 'elevenths'], 12: ['twelfth', 'twelfths'] };
/** "quarters", "fifths", "twelfths" (or the singular): never "4ths". */
export function denWord(d, plural = true) {
  if (DEN_WORDS[d]) return DEN_WORDS[d][plural ? 1 : 0];
  const v = d % 100; const s = v >= 11 && v <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[d % 10] || 'th');
  return `${d}${s}${plural ? 's' : ''}`;
}
