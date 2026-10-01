/**
 * THE COLOURS OF A BOARD. Every colour the drawing uses is one of these, set as
 * a custom property on the drawing (`--sg-felt` and so on), so a page's own
 * style may change any of them, and `drawSugoroku` takes any of them as an
 * option. Where a colour is left out the drawing uses the theme's: light by
 * default, dark when the device is (see `SUGOROKU_STYLE`).
 */
export type SugorokuColours = {
  /** The frame the board is set in. */
  frame: string;
  /** The playing surface. */
  felt: string;
  /** The points, alternately. */
  pointA: string;
  pointB: string;
  /** The bar, and the trays' floor. */
  bar: string;
  tray: string;
  /** The checkers: the face and the rim of each side's. */
  white: string;
  whiteEdge: string;
  black: string;
  blackEdge: string;
  /** The numbers on the points, and a count on a tall stack. */
  number: string;
  /** What marks the checker picked up, and the places it may go. */
  selected: string;
  target: string;
  /** The dice and the cube. */
  die: string;
  pip: string;
  cube: string;
  cubeInk: string;
};

/** The names of the colours, as the custom properties spell them (`--sg-` and the name in kebab case). */
export const SUGOROKU_COLOUR_NAMES: readonly (keyof SugorokuColours)[] = [
  "frame",
  "felt",
  "pointA",
  "pointB",
  "bar",
  "tray",
  "white",
  "whiteEdge",
  "black",
  "blackEdge",
  "number",
  "selected",
  "target",
  "die",
  "pip",
  "cube",
  "cubeInk",
];

/** The custom property a colour is set on. */
export function colourProperty(name: keyof SugorokuColours): string {
  return `--sg-${name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`;
}

/** A named board, a set of colours for the board and its points. */
export type SugorokuBoardName = "green" | "blue" | "red" | "black" | "wood";

const POINTS_CLASSIC = { pointA: "#e7d8b1", pointB: "#8e3a2b" } as const;

/** The boards the drawing knows by name, set against any theme. Each changes only the surfaces: the frame, the felt, the points, the bar and the trays. */
export const SUGOROKU_BOARDS: Readonly<Record<SugorokuBoardName, Pick<SugorokuColours, "frame" | "felt" | "pointA" | "pointB" | "bar" | "tray">>> = {
  green: { frame: "#5b3a1f", felt: "#2f5d4a", ...POINTS_CLASSIC, bar: "#4a2f19", tray: "#24493a" },
  blue: { frame: "#2c3a52", felt: "#2865a6", pointA: "#dfe6ef", pointB: "#16345c", bar: "#1f2b40", tray: "#1d4d80" },
  red: { frame: "#4a2420", felt: "#a3342e", pointA: "#ecd9b8", pointB: "#43171a", bar: "#3a1c19", tray: "#7f2822" },
  black: { frame: "#1d1f22", felt: "#2f3236", pointA: "#d8d4c6", pointB: "#a3342e", bar: "#141618", tray: "#222427" },
  wood: { frame: "#6b4a2b", felt: "#e2ba7a", pointA: "#f3dfae", pointB: "#7a4a22", bar: "#6b4a2b", tray: "#c4954f" },
};

/** The names of the boards. */
export const SUGOROKU_BOARD_NAMES: readonly SugorokuBoardName[] = ["green", "blue", "red", "black", "wood"];

/** A named pair of checker colours. */
export type SugorokuCheckerSetName = "classic" | "red-and-white" | "gold-and-blue" | "contrast";

/** The checkers the drawing knows by name. `contrast` is for readers who tell colours apart with difficulty: pale and near-black, with strong rims. */
export const SUGOROKU_CHECKER_SETS: Readonly<Record<SugorokuCheckerSetName, Pick<SugorokuColours, "white" | "whiteEdge" | "black" | "blackEdge">>> = {
  classic: { white: "#f6f0df", whiteEdge: "#b3a888", black: "#2b2724", blackEdge: "#0d0b0a" },
  "red-and-white": { white: "#f6f0df", whiteEdge: "#b3a888", black: "#b3332b", blackEdge: "#5d1712" },
  "gold-and-blue": { white: "#e8bf4a", whiteEdge: "#8d6a14", black: "#27508f", blackEdge: "#102446" },
  contrast: { white: "#ffffff", whiteEdge: "#000000", black: "#111111", blackEdge: "#ffffff" },
};

/** The names of the checker sets. */
export const SUGOROKU_CHECKER_SET_NAMES: readonly SugorokuCheckerSetName[] = ["classic", "red-and-white", "gold-and-blue", "contrast"];
