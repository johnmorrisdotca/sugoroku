import { describe, expect, it } from "vitest";

import { BAR, boardPoint, inContact, mirrorPoint, pipCount, startPosition, type Position } from "./board.ts";
import { newGame, legalMoves, legalPlaysOf, playMove, rollDice, rollOpening, type GameState } from "./game.ts";
import { movesOfDie } from "./moves.ts";
import { formatPlay, parsePosition } from "./notation.ts";
import { diceToPlay, legalPlays } from "./plays.ts";
import { DEFAULT_RULES, PRESETS, presetByKey, presetByName, resolveRules, rulesProblems, settingsFor } from "./rules.ts";
import { startCounts, startReserve, VARIANT_KEYS, VARIANTS } from "./variants.ts";

const at = (text: string): Position => parsePosition(text) as Position;

describe("the rows", () => {
  it("say where each variant's checkers start", () => {
    expect(startCounts(VARIANTS.nackgammon).join(",")).toBe("0,0,0,0,0,4,0,3,0,0,0,0,4,0,0,0,0,0,0,0,0,0,2,2");
    expect(startCounts(VARIANTS["long-gammon"])[23]).toBe(15);
    expect(startCounts(VARIANTS.hypergammon).filter((n) => n > 0)).toEqual([1, 1, 1]);
    expect(startReserve(VARIANTS.tabula)).toBe(15);
    expect(startReserve(VARIANTS["backgammon-race"])).toBe(15);
    expect(startReserve(VARIANTS.backgammon)).toBe(0);
  });

  it("number their points so that each side's own 24 is the other's own 1, except where the sides share a track", () => {
    expect(mirrorPoint(VARIANTS.backgammon, 24)).toBe(1);
    expect(boardPoint(VARIANTS.backgammon, "black", 24)).toBe(1);
    expect(boardPoint(VARIANTS.backgammon, "white", 24)).toBe(24);
    expect(mirrorPoint(VARIANTS.tabula, 24)).toBe(24);
    expect(boardPoint(VARIANTS.tabula, "black", 7)).toBe(7);
  });
});

describe("Backgammon Race", () => {
  const spec = VARIANTS["backgammon-race"];

  it("enters checkers from off the board whenever a side likes, onto 25 minus the die", () => {
    const position = startPosition(spec);
    expect(movesOfDie(spec, position, "white", 6)).toEqual([{ from: BAR, to: 19, die: 6, hit: false }]);
    const plays = legalPlays(spec, position, "white", [6, 1]).map((play) => formatPlay(play.moves));
    expect(plays).toContain("bar/19 bar/24");
    expect(plays).toContain("bar/19/18");
  });

  it("lets a checker on the board move while others are still to enter, but a hit one must enter first", () => {
    const loose = at("white=19:1 black= reserve=14,15");
    expect(movesOfDie(spec, loose, "white", 3).map((m) => `${m.from}/${m.to}`).sort()).toEqual(["19/16", "25/22"]);
    const hit = at("white=19:1 black= bar=1,0 reserve=13,15");
    expect(movesOfDie(spec, hit, "white", 3).map((m) => `${m.from}/${m.to}`)).toEqual(["25/22"]);
  });

  it("still hits and is hit, and cannot bear off with a checker yet to enter", () => {
    // White's lone checker on its 1-point is black's 24: black entering with a 1 lands on it.
    const position = at("white=1:1 black= reserve=14,15");
    expect(movesOfDie(spec, position, "black", 1)).toEqual([{ from: BAR, to: 24, die: 1, hit: true }]);
    expect(movesOfDie(spec, position, "white", 6).some((m) => m.to === 0)).toBe(false);
  });

  it("scores a gammon for a side that still has checkers off the board when the game ends", () => {
    let game: GameState = { ...newGame(settingsFor("backgammon-race", { points: 3, cube: true, gammons: true })), position: at("white=1:1 black= reserve=0,15 off=14,0"), turn: "white", phase: "before-roll" };
    game = playMove(rollDice(game, [1, 2]), { from: 1, to: 0 });
    expect(game.result).toMatchObject({ kind: "backgammon", points: 3 });
  });
});

describe("Tabula", () => {
  const spec = VARIANTS.tabula;

  it("rolls three dice, none of them special: three sixes are three moves", () => {
    expect(diceToPlay(spec, [6, 6, 6])).toEqual([6, 6, 6]);
    const plays = legalPlays(spec, startPosition(spec), "white", [6, 6, 6]);
    expect(plays.every((play) => play.moves.length === 3)).toBe(true);
    expect(plays.map((play) => formatPlay(play.moves))).toContain("bar/19(3)");
  });

  it("enters every checker into the same table, and both sides move the same way round the same board", () => {
    const start = startPosition(spec);
    expect(movesOfDie(spec, start, "white", 2)[0]).toMatchObject({ to: 23 });
    expect(movesOfDie(spec, start, "black", 2)[0]).toMatchObject({ to: 23 });
    // The same point is the same board point for both.
    expect(boardPoint(spec, "white", 23)).toBe(boardPoint(spec, "black", 23));
  });

  it("holds every checker in the first half until all fifteen have entered", () => {
    // White has a checker on its 13-point and 14 still to enter: a 1 and a 2 may enter, and 13/12 may not.
    const early = at("white=13:1 black= reserve=14,15");
    expect(movesOfDie(spec, early, "white", 1).map((m) => `${m.from}/${m.to}`).sort()).toEqual(["25/24"]);
    // With everything entered it may cross.
    const done = at("white=13:1,24:14 black= reserve=0,15");
    expect(movesOfDie(spec, done, "white", 1).some((m) => m.from === 13 && m.to === 12)).toBe(true);
  });

  it("hits a blot, which must then re-enter, and is blocked by two checkers as in backgammon", () => {
    const blot = at("white= black=22:1 reserve=15,14");
    expect(movesOfDie(spec, blot, "white", 3)[0]).toMatchObject({ from: BAR, to: 22, hit: true });
    const block = at("white= black=22:2 reserve=15,13");
    expect(movesOfDie(spec, block, "white", 3)).toEqual([]);
  });

  it("starts with a die each and then a roll of three for the winner", () => {
    const game = rollOpening(newGame(settingsFor("tabula")), [4, 2]);
    expect(game.turn).toBe("white");
    expect(game.phase).toBe("before-roll");
    expect(rollDice(game, [6, 5, 1]).need).toEqual([6, 5, 1]);
    expect(() => rollDice(game, [6, 5])).toThrow();
  });

  it("is in contact until the trailing side has passed, one side only able to hit the other", () => {
    expect(inContact(spec, at("white=5:1 black=20:1"))).toBe(true);
  });

  it("bears off like backgammon once every checker is in the finishing table", () => {
    const position = at("white=3:2 black=24:1 off=13,0");
    expect(movesOfDie(spec, position, "white", 6)).toEqual([{ from: 3, to: 0, die: 6, hit: false }]);
  });
});

describe("Anti-Backgammon, Nackgammon, Long Gammon and Hypergammon", () => {
  it("play by the standard rules from their own starts: a Long Gammon back checker hits as any does", () => {
    const start = startPosition(VARIANTS["long-gammon"]);
    expect(legalPlays(VARIANTS["long-gammon"], start, "white", [6, 5]).map((play) => formatPlay(play.moves))).toContain("24/18 24/19");
    expect(pipCount(start, "white")).toBe(360);
  });

  it("count 167 pips in Nackgammon's start and 69 in Hypergammon's", () => {
    expect(pipCount(startPosition(VARIANTS.nackgammon), "white")).toBe(2 * 24 + 2 * 23 + 4 * 13 + 3 * 8 + 4 * 6);
    expect(pipCount(startPosition(VARIANTS.hypergammon), "white")).toBe(24 + 23 + 22);
  });

  it("let Hypergammon end in a few turns: three checkers bear off at once with doubles", () => {
    const game: GameState = { ...newGame(settingsFor("hypergammon")), position: at("white=3:1,2:1,1:1 black=24:1,23:1,22:1"), turn: "white", phase: "before-roll" };
    const rolled = rollDice(game, [6, 6]);
    expect(legalMoves(rolled).length).toBeGreaterThan(0);
    let at3 = rolled;
    while (at3.phase === "playing" && legalMoves(at3).length > 0) at3 = playMove(at3, legalMoves(at3)[0] as { from: number; to: number });
    expect(at3.phase).toBe("over");
    expect(at3.result?.winner).toBe("white");
    expect(legalPlaysOf(rolled).length).toBeGreaterThan(0);
  });
});

describe("the rules and the presets", () => {
  it("fill what is left out with a single game, no cube and no gammons", () => {
    expect(resolveRules()).toEqual(DEFAULT_RULES);
    expect(resolveRules({ points: 5, cube: true })).toMatchObject({ points: 5, cube: true, crawford: true, jacoby: false });
  });

  it("refuse rules that make no sense together, in words", () => {
    expect(rulesProblems({ ...DEFAULT_RULES, jacoby: true })).not.toEqual([]);
    expect(rulesProblems({ ...DEFAULT_RULES, points: 3, jacoby: true, cube: true, gammons: true })).toEqual(expect.arrayContaining([expect.stringContaining("money play")]));
    expect(rulesProblems({ ...DEFAULT_RULES, points: -1 })).not.toEqual([]);
    expect(rulesProblems({ ...DEFAULT_RULES, cube: true }, VARIANTS["anti-backgammon"])).not.toEqual([]);
    expect(() => resolveRules({ beaver: true })).toThrow(/cannot be played/);
    expect(() => settingsFor("chess" as never)).toThrow();
  });

  it("find every name the two sites printed, ignoring case and spacing, and no other", () => {
    const names = [
      "Backgammon", "Backgammon (3 Point)", "Backgammon (5 Point)", "Backgammon (7 Point)", "Backgammon (9 Point)", "Backgammon Level 2", "Backgammon Level 3", "Backgammon Race", "Backgammon Race Level 2",
      "Casual Backgammon", "Pro Backgammon", "Pro Backgammon Level 2", "Pro Backgammon Race", "Pro Backgammon-9", "Anti-Backgammon", "Nackgammon", "Nackgammon (3 Point)", "Nackgammon (5 Point)",
      "Nackgammon (7 Point)", "Nackgammon (9 Point)", "Pro Nackgammon", "Long Gammon", "Long Gammon (3 Point)", "Long Gammon (5 Point)", "Long Gammon (7 Point)", "Long Gammon (9 Point)",
      "Hypergammon", "Hypergammon (3 Point)", "Hypergammon (5 Point)", "Tabula",
    ];
    for (const name of names) expect(presetByName(name), name).toBeDefined();
    expect(presetByName("  pro backgammon-9 ")?.rules.points).toBe(9);
    expect(presetByName("Chess")).toBeUndefined();
    expect(PRESETS.flatMap((preset) => preset.names).sort()).toEqual([...names].sort());
  });

  it("give each name the rules ItsYourTurn's help and GoldToken's rules page say", () => {
    expect(presetByName("Pro Backgammon")?.rules).toMatchObject({ points: 5, cube: true, crawford: true, gammons: true });
    expect(presetByName("Pro Backgammon-9")?.rules.points).toBe(9);
    expect(presetByName("Casual Backgammon")?.rules).toMatchObject({ points: 1, cube: false, gammons: false });
    expect(presetByName("Backgammon Race")?.variant).toBe("backgammon-race");
    expect(presetByName("Pro Backgammon Race")?.rules.points).toBe(5);
    expect(presetByName("Anti-Backgammon")?.rules.cube).toBe(false);
    expect(presetByName("Pro Nackgammon")?.variant).toBe("nackgammon");
    expect(presetByName("Hypergammon (3 Point)")?.rules.points).toBe(3);
    expect(presetByKey("long-gammon-9")?.names).toEqual(["Long Gammon (9 Point)"]);
    for (const preset of PRESETS) {
      expect(VARIANT_KEYS).toContain(preset.variant);
      expect(rulesProblems(preset.rules, VARIANTS[preset.variant]), preset.key).toEqual([]);
    }
  });
});
