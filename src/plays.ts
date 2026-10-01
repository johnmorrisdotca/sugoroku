import { positionKey, type Position } from "./board.ts";
import { applyMove, movesOfDie, type Move } from "./moves.ts";
import type { Side } from "./side.ts";
import type { VariantSpec } from "./variants.ts";

/**
 * A WHOLE TURN: the moves a side makes with a roll, in the order it makes them,
 * and the position they leave.
 */
export type Play = {
  readonly moves: readonly Move[];
  readonly position: Position;
};

/** The dice a roll gives to play, highest first: a double of a game that plays doubles four times is four of them. */
export function diceToPlay(spec: VariantSpec, roll: readonly number[]): number[] {
  const first = roll[0];
  if (spec.doubles === "four" && roll.length === 2 && first !== undefined && roll[1] === first) return [first, first, first, first];
  return [...roll].sort((a, b) => b - a);
}

/** Whether the dice `a` are a better set to have played than `b`: more of them, and of equal number, higher ones (both highest first). */
function better(a: readonly number[], b: readonly number[]): boolean {
  if (a.length !== b.length) return a.length > b.length;
  for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) return (a[i] ?? 0) > (b[i] ?? 0);
  return false;
}

const without = (dice: readonly number[], index: number): number[] => dice.filter((_, i) => i !== index);

/**
 * WHICH DICE MUST BE PLAYED. A side must play as many of its dice as it can;
 * where it cannot play them all and could play either of two (or more) sets,
 * it must play the higher: with two dice, if only one can be played, it is the
 * larger one when it can. Returned highest first, from the dice as
 * `diceToPlay` gives them.
 */
export function diceMustPlay(spec: VariantSpec, position: Position, side: Side, dice: readonly number[]): number[] {
  const memo = new Map<string, number[]>();
  const best = (at: Position, left: readonly number[]): number[] => {
    if (left.length === 0) return [];
    const key = `${positionKey(at)}#${left.join("")}`;
    const known = memo.get(key);
    if (known !== undefined) return known;
    let result: number[] = [];
    const tried = new Set<number>();
    search: for (let k = 0; k < left.length; k += 1) {
      const die = left[k] as number;
      if (tried.has(die)) continue;
      tried.add(die);
      const rest = without(left, k);
      for (const move of movesOfDie(spec, at, side, die)) {
        const candidate = [die, ...best(applyMove(spec, at, side, move), rest)].sort((a, b) => b - a);
        if (better(candidate, result)) result = candidate;
        if (result.length === left.length) break search;
      }
    }
    memo.set(key, result);
    return result;
  };
  return best(position, dice);
}

/** Whether every die of `need` (highest first) can be played from `position`, in some order. */
export function canPlayAll(spec: VariantSpec, position: Position, side: Side, need: readonly number[], failed: Set<string> = new Set()): boolean {
  const go = (at: Position, left: readonly number[]): boolean => {
    if (left.length === 0) return true;
    const key = `${positionKey(at)}#${left.join("")}`;
    if (failed.has(key)) return false;
    const tried = new Set<number>();
    for (let k = 0; k < left.length; k += 1) {
      const die = left[k] as number;
      if (tried.has(die)) continue;
      tried.add(die);
      const rest = without(left, k);
      for (const move of movesOfDie(spec, at, side, die)) if (go(applyMove(spec, at, side, move), rest)) return true;
    }
    failed.add(key);
    return false;
  };
  return go(position, need);
}

/**
 * The moves that may be made next, by a side that still has the dice `need`
 * (highest first) to play from `position`: every move that leaves the rest
 * of `need` playable. Where one checker could be borne off by either of two
 * dice, both moves are offered.
 */
export function nextMoves(spec: VariantSpec, position: Position, side: Side, need: readonly number[]): Move[] {
  const moves: Move[] = [];
  const failed = new Set<string>();
  const tried = new Set<number>();
  for (let k = 0; k < need.length; k += 1) {
    const die = need[k] as number;
    if (tried.has(die)) continue;
    tried.add(die);
    const rest = without(need, k);
    for (const move of movesOfDie(spec, position, side, die)) if (canPlayAll(spec, applyMove(spec, position, side, move), side, rest, failed)) moves.push(move);
  }
  return moves;
}

/**
 * Every different turn a side may make with a roll: one for each position
 * that playing the roll as the rules require can leave, with one way of
 * getting there. A side that cannot move has the one play of no moves.
 */
export function legalPlays(spec: VariantSpec, position: Position, side: Side, roll: readonly number[]): Play[] {
  const need = diceMustPlay(spec, position, side, diceToPlay(spec, roll));
  const found = new Map<string, Play>();
  const seen = new Set<string>();
  const failed = new Set<string>();
  const go = (at: Position, left: readonly number[], moves: readonly Move[]): void => {
    if (left.length === 0) {
      const key = positionKey(at);
      if (!found.has(key)) found.set(key, { moves, position: at });
      return;
    }
    const visit = `${positionKey(at)}#${left.join("")}`;
    if (seen.has(visit)) return;
    seen.add(visit);
    const tried = new Set<number>();
    for (let k = 0; k < left.length; k += 1) {
      const die = left[k] as number;
      if (tried.has(die)) continue;
      tried.add(die);
      const rest = without(left, k);
      for (const move of movesOfDie(spec, at, side, die)) {
        const next = applyMove(spec, at, side, move);
        if (canPlayAll(spec, next, side, rest, failed)) go(next, rest, [...moves, move]);
      }
    }
  };
  go(position, need, []);
  return [...found.values()];
}

/** The position after a list of moves, made one after another. */
export function playMoves(spec: VariantSpec, position: Position, side: Side, moves: readonly Move[]): Position {
  return moves.reduce((at, move) => applyMove(spec, at, side, move), position);
}
