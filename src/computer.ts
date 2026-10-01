import { inContact, type Position } from "./board.ts";
import type { DiceSource } from "./dice.ts";
import { rollFrom } from "./dice.ts";
import { canDouble, endTurn, legalPlaysOf, offerDouble, playTurn, rollDice, rollOpening, takeDouble, dropDouble, type GameState } from "./game.ts";
import { EVALUATION_WEIGHTS, evaluateFor, keithCount, winChance, type EvaluationWeights } from "./evaluate.ts";
import { legalPlays, type Play } from "./plays.ts";
import type { Random } from "./random.ts";
import { otherSide, type Side } from "./side.ts";
import type { VariantSpec } from "./variants.ts";

/**
 * THE COMPUTER PLAYER, in four strengths. Each is the one before it with more
 * care, and none of them is slow: a move takes a few milliseconds, and the
 * strongest well under a tenth of a second in a browser.
 *
 * - `random`: any legal play, with equal chance. It never doubles, and takes every double.
 * - `greedy`: the play that leaves the best position by the evaluation (`evaluate`), looking no further.
 * - `careful`: weighs its best four plays by what the other side's best reply to each roll would leave.
 * - `strong`: the same over its best ten plays.
 *
 * Doubling is simple, and works as documented in the README: in a race the
 * Keith count (see `keithCount`), where the rules are Keith's: double when the
 * count of the side on roll is within 4 of the other's, redouble within 3,
 * take when the doubler's is 2 or more above the taker's. In a position where the sides are still in
 * contact (`careful` and `strong` only), the evaluation is turned into a
 * chance of winning (`winChance`) and a side doubles at 70% and takes at 25%.
 */
export type Strength = "random" | "greedy" | "careful" | "strong";

/** The strengths, weakest first. */
export const STRENGTHS: readonly Strength[] = ["random", "greedy", "careful", "strong"];

/** How many of its best plays each strength looks ahead on. 0 is none. */
const LOOKAHEAD: Readonly<Record<Strength, number>> = { random: 0, greedy: 0, careful: 4, strong: 10 };

export type ComputerOptions = {
  /** The strength. Default `strong`. */
  strength?: Strength;
  /** Where its choices come from, for `random` and for choosing between plays that score the same. Default `Math.random`. */
  random?: Random;
  /** Weights for the evaluation, to play with a different taste. Default `EVALUATION_WEIGHTS`. */
  weights?: EvaluationWeights;
};

/** The 21 different rolls of two dice and the chances of each in 36. */
const ROLLS: readonly (readonly [number, number, number])[] = (() => {
  const rolls: [number, number, number][] = [];
  for (let a = 1; a <= 6; a += 1) for (let b = a; b <= 6; b += 1) rolls.push([a, b, a === b ? 1 : 2]);
  return rolls;
})();

/** The rolls of three dice that matter, and their weights, for a game that rolls three: all 56 combinations by how many ways each can be thrown. */
const ROLLS_OF_THREE: readonly (readonly [number, number, number, number])[] = (() => {
  const rolls: [number, number, number, number][] = [];
  for (let a = 1; a <= 6; a += 1) for (let b = a; b <= 6; b += 1) for (let c = b; c <= 6; c += 1) rolls.push([a, b, c, a === b && b === c ? 1 : a === b || b === c ? 3 : 6]);
  return rolls;
})();

/** The plays best first by what they leave, each with its score. */
function ranked(spec: VariantSpec, plays: readonly Play[], side: Side, weights: EvaluationWeights): { play: Play; score: number }[] {
  return plays.map((play) => ({ play, score: evaluateFor(spec, play.position, side, weights) })).sort((a, b) => b.score - a.score);
}

/** The value, for `side`, of a position that the other side is about to move from: the average over its rolls of what its best reply leaves. */
function lookedAhead(spec: VariantSpec, position: Position, side: Side, weights: EvaluationWeights): number {
  const opp = otherSide(side);
  let total = 0;
  let weight = 0;
  const rolls: readonly (readonly number[])[] = spec.dice === 2 ? ROLLS : ROLLS_OF_THREE;
  for (const roll of rolls) {
    const dice = spec.dice === 2 ? [roll[0] as number, roll[1] as number] : [roll[0] as number, roll[1] as number, roll[2] as number];
    const chance = roll[spec.dice] as number;
    const replies = legalPlays(spec, position, opp, dice);
    // The other side picks the reply it likes best; we judge what that leaves us.
    let best = replies[0] as Play;
    let bestScore = -Infinity;
    for (const reply of replies) {
      const score = evaluateFor(spec, reply.position, opp, weights);
      if (score > bestScore) {
        bestScore = score;
        best = reply;
      }
    }
    total += chance * evaluateFor(spec, best.position, side, weights);
    weight += chance;
  }
  return total / weight;
}

/** The play the computer makes for the rest of the turn of the side on turn, from the plays the rules leave it. */
export function choosePlay(game: GameState, options: ComputerOptions = {}): Play {
  const strength = options.strength ?? "strong";
  const random = options.random ?? Math.random;
  const weights = options.weights ?? EVALUATION_WEIGHTS;
  const plays = legalPlaysOf(game);
  if (plays.length === 0) return { moves: [], position: game.position };
  if (plays.length === 1) return plays[0] as Play;
  const spec = game.settings.variant;
  const side = game.turn as Side;
  if (strength === "random") return plays[Math.floor(random() * plays.length)] as Play;
  const order = ranked(spec, plays, side, weights);
  const k = LOOKAHEAD[strength];
  if (k === 0 || order.length === 1) return pickFromTies(order, random);
  // A play that wins the game outright needs no looking ahead.
  if ((order[0] as { score: number }).score >= 1000) return (order[0] as { play: Play }).play;
  const candidates = order.slice(0, k);
  let best = candidates[0] as { play: Play; score: number };
  let bestValue = -Infinity;
  for (const candidate of candidates) {
    const value = lookedAhead(spec, candidate.play.position, side, weights) + candidate.score * 0.15;
    if (value > bestValue) {
      bestValue = value;
      best = candidate;
    }
  }
  return best.play;
}

function pickFromTies(order: readonly { play: Play; score: number }[], random: Random): Play {
  const top = (order[0] as { score: number }).score;
  const tied = order.filter((entry) => entry.score >= top - 1e-9);
  return (tied[Math.floor(random() * tied.length)] as { play: Play }).play;
}

/** The chance, 0 to 1, that `side` wins from here, by the evaluation, or by the Keith count's rule of thumb in a race (as 0.5 plus a share of the count's lead). */
export function chanceOfWinning(game: GameState, side: Side): number {
  const spec = game.settings.variant;
  return winChance(evaluateFor(spec, game.position, side));
}

/** Whether, by the Keith count, a race is one to double in (`redouble` for a side that holds the cube) and one to take. */
function raceCube(game: GameState, doubler: Side, redouble: boolean): { double: boolean; take: boolean } {
  const x = keithCount(game.position, doubler, true);
  const y = keithCount(game.position, otherSide(doubler), false);
  const lead = x - y;
  return { double: lead <= (redouble ? 3 : 4), take: lead >= 2 };
}

/** Whether the computer, to move before it rolls, should offer a double. */
export function wantsToDouble(game: GameState, options: ComputerOptions = {}): boolean {
  const strength = options.strength ?? "strong";
  if (strength === "random" || !canDouble(game)) return false;
  const spec = game.settings.variant;
  if (spec.goal === "last-off" || spec.dice !== 2) return false;
  const side = game.turn as Side;
  const holds = game.cube.owner === side;
  if (!inContact(spec, game.position)) {
    const race = raceCube(game, side, holds);
    // Not when the race is so lopsided that the other side must drop and the gammon is the only prize: keep it simple and double.
    return race.double && keithCount(game.position, side, true) < keithCount(game.position, otherSide(side), false) + (holds ? 4 : 5);
  }
  if (strength === "greedy") return false;
  return chanceOfWinning(game, side) >= 0.7;
}

/** Whether the computer, doubled, should take. */
export function wantsToTake(game: GameState, options: ComputerOptions = {}): boolean {
  const strength = options.strength ?? "strong";
  if (strength === "random") return true;
  const spec = game.settings.variant;
  if (game.offeredBy === null) return true;
  const taker = otherSide(game.offeredBy);
  if (spec.goal === "last-off" || spec.dice !== 2) return true;
  if (!inContact(spec, game.position)) {
    const doubler = game.offeredBy;
    return raceCube({ ...game, position: game.position }, doubler, game.cube.owner === doubler).take;
  }
  if (strength === "greedy") return true;
  return chanceOfWinning(game, taker) >= 0.25;
}

/** What the computer does next in a game, for the side it plays. */
export type ComputerAction =
  | { kind: "throw" }
  | { kind: "double" }
  | { kind: "roll" }
  | { kind: "play"; play: Play }
  | { kind: "end" }
  | { kind: "take" }
  | { kind: "drop" };

/** What the side that has to act in a game would do, if the computer were playing it. Nothing is done: the game is not changed. Null when the game is over. */
export function computerAction(game: GameState, options: ComputerOptions = {}): ComputerAction | null {
  switch (game.phase) {
    case "opening":
      return { kind: "throw" };
    case "before-roll":
      return wantsToDouble(game, options) ? { kind: "double" } : { kind: "roll" };
    case "double-offered":
    case "beaver-offered":
      return wantsToTake(game, options) ? { kind: "take" } : { kind: "drop" };
    case "playing":
      return game.need.length === 0 ? { kind: "end" } : { kind: "play", play: choosePlay(game, options) };
    default:
      return null;
  }
}

/**
 * Carry out one step of what the computer would do, with dice from `dice`.
 * Returns the game after it, and what was done, so a caller can write it down
 * or show it. Which side plays is up to the caller: this plays for whichever side is to act.
 */
export function stepComputer(game: GameState, dice: DiceSource, options: ComputerOptions = {}): { game: GameState; action: ComputerAction } | null {
  const action = computerAction(game, options);
  if (action === null) return null;
  switch (action.kind) {
    case "throw": {
      const white = dice();
      return { game: rollOpening(game, [white, dice()]), action };
    }
    case "double":
      return { game: offerDouble(game), action };
    case "roll":
      return { game: rollDice(game, rollFrom(dice, game.settings.variant.dice)), action };
    case "take":
      return { game: takeDouble(game), action };
    case "drop":
      return { game: dropDouble(game), action };
    case "play":
      return { game: playTurn(game, action.play.moves), action };
    case "end":
      return { game: endTurn(game), action };
  }
}

/** Whether a side is the one the computer would act for at this moment of a game: the side on turn, or the side that must answer a double. */
export function sideToAct(game: GameState): Side | null {
  if (game.phase === "over" || game.phase === "opening") return null;
  if (game.phase === "double-offered" || game.phase === "beaver-offered") return game.offeredBy === null ? null : otherSide(game.offeredBy);
  return game.turn;
}

