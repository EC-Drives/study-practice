// Independent answers for the m15 Time and measures generators, worked out again from the question
// text and the diagram data (clock time, timetable, scale reading), and the misconception rules
// that reproduce each wrong option. Shares no code with js/generators.

import { numbersIn, parseQ, qnum } from './lib.js';

const num = (t) => qnum(parseQ(String(t).replace(/ /g, '')));
const two = (n) => String(n).padStart(2, '0');
const r3 = (x) => Math.round(x * 1000) / 1000;
/** Minutes as "2 h 35 min", "45 min" or "3 h". */
function hmText(t) { const h = Math.floor(t / 60); const m = t % 60; return [h ? `${h} h` : '', m ? `${m} min` : ''].filter(Boolean).join(' ') || '0 min'; }
/** "2 h 35 min" -> 155. */
function minsOf(text) { const h = text.match(/(\d+) h(?:ours?)?\b/); const m = text.match(/(\d+) min/); return (h ? Number(h[1]) * 60 : 0) + (m ? Number(m[1]) : 0); }
const clock24 = (t) => { const x = ((t % 1440) + 1440) % 1440; return `${two(Math.floor(x / 60))}:${two(x % 60)}`; };
const clock12 = (t) => { const x = ((t % 1440) + 1440) % 1440; const h = Math.floor(x / 60); const h12 = h % 12 === 0 ? 12 : h % 12; return `${h12}:${two(x % 60)} ${h >= 12 ? 'pm' : 'am'}`; };
const from24 = (s) => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
const from12 = (h, m, ap) => (Number(h) % 12 + (ap === 'pm' ? 12 : 0)) * 60 + Number(m);

// ---------------------------------------------------------------- decimal hours

function dh(q) {
  const p = q.prompt;
  let m;
  if ((m = p.match(/for ([\d.]+) hours on Monday and for (.+?) on Tuesday/))) {
    const x = m[1]; const rest = minsOf(m[2]);
    const after = x.split('.')[1];
    const xm = Math.round(Number(x) * 60);
    return { kind: 'add', text: hmText(xm + rest), x, rest, xm, after };
  }
  if (/Which is the longest time\?/.test(p)) {
    const opts = p.slice(p.indexOf('time? ') + 6).replace(/\.$/, '').split(', ');
    const val = (o) => (/hours$/.test(o) && /\./.test(o) || /^\d+(\.\d+)? hours$/.test(o) ? Math.round(num(o.replace(' hours', '')) * 60) : /minutes$/.test(o) ? Number(o.replace(' minutes', '')) : minsOf(o));
    const misread = (o) => { if (/^[\d.]+ hours$/.test(o)) { const [w, f = '0'] = o.replace(' hours', '').split('.'); return Number(w) * 60 + Number(f.padEnd(2, '0')); } return val(o); };
    const best = (f) => opts.reduce((a, b) => (f(b) > f(a) ? b : a));
    return { kind: 'compare', text: best(val), misread: best(misread), raw: best((o) => Math.max(...o.match(/[\d.]+/g).map(Number))) };
  }
  if ((m = p.match(/(\d+) (?:hours?|h) (\d+) (?:minutes|min)\b.*decimal/))) { const h = Number(m[1]); const mm = Number(m[2]); return { kind: 'hm2dec', value: (h * 60 + mm) / 60, h, m: mm }; }
  if ((m = p.match(/(\d+) minutes\..*(?:decimal|hours)/))) { const n = Number(m[1]); return { kind: 'min2dec', value: n / 60, n }; }
  const x = p.match(/([\d.]+) hours/)[1];
  const xm = Math.round(Number(x) * 60);
  const [w, f = '0'] = x.split('.');
  if (/hours and minutes/.test(p)) return { kind: 'dec2hm', text: hmText(xm), x, w: Number(w), f };
  return { kind: 'dec2min', value: xm, x, w: Number(w), f };
}

// ---------------------------------------------------------------- clocks

function clockT(q) {
  const p = q.prompt;
  let m;
  if (q.diagram && q.diagram.type === 'clock') {
    const [h, mm] = q.diagram.time.split(':').map(Number);
    const t = ((h % 12) + (/afternoon|evening/.test(p) ? 12 : 0)) * 60 + mm;
    return { t, out: 'to24' };
  }
  if ((m = p.match(/(\d{1,2}):(\d\d) (am|pm)/))) return { t: from12(m[1], m[2], m[3]), out: 'to24' };
  m = p.match(/(\d\d):(\d\d)/);
  return { t: Number(m[1]) * 60 + Number(m[2]), out: 'to12' };
}

// ---------------------------------------------------------------- durations and end times

function durInfo(q) {
  const ts = q.prompt.match(/\d\d:\d\d/g).map(from24);
  let [s, e] = ts;
  if (e <= s) e += 1440;
  const hhmm = (t) => Math.floor((t % 1440) / 60) * 100 + (t % 60);
  return { s, e, dur: e - s, mins: /in minutes/.test(q.prompt), sv: hhmm(s), ev: hhmm(e) };
}
function endInfo(q) {
  const p = q.prompt;
  let m;
  if ((m = p.match(/leaves .+? at (\d\d:\d\d)\. It travels for (.+?) to (.+?) and waits there for (\d+) minutes\. Then it travels for another (.+?) to /))) {
    const s = from24(m[1]); const d1 = minsOf(m[2]); const w = Number(m[4]); const d2 = minsOf(m[5]);
    return { train: true, s, d1, w, d2, e: s + d1 + w + d2 };
  }
  if ((m = p.match(/has (\d+) sessions\. Each session lasts (.+?)\. There is a (\d+)-minute break.*starts at (\d\d:\d\d)/))) {
    const n = Number(m[1]); const sess = minsOf(m[2]); const brk = Number(m[3]); const s = from24(m[4]);
    return { multi: true, n, sess, brk, s, e: s + n * sess + (n - 1) * brk };
  }
  const s = from24(p.match(/\d\d:\d\d/)[0]);
  const dur = minsOf(p.match(/(?:lands|takes|drive takes) ((?:\d+ h )?\d+ min)/)[1]);
  return { multi: false, s, dur, e: s + dur };
}

// ---------------------------------------------------------------- timetables

function tableInfo(q) {
  const rows = q.diagram.rows;
  const stops = rows.map((r) => r[0]);
  const t = (bus, stop) => from24(rows[stops.indexOf(stop)][bus + 1]);
  const p = q.prompt;
  const buses = rows[0].slice(1).map((_, b) => b);
  let m;
  if ((m = p.match(/takes Bus (\d) from (.+?) to (.+?)\./))) {
    const bus = Number(m[1]) - 1;
    const dur = (b) => t(b, m[3]) - t(b, m[2]);
    return { kind: 'dur', bus, s: t(bus, m[2]), e: t(bus, m[3]), dur: dur(bus), others: buses.filter((b) => b !== bus).map(dur) };
  }
  m = p.match(/is at (.+?)\. \w+ must be in (.+?) by (\d\d:\d\d)\./);
  const [, a, b, need] = m;
  const ok = buses.filter((x) => t(x, b) <= from24(need));
  const bus = ok[ok.length - 1];
  return { kind: 'latest', ans: clock24(t(bus, a)), tooLate: bus + 1 < buses.length ? clock24(t(bus + 1, a)) : null, wrongStop: clock24(t(bus, b)), earlier: ok.slice(0, -1).map((x) => clock24(t(x, a))) };
}

// ---------------------------------------------------------------- metric units

const FACT = { 'mm>cm': 10, 'cm>m': 100, 'm>km': 1000, 'mm>m': 1000, 'g>kg': 1000, 'ml>L': 1000 };
const NAMES = { mm: 'millimetres', cm: 'centimetres', m: 'metres', km: 'kilometres', g: 'grams', kg: 'kilograms', ml: 'millilitres', L: 'litres' };
const ABBR = Object.fromEntries(Object.entries(NAMES).map(([k, v]) => [v, k]));
function metricInfo(q) {
  const p = q.prompt;
  let m;
  if ((m = p.match(/^Which of these is the (?:heaviest|longest|largest amount)\? (.+)\.$/))) {
    const opts = m[1].split(', ');
    const small = (o) => {
      let k;
      if ((k = o.match(/^(\d+) (\w+) (\d+) (\w+)$/))) return Number(k[1]) * FACT[`${k[4]}>${k[2]}`] + Number(k[3]);
      const [v, u] = [num(o.split(' ')[0]), o.split(' ')[1]];
      const f = Object.entries(FACT).find(([key]) => key.endsWith(`>${u}`) && opts.some((x) => x.endsWith(` ${key.split('>')[0]}`)));
      return f ? v * f[1] : v;
    };
    const best = (f) => opts.reduce((a, b) => (f(b) > f(a) ? b : a));
    const dps = (o) => (/^\d+\.\d+ \w+$/.test(o) ? o.split(' ')[0].split('.')[1].length : 0);
    return {
      kind: 'compare', text: best(small), raw: best((o) => Math.max(...o.match(/[\d.]+/g).map(Number))),
      longer: best(dps), // the decimal with the most digits after the point
      dropped: opts.filter((o) => /^\d+ \w+ \d+ \w+$/.test(o)), // a mixed measure (misread with its zero dropped)
    };
  }
  if ((m = p.match(/^Write (\d+) (\w+) (\d+) (\w+) in (\w+)\./))) {
    const [, w, big, part, small] = m;
    const f = FACT[`${small}>${big}`];
    return { kind: 'mixed', value: (Number(w) * f + Number(part)) / f, w: Number(w), part: Number(part), f };
  }
  m = p.match(/([\d .]+?) (mm|cm|m|km|g|kg|ml|L)\b/);
  const x = num(m[1]); const from = m[2];
  const to = ABBR[p.match(/(millimetres|centimetres|metres|kilometres|grams|kilograms|millilitres|litres)/g).find((n) => ABBR[n] !== from)];
  const f = FACT[`${from}>${to}`] || FACT[`${to}>${from}`];
  const toSmall = !!FACT[`${to}>${from}`];
  return { kind: 'plain', x, f, toSmall, value: r3(toSmall ? x * f : x / f) };
}

// ---------------------------------------------------------------- scales, rectangles, tiles

function scaleInfo(q) {
  const s = q.diagram;
  if (s.kind === 'ruler') {
    const from = s.from || 0;
    const len = r3(s.value - from);
    const mm = /millimetres/.test(q.prompt);
    const c = (x) => r3(mm ? x * 10 : x);
    return { ruler: true, value: c(len), end: c(s.value), wrong: c(Math.floor(len) + Math.round((len - Math.floor(len)) * 10) / 100), next: c(len + 0.1), x100: r3(len * 100) };
  }
  const big = /in (litres|kilograms)\./.test(q.prompt);
  const c = (x) => r3(big ? x / 1000 : x);
  const base = Math.floor(s.value / s.major) * s.major;
  const k = Math.round((s.value - base) / s.minor);
  return { ruler: false, value: c(s.value), wrong: [10, 1, s.major / 10].map((st) => c(base + k * st)), next: [c(s.value + s.minor), c(s.value - s.minor)], x100: s.value / 100 };
}
function rectInfo(q) {
  const p = q.prompt;
  let m;
  if ((m = p.match(/area of (\d+) (cm|m)\^2\. Its length is (\d+)/))) { const A = Number(m[1]); const L = Number(m[3]); const W = A / L; return { ans: 2 * (L + W), L, W, swap: [2 * (L + A)], two: [L + W], side: [W] }; }
  if ((m = p.match(/(\d+) m long and ([\d.]+) m wide\. Fencing costs RM (\d+)/))) { const [L, W, c] = [Number(m[1]), num(m[2]), Number(m[3])]; const P = 2 * (L + W); return { ans: P * c, swap: [L * W * c], two: [(L + W) * c], side: [P] }; }
  if ((m = p.match(/square has a perimeter of (\d+)/))) { const P = Number(m[1]); const s = P / 4; return { ans: s * s, swap: [P * P], two: [], side: [s, (P / 2) ** 2] }; }
  m = p.match(/is ([\d.]+) (cm|m) long and ([\d.]+) (cm|m) wide\. What is its (area|perimeter)/);
  let L = num(m[1]); let W = num(m[3]);
  const mixed = m[2] !== m[4];
  const Lraw = L;
  if (mixed) L *= 100;
  const area = m[5] === 'area';
  const ans = area ? r3(L * W) : r3(2 * (L + W));
  return {
    ans, mixed,
    swap: [area ? r3(2 * (L + W)) : r3(L * W)],
    two: [r3(L + W)],
    three: [r3(2 * L + W), r3(L + 2 * W)],
    point: [r3(Math.round(L * 10) * Math.round(W * 10) / 10)],
    unitMixed: [r3(Lraw * W), r3(2 * (Lraw + W))],
    factor: [r3(L * W * 10)],
  };
}
function tileInfo(q) {
  const [L, W, t] = numbersIn(q.prompt).map(num);
  const a = Math.round((L * 100) / t); const b = Math.round((W * 100) / t);
  return { a, b, ans: a * b, byside: (L * 100 * W * 100) / t };
}

export const SOLVERS = {
  'm15.decimal-hours': (q) => { const r = dh(q); return r.text != null ? { text: r.text } : { value: r.value }; },
  'm15.clock-24h': (q) => { const c = clockT(q); return { text: c.out === 'to24' ? clock24(c.t) : clock12(c.t) }; },
  'm15.duration': (q) => { const d = durInfo(q); return d.mins ? { value: d.dur } : { text: hmText(d.dur) }; },
  'm15.end-time': (q) => ({ text: clock24(endInfo(q).e) }),
  'm15.timetable': (q) => { const r = tableInfo(q); return r.kind === 'dur' ? { text: hmText(r.dur) } : { text: r.ans }; },
  'm15.metric-convert': (q) => { const r = metricInfo(q); return r.kind === 'compare' ? { text: r.text } : { value: r.value }; },
  'm15.read-scale': (q) => ({ value: scaleInfo(q).value }),
  'm15.rectangle': (q) => ({ value: rectInfo(q).ans }),
  'm15.tiles': (q) => ({ value: tileInfo(q).ans }),
};

const clockWrong = (q) => { const { t } = clockT(q); const h = Math.floor(t / 60); const mm = two(t % 60); return [clock24(t - 720), clock24(t - 120), clock24(t + 120), `24:${mm}`, `${((h - 2) % 12 || 12)}:${mm} pm`, `${h - 10}:${mm} pm`, `0:${mm} am`, `0:${mm} pm`]; };

export const MIS = {
  'm15.decimal-hours': {
    // one code since the CLO's merge of TIME-DEC-X100 (17 Oct): an hour taken as 100 minutes, either way
    'TIME-DECIMAL-AS-MINUTES': (q) => {
      const r = dh(q);
      const out = [];
      if (r.kind === 'dec2hm') out.push(hmText(r.w * 60 + Number(r.f)));
      else if (r.kind === 'dec2min') out.push(r.w * 60 + Number(r.f));
      else if (r.kind === 'hm2dec') out.push(r.h + r.m / 100);
      else if (r.kind === 'min2dec') out.push(Math.floor(r.n / 60) + (r.n % 60) / 100);
      else if (r.kind === 'add') out.push(hmText(Number(r.after) * 10 + r.rest));
      else out.push(r.misread);
      if (r.kind === 'hm2dec') out.push((r.h * 60 + r.m) / 100);
      else if (r.kind === 'min2dec') out.push(r.n / 100);
      else if (r.x != null) out.push(Math.round(Number(r.x) * 100));
      return out;
    },
    'TIME-DEC-X10': (q) => { const r = dh(q); return r.kind === 'min2dec' ? [r.n / 10] : [Math.round(Number(r.x) * 10)]; },
    'TIME-MINUTES-OVERFLOW': (q) => { const r = dh(q); const raw = r.xm + (r.rest % 60); return [`${Math.floor(r.rest / 60)} h ${raw} min`]; },
    'TIME-NO-CARRY': (q) => { const r = dh(q); return [hmText(r.xm + r.rest - 60)]; },
    'TIME-MIXED-FORMS': (q) => { const r = dh(q); return [hmText(Number(r.after) + r.rest)]; },
    'UNIT-MIXED': (q) => [dh(q).raw],
  },
  'm15.clock-24h': {
    'TIME-24H-PLUS-12-WRONG': clockWrong,
    'TIME-AM-PM-SWAP': (q) => { const { t } = clockT(q); return [clock12(t + 720), clock24(t + 720)]; },
    'TIME-NOON-MIDNIGHT': (q) => { const { t } = clockT(q); return [clock24(t + 720), clock24(t - 720), clock12(t + 720)]; },
    'TIME-HOUR-HAND-NEXT': (q) => [clock24(clockT(q).t + 60)],
    'TIME-MINUTE-HAND-NUMBER': (q) => { const { t } = clockT(q); return [`${two(Math.floor(t / 60))}:${two((t % 60) / 5)}`]; },
  },
  'm15.duration': {
    'TIME-100-MINUTES': (q) => { const d = durInfo(q); const raw = d.ev > d.sv ? d.ev - d.sv : d.sv - d.ev; return [raw, `${Math.floor(raw / 100)} h ${raw % 100} min`]; },
    'TIME-PARTS-SEPARATE': (q) => { const d = durInfo(q); const v = (Math.floor(d.e / 60) - Math.floor(d.s / 60)) * 60 + Math.abs((d.e % 60) - (d.s % 60)); return [v, hmText(v)]; },
    'TIME-MIDNIGHT': (q) => { const d = durInfo(q); return [hmText(d.s - (d.e - 1440)), hmText(d.dur + 60)]; },
  },
  'm15.end-time': {
    'TIME-MIDNIGHT': (q) => { const r = endInfo(q); if (r.train) return [`${two(Math.floor(r.e / 60))}:${two(r.e % 60)}`]; const raw = (Math.floor(r.s / 60) + Math.floor(r.dur / 60)) * 60 + (r.s % 60) + (r.dur % 60); return [`${two(Math.floor(raw / 60))}:${two(raw % 60)}`]; },
    'TIME-MINUTES-OVERFLOW': (q) => { const r = endInfo(q); return [`${two((Math.floor(r.s / 60) + Math.floor(r.dur / 60)) % 24)}:${two((r.s % 60) + (r.dur % 60))}`]; },
    'TIME-NO-CARRY': (q) => [clock24(endInfo(q).e - 60)],
    'TIME-STEP-MISSED': (q) => { const r = endInfo(q); return r.train ? [clock24(r.e - r.w)] : [clock24(r.s + r.n * r.sess)]; },
    'ONE-STEP-ONLY': (q) => { const r = endInfo(q); return [clock24(r.s + r.d1)]; },
    'TIME-BREAKS-COUNT': (q) => { const r = endInfo(q); return [clock24(r.e + r.brk)]; },
    'TIME-100-MINUTES': (q) => { const r = endInfo(q); const tot = r.n * r.sess; return [clock24(r.s + Math.floor(tot / 100) * 60 + (tot % 100) + (r.n - 1) * r.brk)]; },
  },
  'm15.timetable': {
    'TIME-100-MINUTES': (q) => { const r = tableInfo(q); const hh = (t) => Math.floor(t / 60) * 100 + (t % 60); const raw = hh(r.e) - hh(r.s); return [`${Math.floor(raw / 100) ? `${Math.floor(raw / 100)} h ` : ''}${raw % 100} min`]; },
    'TIME-PARTS-SEPARATE': (q) => { const r = tableInfo(q); return [hmText((Math.floor(r.e / 60) - Math.floor(r.s / 60)) * 60 + Math.abs((r.e % 60) - (r.s % 60)))]; },
    'TIME-TABLE-WRONG-COLUMN': (q) => tableInfo(q).others.map(hmText),
    'TIME-TABLE-TOO-LATE': (q) => [tableInfo(q).tooLate],
    'TIME-TABLE-WRONG-STOP': (q) => [tableInfo(q).wrongStop],
    'TIME-TABLE-EARLIEST': (q) => tableInfo(q).earlier,
  },
  'm15.metric-convert': {
    'UNIT-FACTOR-WRONG': (q) => { const r = metricInfo(q); if (r.kind === 'mixed') return [r.w + r.part / 100]; return [10, 100, 1000].map((g) => r3(r.toSmall ? r.x * g : r.x / g)); },
    'PV-SHIFT-WRONG': (q) => { const r = metricInfo(q); return [r3(r.toSmall ? r.x / r.f : r.x * r.f)]; },
    'UNIT-DROP-ZERO': (q) => { const r = metricInfo(q); return r.kind === 'compare' ? r.dropped : [Number(`${r.w}.${r.part}`)]; },
    'DEC-LONGER-BIGGER': (q) => [metricInfo(q).longer],
    'UNIT-NOT-CONVERTED': (q) => { const r = metricInfo(q); return [r.w * r.f + r.part]; },
    'UNIT-MIXED': (q) => [metricInfo(q).raw],
  },
  'm15.read-scale': {
    'SCALE-INTERVAL-WRONG': (q) => { const r = scaleInfo(q); return [].concat(r.wrong); },
    'SCALE-NEXT-MARK': (q) => { const r = scaleInfo(q); return [].concat(r.next); },
    'UNIT-FACTOR-WRONG': (q) => { const r = scaleInfo(q); return [r.x100]; },
    'SCALE-RULER-END': (q) => [scaleInfo(q).end],
  },
  'm15.rectangle': {
    'AREA-PERIM-SWAP': (q) => rectInfo(q).swap,
    'PERIM-TWO-SIDES': (q) => rectInfo(q).two,
    'PERIM-THREE-SIDES': (q) => rectInfo(q).three,
    'DEC-MULT-POINT': (q) => rectInfo(q).point,
    'UNIT-MIXED': (q) => rectInfo(q).unitMixed,
    'UNIT-FACTOR-WRONG': (q) => rectInfo(q).factor,
    'RECT-SIDE-ONLY': (q) => rectInfo(q).side,
  },
  'm15.tiles': {
    'AREA-ADDS-SIDES': (q) => { const r = tileInfo(q); return [r.a + r.b]; },
    'TILES-EDGE-ONLY': (q) => { const r = tileInfo(q); return [2 * (r.a + r.b) - 4]; },
    'TILES-AREA-BY-SIDE': (q) => [tileInfo(q).byside],
  },
};
