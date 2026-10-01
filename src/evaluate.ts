import { inContact, mirrorPoint, pipCount, POINTS, type Position } from "./board.ts";
import { otherSide, sideIndex, type Side } from "./side.ts";
import type { VariantSpec } from "./variants.ts";

/**
 * HOW GOOD A POSITION IS FOR A SIDE, as a number in pips: positive is good for
 * the side, and a lead of one pip in the race is worth one. It is a handful
 * of plain rules of thumb that the game's own books give (count the race,
 * keep checkers from being hit, hold points and a prime in your home board and
 * the outfield, keep an anchor in the other side's, do not pile up), each with
 * a weight chosen by playing the computer against itself. Nothing is learned
 * from anyone else's program or data.
 *
 * The position is judged as if the other side were about to move: that is
 * what a side leaves behind when it finishes a turn.
 */

/** For every distance a checker may be from another, which of the 36 rolls hit across it. A roll of two different dice hits at either die or both together; doubles at one to four times the number. */
const SHOT_ROLLS: readonly Uint8Array[] = (() => {
  const table: Uint8Array[] = [new Uint8Array(36)];
  for (let distance = 1; distance <= POINTS; distance += 1) {
    const hits = new Uint8Array(36);
    for (let a = 1; a <= 6; a += 1) {
      for (let b = 1; b <= 6; b += 1) {
        const roll = (a - 1) * 6 + (b - 1);
        const double = a === b;
        if (distance === a || distance === b || (!double && distance === a + b) || (double && distance <= 4 * a && distance % a === 0)) hits[roll] = 1;
      }
    }
    table.push(hits);
  }
  return table;
})();

/** How many of the 36 rolls hit when the hitters stand at these distances (the union of each one's rolls). */
function rollsThatHit(distances: readonly number[]): number {
  if (distances.length === 0) return 0;
  const first = SHOT_ROLLS[distances[0] as number] as Uint8Array;
  if (distances.length === 1) {
    let n = 0;
    for (let r = 0; r < 36; r += 1) n += first[r] as number;
    return n;
  }
  let n = 0;
  for (let r = 0; r < 36; r += 1) {
    for (const d of distances) {
      if ((SHOT_ROLLS[d] as Uint8Array)[r] === 1) {
        n += 1;
        break;
      }
    }
  }
  return n;
}

/** The numbers the evaluation is made of, each a number of pips. */
export type EvaluationWeights = {
  /** What it is worth to have the roll, which the side that does not have it must give up. */
  onRoll: number;
  /** Per checker still to bear off, in a race. */
  raceChecker: number;
  /** What a made point in the home board is worth, by the point, 1 to 6. */
  home: readonly [number, number, number, number, number, number];
  /** A made point in the outfield (7 to 12), and in the other outfield (13 to 18). */
  outfield: number;
  middle: number;
  /** A made point in the other side's home board, an anchor, and the extra for the 20 and 21 points. */
  anchor: number;
  anchorAdvanced: number;
  /** The reward for a run of made points: this times the square of its length beyond two. */
  prime: number;
  /** The cost of each checker beyond four on a point. */
  stack: number;
  /** A blot's cost when hit, as a chance times (the pips it loses, this many more for the turn spent, and this much for each point the other side holds at home), all times `blotScale`. */
  blotTempo: number;
  blotBoard: number;
  blotScale: number;
  /** A share of the other side's blots that this side threatens. */
  threat: number;
  threatTempo: number;
  /** A checker on the bar, or yet to enter: a base cost and a cost for each point the other side holds at home. */
  bar: number;
  barBoard: number;
  /** How much of that the other side's checkers on the bar are worth to this side. */
  barOther: number;
};

/** The weights the computer plays with. They were found by playing the computer against versions of itself with some number changed, keeping the changes that won (`scripts/tune-weights.ts`). */
export const EVALUATION_WEIGHTS: EvaluationWeights = {
  onRoll: 4,
  raceChecker: 1.6,
  home: [1.5, 3, 4, 5.2, 5.8, 4.6],
  outfield: 2.2,
  middle: 0.6,
  anchor: 5,
  anchorAdvanced: 7.5,
  prime: 1.8,
  stack: 1.4,
  blotTempo: 7,
  blotBoard: 1.2,
  blotScale: 1.15,
  threat: 0.45,
  threatTempo: 4,
  bar: 8,
  barBoard: 1.4,
  barOther: 0.8,
};

/** Where opponent checkers stand, as distances from the point `target` (the opponent's own number) that they would have to travel to land on it. */
function distancesTo(counts: readonly number[], onBarOrReserve: number, target: number): number[] {
  if (onBarOrReserve > 0) return target >= 19 ? [POINTS + 1 - target] : [];
  const distances: number[] = [];
  for (let from = target + 1; from <= POINTS; from += 1) if ((counts[from - 1] ?? 0) > 0) distances.push(from - target);
  return distances;
}

/**
 * The score of a position for `side`, with the other side to move. Large
 * positive or negative numbers are a game that is won or lost.
 */
export function evaluate(spec: VariantSpec, position: Position, side: Side, weights: EvaluationWeights = EVALUATION_WEIGHTS): number {
  const i = sideIndex(side);
  const opp = otherSide(side);
  const j = sideIndex(opp);
  if (position.off[i] === spec.checkers) return spec.goal === "first-off" ? 1000 : -1000;
  if (position.off[j] === spec.checkers) return spec.goal === "first-off" ? -1000 : 1000;
  const w = weights;
  const mine = position.points[i];
  const theirs = position.points[j];
  const onBoard = (counts: readonly number[]): number => counts.reduce((a, b) => a + b, 0);
  let score = pipCount(position, opp) - pipCount(position, side) - w.onRoll;
  if (!inContact(spec, position)) {
    // A race. The fewer checkers still to bear off, the fewer rolls it takes: pips alone count a stack on the ace point as though it were as quick as it is.
    return score + w.raceChecker * (onBoard(theirs) - onBoard(mine));
  }

  const myBar = position.bar[i] + position.reserve[i];
  const oppBar = position.bar[j] + position.reserve[j];
  let myHome = 0;
  let oppHome = 0;
  for (let n = 1; n <= 6; n += 1) {
    if ((mine[n - 1] ?? 0) >= 2) myHome += 1;
    if ((theirs[n - 1] ?? 0) >= 2) oppHome += 1;
  }

  let run = 0;
  let longest = 0;
  for (let n = 1; n <= POINTS; n += 1) {
    const count = mine[n - 1] ?? 0;
    if (count >= 2) {
      if (n <= 6) score += w.home[n - 1] as number;
      else if (n <= 12) score += w.outfield;
      else if (n <= 18) score += w.middle;
      else score += n === 20 || n === 21 ? w.anchorAdvanced : w.anchor;
    }
    if (count >= 2 && n <= 12) {
      run += 1;
      if (run > longest) longest = run;
    } else run = 0;
    if (count > 4) score -= (count - 4) * w.stack;
    if (count === 1) {
      // A blot: the pips it loses if hit and a turn spent getting back, the more so the more of the other side's home board is closed.
      const shots = rollsThatHit(distancesTo(theirs, oppBar, mirrorPoint(spec, n)));
      if (shots > 0) score -= (shots / 36) * (25 - n + w.blotTempo + w.blotBoard * oppHome) * w.blotScale;
    }
  }
  if (longest >= 3) score += (longest - 2) * (longest - 2) * w.prime;

  // The other side's blots, which it will have a turn to deal with before they are in danger.
  for (let n = 1; n <= POINTS; n += 1) {
    if ((theirs[n - 1] ?? 0) !== 1) continue;
    const shots = rollsThatHit(distancesTo(mine, myBar, mirrorPoint(spec, n)));
    if (shots > 0) score += (shots / 36) * (25 - n + w.threatTempo) * w.threat;
  }
  score -= myBar * (w.bar + w.barBoard * oppHome);
  score += oppBar * (w.bar + w.barBoard * myHome) * w.barOther;
  return score;
}

/** The score as `side` plays to win or to lose: a game played to lose is judged the other way up. */
export function evaluateFor(spec: VariantSpec, position: Position, side: Side, weights: EvaluationWeights = EVALUATION_WEIGHTS): number {
  const score = evaluate(spec, position, side, weights);
  return spec.goal === "first-off" ? score : -score;
}

/** A chance of winning, 0 to 1, that a score in pips stands for: the logistic curve, which a lead of 25 pips in a position of this kind takes to about three in four. */
export function winChance(score: number): number {
  return 1 / (1 + Math.exp(-score / 22));
}

/**
 * The Keith count of a side, a pip count corrected for how badly the checkers
 * are placed for bearing off: plus 2 for each checker beyond the first on the
 * 1-point, 1 for each beyond the first on the 2-point and beyond three on the
 * 3-point, and 1 for each empty point among the 4, 5 and 6, and then the side
 * on roll adds a seventh (rounded down). For races only.
 */
export function keithCount(position: Position, side: Side, onRoll: boolean): number {
  const points = position.points[sideIndex(side)];
  let count = pipCount(position, side);
  count += 2 * Math.max(0, (points[0] ?? 0) - 1);
  count += Math.max(0, (points[1] ?? 0) - 1);
  count += Math.max(0, (points[2] ?? 0) - 3);
  for (const n of [4, 5, 6]) if ((points[n - 1] ?? 0) === 0) count += 1;
  return onRoll ? count + Math.floor(count / 7) : count;
}
