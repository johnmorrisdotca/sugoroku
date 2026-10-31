import type { SugorokuBoardName, SugorokuCheckerSetName, SugorokuColours } from "./colours.ts";
import { computerAction, type Strength, sideToAct } from "./computer.ts";
import { type DiceSource, openingFrom, randomDice, rollFrom, seededDice } from "./dice.ts";
import {
  beaverDouble,
  canBeaver,
  canDouble,
  concede,
  dropDouble,
  endTurn,
  type GameResult,
  type GameState,
  legalMoves,
  offerDouble,
  playMove,
  rollDice,
  rollOpening,
  takeDouble,
  turnIsPlayed,
  undoMove,
} from "./game.ts";
import type { Orientation } from "./geometry.ts";
import { finishGame, type Match, newMatch, startGame } from "./match.ts";
import { attachSugorokuView } from "./mountView.ts";
import type { Move } from "./moves.ts";
import { formatMove, formatPlay } from "./notation.ts";
import { SUGOROKU_PLAY_STYLE } from "./playStyle.ts";
import { GameRecorder, type RecordSeed } from "./record.ts";
import { presetByKey, type Rules, type Settings, settingsFor } from "./rules.ts";
import type { Side } from "./side.ts";
import { otherSide } from "./side.ts";
import { createSounds, packagedSounds, type SoundName, type SoundPlayer, type SoundUrls } from "./sound.ts";
import { type SugorokuLanguage, sugorokuLanguageOf, sugorokuSay } from "./strings.ts";
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

/** How the board looks, apart from the game.
 *
 * @example
 * ```ts
 * import type { SugorokuLook } from "@johnmorrisdotca/sugoroku/play";
 *
 * const value: SugorokuLook = {board:"green",checkers:"contrast",numbers:true};
 * console.log(value);
 * ```
 */
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

/** What every event of the board carries.
 *
 * @example
 * ```ts
 * import { newGame, newMatch, rollOpening, settingsFor } from "@johnmorrisdotca/sugoroku";
 * import type { SugorokuEventDetail } from "@johnmorrisdotca/sugoroku/play";
 *
 * const settings = settingsFor("backgammon",{points:5,cube:true});
 * const game = rollOpening(newGame(settings),[3,1]);
 * const match = newMatch(settings);
 * const value: SugorokuEventDetail = {side:"white",game,match,dice:[3,1]};
 * console.log(value);
 * ```
 */
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

/** Native variant, rules, seed, computer, display, control, sound and event-callback choices.
 *
 * @example
 * ```ts
 * import type { SugorokuMountOptions } from "@johnmorrisdotca/sugoroku/play";
 *
 * const value: SugorokuMountOptions = {variant:"backgammon",seed:42,computer:{black:"greedy"}};
 * console.log(value);
 * ```
 */
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

/** The mounted native board, current game/match/record, actions and cleanup handle.
 *
 * @example
 * ```ts no-run
 * import { newGame, rollOpening, settingsFor } from "@johnmorrisdotca/sugoroku";
 * import type { SugorokuMount } from "@johnmorrisdotca/sugoroku/play";
 * import { mountSugoroku } from "@johnmorrisdotca/sugoroku/play";
 *
 * const settings = settingsFor("backgammon",{points:5,cube:true});
 * const game = rollOpening(newGame(settings),[3,1]);
 * const host = document.createElement("div");
 * document.body.append(host);
 * const board: SugorokuMount = mountSugoroku(host,{variant:"backgammon",seed:42,computer:{white:null,black:null}});
 * console.log(board.game().phase);
 * board.destroy();
 * ```
 */
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
  set: (
    changes: SugorokuLook & {
      computer?: SugorokuMountOptions["computer"];
      language?: SugorokuLanguage;
      names?: SugorokuMountOptions["names"];
      sound?: boolean | SoundUrls;
    },
  ) => void;
  /** Take the board down: its listeners, its timers and everything it put in the host. */
  destroy: () => void;
};

/** Put the style in the page once: in the document's head, or in the shadow root the host is in.
 *
 * @param host - The DOM element receiving the native board or scoped styles.
 * @returns Nothing; the native scoped board styles are installed for the host.
 * @example
 * ```ts no-run
 * import { ensureSugorokuPlayStyle } from "@johnmorrisdotca/sugoroku/play";
 *
 * const host = document.createElement("div");
 * ensureSugorokuPlayStyle(host);
 * console.log(host.tagName);
 * ```
 */
export function ensureSugorokuPlayStyle(host: Element): void {
  const root = host.getRootNode();
  const target: ParentNode =
    typeof ShadowRoot !== "undefined" && root instanceof ShadowRoot ? root : host.ownerDocument.head;
  if (target.querySelector("style[data-sugoroku-play]") !== null) return;
  const style = host.ownerDocument.createElement("style");
  style.setAttribute("data-sugoroku-play", "");
  style.textContent = SUGOROKU_PLAY_STYLE;
  target.append(style);
}

function create<K extends keyof HTMLElementTagNameMap>(
  document: Document,
  tag: K,
  className: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

/** Mount a board into `host`.
 * @param host - The HTMLElement that owns the native interface.
 * @param options - Native settings and callbacks for this mounted interface.
 * @returns The native mounted handle, including controls and destroy() cleanup.
 * @example
 * ```ts
 * import { mountSugoroku } from "@johnmorrisdotca/sugoroku/play";
 * const show = (host: HTMLElement, options: Parameters<typeof mountSugoroku>[1]) => mountSugoroku(host, options);
 * console.log(typeof show); // function
 * ```
 */
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
  let look: SugorokuLook = {
    board: options.board,
    checkers: options.checkers,
    colours: options.colours,
    theme: options.theme,
    home: options.home,
    view: options.view,
    numbers: options.numbers,
    orientation: options.orientation,
  };
  let computer = { white: options.computer?.white ?? null, black: options.computer?.black ?? null };
  let language: SugorokuLanguage | undefined = options.language;
  let names = { ...options.names };
  const dragAllowed = options.drag !== false;
  const hostDice = options.dice === "host";
  const reducedMotion = view.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
  const delay = options.computerDelay ?? (reducedMotion ? 0 : 450);
  const soundsFor = (setting: boolean | SoundUrls | undefined): SoundPlayer | null =>
    setting === undefined || setting === false ? null : createSounds(setting === true ? packagedSounds() : setting);
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

  let timer: ReturnType<typeof setTimeout> | null = null;
  let queue: Move[] = [];
  let gone = false;
  let waitingForDice = false;
  let lastOpening: readonly [number, number] | null = null;

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
  const eventDetail = (side: Side | null, extra: Partial<SugorokuEventDetail> = {}): SugorokuEventDetail => ({
    side,
    game,
    match,
    ...extra,
  });
  const emit = (name: string, detail: SugorokuEventDetail, callback?: (detail: SugorokuEventDetail) => void): void => {
    host.dispatchEvent(
      new view.CustomEvent(name, { detail: JSON.parse(JSON.stringify(detail)), bubbles: true, composed: true }),
    );
    callback?.(detail);
  };
  const spec = (): GameState["settings"]["variant"] => game.settings.variant;
  let render: () => void = () => undefined;
  let resetPointer: () => void = () => undefined;
  let disconnectView: () => void = () => undefined;

  const play = (name: SoundName): void => sounds?.play(name);

  // The game moving on.
  const startComputer = (): void => {
    if (timer !== null) clearTimeout(timer);
    timer = null;
    if (gone || game.phase === "over") return;
    const actor =
      game.phase === "opening" ? (isComputer("white") && isComputer("black") ? "white" : null) : sideToAct(game);
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
    resetPointer();
    finishIfOver();
    render();
    if (
      options.autoEnd === true &&
      game.phase === "playing" &&
      turnIsPlayed(game) &&
      game.turn !== null &&
      human(game.turn)
    ) {
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
    const move = legalMoves(game)
      .filter((one) => one.from === step.from && one.to === step.to)
      .sort((a, b) => a.die - b.die)[0];
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
    const next =
      action === "double"
        ? offerDouble(game)
        : action === "take"
          ? takeDouble(game)
          : action === "drop"
            ? dropDouble(game)
            : beaverDouble(game);
    (action === "double"
      ? recorder.double
      : action === "take"
        ? recorder.take
        : action === "drop"
          ? recorder.drop
          : recorder.beaver
    ).call(recorder, side);
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
      if (game.offeredBy !== null && (game.phase === "double-offered" || game.phase === "beaver-offered"))
        cubeAction("take", otherSide(game.offeredBy));
    },
    drop: () => {
      if (game.offeredBy !== null && (game.phase === "double-offered" || game.phase === "beaver-offered"))
        cubeAction("drop", otherSide(game.offeredBy));
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
      else if (change.variant !== undefined || change.rules !== undefined)
        settings = settingsOf(change.variant ?? settings.variant.key, {
          ...(change.variant === undefined ? settings.rules : {}),
          ...change.rules,
        });
      match = newMatch(settings);
      recorder = new GameRecorder(settings, seed);
      recorder.startGame();
      lastOpening = null;
      counted = null;
      waitingForDice = false;
      setGame(startGame(match));
    },
    set: (changes) => {
      const {
        computer: nextComputer,
        language: nextLanguage,
        names: nextNames,
        sound: nextSound,
        ...nextLook
      } = changes;
      if ("sound" in changes) {
        sounds?.destroy();
        sounds = soundsFor(nextSound);
      }
      look = { ...look, ...nextLook };
      if (nextComputer !== undefined)
        computer = { white: nextComputer.white ?? null, black: nextComputer.black ?? null };
      if (nextLanguage !== undefined) language = nextLanguage;
      if (nextNames !== undefined) names = { ...nextNames };
      render();
      startComputer();
    },
    destroy: () => {
      gone = true;
      if (timer !== null) clearTimeout(timer);
      disconnectView();
      sounds?.destroy();
      host.replaceChildren();
      host.classList.remove("sugoroku-play");
      for (const key of ["drag", "phase", "turn", "over", "orientation", "selected", "cube", "need", "ready"])
        delete host.dataset[key];
    },
  };

  const viewHandle = attachSugorokuView({
    host,
    doc: document,
    page: view,
    boardBox,
    score,
    status,
    slotA,
    slotB,
    slotC,
    dragAllowed,
    say,
    nameOf,
    human,
    isComputer,
    spec,
    makeMove,
    game: () => game,
    match: () => match,
    settings: () => settings,
    look: () => look,
    waitingForDice: () => waitingForDice,
    lastOpening: () => lastOpening,
    followsPageLanguage: () => language === undefined,
    stopped: () => gone,
    actions: () => api,
  });
  render = viewHandle.render;
  resetPointer = viewHandle.resetPointer;
  disconnectView = viewHandle.disconnect;

  render();
  startComputer();
  return api;
}
