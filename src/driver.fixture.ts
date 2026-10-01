// Plays games out for the tests: every choice made at random from the legal ones, from a seed. Used to hold the
// engine, the record format and the simulator to whole games, not just to positions someone thought of.
import { openingFrom, rollFrom, seededDice, type DiceSource } from "./dice.ts";
import { canDouble, canBeaver, beaverDouble, dropDouble, endTurn, legalPlaysOf, offerDouble, playTurn, rollDice, rollOpening, takeDouble, type GameState } from "./game.ts";
import { finishGame, newMatch, startGame, type Match } from "./match.ts";
import { GameRecorder, type RecordSeed } from "./record.ts";
import { seededRandom } from "./random.ts";
import type { Settings } from "./rules.ts";
import { otherSide } from "./side.ts";

export type Driven = { game: GameState; turns: number };

/** Play one game to its end at random: the dice from `dice`, the choices from `choose` (a number from 0 up to but not including 1). */
export function randomGame(game: GameState, dice: DiceSource, choose: () => number, recorder?: GameRecorder, limit = 4000): Driven {
  let at = game;
  let turns = 0;
  recorder?.startGame();
  while (at.phase === "opening") {
    const throws = openingFrom(dice);
    recorder?.opening(throws);
    at = rollOpening(at, throws);
  }
  while (at.phase !== "over") {
    if (turns > limit) throw new Error("a game that does not end");
    if (at.phase === "before-roll") {
      if (canDouble(at) && choose() < 0.12) {
        const side = at.turn as "white" | "black";
        recorder?.double(side);
        at = offerDouble(at);
        const answerer = otherSide(side);
        const roll = choose();
        if (canBeaver(at) && roll < 0.2) {
          recorder?.beaver(answerer);
          at = beaverDouble(at);
          recorder?.take(side);
          at = takeDouble(at);
        } else if (roll < 0.6) {
          recorder?.take(answerer);
          at = takeDouble(at);
        } else {
          recorder?.drop(answerer);
          at = dropDouble(at);
          continue;
        }
      }
      at = rollDice(at, rollFrom(dice, at.settings.variant.dice));
    }
    const plays = legalPlaysOf(at);
    const play = plays[Math.floor(choose() * plays.length)] ?? { moves: [] };
    recorder?.turn(at.turn as "white" | "black", at.dice as number[], play.moves);
    at = playTurn(at, play.moves);
    turns += 1;
  }
  recorder?.result(at.result as never);
  return { game: at, turns };
}

/** Play a whole match at random, writing it as a record. */
export function randomMatch(settings: Settings, seed: RecordSeed): { match: Match; text: string; games: Driven[] } {
  const dice = seededDice(seed);
  const choose = seededRandom(`choices-${seed}`);
  const recorder = new GameRecorder(settings, seed);
  let match = newMatch(settings);
  const games: Driven[] = [];
  const most = settings.rules.points === 0 ? 5 : 40;
  while (!match.over && games.length < most) {
    const played = randomGame(startGame(match), dice, choose, recorder);
    games.push(played);
    match = finishGame(match, played.game.result as never);
  }
  return { match, text: recorder.text(), games };
}

export { endTurn };
