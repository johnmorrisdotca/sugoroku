import { describe, expect, it } from "vitest";

import { allHome, BAR, pipCount, positionKey, startPosition, type Position } from "./board.ts";
import { bruteForcePositions } from "./brute.fixture.ts";
import { formatPlay, parsePosition } from "./notation.ts";
import { applyMove, movesOfDie } from "./moves.ts";
import { diceMustPlay, diceToPlay, legalPlays, nextMoves } from "./plays.ts";
import { seededRandom } from "./random.ts";
import { VARIANTS, VARIANT_KEYS } from "./variants.ts";

const std = VARIANTS.backgammon;
const at = (text: string): Position => parsePosition(text) as Position;

describe("the starting positions", () => {
  it("put fifteen checkers a side, and 167 pips, on the standard board", () => {
    const start = startPosition(std);
    expect(pipCount(start, "white")).toBe(167);
    expect(pipCount(start, "black")).toBe(167);
    expect(start.points[0].reduce((a, b) => a + b)).toBe(15);
  });

  it("put every variant's checkers where its row says, and no more of them than it has", () => {
    for (const key of VARIANT_KEYS) {
      const spec = VARIANTS[key];
      const start = startPosition(spec);
      for (const i of [0, 1] as const) expect(start.points[i].reduce((a, b) => a + b) + start.reserve[i], key).toBe(spec.checkers);
    }
  });

  it("start every checker of a race and of Tabula off the board", () => {
    for (const key of ["backgammon-race", "tabula"] as const) {
      const start = startPosition(VARIANTS[key]);
      expect(start.reserve).toEqual([15, 15]);
      expect(pipCount(start, "white")).toBe(375);
    }
  });
});

describe("one die", () => {
  it("moves a checker down by the die, and never past a point held by two of the other side", () => {
    // White on its 8 and 10; black holds white's 5 (black's own 20) with two.
    const position = at("white=10:1,8:1 black=20:2,13:1 off=0,0");
    const moves = movesOfDie(std, position, "white", 3);
    expect(moves.map((m) => `${m.from}/${m.to}`)).toEqual(["10/7"]);
  });

  it("hits a lone checker and sends it to the other side's bar", () => {
    const position = at("white=8:1 black=20:1,2:2");
    const [move] = movesOfDie(std, position, "white", 3);
    expect(move).toEqual({ from: 8, to: 5, die: 3, hit: true });
    const after = applyMove(std, position, "white", move as never);
    expect(after.bar).toEqual([0, 1]);
    expect(after.points[1][19]).toBe(0);
    expect(after.points[0][4]).toBe(1);
  });

  it("does not hit two checkers: a point of two is a block", () => {
    const position = at("white=8:1 black=20:2");
    expect(movesOfDie(std, position, "white", 3)).toEqual([]);
  });

  it("makes a side with a checker on the bar enter it before it moves anything else, at 25 minus the die", () => {
    const position = at("white=13:5 black=1:2 bar=1,0");
    expect(movesOfDie(std, position, "white", 2)).toEqual([{ from: BAR, to: 23, die: 2, hit: false }]);
    expect(movesOfDie(std, position, "white", 6)).toEqual([{ from: BAR, to: 19, die: 6, hit: false }]);
  });

  it("has no entry onto a point the other side holds with two, and no other move for it", () => {
    // Black's own 6 is white's own 19: held with two blocks a 6.
    const position = at("white=13:5 black=6:2 bar=1,0");
    expect(movesOfDie(std, position, "white", 6)).toEqual([]);
  });

  it("enters onto a lone checker and hits it", () => {
    const position = at("white=13:5 black=6:1 bar=1,0");
    expect(movesOfDie(std, position, "white", 6)).toEqual([{ from: BAR, to: 19, die: 6, hit: true }]);
  });
});

describe("bearing off", () => {
  const home = (counts: string, off = "0,0") => at(`white=${counts} black=24:2 off=${off}`);

  it("is not allowed while a checker is outside the home board", () => {
    const position = home("7:1,3:2");
    expect(allHome(position, "white")).toBe(false);
    expect(movesOfDie(std, position, "white", 6).some((m) => m.to === 0)).toBe(false);
  });

  it("takes a checker off by the exact die", () => {
    const position = home("6:1,3:2,1:1");
    expect(movesOfDie(std, position, "white", 3).find((m) => m.from === 3)).toEqual({ from: 3, to: 0, die: 3, hit: false });
  });

  it("takes the highest checker off with a larger die than it needs, and no other", () => {
    const position = home("4:1,3:2");
    const moves = movesOfDie(std, position, "white", 6);
    expect(moves).toEqual([{ from: 4, to: 0, die: 6, hit: false }]);
  });

  it("makes a smaller move within the home board when a checker stands higher than the die", () => {
    const position = home("6:1,2:1");
    const moves = movesOfDie(std, position, "white", 4);
    expect(moves.map((m) => `${m.from}/${m.to}`)).toEqual(["6/2"]);
  });

  it("does not bear off with the bar occupied", () => {
    const position = at("white=3:2 black=24:2 bar=1,0");
    expect(allHome(position, "white")).toBe(false);
  });
});

describe("a turn", () => {
  it("is two moves, and four for doubles", () => {
    const position = startPosition(std);
    expect(diceToPlay(std, [3, 1])).toEqual([3, 1]);
    expect(diceToPlay(std, [1, 3])).toEqual([3, 1]);
    expect(diceToPlay(std, [6, 6])).toEqual([6, 6, 6, 6]);
    const plays = legalPlays(std, position, "white", [6, 6]);
    expect(plays.every((play) => play.moves.length === 4)).toBe(true);
    expect(plays.map((play) => formatPlay(play.moves))).toContain("24/18(2) 13/7(2)");
  });

  it("can make the 5-point with a 3-1 from the start", () => {
    const plays = legalPlays(std, startPosition(std), "white", [3, 1]);
    expect(plays.map((play) => formatPlay(play.moves))).toContain("8/5 6/5");
  });

  it("must play both dice if it can, and the larger if it can play only one", () => {
    // White has only a checker on the bar, and black holds white's 18 (black's own 7). A 4 enters on 21 and a 3 on 22;
    // either one entered is then stopped from playing the other by the held point, so only one die can be played.
    const position = at("white= black=7:2 bar=1,0 off=14,0");
    expect(diceMustPlay(std, position, "white", diceToPlay(std, [4, 3]))).toEqual([4]);
    const plays = legalPlays(std, position, "white", [3, 4]);
    expect(plays.map((play) => formatPlay(play.moves))).toEqual(["bar/21"]);
  });

  it("plays the only die it can when the other cannot be played at all", () => {
    // Held: white's entry for a 6 (own 19 = black's 6), so only the 2 can be played, and a checker that enters with it cannot then play the 6.
    const position = at("white= black=6:2,8:2 bar=1,0 off=14,0");
    const plays = legalPlays(std, position, "white", [6, 2]);
    expect(diceMustPlay(std, position, "white", [6, 2])).toEqual([2]);
    expect(plays.every((play) => play.moves.length === 1 && play.moves[0]?.from === BAR && play.moves[0]?.die === 2)).toBe(true);
  });

  it("passes when nothing can be played", () => {
    const position = at("white=13:3 black=6:2,5:2,4:2,3:2,2:2,1:2 bar=1,0 off=12,0");
    const plays = legalPlays(std, position, "white", [6, 5]);
    expect(plays).toHaveLength(1);
    expect(plays[0]?.moves).toEqual([]);
    expect(formatPlay([])).toBe("-");
  });

  it("with doubles, plays as many of the four as it can", () => {
    // One checker on the bar and black's 6-point (own 19) is free but 6-point onwards is blocked: 6s enter and stop.
    const position = at("white=13:3 black=7:2 bar=1,0 off=11,0");
    const play = legalPlays(std, position, "white", [6, 6]);
    expect(Math.max(...play.map((p) => p.moves.length))).toBe(4);
  });

  it("offers a next move only if the rest of the dice can still be played", () => {
    // After 4 enters on 21, the 3 would run into black's two checkers on white's 18 (black's 7): so the 3 cannot be the first move.
    const position = at("white= black=7:2 bar=1,0 off=14,0");
    const next = nextMoves(std, position, "white", diceMustPlay(std, position, "white", [4, 3]));
    expect(next.map((m) => `${m.from}/${m.to}`)).toEqual(["25/21"]);
  });
});

describe("the engine against trying everything", () => {
  it("finds the same turns, over thousands of positions of every variant", () => {
    const random = seededRandom("brute");
    let checked = 0;
    for (const key of VARIANT_KEYS) {
      const spec = VARIANTS[key];
      for (let game = 0; game < 6; game += 1) {
        let position = startPosition(spec);
        let side: "white" | "black" = random() < 0.5 ? "white" : "black";
        for (let turn = 0; turn < 60; turn += 1) {
          const roll = Array.from({ length: spec.dice }, () => 1 + Math.floor(random() * 6));
          const plays = legalPlays(spec, position, side, roll);
          const brute = bruteForcePositions(spec, position, side, roll);
          expect(new Set(plays.map((play) => positionKey(play.position))), `${key} ${roll.join("")} ${turn}`).toEqual(brute);
          checked += 1;
          position = (plays[Math.floor(random() * plays.length)] as { position: Position }).position;
          if (position.off[side === "white" ? 0 : 1] === spec.checkers) break;
          side = side === "white" ? "black" : "white";
        }
      }
    }
    expect(checked).toBeGreaterThan(1000);
  }, 120_000);
});
