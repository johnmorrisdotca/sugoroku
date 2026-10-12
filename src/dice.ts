import { seededRandom } from "./random.ts";

/** Where dice come from: each call is the number on one die, 1 to 6.
 *
 * @example
 * ```ts
 * import type { DiceSource } from "@johnmorrisdotca/sugoroku";
 * import { seededDice } from "@johnmorrisdotca/sugoroku";
 *
 * const value: DiceSource = seededDice(42);
 * console.log(value);
 * ```
 */
export type DiceSource = () => number;

/**
 * A SEEDED DICE SEQUENCE: the same seed is the same dice, one die after
 * another, in every browser and every Node, so a game can be played again from
 * its seed and a server can tell whether the dice a game says it had are the
 * dice it should have had. Dice are taken in the order a game asks for them:
 * the opening throw (white's die, then black's, and again for a tie), then
 * every roll in turn, each as many dice as the variant rolls.
 *
 * @param seed - A reproducible numeric or text seed.
 * @returns A SEEDED DICE SEQUENCE: the same seed is the same dice, one die after another, in every browser and every Node, so a game can be played again from its seed and a server can tell whether the dice a game says it had are the dice it should have had. Dice are taken in the order a game asks for them: the opening throw (white's die, then black's, and again for a tie), then every roll in turn, each as many dice as the variant rolls.
 * @example
 * ```ts
 * import { rollFrom, seededDice } from "@johnmorrisdotca/sugoroku";
 *
 * console.log(rollFrom(seededDice(42),2));
 * ```
 */
export function seededDice(seed: number | string): DiceSource {
  const random = seededRandom(seed);
  return () => 1 + Math.floor(random() * 6);
}

/** Dice that are not seeded: from the device's own random numbers.
 *
 * @returns Dice that are not seeded: from the device's own random numbers.
 * @example
 * ```ts
 * import { randomDice } from "@johnmorrisdotca/sugoroku";
 *
 * console.log(typeof randomDice());
 * ```
 */
export function randomDice(): DiceSource {
  const crypto = (globalThis as { crypto?: { getRandomValues?: (array: Uint32Array) => Uint32Array } }).crypto;
  if (crypto?.getRandomValues !== undefined) {
    const buffer = new Uint32Array(1);
    // Rejection keeps every face exactly as likely: 4294967292 is the largest multiple of six that fits.
    return () => {
      do crypto.getRandomValues?.(buffer);
      while ((buffer[0] as number) >= 4294967292);
      return 1 + ((buffer[0] as number) % 6);
    };
  }
  return () => 1 + Math.floor(Math.random() * 6);
}

/** A roll of `count` dice from a source.
 *
 * @param source - A die source returning a valid integer from 1 to 6.
 * @param count - The number of dice to throw.
 * @returns A roll of `count` dice from a source.
 * @example
 * ```ts
 * import { rollFrom, seededDice } from "@johnmorrisdotca/sugoroku";
 *
 * console.log(rollFrom(seededDice(42),2));
 * ```
 */
export function rollFrom(source: DiceSource, count = 2): number[] {
  return Array.from({ length: count }, source);
}

/** An opening throw from a source: one die for white and one for black.
 *
 * @param source - A die source returning a valid integer from 1 to 6.
 * @returns An opening throw from a source: one die for white and one for black.
 * @example
 * ```ts
 * import { openingFrom, seededDice } from "@johnmorrisdotca/sugoroku";
 *
 * console.log(openingFrom(seededDice(42)));
 * ```
 */
export function openingFrom(source: DiceSource): [number, number] {
  const white = source();
  return [white, source()];
}
