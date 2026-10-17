// m15 Time and measures: decimal hours, the 12-hour and 24-hour clock (with clock faces), durations
// and end times (across midnight), timetables, metric conversions, reading scales, rectangle
// perimeter and area (with mixed units), and tiling a floor.
// Patterns and ranges follow the CLO's generator guide (section 2, m15). Clocks, scales, tables and
// rectangles are drawn from the same numbers as the answer; the reading she must make is never
// written on the picture.

import { F, choices, typedMisconceptions, nearMiss, numericAnswer, fmtInt, dec, rm, person, valueOf } from './core.js';

const T = 'm15-time-and-measures';
const SK = {
  dec2hm: 'converting decimal hours to hours and minutes', dec2min: 'converting decimal hours to minutes', hm2dec: 'converting hours and minutes to decimal hours',
  min2dec: 'converting minutes to decimal hours', compareT: 'comparing times in different units', addForms: 'adding times given in different forms',
  clock: 'converting between 12-hour and 24-hour clock', dur: 'finding a duration', addMid: 'adding time across midnight', durMid: 'finding a duration across midnight',
  table: 'reading a timetable', multi: 'multi-step time problems', mass: 'converting units of mass', length: 'converting units of length', cap: 'converting units of capacity',
  compareM: 'comparing measures in different units', words3: 'measurement word problems', area: 'area of a rectangle', perim: 'perimeter of a rectangle',
  areaMixed: 'area with mixed units', both: 'perimeter and area of rectangles', perimWords: 'perimeter word problems',
};

// Misconception codes: all declared once in misconceptions.js (the CLO's catalogue).

// ---------------------------------------------------------------- helpers

const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const pad = (n) => String(n).padStart(2, '0');
/** "2 h 35 min", "45 min" or "3 h" from a number of minutes. */
const hm = (t) => { const h = Math.floor(t / 60); const m = t % 60; return h && m ? `${h} h ${m} min` : h ? `${h} h` : `${m} min`; };
/** All the ways she might type a duration. */
const hmForms = (t) => {
  const h = Math.floor(t / 60); const m = t % 60;
  if (!h) return [`${m} min`, `${m} minutes`, `${m} mins`];
  if (!m) return [`${h} h`, `${h} hours`, `${h} hour`, `${h} hr`, `${h} hrs`];
  return [`${h} h ${m} min`, `${h} hours ${m} minutes`, `${h}h ${m}min`, `${h}h${m}min`, `${h} hours and ${m} minutes`, `${h} hr ${m} min`, `${h} hrs ${m} mins`, `${h} h ${m} mins`, `${h} hours ${m} mins`, `${h} hour ${m} minutes`, `${h} hours ${m} min`];
};
/** "09:05" from minutes after midnight (any whole day). */
const t24 = (t) => { const x = ((t % 1440) + 1440) % 1440; return `${pad(Math.floor(x / 60))}:${pad(x % 60)}`; };
const t12 = (t) => { const x = ((t % 1440) + 1440) % 1440; const h = Math.floor(x / 60); return `${((h + 11) % 12) + 1}:${pad(x % 60)} ${h < 12 ? 'am' : 'pm'}`; };
const t24Forms = (t) => { const s = t24(t); return [s, s.replace(':', ''), s.replace(':', '.')]; };
const around = (v, step, k) => v + step * (k % 2 ? Math.ceil(k / 2) : -Math.ceil(k / 2));
const SWAP_OPTS = (c) => c;

/** Every number written in a prompt (thousands spaces joined), as the tests read them. */
const promptNums = (prompt) => (String(prompt).replace(/(\d) (\d{3})/g, '$1$2').match(/-?\d+(?:\.\d+)?(?:\/\d+)?/g) || []).map((t) => { const [x, y] = t.split('/'); return y ? Number(x) / Number(y) : Number(x); });
/** Is the value of this option text a number already in the prompt? (A near miss must never be one: CLO review X3.) */
const inPrompt = (prompt, text) => { const v = valueOf(text); return v != null && promptNums(prompt).some((x) => Math.abs(x - v) < 1e-9); };

/** mcq from texts, or short (with accept forms) when `typed`. Near misses never repeat a number in `prompt`. */
function pick(rng, { ans, accept, ds, fallback, common, typed, type = 'short', prompt = '' }) {
  if (typed) {
    const t = typedMisconceptions(ans, ds, common);
    if (type === 'numeric') return { type, answer: numericAnswer(accept.value, accept.forms), ...t };
    return { type: 'short', answer: { accept: [ans, ...accept.filter((x) => x !== ans)], keywords: [] }, ...t };
  }
  const fb = fallback && ((k) => { const x = fallback(k); return x && inPrompt(prompt, x.text) ? null : x; });
  return { type: 'mcq', ...SWAP_OPTS(choices(rng, ans, ds, fb)) };
}

// ---------------------------------------------------------------- g01 decimal hours

const decimalHours = {
  id: 'm15.decimal-hours', topicId: T, subtopicId: 'm15-s1', skill: SK.dec2hm,
  title: 'Decimal hours to hours and minutes or minutes (D1), back to decimal hours (D2), adding and comparing times in different forms (D3)',
  difficulties: [1, 2, 3],
  check: { min: 0, maxDp: 2 },
  make(rng, d) {
    for (;;) {
      const p = person(rng);
      const ds = [];
      let prompt; let ans; let solution; let skill; let accept; let type = 'short';
      if (d === 1) {
        const h = rng.int(0, 5);
        const part = rng.pick([F(1, 2), F(1, 4), F(3, 4), ...range(1, 9).map((k) => F(k, 10))]);
        const x = part.add(h);
        const mins = x.mul(60).n;
        const xs = x.decimal();
        if (mins < 6) continue;
        if (rng.chance(0.5) && h > 0) {
          skill = SK.dec2hm;
          ans = hm(mins); accept = hmForms(mins);
          prompt = rng.pick([`How long is ${xs} hours in hours and minutes?`, `${p.name} spent ${xs} hours on a school project. Write this time in hours and minutes.`, `A train journey takes ${xs} hours. How long is that in hours and minutes?`, ...(h <= 2 ? [`A film lasts ${xs} hours. How long is that in hours and minutes?`] : [])]);
          solution = `The ${h} is ${h} whole hour${h > 1 ? 's' : ''}. The ${part.decimal()} is ${part} of an hour: ${part} of 60 minutes = ${part.mul(60).n} minutes. So ${xs} hours = ${ans}. Answer: ${ans}`;
          const digits = xs.split('.')[1];
          ds.push({ text: hm(h * 60 + Number(digits)), code: 'TIME-DECIMAL-AS-MINUTES', why: `It looks like you read the digits after the point (${digits}) as minutes. ${part.decimal()} of an hour is ${part.mul(60).n} minutes, because an hour has 60 minutes, not 100.` });
          ds.push({ text: `${Math.round(x.value * 100)} min`, code: 'TIME-DECIMAL-AS-MINUTES', why: `It looks like you multiplied by 100. An hour is 60 minutes: ${xs} x 60 = ${mins} minutes = ${ans}.` });
        } else {
          skill = SK.dec2min;
          ans = `${mins} min`; accept = [`${mins} min`, `${mins} minutes`, `${mins} mins`, String(mins)];
          type = 'numeric';
          // a piano practice is under 2 hours and a film under 3 (CLO review X6)
          prompt = rng.pick([`How many minutes are there in ${xs} hours?`, `A bus journey takes ${xs} hours. How many minutes is that?`, ...(h < 2 ? [`${p.name} practised the piano for ${xs} hours. How many minutes is that?`] : []), ...(h < 3 ? [`A film lasts ${xs} hours. How long is that in minutes?`] : [])]);
          solution = `1 hour = 60 minutes, so multiply by 60: ${xs} x 60 = ${mins} minutes.${h ? ` (${h} x 60 = ${h * 60}, and ${part.decimal()} x 60 = ${part.mul(60).n}.)` : ''} Answer: ${mins} min`;
          const digits = xs.split('.')[1];
          const dm = h * 60 + Number(digits);
          ds.push({ text: `${dm} min`, code: 'TIME-DECIMAL-AS-MINUTES', why: `It looks like you read ${xs} hours as ${h ? `${h} h ` : ''}${Number(digits)} min. ${part.decimal()} of an hour is ${part.mul(60).n} minutes, not ${Number(digits)}.` });
          ds.push({ text: `${Math.round(x.value * 100)} min`, code: 'TIME-DECIMAL-AS-MINUTES', why: `It looks like you multiplied by 100. An hour has 60 minutes, so multiply by 60.` });
          ds.push({ text: `${Math.round(x.value * 10)} min`, code: 'TIME-DEC-X10', why: `It looks like you multiplied by 10. An hour has 60 minutes, so multiply by 60.` });
          const base = mins;
          try {
            const typed = rng.chance(0.35);
            const body = typed
              ? { type: 'numeric', answer: numericAnswer(base, accept), ...typedMisconceptions(String(base), ds.map((y) => ({ ...y, text: y.text.replace(' min', '') })), { code: 'TIME-DECIMAL-AS-MINUTES', why: 'An hour has 60 minutes: multiply the decimal hours by 60.' }) }
              : { type: 'mcq', ...choices(rng, ans, ds, (k) => { const w = around(base, 6, k); return w > 0 ? nearMiss(`${w} min`, 'Multiply the decimal hours by 60.') : null; }) };
            return { ...body, prompt, solution, skill };
          } catch { continue; }
        }
      } else if (d === 2) {
        if (rng.chance(0.5)) {
          skill = SK.hm2dec;
          const h = rng.int(1, 5); const m = rng.pick([6, 12, 15, 18, 24, 30, 36, 42, 45, 48, 54]);
          const x = F(h * 60 + m, 60);
          ans = `${x.decimal()} h`; accept = [x.decimal(), `${x.decimal()} h`, `${x.decimal()} hours`];
          prompt = rng.pick([`Write ${h} ${h === 1 ? 'hour' : 'hours'} ${m} minutes as a decimal number of hours.`, `${p.name}'s bus journey takes ${h} h ${m} min. Write this as a decimal number of hours.`]);
          solution = `Change the minutes to a fraction of an hour: ${m}/60 = ${F(m, 60)} = ${F(m, 60).decimal()}. So ${h} h ${m} min = ${x.decimal()} hours. Answer: ${ans}`;
          const wrong = `${h}.${pad(m)}`.replace(/0$/, '');
          ds.push({ text: `${wrong} h`, code: 'TIME-DECIMAL-AS-MINUTES', why: `It looks like you wrote the ${m} minutes straight after the point. ${m} minutes is ${m}/60 of an hour = ${F(m, 60).decimal()}, not 0.${pad(m)}.` });
          ds.push({ text: `${dec((h * 60 + m) / 100)} h`, code: 'TIME-DECIMAL-AS-MINUTES', why: `It looks like you divided the total minutes (${h * 60 + m}) by 100. Divide by 60: there are 60 minutes in an hour.` });
          if ((m * 10) % 60 === 0 && m / 10 !== F(m, 60).value) ds.push({ text: `${dec(h + m / 100 * 10 / 10)} h`, code: 'TIME-DECIMAL-AS-MINUTES', why: `It looks like you read the minutes as hundredths of an hour. Use ${m}/60.` });
          type = 'numeric';
          try {
            const typed = rng.chance(0.35);
            const body = typed
              ? { type: 'numeric', answer: numericAnswer(x.value, accept), ...typedMisconceptions(x.decimal(), ds.map((y) => ({ ...y, text: y.text.replace(' h', '') })), { code: 'TIME-DECIMAL-AS-MINUTES', why: 'Change the minutes to a fraction of an hour (divide by 60).' }) }
              : { type: 'mcq', ...choices(rng, ans, ds, (k) => { const w = F(h * 60 + m + 6 * (k % 2 ? Math.ceil(k / 2) : -Math.ceil(k / 2)), 60); return w.terminates && w.mul(100).isInt ? nearMiss(`${w.decimal()} h`, 'Divide the minutes by 60.') : null; }) };
            return { ...body, prompt, solution, skill };
          } catch { continue; }
        }
        skill = SK.min2dec;
        const mins = 6 * rng.int(11, 45);
        const x = F(mins, 60);
        if (!x.mul(100).isInt) continue;
        ans = `${x.decimal()} h`;
        prompt = rng.pick([...(mins <= 180 ? [`A film lasts ${mins} minutes. How long is that as a decimal number of hours?`] : []), `${p.name} hiked for ${mins} minutes. Write this time in hours, as a decimal.`, `A bus journey takes ${mins} minutes. How long is that as a decimal number of hours?`]);
        solution = `Divide by 60 to change minutes to hours: ${mins} ÷ 60 = ${x.decimal()}. Check: ${x.decimal()} h = ${hm(mins)} = ${mins} minutes. Answer: ${ans}`;
        const h = Math.floor(mins / 60); const m = mins % 60;
        if (m) ds.push({ text: `${h}.${pad(m)} h`.replace(/0 h$/, ' h'), code: 'TIME-DECIMAL-AS-MINUTES', why: `${mins} minutes is ${h} h ${m} min, but ${m} minutes is not 0.${pad(m)} of an hour. Divide ${mins} by 60.` });
        ds.push({ text: `${dec(mins / 100)} h`, code: 'TIME-DECIMAL-AS-MINUTES', why: 'It looks like you divided by 100. There are 60 minutes in an hour, so divide by 60.' });
        ds.push({ text: `${dec(mins / 10)} h`, code: 'TIME-DEC-X10', why: 'It looks like you divided by 10. There are 60 minutes in an hour, so divide by 60.' });
        try {
          return { type: 'mcq', ...choices(rng, ans, ds, (k) => { const w = F(mins + 6 * (k % 2 ? Math.ceil(k / 2) : -Math.ceil(k / 2)), 60); return w.mul(100).isInt ? nearMiss(`${w.decimal()} h`, 'Divide the minutes by 60.') : null; }), prompt, solution, skill };
        } catch { continue; }
      } else if (rng.chance(0.5)) {
        // add a decimal time to an h-min time
        skill = SK.addForms;
        const a = F(rng.int(1, 9), 10);
        const h = rng.int(0, 2); const m = rng.int(5, 55);
        const total = a.mul(60).n + h * 60 + m;
        ans = hm(total); accept = hmForms(total);
        const what = rng.pick(['practised the piano', 'read a book', 'played badminton', 'did homework']);
        prompt = `${p.name} ${what} for ${a.decimal()} hours on Monday and for ${hm(h * 60 + m)} on Tuesday. How long is that altogether? Give your answer in hours and minutes.`;
        solution = `First change ${a.decimal()} hours to minutes: ${a.decimal()} x 60 = ${a.mul(60).n} minutes. Then add: ${a.mul(60).n} min + ${hm(h * 60 + m)} = ${ans}. Change both times to the same form before adding. Answer: ${ans}`;
        const asMin = Number(a.decimal().split('.')[1]) * 10;
        ds.push({ text: hm(asMin + h * 60 + m), code: 'TIME-DECIMAL-AS-MINUTES', why: `It looks like you read ${a.decimal()} hours as ${asMin} minutes. ${a.decimal()} x 60 = ${a.mul(60).n} minutes.` });
        const raw = a.mul(60).n + m;
        if (raw >= 60) ds.push({ text: `${h} h ${raw} min`, code: 'TIME-MINUTES-OVERFLOW', why: `${raw} minutes is more than an hour: change 60 of them into 1 hour.` });
        if (raw >= 60) ds.push({ text: hm(total - 60), code: 'TIME-NO-CARRY', why: `${raw} minutes = 1 h ${raw - 60} min. It looks like you kept the ${raw - 60} min but did not add the 1 hour.` });
        ds.push({ text: hm(Number(a.decimal().split('.')[1]) + h * 60 + m), code: 'TIME-MIXED-FORMS', why: `It looks like you added the ${a.decimal().split('.')[1]} after the point straight onto the minutes. Change ${a.decimal()} hours to minutes first (x 60).` });
      } else {
        skill = SK.compareT;
        // Three times: the answer in hours and minutes; a decimal number of hours that only looks
        // longest if its digits are read as minutes; and a number of minutes with the biggest number.
        // Each wrong option is made by a named error (no fillers, CLO review X3).
        const H = rng.int(1, 3); const t = rng.int(2, 8);
        const Ms = range(6 * t + 1, 10 * t - 1).filter((x) => x % 5 === 0 && x < 60);
        if (!Ms.length) continue;
        const M = rng.pick(Ms);
        const A = 60 * H + M; const Dv = 60 * H + 6 * t;
        const N = A - 5 * rng.int(1, 4);
        if (N === Dv || N <= 60) continue;
        const opts = rng.shuffle([{ v: A, text: hm(A) }, { v: Dv, text: `${H}.${t} hours` }, { v: N, text: `${N} minutes` }]);
        ans = hm(A);
        prompt = `${p.name} timed three activities. Which is the longest time? ${opts.map((o) => o.text).join(', ')}.`;
        solution = `Change them all to minutes: ${opts.map((o) => `${o.text} = ${o.v} min`).join('; ')}. The longest is ${A} minutes. Answer: ${ans}`;
        ds.push({ text: `${H}.${t} hours`, code: 'TIME-DECIMAL-AS-MINUTES', why: `${H}.${t} hours looks longest if you read it as ${H} h ${t}0 min, but 0.${t} of an hour is ${6 * t} minutes, so it is only ${Dv} minutes. An hour has 60 minutes, not 100.` });
        ds.push({ text: `${N} minutes`, code: 'UNIT-MIXED', why: `${N} is the biggest number, but it is in minutes. ${N} minutes = ${hm(N)}. Change everything to the same unit before comparing.` });
        try {
          const c = choices(rng, ans, ds, null, 3);
          return { type: 'mcq', prompt, ...c, solution, skill, marks: 2 };
        } catch { continue; }
      }
      try {
        const body = pick(rng, { prompt, ans, accept, ds, common: { code: 'TIME-DECIMAL-AS-MINUTES', why: 'An hour has 60 minutes, not 100.' }, typed: rng.chance(0.35), fallback: (k) => { const w = around(hmToMin(ans), 6, k); return w > 0 ? nearMiss(hm(w), 'Remember: an hour has 60 minutes.') : null; } });
        return { ...body, prompt, solution, skill, marks: d === 3 ? 2 : 1 };
      } catch { /* draw again */ }
    }
  },
};
function hmToMin(t) { const h = t.match(/(\d+) h/); const m = t.match(/(\d+) min/); return (h ? Number(h[1]) * 60 : 0) + (m ? Number(m[1]) : 0); }

// ---------------------------------------------------------------- g02 12-hour and 24-hour clock (and clock faces)

const DAYPART = (t) => (t < 720 ? 'in the morning' : t < 1080 ? 'in the afternoon' : 'in the evening');
const clock = {
  id: 'm15.clock-24h', topicId: T, subtopicId: 'm15-s2', skill: SK.clock,
  title: '12-hour and 24-hour clock: convert a time (D1), noon and midnight or read a clock face (D2)',
  difficulties: [1, 2],
  check: {},
  make(rng, d) {
    for (;;) {
      const p = person(rng);
      const ds = [];
      let prompt; let ans; let solution; let accept; let diagram;
      const kind = d === 1 ? rng.pick(['to24', 'to12']) : rng.pick(['edge', 'face', 'face']);
      if (kind === 'to24') {
        const t = 60 * rng.int(13, 23) + 5 * rng.int(0, 11);
        ans = t24(t); accept = t24Forms(t);
        prompt = rng.pick([`What is ${t12(t)} written in the 24-hour clock?`, `${p.name}'s train leaves at ${t12(t)}. Write this time in the 24-hour clock.`, `A concert starts at ${t12(t)}. What is this in the 24-hour clock?`]);
        solution = `For times after midday (pm), add 12 to the hour: ${Math.floor(t / 60) - 12} + 12 = ${Math.floor(t / 60)}. So ${t12(t)} = ${ans}. Answer: ${ans}`;
        ds.push({ text: t24(t - 720), code: 'TIME-24H-PLUS-12-WRONG', why: `${t24(t - 720)} is in the morning. For a pm time, add 12 to the hour.` });
        ds.push({ text: t24(t - 120), code: 'TIME-24H-PLUS-12-WRONG', why: `It looks like you added 10 to the hour. Add 12: ${Math.floor(t / 60) - 12} + 12 = ${Math.floor(t / 60)}.` });
        if (Math.floor(t / 60) + 2 < 24) ds.push({ text: t24(t + 120), code: 'TIME-24H-PLUS-12-WRONG', why: `It looks like you added 14 to the hour. Add exactly 12 for a pm time.` });
      } else if (kind === 'to12') {
        const t = rng.chance(0.7) ? 60 * rng.int(13, 23) + 5 * rng.int(0, 11) : 60 * rng.int(1, 11) + 5 * rng.int(0, 11);
        ans = t12(t); accept = [ans, ans.replace(' ', ''), ans.replace(':', '.'), ans.replace(/ (a|p)m$/, ' $1.m.'), ans.replace(/ (a|p)m$/, '$1.m.')];
        prompt = rng.pick([`What is ${t24(t)} written in the 12-hour clock?`, `The school bus arrives at ${t24(t)}. Write this time using am or pm.`]);
        solution = t >= 780 ? `Hours bigger than 12 are after midday. Take away 12: ${Math.floor(t / 60)} - 12 = ${Math.floor(t / 60) - 12}. So ${t24(t)} is ${ans}. Answer: ${ans}` : `${t24(t)} is before midday, so it is am: ${ans}. Answer: ${ans}`;
        ds.push({ text: t12(t < 720 ? t + 720 : t - 720), code: 'TIME-AM-PM-SWAP', why: `${t < 720 ? 'Times before 12:00 are am (morning).' : 'Times after 12:00 are pm (afternoon or evening).'}` });
        if (t >= 780 && t < 1320) ds.push({ text: `${Math.floor(t / 60) - 10}:${pad(t % 60)} pm`, code: 'TIME-24H-PLUS-12-WRONG', why: `It looks like you took away 10. Take away 12 from the hour.` });
      } else if (kind === 'edge') {
        const m = 5 * rng.int(1, 11);
        const mid = rng.chance(0.5);
        const t = (mid ? 0 : 720) + m;
        if (rng.chance(0.5)) {
          ans = t24(t); accept = t24Forms(t);
          prompt = `What is ${t12(t)} written in the 24-hour clock?`;
          solution = mid ? `12 am is midnight, the start of the day, which is 00 on the 24-hour clock. So ${t12(t)} = ${ans}. Answer: ${ans}` : `12 pm is just after midday, which is 12 on the 24-hour clock. So ${t12(t)} = ${ans}. Answer: ${ans}`;
          ds.push({ text: t24(t + (mid ? 720 : -720)), code: 'TIME-NOON-MIDNIGHT', why: mid ? '12:__ am is just after MIDNIGHT, not midday. On the 24-hour clock midnight is 00:00.' : '12:__ pm is just after MIDDAY (noon). On the 24-hour clock that is 12:__.' });
          ds.push({ text: `24:${pad(m)}`, code: 'TIME-24H-PLUS-12-WRONG', why: `There is no 24:${pad(m)} on the 24-hour clock: it goes from 00:00 to 23:59.` });
        } else {
          ans = t12(t); accept = [ans, ans.replace(' ', ''), ans.replace(/ (a|p)m$/, ' $1.m.')];
          prompt = `What is ${t24(t)} written in the 12-hour clock?`;
          solution = mid ? `00:${pad(m)} is ${m} minutes after midnight. In the 12-hour clock that is ${ans}. Answer: ${ans}` : `12:${pad(m)} is ${m} minutes after midday, so it is pm: ${ans}. Answer: ${ans}`;
          ds.push({ text: t12(t + (mid ? 720 : -720)), code: 'TIME-NOON-MIDNIGHT', why: mid ? '00:__ is just after midnight, so it is am.' : '12:__ on the 24-hour clock is just after midday, so it is pm.' });
          ds.push({ text: `0:${pad(m)} ${mid ? 'am' : 'pm'}`, code: 'TIME-24H-PLUS-12-WRONG', why: 'The 12-hour clock has no 0 o\'clock: after 12:59 comes 1:00.' });
        }
      } else {
        const h = rng.int(1, 11); const m = 5 * rng.int(1, 11);
        const pm = rng.chance(0.7);
        const t = (pm ? 720 : 0) + h * 60 + m;
        if (t >= 1440) continue;
        diagram = { type: 'clock', time: t24(t), alt: 'An analogue clock face with an hour hand and a minute hand.' };
        ans = t24(t); accept = t24Forms(t);
        prompt = `The clock shows a time ${DAYPART(t)}. Write the time in the 24-hour clock.`;
        solution = `The short hour hand has passed ${h}, and the long minute hand points at ${m / 5}, which is ${m} minutes (${m / 5} x 5). So it is ${h}:${pad(m)}${pm ? ` pm, and ${h} + 12 = ${h + 12}` : ' am'}. Answer: ${ans}`;
        ds.push({ text: t24(pm ? t - 720 : t + 720), code: pm ? 'TIME-24H-PLUS-12-WRONG' : 'TIME-AM-PM-SWAP', why: pm ? `It is ${DAYPART(t)}, so add 12 to the hour: ${h} + 12 = ${h + 12}.` : 'It is in the morning, so the hour stays the same.' });
        if (m >= 30) ds.push({ text: t24(t + 60), code: 'TIME-HOUR-HAND-NEXT', why: `The hour hand is between ${h} and ${h + 1 > 12 ? 1 : h + 1}. It has passed ${h} but not reached ${h + 1 > 12 ? 1 : h + 1}, so the hour is ${h}.` });
        if (m / 5 !== m) ds.push({ text: `${t24(t - m).slice(0, 3)}${pad(m / 5)}`, code: 'TIME-MINUTE-HAND-NUMBER', why: `The minute hand points at ${m / 5}, but each number on the clock stands for 5 minutes: ${m / 5} x 5 = ${m} minutes.` });
      }
      try {
        const body = pick(rng, { prompt, ans, accept, ds, common: { code: 'TIME-24H-PLUS-12-WRONG', why: 'For pm times add 12 to the hour; for am times keep it (12 am is 00).' }, typed: d === 1 && rng.chance(0.3), fallback: (k) => nearMiss(/m$/.test(ans) ? ans.replace(/:(\d\d)/, (x, mm) => `:${pad((Number(mm) + 5 * k) % 60)}`) : t24(hmToMin24(ans) + 5 * k), 'Check the hour and the minutes again.') });
        return { ...body, prompt, solution, diagram };
      } catch { /* draw again */ }
    }
  },
};
function hmToMin24(s) { const [h, m] = s.split(':').map(Number); return h * 60 + m; }

// ---------------------------------------------------------------- g03 durations

const DUR_CTX = [
  { a: (p, s, e) => `A lesson starts at ${s} and ends at ${e}.`, q: 'How long is the lesson?' },
  { a: (p, s, e) => `${p.name}'s bus leaves at ${s} and arrives at ${e}.`, q: 'How long is the journey?' },
  { a: (p, s, e) => `A film starts at ${s} and finishes at ${e}.`, q: 'How long is the film?' },
  { a: (p, s, e) => `${p.name} started a jigsaw at ${s} and finished it at ${e}.`, q: `How long did the jigsaw take?` },
  { a: (p, s, e) => `A train leaves Ipoh at ${s} and reaches Kuala Lumpur at ${e}.`, q: 'How long does the journey take?' },
];
const NIGHT_CTX = [
  { a: (p, s, e) => `${p.name} falls asleep at ${s} and wakes up at ${e} the next morning.`, q: (p) => `How long does ${p.he} sleep?` },
  { a: (p, s, e) => `A night bus leaves Johor Bahru at ${s} and arrives in Penang at ${e} the next morning.`, q: 'How long is the journey?' },
  { a: (p, s, e) => `A movie marathon starts at ${s} and ends at ${e} the next morning.`, q: 'How long does it last?' },
  { a: (p, s, e) => `A night flight leaves at ${s} and lands at ${e} the next morning (both times in the same time zone).`, q: 'How long is the flight?' },
];
const duration = {
  id: 'm15.duration', topicId: T, subtopicId: 'm15-s2', skill: SK.dur,
  title: 'Duration between two times: in minutes (D1), in hours and minutes (D2), across midnight (D3)',
  difficulties: [1, 2, 3],
  check: { min: 0 },
  make(rng, d) {
    for (;;) {
      const p = person(rng);
      let s; let e;
      if (d === 1) { s = 60 * rng.int(7, 16) + 5 * rng.int(1, 11); e = s + 5 * rng.int(4, 23); if (Math.floor(e / 60) === Math.floor(s / 60) || e % 60 === 0 && rng.chance(0.5)) continue; } else if (d === 2) { s = 60 * rng.int(6, 15) + 5 * rng.int(1, 11); e = s + 60 * rng.int(1, 4) + 5 * rng.int(1, 11); if (e >= 1440 || e % 60 >= s % 60) continue; } else { s = 60 * rng.int(19, 23) + 5 * rng.int(0, 11); e = 1440 + 60 * rng.int(0, 7) + 5 * rng.int(0, 11); if (e - s < 120 || (s % 60) === 0) continue; }
      const dur = e - s;
      const ctx = rng.pick(d === 3 ? NIGHT_CTX : DUR_CTX);
      const minsOnly = d === 1;
      const prompt = `${ctx.a(p, t24(s), t24(e))} ${typeof ctx.q === 'function' ? ctx.q(p) : ctx.q} Give your answer in ${minsOnly ? 'minutes' : 'hours and minutes'}.`;
      const toNext = 60 - (s % 60);
      const ans = minsOnly ? `${dur} min` : hm(dur);
      const steps = d === 3
        ? `${t24(s)} to midnight is ${hm(1440 - s)}. Midnight to ${t24(e)} is ${hm(e - 1440)}.`
        : `${t24(s)} to ${t24(s + toNext)} is ${toNext} minutes. ${t24(s + toNext)} to ${t24(e)} is ${hm(e - s - toNext)}.`;
      const solution = `Count on in steps. ${steps} Altogether: ${minsOnly ? `${dur} minutes` : hm(dur)}. Remember: an hour has 60 minutes, not 100. Answer: ${ans}`;
      const ds = [];
      const sv = Math.floor(s / 60) * 100 + (s % 60); const ev = Math.floor((e % 1440) / 60) * 100 + (e % 60);
      if (d < 3) {
        const raw = ev - sv;
        ds.push({ text: minsOnly ? `${raw} min` : `${Math.floor(raw / 100)} h ${raw % 100} min`, code: 'TIME-100-MINUTES', why: `It looks like you subtracted ${t24(e).replace(':', '')} - ${t24(s).replace(':', '')} as ordinary numbers. An hour has 60 minutes, not 100: count on instead.` });
        const ph = Math.floor(e / 60) - Math.floor(s / 60); const pmn = Math.abs((e % 60) - (s % 60));
        ds.push({ text: minsOnly ? `${ph * 60 + pmn} min` : hm(ph * 60 + pmn), code: 'TIME-PARTS-SEPARATE', why: `It looks like you subtracted the hours (${Math.floor(e / 60)} - ${Math.floor(s / 60)}) and then the smaller minutes from the larger. Count on from ${t24(s)} to ${t24(e)} instead.` });
      } else {
        const back = s - (e - 1440);
        ds.push({ text: hm(back), code: 'TIME-MIDNIGHT', why: `${hm(back)} is the time from ${t24(e)} to ${t24(s)} on the same day. This time goes past midnight: count on from ${t24(s)} to midnight, then on to ${t24(e)}.` });
        const raw = sv - ev;
        if (raw > 0 && raw % 100 < 60 === false) ds.push({ text: `${Math.floor(raw / 100)} h ${raw % 100} min`, code: 'TIME-100-MINUTES', why: 'It looks like you subtracted the times as ordinary numbers. Count on past midnight instead.' });
        ds.push({ text: hm(dur + 60), code: 'TIME-MIDNIGHT', why: `It looks like you counted one hour too many around midnight. ${t24(s)} to midnight is ${hm(1440 - s)}.` });
      }
      try {
        const dsx = ds.filter((x) => !/^-|-/.test(x.text));
        const typed = rng.chance(0.35);
        if (typed && minsOnly) return { type: 'numeric', prompt, answer: numericAnswer(dur, [`${dur} min`, `${dur} minutes`, String(dur)]), ...typedMisconceptions(String(dur), dsx.map((x) => ({ ...x, text: x.text.replace(' min', '') })), { code: 'TIME-100-MINUTES', why: 'Count on from the start time to the next hour, then on to the end time.' }), solution, skill: SK.dur };
        const body = pick(rng, { prompt, ans, accept: minsOnly ? [`${dur} min`] : hmForms(dur), ds: dsx, common: { code: 'TIME-100-MINUTES', why: 'Count on from the start time to the next hour, then on to the end time. An hour has 60 minutes.' }, typed: typed && !minsOnly, fallback: (k) => { const w = around(dur, 5, k); return w > 0 ? nearMiss(minsOnly ? `${w} min` : hm(w), 'Count on in steps: to the next hour, then on.') : null; } });
        return { ...body, prompt, solution, skill: d === 3 ? SK.durMid : SK.dur, marks: d === 3 ? 2 : 1 };
      } catch { /* draw again */ }
    }
  },
};

// ---------------------------------------------------------------- g04 end time; multi-step

const endTime = {
  id: 'm15.end-time', topicId: T, subtopicId: 'm15-s2', skill: SK.addMid,
  title: 'End time from a start time and a duration across midnight (D2), multi-step timings (D3)',
  difficulties: [2, 3],
  check: {},
  make(rng, d) {
    for (;;) {
      const p = person(rng);
      const ds = [];
      let prompt; let ans; let solution; let accept;
      if (d === 2) {
        const s = 60 * rng.int(19, 23) + 5 * rng.int(1, 11);
        const dur = 60 * rng.int(1, 9) + 5 * rng.int(1, 11);
        const e = s + dur;
        if (e < 1440 + 20 || (s % 60) + (dur % 60) < 60) continue;
        ans = t24(e); accept = t24Forms(e);
        const what = rng.pick([`A night flight leaves Kuala Lumpur at ${t24(s)}. It lands ${hm(dur)} later. Both times are Kuala Lumpur time.`, `A night bus leaves at ${t24(s)}. The journey takes ${hm(dur)}.`, `${p.name}'s family set off on a night drive to Penang at ${t24(s)}. The drive takes ${hm(dur)}.`]);
        prompt = `${what} At what time ${/drive/.test(what) ? 'do they' : 'does it'} arrive? Use the 24-hour clock.`;
        const sh = Math.floor(s / 60); const dh = Math.floor(dur / 60);
        solution = `Add the hours first: ${t24(s)} + ${dh} h = ${pad(sh + dh)}:${pad(s % 60)}. ${sh + dh >= 24 ? `A day has only 24 hours, so take away 24: ${t24((sh + dh) * 60 + (s % 60))} the next morning. ` : ''}Now add ${dur % 60} minutes: ${t24(s + dh * 60)} + ${dur % 60} min = ${ans}. Answer: ${ans}`;
        const raw = (sh + dh) * 60 + (s % 60) + (dur % 60);
        if (raw >= 1440) ds.push({ text: `${pad(Math.floor(raw / 60))}:${pad(raw % 60)}`, code: 'TIME-MIDNIGHT', why: `There is no ${pad(Math.floor(raw / 60))}:${pad(raw % 60)}: the 24-hour clock starts again at 00:00 after midnight. Take away 24 hours.` });
        const om = (s % 60) + (dur % 60);
        ds.push({ text: `${pad((sh + dh) % 24)}:${pad(om)}`, code: 'TIME-MINUTES-OVERFLOW', why: `${om} minutes is more than an hour. Change 60 minutes into 1 hour: ${om} min = 1 h ${om - 60} min.` });
        ds.push({ text: t24(e - 60), code: 'TIME-NO-CARRY', why: `${om} minutes = 1 h ${om - 60} min. It looks like you kept the ${om - 60} minutes but did not add the extra hour.` });
      } else if (rng.chance(0.5)) {
        // a two-leg night journey with a stop, across midnight (guide g04)
        const [A, B, Cn] = rng.pick([['Johor Bahru', 'Kuala Lumpur', 'Ipoh'], ['Kuala Lumpur', 'Ipoh', 'Butterworth'], ['Singapore', 'Kuala Lumpur', 'Penang'], ['Kuantan', 'Kuala Lumpur', 'Ipoh']]);
        const s = 60 * rng.int(20, 22) + 5 * rng.int(0, 11);
        const d1 = 60 * rng.int(1, 4) + 5 * rng.int(1, 11); const w = rng.pick([10, 15, 20, 25, 30, 40]); const d2 = 60 * rng.int(1, 3) + 5 * rng.int(1, 11);
        const e = s + d1 + w + d2;
        if (e < 1440 + 30 || e > 1440 + 360 || s + d1 >= 1440) continue; // it reaches the stop before midnight, and the end after it
        ans = t24(e); accept = t24Forms(e);
        prompt = `A night train leaves ${A} at ${t24(s)}. It travels for ${hm(d1)} to ${B} and waits there for ${w} minutes. Then it travels for another ${hm(d2)} to ${Cn}. At what time does it reach ${Cn}? Use the 24-hour clock.`;
        solution = `Arrives in ${B}: ${t24(s)} + ${hm(d1)} = ${t24(s + d1)}. Leaves ${B} after ${w} minutes: ${t24(s + d1 + w)}. Then ${t24(s + d1 + w)} + ${hm(d2)} goes past midnight: ${t24(e)} the next morning. Answer: ${ans}`;
        ds.push({ text: t24(e - w), code: 'TIME-STEP-MISSED', why: `It looks like you left out the ${w} minutes the train waits in ${B}. Add the wait as well.` });
        ds.push({ text: t24(s + d1), code: 'ONE-STEP-ONLY', why: `${t24(s + d1)} is when the train reaches ${B}. Keep going: add the wait and the second part of the journey.` });
        const rawE = s + d1 + w + d2;
        ds.push({ text: `${pad(Math.floor(rawE / 60))}:${pad(rawE % 60)}`, code: 'TIME-MIDNIGHT', why: `There is no ${pad(Math.floor(rawE / 60))}:${pad(rawE % 60)}: after 23:59 the 24-hour clock starts again at 00:00. Take away 24 hours.` });
      } else {
        const n = rng.int(2, 4);
        const sess = 5 * rng.int(8, 20); const brk = rng.pick([10, 15, 20, 30]);
        const s = 60 * rng.int(7, 10) + 15 * rng.int(0, 3);
        const e = s + n * sess + (n - 1) * brk;
        if (e >= 1320) continue;
        ans = t24(e); accept = t24Forms(e);
        const what = rng.pick(['A cooking class', 'A badminton camp', 'A coding workshop', 'An art class']);
        prompt = `${what} has ${n} sessions. Each session lasts ${hm(sess)}. There is a ${brk}-minute break between one session and the next. It starts at ${t24(s)}. At what time does it finish? Use the 24-hour clock.`;
        solution = `Sessions: ${n} x ${hm(sess)} = ${hm(n * sess)}. Breaks: ${n - 1} x ${brk} min = ${hm((n - 1) * brk)}. Total time = ${hm(n * sess + (n - 1) * brk)}. ${t24(s)} + ${hm(n * sess + (n - 1) * brk)} = ${ans}. Answer: ${ans}`;
        ds.push({ text: t24(s + n * sess), code: 'TIME-STEP-MISSED', why: `It looks like you left out the breaks. Add ${n - 1} x ${brk} min as well.` });
        ds.push({ text: t24(e + brk), code: 'TIME-BREAKS-COUNT', why: `It looks like you added ${n} breaks. Breaks come only BETWEEN sessions, so there are ${n - 1}.` });
        const tot = n * sess;
        if (tot >= 100 && tot % 100 < 60 && tot % 60 !== tot % 100) ds.push({ text: t24(s + Math.floor(tot / 100) * 60 + (tot % 100) + (n - 1) * brk), code: 'TIME-100-MINUTES', why: `It looks like you wrote ${tot} minutes of sessions as ${Math.floor(tot / 100)} h ${tot % 100} min. An hour has 60 minutes: ${tot} min = ${hm(tot)}.` });
      }
      try {
        const body = pick(rng, { prompt, ans, accept, ds, common: { code: 'TIME-MIDNIGHT', why: 'Add the hours, then the minutes, changing 60 minutes into an hour. After 23:59 the clock goes back to 00:00.' }, typed: rng.chance(0.3), fallback: (k) => nearMiss(t24(hmToMin24(ans) + 5 * (k % 2 ? Math.ceil(k / 2) : -Math.ceil(k / 2))), 'Add the hours first, then the minutes.') });
        return { ...body, prompt, solution, skill: d === 3 ? SK.multi : SK.addMid, marks: d === 3 ? 3 : 2 };
      } catch { /* draw again */ }
    }
  },
};

// ---------------------------------------------------------------- g05 timetables

const ROUTES = [
  ['Ipoh', 'Kampar', 'Tapah', 'Slim River', 'Rawang', 'Kuala Lumpur'],
  ['Butterworth', 'Taiping', 'Kuala Kangsar', 'Ipoh', 'Batu Gajah'],
  ['Melaka', 'Alor Gajah', 'Seremban', 'Nilai', 'Kajang', 'Kuala Lumpur'],
  ['Kuantan', 'Gambang', 'Maran', 'Temerloh', 'Bentong', 'Kuala Lumpur'],
  ['Johor Bahru', 'Kulai', 'Kluang', 'Yong Peng', 'Batu Pahat', 'Muar'],
];
const timetable = {
  id: 'm15.timetable', topicId: T, subtopicId: 'm15-s2', skill: SK.table,
  title: 'Read a bus timetable: a journey time (D2), the latest bus to arrive in time (D3)',
  difficulties: [2, 3],
  check: { min: 0 },
  make(rng, d) {
    for (;;) {
      const route = rng.pick(ROUTES);
      const k = rng.int(4, route.length);
      const stops = route.slice(0, k);
      const nb = d === 3 ? rng.pick([3, 4]) : 3;
      const gaps = stops.slice(1).map(() => 5 * rng.int(4, 18));
      const starts = [60 * rng.int(6, 8) + 5 * rng.int(0, 11)];
      for (let b = 1; b < nb; b++) starts.push(starts[b - 1] + 5 * rng.int(9, 30));
      const times = starts.map((st, b) => { const out = [st]; gaps.forEach((g, i) => out.push(out[i] + g + (b === 1 ? 5 * rng.int(0, 2) : 0))); return out; });
      const diagram = { type: 'table', title: 'Bus timetable', columns: ['Stop', ...times.map((_, b) => `Bus ${b + 1}`)], rows: stops.map((s, i) => [s, ...times.map((t) => t24(t[i]))]) };
      const p = person(rng);
      const ds = [];
      let prompt; let ans; let solution; let accept;
      const [i, j] = [rng.int(0, k - 2), 0];
      void j;
      if (d === 2) {
        const a = rng.int(0, k - 2); const b2 = rng.int(a + 1, k - 1);
        const bus = rng.int(0, nb - 1);
        const s = times[bus][a]; const e = times[bus][b2];
        const dur = e - s;
        if (Math.floor(s / 60) === Math.floor(e / 60) || e % 60 >= s % 60) continue;
        ans = hm(dur); accept = hmForms(dur);
        prompt = `${p.name} takes Bus ${bus + 1} from ${stops[a]} to ${stops[b2]}. How long is ${p.his} journey?`;
        solution = `Bus ${bus + 1} leaves ${stops[a]} at ${t24(s)} and reaches ${stops[b2]} at ${t24(e)}. Count on: ${t24(s)} to ${t24(s + 60 - (s % 60))} is ${60 - (s % 60)} min, then to ${t24(e)} is ${hm(e - s - 60 + (s % 60))}. Total: ${ans}. Answer: ${ans}`;
        const sv = Math.floor(s / 60) * 100 + (s % 60); const ev = Math.floor(e / 60) * 100 + (e % 60);
        const raw = ev - sv;
        ds.push({ text: `${Math.floor(raw / 100) ? `${Math.floor(raw / 100)} h ` : ''}${raw % 100} min`, code: 'TIME-100-MINUTES', why: `It looks like you subtracted ${t24(e).replace(':', '')} - ${t24(s).replace(':', '')} as ordinary numbers. An hour has 60 minutes: count on instead.` });
        const ph = Math.floor(e / 60) - Math.floor(s / 60); const pmn = Math.abs((e % 60) - (s % 60));
        ds.push({ text: hm(ph * 60 + pmn), code: 'TIME-PARTS-SEPARATE', why: 'It looks like you subtracted the hours and then the smaller minutes from the larger. Count on from the start time instead.' });
        for (const ob of [0, 1, 2].filter((x) => x !== bus)) { const od = times[ob][b2] - times[ob][a]; if (od !== dur) { ds.push({ text: hm(od), code: 'TIME-TABLE-WRONG-COLUMN', why: `${hm(od)} is the journey time on Bus ${ob + 1}. Read down the Bus ${bus + 1} column.` }); break; } }
      } else {
        const a = rng.int(0, k - 2); const b2 = rng.int(a + 1, k - 1);
        // never the last bus, so a later bus is always ruled out by the deadline (CLO review, m15 SHOULD 5)
        const ok = rng.int(1, nb - 2);
        const need = times[ok][b2] + 5 * rng.int(0, Math.max(0, Math.floor((times[ok + 1][b2] - times[ok][b2]) / 5) - 1));
        if (need >= times[ok + 1][b2]) continue;
        ans = t24(times[ok][a]); accept = t24Forms(times[ok][a]);
        prompt = `${p.name} is at ${stops[a]}. ${p.He} must be in ${stops[b2]} by ${t24(need)}. What time does the latest bus ${p.he} can catch leave ${stops[a]}?`;
        solution = `Look along the ${stops[b2]} row for buses that arrive by ${t24(need)}: ${times.filter((t) => t[b2] <= need).map((t) => t24(t[b2])).join(' and ')}. The latest of these is Bus ${ok + 1} (arrives ${t24(times[ok][b2])}). It leaves ${stops[a]} at ${ans}. Answer: ${ans}`;
        ds.push({ text: t24(times[ok + 1][a]), code: 'TIME-TABLE-TOO-LATE', why: `The bus leaving at ${t24(times[ok + 1][a])} reaches ${stops[b2]} at ${t24(times[ok + 1][b2])}, which is after ${t24(need)}.` });
        ds.push({ text: t24(times[ok][b2]), code: 'TIME-TABLE-WRONG-STOP', why: `${t24(times[ok][b2])} is when that bus ARRIVES in ${stops[b2]}. The question asks when it leaves ${stops[a]}.` });
        ds.push({ text: t24(times[ok - 1][a]), code: 'TIME-TABLE-EARLIEST', why: `That bus would get ${p.name} there in time, but a later bus (leaving ${ans}) still arrives by ${t24(need)}.` });
      }
      void i;
      try {
        const body = pick(rng, { prompt, ans, accept, ds, common: { code: 'TIME-100-MINUTES', why: 'Find the right column and rows first, then count on from one time to the other.' }, typed: d === 2 && rng.chance(0.3), fallback: (k2) => nearMiss(/:/.test(ans) ? t24(hmToMin24(ans) + 5 * k2) : hm(hmToMin(ans) + 5 * (k2 % 2 ? k2 : -k2)), 'Read the timetable again carefully.') });
        return { ...body, prompt, solution, diagram, marks: d === 3 ? 2 : 1 };
      } catch { /* draw again */ }
    }
  },
};

// ---------------------------------------------------------------- g06, g07 metric conversions and comparing

const UNITS = {
  length: [['mm', 'cm', 10, 'millimetres', 'centimetres'], ['cm', 'm', 100, 'centimetres', 'metres'], ['m', 'km', 1000, 'metres', 'kilometres'], ['mm', 'm', 1000, 'millimetres', 'metres']],
  mass: [['g', 'kg', 1000, 'grams', 'kilograms']],
  cap: [['ml', 'L', 1000, 'millilitres', 'litres']],
};
const metric = {
  id: 'm15.metric-convert', topicId: T, subtopicId: 'm15-s3', skill: SK.length,
  title: 'Metric conversions: one step (D1), up to 3 decimal places and mixed measures (D2), the largest of four mixed measures (D3)',
  difficulties: [1, 2, 3],
  check: { min: 0, maxDp: 3 },
  make(rng, d) {
    for (;;) {
      const kind = rng.pick(['length', 'length', 'mass', 'cap']);
      const skill = { length: SK.length, mass: SK.mass, cap: SK.cap }[kind];
      const [small, big, f, sName, bName] = rng.pick(UNITS[kind]);
      const ds = [];
      let prompt; let ansV; let ansU; let solution;
      if (d < 3) {
        const toSmall = rng.chance(0.5);
        const mixed = d === 2 && f === 1000 && rng.chance(0.4);
        if (mixed) {
          const w = rng.int(1, 9); const part = rng.pick([rng.int(1, 9) * 10, rng.int(1, 9), rng.int(11, 99), rng.int(101, 999)]);
          const totalSmall = w * f + part;
          ansV = totalSmall / f; ansU = big;
          prompt = `Write ${w} ${big} ${part} ${small} in ${bName}.`;
          solution = `1 ${big} = ${f} ${small}, so ${part} ${small} = ${part}/${f} ${big} = ${dec(part / f)} ${big}. ${w} ${big} + ${dec(part / f)} ${big} = ${dec(ansV)} ${big}. Answer: ${dec(ansV)} ${big}`;
          if (part < 100) ds.push({ text: `${w}.${part} ${big}`, code: 'UNIT-DROP-ZERO', why: `${part} ${small} is ${part}/${f} of a ${big}, which is ${dec(part / f)}, not 0.${part}. Keep the zero place holder${part < 10 ? 's' : ''}.` });
          ds.push({ text: `${fmtInt(totalSmall)} ${big}`, code: 'UNIT-NOT-CONVERTED', why: `${fmtInt(totalSmall)} is the measure in ${sName}. Divide by ${f} to change it to ${bName}.` });
          ds.push({ text: `${dec(w + part / 100)} ${big}`, code: 'UNIT-FACTOR-WRONG', why: `It looks like you used 100 ${small} in a ${big}. There are ${f}.` });
        } else if (toSmall) {
          const x = d === 1 ? rng.int(11, 99) / 10 : rng.int(101, 9999) / 1000;
          ansV = Math.round(x * f * 1000) / 1000; ansU = small;
          if (!Number.isInteger(ansV) && d === 1) continue;
          prompt = rng.pick([`How many ${sName} are there in ${dec(x)} ${big}?`, `Write ${dec(x)} ${big} in ${sName}.`]);
          solution = `1 ${big} = ${f} ${small}, so multiply by ${f}: ${dec(x)} x ${f} = ${dec(ansV)}. Answer: ${dec(ansV)} ${small}`;
          for (const g of [10, 100, 1000]) if (g !== f) ds.push({ text: `${dec(x * g)} ${small}`, code: 'UNIT-FACTOR-WRONG', why: `It looks like you multiplied by ${g}. 1 ${big} = ${f} ${small}.` });
          if (Number.isInteger(Math.round(x * 1e6) / f * 1000 / 1e6)) ds.push({ text: `${dec(x / f)} ${small}`, code: 'PV-SHIFT-WRONG', why: `It looks like you divided. ${sName.charAt(0).toUpperCase() + sName.slice(1)} are smaller than ${bName}, so there are MORE of them: multiply by ${f}.` });
        } else {
          const x = d === 1 ? f * rng.int(1, 9) + (f / 10) * rng.int(1, 9) : rng.int(f / 10 + 1, f * 9);
          ansV = x / f; ansU = big;
          if (dec(ansV).split('.')[1]?.length > 3) continue;
          prompt = rng.pick([`Write ${fmtInt(x)} ${small} in ${bName}.`, `How many ${bName} is ${fmtInt(x)} ${small}?`]);
          solution = `${f} ${small} = 1 ${big}, so divide by ${f}: ${fmtInt(x)} ÷ ${f} = ${dec(ansV)}. Answer: ${dec(ansV)} ${big}`;
          for (const g of [10, 100, 1000]) if (g !== f) ds.push({ text: `${dec(x / g)} ${big}`, code: 'UNIT-FACTOR-WRONG', why: `It looks like you divided by ${g}. ${f} ${small} = 1 ${big}.` });
          ds.push({ text: `${fmtInt(x * f)} ${big}`, code: 'PV-SHIFT-WRONG', why: `It looks like you multiplied. ${bName.charAt(0).toUpperCase() + bName.slice(1)} are bigger, so there are fewer of them: divide by ${f}.` });
        }
        const ans = `${dec(ansV)} ${ansU}`;
        try {
          const typed = rng.chance(0.3);
          const body = typed
            ? { type: 'numeric', answer: numericAnswer(ansV, [dec(ansV), ans, `${dec(ansV)}${ansU}`]), ...typedMisconceptions(dec(ansV), ds.filter((x) => x.text.endsWith(` ${ansU}`)).map((x) => ({ ...x, text: x.text.replace(` ${ansU}`, '') })), { code: 'UNIT-FACTOR-WRONG', why: `Remember: 1 ${big} = ${f} ${small}.` }) }
            : { type: 'mcq', ...choices(rng, ans, ds, (k) => { const dp = (dec(ansV).split('.')[1] || '').length; const st = Number.isInteger(ansV) ? (ansV >= 100 ? 10 : 1) : 10 ** -dp; const w = Math.round((ansV + st * (k % 2 ? Math.ceil(k / 2) : -Math.ceil(k / 2))) * 1000) / 1000; return w > 0 ? nearMiss(`${dec(w)} ${ansU}`, `Remember: 1 ${big} = ${f} ${small}.`) : null; }) };
          if (body.type === 'numeric' && Object.keys(body.misconceptions).length < 2) continue;
          return { ...body, prompt, solution, skill };
        } catch { continue; }
      }
      // D3: which is the largest? Four measures, each wrong one a trap with a named error
      // (CLO review, m15 SHOULD 6): 1.45 kg looks bigger than 1.5 kg (more digits); 1 kg 60 g is
      // misread as 1.6 kg (zero place holder dropped); 1200 g has the biggest number (units mixed).
      if (f !== 1000 && !(small === 'cm' && big === 'm')) continue;
      const w = rng.int(1, 4); const t = rng.int(2, 8); const uu = rng.int(1, 9); const r = rng.int(1, t - 1);
      const fd = f / 10; // the small units in 0.1 of the big unit
      const ansS = w * f + t * fd;
      const longS = w * f + (t - 1) * fd + uu * (f / 100);
      const zeroPart = f === 1000 ? (t + 1) * 10 : t + 1; // 60 g, or 6 cm: misread as 0.6
      const zeroS = w * f + zeroPart;
      const rawS = w * f + r * fd;
      const opts = [
        { v: ansS, text: `${w}.${t} ${big}` },
        { v: longS, text: `${dec(longS / f)} ${big}`, code: 'DEC-LONGER-BIGGER', why: `${dec(longS / f)} has more digits after the point, but that does not make it bigger: ${dec(longS / f)} ${big} = ${fmtInt(longS)} ${small}, and ${w}.${t} ${big} = ${fmtInt(ansS)} ${small}.` },
        { v: zeroS, text: `${w} ${big} ${zeroPart} ${small}`, code: 'UNIT-DROP-ZERO', why: `${w} ${big} ${zeroPart} ${small} is not ${w}.${t + 1} ${big}: ${zeroPart} ${small} is ${dec(zeroPart / f)} ${big}, so it is ${dec(zeroS / f)} ${big} = ${fmtInt(zeroS)} ${small}.` },
        { v: rawS, text: `${fmtInt(rawS)} ${small}`, code: 'UNIT-MIXED', why: `${fmtInt(rawS)} is the biggest number, but it is in ${sName}: ${fmtInt(rawS)} ${small} = ${dec(rawS / f)} ${big}. Change everything to the same unit before comparing.` },
      ];
      if (new Set(opts.map((o) => o.v)).size < 4 || dec(longS / f).split('.')[1].length !== 2) continue;
      const shown = rng.shuffle(opts);
      const word = kind === 'mass' ? 'heaviest' : kind === 'cap' ? 'largest amount' : 'longest';
      prompt = `Which of these is the ${word}? ${shown.map((o) => o.text).join(', ')}.`;
      solution = `Change them all to ${sName}: ${shown.map((o) => `${o.text} = ${fmtInt(o.v)} ${small}`).join('; ')}. The ${word} is ${fmtInt(ansS)} ${small}. Answer: ${opts[0].text}`;
      try {
        const c = choices(rng, opts[0].text, opts.slice(1).map((o) => ({ text: o.text, code: o.code, why: o.why })), null);
        return { type: 'mcq', prompt, ...c, solution, skill: SK.compareM, marks: 2 };
      } catch { /* draw again */ }
    }
  },
};

// ---------------------------------------------------------------- reading scales (jug, weighing scale, ruler)

const readScale = {
  id: 'm15.read-scale', topicId: T, subtopicId: 'm15-s3', skill: SK.cap,
  title: 'Read a measuring jug, weighing scale or ruler (D1), and give the reading in another unit (D2)',
  difficulties: [1, 2],
  check: { min: 0, maxDp: 3 },
  make(rng, d) {
    for (;;) {
      const kind = rng.pick(['jug', 'weighing', 'ruler']);
      const ds = [];
      let diagram; let prompt; let ansV; let unit; let solution; let skill;
      if (kind === 'jug' || kind === 'weighing') {
        const [major, minor, max] = rng.pick(kind === 'jug' ? [[100, 10, 500], [100, 20, 1000], [200, 50, 1000], [250, 50, 1000], [500, 100, 2000], [100, 25, 500]] : [[100, 10, 500], [100, 20, 1000], [200, 50, 1000], [500, 100, 2000], [250, 50, 2000], [100, 25, 1000]]);
        const v = minor * rng.int(1, max / minor - 1);
        if (v % major === 0 || v < major) continue; // not a tiny amount below the first numbered mark
        const u = kind === 'jug' ? 'ml' : 'g';
        diagram = { type: 'scale', kind, min: 0, max, major, minor, unit: u, value: v, alt: kind === 'jug' ? `A measuring jug marked from 0 to ${max} ml, numbered every ${major} ml, with liquid in it.` : `A weighing scale dial marked from 0 to ${max} g, numbered every ${major} g, with a pointer.` };
        const base = Math.floor(v / major) * major; const kk = (v - base) / minor;
        const big = kind === 'jug' ? 'L' : 'kg';
        const toBig = d === 2;
        skill = kind === 'jug' ? SK.cap : SK.mass;
        ansV = toBig ? v / 1000 : v; unit = toBig ? big : u;
        const what = kind === 'jug' ? 'How much water is in the jug?' : `What is the mass of the ${rng.pick(max <= 1000 ? ['flour', 'rice', 'sugar', 'butter', 'peanuts', 'tea leaves'] : ['mangoes', 'durian', 'parcel', 'rambutans', 'potatoes', 'rice'])}?`;
        prompt = `${what} Give your answer in ${toBig ? (big === 'L' ? 'litres' : 'kilograms') : (u === 'ml' ? 'millilitres' : 'grams')}.`;
        solution = `The numbers go up in ${major}s, and there are ${major / minor} small divisions between them, so each small division is ${major} ÷ ${major / minor} = ${minor} ${u}. The ${kind === 'jug' ? 'level' : 'pointer'} is ${kk} small division${kk > 1 ? 's' : ''} past ${base}: ${base} + ${kk} x ${minor} = ${v} ${u}.${toBig ? ` In ${big === 'L' ? 'litres' : 'kilograms'}: ${v} ÷ 1000 = ${dec(v / 1000)} ${big}.` : ''} Answer: ${dec(ansV)} ${unit}`;
        const conv = (x) => (toBig ? x / 1000 : x);
        for (const s of [10, 1, major / 10].filter((s) => s !== minor)) { const w = base + kk * s; if (w !== v && w > 0) { ds.push({ text: `${dec(conv(w))} ${unit}`, code: 'SCALE-INTERVAL-WRONG', why: `It looks like you counted each small division as ${s}. There are ${major / minor} divisions between ${base} and ${base + major}, so each is ${minor} ${u}.` }); break; } }
        ds.push({ text: `${dec(conv(v + minor))} ${unit}`, code: 'SCALE-NEXT-MARK', why: `${dec(conv(v + minor))} is the mark just above the reading. Count the small divisions carefully from ${base}.` });
        if (toBig) ds.push({ text: `${dec(v / 100)} ${unit}`, code: 'UNIT-FACTOR-WRONG', why: `It looks like you divided by 100. 1000 ${u} = 1 ${big}.` });
        else if (v - minor > 0) ds.push({ text: `${dec(v - minor)} ${unit}`, code: 'SCALE-NEXT-MARK', why: `${v - minor} is the mark just below the reading. Count the small divisions carefully from ${base}.` });
      } else {
        const tenths = rng.chance(0.6);
        const from = d === 2 ? rng.int(1, 3) : 0;
        const len = tenths ? rng.int(21, 99) / 10 : rng.int(3, 11);
        const end = Math.round((from + len) * 10) / 10;
        if (end > 15) continue;
        diagram = { type: 'scale', kind: 'ruler', min: 0, max: 15, major: 1, minor: 0.1, unit: 'cm', value: end, object: rng.pick(['pencil', 'ribbon', 'bar']), alt: 'A ruler marked in centimetres and millimetres, with an object lying along it.' };
        if (from) diagram.from = from;
        skill = SK.length;
        const mm = rng.chance(d === 2 ? 0.5 : 0.3);
        ansV = mm ? Math.round(len * 10) : len; unit = mm ? 'mm' : 'cm';
        prompt = `How long is the ${diagram.object}? Give your answer in ${mm ? 'millimetres' : 'centimetres'}.`;
        solution = `${from ? `The ${diagram.object} starts at ${from} cm and ends at ${dec(end)} cm, so its length is ${dec(end)} - ${from} = ${dec(len)} cm.` : `The ${diagram.object} starts at 0 and ends at ${dec(end)} cm. Each small division is 1 mm = 0.1 cm.`}${mm ? ` 1 cm = 10 mm, so ${dec(len)} cm = ${ansV} mm.` : ''} Answer: ${dec(ansV)} ${unit}`;
        const c = (x) => (mm ? Math.round(x * 10000) / 1000 : x);
        if (from) ds.push({ text: `${dec(c(end))} ${unit}`, code: 'SCALE-RULER-END', why: `${dec(end)} cm is where the ${diagram.object} ENDS. It starts at ${from} cm, so take ${from} away.` });
        if (tenths) ds.push({ text: `${dec(c(Math.floor(len) + Math.round((len - Math.floor(len)) * 10) / 100))} ${unit}`, code: 'SCALE-INTERVAL-WRONG', why: 'It looks like you counted each small division as 0.01 cm. Each small division on a ruler is 1 mm = 0.1 cm.' });
        ds.push({ text: `${dec(c(Math.round((len + 0.1) * 10) / 10))} ${unit}`, code: 'SCALE-NEXT-MARK', why: 'That is the mark just past the end. Look closely at where the object ends.' });
        if (mm) ds.push({ text: `${dec(len * 100)} ${unit}`, code: 'UNIT-FACTOR-WRONG', why: 'It looks like you multiplied by 100. 1 cm = 10 mm.' });
      }
      const ans = `${dec(ansV)} ${unit}`;
      try {
        const typed = rng.chance(0.3);
        const step = unit === 'mm' ? 1 : unit === 'cm' ? 0.1 : unit === 'L' || unit === 'kg' ? 0.01 : 5;
        const body = typed
          ? { type: 'numeric', answer: numericAnswer(ansV, [dec(ansV), ans]), ...typedMisconceptions(dec(ansV), ds.map((x) => ({ ...x, text: x.text.replace(` ${unit}`, '') })), { code: 'SCALE-INTERVAL-WRONG', why: 'Work out what each small division is worth before you read the scale.' }) }
          : { type: 'mcq', ...choices(rng, ans, ds, (k) => { const w = Math.round((ansV + step * (k % 2 ? Math.ceil(k / 2) : -Math.ceil(k / 2))) * 1000) / 1000; return w > 0 ? nearMiss(`${dec(w)} ${unit}`, 'Work out what each small division is worth.') : null; }) };
        return { ...body, prompt, solution, diagram, skill };
      } catch { /* draw again */ }
    }
  },
};

// ---------------------------------------------------------------- g08 rectangles

// Each context has its own unit and sizes (CLO review X6): no 2 cm fields or 30 m posters.
// D1: whole numbers [unit, length range, width range, step]; D2m: decimals in metres; D2mix: m by cm.
const RECT_CTX = [
  { what: 'A rectangle', d1: ['cm', [3, 30], [2, 29], 1], d2m: true, d2mix: true },
  { what: 'A rectangular garden', d1: ['m', [4, 30], [3, 20], 1], d2m: true },
  { what: 'A rectangular classroom floor', d1: ['m', [6, 12], [5, 10], 1], d2m: true },
  { what: 'A rectangular poster', d1: ['cm', [3, 9], [2, 8], 10] },
  { what: 'A rectangular swimming pool', d1: ['m', [10, 25], [5, 12], 1] },
  { what: 'A rectangular table top', d1: ['cm', [6, 15], [4, 10], 10], d2mix: true },
  { what: 'A rectangular field', d1: ['m', [5, 9], [3, 8], 10] },
  { what: 'A rectangular rug', d2m: true, d2mix: true },
  { what: 'A rectangular notice board', d2mix: true },
];
const rectDiagram = (L, W, lab1, lab2) => ({ type: 'polygon', points: [[0, 0], [L, 0], [L, W], [0, W]], sides: [{ label: lab1 }, { label: lab2 }, null, null], angles: [{ right: true }, { right: true }, { right: true }, { right: true }], notToScale: true });
const rectangle = {
  id: 'm15.rectangle', topicId: T, subtopicId: 'm15-s4', skill: SK.area,
  title: 'Perimeter and area of a rectangle: whole numbers (D1), decimals or mixed units (D2), working backwards or in context (D3)',
  difficulties: [1, 2, 3],
  check: { min: 0, maxDp: 2 },
  make(rng, d) {
    for (;;) {
      const ds = [];
      const u = rng.pick(['cm', 'm']);
      let what = 'A rectangle';
      let prompt; let ansV; let unit; let solution; let skill; let diagram;
      const findArea = rng.chance(0.5);
      if (d === 1) {
        const ctx = rng.pick(RECT_CTX.filter((c) => c.d1));
        const [u, [l1, l2], [w1, w2], st] = ctx.d1;
        what = ctx.what;
        const L = st * rng.int(l1, l2); const W = st * rng.int(w1, Math.min(w2, L / st - 1));
        if (W <= 0 || W >= L) continue;
        diagram = rectDiagram(L, W, `${L} ${u}`, `${W} ${u}`);
        skill = findArea ? SK.area : SK.perim;
        ansV = findArea ? L * W : 2 * (L + W); unit = findArea ? `${u}^2` : u;
        prompt = `${what} is ${L} ${u} long and ${W} ${u} wide. What is its ${findArea ? 'area' : 'perimeter'}?`;
        solution = findArea ? `Area of a rectangle = length x width = ${L} x ${W} = ${fmtInt(ansV)} ${u}^2. Answer: ${fmtInt(ansV)} ${u}^2` : `Perimeter is the distance all the way round: ${L} + ${W} + ${L} + ${W} = ${ansV} ${u}, or 2 x (${L} + ${W}) = ${ansV} ${u}. Answer: ${ansV} ${u}`;
        if (findArea) {
          ds.push({ v: 2 * (L + W), code: 'AREA-PERIM-SWAP', why: `${2 * (L + W)} is the perimeter (the distance round the edge). Area = length x width.` });
          ds.push({ v: L + W, code: 'PERIM-TWO-SIDES', why: `It looks like you added the length and width. Area multiplies them: ${L} x ${W}.` });
        } else {
          ds.push({ v: L + W, code: 'PERIM-TWO-SIDES', why: `${L} + ${W} = ${L + W} is only two of the four sides. Add all four: 2 x (${L} + ${W}).` });
          ds.push({ v: L * W, code: 'AREA-PERIM-SWAP', why: `${L * W} is the area. The perimeter is the distance all the way round.` });
          ds.push({ v: 2 * L + W, code: 'PERIM-THREE-SIDES', why: `It looks like you added only three sides (${L} + ${W} + ${L}). A rectangle has two lengths AND two widths.` });
        }
      } else if (d === 2) {
        if (rng.chance(0.5)) {
          // decimals in metres
          what = rng.pick(RECT_CTX.filter((c) => c.d2m)).what;
          const L = rng.int(11, 60) / 10; const W = rng.int(5, Math.floor(L * 10) - 1) / 10;
          skill = findArea ? SK.area : SK.perim;
          diagram = rectDiagram(L, W, `${dec(L)} m`, `${dec(W)} m`);
          ansV = findArea ? Math.round(L * W * 100) / 100 : Math.round(2 * (L + W) * 10) / 10; unit = findArea ? 'm^2' : 'm';
          prompt = `${what} is ${dec(L)} m long and ${dec(W)} m wide. What is its ${findArea ? 'area' : 'perimeter'}?`;
          solution = findArea ? `Area = ${dec(L)} x ${dec(W)}. Work out ${Math.round(L * 10)} x ${Math.round(W * 10)} = ${Math.round(L * 10) * Math.round(W * 10)}. There are 2 decimal places in the question, so the area is ${dec(ansV)} m^2. Answer: ${dec(ansV)} m^2` : `Perimeter = 2 x (${dec(L)} + ${dec(W)}) = 2 x ${dec(L + W)} = ${dec(ansV)} m. Answer: ${dec(ansV)} m`;
          if (findArea) { ds.push({ v: Math.round(2 * (L + W) * 10) / 10, code: 'AREA-PERIM-SWAP', why: 'That is the perimeter. Area = length x width.' }); ds.push({ v: Math.round(L * 10) * Math.round(W * 10) / 10, code: 'DEC-MULT-POINT', why: `Count the decimal places: ${dec(L)} has 1 and ${dec(W)} has 1, so the answer has 2.` }); } else { ds.push({ v: Math.round((L + W) * 10) / 10, code: 'PERIM-TWO-SIDES', why: `${dec(L + W)} m is only two sides. Double it.` }); ds.push({ v: Math.round(L * W * 100) / 100, code: 'AREA-PERIM-SWAP', why: 'That is the area. The perimeter is the distance round the edge.' }); }
        } else {
          // mixed units: m and cm
          what = rng.pick(RECT_CTX.filter((c) => c.d2mix)).what;
          const Lcm = 10 * rng.int(11, 40); const Wcm = 10 * rng.int(2, Lcm / 10 - 1);
          const Lm = Lcm / 100;
          diagram = rectDiagram(Lcm, Wcm, `${dec(Lm)} m`, `${Wcm} cm`);
          if (findArea) {
            skill = SK.areaMixed;
            ansV = Lcm * Wcm; unit = 'cm^2';
            prompt = `${what} is ${dec(Lm)} m long and ${Wcm} cm wide. What is its area in cm^2?`;
            solution = `Make the units the same first: ${dec(Lm)} m = ${Lcm} cm. Area = ${Lcm} x ${Wcm} = ${fmtInt(ansV)} cm^2. Answer: ${fmtInt(ansV)} cm^2`;
            ds.push({ v: Math.round(Lm * Wcm * 100) / 100, code: 'UNIT-MIXED', why: `It looks like you multiplied ${dec(Lm)} by ${Wcm} without changing the metres to centimetres.` });
            ds.push({ v: 2 * (Lcm + Wcm), code: 'AREA-PERIM-SWAP', why: 'That is the perimeter in cm. Area = length x width.' });
            ds.push({ v: Lcm * Wcm * 10, code: 'UNIT-FACTOR-WRONG', why: `It looks like you changed ${dec(Lm)} m with x 1000. 1 m = 100 cm.` });
          } else {
            skill = SK.perim;
            ansV = 2 * (Lcm + Wcm); unit = 'cm';
            prompt = `${what} is ${dec(Lm)} m long and ${Wcm} cm wide. What is its perimeter in centimetres?`;
            solution = `Make the units the same first: ${dec(Lm)} m = ${Lcm} cm. Perimeter = ${Lcm} + ${Wcm} + ${Lcm} + ${Wcm} = ${fmtInt(ansV)} cm. Answer: ${fmtInt(ansV)} cm`;
            ds.push({ v: Math.round(2 * (Lm + Wcm) * 10) / 10, code: 'UNIT-MIXED', why: `It looks like you added ${dec(Lm)} and ${Wcm} without changing the metres to centimetres first.` });
            ds.push({ v: Lcm + Wcm, code: 'PERIM-TWO-SIDES', why: `${Lcm + Wcm} cm is only two sides. A rectangle has four.` });
            ds.push({ v: Lcm * Wcm, code: 'AREA-PERIM-SWAP', why: 'That is the area. The perimeter is the distance round the edge.' });
          }
        }
      } else {
        const p = person(rng);
        const form = rng.pick(['fromArea', 'fence', 'square']);
        if (form === 'fromArea') {
          const L = rng.int(4, 15); const W = rng.int(2, 12);
          if (W === L) continue;
          skill = SK.perim;
          ansV = 2 * (L + W); unit = u;
          diagram = rectDiagram(L, W, `${L} ${u}`, '?');
          prompt = `A rectangle has an area of ${L * W} ${u}^2. Its length is ${L} ${u}. What is its perimeter?`;
          solution = `Area = length x width, so width = ${L * W} ÷ ${L} = ${W} ${u}. Perimeter = ${L} + ${W} + ${L} + ${W} = ${ansV} ${u}. Answer: ${ansV} ${u}`;
          ds.push({ v: W, code: 'RECT-SIDE-ONLY', why: `${W} ${u} is the width. Use it to find the perimeter.` });
          ds.push({ v: L + W, code: 'PERIM-TWO-SIDES', why: `${L + W} is only two sides. Add all four.` });
          ds.push({ v: 2 * (L + L * W), code: 'AREA-PERIM-SWAP', why: `It looks like you used the area (${L * W}) as a side. Find the width first: ${L * W} ÷ ${L}.` });
        } else if (form === 'fence') {
          const L = rng.int(6, 30); const W = rng.int(3, L - 1) + (rng.chance(0.4) ? 0.5 : 0);
          const price = rng.pick([5, 8, 10, 12, 15, 20]);
          const P = 2 * (L + W);
          skill = SK.perimWords;
          ansV = P * price; unit = 'RM';
          diagram = rectDiagram(L, W, `${L} m`, `${dec(W)} m`);
          prompt = `${p.name} wants to put a fence all the way round a rectangular field that is ${L} m long and ${dec(W)} m wide. Fencing costs RM ${price} per metre. How much will the fencing cost?`;
          solution = `The fence goes round the edge, so find the perimeter: ${L} + ${dec(W)} + ${L} + ${dec(W)} = ${dec(P)} m. Cost = ${dec(P)} x RM ${price} = ${rm(ansV)}. Answer: ${rm(ansV)}`;
          ds.push({ v: (L + W) * price, code: 'PERIM-TWO-SIDES', why: `It looks like you used only one length and one width (${dec(L + W)} m). The fence goes all the way round.` });
          ds.push({ v: L * W * price, code: 'AREA-PERIM-SWAP', why: 'It looks like you used the area. A fence goes round the edge: use the perimeter.' });
          ds.push({ v: P, code: 'RECT-SIDE-ONLY', why: `${dec(P)} is the perimeter in metres. Multiply by RM ${price} for each metre.` });
        } else {
          const s = rng.int(3, 25);
          skill = SK.both;
          ansV = s * s; unit = `${u}^2`;
          prompt = `A square has a perimeter of ${4 * s} ${u}. What is its area?`;
          solution = `A square has 4 equal sides, so each side = ${4 * s} ÷ 4 = ${s} ${u}. Area = ${s} x ${s} = ${s * s} ${u}^2. Answer: ${s * s} ${u}^2`;
          ds.push({ v: (4 * s / 2) ** 2 / 4 === s * s ? 0 : (2 * s) * (2 * s), code: 'RECT-SIDE-ONLY', why: `It looks like you divided the perimeter by 2 to find a side. A square has 4 equal sides: divide by 4.` });
          ds.push({ v: s, code: 'RECT-SIDE-ONLY', why: `${s} ${u} is the length of one side. Area = side x side.` });
          ds.push({ v: 4 * s * 4 * s, code: 'AREA-PERIM-SWAP', why: 'It looks like you squared the perimeter. Find one side first (÷ 4), then square it.' });
        }
      }
      const fmt = (v) => (unit === 'RM' ? rm(v) : `${dec(v)} ${unit}`);
      const ans = fmt(ansV);
      try {
        const dsx = ds.filter((x) => x.v > 0).map((x) => ({ ...x, text: fmt(x.v) }));
        // a near miss is a slip of a plausible size for the answer (never 2402 for 2400)
        const step = unit === 'RM' ? 10 : Number.isInteger(ansV) ? (ansV >= 1000 ? 100 : ansV >= 100 ? 10 : 2) : 0.1;
        const c = choices(rng, ans, dsx, (k) => { const w = Math.round((ansV + step * (k % 2 ? Math.ceil(k / 2) : -Math.ceil(k / 2))) * 100) / 100; return w > 0 ? nearMiss(fmt(w), 'Check which you need: perimeter (round the edge) or area (length x width).') : null; });
        return { type: 'mcq', prompt, ...c, solution, diagram, skill, marks: d === 3 ? 2 : 1 };
      } catch { /* draw again */ }
    }
  },
};

// ---------------------------------------------------------------- g09 tiles

const tiles = {
  id: 'm15.tiles', topicId: T, subtopicId: 'm15-s4', skill: SK.words3,
  title: 'How many square tiles cover a rectangular floor (mixed units)',
  difficulties: [3],
  check: { min: 0, integer: true },
  make(rng) {
    for (;;) {
      const t = rng.pick([20, 25, 30, 40, 50, 60]);
      const a = rng.int(3, 16); const b = rng.int(2, 12);
      if (a === b) continue;
      const Lcm = a * t; const Wcm = b * t;
      if (Lcm > 900 || Wcm > 700) continue;
      const p = person(rng);
      const ans = a * b;
      const prompt = `${p.name}'s ${rng.pick(['kitchen', 'bathroom', 'classroom', 'verandah'])} floor is a rectangle ${dec(Lcm / 100)} m long and ${dec(Wcm / 100)} m wide. It is covered with square tiles, each ${t} cm by ${t} cm, with no gaps. How many tiles are needed?`;
      const solution = `Change to centimetres: ${dec(Lcm / 100)} m = ${Lcm} cm and ${dec(Wcm / 100)} m = ${Wcm} cm. Tiles along the length: ${Lcm} ÷ ${t} = ${a}. Tiles along the width: ${Wcm} ÷ ${t} = ${b}. Number of tiles = ${a} x ${b} = ${ans}. Answer: ${ans}`;
      const ds = [
        { text: String(a + b), code: 'AREA-ADDS-SIDES', why: `It looks like you added the tiles along each side (${a} + ${b}). The tiles fill rows: ${b} rows of ${a}, so multiply.` },
        { text: String(2 * (a + b) - 4), code: 'TILES-EDGE-ONLY', why: `${2 * (a + b) - 4} tiles would go only round the edge. The middle of the floor needs tiles too.` },
        (Lcm * Wcm) % t === 0 ? { text: fmtInt((Lcm * Wcm) / t), code: 'TILES-AREA-BY-SIDE', why: `It looks like you divided the floor's area by ${t}, the tile's side. Divide by the tile's AREA (${t} x ${t}), or count tiles along each side.` } : null,
      ].filter(Boolean);
      try {
        if (rng.chance(0.35)) return { type: 'numeric', prompt, answer: numericAnswer(ans, [String(ans), `${ans} tiles`]), ...typedMisconceptions(String(ans), ds, { code: 'AREA-ADDS-SIDES', why: 'Find how many tiles fit along the length and along the width, then multiply.' }), solution, marks: 3 };
        return { type: 'mcq', prompt, ...choices(rng, String(ans), ds, (k) => nearMiss(String(ans + b * (k % 2 ? Math.ceil(k / 2) : -Math.ceil(k / 2))), 'Count the tiles along each side, then multiply.')), solution, marks: 3 };
      } catch { /* draw again */ }
    }
  },
};

export default [decimalHours, clock, duration, endTime, timetable, metric, readScale, rectangle, tiles];
