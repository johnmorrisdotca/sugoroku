/**
 * THE STYLE a Sugoroku board is drawn with: colours as custom properties
 * (`--sg-felt`, `--sg-white` and the rest of `SugorokuColours`), light by
 * default and dark when the device is, and the one rule that matters for a game
 * played with fingers and a mouse: nothing on the board can be selected,
 * dragged or double-tapped.
 *
 * Put it in the page once. Every colour is a custom property on `.sugoroku`,
 * so a page's own style needs only to set the ones it wants different; the
 * felt follows `--felt` where a page defines one.
 */
export const SUGOROKU_STYLE = `
.sugoroku {
  --sg-frame: #5b3a1f; --sg-felt: var(--felt, #2f5d4a); --sg-point-a: #e7d8b1; --sg-point-b: #8e3a2b; --sg-bar: #4a2f19; --sg-tray: #24493a;
  --sg-white: #f6f0df; --sg-white-edge: #b3a888; --sg-black: #2b2724; --sg-black-edge: #0d0b0a;
  --sg-number: #e8dcc0; --sg-selected: #ffd23f; --sg-target: #7fe3a1; --sg-die: #fbf8f1; --sg-pip: #1f2320; --sg-cube: #fbf8f1; --sg-cube-ink: #1f2320;
  display: block; width: 100%; height: auto; overflow: visible;
  user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; touch-action: manipulation; -webkit-tap-highlight-color: transparent;
  font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) .sugoroku:not([data-theme="light"]) {
    --sg-frame: #2b1c0e; --sg-felt: var(--felt, #1f4135); --sg-point-a: #bdad88; --sg-point-b: #6b2a1f; --sg-bar: #21160b; --sg-tray: #173026;
    --sg-white: #e9e3d0; --sg-white-edge: #9a9078; --sg-number: #b9ae92; --sg-die: #e9e3d0; --sg-cube: #e9e3d0;
  }
}
:root[data-theme="dark"] .sugoroku:not([data-theme="light"]), .sugoroku[data-theme="dark"] {
  --sg-frame: #2b1c0e; --sg-felt: var(--felt, #1f4135); --sg-point-a: #bdad88; --sg-point-b: #6b2a1f; --sg-bar: #21160b; --sg-tray: #173026;
  --sg-white: #e9e3d0; --sg-white-edge: #9a9078; --sg-number: #b9ae92; --sg-die: #e9e3d0; --sg-cube: #e9e3d0;
}
.sugoroku * { user-select: none; -webkit-user-select: none; }
.sugoroku .sg-frame { fill: var(--sg-frame); }
.sugoroku .sg-felt { fill: var(--sg-felt); }
.sugoroku .sg-rail, .sugoroku .sg-tray-well { fill: var(--sg-tray); }
.sugoroku .sg-bar { fill: var(--sg-bar); }
.sugoroku .sg-point[data-tone="a"] .sg-triangle { fill: var(--sg-point-a); }
.sugoroku .sg-point[data-tone="b"] .sg-triangle { fill: var(--sg-point-b); }
.sugoroku .sg-hit { fill: transparent; }
.sugoroku .sg-bar-hit { fill: transparent; }
.sugoroku .sg-tray { fill: rgba(0, 0, 0, .18); stroke: rgba(0, 0, 0, .25); stroke-width: 1; }
.sugoroku .sg-number { fill: var(--sg-number); font-size: 11px; font-weight: 600; pointer-events: none; }
.sugoroku .sg-checker { pointer-events: none; }
.sugoroku .sg-checker[data-side="white"] .sg-face { fill: var(--sg-white); stroke: var(--sg-white-edge); stroke-width: 2; }
.sugoroku .sg-checker[data-side="black"] .sg-face { fill: var(--sg-black); stroke: var(--sg-black-edge); stroke-width: 2; }
.sugoroku .sg-checker[data-side="white"] .sg-ring { fill: none; stroke: var(--sg-white-edge); stroke-width: 1.5; opacity: .7; }
.sugoroku .sg-checker[data-side="black"] .sg-ring { fill: none; stroke: var(--sg-black-edge); stroke-width: 1.5; opacity: .9; }
.sugoroku .sg-gleam { fill: #fff; opacity: .16; }
.sugoroku .sg-checker[data-side="white"] .sg-count { fill: var(--sg-pip); }
.sugoroku .sg-checker[data-side="black"] .sg-count { fill: var(--sg-white); }
.sugoroku .sg-count { font-size: 20px; font-weight: 800; font-variant-numeric: tabular-nums; pointer-events: none; }
.sugoroku .sg-off[data-side="white"] { fill: var(--sg-white); stroke: var(--sg-white-edge); stroke-width: 1.5; pointer-events: none; }
.sugoroku .sg-off[data-side="black"] { fill: var(--sg-black); stroke: var(--sg-black-edge); stroke-width: 1.5; pointer-events: none; }
.sugoroku .sg-die { pointer-events: none; }
.sugoroku .sg-die rect { fill: var(--sg-die); stroke: rgba(0, 0, 0, .35); stroke-width: 1.5; }
.sugoroku .sg-die[data-spent="true"] { opacity: .38; }
.sugoroku .sg-pip { fill: var(--sg-pip); }
.sugoroku .sg-cube { pointer-events: none; }
.sugoroku .sg-cube rect { fill: var(--sg-cube); stroke: rgba(0, 0, 0, .35); stroke-width: 1.5; }
.sugoroku .sg-cube-text { fill: var(--sg-cube-ink); font-size: 22px; font-weight: 800; pointer-events: none; }
.sugoroku .sg-point[data-movable="true"] .sg-triangle { stroke: rgba(255, 255, 255, .55); stroke-width: 3; stroke-linejoin: round; }
.sugoroku .sg-bar-hit[data-movable="true"] { fill: rgba(255, 255, 255, .14); }
.sugoroku .sg-point[data-selected="true"] .sg-triangle { stroke: var(--sg-selected); stroke-width: 4; stroke-linejoin: round; }
.sugoroku .sg-point[data-target="true"] .sg-triangle { stroke: var(--sg-target); stroke-width: 4; stroke-linejoin: round; }
.sugoroku .sg-bar-hit[data-selected="true"] { fill: var(--sg-selected); opacity: .35; }
.sugoroku .sg-tray[data-target="true"] { stroke: var(--sg-target); stroke-width: 4; fill: rgba(127, 227, 161, .18); }
.sugoroku .sg-point[data-target="true"], .sugoroku .sg-tray[data-target="true"] { cursor: pointer; }
`;
