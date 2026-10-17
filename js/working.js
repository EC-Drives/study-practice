// The working area: a blank space under every question where she can write her working with an
// Apple Pencil, another stylus, a finger or a mouse, like the margin of a workbook.
//
// * Pointer Events, with pen pressure (a firmer press draws a thicker line).
// * Palm rejection: once a pen has been used, touches on the pad are ignored, so a resting
//   hand leaves no marks. (Fingers draw only on devices where no pen has been seen.)
// * Pen, eraser (also the eraser end or button of a stylus that has one), undo and clear.
// * The pad never scrolls or zooms the page while she writes (touch-action: none, plus a
//   non-passive touch listener for older iPad Safari).
// * What is stored is compact vector data (below), plus a small PNG made from it at the end of
//   the session for reports. Both are saved with her answer.
//
// Stored format, version 1 (JSON):
//   { v: 1, w: 1000, h: <height in units>, s: [ stroke, ... ] }
//   The pad is always 1000 units wide, whatever its size on screen, so working drawn on a phone
//   shows correctly on a laptop. A stroke is { w: <line width, tenths of a unit>, p: [...] } and
//   an eraser stroke also has e: 1. p holds the points as whole numbers, three per point:
//   x and y in half-units and pressure in percent; after the first point each value is the
//   change from the point before (small numbers, so the JSON stays short).

const UNITS = 1000;
const MAX_POINTS = 40000; // per pad, about 30 lines of dense handwriting
const PEN_PX = 2.4; // line width on screen, at normal pressure
const ERASER_PX = 20;
const MIN_STEP = 0.8; // units between kept points

let penSeen = false; // shared by every pad: once she uses a pen, fingers stop drawing

export function penDetected() {
  return penSeen;
}

export function resetPenDetection() {
  penSeen = false;
}

// ------------------------------------------------------------------ format

/** Points [{x, y, p}] (units, pressure 0..1) -> compact integers. */
export function encodePoints(points) {
  const out = [];
  let px = 0;
  let py = 0;
  let pp = 0;
  points.forEach((pt, i) => {
    const x = Math.round(pt.x * 2);
    const y = Math.round(pt.y * 2);
    const p = Math.round(Math.max(0, Math.min(1, pt.p ?? 0.5)) * 100);
    if (i === 0) out.push(x, y, p);
    else out.push(x - px, y - py, p - pp);
    px = x;
    py = y;
    pp = p;
  });
  return out;
}

export function decodePoints(p) {
  const pts = [];
  let x = 0;
  let y = 0;
  let pr = 0;
  for (let i = 0; i + 2 < p.length; i += 3) {
    x += p[i];
    y += p[i + 1];
    pr += p[i + 2];
    pts.push({ x: x / 2, y: y / 2, p: pr / 100 });
  }
  return pts;
}

export function emptyWorking(h = 400) {
  return { v: 1, w: UNITS, h: Math.round(h), s: [] };
}

export function hasInk(working) {
  return !!(working && Array.isArray(working.s) && working.s.some((st) => !st.e));
}

export function pointCount(working) {
  return working && Array.isArray(working.s) ? working.s.reduce((n, st) => n + Math.floor((st.p || []).length / 3), 0) : 0;
}

/** Is this a well-formed working record? (Imported files and server data are checked.) */
export function validWorking(w) {
  if (!w || typeof w !== 'object' || w.v !== 1 || w.w !== UNITS || !Number.isFinite(w.h) || w.h <= 0 || w.h > 20000) return false;
  if (!Array.isArray(w.s) || w.s.length > 5000) return false;
  let n = 0;
  for (const st of w.s) {
    if (!st || typeof st !== 'object' || !Number.isFinite(st.w) || st.w <= 0 || st.w > 2000) return false;
    if (!Array.isArray(st.p) || st.p.length % 3 !== 0 || !st.p.every(Number.isInteger)) return false;
    n += st.p.length / 3;
  }
  return n <= MAX_POINTS * 1.5;
}

/** Lowest point of the ink, in units (for sizing a read-only view). */
export function inkBottom(working) {
  let max = 0;
  for (const st of (working && working.s) || []) {
    for (const pt of decodePoints(st.p)) max = Math.max(max, pt.y + st.w / 20);
  }
  return max;
}

// ------------------------------------------------------------------ drawing

const widthAt = (st, p) => (st.w / 10) * (0.35 + 1.3 * (p ?? 0.5));

function drawStroke(ctx, st, scale) {
  const pts = decodePoints(st.p);
  if (!pts.length) return;
  ctx.save();
  ctx.globalCompositeOperation = st.e ? 'destination-out' : 'source-over';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (pts.length === 1) {
    ctx.beginPath();
    ctx.arc(pts[0].x * scale, pts[0].y * scale, (widthAt(st, pts[0].p) * scale) / 2, 0, Math.PI * 2);
    ctx.fill();
  } else {
    for (let i = 1; i < pts.length; i++) {
      ctx.beginPath();
      ctx.lineWidth = Math.max(0.5, widthAt(st, (pts[i - 1].p + pts[i].p) / 2) * scale);
      ctx.moveTo(pts[i - 1].x * scale, pts[i - 1].y * scale);
      ctx.lineTo(pts[i].x * scale, pts[i].y * scale);
      ctx.stroke();
    }
  }
  ctx.restore();
}

/** Draw a working record onto a 2D context whose width (in its own pixels) is widthPx. */
export function renderWorking(ctx, working, widthPx, ink = '#1b1b1a') {
  const scale = widthPx / UNITS;
  ctx.strokeStyle = ink;
  ctx.fillStyle = ink;
  for (const st of (working && working.s) || []) drawStroke(ctx, st, scale);
}

function inkColour(el) {
  try {
    const c = getComputedStyle(el).getPropertyValue('--ink').trim();
    return c || '#1b1b1a';
  } catch {
    return '#1b1b1a';
  }
}

/**
 * A small PNG of the working for reports (dark ink on white, so it reads anywhere), as a data
 * URL, or null when there is no ink.
 */
export function thumbnailDataUrl(working, widthPx = 360) {
  if (!hasInk(working) || typeof document === 'undefined') return null;
  const hUnits = Math.min(working.h, Math.max(80, inkBottom(working) + 16));
  const hPx = Math.max(40, Math.round((hUnits / UNITS) * widthPx));
  const layer = document.createElement('canvas');
  layer.width = widthPx;
  layer.height = hPx;
  renderWorking(layer.getContext('2d'), working, widthPx, '#1b1b1a');
  const out = document.createElement('canvas');
  out.width = widthPx;
  out.height = hPx;
  const ctx = out.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, widthPx, hPx);
  ctx.drawImage(layer, 0, 0);
  try {
    return out.toDataURL('image/png');
  } catch {
    return null;
  }
}

// ------------------------------------------------------------------ small icons

const SVGNS = 'http://www.w3.org/2000/svg';
const PATHS = {
  pen: 'M4 20l1-4L16 5l3 3L8 19zM14 7l3 3',
  eraser: 'M8 20h12M5 15l8-8 6 6-6 6H9z',
  undo: 'M9 7L4 12l5 5M4 12h11a5 5 0 0 1 0 10h-3',
  clear: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
};

function svgIcon(name) {
  const svg = document.createElementNS(SVGNS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '22');
  svg.setAttribute('height', '22');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  const path = document.createElementNS(SVGNS, 'path');
  path.setAttribute('d', PATHS[name]);
  svg.appendChild(path);
  return svg;
}

function el(tag, cls, attrs = {}) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
}

function toolButton(name, label) {
  const b = el('button', 'wp-tool', { type: 'button', 'data-tool': name });
  const span = el('span');
  span.textContent = label;
  b.append(svgIcon(name), span);
  return b;
}

// ------------------------------------------------------------------ the pad

/**
 * The writable pad. opts: { working (saved record or null), onChange(working), label }
 * Returns { el, get(), destroy(), tool(name) }.
 */
export function workingPad(opts = {}) {
  let working = opts.working && validWorking(opts.working) ? JSON.parse(JSON.stringify(opts.working)) : null;
  const history = []; // undo: { add } or { clear, prev }
  let tool = 'pen';
  let active = null; // { id, type, stroke, pts }
  let recentTouch = []; // touch lines from the last moment, in case a palm made them before the pen arrived
  let total = pointCount(working);

  const wrap = el('div', 'workpad');
  const head = el('div', 'wp-head');
  const title = el('span', 'wp-title');
  title.textContent = opts.label || 'Your working';
  const tools = el('div', 'wp-tools', { role: 'toolbar', 'aria-label': 'Working area tools' });
  const penBtn = toolButton('pen', 'Pen');
  const eraseBtn = toolButton('eraser', 'Eraser');
  const undoBtn = toolButton('undo', 'Undo');
  const clearBtn = toolButton('clear', 'Clear');
  tools.append(penBtn, eraseBtn, undoBtn, clearBtn);
  head.append(title, tools);
  const paper = el('div', 'wp-paper');
  const canvas = el('canvas', 'wp-canvas', { role: 'img', 'aria-label': 'Working area: write or draw your working here with a pen, a finger or the mouse' });
  const note = el('p', 'wp-note small muted', { 'aria-live': 'polite' });
  paper.append(canvas);
  wrap.append(head, paper, note);
  const ctx = canvas.getContext('2d');

  function syncButtons() {
    penBtn.setAttribute('aria-pressed', String(tool === 'pen'));
    eraseBtn.setAttribute('aria-pressed', String(tool === 'eraser'));
    undoBtn.disabled = !history.length && !(working && working.s.length);
    clearBtn.disabled = !(working && working.s.length);
    wrap.classList.toggle('is-erasing', tool === 'eraser');
    note.textContent = penSeen ? 'Pen in use: your hand can rest on the screen, fingers will not draw.' : '';
  }

  function cssWidth() {
    return canvas.clientWidth || paper.clientWidth || 600;
  }

  function cssHeight() {
    return canvas.clientHeight || 260;
  }

  function sizeCanvas() {
    const dpr = Math.min(3, globalThis.devicePixelRatio || 1);
    const w = cssWidth();
    const h = cssHeight();
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    redraw();
  }

  function redraw() {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    renderWorking(ctx, working, cssWidth(), inkColour(wrap));
  }

  function unitsPerPx() {
    return UNITS / cssWidth();
  }

  function toUnits(e) {
    const r = canvas.getBoundingClientRect();
    const k = UNITS / (r.width || cssWidth());
    let p = e.pressure;
    if (e.pointerType !== 'pen' || !(p > 0)) p = 0.5; // mouse and touch: even lines
    return { x: (e.clientX - r.left) * k, y: (e.clientY - r.top) * k, p };
  }

  function emit() {
    syncButtons();
    if (opts.onChange) opts.onChange(working && working.s.length ? working : null);
  }

  function ensureWorking() {
    if (!working) working = emptyWorking(cssHeight() * unitsPerPx());
    working.h = Math.max(working.h, Math.round(cssHeight() * unitsPerPx()));
  }

  function liveSegment(a, b, st) {
    const k = cssWidth() / UNITS;
    ctx.save();
    ctx.globalCompositeOperation = st.e ? 'destination-out' : 'source-over';
    ctx.strokeStyle = inkColour(wrap);
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(0.5, widthAt(st, (a.p + b.p) / 2) * k);
    ctx.beginPath();
    ctx.moveTo(a.x * k, a.y * k);
    ctx.lineTo(b.x * k, b.y * k);
    ctx.stroke();
    ctx.restore();
  }

  function onDown(e) {
    if (e.pointerType === 'pen') {
      if (!penSeen) {
        // first pen contact: lines a resting palm drew just before it are not her writing
        penSeen = true;
        const cut = Date.now() - 1500;
        const palm = new Set(recentTouch.filter((t) => t.at > cut).map((t) => t.stroke));
        if (palm.size && working) {
          working.s = working.s.filter((st) => !palm.has(st));
          total = pointCount(working);
          redraw();
          emit();
        }
      }
      if (active && active.type === 'touch') {
        // the palm is down and the pen has just touched: drop the palm's line, follow the pen
        active = null;
        redraw();
      }
    }
    if (e.pointerType === 'touch' && penSeen) return; // palm rejection
    if (active) return; // one line at a time (a second finger or the palm)
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    if (total >= MAX_POINTS) {
      note.textContent = 'The working area is full. Clear it or carry on below in your head.';
      return;
    }
    // the pad's pixel size must match its size on screen before drawing (rotation, resizing)
    const dpr = Math.min(3, globalThis.devicePixelRatio || 1);
    if (Math.abs(canvas.width - Math.round(cssWidth() * dpr)) > 1 || Math.abs(canvas.height - Math.round(cssHeight() * dpr)) > 1) sizeCanvas();
    ensureWorking();
    const erase = tool === 'eraser' || (e.pointerType === 'pen' && (e.button === 5 || (e.buttons & 32) === 32));
    const upp = unitsPerPx();
    const stroke = { w: Math.round((erase ? ERASER_PX : PEN_PX) * upp * 10), p: [] };
    if (erase) stroke.e = 1;
    const pt = toUnits(e);
    active = { id: e.pointerId, type: e.pointerType, stroke, pts: [pt] };
    try { canvas.setPointerCapture(e.pointerId); } catch { /* old browsers */ }
    liveSegment(pt, pt, stroke);
    syncButtons();
  }

  function onMove(e) {
    if (!active || e.pointerId !== active.id) return;
    e.preventDefault();
    const list = typeof e.getCoalescedEvents === 'function' ? e.getCoalescedEvents() : [e];
    for (const ev of list.length ? list : [e]) {
      const pt = toUnits(ev);
      const last = active.pts[active.pts.length - 1];
      if (Math.hypot(pt.x - last.x, pt.y - last.y) < MIN_STEP) continue;
      if (total + active.pts.length >= MAX_POINTS) break;
      active.pts.push(pt);
      liveSegment(last, pt, active.stroke);
    }
  }

  function onUp(e) {
    if (!active || e.pointerId !== active.id) return;
    const { stroke, pts, type } = active;
    active = null;
    stroke.p = encodePoints(pts);
    working.s.push(stroke);
    if (type === 'touch' && !penSeen) recentTouch = [...recentTouch.filter((t) => t.at > Date.now() - 1500), { stroke, at: Date.now() }];
    total += pts.length;
    history.push({ add: true });
    if (stroke.e) redraw();
    emit();
  }

  function onCancel(e) {
    // the browser took the gesture over (or the pen left): keep what was drawn
    onUp(e);
  }

  function setTool(name) {
    tool = name;
    syncButtons();
  }

  function undo() {
    const last = history.pop();
    if (last && last.clear) working = last.prev;
    else if (working && working.s.length) working.s.pop();
    total = pointCount(working);
    redraw();
    emit();
  }

  function clearAll() {
    if (!working || !working.s.length) return;
    history.push({ clear: true, prev: JSON.parse(JSON.stringify(working)) });
    working = emptyWorking(working.h);
    total = 0;
    redraw();
    emit();
  }

  penBtn.addEventListener('click', () => setTool('pen'));
  eraseBtn.addEventListener('click', () => setTool('eraser'));
  undoBtn.addEventListener('click', undo);
  clearBtn.addEventListener('click', clearAll);
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onCancel);
  canvas.addEventListener('lostpointercapture', onCancel);
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  // older iPad Safari scrolls on touch even with touch-action set: stop it on the pad only
  const stopTouch = (e) => { if (e.cancelable) e.preventDefault(); };
  canvas.addEventListener('touchstart', stopTouch, { passive: false });
  canvas.addEventListener('touchmove', stopTouch, { passive: false });

  let ro = null;
  if (typeof ResizeObserver === 'function') {
    let lastW = 0;
    ro = new ResizeObserver(() => {
      const w = cssWidth();
      if (Math.abs(w - lastW) >= 1) {
        lastW = w;
        sizeCanvas();
      }
    });
    ro.observe(paper);
  }
  requestAnimationFrame(sizeCanvas);
  setTimeout(sizeCanvas, 0); // also when the page is in the background (no animation frames)
  syncButtons();

  return {
    el: wrap,
    canvas,
    get: () => (working && working.s.length ? JSON.parse(JSON.stringify(working)) : null),
    tool: setTool,
    undo,
    clear: clearAll,
    redraw: sizeCanvas,
    destroy() {
      if (ro) ro.disconnect();
    },
  };
}

/** A read-only picture of saved working, sized to its ink. */
export function workingView(working, opts = {}) {
  const wrap = el('div', `workview${opts.cls ? ` ${opts.cls}` : ''}`);
  const canvas = el('canvas', 'wv-canvas', { role: 'img', 'aria-label': opts.label || 'Her working for this question' });
  wrap.append(canvas);
  if (!working || !validWorking(working)) return wrap;
  const hUnits = Math.min(working.h, Math.max(120, inkBottom(working) + 24));
  const draw = () => {
    const w = wrap.clientWidth || opts.width || 320;
    const h = Math.round((hUnits / UNITS) * w);
    const dpr = Math.min(3, globalThis.devicePixelRatio || 1);
    canvas.style.height = `${h}px`;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    const c = canvas.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    renderWorking(c, working, w, inkColour(wrap));
  };
  if (typeof ResizeObserver === 'function') {
    let lastW = 0;
    new ResizeObserver(() => {
      const w = wrap.clientWidth;
      if (Math.abs(w - lastW) >= 1) { lastW = w; draw(); }
    }).observe(wrap);
  }
  requestAnimationFrame(draw);
  setTimeout(() => { if (wrap.isConnected) draw(); }, 0);
  return wrap;
}
