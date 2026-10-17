"""Run the test page in a headless browser and print the result (no window opens).

    python tools/run_tests.py            uses Chrome, or Edge if Chrome is missing
    python tools/run_tests.py --keep     keep the temporary browser profile (for debugging)

Starts its own local server on a free port (127.0.0.1 only), opens test/?beacon=1 in a headless
browser with a throwaway profile, waits for the page to report its result, then stops both.
Exit code 0 when every test passes, 1 otherwise. Standard library only.
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

result = {}
done = threading.Event()


class TestHandler(Handler):
    def do_GET(self):  # noqa: N802
        if self.path.startswith('/test/__result?'):
            result.update(json.loads(urllib.parse.unquote(self.path.split('?', 1)[1])))
            done.set()
            self.send_response(204)
            self.end_headers()
            return
        super().do_GET()

    def log_message(self, *args):
        pass


class QuietServer(http.server.ThreadingHTTPServer):
    def handle_error(self, request, client_address):
        pass  # the browser is killed at the end, which resets its open connections


def main():
    browser = next((b for b in BROWSERS if os.path.exists(b)), None)
    if not browser:
        print('No Chrome or Edge found.')
        return 1
    server = QuietServer(('127.0.0.1', 0), functools.partial(TestHandler, directory=ROOT))
    port = server.server_address[1]
    threading.Thread(target=server.serve_forever, daemon=True).start()
    profile = tempfile.mkdtemp(prefix='sp-test-profile-')
    url = f'http://localhost:{port}/test/?beacon=1'
    proc = subprocess.Popen([browser, '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
                             f'--user-data-dir={profile}', '--window-size=1200,900', url],
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        finished = done.wait(180)
    finally:
        proc.kill()
        proc.wait()
        server.shutdown()
        if '--keep' not in sys.argv:
            shutil.rmtree(profile, ignore_errors=True)
    if not finished:
        print('The test page did not report back within 3 minutes.')
        return 1
    failed = result.get('failed', [])
    print(f"{result.get('total', 0) - len(failed)} of {result.get('total', 0)} passed")
    for f in failed:
        print(f'  FAILED: {f}')
    return 1 if failed else 0


if __name__ == '__main__':
    sys.exit(main())
