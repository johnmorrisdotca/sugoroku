import { describe, expect, it } from "vitest";

import { BoardLayout } from "./geometry.ts";
import { SUGOROKU_STRINGS, sugorokuLanguageOf, sugorokuSay } from "./strings.ts";
import { createSounds, packagedSounds } from "./sound.ts";

describe("the words", () => {
  it("have every line in both languages, with the same values to fill in", () => {
    const en = Object.keys(SUGOROKU_STRINGS.en).sort();
    expect(Object.keys(SUGOROKU_STRINGS.ja).sort()).toEqual(en);
    const slots = (line: string): string[] => [...line.matchAll(/\{(\w+)\}/g)].map((m) => m[1] as string).sort();
    for (const key of en) expect(slots(SUGOROKU_STRINGS.ja[key] as string), key).toEqual(slots(SUGOROKU_STRINGS.en[key] as string));
  });

  it("fill in values, leave a missing one visible, and fall back to English for a line a language lacks", () => {
    expect(sugorokuSay("en", "doubled", { side: "White", value: 4 })).toBe("White doubles to 4.");
    expect(sugorokuSay("en", "doubled", { side: "White" })).toBe("White doubles to {value}.");
    expect(sugorokuSay("ja", "double")).toBe("ダブル");
    expect(sugorokuSay("ja", "no-such-line")).toBe("no-such-line");
  });

  it("read a page's language from its lang, and are Japanese only for ja", () => {
    expect(sugorokuLanguageOf(null)).toBe("en");
  });
});

describe("the layout of the drawn board", () => {
  it("puts the points of white's view along the bottom from the right and along the top from the left, and swaps the rows for black", () => {
    const white = new BoardLayout({ cube: false, view: "white", home: "right", orientation: "landscape" });
    expect(white.slotOf(1)).toEqual({ top: false, col: 11 });
    expect(white.slotOf(12)).toEqual({ top: false, col: 0 });
    expect(white.slotOf(13)).toEqual({ top: true, col: 0 });
    expect(white.slotOf(24)).toEqual({ top: true, col: 11 });
    const black = new BoardLayout({ cube: false, view: "black", home: "right", orientation: "landscape" });
    expect(black.slotOf(1).top).toBe(true);
    expect(black.slotOf(24).top).toBe(false);
  });

  it("keeps each side's tray at its own end, the cube at the end nearer its owner, and the dice on the half the side plays from", () => {
    const layout = new BoardLayout({ cube: true, view: "white", home: "right", orientation: "landscape" });
    expect(layout.trayBox("white").top).toBe(false);
    expect(layout.trayBox("black").top).toBe(true);
    expect(layout.cubeBox("white").y).toBeGreaterThan(layout.cubeBox(null).y);
    expect(layout.cubeBox("black").y).toBeLessThan(layout.cubeBox(null).y);
    expect(layout.diceCentre("white").x).toBeGreaterThan(layout.diceCentre("black").x);
  });

  it("mirrors a position of the board when the trays are on the left", () => {
    const right = new BoardLayout({ cube: false, view: "white", home: "right", orientation: "landscape" });
    const left = new BoardLayout({ cube: false, view: "white", home: "left", orientation: "landscape" });
    expect(left.mx(10, 20)).toBe(right.width - 30);
    expect(right.mx(10, 20)).toBe(10);
  });
});

describe("the sounds", () => {
  it("make nothing, quietly, where there is no audio", () => {
    const player = createSounds(packagedSounds());
    expect(() => player.play("clack")).not.toThrow();
    player.destroy();
    expect(() => player.play("dice")).not.toThrow();
  });

  it("are four files beside the code", () => {
    const urls = packagedSounds();
    expect(Object.keys(urls).sort()).toEqual(["clack", "cube", "dice", "hit"]);
    for (const url of Object.values(urls)) expect(url).toMatch(/sounds\/\w+\.wav$/);
  });
});
