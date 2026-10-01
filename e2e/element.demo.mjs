// The <sugoroku-board> tag on a bare page: attributes, methods, events, the dice given by the page, a game the
// computer plays to its end, and its record replayed against the rules by the package itself.
import { expect, test } from "@playwright/test";

import { replayRecord } from "../dist/index.js";
import { bare } from "./demo.mjs";

const tag = "sugoroku-board";

test("two computers play a whole game in the tag, tell the page, and the record replays", async ({ page }) => {
  const errors = await bare(page, `<${tag} id="t" variant="hypergammon" seed="4" white="greedy" black="greedy" computer-delay="0"></${tag}>`);
  await page.evaluate(() => {
    window.ended = null;
    document.getElementById("t").addEventListener("sugoroku-end", (event) => (window.ended = { result: event.detail.result, record: event.detail.record }));
  });
  // The opening throw is the page's to press, or the computers' to take when both are the computer's.
  await page.waitForFunction(() => window.ended !== null, undefined, { timeout: 60000 });
  const { result, record } = await page.evaluate(() => window.ended);
  expect(["white", "black"]).toContain(result.winner);
  const replay = replayRecord(record);
  expect(replay.ok, JSON.stringify(replay)).toBe(true);
  expect(replay.games[0].result).toEqual(result);
  expect(errors).toEqual([]);
});

test("a game in the tag takes the options its attributes give, and a changed attribute starts a new match", async ({ page }) => {
  await bare(page, `<${tag} id="t" variant="nackgammon" points="5" cube gammons seed="9" board="wood" numbers></${tag}>`);
  const read = () => page.evaluate(() => { const g = document.getElementById("t").game; return { key: g.settings.variant.key, points: g.settings.rules.points, cube: g.settings.rules.cube, gammons: g.settings.rules.gammons }; });
  expect(await read()).toEqual({ key: "nackgammon", points: 5, cube: true, gammons: true });
  expect(await page.locator(`#t svg.sugoroku`).getAttribute("style")).toContain("--sg-felt:#e2ba7a");
  expect(await page.locator(`#t svg .sg-number`).count()).toBe(24);
  // A look changes the drawing and keeps the game.
  await page.evaluate(() => document.getElementById("t").setAttribute("board", "blue"));
  await expect(page.locator(`#t svg.sugoroku`)).toHaveAttribute("style", /--sg-felt:#2865a6/);
  // A different game starts a new match.
  await page.evaluate(() => document.getElementById("t").setAttribute("variant", "tabula"));
  await expect.poll(async () => (await read()).key).toBe("tabula");
  await page.evaluate(() => document.getElementById("t").setAttribute("preset", "backgammon-3"));
  await expect.poll(async () => (await read()).points).toBe(3);
});

test("the page can give the dice, and is told when they are wanted", async ({ page }) => {
  await bare(page, `<${tag} id="t" dice="host" variant="backgammon"></${tag}>`);
  await page.evaluate(() => {
    window.log = [];
    const el = document.getElementById("t");
    for (const name of ["sugoroku-need-dice", "sugoroku-roll", "sugoroku-move", "sugoroku-turn"]) el.addEventListener(name, (event) => window.log.push([name, event.detail.side, event.detail.dice, event.detail.notation]));
  });
  await page.locator(`#t [data-testid="sg-primary"]`).click();
  await expect.poll(() => page.evaluate(() => window.log.map((entry) => entry[0]))).toContain("sugoroku-need-dice");
  await page.evaluate(() => document.getElementById("t").roll([5, 2]));
  expect(await page.evaluate(() => document.getElementById("t").game.phase)).toBe("playing");
  expect(await page.evaluate(() => document.getElementById("t").game.turn)).toBe("white");
  // Move for the side on turn through the method, then end the turn.
  const moved = await page.evaluate(() => document.getElementById("t").move(13, 8));
  expect(moved).toBe(true);
  expect(await page.evaluate(() => document.getElementById("t").move(13, 12))).toBe(false);
  await page.evaluate(() => { const el = document.getElementById("t"); el.move(24, 22); el.done(); });
  const log = await page.evaluate(() => window.log);
  // The first roll is the opening throw, a die for each side, so it belongs to neither.
  expect(log.find((entry) => entry[0] === "sugoroku-roll")).toEqual(["sugoroku-roll", null, [5, 2], undefined]);
  expect(log.filter((entry) => entry[0] === "sugoroku-move").map((entry) => entry[3])).toEqual(["13/8", "24/22"]);
  const turn = log.find((entry) => entry[0] === "sugoroku-turn");
  expect(turn[3]).toBe("24/22 13/8");
  expect(await page.evaluate(() => document.getElementById("t").game.turn)).toBe("black");
  const record = await page.evaluate(() => document.getElementById("t").record());
  expect(record).toContain("white 52: 24/22 13/8");
});

test("the words follow the page's language, and the box stays one shape in both", async ({ page }) => {
  await bare(page, `<${tag} id="t" variant="backgammon"></${tag}>`);
  const box = () => page.locator(`#t .sgp-board`).boundingBox().then(({ width, height }) => [Math.round(width), Math.round(height)]);
  const english = await box();
  await expect(page.locator(`#t [data-testid="sg-primary"]`)).toHaveText("Roll to start");
  await page.evaluate(() => document.documentElement.setAttribute("lang", "ja"));
  await expect(page.locator(`#t [data-testid="sg-primary"]`)).toHaveText("振って先攻を決める");
  expect(await box()).toEqual(english);
  await page.evaluate(() => document.getElementById("t").setAttribute("lang", "en"));
  await expect(page.locator(`#t [data-testid="sg-primary"]`)).toHaveText("Roll to start");
});

test("a side the computer plays answers at once at delay 0, and the person's own side waits for them", async ({ page }) => {
  await bare(page, `<${tag} id="t" variant="backgammon" seed="3" black="strong" computer-delay="0"></${tag}>`);
  const start = async () => {
    for (let n = 0; n < 12; n += 1) {
      if ((await page.evaluate(() => document.getElementById("t").game.phase)) !== "opening") return;
      await page.locator(`#t [data-testid="sg-primary"]`).click();
    }
  };
  await start();
  await page.waitForFunction(() => { const g = document.getElementById("t").game; return g.turn === "white" || g.phase === "over"; });
  expect(await page.evaluate(() => document.getElementById("t").game.turn)).toBe("white");
});

test("nothing on the tag can be selected, and it is torn down cleanly when it is taken off the page", async ({ page }) => {
  const errors = await bare(page, `<${tag} id="t"></${tag}>`);
  expect(await page.locator("#t svg").evaluate((svg) => getComputedStyle(svg).userSelect)).toBe("none");
  expect(await page.locator("#t .sg-checker").first().evaluate((one) => getComputedStyle(one).userSelect)).toBe("none");
  await page.evaluate(() => document.getElementById("t").remove());
  expect(errors).toEqual([]);
});
