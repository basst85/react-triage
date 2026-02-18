// ── async-defer-await ──────────────────────────────────────────────
// Move await into branches where actually used.
// Impact: HIGH — avoids blocking unused code paths

import type { VercelRule } from "./rule";

const asyncDeferAwait: VercelRule = {
  id: "async-defer-await",
  title: "Defer Await Until Needed",
  impact: "HIGH",
  severity: "performance",
  description: "Await is used before an early return that doesn't need the result. Move await into the branch that uses it.",
  url: "https://github.com/vercel-labs/agent-skills/blob/main/skills/react-best-practices/rules/async-defer-await.md",

  check(filePath, content) {
    const issues: ReturnType<VercelRule["check"]> = [];
    const lines = content.split("\n");

    // Pattern: `const x = await ...` followed within 5 lines by
    // `if (...) { return ... }` where the return doesn't use `x`
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!.trim();
      const awaitMatch = line.match(/^(?:const|let|var)\s+(\w+)\s*=\s*await\s+/);
      if (!awaitMatch) continue;

      const varName = awaitMatch[1]!;
      // Look ahead for early return within 5 lines
      for (let j = i + 1; j < Math.min(i + 6, lines.length); j++) {
        const ahead = lines[j]!.trim();
        // Match: if (...) { return ... } or if (...) return ...
        if (/^if\s*\(/.test(ahead) && /return\s/.test(ahead) && !ahead.includes(varName)) {
          issues.push({
            severity: "performance",
            rule: "async-defer-await",
            message: `"${varName}" is awaited before an early return that doesn't use it — move await after the guard`,
            help: "Defer await until the branch where the result is actually needed",
            file: filePath,
            line: i + 1,
            column: 1,
            url: this.url,
          });
          break;
        }
        // Stop looking if the variable is used
        if (ahead.includes(varName)) break;
      }
    }

    return issues;
  },
};

export default asyncDeferAwait;
