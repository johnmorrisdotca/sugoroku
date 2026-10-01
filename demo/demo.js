// The demo page's own script: a backgammon board to play, any variant, any match length, with or without the doubling
// cube, against the computer at any strength or with two on one screen, with every look the package has on a settings
// panel, the game written out as a record that the page replays against the rules, kept on this device between visits,
// and spoken in the language the header's chooser picks. The page only chooses a game and hands the settings on:
// the rules, the drawing, the moves and the computer are the package's own.
import { replayRecord, PRESETS, STRENGTHS, VARIANT_KEYS } from "./dist/index.js";
import { SUGOROKU_BOARD_NAMES, SUGOROKU_BOARDS, SUGOROKU_CHECKER_SET_NAMES, SUGOROKU_CHECKER_SETS } from "./dist/draw-entry.js";
import { mountSugoroku } from "./dist/play-entry.js";

// The page's own words, in the two languages it speaks. Set as text, never as HTML.
const WORDS = {
  en: {
    pageApi: "API reference",
    pitch: "Backgammon and its relatives: Nackgammon, Long Gammon, Hypergammon, Tabula and more, with the doubling cube and matches to any number of points. Tap a checker and then a point, or drag it, against the computer or a friend.",
    name: "Sugoroku (双六) is the Japanese name for backgammon.",
    nameLink: "About the name",
    game: "Game",
    variants: { backgammon: "Backgammon", "backgammon-race": "Race", "anti-backgammon": "Anti", nackgammon: "Nackgammon", "long-gammon": "Long Gammon", hypergammon: "Hypergammon", tabula: "Tabula" },
    variantNotes: {
      backgammon: "The classic: bring all fifteen checkers home and bear them off before the other side does.",
      "backgammon-race": "All fifteen checkers start off the board, on the bar, and are entered with the dice as the game goes.",
      "anti-backgammon": "The same board played to lose: whoever bears off every checker first loses.",
      nackgammon: "Four back checkers each instead of two: a longer game with more to fight over.",
      "long-gammon": "All fifteen checkers start together on the 24-point and must run the whole way.",
      hypergammon: "Three checkers each, on the 24, 23 and 22 points: a short, sharp game.",
      tabula: "The Roman game: three dice, no doubles, both sides entering the same way round the same track.",
    },
    match: "Match",
    single: "Single game",
    money: "Money",
    pointsOf: (n) => `${n} points`,
    rules: "Rules",
    cube: "Doubling cube",
    gammons: "Gammons count",
    jacoby: "Jacoby rule",
    beaver: "Beavers",
    on: "On",
    off: "Off",
    players: "Players",
    playerChoices: { two: "Two players", white: "You are White", black: "You are Black", watch: "Computer plays itself" },
    strength: "Computer",
    strengths: { random: "Random", greedy: "Greedy", careful: "Careful", strong: "Strong" },
    newMatch: "New match",
    look: "Look",
    boardLook: "Board",
    boards: { cloth: "Cloth", green: "Green", blue: "Blue", red: "Red", black: "Black", wood: "Wood" },
    checkersLook: "Checkers",
    checkerSets: { classic: "Classic", "red-and-white": "Red and white", "gold-and-blue": "Gold and blue", contrast: "High contrast" },
    numbers: "Numbers",
    home: "Bear off at",
    right: "Right",
    left: "Left",
    theme: "Light or dark",
    themes: { auto: "Device", light: "Light", dark: "Dark" },
    orientation: "Shape",
    orientations: { auto: "Automatic", landscape: "Wide", portrait: "Tall" },
    sound: "Sound",
    recordTitle: "The record",
    recordText: "Every game is written down as text that a server can replay against the rules. This page does it: it plays the record again, move by move, as the match goes.",
    replays: "The record replays correctly.",
    replayFails: (line, reason) => `The record fails at line ${line}: ${reason}`,
    moreTitle: "Using it",
    moreText: "The board above is the package itself: the rules, the cube, the computer and the drawing. Each line below is all it takes.",
    tagTitle: "As a tag",
    tagText: "The same board in one element, with no framework: a Nackgammon match to 3 points against the computer.",
    foot: "The rules are held to a brute-force check on thousands of positions and to games of every variant played to their end. Your choices stay on this device.",
  },
  ja: {
    pageApi: "API（英語）",
    pitch: "バックギャモンとその仲間（ナックギャモン、ロングギャモン、ハイパーギャモン、タブラなど）を、ダブリングキューブと好きなポイント数のマッチで遊べます。駒をタップして行き先をタップするか、ドラッグして動かします。相手はコンピューターでも友だちでも。",
    name: "双六（すごろく）は、バックギャモンの日本での古い呼び名です。",
    nameLink: "名前について（英語）",
    game: "ゲーム",
    variants: { backgammon: "バックギャモン", "backgammon-race": "レース", "anti-backgammon": "アンチ", nackgammon: "ナックギャモン", "long-gammon": "ロングギャモン", hypergammon: "ハイパーギャモン", tabula: "タブラ" },
    variantNotes: {
      backgammon: "定番のルール。15個の駒を先に自分の陣地に入れて、先にすべて上がった方の勝ちです。",
      "backgammon-race": "15個の駒は盤の外（バー）から始まり、サイコロの目で盤に入れていきます。",
      "anti-backgammon": "同じ盤で「負けるため」に遊びます。先にすべての駒を上がった方が負けです。",
      nackgammon: "奥の駒が2個ではなく4個。長くて、争いどころの多いゲームです。",
      "long-gammon": "15個の駒がすべて24ポイントに集まって始まり、盤を一周しなければなりません。",
      hypergammon: "駒は3個ずつ、24・23・22ポイントから。短くて鋭いゲームです。",
      tabula: "ローマ時代のゲーム。サイコロは3個でゾロ目の特別ルールはなく、両者が同じ道を同じ向きに進みます。",
    },
    match: "マッチ",
    single: "1ゲーム",
    money: "マネー",
    pointsOf: (n) => `${n}ポイント`,
    rules: "ルール",
    cube: "ダブリングキューブ",
    gammons: "ギャモンあり",
    jacoby: "ジャコビールール",
    beaver: "ビーバー",
    on: "あり",
    off: "なし",
    players: "対戦",
    playerChoices: { two: "二人で", white: "あなたは白", black: "あなたは黒", watch: "コンピューター同士" },
    strength: "コンピューター",
    strengths: { random: "ランダム", greedy: "目先", careful: "慎重", strong: "強い" },
    newMatch: "新しいマッチ",
    look: "見た目",
    boardLook: "盤",
    boards: { cloth: "テーブルの色", green: "緑", blue: "青", red: "赤", black: "黒", wood: "木目" },
    checkersLook: "駒",
    checkerSets: { classic: "定番", "red-and-white": "赤と白", "gold-and-blue": "金と青", contrast: "くっきり" },
    numbers: "ポイントの番号",
    home: "上がる側",
    right: "右",
    left: "左",
    theme: "明るさ",
    themes: { auto: "端末に合わせる", light: "明るい", dark: "暗い" },
    orientation: "盤の向き",
    orientations: { auto: "自動", landscape: "横長", portrait: "縦長" },
    sound: "音",
    recordTitle: "棋譜",
    recordText: "どのゲームも、サーバーがルールに照らして再生できるテキストとして書き留められます。このページも、マッチが進むたびに棋譜を一手ずつ再生して確かめています。",
    replays: "棋譜は正しく再生できました。",
    replayFails: (line, reason) => `棋譜は${line}行目で失敗しました：${reason}`,
    moreTitle: "使い方",
    moreText: "上の盤面は、このパッケージそのもの（ルール、キューブ、コンピューター、描き方）で動いています。下の各行がそれぞれ必要なコードのすべてです。",
    tagTitle: "タグとして",
    tagText: "同じ盤面を、フレームワークなしの一つの要素で。3ポイントのナックギャモン、相手はコンピューターです。",
    foot: "ルールは、数千の局面での総当たりの確認と、すべての種類のゲームを最後まで遊ばせる試験で守られています。選んだ内容はこの端末に残ります。",
  },
};

const KEY = "sugoroku.page";
const params = new URLSearchParams(location.search);
const read = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}");
  } catch {
    return {};
  }
};
const write = (value) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    /* Not remembered on this device; the board still plays. */
  }
};
const pick = (asked, allowed, kept, fallback) => (allowed.includes(asked) ? asked : allowed.includes(kept) ? kept : fallback);
const flag = (name, kept, fallback) => (params.has(name) ? params.get(name) !== "off" && params.get(name) !== "0" : typeof kept === "boolean" ? kept : fallback);

const kept = read();
const MATCHES = [1, 3, 5, 7, 9, 0];
const choice = {
  variant: pick(params.get("variant"), VARIANT_KEYS, kept.variant, "backgammon"),
  points: params.has("points") && MATCHES.includes(Number(params.get("points"))) ? Number(params.get("points")) : MATCHES.includes(kept.points) ? kept.points : 3,
  cube: flag("cube", kept.cube, true),
  gammons: flag("gammons", kept.gammons, true),
  jacoby: flag("jacoby", kept.jacoby, false),
  beaver: flag("beaver", kept.beaver, false),
  players: pick(params.get("players"), ["two", "white", "black", "watch"], kept.players, "white"),
  strength: pick(params.get("strength"), STRENGTHS, kept.strength, "strong"),
};
const look = {
  board: pick(params.get("board"), ["cloth", ...SUGOROKU_BOARD_NAMES], kept.look?.board, "cloth"),
  checkers: pick(params.get("checkers"), SUGOROKU_CHECKER_SET_NAMES, kept.look?.checkers, "classic"),
  numbers: flag("numbers", kept.look?.numbers, false),
  home: pick(params.get("home"), ["right", "left"], kept.look?.home, "right"),
  theme: pick(params.get("theme"), ["auto", "light", "dark"], kept.look?.theme, "auto"),
  orientation: pick(params.get("orientation"), ["auto", "landscape", "portrait"], kept.look?.orientation, "auto"),
  sound: flag("sound", kept.look?.sound, false),
};
const seed = params.get("seed") === null ? undefined : /^\d+$/.test(params.get("seed")) ? Number(params.get("seed")) : params.get("seed");
const delay = params.has("delay") ? Number(params.get("delay")) : undefined;
let mount = null;

const language = familyLanguage({ id: "sugoroku", words: WORDS, onChange: () => render() });
const say = (key, ...args) => {
  const word = WORDS[language.lang][key];
  return typeof word === "function" ? word(...args) : word;
};
const keep = () => write({ ...choice, look });

function seg(parent, items, chosen, choose, labelOf, extra) {
  parent.replaceChildren(
    ...items.map((item) => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.value = String(item);
      button.setAttribute("aria-pressed", String(item === chosen));
      extra?.(button, item);
      button.append(labelOf(item));
      button.addEventListener("click", () => choose(item));
      return button;
    }),
  );
}

/** A small square of a board, as the board patches of a colour picker show it. */
function patch(name) {
  const board = name === "cloth" ? { felt: "var(--felt)", frame: "var(--felt-deep)" } : SUGOROKU_BOARDS[name];
  const span = document.createElement("span");
  span.className = "patch";
  span.style.background = board.felt;
  span.style.borderColor = board.frame;
  return span;
}

function dots(name) {
  const set = SUGOROKU_CHECKER_SETS[name];
  const span = document.createElement("span");
  span.className = "dots";
  for (const [fill, edge] of [[set.white, set.whiteEdge], [set.black, set.blackEdge]]) {
    const dot = document.createElement("i");
    dot.style.background = fill;
    dot.style.boxShadow = `0 0 0 2px ${edge}`;
    span.append(dot);
  }
  return span;
}

/** What the mount is given: the rules of the choice, and how the computer plays. */
const rulesOf = () => ({
  points: choice.points,
  cube: choice.cube && choice.points !== 1 && choice.variant !== "anti-backgammon",
  gammons: choice.gammons && choice.variant !== "anti-backgammon" && choice.variant !== "tabula",
  jacoby: choice.points === 0 && choice.cube && choice.gammons && choice.jacoby && choice.variant !== "anti-backgammon" && choice.variant !== "tabula",
  beaver: choice.points === 0 && choice.cube && choice.beaver && choice.variant !== "anti-backgammon",
});
const computerOf = () => ({
  white: choice.players === "black" || choice.players === "watch" ? choice.strength : null,
  black: choice.players === "white" || choice.players === "watch" ? choice.strength : null,
});
const lookOf = () => ({
  board: look.board === "cloth" ? undefined : look.board,
  checkers: look.checkers,
  numbers: look.numbers,
  home: look.home,
  theme: look.theme,
  orientation: look.orientation,
  sound: look.sound,
});

const host = document.getElementById("board");

function choices() {
  const row = (id, items, chosen, choose, labelOf, extra) => seg(document.getElementById(id), items, chosen, choose, labelOf, extra);
  row("variants", VARIANT_KEYS, choice.variant, (value) => change({ variant: value }), (value) => say("variants")[value]);
  row("points", MATCHES, choice.points, (value) => change({ points: value }), (value) => (value === 1 ? say("single") : value === 0 ? say("money") : String(value)));
  const rules = rulesOf();
  const noCube = choice.points === 1 || choice.variant === "anti-backgammon";
  row("cube", [true, false], choice.cube && !noCube, (value) => change({ cube: value }), (value) => say(value ? "on" : "off"));
  row("gammons", [true, false], rules.gammons, (value) => change({ gammons: value }), (value) => say(value ? "on" : "off"));
  row("jacoby", [true, false], rules.jacoby, (value) => change({ jacoby: value }), (value) => say(value ? "on" : "off"));
  row("beaver", [true, false], rules.beaver, (value) => change({ beaver: value }), (value) => say(value ? "on" : "off"));
  const disabled = (id, off) => document.getElementById(id).querySelectorAll("button").forEach((button) => (button.disabled = off));
  disabled("cube", noCube);
  disabled("gammons", choice.variant === "anti-backgammon" || choice.variant === "tabula");
  disabled("jacoby", choice.points !== 0 || !rules.cube || !rules.gammons);
  disabled("beaver", choice.points !== 0 || !rules.cube);
  row("players", ["two", "white", "black", "watch"], choice.players, (value) => change({ players: value }), (value) => say("playerChoices")[value]);
  row("strength", STRENGTHS, choice.strength, (value) => change({ strength: value }), (value) => say("strengths")[value]);
  disabled("strength", choice.players === "two");
  document.getElementById("variant-note").textContent = say("variantNotes")[choice.variant];
}

function settings() {
  const row = (id, items, chosen, choose, labelOf, extra) => seg(document.getElementById(id), items, chosen, choose, labelOf, extra);
  row("board-look", ["cloth", ...SUGOROKU_BOARD_NAMES], look.board, (value) => changeLook({ board: value }), (value) => say("boards")[value], (button, value) => button.append(patch(value)));
  row("checkers-look", SUGOROKU_CHECKER_SET_NAMES, look.checkers, (value) => changeLook({ checkers: value }), (value) => say("checkerSets")[value], (button, value) => button.append(dots(value)));
  row("numbers", [true, false], look.numbers, (value) => changeLook({ numbers: value }), (value) => say(value ? "on" : "off"));
  row("home", ["right", "left"], look.home, (value) => changeLook({ home: value }), (value) => say(value));
  row("theme", ["auto", "light", "dark"], look.theme, (value) => changeLook({ theme: value }), (value) => say("themes")[value]);
  row("orientation", ["auto", "landscape", "portrait"], look.orientation, (value) => changeLook({ orientation: value }), (value) => say("orientations")[value]);
  row("sound", [true, false], look.sound, (value) => changeLook({ sound: value }), (value) => say(value ? "on" : "off"));
}

function change(next) {
  Object.assign(choice, next);
  keep();
  put();
  choices();
}
function changeLook(next) {
  Object.assign(look, next);
  keep();
  mount.set(lookOf());
  settings();
}

function recordOf() {
  const pre = document.getElementById("record");
  const verdict = document.getElementById("verdict");
  if (mount === null) return;
  const text = mount.record();
  pre.textContent = text;
  const replay = replayRecord(text);
  verdict.dataset.ok = String(replay.ok);
  verdict.textContent = replay.ok ? say("replays") : say("replayFails", replay.line, replay.reason);
}

function put() {
  mount?.destroy();
  mount = mountSugoroku(host, {
    variant: choice.variant,
    rules: rulesOf(),
    seed: seed ?? Math.floor(Math.random() * 1e9),
    computer: computerOf(),
    computerDelay: delay,
    ...lookOf(),
    onEnd: () => recordOf(),
    onTurn: () => recordOf(),
    onCube: () => recordOf(),
    onRoll: () => recordOf(),
  });
  // The page's own tests reach the board through this.
  window.sugoroku = mount;
  recordOf();
}

function render() {
  language.say();
  choices();
  settings();
  recordOf();
}

document.getElementById("new-match").addEventListener("click", () => {
  mount.newMatch({ seed: seed ?? Math.floor(Math.random() * 1e9) });
  recordOf();
});

render();
put();
host.dataset.ready = "true";
