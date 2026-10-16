// Marking for every question type. Pure functions: no DOM, no storage, so the test page can
// check each rule directly.
//
// Response formats (what the session screen stores for each question):
//   mcq        option index (number) or null
//   multi      array of option indices (any order); [] or null = not answered
//   short      string
//   numeric    string, exactly as typed
//   truefalse  true / false / null
//   order      array of option indices in the order she arranged them, or null if untouched
//   match      array, one entry per left item: the right index chosen for it, or null

const NEGATIONS = new Set(['not', 'no', 'never', 'none', "don't", 'dont', "doesn't", 'doesnt', "isn't", 'isnt',
  "aren't", 'arent', "can't", 'cant', 'cannot', "won't", 'wont', "didn't", 'didnt', 'nothing', 'neither', 'nor']);
const ARTICLES = /^(the|a|an) /;

const VULGAR = { '½': '1/2', '⅓': '1/3', '⅔': '2/3', '¼': '1/4', '¾': '3/4', '⅕': '1/5', '⅖': '2/5', '⅗': '3/5', '⅘': '4/5', '⅙': '1/6', '⅚': '5/6', '⅐': '1/7', '⅛': '1/8', '⅜': '3/8', '⅝': '5/8', '⅞': '7/8', '⅑': '1/9', '⅒': '1/10' };
const SUPERSCRIPT = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁻': '-' };

/**
 * Before Unicode NFKC folding: a vulgar fraction becomes " n/d" (so "1½" reads as 1 1/2, not 11/2)
 * and a superscript becomes "^n" (so "5²" never reads as 52).
 */
function preFold(input) {
  return String(input ?? '')
    .replace(/[½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅐⅛⅜⅝⅞⅑⅒]/g, (c) => ` ${VULGAR[c]}`)
    .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+/g, (s) => `^${[...s].map((c) => SUPERSCRIPT[c]).join('')}`)
    .normalize('NFKC');
}

/** Lower-case, tidy spacing and punctuation so that trivial differences do not matter. */
export function normaliseText(input) {
  return preFold(input)
    .toLowerCase()
    .replace(/[‘’‛`´]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[−–—]/g, '-')
    .replace(/⁄/g, '/')
    .replace(/[×*]/g, 'x')
    // keep the symbols that change a meaning (+ ÷ < > =); drop other punctuation
    .replace(/[^\p{L}\p{N}\s.\-'/%°:+÷<>=]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.]+$/, '')
    .trim();
}

function stripArticles(s) {
  let t = s;
  while (ARTICLES.test(t)) t = t.replace(ARTICLES, '');
  return t;
}

/** Levenshtein distance, giving up early once it is above `max`. */
export function levenshtein(a, b, max = Infinity) {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (cur[j] < rowMin) rowMin = cur[j];
    }
    if (rowMin > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}

/** How many typing slips a word of this length may have and still count (never more than one). */
export function typoAllowance(len) {
  return len <= 4 ? 0 : 1;
}

/**
 * Is `b` one typing slip away from `a`: one letter missed out, one extra letter, or two
 * neighbouring letters swapped? A changed letter does not count as a slip, because one changed
 * letter is often a different word (waxing / waning).
 */
export function oneSlip(a, b) {
  if (a === b) return false;
  const la = a.length;
  const lb = b.length;
  if (Math.abs(la - lb) > 1) return false;
  let i = 0;
  while (i < la && i < lb && a[i] === b[i]) i++;
  if (la === lb) return i + 1 < la && a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2);
  const [long, short] = la > lb ? [a, b] : [b, a];
  return long.slice(i + 1) === short.slice(i);
}

// Pairs of words that look alike but mean different things. A slip never turns one into the other.
const CONFUSABLE = [
  [/reflect/, /refract/],
  [/\bwax/, /\bwan(e|ing)/],
  [/\bthousands?\b/, /\bthousandths?\b/],
  [/\bhundreds?\b/, /\bhundredths?\b/],
  [/\btens?\b/, /\btenths?\b/],
  [/millilit/, /millimet/],
  [/condens/, /evapor/],
  [/\bseries\b/, /\bparallel\b/],
  [/convex/, /concave/],
  [/\bincreas/, /\bdecreas/],
  [/\bmelt/, /\bfreez/],
];
// a slip that only adds or drops one of these endings makes a different word (eight / eighth)
const SUFFIXES = ['h', 'th', 'ths'];
const PREFIXES = ['un', 'in', 'im', 'ir', 'il', 'dis', 'non'];

function confusable(r, a) {
  for (const pair of CONFUSABLE) {
    const ia = pair.findIndex((p) => p.test(a));
    const ir = pair.findIndex((p) => p.test(r));
    if (ia >= 0 && ir >= 0 && ia !== ir && !pair[ia].test(r)) return true;
  }
  return false;
}

function affixOnly(x, y) {
  const [long, short] = x.length >= y.length ? [x, y] : [y, x];
  if (long.startsWith(short) && SUFFIXES.includes(long.slice(short.length))) return true;
  if (long.endsWith(short) && PREFIXES.includes(long.slice(0, long.length - short.length))) return true;
  return false;
}

const digitsOf = (s) => (s.match(/-?\d+(?:[.:]\d+)?/g) || []).join('|');

/**
 * Remove spacing that does not matter: spaces (except between two numbers, so "1 2" never
 * becomes "12"), apostrophes, and hyphens between letters (never a minus sign).
 */
function squash(s) {
  return s
    .replace(/(?<=\p{L})-(?=\p{L})/gu, '')
    .replace(/'/g, '')
    .replace(/\s+/g, (m, off, str) => (/\d/.test(str[off - 1] || '') && /[\d-]/.test(str[off + m.length] || '') ? ' ' : ''));
}

/**
 * Do two pieces of text say the same thing, allowing for case, spacing, punctuation and a leading
 * "the/a/an", and (unless `fuzzy` is false) one small typing slip in a word of 5 or more letters?
 * A slip is one letter missed, one extra, or two neighbouring letters swapped. Slips are never
 * allowed in numbers, the first letter must match (so "decrease" never passes for "increase",
 * nor "soluble" for "insoluble"), a slip may not just add or drop an ending such as "-th"
 * (eight / eighth), and look-alike words (reflection / refraction, waxing / waning) never match.
 */
export function textMatches(response, accepted, fuzzy = true) {
  const r = stripArticles(normaliseText(response));
  const a = stripArticles(normaliseText(accepted));
  if (!r || !a) return false;
  if (r === a) return true;
  const rs = squash(r);
  const as = squash(a);
  if (rs === as) return true;
  if (!fuzzy) return false;
  if (digitsOf(r) !== digitsOf(a)) return false;
  if (!/\p{L}/u.test(as)) return false;
  if (rs[0] !== as[0]) return false;
  if (typoAllowance(as.length) === 0) return false;
  if (!oneSlip(rs, as)) return false;
  if (affixOnly(rs, as) || confusable(r, a)) return false;
  return true;
}

function wordsOf(s) {
  return normaliseText(s).split(' ').filter(Boolean);
}

/** Is the keyword (one or more words) present in the response, allowing small slips per word? */
export function containsKeyword(response, keyword) {
  const rw = wordsOf(response);
  const kw = wordsOf(keyword);
  if (!kw.length || !rw.length) return false;
  for (let i = 0; i + kw.length <= rw.length; i++) {
    let ok = true;
    for (let j = 0; j < kw.length; j++) {
      if (!textMatches(rw[i + j], kw[j])) { ok = false; break; }
    }
    if (ok) return true;
  }
  // a keyword typed as one word ("photo synthesis" vs "photosynthesis")
  const joined = rw.join('');
  return kw.length === 1 && kw[0].length >= 6 && joined.includes(kw[0]);
}

function hasNegation(text) {
  return wordsOf(text).some((w) => NEGATIONS.has(w));
}

// ---------------------------------------------------------------- numbers

const CURRENCY = /^(rm|\$|£|€|usd|sgd|myr)\s*/;
const UNIT_TAIL = /^\s*(?:[a-zµ°%²³^]+[23]?(?:\s*(?:\/|per)\s*[a-zµ°²³^]+[23]?)?\.?)?\s*$/;

/**
 * Read a number the way a pupil might type it. Returns a Number, or null if the text is not a
 * single number. Accepts: 12, -3.5, .5, 1,250, 12 000 (Cambridge thousands spacing), 3/4,
 * 1 3/4, ½, 25%, 12 cm, RM 4.50, a Unicode minus. Units and a currency are ignored.
 */
export function parseNumber(input) {
  const p = parseNumberParts(input);
  return p ? p.value : null;
}

/** Like parseNumber, but returns { value, unit } (unit '' when none was typed), or null. */
export function parseNumberParts(input) {
  if (input == null) return null;
  const folded = preFold(input);
  // a power typed after a number ("5²", "5^2") is not a plain number
  if (/\d\s*\^/.test(folded)) return null;
  let t = folded
    .toLowerCase()
    .replace(/[−–—]/g, '-')
    .replace(/⁄/g, '/')
    .replace(/^\s*[=≈~]\s*/, '')
    .trim();
  let sign = 1;
  if (/^[-+]/.test(t)) {
    if (t[0] === '-') sign = -1;
    t = t.slice(1).trim();
  }
  t = t.replace(CURRENCY, '');
  if (/^[-+]/.test(t)) {
    if (t[0] === '-') sign = -sign;
    t = t.slice(1).trim();
  }
  let m;
  let value = null;
  let rest = '';
  if ((m = t.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)(?![\d.])/))) {
    const d = Number(m[3]);
    if (d === 0) return null;
    value = Number(m[1]) + Number(m[2]) / d;
    rest = t.slice(m[0].length);
  } else if ((m = t.match(/^(\d+(?:\.\d+)?|\.\d+)\s*\/\s*(\d+(?:\.\d+)?)(?![\d.])/))) {
    const d = Number(m[2]);
    if (d === 0) return null;
    value = Number(m[1]) / d;
    rest = t.slice(m[0].length);
  } else if ((m = t.match(/^(\d{1,3}(?: \d{3})+)(\.\d+)?(?![\d/])/))) {
    value = Number(m[1].replace(/ /g, '') + (m[2] || ''));
    rest = t.slice(m[0].length);
  } else if ((m = t.match(/^(\d{1,3}(?:,\d{3})+)(\.\d+)?(?![\d,/])/))) {
    value = Number(m[1].replace(/,/g, '') + (m[2] || ''));
    rest = t.slice(m[0].length);
  } else if ((m = t.match(/^(\d+\.?\d*|\.\d+)(?![\d,/])/))) {
    value = Number(m[1]);
    rest = t.slice(m[0].length);
  } else {
    return null;
  }
  if (!Number.isFinite(value)) return null;
  if (!UNIT_TAIL.test(rest) || /^\s*e\d/.test(rest)) return null; // "2e3" is not a pupil's number
  return { value: sign * value, unit: rest.trim().replace(/\.$/, '') };
}

const UNIT_ALIASES = [
  ['min', 'mins', 'minute', 'minutes'], ['h', 'hr', 'hrs', 'hour', 'hours'], ['s', 'sec', 'secs', 'second', 'seconds'],
  ['day', 'days'], ['week', 'weeks'], ['mm', 'millimetre', 'millimetres', 'millimeter', 'millimeters'],
  ['cm', 'centimetre', 'centimetres', 'centimeter', 'centimeters'], ['m', 'metre', 'metres', 'meter', 'meters'],
  ['km', 'kilometre', 'kilometres', 'kilometer', 'kilometers'], ['g', 'gram', 'grams'], ['kg', 'kilogram', 'kilograms', 'kilo', 'kilos'],
  ['ml', 'millilitre', 'millilitres', 'milliliter', 'milliliters'], ['l', 'litre', 'litres', 'liter', 'liters'],
  ['n', 'newton', 'newtons'], ['deg', '°', '°c', 'degree', 'degrees', 'degrees c', 'degrees celsius', 'c'],
  ['%', 'percent', 'per cent'], ['cm2', 'cm^2', 'sq cm', 'square cm', 'square centimetres', 'square centimeters'],
  ['m2', 'm^2', 'sq m', 'square m', 'square metres', 'square meters'], ['cm3', 'cm^3', 'cubic cm', 'cubic centimetres', 'cubic centimeters'],
  ['bpm', 'beats per minute', 'beats/min'],
];
const UNIT_CANON = new Map(UNIT_ALIASES.flatMap((list) => list.map((u) => [u, list[0]])));

/** A unit in one standard spelling ("minutes" -> "min", "cm²" -> "cm2"), so forms can be compared. */
export function canonicalUnit(u) {
  const t = String(u || '').toLowerCase().replace(/[²]/g, '2').replace(/[³]/g, '3').replace(/\s+/g, ' ').replace(/\.$/, '').trim();
  if (UNIT_CANON.has(t)) return UNIT_CANON.get(t);
  return t.length > 3 && t.endsWith('s') ? t.slice(0, -1) : t; // "counters" -> "counter"
}

export function numbersEqual(a, b, tolerance = 0) {
  return Math.abs(a - b) <= tolerance + 1e-9 * Math.max(1, Math.abs(b));
}

/** Does the question ask for the answer in simplest form (lowest terms)? */
export function asksSimplestForm(q) {
  return /simplest form|lowest terms/i.test(q.prompt || '');
}

const gcd = (a, b) => (b ? gcd(b, a % b) : a);

/**
 * Is a typed number written in simplest form? A fraction must have no common factor and a
 * denominator above 1 (3/4 yes; 6/8, 4/2 and 3/1 no); an improper fraction is fine unless a
 * mixed number is asked for; a mixed number needs a proper fraction part (1 1/4 yes, 1 5/4 no);
 * a whole number is fine; a decimal is not a fraction, so it does not count.
 */
export function inSimplestForm(input, mixedWanted = false) {
  const t = preFold(input).toLowerCase().replace(/[−–—]/g, '-').replace(/⁄/g, '/').trim()
    .replace(/^[-+]\s*/, '').replace(/\s*[a-zµ°%²³^]+[23]?\.?\s*$/, '').trim();
  let m;
  if ((m = t.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)$/))) {
    const n = Number(m[2]);
    const d = Number(m[3]);
    return d > 1 && n > 0 && n < d && gcd(n, d) === 1;
  }
  if ((m = t.match(/^(\d+)\s*\/\s*(\d+)$/))) {
    const n = Number(m[1]);
    const d = Number(m[2]);
    if (d <= 1 || n === 0 || gcd(n, d) !== 1) return false;
    return !(mixedWanted && n > d);
  }
  return /^\d+$/.test(t.replace(/[ ,]/g, ''));
}

// ---------------------------------------------------------------- order: where the items start

/**
 * The order an "order" question's items are shown in before she moves any. No item starts in its
 * correct place, so "This order is my answer" without moving anything earns nothing. The bank's
 * own (scrambled) order is kept when it already has nothing in place; otherwise the items are
 * shuffled with a seed from the question id, so the start is the same every time it is shown.
 */
export function startingOrder(q) {
  const n = Array.isArray(q.options) ? q.options.length : 0;
  const ans = Array.isArray(q.answer) ? q.answer : [];
  const base = Array.from({ length: n }, (_, i) => i);
  const noneInPlace = (arr) => arr.every((x, i) => x !== ans[i]);
  if (n < 2 || ans.length !== n || noneInPlace(base)) return base;
  let seed = 2166136261;
  for (const c of String(q.id || '')) seed = Math.imul(seed ^ c.charCodeAt(0), 16777619) >>> 0;
  const rng = () => {
    seed = (seed + 0x6d2b79f5) >>> 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let tries = 0; tries < 100; tries++) {
    const arr = base.slice();
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    if (noneInPlace(arr)) return arr;
  }
  return ans.map((_, i) => ans[(i + 1) % n]); // a rotation of the answer: nothing in place
}

// ---------------------------------------------------------------- answered?

export function isAnswered(q, r) {
  switch (q.type) {
    case 'mcq': return Number.isInteger(r);
    case 'multi': return Array.isArray(r) && r.length > 0;
    case 'short':
    case 'numeric': return typeof r === 'string' && r.trim() !== '';
    case 'truefalse': return typeof r === 'boolean';
    case 'order': return Array.isArray(r) && r.length === q.options.length;
    case 'match': return Array.isArray(r) && r.some((x) => Number.isInteger(x));
    default: return false;
  }
}

// ---------------------------------------------------------------- misconception lookup

function noteFor(q, key) {
  const m = q.misconceptions || {};
  return Object.prototype.hasOwnProperty.call(m, key) && typeof m[key] === 'string' ? m[key] : null;
}

function commonNote(q) {
  return noteFor(q, 'common') || noteFor(q, 'general') || noteFor(q, 'default');
}

function findMisconception(q, r) {
  const m = q.misconceptions || {};
  switch (q.type) {
    case 'mcq': {
      const n = noteFor(q, String(r));
      return n ? [{ key: String(r), note: n }] : [];
    }
    case 'multi': {
      const out = [];
      const ans = new Set(q.answer);
      for (const i of [...(r || [])].sort((a, b) => a - b)) {
        if (!ans.has(i)) {
          const n = noteFor(q, String(i));
          if (n) out.push({ key: String(i), note: n });
        }
      }
      if (!out.length) {
        const c = commonNote(q);
        if (c) out.push({ key: 'common', note: c });
      }
      return out;
    }
    case 'numeric': {
      const v = parseNumber(r);
      for (const k of Object.keys(m)) {
        const kv = parseNumber(k);
        if (v != null && kv != null && numbersEqual(v, kv, 0)) return [{ key: k, note: m[k] }];
      }
      break;
    }
    case 'short': {
      for (const k of Object.keys(m)) {
        if (!['common', 'general', 'default'].includes(k) && textMatches(r, k)) return [{ key: k, note: m[k] }];
      }
      break;
    }
    case 'truefalse': {
      const n = noteFor(q, String(r));
      if (n) return [{ key: String(r), note: n }];
      break;
    }
    default:
      break;
  }
  const c = commonNote(q);
  if (c) return [{ key: 'common', note: c }];
  // a single note that is not tied to an option is the question's general warning
  const keys = Object.keys(m);
  if (keys.length === 1 && !/^\d+$/.test(keys[0])) return [{ key: keys[0], note: m[keys[0]] }];
  return [];
}

// ---------------------------------------------------------------- marking

/**
 * Mark one response.
 * Returns { answered, correct, earned, fraction, misconceptions: [{key, note}] }.
 * `correct` is all-or-nothing. multi, order and match questions worth more than one mark earn
 * part marks (whole marks, rounded down) for partly right answers.
 */
export function markQuestion(q, r, opts = {}) {
  const marks = Number.isInteger(q.marks) && q.marks > 0 ? q.marks : 1;
  const answered = isAnswered(q, r);
  const out = { answered, correct: false, earned: 0, fraction: 0, misconceptions: [] };
  if (!answered) return out;
  let fraction = 0;
  switch (q.type) {
    case 'mcq':
      fraction = r === q.answer ? 1 : 0;
      break;
    case 'truefalse':
      fraction = r === q.answer ? 1 : 0;
      break;
    case 'multi': {
      const ans = new Set(q.answer);
      const picked = new Set(r);
      let hits = 0;
      let wrong = 0;
      for (const i of picked) (ans.has(i) ? hits++ : wrong++);
      fraction = Math.max(0, (hits - wrong) / ans.size);
      if (hits === ans.size && wrong === 0) fraction = 1;
      break;
    }
    case 'order': {
      let right = 0;
      for (let i = 0; i < q.answer.length; i++) if (r[i] === q.answer[i]) right++;
      fraction = right / q.answer.length;
      break;
    }
    case 'match': {
      const want = new Map(q.answer.map(([L, R]) => [L, R]));
      let right = 0;
      for (const [L, R] of want) if (r[L] === R) right++;
      fraction = right / want.size;
      break;
    }
    case 'numeric': {
      const a = q.answer || {};
      const accept = Array.isArray(a.accept) ? a.accept.filter((x) => typeof x === 'string') : [];
      const p = parseNumberParts(r);
      const tol = Number(a.tolerance) || 0;
      let ok = p != null && typeof a.value === 'number' && numbersEqual(p.value, a.value, tol);
      // a unit typed with the right number must be one the answer uses ("109 m" is not 109 cm)
      if (ok && p.unit) {
        const units = new Set(accept.map(parseNumberParts).filter((x) => x && x.unit && numbersEqual(x.value, a.value, tol)).map((x) => canonicalUnit(x.unit)));
        if (units.size && !units.has(canonicalUnit(p.unit))) ok = false;
      }
      // "simplest form" / "lowest terms": an equal but unsimplified answer (6/8 for 3/4) is not enough
      if (ok && asksSimplestForm(q)) ok = inSimplestForm(r, /mixed number/i.test(q.prompt || ''));
      // a form written out in the accept list ("none", "1.09 m"). Spaces between two numbers
      // stay, so "21/2" never matches "2 1/2" and "4,8499" never matches "48 499".
      if (!ok && accept.length) {
        const rn = squash(normaliseText(r));
        ok = rn !== '' && accept.some((x) => squash(normaliseText(x)) === rn);
      }
      fraction = ok ? 1 : 0;
      break;
    }
    case 'short': {
      const a = q.answer || {};
      const accept = Array.isArray(a.accept) ? a.accept : [];
      // an exact match always counts; a typing slip only counts if the answer is not one of the
      // known wrong answers (a misconception key)
      const wrongKeys = Object.keys(q.misconceptions || {}).filter((k) => !['common', 'general', 'default'].includes(k));
      let ok = accept.some((x) => textMatches(r, x, false))
        || (!wrongKeys.some((k) => textMatches(r, k)) && accept.some((x) => textMatches(r, x)));
      const kws = Array.isArray(a.keywords) ? a.keywords.filter((k) => typeof k === 'string' && k.trim()) : [];
      if (!ok && kws.length) {
        const mode = opts.keywordMode || 'all';
        const found = kws.filter((k) => containsKeyword(r, k)).length;
        const enough = mode === 'any' ? found > 0 : found === kws.length;
        const negationExpected = [...accept, ...kws].some(hasNegation);
        ok = enough && (negationExpected || !hasNegation(r));
      }
      fraction = ok ? 1 : 0;
      break;
    }
    default:
      fraction = 0;
  }
  out.fraction = fraction;
  out.correct = fraction === 1;
  out.earned = out.correct ? marks : Math.floor(fraction * marks + 1e-9);
  if (marks === 1 && !out.correct) out.earned = 0;
  if (!out.correct) out.misconceptions = findMisconception(q, r);
  return out;
}

// ---------------------------------------------------------------- readable text

const SUPER = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻' };

/** Show powers written with ^ as superscripts: "7^2" -> "7²", "cm^3" -> "cm³". */
export function powers(text) {
  return typeof text === 'string' ? text.replace(/\^(-?\d+)/g, (_, d) => [...d].map((c) => SUPER[c]).join('')) : text;
}

const letter = (i) => String.fromCharCode(65 + i);

export function responseText(q, r) {
  return powers(rawResponseText(q, r));
}

function rawResponseText(q, r) {
  if (!isAnswered(q, r)) return 'No answer';
  switch (q.type) {
    case 'mcq': return `${letter(r)}. ${q.options[r] ?? ''}`;
    case 'multi': return [...r].sort((a, b) => a - b).map((i) => `${letter(i)}. ${q.options[i] ?? ''}`).join('; ');
    case 'short':
    case 'numeric': return String(r).trim();
    case 'truefalse': return r ? 'True' : 'False';
    case 'order': return r.map((i) => q.options[i]).join(' → ');
    case 'match': return q.options.left.map((L, i) => `${L} → ${Number.isInteger(r[i]) ? q.options.right[r[i]] : '(none)'}`).join('; ');
    default: return String(r);
  }
}

export function correctAnswerText(q) {
  return powers(rawCorrectAnswerText(q));
}

function rawCorrectAnswerText(q) {
  const a = q.answer;
  switch (q.type) {
    case 'mcq': return `${letter(a)}. ${q.options[a]}`;
    case 'multi': return [...a].sort((x, y) => x - y).map((i) => `${letter(i)}. ${q.options[i]}`).join('; ');
    case 'short': return (a.accept || [])[0] || '';
    case 'numeric': {
      const forms = [String(a.value), ...(a.accept || []).filter((x) => normaliseText(x) !== normaliseText(String(a.value)))];
      return forms.slice(0, 2).join(' or ');
    }
    case 'truefalse': return a ? 'True' : 'False';
    case 'order': return a.map((i) => q.options[i]).join(' → ');
    case 'match': return [...a].sort((x, y) => x[0] - y[0]).map(([L, R]) => `${q.options.left[L]} → ${q.options.right[R]}`).join('; ');
    default: return '';
  }
}
