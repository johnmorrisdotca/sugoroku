import { describe, expect, it } from "vitest";

import { startPosition, type Position } from "./board.ts";
import { formatMove, formatPlay, formatPosition, parseHops, parsePlay, parsePosition } from "./notation.ts";
import { legalPlays, playMoves } from "./plays.ts";
import { VARIANT_KEYS, VARIANTS } from "./variants.ts";

const std = VARIANTS.backgammon;

describe("moves as text", () => {
  it("write a move as the point it leaves and the point it lands on, with the bar, off and a star for a hit", () => {
    expect(formatMove({ from: 24, to: 18, die: 6, hit: false })).toBe("24/18");
    expect(formatMove({ from: 25, to: 22, die: 3, hit: true })).toBe("bar/22*");
    expect(formatMove({ from: 6, to: 0, die: 6, hit: false })).toBe("6/off");
  });

  it("join the two moves of one checker, count equal moves, and put the farthest back first", () => {
    const m = (from: number, to: number, hit = false) => ({ from, to, die: from - to, hit });
    expect(formatPlay([m(13, 11), m(24, 18)])).toBe("24/18 13/11");
    expect(formatPlay([m(24, 20), m(20, 18, true)])).toBe("24/20/18*");
    expect(formatPlay([m(24, 20, true), m(20, 18)])).toBe("24/20*/18");
    expect(formatPlay([m(8, 5), m(8, 5), m(6, 3), m(6, 3)])).toBe("8/5(2) 6/3(2)");
    expect(formatPlay([])).toBe("-");
  });

  it("read written plays back, chains and counts included", () => {
    expect(parseHops("24/18 13/11")).toEqual([{ from: 24, to: 18 }, { from: 13, to: 11 }]);
    expect(parseHops("24/20*/18")).toEqual([{ from: 24, to: 20 }, { from: 20, to: 18 }]);
    expect(parseHops("13/11(2)")).toEqual([{ from: 13, to: 11 }, { from: 13, to: 11 }]);
    expect(parseHops("bar/22* 6/off")).toEqual([{ from: 25, to: 22 }, { from: 6, to: 0 }]);
    expect(parseHops("-")).toEqual([]);
    expect(parseHops("24-18")).toBeNull();
    expect(parseHops("99/3")).toBeNull();
    expect(parseHops("24")).toBeNull();
  });

  it("find the moves of a legal written play in any order, and refuse one that is not legal", () => {
    const start = startPosition(std);
    const moves = parsePlay(std, start, "white", [3, 1], "6/5 8/5");
    expect(moves).not.toBeNull();
    expect(formatPlay(moves ?? [])).toBe("8/5 6/5");
    expect(parsePlay(std, start, "white", [3, 1], "24/21")).toBeNull();
    expect(parsePlay(std, start, "white", [3, 1], "8/5 6/5 13/12")).toBeNull();
    expect(parsePlay(std, start, "white", [3, 1], "13/10 6/5")).not.toBeNull();
    expect(parsePlay(std, start, "white", [3, 1], "13/12 13/10")).toBeNull();
  });

  it("read a single die's play as using the die that fits, and play a bear-off that ends the game early", () => {
    const position = parsePosition("white=2:1,1:1 black=24:2 off=13,0") as Position;
    const moves = parsePlay(std, position, "white", [6, 6], "2/off 1/off");
    expect(moves).not.toBeNull();
    expect(moves?.map((m) => m.die)).toEqual([6, 6]);
  });

  it("write every play of every opening roll of every variant so that it reads back to the same position", () => {
    for (const key of VARIANT_KEYS) {
      const spec = VARIANTS[key];
      const start = startPosition(spec);
      const rolls = spec.dice === 2 ? [[3, 1], [6, 6], [4, 2], [5, 5], [2, 1]] : [[3, 2, 1], [6, 6, 6], [5, 5, 2]];
      for (const roll of rolls) {
        for (const play of legalPlays(spec, start, "white", roll)) {
          const text = formatPlay(play.moves);
          const back = parsePlay(spec, start, "white", roll, text);
          expect(back, `${key} ${roll.join("")} ${text}`).not.toBeNull();
          expect(formatPosition(playMoves(spec, start, "white", back ?? []))).toBe(formatPosition(play.position));
        }
      }
    }
  });
});

describe("positions as text", () => {
  it("round-trip, for every variant's start", () => {
    for (const key of VARIANT_KEYS) {
      const start = startPosition(VARIANTS[key]);
      expect(parsePosition(formatPosition(start))).toEqual(start);
    }
  });

  it("write each side highest point first, then the bar, those yet to enter and those off", () => {
    expect(formatPosition(startPosition(std))).toBe("white=24:2,13:5,8:3,6:5 black=24:2,13:5,8:3,6:5 bar=0,0 reserve=0,0 off=0,0");
  });

  it("read text with the bar, reserve and off left out, and refuse text that is not a position", () => {
    expect(parsePosition("white=6:15 black=")?.off).toEqual([0, 0]);
    expect(parsePosition("white=6:15")).toBeNull();
    expect(parsePosition("white=30:1 black=")).toBeNull();
    expect(parsePosition("nonsense")).toBeNull();
    expect(parsePosition("white=6:15 black= bar=1")).toBeNull();
  });
});
