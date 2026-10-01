// Takes the pictures the README shows, from the built demo in `site/`: `pnpm pictures` (builds the demo, then runs this).
// The page is served to a browser without a port, never fetched from the live site, and the same each run: a seeded
// match is played by the package's own computer for white (through the board's own methods) until the cube has been
// turned and a few turns have gone, the dice are on the board, and motion is reduced. It waits on the board's own state,
// never on a clock. Output: docs/desktop.jpg (1280 wide, light, English) and docs/phone.jpg (390 by 844, dark, Japanese).
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "@playwright/test";

import { choosePlay, legalPlaysOf } from "../dist/index.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const site = join(root, "site");
const docs = join(root, "docs");
const host = "http://sugoroku.test";
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".wav": "audio/wav" };
const QUALITY = 78;

if (!existsSync(join(site, "index.html"))) throw new Error("site/ is not built: run `pnpm pictures` (it builds the demo first)");
const browser = await chromium.launch();

const state = (page) => page.evaluate(() => JSON.parse(JSON.stringify(window.sugoroku.game())));

/** Play white's side with the package's computer until `turns` of its own have gone and the cube has been turned. */
async function playUp(page, turns) {
  for (let guard = 0; guard < 600; guard += 1) {
    const game = await state(page);
    if (game.phase === "over") throw new Error("the game ended before the picture was ready");
    if (game.cube.value > 1 && game.turns[0] >= turns && (game.phase === "before-roll" || game.phase === "playing") && game.turn === "white") return;
    if (game.phase === "opening") await page.evaluate(() => window.sugoroku.roll());
    else if (game.phase === "before-roll" && game.turn === "white") {
      if (game.turns[0] >= turns && game.cube.value === 1) await page.evaluate(() => window.sugoroku.double());
      else await page.evaluate(() => window.sugoroku.roll());
    } else if (game.phase === "playing" && game.turn === "white") {
      if (game.need.length === 0) await page.evaluate(() => window.sugoroku.done());
      else {
        const play = choosePlay(game, { strength: "careful", random: () => 0.5, budget: Infinity });
        const first = play.moves[0] ?? legalPlaysOf(game)[0]?.moves[0];
        await page.evaluate(([from, to]) => window.sugoroku.move(from, to), [first.from, first.to]);
      }
    } else await page.waitForTimeout(20);
  }
  throw new Error("the picture's game did not get where it was meant to");
}

/** The demo, played up to a game in the middle, and photographed. */
async function shot({ width, height, colorScheme, lang, path, query, turns, scrollTo }) {
  const context = await browser.newContext({ viewport: { width, height }, colorScheme, reducedMotion: "reduce", locale: "en-US", deviceScaleFactor: 2 });
  const page = await context.newPage();
  await page.route(`${host}/**`, (route) => {
    const { pathname } = new URL(route.request().url());
    const file = join(site, pathname === "/" ? "index.html" : pathname);
    if (!existsSync(file)) return route.fulfill({ status: 404, body: "" });
    return route.fulfill({ body: readFileSync(file), contentType: TYPES[file.slice(file.lastIndexOf("."))] ?? "application/octet-stream" });
  });
  await page.goto(`${host}/?${query}&lang=${lang}&delay=0`);
  await page.waitForSelector('[data-testid="board"][data-ready="true"] svg.sugoroku');
  await playUp(page, turns);
  await page.waitForFunction(() => document.getElementById("board").dataset.phase !== "double-offered");
  if (scrollTo) await page.locator(scrollTo).evaluate((element) => window.scrollTo(0, element.getBoundingClientRect().top + window.scrollY - 4));
  else await page.evaluate(() => window.scrollTo(0, 0));
  await page.mouse.move(0, 0);
  await page.screenshot({ path, type: "jpeg", quality: QUALITY });
  await context.close();
}

// A match to 3 against the computer in the middle of a game with the cube at 2, from the top of the page so the header,
// the language chooser, the cloth patches, the choices and the board with its buttons all show.
await shot({ width: 1280, height: 1260, colorScheme: "light", lang: "en", query: "players=white&strength=strong&seed=31&points=3&cube=1&gammons=1&variant=backgammon", turns: 7, path: join(docs, "desktop.jpg") });
// The same on a phone in dark mode and Japanese, standing up, scrolled to the board.
await shot({ width: 390, height: 844, colorScheme: "dark", lang: "ja", query: "players=white&strength=strong&seed=31&points=3&cube=1&gammons=1&variant=backgammon", turns: 7, path: join(docs, "phone.jpg"), scrollTo: "#board" });
await browser.close();
