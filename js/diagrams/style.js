// Diagram colours and classes. Light and dark come from the app's theme tokens where they exist
// (--ink, --surface, --accent ...) with fallbacks, and follow the same theme switch as the app:
// the OS setting unless the page has data-theme="light" or "dark".
//
// Series colours are the dataviz reference palette (validated for colour-blind separation on
// adjacent pairs, light and dark), used in fixed order. Charts always carry text labels or a
// legend as well, so colour never carries meaning alone.

const LIGHT = `
  --dg-ink: var(--ink, #1b1b1a); --dg-ink2: var(--ink-2, #4a4843); --dg-muted: var(--muted, #6b6963);
  --dg-surface: var(--surface, #ffffff); --dg-grid: #dedbd2; --dg-grid2: #bcb8ad; --dg-axis: #6b6963;
  --dg-accent: var(--accent, #236fcc); --dg-accent-ink: var(--accent-strong, #1c5cab); --dg-shade: rgba(35,111,204,0.18);
  --dg-shade2: rgba(35,111,204,0.07);
  --dg-s1: #2a78d6; --dg-s2: #eb6834; --dg-s3: #1baf7a; --dg-s4: #eda100; --dg-s5: #e87ba4; --dg-s6: #008300;
  --dg-liquid: #b7d3f6; --dg-liquid-edge: #2a78d6; --dg-red: #d03b3b; --dg-red-soft: #f6cdc8; --dg-blue: #2a78d6; --dg-blue-soft: #cde2fb;
  --dg-sun: #f7c234; --dg-sun-edge: #c98500; --dg-earth: #6fa9e3; --dg-land: #5aa05a; --dg-night: #23324a;
  --dg-moon: #f4f0e2; --dg-moon-dark: #4a4843; --dg-green: #2f8f2f; --dg-leaf: #d3ecce; --dg-brown: #8a5a2b;
  --dg-shadow: #3d3c39; --dg-glass: #eef4fb; --dg-organ: #f3c9c2; --dg-organ2: #e6a59b; --dg-bone: #efe9da; --dg-glow: #fde68a;
`;
const DARK = `
  --dg-ink: var(--ink, #f0efec); --dg-ink2: var(--ink-2, #c9c7bd); --dg-muted: var(--muted, #a19f96);
  --dg-surface: var(--surface, #1a1a19); --dg-grid: #34332f; --dg-grid2: #57554f; --dg-axis: #a19f96;
  --dg-accent: #6da7ec; --dg-accent-ink: #86b6ef; --dg-shade: rgba(109,167,236,0.26); --dg-shade2: rgba(109,167,236,0.10);
  --dg-s1: #3987e5; --dg-s2: #d95926; --dg-s3: #199e70; --dg-s4: #c98500; --dg-s5: #d55181; --dg-s6: #008300;
  --dg-liquid: #1f3d63; --dg-liquid-edge: #5598e7; --dg-red: #e66767; --dg-red-soft: #5a2523; --dg-blue: #5598e7; --dg-blue-soft: #1d3554;
  --dg-sun: #f0b43a; --dg-sun-edge: #f7c234; --dg-earth: #3d79b8; --dg-land: #3f8f3f; --dg-night: #0b1220;
  --dg-moon: #e8e4d4; --dg-moon-dark: #2c2c2a; --dg-green: #4fb34f; --dg-leaf: #1f3a1f; --dg-brown: #b07a45;
  --dg-shadow: #000000; --dg-glass: #1d2633; --dg-organ: #5a2f2b; --dg-organ2: #7a3d36; --dg-bone: #3a372f; --dg-glow: #5c4a12;
`;

export const DIAGRAM_CSS = `
.dg { margin: 12px 0; ${LIGHT} }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) .dg { ${DARK} } }
:root[data-theme="dark"] .dg { ${DARK} }
.dg { color: var(--dg-ink); }
.dg svg.dg-svg { display: block; width: 100%; height: auto; margin: 0 auto; overflow: visible; font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }
.dg figcaption { text-align: center; color: var(--dg-ink2); font-size: 0.85em; margin-top: 6px; }
.dg .dg-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); clip-path: inset(50%); white-space: nowrap; }
.dg-t { fill: var(--dg-ink); }
.dg-t2 { fill: var(--dg-ink2); }
.dg-tm { fill: var(--dg-muted); }
.dg-halo { paint-order: stroke; stroke: var(--dg-surface); stroke-width: 4px; stroke-linejoin: round; }
.dg-ink { stroke: var(--dg-ink); fill: none; stroke-linecap: round; stroke-linejoin: round; }
.dg-ink2 { stroke: var(--dg-ink2); fill: none; stroke-linecap: round; }
.dg-fill-ink { fill: var(--dg-ink); }
.dg-fill-ink2 { fill: var(--dg-ink2); }
.dg-fill-surface { fill: var(--dg-surface); }
.dg-grid { stroke: var(--dg-grid); stroke-width: 1px; fill: none; }
.dg-grid2 { stroke: var(--dg-grid2); stroke-width: 1px; fill: none; }
.dg-axis { stroke: var(--dg-axis); stroke-width: 1.5px; fill: none; }
.dg-accent { stroke: var(--dg-accent); fill: none; }
.dg-fill-accent { fill: var(--dg-accent); }
.dg-shade { fill: var(--dg-shade); }
.dg-shade2 { fill: var(--dg-shade2); }
.dg-part { fill: var(--dg-accent); fill-opacity: 0.55; }
.dg-dot { fill: var(--dg-accent); stroke: var(--dg-surface); stroke-width: 2px; }
.dg-qbox-r { fill: var(--dg-surface); stroke: var(--dg-accent); stroke-width: 1.6px; stroke-dasharray: 4 3; }
.dg-qbox-t { fill: var(--dg-accent-ink); font-weight: 700; }
.dg-s1 { fill: var(--dg-s1); } .dg-s2 { fill: var(--dg-s2); } .dg-s3 { fill: var(--dg-s3); }
.dg-s4 { fill: var(--dg-s4); } .dg-s5 { fill: var(--dg-s5); } .dg-s6 { fill: var(--dg-s6); }
.dg-l1 { stroke: var(--dg-s1); } .dg-l2 { stroke: var(--dg-s2); } .dg-l3 { stroke: var(--dg-s3); }
.dg-gap { stroke: var(--dg-surface); stroke-width: 2px; }
.dg-liquid { fill: var(--dg-liquid); stroke: var(--dg-liquid-edge); stroke-width: 1.5px; }
.dg-red { fill: var(--dg-red); } .dg-red-l { stroke: var(--dg-red); fill: none; }
.dg-red-soft { fill: var(--dg-red-soft); } .dg-blue-soft { fill: var(--dg-blue-soft); }
.dg-blue { fill: var(--dg-blue); } .dg-blue-l { stroke: var(--dg-blue); fill: none; }
.dg-sun { fill: var(--dg-sun); stroke: var(--dg-sun-edge); stroke-width: 1.5px; }
.dg-sunray { stroke: var(--dg-sun-edge); stroke-width: 2px; fill: none; stroke-linecap: round; }
.dg-ray { stroke: var(--dg-sun-edge); fill: none; stroke-width: 2.2px; stroke-linecap: round; }
.dg-fill-ray { fill: var(--dg-sun-edge); }
.dg-earth { fill: var(--dg-earth); } .dg-land { fill: var(--dg-land); } .dg-night { fill: var(--dg-night); }
.dg-moon { fill: var(--dg-moon); } .dg-moon-dark { fill: var(--dg-moon-dark); }
.dg-green { fill: var(--dg-green); } .dg-green-l { stroke: var(--dg-green); fill: none; }
.dg-leaf { fill: var(--dg-leaf); } .dg-brown { fill: var(--dg-brown); }
.dg-shadow { fill: var(--dg-shadow); }
.dg-glass { fill: var(--dg-glass); }
.dg-organ { fill: var(--dg-organ); } .dg-organ2 { fill: var(--dg-organ2); } .dg-bone { fill: var(--dg-bone); }
.dg-glow { fill: var(--dg-glow); }
.dg-tube { stroke: var(--dg-ink); fill: none; stroke-linecap: butt; stroke-linejoin: round; }
.dg-tube-glass { stroke: var(--dg-glass); fill: none; stroke-linecap: butt; stroke-linejoin: round; }
.dg-tube-red { stroke: var(--dg-red); fill: none; stroke-linecap: butt; stroke-linejoin: round; }
.dg-tube-blue { stroke: var(--dg-blue); fill: none; stroke-linecap: butt; stroke-linejoin: round; }
.dg-white-l { stroke: #ffffff; fill: none; stroke-linecap: round; }
.dg-white { fill: #ffffff; }
.dg-tube-organ { stroke: var(--dg-organ2); fill: none; stroke-linecap: round; }
.dg-err { border: 1px dashed var(--dg-muted); border-radius: 10px; padding: 12px; color: var(--dg-ink2); text-align: center; font-size: 0.9em; }
.dg table.dg-table { border-collapse: collapse; margin: 0 auto; font-size: 0.95em; min-width: 60%; }
.dg-table caption { font-weight: 600; padding-bottom: 6px; color: var(--dg-ink); }
.dg-table th, .dg-table td { border: 1px solid var(--dg-grid2); padding: 6px 12px; text-align: center; vertical-align: middle; }
.dg-table thead th { background: var(--dg-shade2); }
.dg-table tbody th { font-weight: 600; text-align: left; }
.dg-table .dg-tally { display: inline-block; vertical-align: middle; }
.dg-table .dg-q { display: inline-block; min-width: 1.8em; border: 1.6px dashed var(--dg-accent); border-radius: 4px; color: var(--dg-accent-ink); font-weight: 700; }
.dg-carroll td { min-width: 6em; height: 3.2em; }
.dg-carroll td span { display: inline-block; margin: 2px 6px; }
.dg-options { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 8px; }
`;

let injected = false;
/** Add the diagram styles to the page once. */
export function ensureStyles(doc = globalThis.document) {
  if (injected || !doc || !doc.head) return;
  if (doc.getElementById('dg-styles')) { injected = true; return; }
  const s = doc.createElement('style');
  s.id = 'dg-styles';
  s.textContent = DIAGRAM_CSS;
  doc.head.appendChild(s);
  injected = true;
}
