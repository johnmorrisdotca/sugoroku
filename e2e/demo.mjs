// What every demo test starts from: the built demo in `site/`, served to the page without a port, a bare page
// holding only the element, and the helpers a test plays with.
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { expect } from "@playwright/test";

const site = join(dirname(fileURLToPath(import.meta.url)), "..", "site");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".wav": "audio/wav" };

/** Serve `site/` to a page at http://sugoroku.test/. */
export async function serve(page) {
  if (!existsSync(join(site, "index.html"))) throw new Error("site/ is not built: run `pnpm site` first (`pnpm test:demo` does)");
  await page.route("http://sugoroku.test/**", (route) => {
    const { pathname } = new URL(route.request().url());
    const file = join(site, pathname.endsWith("/") ? `${pathname}index.html` : pathname);
    if (!existsSync(file)) return route.fulfill({ status: 404, body: "" });
    return route.fulfill({ body: readFileSync(file), contentType: TYPES[file.slice(file.lastIndexOf("."))] ?? "application/octet-stream" });
  });
}

/** Collect anything the page complains of. */
function listen(page) {
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  page.on("console", (message) => message.type() === "error" && errors.push(message.text()));
  return errors;
}

export const at = (id) => `[data-testid="${id}"]`;
export const board = (page) => page.locator(`${at("board")} svg.sugoroku`);

/** Open the demo with a query and wait until its board is drawn; returns what the page complains of. */
export async function open(page, query = "") {
  const errors = listen(page);
  await serve(page);
  await page.goto(`http://sugoroku.test/${query}`);
  await page.waitForSelector(`${at("board")}[data-ready="true"] svg.sugoroku`);
  return errors;
}

/** A page holding only what is given, with the element defined from the built package. */
export async function bare(page, html, { lang = "en" } = {}) {
  const errors = listen(page);
  await serve(page);
  await page.route("http://sugoroku.test/bare.html", (route) =>
    route.fulfill({ contentType: "text/html", body: `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{margin:12px;background:#f4efe4;color:#1f2320;font-family:system-ui}</style></head><body>${html}<script type="module">import "./dist/element-define.js";</script></body></html>` }),
  );
  await page.goto("http://sugoroku.test/bare.html");
  await page.waitForFunction(() => customElements.get("sugoroku-board") !== undefined);
  return errors;
}

/** Tap, as a finger would where the page is touched and as a mouse where it is not. */
export async function tap(page, selector) {
  const { test } = await import("@playwright/test");
  const target = typeof selector === "string" ? page.locator(selector).first() : selector;
  await target.scrollIntoViewIfNeeded();
  if (test.info().project.use.hasTouch === true) await target.tap();
  else await target.click();
}

/** The board's game, as plain data, read off the page. */
export const gameOf = (page, handle = "window.sugoroku") => page.evaluate((expression) => JSON.parse(JSON.stringify(eval(expression).game())), handle);
export const matchOf = (page, handle = "window.sugoroku") => page.evaluate((expression) => JSON.parse(JSON.stringify(eval(expression).match())), handle);

/** Where on the page a board point is to be tapped: its hit rectangle. */
export const pointAt = (page, host, boardPoint) => page.locator(`${host} svg g.sg-point[data-board="${boardPoint}"] .sg-hit`);

/** Nothing the demo drew sits beyond the page's own width. */
export async function noSidewaysScroll(page) {
  const [scroll, client] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
  expect(scroll).toBeLessThanOrEqual(client);
}
