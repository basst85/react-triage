// ── async-suspense-boundaries ──────────────────────────────────────
// Use Suspense to stream content instead of blocking the full page.
// Impact: HIGH — faster initial paint

import type { VercelRule } from "./rule";

const asyncSuspenseBoundaries: VercelRule = {
  id: "async-suspense-boundaries",
  title: "Strategic Suspense Boundaries",
  impact: "HIGH",
  severity: "performance",
  description: "Async Server Components that await data block the entire page. Use Suspense boundaries to stream partial UI.",
  url: "https://github.com/vercel-labs/agent-skills/blob/main/skills/react-best-practices/rules/async-suspense-boundaries.md",

  check(filePath, content) {
    const issues: ReturnType<VercelRule["check"]> = [];

    // Only check .tsx/.jsx files
    if (!filePath.endsWith(".tsx") && !filePath.endsWith(".jsx")) return issues;

    // Detect: async function component with await before JSX return, no Suspense in file
    const hasAsyncComponent = /export\s+(?:default\s+)?async\s+function\s+\w+/.test(content);
    const hasAwaitBeforeReturn = /await\s+\w+[\s\S]*?return\s*\(?\s*</.test(content);
    const hasSuspense = /Suspense/.test(content);

    if (hasAsyncComponent && hasAwaitBeforeReturn && !hasSuspense) {
      const lines = content.split("\n");
      // Find the line with the async component
      for (let i = 0; i < lines.length; i++) {
        if (/export\s+(?:default\s+)?async\s+function/.test(lines[i]!)) {
          issues.push({
            severity: "performance",
            rule: "async-suspense-boundaries",
            message: "Async component awaits data without Suspense — entire page blocks until data loads",
            help: "Move data fetching into a child component and wrap it with <Suspense>",
            file: filePath,
            line: i + 1,
            column: 1,
            url: this.url,
          });
          break;
        }
      }
    }

    return issues;
  },
};

export default asyncSuspenseBoundaries;
