import { describe, expect, it } from "vitest";

import { randomMatch } from "./driver.fixture.ts";
import { GameRecorder, formatRecordHeader, replayRecord, RECORD_VERSION } from "./record.ts";
import { settingsFor } from "./rules.ts";
import { VARIANT_KEYS } from "./variants.ts";

const header = (extra = "") => `sugoroku ${RECORD_VERSION}\nvariant backgammon\npoints 1\n${extra}`;

describe("a record", () => {
  it("replays a game written by hand, move by move, and says who won and by how much", () => {
    const text = `${header()}game 1
open 3 1
white 31: 8/5 6/5
black 64: 24/14
# the rest is not needed: a game in play replays as a game in play
`;
    const replay = replayRecord(text);
    expect(replay.ok).toBe(true);
    if (replay.ok) {
      expect(replay.games).toHaveLength(0);
      expect(replay.current?.turn).toBe("white");
      expect(replay.current?.position.points[1][23]).toBe(1);
      expect(replay.current?.position.points[1][13]).toBe(1);
    }
  });

  it("refuses an illegal move, naming its line", () => {
    const replay = replayRecord(`${header()}game 1\nopen 3 1\nwhite 31: 24/21 13/11\n`);
    expect(replay).toMatchObject({ ok: false, line: 6 });
    expect((replay as { reason: string }).reason).toMatch(/not a legal play/);
  });

  it("refuses a turn out of turn, dice that do not fit the opening, and a double that is not allowed", () => {
    expect(replayRecord(`${header()}game 1\nopen 3 1\nblack 31: 24/21 6/5\n`)).toMatchObject({ ok: false });
    expect(replayRecord(`${header()}game 1\nopen 3 1\nwhite 62: 24/18 13/11\n`)).toMatchObject({ ok: false });
    expect(replayRecord(`${header("cube on\n").replace("points 1", "points 5")}game 1\nopen 3 1\nwhite 31: 8/5 6/5\nwhite doubles\n`)).toMatchObject({ ok: false });
    expect(replayRecord(`${header("cube on\n")}game 1\nopen 3 1\nwhite 31: 8/5 6/5\nblack doubles\n`)).toMatchObject({ ok: false });
  });

  it("refuses text that is not a record", () => {
    expect(replayRecord("")).toMatchObject({ ok: false });
    expect(replayRecord("hello")).toMatchObject({ ok: false });
    expect(replayRecord("sugoroku 1\n")).toMatchObject({ ok: false });
    expect(replayRecord("sugoroku 1\nvariant chess\ngame 1\n")).toMatchObject({ ok: false });
    expect(replayRecord("sugoroku 1\nvariant backgammon\npoints x\ngame 1\n")).toMatchObject({ ok: false });
    expect(replayRecord("sugoroku 1\nvariant backgammon\njacoby on\ngame 1\n")).toMatchObject({ ok: false });
    expect(replayRecord("sugoroku 2\nvariant backgammon\n")).toMatchObject({ ok: false });
  });

  it("writes the header from the settings and the seed", () => {
    const lines = formatRecordHeader(settingsFor("nackgammon", { points: 3, cube: true, gammons: true }), "chibi");
    expect(lines).toEqual(["sugoroku 1", "variant nackgammon", "points 3", "cube on", "crawford on", "jacoby off", "beaver off", "gammons on", "seed chibi"]);
    expect(() => formatRecordHeader(settingsFor("backgammon"), "12345")).toThrow();
  });
});

describe("a record of whole games", () => {
  it("replays to exactly what was played, for every variant and for matches with the cube", () => {
    for (const key of VARIANT_KEYS) {
      for (const rules of [{}, { points: 3, cube: true, gammons: true }] as const) {
        const settings = settingsFor(key, key === "anti-backgammon" || key === "tabula" ? {} : rules);
        const { match, text, games } = randomMatch(settings, 11);
        const replay = replayRecord(text);
        expect(replay.ok, `${key}: ${JSON.stringify(replay)}`).toBe(true);
        if (!replay.ok) continue;
        expect(replay.match.score).toEqual(match.score);
        expect(replay.games.map((g) => g.result)).toEqual(games.map((g) => g.game.result));
        expect(replay.match.over).toBe(match.over);
        expect(replay.current).toBeNull();
      }
    }
  });

  it("checks the dice against the seed, and refuses a record whose dice were not the seed's", () => {
    const { text } = randomMatch(settingsFor("backgammon"), 5);
    expect(replayRecord(text).ok).toBe(true);
    const tampered = text.replace(/^open (\d) (\d)$/m, (_, a: string, b: string) => `open ${(Number(a) % 6) + 1} ${b}`);
    const bad = replayRecord(tampered);
    expect(bad.ok).toBe(false);
    expect((bad as { reason: string }).reason).toMatch(/seed/);
  });

  it("refuses a result line that is not what the game came to", () => {
    const { text } = randomMatch(settingsFor("backgammon"), 6);
    const wrong = text.replace(/^result (white|black) /m, (_, side: string) => `result ${side === "white" ? "black" : "white"} `);
    expect(replayRecord(wrong).ok).toBe(false);
  });

  it("is a record that can be added to as the game goes: a game not yet finished replays as a game in play", () => {
    const recorder = new GameRecorder(settingsFor("backgammon", { points: 3, cube: true, gammons: true }));
    recorder.startGame();
    recorder.opening([6, 2]);
    recorder.turn("white", [6, 2], [{ from: 24, to: 18, die: 6, hit: false }, { from: 13, to: 11, die: 2, hit: false }]);
    recorder.double("black");
    const replay = replayRecord(recorder.text());
    expect(replay.ok).toBe(true);
    if (replay.ok) expect(replay.current?.phase).toBe("double-offered");
  });

  it("scores a dropped double and a concession, and the Crawford game, as the match goes", () => {
    const text = `sugoroku 1
variant backgammon
points 3
cube on
gammons on
game 1
open 6 1
white 61: 13/7 8/7
black doubles
white drops
game 2
open 5 2
black 52: 13/8 24/22
black concedes single
`;
    const replay = replayRecord(text.replace("black 52: 13/8 24/22\nblack concedes single", "white 52: 24/22 13/8\nwhite concedes single"));
    expect(replay.ok, JSON.stringify(replay)).toBe(true);
    if (!replay.ok) return;
    expect(replay.games.map((g) => g.result.points)).toEqual([1, 1]);
    expect(replay.match.score).toEqual([0, 2]);
    expect(replay.games[0]?.result).toMatchObject({ winner: "black", how: "drop" });
    expect(replay.games[1]?.result).toMatchObject({ winner: "black", how: "concede" });
  });
});
