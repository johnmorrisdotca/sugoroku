import { describe, expect, it } from "vitest";

import type { Position } from "./board.ts";
import {
  agreeDraw,
  beaverDouble,
  canBeaver,
  canDouble,
  concede,
  concedeKind,
  cubeIsDead,
  dropDouble,
  endTurn,
  legalMoves,
  legalPlaysOf,
  newGame,
  offerDouble,
  playMove,
  playTurn,
  rollDice,
  rollOpening,
  takeDouble,
  turnIsPlayed,
  undoMove,
  type GameState,
} from "./game.ts";
import { parsePosition } from "./notation.ts";
import { settingsFor } from "./rules.ts";

const at = (text: string): Position => parsePosition(text) as Position;
const match5 = { points: 5, cube: true, gammons: true } as const;

/** A game in the middle: the position given, `side` to move before it rolls. */
function midGame(position: string, side: "white" | "black" = "white", rules: Parameters<typeof settingsFor>[1] = match5, variant: Parameters<typeof settingsFor>[0] = "backgammon"): GameState {
  return { ...newGame(settingsFor(variant, rules)), position: at(position), turnStart: at(position), turn: side, phase: "before-roll" };
}

describe("the opening throw", () => {
  it("lets the higher die start, playing both dice as its first roll", () => {
    const game = rollOpening(newGame(settingsFor("backgammon")), [5, 2]);
    expect(game.turn).toBe("white");
    expect(game.phase).toBe("playing");
    expect(game.dice).toEqual([5, 2]);
    expect(game.need).toEqual([5, 2]);
    expect(rollOpening(newGame(settingsFor("backgammon")), [1, 4]).turn).toBe("black");
  });

  it("makes the sides throw again on a tie, which changes nothing", () => {
    const game = rollOpening(newGame(settingsFor("backgammon")), [3, 3]);
    expect(game.phase).toBe("opening");
    expect(game.turn).toBeNull();
    expect(rollOpening(game, [6, 1]).turn).toBe("white");
  });

  it("lets the winner of a die-each opening roll a roll of their own, as Tabula does", () => {
    const game = rollOpening(newGame(settingsFor("tabula")), [2, 6]);
    expect(game.turn).toBe("black");
    expect(game.phase).toBe("before-roll");
    expect(rollDice(game, [1, 2, 3]).need).toEqual([3, 2, 1]);
  });

  it("refuses a throw once the game has begun, and dice that are not dice", () => {
    expect(() => rollOpening(newGame(settingsFor("backgammon")), [7, 1])).toThrow();
    const begun = rollOpening(newGame(settingsFor("backgammon")), [5, 2]);
    expect(() => rollOpening(begun, [1, 2])).toThrow();
    expect(() => rollDice(midGame("white=24:2 black=24:2"), [1, 2, 3])).toThrow();
    expect(() => rollDice(midGame("white=24:2 black=24:2"), [0, 2])).toThrow();
  });
});

describe("making a turn", () => {
  it("takes the moves one at a time, each of them legal, and ends when the dice are played", () => {
    let game = rollDice(midGame("white=24:2,13:5,8:3,6:5 black=24:2,13:5,8:3,6:5"), [3, 1]);
    expect(turnIsPlayed(game)).toBe(false);
    expect(legalMoves(game).length).toBeGreaterThan(0);
    game = playMove(game, { from: 8, to: 5 });
    expect(game.need).toEqual([1]);
    game = playMove(game, { from: 6, to: 5 });
    expect(turnIsPlayed(game)).toBe(true);
    expect(game.position.points[0][4]).toBe(2);
    expect(() => playMove(game, { from: 13, to: 12 })).toThrow();
    game = endTurn(game);
    expect(game.turn).toBe("black");
    expect(game.phase).toBe("before-roll");
    expect(game.turns).toEqual([1, 0]);
  });

  it("refuses an illegal move, and ending a turn that is not played out", () => {
    const game = rollDice(midGame("white=24:2,13:5,8:3,6:5 black=24:2,13:5,8:3,6:5"), [3, 1]);
    expect(() => playMove(game, { from: 24, to: 10 })).toThrow();
    expect(() => endTurn(game)).toThrow();
  });

  it("undoes moves one at a time, back to the start of the turn", () => {
    let game = rollDice(midGame("white=24:2,13:5,8:3,6:5 black=24:2,13:5,8:3,6:5"), [3, 1]);
    const first = game.position;
    game = playMove(game, { from: 8, to: 5 });
    game = playMove(game, { from: 6, to: 5 });
    game = undoMove(game);
    expect(game.need).toEqual([1]);
    expect(game.moves).toHaveLength(1);
    game = undoMove(game);
    expect(game.position).toEqual(first);
    expect(game.need).toEqual([3, 1]);
    expect(undoMove(game)).toBe(game);
  });

  it("lets a side that cannot move end its turn at once", () => {
    const game = rollDice(midGame("white=13:3 black=6:2,5:2,4:2,3:2,2:2,1:2 bar=1,0 off=12,0"), [6, 5]);
    expect(game.need).toEqual([]);
    expect(turnIsPlayed(game)).toBe(true);
    expect(endTurn(game).turn).toBe("black");
  });

  it("offers every different play of the rest of a turn, for a computer to choose from", () => {
    const game = rollDice(midGame("white=24:2,13:5,8:3,6:5 black=24:2,13:5,8:3,6:5"), [3, 1]);
    expect(legalPlaysOf(game).length).toBeGreaterThan(5);
    const after = playMove(game, { from: 8, to: 5 });
    expect(legalPlaysOf(after).every((play) => play.moves.length === 1)).toBe(true);
  });

  it("plays a whole turn from a list of moves", () => {
    const game = rollDice(midGame("white=24:2,13:5,8:3,6:5 black=24:2,13:5,8:3,6:5"), [3, 1]);
    const play = legalPlaysOf(game).find((p) => p.moves.length === 2);
    expect(playTurn(game, play?.moves ?? []).turn).toBe("black");
  });
});

describe("winning", () => {
  const last = "white=1:1 black=24:2,13:5,8:3,6:5 off=14,0";

  it("is bearing off every checker, a single win when the other side has borne one off", () => {
    const game = rollDice(midGame("white=1:1 black=24:1,13:5,8:3,6:5 off=14,1"), [1, 2]);
    const done = playMove(game, { from: 1, to: 0 });
    expect(done.phase).toBe("over");
    expect(done.result).toMatchObject({ winner: "white", how: "bear-off", kind: "single", multiplier: 1, points: 1 });
  });

  it("is a gammon, worth two, when the other side has borne off none and nothing of it is in the winner's home", () => {
    const done = playMove(rollDice(midGame(last.replace("black=24:2", "black=18:2")), [1, 2]), { from: 1, to: 0 });
    expect(done.result).toMatchObject({ winner: "white", kind: "gammon", multiplier: 2, points: 2 });
  });

  it("is a backgammon, worth three, when the loser still has a checker on the bar or in the winner's home board", () => {
    const home = playMove(rollDice(midGame(last), [1, 2]), { from: 1, to: 0 });
    expect(home.result).toMatchObject({ kind: "backgammon", multiplier: 3, points: 3 });
    const onBar = playMove(rollDice(midGame("white=1:1 black=13:5 bar=0,1 off=14,0"), [1, 2]), { from: 1, to: 0 });
    expect(onBar.result?.kind).toBe("backgammon");
  });

  it("multiplies by the cube", () => {
    const game = { ...rollDice(midGame(last), [1, 2]), cube: { value: 4, owner: "black" as const } };
    expect(playMove(game, { from: 1, to: 0 }).result).toMatchObject({ multiplier: 3, cube: 4, points: 12 });
  });

  it("is a single win whatever happens when the rules do not count gammons, as in a game with no match", () => {
    const game = rollDice(midGame(last, "white", { points: 1 }), [1, 2]);
    expect(playMove(game, { from: 1, to: 0 }).result).toMatchObject({ kind: "backgammon", multiplier: 1, points: 1 });
  });

  it("counts gammons only if the cube was turned, under the Jacoby rule", () => {
    const rules = { points: 0, cube: true, gammons: true, jacoby: true } as const;
    const plain = playMove(rollDice(midGame(last, "white", rules), [1, 2]), { from: 1, to: 0 });
    expect(plain.result?.points).toBe(1);
    const turned = { ...rollDice(midGame(last, "white", rules), [1, 2]), cube: { value: 2, owner: "black" as const } };
    expect(playMove(turned, { from: 1, to: 0 }).result?.points).toBe(6);
  });

  it("ends at once, with dice left over, when the last checker is off", () => {
    const game = rollDice(midGame("white=1:1 black=13:5 off=14,0"), [6, 5]);
    const done = playMove(game, { from: 1, to: 0 });
    expect(done.phase).toBe("over");
    expect(() => endTurn(done)).toThrow();
  });
});

describe("the doubling cube", () => {
  const start = "white=24:2,13:5,8:3,6:5 black=24:2,13:5,8:3,6:5";

  it("may be offered at the start of a turn by either side while it is in the middle", () => {
    expect(canDouble(midGame(start, "white"))).toBe(true);
    expect(canDouble(midGame(start, "black"))).toBe(true);
    expect(canDouble(rollDice(midGame(start), [3, 1]))).toBe(false);
  });

  it("goes to the side that takes a double, at twice the value, and only that side may double next", () => {
    let game = offerDouble(midGame(start, "white"));
    expect(game.phase).toBe("double-offered");
    game = takeDouble(game);
    expect(game.cube).toEqual({ value: 2, owner: "black" });
    expect(game.turn).toBe("white");
    expect(canDouble(game)).toBe(false);
    expect(canDouble({ ...game, turn: "black" })).toBe(true);
  });

  it("is won, at the value it showed before the offer, by the side that offered when the other drops", () => {
    const game = dropDouble(offerDouble({ ...midGame(start, "black"), cube: { value: 4, owner: "black" } }));
    expect(game.phase).toBe("over");
    expect(game.result).toMatchObject({ winner: "black", how: "drop", points: 4 });
  });

  it("is not in play in a one-point game, nor with the cube off", () => {
    expect(canDouble(midGame(start, "white", { points: 1, cube: true }))).toBe(false);
    expect(canDouble(midGame(start, "white", { points: 5, cube: false }))).toBe(false);
  });

  it("is not in play in the Crawford game", () => {
    const game = { ...midGame(start, "white"), crawford: true };
    expect(canDouble(game)).toBe(false);
  });

  it("is frozen once it shows enough for either side to win the match", () => {
    const game = { ...midGame(start, "white", { points: 5, cube: true, gammons: true }), score: [3, 4] as const, cube: { value: 2, owner: null } };
    expect(cubeIsDead(game)).toBe(true);
    expect(canDouble(game)).toBe(false);
    expect(cubeIsDead({ ...game, cube: { value: 1, owner: null } })).toBe(false);
  });

  it("stops at 64", () => {
    expect(canDouble({ ...midGame(start, "white", { points: 0, cube: true }), cube: { value: 64, owner: "white" } })).toBe(false);
    expect(canDouble({ ...midGame(start, "white", { points: 0, cube: true }), cube: { value: 32, owner: "white" } })).toBe(true);
  });

  it("allows a beaver only when the rules say so, and then plays it as a redouble that keeps the cube", () => {
    const off = offerDouble(midGame(start, "white", { points: 0, cube: true, gammons: true }));
    expect(canBeaver(off)).toBe(false);
    const rules = { points: 0, cube: true, gammons: true, beaver: true } as const;
    const offered = offerDouble(midGame(start, "white", rules));
    expect(canBeaver(offered)).toBe(true);
    const beavered = beaverDouble(offered);
    expect(beavered.phase).toBe("beaver-offered");
    const taken = takeDouble(beavered);
    expect(taken.cube).toEqual({ value: 4, owner: "black" });
    expect(taken.turn).toBe("white");
    const dropped = dropDouble(beaverDouble(offered));
    expect(dropped.result).toMatchObject({ winner: "black", points: 2 });
  });

  it("is a rule that cannot be taken or dropped when nothing was offered", () => {
    expect(() => takeDouble(midGame(start))).toThrow();
    expect(() => dropDouble(midGame(start))).toThrow();
    expect(() => offerDouble(rollDice(midGame(start), [3, 1]))).toThrow();
  });
});

describe("giving up and drawing", () => {
  it("costs the worst the position could come to: a single game once a checker is off", () => {
    const game = midGame("white=13:5 black=1:5 off=10,10");
    expect(concedeKind(game, "white")).toBe("single");
  });

  it("is a backgammon while a checker could still be caught in the winner's home, otherwise a gammon", () => {
    expect(concedeKind(midGame("white=24:2,13:5 black=24:2,13:5"), "white")).toBe("backgammon");
    expect(concedeKind(midGame("white=3:5 black=3:5", "white"), "white")).toBe("gammon");
    expect(concedeKind(midGame("white=13:5 black=24:1 bar=1,0"), "white")).toBe("backgammon");
  });

  it("scores the other side the kind it was given up at, times the cube", () => {
    const game = concede({ ...midGame("white=24:2,13:5 black=24:2,13:5"), cube: { value: 2, owner: "black" } }, "white", "single");
    expect(game.result).toMatchObject({ winner: "black", how: "concede", kind: "single", points: 2 });
    expect(() => concede(midGame("white=3:5 black=3:5"), "white", "backgammon")).toThrow();
  });

  it("can be a draw by agreement, which scores nothing", () => {
    expect(agreeDraw(midGame("white=24:2 black=24:2")).result).toMatchObject({ winner: null, how: "draw", points: 0 });
  });

  it("is a draw in Anti-Backgammon after 500 turns each", () => {
    let game = midGame("white=24:2 black=24:2", "white", { points: 1 }, "anti-backgammon");
    game = { ...game, turns: [499, 499] };
    game = rollDice(game, [1, 2]);
    game = endTurnForcing(game);
    expect(game.phase).toBe("before-roll");
    game = rollDice(game, [1, 2]);
    game = endTurnForcing(game);
    expect(game.phase).toBe("over");
    expect(game.result?.how).toBe("draw");
  });
});

/** Play a turn out by making any legal moves, then end it. */
function endTurnForcing(game: GameState): GameState {
  let at = game;
  while (legalMoves(at).length > 0) at = playMove(at, legalMoves(at)[0] as { from: number; to: number });
  return endTurn(at);
}

describe("Anti-Backgammon", () => {
  it("is lost by the side that bears off first", () => {
    const game = rollDice(midGame("white=1:1 black=13:5 off=14,0", "white", { points: 1 }, "anti-backgammon"), [1, 2]);
    const done = playMove(game, { from: 1, to: 0 });
    expect(done.result).toMatchObject({ winner: "black", how: "bear-off", kind: "single", points: 1 });
  });
});
