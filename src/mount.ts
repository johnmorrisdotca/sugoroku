import { BAR, boardPoint } from "./board.ts";
import type { SugorokuBoardName, SugorokuCheckerSetName, SugorokuColours } from "./colours.ts";
import { computerAction, sideToAct, type Strength } from "./computer.ts";
import { openingFrom, randomDice, rollFrom, seededDice, type DiceSource } from "./dice.ts";
import { drawSugoroku } from "./draw.ts";
import { boardSize, CHECKER, type Orientation } from "./geometry.ts";
import {
  beaverDouble,
  canBeaver,
  canDouble,
  concede,
  dropDouble,
  endTurn,
  legalMoves,
  offerDouble,
  playMove,
  rollDice,
  rollOpening,
  takeDouble,
  turnIsPlayed,
  undoMove,
  type GameResult,
  type GameState,
} from "./game.ts";
import { finishGame, newMatch, startGame, type Match } from "./match.ts";
import type { Move } from "./moves.ts";
import { formatMove, formatPlay } from "./notation.ts";
import { diceToPlay } from "./plays.ts";
import { SUGOROKU_PLAY_STYLE } from "./playStyle.ts";
import { GameRecorder, type RecordSeed } from "./record.ts";
import { presetByKey, settingsFor, type Rules, type Settings } from "./rules.ts";
import { otherSide, sideIndex, type Side } from "./side.ts";
import { createSounds, packagedSounds, type SoundName, type SoundPlayer, type SoundUrls } from "./sound.ts";
import { sugorokuLanguageOf, sugorokuSay, type SugorokuLanguage } from "./strings.ts";
import type { VariantKey } from "./variants.ts";

/**
 * A PLAYABLE SUGOROKU BOARD IN ANY PAGE: `mountSugoroku(host, options)` draws a
 * game into an element and plays it by touch and mouse. Tap a checker and then
 * a point (the places it may go light up), or drag it there. Dice are rolled by
 * a button or given by the page; a turn may be undone move by move until Done;
 * the doubling cube is offered, taken and dropped with buttons. Either side, or
 * both, may be played by the computer.
 *
 * What happens is told in events on the host (and to the callbacks given):
 * `sugoroku-roll`, `sugoroku-move`, `sugoroku-turn`, `sugoroku-cube` and
 * `sugoroku-end`, each with a `detail`; and `sugoroku-need-dice` when the page
 * has said it will give the dice and they are wanted. The game is kept as a
 * record a server can replay (`record()`).
 *
 * Needs a page. The rules it plays by are `game.ts`'s, the drawing is
 * `drawSugoroku`'s and the opponent is `computer.ts`'s: all usable alone.
 */

/** How the board looks, apart from the game. */
export type SugorokuLook = {
  board?: SugorokuBoardName;
  checkers?: SugorokuCheckerSetName;
  colours?: Partial<SugorokuColours>;
  theme?: "auto" | "light" | "dark";
  /** Which end of the board the trays are at. */
  home?: "left" | "right";
  /** Whose home board is at the bottom: `auto` (the default) is the side a person plays when the computer plays the other, otherwise white. */
  view?: Side | "auto";
  /** Numbers on the points. */
  numbers?: boolean;
  /** `auto` (the default) stands the board up in a narrow page, such as a phone's. */
  orientation?: Orientation | "auto";
};

/** What every event of the board carries. */
export type SugorokuEventDetail = {
  /** The side it is about; null for the opening throw. */
  side: Side | null;
  game: GameState;
  match: Match;
  /** Dice: for a roll, those rolled; for a turn, the roll played. */
  dice?: readonly number[];
  /** A move in standard notation, or a turn's play. */
  notation?: string;
  move?: Move;
  moves?: readonly Move[];
  /** What was done to the cube. */
  action?: "double" | "take" | "drop" | "beaver";
  /** The result, for `sugoroku-end`. */
  result?: GameResult;
  /** The record of the match so far, for `sugoroku-end`. */
  record?: string;
};

export type SugorokuMountOptions = SugorokuLook & {
  /** The variant. Default `backgammon`. */
  variant?: VariantKey;
  /** The rules left out are a single game with no cube. */
  rules?: Partial<Rules>;
  /** A named way of playing (a `PRESETS` key, such as `backgammon-5`) instead of `variant` and `rules`. */
  preset?: string;
  /** Dice from a seed, so the game can be played again; left out they are random. */
  seed?: RecordSeed;
  /** `button` (the default): a button rolls them. `host`: the page gives them, with `roll`, when `sugoroku-need-dice` says they are wanted. */
  dice?: "button" | "host";
  /** The strength of the computer for each side it plays. A side left out, or null, is played by a person. */
  computer?: { white?: Strength | null; black?: Strength | null };
  /** How long the computer pauses between what it does, in milliseconds. Default 450, and none for a reader who has asked for less motion. */
  computerDelay?: number;
  /** The buttons and the lines of words. Default true. */
  controls?: boolean;
  /** Whether a checker may be dragged as well as tapped. Default true. */
  drag?: boolean;
  /** End a turn at once when it is played out, without waiting for Done. Default false. */
  autoEnd?: boolean;
  /** The language the words are in. Left out, the host's own `lang`, or the page's, and it follows the page's. */
  language?: SugorokuLanguage;
  /** What each side is called, instead of its colour or `You` and `Computer`. */
  names?: Partial<Record<Side, string>>;
  /** Sounds: `true` for the package's own, or the address of each. Default none. */
  sound?: boolean | SoundUrls;
  /** Carry on a match already begun. */
  match?: Match;
  onRoll?: (detail: SugorokuEventDetail) => void;
  onMove?: (detail: SugorokuEventDetail) => void;
  onTurn?: (detail: SugorokuEventDetail) => void;
  onCube?: (detail: SugorokuEventDetail) => void;
  onEnd?: (detail: SugorokuEventDetail) => void;
};

export type SugorokuMount = {
  readonly host: HTMLElement;
  /** The game as it stands. */
  game: () => GameState;
  match: () => Match;
  /** The match so far as a record a server can replay (see `replayRecord`). */
  record: () => string;
  /** Roll for the side that is to: with no dice, from the seed or at random; with them, the dice the page gives (two for the opening throw, one for white and one for black). */
  roll: (dice?: readonly number[]) => void;
  /** Make a move for the side on turn, from its own point to its own point (the bar is 25, off is 0). False if it is not legal. */
  move: (from: number, to: number) => boolean;
  undo: () => void;
  /** End the turn once it is played out. */
  done: () => void;
  double: () => void;
  take: () => void;
  drop: () => void;
  beaver: () => void;
  /** Give up the game, as the side on turn. */
  resign: () => void;
  /** The next game of the match. */
  nextGame: () => void;
  /** A new match, in the same variant and rules unless others are given. */
  newMatch: (change?: { variant?: VariantKey; rules?: Partial<Rules>; preset?: string; seed?: RecordSeed }) => void;
  /** Change how it looks or who plays: the look, the computer, the language, the names. */
  set: (changes: SugorokuLook & { computer?: SugorokuMountOptions["computer"]; language?: SugorokuLanguage; names?: SugorokuMountOptions["names"]; sound?: boolean | SoundUrls }) => void;
  /** Take the board down: its listeners, its timers and everything it put in the host. */
  destroy: () => void;
};

/** Put the style in the page once: in the document's head, or in the shadow root the host is in. */
export function ensureSugorokuPlayStyle(host: Element): void {
  const root = host.getRootNode();
  const target: ParentNode = typeof ShadowRoot !== "undefined" && root instanceof ShadowRoot ? root : host.ownerDocument.head;
  if (target.querySelector("style[data-sugoroku-play]") !== null) return;
  const style = host.ownerDocument.createElement("style");
  style.setAttribute("data-sugoroku-play", "");
  style.textContent = SUGOROKU_PLAY_STYLE;
  target.append(style);
}

function create<K extends keyof HTMLElementTagNameMap>(document: Document, tag: K, className: string, text?: string): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

/** Mount a board into `host`. */
export function mountSugoroku(host: HTMLElement, options: SugorokuMountOptions = {}): SugorokuMount {
  ensureSugorokuPlayStyle(host);
  const document = host.ownerDocument;
  const view = document.defaultView as Window & typeof globalThis;

  // Settings, the match, the dice and the record.
  const settingsOf = (variant?: VariantKey, rules?: Partial<Rules>, preset?: string): Settings => {
    const named = preset === undefined ? undefined : presetByKey(preset);
    if (preset !== undefined && named === undefined) throw new Error(`${preset} is not a preset`);
    return named === undefined ? settingsFor(variant ?? "backgammon", rules) : settingsFor(named.variant, named.rules);
  };
  let seed: RecordSeed | undefined = options.seed;
  let source: DiceSource = seed === undefined ? randomDice() : seededDice(seed);
  let settings = options.match?.settings ?? settingsOf(options.variant, options.rules, options.preset);
  let match = options.match ?? newMatch(settings);
  let game: GameState = startGame(match);
  let recorder = new GameRecorder(settings, seed);
  recorder.startGame();

  // What may change while it is mounted.
  let look: SugorokuLook = { board: options.board, checkers: options.checkers, colours: options.colours, theme: options.theme, home: options.home, view: options.view, numbers: options.numbers, orientation: options.orientation };
  let computer = { white: options.computer?.white ?? null, black: options.computer?.black ?? null };
  let language: SugorokuLanguage | undefined = options.language;
  let names = { ...options.names };
  const dragAllowed = options.drag !== false;
  const hostDice = options.dice === "host";
  const reducedMotion = view.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
  const delay = options.computerDelay ?? (reducedMotion ? 0 : 450);
  const soundsFor = (setting: boolean | SoundUrls | undefined): SoundPlayer | null => (setting === undefined || setting === false ? null : createSounds(setting === true ? packagedSounds() : setting));
  let sounds = soundsFor(options.sound);

  // The page's own parts.
  host.classList.add("sugoroku-play");
  host.dataset.drag = dragAllowed ? "on" : "off";
  const score = create(document, "p", "sgp-score");
  const boardBox = create(document, "div", "sgp-board");
  const status = create(document, "p", "sgp-status");
  status.setAttribute("aria-live", "polite");
  const controls = create(document, "div", "sgp-controls");
  const slotA = create(document, "button", "sgp-button");
  const slotB = create(document, "button", "sgp-button");
  const slotC = create(document, "button", "sgp-button");
  for (const button of [slotA, slotB, slotC]) button.type = "button";
  slotA.dataset.testid = "sg-primary";
  slotB.dataset.testid = "sg-secondary";
  slotC.dataset.testid = "sg-tertiary";
  controls.append(slotA, slotB, slotC);
  controls.hidden = options.controls === false;
  host.replaceChildren(score, boardBox, status, controls);

  let selected: number | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let queue: Move[] = [];
  let gone = false;
  let portrait = false;
  let waitingForDice = false;
  let lastOpening: readonly [number, number] | null = null;
  let message: string | null = null;

  const lang = (): SugorokuLanguage => language ?? sugorokuLanguageOf(host);
  const say = (key: string, values: Record<string, string | number> = {}): string => sugorokuSay(lang(), key, values);
  const isComputer = (side: Side): boolean => computer[side] !== null;
  const human = (side: Side): boolean => !isComputer(side);
  const nameOf = (side: Side): string => {
    const own = names[side];
    if (own !== undefined) return own;
    if (isComputer(side) && human(otherSide(side))) return say("computer");
    if (human(side) && isComputer(otherSide(side))) return say("you");
    return say(side);
  };
  const eventDetail = (side: Side | null, extra: Partial<SugorokuEventDetail> = {}): SugorokuEventDetail => ({ side, game, match, ...extra });
  const emit = (name: string, detail: SugorokuEventDetail, callback?: (detail: SugorokuEventDetail) => void): void => {
    host.dispatchEvent(new view.CustomEvent(name, { detail, bubbles: true }));
    callback?.(detail);
  };
  const spec = (): GameState["settings"]["variant"] => game.settings.variant;
  const hasCube = (): boolean => settings.rules.cube && settings.rules.points !== 1;

  /** Whose home board is at the bottom. */
  const viewSide = (): Side => {
    if (look.view !== undefined && look.view !== "auto") return look.view;
    if (isComputer("white") && human("black")) return "black";
    return "white";
  };

  // Drawing.
  const diceShown = (): { side: Side; values: number[]; spent: boolean[] } | null => {
    if (game.phase === "opening") {
      return lastOpening === null ? null : { side: "white", values: [lastOpening[0], lastOpening[1]], spent: [false, false] };
    }
    if (game.dice === null || game.turn === null) return null;
    const values = diceToPlay(spec(), game.dice);
    const unused = [...game.need];
    const planLeft = [...game.plan];
    const spent = values.map((value) => {
      const inPlan = planLeft.indexOf(value);
      if (inPlan === -1) return true;
      planLeft.splice(inPlan, 1);
      const open = unused.indexOf(value);
      if (open === -1) return true;
      unused.splice(open, 1);
      return false;
    });
    return { side: game.turn, values, spent };
  };

  const legalNow = (): Move[] => (game.phase === "playing" && game.turn !== null && human(game.turn) ? legalMoves(game) : []);

  const draw = (): string => {
    const moves = legalNow();
    const mover = game.turn;
    const sources = [...new Set(moves.map((move) => move.from))];
    const targets = selected === null ? [] : [...new Set(moves.filter((move) => move.from === selected).map((move) => move.to))];
    return drawSugoroku(game.position, {
      variant: spec(),
      view: viewSide(),
      home: look.home,
      orientation: portrait ? "portrait" : "landscape",
      numbers: look.numbers,
      board: look.board,
      checkers: look.checkers,
      colours: look.colours,
      theme: look.theme,
      dice: diceShown(),
      cube: hasCube() ? { value: game.cube.value, owner: game.cube.owner } : null,
      highlight: mover === null ? null : { side: mover, from: selected, targets, movable: sources },
      label: say("board", { variant: say(`variant_${spec().key}`) }),
    });
  };

  // The words.
  const pointsText = (count: number): string => say(count === 1 ? "point" : "points", { n: count });
  const diceText = (dice: readonly number[] | null): string => (dice === null ? "" : diceToPlay(spec(), dice).join(" "));
  const statusText = (): string => {
    if (message !== null) return message;
    const side = game.turn;
    if (game.phase === "opening") return waitingForDice ? say("waitingDice") : lastOpening !== null && lastOpening[0] === lastOpening[1] ? say("openingTie", { die: lastOpening[0] }) : say("opening");
    if (game.phase === "over") {
      const result = game.result as GameResult;
      let line: string;
      if (result.winner === null) line = say("drawn");
      else if (result.how === "drop") line = say("wonDrop", { side: nameOf(result.winner), points: pointsText(result.points) });
      else if (result.how === "concede") line = say("wonConcede", { side: nameOf(result.winner), points: pointsText(result.points) });
      else line = say("wonBy", { side: nameOf(result.winner), kind: say(result.kind === "single" ? "singleGame" : result.kind), points: pointsText(result.points) });
      if (match.over) line += ` ${match.winner === null ? say("matchDrawn") : say("matchWon", { side: nameOf(match.winner), a: match.score[sideIndex(match.winner)], b: match.score[sideIndex(otherSide(match.winner))] })}`;
      return line;
    }
    if (side === null) return "";
    if (game.phase === "double-offered" || game.phase === "beaver-offered") {
      const offerer = game.offeredBy as Side;
      const value = game.phase === "double-offered" ? game.cube.value * 2 : game.cube.value * 4;
      const lose = pointsText(game.phase === "double-offered" ? game.cube.value : game.cube.value * 2);
      if (human(otherSide(offerer))) return say(game.phase === "double-offered" ? "answerDouble" : "answerBeaver", { side: nameOf(offerer), value, points: lose });
      return say("thinking", { side: nameOf(otherSide(offerer)) });
    }
    if (game.phase === "before-roll") {
      if (isComputer(side)) return say("thinking", { side: nameOf(side) });
      return isComputer(otherSide(side)) ? say("toRollYou") : say("toRoll", { side: nameOf(side) });
    }
    if (isComputer(side) && game.moves.length === 0 && game.need.length > 0) return say("thinking", { side: nameOf(side) });
    if (game.plan.length === 0) return say(human(side) && isComputer(otherSide(side)) ? "noMoveYou" : "noMove", { side: nameOf(side) });
    if (turnIsPlayed(game)) return human(side) ? say("played") : say("toPlay", { side: nameOf(side), dice: diceText(game.dice) });
    return human(side) && isComputer(otherSide(side)) ? say("toPlayYou", { dice: diceText(game.dice) }) : say("toPlay", { side: nameOf(side), dice: diceText(game.dice) });
  };
  const scoreText = (): string => {
    const { rules } = settings;
    const parts = [say("score", { white: nameOf("white"), a: match.score[0], black: nameOf("black"), b: match.score[1] }), rules.points === 0 ? say("money") : say("matchTo", { points: rules.points })];
    if (game.crawford && game.phase !== "over") parts.push(say("crawford"));
    else if (hasCube()) parts.push(game.cube.owner === null ? say("cubeMiddle") : say("cubeHeld", { value: game.cube.value, side: nameOf(game.cube.owner) }));
    return parts.join(" · ");
  };

  /** What the three buttons say and do now. */
  type Slot = { text: string; enabled: boolean; run: () => void; primary?: boolean; attention?: boolean };
  const slots = (): [Slot, Slot, Slot] => {
    const off: Slot = { text: "", enabled: false, run: () => undefined };
    const side = game.turn;
    const turnOfHuman = side !== null && human(side);
    if (game.phase === "over") {
      return [match.over ? { text: say("newMatch"), enabled: true, run: () => api.newMatch(), primary: true } : { text: say("nextGame"), enabled: true, run: () => api.nextGame(), primary: true }, match.over ? off : { text: say("newMatch"), enabled: true, run: () => api.newMatch() }, off];
    }
    if (game.phase === "opening") {
      const nobody = isComputer("white") && isComputer("black");
      return [{ text: say("rollOpening"), enabled: !nobody && !waitingForDice, run: () => api.roll(), primary: true, attention: !nobody }, off, off];
    }
    if (game.phase === "double-offered" || game.phase === "beaver-offered") {
      const answerer = otherSide(game.offeredBy as Side);
      const mine = human(answerer);
      return [
        { text: say("take"), enabled: mine, run: () => api.take(), primary: true, attention: mine },
        { text: say("drop"), enabled: mine, run: () => api.drop() },
        { text: say("beaver"), enabled: mine && canBeaver(game), run: () => api.beaver() },
      ];
    }
    if (game.phase === "before-roll") {
      return [
        { text: say("roll"), enabled: turnOfHuman && !waitingForDice, run: () => api.roll(), primary: true, attention: turnOfHuman },
        { text: say("double"), enabled: turnOfHuman && canDouble(game), run: () => api.double() },
        { text: say("undo"), enabled: false, run: () => undefined },
      ];
    }
    const played = turnIsPlayed(game);
    return [
      { text: say("done"), enabled: turnOfHuman && played, run: () => api.done(), primary: true, attention: turnOfHuman && played },
      { text: say("double"), enabled: false, run: () => undefined },
      { text: say("undo"), enabled: turnOfHuman && game.moves.length > 0, run: () => api.undo() },
    ];
  };

  let handlers: [() => void, () => void, () => void] = [() => undefined, () => undefined, () => undefined];
  const render = (): void => {
    if (gone) return;
    const width = host.clientWidth || 600;
    portrait = look.orientation === "portrait" || (look.orientation !== "landscape" && width < 560);
    const size = boardSize({ cube: hasCube(), orientation: portrait ? "portrait" : "landscape" });
    boardBox.style.aspectRatio = `${size.width} / ${size.height}`;
    boardBox.innerHTML = draw();
    host.dataset.phase = game.phase;
    host.dataset.turn = game.turn ?? "";
    host.dataset.over = String(game.phase === "over");
    host.dataset.orientation = portrait ? "portrait" : "landscape";
    host.dataset.selected = selected === null ? "" : String(selected);
    host.dataset.cube = String(game.cube.value);
    host.dataset.need = game.need.join("");
    host.dataset.ready = "true";
    score.textContent = scoreText();
    status.textContent = statusText();
    const [a, b, c] = slots();
    const buttons = [slotA, slotB, slotC];
    [a, b, c].forEach((slot, index) => {
      const button = buttons[index] as HTMLButtonElement;
      button.textContent = slot.text;
      button.disabled = !slot.enabled;
      button.dataset.primary = String(slot.primary === true);
      button.dataset.attention = String(slot.attention === true);
      button.style.visibility = slot.text === "" ? "hidden" : "visible";
    });
    handlers = [a.run, b.run, c.run];
  };
  slotA.addEventListener("click", () => handlers[0]());
  slotB.addEventListener("click", () => handlers[1]());
  slotC.addEventListener("click", () => handlers[2]());

  const play = (name: SoundName): void => sounds?.play(name);

  // The game moving on.
  const startComputer = (): void => {
    if (timer !== null) clearTimeout(timer);
    timer = null;
    if (gone || game.phase === "over") return;
    const actor = game.phase === "opening" ? (isComputer("white") && isComputer("black") ? "white" : null) : sideToAct(game);
    if (actor === null || !isComputer(actor)) return;
    if (waitingForDice) return;
    timer = setTimeout(tick, delay);
  };

  let counted: GameState | null = null;
  /** A game that has just ended is added to the match once, and the page told. */
  const finishIfOver = (): void => {
    if (game.phase !== "over" || counted === game) return;
    counted = game;
    const result = game.result as GameResult;
    recorder.result(result);
    match = finishGame(match, result);
    emit("sugoroku-end", eventDetail(result.winner, { result, record: recorder.text() }), options.onEnd);
  };

  const setGame = (next: GameState): void => {
    game = next;
    selected = null;
    message = null;
    finishIfOver();
    render();
    if (options.autoEnd === true && game.phase === "playing" && turnIsPlayed(game) && game.turn !== null && human(game.turn)) {
      timer = setTimeout(endNow, delay === 0 ? 0 : 250);
      return;
    }
    startComputer();
  };

  const throwOpening = (throws: readonly [number, number]): void => {
    recorder.opening(throws);
    lastOpening = throws;
    play("dice");
    const next = rollOpening(game, throws);
    emit("sugoroku-roll", eventDetail(null, { dice: throws, game: next }), options.onRoll);
    setGame(next);
  };

  const rollFor = (dice: readonly number[]): void => {
    const side = game.turn as Side;
    play("dice");
    const next = rollDice(game, dice);
    emit("sugoroku-roll", eventDetail(side, { dice, game: next }), options.onRoll);
    setGame(next);
  };

  const wantDice = (): boolean => {
    if (!hostDice) return false;
    waitingForDice = true;
    render();
    emit("sugoroku-need-dice", eventDetail(game.turn));
    return true;
  };

  const requestRoll = (dice?: readonly number[]): void => {
    if (game.phase === "opening") {
      if (dice !== undefined) {
        waitingForDice = false;
        throwOpening([dice[0] as number, dice[1] as number]);
      } else if (!wantDice()) throwOpening(openingFrom(source));
    } else if (game.phase === "before-roll") {
      if (dice !== undefined) {
        waitingForDice = false;
        rollFor(dice);
      } else if (!wantDice()) rollFor(rollFrom(source, spec().dice));
    }
  };

  /** A turn is over: write it into the record and tell the page. */
  const turnDone = (side: Side, dice: readonly number[], moves: readonly Move[], after: GameState): void => {
    recorder.turn(side, dice, moves);
    emit("sugoroku-turn", eventDetail(side, { dice, moves, notation: formatPlay(moves), game: after }), options.onTurn);
  };

  const makeMove = (step: { from: number; to: number }): boolean => {
    if (game.phase !== "playing" || game.turn === null) return false;
    const side = game.turn;
    const move = legalMoves(game).filter((one) => one.from === step.from && one.to === step.to).sort((a, b) => a.die - b.die)[0];
    if (move === undefined) return false;
    const next = playMove(game, move);
    play(move.hit ? "hit" : "clack");
    emit("sugoroku-move", eventDetail(side, { move, notation: formatMove(move), game: next }), options.onMove);
    // A move that bears off the last checker ends the game, and the turn with it.
    if (next.phase === "over") turnDone(side, next.dice ?? [], next.moves, next);
    setGame(next);
    return true;
  };

  const endNow = (): void => {
    timer = null;
    if (game.phase !== "playing" || !turnIsPlayed(game) || game.turn === null) return;
    const side = game.turn;
    const next = endTurn(game);
    turnDone(side, game.dice ?? [], game.moves, next);
    setGame(next);
  };

  const cubeAction = (action: "double" | "take" | "drop" | "beaver", side: Side): void => {
    const next = action === "double" ? offerDouble(game) : action === "take" ? takeDouble(game) : action === "drop" ? dropDouble(game) : beaverDouble(game);
    (action === "double" ? recorder.double : action === "take" ? recorder.take : action === "drop" ? recorder.drop : recorder.beaver).call(recorder, side);
    play("cube");
    emit("sugoroku-cube", eventDetail(side, { action, game: next }), options.onCube);
    setGame(next);
  };

  /** One step of what the computer does, now. */
  const tick = (): void => {
    timer = null;
    if (gone || game.phase === "over") return;
    if (queue.length > 0 && game.phase === "playing") {
      const move = queue.shift() as Move;
      makeMove(move);
      return;
    }
    const actor = game.phase === "opening" ? "white" : sideToAct(game);
    if (actor === null) return;
    const action = computerAction(game, { strength: computer[actor] ?? "strong" });
    if (action === null) return;
    switch (action.kind) {
      case "throw":
      case "roll":
        requestRoll();
        break;
      case "double":
        cubeAction("double", actor);
        break;
      case "take":
        cubeAction("take", actor);
        break;
      case "drop":
        cubeAction("drop", actor);
        break;
      case "play": {
        queue = [...action.play.moves];
        const first = queue.shift();
        if (first === undefined) endNow();
        else makeMove(first);
        break;
      }
      case "end":
        endNow();
        break;
    }
  };

  // Touch and mouse.
  const whereIs = (target: Element | null): number | null => {
    const mover = game.turn;
    if (mover === null || target === null) return null;
    const bar = target.closest<SVGElement>("[data-bar]");
    if (bar !== null) return bar.dataset.bar === mover ? BAR : null;
    const tray = target.closest<SVGElement>("[data-tray]");
    if (tray !== null) return tray.dataset.tray === mover ? 0 : null;
    const point = target.closest<SVGElement>("[data-board]");
    if (point === null || point.dataset.board === undefined) return null;
    return boardPoint(spec(), mover, Number(point.dataset.board));
  };

  const press = (own: number | null): void => {
    const moves = legalNow();
    if (own === null) {
      selected = null;
    } else if (selected !== null && moves.some((move) => move.from === selected && move.to === own)) {
      makeMove({ from: selected, to: own });
      return;
    } else if (moves.some((move) => move.from === own)) {
      selected = selected === own ? null : own;
    } else {
      selected = null;
    }
    render();
  };

  let drag: { pointer: number; from: number; x: number; y: number; active: boolean; ghost: HTMLElement | null } | null = null;
  const underPointer = (x: number, y: number): Element | null => {
    const root = host.getRootNode() as Document | ShadowRoot;
    return root.elementFromPoint?.(x, y) ?? null;
  };
  const sampleColour = (side: Side): { fill: string; edge: string } => {
    const svg = boardBox.querySelector("svg");
    const face = svg?.querySelector(`.sg-checker[data-side="${side}"] .sg-face`);
    const style = face === null || face === undefined ? null : view.getComputedStyle(face);
    return { fill: style?.fill ?? "#fff", edge: style?.stroke ?? "#000" };
  };

  const onDown = (event: PointerEvent): void => {
    if (event.button !== 0 && event.pointerType === "mouse") return;
    if (game.phase !== "playing" || game.turn === null || !human(game.turn)) return;
    const own = whereIs(event.target as Element);
    if (own === null) return;
    const moves = legalNow();
    if (dragAllowed && moves.some((move) => move.from === own)) {
      drag = { pointer: event.pointerId, from: own, x: event.clientX, y: event.clientY, active: false, ghost: null };
    }
  };

  const onMove = (event: PointerEvent): void => {
    if (drag === null || event.pointerId !== drag.pointer) return;
    if (!drag.active) {
      if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 8) return;
      drag.active = true;
      selected = drag.from;
      render();
      const svg = boardBox.querySelector("svg");
      const rect = svg?.getBoundingClientRect();
      const viewWidth = svg?.viewBox.baseVal.width ?? 1;
      const scale = rect === undefined ? 1 : rect.width / viewWidth;
      const side = game.turn as Side;
      const colours = sampleColour(side);
      const ghost = create(document, "div", "sgp-ghost");
      const diameter = CHECKER * scale;
      ghost.style.width = `${diameter}px`;
      ghost.style.height = `${diameter}px`;
      ghost.style.background = colours.fill;
      ghost.style.borderColor = colours.edge;
      host.append(ghost);
      drag.ghost = ghost;
      try {
        boardBox.setPointerCapture(event.pointerId);
      } catch {
        /* Capture is a nicety. */
      }
    }
    if (drag.ghost !== null) {
      const w = drag.ghost.offsetWidth;
      drag.ghost.style.transform = `translate(${event.clientX - w / 2}px, ${event.clientY - w / 2}px)`;
    }
  };

  const onUp = (event: PointerEvent): void => {
    if (drag === null || event.pointerId !== drag.pointer) {
      return;
    }
    const finished = drag;
    drag = null;
    finished.ghost?.remove();
    try {
      boardBox.releasePointerCapture(event.pointerId);
    } catch {
      /* Already released. */
    }
    if (!finished.active) return;
    const to = whereIs(underPointer(event.clientX, event.clientY));
    if (to !== null && makeMove({ from: finished.from, to })) return;
    selected = null;
    render();
  };

  const onCancel = (event: PointerEvent): void => {
    if (drag === null || event.pointerId !== drag.pointer) return;
    drag.ghost?.remove();
    const wasActive = drag.active;
    drag = null;
    if (wasActive) {
      selected = null;
      render();
    }
  };

  /** A tap or a click: the drag handlers deal with a drag, and a click that follows one is ignored. */
  let lastDragEnd = 0;
  const onClick = (event: MouseEvent): void => {
    if (Date.now() - lastDragEnd < 60) return;
    if (game.phase !== "playing" || game.turn === null || !human(game.turn)) return;
    press(whereIs(event.target as Element));
  };
  boardBox.addEventListener("pointerdown", onDown);
  boardBox.addEventListener("pointermove", onMove);
  boardBox.addEventListener("pointerup", (event) => {
    const wasDrag = drag?.active === true;
    onUp(event);
    if (wasDrag) lastDragEnd = Date.now();
  });
  boardBox.addEventListener("pointercancel", onCancel);
  boardBox.addEventListener("click", onClick);

  // Following the page: its width, and its language.
  const resize = typeof view.ResizeObserver === "undefined" ? null : new view.ResizeObserver(() => {
    const wide = look.orientation === "portrait" || (look.orientation !== "landscape" && (host.clientWidth || 600) < 560);
    if (wide !== portrait) render();
  });
  resize?.observe(host);
  const watch = typeof view.MutationObserver === "undefined" ? null : new view.MutationObserver(() => {
    if (language === undefined) render();
  });
  watch?.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });

  // The handle.
  const api: SugorokuMount = {
    host,
    game: () => game,
    match: () => match,
    record: () => recorder.text(),
    roll: (dice) => requestRoll(dice),
    move: (from, to) => makeMove({ from, to }),
    undo: () => {
      if (game.phase === "playing" && game.moves.length > 0) setGame(undoMove(game));
    },
    done: () => endNow(),
    double: () => {
      if (game.turn !== null && canDouble(game)) cubeAction("double", game.turn);
    },
    take: () => {
      if (game.offeredBy !== null && (game.phase === "double-offered" || game.phase === "beaver-offered")) cubeAction("take", otherSide(game.offeredBy));
    },
    drop: () => {
      if (game.offeredBy !== null && (game.phase === "double-offered" || game.phase === "beaver-offered")) cubeAction("drop", otherSide(game.offeredBy));
    },
    beaver: () => {
      if (canBeaver(game)) cubeAction("beaver", otherSide(game.offeredBy as Side));
    },
    resign: () => {
      if (game.phase === "over" || game.turn === null) return;
      const side = game.turn;
      const next = concede(game, side);
      recorder.concede(side, (next.result as GameResult).kind);
      setGame(next);
    },
    nextGame: () => {
      if (game.phase !== "over" || match.over) return;
      recorder.startGame();
      lastOpening = null;
      setGame(startGame(match));
    },
    newMatch: (change = {}) => {
      if (timer !== null) clearTimeout(timer);
      timer = null;
      queue = [];
      if (change.seed !== undefined) seed = change.seed;
      source = seed === undefined ? source : seededDice(seed);
      if (change.preset !== undefined) settings = settingsOf(undefined, undefined, change.preset);
      else if (change.variant !== undefined || change.rules !== undefined) settings = settingsOf(change.variant ?? settings.variant.key, { ...(change.variant === undefined ? settings.rules : {}), ...change.rules });
      match = newMatch(settings);
      recorder = new GameRecorder(settings, seed);
      recorder.startGame();
      lastOpening = null;
      counted = null;
      waitingForDice = false;
      setGame(startGame(match));
    },
    set: (changes) => {
      const { computer: nextComputer, language: nextLanguage, names: nextNames, sound: nextSound, ...nextLook } = changes;
      if ("sound" in changes) {
        sounds?.destroy();
        sounds = soundsFor(nextSound);
      }
      look = { ...look, ...nextLook };
      if (nextComputer !== undefined) computer = { white: nextComputer.white ?? null, black: nextComputer.black ?? null };
      if (nextLanguage !== undefined) language = nextLanguage;
      if (nextNames !== undefined) names = { ...nextNames };
      render();
      startComputer();
    },
    destroy: () => {
      gone = true;
      if (timer !== null) clearTimeout(timer);
      resize?.disconnect();
      watch?.disconnect();
      sounds?.destroy();
      drag?.ghost?.remove();
      host.replaceChildren();
      host.classList.remove("sugoroku-play");
      for (const key of ["drag", "phase", "turn", "over", "orientation", "selected", "cube", "need", "ready"]) delete host.dataset[key];
    },
  };

  render();
  startComputer();
  return api;
}
