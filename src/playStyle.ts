import { SUGOROKU_STYLE } from "./style.ts";

/**
 * THE STYLE a playable Sugoroku board wears (`mountSugoroku`, `<sugoroku-board>`):
 * the drawing's own (`SUGOROKU_STYLE`), the board's box, its buttons and its
 * lines of words. Colours are custom properties on `.sugoroku-play`
 * (`--sgp-ink`, `--sgp-muted`, `--sgp-rule`, `--sgp-surface`, `--sgp-accent`,
 * `--sgp-good`) so a page sets only what it wants different.
 *
 * Nothing moves when something happens: the board is one box of one shape
 * (set from the drawing's own proportions), the line of words keeps room for
 * two lines, and the buttons are three of one size in the same places whatever
 * they say. Nothing the player touches can be selected.
 */
export const SUGOROKU_PLAY_STYLE = `${SUGOROKU_STYLE}
.sugoroku-play {
  --sgp-ink: #1f2320; --sgp-muted: #6b6f68; --sgp-rule: #ddd6c6; --sgp-surface: #fbf8f1; --sgp-accent: #b5452c; --sgp-good: #2f7a4f;
  display: block; max-width: 100%; box-sizing: border-box; color: var(--sgp-ink); font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
  user-select: none; -webkit-user-select: none; -webkit-touch-callout: none;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) .sugoroku-play { --sgp-ink: #ece8dc; --sgp-muted: #a09d93; --sgp-rule: #3a3d38; --sgp-surface: #1d201e; --sgp-accent: #ff8a6b; --sgp-good: #6fcf97; }
}
:root[data-theme="dark"] .sugoroku-play { --sgp-ink: #ece8dc; --sgp-muted: #a09d93; --sgp-rule: #3a3d38; --sgp-surface: #1d201e; --sgp-accent: #ff8a6b; --sgp-good: #6fcf97; }
.sugoroku-play *, .sugoroku-play *::before, .sugoroku-play *::after { box-sizing: border-box; }
.sugoroku-play .sgp-board { position: relative; width: 100%; touch-action: none; user-select: none; -webkit-user-select: none; cursor: default; }
.sugoroku-play[data-drag="off"] .sgp-board { touch-action: manipulation; }
.sugoroku-play .sgp-board svg { display: block; width: 100%; height: 100%; }
.sugoroku-play .sgp-score { margin: 0 0 8px; font-size: .8rem; color: var(--sgp-muted); min-height: 2.7em; font-variant-numeric: tabular-nums; }
.sugoroku-play .sgp-status { margin: 10px 0 0; min-height: 2.9em; font-size: .92rem; font-weight: 600; line-height: 1.4; }
.sugoroku-play[data-over="true"] .sgp-status { color: var(--sgp-good); }
.sugoroku-play .sgp-controls { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin-top: 10px; }
.sugoroku-play .sgp-controls[hidden], .sugoroku-play [hidden] { display: none !important; }
.sugoroku-play button { font: inherit; color: inherit; user-select: none; -webkit-user-select: none; touch-action: manipulation; }
.sugoroku-play .sgp-button { border: 1px solid var(--sgp-rule); background: var(--sgp-surface); color: var(--sgp-ink); border-radius: 999px; min-height: 48px; padding: 0 12px; font-size: .88rem; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; text-align: center; line-height: 1.2; cursor: pointer; }
.sugoroku-play .sgp-button:hover:not(:disabled) { border-color: var(--sgp-ink); }
.sugoroku-play .sgp-button:disabled { opacity: .34; cursor: default; }
.sugoroku-play .sgp-button[data-primary="true"]:not(:disabled) { background: var(--sgp-ink); color: var(--sgp-surface); border-color: var(--sgp-ink); }
.sugoroku-play .sgp-button[data-attention="true"]:not(:disabled) { box-shadow: 0 0 0 3px color-mix(in srgb, var(--sgp-accent) 45%, transparent); }
.sugoroku-play .sgp-ghost { position: fixed; z-index: 10; pointer-events: none; border-radius: 50%; border: 2px solid rgba(0, 0, 0, .55); box-shadow: 0 4px 10px rgba(0, 0, 0, .4); left: 0; top: 0; }
`;
