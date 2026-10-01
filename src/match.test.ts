import { describe, expect, it } from "vitest";

import { canDouble, type GameResult, type GameState } from "./game.ts";
import { finishGame, newMatch, pointsToGo, startGame } from "./match.ts";
import { settingsFor } from "./rules.ts";

const win = (winner: "white" | "black", points: number): GameResult => ({ winner, how: "bear-off", kind: "single", multiplier: points, cube: 1, points });
const ready = (game: GameState): GameState => ({ ...game, turn: "white", phase: "before-roll" });

describe("a match", () => {
  const settings = settingsFor("backgammon", { points: 5, cube: true, gammons: true });

  it("adds up the score until a side reaches the match length, then is over", () => {
    let match = newMatch(settings);
    match = finishGame(match, win("white", 2));
    expect(match.score).toEqual([2, 0]);
    expect(match.over).toBe(false);
    match = finishGame(match, win("black", 3));
    match = finishGame(match, win("white", 4));
    expect(match.score).toEqual([6, 3]);
    expect(match.over).toBe(true);
    expect(match.winner).toBe("white");
    expect(() => startGame(match)).toThrow();
  });

  it("makes the game after a side first comes within a point of winning the Crawford game, without the cube, and only that one", () => {
    let match = newMatch(settings);
    match = finishGame(match, win("white", 4));
    expect(match.crawfordNext).toBe(true);
    const crawford = ready(startGame(match));
    expect(crawford.crawford).toBe(true);
    expect(canDouble(crawford)).toBe(false);
    match = finishGame(match, win("black", 1));
    expect(match.crawfordNext).toBe(false);
    expect(match.crawfordPlayed).toBe(true);
    expect(canDouble(ready(startGame(match)))).toBe(true);
    // Neither side coming to a point away again makes another Crawford game.
    match = finishGame(match, win("black", 2));
    expect(match.crawfordNext).toBe(false);
  });

  it("has no Crawford game if the rule is off", () => {
    const match = finishGame(newMatch(settingsFor("backgammon", { points: 5, cube: true, crawford: false })), win("white", 4));
    expect(match.crawfordNext).toBe(false);
  });

  it("has no Crawford game when a side jumps to the match point, or goes past it", () => {
    expect(finishGame(newMatch(settings), win("white", 5)).over).toBe(true);
    const jumped = finishGame(finishGame(newMatch(settings), win("white", 2)), win("white", 2));
    expect(jumped.crawfordNext).toBe(true);
  });

  it("says how many points each side still needs", () => {
    const match = finishGame(newMatch(settings), win("black", 2));
    expect(pointsToGo(match, "white")).toBe(5);
    expect(pointsToGo(match, "black")).toBe(3);
  });

  it("is over after one game at one point, and a draw ends it with no winner", () => {
    const one = finishGame(newMatch(settingsFor("backgammon")), win("black", 1));
    expect(one).toMatchObject({ over: true, winner: "black" });
    const draw = finishGame(newMatch(settings), { winner: null, how: "draw", kind: "single", multiplier: 1, cube: 1, points: 0 });
    expect(draw).toMatchObject({ over: true, winner: null });
  });

  it("goes on for ever in money play, where each game is scored alone", () => {
    let match = newMatch(settingsFor("backgammon", { points: 0, cube: true }));
    for (let i = 0; i < 20; i += 1) match = finishGame(match, win("white", 8));
    expect(match.over).toBe(false);
    expect(match.score).toEqual([160, 0]);
    expect(match.crawfordNext).toBe(false);
    expect(pointsToGo(match, "white")).toBe(0);
  });

  it("is a one-point game with no cube, being its own Crawford game", () => {
    const game = ready(startGame(newMatch(settingsFor("backgammon", { points: 1, cube: true }))));
    expect(canDouble(game)).toBe(false);
  });
});
