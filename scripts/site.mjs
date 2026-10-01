// Builds the static demo for GitHub Pages into ./site: the page, written here from the family's
// shared header and footer, with the family's stylesheet, Sugoroku's own, the page's script, the
// compiled library and the sounds beside it, and the API reference made from the source.
import { cpSync, mkdirSync, rmSync, writeFileSync } from "node:fs";

import { API_CSS, apiPage } from "./api.mjs";
import { FAMILY_SCRIPT, familyFooter, familyHead, familyHeader, familyUnreviewed } from "./family-template.mjs";

const id = "sugoroku";
const ICON =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' rx='20' fill='%232f5d4a'/%3E%3Crect x='20' y='20' width='60' height='60' rx='12' fill='%23f3efe4'/%3E%3Cg fill='%231f2320'%3E%3Ccircle cx='38' cy='34' r='6'/%3E%3Ccircle cx='62' cy='34' r='6'/%3E%3Ccircle cx='38' cy='50' r='6'/%3E%3Ccircle cx='62' cy='50' r='6'/%3E%3Ccircle cx='38' cy='66' r='6'/%3E%3Ccircle cx='62' cy='66' r='6'/%3E%3C/g%3E%3C/svg%3E";

const uses = [
  `import { newGame, rollDice, legalPlaysOf, playTurn, settingsFor } from "@johnmorrisdotca/sugoroku";`,
  `const settings = settingsFor("nackgammon", { points: 5, cube: true, gammons: true })`,
  `replayRecord(text)  // { ok: true, match, games } — every move checked against the rules`,
  `choosePlay(game, { strength: "strong" })  // the computer's play, in a few milliseconds`,
  `drawSugoroku(position, { cube: { value: 2, owner: "white" }, dice })  // the board as SVG text`,
  `mountSugoroku(element, { variant: "tabula", computer: { black: "careful" } })  // a board to play`,
  `<sugoroku-board variant="long-gammon" points="3" cube black="strong"></sugoroku-board>`,
  `formatPlay(moves)  // "24/18 13/11" and "bar/22*", standard notation`,
];
const escape = (text) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const seg = (name, extra = "") => `<div class="fam-seg" role="group" data-say-label="${name}" id="${name}" data-testid="${name}"${extra}></div>`;
/** The line for each option row, in English and Japanese, for the family's Help switch. */
const HELP = {
  game: ["Choose backgammon or one of its relatives. The note below says how the game differs.", "バックギャモンか、その仲間のゲームを選びます。違いは下の説明に書かれています。"],
  players: ["Who plays: two people on this screen, you against the computer as White or as Black, or the computer against itself.", "誰が遊ぶかを選びます（2人で交代、白か黒でコンピューターと対戦、またはコンピューター同士）。"],
  match: ["Play a single game, a match to a number of points, or a money game.", "1ゲームだけ、指定した点数までの試合、またはマネーゲームで遊びます。"],
  cube: ["Turn the doubling cube on or off. With it on, either side may double the stakes during a game.", "ダブリングキューブの使用をオンまたはオフにします。オンのとき、ゲーム中にどちらも賭け金を倍にできます。"],
  gammons: ["On: a gammon, winning before the other side has borne off a checker, is worth double. Off: every win is worth one.", "オン: ギャモン（相手が1つも上がる前に勝つこと）は2倍です。オフ: 勝ちはどれも1倍です。"],
  jacoby: ["The Jacoby rule, for money games: gammons and backgammons count only once the cube has been turned.", "ジャコビー・ルール（マネーゲーム用）: キューブが使われたあとでなければ、ギャモンとバックギャモンは加点されません。"],
  beaver: ["On: a player who is doubled may redouble at once, a beaver, and keep the cube.", "オン: ダブルされた側が、すぐに倍返し（ビーバー）して、キューブを手元に残せます。"],
  strength: ["How well the computer plays: random, greedy, careful or strong.", "コンピューターの強さを選びます（ランダム、欲張り、慎重、強い）。"],
  boardLook: ["Choose the cloth or the colour of the board.", "盤の布や色を選びます。"],
  checkersLook: ["Choose the colours of the checkers. High contrast is the easiest to tell apart.", "駒の色を選びます。「高コントラスト」は、いちばん見分けやすい組み合わせです。"],
  numbers: ["Show or hide the numbers of the points around the board.", "盤のまわりの、ポイントの番号を表示するか隠します。"],
  home: ["Choose the side of the board where the checkers bear off: right or left.", "駒を上がる側（右か左）を選びます。"],
  theme: ["Light, dark, or follow your device.", "明るい色、暗い色、または端末の設定に合わせます。"],
  orientation: ["The shape of the board: automatic, wide or tall.", "盤の形（自動、横長、縦長）を選びます。"],
  sound: ["Turn the sounds of the dice and the checkers on or off.", "サイコロと駒の音のオンとオフを切り替えます。"],
};
const attr = (text) => text.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
const row = (labelKey, name, extra = "") => `<div class="setup fam-row" data-help-en="${attr(HELP[labelKey][0])}" data-help-ja="${attr(HELP[labelKey][1])}"><span class="fam-label" data-say="${labelKey}"></span>${seg(name, extra)}</div>`;

const page = `<!doctype html>
<html lang="en">
  <head>
    ${familyHead({
      id,
      title: "Sugoroku · backgammon and its relatives",
      description: "Play backgammon and its variants (Nackgammon, Long Gammon, Hypergammon, Tabula and more) with the doubling cube and matches to any number of points, against the computer or a friend. Free and open source, in English and Japanese.",
      ogTitle: "Sugoroku backgammon",
      ogDescription: "Backgammon, Nackgammon, Long Gammon, Hypergammon and Tabula, with the doubling cube, against the computer.",
    })}
    <link rel="icon" href="${ICON}" />
    <link rel="stylesheet" href="family.css" />
    <link rel="stylesheet" href="sugoroku.css" />
  </head>
  <body>
    <main>
      ${familyHeader({ id, links: [{ href: "api.html", say: "pageApi" }] })}
      ${row("game", "variants")}
      <p class="note" id="variant-note" data-testid="variant-note" aria-live="polite"></p>
      ${row("players", "players")}
      <div class="setup fam-actions"><button type="button" class="fam-button" id="new-match" data-testid="new-match" data-say="newMatch"></button></div>
      <div id="board" data-testid="board"></div>
      <section class="settings" aria-labelledby="match-title">
        <h2 id="match-title" data-say="matchTitle"></h2>
        ${row("match", "points")}
        ${row("cube", "cube")}
        ${row("gammons", "gammons")}
        ${row("jacoby", "jacoby")}
        ${row("beaver", "beaver")}
        ${row("strength", "strength")}
      </section>
      <section class="settings" aria-labelledby="look-title">
        <h2 id="look-title" data-say="look"></h2>
        ${row("boardLook", "board-look")}
        ${row("checkersLook", "checkers-look")}
        ${row("numbers", "numbers")}
        ${row("home", "home")}
        ${row("theme", "theme")}
        ${row("orientation", "orientation")}
        ${row("sound", "sound")}
      </section>
      <section class="more record" aria-labelledby="record-title">
        <h2 id="record-title" data-say="recordTitle"></h2>
        <p data-say="recordText"></p>
        <p class="verdict" id="verdict" data-testid="verdict" aria-live="polite"></p>
        <pre id="record" data-testid="record"></pre>
      </section>
      ${familyUnreviewed({ id })}
      <section class="more" aria-labelledby="more-title">
        <h2 id="more-title" data-say="moreTitle"></h2>
        <p data-say="moreText"></p>
        <ul class="uses">
          ${uses.map((line) => `<li><code>${escape(line)}</code></li>`).join("\n          ")}
        </ul>
      </section>
      <section class="more tag" aria-labelledby="tag-title">
        <h2 id="tag-title" data-say="tagTitle"></h2>
        <p data-say="tagText"></p>
        <sugoroku-board id="tag" data-testid="tag" variant="nackgammon" points="3" cube gammons black="strong" board="wood"></sugoroku-board>
      </section>
      ${familyFooter({ id })}
    </main>
    <script>${FAMILY_SCRIPT}</script>
    <script type="module" src="dist/element-define.js"></script>
    <script type="module" src="demo.js"></script>
  </body>
</html>
`;

rmSync("site", { recursive: true, force: true });
mkdirSync("site", { recursive: true });
cpSync("demo", "site", { recursive: true });
cpSync("dist", "site/dist", { recursive: true });
cpSync("sounds", "site/sounds", { recursive: true });
writeFileSync("site/index.html", page);
// The API reference, made from the source: every export of every entry point.
writeFileSync("site/api.css", API_CSS);
writeFileSync("site/api.html", apiPage({ id, name: "Sugoroku", icon: ICON }));
console.log("site/ is ready: serve it, or let the Pages workflow publish it.");
