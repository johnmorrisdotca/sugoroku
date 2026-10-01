// The documents and the demo, held to the source. Plain JavaScript, so that reading files needs no Node types.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { PRESETS } from "./rules.ts";
import { SugorokuBoard } from "./element.ts";
import { VARIANT_KEYS } from "./variants.ts";
import { VERSION } from "./version.ts";

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const readme = readFileSync("README.md", "utf8");
const variants = readFileSync("docs/VARIANTS.md", "utf8");

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
