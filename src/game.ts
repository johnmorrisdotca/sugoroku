import { mirrorPoint, POINTS, startPosition, type Position } from "./board.ts";
import { applyMove, type Move } from "./moves.ts";
import { diceMustPlay, diceToPlay, legalPlays, nextMoves, playMoves, type Play } from "./plays.ts";
import { CUBE_LIMIT, cubeInPlay, type Settings } from "./rules.ts";
import { otherSide, sideIndex, type Side } from "./side.ts";

/** Where a game has got to. */
export type Phase =
  /** Nobody has the move yet: the sides are throwing a die each to see who starts. */
  | "opening"
  /** The side on turn may double, or must roll. */
  | "before-roll"
  /** The side on turn has offered a double, and the other must take it or drop it. */
  | "double-offered"
  /** The side that was doubled has beavered (redoubled, keeping the cube) and the side on turn must take it or drop it. */
  | "beaver-offered"
  /** The side on turn has rolled and is making its moves. */
  | "playing"
  /** The game is decided: see `result`. */
  | "over";

/** The doubling cube: what it shows, and who may turn it (null while it stands in the middle, for either). */
export type Cube = { readonly value: number; readonly owner: Side | null };

/** How a game came to its end. */
export type HowItEnded =
  /** Somebody bore off every checker. */
  | "bear-off"
  /** A double was dropped. */
  | "drop"
  /** A side gave up the game. */
  | "concede"
  /** Neither side won. */
  | "draw";

/** What kind of win it was, which is how many times the cube's value it scores. */
export type WinKind = "single" | "gammon" | "backgammon";

export type GameResult = {
  /** The side that won, or null for a draw. */
  readonly winner: Side | null;
  readonly how: HowItEnded;
  readonly kind: WinKind;
  /** 1 for a single win, 2 for a gammon, 3 for a backgammon, after the Jacoby rule and the choice of rules. */
  readonly multiplier: number;
  /** The cube's value when it ended. */
  readonly cube: number;
  /** What the winner scores: the multiplier times the cube. 0 for a draw. */
  readonly points: number;
};

export type GameState = {
  readonly settings: Settings;
  /** Whether this is the Crawford game of a match: no cube. */
  readonly crawford: boolean;
  /** The match score as the game began, `[white, black]`: what the dead cube is judged by. */
  readonly score: readonly [number, number];
  readonly position: Position;
  /** The side to move; null until the opening throw has decided. */
  readonly turn: Side | null;
  readonly phase: Phase;
  /** The roll being played, as thrown. */
  readonly dice: readonly number[] | null;
  /** The dice this turn must still play, highest first. Empty when the turn has been played, or when nothing can be. */
  readonly need: readonly number[];
  /** The dice this turn had to play to begin with, highest first. */
  readonly plan: readonly number[];
  /** The moves made so far this turn, in order. */
  readonly moves: readonly Move[];
  /** The position the turn began from: the moves are made from it. */
  readonly turnStart: Position;
  readonly cube: Cube;
  /** Who offered the double that is waiting to be answered, when `phase` is `double-offered` or `beaver-offered`. */
  readonly offeredBy: Side | null;
  /** The turns each side has taken. */
  readonly turns: readonly [number, number];
  /** The last throw of a die each at the start: `[white, black]`. A tie means the sides throw again. */
  readonly opening: readonly [number, number] | null;
  readonly result: GameResult | null;
};

/** Options for a new game. */
export type NewGameOptions = {
  /** Whether it is the Crawford game of a match: played without the cube. */
  crawford?: boolean;
  /** The score of the match so far, `[white, black]`. Default 0 to 0. */
  score?: readonly [number, number];
};

/** A new game, waiting for the opening throw. */
export function newGame(settings: Settings, options: NewGameOptions = {}): GameState {
  const position = startPosition(settings.variant);
  return {
    settings,
    crawford: options.crawford === true,
    score: options.score ?? [0, 0],
    position,
    turn: null,
    phase: "opening",
    dice: null,
    need: [],
    plan: [],
    moves: [],
    turnStart: position,
    cube: { value: 1, owner: null },
    offeredBy: null,
    turns: [0, 0],
    opening: null,
    result: null,
  };
}

function fail(message: string): never {
  throw new Error(message);
}

function validDie(die: unknown): die is number {
  return typeof die === "number" && Number.isInteger(die) && die >= 1 && die <= 6;
}

/** The side on turn, or an error if nobody is. */
function onTurn(game: GameState): Side {
  return game.turn ?? fail("Nobody is to move yet: the opening throw comes first.");
}

/** Start a turn of playing a roll: the dice a side must play, and none made yet. */
function startPlaying(game: GameState, side: Side, dice: readonly number[]): GameState {
  const plan = diceMustPlay(game.settings.variant, game.position, side, diceToPlay(game.settings.variant, dice));
  return { ...game, turn: side, phase: "playing", dice, plan, need: plan, moves: [], turnStart: game.position };
}

/**
 * The opening throw: one die for white and one for black. The higher starts.
 * A tie changes nothing but `opening`, and the sides throw again. In a game
 * opened with a roll-off the starter plays the two dice as the first roll;
 * otherwise the starter then rolls as usual.
 */
export function rollOpening(game: GameState, throws: readonly [number, number]): GameState {
  if (game.phase !== "opening") fail("The opening throw has been made.");
  const [white, black] = throws;
  if (!validDie(white) || !validDie(black)) fail("A die shows 1 to 6.");
  const opening: [number, number] = [white, black];
  if (white === black) return { ...game, opening };
  const starter: Side = white > black ? "white" : "black";
  if (game.settings.variant.opening === "roll-off") return startPlaying({ ...game, opening }, starter, [white, black]);
  return { ...game, opening, turn: starter, phase: "before-roll" };
}

/** Roll the dice for the side on turn, which must not be waiting on an answer to a double. */
export function rollDice(game: GameState, dice: readonly number[]): GameState {
  const side = onTurn(game);
  if (game.phase !== "before-roll") fail("Dice are rolled at the start of a turn.");
  if (dice.length !== game.settings.variant.dice || !dice.every(validDie)) fail(`A roll is ${game.settings.variant.dice} dice, each 1 to 6.`);
  return startPlaying(game, side, dice);
}

/** The moves the side on turn may make next. Empty when the turn is played out, or nothing can be played. */
export function legalMoves(game: GameState): Move[] {
  if (game.phase !== "playing" || game.turn === null) return [];
  return nextMoves(game.settings.variant, game.position, game.turn, game.need);
}

/** Every different way the side on turn may play out the rest of its turn: for the dice it has yet to play, from where the position stands now. */
export function legalPlaysOf(game: GameState): Play[] {
  if (game.phase !== "playing" || game.turn === null) return [];
  return legalPlays(game.settings.variant, game.position, game.turn, game.need);
}

/** Whether the turn is played out and the side on turn has only to end it. */
export function turnIsPlayed(game: GameState): boolean {
  return game.phase === "playing" && game.need.length === 0;
}

/**
 * Make one move for the side on turn, given as the checker's own point it
 * leaves and the one it goes to. The move must be one of `legalMoves`. Where
 * a checker could be borne off by either of two dice, the smaller is used.
 */
export function playMove(game: GameState, step: { from: number; to: number }): GameState {
  const side = onTurn(game);
  if (game.phase !== "playing") fail("There is no roll to play.");
  const choices = legalMoves(game).filter((move) => move.from === step.from && move.to === step.to);
  const move = choices.sort((a, b) => a.die - b.die)[0] ?? fail(`${step.from} to ${step.to} is not a legal move.`);
  const position = applyMove(game.settings.variant, game.position, side, move);
  const need = [...game.need];
  need.splice(need.indexOf(move.die), 1);
  const moved: GameState = { ...game, position, need, moves: [...game.moves, move] };
  const winner = finisher(moved, side);
  return winner === null ? moved : finish(moved, bearOffResult(moved, winner));
}

/** Take back the last move made this turn. Does nothing if none has been made. */
export function undoMove(game: GameState): GameState {
  if (game.phase !== "playing" || game.moves.length === 0 || game.turn === null) return game;
  const kept = game.moves.slice(0, -1);
  const side = game.turn;
  const need = [...game.plan];
  for (const move of kept) need.splice(need.indexOf(move.die), 1);
  return { ...game, position: playMoves(game.settings.variant, game.turnStart, side, kept), moves: kept, need };
}

/** Take back every move of the turn. */
export function restartTurn(game: GameState): GameState {
  if (game.phase !== "playing" || game.moves.length === 0) return game;
  return { ...game, position: game.turnStart, moves: [], need: game.plan };
}

/** Make a whole play (the moves of `legalPlays`) for the side on turn and end the turn. */
export function playTurn(game: GameState, moves: readonly Move[]): GameState {
  let at = game;
  for (const move of moves) at = playMove(at, move);
  return at.phase === "over" ? at : endTurn(at);
}

/** End the side on turn's turn, once everything it had to play has been played. The other side is to move. */
export function endTurn(game: GameState): GameState {
  const side = onTurn(game);
  if (game.phase !== "playing") fail("There is no turn to end.");
  if (game.need.length > 0) fail("The turn is not played out yet.");
  const turns: [number, number] = [game.turns[0], game.turns[1]];
  turns[sideIndex(side)] += 1;
  const next: GameState = { ...game, turn: otherSide(side), phase: "before-roll", dice: null, need: [], plan: [], moves: [], turnStart: game.position, turns };
  const limit = game.settings.variant.drawAfter;
  if (limit > 0 && turns[0] >= limit && turns[1] >= limit) return finish(next, { winner: null, how: "draw", kind: "single", multiplier: 1, cube: game.cube.value, points: 0 });
  return next;
}

function finish(game: GameState, result: GameResult): GameState {
  return { ...game, phase: "over", result, need: [], offeredBy: null };
}

/** The side that has just borne off every checker, or null. */
function finisher(game: GameState, side: Side): Side | null {
  return game.position.off[sideIndex(side)] === game.settings.variant.checkers ? side : null;
}

/** Whether `side`, after the game is lost, has a checker on the bar, yet to enter, or in the other side's home board. */
function inTheirHome(game: GameState, loser: Side): boolean {
  const i = sideIndex(loser);
  if (game.position.bar[i] > 0 || game.position.reserve[i] > 0) return true;
  const spec = game.settings.variant;
  for (let own = 1; own <= POINTS; own += 1) {
    if ((game.position.points[i][own - 1] ?? 0) > 0 && mirrorPoint(spec, own) <= 6) return true;
  }
  return false;
}

/** The kind of win a game that `winner` has won by bearing off is: single, gammon or backgammon, before the rules say what they count for. */
export function winKind(game: GameState, winner: Side): WinKind {
  const loser = otherSide(winner);
  if (game.position.off[sideIndex(loser)] > 0) return "single";
  return inTheirHome(game, loser) ? "backgammon" : "gammon";
}

/** What a win of `kind` is worth, after the rules: a single win when gammons do not count, or when the Jacoby rule holds them back because the cube was never turned. */
export function multiplierOf(game: GameState, kind: WinKind): number {
  const { rules } = game.settings;
  if (!rules.gammons) return 1;
  if (rules.jacoby && game.cube.value === 1) return 1;
  return kind === "backgammon" ? 3 : kind === "gammon" ? 2 : 1;
}

function resultOf(game: GameState, winner: Side, how: HowItEnded, kind: WinKind, cube: number): GameResult {
  const multiplier = multiplierOf(game, kind);
  return { winner, how, kind, multiplier, cube, points: multiplier * cube };
}

function bearOffResult(game: GameState, finished: Side): GameResult {
  if (game.settings.variant.goal === "last-off") return resultOf(game, otherSide(finished), "bear-off", "single", game.cube.value);
  return resultOf(game, finished, "bear-off", winKind(game, finished), game.cube.value);
}

/** Whether the side on turn may offer a double now. */
export function canDouble(game: GameState): boolean {
  if (game.phase !== "before-roll" || game.turn === null) return false;
  if (!cubeInPlay(game.settings.rules, game.crawford)) return false;
  if (game.cube.owner !== null && game.cube.owner !== game.turn) return false;
  if (game.cube.value * 2 > CUBE_LIMIT) return false;
  return !cubeIsDead(game);
}

/** The cube is dead when turning it could not matter: it already shows enough for either side to win the match with a win. Never in money play. */
export function cubeIsDead(game: GameState): boolean {
  const { points } = game.settings.rules;
  if (points === 0) return false;
  return game.cube.value >= points - game.score[0] && game.cube.value >= points - game.score[1];
}

/** Offer a double: the other side must now take it or drop it. */
export function offerDouble(game: GameState): GameState {
  if (!canDouble(game)) fail("A double cannot be offered now.");
  return { ...game, phase: "double-offered", offeredBy: game.turn };
}

function responder(game: GameState): Side {
  return game.offeredBy === null ? fail("No double has been offered.") : otherSide(game.offeredBy);
}

/**
 * Take the double that was offered. The cube turns and goes to the side that
 * took it, and the side on turn rolls. (A beaver taken turns it twice, and
 * leaves it with the side that beavered.)
 */
export function takeDouble(game: GameState): GameState {
  const taker = responder(game);
  const offeredBy = game.offeredBy as Side;
  if (game.phase === "double-offered") return { ...game, phase: "before-roll", cube: { value: game.cube.value * 2, owner: taker }, offeredBy: null };
  if (game.phase === "beaver-offered") return { ...game, phase: "before-roll", cube: { value: game.cube.value * 4, owner: offeredBy }, offeredBy: null };
  return fail("No double has been offered.");
}

/**
 * Drop the double that was offered: the side that drops it loses the game, at
 * the cube's value before the double, or for a beaver at its value once the
 * double was taken.
 */
export function dropDouble(game: GameState): GameState {
  const dropper = responder(game);
  const winner = otherSide(dropper);
  const value = game.phase === "beaver-offered" ? game.cube.value * 2 : game.phase === "double-offered" ? game.cube.value : fail("No double has been offered.");
  return finish(game, { winner, how: "drop", kind: "single", multiplier: 1, cube: value, points: value });
}

/** Whether the side that was doubled may beaver: redouble at once and keep the cube. Only where the rules allow it. */
export function canBeaver(game: GameState): boolean {
  return game.phase === "double-offered" && game.settings.rules.beaver && game.cube.value * 4 <= CUBE_LIMIT;
}

/** Beaver: the side that was doubled redoubles and keeps the cube; the side that doubled must now take it or drop it. */
export function beaverDouble(game: GameState): GameState {
  if (!canBeaver(game)) fail("A beaver cannot be played now.");
  return { ...game, phase: "beaver-offered", offeredBy: responder(game) };
}

/**
 * What a side gives up if it gives up the game now, which is the worst the
 * position could come to: a single game once it has borne a checker off; a
 * gammon if nothing of the other side's can still hit it; otherwise a
 * backgammon where it may have a checker caught in the other side's home board.
 */
export function concedeKind(game: GameState, side: Side): WinKind {
  const winner = otherSide(side);
  if (game.position.off[sideIndex(side)] > 0) return "single";
  return gameCanStillHit(game, winner, side) ? "backgammon" : "gammon";
}

/** Whether `by` could still hit a checker of `target`, so that a lost game might yet turn into a backgammon. */
function gameCanStillHit(game: GameState, by: Side, target: Side): boolean {
  const spec = game.settings.variant;
  const p = game.position;
  if (p.bar[sideIndex(target)] > 0 || p.reserve[sideIndex(target)] > 0) return true;
  // The target's rearmost checker, in the board's own points as `by` numbers them, against `by`'s rearmost.
  let targetRear = 0;
  for (let n = POINTS; n >= 1; n -= 1) if ((p.points[sideIndex(target)][n - 1] ?? 0) > 0) { targetRear = n; break; }
  let byRear = 0;
  for (let n = POINTS; n >= 1; n -= 1) if ((p.points[sideIndex(by)][n - 1] ?? 0) > 0) { byRear = n; break; }
  if (targetRear === 0 || byRear === 0) return false;
  if (spec.direction === "opposed") return byRear > mirrorPoint(spec, targetRear);
  return true;
}

/** Give up the game: `side` loses. `kind` is what it is giving up, from `concedeKind`'s worst down to a single game. */
export function concede(game: GameState, side: Side, kind: WinKind = concedeKind(game, side)): GameState {
  if (game.phase === "over") fail("The game is over.");
  const worst = concedeKind(game, side);
  const rank = { single: 1, gammon: 2, backgammon: 3 } as const;
  if (rank[kind] > rank[worst]) fail(`Giving up a ${kind} is more than this position can lose.`);
  return finish(game, resultOf(game, otherSide(side), "concede", kind, game.cube.value));
}

/** The game drawn by agreement. */
export function agreeDraw(game: GameState): GameState {
  if (game.phase === "over") fail("The game is over.");
  return finish(game, { winner: null, how: "draw", kind: "single", multiplier: 1, cube: game.cube.value, points: 0 });
}
