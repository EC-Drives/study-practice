// Independent arithmetic for the generator tests. Deliberately shares no code with
// js/generators: exact fractions here use BigInt, numbers are read back from the question text.

const B = (x) => BigInt(x);
const bgcd = (a, b) => { a = a < 0n ? -a : a; b = b < 0n ? -b : b; while (b) [a, b] = [b, a % b]; return a; };

/** An exact rational [n, d] with d > 0, in lowest terms. */
export function Q(n, d = 1) {
  n = B(n); d = B(d);
  if (d === 0n) throw new Error('zero denominator');
  if (d < 0n) { n = -n; d = -d; }
  const g = bgcd(n, d) || 1n;
  return [n / g, d / g];
}
export const qadd = (a, b) => Q(a[0] * b[1] + b[0] * a[1], a[1] * b[1]);
export const qsub = (a, b) => Q(a[0] * b[1] - b[0] * a[1], a[1] * b[1]);
export const qmul = (a, b) => Q(a[0] * b[0], a[1] * b[1]);
export const qdiv = (a, b) => Q(a[0] * b[1], a[1] * b[0]);
export const qnum = (a) => Number(a[0]) / Number(a[1]);
export const qeq = (a, b) => a[0] === b[0] && a[1] === b[1];
/** Lowest terms text; improper fractions as mixed numbers when `mixed` (default). */
export function qtext(a, mixed = true) {
  const [n, d] = a;
  if (d === 1n) return String(n);
  const neg = n < 0n;
  const m = neg ? -n : n;
  if (mixed && m > d) return `${neg ? '-' : ''}${m / d} ${m % d}/${d}`;
  return `${n}/${d}`;
}

/** Read a fraction, mixed number, integer or decimal from text into a rational. */
export function parseQ(text) {
  const t = String(text).trim().replace(/[−–]/g, '-');
  let m;
  if ((m = t.match(/^(-?)(\d+)\s+(\d+)\/(\d+)$/))) { const q = qadd(Q(m[2]), Q(m[3], m[4])); return m[1] ? Q(-q[0], q[1]) : q; }
  if ((m = t.match(/^(-?\d+)\/(\d+)$/))) return Q(m[1], m[2]);
  if ((m = t.match(/^(-?)([\d ]+)(?:\.(\d+))?$/))) {
    const whole = m[2].replace(/ /g, '');
    const frac = m[3] || '';
    const q = Q(B(whole + frac), 10n ** B(frac.length));
    return m[1] ? Q(-q[0], q[1]) : q;
  }
  return null;
}

/** The number in a piece of answer text, ignoring a currency, a % sign (as a percentage) and a unit. */
export function valueIn(text) {
  let t = String(text).trim().replace(/[−–]/g, '-').replace(/^RM\s*/i, '');
  let pct = false;
  if (/%$/.test(t)) { pct = true; t = t.slice(0, -1).trim(); }
  // a unit straight after the number ("7 am" is a time, not 7 metres)
  t = t.replace(/(?<=\d)\s*(mm\^2|mm²|km\^2|km²|cm\^2|cm\^3|m\^2|m\^3|cm²|cm³|m²|m³|mm|cm|km|m|g|kg|ml|L|l|°C|°|h|min|s|litres?|days?|years?)$/i, '');
  // any other word after the number ("21 stickers", "3 pupils")
  t = t.replace(/^(-?[\d .\/]*\d)\s+[A-Za-z][A-Za-z -]*$/, '$1');
  const q = parseQ(t);
  if (!q) return null;
  return pct ? qnum(q) / 100 : qnum(q);
}

/** All the numbers in a prompt, in order, as text: "48 650", "-3", "2 1/2", "3/4", "0.25". */
export function numbersIn(text) {
  const re = /-?\d+ \d+\/\d+|-?\d+\/\d+|-?\d{1,3}(?: \d{3})+(?:\.\d+)?|-?\d+(?:\.\d+)?/g;
  return String(text).replace(/[−–]/g, '-').match(re) || [];
}

/** Text for comparison: case, a final full stop and spaces ignored, except a space between two digits (1 1/20 is not 11/20). */
export const norm = (s) => String(s).toLowerCase().replace(/[−–]/g, '-').trim().replace(/\.$/, '').replace(/(\d)\s+(?=\d)/g, '$1_').replace(/\s+/g, '');
export const sameValue = (a, b) => { const x = valueIn(a); const y = valueIn(b); return x != null && y != null && Math.abs(x - y) < 1e-9; };
