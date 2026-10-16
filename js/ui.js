// Small DOM helpers and the icon set. Content from the question banks is always inserted as
// text (textContent), never as HTML.

const ICONS = {
  home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h5v-6h4v6h5V10"/>',
  maths: '<rect x="4" y="3" width="16" height="18" rx="3"/><path d="M8 7h8M8 12h2M14 12h2M8 16h2M14 16h2"/>',
  science: '<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3"/><path d="M7.5 15h9"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
  check: '<path d="M4 12.5l5 5L20 6.5"/>',
  cross: '<path d="M6 6l12 12M18 6L6 18"/>',
  star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
  flame: '<path d="M12 3c1 4 5 5.5 5 10a5 5 0 0 1-10 0c0-2.5 1.5-3.8 2.5-5 .3 1.6 1 2.6 2 3 0-3-1-5.5.5-8z"/>',
  trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H4.5a3 3 0 0 0 3.5 4M16 6h3.5a3 3 0 0 1-3.5 4M12 13v4M8.5 21h7M9.5 17h5v4h-5z"/>',
  left: '<path d="M15 5l-7 7 7 7"/>',
  right: '<path d="M9 5l7 7-7 7"/>',
  up: '<path d="M6 15l6-6 6 6"/>',
  down: '<path d="M6 9l6 6 6-6"/>',
  grid: '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
  share: '<path d="M12 15V3M7 8l5-5 5 5"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 19h14"/>',
  upload: '<path d="M12 15V3M7 8l5-5 5 5"/><path d="M5 19h14"/>',
  again: '<path d="M20 12a8 8 0 1 1-2.3-5.7"/><path d="M20 4v5h-5"/>',
  bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
  shuffle: '<path d="M4 7h3c5 0 5 10 10 10h3M4 17h3c2 0 3-1.5 4-3M17 7h3M14 9.5c.8-1.5 1.7-2.5 3-2.5"/><path d="M18 4l3 3-3 3M18 14l3 3-3 3"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 21V5M8 7h7"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
  dash: '<path d="M7 12h10"/>',
  heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
  play: '<path d="M8 5l11 7-11 7z"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
};

const FILLED = new Set(['star', 'play', 'heart', 'flame']);

/** An inline SVG icon (decorative unless a label is given). */
export function icon(name, o = {}) {
  const span = document.createElement('span');
  span.className = `ic ic-${name}${o.cls ? ` ${o.cls}` : ''}`;
  const filled = o.filled ?? FILLED.has(name);
  span.innerHTML = `<svg viewBox="0 0 24 24" width="${o.size || 24}" height="${o.size || 24}" fill="${filled ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="${o.stroke || 2}" stroke-linecap="round" stroke-linejoin="round" ${o.label ? `role="img" aria-label="${o.label.replace(/"/g, '&quot;')}"` : 'aria-hidden="true" focusable="false"'}>${ICONS[name] || ''}</svg>`;
  return span;
}

/**
 * Create an element. attrs: class, text, on{Event}, aria-*, data-*, style (object), any
 * attribute. Children: nodes, strings (as text), arrays, null/false (skipped).
 */
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'value') el.value = v;
    else if (k === 'checked' || k === 'disabled' || k === 'selected') el[k] = !!v;
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  append(el, children);
  return el;
}

function append(el, children) {
  for (const c of children) {
    if (c == null || c === false) continue;
    if (Array.isArray(c)) append(el, c);
    else if (c instanceof Node) el.appendChild(c);
    else el.appendChild(document.createTextNode(String(c)));
  }
}

export function clear(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
  return el;
}

/** A button with an icon and a text label. */
export function button(label, o = {}) {
  return h('button', { type: 'button', class: `btn ${o.cls || ''}`.trim(), onClick: o.onClick, disabled: o.disabled, 'aria-label': o.aria, 'aria-pressed': o.pressed == null ? null : String(!!o.pressed), title: o.title },
    o.icon ? icon(o.icon) : null, label ? h('span', { text: label }) : null);
}

export function link(label, href, o = {}) {
  return h('a', { href, class: `btn ${o.cls || ''}`.trim() }, o.icon ? icon(o.icon) : null, h('span', { text: label }));
}

/**
 * Keyboard use for a group of role="radio" buttons, as screen-reader users expect: Tab enters the
 * group at the chosen option (or the first), the arrow keys, Home and End move between options.
 * With `select` the arrow keys also choose (the usual radio behaviour).
 */
export function rovingRadios(group, { select = true } = {}) {
  const items = () => [...group.querySelectorAll('[role="radio"]')];
  const sync = () => {
    const list = items();
    const on = list.find((b) => b.getAttribute('aria-checked') === 'true') || list[0];
    list.forEach((b) => { b.tabIndex = b === on ? 0 : -1; });
  };
  group.addEventListener('keydown', (e) => {
    const list = items();
    const i = list.indexOf(document.activeElement);
    if (i < 0) return;
    const n = list.length;
    const j = { ArrowDown: (i + 1) % n, ArrowRight: (i + 1) % n, ArrowUp: (i - 1 + n) % n, ArrowLeft: (i - 1 + n) % n, Home: 0, End: n - 1 }[e.key];
    if (j == null) return;
    e.preventDefault();
    if (select) list[j].click();
    else list.forEach((b, k) => { b.tabIndex = k === j ? 0 : -1; });
    list[j].focus();
  });
  group.addEventListener('click', sync);
  sync();
  return group;
}

let toastTimer = null;
export function toast(msg) {
  let t = document.getElementById('toast');
  if (!t) {
    t = h('div', { id: 'toast', role: 'status', 'aria-live': 'polite' });
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3500);
}

/** Screen-reader announcement. */
export function announce(msg) {
  const el = document.getElementById('sr-live');
  if (el) {
    el.textContent = '';
    setTimeout(() => { el.textContent = msg; }, 30);
  }
}

/**
 * A modal dialog. buttons: [{label, value, cls}]. Resolves with the chosen value (or null when
 * dismissed with Escape).
 */
export function dialog(title, body, buttons) {
  return new Promise((resolve) => {
    const dlg = h('dialog', { class: 'dlg', 'aria-labelledby': 'dlg-title' });
    const content = typeof body === 'string' ? h('p', { text: body }) : body;
    const row = h('div', { class: 'dlg-buttons' });
    for (const b of buttons) {
      row.appendChild(button(b.label, { cls: b.cls || '', icon: b.icon, onClick: () => { resolve(b.value); dlg.close(); } }));
    }
    dlg.append(h('h2', { id: 'dlg-title', text: title }), content, row);
    dlg.addEventListener('cancel', () => resolve(null));
    // closed some other way (closeDialogs, below): nothing was chosen
    dlg.addEventListener('close', () => { resolve(null); setTimeout(() => dlg.remove(), 0); });
    document.body.appendChild(dlg);
    dlg.showModal();
    const first = row.querySelector('button');
    if (first) first.focus();
  });
}

/** Close every open dialog (each resolves as dismissed). */
export function closeDialogs() {
  document.querySelectorAll('dialog.dlg[open]').forEach((d) => d.close());
}

/** Offer a file to save. */
export function downloadFile(name, text, type) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url, download: name, style: { display: 'none' } });
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
}

/** Share a file through the device's share sheet where possible; otherwise download it. */
export async function shareOrDownload(name, text, type, title) {
  try {
    const file = new File([text], name, { type });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title });
      return 'shared';
    }
  } catch (e) {
    if (e && e.name === 'AbortError') return 'cancelled';
  }
  downloadFile(name, text, type);
  return 'downloaded';
}

export function pct(x) {
  return `${Math.round((x || 0) * 100)}%`;
}
