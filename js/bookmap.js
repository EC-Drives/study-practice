// The textbook map (Chief Learning Officer, id-map-2026-10-17.json): which book section each maths
// subtopic (and, where a subtopic spans sections, each skill) belongs to, and the subtopic ids that
// changed when the maths topics were mapped to the book on 17 Oct 2026. Generated from the CLO's
// id map; regenerate rather than edit by hand if the map changes.
//
// Used by the generators (to stamp generated questions with a bookSection) and by the app (to read
// attempts saved before the book mapping, and to place a question in its book section).

/** Old subtopic id -> new subtopic id (question ids did not change). */
export const SUBTOPIC_ALIASES = {
  "m07-s1": "m02-s5",
  "m06-s1": "m02-s6",
  "m02-s2": "m06-s6",
  "m02-s3": "m06-s7",
  "m02-s4": "m07-s5",
  "m03-s5": "m14-s5",
  "m15-s1": "m09-s6"
};

/** Old subtopic id -> the topic it moved to. */
export const SUBTOPIC_NEW_TOPIC = {
  "m07-s1": "m02-number-system",
  "m06-s1": "m02-number-system",
  "m02-s2": "m06-multiplication-and-division",
  "m02-s3": "m06-multiplication-and-division",
  "m02-s4": "m07-number-patterns",
  "m03-s5": "m14-reflection-and-rotation",
  "m15-s1": "m09-fractions-percentages-decimals"
};

/** Subtopic id -> book section id. */
export const BOOK_SECTION_BY_SUBTOPIC = {
  "m01-s1": "1A",
  "m01-s2": "1B",
  "m01-s3": "1A",
  "m01-s4": "1C",
  "m01-s5": "1A",
  "m02-s1": "2A",
  "m02-s5": "2A",
  "m02-s6": "2B",
  "m03-s1": "3A",
  "m03-s2": "3B",
  "m03-s3": "3E",
  "m03-s4": "3F",
  "m03-s6": "3D",
  "m04-s1": "4A",
  "m04-s2": "4B",
  "m04-s3": "4B",
  "m04-s4": "4C",
  "m05-s1": "5B",
  "m05-s2": "5C",
  "m05-s3": "5B",
  "m05-s4": "5A",
  "m06-s2": "6A",
  "m06-s3": "6B",
  "m06-s4": "6E",
  "m06-s5": "6E",
  "m06-s6": "6C",
  "m06-s7": "6D",
  "m07-s2": "7A",
  "m07-s3": "7B",
  "m07-s4": "7A",
  "m07-s5": "7B",
  "m08-s1": "8A",
  "m08-s2": "8A",
  "m08-s3": "8A",
  "m08-s4": "8B",
  "m09-s1": "9A",
  "m09-s2": "9B",
  "m09-s3": "9B",
  "m09-s4": "9B",
  "m09-s5": "9C",
  "m09-s6": "9D",
  "m10-s1": "10A",
  "m10-s2": "10A",
  "m10-s3": "10B",
  "m10-s4": "10C",
  "m10-s5": "10D",
  "m10-s6": "10B",
  "m11-s1": "11A",
  "m11-s2": "11A",
  "m11-s3": "11A",
  "m11-s4": "11B",
  "m11-s5": "11A",
  "m12-s1": "12A",
  "m12-s2": "12E",
  "m12-s3": "12F",
  "m12-s4": "12G",
  "m13-s1": "13A",
  "m13-s2": "13B",
  "m13-s3": "13C",
  "m14-s1": "14A",
  "m14-s2": "14A",
  "m14-s3": "14B",
  "m14-s4": "14C",
  "m14-s5": "14C",
  "m15-s2": "XA",
  "m15-s3": "XB",
  "m15-s4": "XC"
};

/** Subtopic id -> { skill tag -> book section id }, where a subtopic spans sections. */
export const BOOK_SECTION_BY_SKILL = {
  "m03-s2": {
    "constructing circles": "3C"
  },
  "m05-s2": {
    "adding and subtracting decimals in context": "5D",
    "subtracting decimals": "5D"
  },
  "m05-s4": {
    "multi-step word problems (bar models)": "5B"
  },
  "m06-s4": {
    "dividing decimals by whole numbers": "6F"
  },
  "m06-s5": {
    "interpreting remainders": "6B",
    "multiplying by a 2-digit number": "6A"
  },
  "m12-s2": {
    "choosing a scale": "12C",
    "drawing pie charts": "12B",
    "grouping data": "12C",
    "plotting scatter graphs": "12D",
    "reading pie charts and waffle charts": "12B"
  },
  "m12-s4": {
    "effect of an outlier": "12F",
    "frequency diagrams for grouped data": "12C",
    "interpreting scatter graphs": "12D",
    "predicting from a scatter graph": "12D",
    "reading and comparing data": "12C",
    "reading scales on charts": "12C",
    "spotting a misleading scale": "12C"
  },
  "m14-s4": {
    "comparing reflection, rotation and translation": "14B",
    "describing a transformation": "14A"
  }
};

/** The current id of a subtopic (an id from before the book mapping is translated). */
export function currentSubtopicId(id) {
  return typeof id === 'string' && Object.prototype.hasOwnProperty.call(SUBTOPIC_ALIASES, id) ? SUBTOPIC_ALIASES[id] : id;
}

/** The book section for a subtopic and skill, or null (science, or an unknown subtopic). */
export function bookSectionFor(subtopicId, skill) {
  const sid = currentSubtopicId(subtopicId);
  const bySkill = BOOK_SECTION_BY_SKILL[sid];
  if (bySkill && typeof skill === 'string' && Object.prototype.hasOwnProperty.call(bySkill, skill)) return bySkill[skill];
  return Object.prototype.hasOwnProperty.call(BOOK_SECTION_BY_SUBTOPIC, sid) ? BOOK_SECTION_BY_SUBTOPIC[sid] : null;
}
