// m03 2D Shapes and Angles: radius and diameter, types of angle, angles on a straight line and
// round a point, reading a protractor, missing angles in triangles and special triangles, area of
// right-angled triangles and compound shapes, rotational symmetry.
// Patterns follow the CLO's generator guide (section 2, m03). Every diagram is built from the same
// numbers as the answer and drawn true (an angle labelled 65° is drawn at 65°); the unknown is "?".
// Every wrong option is made by one named misconception and carries its code.

import { choices, typedMisconceptions, nearMiss, numericAnswer, fmtInt, person, valueOf, countOf } from './core.js';

const T = 'm03-2d-shapes-and-angles';
const SK = {
  radius: 'radius and diameter', types: 'types of angles', line: 'angles on a straight line', point: 'angles around a point',
  protractor: 'measuring angles with a protractor', triangle: 'missing angles in triangles', special: 'angles in special triangles',
  area: 'area of right-angled triangles', compound: 'area of compound shapes', rot: 'order of rotational symmetry', rotPattern: 'rotational symmetry of letters and patterns',
};

// Misconception codes: all declared once in misconceptions.js (the CLO's catalogue).

// ---------------------------------------------------------------- helpers

const deg = (v) => `${v}°`;
const r4 = (v) => { const x = Math.round(v * 1000) / 1000; return x === 0 ? 0 : x; };
const rad = (a) => (a * Math.PI) / 180;
const rot = (p, a) => [r4(p[0] * Math.cos(rad(a)) - p[1] * Math.sin(rad(a))), r4(p[0] * Math.sin(rad(a)) + p[1] * Math.cos(rad(a)))];
const numDeg = (v, extra = []) => numericAnswer(v, [String(v), deg(v), `${v} degrees`, ...extra]);
/** The numbers written in a prompt ("48 650" read as one number). */
const promptNumbers = (t) => (String(t).replace(/(\d) (\d{3})/g, '$1$2').match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
/** A near miss for this prompt, or null when it is not positive or its value already appears in the question (CLO review X3). */
const nearFor = (prompt) => (text, hint) => {
  const v = valueOf(text);
  if (v == null || v <= 0 || promptNumbers(prompt).some((x) => Math.abs(x - v) < 1e-9)) return null;
  return nearMiss(text, hint);
};
const nearDeg = (prompt, ans, hint, step = 10) => (i) => nearFor(prompt)(deg(ans + (i % 2 ? step : -step) * Math.ceil(i / 2)), hint);
const WORD = { 2: 'two', 3: 'three', 4: 'four', 5: 'five' };
const Cap = (t) => t[0].toUpperCase() + t.slice(1);
const LETTERS3 = ['ABC', 'PQR', 'XYZ', 'DEF', 'KLM', 'LMN', 'RST'];

/** A triangle drawn true: angle a at corner 0, b at corner 1 (the base), turned and maybe flipped. */
function triangle(rng, a, b, tilt = true) {
  const base = 6;
  const side = (base * Math.sin(rad(b))) / Math.sin(rad(a + b));
  let pts = [[0, 0], [base, 0], [side * Math.cos(rad(a)), side * Math.sin(rad(a))]];
  const flip = rng.chance(0.5);
  if (flip) pts = pts.map(([x, y]) => [-x, y]);
  const turn = tilt ? rng.int(-25, 25) : 0;
  return pts.map((p) => rot(p, turn));
}

/** "a + b" with brackets for negatives is not needed here: angles are positive. */
const sumText = (vals) => vals.join(' + ');

// ---------------------------------------------------------------- g10 radius and diameter

const fmtLen = (v) => (Number.isInteger(v) ? fmtInt(v) : String(v));
const radius = {
  id: 'm03.radius-diameter', topicId: T, subtopicId: 'm03-s2', skill: SK.radius,
  title: 'Radius from diameter and the reverse (D2 halves and compasses; D3 circles in a rectangle or a square)',
  difficulties: [1, 2, 3],
  check: { min: 0, maxDp: 2 },
  make(rng, d) {
    let unit = rng.pick(['cm', 'cm', 'mm', 'm']);
    let L = (v) => `${fmtLen(v)} ${unit}`;
    for (let t = 0; t < 300; t++) {
      if (d === 3) {
        if (rng.chance(0.5)) {
          // each object with its own unit and a real size, at least 3 in a row (CLO review m03 item 3)
          const [things, box, boxName, u, rlo, rhi] = rng.pick([
            ['identical circles', 'a rectangle', 'rectangle', 'cm', 2, 6],
            ['identical round biscuits', 'a rectangular tin', 'tin', 'cm', 3, 5],
            ['identical coins', 'a rectangular strip of card', 'strip of card', 'mm', 9, 14],
            ['identical round cakes', 'a rectangular box', 'box', 'cm', 6, 12],
          ]);
          unit = u; L = (v) => `${fmtLen(v)} ${unit}`;
          const nC = rng.int(3, 5); const r = rng.int(rlo, rhi) + (rng.chance(0.25) ? 0.5 : 0);
          const len = 2 * r * nC;
          const prompt = `${nC} ${things} fit exactly in a row inside ${box}. Each one touches the next one, the two long sides, and (at the ends) the short sides. Each has a radius of ${L(r)}. How long is the ${boxName}?`;
          const solution = `Diameter = 2 x ${fmtLen(r)} = ${fmtLen(2 * r)} ${unit}. The ${nC} circles sit side by side, so the length is ${nC} diameters: ${nC} x ${fmtLen(2 * r)} = ${fmtLen(len)} ${unit}. Answer: ${L(len)}`;
          const distractors = [
            { text: L(r * nC), code: 'CIRC-DIAM-FOR-RAD', why: `You used the radius instead of the diameter: ${nC} x ${fmtLen(r)}. Each one takes up a whole diameter (${fmtLen(2 * r)} ${unit}) of the length.` },
            { text: L(2 * r * (nC - 1)), code: 'CIRC-CENTRES-ONLY', why: `That is from the centre of the first circle to the centre of the last. Add a radius at each end as well.` },
            { text: L(2 * r), code: 'ONE-STEP-ONLY', why: `${fmtLen(2 * r)} ${unit} is the diameter of ONE of them. The ${boxName} holds ${nC} of them in a row.` },
          ];
          try { return { type: 'mcq', prompt, ...choices(rng, L(len), distractors, (i) => nearFor(prompt)(L(len + i * r), `Count how many diameters fit along the ${boxName}.`)), solution, marks: 2 }; } catch { continue; }
        }
        const side = rng.int(3, 30); const per = 4 * side; const r = side / 2;
        const prompt = `A circle is drawn inside a square so that it just touches all four sides. The perimeter of the square is ${L(per)}. What is the radius of the circle?`;
        const solution = `Side of the square = ${fmtLen(per)} ÷ 4 = ${fmtLen(side)} ${unit}. The circle touches two opposite sides, so its diameter equals the side: ${fmtLen(side)} ${unit}. Radius = ${fmtLen(side)} ÷ 2 = ${fmtLen(r)} ${unit}. Answer: ${L(r)}`;
        const distractors = [
          { text: L(side), code: 'CIRC-DIAM-FOR-RAD', why: `${L(side)} is the side of the square, which is the DIAMETER of the circle. The radius is half of it.` },
          { text: L(2 * side), code: 'CIRC-HALVE-DOUBLE-SWAP', why: `You doubled the diameter (${fmtLen(side)} ${unit}) instead of halving it. The radius is half the diameter.` },
          { text: L(per / 2), code: 'CIRC-HALVE-DOUBLE-SWAP', why: `You halved the perimeter. First find the side (perimeter ÷ 4), then halve the side.` },
        ];
        try { return { type: 'mcq', prompt, ...choices(rng, L(r), distractors, (i) => nearFor(prompt)(L(r + i), 'Side = perimeter ÷ 4; the radius is half the side.')), solution, marks: 2 }; } catch { continue; }
      }
      const fromR = rng.chance(0.5);
      let r;
      if (d === 1) r = fromR ? rng.int(2, 50) : rng.int(1, 25);
      else r = rng.int(1, 40) + (rng.chance(0.6) ? 0.5 : 0);
      const D = 2 * r;
      // a pair of compasses opens to at most about 15 cm (CLO review X6)
      const compasses = d === 2 && !fromR && unit === 'cm' && r <= 15 && rng.chance(0.4);
      const given = fromR ? r : D; const ans = fromR ? D : r;
      const prompt = compasses
        ? `You want to draw a circle with a diameter of ${L(D)} using a pair of compasses. How far apart should you open the compasses, from the point to the pencil tip?`
        : `A circle has a ${fromR ? 'radius' : 'diameter'} of ${L(given)}. How long is its ${fromR ? 'diameter' : 'radius'}?`;
      const solution = fromR
        ? `The diameter goes right across the circle through the centre, so it is two radii long. Diameter = 2 x ${fmtLen(r)} = ${fmtLen(D)} ${unit}. Answer: ${L(D)}`
        : `${compasses ? 'The compasses\' point sits on the centre and the pencil draws the edge, so the gap is the radius. ' : ''}The radius is half the diameter: ${fmtLen(D)} ÷ 2 = ${fmtLen(r)} ${unit}. Answer: ${L(r)}`;
      const distractors = [
        { text: L(given), code: 'CIRC-DIAM-FOR-RAD', why: fromR ? 'You gave the radius. The diameter goes right across the circle through the centre, so it is twice as long.' : `You gave the diameter.${compasses ? ' The gap between the point (the centre) and the pencil (the edge) is the radius,' : ' The radius goes from the centre to the edge, so it is'} half of the diameter.` },
        { text: L(fromR ? r / 2 : 2 * D), code: 'CIRC-HALVE-DOUBLE-SWAP', why: fromR ? `You halved the radius. The diameter is twice the radius: ${fmtLen(r)} x 2.` : `You doubled instead of halving. The radius is half of the diameter: ${fmtLen(D)} ÷ 2.` },
      ];
      const diagram = { type: 'circle', centreLabel: 'O', radius: { angle: rng.pick([30, 40, 60, 120, 140]), label: fromR ? L(r) : '?' }, diameter: { angle: rng.pick([0, 0, 180, 10, -10]), label: fromR ? '?' : L(D) } };
      try {
        if (rng.chance(0.35)) {
          const strip = (x) => ({ ...x, text: x.text.replace(` ${unit}`, '') });
          const tm = typedMisconceptions(fmtLen(ans), distractors.map(strip), { code: 'CIRC-DIAM-FOR-RAD', why: 'The diameter is twice the radius; the radius is half the diameter.' });
          return { type: 'numeric', prompt: `${prompt} Give your answer in ${unit}.`, answer: numericAnswer(ans, [fmtLen(ans), L(ans)]), solution, ...tm, ...(compasses ? {} : { diagram }) };
        }
        return { type: 'mcq', prompt, ...choices(rng, L(ans), distractors, (i) => nearFor(prompt)(L(ans + (i % 2 ? 1 : -1) * Math.ceil(i / 2)), 'Diameter = 2 x radius.')), solution, ...(compasses ? {} : { diagram }) };
      } catch { /* draw again */ }
    }
    throw new Error('no question');
  },
};

// ---------------------------------------------------------------- g05 types of angle

const typeOf = (a) => (a < 90 ? 'acute' : a === 90 ? 'right' : a < 180 ? 'obtuse' : a === 180 ? 'straight' : 'reflex');
const RULE = { acute: 'Acute angles are less than 90°.', right: 'A right angle is exactly 90°.', obtuse: 'Obtuse angles are between 90° and 180°.', straight: 'A straight angle is exactly 180°.', reflex: 'Reflex angles are between 180° and 360°.' };
/** Types a misconception could give for an angle. */
function misTypes(code, a) {
  const t = typeOf(a);
  if (code === 'ANG-ACUTE-OBTUSE') return t === 'acute' ? ['obtuse'] : t === 'obtuse' ? ['acute'] : [];
  if (code === 'ANG-OBTUSE-REFLEX') return t === 'obtuse' ? ['reflex'] : t === 'reflex' ? ['obtuse'] : [];
  if (code === 'ANG-OTHER-SIDE') return a === 180 ? [] : [typeOf(360 - a)];
  if (code === 'ANG-TYPE-BOUNDARY') {
    if (a === 90) return ['acute', 'obtuse'];
    if (a === 180) return ['obtuse', 'reflex'];
    if (a >= 85 && a <= 95) return ['right'];
    if (a >= 175 && a <= 185) return ['straight'];
  }
  return [];
}
const MIS_WHY = {
  'ANG-ACUTE-OBTUSE': (a, w) => `${deg(a)} is ${a < 90 ? 'less' : 'more'} than a right angle, so it is not ${w}. ${RULE[typeOf(a)]}`,
  'ANG-OBTUSE-REFLEX': (a, w) => `${deg(a)} is ${a < 180 ? 'less' : 'more'} than a straight line (180°), so it is not ${w}. ${RULE[typeOf(a)]}`,
  'ANG-OTHER-SIDE': (a, w) => `${w[0].toUpperCase()}${w.slice(1)} describes the angle on the OTHER side of the arms (${360 - a}°). The angle marked is ${deg(a)}.`,
  'ANG-TYPE-BOUNDARY': (a, w) => `${deg(a)} is ${a === 90 || a === 180 ? 'exactly' : 'close to'} ${a <= 135 ? '90°' : '180°'}, but it is not ${w}. ${RULE[typeOf(a)]}`,
};
const CODES_T = ['ANG-TYPE-BOUNDARY', 'ANG-ACUTE-OBTUSE', 'ANG-OBTUSE-REFLEX', 'ANG-OTHER-SIDE'];

const angleType = {
  id: 'm03.angle-type', topicId: T, subtopicId: 'm03-s3', skill: SK.types,
  title: 'Name the type of an angle (D1, with a drawing); pick the angle of a given type from a list (D2)',
  difficulties: [1, 2],
  check: {},
  make(rng, d) {
    for (let t = 0; t < 300; t++) {
      if (d === 1) {
        // at least 15° from 0° and 360°, so the drawing is clear (CLO review m03 item 8)
        const a = rng.pick([rng.int(15, 345), rng.int(15, 345), rng.pick([90, 180, rng.int(84, 96), rng.int(174, 186)])]);
        const ty = typeOf(a);
        const distractors = [];
        for (const code of CODES_T) for (const w of misTypes(code, a)) if (w !== ty) distractors.push({ text: w, code, why: MIS_WHY[code](a, w) });
        const turn = rng.pick([0, 0, 15, 30, -20, 45, 90, 120]);
        const diagram = { type: 'angle', rays: [turn, turn + a], arcs: [a === 90 ? { from: turn, to: turn + a, right: true, label: '90°' } : { from: turn, to: turn + a, label: deg(a) }] };
        const prompt = `An angle measures ${deg(a)}, as shown in the diagram. What type of angle is it?`;
        const solution = `${RULE[ty]} ${deg(a)} is ${ty === 'right' || ty === 'straight' ? `exactly ${a === 90 ? '90°' : '180°'}` : ty === 'acute' ? 'less than 90°' : ty === 'obtuse' ? 'between 90° and 180°' : 'between 180° and 360°'}, so it is ${ty === 'acute' || ty === 'obtuse' ? 'an' : 'a'} ${ty} angle. Answer: ${ty}`;
        try {
          // only named misconceptions: 3 or 4 options
          return { type: 'mcq', prompt, ...choices(rng, ty, rng.shuffle(distractors), null, Math.min(4, Math.max(3, distractors.length + 1))), solution, diagram };
        } catch { continue; }
      }
      const target = rng.pick(['acute', 'obtuse', 'reflex']);
      const lo = { acute: 1, obtuse: 91, reflex: 181 }[target]; const hi = { acute: 89, obtuse: 179, reflex: 359 }[target];
      const ans = rng.pick([rng.int(lo, hi), rng.int(lo, hi), target === 'acute' ? rng.int(80, 89) : target === 'obtuse' ? rng.pick([rng.int(91, 99), rng.int(170, 179)]) : rng.int(181, 199)]);
      // candidate wrong angles: each is called `target` by one misconception
      const cands = [];
      const add = (a, code) => { if (a > 0 && a < 360 && typeOf(a) !== target && misTypes(code, a).includes(target)) cands.push({ a, code }); };
      add(target === 'acute' ? 90 : target === 'obtuse' ? rng.pick([90, 180]) : 180, 'ANG-TYPE-BOUNDARY');
      add(target === 'acute' ? rng.int(91, 95) : target === 'obtuse' ? rng.pick([rng.int(85, 89), rng.int(181, 185)]) : rng.int(175, 179), 'ANG-TYPE-BOUNDARY');
      if (target === 'acute') add(rng.int(100, 175), 'ANG-ACUTE-OBTUSE');
      if (target === 'obtuse') { add(rng.int(10, 80), 'ANG-ACUTE-OBTUSE'); add(rng.int(190, 340), 'ANG-OBTUSE-REFLEX'); }
      if (target === 'reflex') { add(rng.int(100, 170), 'ANG-OBTUSE-REFLEX'); add(rng.int(10, 170), 'ANG-OTHER-SIDE'); }
      if (target === 'acute') add(rng.int(275, 355), 'ANG-OTHER-SIDE');
      const uniq = [];
      for (const c of rng.shuffle(cands)) if (!uniq.some((u) => u.a === c.a) && c.a !== ans) uniq.push(c);
      if (uniq.length < 3) continue;
      const picked = uniq.slice(0, 3);
      const vals = rng.shuffle([ans, ...picked.map((c) => c.a)]);
      const who = person(rng);
      const prompt = `${who.name} measures four angles: ${vals.slice(0, 3).map(deg).join(', ')} and ${deg(vals[3])}. Which of them is ${target === 'acute' ? 'an acute' : `${target === 'obtuse' ? 'an obtuse' : 'a reflex'}`} angle?`;
      const solution = `${RULE[target]} ${vals.map((v) => `${deg(v)} is ${typeOf(v)}`).join('; ')}. Answer: ${deg(ans)}`;
      const distractors = picked.map((c) => ({ text: deg(c.a), code: c.code, why: MIS_WHY[c.code](c.a, target) }));
      try { return { type: 'mcq', prompt, ...choices(rng, deg(ans), distractors, null), solution }; } catch { /* draw again */ }
    }
    throw new Error('no question');
  },
};

// ---------------------------------------------------------------- g01 angles on a straight line

const straightLine = {
  id: 'm03.angles-straight-line', topicId: T, subtopicId: 'm03-s3', skill: SK.line,
  title: 'Angles on a straight line: two angles (D1), three angles (D2), equal or related angles (D3)',
  difficulties: [1, 2, 3],
  check: { min: 1, max: 360, integer: true },
  make(rng, d) {
    for (let t = 0; t < 300; t++) {
      const turn = rng.pick([0, 0, 0, 10, -10, 20, -20]);
      let parts; let labels; let ans; let prompt; let solution; let distractors;
      if (d === 1) {
        const a = rng.int(15, 165); ans = 180 - a;
        if (ans < 15 || a === 90) continue;
        const unkFirst = rng.chance(0.5);
        parts = unkFirst ? [ans, a] : [a, ans]; labels = unkFirst ? ['?', deg(a)] : [deg(a), '?'];
        prompt = `Two angles sit next to each other on a straight line, as shown. One of them is ${deg(a)}. What is the size of the other angle?`;
        solution = `Angles on a straight line add up to 180°. 180 - ${a} = ${ans}. Answer: ${deg(ans)}`;
        distractors = [
          { text: deg(360 - a), code: 'ANG-180-360-SWAP', why: `You used 360°. Angles on a straight line add up to 180°, because a straight line is a half turn.` },
          a < 90 ? { text: deg(90 - a), code: 'ANG-USES-90', why: `You took ${a} from 90. The line is straight, so the angles add up to 180°, not 90°.` } : null,
          { text: deg(a), code: 'ANG-ASSUME-EQUAL', why: 'The two angles are not marked as equal. Work it out: they add up to 180°.' },
        ];
      } else if (d === 2) {
        const a = rng.int(15, 120); const b = rng.int(15, 150 - a); ans = 180 - a - b;
        if (ans < 15 || a === b) continue;
        const pos = rng.int(0, 2);
        parts = [a, b]; parts.splice(pos, 0, ans);
        labels = parts.map((p, i) => (i === pos ? '?' : deg(p)));
        prompt = `Three angles sit side by side on a straight line, as shown. Two of them are ${deg(a)} and ${deg(b)}. What is the size of the third angle?`;
        solution = `Angles on a straight line add up to 180°. ${a} + ${b} = ${a + b}. 180 - ${a + b} = ${ans}. Answer: ${deg(ans)}`;
        distractors = [
          { text: deg(360 - a - b), code: 'ANG-180-360-SWAP', why: `You used 360°. Angles on a straight line add up to 180°: 180 - ${a + b} = ${ans}.` },
          { text: deg(a + b), code: 'ANG-SUM-NOT-SUBTRACT', why: `You added the two angles (${a + b}°) but did not take the total away from 180°.` },
          { text: deg(180 - a), code: 'ANG-ONE-ANGLE-ONLY', why: `You took away only ${deg(a)}. Both given angles are on the line: 180 - ${a} - ${b}.` },
          { text: deg(180 - b), code: 'ANG-ONE-ANGLE-ONLY', why: `You took away only ${deg(b)}. Both given angles are on the line: 180 - ${a} - ${b}.` },
        ];
      } else {
        const kind = rng.pick(['equal', 'equal', 'twice', 'more', 'more']); // fewer "twice" (CLO review m03 item 5)
        const vName = rng.pick(['x', 'y', 'p', 'a']);
        if (kind === 'equal') {
          const k = rng.int(2, 3); const g = rng.int(20, 120); ans = (180 - g) / k;
          if (!Number.isInteger(ans) || ans < 15) continue;
          parts = [g, ...Array(k).fill(ans)]; labels = [deg(g), ...Array(k).fill(vName)];
          if (rng.chance(0.5)) { parts.reverse(); labels.reverse(); }
          prompt = `An angle of ${deg(g)} and ${WORD[k]} equal angles, each marked ${vName}, sit side by side on a straight line. What is the size of ${vName}?`;
          solution = `Angles on a straight line add up to 180°. 180 - ${g} = ${180 - g}. The ${WORD[k]} equal angles share this: ${180 - g} ÷ ${k} = ${ans}. Check: ${g} + ${Array(k).fill(ans).join(' + ')} = 180. Answer: ${deg(ans)}`;
          distractors = [
            { text: deg(180 - g), code: 'ANG-NO-SHARE', why: `${180 - g}° is what is left for ${k === 2 ? 'both' : `all ${WORD[k]}`} equal angles together. Share it: ${180 - g} ÷ ${k}.` },
            (360 - g) % k === 0 ? { text: deg((360 - g) / k), code: 'ANG-180-360-SWAP', why: 'You used 360°. Angles on a straight line add up to 180°.' } : null,
            (180 - g) % (k + 1) === 0 ? { text: deg((180 - g) / (k + 1)), code: 'ANG-SPLIT-WRONG', why: `There are ${WORD[k]} equal angles, so share ${180 - g}° between ${k}, not ${k + 1}.` } : null,
            k === 3 && (180 - g) % 2 === 0 ? { text: deg((180 - g) / 2), code: 'ANG-SPLIT-WRONG', why: `There are 3 equal angles, so share ${180 - g}° between 3, not 2.` } : null,
            180 % (k + 1) === 0 ? { text: deg(180 / (k + 1)), code: 'ANG-ALL-EQUAL', why: `That would be true only if all ${WORD[k + 1]} angles were equal. The ${deg(g)} angle is different.` } : null,
          ];
        } else {
          const a = rng.int(15, 70);
          const extra = kind === 'twice' ? 0 : rng.int(5, 40);
          const b = kind === 'twice' ? 2 * a : a + extra;
          ans = 180 - a - b;
          if (ans < 15) continue;
          parts = [a, b, ans]; labels = [deg(a), 'b', '?'];
          if (rng.chance(0.5)) { parts.reverse(); labels.reverse(); }
          prompt = `Three angles, a, b and c, sit side by side on a straight line, as shown. Angle a is ${deg(a)}. Angle b is ${kind === 'twice' ? 'twice the size of angle a' : `${extra}° more than angle a`}. What is the size of angle c?`;
          solution = `b = ${kind === 'twice' ? `2 x ${a}` : `${a} + ${extra}`} = ${b}°. a + b = ${a} + ${b} = ${a + b}°. Angles on a straight line add up to 180°, so c = 180 - ${a + b} = ${ans}°. Answer: ${deg(ans)}`;
          distractors = [
            { text: deg(180 - 2 * a), code: 'ANG-ASSUME-EQUAL', why: `It looks like you made b the same as a (${a}°). Angle b is ${kind === 'twice' ? 'twice' : `${extra}° more than`} a, so b = ${b}°.` },
            { text: deg(b), code: 'ANG-WRONG-UNKNOWN', why: `${b}° is angle b. The question asks for angle c.` },
            { text: deg(180 - b), code: 'ANG-ONE-ANGLE-ONLY', why: `You took away only angle b. Both a and b are on the line: 180 - ${a} - ${b}.` },
            { text: deg(180 - a), code: 'ANG-ONE-ANGLE-ONLY', why: `You took away only angle a. Both a and b are on the line: 180 - ${a} - ${b}.` },
          ];
          labels = labels.map((l) => (l === 'b' ? 'b' : l));
        }
      }
      // the drawing: a straight line with rays between the angles, drawn true
      const rays = []; const arcs = []; let at = turn;
      parts.forEach((p, i) => {
        arcs.push({ from: at, to: at + p, label: labels[i], ...(p === 90 ? { right: true } : {}) });
        at += p;
        if (i < parts.length - 1) rays.push(at);
      });
      const diagram = { type: 'angle', lines: [turn], rays, arcs, alt: `A straight line with ${parts.length} angles side by side on it, labelled ${labels.join(', ')}.` };
      try {
        if (d !== 3 && rng.chance(0.35)) {
          const tm = typedMisconceptions(String(ans), distractors.filter(Boolean).map((x) => ({ ...x, text: x.text.replace('°', '') })), { code: 'ANG-180-360-SWAP', why: 'Angles on a straight line add up to 180°.' });
          return { type: 'numeric', prompt: `${prompt} Give your answer in degrees.`, answer: numDeg(ans), solution, ...tm, diagram };
        }
        return { type: 'mcq', prompt, ...choices(rng, deg(ans), distractors, nearDeg(prompt, ans, 'Angles on a straight line add up to 180°.')), solution, diagram, marks: d === 3 ? 2 : 1 };
      } catch { /* draw again */ }
    }
    throw new Error('no question');
  },
};

// ---------------------------------------------------------------- g02 angles around a point

const aroundPoint = {
  id: 'm03.angles-at-point', topicId: T, subtopicId: 'm03-s3', skill: SK.point,
  title: 'Angles around a point: 2-3 given angles (D2), equal unknown angles (D3)',
  difficulties: [2, 3],
  check: { min: 1, max: 360, integer: true },
  make(rng, d) {
    for (let t = 0; t < 300; t++) {
      let parts; let labels; let ans; let prompt; let solution; let distractors;
      if (d === 2) {
        const nGiven = rng.int(2, 3);
        const given = [];
        for (let i = 0; i < nGiven; i++) given.push(rng.int(30, 160));
        const sum = given.reduce((s, v) => s + v, 0);
        ans = 360 - sum;
        if (ans < 25 || ans > 300 || new Set(given).size < nGiven) continue;
        const pos = rng.int(0, nGiven);
        parts = given.slice(); parts.splice(pos, 0, ans);
        labels = parts.map((p, i) => (i === pos ? '?' : deg(p)));
        prompt = `${Cap(WORD[nGiven + 1])} angles meet at a point, as shown. ${nGiven === 2 ? 'Two' : 'Three'} of them are ${given.slice(0, -1).map(deg).join(', ')} and ${deg(given[nGiven - 1])}. What is the size of the other angle?`;
        solution = `Angles around a point add up to 360°. ${sumText(given)} = ${sum}. 360 - ${sum} = ${ans}. Answer: ${deg(ans)}`;
        distractors = [
          sum < 180 ? { text: deg(180 - sum), code: 'ANG-180-360-SWAP', why: 'You used 180° (a straight line). Angles around a point make a full turn, so they add up to 360°.' } : null,
          { text: deg(sum), code: 'ANG-SUM-NOT-SUBTRACT', why: `You added the given angles (${sum}°) but did not take the total away from 360°.` },
          { text: deg(360 - given[0]), code: 'ANG-ONE-ANGLE-ONLY', why: `You took away only ${deg(given[0])}. Take away all the given angles: 360 - ${sum}.` },
          { text: deg(360 - given[nGiven - 1]), code: 'ANG-ONE-ANGLE-ONLY', why: `You took away only ${deg(given[nGiven - 1])}. Take away all the given angles: 360 - ${sum}.` },
        ];
      } else {
        const k = rng.int(2, 4); const g = rng.int(40, 190);
        ans = (360 - g) / k;
        if (!Number.isInteger(ans) || ans < 25 || ans > 170) continue;
        const v = rng.pick(['x', 'y', 'p', 'w']);
        parts = [g, ...Array(k).fill(ans)]; labels = [deg(g), ...Array(k).fill(v)];
        prompt = `${Cap(WORD[k + 1])} angles meet at a point. One of them is ${deg(g)} and the other ${WORD[k]} are equal, each marked ${v}. What is the size of ${v}?`;
        solution = `Angles around a point add up to 360°. 360 - ${g} = ${360 - g}. The ${WORD[k]} equal angles share this: ${360 - g} ÷ ${k} = ${ans}. Check: ${g} + ${Array(k).fill(ans).join(' + ')} = 360. Answer: ${deg(ans)}`;
        distractors = [
          { text: deg(360 - g), code: 'ANG-NO-SHARE', why: `${360 - g}° is the total for ${k === 2 ? 'both' : `all ${WORD[k]}`} equal angles. Share it: ${360 - g} ÷ ${k}.` },
          g < 180 && (180 - g) % k === 0 ? { text: deg((180 - g) / k), code: 'ANG-180-360-SWAP', why: 'You used 180°. Angles around a point add up to 360°, a full turn.' } : null,
          (360 - g) % (k + 1) === 0 ? { text: deg((360 - g) / (k + 1)), code: 'ANG-SPLIT-WRONG', why: `There are ${WORD[k]} equal angles, not ${WORD[k + 1]}. Share ${360 - g}° between ${k}.` } : null,
          360 % (k + 1) === 0 ? { text: deg(360 / (k + 1)), code: 'ANG-ALL-EQUAL', why: `That would be true only if all ${WORD[k + 1]} angles were equal. The ${deg(g)} angle is different.` } : null,
        ];
      }
      const turn = rng.int(0, 35);
      const rays = []; const arcs = []; let at = turn;
      parts.forEach((p, i) => { rays.push(at); arcs.push({ from: at, to: at + p, label: labels[i], ...(p === 90 ? { right: true } : {}) }); at += p; });
      const diagram = { type: 'angle', rays, arcs, alt: `${parts.length} angles round a point, labelled ${labels.join(', ')}.` };
      try {
        if (d === 2 && rng.chance(0.35)) {
          const tm = typedMisconceptions(String(ans), distractors.filter(Boolean).map((x) => ({ ...x, text: x.text.replace('°', '') })), { code: 'ANG-180-360-SWAP', why: 'Angles around a point add up to 360°.' });
          return { type: 'numeric', prompt: `${prompt} Give your answer in degrees.`, answer: numDeg(ans), solution, ...tm, diagram };
        }
        return { type: 'mcq', prompt, ...choices(rng, deg(ans), distractors, nearDeg(prompt, ans, 'Angles around a point add up to 360°.')), solution, diagram, marks: d === 3 ? 2 : 1 };
      } catch { /* draw again */ }
    }
    throw new Error('no question');
  },
};

// ---------------------------------------------------------------- g06 reading a protractor

const protractor = {
  id: 'm03.protractor', topicId: T, subtopicId: 'm03-s3', skill: SK.protractor,
  title: 'Read an angle on a protractor (D1 multiples of 5, D2 any whole degree)',
  difficulties: [1, 2],
  check: { min: 1, max: 360, integer: true },
  make(rng, d) {
    for (let t = 0; t < 200; t++) {
      const a = d === 1 ? 5 * rng.int(2, 34) : rng.int(8, 172);
      if (a === 90 || (d === 2 && a % 5 === 0)) continue;
      const fromRight = rng.chance(0.5);
      const [V, R1, R2] = rng.pick([['O', 'A', 'B'], ['O', 'P', 'Q'], ['V', 'X', 'Y'], ['O', 'M', 'N'], ['B', 'A', 'C'], ['Q', 'P', 'R']]);
      const rays = fromRight ? [0, a] : [180, 180 - a];
      const diagram = { type: 'angle', rays, protractor: true, vertexLabel: V, rayLabels: [R1, R2] };
      const scale = fromRight ? 'inner' : 'outer';
      const prompt = `A protractor is placed on angle ${R1}${V}${R2}, as shown. What is the size of angle ${R1}${V}${R2}?`;
      const solution = `The arm ${V}${R1} lies along the ${fromRight ? 'right' : 'left'}-hand zero line, so read the scale that starts at 0 on that side (the ${scale} scale). The other arm crosses it at ${a}. The angle is ${a < 90 ? 'acute (less than 90°)' : 'obtuse (more than 90°)'}, which fits. Answer: ${deg(a)}`;
      const distractors = [
        { text: deg(180 - a), code: 'ANG-PROTRACTOR-SCALE', why: `You read the wrong scale. Start from the 0 on the arm ${V}${R1}. The angle is ${a < 90 ? 'smaller' : 'bigger'} than a right angle, so it must be ${a < 90 ? 'less' : 'more'} than 90°.` },
        { text: deg(360 - a), code: 'ANG-REFLEX-OUTSIDE', why: `That is the reflex angle on the outside of the arms (360 - ${a}). The protractor measures the angle between the arms.` },
        a < 90 ? { text: deg(90 - a), code: 'ANG-USES-90', why: `You counted from 90. Count from the 0 on the arm ${V}${R1}.` } : { text: deg(a - 90), code: 'ANG-USES-90', why: `You counted from the 90 mark. Count from the 0 on the arm ${V}${R1}: the angle is more than a right angle.` },
      ];
      try {
        return { type: 'mcq', prompt, ...choices(rng, deg(a), distractors, nearDeg(prompt, a, 'Count along the scale that starts at 0 on the first arm.', d === 1 ? 10 : 5)), solution, diagram, marks: 1 };
      } catch { /* draw again */ }
    }
    throw new Error('no question');
  },
};

// ---------------------------------------------------------------- g03 missing angle in a triangle

const triangleAngle = {
  id: 'm03.triangle-angle', topicId: T, subtopicId: 'm03-s4', skill: SK.triangle,
  title: 'Third angle of a triangle (D1), right-angled or larger angles (D2), related angles (D3)',
  difficulties: [1, 2, 3],
  check: { min: 1, max: 360, integer: true },
  make(rng, d) {
    for (let t = 0; t < 300; t++) {
      const names = rng.pick(LETTERS3);
      let A; let B; let Cc; let labels; let prompt; let solution; let distractors; let ans; let right = -1;
      if (d === 1 || (d === 2 && rng.chance(0.5))) {
        if (d === 1) { A = 5 * rng.int(5, 24); B = 5 * rng.int(5, 24); } else { A = rng.int(25, 120); B = rng.int(25, 120); }
        Cc = 180 - A - B; ans = Cc;
        // every angle at least 25° so the drawing has room for its labels
        if (Cc < 25 || A === B || A === Cc || B === Cc || A === 90 || B === 90 || Cc === 90) continue;
        labels = [deg(A), deg(B), '?'];
        prompt = `In the diagram, two angles of triangle ${names} are ${deg(A)} and ${deg(B)}. What is the size of the third angle?`;
        solution = `The angles in a triangle add up to 180°. ${A} + ${B} = ${A + B}. 180 - ${A + B} = ${ans}. Answer: ${deg(ans)}`;
        distractors = [
          { text: deg(360 - A - B), code: 'ANG-180-360-SWAP', why: `You used 360°. The angles in a triangle add up to 180°, so ${360 - A - B}° is impossible here.` },
          { text: deg(A + B), code: 'ANG-SUM-NOT-SUBTRACT', why: `You added the two angles (${A + B}°) but did not take the total away from 180°.` },
          { text: deg(180 - A), code: 'ANG-ONE-ANGLE-ONLY', why: `You took away only ${deg(A)}. Take away both angles: 180 - ${A} - ${B}.` },
          A < 90 ? { text: deg(90 - A), code: 'ANG-USES-90', why: `You took ${A} from 90. The triangle has no right angle; the angles add up to 180°.` } : null,
        ];
      } else if (d === 2) {
        A = rng.int(25, 65); B = 90; Cc = 90 - A; ans = Cc; right = 1;
        if (A === 45) continue;
        labels = [deg(A), '', '?'];
        prompt = `Triangle ${names}, shown in the diagram, has a right angle at ${names[1]}. Angle ${names[0]} is ${deg(A)}. What is the size of angle ${names[2]}?`;
        solution = `The angles add up to 180° and the right angle is 90°. 90 + ${A} = ${90 + A}. 180 - ${90 + A} = ${ans}. Answer: ${deg(ans)}`;
        distractors = [
          { text: deg(180 - A), code: 'ANG-FORGETS-RIGHT', why: `You worked out 180 - ${A} but forgot the right angle (90°) is also in the triangle.` },
          { text: deg(45), code: 'ANG-ASSUME-EQUAL', why: 'You assumed the two smaller angles are equal. That only happens when the triangle is isosceles.' },
          { text: deg(360 - 90 - A), code: 'ANG-180-360-SWAP', why: 'You used 360°. The angles in a triangle add up to 180°.' },
        ];
      } else {
        const kind = rng.pick(['twice', 'more']);
        Cc = rng.int(30, 110);
        const rest = 180 - Cc;
        let Bv; let Av; let extra = 0;
        if (kind === 'twice') { if (rest % 3) continue; Bv = rest / 3; Av = 2 * Bv; } else { extra = rng.int(6, 40); if ((rest - extra) % 2) continue; Bv = (rest - extra) / 2; Av = Bv + extra; }
        // the answer (and the other unknown) must differ from the given angle, so copying it never
        // earns the mark (CLO review m03 item 2)
        if (Bv < 25 || Cc < 25 || Bv === Cc || Av === Cc) continue;
        A = Av; B = Bv; ans = Bv;
        labels = ['', '?', deg(Cc)];
        prompt = `In the triangle ${names} shown, angle ${names[2]} is ${deg(Cc)}. Angle ${names[0]} is ${kind === 'twice' ? `twice the size of angle ${names[1]}` : `${extra}° more than angle ${names[1]}`}. What is the size of angle ${names[1]}?`;
        solution = kind === 'twice'
          ? `${names[0]} + ${names[1]} = 180 - ${Cc} = ${rest}°. Think of ${names[1]} as 1 part and ${names[0]} as 2 parts: 3 parts = ${rest}°, so 1 part = ${rest} ÷ 3 = ${Bv}°. Check: ${Bv} + ${Av} + ${Cc} = 180. Answer: ${deg(Bv)}`
          : `${names[0]} + ${names[1]} = 180 - ${Cc} = ${rest}°. Take away the extra ${extra}°: ${rest} - ${extra} = ${rest - extra}, which is two equal parts, so ${names[1]} = ${rest - extra} ÷ 2 = ${Bv}°. Check: ${Bv} + ${Av} + ${Cc} = 180. Answer: ${deg(Bv)}`;
        distractors = [
          { text: deg(rest / 2), code: 'ANG-ASSUME-EQUAL', why: `Halving ${rest}° treats ${names[0]} and ${names[1]} as equal. ${names[0]} is ${kind === 'twice' ? 'twice' : `${extra}° more than`} ${names[1]}.` },
          { text: deg(Av), code: 'ANG-WRONG-UNKNOWN', why: `${Av}° is angle ${names[0]}. The question asks for angle ${names[1]}.` },
          { text: deg(rest), code: 'ANG-NO-SHARE', why: `${rest}° is ${names[0]} and ${names[1]} together. Split it into the two angles.` },
        ];
      }
      const pts = triangle(rng, A, B);
      const angles = labels.map((l, i) => (i === right ? { right: true } : l ? { label: l } : null));
      const diagram = { type: 'polygon', points: pts, vertexLabels: names.split(''), angles };
      try {
        if (d === 1 && rng.chance(0.35)) {
          const tm = typedMisconceptions(String(ans), distractors.filter(Boolean).map((x) => ({ ...x, text: x.text.replace('°', '') })), { code: 'ANG-180-360-SWAP', why: 'The three angles of a triangle add up to 180°.' });
          return { type: 'numeric', prompt: `${prompt} Give your answer in degrees.`, answer: numDeg(ans), solution, ...tm, diagram };
        }
        return { type: 'mcq', prompt, ...choices(rng, deg(ans), distractors, nearDeg(prompt, ans, 'The angles in a triangle add up to 180°.')), solution, diagram, marks: d === 3 ? 2 : 1 };
      } catch { /* draw again */ }
    }
    throw new Error('no question');
  },
};

// ---------------------------------------------------------------- g04 isosceles and right-angled triangles

const special = {
  id: 'm03.special-triangle', topicId: T, subtopicId: 'm03-s4', skill: SK.special,
  title: 'Isosceles triangles: from the apex angle (D1), from a base angle (D2), from a relation between them (D3)',
  difficulties: [1, 2, 3],
  check: { min: 1, max: 360, maxDp: 1 },
  make(rng, d) {
    for (let t = 0; t < 300; t++) {
      const names = rng.pick(LETTERS3);
      const [P, Q, R] = names.split(''); // R is the apex, between the equal sides R-P and R-Q
      let base; let apex; let ans; let prompt; let solution; let distractors; let labels;
      if (d === 1) {
        // D1: the given angle a multiple of 10, so the two steps are easy sums (CLO review m03 item 7)
        apex = 10 * rng.int(2, 14); base = (180 - apex) / 2; ans = base;
        if (apex === 60) continue;
        labels = ['?', null, deg(apex)];
        prompt = `Triangle ${names} in the diagram is isosceles, with ${R}${P} = ${R}${Q}. The angle between the equal sides, angle ${R}, is ${deg(apex)}. What is the size of angle ${P}?`;
        solution = `The angles opposite the equal sides are equal, so angle ${P} = angle ${Q}. 180 - ${apex} = ${180 - apex}. ${180 - apex} ÷ 2 = ${base}. Check: ${apex} + ${base} + ${base} = 180. Answer: ${deg(base)}`;
        distractors = [
          { text: deg(180 - apex), code: 'ANG-NO-SHARE', why: `You found 180 - ${apex} = ${180 - apex} but forgot that this is shared between the two equal angles.` },
          { text: deg(apex), code: 'ANG-COPY-GIVEN', why: `${deg(apex)} is angle ${R}, the angle you were given. The question asks for angle ${P}: share what is left of 180° between the two equal angles.` },
          180 - 2 * apex > 0 ? { text: deg(180 - 2 * apex), code: 'ANG-ISO-WRONG-PAIR', why: `You treated ${deg(apex)} as one of the two equal angles. It is the angle BETWEEN the equal sides, the odd one out.` } : null,
          { text: deg(60), code: 'ANG-ALL-EQUAL', why: 'Only an equilateral triangle has three 60° angles. Use the angle you are given.' },
        ];
      } else if (d === 2) {
        base = rng.int(25, 77); apex = 180 - 2 * base; ans = apex;
        if (base === 60 || base === 45) continue;
        labels = [deg(base), null, '?'];
        prompt = `Triangle ${names} in the diagram is isosceles, with ${R}${P} = ${R}${Q}. Angle ${P} is ${deg(base)}. What is the size of angle ${R}?`;
        solution = `${R}${P} = ${R}${Q}, so the angles at ${P} and ${Q} are equal: both ${deg(base)}. ${base} + ${base} = ${2 * base}. 180 - ${2 * base} = ${apex}. Answer: ${deg(apex)}`;
        distractors = [
          { text: deg((180 - base) / 2), code: 'ANG-ISO-WRONG-PAIR', why: `You treated ${deg(base)} as the odd angle and shared the rest: (180 - ${base}) ÷ 2. But ${P} is one of the two EQUAL angles, so there are two ${deg(base)} angles.` },
          { text: deg(180 - base), code: 'ANG-ONE-ANGLE-ONLY', why: `You took away only one ${deg(base)} angle. There are two equal angles of ${deg(base)}: 180 - ${base} - ${base}.` },
          { text: deg(base), code: 'ANG-COPY-GIVEN', why: `${deg(base)} is angle ${P}, the angle you were given. The question asks for angle ${R}: 180 - ${base} - ${base}.` },
        ];
      } else {
        const kind = rng.pick(['apexMore', 'baseMore', 'times']);
        let rel;
        if (kind === 'times') {
          const k = rng.pick([2, 3, 4]); base = 180 / (k + 2); apex = k * base;
          rel = `angle ${R} is ${k === 2 ? 'twice' : k === 3 ? 'three times' : 'four times'} the size of angle ${P}`;
        } else {
          const dd = 3 * rng.int(2, 20);
          if (kind === 'apexMore') { base = (180 - dd) / 3; apex = base + dd; rel = `angle ${R} is ${dd}° more than angle ${P}`; } else { apex = (180 - 2 * dd) / 3; base = apex + dd; rel = `angle ${P} is ${dd}° more than angle ${R}`; }
          if (!Number.isInteger(base) || !Number.isInteger(apex) || apex < 25 || base < 25) continue;
        }
        const askApex = rng.chance(0.5);
        ans = askApex ? apex : base;
        labels = askApex ? [null, null, '?'] : ['?', null, null];
        prompt = `Triangle ${names} in the diagram is isosceles, with ${R}${P} = ${R}${Q}. ${rel[0].toUpperCase()}${rel.slice(1)}. What is the size of angle ${askApex ? R : P}?`;
        const parts = kind === 'times' ? `Angles ${P} and ${Q} are equal; call each 1 part. Then angle ${R} is ${apex / base} parts, and the triangle has ${apex / base + 2} parts = 180°. 1 part = 180 ÷ ${apex / base + 2} = ${base}°, so ${P} = ${base}° and ${R} = ${apex}°.`
          : kind === 'apexMore' ? `${P} and ${Q} are equal. If each is one part, ${R} is one part + ${apex - base}°. Three parts + ${apex - base} = 180, so 3 parts = ${180 - (apex - base)} and 1 part = ${base}°. ${R} = ${base} + ${apex - base} = ${apex}°.`
            : `${P} and ${Q} are equal, each ${base - apex}° more than ${R}. Three equal parts + ${2 * (base - apex)} = 180, so 3 parts = ${180 - 2 * (base - apex)} and ${R} = ${apex}°. ${P} = ${apex} + ${base - apex} = ${base}°.`;
        solution = `${parts} Check: ${apex} + ${base} + ${base} = 180. Answer: ${deg(ans)}`;
        const other = askApex ? base : apex;
        distractors = [
          { text: deg(other), code: 'ANG-WRONG-UNKNOWN', why: `${deg(other)} is angle ${askApex ? P : R}. The question asks for angle ${askApex ? R : P}.` },
          kind !== 'times' ? { text: deg((180 - Math.abs(apex - base)) / 2), code: 'ANG-SPLIT-WRONG', why: `There are THREE angles: two equal ones and one different one. Share between three parts, not two.` } : { text: deg(180 / (apex / base + 1)), code: 'ANG-SPLIT-WRONG', why: `Count the parts again: ${P} and ${Q} are 1 part each, and ${R} is ${apex / base} parts, so ${apex / base + 2} parts in all.` },
          { text: deg(60), code: 'ANG-ALL-EQUAL', why: 'All three angles are 60° only in an equilateral triangle. Here the angles are different.' },
        ];
      }
      const pts = triangle(rng, base, base);
      const angles = [labels[0] ? { label: labels[0], arcs: 2 } : { arcs: 2 }, { arcs: 2 }, labels[2] ? { label: labels[2] } : null];
      const diagram = { type: 'polygon', points: pts, vertexLabels: [P, Q, R], angles, sides: [null, { ticks: 1 }, { ticks: 1 }] };
      try {
        return { type: 'mcq', prompt, ...choices(rng, deg(ans), distractors, nearDeg(prompt, ans, 'The two angles opposite the equal sides are equal; all three add up to 180°.')), solution, diagram, marks: d === 3 ? 2 : 1 };
      } catch { /* draw again */ }
    }
    throw new Error('no question');
  },
};

// ---------------------------------------------------------------- g07, g08 area of a right-angled triangle

const TRIPLES = [[3, 4, 5], [6, 8, 10], [5, 12, 13], [9, 12, 15], [8, 15, 17], [12, 16, 20]];
const sq = (u) => `${u}^2`;
const fmtA = (v) => (Number.isInteger(v) ? fmtInt(v) : String(v));
/** Right-angled triangle points, legs a (across) and b (up), right angle first; any orientation. */
function rightTri(rng, a, b) {
  const sx = rng.chance(0.5) ? 1 : -1; const sy = rng.chance(0.5) ? 1 : -1;
  return [[0, 0], [sx * a, 0], [0, sy * b]];
}

const areaRight = {
  id: 'm03.area-right-triangle', topicId: T, subtopicId: 'm03-s6', skill: SK.area,
  title: 'Area of a right-angled triangle (D1 whole areas; D2 any sides, a longest side given; D3 missing side from the area)',
  difficulties: [1, 2, 3],
  check: { min: 0, maxDp: 2 },
  make(rng, d) {
    const u = rng.pick(['cm', 'cm', 'm', 'mm']);
    const L = (v) => `${fmtA(v)} ${u}`; const A2 = (v) => `${fmtA(v)} ${sq(u)}`;
    for (let t = 0; t < 300; t++) {
      if (d === 3) {
        const a = rng.int(2, 15); const b = rng.int(2, 15);
        if (a === b || (a * b) % 2) continue;
        const area = (a * b) / 2;
        const prompt = `The right-angled triangle shown has an area of ${A2(area)}. One of the two sides that meet at the right angle is ${L(a)} long. How long is the other side that meets at the right angle?`;
        const solution = `The triangle is half of a rectangle, so the rectangle's area is ${fmtA(area)} x 2 = ${fmtA(2 * area)} ${sq(u)}. ${fmtA(2 * area)} ÷ ${a} = ${b}. Check: ${a} x ${b} ÷ 2 = ${fmtA(area)}. Answer: ${L(b)}`;
        const distractors = [
          (area / a) * 10 % 1 === 0 ? { text: L(area / a), code: 'AREA-TRI-NO-DOUBLE', why: `You did ${fmtA(area)} ÷ ${a} but forgot the triangle is only half a rectangle. Double the area first: ${fmtA(2 * area)} ÷ ${a} = ${b}.` } : null,
          { text: L(area * a), code: 'INVERSE-WRONG', why: `You multiplied ${fmtA(area)} by ${a}. To work backwards from an area, divide.` },
          { text: L(2 * area * a), code: 'INVERSE-WRONG', why: `You doubled the area correctly but then multiplied by ${a}. Divide by ${a} instead.` },
        ];
        const pts = rightTri(rng, a, b);
        const diagram = { type: 'polygon', points: pts, angles: [{ right: true }, null, null], sides: [{ label: L(a) }, null, { label: '?' }], shaded: true, caption: `Area = ${fmtA(area)} ${u}²` }; // the renderer does not turn ^2 into ² in captions
        try { return { type: 'mcq', prompt, ...choices(rng, L(b), distractors, (i) => nearFor(prompt)(L(b + (i % 2 ? 1 : -1) * Math.ceil(i / 2)), 'Double the area, then divide by the side you know.')), solution, diagram, marks: 2 }; } catch { continue; }
      }
      let a; let b; let c = null; let about = false;
      if (rng.chance(0.4)) { const tr = rng.pick(TRIPLES); [a, b, c] = rng.chance(0.5) ? tr : [tr[1], tr[0], tr[2]]; } else {
        a = rng.int(2, 20); b = rng.int(2, 20);
        if (a === b) continue;
        if (d === 1 && (a * b) % 2) continue;
        if (d === 2 && rng.chance(0.4)) { c = Math.round(Math.sqrt(a * a + b * b) * 10) / 10; about = true; }
      }
      if (d === 1 && (a > 12 || b > 12) && !c) continue;
      const area = (a * b) / 2;
      const prompt = `The right-angled triangle shown has two shorter sides of ${L(a)} and ${L(b)}, which meet at the right angle.${c ? ` Its longest side is ${about ? 'about ' : ''}${L(c)}.` : ''} What is its area?`;
      const solution = `Use the two sides that meet at the right angle. The triangle is half of a ${a} by ${b} rectangle: ${a} x ${b} = ${a * b}, and ${a * b} ÷ 2 = ${fmtA(area)} ${sq(u)}.${c ? ` The longest side (${fmtA(c)} ${u}) is not used.` : ''} Answer: ${A2(area)}`;
      const distractors = [
        { text: A2(a * b), code: 'AREA-TRI-NO-HALF', why: `You multiplied ${a} x ${b} but forgot to halve. ${a * b} ${sq(u)} is the area of the whole rectangle; the triangle is half of it.` },
        c ? { text: A2((Math.round(c * 10) * a) / 20), code: 'AREA-USES-HYPOT', why: `You used the longest side (${fmtA(c)} ${u}) with ${L(a)}. Use the two sides that meet at the right angle.` } : null,
        c ? { text: A2((Math.round(c * 10) * b) / 20), code: 'AREA-USES-HYPOT', why: `You used the longest side (${fmtA(c)} ${u}) with ${L(b)}. Use the two sides that meet at the right angle.` } : null,
        c && !about ? { text: A2(a + b + c), code: 'AREA-PERIM-SWAP', why: `${a + b + c} is the perimeter (all three sides added). The area is half of ${a} x ${b}.` } : null,
        { text: A2(a + b), code: 'AREA-ADDS-SIDES', why: `You added ${a} + ${b}. Area comes from multiplying: ${a} x ${b}, then halve.` },
      ];
      const pts = rightTri(rng, a, b);
      const diagram = { type: 'polygon', points: pts, angles: [{ right: true }, null, null], sides: [{ label: L(a) }, c ? { label: `${about ? 'about ' : ''}${L(c)}` } : null, { label: L(b) }], shaded: true };
      try {
        if (rng.chance(0.3)) {
          const tm = typedMisconceptions(fmtA(area), distractors.filter(Boolean).map((x) => ({ ...x, text: x.text.replace(` ${sq(u)}`, '') })), { code: 'AREA-TRI-NO-HALF', why: 'Multiply the two sides that meet at the right angle, then halve.' });
          return { type: 'numeric', prompt: `${prompt} Give your answer in ${sq(u)}.`, answer: numericAnswer(area, [fmtA(area), A2(area), `${fmtA(area)} ${u}²`]), solution, ...tm, diagram };
        }
        return { type: 'mcq', prompt, ...choices(rng, A2(area), distractors, (i) => nearFor(prompt)(A2(area + (i % 2 ? 1 : -1) * Math.ceil(i / 2)), 'Half of the two shorter sides multiplied together.')), solution, diagram };
      } catch { /* draw again */ }
    }
    throw new Error('no question');
  },
};

// ---------------------------------------------------------------- g09 compound shapes

const compound = {
  id: 'm03.compound-area', topicId: T, subtopicId: 'm03-s6', skill: SK.compound,
  title: 'Area of a rectangle with a right-angled triangle joined on (D2) or cut off a corner (D3)',
  difficulties: [2, 3],
  check: { min: 0, integer: true },
  make(rng, d) {
    const u = rng.pick(['cm', 'm']);
    const L = (v) => `${v} ${u}`; const A2 = (v) => `${fmtInt(v)} ${sq(u)}`;
    for (let t = 0; t < 300; t++) {
      if (d === 2) {
        const w = rng.int(3, 14); const h = rng.int(2, 10); const tt = rng.int(2, 10);
        if ((h * tt) % 2 || w === h) continue; // a rectangle, not a square (CLO review m03 item 8)
        const rect = w * h; const tri = (h * tt) / 2; const ans = rect + tri;
        const pts = [[0, 0], [w, 0], [w + tt, 0], [w, h], [0, h]];
        const prompt = `The shape shown is made of a rectangle and a right-angled triangle. The rectangle is ${L(w)} long and ${L(h)} tall. The triangle is joined to its right-hand side: one of the triangle's shorter sides is the rectangle's ${L(h)} side, and the other runs ${L(tt)} along the bottom. What is the total area of the shape?`;
        const solution = `Rectangle: ${w} x ${h} = ${rect} ${sq(u)}. Triangle: ${h} x ${tt} ÷ 2 = ${tri} ${sq(u)}. Total: ${rect} + ${tri} = ${ans} ${sq(u)}. Answer: ${A2(ans)}`;
        const distractors = [
          { text: A2(rect + h * tt), code: 'AREA-TRI-NO-HALF', why: `You did not halve the triangle: ${h} x ${tt} = ${h * tt} is a whole rectangle. The triangle is ${tri} ${sq(u)}.` },
          rect > tri ? { text: A2(rect - tri), code: 'OP-SWAP', why: 'You took the triangle away. Here it is joined on, so add its area.' } : null,
          { text: A2(rect + h + tt), code: 'AREA-ADDS-SIDES', why: `For the triangle you added ${h} + ${tt}. Its area is ${h} x ${tt} ÷ 2 = ${tri} ${sq(u)}.` },
          { text: A2((w + tt) * h), code: 'AREA-TRI-NO-HALF', why: `${w + tt} x ${h} treats the whole shape as a rectangle. The triangle part is only half of a ${tt} by ${h} rectangle.` },
          { text: A2(rect), code: 'ITEM-LEFT-OUT', why: `${rect} ${sq(u)} is the rectangle only. Add the triangle's area, ${tri} ${sq(u)}, as well.` },
        ];
        const diagram = { type: 'polygon', points: pts, sides: [{ label: L(w) }, { label: L(tt) }, null, null, { label: L(h) }], angles: [{ right: true }, null, null, null, { right: true }], extraLines: [{ from: [w, 0], to: [w, h], dashed: true }], shaded: true };
        try { return { type: 'mcq', prompt, ...choices(rng, A2(ans), distractors, (i) => nearFor(prompt)(A2(ans + (i % 2 ? 2 : -2) * Math.ceil(i / 2)), 'Find each part, then add.')), solution, diagram, marks: 2 }; } catch { continue; }
      }
      const ci = rng.int(0, 2);
      const uu = ci === 0 ? 'cm' : 'm';
      const L3 = (v) => `${v} ${uu}`; const A3 = (v) => `${fmtInt(v)} ${sq(uu)}`;
      const W = rng.int(6, 16); const H = rng.int(5, 12);
      const a = rng.int(2, W - 2); const b = rng.int(2, H - 2);
      if ((a * b) % 2 || a === b) continue;
      const rect = W * H; const tri = (a * b) / 2; const ans = rect - tri;
      // D3: the triangle's two shorter sides are not given; she finds them from the edges that are
      // left (CLO review m03 item 6)
      const topLeft = W - a; const sideLeft = H - b;
      const ctx = [
        { what: `The diagram shows a rectangle of card that measures ${L3(W)} by ${L3(H)}. A right-angled triangle is cut off the top right-hand corner. After the cut, ${L3(topLeft)} of the top edge is left and ${L3(sideLeft)} of the right-hand edge is left. What is the area of the card that is left?`, unit: 'cm' },
        { what: `The diagram shows a rectangular garden, ${L3(W)} by ${L3(H)}. A flower bed shaped like a right-angled triangle fills the top right-hand corner, with two sides along the edges of the garden. The grass reaches ${L3(topLeft)} along the top edge and ${L3(sideLeft)} along the right-hand edge. What is the area of the grass?`, unit: 'm' },
        { what: `The diagram shows a rectangular floor, ${L3(W)} by ${L3(H)}. A right-angled triangle in the top right-hand corner is not tiled. The tiles reach ${L3(topLeft)} along the top wall and ${L3(sideLeft)} along the right-hand wall. What area is tiled?`, unit: 'm' },
      ][ci];
      const pts = [[0, 0], [W, 0], [W, H - b], [W - a, H], [0, H]];
      const solution = `The triangle's shorter sides: ${W} - ${topLeft} = ${a} ${uu} and ${H} - ${sideLeft} = ${b} ${uu}. Rectangle: ${W} x ${H} = ${rect} ${sq(uu)}. Triangle: ${a} x ${b} ÷ 2 = ${tri} ${sq(uu)}. What is left: ${rect} - ${tri} = ${ans} ${sq(uu)}. Answer: ${A3(ans)}`;
      const distractors = [
        { text: A3(rect - a * b), code: 'AREA-TRI-NO-HALF', why: `You took away ${a} x ${b} = ${a * b} without halving. The corner is a triangle: ${a * b} ÷ 2 = ${tri} ${sq(uu)}.` },
        { text: A3(rect + tri), code: 'OP-SWAP', why: 'You added the triangle instead of taking it away. The triangle is not part of what is left.' },
        { text: A3(rect - a - b), code: 'AREA-ADDS-SIDES', why: `You took away ${a} + ${b} = ${a + b}. The triangle's area is ${a} x ${b} ÷ 2 = ${tri} ${sq(uu)}.` },
      ];
      const diagram = { type: 'polygon', points: pts, sides: [{ label: L3(W) }, { label: L3(sideLeft) }, null, { label: L3(topLeft) }, { label: L3(H) }], angles: [{ right: true }, { right: true }, null, null, { right: true }], extraLines: [{ from: [W - a, H], to: [W, H], dashed: true, label: '?' }, { from: [W, H], to: [W, H - b], dashed: true, label: '?' }], shaded: true };
      try { return { type: 'mcq', prompt: ctx.what, ...choices(rng, A3(ans), distractors, (i) => nearFor(ctx.what)(A3(ans + (i % 2 ? 2 : -2) * Math.ceil(i / 2)), 'Find the two shorter sides of the triangle first, then take its area from the rectangle.')), solution, diagram, marks: 2 }; } catch { /* draw again */ }
    }
    throw new Error('no question');
  },
};

// ---------------------------------------------------------------- g11, g12 rotational symmetry
// Stage 6 stops at order 4 (6Gg.08, CLO book map 17 Oct 2026): every shape and pattern here has
// order 1, 2, 3 or 4, so a smallest turn is always 90°, 120° or 180°.

/** A pattern of `k` copies of a motif of points (polar [radius, angle]) turned round the centre. */
function pattern(k, motif, start) {
  const pts = [];
  for (let i = 0; i < k; i++) for (const [r, a] of motif) pts.push(rot([r, 0], start + a + (360 * i) / k));
  return pts;
}
/** Order of rotational symmetry of a set of points about their centre (largest n that maps it onto itself). */
function orderOf(pts) {
  const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length; const cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  for (let k = 12; k >= 2; k--) {
    const ok = pts.every((p) => { const q = rot([p[0] - cx, p[1] - cy], 360 / k); return pts.some((s) => Math.hypot(s[0] - cx - q[0], s[1] - cy - q[1]) < 0.05); });
    if (ok) return k;
  }
  return 1;
}
const article = (w) => (/^[aeiou]/i.test(w) ? `an ${w}` : `a ${w}`);
/**
 * The named Stage 6 shapes, each drawn true from its own measurements (then tilted a little).
 * order: order of rotational symmetry; lines: lines of symmetry; ticks: equal-side marks per side;
 * right: every corner is a right angle.
 */
const NAMED = {
  'equilateral triangle': { order: 3, lines: 3, make: (rng) => ({ pts: pattern(3, [[rng.pick([4, 4.5, 5]), 0]], 90), ticks: [1, 1, 1] }) },
  square: { order: 4, lines: 4, make: (rng) => { const h = rng.pick([2, 2.5, 3]); return { pts: [[-h, -h], [h, -h], [h, h], [-h, h]], ticks: [1, 1, 1, 1], right: true }; } },
  rectangle: { order: 2, lines: 2, make: (rng) => { const w = rng.pick([3, 3.5, 4]); const h = rng.pick([1.5, 2, 2.5]); return { pts: [[-w, -h], [w, -h], [w, h], [-w, h]], right: true }; } },
  rhombus: { order: 2, lines: 2, make: (rng) => { const p = rng.pick([3.5, 4, 4.5]); const q = rng.pick([2, 2.5]); return { pts: [[-p, 0], [0, -q], [p, 0], [0, q]], ticks: [1, 1, 1, 1] }; } },
  parallelogram: { order: 2, lines: 0, make: (rng) => { const w = rng.pick([5, 6]); const h = rng.pick([2.5, 3]); const sl = rng.pick([1.5, 2]); return { pts: [[-w / 2 - sl / 2, -h / 2], [w / 2 - sl / 2, -h / 2], [w / 2 + sl / 2, h / 2], [-w / 2 + sl / 2, h / 2]], ticks: [1, 2, 1, 2] }; } },
  kite: { order: 1, lines: 1, make: (rng) => { const w = rng.pick([2, 2.5, 3]); const t = rng.pick([2, 2.5]); const b = rng.pick([4, 4.5, 5]); return { pts: [[0, t], [-w, 0], [0, -b], [w, 0]], ticks: [1, 2, 2, 1] }; } },
  'isosceles trapezium': { order: 1, lines: 1, make: (rng) => { const a = rng.pick([3, 3.5, 4]); const b = rng.pick([1.5, 2]); const h = rng.pick([2.5, 3]); return { pts: [[-a, 0], [a, 0], [b, h], [-b, h]], ticks: [null, 1, null, 1] }; } },
};
const namesOfOrder = (ks) => Object.keys(NAMED).filter((n) => ks.includes(NAMED[n].order));

const rotSym = {
  id: 'm14.rotational-symmetry', topicId: 'm14-reflection-and-rotation', subtopicId: 'm14-s5', // moved from m03.rotational-symmetry (m03-s5), book map 17 Oct 2026
  skill: SK.rot,
  title: 'Order of rotational symmetry (1 to 4) of a named shape or a star (D1), of a pattern (D2); smallest turn: 90°, 120° or 180° (D3)',
  difficulties: [1, 2, 3],
  check: { min: 0 },
  make(rng, d) {
    for (let t = 0; t < 300; t++) {
      let k; let pts; let name = null; let mirror = false; let shape = null;
      const start = rng.int(0, 89);
      // D1: a named shape (order 1-4) or a star of order 3 or 4; D2: a pattern of order 1-4;
      // D3: a named shape or a pattern of order 2-4 (smallest turn 180°, 120° or 90°)
      const named = d === 1 ? rng.chance(0.7) : d === 3 ? rng.chance(0.35) : false;
      if (named) {
        name = rng.pick(namesOfOrder(d === 3 ? [2, 3, 4] : [1, 2, 3, 4]));
        shape = NAMED[name].make(rng);
        k = NAMED[name].order;
        mirror = NAMED[name].lines === k;
        const tilt = rng.pick([0, 0, 10, -10, 15, -15, 20, -20]);
        pts = shape.pts.map((p) => rot(p, tilt));
      } else if (d === 1) {
        k = rng.pick([3, 4]);
        pts = pattern(k, [[5, 0], [5 * rng.pick([0.4, 0.45, 0.5, 0.55, 0.6]), 180 / k]], start);
        mirror = true;
      } else {
        k = d === 2 ? rng.pick([1, 2, 2, 3, 3, 4, 4]) : rng.pick([2, 3, 4]);
        if (k === 1) {
          const m = rng.int(5, 8);
          const angs = rng.sample([...Array(24).keys()].map((i) => i * 15), m).sort((x, y) => x - y);
          pts = angs.map((a) => rot([rng.pick([3, 3.5, 4, 4.5, 5]), 0], a + start));
        } else {
          const m = k <= 3 ? rng.int(2, 3) : 2;
          const motif = [[5, 0]];
          const step = 360 / k;
          const offs = rng.sample([0.2, 0.3, 0.35, 0.6, 0.7, 0.8], m - 1).sort((x, y) => x - y);
          for (const f of offs) motif.push([5 * rng.pick([0.35, 0.45, 0.55, 0.7]), step * f]);
          pts = pattern(k, motif, start);
        }
      }
      if (k > 4 || pts.length > 12 || pts.length < 3 || orderOf(pts) !== k) continue;
      const nPts = pts.length;
      const diagram = { type: 'polygon', points: pts, shaded: true, alt: name ? `${Cap(article(name))}.` : `A shape with ${nPts} corners.` };
      if (shape && shape.ticks) diagram.sides = shape.ticks.map((x) => (x ? { ticks: x } : null));
      if (shape && shape.right) diagram.angles = pts.map(() => ({ right: true }));
      if (d === 3) {
        const ans = 360 / k;
        const prompt = name
          ? `The diagram shows ${article(name)}. What is the smallest angle you can turn it through, about its centre, so that it looks exactly the same again?`
          : 'What is the smallest angle you can turn the shape shown through, about its centre, so that it looks exactly the same again?';
        const solution = `The shape fits onto itself ${k} times in a full turn (order ${k}). A full turn is 360°, so the smallest turn is 360 ÷ ${k} = ${ans}°. Answer: ${deg(ans)}`;
        const distractors = [
          { text: deg(k), code: 'ROT-ORDER-FOR-ANGLE', why: `${k} is the ORDER (how many times it fits in a full turn). The angle is 360 ÷ ${k}.` },
          k !== 4 ? { text: deg(90), code: 'ROT-ALWAYS-QUARTER', why: `A quarter turn works only for order 4. This shape fits ${k} times in a full turn, so turn 360 ÷ ${k}.` } : null,
          nPts !== k && 360 % nPts === 0 ? { text: deg(360 / nPts), code: 'ROT-ORDER-CORNERS', why: `You divided by the number of corners (${nPts}). Turning it on to the next corner does not always make the whole shape look the same: it only fits ${k} times in a full turn.` } : null,
          k !== 2 ? { text: deg(180), code: 'ROT-ORDER-HALF-TURN', why: `A half turn is not the smallest turn here. The shape already fits after 360 ÷ ${k} = ${ans}°.` } : null,
        ];
        try { return { type: 'mcq', prompt, ...choices(rng, deg(ans), distractors, (i) => (i === 1 ? nearFor(prompt)(deg(360), 'A full turn always works. Find the SMALLEST turn: 360 ÷ order.') : nearDeg(prompt, ans, 'Find the order first, then 360 ÷ order.', 15)(i - 1))), solution, diagram, marks: 2, skill: SK.rotPattern }; } catch { continue; }
      }
      const prompt = name ? `What is the order of rotational symmetry of the ${name} shown?` : 'What is the order of rotational symmetry of the shape shown?';
      const turn = 360 / k;
      const solution = k === 1
        ? 'Turn the shape about its centre. It only looks the same again after a full turn (360°). That counts once, so the order is 1 (no rotational symmetry). Answer: 1'
        : `Turn the shape about its centre. It looks the same after every ${turn}° turn: ${Array.from({ length: k }, (_, i) => `${turn * (i + 1)}°`).join(', ')}. That is ${k} times in a full turn, so the order is ${k}. Answer: ${k}`;
      const distractors = [
        k > 1 ? { text: String(turn), code: 'ROT-ORDER-ANGLE', why: `${turn}° is the angle of the smallest turn. The order is how many times it fits in a full turn: 360 ÷ ${turn} = ${k}.` } : null,
        nPts !== k ? { text: String(nPts), code: 'ROT-ORDER-CORNERS', why: `The shape has ${nPts} corners, but turning it on to the next corner does not always make the whole shape look the same. Count the turns that do: ${k}.` } : null,
        k === 1 ? { text: '0', code: 'ROT-ORDER-ZERO', why: 'Every shape looks the same after a full turn, so the smallest order is 1, not 0.' } : null,
        k % 2 === 0 && k > 2 ? { text: '2', code: 'ROT-ORDER-HALF-TURN', why: `You counted only the half turn and the full turn. It also fits after ${turn}°.` } : null,
        mirror ? { text: String(2 * k), code: 'ROT-ORDER-ADD-LINES', why: `It looks like you added the ${countOf(k, 'line')} of symmetry to the ${countOf(k, 'turn')}. The order only counts the turns.` } : null,
      ];
      try {
        return { type: 'mcq', prompt, ...choices(rng, String(k), distractors, (i) => nearMiss(String(k + i), 'Count how many times it fits onto itself in one full turn.')), solution, diagram, ...(name ? {} : { skill: SK.rotPattern }) };
      } catch { /* draw again */ }
    }
    throw new Error('no question');
  },
};

export default [radius, angleType, straightLine, aroundPoint, protractor, triangleAngle, special, areaRight, compound, rotSym];
