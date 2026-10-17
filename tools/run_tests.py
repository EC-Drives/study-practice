"""Run the test pages in a headless browser and print the results (no window opens).

    python tools/run_tests.py                 all three suites: app, diagrams, generators
    python tools/run_tests.py app             only the app suite (test/index.html)
    python tools/run_tests.py diagrams        only the diagram checks (test/diagrams.html)
    python tools/run_tests.py generators      only the generator checks (test/generators.html, 500 seeds)
    python tools/run_tests.py generators --seeds 50     fewer seeds, for a quick run
    python tools/run_tests.py generators --only m10     one topic (or one generator id)
    python tools/run_tests.py --keep          keep the temporary browser profile (for debugging)
    python tools/run_tests.py --notes         also print the details of the integration checks

Starts its own local server on a free port (127.0.0.1 only), opens each page with ?beacon=1 in a
headless browser with a throwaway profile, waits for the page to report its result, then stops
both. Exit code 0 when every test passes, 1 otherwise. Standard library only.

Tip: send the output to a file rather than through a pipe (`> result.txt`). Background helper
processes of the browser can keep a pipe open after this script has finished.
"""
import functools
import http.server
import json
import os
import shutil
import subprocess
import sys
import tempfile
import threading
import time
import urllib.parse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'tools'))
from serve import Handler  # noqa: E402  (same file types and no-cache headers as the laptop server)

BROWSERS = [
    r'C:\Program Files\Google\Chrome\Application\chrome.exe',
    r'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe',
    r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
    r'C:\Program Files\Microsoft\Edge\Application\msedge.exe',
]

# name: (page, timeout in seconds, what a "test" is)
SUITES = {
    'app': ('test/index.html', 300, 'tests'),
    'diagrams': ('test/diagrams.html', 300, 'diagram checks'),
    'generators': ('test/generators.html', 3600, 'generated questions checked'),
}

result = {}
done = threading.Event()


class TestHandler(Handler):
    def do_GET(self):  # noqa: N802
        if self.path.startswith('/test/__result?'):
            result.clear()
            result.update(json.loads(urllib.parse.unquote(self.path.split('?', 1)[1])))
            done.set()
            self.send_response(204)
            self.end_headers()
            return
        super().do_GET()

    def log_message(self, *args):
        pass


class QuietServer(http.server.ThreadingHTTPServer):
    daemon_threads = True

    def handle_error(self, request, client_address):
        pass  # the browser is killed at the end, which resets its open connections


def run_page(browser, port, page, timeout, extra_query=''):
    done.clear()
    result.clear()
    profile = tempfile.mkdtemp(prefix='sp-test-profile-')
    url = f'http://localhost:{port}/{page}?beacon=1{extra_query}'
    proc = subprocess.Popen([browser, '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
                             f'--user-data-dir={profile}', '--window-size=1200,900', url],
                            stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        finished = done.wait(timeout)
    finally:
        proc.kill()
        proc.wait()
        if '--keep' not in sys.argv:
            shutil.rmtree(profile, ignore_errors=True)
    return finished, dict(result)


def main():
    browser = next((b for b in BROWSERS if os.path.exists(b)), None)
    if not browser:
        print('No Chrome or Edge found.')
        return 1
    names = [a for a in sys.argv[1:] if a in SUITES] or list(SUITES)
    extra = ''
    if '--seeds' in sys.argv:
        extra = f"&seeds={int(sys.argv[sys.argv.index('--seeds') + 1])}"
    if '--only' in sys.argv:
        extra += f"&only={sys.argv[sys.argv.index('--only') + 1]}"
    if '--notes' in sys.argv:
        extra += '&notes=1'
    server = QuietServer(('127.0.0.1', 0), functools.partial(TestHandler, directory=ROOT))
    port = server.server_address[1]
    threading.Thread(target=server.serve_forever, daemon=True).start()
    bad = False
    try:
        for name in names:
            page, timeout, unit = SUITES[name]
            t0 = time.time()
            finished, res = run_page(browser, port, page, timeout, extra)
            secs = round(time.time() - t0)
            if not finished:
                print(f'[{name}] the page did not report back within {timeout} s.', flush=True)
                bad = True
                continue
            failed = res.get('failed', [])
            total = res.get('total', 0)
            more = ''
            if name == 'generators':
                more = f" ({res.get('generators', 0)} generators, {res.get('sessions', 0)} session fills)"
            passed = total - (len(failed) if name != 'generators' else 0)
            print(f'[{name}] {passed} of {total} {unit} passed{more}'
                  f'{", " + str(len(failed)) + " problem(s)" if failed else ""} in {secs} s', flush=True)
            for f in failed:
                print(f'  FAILED: {f}', flush=True)
            for n in res.get('notes', []):
                print(f'  note: {n}', flush=True)
            bad = bad or bool(failed) or total == 0
    finally:
        server.shutdown()
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main())
