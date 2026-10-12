import { newGame, type GameResult, type GameState } from "./game.ts";
import type { Settings } from "./rules.ts";
import { sideIndex, type Side } from "./side.ts";

/**
 * A MATCH: games played one after another to a number of points, or without
 * end in money play. It keeps the score and says which game is the Crawford
 * game. Like everything here it is plain data, and never changed: each
 * function gives back a new match.
 *
 * @example
 * ```ts
 * import { newMatch, settingsFor } from "@johnmorrisdotca/sugoroku";
 * import type { Match } from "@johnmorrisdotca/sugoroku";
 *
 * const settings = settingsFor("backgammon",{points:5,cube:true});
 * const match = newMatch(settings);
 * const value: Match = match;
 * console.log(value);
 * ```
 */
export type Match = {
  readonly settings: Settings;
  /** The score, `[white, black]`. */
  readonly score: readonly [number, number];
  /** Every game finished so far. */
  readonly results: readonly GameResult[];
  /** Whether the next game is the Crawford game. */
  readonly crawfordNext: boolean;
  /** Whether the Crawford game has been played: there is one in a match. */
  readonly crawfordPlayed: boolean;
  /** Whether the match is decided: a side reached the match length, or a game was drawn. Never in money play. */
  readonly over: boolean;
  /** Who won the match; null while it goes on, or when it was drawn. */
  readonly winner: Side | null;
};

/** A match at 0 to 0.
 *
 * @param settings - The resolved variant and complete rules.
 * @returns A match at 0 to 0.
 * @example
 * ```ts
 * import { newMatch, settingsFor } from "@johnmorrisdotca/sugoroku";
 *
 * const settings = settingsFor("backgammon",{points:5,cube:true});
 * console.log(newMatch(settings).score);
 * ```
 */
export function newMatch(settings: Settings): Match {
  return { settings, score: [0, 0], results: [], crawfordNext: false, crawfordPlayed: false, over: false, winner: null };
}

/** The first game, or the next game, of a match.
 *
 * @param match - The current immutable match and score.
 * @returns The first game, or the next game, of a match.
 * @example
 * ```ts
 * import { newMatch, settingsFor, startGame } from "@johnmorrisdotca/sugoroku";
 *
 * const settings = settingsFor("backgammon",{points:5,cube:true});
 * const match = newMatch(settings);
 * console.log(startGame(match).phase);
 * ```
 */
export function startGame(match: Match): GameState {
  if (match.over) throw new Error("The match is over.");
  return newGame(match.settings, { crawford: match.crawfordNext, score: match.score });
}

/** How many points a side still needs to win the match: 0 in money play, where there is no such thing.
 *
 * @param match - The current immutable match and score.
 * @param side - The side being examined: white or black.
 * @returns How many points a side still needs to win the match: 0 in money play, where there is no such thing.
 * @example
 * ```ts
 * import { newMatch, pointsToGo, settingsFor } from "@johnmorrisdotca/sugoroku";
 *
 * const settings = settingsFor("backgammon",{points:5,cube:true});
 * const match = newMatch(settings);
 * console.log(pointsToGo(match,"white"));
 * ```
 */
export function pointsToGo(match: Match, side: Side): number {
  const { points } = match.settings.rules;
  return points === 0 ? 0 : Math.max(0, points - match.score[sideIndex(side)]);
}

/** The match after a game's result: the score added up, the Crawford game accounted for, and the match over if it is decided.
 *
 * @param match - The current immutable match and score.
 * @param result - The completed native game result to add to a match.
 * @returns The match after a game's result: the score added up, the Crawford game accounted for, and the match over if it is decided.
 * @example
 * ```ts
 * import { concede, finishGame, newGame, newMatch, rollOpening, settingsFor } from "@johnmorrisdotca/sugoroku";
 *
 * const settings = settingsFor("backgammon",{points:5,cube:true});
 * const game = rollOpening(newGame(settings),[3,1]);
 * const match = newMatch(settings);
 * const result = concede(game,"black","single").result!;
 * console.log(finishGame(match,result).score);
 * ```
 */
export function finishGame(match: Match, result: GameResult): Match {
  const { points, crawford } = match.settings.rules;
  const score: [number, number] = [match.score[0], match.score[1]];
  if (result.winner !== null) score[sideIndex(result.winner)] += result.points;
  const results = [...match.results, result];
  if (result.how === "draw") return { ...match, score, results, crawfordNext: false, over: true, winner: null };
  if (points > 0 && result.winner !== null && score[sideIndex(result.winner)] >= points) return { ...match, score, results, crawfordNext: false, over: true, winner: result.winner };
  // The Crawford game is the one after a side first comes within a point of winning, and there is only one.
  const crawfordPlayed = match.crawfordPlayed || match.crawfordNext;
  const reachedNow = points > 1 && crawford && !crawfordPlayed && Math.max(score[0], score[1]) === points - 1 && Math.max(match.score[0], match.score[1]) < points - 1;
  return { ...match, score, results, crawfordNext: reachedNow, crawfordPlayed, over: false, winner: null };
}
