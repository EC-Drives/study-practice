// Session countdown. It counts active time only: when the page is hidden (another app, the
// laptop lid shut) the clock pauses, and it carries on from the saved time if the session is
// reopened. The clock is passed in, so the test page can drive it with a fake one.

export class Countdown {
  /**
   * @param {number} limitSec  total time allowed
   * @param {object} [o]
   * @param {number} [o.elapsedSec] time already used (when resuming)
   * @param {() => number} [o.now]  milliseconds clock
   */
  constructor(limitSec, o = {}) {
    this.limitSec = limitSec;
    this.baseElapsed = o.elapsedSec || 0;
    this.now = o.now || (() => performance.now());
    this.runningSince = null;
    this.warned = new Set();
  }

  start() {
    if (this.runningSince == null) this.runningSince = this.now();
    return this;
  }

  pause() {
    if (this.runningSince != null) {
      this.baseElapsed += (this.now() - this.runningSince) / 1000;
      this.runningSince = null;
    }
    return this;
  }

  get running() {
    return this.runningSince != null;
  }

  elapsed() {
    const live = this.runningSince != null ? (this.now() - this.runningSince) / 1000 : 0;
    return Math.min(this.limitSec, this.baseElapsed + live);
  }

  remaining() {
    return Math.max(0, this.limitSec - this.elapsed());
  }

  expired() {
    return this.remaining() <= 0;
  }

  /**
   * Returns the warning thresholds (in seconds remaining) crossed since the last call, once
   * each, e.g. [300] when five minutes remain.
   */
  newWarnings(thresholds = [300, 60]) {
    const rem = this.remaining();
    const out = [];
    for (const t of thresholds) {
      if (rem <= t && !this.warned.has(t) && this.limitSec > t) {
        this.warned.add(t);
        out.push(t);
      }
    }
    return out;
  }
}

/** Per-question stopwatch: adds active time to whichever question is on screen. */
export class QuestionClock {
  constructor(o = {}) {
    this.now = o.now || (() => performance.now());
    this.times = { ...(o.times || {}) };
    this.current = null;
    this.since = null;
  }

  show(id) {
    this.stop();
    this.current = id;
    this.since = this.now();
  }

  stop() {
    if (this.current != null && this.since != null) {
      this.times[this.current] = (this.times[this.current] || 0) + (this.now() - this.since) / 1000;
    }
    this.since = null;
  }

  resume() {
    if (this.current != null && this.since == null) this.since = this.now();
  }

  snapshot() {
    const t = { ...this.times };
    if (this.current != null && this.since != null) t[this.current] = (t[this.current] || 0) + (this.now() - this.since) / 1000;
    return t;
  }
}

export function formatClock(sec) {
  const s = Math.max(0, Math.ceil(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const mm = h ? String(m).padStart(2, '0') : String(m);
  return (h ? `${h}:` : '') + `${mm}:${String(r).padStart(2, '0')}`;
}

export function formatDuration(sec) {
  const s = Math.round(sec || 0);
  if (s < 60) return `${s} s`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
}
