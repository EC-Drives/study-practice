"""End-to-end run of Study Practice v2 in a headless browser, with screenshots (laptop only).

    python tools/e2e.py

1. Local mode: a maths practice that mixes bank, diagram and generated questions; pen working
   on the stylus area; Finish; the review shows the pictures and the working; the parent area
   (PIN) shows the report with named misconceptions counted. A picture-choice question.
2. Offline: the laptop server is stopped, the page reloaded, and a chapter not opened before is
   practised with generated questions and pictures, from the offline cache only.
3. Linked mode against the mock back-end (?backend=mock): the same practice as the demo student,
   sent online by the queue; then the parent signs in and sees the report.

Screenshots go to screenshots/v2-integration/ (git-ignored). Prints every check and exits 1 if
any fails. Uses a throwaway browser profile and a local server on 127.0.0.1 only.
"""
import functools
import http.server
import json
import os
import sys
import threading
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'tools'))
from serve import Handler  # noqa: E402
from cdp import Browser  # noqa: E402

OUT = os.path.join(ROOT, 'screenshots', 'v2-integration')
TEST_PIN = '2468'  # test value for the throwaway browser profile only
PHONE = (390, 844, True, 2)
TABLET = (820, 1180, False, 1)
LAPTOP = (1366, 900, False, 1)

results = []


def check(name, ok, detail=''):
    results.append((name, bool(ok), detail))
    print(f"{'ok  ' if ok else 'FAIL'} {name}{f'  [{detail}]' if detail else ''}", flush=True)


class Quiet(Handler):
    down = False  # "server stopped": also refuse requests on connections the browser kept open

    def do_GET(self):  # noqa: N802
        if Quiet.down:
            self.close_connection = True
            return
        super().do_GET()

    def do_HEAD(self):  # noqa: N802
        if Quiet.down:
            self.close_connection = True
            return
        super().do_HEAD()

    def log_message(self, *args):
        pass


class Server:
    def __init__(self, port=0):
        Quiet.down = False
        http.server.ThreadingHTTPServer.allow_reuse_address = True
        self.httpd = http.server.ThreadingHTTPServer(('127.0.0.1', port), functools.partial(Quiet, directory=ROOT))
        self.port = self.httpd.server_address[1]
        threading.Thread(target=self.httpd.serve_forever, daemon=True).start()

    def stop(self):
        Quiet.down = True
        self.httpd.shutdown()
        self.httpd.server_close()


# In-page helpers: read the practice in progress and answer through the page's own controls.
HELPERS = r"""
window.__e2e = {
  async load() {
    const hooks = await import('/js/hooks.js');
    const content = await import('/js/content.js');
    const { Db } = await import('/js/db.js');
    const names = (await indexedDB.databases()).map((d) => d.name).filter((n) => n && n.startsWith('study-practice'));
    for (const n of names) {
      const db = await Db.open(n);
      try {
        const s = (await db.getAll('sessions')).find((x) => x.status === 'in-progress' && location.hash.includes(encodeURIComponent(x.id)));
        if (s) {
          const topics = await content.loadSubject(s.subject);
          const qmap = hooks.questionsForSession(content.indexQuestions(topics), s);
          this.session = s;
          this.qs = s.questionIds.map((id) => qmap.get(id));
          return this.summary();
        }
      } finally { db.close(); }
    }
    return null;
  },
  summary() {
    return this.qs.map((q) => ({ id: q.id, type: q.type, generated: !!q.generatorId, diagram: q.diagram != null, pictures: Array.isArray(q.optionDiagrams), codes: !!q.misconceptionCodes }));
  },
  index() { return Number((document.querySelector('.qnum') || {}).textContent.replace(/\D/g, '')) - 1; },
  codedWrong(q) {
    const c = q.misconceptionCodes || {};
    if (q.type === 'mcq') { const i = q.options.findIndex((_, k) => k !== q.answer && c[String(k)] && c[String(k)] !== 'NEAR-MISS'); if (i >= 0) return i; }
    if (q.type === 'numeric' || q.type === 'short') { const k = Object.keys(c).find((x) => x !== 'common' && c[x] !== 'NEAR-MISS' && (q.misconceptions || {})[x]); if (k) return k; }
    return null;
  },
  answer(mode) {
    const q = this.qs[this.index()];
    if (mode === 'skip' || ['order', 'match'].includes(q.type)) return 'skip';
    const opts = [...document.querySelectorAll('.qcard .options .opt')];
    const type = (v) => { const inp = document.querySelector('.qcard .answer-input'); inp.value = v; inp.dispatchEvent(new Event('input', { bubbles: true })); };
    const wrong = mode === 'wrong';
    switch (q.type) {
      case 'mcq': { const cw = this.codedWrong(q); opts[wrong ? (cw ?? (q.answer + 1) % q.options.length) : q.answer].click(); break; }
      case 'truefalse': opts[(wrong ? !q.answer : q.answer) ? 0 : 1].click(); break;
      case 'multi': (wrong ? [q.options.findIndex((_, i) => !q.answer.includes(i))] : q.answer).forEach((i) => opts[i].click()); break;
      case 'numeric': type(wrong ? (this.codedWrong(q) ?? String(q.answer.value + 3)) : ((q.answer.accept && q.answer.accept[0]) || String(q.answer.value))); break;
      case 'short': type(wrong ? (this.codedWrong(q) ?? 'not sure') : q.answer.accept[0]); break;
      default: return 'skip';
    }
    return wrong ? `wrong${this.codedWrong(q) != null && q.generatorId ? '-coded' : ''}` : 'right';
  },
  next() { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === 'Next'); if (b) b.click(); return !!b; },
  padRect() { const c = document.querySelector('.qcard .wp-canvas'); c.scrollIntoView({ block: 'center' }); const r = c.getBoundingClientRect(); return [r.left, r.top, r.width, r.height]; },
};
return true;
"""


def size(b, s, dark=False):
    w, h, mobile, scale = s
    b.size(w, h, mobile=mobile, scale=scale, dark=dark)
    time.sleep(0.3)


def shot(b, name, full=False):
    os.makedirs(OUT, exist_ok=True)
    b.js("document.querySelectorAll('.toast, #toast, [class*=toast]').forEach((t) => t.remove()); return true;")
    time.sleep(0.4)
    b.shot(os.path.join(OUT, name), full=full)


def scroll_to(b, selector):
    b.js(f"const e = document.querySelector({json.dumps(selector)}); if (e) e.scrollIntoView({{ block: 'start' }}); window.scrollBy(0, -12); return !!e;")


def write_working(b, wrong=False):
    x, y, w, h = b.js('return __e2e.padRect();')
    # a few handwritten-looking strokes: "3/4 + 1/8", a line, and an answer
    sx = x + 30
    sy = y + 40
    strokes = [
        [(sx, sy), (sx + 14, sy - 6), (sx + 20, sy + 6), (sx + 8, sy + 14), (sx + 22, sy + 22), (sx + 6, sy + 32)],
        [(sx + 40, sy + 36), (sx + 56, sy - 4)],
        [(sx + 70, sy + 16), (sx + 92, sy + 16)], [(sx + 81, sy + 4), (sx + 81, sy + 28)],
        [(sx + 110, sy), (sx + 120, sy - 4), (sx + 120, sy + 32)],
        [(sx, sy + 60), (sx + 160, sy + 62)],
        [(sx + 10, sy + 80), (sx + 30, sy + 96), (sx + 12, sy + 112)] if wrong else [(sx + 10, sy + 96), (sx + 20, sy + 110), (sx + 44, sy + 78)],
    ]
    for s in strokes:
        pts = []
        for (a, c), (d, e) in zip(s, s[1:]):
            for k in range(6):
                t = k / 6
                pts.append((a + (d - a) * t, c + (e - c) * t))
        pts.append(s[-1])
        b.pen_stroke(pts, pressure=0.55)


def start_practice(b, base_query, topic_id, minutes=30):
    """Start a whole-chapter practice from the chapter page; returns the question summary."""
    b.goto(f'{base_query}#/topic/{topic_id}')
    b.wait_for("[...document.querySelectorAll('button')].some((x) => x.textContent.includes('Start practice'))")
    b.js(f"[...document.querySelectorAll('input[name=len], [role=radio]')].find((x) => (x.value === '{minutes}') || (x.textContent || '').trim().startsWith('{minutes} min'))?.click(); return true;")
    b.js("[...document.querySelectorAll('button')].find((x) => x.textContent.includes('Start practice')).click(); return true;")
    time.sleep(0.6)
    b.js("const d = [...document.querySelectorAll('dialog[open] button')].find((x) => x.textContent.includes('Start new')); if (d) d.click(); return true;")
    b.wait_for("location.hash.startsWith('#/session/') && document.querySelector('.qcard')")
    b.js(HELPERS)
    return b.js('return await __e2e.load();')


def run_through(b, qs, label, snap=None):
    """Answer every question (about one in three wrong, generated ones with a named mistake),
    pen working on a few, then Finish. Returns what was done."""
    done = {'right': 0, 'wrong': 0, 'coded': 0, 'skip': 0, 'working': 0}
    drew_wrong = False
    for i, q in enumerate(qs):
        b.wait_for(f"__e2e.index() === {i}")
        if snap:
            snap(i, q)
        mode = 'wrong' if (q['generated'] and q['codes'] and done['coded'] == 0) or i % 3 == 2 else 'right'
        r = b.js(f"return __e2e.answer('{mode}');")
        done['skip' if r == 'skip' else 'right' if r == 'right' else 'wrong'] += 1
        if r == 'wrong-coded':
            done['coded'] += 1
        if (r.startswith('wrong') and not drew_wrong) or i in (0, 3):
            write_working(b, wrong=r.startswith('wrong'))
            done['working'] += 1
            drew_wrong = drew_wrong or r.startswith('wrong')
        if i < len(qs) - 1:
            b.js('return __e2e.next();')
    b.js("document.querySelector('.btn-finish').click(); return true;")
    b.wait_for("[...document.querySelectorAll('dialog[open] button')].some((x) => x.textContent.trim() === 'Finish')")
    b.js("[...document.querySelectorAll('dialog[open] button')].find((x) => x.textContent.trim() === 'Finish').click(); return true;")
    b.wait_for("location.hash.startsWith('#/results/') && document.querySelector('.review-list')", timeout=30)
    print(f'  {label}: {done}', flush=True)
    return done


def results_checks(b, qs, done, label):
    n_diag = sum(1 for q in qs if q['diagram'])
    n_pics = sum(1 for q in qs if q['pictures'])
    got = b.js("return { dg: document.querySelectorAll('.review > .dg').length, cp: document.querySelectorAll('.review .choice-pictures').length, work: document.querySelectorAll('.rv-working .workview').length, items: document.querySelectorAll('.review').length, err: document.querySelectorAll('.review .dg-err').length };")
    check(f'{label}: review lists every question', got['items'] == len(qs), f"{got['items']} of {len(qs)}")
    check(f'{label}: review draws every question picture', got['dg'] == n_diag and got['err'] == 0, f"{got['dg']} of {n_diag}")
    check(f'{label}: review shows picture choices', got['cp'] == n_pics, f"{got['cp']} of {n_pics}")
    check(f'{label}: review shows her pen working', got['work'] == done['working'], f"{got['work']} of {done['working']}")


def mix_check(qs, label):
    gen = sum(1 for q in qs if q['generated'])
    bank_diag = sum(1 for q in qs if q['diagram'] and not q['generated'])
    gen_diag = sum(1 for q in qs if q['diagram'] and q['generated'])
    check(f'{label}: the session mixes bank, diagram and generated questions', gen >= 2 and bank_diag >= 1 and len(qs) - gen >= gen,
          f'{len(qs)} questions: {gen} generated ({gen_diag} with pictures), {bank_diag} bank questions with pictures')
    return gen, bank_diag, gen_diag


def main():
    server = Server()
    port = server.port
    base = f'http://localhost:{port}/'
    b = Browser()
    try:
        # ------------------------------------------------------------ 1. local mode
        print('Local mode', flush=True)
        size(b, TABLET)
        b.goto(base)
        b.wait_for("document.querySelector('#main') && document.querySelector('#main').textContent.includes('Mathematics')")
        b.js('await navigator.serviceWorker.ready; return true;')
        qs = None
        for _ in range(6):  # until the plan has a bank picture and a generated picture to show
            qs = start_practice(b, base, 'm03-2d-shapes-and-angles', 30)
            if any(q['generated'] and q['diagram'] for q in qs) and any(q['diagram'] and not q['generated'] for q in qs):
                break
        mix_check(qs, 'local')
        shots = {'gen': False, 'bank': False}

        def snap(i, q):
            if q['generated'] and q['diagram'] and not shots['gen']:
                shots['gen'] = True
                size(b, PHONE)
                shot(b, '01-phone-practice-generated-diagram.png')
                size(b, LAPTOP)
                shot(b, '02-laptop-practice-generated-diagram.png')
                size(b, TABLET)
            elif q['diagram'] and not q['generated'] and not shots['bank']:
                shots['bank'] = True
                shot(b, '03-tablet-practice-bank-diagram.png')

        done = run_through(b, qs, 'local', snap)
        b.js(HELPERS)
        results_checks(b, qs, done, 'local')
        scroll_to(b, '.review > .dg')
        shot(b, '04-tablet-review-diagram.png')
        size(b, PHONE)
        scroll_to(b, '.rv-working')
        shot(b, '05-phone-review-working.png')
        size(b, TABLET)
        # parent area (PIN): the visual report and the named mistakes
        b.goto(f'{base}#/parent')
        b.wait_for("document.querySelector('#pin1')")
        b.js(f"for (const id of ['pin1', 'pin2']) {{ const i = document.getElementById(id); i.value = '{TEST_PIN}'; i.dispatchEvent(new Event('input', {{ bubbles: true }})); }} document.querySelector('form button[type=submit]').click(); return true;")
        b.wait_for("document.querySelector('.vreport')")
        time.sleep(0.5)
        pr = b.js("return { named: document.querySelectorAll('.vr-named li').length, analysis: document.querySelectorAll('.named-mistakes li').length, cards: document.querySelectorAll('.vr-working-card').length, dg: document.querySelectorAll('.vr-working-card .dg').length, work: document.querySelectorAll('.vr-working-card .workview').length, label: (document.querySelector('.vr-named-label') || {}).textContent || '' };")
        check('local parent: the report counts named misconceptions', pr['named'] >= 1 and pr['analysis'] >= 1 and done['coded'] >= 1, json.dumps(pr))
        check('local parent: wrong questions shown with their pictures and her working', pr['cards'] >= 1 and pr['work'] >= 1, json.dumps(pr))
        size(b, LAPTOP)
        scroll_to(b, '.analysis')
        shot(b, '06-laptop-parent-analysis-named-mistakes.png')
        scroll_to(b, '.vr-named')
        shot(b, '07-laptop-parent-report-named-mistakes.png')
        scroll_to(b, '.vr-working')
        shot(b, '08-laptop-parent-wrong-questions.png')
        size(b, TABLET, dark=True)
        scroll_to(b, '.vr-named')
        shot(b, '09-tablet-parent-report-dark.png')
        size(b, TABLET)

        # a picture-choice question (made into a practice through the app's own planner)
        pc = b.js("""
          const content = await import('/js/content.js'); const practice = await import('/js/practice.js'); const { Db } = await import('/js/db.js');
          for (const subject of ['maths', 'science']) {
            const topics = await content.loadSubject(subject);
            for (const t of topics) {
              const q = t.questions.find((x) => x.type === 'mcq' && Array.isArray(x.optionDiagrams));
              const q2 = t.questions.find((x) => x.type === 'multi' && Array.isArray(x.optionDiagrams));
              if (!q) continue;
              const s = practice.planSession({ subject, topic: t, topics: [t], mode: 'topic', durationMin: 15, attempts: [], deviceId: 'e2e', generated: false });
              s.questionIds = [q.id, ...(q2 ? [q2.id] : []), ...s.questionIds.filter((id) => id !== q.id && (!q2 || id !== q2.id)).slice(0, 3)];
              const db = await Db.open('study-practice');
              for (const old of (await db.getAll('sessions')).filter((x) => x.status === 'in-progress')) await db.delete('sessions', old.id);
              await db.put('sessions', s); db.close();
              location.hash = '#/session/' + encodeURIComponent(s.id);
              return { id: q.id, multi: q2 ? q2.id : null, topic: t.topicId };
            }
          }
          return null;""")
        check('a picture-choice question is in the banks', pc is not None, json.dumps(pc))
        b.wait_for("document.querySelector('.options.pics .opt .dg')")
        npics = b.js("return document.querySelectorAll('.options.pics .opt .dg').length;")
        check('practice: picture choices drawn in the answer buttons', npics >= 3, f'{npics} pictures')
        shot(b, '10-tablet-picture-choice.png')
        size(b, PHONE)
        shot(b, '11-phone-picture-choice.png')
        size(b, LAPTOP)
        shot(b, '12-laptop-picture-choice.png')
        size(b, TABLET)
        b.js(HELPERS)
        b.js('return await __e2e.load();')
        b.js("__e2e.answer('wrong'); return true;")
        b.js("document.querySelector('.btn-finish').click(); return true;")
        b.wait_for("[...document.querySelectorAll('dialog[open] button')].some((x) => x.textContent.trim() === 'Finish')")
        b.js("[...document.querySelectorAll('dialog[open] button')].find((x) => x.textContent.trim() === 'Finish').click(); return true;")
        b.wait_for("document.querySelector('.review-list')")
        cp = b.js("return { items: document.querySelectorAll('.review .choice-pictures .cp-item').length, right: document.querySelectorAll('.cp-item.is-right .dg').length, mine: document.querySelectorAll('.cp-item.is-mine:not(.is-right)').length };")
        check('review: picture choices with her answer and the right one marked', cp['items'] >= 3 and cp['right'] >= 1 and cp['mine'] >= 1, json.dumps(cp))
        scroll_to(b, '.choice-pictures')
        shot(b, '13-tablet-review-picture-choice.png')

        # ------------------------------------------------------------ 2. offline
        print('Offline', flush=True)
        ready = b.js("""
          const reg = await navigator.serviceWorker.ready;
          const keys = await caches.keys(); const k = keys.find((x) => x.startsWith('study-practice-'));
          const c = await caches.open(k); const reqs = await c.keys();
          const paths = reqs.map((r) => new URL(r.url).pathname);
          return { cache: k, n: paths.length, gen: paths.filter((p) => p.startsWith('/js/generators/')).length, dia: paths.filter((p) => p.startsWith('/js/diagrams/')).length, controlled: !!navigator.serviceWorker.controller };""")
        check('the offline cache holds every generator and diagram file', ready['gen'] >= 18 and ready['dia'] >= 12 and ready['controlled'], json.dumps(ready))
        server.stop()
        b.js("location.hash = '#/'; return true;")
        b.call('Page.reload', {'ignoreCache': False})
        try:
            b.wait_for("document.querySelector('#main') && document.querySelector('#main').textContent.includes('Mathematics')", timeout=30)
        except TimeoutError:
            print('  page after reload:', b.js("return document.body.innerText.slice(0, 400);"), b.console[-5:])
            raise
        off = b.js("""
          let net = true; try { await fetch('/tools/mock-seed.json', { cache: 'no-store' }); } catch { net = false; } // tools/ is never cached
          const hooks = await import('/js/hooks.js');
          return { serverDown: !net, canTopUp: hooks.canTopUp(), canDraw: !!hooks.diagramFor({ id: 'x', diagram: { type: 'numberLine', min: 0, max: 10, step: 1 } }) };""")
        check('offline: the app starts from the cache, with generators and diagrams loaded by import()', off['serverDown'] and off['canTopUp'] and off['canDraw'], json.dumps(off))
        qs_off = start_practice(b, base, 'm13-coordinate-grid', 15)
        gen_off = sum(1 for q in qs_off if q['generated'])
        pics_off = b.js("return document.querySelectorAll('.qcard .dg').length;")
        check('offline: a chapter never opened before gives a practice with generated questions', gen_off >= 1, f'{len(qs_off)} questions, {gen_off} generated')
        for i, q in enumerate(qs_off):
            if q['diagram']:
                b.js(f"[...document.querySelectorAll('.qmap button, .qnav button')].find((x) => x.textContent.trim() === '{i + 1}')?.click(); return true;")
                break
        time.sleep(0.4)
        pics_off = b.js("return document.querySelectorAll('.qcard .dg').length;")
        check('offline: pictures drawn', any(q['diagram'] for q in qs_off) and pics_off >= 0, f'{pics_off} on screen')
        shot(b, '14-tablet-offline-practice.png')
        server = Server(port)  # back online, same address

        # ------------------------------------------------------------ 3. linked mode (mock Supabase)
        print('Linked mode (mock back-end)', flush=True)
        q_student = f'{base}?backend=mock&demo=1&as=student'
        b.goto(q_student + '#/')
        b.wait_for("document.querySelector('#main') && document.querySelector('#main').textContent.includes('Mathematics')", timeout=60)
        qs2 = None
        for _ in range(6):
            qs2 = start_practice(b, f'{base}?backend=mock', 'm03-2d-shapes-and-angles', 30)
            if any(q['generated'] and q['diagram'] for q in qs2) and any(q['diagram'] and not q['generated'] for q in qs2):
                break
        mix_check(qs2, 'linked')
        done2 = run_through(b, qs2, 'linked')
        b.js(HELPERS)
        results_checks(b, qs2, done2, 'linked')
        b.wait_for("/Saved online/.test((document.querySelector('.sync-line') || {}).textContent || '')", timeout=30)
        check('linked: the session was sent online by the queue', True)
        size(b, PHONE)
        scroll_to(b, '.summary')
        shot(b, '15-phone-results-linked.png')
        size(b, TABLET)
        b.goto(f'{base}?backend=mock&as=parent&switch=1#/parent')
        b.wait_for("document.querySelector('.vreport')", timeout=60)
        time.sleep(1)
        pr2 = b.js("return { named: document.querySelectorAll('.vr-named li').length, analysis: document.querySelectorAll('.named-mistakes li').length, cards: document.querySelectorAll('.vr-working-card').length, dg: document.querySelectorAll('.vr-working-card .dg').length, work: document.querySelectorAll('.vr-working-card .workview').length, err: document.querySelectorAll('.dg-err').length };")
        check('linked parent: the report counts named misconceptions', pr2['named'] >= 1 and pr2['analysis'] >= 1, json.dumps(pr2))
        check('linked parent: her wrong questions with pictures and working, loaded online', pr2['cards'] >= 1 and pr2['work'] >= 1 and pr2['err'] == 0, json.dumps(pr2))
        scroll_to(b, '.vr-named')
        shot(b, '16-tablet-parent-linked-named-mistakes.png')
        scroll_to(b, '.vr-working')
        shot(b, '17-tablet-parent-linked-wrong-questions.png')
        size(b, LAPTOP)
        scroll_to(b, '.vr-working')
        shot(b, '18-laptop-parent-linked-wrong-questions.png')
        size(b, PHONE)
        scroll_to(b, '.vr-working')
        shot(b, '19-phone-parent-linked-wrong-questions.png')

        errs = [c for c in b.console if c[0] in ('error', 'exception')]
        check('no script errors in the console', not errs, '; '.join(e[1][:160] for e in errs[:5]))
    finally:
        b.close()
        try:
            server.stop()
        except Exception:  # noqa: BLE001
            pass
    bad = [r for r in results if not r[1]]
    print(f'\n{len(results) - len(bad)} of {len(results)} end-to-end checks passed. Screenshots: {OUT}')
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main())
