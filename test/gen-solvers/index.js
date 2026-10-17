// All the independent solvers and misconception rules, by generator id. Each topic loads on its
// own, so a problem in one solver file shows up as that topic's failures, not a blank page.
const TOPICS = ['m01', 'm02', 'm03', 'm04', 'm05', 'm06', 'm07', 'm08', 'm09', 'm10', 'm11', 'm12', 'm13', 'm14', 'm15'];
export const SOLVER_LOAD_ERRORS = [];
const ALL = await Promise.all(TOPICS.map((t) => import(`./${t}.js`).catch((e) => { SOLVER_LOAD_ERRORS.push(`${t}: ${e && e.message}`); return {}; })));
export const SOLVERS = Object.assign({}, ...ALL.map((m) => m.SOLVERS || {}));
export const MIS = Object.assign({}, ...ALL.map((m) => m.MIS || {}));
