import { allHome, BAR, countAt, mirrorPoint, opponentAt, POINTS, withCounts, type Position } from "./board.ts";
import { otherSide, sideIndex, type Side } from "./side.ts";
import type { VariantSpec } from "./variants.ts";

/**
 * ONE CHECKER MOVED BY ONE DIE, in the mover's own numbering: from its own
 * point `from` (or the `BAR`, 25, for a checker entering from the bar or from
 * off the board at the start of a race) to its own point `to` (0 for borne
 * off). A move that lands on a lone checker of the other side hits it.
 *
 * @example
 * ```ts
 * import { legalPlaysOf, newGame, rollOpening, settingsFor } from "@johnmorrisdotca/sugoroku";
 * import type { Move } from "@johnmorrisdotca/sugoroku";
 *
 * const settings = settingsFor("backgammon",{points:5,cube:true});
 * const game = rollOpening(newGame(settings),[3,1]);
 * const play = legalPlaysOf(game)[0];
 * const move = play.moves[0];
 * const value: Move = move;
 * console.log(value);
 * ```
 */
export type Move = {
  readonly from: number;
  readonly to: number;
  /** The number on the die that moved it. A checker borne off with a larger die than it needed has `die` greater than `from`. */
  readonly die: number;
  /** Whether it hit a checker, which went to the other side's bar. */
  readonly hit: boolean;
};

/** Whether `side` may land a checker on its own point `to`: it is not held by two or more of the other side's, and the variant's hold-back rule allows it. */
function openPoint(spec: VariantSpec, position: Position, side: Side, to: number): boolean {
  if (opponentAt(spec, position, side, to) >= 2) return false;
  const i = sideIndex(side);
  if (spec.holdBelow > 0 && to <= spec.holdBelow && (position.reserve[i] > 0 || position.bar[i] > 0)) return false;
  return true;
}

/** The highest own point a side has a checker on, or 0. */
function rearPoint(position: Position, side: Side): number {
  for (let n = POINTS; n >= 1; n -= 1) if (countAt(position, side, n) > 0) return n;
  return 0;
}

/**
 * Every move of one die that `side` may make from `position`, one for each
 * point a checker can start from. A side with a checker on the bar must
 * enter it first; a side that has not borne off may start a checker off the
 * board (in a race) whenever it likes; and a side whose checkers are all
 * home may bear off, by the exact die, or by a larger one from the highest
 * point it has a checker on.
 *
 * @param spec - The native variant specification.
 * @param position - The native checker counts, bar, reserve and borne-off counts.
 * @param side - The side being examined: white or black.
 * @param die - One valid die value, from 1 to 6.
 * @returns Every move of one die that `side` may make from `position`, one for each point a checker can start from. A side with a checker on the bar must enter it first; a side that has not borne off may start a checker off the board (in a race) whenever it likes; and a side whose checkers are all home may bear off, by the exact die, or by a larger one from the highest point it has a checker on.
 * @example
 * ```ts
 * import { movesOfDie, settingsFor, startPosition } from "@johnmorrisdotca/sugoroku";
 *
 * const settings = settingsFor("backgammon",{points:5,cube:true});
 * const spec = settings.variant;
 * const position = startPosition(spec);
 * console.log(movesOfDie(spec,position,"white",3));
 * ```
 */
export function movesOfDie(spec: VariantSpec, position: Position, side: Side, die: number): Move[] {
  const i = sideIndex(side);
  const moves: Move[] = [];
  const enter = POINTS + 1 - die;
  if (position.bar[i] > 0 || position.reserve[i] > 0) {
    if (openPoint(spec, position, side, enter)) moves.push({ from: BAR, to: enter, die, hit: opponentAt(spec, position, side, enter) === 1 });
    if (position.bar[i] > 0) return moves;
  }
  const home = allHome(position, side);
  const rear = rearPoint(position, side);
  for (let from = POINTS; from >= 1; from -= 1) {
    if (countAt(position, side, from) === 0) continue;
    const to = from - die;
    if (to >= 1) {
      if (openPoint(spec, position, side, to)) moves.push({ from, to, die, hit: opponentAt(spec, position, side, to) === 1 });
    } else if (home && (to === 0 || from === rear)) {
      moves.push({ from, to: 0, die, hit: false });
    }
  }
  return moves;
}

/** The position after a move. Does not check that the move is legal.
 *
 * @param spec - The native variant specification.
 * @param position - The native checker counts, bar, reserve and borne-off counts.
 * @param side - The side being examined: white or black.
 * @param move - A native legal move, including die and hit status.
 * @returns The position after a move. Does not check that the move is legal.
 * @example
 * ```ts
 * import { applyMove, legalPlaysOf, newGame, rollOpening, settingsFor, startPosition } from "@johnmorrisdotca/sugoroku";
 *
 * const settings = settingsFor("backgammon",{points:5,cube:true});
 * const spec = settings.variant;
 * const position = startPosition(spec);
 * const game = rollOpening(newGame(settings),[3,1]);
 * const play = legalPlaysOf(game)[0];
 * const move = play.moves[0];
 * console.log(applyMove(spec,position,"white",move).bar);
 * ```
 */
export function applyMove(spec: VariantSpec, position: Position, side: Side, move: Move): Position {
  const i = sideIndex(side);
  const j = sideIndex(otherSide(side));
  const mine = [...position.points[i]];
  const bar: [number, number] = [position.bar[0], position.bar[1]];
  const reserve: [number, number] = [position.reserve[0], position.reserve[1]];
  const off: [number, number] = [position.off[0], position.off[1]];
  const theirs = [...position.points[j]];
  if (move.from === BAR) {
    if (bar[i] > 0) bar[i] -= 1;
    else reserve[i] -= 1;
  } else {
    mine[move.from - 1] = (mine[move.from - 1] ?? 0) - 1;
  }
  if (move.to === 0) {
    off[i] += 1;
  } else {
    mine[move.to - 1] = (mine[move.to - 1] ?? 0) + 1;
    if (move.hit) {
      theirs[mirrorPoint(spec, move.to) - 1] = 0;
      bar[j] += 1;
    }
  }
  const points: [number[], number[]] = i === 0 ? [mine, theirs] : [theirs, mine];
  return withCounts(position, { points, bar, reserve, off });
}
