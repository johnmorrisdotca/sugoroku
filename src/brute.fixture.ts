// A second, plain way to find every legal turn, to hold the engine to: try every order of the dice and every
// move of each, stop where nothing more can be played, and keep what the rules keep. It shares only the move
// generator for one die with the engine, and none of its memoising or its search for what must be played.
import { positionKey, type Position } from "./board.ts";
import { applyMove, movesOfDie } from "./moves.ts";
import { diceToPlay } from "./plays.ts";
import type { Side } from "./side.ts";
import type { VariantSpec } from "./variants.ts";

/** Every position a turn may leave, by trying everything, as a set of position keys. */
export function bruteForcePositions(spec: VariantSpec, position: Position, side: Side, roll: readonly number[]): Set<string> {
  const dice = diceToPlay(spec, roll);
  type End = { position: Position; used: number[] };
  const ends: End[] = [];
  const walk = (at: Position, left: number[], used: number[]): void => {
    let moved = false;
    for (let k = 0; k < left.length; k += 1) {
      const die = left[k] as number;
      for (const move of movesOfDie(spec, at, side, die)) {
        moved = true;
        walk(applyMove(spec, at, side, move), left.filter((_, i) => i !== k), [...used, die]);
      }
    }
    if (!moved) ends.push({ position: at, used });
  };
  walk(position, dice, []);
  const most = ends.reduce((n, end) => Math.max(n, end.used.length), 0);
  let kept = ends.filter((end) => end.used.length === most);
  if (most < dice.length) {
    // Where not every die could be played, the higher dice must be the ones played.
    const rank = (end: End): number[] => [...end.used].sort((a, b) => b - a);
    const bestOf = kept.map(rank).reduce((a, b) => {
      for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) return (a[i] as number) > (b[i] as number) ? a : b;
      return a;
    });
    kept = kept.filter((end) => rank(end).every((die, i) => die === bestOf[i]));
  }
  return new Set(kept.map((end) => positionKey(end.position)));
}
