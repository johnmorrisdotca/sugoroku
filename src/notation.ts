import { BAR, POINTS, type Position } from "./board.ts";
import type { Move } from "./moves.ts";
import { diceMustPlay, diceToPlay, nextMoves } from "./plays.ts";
import { applyMove } from "./moves.ts";
import { sideIndex, type Side } from "./side.ts";
import type { VariantSpec } from "./variants.ts";

/**
 * MOVES AS TEXT, the way backgammon writes them: each checker as the point it
 * leaves and the point it lands on, in the mover's own numbering, so `24/18
 * 13/11`. The bar is `bar` and borne off is `off`; a hit has a star after the
 * point; a checker that moves on with the second die writes both moves as one
 * chain of points; and two checkers making the same move are `13/11(2)`.
 */

const point = (n: number): string => (n === BAR ? "bar" : n === 0 ? "off" : String(n));

/** One move as text: `24/18`, `bar/22*`, `6/off`. */
export function formatMove(move: Move): string {
  return `${point(move.from)}/${point(move.to)}${move.hit ? "*" : ""}`;
}

/** The text of a whole turn: moves of one checker joined, equal moves counted, the farthest-back checker first. A turn of no moves is `-`. */
export function formatPlay(moves: readonly Move[]): string {
  if (moves.length === 0) return "-";
  // Paths of one checker: each move goes on the end of a path that stops where it starts, or begins a path.
  const paths: Move[][] = [];
  for (const move of moves) {
    const open = paths.find((path) => (path[path.length - 1] as Move).to === move.from && move.from !== BAR && move.from !== 0);
    if (open !== undefined) open.push(move);
    else paths.push([move]);
  }
  const texts = paths.map((path) => {
    const first = path[0] as Move;
    const steps = path.map((move) => `${point(move.to)}${move.hit ? "*" : ""}`);
    return { start: first.from, end: (path[path.length - 1] as Move).to, text: `${point(first.from)}/${steps.join("/")}` };
  });
  texts.sort((a, b) => b.start - a.start || a.end - b.end || (a.text < b.text ? -1 : a.text > b.text ? 1 : 0));
  const counted: string[] = [];
  for (let i = 0; i < texts.length; ) {
    let n = 1;
    while (i + n < texts.length && (texts[i + n] as { text: string }).text === (texts[i] as { text: string }).text) n += 1;
    counted.push(n > 1 ? `${(texts[i] as { text: string }).text}(${n})` : (texts[i] as { text: string }).text);
    i += n;
  }
  return counted.join(" ");
}

/** A step of a written play: one checker, one die's distance (or off), as written. */
export type Hop = { readonly from: number; readonly to: number };

/**
 * The hops a written play names, in the order written: a chain of three points
 * is two hops, and `13/11(2)` is two. Returns null for text that is not a play. `-`, `pass`,
 * and the empty text are the play of no moves.
 */
export function parseHops(text: string): Hop[] | null {
  const trimmed = text.trim().toLowerCase();
  if (trimmed === "" || trimmed === "-" || trimmed === "pass" || trimmed === "no move") return [];
  const hops: Hop[] = [];
  for (const token of trimmed.split(/[\s,]+/)) {
    const match = /^([a-z0-9/*]+?)(?:\((\d)\))?$/.exec(token);
    if (match === null) return null;
    const times = match[2] === undefined ? 1 : Number(match[2]);
    const stops = (match[1] as string).replace(/\*/g, "").split("/");
    if (stops.length < 2) return null;
    const numbers: number[] = [];
    for (const stop of stops) {
      const n = stop === "bar" ? BAR : stop === "off" ? 0 : /^\d{1,2}$/.test(stop) ? Number(stop) : NaN;
      if (Number.isNaN(n) || n > BAR || (n > POINTS && n !== BAR)) return null;
      numbers.push(n);
    }
    for (let k = 0; k < times; k += 1) for (let i = 0; i + 1 < numbers.length; i += 1) hops.push({ from: numbers[i] as number, to: numbers[i + 1] as number });
  }
  return hops;
}

/**
 * The moves a written play makes with a roll, or null if it is not a legal
 * play of that roll. Checks every rule: it is found by making each named move
 * in some order, each one legal when it is made, until the roll is played as
 * the rules require. A checker that plays both dice may be written as one move,
 * `24/14` for a 6 and a 4, as well as through the point it passes.
 */
export function parsePlay(spec: VariantSpec, position: Position, side: Side, roll: readonly number[], text: string): Move[] | null {
  const hops = parseHops(text);
  if (hops === null) return null;
  const need = diceMustPlay(spec, position, side, diceToPlay(spec, roll));
  const go = (at: Position, left: readonly number[], rest: readonly Hop[], made: readonly Move[]): Move[] | null => {
    // A play may end with dice unplayed only where the last checker has just been borne off, which ends the game.
    if (rest.length === 0) return left.length === 0 || at.off[sideIndex(side)] === spec.checkers ? [...made] : null;
    const legal = nextMoves(spec, at, side, left);
    const tried = new Set<string>();
    for (let i = 0; i < rest.length; i += 1) {
      const hop = rest[i] as Hop;
      const key = `${hop.from}/${hop.to}`;
      if (tried.has(key)) continue;
      tried.add(key);
      // The move that is the whole hop, or (for `24/14`, a checker that played both dice) a first leg of it with the rest still to come.
      const choices = legal
        .filter((move) => move.from === hop.from && (move.to === hop.to || (move.to > hop.to && move.to >= 1)))
        .sort((a, b) => a.die - b.die);
      for (const move of choices) {
        const nextLeft = [...left];
        nextLeft.splice(nextLeft.indexOf(move.die), 1);
        const remaining = rest.filter((_, k) => k !== i);
        const next = move.to === hop.to ? remaining : [{ from: move.to, to: hop.to }, ...remaining];
        const found = go(applyMove(spec, at, side, move), nextLeft, next, [...made, move]);
        if (found !== null) return found;
      }
    }
    return null;
  };
  return go(position, need, hops, []);
}

const formatCounts = (counts: readonly number[]): string => {
  const parts: string[] = [];
  for (let n = POINTS; n >= 1; n -= 1) if ((counts[n - 1] ?? 0) > 0) parts.push(`${n}:${counts[n - 1]}`);
  return parts.join(",");
};

/**
 * A position as text, for any variant: each side's checkers as `point:count`
 * in that side's own numbering, highest point first, then the bar, those yet to
 * enter and those borne off, `[white, black]` each.
 *
 *     white=24:2,13:5,8:3,6:5 black=24:2,13:5,8:3,6:5 bar=0,0 reserve=0,0 off=0,0
 */
export function formatPosition(position: Position): string {
  return `white=${formatCounts(position.points[0])} black=${formatCounts(position.points[1])} bar=${position.bar.join(",")} reserve=${position.reserve.join(",")} off=${position.off.join(",")}`;
}

/** The position that text of `formatPosition`'s kind stands for, or null if it is not one. `bar`, `reserve` and `off` may be left out. */
export function parsePosition(text: string): Position | null {
  const fields = new Map<string, string>();
  for (const token of text.trim().split(/\s+/)) {
    const match = /^(white|black|bar|reserve|off)=(.*)$/.exec(token);
    if (match === null) return null;
    fields.set(match[1] as string, match[2] as string);
  }
  if (!fields.has("white") || !fields.has("black")) return null;
  const counts = (field: string): number[] | null => {
    const result = new Array<number>(POINTS).fill(0);
    const body = fields.get(field) as string;
    if (body === "") return result;
    for (const part of body.split(",")) {
      const match = /^(\d{1,2}):(\d{1,2})$/.exec(part);
      if (match === null) return null;
      const n = Number(match[1]);
      if (n < 1 || n > POINTS) return null;
      result[n - 1] = Number(match[2]);
    }
    return result;
  };
  const pair = (field: string): [number, number] | null => {
    const body = fields.get(field);
    if (body === undefined) return [0, 0];
    const match = /^(\d{1,2}),(\d{1,2})$/.exec(body);
    return match === null ? null : [Number(match[1]), Number(match[2])];
  };
  const white = counts("white");
  const black = counts("black");
  const bar = pair("bar");
  const reserve = pair("reserve");
  const off = pair("off");
  if (white === null || black === null || bar === null || reserve === null || off === null) return null;
  return { points: [white, black], bar, reserve, off };
}
