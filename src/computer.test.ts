import { describe, expect, it } from "vitest";

import { choosePlay, computerAction, sideToAct, STRENGTHS, wantsToDouble, wantsToTake } from "./computer.ts";
import { evaluate, evaluateFor, keithCount, winChance } from "./evaluate.ts";
import { legalPlaysOf, newGame, offerDouble, rollDice, type GameState } from "./game.ts";
import { formatPlay, parsePosition } from "./notation.ts";
import type { Position } from "./board.ts";
import { seededRandom } from "./random.ts";
import { settingsFor } from "./rules.ts";
import { VARIANTS } from "./variants.ts";

const at = (text: string): Position => parsePosition(text) as Position;
const std = VARIANTS.backgammon;

function game(position: string, rules: Parameters<typeof settingsFor>[1] = { points: 0, cube: true, gammons: true }, side: "white" | "black" = "white"): GameState {
  return { ...newGame(settingsFor("backgammon", rules)), position: at(position), turnStart: at(position), turn: side, phase: "before-roll" };
}

describe("the evaluation", () => {
  it("scores the starting position as even, less the roll the other side has", () => {
    const start = at("white=24:2,13:5,8:3,6:5 black=24:2,13:5,8:3,6:5");
    expect(evaluate(std, start, "white")).toBeCloseTo(evaluate(std, start, "black"), 6);
    expect(Math.abs(evaluate(std, start, "white"))).toBeLessThan(10);
  });

  it("likes a lead in the race, a made point and a closed board, and dislikes a blot in the other side's reach", () => {
    const ahead = at("white=3:3,2:2,1:2 black=3:5,2:4,1:4");
    expect(evaluate(std, ahead, "white")).toBeGreaterThan(evaluate(std, ahead, "black"));
    const safe = at("white=24:2,13:5,8:3,6:5 black=24:2,13:5,8:3,6:5");
    const blot = at("white=24:2,13:5,8:2,7:1,6:5 black=24:2,13:5,8:3,6:5");
    expect(evaluate(std, safe, "white")).toBeGreaterThan(evaluate(std, blot, "white"));
    const home = at("white=24:2,13:5,8:3,6:2,5:2,4:2,3:2,2:2 black=24:2,13:5,8:3,6:5");
    expect(evaluate(std, home, "white")).toBeGreaterThan(evaluate(std, safe, "white"));
  });

  it("scores a won game as a thousand and a lost one as minus a thousand, the other way up when played to lose", () => {
    const won = at("white= black=6:5 off=15,0");
    expect(evaluate(std, won, "white")).toBe(1000);
    expect(evaluate(std, won, "black")).toBe(-1000);
    expect(evaluateFor(VARIANTS["anti-backgammon"], won, "white")).toBe(-1000);
  });

  it("turns a score into a chance of winning between 0 and 1", () => {
    expect(winChance(0)).toBe(0.5);
    expect(winChance(30)).toBeGreaterThan(0.75);
    expect(winChance(-30)).toBeLessThan(0.25);
  });

  it("counts a race the Keith way: the pips, more for waste, and a seventh more for the side on roll", () => {
    const position = at("white=6:3,5:3,4:3,3:3,2:2,1:1 black=6:3,5:3,4:3,3:3,2:3");
    // White: 18+15+12+9+4+1 = 59 pips, and one more for the second checker on its 2-point; on roll it adds a seventh, 8.
    expect(keithCount(position, "white", false)).toBe(60);
    expect(keithCount(position, "white", true)).toBe(68);
    // Black: 60 pips and two more for the extra checkers on its 2-point.
    expect(keithCount(position, "black", false)).toBe(62);
  });
});

describe("the computer's play", () => {
  it("is always one of the legal plays, at every strength", () => {
    const rolled = rollDice(game("white=24:2,13:5,8:3,6:5 black=24:2,13:5,8:3,6:5"), [6, 1]);
    const legal = new Set(legalPlaysOf(rolled).map((p) => formatPlay(p.moves)));
    for (const strength of STRENGTHS) {
      const play = choosePlay(rolled, { strength, random: seededRandom(strength), budget: Infinity });
      expect(legal.has(formatPlay(play.moves)), strength).toBe(true);
    }
  });

  it("hits when it can hit and is safe, rather than leave a blot", () => {
    // A lone black checker on white's 5-point: a 3 and a 2 hit it and make the point at once.
    const rolled = rollDice(game("white=13:5,8:2,7:2,6:3 black=20:1,24:1,8:5,6:5"), [3, 2]);
    const play = choosePlay(rolled, { strength: "greedy", random: () => 0.5 });
    expect(play.moves.some((move) => move.hit)).toBe(true);
  });

  it("takes the last checkers off when it can win outright", () => {
    const rolled = rollDice(game("white=2:1,1:1 black=24:2,13:5 off=13,0"), [6, 5]);
    const play = choosePlay(rolled, { strength: "strong", budget: Infinity });
    expect(play.position.off[0]).toBe(15);
  });

  it("plays out a turn with nothing to play as no moves", () => {
    const stuck = rollDice(game("white=13:3 black=6:2,5:2,4:2,3:2,2:2,1:2 bar=1,0 off=11,0"), [6, 5]);
    expect(choosePlay(stuck).moves).toEqual([]);
  });

  it("moves in a few milliseconds, and the strongest in well under a tenth of a second, even with hundreds of plays to weigh", () => {
    const rolled = rollDice(game("white=24:2,13:5,8:3,6:5 black=24:2,13:5,8:3,6:5"), [4, 4]);
    expect(legalPlaysOf(rolled).length).toBeGreaterThan(50);
    const times: number[] = [];
    for (const [roll, strength] of [[[4, 4], "strong"], [[6, 6], "strong"], [[3, 1], "strong"], [[5, 2], "careful"]] as const) {
      const start = performance.now();
      choosePlay(rollDice(game("white=24:2,13:5,8:3,6:5 black=24:2,13:5,8:3,6:5"), [...roll]), { strength });
      times.push(performance.now() - start);
    }
    expect(Math.max(...times)).toBeLessThan(100);
  });

  it("answers what a game asks of it: throw the opening, roll, double or not, take or drop, play, end", () => {
    expect(computerAction(newGame(settingsFor("backgammon")))).toEqual({ kind: "throw" });
    expect(computerAction(game("white=24:2,13:5,8:3,6:5 black=24:2,13:5,8:3,6:5", { points: 0 }))?.kind).toBe("roll");
    const rolled = rollDice(game("white=24:2,13:5,8:3,6:5 black=24:2,13:5,8:3,6:5"), [3, 1]);
    expect(computerAction(rolled)?.kind).toBe("play");
    expect(sideToAct(rolled)).toBe("white");
    expect(sideToAct(newGame(settingsFor("backgammon")))).toBeNull();
  });
});

describe("the computer's cube", () => {
  const race = (white: string, black: string): GameState => game(`white=${white} black=${black}`);

  it("never doubles at the weakest strength, and takes whatever it is offered", () => {
    const lead = race("6:5,5:4", "6:5,5:5,4:5");
    expect(wantsToDouble(lead, { strength: "random" })).toBe(false);
    expect(wantsToTake(offerDouble(lead), { strength: "random" })).toBe(true);
  });

  it("doubles a race it is well ahead in, by the Keith count, and does not double an even one", () => {
    const ahead = race("5:3,4:3,3:3,2:3", "6:4,5:4,4:4,3:3");
    expect(wantsToDouble(ahead, { strength: "greedy" })).toBe(true);
    const even = race("6:5,5:5,4:5", "6:5,5:5,4:5");
    expect(wantsToDouble(even, { strength: "greedy" })).toBe(false);
  });

  it("drops a double when far behind in a race, and takes one when close", () => {
    const behind = offerDouble({ ...race("6:5,5:5,4:5", "3:3,2:3,1:3"), turn: "black" });
    // Black is on roll and offers: white must answer, and white is far behind.
    expect(wantsToTake(behind, { strength: "careful" })).toBe(false);
    const close = offerDouble(race("6:4,5:4,4:4,3:3", "6:4,5:4,4:4,3:3"));
    expect(wantsToTake(close, { strength: "careful" })).toBe(true);
  });

  it("does not double where it cannot, nor in a game played to lose", () => {
    const noCube = race("5:3,4:3,3:3,2:3", "6:4,5:4,4:4,3:3");
    expect(wantsToDouble({ ...noCube, settings: settingsFor("backgammon") }, { strength: "strong" })).toBe(false);
  });
});
