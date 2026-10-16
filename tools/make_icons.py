"""Draw the app icons with no image library: a gold star on a blue rounded square.

    python tools/make_icons.py

Writes icons/icon-192.png, icon-512.png, icon-maskable-512.png, apple-touch-icon.png (180 px)
and icon.svg.
"""
import math
import os
import struct
import zlib

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'icons')
BLUE = (42, 120, 214)
GOLD = (253, 194, 41)
WHITE = (255, 255, 255)


def write_png(path, w, h, rgba):
    raw = bytearray()
    for y in range(h):
        raw.append(0)
        raw.extend(rgba[y * w * 4:(y + 1) * w * 4])

    def chunk(tag, data):
        c = struct.pack('>I', len(data)) + tag + data
        return c + struct.pack('>I', zlib.crc32(tag + data) & 0xFFFFFFFF)
    png = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0))
    png += chunk(b'IDAT', zlib.compress(bytes(raw), 9)) + chunk(b'IEND', b'')
    with open(path, 'wb') as f:
        f.write(png)


def star_points(cx, cy, r_out, r_in):
    pts = []
    for k in range(10):
        a = -math.pi / 2 + k * math.pi / 5
        r = r_out if k % 2 == 0 else r_in
        pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return pts


def seg_dist(px, py, ax, ay, bx, by):
    dx, dy = bx - ax, by - ay
    t = max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
    return math.hypot(px - ax - t * dx, py - ay - t * dy)


def poly_sdf(px, py, pts):
    d = min(seg_dist(px, py, *pts[i], *pts[(i + 1) % len(pts)]) for i in range(len(pts)))
    inside = False
    j = len(pts) - 1
    for i in range(len(pts)):
        xi, yi = pts[i]
        xj, yj = pts[j]
        if (yi > py) != (yj > py) and px < (xj - xi) * (py - yi) / (yj - yi) + xi:
            inside = not inside
        j = i
    return -d if inside else d


def rounded_rect(px, py, cx, cy, hw, hh, r):
    qx = abs(px - cx) - hw + r
    qy = abs(py - cy) - hh + r
    return math.hypot(max(qx, 0), max(qy, 0)) + min(max(qx, qy), 0) - r


STAR = star_points(0.5, 0.53, 0.34, 0.15)


def render(size, scale=1.0, full_bleed=False):
    buf = bytearray(size * size * 4)
    for j in range(size):
        for i in range(size):
            u = ((i + 0.5) / size - 0.5) / scale + 0.5
            v = ((j + 0.5) / size - 0.5) / scale + 0.5
            aa = 1.0 / size / scale
            col = list(BLUE)
            if full_bleed:
                alpha = 1.0
            else:
                d = rounded_rect(u, v, 0.5, 0.5, 0.5, 0.5, 0.22)
                alpha = max(0.0, min(1.0, 0.5 - d / aa))

            def blend(c, d):
                a = max(0.0, min(1.0, 0.5 - d / aa))
                if a > 0:
                    for k in range(3):
                        col[k] = col[k] * (1 - a) + c[k] * a

            blend(WHITE, poly_sdf(u, v, STAR) - 0.03)
            blend(GOLD, poly_sdf(u, v, STAR))
            o = (j * size + i) * 4
            buf[o:o + 4] = bytes((int(round(col[0])), int(round(col[1])), int(round(col[2])), int(round(alpha * 255))))
    return buf


def svg():
    pts = ' '.join(f'{x * 512:.1f},{y * 512:.1f}' for x, y in STAR)
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
<rect width="512" height="512" rx="112" fill="#2a78d6"/>
<polygon points="{pts}" fill="#fdc229" stroke="#ffffff" stroke-width="30" stroke-linejoin="round" paint-order="stroke"/>
</svg>
'''


def main():
    os.makedirs(OUT, exist_ok=True)
    for name, size, scale, bleed in [('icon-192.png', 192, 1.0, False), ('icon-512.png', 512, 1.0, False),
                                     ('apple-touch-icon.png', 180, 1.0, True), ('icon-maskable-512.png', 512, 0.78, True)]:
        write_png(os.path.join(OUT, name), size, size, render(size, scale, bleed))
        print('wrote', name)
    with open(os.path.join(OUT, 'icon.svg'), 'w', encoding='utf-8', newline='\n') as f:
        f.write(svg())
    print('wrote icon.svg')


if __name__ == '__main__':
    main()
