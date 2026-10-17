"""Write a sample of generated maths questions to a JSON file, for the CLO's validate.py.

    python tools/gen_sample.py [out.json] [--per 20] [--seed 1]

For every maths topic and every difficulty, `--per` questions from generateSet() (default 20, so
900 in all), made in a headless browser exactly as the app makes them. Then check them with
    python "C:\\Claude Code\\Chief Learning Officer\\Content\\validate.py" --questions out.json
Standard library only (uses tools/cdp.py and a local server on 127.0.0.1).
"""
import functools
import http.server
import json
import os
import sys
import threading

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'tools'))
from serve import Handler  # noqa: E402
from cdp import Browser  # noqa: E402


class Quiet(Handler):
    def log_message(self, *args):
        pass


def main(argv):
    out = next((a for a in argv if a.endswith('.json')), os.path.join(ROOT, 'screenshots', 'generated-sample.json'))
    per = int(argv[argv.index('--per') + 1]) if '--per' in argv else 20
    seed = int(argv[argv.index('--seed') + 1]) if '--seed' in argv else 1
    httpd = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=ROOT))
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    b = Browser()
    try:
        b.goto(f'http://localhost:{httpd.server_address[1]}/docs/', wait='document.readyState !== "loading"')
        qs = b.js(f"""
          const G = await import('/js/generators/index.js');
          const out = [];
          for (const t of G.GENERATED_TOPICS) for (const d of [1, 2, 3]) {{
            if (!G.generatorsFor(t, null, d).length) continue;
            out.push(...G.generateSet(t, {per}, {seed} * 100000 + d * 1000 + G.GENERATED_TOPICS.indexOf(t), {{ difficulty: d }}));
          }}
          return {{ questions: out, errors: G.LOAD_ERRORS }};""", timeout=300)
    finally:
        b.close()
        httpd.shutdown()
    if qs['errors']:
        print('Load errors:', qs['errors'])
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, 'w', encoding='utf-8') as f:
        json.dump(qs['questions'], f, ensure_ascii=False, indent=1)
    print(f"{len(qs['questions'])} generated questions written to {out}")
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
