import { describe, expect, it } from "vitest";

import { startPosition } from "./board.ts";
import { formatPosition, parsePosition } from "./notation.ts";
import { positionFromId, positionId } from "./positionId.ts";
import { VARIANTS } from "./variants.ts";

describe("position IDs", () => {
  it("write the standard starting position as the manual's example, for either side to move", () => {
    const start = startPosition(VARIANTS.backgammon);
    expect(positionId(start, "white")).toBe("4HPwATDgc/ABMA");
    expect(positionId(start, "black")).toBe("4HPwATDgc/ABMA");
  });

  it("read that ID back as the starting position", () => {
    expect(positionFromId("4HPwATDgc/ABMA", "white")).toEqual(startPosition(VARIANTS.backgammon));
  });

  it("round-trip any position of the standard board, with checkers on the bar and borne off", () => {
    const position = parsePosition("white=24:1,13:3,8:2,6:2,5:1,3:1 black=20:2,11:3,9:1,2:4,1:1 bar=1,2 off=4,2") as never;
    for (const side of ["white", "black"] as const) {
      const id = positionId(position, side) as string;
      expect(id).toMatch(/^[A-Za-z0-9+/]{14}$/);
      const back = positionFromId(id, side) as never;
      expect(formatPosition(back)).toBe(formatPosition(position));
    }
  });

  it("put the side to move second, so that the same position is a different ID for the other side", () => {
    const position = parsePosition("white=24:2,13:5,8:3,6:5 black=24:2,13:5,8:3,6:5,1:0 off=0,0") as never;
    const lopsided = parsePosition("white=6:15 black=24:2,13:5,8:3,6:5") as never;
    expect(positionId(lopsided, "white")).not.toBe(positionId(lopsided, "black"));
    expect(positionId(position, "white")).toBe("4HPwATDgc/ABMA");
  });

  it("are null where the format cannot say: checkers yet to enter, and tracks that are shared", () => {
    expect(positionId(startPosition(VARIANTS["backgammon-race"]), "white")).toBeNull();
    expect(positionFromId("not an id", "white")).toBeNull();
    expect(positionFromId("//////////////", "white")).toBeNull();
  });

  it("hold a hypergammon position in the same space, three checkers a side", () => {
    const start = startPosition(VARIANTS.hypergammon);
    const id = positionId(start, "white") as string;
    expect(formatPosition(positionFromId(id, "white", 3) as never)).toBe(formatPosition(start));
  });
});
