// A simulation: thousands of games of every variant, played at random and by the computer, each to its end. Every
// game must terminate, every turn must leave the checkers all accounted for, the pips must change by exactly what
// was moved and hit, and a game written down must replay to the same result.
import { describe, expect, it } from "vitest";

import { checkersOf, pipCount, type Position } from "./board.ts";
import { stepComputer, sideToAct, type Strength } from "./computer.ts";
import { rollFrom, seededDice } from "./dice.ts";
import { randomGame, randomMatch } from "./driver.fixture.ts";
import { legalPlaysOf, newGame, playTurn, rollDice, rollOpening, type GameState } from "./game.ts";
import type { Play } from "./plays.ts";
import { replayRecord } from "./record.ts";
import { seededRandom } from "./random.ts";
import { settingsFor } from "./rules.ts";
import { otherSide, SIDES, type Side } from "./side.ts";
import { VARIANT_KEYS, VARIANTS, type VariantKey } from "./variants.ts";

/** Nothing is lost or made: every side has all its checkers, wherever they are. */
function conserved(position: Position, checkers: number): boolean {
  return SIDES.every((side) => checkersOf(position, side) === checkers);
}

const rulesFor = (key: VariantKey, money: boolean) => (key === "anti-backgammon" || key === "tabula" ? {} : money ? { points: 3, cube: true, gammons: true } : {});

describe("random games of every variant", () => {
  it("all end, with every checker accounted for after every turn, and the pips moving by what was played", () => {
    let games = 0;
    let turns = 0;
    for (const key of VARIANT_KEYS) {
      const spec = VARIANTS[key];
      for (let seed = 1; seed <= 150; seed += 1) {
        const settings = settingsFor(key, rulesFor(key, seed % 3 === 0));
        const dice = seededDice(seed);
        const choose = seededRandom(`sim${key}${seed}`);
        const { game, turns: played } = randomGame(newGame(settings), dice, choose);
        expect(game.phase, `${key} ${seed}`).toBe("over");
        expect(conserved(game.position, spec.checkers), `${key} ${seed}`).toBe(true);
        games += 1;
        turns += played;
      }
    }
    expect(games).toBe(VARIANT_KEYS.length * 150);
    expect(turns).toBeGreaterThan(30000);
  }, 120_000);

  it("change the pips by exactly what was moved and what was hit, turn after turn", () => {
    for (const key of VARIANT_KEYS) {
      for (let seed = 1; seed <= 12; seed += 1) {
        const spec = VARIANTS[key];
        const dice = seededDice(seed * 7);
        const choose = seededRandom(`pips${key}${seed}`);
        let game = newGame(settingsFor(key));
        while (game.phase === "opening") game = rollOpening(game, [dice(), dice()]);
        for (let guard = 0; guard < 3000 && game.phase !== "over"; guard += 1) {
          if (game.phase === "before-roll") game = rollDice(game, rollFrom(dice, spec.dice));
          const plays = legalPlaysOf(game);
          const play = plays[Math.floor(choose() * plays.length)] as Play;
          const side = game.turn as Side;
          const other = otherSide(side);
          const moved = play.moves.reduce((sum, move) => sum + (move.from - move.to), 0);
          expect(pipCount(game.position, side) - pipCount(play.position, side), `${key} ${seed}`).toBe(moved);
          // A hit sends a checker back to the bar, which costs the other side at least a pip each.
          const lost = pipCount(play.position, other) - pipCount(game.position, other);
          expect(lost, `${key} ${seed}`).toBeGreaterThanOrEqual(play.moves.filter((move) => move.hit).length);
          expect(conserved(play.position, spec.checkers), `${key} ${seed}`).toBe(true);
          game = playTurn(game, play.moves);
        }
        expect(game.phase, `${key} ${seed}`).toBe("over");
      }
    }
  }, 120_000);

  it("write down as a record that replays to the same match, scores and all", () => {
    let matches = 0;
    for (const key of VARIANT_KEYS) {
      for (let seed = 1; seed <= 6; seed += 1) {
        const { match, text, games } = randomMatch(settingsFor(key, rulesFor(key, true)), `m${seed}`);
        const replay = replayRecord(text);
        expect(replay.ok, `${key} ${seed}`).toBe(true);
        if (!replay.ok) continue;
        expect(replay.match.score).toEqual(match.score);
        expect(replay.games).toHaveLength(games.length);
        matches += 1;
      }
    }
    expect(matches).toBe(VARIANT_KEYS.length * 6);
  }, 120_000);
});

describe("games played by the computer", () => {
  /** Play a single game of a variant between two strengths, from a seed. */
  function play(variant: VariantKey, white: Strength, black: Strength, seed: number): GameState {
    let game = newGame(settingsFor(variant));
    const dice = seededDice(seed);
    const random = seededRandom(seed + 5);
    for (let guard = 0; guard < 6000; guard += 1) {
      const side = sideToAct(game);
      const step = stepComputer(game, dice, { strength: side === "white" ? white : black, random, budget: Infinity });
      if (step === null) return game;
      game = step.game;
    }
    throw new Error("a game that does not end");
  }

  it("end, in every variant, between every pair of strengths that does not look ahead, and with lookahead in the variants where that is quick", () => {
    const quick: Strength[] = ["random", "greedy"];
    const all: Strength[] = ["random", "greedy", "careful", "strong"];
    let games = 0;
    for (const key of VARIANT_KEYS) {
      // Looking ahead weighs every roll of the other side, which at Tabula's three dice and a race's fifteen checkers off the board takes a while.
      const strengths = key === "backgammon" || key === "hypergammon" || key === "nackgammon" ? all : quick;
      for (const a of strengths) {
        for (const b of strengths) {
          const looks = !quick.includes(a) || !quick.includes(b);
          for (let seed = 1; seed <= (looks ? 1 : 12); seed += 1) {
            const game = play(key, a, b, seed + 40);
            expect(game.phase, `${key} ${a} ${b}`).toBe("over");
            expect(conserved(game.position, VARIANTS[key].checkers), `${key} ${a} ${b}`).toBe(true);
            games += 1;
          }
        }
      }
    }
    expect(games).toBeGreaterThan(300);
  }, 300_000);

  it("play a hundred greedy games against greedy in every variant, all of them to the end", () => {
    let games = 0;
    for (const key of VARIANT_KEYS) {
      for (let seed = 1; seed <= 100; seed += 1) {
        const game = play(key, "greedy", "greedy", 1000 + seed);
        expect(game.phase, `${key} ${seed}`).toBe("over");
        expect(conserved(game.position, VARIANTS[key].checkers), `${key} ${seed}`).toBe(true);
        games += 1;
      }
    }
    expect(games).toBe(700);
  }, 300_000);

  it("beat a computer that moves at random, nearly always, and a greedy one beats it too", () => {
    let wins = 0;
    let total = 0;
    for (let seed = 1; seed <= 100; seed += 1) {
      const swap = seed % 2 === 0;
      const game = play("backgammon", swap ? "random" : "greedy", swap ? "greedy" : "random", seed);
      total += 1;
      if ((game.result?.winner === "white") === !swap) wins += 1;
    }
    expect(wins / total).toBeGreaterThan(0.9);
  }, 120_000);

  it("play the stronger levels at least as well as the weaker, over a few hundred games", () => {
    const share = (a: Strength, b: Strength, n: number): number => {
      let wins = 0;
      for (let seed = 1; seed <= n; seed += 1) {
        const swap = seed % 2 === 0;
        const game = play("backgammon", swap ? b : a, swap ? a : b, 500 + seed);
        if ((game.result?.winner === "white") === !swap) wins += 1;
      }
      return wins / n;
    };
    expect(share("careful", "random", 40)).toBeGreaterThan(0.9);
    expect(share("strong", "random", 40)).toBeGreaterThan(0.9);
    expect(share("greedy", "random", 60)).toBeGreaterThan(0.9);
  }, 300_000);
});
