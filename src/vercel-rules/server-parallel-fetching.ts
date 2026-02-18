// ── server-parallel-fetching ───────────────────────────────────────
// Restructure RSC components to parallelize data fetching.
// Impact: CRITICAL — eliminates server-side waterfalls

import type { VercelRule } from "./rule";

const serverParallelFetching: VercelRule = {
  id: "server-parallel-fetching",
  title: "Parallel Data Fetching with Component Composition",
  impact: "CRITICAL",
  severity: "critical",
  description: "Async Server Components with await before rendering children create sequential waterfalls. Use composition to parallelize.",
  url: "https://github.com/vercel-labs/agent-skills/blob/main/skills/react-best-practices/rules/server-parallel-fetching.md",

  check(filePath, content) {
    const issues: ReturnType<VercelRule["check"]> = [];

    // Only check server component tsx/jsx files
    if (!filePath.endsWith(".tsx") && !filePath.endsWith(".jsx")) return issues;
    const firstLines = content.slice(0, 300);
    if (firstLines.includes("'use client'") || firstLines.includes('"use client"')) return issues;

    const lines = content.split("\n");

    // Detect: async function component that awaits data AND renders
    // child async components (which themselves will await)
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      if (!/export\s+(?:default\s+)?async\s+function\s+(\w+)/.test(line)) continue;

      // Look in the function body for: await + rendering async child components
      const bodyStart = i + 1;
      let awaitCount = 0;
      let hasChildComponent = false;
      let awaitLine = 0;

      for (let j = bodyStart; j < Math.min(bodyStart + 50, lines.length); j++) {
        const bodyLine = lines[j]!.trim();
        if (/^(?:const|let|var)\s+\w+\s*=\s*await\s+/.test(bodyLine)) {
          if (awaitCount === 0) awaitLine = j;
          awaitCount++;
        }
        // Check for JSX children that are async components (PascalCase)
        if (/<[A-Z]\w+[^>]*\/>/.test(bodyLine) && awaitCount > 0) {
          hasChildComponent = true;
        }
        // Stop at function end
        if (bodyLine === "}" && j > bodyStart + 2) break;
      }

      // If parent awaits data AND renders child components, the children have to wait
      if (awaitCount > 0 && hasChildComponent) {
        issues.push({
          severity: "critical",
          rule: "server-parallel-fetching",
          message: "Parent component awaits before rendering children — children can't start fetching until parent finishes",
          help: "Move data fetching into each child component so they can fetch in parallel",
          file: filePath,
          line: awaitLine + 1,
          column: 1,
          url: this.url,
        });
      }
    }

    return issues;
  },
};

export default serverParallelFetching;
