import type { Position } from "./board.ts";
import { boardPoint, BAR, POINTS } from "./board.ts";
import { colourProperty, SUGOROKU_BOARDS, SUGOROKU_CHECKER_SETS, SUGOROKU_COLOUR_NAMES, type SugorokuBoardName, type SugorokuCheckerSetName, type SugorokuColours } from "./colours.ts";
import { BAR_WIDTH, BoardLayout, boardSize, CHECKER, DIE, PAD, POINT_WIDTH, STACK_STEP, TRAY_WIDTH, type Orientation } from "./geometry.ts";
import { sideIndex, SIDES, type Side } from "./side.ts";
import { SUGOROKU_STYLE } from "./style.ts";
import { VARIANTS, type VariantKey, type VariantSpec } from "./variants.ts";

/**
 * DRAWING a board as SVG text: a string, to put in a page, a file or an image,
 * with nothing to load and nothing run. The points, the checkers stacked on them
 * (five, and a count on the fifth when there are more), the bar, the trays
 * where borne-off checkers lie, the dice and the doubling cube. The box is the
 * same whatever is on the board, so a page never shifts as the game goes on.
 *
 * Every shape of the board a player can touch carries data attributes for a
 * page to listen on: `data-board` on a point (its number counted the way white
 * counts, 1 to 24), `data-bar` and `data-tray` with the side they belong to, and
 * `data-checker` on each checker. Nothing in the drawing can be selected.
 */

/** What to draw with. */
export type SugorokuDrawOptions = {
  /** The variant, for how its sides' points line up. Default `backgammon`. */
  variant?: VariantKey | VariantSpec;
  /** Whose home board is at the bottom of the drawing. Default white. */
  view?: Side;
  /** Which end of the board the trays are at. Default right. */
  home?: "left" | "right";
  /** Lying across the page (default) or standing up, a better shape for a phone. */
  orientation?: Orientation;
  /** Put the numbers of the points beside them, counted for the side `view` names. Default off. */
  numbers?: boolean;
  /** A named board, whose surfaces are used; `colours` is laid over it. Left out, the theme's own. */
  board?: SugorokuBoardName;
  /** A named pair of checkers. Left out, the theme's own. */
  checkers?: SugorokuCheckerSetName;
  /** Any colours to use instead, each a CSS colour. */
  colours?: Partial<SugorokuColours>;
  /** `light` or `dark` to force the theme; `auto` (the default) follows the device. */
  theme?: "auto" | "light" | "dark";
  /** The dice rolled: white's are shown on its half of the board, black's on the other. */
  dice?: { side: Side; values: readonly number[]; spent?: readonly boolean[] } | null;
  /** The doubling cube, or null (the default) for a game without one, which then has no rail for it. */
  cube?: { value: number; owner: Side | null } | null;
  /** The checker picked up and where it may go, in `side`'s own numbering: `from` a point or the bar (25), the points (or 0 for off) it may land on, and the points (or the bar) a checker could be picked up from. */
  highlight?: { side: Side; from?: number | null; targets?: readonly number[]; movable?: readonly number[] } | null;
  /** A description for screen readers. */
  label?: string;
  /** Put `SUGOROKU_STYLE` inside the drawing, so it stands alone as an image. A page with the style in already leaves this off. */
  style?: boolean;
};

const escape = (text: string): string => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const n = (value: number): string => String(Math.round(value * 100) / 100);

/** How many checkers are drawn on a stack before the last one carries the count. */
export const MOST_DRAWN = 5;

/** The pips of each die face, as places on a three by three grid, 0 to 8 reading across and down. */
const PIPS: readonly (readonly number[])[] = [[], [4], [0, 8], [0, 4, 8], [0, 2, 6, 8], [0, 2, 4, 6, 8], [0, 2, 3, 5, 6, 8]];

/** The inline custom properties of a drawing: the named board and checkers, then any colour given. */
export function colourStyle(options: Pick<SugorokuDrawOptions, "board" | "checkers" | "colours">): string {
  const colours: Partial<SugorokuColours> = { ...(options.board === undefined ? {} : SUGOROKU_BOARDS[options.board]), ...(options.checkers === undefined ? {} : SUGOROKU_CHECKER_SETS[options.checkers]), ...options.colours };
  return SUGOROKU_COLOUR_NAMES.filter((name) => colours[name] !== undefined).map((name) => `${colourProperty(name)}:${escape(String(colours[name]))}`).join(";");
}

/** The words a screen reader hears of a drawing when none is given. */
function describe(position: Position): string {
  const [white, black] = SIDES.map((side) => {
    const i = sideIndex(side);
    const total = position.points[i].reduce((sum, count) => sum + count, 0) + position.bar[i] + position.reserve[i];
    return `${total} on the board, ${position.off[i]} borne off`;
  });
  return `Backgammon board. White: ${white}. Black: ${black}.`;
}

/**
 * The board as SVG text for `position`. The variant says how the sides' points
 * line up; pass the same one the game is played with.
 */
export function drawSugoroku(position: Position, options: SugorokuDrawOptions = {}): string {
  const spec = typeof options.variant === "object" ? options.variant : VARIANTS[options.variant ?? "backgammon"];
  const view = options.view ?? "white";
  const orientation = options.orientation ?? "landscape";
  const hasCube = options.cube !== undefined && options.cube !== null;
  const layout = new BoardLayout({ cube: hasCube, view, home: options.home ?? "right", orientation });
  const { width, height } = boardSize({ cube: hasCube, orientation });
  const portrait = orientation === "portrait";
  const mx = (x: number, w = 0): number => layout.mx(x, w);
  const out: string[] = [];

  /** Text drawn upright whichever way the board is turned. */
  const text = (x: number, y: number, content: string, className: string, extra = ""): string =>
    `<text class="${className}" x="${n(x)}" y="${n(y)}" text-anchor="middle" dominant-baseline="central"${portrait ? ` transform="rotate(-90 ${n(x)} ${n(y)})"` : ""}${extra}>${escape(content)}</text>`;

  // The frame, the field of play, the bar, and the trays' wells.
  const field = { x: layout.fieldLeft, y: layout.fieldTop, w: 2 * POINT_WIDTH * 6 + BAR_WIDTH, h: layout.fieldHeight };
  out.push(`<rect class="sg-frame" x="0" y="0" width="${n(layout.width)}" height="${n(layout.height)}" rx="16"/>`);
  out.push(`<rect class="sg-felt" x="${n(mx(field.x, field.w))}" y="${n(field.y)}" width="${n(field.w)}" height="${n(field.h)}" rx="4"/>`);
  if (hasCube) out.push(`<rect class="sg-rail" x="${n(mx(PAD, 66))}" y="${n(field.y)}" width="66" height="${n(field.h)}" rx="6"/>`);
  out.push(`<rect class="sg-tray-well" x="${n(mx(layout.trayLeft, TRAY_WIDTH))}" y="${n(field.y)}" width="${TRAY_WIDTH}" height="${n(field.h)}" rx="4"/>`);

  // The points, with the highlight on the one picked up and on those it may go to.
  const mover = options.highlight?.side;
  const fromBoard = mover !== undefined && options.highlight?.from != null && options.highlight.from !== BAR && options.highlight.from > 0 ? boardPoint(spec, mover, options.highlight.from) : null;
  const targetBoard = new Set<number>();
  let offTarget = false;
  const movableBoard = new Set<number>();
  let barMovable = false;
  for (const from of options.highlight?.movable ?? []) {
    if (from === BAR) barMovable = true;
    else if (mover !== undefined) movableBoard.add(boardPoint(spec, mover, from));
  }
  for (const target of options.highlight?.targets ?? []) {
    if (target === 0) offTarget = true;
    else if (mover !== undefined) targetBoard.add(boardPoint(spec, mover, target));
  }
  for (let point = 1; point <= POINTS; point += 1) {
    const box = layout.pointBox(point);
    const x0 = mx(box.x);
    const x1 = mx(box.x + box.w);
    const apexX = mx(box.x + box.w / 2);
    const baseY = box.top ? box.y : box.y + box.h;
    const apexY = box.top ? box.y + box.h : box.y;
    const tone = point % 2 === 0 ? "a" : "b";
    const flags = `${fromBoard === point ? ' data-selected="true"' : ""}${targetBoard.has(point) ? ' data-target="true"' : ""}${movableBoard.has(point) ? ' data-movable="true"' : ""}`;
    out.push(
      `<g class="sg-point" data-board="${point}" data-tone="${tone}"${flags}>` +
        `<polygon class="sg-triangle" points="${n(Math.min(x0, x1))},${n(baseY)} ${n(Math.max(x0, x1))},${n(baseY)} ${n(apexX)},${n(apexY)}"/>` +
        `<rect class="sg-hit" x="${n(Math.min(x0, x1))}" y="${n(box.y)}" width="${n(box.w)}" height="${n(box.h)}"/>` +
        `</g>`,
    );
    if (options.numbers === true) {
      const own = view === "white" ? point : POINTS + 1 - point;
      const shown = spec.direction === "same" ? point : own;
      out.push(text(mx(box.x + box.w / 2), box.top ? box.y - STRIPMID : box.y + box.h + STRIPMID, String(shown), "sg-number", ` data-board="${point}"`));
    }
  }

  // The bar, and the trays: places a checker can be sent to or taken from.
  out.push(`<rect class="sg-bar" x="${n(mx(layout.barLeft, BAR_WIDTH))}" y="${n(field.y)}" width="${BAR_WIDTH}" height="${n(field.h)}"/>`);
  for (const side of SIDES) {
    const bar = layout.barBox(side);
    const tray = layout.trayBox(side);
    const barSelected = mover === side && options.highlight?.from === BAR;
    out.push(`<rect class="sg-bar-hit" data-bar="${side}" x="${n(mx(bar.x, bar.w))}" y="${n(bar.y)}" width="${bar.w}" height="${n(bar.h)}"${barSelected ? ' data-selected="true"' : ""}${mover === side && barMovable ? ' data-movable="true"' : ""}/>`);
    out.push(`<rect class="sg-tray" data-tray="${side}" x="${n(mx(tray.x, tray.w))}" y="${n(tray.y)}" width="${tray.w}" height="${n(tray.h)}" rx="3"${offTarget && mover === side ? ' data-target="true"' : ""}/>`);
  }

  /** One checker: a face, a rim and a gleam, with the count written on it when it stands for a stack. */
  const checker = (side: Side, cx: number, cy: number, attributes: string, count?: number): string => {
    const r = CHECKER / 2;
    const body = `<circle class="sg-face" cx="0" cy="0" r="${r}"/><circle class="sg-ring" cx="0" cy="0" r="${n(r * 0.74)}"/><circle class="sg-gleam" cx="${n(-r * 0.3)}" cy="${n(-r * 0.32)}" r="${n(r * 0.26)}"/>`;
    const label = count === undefined ? "" : text(0, 1, String(count), "sg-count");
    return `<g class="sg-checker" data-side="${side}" ${attributes} transform="translate(${n(cx)} ${n(cy)})">${body}${label}</g>`;
  };

  // The checkers on the points.
  for (const side of SIDES) {
    const i = sideIndex(side);
    for (let own = 1; own <= POINTS; own += 1) {
      const count = position.points[i][own - 1] ?? 0;
      if (count === 0) continue;
      const point = boardPoint(spec, side, own);
      const box = layout.pointBox(point);
      const cx = mx(box.x + box.w / 2);
      const drawn = Math.min(count, MOST_DRAWN);
      for (let k = 0; k < drawn; k += 1) {
        const cy = box.top ? box.y + CHECKER / 2 + k * STACK_STEP : box.y + box.h - CHECKER / 2 - k * STACK_STEP;
        out.push(checker(side, cx, cy, `data-board="${point}" data-height="${k + 1}" data-own="${own}"`, k === drawn - 1 && count > MOST_DRAWN ? count : undefined));
      }
    }
  }

  // The checkers on the bar, and those yet to enter, which wait there too.
  for (const side of SIDES) {
    const i = sideIndex(side);
    const waiting = position.bar[i] + position.reserve[i];
    if (waiting === 0) continue;
    const box = layout.barBox(side);
    const cx = mx(box.x + box.w / 2);
    const drawn = Math.min(waiting, MOST_DRAWN);
    for (let k = 0; k < drawn; k += 1) {
      const cy = box.top ? box.y + CHECKER / 2 + 6 + k * STACK_STEP : box.y + box.h - CHECKER / 2 - 6 - k * STACK_STEP;
      out.push(checker(side, cx, cy, `data-bar="${side}" data-height="${k + 1}"`, k === drawn - 1 && waiting > MOST_DRAWN ? waiting : undefined));
    }
  }

  // The checkers borne off, lying flat in the side's tray.
  for (const side of SIDES) {
    const off = position.off[sideIndex(side)];
    if (off === 0) continue;
    const box = layout.trayBox(side);
    for (let k = 0; k < off; k += 1) {
      const h = 9;
      const y = box.top ? box.y + 5 + k * (h + 1) : box.y + box.h - 5 - h - k * (h + 1);
      out.push(`<rect class="sg-off" data-side="${side}" x="${n(mx(box.x + 8, box.w - 16))}" y="${n(y)}" width="${box.w - 16}" height="${h}" rx="3"/>`);
    }
  }

  // The dice, on the half of the board the side plays from.
  if (options.dice != null) {
    const { side, values, spent } = options.dice;
    const centre = layout.diceCentre(side);
    const gap = 10;
    const total = values.length * DIE + (values.length - 1) * gap;
    values.forEach((value, k) => {
      const dx = centre.x - total / 2 + k * (DIE + gap);
      const spentFlag = spent?.[k] === true ? ' data-spent="true"' : "";
      let pips = "";
      for (const place of PIPS[value] ?? []) pips += `<circle class="sg-pip" cx="${n(((place % 3) - 1) * 12)}" cy="${n((Math.floor(place / 3) - 1) * 12)}" r="4"/>`;
      out.push(`<g class="sg-die" data-die="${value}" data-index="${k}"${spentFlag} transform="translate(${n(mx(dx + DIE / 2))} ${n(centre.y)})"><rect x="${-DIE / 2}" y="${-DIE / 2}" width="${DIE}" height="${DIE}" rx="9"/>${pips}</g>`);
    });
  }

  // The doubling cube, in the middle of its rail while nobody owns it and at the end nearer the side that does.
  if (options.cube != null) {
    const box = layout.cubeBox(options.cube.owner);
    const shown = options.cube.value === 1 ? 64 : options.cube.value;
    out.push(
      `<g class="sg-cube" data-value="${options.cube.value}" data-owner="${options.cube.owner ?? "none"}"><rect x="${n(mx(box.x, box.w))}" y="${n(box.y)}" width="${box.w}" height="${box.h}" rx="8"/>${text(mx(box.x + box.w / 2), box.y + box.h / 2 + 1, String(shown), "sg-cube-text")}</g>`,
    );
  }

  const root = `${portrait ? `<g class="sg-turned" transform="translate(${n(width)} 0) rotate(90)">` : "<g>"}${out.join("")}</g>`;
  const colours = colourStyle(options);
  const theme = options.theme === undefined || options.theme === "auto" ? "" : ` data-theme="${options.theme}"`;
  const inline = options.style === true ? `<style>${SUGOROKU_STYLE}</style>` : "";
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" class="sugoroku" viewBox="0 0 ${n(width)} ${n(height)}" role="img" aria-label="${escape(options.label ?? describe(position))}"` +
    ` data-orientation="${orientation}" data-view="${view}" data-home="${options.home ?? "right"}"${theme}${colours === "" ? "" : ` style="${colours}"`}>${inline}${root}</svg>`
  );
}

/** Half the strip above or below the points: where their numbers sit. */
const STRIPMID = 9;
