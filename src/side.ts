/**
 * THE TWO SIDES. A game has a `white` and a `black` player. Every count in a
 * position is kept per side, in that side's own numbering of the points: a
 * side's own point 1 is the one nearest its bearing-off, its own point 24 the
 * one farthest from it, whichever way the board is drawn.
 *
 * @example
 * ```ts
 * import type { Side } from "@johnmorrisdotca/sugoroku";
 *
 * const value: Side = "white";
 * console.log(value);
 * ```
 */
export type Side = "white" | "black";

/** Both sides, white first.
 *
 * @example
 * ```ts
 * import { SIDES } from "@johnmorrisdotca/sugoroku";
 * console.log(SIDES);
 * ```
 */
export const SIDES: readonly [Side, Side] = ["white", "black"];

/** The other side.
 *
 * @param side - The side being examined: white or black.
 * @returns The other side.
 * @example
 * ```ts
 * import { otherSide } from "@johnmorrisdotca/sugoroku";
 *
 * console.log(otherSide("white"));
 * ```
 */
export function otherSide(side: Side): Side {
  return side === "white" ? "black" : "white";
}

/** 0 for white and 1 for black: where a side's counts are kept in a position.
 *
 * @param side - The side being examined: white or black.
 * @returns 0 for white and 1 for black: where a side's counts are kept in a position.
 * @example
 * ```ts
 * import { sideIndex } from "@johnmorrisdotca/sugoroku";
 *
 * console.log(sideIndex("black"));
 * ```
 */
export function sideIndex(side: Side): 0 | 1 {
  return side === "white" ? 0 : 1;
}
