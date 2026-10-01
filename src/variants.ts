/**
 * THE VARIANTS, AS ROWS OF SETTINGS. Nothing in the engine branches on a
 * variant's name: it reads the row. A new game on the same board is a new row.
 */
export type VariantKey = "backgammon" | "backgammon-race" | "anti-backgammon" | "nackgammon" | "long-gammon" | "hypergammon" | "tabula";

/** How the sides' tracks lie on the board. */
export type Direction =
  /** Opposite ways round, as in backgammon: one side's 24-point is the other's 1-point. */
  | "opposed"
  /** The same way round, from the same start, as in Tabula: both sides' own point 24 is the one place. */
  | "same";

/** How a game is opened. */
export type Opening =
  /** Each side throws one die; the higher plays both dice as the first roll of the game, as in backgammon. */
  | "roll-off"
  /** Each side throws one die; the higher goes first and then rolls a roll of their own. */
  | "die-each";

/** What it takes to win. */
export type Goal =
  /** Bear off every checker first. */
  | "first-off"
  /** Be last to bear off: whoever bears off every checker first loses (Anti-Backgammon). */
  | "last-off";

export type VariantSpec = {
  readonly key: VariantKey;
  /** Checkers each side has. */
  readonly checkers: number;
  /** Where the checkers are at the start, as `[own point, how many]`. Empty for a start with every checker off the board. */
  readonly layout: readonly (readonly [number, number])[];
  /** How many dice a roll is: two, or three for Tabula. */
  readonly dice: 2 | 3;
  /** Whether doubles are played four times (`four`) or are an ordinary roll (`none`). */
  readonly doubles: "four" | "none";
  readonly direction: Direction;
  readonly opening: Opening;
  readonly goal: Goal;
  /**
   * While any checker is still to enter the board, no checker may land on
   * this own point or any below it. 0 for no such rule. Tabula holds every
   * checker in the first half until all fifteen are in.
   */
  readonly holdBelow: number;
  /** A game that reaches this many turns for each side is a draw. 0 for no limit. */
  readonly drawAfter: number;
};

/** Own points: 24 is where a side's back checkers start, 6 the farthest point of its home board. */
const STANDARD_LAYOUT: VariantSpec["layout"] = [
  [24, 2],
  [13, 5],
  [8, 3],
  [6, 5],
];

const BASE = {
  checkers: 15,
  dice: 2,
  doubles: "four",
  direction: "opposed",
  opening: "roll-off",
  goal: "first-off",
  holdBelow: 0,
  drawAfter: 0,
} as const;

/**
 * Every variant. Where each comes from, and where the sources disagree or say
 * nothing, is in `docs/VARIANTS.md`.
 */
export const VARIANTS: Readonly<Record<VariantKey, VariantSpec>> = {
  /** The classic game. */
  backgammon: { ...BASE, key: "backgammon", layout: STANDARD_LAYOUT },
  /** All fifteen checkers start off the board, on the bar, and are entered with the dice. */
  "backgammon-race": { ...BASE, key: "backgammon-race", layout: [] },
  /** The same board, played to lose: whoever bears off every checker first loses. A game of 500 turns each is a draw. */
  "anti-backgammon": { ...BASE, key: "anti-backgammon", layout: STANDARD_LAYOUT, goal: "last-off", drawAfter: 500 },
  /** Four back checkers each instead of two: one is taken from the 6-point and one from the mid-point to the 23-point. */
  nackgammon: {
    ...BASE,
    key: "nackgammon",
    layout: [
      [24, 2],
      [23, 2],
      [13, 4],
      [8, 3],
      [6, 4],
    ],
  },
  /** All fifteen checkers start on the 24-point. */
  "long-gammon": { ...BASE, key: "long-gammon", layout: [[24, 15]] },
  /** Three checkers each, on the 24, 23 and 22 points. */
  hypergammon: {
    ...BASE,
    key: "hypergammon",
    checkers: 3,
    layout: [
      [24, 1],
      [23, 1],
      [22, 1],
    ],
  },
  /** The Roman game: three dice, no doubles, both sides entering the same way round the same track. */
  tabula: { ...BASE, key: "tabula", layout: [], dice: 3, doubles: "none", direction: "same", opening: "die-each", holdBelow: 12 },
};

/** The variants' keys, in the order the demo lists them. */
export const VARIANT_KEYS: readonly VariantKey[] = ["backgammon", "backgammon-race", "anti-backgammon", "nackgammon", "long-gammon", "hypergammon", "tabula"];

/** Whether `key` names a variant. */
export function isVariantKey(key: unknown): key is VariantKey {
  return typeof key === "string" && (VARIANT_KEYS as readonly string[]).includes(key);
}

/** The row for a variant. */
export function variantSpec(key: VariantKey): VariantSpec {
  return VARIANTS[key];
}

/** Which points a side's checkers start on, as an array indexed by own point 1 to 24 (index 0 is point 1). */
export function startCounts(spec: VariantSpec): number[] {
  const counts = new Array<number>(24).fill(0);
  for (const [point, count] of spec.layout) counts[point - 1] = count;
  return counts;
}

/** How many checkers each side begins off the board, to be entered with the dice. */
export function startReserve(spec: VariantSpec): number {
  return spec.checkers - spec.layout.reduce((sum, [, count]) => sum + count, 0);
}
