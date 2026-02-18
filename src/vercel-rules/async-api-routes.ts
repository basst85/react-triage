// ── async-api-routes ──────────────────────────────────────────────
// Start promises early, await late in API route handlers.
// Impact: CRITICAL

import type { VercelRule } from "./rule";

const asyncApiRoutes: VercelRule = {
  id: "async-api-routes",
  title: "Start Promises Early in API Routes",
  impact: "CRITICAL",
  severity: "critical",
  description: "In API routes, start promises as early as possible and await them only when the result is needed.",
  url: "https://github.com/vercel-labs/agent-skills/blob/main/skills/react-best-practices/rules/async-api-routes.md",

  check(filePath, content) {
    const issues: ReturnType<VercelRule["check"]> = [];

    // Only check files that look like API route handlers
    const isApiRoute = filePath.includes("/api/") ||
      filePath.includes("route.ts") ||
      filePath.includes("route.js");
    if (!isApiRoute) return issues;

    const lines = content.split("\n");
    const hasExportedHandler = /export\s+(?:async\s+)?function\s+(?:GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)/.test(content);
    if (!hasExportedHandler) return issues;

    // Look for sequential awaits in handler functions
    let inHandler = false;
    let consecutiveAwaits = 0;
    let firstLine = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!.trim();

      if (/export\s+(?:async\s+)?function\s+(?:GET|POST|PUT|PATCH|DELETE)/.test(line)) {
        inHandler = true;
        consecutiveAwaits = 0;
        continue;
      }

      if (inHandler) {
        if (/^(?:const|let|var)\s+\w+\s*=\s*await\s+/.test(line)) {
          if (consecutiveAwaits === 0) firstLine = i;
          consecutiveAwaits++;
        } else if (line.startsWith("}") && consecutiveAwaits >= 2) {
          issues.push({
            severity: "critical",
            rule: "async-api-routes",
            message: `${consecutiveAwaits} sequential awaits in API route — start promises early, await late`,
            help: "Initiate all fetches at the top without await, then await results where needed",
            file: filePath,
            line: firstLine + 1,
            column: 1,
            url: this.url,
          });
          inHandler = false;
          consecutiveAwaits = 0;
        }
      }
    }

    return issues;
  },
};

export default asyncApiRoutes;
