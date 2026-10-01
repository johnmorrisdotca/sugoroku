// The documents and the demo, held to the source. Plain JavaScript, so that reading files needs no Node types.
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import process from "node:process";

import { describe, expect, it } from "vitest";

import { startPosition } from "./board.ts";
import { STRENGTHS } from "./computer.ts";
import { MOST_DRAWN } from "./draw.ts";
import { SugorokuBoard } from "./element.ts";
import { positionId } from "./positionId.ts";
import { SUGOROKU_PLAY_STYLE } from "./playStyle.ts";
import { RECORD_VERSION } from "./record.ts";
import { CUBE_LIMIT, PRESETS } from "./rules.ts";
import { SUGOROKU_STRINGS } from "./strings.ts";
import { SUGOROKU_STYLE } from "./style.ts";
import { VARIANT_KEYS, VARIANTS } from "./variants.ts";
import { VERSION } from "./version.ts";

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const readme = readFileSync("README.md", "utf8");
const variants = readFileSync("docs/VARIANTS.md", "utf8");

/** A README section's text, from its heading to the next heading of the same level. */
const section = (heading) => {
  const from = readme.indexOf(`\n## ${heading}\n`);
  if (from < 0) throw new Error(`no “## ${heading}” in the README`);
  const next = readme.indexOf("\n## ", from + 5);
  return readme.slice(from, next < 0 ? undefined : next);
};

/** The cells of every table row in a piece of text, header and rule rows left out. */
const rows = (text) =>
  text
    .split("\n")
    .filter((line) => line.startsWith("|") && !/^\|[\s|:-]+\|$/.test(line))
    .map((line) => line.split(/(?<!\\)\|/).slice(1, -1).map((cell) => cell.replace(/\\\|/g, "|").trim()));

/** The custom properties a block of CSS declares: { name: value }. */
const declarations = (css) => Object.fromEntries([...css.matchAll(/(--[a-z0-9-]+):\s*([^;}]+)[;}]/g)].map((match) => [match[1], match[2].trim()]));

describe("the documents", () => {
  it("say the version package.json says, in the code and at the top of the changelog", () => {
    expect(VERSION).toBe(pkg.version);
    expect(readFileSync("CHANGELOG.md", "utf8")).toMatch(new RegExp(`^## ${pkg.version.replace(/\./g, "\\.")} `, "m"));
  });

  it("name in the README every entry package.json exports, and no other", () => {
    const exported = Object.keys(pkg.exports).filter((key) => key !== ".").map((key) => `${pkg.name}/${key.slice(2)}`);
    for (const entry of exported) expect(readme, entry).toContain(`\`${entry}\``);
    expect(readme).toContain(`\`${pkg.name}\``);
    const named = [...readme.matchAll(/`@johnmorrisdotca\/sugoroku\/([\w/-]+)`/g)].map((match) => `${pkg.name}/${match[1]}`);
    for (const entry of new Set(named)) expect(exported, entry).toContain(entry);
  });

  it("name in the README every function the package exports by name, in the API table", async () => {
    const api = readme.slice(readme.indexOf("## API"), readme.indexOf("## ", readme.indexOf("## API") + 5));
    const main = await import("./index.ts");
    const draw = await import("./draw-entry.ts");
    const play = await import("./play-entry.ts");
    const functions = [...Object.entries({ ...main, ...draw, ...play })].filter(([name, value]) => typeof value === "function" && /^[a-z]/.test(name)).map(([name]) => name);
    for (const name of functions) expect(api, name).toContain(name);
  });

  it("name in the README every attribute of the element", () => {
    for (const attribute of SugorokuBoard.observedAttributes) expect(readme, attribute).toMatch(new RegExp(`\`${attribute}[\`=]|\`${attribute}\``));
  });

  it("name every variant in the README and in the variants document, and every name on the sites in the document", () => {
    for (const key of VARIANT_KEYS) {
      expect(readme, key).toContain(`\`${key}\``);
      expect(variants, key).toContain(`\`${key}\``);
    }
    for (const preset of PRESETS) {
      expect(variants, preset.key).toContain(`\`${preset.key.replace(/-\d$/, "")}`);
      for (const name of preset.names) {
        // The table groups "(3, 5, 7, 9 Point)" and "Level 2, Level 3": the name is there in some spelling.
        const stem = name.replace(/ \(\d Point\)| Level \d/, "");
        expect(variants, name).toContain(stem);
      }
    }
  });

  it("keep the family's stylesheet byte for byte, as its first line's hash says", () => {
    const [first, ...rest] = readFileSync("demo/family.css", "utf8").split("\n");
    const hash = /sha256 of every line after this one: ([0-9a-f]{64})/.exec(first)?.[1];
    expect(createHash("sha256").update(rest.join("\n")).digest("hex")).toBe(hash);
  });

  it("list this package in the family's shared template, which every demo copies unchanged", () => {
    expect(readFileSync("scripts/family-template.mjs", "utf8")).toContain('{ id: "sugoroku", name: "Sugoroku", kana: "双六" }');
  });

  it("carry no attribution to an assistant, anywhere in what is published", () => {
    for (const file of ["README.md", "CHANGELOG.md", "CONTRIBUTING.md", "docs/VARIANTS.md", "demo/demo.js", "sounds/CREDITS.txt"]) {
      expect(readFileSync(file, "utf8"), file).not.toMatch(/co-authored-by|generated with|claude/i);
    }
  });

  it("credit the sounds to their source and licence", () => {
    const credits = readFileSync("sounds/CREDITS.txt", "utf8");
    expect(credits).toMatch(/Creative Commons\s+Zero/);
    expect(credits).toMatch(/kenney\.nl/);
    expect(readme).toMatch(/Creative Commons Zero/);
  });
});

describe("the README's promises", () => {
  it("has the sections a package of this family has, each with something in it", () => {
    for (const heading of ["In 30 seconds", "Who it is for", "Features", "Use it in your project", "API", "Theming", "Limits", "Browser support", "Languages", "Roadmap", "Architecture", "The name", "Where it comes from, and where it is used", "Development", "Contributing", "Changes", "Licence"]) {
      expect(section(heading).length, heading).toBeGreaterThan(heading.length + 40);
    }
  });

  it("installs the package it is, and every version it names is the one in package.json", () => {
    expect(readme).toContain(`npm install ${pkg.name}`);
    const major = pkg.version.split(".")[0];
    const named = [...readme.matchAll(/@johnmorrisdotca\/sugoroku@([\w.-]+)/g)].map((match) => match[1]);
    expect(named.length).toBeGreaterThan(0);
    for (const version of named) expect(version).toBe(major);
    expect(readme).not.toMatch(/\bsugoroku@\d+\.\d+/);
  });

  it("links only to files that exist", () => {
    const targets = [...readme.matchAll(/\]\((?!https?:|#|mailto:)([^)\s#]+)/g)].map((match) => match[1]);
    expect(targets.length).toBeGreaterThan(5);
    for (const target of targets) expect(existsSync(target), target).toBe(true);
  });

  it("lists every package of the family, with its kana, as the demo's footer does", () => {
    const template = readFileSync("scripts/family-template.mjs", "utf8");
    const family = [...template.matchAll(/\{ id: "([\w-]+)", name: "(\w+)", kana: "([^"]+)" \}/g)].map((match) => ({ id: match[1], name: match[2], kana: match[3] }));
    expect(family.length).toBeGreaterThanOrEqual(16);
    const block = readme.slice(readme.indexOf("### The family"), readme.indexOf("\n## ", readme.indexOf("### The family")));
    for (const { id, name, kana } of family) expect(block, id).toContain(`- [${name}](https://github.com/johnmorrisdotca/${id}) (${kana}`);
    const words = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty"];
    expect(block).toContain(`one of ${words[family.length]} packages`);
    expect([...block.matchAll(/^- \[/gm)]).toHaveLength(family.length);
  });

  it("gives every colour of the drawing, and of the playable board, with its light and dark values", () => {
    const light = declarations(SUGOROKU_STYLE.slice(0, SUGOROKU_STYLE.indexOf("@media")));
    const dark = declarations(SUGOROKU_STYLE.slice(SUGOROKU_STYLE.indexOf(':root[data-theme="dark"]')).split("}")[0]);
    const play = SUGOROKU_PLAY_STYLE.slice(SUGOROKU_STYLE.length);
    const playLight = declarations(play.slice(0, play.indexOf("@media")));
    const playDark = declarations(play.slice(play.indexOf(':root[data-theme="dark"]')).split("}")[0]);
    const table = Object.fromEntries(rows(section("Theming")).filter((row) => row[0].startsWith("`--")).map((row) => [row[0].replace(/`/g, ""), row]));
    expect(Object.keys(table).sort()).toEqual([...Object.keys(light), ...Object.keys(playLight)].sort());
    for (const [name, value] of Object.entries({ ...light, ...playLight })) {
      const row = table[name];
      expect(row[2], name).toBe(`\`${value}\``);
      const other = { ...dark, ...playDark }[name];
      expect(row[3], name).toBe(other === undefined || other === value ? "the same" : `\`${other}\``);
    }
  });

  it("states the limits as the code has them", () => {
    const limits = section("Limits");
    expect(limits).toContain(`up to ${CUBE_LIMIT} |`);
    expect(limits).toContain(`| ${MOST_DRAWN}, then a count on the fifth |`);
    expect(MOST_DRAWN).toBe(5);
    expect(limits).toContain(`a draw after ${VARIANTS["anti-backgammon"].drawAfter} turns each`);
    expect(limits).toContain(`| ${VARIANTS.backgammon.checkers}, except Hypergammon's ${VARIANTS.hypergammon.checkers} |`);
    expect(limits).toContain(`| ${VARIANTS.backgammon.dice}, and ${VARIANTS.tabula.dice} at Tabula |`);
    expect(limits).toContain(STRENGTHS.map((name) => `\`${name}\``).join(", "));
    expect(limits).toContain(`starts with \`sugoroku ${RECORD_VERSION}\``);
    const computer = readFileSync("src/computer.ts", "utf8");
    expect(computer).toContain("careful: 4, strong: 10");
    expect(computer).toContain("options.budget ?? 60");
    expect(limits).toContain("its best 4 plays (`careful`) or 10 (`strong`), stopping after 60 ms");
    expect(positionId(startPosition(VARIANTS.backgammon), "white")).toHaveLength(14);
    expect(positionId(startPosition(VARIANTS["backgammon-race"]), "white")).toBeNull();
    expect(positionId(startPosition(VARIANTS.tabula), "white")).toBeNull();
    expect(limits).toContain("14 characters, for the standard board; null for Backgammon Race and Tabula");
  });

  it("keeps docs/strings-ja.md as the board's words, English beside Japanese (pnpm docs:make rewrites it)", () => {
    const cell = (text) => text.replace(/\|/g, "\\|").replace(/\n/g, " ");
    const lines = ["# Sugoroku's words, in English and Japanese", "", "Made from `src/strings.ts` by `pnpm docs:make`; a test fails if the two differ, so this list is never out of date.", "", "**The Japanese has not yet been reviewed by a native reader.** If a line reads wrongly or unnaturally, please", "open a *Fix a translation* issue with the string's name. `{name}` and the other braces are filled in when shown.", "", "| Name | English | Japanese |", "| --- | --- | --- |"];
    for (const key of Object.keys(SUGOROKU_STRINGS.en)) lines.push(`| \`${key}\` | ${cell(SUGOROKU_STRINGS.en[key])} | ${cell(SUGOROKU_STRINGS.ja[key] ?? "")} |`);
    const made = `${lines.join("\n")}\n`;
    if (process.env.UPDATE_DOCS === "1") writeFileSync("docs/strings-ja.md", made);
    expect(readFileSync("docs/strings-ja.md", "utf8")).toBe(made);
  });

  it("has the files a visitor looks for: the package's own issue templates, its security policy, and the rest of what its README links", () => {
    for (const file of [".github/ISSUE_TEMPLATE/report-a-bug.md", ".github/ISSUE_TEMPLATE/suggest-a-feature.md", ".github/ISSUE_TEMPLATE/fix-a-translation.md", ".github/ISSUE_TEMPLATE/add-my-project.md", ".github/ISSUE_TEMPLATE/config.yml", "SECURITY.md"]) expect(existsSync(file), file).toBe(true);
    expect(readme).toContain("issues/new?template=fix-a-translation.md");
  });
});
