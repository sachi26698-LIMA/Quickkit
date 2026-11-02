import { createRequire } from "node:module";
import { describe, it, expect } from "vitest";
import cases from "./glob-compat-cases.json";
const require = createRequire(import.meta.url);
const consumerRequire = createRequire(
  require.resolve("@typescript-eslint/typescript-estree"),
);
const fixed = consumerRequire("minimatch") as {
  minimatch: (
    path: string,
    pattern: string,
    options: { dot: boolean },
  ) => boolean;
};
describe("scoped minimatch upgrade compatibility", () => {
  it("matches the real parser call surface against the pre-upgrade corpus", () => {
    for (const item of cases)
      expect(
        fixed.minimatch(item.path, item.pattern, { dot: true }),
        JSON.stringify(item),
      ).toBe(item.expected);
  });
  it("uses the fixed dependency only for the named-export consumer", () => {
    expect(consumerRequire("minimatch/package.json").version).toBe("11.0.3");
    expect(require("minimatch/package.json").version).toBe("3.1.5");
    expect(typeof require("minimatch")).toBe("function");
  });
  it("confirms the residual v3 code has no vulnerable optimizer", () => {
    const legacy = require("minimatch");
    expect(legacy.Minimatch.prototype.firstPhasePreProcess).toBeUndefined();
    expect(legacy.Minimatch.prototype.secondPhasePreProcess).toBeUndefined();
  });
});
it("runs the real parser project-service default-project matcher", async () => {
  const { readFileSync } = await import("node:fs");
  const parser = require("@typescript-eslint/parser");
  const result = parser.parseForESLint(
    readFileSync("eslint.config.mjs", "utf8"),
    {
      filePath: process.cwd() + "/eslint.config.mjs",
      tsconfigRootDir: process.cwd(),
      projectService: { allowDefaultProject: ["*.mjs"] },
    },
  );
  expect(result.ast.type).toBe("Program");
}, 20_000);
