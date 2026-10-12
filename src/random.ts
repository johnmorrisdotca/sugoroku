/** A source of random numbers from 0 up to but not including 1.
 *
 * @example
 * ```ts
 * import type { Random } from "@johnmorrisdotca/sugoroku";
 * import { seededRandom } from "@johnmorrisdotca/sugoroku";
 *
 * const value: Random = seededRandom(42);
 * console.log(value);
 * ```
 */
export type Random = () => number;

/** A whole number from a seed given as a number or as text: the same seed is always the same number, in every browser and every Node.
 *
 * @param seed - A reproducible numeric or text seed.
 * @returns A whole number from a seed given as a number or as text: the same seed is always the same number, in every browser and every Node.
 * @example
 * ```ts
 * import { hashSeed } from "@johnmorrisdotca/sugoroku";
 *
 * console.log(hashSeed("sample"));
 * ```
 */
export function hashSeed(seed: number | string): number {
  if (typeof seed === "number") return seed >>> 0;
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** The mulberry32 stream: the same seed makes the same numbers everywhere.
 *
 * @param seed - A reproducible numeric or text seed.
 * @returns The mulberry32 stream: the same seed makes the same numbers everywhere.
 * @example
 * ```ts
 * import { seededRandom } from "@johnmorrisdotca/sugoroku";
 *
 * console.log(seededRandom(42)());
 * ```
 */
export function seededRandom(seed: number | string): Random {
  let state = hashSeed(seed);
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
