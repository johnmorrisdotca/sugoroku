import { type Position, startPosition } from "./board.ts";
import { SUGOROKU_BOARD_NAMES, SUGOROKU_CHECKER_SET_NAMES } from "./colours.ts";
import { drawSugoroku, type SugorokuDrawOptions } from "./draw.ts";
import { isOn, oneOf, SugorokuFrame } from "./elementFrame.ts";
import { positionFromId } from "./positionId.ts";
import type { Side } from "./side.ts";
import { isVariantKey, VARIANTS, type VariantKey } from "./variants.ts";

/**
 * Reads a GNU position ID or bounded JSON position; null means invalid counts or input.
 * @param text - Position ID, JSON position, or null for the variant's start.
 * @param variant - The native variant used for checker counts and layout.
 * @param turn - The on-roll side encoded by a GNU ID.
 * @returns A complete position, or null for malformed or inconsistent input.
 * @example
 * ```ts
 * import { readEmbedPosition } from "@johnmorrisdotca/sugoroku/element";
 * console.log(readEmbedPosition("4HPwATDgc/ABMA")?.points[0].length);
 * ```
 */
export function readEmbedPosition(
  text: string | null,
  variant: VariantKey = "backgammon",
  turn: Side = "white",
): Position | null {
  if (!isVariantKey(variant) || (turn !== "white" && turn !== "black")) return null;
  const spec = VARIANTS[variant];
  if (text === null) return startPosition(spec);
  if (text.length > 10000) return null;
  if (text.trim() === "") return startPosition(spec);
  if (/^[A-Za-z0-9+/]{14}$/.test(text.trim())) return positionFromId(text.trim(), turn, spec.checkers);
  try {
    const data = JSON.parse(text) as Position;
    const count = (value: unknown): value is number =>
      Number.isInteger(value) && Number(value) >= 0 && Number(value) <= spec.checkers;
    const pair = (value: unknown): boolean => Array.isArray(value) && value.length === 2 && value.every(count);
    if (
      data === null ||
      typeof data !== "object" ||
      !Array.isArray(data.points) ||
      data.points.length !== 2 ||
      !data.points.every((row) => Array.isArray(row) && row.length === 24 && row.every(count)) ||
      !pair(data.bar) ||
      !pair(data.off) ||
      !pair(data.reserve)
    )
      return null;
    for (const side of [0, 1] as const)
      if (
        data.points[side].reduce((sum, n) => sum + n, 0) + data.bar[side] + data.off[side] + data.reserve[side] !==
        spec.checkers
      )
        return null;
    return {
      points: [[...data.points[0]], [...data.points[1]]],
      bar: [data.bar[0], data.bar[1]],
      off: [data.off[0], data.off[1]],
      reserve: [data.reserve[0], data.reserve[1]],
    };
  } catch {
    return null;
  }
}
/** Host data and all native SVG drawing choices for a position.
 * @example
 * ```ts
 * import type { SugorokuPositionOptions } from "@johnmorrisdotca/sugoroku/element";
 * const options: SugorokuPositionOptions = {};
 * console.log(Object.keys(options).length); // 0
 * ```
 */
export type SugorokuPositionOptions = SugorokuDrawOptions & {
  position?: Position;
  onChange?: (position: Position) => void;
};
/** Native draw keys, checked by the shared builder.
 * @example
 * ```ts
 * import { SUGOROKU_DRAW_OPTION_KEYS } from "@johnmorrisdotca/sugoroku/element";
 * console.log(typeof SUGOROKU_DRAW_OPTION_KEYS); // object
 * ```
 */
export const SUGOROKU_DRAW_OPTION_KEYS = Object.keys({
  variant: true,
  view: true,
  home: true,
  orientation: true,
  numbers: true,
  board: true,
  checkers: true,
  colours: true,
  theme: true,
  dice: true,
  cube: true,
  highlight: true,
  label: true,
  style: true,
} satisfies Record<keyof SugorokuDrawOptions, boolean>);
/** All host position options, checked by the builder.
 * @example
 * ```ts
 * import { SUGOROKU_POSITION_OPTION_KEYS } from "@johnmorrisdotca/sugoroku/element";
 * console.log(typeof SUGOROKU_POSITION_OPTION_KEYS); // object
 * ```
 */
export const SUGOROKU_POSITION_OPTION_KEYS = Object.keys({
  position: true,
  onChange: true,
  variant: true,
  view: true,
  home: true,
  orientation: true,
  numbers: true,
  board: true,
  checkers: true,
  colours: true,
  theme: true,
  dice: true,
  cube: true,
  highlight: true,
  label: true,
  style: true,
} satisfies Record<keyof SugorokuPositionOptions, boolean>);
/** A read-only backgammon position, drawn by the native SVG writer.
 * @example
 * ```ts
 * import { SugorokuPosition } from "@johnmorrisdotca/sugoroku/element";
 * console.log(SugorokuPosition.observedAttributes.includes("lang")); // true
 * ```
 */
export class SugorokuPosition extends SugorokuFrame {
  static observedAttributes = [
    "position",
    "variant",
    "turn",
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
  #value: Position | null = null;
  #options: SugorokuPositionOptions = {};
  #resize: ResizeObserver | null = null;
  /** Structured current position, or null after an input error. */
  get value(): Position | null {
    return this.#value;
  }
  /** Native drawing options and trusted host position data. */
  get options(): SugorokuPositionOptions {
    return this.#options;
  }
  set options(value: SugorokuPositionOptions) {
    this.#options = value ?? {};
    if (this.isConnected) this.#render();
  }
  connectedCallback(): void {
    this.#render();
    const Resize = this.ownerDocument.defaultView?.ResizeObserver;
    if (Resize !== undefined) {
      this.#resize = new Resize(() => {
        if (this.isConnected) this.#render();
      });
      this.#resize.observe(this);
    }
  }
  disconnectedCallback(): void {
    this.#resize?.disconnect();
    this.#resize = null;
  }
  attributeChangedCallback(): void {
    if (this.isConnected) this.#render();
  }
  /** Position ID or JSON, reflected. Assign an object to serialize it. */
  get position(): string | null {
    return this.getAttribute("position");
  }
  set position(value: string | Position | null) {
    this.write("position", value !== null && typeof value === "object" ? JSON.stringify(value) : value);
  }
  /** The `variant` attribute, reflected. */
  get variant(): string | null {
    return this.getAttribute("variant");
  }
  set variant(value: string | number | boolean | null | undefined) {
    this.write("variant", value);
  }
  /** The `turn` attribute, reflected. */
  get turn(): string | null {
    return this.getAttribute("turn");
  }
  set turn(value: string | number | boolean | null | undefined) {
    this.write("turn", value);
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
  #render(): void {
    this.frame();
    try {
      const variant =
        this.getAttribute("variant") ??
        (typeof this.#options.variant === "string" ? this.#options.variant : "backgammon");
      if (!isVariantKey(variant)) throw new RangeError("Choose a known backgammon variant.");
      const turn = this.getAttribute("turn") ?? "white";
      if (turn !== "white" && turn !== "black") throw new RangeError("Choose white or black on roll.");
      const position = this.hasAttribute("position")
        ? readEmbedPosition(this.getAttribute("position"), variant, turn)
        : (this.#options.position ?? startPosition(VARIANTS[variant]));
      if (position === null) throw new RangeError("Use a valid GNU position ID or complete JSON position.");
      this.#value = position;
      const orientation = this.getAttribute("orientation") ?? this.#options.orientation;
      const draw = {
        ...this.#options,
        variant: this.hasAttribute("variant") ? variant : (this.#options.variant ?? variant),
        theme: oneOf(this.getAttribute("theme"), ["auto", "light", "dark"] as const) ?? this.#options.theme,
        board: oneOf(this.getAttribute("board"), SUGOROKU_BOARD_NAMES) ?? this.#options.board,
        checkers: oneOf(this.getAttribute("checkers"), SUGOROKU_CHECKER_SET_NAMES) ?? this.#options.checkers,
        home: oneOf(this.getAttribute("home"), ["left", "right"] as const) ?? this.#options.home,
        view: oneOf(this.getAttribute("view"), ["white", "black"] as const) ?? this.#options.view,
        numbers: isOn(this.getAttribute("numbers"), this.#options.numbers ?? false),
        orientation:
          orientation === "portrait" || (orientation !== "landscape" && (this.clientWidth || 600) < 560)
            ? ("portrait" as const)
            : ("landscape" as const),
        label:
          this.getAttribute("label") ??
          this.#options.label ??
          ((this.getAttribute("lang") ?? this.ownerDocument.documentElement.lang) === "ja" ? "双六の局面" : undefined),
        style: this.#options.style ?? true,
      };
      const svg = new DOMParser().parseFromString(drawSugoroku(position, draw), "image/svg+xml").documentElement;
      this.replaceChildren(this.ownerDocument.importNode(svg, true));
      this.#options.onChange?.(position);
      const detail = JSON.parse(JSON.stringify({ variant, position }));
      this.dispatchEvent(new CustomEvent("sugoroku-change", { bubbles: true, composed: true, detail }));
      this.dispatchEvent(new CustomEvent("sugoroku-load", { bubbles: true, composed: true, detail }));
    } catch (error) {
      this.#value = null;
      const message = error instanceof Error ? error.message : String(error);
      const status = this.ownerDocument.createElement("p");
      status.setAttribute("role", "status");
      status.textContent = message;
      this.replaceChildren(status);
      this.dispatchEvent(new CustomEvent("sugoroku-error", { bubbles: true, composed: true, detail: { message } }));
    }
  }
}
/** Defines a static position, or a subclass under a host's tag. Safe on a server.
 * @param tagName - The custom tag name; omitted to use the package default.
 * @param registry - The custom-element registry; omitted outside a browser.
 * @returns Nothing; existing definitions and server imports remain safe.
 * @example
 * ```ts
 * import { definePosition } from "@johnmorrisdotca/sugoroku/element";
 * definePosition();
 * console.log(typeof definePosition); // function
 * ```
 */
export function definePosition(
  tagName = "sugoroku-position",
  registry: CustomElementRegistry | undefined = typeof customElements === "undefined" ? undefined : customElements,
): void {
  if (registry !== undefined && registry.get(tagName) === undefined)
    registry.define(tagName, tagName === "sugoroku-position" ? SugorokuPosition : class extends SugorokuPosition {});
}
