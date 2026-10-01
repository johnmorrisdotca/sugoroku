/**
 * THE TWO SIDES. A game has a `white` and a `black` player. Every count in a
 * position is kept per side, in that side's own numbering of the points: a
 * side's own point 1 is the one nearest its bearing-off, its own point 24 the
 * one farthest from it, whichever way the board is drawn.
 */
export type Side = "white" | "black";

/** Both sides, white first. */
export const SIDES: readonly [Side, Side] = ["white", "black"];

/** The other side. */
export function otherSide(side: Side): Side {
  return side === "white" ? "black" : "white";
}

/** 0 for white and 1 for black: where a side's counts are kept in a position. */
export function sideIndex(side: Side): 0 | 1 {
  return side === "white" ? 0 : 1;
}
