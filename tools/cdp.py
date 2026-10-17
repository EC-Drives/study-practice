"""A very small Chrome DevTools Protocol client (standard library only), for the laptop tests.

Starts headless Chrome (or Edge) with a throwaway profile and talks to one page over a
WebSocket. Used by tools/e2e.py to drive the app, draw with a pen, take screenshots and test
offline use. Development only: never part of the app or its offline cache.
"""
import base64
import json
import os
import shutil
import socket
import struct
import subprocess
import tempfile
import time
import urllib.request

BROWSERS = [
    r'C:\Program Files\Google\Chrome\Application\chrome.exe',
    r'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe',
    r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
    r'C:\Program Files\Microsoft\Edge\Application\msedge.exe',
]


class WebSocket:
    def __init__(self, url, timeout=60):
        assert url.startswith('ws://')
        rest = url[5:]
        hostport, path = rest.split('/', 1)
        host, port = hostport.split(':')
        self.sock = socket.create_connection((host, int(port)), timeout=timeout)
        key = base64.b64encode(os.urandom(16)).decode()
        req = (f'GET /{path} HTTP/1.1\r\nHost: {hostport}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n'
               f'Sec-WebSocket-Key: {key}\r\nSec-WebSocket-Version: 13\r\n\r\n')
        self.sock.sendall(req.encode())
        buf = b''
        while b'\r\n\r\n' not in buf:
            chunk = self.sock.recv(4096)
            if not chunk:
                raise ConnectionError('no handshake')
            buf += chunk
        head, self.extra = buf.split(b'\r\n\r\n', 1)
        if b' 101 ' not in head.split(b'\r\n')[0]:
            raise ConnectionError(head.decode(errors='replace'))

    def _read(self, n):
        out = self.extra[:n]
        self.extra = self.extra[n:]
        while len(out) < n:
            chunk = self.sock.recv(max(65536, n - len(out)))
            if not chunk:
                raise ConnectionError('closed')
            out += chunk
        if len(out) > n:
            self.extra = out[n:] + self.extra
            out = out[:n]
        return out

    def send(self, text):
        data = text.encode()
        head = bytearray([0x81])
        n = len(data)
        if n < 126:
            head.append(0x80 | n)
        elif n < 65536:
            head.append(0x80 | 126)
            head += struct.pack('>H', n)
        else:
            head.append(0x80 | 127)
            head += struct.pack('>Q', n)
        mask = os.urandom(4)
        head += mask
        self.sock.sendall(bytes(head) + bytes(b ^ mask[i % 4] for i, b in enumerate(data)))

    def recv(self):
        parts = []
        while True:
            b1, b2 = self._read(2)
            op = b1 & 0x0F
            n = b2 & 0x7F
            if n == 126:
                n = struct.unpack('>H', self._read(2))[0]
            elif n == 127:
                n = struct.unpack('>Q', self._read(8))[0]
            mask = self._read(4) if b2 & 0x80 else None
            data = self._read(n)
            if mask:
                data = bytes(b ^ mask[i % 4] for i, b in enumerate(data))
            if op == 8:
                raise ConnectionError('closed by browser')
            if op == 9:
                continue
            parts.append(data)
            if b1 & 0x80:
                return b''.join(parts).decode()


class Browser:
    """One headless browser with one page."""

    def __init__(self, width=1200, height=900):
        exe = next((b for b in BROWSERS if os.path.exists(b)), None)
        if not exe:
            raise RuntimeError('No Chrome or Edge found.')
        self.profile = tempfile.mkdtemp(prefix='sp-e2e-profile-')
        self.proc = subprocess.Popen([exe, '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
                                      '--remote-debugging-port=0', f'--user-data-dir={self.profile}', f'--window-size={width},{height}',
                                      'about:blank'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        port_file = os.path.join(self.profile, 'DevToolsActivePort')
        for _ in range(200):
            if os.path.exists(port_file) and open(port_file).read().strip():
                break
            time.sleep(0.05)
        port = int(open(port_file).read().split()[0])
        targets = json.load(urllib.request.urlopen(f'http://127.0.0.1:{port}/json/list'))
        page = next(t for t in targets if t['type'] == 'page')
        self.ws = WebSocket(page['webSocketDebuggerUrl'])
        self.next_id = 0
        self.events = []
        self.console = []
        for m in ('Page.enable', 'Runtime.enable', 'Network.enable'):
            self.call(m)

    def call(self, method, params=None, timeout=60):
        self.next_id += 1
        my = self.next_id
        self.ws.send(json.dumps({'id': my, 'method': method, 'params': params or {}}))
        end = time.time() + timeout
        while time.time() < end:
            msg = json.loads(self.ws.recv())
            if msg.get('id') == my:
                if 'error' in msg:
                    raise RuntimeError(f"{method}: {msg['error']}")
                return msg.get('result', {})
            self._event(msg)
        raise TimeoutError(method)

    def _event(self, msg):
        m = msg.get('method')
        if m == 'Runtime.consoleAPICalled':
            p = msg['params']
            self.console.append((p['type'], ' '.join(str(a.get('value', a.get('description', ''))) for a in p.get('args', []))))
        elif m == 'Runtime.exceptionThrown':
            d = msg['params']['exceptionDetails']
            self.console.append(('exception', (d.get('exception') or {}).get('description', d.get('text', ''))))
        self.events.append(m)

    def js(self, expr, timeout=60):
        """Evaluate an expression (await allowed) and return its value."""
        r = self.call('Runtime.evaluate', {'expression': f'(async () => {{ {expr} }})()', 'awaitPromise': True, 'returnByValue': True}, timeout)
        if 'exceptionDetails' in r:
            raise RuntimeError(r['exceptionDetails'].get('exception', {}).get('description', str(r['exceptionDetails'])))
        return r.get('result', {}).get('value')

    def goto(self, url, wait='document.readyState === "complete"'):
        self.call('Page.navigate', {'url': url})
        self.wait_for(wait)

    def wait_for(self, cond, timeout=30):
        end = time.time() + timeout
        while time.time() < end:
            try:
                if self.js(f'return !!({cond});'):
                    return True
            except RuntimeError:
                pass
            time.sleep(0.15)
        raise TimeoutError(f'waiting for: {cond}')

    def size(self, width, height, mobile=False, scale=1, dark=False):
        self.call('Emulation.setDeviceMetricsOverride', {'width': width, 'height': height, 'deviceScaleFactor': scale, 'mobile': mobile})
        self.call('Emulation.setEmulatedMedia', {'features': [{'name': 'prefers-color-scheme', 'value': 'dark' if dark else 'light'}]})
        if mobile:
            self.call('Emulation.setTouchEmulationEnabled', {'enabled': True, 'maxTouchPoints': 5})
        else:
            self.call('Emulation.setTouchEmulationEnabled', {'enabled': False})

    def shot(self, path, full=False):
        params = {'format': 'png'}
        if full:
            params['captureBeyondViewport'] = True
            m = self.call('Page.getLayoutMetrics')
            c = m['cssContentSize']
            params['clip'] = {'x': 0, 'y': 0, 'width': c['width'], 'height': min(c['height'], 6000), 'scale': 1}
        data = self.call('Page.captureScreenshot', params)['data']
        with open(path, 'wb') as f:
            f.write(base64.b64decode(data))

    def pen_stroke(self, points, pressure=0.6):
        """Draw one pen stroke through page coordinates [(x, y), ...]."""
        x, y = points[0]
        base = {'pointerType': 'pen', 'force': pressure, 'button': 'left', 'clickCount': 1}
        self.call('Input.dispatchMouseEvent', {'type': 'mouseMoved', 'x': x, 'y': y, 'pointerType': 'pen'})
        self.call('Input.dispatchMouseEvent', {'type': 'mousePressed', 'x': x, 'y': y, **base, 'buttons': 1})
        for (x, y) in points[1:]:
            self.call('Input.dispatchMouseEvent', {'type': 'mouseMoved', 'x': x, 'y': y, **base, 'buttons': 1})
        self.call('Input.dispatchMouseEvent', {'type': 'mouseReleased', 'x': x, 'y': y, **base, 'buttons': 0})

    def close(self):
        try:
            self.call('Browser.close', timeout=5)
        except Exception:  # noqa: BLE001
            pass
        try:
            self.proc.wait(5)
        except Exception:  # noqa: BLE001
            self.proc.kill()
        shutil.rmtree(self.profile, ignore_errors=True)
