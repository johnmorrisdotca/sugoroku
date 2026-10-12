import { sideIndex, otherSide, type Side } from "./side.ts";
import { startCounts, startReserve, type VariantSpec } from "./variants.ts";

/** The points on the board.
 *
 * @example
 * ```ts
 * import { POINTS } from "@johnmorrisdotca/sugoroku";
 * console.log(POINTS);
 * ```
 */
export const POINTS = 24;

/** The number a move's `from` has when a checker comes from the bar (or from off the board at the start of a race).
 *
 * @example
 * ```ts
 * import { BAR } from "@johnmorrisdotca/sugoroku";
 * console.log(BAR);
 * ```
 */
export const BAR = 25;

/**
 * WHERE THE CHECKERS ARE. Every count is in the side's own numbering: own
 * point 1 is the one nearest its bearing-off and own point 24 the one farthest
 * from it, so `points[side][n - 1]` is how many of that side's checkers stand
 * on its own point `n`. A position is plain data and is never changed: every
 * function that moves a checker returns a new one.
 *
 * @example
 * ```ts
 * import { settingsFor, startPosition } from "@johnmorrisdotca/sugoroku";
 * import type { Position } from "@johnmorrisdotca/sugoroku";
 *
 * const settings = settingsFor("backgammon",{points:5,cube:true});
 * const spec = settings.variant;
 * const position = startPosition(spec);
 * const value: Position = position;
 * console.log(value);
 * ```
 */
export type Position = {
  /** `[white, black]`, each 24 counts, index 0 being own point 1. */
  readonly points: readonly [readonly number[], readonly number[]];
  /** Checkers hit and waiting to enter, `[white, black]`. */
  readonly bar: readonly [number, number];
  /** Checkers that have never entered, `[white, black]`: all of them at the start of a race. */
  readonly reserve: readonly [number, number];
  /** Checkers borne off, `[white, black]`. */
  readonly off: readonly [number, number];
};

/** The position a variant starts from.
 *
 * @param spec - The native variant specification.
 * @returns The position a variant starts from.
 * @example
 * ```ts
 * import { settingsFor, startPosition } from "@johnmorrisdotca/sugoroku";
 *
 * const settings = settingsFor("backgammon",{points:5,cube:true});
 * const spec = settings.variant;
 * console.log(startPosition(spec).bar);
 * ```
 */
export function startPosition(spec: VariantSpec): Position {
  const counts = startCounts(spec);
  const reserve = startReserve(spec);
  return { points: [counts, [...counts]], bar: [0, 0], reserve: [reserve, reserve], off: [0, 0] };
}

/**
 * The other side's own number for the point that is `side`'s own point `own`.
 * With the sides going opposite ways round, a side's 24-point is the other's
 * 1-point; going the same way, a point has the one number for both.
 *
 * @param spec - The native variant specification.
 * @param own - A point in this side’s own numbering.
 * @returns The other side's own number for the point that is `side`'s own point `own`. With the sides going opposite ways round, a side's 24-point is the other's 1-point; going the same way, a point has the one number for both.
 * @example
 * ```ts
 * import { mirrorPoint, settingsFor } from "@johnmorrisdotca/sugoroku";
 *
 * const settings = settingsFor("backgammon",{points:5,cube:true});
 * const spec = settings.variant;
 * console.log(mirrorPoint(spec,24));
 * ```
 */
export function mirrorPoint(spec: VariantSpec, own: number): number {
  return spec.direction === "opposed" ? POINTS + 1 - own : own;
}

/**
 * The point on the board, 1 to 24 counting the way white counts, that is
 * `side`'s own point `own`. White's own numbers are the board's; black's are
 * the board's reversed when the sides go opposite ways round.
 *
 * @param spec - The native variant specification.
 * @param side - The side being examined: white or black.
 * @param own - A point in this side’s own numbering.
 * @returns The point on the board, 1 to 24 counting the way white counts, that is `side`'s own point `own`. White's own numbers are the board's; black's are the board's reversed when the sides go opposite ways round.
 * @example
 * ```ts
 * import { boardPoint, settingsFor } from "@johnmorrisdotca/sugoroku";
 *
 * const settings = settingsFor("backgammon",{points:5,cube:true});
 * const spec = settings.variant;
 * console.log(boardPoint(spec,"black",24));
 * ```
 */
export function boardPoint(spec: VariantSpec, side: Side, own: number): number {
  return side === "white" ? own : mirrorPoint(spec, own);
}

/** How many of `side`'s checkers stand on its own point `own` (1 to 24).
 *
 * @param position - The native checker counts, bar, reserve and borne-off counts.
 * @param side - The side being examined: white or black.
 * @param own - A point in this side’s own numbering.
 * @returns How many of `side`'s checkers stand on its own point `own` (1 to 24).
 * @example
 * ```ts
 * import { countAt, settingsFor, startPosition } from "@johnmorrisdotca/sugoroku";
 *
 * const settings = settingsFor("backgammon",{points:5,cube:true});
 * const spec = settings.variant;
 * const position = startPosition(spec);
 * console.log(countAt(position,"white",24));
 * ```
 */
export function countAt(position: Position, side: Side, own: number): number {
  return position.points[sideIndex(side)][own - 1] ?? 0;
}

/** How many of the other side's checkers stand on the point that is `side`'s own point `own`.
 *
 * @param spec - The native variant specification.
 * @param position - The native checker counts, bar, reserve and borne-off counts.
 * @param side - The side being examined: white or black.
 * @param own - A point in this side’s own numbering.
 * @returns How many of the other side's checkers stand on the point that is `side`'s own point `own`.
 * @example
 * ```ts
 * import { opponentAt, settingsFor, startPosition } from "@johnmorrisdotca/sugoroku";
 *
 * const settings = settingsFor("backgammon",{points:5,cube:true});
 * const spec = settings.variant;
 * const position = startPosition(spec);
 * console.log(opponentAt(spec,position,"white",24));
 * ```
 */
export function opponentAt(spec: VariantSpec, position: Position, side: Side, own: number): number {
  return countAt(position, otherSide(side), mirrorPoint(spec, own));
}

/** How many checkers `side` has on the board's points, not counting the bar, the reserve and those borne off.
 *
 * @param position - The native checker counts, bar, reserve and borne-off counts.
 * @param side - The side being examined: white or black.
 * @returns How many checkers `side` has on the board's points, not counting the bar, the reserve and those borne off.
 * @example
 * ```ts
 * import { onBoard, settingsFor, startPosition } from "@johnmorrisdotca/sugoroku";
 *
 * const settings = settingsFor("backgammon",{points:5,cube:true});
 * const spec = settings.variant;
 * const position = startPosition(spec);
 * console.log(onBoard(position,"white"));
 * ```
 */
export function onBoard(position: Position, side: Side): number {
  return position.points[sideIndex(side)].reduce((sum, count) => sum + count, 0);
}

/** Every checker of `side` that is still in the game: on the board, on the bar or yet to enter.
 *
 * @param position - The native checker counts, bar, reserve and borne-off counts.
 * @param side - The side being examined: white or black.
 * @returns Every checker of `side` that is still in the game: on the board, on the bar or yet to enter.
 * @example
 * ```ts
 * import { inPlay, settingsFor, startPosition } from "@johnmorrisdotca/sugoroku";
 *
 * const settings = settingsFor("backgammon",{points:5,cube:true});
 * const spec = settings.variant;
 * const position = startPosition(spec);
 * console.log(inPlay(position,"white"));
 * ```
 */
export function inPlay(position: Position, side: Side): number {
  const i = sideIndex(side);
  return onBoard(position, side) + position.bar[i] + position.reserve[i];
}

/** The pip count of a side: the sum of every checker's distance from being borne off. A checker on the bar or yet to enter counts 25.
 *
 * @param position - The native checker counts, bar, reserve and borne-off counts.
 * @param side - The side being examined: white or black.
 * @returns The pip count of a side: the sum of every checker's distance from being borne off. A checker on the bar or yet to enter counts 25.
 * @example
 * ```ts
 * import { pipCount, settingsFor, startPosition } from "@johnmorrisdotca/sugoroku";
 *
 * const settings = settingsFor("backgammon",{points:5,cube:true});
 * const spec = settings.variant;
 * const position = startPosition(spec);
 * console.log(pipCount(position,"white"));
 * ```
 */
export function pipCount(position: Position, side: Side): number {
  const i = sideIndex(side);
  let total = 25 * (position.bar[i] + position.reserve[i]);
  position.points[i].forEach((count, index) => {
    total += count * (index + 1);
  });
  return total;
}

/** Whether every checker of `side` still in play is in its home board (own points 1 to 6): the condition for bearing off.
 *
 * @param position - The native checker counts, bar, reserve and borne-off counts.
 * @param side - The side being examined: white or black.
 * @returns Whether every checker of `side` still in play is in its home board (own points 1 to 6): the condition for bearing off.
 * @example
 * ```ts
 * import { allHome, settingsFor, startPosition } from "@johnmorrisdotca/sugoroku";
 *
 * const settings = settingsFor("backgammon",{points:5,cube:true});
 * const spec = settings.variant;
 * const position = startPosition(spec);
 * console.log(allHome(position,"white"));
 * ```
 */
export function allHome(position: Position, side: Side): boolean {
  const i = sideIndex(side);
  if (position.bar[i] > 0 || position.reserve[i] > 0) return false;
  const points = position.points[i];
  for (let n = 7; n <= POINTS; n += 1) if ((points[n - 1] ?? 0) > 0) return false;
  return true;
}

/** A position as a short string that is the same for the same position, for keeping a set of them.
 *
 * @param position - The native checker counts, bar, reserve and borne-off counts.
 * @returns A position as a short string that is the same for the same position, for keeping a set of them.
 * @example
 * ```ts
 * import { positionKey, settingsFor, startPosition } from "@johnmorrisdotca/sugoroku";
 *
 * const settings = settingsFor("backgammon",{points:5,cube:true});
 * const spec = settings.variant;
 * const position = startPosition(spec);
 * console.log(positionKey(position));
 * ```
 */
export function positionKey(position: Position): string {
  return `${position.points[0].join(",")}|${position.points[1].join(",")}|${position.bar.join(",")}|${position.reserve.join(",")}|${position.off.join(",")}`;
}

/** The whole count of each side's checkers: on the board, on the bar, yet to enter, and off. Always the variant's `checkers`.
 *
 * @param position - The native checker counts, bar, reserve and borne-off counts.
 * @param side - The side being examined: white or black.
 * @returns The whole count of each side's checkers: on the board, on the bar, yet to enter, and off. Always the variant's `checkers`.
 * @example
 * ```ts
 * import { checkersOf, settingsFor, startPosition } from "@johnmorrisdotca/sugoroku";
 *
 * const settings = settingsFor("backgammon",{points:5,cube:true});
 * const spec = settings.variant;
 * const position = startPosition(spec);
 * console.log(checkersOf(position,"white"));
 * ```
 */
export function checkersOf(position: Position, side: Side): number {
  return inPlay(position, side) + position.off[sideIndex(side)];
}

/** A copy of a position with some counts changed.
 *
 * @param position - The native checker counts, bar, reserve and borne-off counts.
 * @param changes - The replacement checker-count fields.
 * @returns A copy of a position with some counts changed.
 * @example
 * ```ts
 * import { settingsFor, startPosition, withCounts } from "@johnmorrisdotca/sugoroku";
 *
 * const settings = settingsFor("backgammon",{points:5,cube:true});
 * const spec = settings.variant;
 * const position = startPosition(spec);
 * console.log(withCounts(position,{off:[0,0]}).off);
 * ```
 */
export function withCounts(
  position: Position,
  changes: { points?: [number[], number[]]; bar?: [number, number]; reserve?: [number, number]; off?: [number, number] },
): Position {
  return {
    points: changes.points ?? position.points,
    bar: changes.bar ?? position.bar,
    reserve: changes.reserve ?? position.reserve,
    off: changes.off ?? position.off,
  };
}

/**
 * Whether the two sides can still hit one another. Once every checker of
 * one side has gone past every checker of the other there is nothing more to
 * play for but the race, and the game is a race.
 *
 * @param spec - The native variant specification.
 * @param position - The native checker counts, bar, reserve and borne-off counts.
 * @returns Whether the two sides can still hit one another. Once every checker of one side has gone past every checker of the other there is nothing more to play for but the race, and the game is a race.
 * @example
 * ```ts
 * import { inContact, settingsFor, startPosition } from "@johnmorrisdotca/sugoroku";
 *
 * const settings = settingsFor("backgammon",{points:5,cube:true});
 * const spec = settings.variant;
 * const position = startPosition(spec);
 * console.log(inContact(spec,position));
 * ```
 */
export function inContact(spec: VariantSpec, position: Position): boolean {
  if (position.bar[0] + position.bar[1] + position.reserve[0] + position.reserve[1] > 0) return true;
  // The rearmost checker of each side, as the board's point counted the way white counts.
  const rear = (side: Side): number => {
    const own = position.points[sideIndex(side)];
    for (let n = POINTS; n >= 1; n -= 1) if ((own[n - 1] ?? 0) > 0) return n;
    return 0;
  };
  const white = rear("white");
  const black = rear("black");
  if (white === 0 || black === 0) return false;
  if (spec.direction === "opposed") {
    // White comes down from its rearmost point, black up from its own: they have met when white's is above black's on the board.
    return white > mirrorPoint(spec, black);
  }
  // Going the same way, the trailing side can always hit the one in front.
  const lowest = (side: Side): number => {
    const own = position.points[sideIndex(side)];
    for (let n = 1; n <= POINTS; n += 1) if ((own[n - 1] ?? 0) > 0) return n;
    return POINTS + 1;
  };
  return white > lowest("black") || black > lowest("white");
}
