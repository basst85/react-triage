// ── js-tosorted-immutable ─────────────────────────────────────────
// Detect mutable .sort() calls in React component context.
// Impact: MEDIUM — prevents mutation bugs with React state and props

import type { VercelRule } from "./rule";

const jsTosortedImmutable: VercelRule = {
  id: "js-tosorted-immutable",
  title: "Use toSorted() for Immutable Sorting",
  impact: "MEDIUM",
  severity: "performance",
  description:
    ".sort() mutates the array in place, which can cause stale-state bugs when sorting React props or state. Use .toSorted() to return a new array without mutation.",
  url: "https://github.com/vercel-labs/agent-skills/blob/main/skills/react-best-practices/rules/js-tosorted-immutable.md",

  check(filePath, content) {
    const issues: ReturnType<VercelRule["check"]> = [];

    // Only tsx/jsx/ts/js files inside component or utility code
    const validExt =
      filePath.endsWith(".tsx") ||
      filePath.endsWith(".jsx") ||
      filePath.endsWith(".ts") ||
      filePath.endsWith(".js");
    if (!validExt) return issues;

    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;

      // Must contain .sort(
      if (!line.includes(".sort(")) continue;

      // Skip immutable patterns:
      //   [...arr].sort(  /  Array.from(arr).sort(  /  .slice().sort(
      if (
        /\[\.\.\..*\]\.sort\s*\(/.test(line) ||
        /Array\.from\s*\(/.test(line) ||
        /\.slice\s*\([^)]*\)\.sort\s*\(/.test(line)
      ) {
        continue;
      }

      // Match a direct mutable sort: identifier.sort(
      // Exclude: .toSorted( (already immutable)
      const match = line.match(/(\w+)\.sort\s*\(/);
      if (!match) continue;

      const varName = match[1]!;

      // Skip Array.sort, Object.sort (static calls) – not mutation risk in same way
      if (varName === "Array" || varName === "Object") continue;

      issues.push({
        severity: "performance",
        rule: "js-tosorted-immutable",
        message: `"${varName}.sort()" mutates the array in place — use "${varName}.toSorted()" to avoid React state/prop mutation bugs`,
        help:
          "Replace .sort(comparator) with .toSorted(comparator). For older environments: [...arr].sort(comparator)",
        file: filePath,
        line: i + 1,
        column: (line.indexOf(varName) ?? 0) + 1,
        url: this.url,
      });
    }

    return issues;
  },
};

export default jsTosortedImmutable;
