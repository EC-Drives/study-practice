// All the independent solvers and misconception rules, by generator id.
import * as m01 from './m01.js';
import * as m02 from './m02.js';
import * as m03 from './m03.js';
import * as m04 from './m04.js';
import * as m05 from './m05.js';
import * as m06 from './m06.js';
import * as m07 from './m07.js';
import * as m08 from './m08.js';
import * as m09 from './m09.js';
import * as m10 from './m10.js';
import * as m11 from './m11.js';
import * as m12 from './m12.js';
import * as m13 from './m13.js';
import * as m14 from './m14.js';
import * as m15 from './m15.js';

const ALL = [m01, m02, m03, m04, m05, m06, m07, m08, m09, m10, m11, m12, m13, m14, m15];
export const SOLVERS = Object.assign({}, ...ALL.map((m) => m.SOLVERS || {}));
export const MIS = Object.assign({}, ...ALL.map((m) => m.MIS || {}));
