import type { Side } from "./side.ts";

/**
 * WHERE THINGS ARE ON THE DRAWN BOARD, in the drawing's own units. The board
 * is drawn lying down (`landscape`), twelve points along the top and twelve
 * along the bottom with the bar between the two halves and the bear-off
 * trays at one end, or standing up (`portrait`), the same drawing turned a
 * quarter, which is the better shape for a phone. The box is the same size
 * whatever the position, the dice and the cube: a board never changes shape.
 */

/** Whether the board lies across the page or stands up in it. */
export type Orientation = "landscape" | "portrait";

export const PAD = 14;
/** The strip above and below the points that holds their numbers. */
export const STRIP = 18;
export const POINT_WIDTH = 62;
export const POINT_LENGTH = 214;
export const BAR_WIDTH = 48;
export const MIDDLE = 60;
export const TRAY_WIDTH = 66;
export const TRAY_GAP = 14;
/** The rail that holds the doubling cube, for a game that has one. */
export const RAIL_WIDTH = 66;
export const HALF_WIDTH = 6 * POINT_WIDTH;
export const CHECKER = 44;
/** How far apart checkers stack: slightly less than their width, so five fill a point. */
export const STACK_STEP = 40;
export const DIE = 46;

export type BoardOptions = {
  /** Whether the board has a rail for the doubling cube. */
  cube: boolean;
  /** Which side's home board is at the bottom of the drawing. */
  view: Side;
  /** Which end the trays are at. */
  home: "left" | "right";
  orientation: Orientation;
};

/** A box: where something is, in landscape units before any turning. */
export type Box = { x: number; y: number; w: number; h: number };

/** The width and height of the board drawn lying down. */
export function landscapeSize(cube: boolean): { width: number; height: number } {
  const rail = cube ? RAIL_WIDTH + 10 : 0;
  return { width: PAD + rail + 2 * HALF_WIDTH + BAR_WIDTH + TRAY_GAP + TRAY_WIDTH + PAD, height: PAD + STRIP + 2 * POINT_LENGTH + MIDDLE + STRIP + PAD };
}

/** The width and height the board is drawn in, which is the other way about when it stands up. */
export function boardSize(options: Pick<BoardOptions, "cube" | "orientation">): { width: number; height: number } {
  const { width, height } = landscapeSize(options.cube);
  return options.orientation === "portrait" ? { width: height, height: width } : { width, height };
}

/**
 * The layout of a board, a function of its options: where each point, the bar,
 * each tray, the rail and the dice sit, all in landscape units.
 */
export class BoardLayout {
  readonly width: number;
  readonly height: number;
  readonly fieldTop = PAD + STRIP;
  readonly options: BoardOptions;
  readonly #fieldLeft: number;

  constructor(options: BoardOptions) {
    this.options = options;
    const size = landscapeSize(options.cube);
    this.width = size.width;
    this.height = size.height;
    this.#fieldLeft = PAD + (options.cube ? RAIL_WIDTH + 10 : 0);
  }

  /** An x, for something `w` wide, after the board is mirrored for trays on the left. */
  mx(x: number, w = 0): number {
    return this.options.home === "left" ? this.width - x - w : x;
  }

  /** The x the field of points starts at, before mirroring. */
  get fieldLeft(): number {
    return this.#fieldLeft;
  }

  get fieldHeight(): number {
    return 2 * POINT_LENGTH + MIDDLE;
  }

  get barLeft(): number {
    return this.#fieldLeft + HALF_WIDTH;
  }

  get trayLeft(): number {
    return this.#fieldLeft + 2 * HALF_WIDTH + BAR_WIDTH + TRAY_GAP;
  }

  /**
   * Which slot of the drawing a point of the board is in: its row (the top
   * row or the bottom) and its column from the left, 0 to 11. The board's
   * points are counted the way white counts: 1 to 12 along the bottom from
   * the right, and 13 to 24 along the top from the left. Seen from black's side
   * the rows change places.
   */
  slotOf(point: number): { top: boolean; col: number } {
    const bottom = point <= 12;
    const col = bottom ? 12 - point : point - 13;
    return { top: bottom === (this.options.view === "black"), col };
  }

  /** The x of the left edge of column `col`, before mirroring. */
  columnLeft(col: number): number {
    return col < 6 ? this.#fieldLeft + col * POINT_WIDTH : this.#fieldLeft + HALF_WIDTH + BAR_WIDTH + (col - 6) * POINT_WIDTH;
  }

  /** The box of a point, as a base on its edge of the field and its length. */
  pointBox(point: number): Box & { top: boolean } {
    const { top, col } = this.slotOf(point);
    const x = this.columnLeft(col);
    return { x, y: top ? this.fieldTop : this.fieldTop + this.fieldHeight - POINT_LENGTH, w: POINT_WIDTH, h: POINT_LENGTH, top };
  }

  /** The tray of a side: the bottom one is white's when seen from white's side. */
  trayBox(side: Side): Box & { top: boolean } {
    const top = (side === "black") === (this.options.view === "white");
    return { x: this.trayLeft, y: top ? this.fieldTop : this.fieldTop + this.fieldHeight - POINT_LENGTH, w: TRAY_WIDTH, h: POINT_LENGTH, top };
  }

  /** The half of the bar a side's checkers wait in: the nearer half to the side's own tray. */
  barBox(side: Side): Box & { top: boolean } {
    const top = this.trayBox(side).top;
    return { x: this.barLeft, y: top ? this.fieldTop : this.fieldTop + this.fieldHeight / 2, w: BAR_WIDTH, h: this.fieldHeight / 2, top };
  }

  /** Where the cube rests: the middle of the rail, or the end of it nearer its owner. */
  cubeBox(owner: Side | null): Box {
    const size = 44;
    const x = PAD + (RAIL_WIDTH - size) / 2;
    const top = owner === null ? null : (owner === "black") === (this.options.view === "white");
    const y = top === null ? this.fieldTop + this.fieldHeight / 2 - size / 2 : top ? this.fieldTop + 4 : this.fieldTop + this.fieldHeight - size - 4;
    return { x, y, w: size, h: size };
  }

  /** The middle of the row of dice, on the half of the board a side plays from: its own home half for white, the other for black. */
  diceCentre(side: Side): { x: number; y: number } {
    const rightHalf = this.#fieldLeft + HALF_WIDTH + BAR_WIDTH + HALF_WIDTH / 2;
    const leftHalf = this.#fieldLeft + HALF_WIDTH / 2;
    return { x: side === "white" ? rightHalf : leftHalf, y: this.fieldTop + this.fieldHeight / 2 };
  }
}
