import type { Strength } from "./computer.ts";
import { STRENGTHS } from "./computer.ts";
import { SUGOROKU_BOARD_NAMES, SUGOROKU_CHECKER_SET_NAMES, type SugorokuBoardName, type SugorokuCheckerSetName } from "./colours.ts";
import type { GameState } from "./game.ts";
import type { Match } from "./match.ts";
import { mountSugoroku, type SugorokuMount } from "./mount.ts";
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
const ElementBase: typeof HTMLElement = typeof HTMLElement === "undefined" ? (class {} as unknown as typeof HTMLElement) : HTMLElement;

const isOn = (value: string | null): boolean => value !== null && !["false", "off", "0", "no"].includes(value.toLowerCase());
const oneOf = <T extends string>(value: string | null, allowed: readonly T[]): T | undefined => (allowed.includes(value as T) ? (value as T) : undefined);

/** The attributes that name the game: changing one starts a new match. */
const GAME_ATTRIBUTES = ["variant", "preset", "points", "cube", "crawford", "jacoby", "beaver", "gammons", "seed", "dice", "controls", "drag", "auto-end", "sound", "computer-delay"] as const;

export class SugorokuBoard extends ElementBase {
  static observedAttributes = [...GAME_ATTRIBUTES, "white", "black", "board", "checkers", "theme", "home", "view", "numbers", "orientation", "lang"];

  #mount: SugorokuMount | null = null;
  #key = "";
  #queued = false;

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
      this.#refresh();
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

  beaver(): void {
    this.#mount?.beaver();
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

  #side(name: "white" | "black"): Strength | null {
    return oneOf<Strength>(this.getAttribute(name), STRENGTHS) ?? null;
  }

  #look(): Parameters<SugorokuMount["set"]>[0] {
    const view = this.getAttribute("view");
    const language = oneOf(this.getAttribute("lang"), ["en", "ja"] as const);
    return {
      board: oneOf<SugorokuBoardName>(this.getAttribute("board"), SUGOROKU_BOARD_NAMES),
      checkers: oneOf<SugorokuCheckerSetName>(this.getAttribute("checkers"), SUGOROKU_CHECKER_SET_NAMES),
      theme: oneOf(this.getAttribute("theme"), ["auto", "light", "dark"] as const),
      home: oneOf(this.getAttribute("home"), ["left", "right"] as const),
      view: view === "white" || view === "black" || view === "auto" ? (view as Side | "auto") : undefined,
      numbers: isOn(this.getAttribute("numbers")),
      orientation: oneOf(this.getAttribute("orientation"), ["auto", "landscape", "portrait"] as const),
      computer: { white: this.#side("white"), black: this.#side("black") },
      language,
    };
  }

  #refresh(): void {
    const key = JSON.stringify(GAME_ATTRIBUTES.map((name) => this.getAttribute(name)));
    if (key === this.#key && this.#mount !== null) {
      this.#mount.set(this.#look());
      return;
    }
    this.#mount?.destroy();
    this.#key = key;
    const variant = this.getAttribute("variant");
    const rules: Partial<Rules> = {};
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
      variant: isVariantKey(variant) ? (variant as VariantKey) : undefined,
      rules,
      preset: this.getAttribute("preset") ?? undefined,
      seed: seed === null ? undefined : /^\d+$/.test(seed) ? Number(seed) : seed,
      dice: this.getAttribute("dice") === "host" ? "host" : "button",
      controls: isOn(this.getAttribute("controls") ?? "on"),
      drag: isOn(this.getAttribute("drag") ?? "on"),
      autoEnd: isOn(this.getAttribute("auto-end")),
      sound: sound !== null && isOn(sound === "" ? "on" : sound),
      computerDelay: delay !== null && /^\d+$/.test(delay) ? Number(delay) : undefined,
      ...this.#look(),
    });
  }
}
