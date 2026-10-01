import { POINTS, type Position } from "./board.ts";
import { otherSide, sideIndex, type Side } from "./side.ts";

/**
 * POSITION IDS, in the 14-character form the GNU Backgammon manual publishes
 * for the standard board (its starting position is `4HPwATDgc/ABMA`), so a
 * position can be written down and typed or pasted into other programs that
 * read it. Only the format, as the manual describes it, is used: nothing of
 * that program's code.
 *
 * An ID is the position seen by the side to move: first the checkers of the
 * side that is not to move, then those of the side that is. Each side's board
 * is its 24 points in its own numbering, own point 1 first, and then its bar;
 * each point is a 1 for every checker on it and then a 0, and the whole is
 * padded with 0s to 80 bits, packed into ten bytes with the first bit the
 * lowest of the first byte, and written in Base64 without its padding.
 *
 * It holds only checkers on points and on the bar, so it cannot say where a
 * race that has not yet entered its checkers stands, nor anything of the
 * variants whose sides share one track: those give null.
 */

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/** The ID of a position with `onRoll` to move, or null if it cannot be written in this form. */
export function positionId(position: Position, onRoll: Side): string | null {
  if (position.reserve[0] > 0 || position.reserve[1] > 0) return null;
  const bits: number[] = [];
  for (const side of [otherSide(onRoll), onRoll]) {
    const i = sideIndex(side);
    const counts = [...position.points[i], position.bar[i]];
    for (const count of counts) {
      if (count > 15) return null;
      for (let k = 0; k < count; k += 1) bits.push(1);
      bits.push(0);
    }
  }
  if (bits.length > 80) return null;
  while (bits.length < 80) bits.push(0);
  const bytes: number[] = [];
  for (let b = 0; b < 10; b += 1) {
    let value = 0;
    for (let j = 0; j < 8; j += 1) value |= (bits[b * 8 + j] as number) << j;
    bytes.push(value);
  }
  let text = "";
  for (let g = 0; g < 10; g += 3) {
    const [x, y, z] = [bytes[g] as number, bytes[g + 1] ?? 0, bytes[g + 2] ?? 0];
    const group = (x << 16) | (y << 8) | z;
    text += ALPHABET[(group >> 18) & 63] as string;
    text += ALPHABET[(group >> 12) & 63] as string;
    if (g + 1 < 10) text += ALPHABET[(group >> 6) & 63] as string;
    if (g + 2 < 10) text += ALPHABET[group & 63] as string;
  }
  return text;
}

/**
 * The position an ID stands for, with `onRoll` to move, or null if the text is
 * not an ID. The ID does not say how many checkers each side began with: pass
 * the variant's (15 for the standard board), and what is not on the board is
 * counted as borne off.
 */
export function positionFromId(id: string, onRoll: Side, checkers = 15): Position | null {
  if (!/^[A-Za-z0-9+/]{14}$/.test(id)) return null;
  const sextets = [...id].map((char) => ALPHABET.indexOf(char));
  const bytes: number[] = [];
  for (let g = 0; g < 14; g += 4) {
    const group = ((sextets[g] as number) << 18) | ((sextets[g + 1] as number) << 12) | ((sextets[g + 2] ?? 0) << 6) | (sextets[g + 3] ?? 0);
    bytes.push((group >> 16) & 255);
    if (g + 2 < 14) bytes.push((group >> 8) & 255);
    if (g + 3 < 14) bytes.push(group & 255);
  }
  const bits: number[] = [];
  for (const byte of bytes.slice(0, 10)) for (let j = 0; j < 8; j += 1) bits.push((byte >> j) & 1);
  let cursor = 0;
  const boards: { points: number[]; bar: number }[] = [];
  for (let s = 0; s < 2; s += 1) {
    const counts: number[] = [];
    for (let p = 0; p < POINTS + 1; p += 1) {
      let n = 0;
      while (cursor < bits.length && bits[cursor] === 1) {
        n += 1;
        cursor += 1;
      }
      if (cursor >= bits.length) return null;
      cursor += 1;
      counts.push(n);
    }
    boards.push({ points: counts.slice(0, POINTS), bar: counts[POINTS] as number });
  }
  const [opponent, mover] = boards as [(typeof boards)[0], (typeof boards)[0]];
  const total = (board: (typeof boards)[0]): number => board.points.reduce((a, b) => a + b, 0) + board.bar;
  if (total(opponent) > checkers || total(mover) > checkers) return null;
  const white = onRoll === "white" ? mover : opponent;
  const black = onRoll === "white" ? opponent : mover;
  return {
    points: [white.points, black.points],
    bar: [white.bar, black.bar],
    reserve: [0, 0],
    off: [checkers - total(white), checkers - total(black)],
  };
}
