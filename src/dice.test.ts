import { describe, expect, it } from "vitest";

import { openingFrom, randomDice, rollFrom, seededDice } from "./dice.ts";
import { hashSeed, seededRandom } from "./random.ts";

describe("the seeded dice", () => {
  it("are the same dice for the same seed, number or text, and different for another", () => {
    const a = rollFrom(seededDice(2026), 40);
    expect(rollFrom(seededDice(2026), 40)).toEqual(a);
    expect(rollFrom(seededDice(2027), 40)).not.toEqual(a);
    expect(rollFrom(seededDice("chibi"), 40)).toEqual(rollFrom(seededDice("chibi"), 40));
  });

  it("are the dice these numbers say they are, so that a server can hold a game to its seed", () => {
    // Fixed here so that a change to the dice is a deliberate one: games kept by their seed would replay differently.
    expect(rollFrom(seededDice(1), 12)).toEqual([4, 1, 4, 6, 6, 2, 4, 5, 3, 6, 3, 3]);
    expect(hashSeed("sugoroku")).toBe(hashSeed("sugoroku"));
    expect(seededRandom(7)()).toBeGreaterThanOrEqual(0);
  });

  it("show every face about equally often", () => {
    const counts = [0, 0, 0, 0, 0, 0];
    for (const die of rollFrom(seededDice("faces"), 60000)) counts[die - 1] = (counts[die - 1] as number) + 1;
    for (const count of counts) expect(Math.abs(count - 10000)).toBeLessThan(400);
  });

  it("take the opening throw as white's die and then black's, and rolls as many dice as asked", () => {
    const source = seededDice(5);
    const [white, black] = openingFrom(source);
    expect(rollFrom(seededDice(5), 2)).toEqual([white, black]);
    expect(rollFrom(source, 3)).toHaveLength(3);
  });

  it("from the device are always 1 to 6", () => {
    const source = randomDice();
    for (let i = 0; i < 2000; i += 1) {
      const die = source();
      expect(die >= 1 && die <= 6 && Number.isInteger(die)).toBe(true);
    }
  });
});
