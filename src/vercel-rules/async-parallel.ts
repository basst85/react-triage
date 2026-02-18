// ── async-parallel ─────────────────────────────────────────────────
// Use Promise.all() for independent async operations.
// Impact: CRITICAL — 2-10× improvement

import type { VercelRule } from "./rule";

const asyncParallel: VercelRule = {
  id: "async-parallel",
  title: "Promise.all() for Independent Operations",
  impact: "CRITICAL",
  severity: "critical",
  description: "Sequential awaits on independent operations create waterfalls. Use Promise.all() to parallelize.",
  url: "https://github.com/vercel-labs/agent-skills/blob/main/skills/react-best-practices/rules/async-parallel.md",

  check(filePath, content) {
    const issues = this._issues(filePath, content);
    return issues;
  },

  _issues(filePath: string, content: string) {
    const issues: ReturnType<VercelRule["check"]> = [];
    const lines = content.split("\n");

    // Detect sequential awaits: two or more `await` statements in a row
    // without one depending on the result of the previous
    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i]!.trim();
      const nextLine = lines[i + 1]?.trim() ?? "";

      // Match: const x = await foo() followed by const y = await bar()
      const awaitAssign = /^(?:const|let|var)\s+(\w+)\s*=\s*await\s+/;
      const matchCurrent = line.match(awaitAssign);
      const matchNext = nextLine.match(awaitAssign);

      if (matchCurrent && matchNext) {
        const firstVar = matchCurrent[1]!;
        // Check the next line doesn't use the variable from the first
        if (!nextLine.includes(firstVar)) {
          issues.push({
            severity: "critical",
            rule: "async-parallel",
            message: `Sequential independent awaits — use Promise.all([${firstVar}, ${matchNext[1]}]) instead`,
            help: "Independent async operations should run in parallel with Promise.all()",
            file: filePath,
            line: i + 1,
            column: 1,
            url: this.url,
          });
        }
      }
    }

    return issues;
  },
} as VercelRule & { _issues: (f: string, c: string) => ReturnType<VercelRule["check"]> };

export default asyncParallel;
