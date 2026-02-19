import { describe, expect, it } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { checkDependencies } from "../src/checks";

describe("checkDependencies unused package detection", () => {
  it("flags unused dependencies and devDependencies", async () => {
    const dir = await mkdtemp(join(tmpdir(), "react-triage-unused-"));

    try {
      await Bun.write(
        join(dir, "package.json"),
        JSON.stringify(
          {
            name: "fixture",
            private: true,
            dependencies: {
              "used-dep": "1.0.0",
              "unused-dep": "1.0.0",
            },
            devDependencies: {
              "used-dev": "1.0.0",
              "unused-dev": "1.0.0",
            },
            scripts: {
              test: "used-dev --version",
            },
          },
          null,
          2
        )
      );

      await Bun.write(
        join(dir, "src", "index.ts"),
        `import "used-dep";\n`
      );

      const issues = await checkDependencies(dir);

      expect(
        issues.some(
          (issue) =>
            issue.type === "unused" &&
            issue.message.includes("unused-dep") &&
            issue.message.includes("dependencies")
        )
      ).toBe(true);

      expect(
        issues.some(
          (issue) =>
            issue.type === "unused" &&
            issue.message.includes("unused-dev") &&
            issue.message.includes("devDependencies")
        )
      ).toBe(true);

      expect(
        issues.some((issue) => issue.message.startsWith('"used-dep" appears unused'))
      ).toBe(false);
      expect(
        issues.some((issue) => issue.message.startsWith('"used-dev" appears unused'))
      ).toBe(false);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("treats scoped deep imports as usage of the root package", async () => {
    const dir = await mkdtemp(join(tmpdir(), "react-triage-scoped-"));

    try {
      await Bun.write(
        join(dir, "package.json"),
        JSON.stringify(
          {
            name: "fixture",
            private: true,
            dependencies: {
              "@scope/pkg": "1.0.0",
            },
          },
          null,
          2
        )
      );

      await Bun.write(
        join(dir, "src", "index.ts"),
        `const mod = await import("@scope/pkg/utils");\nvoid mod;\n`
      );

      const issues = await checkDependencies(dir);

      expect(
        issues.some(
          (issue) => issue.type === "unused" && issue.message.includes("@scope/pkg")
        )
      ).toBe(false);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
