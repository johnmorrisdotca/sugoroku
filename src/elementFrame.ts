import { SUGOROKU_STYLE } from "./style.ts";

/** The shared frame of `<sugoroku-board>` and `<sugoroku-position>`: size, width, label and the dark-theme rule. */

const ElementBase: typeof HTMLElement =
  typeof HTMLElement === "undefined" ? (class {} as unknown as typeof HTMLElement) : HTMLElement;

export const isOn = (value: string | null, fallback = false): boolean =>
  value === null ? fallback : !["false", "off", "0", "no"].includes(value.trim().toLowerCase());
export const oneOf = <T extends string>(value: string | null, allowed: readonly T[]): T | undefined =>
  allowed.includes(value as T) ? (value as T) : undefined;

/** The attributes that name the game: changing one starts a new match. */
export const GAME_ATTRIBUTES = [
  "variant",
  "preset",
  "points",
  "cube",
  "crawford",
  "jacoby",
  "beaver",
  "gammons",
  "seed",
  "dice",
  "controls",
  "drag",
  "auto-end",
  "sound",
  "computer-delay",
] as const;

export class SugorokuFrame extends ElementBase {
  #widthBefore: string | null = null;
  #widthOwned = false;
  #labelBefore: { role: string | null; label: string | null } | null = null;
  protected frame(): void {
    this.style.display = "block";
    this.style.maxWidth = "100%";
    const width = Number(this.getAttribute("width"));
    const size = this.getAttribute("size");
    const pixels =
      this.hasAttribute("width") && width > 0 && Number.isFinite(width)
        ? Math.min(width, 2000)
        : size === "small"
          ? 320
          : size === "medium"
            ? 480
            : size === "large"
              ? 640
              : null;
    if (pixels !== null) {
      if (!this.#widthOwned) this.#widthBefore = this.style.width;
      this.#widthOwned = true;
      this.style.width = `${pixels}px`;
    } else if (this.#widthOwned) {
      this.style.width = this.#widthBefore ?? "";
      this.#widthOwned = false;
    }
    const theme = this.getAttribute("theme");
    this.style.colorScheme = theme === "light" || theme === "dark" ? theme : "light dark";
    this.setAttribute("data-sugoroku-embed", "");
    const root = this.getRootNode();
    const target: ParentNode =
      typeof ShadowRoot !== "undefined" && root instanceof ShadowRoot ? root : this.ownerDocument.head;
    if (target.querySelector("style[data-sugoroku-embed-style]") === null) {
      const style = this.ownerDocument.createElement("style");
      style.setAttribute("data-sugoroku-embed-style", "");
      const palette = SUGOROKU_STYLE.match(/\.sugoroku\[data-theme="dark"\] \{([^}]+)\}/)?.[1] ?? "";
      style.textContent = `@media(prefers-color-scheme:dark){[data-sugoroku-embed] .sugoroku:not([data-theme="light"]){${palette}}}`;
      target.append(style);
    }
    if (this.hasAttribute("label")) {
      this.#labelBefore ??= { role: this.getAttribute("role"), label: this.getAttribute("aria-label") };
      this.setAttribute("role", "group");
      this.setAttribute("aria-label", this.getAttribute("label")!);
    } else if (this.#labelBefore !== null) {
      for (const [name, value] of [
        ["role", this.#labelBefore.role],
        ["aria-label", this.#labelBefore.label],
      ]) {
        if (value === null) this.removeAttribute(name!);
        else this.setAttribute(name!, value!);
      }
      this.#labelBefore = null;
    }
  }
  protected write(name: string, value: unknown): void {
    if (value === null || value === undefined) this.removeAttribute(name);
    else this.setAttribute(name, String(value));
  }
  /** Symbolic display size, reflected. */
  get size(): string | null {
    return this.getAttribute("size");
  }
  set size(value: string | null) {
    this.write("size", value);
  }
  /** Pixel display width, reflected. */
  get width(): string | null {
    return this.getAttribute("width");
  }
  set width(value: string | number | null) {
    this.write("width", value);
  }
  /** Spoken group label, reflected. */
  get label(): string | null {
    return this.getAttribute("label");
  }
  set label(value: string | null) {
    this.write("label", value);
  }
}
