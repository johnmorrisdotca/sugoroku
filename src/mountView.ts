import { BAR, boardPoint } from "./board.ts";
import { drawSugoroku } from "./draw.ts";
import { canBeaver, canDouble, type GameResult, type GameState, legalMoves, turnIsPlayed } from "./game.ts";
import { boardSize, CHECKER } from "./geometry.ts";
import type { Match } from "./match.ts";
import type { SugorokuLook } from "./mount.ts";
import type { Move } from "./moves.ts";
import { diceToPlay } from "./plays.ts";
import type { Settings } from "./rules.ts";
import { otherSide, type Side, sideIndex } from "./side.ts";

/** What the three buttons can ask the mounted game to do. */
export type SugorokuPlayActions = {
  newMatch: () => void;
  nextGame: () => void;
  roll: () => void;
  take: () => void;
  drop: () => void;
  beaver: () => void;
  double: () => void;
  done: () => void;
  undo: () => void;
};

/** The drawing, the words, the buttons and the pointer. The game itself stays in `mountSugoroku`. */
export type SugorokuViewInput = {
  host: HTMLElement;
  doc: Document;
  page: Window & typeof globalThis;
  boardBox: HTMLElement;
  score: HTMLElement;
  status: HTMLElement;
  slotA: HTMLButtonElement;
  slotB: HTMLButtonElement;
  slotC: HTMLButtonElement;
  dragAllowed: boolean;
  say: (key: string, values?: Record<string, string | number>) => string;
  nameOf: (side: Side) => string;
  human: (side: Side) => boolean;
  isComputer: (side: Side) => boolean;
  spec: () => GameState["settings"]["variant"];
  makeMove: (step: { from: number; to: number }) => boolean;
  game: () => GameState;
  match: () => Match;
  settings: () => Settings;
  look: () => SugorokuLook;
  waitingForDice: () => boolean;
  lastOpening: () => readonly [number, number] | null;
  followsPageLanguage: () => boolean;
  /** The board has been taken down. */
  stopped: () => boolean;
  actions: () => SugorokuPlayActions;
};

export type SugorokuView = {
  render: () => void;
  /** Drop the selected point and any message, as a new position of the game does. */
  resetPointer: () => void;
  /** Listeners, the resize watch and a checker still being dragged. */
  disconnect: () => void;
};

/** Draw the board, keep the words and buttons up to date, and play by pointer. */
export function attachSugorokuView(input: SugorokuViewInput): SugorokuView {
  const host = input.host;
  const document = input.doc;
  const view = input.page;
  const boardBox = input.boardBox;
  const score = input.score;
  const status = input.status;
  const slotA = input.slotA;
  const slotB = input.slotB;
  const slotC = input.slotC;
  const dragAllowed = input.dragAllowed;
  const say = input.say;
  const nameOf = input.nameOf;
  const human = input.human;
  const isComputer = input.isComputer;
  const spec = input.spec;
  const makeMove = input.makeMove;

  let selected: number | null = null;
  let message: string | null = null;
  let portrait = false;

  function create<K extends keyof HTMLElementTagNameMap>(
    owner: Document,
    tag: K,
    className: string,
    text?: string,
  ): HTMLElementTagNameMap[K] {
    const element = owner.createElement(tag);
    element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  const hasCube = (): boolean => {
    const settings = input.settings();
    return settings.rules.cube && settings.rules.points !== 1;
  };

  /** Whose home board is at the bottom. */
  const viewSide = (): Side => {
    const look = input.look();
    if (look.view !== undefined && look.view !== "auto") return look.view;
    if (isComputer("white") && human("black")) return "black";
    return "white";
  };

  // Drawing.
  const diceShown = (): { side: Side; values: number[]; spent: boolean[] } | null => {
    const game = input.game();
    const lastOpening = input.lastOpening();
    if (game.phase === "opening") {
      return lastOpening === null
        ? null
        : { side: "white", values: [lastOpening[0], lastOpening[1]], spent: [false, false] };
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

  const legalNow = (): Move[] => {
    const game = input.game();
    return game.phase === "playing" && game.turn !== null && human(game.turn) ? legalMoves(game) : [];
  };

  const draw = (): string => {
    const game = input.game();
    const look = input.look();
    const moves = legalNow();
    const mover = game.turn;
    const sources = [...new Set(moves.map((move) => move.from))];
    const targets =
      selected === null ? [] : [...new Set(moves.filter((move) => move.from === selected).map((move) => move.to))];
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
  const diceText = (dice: readonly number[] | null): string =>
    dice === null ? "" : diceToPlay(spec(), dice).join(" ");
  const statusText = (): string => {
    const game = input.game();
    const match = input.match();
    const lastOpening = input.lastOpening();
    const waitingForDice = input.waitingForDice();
    if (message !== null) return message;
    const side = game.turn;
    if (game.phase === "opening")
      return waitingForDice
        ? say("waitingDice")
        : lastOpening !== null && lastOpening[0] === lastOpening[1]
          ? say("openingTie", { die: lastOpening[0] })
          : say("opening");
    if (game.phase === "over") {
      const result = game.result as GameResult;
      let line: string;
      if (result.winner === null) line = say("drawn");
      else if (result.how === "drop")
        line = say("wonDrop", { side: nameOf(result.winner), points: pointsText(result.points) });
      else if (result.how === "concede")
        line = say("wonConcede", { side: nameOf(result.winner), points: pointsText(result.points) });
      else
        line = say("wonBy", {
          side: nameOf(result.winner),
          kind: say(result.kind === "single" ? "singleGame" : result.kind),
          points: pointsText(result.points),
        });
      if (match.over)
        line += ` ${match.winner === null ? say("matchDrawn") : say("matchWon", { side: nameOf(match.winner), a: match.score[sideIndex(match.winner)], b: match.score[sideIndex(otherSide(match.winner))] })}`;
      return line;
    }
    if (side === null) return "";
    if (game.phase === "double-offered" || game.phase === "beaver-offered") {
      const offerer = game.offeredBy as Side;
      const value = game.phase === "double-offered" ? game.cube.value * 2 : game.cube.value * 4;
      const lose = pointsText(game.phase === "double-offered" ? game.cube.value : game.cube.value * 2);
      if (human(otherSide(offerer)))
        return say(game.phase === "double-offered" ? "answerDouble" : "answerBeaver", {
          side: nameOf(offerer),
          value,
          points: lose,
        });
      return say("thinking", { side: nameOf(otherSide(offerer)) });
    }
    if (game.phase === "before-roll") {
      if (isComputer(side)) return say("thinking", { side: nameOf(side) });
      return isComputer(otherSide(side)) ? say("toRollYou") : say("toRoll", { side: nameOf(side) });
    }
    if (isComputer(side) && game.moves.length === 0 && game.need.length > 0)
      return say("thinking", { side: nameOf(side) });
    if (game.plan.length === 0)
      return say(human(side) && isComputer(otherSide(side)) ? "noMoveYou" : "noMove", { side: nameOf(side) });
    if (turnIsPlayed(game))
      return human(side) ? say("played") : say("toPlay", { side: nameOf(side), dice: diceText(game.dice) });
    return human(side) && isComputer(otherSide(side))
      ? say("toPlayYou", { dice: diceText(game.dice) })
      : say("toPlay", { side: nameOf(side), dice: diceText(game.dice) });
  };
  const scoreText = (): string => {
    const settings = input.settings();
    const match = input.match();
    const game = input.game();
    const { rules } = settings;
    const parts = [
      say("score", { white: nameOf("white"), a: match.score[0], black: nameOf("black"), b: match.score[1] }),
      rules.points === 0 ? say("money") : say("matchTo", { points: rules.points }),
    ];
    if (game.crawford && game.phase !== "over") parts.push(say("crawford"));
    else if (hasCube())
      parts.push(
        game.cube.owner === null
          ? say("cubeMiddle")
          : say("cubeHeld", { value: game.cube.value, side: nameOf(game.cube.owner) }),
      );
    return parts.join(" · ");
  };

  /** What the three buttons say and do now. */
  type Slot = { text: string; enabled: boolean; run: () => void; primary?: boolean; attention?: boolean };
  const slots = (): [Slot, Slot, Slot] => {
    const game = input.game();
    const match = input.match();
    const waitingForDice = input.waitingForDice();
    const off: Slot = { text: "", enabled: false, run: () => undefined };
    const side = game.turn;
    const turnOfHuman = side !== null && human(side);
    if (game.phase === "over") {
      return [
        match.over
          ? { text: say("newMatch"), enabled: true, run: () => input.actions().newMatch(), primary: true }
          : { text: say("nextGame"), enabled: true, run: () => input.actions().nextGame(), primary: true },
        match.over ? off : { text: say("newMatch"), enabled: true, run: () => input.actions().newMatch() },
        off,
      ];
    }
    if (game.phase === "opening") {
      const nobody = isComputer("white") && isComputer("black");
      return [
        {
          text: say("rollOpening"),
          enabled: !nobody && !waitingForDice,
          run: () => input.actions().roll(),
          primary: true,
          attention: !nobody,
        },
        off,
        off,
      ];
    }
    if (game.phase === "double-offered" || game.phase === "beaver-offered") {
      const answerer = otherSide(game.offeredBy as Side);
      const mine = human(answerer);
      return [
        { text: say("take"), enabled: mine, run: () => input.actions().take(), primary: true, attention: mine },
        { text: say("drop"), enabled: mine, run: () => input.actions().drop() },
        { text: say("beaver"), enabled: mine && canBeaver(game), run: () => input.actions().beaver() },
      ];
    }
    if (game.phase === "before-roll") {
      return [
        {
          text: say("roll"),
          enabled: turnOfHuman && !waitingForDice,
          run: () => input.actions().roll(),
          primary: true,
          attention: turnOfHuman,
        },
        { text: say("double"), enabled: turnOfHuman && canDouble(game), run: () => input.actions().double() },
        { text: say("undo"), enabled: false, run: () => undefined },
      ];
    }
    const played = turnIsPlayed(game);
    return [
      {
        text: say("done"),
        enabled: turnOfHuman && played,
        run: () => input.actions().done(),
        primary: true,
        attention: turnOfHuman && played,
      },
      { text: say("double"), enabled: false, run: () => undefined },
      { text: say("undo"), enabled: turnOfHuman && game.moves.length > 0, run: () => input.actions().undo() },
    ];
  };

  let handlers: [() => void, () => void, () => void] = [() => undefined, () => undefined, () => undefined];
  const render = (): void => {
    const game = input.game();
    const look = input.look();
    if (input.stopped()) return;
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

  // Touch and mouse.
  const whereIs = (target: Element | null): number | null => {
    const game = input.game();
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

  let drag: { pointer: number; from: number; x: number; y: number; active: boolean; ghost: HTMLElement | null } | null =
    null;
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
    const game = input.game();
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
    const game = input.game();
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
    const game = input.game();
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
  const resize =
    typeof view.ResizeObserver === "undefined"
      ? null
      : new view.ResizeObserver(() => {
          const look = input.look();
          const wide =
            look.orientation === "portrait" || (look.orientation !== "landscape" && (host.clientWidth || 600) < 560);
          if (wide !== portrait) render();
        });
  resize?.observe(host);
  const watch =
    typeof view.MutationObserver === "undefined"
      ? null
      : new view.MutationObserver(() => {
          if (input.followsPageLanguage()) render();
        });
  watch?.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });

  const resetPointer = (): void => {
    selected = null;
    message = null;
  };
  const disconnect = (): void => {
    resize?.disconnect();
    watch?.disconnect();
    drag?.ghost?.remove();
  };
  return { render, resetPointer, disconnect };
}
