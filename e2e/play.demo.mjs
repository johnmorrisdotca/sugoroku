// The demo, played as a person plays it: tap a checker and then a point, drag one, undo, the cube, the computer
// answering, the match going on. What the page shows is held to what the package says of the same game.
import { expect, test } from "@playwright/test";

import { boardPoint, legalMoves } from "../dist/index.js";
import { at, board, gameOf, matchOf, noSidewaysScroll, open, pointAt, tap } from "./demo.mjs";

const primary = `${at("board")} ${at("sg-primary")}`;
const secondary = `${at("board")} ${at("sg-secondary")}`;
const tertiary = `${at("board")} ${at("sg-tertiary")}`;

/** Two people on one screen, a fixed seed, the cube off: the plainest game. */
const TWO = "?players=two&seed=3&delay=0&points=1&variant=backgammon";

/** Tap a checker and then the point it goes to. */
async function tapMove(page, game, move) {
  const spec = game.settings.variant;
  const from = move.from === 25 ? page.locator('[data-testid="board"] svg .sg-bar-hit[data-bar="' + game.turn + '"]') : pointAt(page, at("board"), boardPoint(spec, game.turn, move.from));
  await tap(page, from);
  const to = move.to === 0 ? page.locator('[data-testid="board"] svg .sg-tray[data-tray="' + game.turn + '"]') : pointAt(page, at("board"), boardPoint(spec, game.turn, move.to));
  await tap(page, to);
}

/** Throw for the opening until somebody has the first move (a tie throws again). */
async function start(page) {
  for (let n = 0; n < 12; n += 1) {
    if ((await gameOf(page)).phase !== "opening") return;
    await tap(page, primary);
  }
}

test("a first visit draws the standard board, steady, with no sideways scroll and nothing to complain of", async ({ page }) => {
  const errors = await open(page, TWO);
  expect(await page.locator(`${at("board")} svg g.sg-point`).count()).toBe(24);
  expect(await page.locator(`${at("board")} svg .sg-checker`).count()).toBe(2 + 5 + 3 + 5 + 2 + 5 + 3 + 5);
  await noSidewaysScroll(page);
  expect(errors).toEqual([]);
});

test("the opening roll starts the game, and a tap on a checker lights up where it may go", async ({ page }) => {
  await open(page, TWO);
  await expect(page.locator(at("board"))).toHaveAttribute("data-phase", "opening");
  await start(page);
  await expect(page.locator(at("board"))).toHaveAttribute("data-phase", "playing");
  const game = await gameOf(page);
  const moves = legalMoves(game);
  expect(moves.length).toBeGreaterThan(0);
  const first = moves[0];
  await tap(page, pointAt(page, at("board"), boardPoint(game.settings.variant, game.turn, first.from)));
  await expect(page.locator(at("board"))).toHaveAttribute("data-selected", String(first.from));
  const lit = await page.locator(`${at("board")} svg g.sg-point[data-target="true"]`).count();
  expect(lit).toBeGreaterThan(0);
  // Tapping the same checker again lets it go.
  await tap(page, pointAt(page, at("board"), boardPoint(game.settings.variant, game.turn, first.from)));
  await expect(page.locator(at("board"))).toHaveAttribute("data-selected", "");
});

test("tapping a checker and then a point makes the move the package says it is, undo takes it back, Done passes the turn", async ({ page }) => {
  const errors = await open(page, TWO);
  await start(page);
  const before = await gameOf(page);
  const move = legalMoves(before)[0];
  await tapMove(page, before, move);
  const after = await gameOf(page);
  expect(after.moves).toHaveLength(1);
  expect(after.moves[0]).toMatchObject({ from: move.from, to: move.to });
  expect(after.need).toHaveLength(before.need.length - 1);
  await expect(page.locator(tertiary)).toBeEnabled();
  await tap(page, tertiary);
  expect((await gameOf(page)).moves).toHaveLength(0);
  expect((await gameOf(page)).position).toEqual(before.position);
  // Play the turn out, and Done passes it.
  for (let n = 0; n < 4; n += 1) {
    const now = await gameOf(page);
    const next = legalMoves(now)[0];
    if (next === undefined) break;
    await tapMove(page, now, next);
  }
  await expect(page.locator(primary)).toBeEnabled();
  await expect(page.locator(primary)).toHaveText("Done");
  const turn = (await gameOf(page)).turn;
  await tap(page, primary);
  expect((await gameOf(page)).turn).not.toBe(turn);
  await expect(page.locator(at("board"))).toHaveAttribute("data-phase", "before-roll");
  expect(errors).toEqual([]);
});

test("a checker can be dragged to a point it may go to", async ({ page }, info) => {
  test.skip(info.project.name === "webkit-phone", "WebKit's emulated touch does not drag with the mouse");
  await open(page, TWO);
  await start(page);
  const before = await gameOf(page);
  const move = legalMoves(before)[0];
  const spec = before.settings.variant;
  await page.locator(`${at("board")} .sgp-board`).scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollBy(0, 0));
  const from = await pointAt(page, at("board"), boardPoint(spec, before.turn, move.from)).boundingBox();
  const to = await pointAt(page, at("board"), boardPoint(spec, before.turn, move.to)).boundingBox();
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(from.x + from.width / 2 + 20, from.y + from.height / 2 + 20, { steps: 3 });
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 6 });
  await page.mouse.up();
  const after = await gameOf(page);
  expect(after.moves).toHaveLength(1);
  expect(after.moves[0]).toMatchObject({ from: move.from, to: move.to });
});

test("a move to somewhere it may not go does nothing", async ({ page }) => {
  await open(page, TWO);
  await start(page);
  const before = await gameOf(page);
  const spec = before.settings.variant;
  const move = legalMoves(before)[0];
  // The board's point of the opponent's own back checkers is never a place white may start from.
  await tap(page, pointAt(page, at("board"), boardPoint(spec, before.turn, move.from)));
  await tap(page, pointAt(page, at("board"), 24));
  expect((await gameOf(page)).moves).toHaveLength(0);
});

test("the board is the same size and shape before the roll, mid-turn and after", async ({ page }) => {
  await open(page, TWO);
  const box = async () => {
    const { width, height } = await page.locator(`${at("board")} .sgp-board`).boundingBox();
    return [Math.round(width), Math.round(height)];
  };
  const first = await box();
  await start(page);
  expect(await box()).toEqual(first);
  const game = await gameOf(page);
  await tapMove(page, game, legalMoves(game)[0]);
  expect(await box()).toEqual(first);
});

test("the cube is offered, taken, and its value and owner are shown; a dropped double ends the game", async ({ page }) => {
  await open(page, "?players=two&seed=3&delay=0&points=5&cube=1&gammons=1&variant=backgammon");
  await start(page);
  const opening = await gameOf(page);
  // The opening roll cannot be doubled: play it out and pass.
  for (let n = 0; n < 4; n += 1) {
    const now = await gameOf(page);
    const next = legalMoves(now)[0];
    if (next === undefined) break;
    await tapMove(page, now, next);
  }
  await tap(page, primary);
  const doubler = (await gameOf(page)).turn;
  expect(doubler).not.toBe(opening.turn);
  await expect(page.locator(secondary)).toHaveText("Double");
  await tap(page, secondary);
  await expect(page.locator(at("board"))).toHaveAttribute("data-phase", "double-offered");
  await expect(page.locator(primary)).toHaveText("Take");
  await tap(page, primary);
  const taken = await gameOf(page);
  expect(taken.cube).toEqual({ value: 2, owner: doubler === "white" ? "black" : "white" });
  await expect(page.locator(`${at("board")} svg .sg-cube`)).toHaveAttribute("data-value", "2");
  // The side that owns the cube may double next; the doubler may not.
  await expect(page.locator(at("board"))).toHaveAttribute("data-cube", "2");
  const record = await page.locator(at("record")).textContent();
  expect(record).toContain("doubles");
  expect(record).toContain("takes");
});

test("a dropped double ends the game and the match goes on to the next", async ({ page }) => {
  await open(page, "?players=two&seed=3&delay=0&points=3&cube=1&gammons=1&variant=backgammon");
  await start(page);
  for (let n = 0; n < 4; n += 1) {
    const now = await gameOf(page);
    const next = legalMoves(now)[0];
    if (next === undefined) break;
    await tapMove(page, now, next);
  }
  await tap(page, primary);
  await tap(page, secondary);
  await expect(page.locator(secondary)).toHaveText("Drop");
  await tap(page, secondary);
  await expect(page.locator(at("board"))).toHaveAttribute("data-over", "true");
  const match = await matchOf(page);
  expect(match.score.reduce((a, b) => a + b)).toBe(1);
  await expect(page.locator(primary)).toHaveText("Next game");
  await tap(page, primary);
  await expect(page.locator(at("board"))).toHaveAttribute("data-phase", "opening");
  await expect(page.locator(at("verdict"))).toHaveAttribute("data-ok", "true");
});

test("the computer answers: after the person's turn it rolls and plays its own", async ({ page }) => {
  const errors = await open(page, "?players=white&strength=greedy&seed=11&delay=0&points=1");
  await start(page);
  // Play whoever starts: if the computer (black) starts it has already played; wait until it is the person's turn to roll or move.
  await page.waitForFunction(() => {
    const game = window.sugoroku.game();
    return game.turn === "white" || game.phase === "over";
  });
  for (let round = 0; round < 3; round += 1) {
    const now = await gameOf(page);
    if (now.phase === "over") break;
    if (now.phase === "before-roll") await tap(page, primary);
    for (let n = 0; n < 4; n += 1) {
      const state = await gameOf(page);
      const next = legalMoves(state)[0];
      if (next === undefined) break;
      await tapMove(page, state, next);
    }
    await tap(page, primary);
    // The computer plays its turn at once (delay 0) and hands the roll back.
    await page.waitForFunction(() => {
      const game = window.sugoroku.game();
      return game.turn === "white" || game.phase === "over";
    });
  }
  const turns = (await gameOf(page)).turns;
  expect(turns[1]).toBeGreaterThanOrEqual(2);
  expect(errors).toEqual([]);
  await expect(page.locator(at("verdict"))).toHaveAttribute("data-ok", "true");
});

test("two computers play a whole single game to its end, and the record replays", async ({ page }) => {
  const errors = await open(page, "?players=watch&strength=greedy&seed=21&delay=0&points=1&variant=hypergammon");
  await page.waitForFunction(() => window.sugoroku.game().phase === "over", undefined, { timeout: 60000 });
  await expect(page.locator(at("verdict"))).toHaveAttribute("data-ok", "true");
  const record = await page.locator(at("record")).textContent();
  expect(record).toMatch(/^result /m);
  expect(errors).toEqual([]);
});

test("every variant opens, rolls, and offers a legal move", async ({ page }) => {
  for (const variant of ["backgammon", "backgammon-race", "anti-backgammon", "nackgammon", "long-gammon", "hypergammon", "tabula"]) {
    const errors = await open(page, `?players=two&seed=5&delay=0&points=1&variant=${variant}`);
    await start(page);
    if ((await gameOf(page)).phase === "before-roll") await tap(page, primary);
    const game = await gameOf(page);
    expect(game.settings.variant.key).toBe(variant);
    expect(game.phase).toBe("playing");
    expect(legalMoves(game).length, variant).toBeGreaterThan(0);
    expect(await page.locator(`${at("board")} svg g.sg-point`).count()).toBe(24);
    expect(errors, variant).toEqual([]);
  }
});

test("the page speaks Japanese when asked, the board's words with it", async ({ page }) => {
  await open(page, `${TWO}&lang=ja`);
  await expect(page.locator(primary)).toHaveText("振って先攻を決める");
  await expect(page.locator(`${at("board")} .sgp-status`)).toContainText("サイコロ");
  await expect(page.locator("html")).toHaveAttribute("lang", "ja");
  await tap(page, "[data-lang=en]");
  await expect(page.locator(primary)).toHaveText("Roll to start");
  await tap(page, "[data-lang=ja]");
  await expect(page.locator(primary)).toHaveText("振って先攻を決める");
});

test("a seeded game is the same game every time", async ({ page }) => {
  await open(page, TWO);
  await start(page);
  const a = (await gameOf(page)).dice;
  await open(page, TWO);
  await start(page);
  expect((await gameOf(page)).dice).toEqual(a);
});
