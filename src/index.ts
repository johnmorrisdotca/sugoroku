/** Pure backgammon and variant rules, legal turns, cube and match scoring, dice, records and computer choices. */

export * from "./board.ts";
export * from "./computer.ts";
export * from "./dice.ts";
export type { EvaluationWeights } from "./evaluate.ts";
export { EVALUATION_WEIGHTS, evaluate, evaluateFor, keithCount, winChance } from "./evaluate.ts";
export * from "./game.ts";
export * from "./match.ts";
export * from "./moves.ts";
export * from "./notation.ts";
export * from "./plays.ts";
export * from "./positionId.ts";
export type { Random } from "./random.ts";
export { hashSeed, seededRandom } from "./random.ts";
export * from "./record.ts";
export * from "./rules.ts";
export * from "./side.ts";
export * from "./variants.ts";
export { VERSION } from "./version.ts";
