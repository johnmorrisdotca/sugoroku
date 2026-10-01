import { seededDice, type DiceSource } from "./dice.ts";
import { agreeDraw, beaverDouble, concede, dropDouble, offerDouble, playTurn, rollDice, rollOpening, takeDouble, type GameResult, type GameState, type WinKind } from "./game.ts";
import { finishGame, newMatch, startGame, type Match } from "./match.ts";
import { formatPlay, parsePlay } from "./notation.ts";
import type { Move } from "./moves.ts";
import { settingsFor, type Rules, type Settings } from "./rules.ts";
import { otherSide, type Side } from "./side.ts";
import { isVariantKey } from "./variants.ts";
import type { Position } from "./board.ts";

/**
 * GAMES AS TEXT. A record is plain lines a server can store and read back, and
 * replay move by move against the rules to be sure every move was legal and
 * every score right. A record names the variant and the rules, then each game
 * of the match in turn:
 *
 *     sugoroku 1
 *     variant backgammon
 *     points 5
 *     cube on
 *     seed 12345
 *     game 1
 *     open 3 1
 *     white 31: 8/5 6/5
 *     black 64: 24/14*
 *     white doubles
 *     black takes
 *     white 52: -
 *     result white bear-off gammon 4
 *
 * A turn is the side, the dice as thrown (two dice, or three for Tabula) and
 * the play in standard notation, `-` for a turn in which nothing could be played.
 * The opening throw is `open`, a die each for white then black, written again
 * for each tie. Doubles, takes, drops and beavers are the words `doubles`,
 * `takes`, `drops` and `beavers`; giving up is `concedes` and what it gives up
 * (`single`, `gammon` or `backgammon`), and a draw by agreement is `draw`.
 * Lines after `#` are comments. `seed` is optional: when it is there, the
 * dice must be exactly the ones that seed makes (`seededDice`), in the order
 * they are asked for. `result` is optional, and when it is there it must be
 * the result the replay arrives at.
 */

/** The record format's version, the number after `sugoroku` on the first line. */
export const RECORD_VERSION = 1;

/** A seed in a record: all digits means a number, anything else is text. */
export type RecordSeed = number | string;

const onOff = (value: boolean): string => (value ? "on" : "off");

/** The header lines of a record: its version, the variant, the rules and the seed. */
export function formatRecordHeader(settings: Settings, seed?: RecordSeed): string[] {
  if (typeof seed === "string" && /^\d+$/.test(seed)) throw new Error("A seed of digits is a number: pass it as a number.");
  const { rules, variant } = settings;
  const lines = [`sugoroku ${RECORD_VERSION}`, `variant ${variant.key}`, `points ${rules.points}`, `cube ${onOff(rules.cube)}`, `crawford ${onOff(rules.crawford)}`, `jacoby ${onOff(rules.jacoby)}`, `beaver ${onOff(rules.beaver)}`, `gammons ${onOff(rules.gammons)}`];
  if (seed !== undefined) lines.push(`seed ${seed}`);
  return lines;
}

/** One line of a game: the opening throw. */
export const formatOpening = (throws: readonly [number, number]): string => `open ${throws[0]} ${throws[1]}`;

/** One line of a game: a turn, with its dice and its play. */
export const formatTurn = (side: Side, dice: readonly number[], moves: readonly Move[]): string => `${side} ${dice.join("")}: ${formatPlay(moves)}`;

/** The line that closes a game, with what it came to. */
export function formatResult(result: GameResult): string {
  return `result ${result.winner ?? "none"} ${result.how} ${result.kind} ${result.points}`;
}

/**
 * A record written as a game is played. Call its methods as the game goes, in
 * the order things happen, and `text()` is the record so far; a game not yet
 * finished is a record that replays to a game still in play.
 */
export class GameRecorder {
  readonly #lines: string[];
  #games = 0;

  constructor(settings: Settings, seed?: RecordSeed) {
    this.#lines = formatRecordHeader(settings, seed);
  }

  /** Begin the next game of the match. */
  startGame(): void {
    this.#games += 1;
    this.#lines.push(`game ${this.#games}`);
  }

  opening(throws: readonly [number, number]): void {
    this.#lines.push(formatOpening(throws));
  }

  turn(side: Side, dice: readonly number[], moves: readonly Move[]): void {
    this.#lines.push(formatTurn(side, dice, moves));
  }

  double(side: Side): void {
    this.#lines.push(`${side} doubles`);
  }

  take(side: Side): void {
    this.#lines.push(`${side} takes`);
  }

  drop(side: Side): void {
    this.#lines.push(`${side} drops`);
  }

  beaver(side: Side): void {
    this.#lines.push(`${side} beavers`);
  }

  concede(side: Side, kind: WinKind): void {
    this.#lines.push(`${side} concedes ${kind}`);
  }

  drawn(): void {
    this.#lines.push("draw");
  }

  result(result: GameResult): void {
    this.#lines.push(formatResult(result));
  }

  /** The record, one line after another. */
  text(): string {
    return `${this.#lines.join("\n")}\n`;
  }
}

/** One game of a replayed record, finished. */
export type ReplayedGame = {
  readonly result: GameResult;
  /** The turns each side took. */
  readonly turns: readonly [number, number];
  /** The position the game ended in. */
  readonly position: Position;
};

export type ReplayOk = {
  readonly ok: true;
  readonly settings: Settings;
  readonly seed: RecordSeed | null;
  /** The match as it stands after every finished game. */
  readonly match: Match;
  /** Every finished game, in order. */
  readonly games: readonly ReplayedGame[];
  /** The game still in play when the record ends, or null if the last was finished. */
  readonly current: GameState | null;
};

export type ReplayError = {
  readonly ok: false;
  /** The line the record went wrong on, counting from 1. */
  readonly line: number;
  readonly reason: string;
};

class RecordError extends Error {}

const fail = (message: string): never => {
  throw new RecordError(message);
};

const flag = (value: string): boolean => (value === "on" ? true : value === "off" ? false : fail(`"${value}" is not on or off`));

function parseSettings(entries: Map<string, string>): Settings {
  const named = entries.get("variant") ?? fail("the record names no variant");
  const variant = isVariantKey(named) ? named : fail(`"${named}" is not a variant`);
  const rules: Partial<Rules> = {};
  const points = entries.get("points");
  if (points !== undefined) {
    if (!/^\d+$/.test(points)) fail(`"${points}" is not a number of points`);
    rules.points = Number(points);
  }
  for (const name of ["cube", "crawford", "jacoby", "beaver", "gammons"] as const) {
    const value = entries.get(name);
    if (value !== undefined) rules[name] = flag(value);
  }
  try {
    return settingsFor(variant, rules);
  } catch (error) {
    return fail((error as Error).message);
  }
}

const SIDE = /^(white|black)\s+(.*)$/;

/**
 * Replay a record against the rules. Every move is checked to be legal when it
 * was made, every double to have been allowed, and each game's result and the
 * match's score are worked out, not read: a `result` line is only checked. Where
 * the record has a seed, the dice are checked to be the seed's. Gives the games
 * and the match, or the first line that goes wrong, and why.
 */
export function replayRecord(text: string): ReplayOk | ReplayError {
  const lines = text.split(/\r?\n/);
  let lineNumber = 0;
  try {
    // The header: lines of `key value` up to the first game.
    const entries = new Map<string, string>();
    let first = true;
    let at = 0;
    for (; at < lines.length; at += 1) {
      lineNumber = at + 1;
      const line = (lines[at] as string).replace(/#.*$/, "").trim();
      if (line === "") continue;
      if (first) {
        if (line !== `sugoroku ${RECORD_VERSION}`) fail(`a record starts with "sugoroku ${RECORD_VERSION}"`);
        first = false;
        continue;
      }
      if (/^game\b/.test(line)) break;
      const match = /^(\w+)\s+(\S+)$/.exec(line);
      if (match === null) fail(`"${line}" is not a setting`);
      entries.set((match as RegExpExecArray)[1] as string, (match as RegExpExecArray)[2] as string);
    }
    if (first) fail("the record is empty");
    lineNumber = at + 1;
    const settings = parseSettings(entries);
    const seedText = entries.get("seed");
    const seed: RecordSeed | null = seedText === undefined ? null : /^\d+$/.test(seedText) ? Number(seedText) : seedText;
    const source: DiceSource | null = seed === null ? null : seededDice(seed);

    let match = newMatch(settings);
    const games: ReplayedGame[] = [];
    let game: GameState | null = null;
    let counted = true;

    /** A game that has just ended is added up once. */
    const settle = (): void => {
      if (game === null || game.phase !== "over" || counted) return;
      counted = true;
      match = finishGame(match, game.result as GameResult);
      games.push({ result: game.result as GameResult, turns: game.turns, position: game.position });
    };

    const nextDice = (count: number): number[] => {
      const dice: number[] = [];
      if (source !== null) for (let i = 0; i < count; i += 1) dice.push(source());
      return dice;
    };

    for (; at < lines.length; at += 1) {
      lineNumber = at + 1;
      const line = (lines[at] as string).replace(/#.*$/, "").trim();
      if (line === "") continue;
      const starts = /^game\s+(\d+)$/.exec(line);
      if (starts !== null) {
        if (game !== null && game.phase !== "over") fail(`game ${games.length + 1} was not finished`);
        settle();
        if (Number(starts[1]) !== games.length + 1) fail(`this should be game ${games.length + 1}`);
        if (match.over) fail("the match was already over");
        game = startGame(match);
        counted = false;
        continue;
      }
      if (game === null) fail("a game begins with a game line");
      const current = game as GameState;
      const result = /^result\s+(white|black|none)\s+(\S+)\s+(\S+)\s+(\d+)$/.exec(line);
      if (result !== null) {
        if (current.phase !== "over") fail("the game is not over yet");
        const got = current.result as GameResult;
        const said = `${result[1]} ${result[2]} ${result[3]} ${result[4]}`;
        const was = `${got.winner ?? "none"} ${got.how} ${got.kind} ${got.points}`;
        if (said !== was) fail(`the result says "${said}" but the game came to "${was}"`);
        continue;
      }
      if (current.phase === "over") fail("the game is over");
      const opening = /^open\s+(\d)\s+(\d)$/.exec(line);
      if (opening !== null) {
        const throws: [number, number] = [Number(opening[1]), Number(opening[2])];
        if (source !== null && nextDice(2).join("") !== throws.join("")) fail("the opening throw is not the seed's");
        game = rollOpening(current, throws);
        continue;
      }
      if (line === "draw") {
        game = agreeDraw(current);
        settle();
        continue;
      }
      const sided = SIDE.exec(line);
      if (sided === null) fail(`"${line}" is not something a game says`);
      const side = (sided as RegExpExecArray)[1] as Side;
      const rest = (sided as RegExpExecArray)[2] as string;
      const answering = current.phase === "double-offered" || current.phase === "beaver-offered";
      if (rest === "doubles") {
        if (current.turn !== side) fail(`it is ${current.turn ?? "nobody"}'s turn, not ${side}'s`);
        game = offerDouble(current);
      } else if (rest === "takes" || rest === "drops" || rest === "beavers") {
        if (!answering || otherSide(current.offeredBy as Side) !== side) fail(`${side} has no double to answer`);
        game = rest === "takes" ? takeDouble(current) : rest === "drops" ? dropDouble(current) : beaverDouble(current);
      } else if (/^concedes\s+(single|gammon|backgammon)$/.test(rest)) {
        game = concede(current, side, rest.split(" ")[1] as WinKind);
      } else {
        const turn = /^(\d{2,3}):\s*(.*)$/.exec(rest);
        if (turn === null) fail(`"${line}" is not something a game says`);
        const dice = [...(turn as RegExpExecArray)[1] as string].map(Number);
        const play = (turn as RegExpExecArray)[2] as string;
        if (answering) fail("a double is waiting to be answered");
        if (current.turn !== side) fail(`it is ${current.turn ?? "nobody"}'s turn, not ${side}'s`);
        let rolled = current;
        if (current.phase === "before-roll") {
          if (dice.length !== settings.variant.dice) fail(`a roll is ${settings.variant.dice} dice`);
          if (source !== null && nextDice(dice.length).join("") !== dice.join("")) fail("these dice are not the seed's");
          rolled = rollDice(current, dice);
        } else if ([...(current.dice ?? [])].sort().join("") !== [...dice].sort().join("")) {
          fail("the first turn plays the opening throw");
        }
        const moves = parsePlay(settings.variant, rolled.turnStart, side, rolled.dice as number[], play);
        if (moves === null) fail(`"${play}" is not a legal play of ${dice.join("")}`);
        game = playTurn(rolled, moves as Move[]);
      }
      settle();
    }
    settle();
    const last = game as GameState | null;
    return { ok: true, settings, seed, match, games, current: last !== null && last.phase !== "over" ? last : null };
  } catch (error) {
    return { ok: false, line: lineNumber, reason: (error as Error).message };
  }
}
