import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/** The architecture guide tree names every source file, and nothing that is not one, so it cannot fall behind the code. */
describe("the architecture guide", () => {
  it("names exactly the files under src/", () => {
    const guide = readFileSync("docs/guides/architecture.md", "utf8");
    const section = guide.slice(guide.indexOf("## Source organization"));
    const tree = section.slice(section.indexOf("```text"), section.indexOf("```", section.indexOf("```text") + 7));
    const named = [...tree.matchAll(/[├└]── ([\w.-]+\.ts)\b/g)].map((match) => match[1]).sort();
    const files = readdirSync("src", { recursive: true })
      .filter((path) => path.endsWith(".ts") && !/\.(test|fixture)\./.test(path))
      .map((path) => path.split(/[\\/]/).at(-1))
      .sort();
    expect(named).toEqual(files);
  });
});
