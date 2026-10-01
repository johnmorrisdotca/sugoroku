import { isVariantKey, variantSpec, type VariantKey, type VariantSpec } from "./variants.ts";

/**
 * HOW A GAME IS SCORED AND STAKED, beside the variant's board. A variant says
 * where the checkers stand and how they move; these say what a win is worth.
 */
export type Rules = {
  /**
   * The match length in points. 1 is a single game. 0 is money play: games
   * go on one after another, each scored alone, and nothing ends the session.
   */
  points: number;
  /** Whether the doubling cube is played. Never in a one-point game, which is its own Crawford game. */
  cube: boolean;
  /** The Crawford rule: the game after a side first comes within a point of winning the match is played without the cube. */
  crawford: boolean;
  /** The Jacoby rule, for money play: gammons and backgammons count as single wins unless the cube has been turned. */
  jacoby: boolean;
  /** Whether a player who is doubled may immediately redouble and keep the cube. Money play only. Off by default. */
  beaver: boolean;
  /** Whether a gammon is worth two points and a backgammon three, instead of one. */
  gammons: boolean;
};

/** The rules a variant is played with when nothing else is asked: a single game with no cube and no gammons. */
export const DEFAULT_RULES: Rules = { points: 1, cube: false, crawford: true, jacoby: false, beaver: false, gammons: false };

/** What goes wrong with a set of rules, as sentences; empty when they are fine. */
export function rulesProblems(rules: Rules, variant?: VariantSpec): string[] {
  const problems: string[] = [];
  if (!Number.isInteger(rules.points) || rules.points < 0) problems.push("points must be 0 (money play) or a whole number of points");
  if (rules.jacoby && rules.points !== 0) problems.push("the Jacoby rule is for money play (points: 0)");
  if (rules.beaver && rules.points !== 0) problems.push("a beaver is for money play (points: 0)");
  if ((rules.jacoby || rules.beaver) && !rules.cube) problems.push("the Jacoby rule and beavers need the cube");
  if (rules.jacoby && !rules.gammons) problems.push("the Jacoby rule is about gammons, which are off");
  if (variant !== undefined && variant.goal === "last-off" && (rules.cube || rules.gammons)) problems.push("a game played to lose has no cube and no gammons");
  return problems;
}

/** The rules with anything left out filled from `DEFAULT_RULES`. Throws if the result is not a set of rules that can be played. */
export function resolveRules(rules: Partial<Rules> = {}, variant?: VariantSpec): Rules {
  const resolved = { ...DEFAULT_RULES, ...rules };
  const problems = rulesProblems(resolved, variant);
  if (problems.length > 0) throw new Error(`These rules cannot be played: ${problems.join("; ")}.`);
  return resolved;
}

/** Whether the cube is in play in a game of a match, given whether this is the Crawford game. */
export function cubeInPlay(rules: Rules, crawfordGame: boolean): boolean {
  return rules.cube && rules.points !== 1 && !crawfordGame;
}

/** The most the cube can show. */
export const CUBE_LIMIT = 64;

/**
 * A NAMED WAY OF PLAYING: a variant with its rules. The names on the sites
 * these games were played on (ItsYourTurn.com and GoldToken.com) each lead to
 * one of these through `presetByName`, and `docs/VARIANTS.md` says how each
 * was read.
 */
export type Preset = {
  /** In kebab case. */
  key: string;
  variant: VariantKey;
  rules: Rules;
  /** The names this goes by, as the sites print them. */
  names: readonly string[];
};

const MATCH = (points: number): Rules => ({ points, cube: true, crawford: true, jacoby: false, beaver: false, gammons: true });
const SINGLE: Rules = DEFAULT_RULES;

/** Every named way of playing, in the order of `docs/VARIANTS.md`. */
export const PRESETS: readonly Preset[] = [
  { key: "backgammon", variant: "backgammon", rules: SINGLE, names: ["Backgammon", "Backgammon Level 2", "Backgammon Level 3", "Casual Backgammon"] },
  { key: "backgammon-3", variant: "backgammon", rules: MATCH(3), names: ["Backgammon (3 Point)"] },
  { key: "backgammon-5", variant: "backgammon", rules: MATCH(5), names: ["Backgammon (5 Point)", "Pro Backgammon", "Pro Backgammon Level 2"] },
  { key: "backgammon-7", variant: "backgammon", rules: MATCH(7), names: ["Backgammon (7 Point)"] },
  { key: "backgammon-9", variant: "backgammon", rules: MATCH(9), names: ["Backgammon (9 Point)", "Pro Backgammon-9"] },
  { key: "backgammon-race", variant: "backgammon-race", rules: SINGLE, names: ["Backgammon Race", "Backgammon Race Level 2"] },
  { key: "backgammon-race-5", variant: "backgammon-race", rules: MATCH(5), names: ["Pro Backgammon Race"] },
  { key: "anti-backgammon", variant: "anti-backgammon", rules: SINGLE, names: ["Anti-Backgammon"] },
  { key: "nackgammon", variant: "nackgammon", rules: SINGLE, names: ["Nackgammon"] },
  { key: "nackgammon-3", variant: "nackgammon", rules: MATCH(3), names: ["Nackgammon (3 Point)"] },
  { key: "nackgammon-5", variant: "nackgammon", rules: MATCH(5), names: ["Nackgammon (5 Point)", "Pro Nackgammon"] },
  { key: "nackgammon-7", variant: "nackgammon", rules: MATCH(7), names: ["Nackgammon (7 Point)"] },
  { key: "nackgammon-9", variant: "nackgammon", rules: MATCH(9), names: ["Nackgammon (9 Point)"] },
  { key: "long-gammon", variant: "long-gammon", rules: SINGLE, names: ["Long Gammon"] },
  { key: "long-gammon-3", variant: "long-gammon", rules: MATCH(3), names: ["Long Gammon (3 Point)"] },
  { key: "long-gammon-5", variant: "long-gammon", rules: MATCH(5), names: ["Long Gammon (5 Point)"] },
  { key: "long-gammon-7", variant: "long-gammon", rules: MATCH(7), names: ["Long Gammon (7 Point)"] },
  { key: "long-gammon-9", variant: "long-gammon", rules: MATCH(9), names: ["Long Gammon (9 Point)"] },
  { key: "hypergammon", variant: "hypergammon", rules: SINGLE, names: ["Hypergammon"] },
  { key: "hypergammon-3", variant: "hypergammon", rules: MATCH(3), names: ["Hypergammon (3 Point)"] },
  { key: "hypergammon-5", variant: "hypergammon", rules: MATCH(5), names: ["Hypergammon (5 Point)"] },
  { key: "tabula", variant: "tabula", rules: SINGLE, names: ["Tabula"] },
];

/** The preset a site's printed name leads to, or undefined. Case and spacing around the name do not matter. */
export function presetByName(name: string): Preset | undefined {
  const wanted = name.trim().toLowerCase();
  return PRESETS.find((preset) => preset.names.some((one) => one.toLowerCase() === wanted));
}

/** The preset with this key, or undefined. */
export function presetByKey(key: string): Preset | undefined {
  return PRESETS.find((preset) => preset.key === key);
}

/** The settings of a game: the variant's row and the rules. What every game and match is made from. */
export type Settings = {
  variant: VariantSpec;
  rules: Rules;
};

/** Settings from a variant key (or a row) and rules, left-out rules filled in. */
export function settingsFor(variant: VariantKey | VariantSpec, rules: Partial<Rules> = {}): Settings {
  if (typeof variant === "string" && !isVariantKey(variant)) throw new Error(`${variant} is not a variant`);
  const spec = typeof variant === "string" ? variantSpec(variant) : variant;
  return { variant: spec, rules: resolveRules(rules, spec) };
}
