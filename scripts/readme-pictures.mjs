// Takes the pictures the README shows, from the built demo in `site/`: `pnpm screenshots:readme` (builds the demo, then runs this).
// The family's standard is in johnmorrisdotca/.github (README-STANDARD.md); the shared part is readme-pictures-lib.mjs.
// The page is served to a browser without a port, never fetched from the live site, and is the same each run: a seeded match is
// played by the package's own computer for white (through the board's own methods) until the cube has been turned and a few turns
// have gone, the dice are on the board, and motion is reduced. It waits on the board's own state, never on a clock.
// Output: docs/images/<subject>-<desk|phone>-<light|dark>.webp.

import { choosePlay, legalPlaysOf } from "../dist/index.js";
import { takePictures } from "./readme-pictures-lib.mjs";

const BOARD = '[data-testid="board"]';
const READY = `${BOARD}[data-ready="true"] svg.sugoroku`;

const state = (page) => page.evaluate(() => JSON.parse(JSON.stringify(window.sugoroku.game())));

/** Play white's side with the package's computer until `turns` of its own have gone and the cube has been turned. */
async function playUp(page, turns) {
  for (let guard = 0; guard < 600; guard += 1) {
    const game = await state(page);
    if (game.phase === "over") throw new Error("the game ended before the picture was ready");
    if (
      game.cube.value > 1 &&
      game.turns[0] >= turns &&
      (game.phase === "before-roll" || game.phase === "playing") &&
      game.turn === "white"
    )
      return;
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
    } else await page.waitForFunction(() => true, null, { polling: 20 });
  }
  throw new Error("the picture's game did not get where it was meant to");
}

const MATCH = "players=white&strength=strong&seed=31&points=3&cube=1&gammons=1&variant=backgammon&delay=0";
/** A match to 3 against the computer, in the middle of a game with the cube at 2. */
const played = async (page) => {
  await playUp(page, 7);
  await page.waitForFunction(() => document.getElementById("board").dataset.phase !== "double-offered");
};

/** One variant's board as it opens, cropped to the board. */
const variant = (subject, key, extra = "") => ({
  subject,
  views: ["desk"],
  scale: 1,
  url: `/?lang=en&variant=${key}&seed=5&delay=0${extra}`,
  ready: READY,
  target: `${BOARD} svg.sugoroku`,
});

await takePictures({
  shots: [
    // A match to 3 in the middle of a game with the cube at 2, from the top of the page so the header, the language chooser, the
    // cloth patches, the choices and the board with its buttons all show; and on a phone in Japanese, standing up, at the board.
    {
      subject: "hero",
      views: ["desk", "phone"],
      height: 1260,
      url: `/?${MATCH}&lang=en`,
      ready: READY,
      async prepare(page, { view }) {
        if (view === "phone") {
          await page.goto(`http://sugoroku.test/?${MATCH}&lang=ja`);
          await page.waitForSelector(READY);
          await played(page);
          await page
            .locator("#board")
            .evaluate((element) => window.scrollTo(0, element.getBoundingClientRect().top + window.scrollY - 4));
        } else {
          await played(page);
          await page.evaluate(() => window.scrollTo(0, 0));
        }
      },
    },
    variant("backgammon", "backgammon"),
    variant("nackgammon", "nackgammon"),
    variant("long-gammon", "long-gammon"),
    variant("hypergammon", "hypergammon"),
    variant("tabula", "tabula"),
    variant("backgammon-race", "backgammon-race"),
  ],
  // The family's thumbnail, dark thumbnail and icon (scripts/family-thumbnail.mjs): the SVG board of a match to 3 in the
  // middle of a game, the cube at 2 and white's dice just rolled, off the page's felt; the icon is the half of the board
  // the dice are on.
  thumbnail: {
    url: `/?${MATCH}&lang=en`,
    ready: READY,
    target: `${BOARD} svg.sugoroku`,
    label: "Sugoroku 双六",
    async prepare(page) {
      await played(page);
      if ((await state(page)).phase === "before-roll") await page.evaluate(() => window.sugoroku.roll());
      await page.waitForFunction(() => window.sugoroku.game().phase === "playing");
    },
    icon: {
      async prepare(page) {
        await page.locator(`${BOARD} svg.sugoroku`).evaluate((svg) => {
          // From the middle of the bar to the right-hand edge.
          const { x, y, width, height } = svg.viewBox.baseVal;
          const from = 0.529;
          svg.setAttribute("viewBox", `${x + width * from} ${y} ${width * (1 - from)} ${height}`);
          svg.style.width = `${svg.getBoundingClientRect().width * (1 - from)}px`;
        });
      },
    },
  },
});
