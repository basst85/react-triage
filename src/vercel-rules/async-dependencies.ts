// ── async-dependencies ─────────────────────────────────────────────
// Use partial dependencies with Promise.all for mixed-dependent operations.
// Impact: CRITICAL

import type { VercelRule } from "./rule";

const asyncDependencies: VercelRule = {
  id: "async-dependencies",
  title: "Parallelize Partially Dependent Operations",
  impact: "CRITICAL",
  severity: "critical",
  description: "When multiple awaits exist and only some depend on others, parallelize the independent ones.",
  url: "https://github.com/vercel-labs/agent-skills/blob/main/skills/react-best-practices/rules/async-dependencies.md",

  check(filePath, content) {
    const issues: ReturnType<VercelRule["check"]> = [];
    const lines = content.split("\n");

    // Detect 3+ sequential awaits in a function — likely has partial dependencies
    let consecutiveAwaits = 0;
    let firstAwaitLine = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!.trim();
      if (/^(?:const|let|var)\s+\w+\s*=\s*await\s+/.test(line)) {
        if (consecutiveAwaits === 0) firstAwaitLine = i;
        consecutiveAwaits++;
      } else if (line === "" || /^\/\//.test(line)) {
        // Skip blank lines and comments
      } else {
        if (consecutiveAwaits >= 3) {
          issues.push({
            severity: "critical",
            rule: "async-dependencies",
            message: `${consecutiveAwaits} sequential awaits — some may be parallelizable with Promise.all()`,
            help: "Group independent operations together and use Promise.all(), then await dependent ones after",
            file: filePath,
            line: firstAwaitLine + 1,
            column: 1,
            url: this.url,
          });
        }
        consecutiveAwaits = 0;
      }
    }

    return issues;
  },
};

export default asyncDependencies;
