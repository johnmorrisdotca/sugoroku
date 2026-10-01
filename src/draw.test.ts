import { describe, expect, it } from "vitest";

import { startPosition, type Position } from "./board.ts";
import { SUGOROKU_BOARD_NAMES, SUGOROKU_CHECKER_SET_NAMES } from "./colours.ts";
import { drawSugoroku, MOST_DRAWN } from "./draw.ts";
import { boardSize } from "./geometry.ts";
import { parsePosition } from "./notation.ts";
import { SUGOROKU_STYLE } from "./style.ts";
import { VARIANT_KEYS, VARIANTS } from "./variants.ts";

const at = (text: string): Position => parsePosition(text) as Position;
const viewBox = (svg: string): string => /viewBox="([^"]+)"/.exec(svg)?.[1] ?? "";
const count = (svg: string, pattern: RegExp): number => (svg.match(pattern) ?? []).length;

describe("the drawing", () => {
  it("is SVG text with nothing in it to run or to load", () => {
    const svg = drawSugoroku(startPosition(VARIANTS.backgammon), { style: true });
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg.endsWith("</svg>")).toBe(true);
    expect(svg).not.toMatch(/<script|<image|<foreignObject|\son[a-z]+=|href=|url\(http/i);
  });

  it("is the same size whatever is on the board, so that a page never shifts", () => {
    const boxes = new Set<string>();
    for (const position of ["white=24:2,13:5,8:3,6:5 black=24:2,13:5,8:3,6:5", "white= black= off=15,15", "white=6:15 black=19:15 bar=0,0", "white=24:1 black=24:1 bar=3,4 off=11,10"]) {
      boxes.add(viewBox(drawSugoroku(at(position))));
      boxes.add(viewBox(drawSugoroku(at(position), { dice: { side: "white", values: [6, 6] }, numbers: true })));
      boxes.add(viewBox(drawSugoroku(at(position), { highlight: { side: "white", from: 24, targets: [18, 0] } })));
    }
    expect(boxes.size).toBe(1);
  });

  it("stands up in the other shape, with the box turned, and is the same size at every position there too", () => {
    const land = boardSize({ cube: true, orientation: "landscape" });
    const port = boardSize({ cube: true, orientation: "portrait" });
    expect([port.width, port.height]).toEqual([land.height, land.width]);
    const a = drawSugoroku(startPosition(VARIANTS.backgammon), { orientation: "portrait", cube: { value: 1, owner: null } });
    expect(viewBox(a)).toBe(`0 0 ${port.width} ${port.height}`);
    expect(a).toContain('data-orientation="portrait"');
  });

  it("has a rail for the cube only in a game that has one", () => {
    const without = viewBox(drawSugoroku(startPosition(VARIANTS.backgammon)));
    const withCube = viewBox(drawSugoroku(startPosition(VARIANTS.backgammon), { cube: { value: 1, owner: null } }));
    expect(without).not.toBe(withCube);
    expect(drawSugoroku(startPosition(VARIANTS.backgammon), { cube: { value: 8, owner: "black" } })).toContain('data-owner="black"');
  });

  it("draws the 24 points, each with its number counted as white counts, to listen on", () => {
    const svg = drawSugoroku(startPosition(VARIANTS.backgammon));
    const points = [...svg.matchAll(/class="sg-point" data-board="(\d+)"/g)].map((m) => Number(m[1]));
    expect(points).toEqual(Array.from({ length: 24 }, (_, i) => i + 1));
    expect(svg).toContain('data-bar="white"');
    expect(svg).toContain('data-tray="black"');
  });

  it("draws each stack as high as it is, to five, and writes the count on the fifth when there are more", () => {
    const svg = drawSugoroku(at("white=13:3,6:7 black=24:5,12:15"));
    const stack = (side: string, board: number): string[] => [...svg.matchAll(new RegExp(`<g class="sg-checker" data-side="${side}" data-board="${board}"[^>]*>.*?</g>`, "g"))].map((m) => m[0]);
    expect(stack("white", 13)).toHaveLength(3);
    // White's own 6-point is the board's 6; its 13 is the board's 13.
    expect(stack("white", 6)).toHaveLength(MOST_DRAWN);
    expect(stack("white", 6).filter((c) => c.includes("sg-count"))).toHaveLength(1);
    expect(stack("white", 6).at(-1)).toContain(">7<");
    // Black's own 24-point is the board's 1, and its own 12 the board's 13.
    expect(stack("black", 1)).toHaveLength(5);
    expect(stack("black", 1).some((c) => c.includes("sg-count"))).toBe(false);
    expect(stack("black", 13)).toHaveLength(5);
    expect(stack("black", 13).at(-1)).toContain(">15<");
  });

  it("draws a checker for every checker that is on the board, on the bar or yet to enter, up to the stacks' limit, and a bar for those hit", () => {
    const svg = drawSugoroku(at("white=6:2 black=19:1 bar=2,1 reserve=0,0 off=3,0"));
    expect(count(svg, /class="sg-checker" data-side="white" data-bar="white"/g)).toBe(2);
    expect(count(svg, /class="sg-checker" data-side="black" data-bar="black"/g)).toBe(1);
    expect(count(svg, /class="sg-off" data-side="white"/g)).toBe(3);
    const race = drawSugoroku(startPosition(VARIANTS["backgammon-race"]), { variant: "backgammon-race" });
    expect(count(race, /data-bar="white" data-height/g)).toBe(MOST_DRAWN);
    expect(race).toContain(">15<");
  });

  it("puts the dice and the cube on the board, spent dice marked, a cube in the middle until somebody owns it", () => {
    const svg = drawSugoroku(startPosition(VARIANTS.backgammon), { dice: { side: "black", values: [5, 5], spent: [true, false] }, cube: { value: 1, owner: null } });
    expect(count(svg, /class="sg-die"/g)).toBe(2);
    expect(svg).toContain('data-spent="true"');
    expect(svg).toContain('data-owner="none"');
    const three = drawSugoroku(startPosition(VARIANTS.tabula), { variant: "tabula", dice: { side: "white", values: [1, 2, 3] } });
    expect(count(three, /class="sg-die"/g)).toBe(3);
  });

  it("numbers the points, for either side's view, when asked", () => {
    const off = drawSugoroku(startPosition(VARIANTS.backgammon));
    const on = drawSugoroku(startPosition(VARIANTS.backgammon), { numbers: true });
    const black = drawSugoroku(startPosition(VARIANTS.backgammon), { numbers: true, view: "black" });
    expect(count(off, /class="sg-number"/g)).toBe(0);
    expect(count(on, /class="sg-number"/g)).toBe(24);
    const numberOf = (svg: string, board: number): string => new RegExp(`class="sg-number"[^>]*data-board="${board}"[^>]*>(\\d+)<`).exec(svg)?.[1] ?? "";
    expect(numberOf(on, 13)).toBe("13");
    expect(numberOf(black, 13)).toBe("12");
    expect(numberOf(black, 1)).toBe("24");
  });

  it("puts the trays at the other end when asked, mirroring the whole board", () => {
    const right = drawSugoroku(startPosition(VARIANTS.backgammon), { home: "right" });
    const left = drawSugoroku(startPosition(VARIANTS.backgammon), { home: "left" });
    const x = (svg: string): number => Number(/data-tray="white" x="([\d.]+)"/.exec(svg)?.[1]);
    expect(x(right)).toBeGreaterThan(500);
    expect(x(left)).toBeLessThan(100);
    // The same checkers, mirrored: a point's checkers keep their stack and swap ends.
    expect(count(left, /class="sg-checker"/g)).toBe(count(right, /class="sg-checker"/g));
  });

  it("changes sides when seen from black: the rows trade places", () => {
    const white = drawSugoroku(startPosition(VARIANTS.backgammon), { view: "white" });
    const black = drawSugoroku(startPosition(VARIANTS.backgammon), { view: "black" });
    const y = (svg: string): number => Number(/data-tray="white" x="[\d.]+" y="([\d.]+)"/.exec(svg)?.[1]);
    expect(y(white)).toBeGreaterThan(y(black));
  });

  it("takes any colour, a named board or a named set of checkers, and the theme", () => {
    const svg = drawSugoroku(startPosition(VARIANTS.backgammon), { board: "blue", checkers: "gold-and-blue", colours: { felt: "#123456", white: "#fff" }, theme: "dark" });
    expect(svg).toContain("--sg-felt:#123456");
    expect(svg).toContain("--sg-white:#fff");
    expect(svg).toContain("--sg-black:#27508f");
    expect(svg).toContain('data-theme="dark"');
    for (const board of SUGOROKU_BOARD_NAMES) expect(drawSugoroku(startPosition(VARIANTS.backgammon), { board })).toContain("--sg-felt");
    for (const checkers of SUGOROKU_CHECKER_SET_NAMES) expect(drawSugoroku(startPosition(VARIANTS.backgammon), { checkers })).toContain("--sg-white");
  });

  it("marks the checker picked up and the places it may go", () => {
    const svg = drawSugoroku(startPosition(VARIANTS.backgammon), { highlight: { side: "white", from: 13, targets: [10, 0] } });
    expect(svg).toMatch(/data-board="13" data-tone="[ab]" data-selected="true"/);
    expect(svg).toMatch(/data-board="10" data-tone="[ab]" data-target="true"/);
    expect(svg).toMatch(/data-tray="white"[^>]*data-target="true"/);
    // Black's view of its own numbering: its 24 is the board's 1.
    expect(drawSugoroku(startPosition(VARIANTS.backgammon), { highlight: { side: "black", from: 24 } })).toMatch(/data-board="1" data-tone="[ab]" data-selected="true"/);
  });

  it("draws every variant's starting position", () => {
    for (const key of VARIANT_KEYS) {
      const spec = VARIANTS[key];
      const svg = drawSugoroku(startPosition(spec), { variant: spec });
      expect(count(svg, /class="sg-point"/g), key).toBe(24);
      expect(svg.length, key).toBeGreaterThan(2000);
    }
  });

  it("can have its style put inside, and its style leaves nothing on the board selectable", () => {
    expect(drawSugoroku(startPosition(VARIANTS.backgammon), { style: true })).toContain("user-select: none");
    expect(drawSugoroku(startPosition(VARIANTS.backgammon))).not.toContain("<style>");
    expect(SUGOROKU_STYLE).toMatch(/user-select: none/);
    expect(SUGOROKU_STYLE).toMatch(/touch-action: manipulation/);
    expect(SUGOROKU_STYLE).toMatch(/prefers-color-scheme: dark/);
  });

  it("describes itself to a screen reader, in the words it is given", () => {
    expect(drawSugoroku(startPosition(VARIANTS.backgammon))).toContain('aria-label="Backgammon board. White: 15 on the board, 0 borne off. Black: 15 on the board, 0 borne off."');
    expect(drawSugoroku(startPosition(VARIANTS.backgammon), { label: 'a "board"' })).toContain('aria-label="a &quot;board&quot;"');
  });
});
