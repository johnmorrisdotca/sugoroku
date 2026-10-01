// How the demo looks, held to a few facts that do not change: it fits the screen at a phone's width and a desk's,
// the board stands up on a phone and lies down on a desk, the colours follow the device's light or dark, nothing on
// the board can be selected, and the drawing's options do what they say.
import { expect, test } from "@playwright/test";

import { at, noSidewaysScroll, open } from "./demo.mjs";

const URL = "?players=two&seed=3&delay=0&points=3&cube=1";

test("fits the screen without scrolling sideways, whatever is chosen", async ({ page }) => {
  const errors = await open(page, URL);
  await noSidewaysScroll(page);
  for (const orientation of ["wide", "tall", "auto"]) {
    await open(page, `${URL}&orientation=${orientation === "wide" ? "landscape" : orientation === "tall" ? "portrait" : "auto"}&numbers=1`);
    await noSidewaysScroll(page);
    const svg = await page.locator(`${at("board")} svg`).boundingBox();
    const viewport = page.viewportSize();
    expect(svg.x + svg.width).toBeLessThanOrEqual(viewport.width + 1);
  }
  expect(errors).toEqual([]);
});

test("stands the board up on a phone and lays it down on a desk, unless asked", async ({ page }, info) => {
  await open(page, URL);
  const wide = info.project.name === "chromium-desk";
  await expect(page.locator(at("board"))).toHaveAttribute("data-orientation", wide ? "landscape" : "portrait");
  await open(page, `${URL}&orientation=${wide ? "portrait" : "landscape"}`);
  await expect(page.locator(at("board"))).toHaveAttribute("data-orientation", wide ? "portrait" : "landscape");
});

test("follows the device's light or dark, and either can be asked for", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await open(page, URL);
  const felt = () => page.locator(`${at("board")} .sg-point[data-tone="a"] .sg-triangle`).first().evaluate((one) => getComputedStyle(one).fill);
  const light = await felt();
  await page.emulateMedia({ colorScheme: "dark" });
  await open(page, URL);
  const dark = await felt();
  expect(dark).not.toBe(light);
  await page.emulateMedia({ colorScheme: "light" });
  await open(page, `${URL}&theme=dark`);
  const forced = await page.locator(`${at("board")} .sg-point[data-tone="a"] .sg-triangle`).first().evaluate((one) => getComputedStyle(one).fill);
  await open(page, URL);
  const plain = await page.locator(`${at("board")} .sg-point[data-tone="a"] .sg-triangle`).first().evaluate((one) => getComputedStyle(one).fill);
  expect(forced).not.toBe(plain);
});

test("lets nothing on the board be selected, dragged or double-tapped", async ({ page }) => {
  await open(page, URL);
  expect(await page.locator(`${at("board")} svg`).evaluate((svg) => getComputedStyle(svg).userSelect)).toBe("none");
  expect(await page.locator(`${at("board")} .sgp-board`).evaluate((box) => getComputedStyle(box).userSelect)).toBe("none");
  await page.locator(`${at("board")} .sgp-board`).dblclick({ position: { x: 100, y: 100 } });
  expect(await page.evaluate(() => String(window.getSelection()))).toBe("");
});

test("puts the options of the drawing on the board: numbers, the trays at the other end, another board and checkers", async ({ page }) => {
  await open(page, `${URL}&numbers=1&home=left&board=wood&checkers=red-and-white`);
  expect(await page.locator(`${at("board")} svg .sg-number`).count()).toBe(24);
  await expect(page.locator(`${at("board")} svg`)).toHaveAttribute("data-home", "left");
  await expect(page.locator(`${at("board")} svg`)).toHaveAttribute("style", /--sg-felt:#e2ba7a.*--sg-black:#b3332b/);
});

test("changes the look from the page's choices without losing the game", async ({ page }) => {
  await open(page, URL);
  await page.locator(`${at("sg-primary")}`).first().click();
  const before = await page.evaluate(() => JSON.stringify(window.sugoroku.game().position));
  await page.locator(`${at("numbers")} button[data-value="true"]`).click();
  await expect(page.locator(`${at("board")} svg .sg-number`)).toHaveCount(24);
  await page.locator(`${at("board-look")} button[data-value="blue"]`).click();
  await expect(page.locator(`${at("board")} svg`)).toHaveAttribute("style", /#2865a6/);
  expect(await page.evaluate(() => JSON.stringify(window.sugoroku.game().position))).toBe(before);
});

test("keeps the board's box one shape when the page is read in Japanese", async ({ page }) => {
  await open(page, `${URL}&lang=en`);
  const box = () => page.locator(`${at("board")} .sgp-board`).boundingBox().then(({ width, height }) => [Math.round(width), Math.round(height)]);
  const english = await box();
  await page.locator("[data-lang=ja]").click();
  expect(await box()).toEqual(english);
});

test("plays its sounds, the package's own, when sound is on, and none when it is off", async ({ page }) => {
  const requested = [];
  page.on("request", (request) => /\/sounds\/\w+\.wav$/.test(request.url()) && requested.push(request.url().split("/").pop()));
  await open(page, `${URL}`);
  await page.locator(`${at("sg-primary")}`).first().click();
  await page.waitForFunction(() => window.sugoroku.game().opening !== null);
  expect(requested).toEqual([]);
  await open(page, `${URL}&sound=1`);
  await page.locator(`${at("sg-primary")}`).first().click();
  await expect.poll(() => requested).toContain("dice.wav");
});
