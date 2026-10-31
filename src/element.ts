import {
  SUGOROKU_BOARD_NAMES,
  SUGOROKU_CHECKER_SET_NAMES,
  type SugorokuBoardName,
  type SugorokuCheckerSetName,
} from "./colours.ts";
import type { Strength } from "./computer.ts";
import { STRENGTHS } from "./computer.ts";
import { GAME_ATTRIBUTES, isOn, oneOf, SugorokuFrame } from "./elementFrame.ts";
import type { GameState } from "./game.ts";
import type { Match } from "./match.ts";
import { mountSugoroku, type SugorokuMount, type SugorokuMountOptions } from "./mount.ts";
import type { Rules } from "./rules.ts";
import type { Side } from "./side.ts";
import { isVariantKey, type VariantKey } from "./variants.ts";

/**
 * THE `<sugoroku-board>` ELEMENT: a playable backgammon board in a tag, with no
 * framework. `@johnmorrisdotca/sugoroku/element/define` defines it; this entry
 * holds the class alone, to extend or to define under another name. Safe to
 * import on a server, where there is no page: the class then extends nothing.
 *
 * ```html
 * <sugoroku-board variant="nackgammon" points="5" cube black="strong"></sugoroku-board>
 * <sugoroku-board preset="backgammon-3" seed="2026" board="wood" numbers></sugoroku-board>
 * ```
 *
 * Attributes (each is read again when it changes):
 *  - the game: `variant` (`backgammon`, `backgammon-race`, `anti-backgammon`, `nackgammon`, `long-gammon`,
 *    `hypergammon` or `tabula`) and the rules `points`, `cube`, `crawford`, `jacoby`, `beaver` and `gammons`; or
 *    `preset`, a named way of playing such as `backgammon-5`. Changing any of them starts a new match.
 *  - `seed`: dice from a seed. `dice="host"`: the page gives the dice, with the `roll` method.
 *  - `white` and `black`: `random`, `greedy`, `careful` or `strong` for a side the computer plays; left out, a person plays it.
 *  - `board`: `green` (default), `blue`, `red`, `black` or `wood`. `checkers`: `classic`, `red-and-white`, `gold-and-blue` or `contrast`.
 *    `theme`: `auto`, `light` or `dark`. `home`: `left` or `right`. `view`: `white`, `black` or `auto`. `numbers`: numbers on the points.
 *    `orientation`: `auto`, `landscape` or `portrait`.
 *  - `controls="off"`: only the board. `drag="off"`: tap only. `auto-end`: end a turn when it is played out. `sound`: the dice and checkers
 *    make their sounds. `computer-delay`: milliseconds between what the computer does. `lang`: `en` or `ja`, or the page's.
 *
 * It fires `sugoroku-roll`, `sugoroku-move`, `sugoroku-turn`, `sugoroku-cube`, `sugoroku-end` and `sugoroku-need-dice` (see
 * `mountSugoroku`), and has the methods of the mount (`roll`, `move`, `undo`, `done`, `double`, `take`, `drop`, `beaver`, `resign`,
 * `nextGame`, `newMatch`, `record`) and the properties `game` and `match`. Nothing in it can be selected, and its box stays
 * one steady shape whatever is on the board.
 */
/** The real mounted options, checked alongside builder coverage.
 * @example
 * ```ts
 * import { SUGOROKU_EMBED_OPTION_KEYS } from "@johnmorrisdotca/sugoroku/element";
 * console.log(typeof SUGOROKU_EMBED_OPTION_KEYS); // object
 * ```
 */
export const SUGOROKU_EMBED_OPTION_KEYS = Object.keys({
  board: true,
  checkers: true,
  colours: true,
  theme: true,
  home: true,
  view: true,
  numbers: true,
  orientation: true,
  variant: true,
  rules: true,
  preset: true,
  seed: true,
  dice: true,
  computer: true,
  computerDelay: true,
  controls: true,
  drag: true,
  autoEnd: true,
  language: true,
  names: true,
  sound: true,
  match: true,
  onRoll: true,
  onMove: true,
  onTurn: true,
  onCube: true,
  onEnd: true,
} satisfies Record<keyof SugorokuMountOptions, boolean>);
/** Host mount options, including custom colours, names, a match and callbacks.
 * @example
 * ```ts
 * import type { SugorokuElementOptions } from "@johnmorrisdotca/sugoroku/element";
 * const options: SugorokuElementOptions = {};
 * console.log(Object.keys(options).length); // 0
 * ```
 */
export type SugorokuElementOptions = SugorokuMountOptions;

/** Native custom element with reflected setup and presentation.
 * @example
 * ```ts
 * import { SugorokuBoard } from "@johnmorrisdotca/sugoroku/element";
 * console.log(SugorokuBoard.observedAttributes.includes("lang")); // true
 * ```
 */
export class SugorokuBoard extends SugorokuFrame {
  static observedAttributes = [
    ...GAME_ATTRIBUTES,
    "white",
    "black",
    "board",
    "checkers",
    "theme",
    "home",
    "view",
    "numbers",
    "orientation",
    "lang",
    "size",
    "width",
    "label",
  ];

  #mount: SugorokuMount | null = null;
  #key = "";
  #queued = false;
  #options: SugorokuElementOptions = {};
  /** Host mount options; callback and look changes preserve the current game. */
  get options(): SugorokuElementOptions {
    return this.#options;
  }
  set options(value: SugorokuElementOptions) {
    this.#options = value ?? {};
    if (this.isConnected) this.#refresh();
  }

  connectedCallback(): void {
    this.#refresh();
  }

  disconnectedCallback(): void {
    this.#mount?.destroy();
    this.#mount = null;
    this.#key = "";
  }

  attributeChangedCallback(): void {
    if (!this.isConnected || this.#queued) return;
    this.#queued = true;
    queueMicrotask(() => {
      this.#queued = false;
      if (this.isConnected) this.#refresh();
    });
  }

  /** The mounted board's handle (`mountSugoroku`), or null while it is not on a page. */
  get mount(): SugorokuMount | null {
    return this.#mount;
  }

  get game(): GameState | null {
    return this.#mount?.game() ?? null;
  }

  get match(): Match | null {
    return this.#mount?.match() ?? null;
  }

  record(): string {
    return this.#mount?.record() ?? "";
  }

  roll(dice?: readonly number[]): void {
    this.#mount?.roll(dice);
  }

  move(from: number, to: number): boolean {
    return this.#mount?.move(from, to) ?? false;
  }

  undo(): void {
    this.#mount?.undo();
  }

  done(): void {
    this.#mount?.done();
  }

  double(): void {
    this.#mount?.double();
  }

  take(): void {
    this.#mount?.take();
  }

  drop(): void {
    this.#mount?.drop();
  }

  /** Calling beaver() keeps the native action; assignment reflects the rule attribute. */
  get beaver(): () => void {
    return () => this.#mount?.beaver();
  }
  set beaver(value: string | boolean | (() => void)) {
    if (typeof value !== "function") this.write("beaver", value);
  }

  resign(): void {
    this.#mount?.resign();
  }

  nextGame(): void {
    this.#mount?.nextGame();
  }

  newMatch(): void {
    this.#mount?.newMatch();
  }

  /** The `variant` attribute, reflected. */
  get variant(): string | null {
    return this.getAttribute("variant");
  }
  set variant(value: string | number | boolean | null | undefined) {
    this.write("variant", value);
  }
  /** The `preset` attribute, reflected. */
  get preset(): string | null {
    return this.getAttribute("preset");
  }
  set preset(value: string | number | boolean | null | undefined) {
    this.write("preset", value);
  }
  /** The `points` attribute, reflected. */
  get points(): string | null {
    return this.getAttribute("points");
  }
  set points(value: string | number | boolean | null | undefined) {
    this.write("points", value);
  }
  /** The `cube` attribute, reflected. */
  get cube(): string | null {
    return this.getAttribute("cube");
  }
  set cube(value: string | number | boolean | null | undefined) {
    this.write("cube", value);
  }
  /** The `crawford` attribute, reflected. */
  get crawford(): string | null {
    return this.getAttribute("crawford");
  }
  set crawford(value: string | number | boolean | null | undefined) {
    this.write("crawford", value);
  }
  /** The `jacoby` attribute, reflected. */
  get jacoby(): string | null {
    return this.getAttribute("jacoby");
  }
  set jacoby(value: string | number | boolean | null | undefined) {
    this.write("jacoby", value);
  }
  /** The `gammons` attribute, reflected. */
  get gammons(): string | null {
    return this.getAttribute("gammons");
  }
  set gammons(value: string | number | boolean | null | undefined) {
    this.write("gammons", value);
  }
  /** The `seed` attribute, reflected. */
  get seed(): string | null {
    return this.getAttribute("seed");
  }
  set seed(value: string | number | boolean | null | undefined) {
    this.write("seed", value);
  }
  /** The `dice` attribute, reflected. */
  get dice(): string | null {
    return this.getAttribute("dice");
  }
  set dice(value: string | number | boolean | null | undefined) {
    this.write("dice", value);
  }
  /** The `controls` attribute, reflected. */
  get controls(): string | null {
    return this.getAttribute("controls");
  }
  set controls(value: string | number | boolean | null | undefined) {
    this.write("controls", value);
  }
  /** The `drag` attribute, reflected. */
  get drag(): string | null {
    return this.getAttribute("drag");
  }
  set drag(value: string | number | boolean | null | undefined) {
    this.write("drag", value);
  }
  /** The `auto-end` attribute, reflected. */
  get autoEnd(): string | null {
    return this.getAttribute("auto-end");
  }
  set autoEnd(value: string | number | boolean | null | undefined) {
    this.write("auto-end", value);
  }
  /** The `sound` attribute, reflected. */
  get sound(): string | null {
    return this.getAttribute("sound");
  }
  set sound(value: string | number | boolean | null | undefined) {
    this.write("sound", value);
  }
  /** The `computer-delay` attribute, reflected. */
  get computerDelay(): string | null {
    return this.getAttribute("computer-delay");
  }
  set computerDelay(value: string | number | boolean | null | undefined) {
    this.write("computer-delay", value);
  }
  /** The `white` attribute, reflected. */
  get white(): string | null {
    return this.getAttribute("white");
  }
  set white(value: string | number | boolean | null | undefined) {
    this.write("white", value);
  }
  /** The `black` attribute, reflected. */
  get black(): string | null {
    return this.getAttribute("black");
  }
  set black(value: string | number | boolean | null | undefined) {
    this.write("black", value);
  }
  /** The `board` attribute, reflected. */
  get board(): string | null {
    return this.getAttribute("board");
  }
  set board(value: string | number | boolean | null | undefined) {
    this.write("board", value);
  }
  /** The `checkers` attribute, reflected. */
  get checkers(): string | null {
    return this.getAttribute("checkers");
  }
  set checkers(value: string | number | boolean | null | undefined) {
    this.write("checkers", value);
  }
  /** The `theme` attribute, reflected. */
  get theme(): string | null {
    return this.getAttribute("theme");
  }
  set theme(value: string | number | boolean | null | undefined) {
    this.write("theme", value);
  }
  /** The `home` attribute, reflected. */
  get home(): string | null {
    return this.getAttribute("home");
  }
  set home(value: string | number | boolean | null | undefined) {
    this.write("home", value);
  }
  /** The `view` attribute, reflected. */
  get view(): string | null {
    return this.getAttribute("view");
  }
  set view(value: string | number | boolean | null | undefined) {
    this.write("view", value);
  }
  /** The `numbers` attribute, reflected. */
  get numbers(): string | null {
    return this.getAttribute("numbers");
  }
  set numbers(value: string | number | boolean | null | undefined) {
    this.write("numbers", value);
  }
  /** The `orientation` attribute, reflected. */
  get orientation(): string | null {
    return this.getAttribute("orientation");
  }
  set orientation(value: string | number | boolean | null | undefined) {
    this.write("orientation", value);
  }
  #side(name: "white" | "black"): Strength | null {
    const value = this.getAttribute(name);
    return value === null ? (this.#options.computer?.[name] ?? null) : (oneOf<Strength>(value, STRENGTHS) ?? null);
  }

  #look(): Parameters<SugorokuMount["set"]>[0] {
    const view = this.getAttribute("view");
    const language = oneOf(this.getAttribute("lang"), ["en", "ja"] as const) ?? this.#options.language;
    return {
      board: oneOf<SugorokuBoardName>(this.getAttribute("board"), SUGOROKU_BOARD_NAMES) ?? this.#options.board,
      checkers:
        oneOf<SugorokuCheckerSetName>(this.getAttribute("checkers"), SUGOROKU_CHECKER_SET_NAMES) ??
        this.#options.checkers,
      theme: oneOf(this.getAttribute("theme"), ["auto", "light", "dark"] as const) ?? this.#options.theme,
      home: oneOf(this.getAttribute("home"), ["left", "right"] as const) ?? this.#options.home,
      view: view === "white" || view === "black" || view === "auto" ? (view as Side | "auto") : this.#options.view,
      numbers: isOn(this.getAttribute("numbers"), this.#options.numbers ?? false),
      orientation:
        oneOf(this.getAttribute("orientation"), ["auto", "landscape", "portrait"] as const) ??
        this.#options.orientation,
      computer: { white: this.#side("white"), black: this.#side("black") },
      language,
      colours: this.#options.colours,
    };
  }

  #refresh(): void {
    this.frame();
    const key = JSON.stringify([
      GAME_ATTRIBUTES.map((name) => this.getAttribute(name)),
      ...["variant", "rules", "preset", "seed", "dice", "controls", "drag", "autoEnd", "computerDelay", "match"].map(
        (name) => this.#options[name as keyof SugorokuMountOptions],
      ),
    ]);
    if (key === this.#key && this.#mount !== null) {
      this.#mount.set({
        ...this.#look(),
        names: this.#options.names,
        sound: this.hasAttribute("sound") ? isOn(this.getAttribute("sound")) : this.#options.sound,
      });
      return;
    }
    this.#mount?.destroy();
    this.#mount = null;
    this.#key = "";
    try {
      const variant = this.getAttribute("variant");
      const rules: Partial<Rules> = { ...this.#options.rules };
      const points = this.getAttribute("points");
      if (points !== null && /^\d+$/.test(points)) rules.points = Number(points);
      for (const name of ["cube", "crawford", "jacoby", "beaver", "gammons"] as const) {
        const value = this.getAttribute(name);
        if (value !== null) rules[name] = isOn(value);
      }
      const seed = this.getAttribute("seed");
      const delay = this.getAttribute("computer-delay");
      const sound = this.getAttribute("sound");
      this.#mount = mountSugoroku(this, {
        ...this.#options,
        variant: isVariantKey(variant) ? (variant as VariantKey) : this.#options.variant,
        rules,
        preset: this.getAttribute("preset") ?? this.#options.preset,
        seed: seed === null ? this.#options.seed : /^\d+$/.test(seed) ? Number(seed) : seed,
        dice:
          this.getAttribute("dice") === "host"
            ? "host"
            : this.getAttribute("dice") === "button"
              ? "button"
              : (this.#options.dice ?? "button"),
        controls: isOn(this.getAttribute("controls"), this.#options.controls ?? true),
        drag: isOn(this.getAttribute("drag"), this.#options.drag ?? true),
        autoEnd: isOn(this.getAttribute("auto-end"), this.#options.autoEnd ?? false),
        sound: sound === null ? this.#options.sound : isOn(sound === "" ? "on" : sound),
        computerDelay: delay !== null && /^\d+$/.test(delay) ? Number(delay) : this.#options.computerDelay,
        ...this.#look(),
        onRoll: (detail) => this.#options.onRoll?.(detail),
        onMove: (detail) => this.#options.onMove?.(detail),
        onTurn: (detail) => this.#options.onTurn?.(detail),
        onCube: (detail) => this.#options.onCube?.(detail),
        onEnd: (detail) => this.#options.onEnd?.(detail),
      });
      this.#key = key;
      this.frame();
      this.dispatchEvent(
        new CustomEvent("sugoroku-load", {
          bubbles: true,
          composed: true,
          detail: JSON.parse(JSON.stringify({ game: this.game, match: this.match })),
        }),
      );
    } catch (error) {
      this.#mount?.destroy();
      this.#mount = null;
      this.#key = "";
      const message = error instanceof Error ? error.message : String(error);
      const status = this.ownerDocument.createElement("p");
      status.setAttribute("role", "status");
      status.textContent = message;
      this.replaceChildren(status);
      this.dispatchEvent(new CustomEvent("sugoroku-error", { bubbles: true, composed: true, detail: { message } }));
    }
  }
}

/** Defines the default playable board, or a subclass under a custom tag. Server-safe and idempotent.
 * @param tagName - The custom tag name; omitted to use the package default.
 * @param registry - The custom-element registry; omitted outside a browser.
 * @returns Nothing; existing definitions and server imports remain safe.
 * @example
 * ```ts
 * import { defineBoard } from "@johnmorrisdotca/sugoroku/element";
 * defineBoard();
 * console.log(typeof defineBoard); // function
 * ```
 */
export function defineBoard(
  tagName = "sugoroku-board",
  registry: CustomElementRegistry | undefined = typeof customElements === "undefined" ? undefined : customElements,
): void {
  if (registry !== undefined && registry.get(tagName) === undefined)
    registry.define(tagName, tagName === "sugoroku-board" ? SugorokuBoard : class extends SugorokuBoard {});
}
export type { SugorokuPositionOptions } from "./positionElement.ts";
export {
  definePosition,
  readEmbedPosition,
  SUGOROKU_DRAW_OPTION_KEYS,
  SUGOROKU_POSITION_OPTION_KEYS,
  SugorokuPosition,
} from "./positionElement.ts";
