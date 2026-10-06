// Packs the package the way it is published (`npm pack`, npm and not pnpm),
// installs the tarball into an empty project, and uses it as somebody who
// installed it would: every entry in `exports` imported by ESM and loaded by
// `require`, and a game played, written down, replayed and drawn. A package whose
// `exports` name a file that is not in the tarball fails here, before it can be
// published. `pnpm test:package` builds first.
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const windows = process.platform === "win32";
const scratch = mkdtempSync(join(tmpdir(), "sugoroku-package-"));

/** Run a command and hand back what it printed. On Windows, npm is a .cmd file, which only a shell runs; node itself is run directly. */
function run(command, args, cwd, viaShell = false) {
  const shell = viaShell && windows;
  const ran = spawnSync(shell && /[\\/]/.test(command) ? `"${command}"` : command, args, { cwd, encoding: "utf8", shell });
  if (ran.status !== 0) {
    console.error(`FAIL ${command} ${args.join(" ")}\n${ran.stdout}\n${ran.stderr}`);
    process.exit(1);
  }
  return ran.stdout;
}

// 1. Pack, with npm.
const packed = JSON.parse(run("npm", ["pack", "--json", "--ignore-scripts", "--pack-destination", scratch], root, true));
const tarball = join(scratch, packed[0].filename);
const inTarball = new Set(packed[0].files.map((file) => file.path));
console.log(`ok   npm pack: ${packed[0].filename}, ${packed[0].files.length} files`);
// The README's pictures are in docs/images, for GitHub and npm to show by address, and are never in what is installed.
const shipped = [...inTarball].filter((file) => file.startsWith("docs/") || /\.(webp|png|jpe?g|gif)$/.test(file));
if (shipped.length > 0) {
  console.error(`FAIL the tarball holds pictures or docs: ${shipped.join(", ")}`);
  process.exit(1);
}
console.log("ok   no picture and nothing from docs/ is in the tarball");

// 2. Everything package.json points at is in the tarball.
const pointed = [pkg.main, pkg.module, pkg.types, ...Object.values(pkg.bin ?? {}), ...Object.values(pkg.exports).flatMap((entry) => (typeof entry === "string" ? [entry] : Object.values(entry)))];
for (const file of new Set(pointed)) {
  if (!inTarball.has(file.replace(/^\.\//, ""))) {
    console.error(`FAIL package.json points at ${file}, which is not in the tarball`);
    process.exit(1);
  }
}
console.log(`ok   every file package.json points at is in the tarball (${new Set(pointed).size})`);

for (const named of pkg.files) {
  if (![...inTarball].some((file) => file === named || file.startsWith(`${named}/`))) {
    console.error(`FAIL package.json's files names ${named}, which is not in the tarball`);
    process.exit(1);
  }
}
console.log(`ok   everything in package.json's files is in the tarball (${pkg.files.length})`);

// 3. Install it into an empty project.
const project = join(scratch, "project");
mkdirSync(project);
writeFileSync(join(project, "package.json"), JSON.stringify({ name: "scratch", private: true, version: "0.0.0" }));
run("npm", ["install", "--no-audit", "--no-fund", "--silent", tarball], project, true);
console.log("ok   npm install of the tarball");

// The game the built package in this checkout plays from a seed: the installed one must play the same.
const { newGame, settingsFor, seededDice, openingFrom, rollOpening, rollDice, rollFrom, choosePlay, playTurn, formatPosition, positionId } = await import(new URL("../dist/index.js", import.meta.url).href);
function playOne(lib) {
  const dice = lib.seededDice(7);
  let game = lib.newGame(lib.settingsFor("backgammon"));
  while (game.phase === "opening") game = lib.rollOpening(game, lib.openingFrom(dice));
  for (let turn = 0; turn < 6 && game.phase !== "over"; turn += 1) {
    if (game.phase === "before-roll") game = lib.rollDice(game, lib.rollFrom(dice));
    game = lib.playTurn(game, lib.choosePlay(game, { strength: "greedy", random: () => 0.5 }).moves);
  }
  return `${lib.formatPosition(game.position)} ${lib.positionId(game.position, game.turn)}`;
}
const expected = playOne({ newGame, settingsFor, seededDice, openingFrom, rollOpening, rollDice, rollFrom, choosePlay, playTurn, formatPosition, positionId });

// 4. Every entry in `exports`, by ESM and by require, and the package used.
const entries = Object.keys(pkg.exports).map((key) => (key === "." ? pkg.name : `${pkg.name}/${key.slice(2)}`));
writeFileSync(
  join(project, "esm.mjs"),
  `${entries.map((entry, i) => `import * as m${i} from ${JSON.stringify(entry)};`).join("\n")}
const all = [${entries.map((_, i) => `m${i}`).join(", ")}];
const names = ${JSON.stringify(entries)};
// The define entry is for its effect (it defines the tag) and exports nothing.
all.forEach((m, i) => { if (Object.keys(m).length === 0 && !names[i].endsWith("/element/define")) throw new Error(names[i] + " exports nothing"); });
const lib = m0;
const { drawSugoroku } = m1;
${playOne.toString()}
if (playOne(lib) !== ${JSON.stringify(expected)}) throw new Error("the installed package plays a seeded game differently");
const dice = lib.seededDice(5);
let game = lib.newGame(lib.settingsFor("backgammon"));
const recorder = new lib.GameRecorder(game.settings, 5);
recorder.startGame();
while (game.phase === "opening") { const throws = lib.openingFrom(dice); recorder.opening(throws); game = lib.rollOpening(game, throws); }
for (let turn = 0; turn < 4000 && game.phase !== "over"; turn += 1) {
  if (game.phase === "before-roll") game = lib.rollDice(game, lib.rollFrom(dice));
  const play = lib.choosePlay(game, { strength: "random", random: () => 0.37 });
  recorder.turn(game.turn, game.dice, play.moves);
  game = lib.playTurn(game, play.moves);
}
recorder.result(game.result);
const replay = lib.replayRecord(recorder.text());
if (!replay.ok || replay.games.length !== 1 || replay.games[0].result.points !== game.result.points) throw new Error("a record does not replay: " + JSON.stringify(replay));
if (!drawSugoroku(game.position).startsWith("<svg")) throw new Error("the board is not drawn");
if (lib.VERSION !== ${JSON.stringify(pkg.version)}) throw new Error("VERSION is " + lib.VERSION);
if (lib.presetByName("Pro Backgammon-9")?.rules.points !== 9) throw new Error("presets are missing");
console.log(names.join(" "));
`,
);
writeFileSync(
  join(project, "cjs.cjs"),
  `const names = ${JSON.stringify(entries)};
for (const name of names) { const m = require(name); if (Object.keys(m).length === 0 && !name.endsWith("/element/define")) throw new Error(name + " exports nothing"); }
const lib = require(${JSON.stringify(pkg.name)});
if (lib.settingsFor("hypergammon").variant.checkers !== 3) throw new Error("hypergammon does not have three checkers by require");
console.log(names.join(" "));
`,
);
console.log(`ok   import:  ${run(process.execPath, ["esm.mjs"], project).trim()}`);
console.log(`ok   require: ${run(process.execPath, ["cjs.cjs"], project).trim()}`);

rmSync(scratch, { recursive: true, force: true });
console.log("the package installs and runs as published, on", process.platform, process.version);
