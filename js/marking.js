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

/** Lower-case, tidy spacing and punctuation so that trivial differences do not matter. */
export function normaliseText(input) {
  return String(input ?? '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[‘’‛`´]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[−–—]/g, '-')
    .replace(/⁄/g, '/')
    .replace(/×/g, 'x')
    .replace(/[^\p{L}\p{N}\s.\-'/%°:]/gu, ' ')
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

/** How many typing slips a word of this length may have and still count. */
export function typoAllowance(len) {
  if (len <= 4) return 0;
  if (len <= 8) return 1;
  return 2;
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
 * Do two pieces of text say the same thing, allowing for case, spacing, punctuation, a leading
 * "the/a/an" and small typing slips? Slips are never allowed in numbers, and the first letter
 * must match (so "decrease" never passes for "increase", nor "soluble" for "insoluble").
 */
export function textMatches(response, accepted) {
  const r = stripArticles(normaliseText(response));
  const a = stripArticles(normaliseText(accepted));
  if (!r || !a) return false;
  if (r === a) return true;
  const rs = squash(r);
  const as = squash(a);
  if (rs === as) return true;
  if (digitsOf(r) !== digitsOf(a)) return false;
  if (!/\p{L}/u.test(as)) return false;
  if (rs[0] !== as[0]) return false;
  const allow = typoAllowance(as.length);
  if (allow === 0) return false;
  return levenshtein(rs, as, allow) <= allow;
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
  if (input == null) return null;
  let t = String(input)
    .normalize('NFKC')
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
  return sign * value;
}

export function numbersEqual(a, b, tolerance = 0) {
  return Math.abs(a - b) <= tolerance + 1e-9 * Math.max(1, Math.abs(b));
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
      const v = parseNumber(r);
      let ok = v != null && typeof a.value === 'number' && numbersEqual(v, a.value, Number(a.tolerance) || 0);
      if (!ok && Array.isArray(a.accept)) {
        const rn = normaliseText(r).replace(/\s/g, '');
        ok = a.accept.some((x) => normaliseText(x).replace(/\s/g, '') === rn);
      }
      fraction = ok ? 1 : 0;
      break;
    }
    case 'short': {
      const a = q.answer || {};
      const accept = Array.isArray(a.accept) ? a.accept : [];
      let ok = accept.some((x) => textMatches(r, x));
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
