// ── server-cache-react ────────────────────────────────────────────
// Use React.cache() for per-request deduplication of db/auth queries.
// Impact: MEDIUM — deduplicates within request, eliminates repeated DB hits

import type { VercelRule } from "./rule";

const serverCacheReact: VercelRule = {
  id: "server-cache-react",
  title: "Per-Request Deduplication with React.cache()",
  impact: "MEDIUM",
  severity: "performance",
  description:
    "Async server functions making database or auth queries run on every call site. Wrap with React.cache() to deduplicate within a single request.",
  url: "https://github.com/vercel-labs/agent-skills/blob/main/skills/react-best-practices/rules/server-cache-react.md",

  check(filePath, content) {
    const issues: ReturnType<VercelRule["check"]> = [];

    // Only TS/TSX files
    if (!filePath.endsWith(".ts") && !filePath.endsWith(".tsx")) return issues;

    const firstLines = content.slice(0, 300);
    // Skip client components
    if (firstLines.includes("'use client'") || firstLines.includes('"use client"'))
      return issues;

    // Must make db or auth queries.
    // Matches both single-level (db.method()) and multi-level ORM calls (prisma.model.method())
    const hasDbQuery =
      /\b(?:prisma|db|supabase|drizzle|sql|knex|mongoose|sequelize)(?:\.\w+)+\s*\(/.test(
        content
      );
    const hasAuthQuery =
      /\bauth\(\)|\bgetSession\(\)|\bgetServerSession\(|\bverifyToken\(/.test(content);

    if (!hasDbQuery && !hasAuthQuery) return issues;

    // Skip if React.cache() is already in use
    const hasReactCacheImport =
      /import\s+\{[^}]*\bcache\b[^}]*\}\s+from\s+['"]react['"]/.test(content);
    const hasReactCacheCall = /\bcache\s*\(/.test(content);
    if (hasReactCacheImport || hasReactCacheCall) return issues;

    // Flag the first exported async function
    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      if (
        /export\s+(?:async\s+function|const\s+\w+\s*=\s*async)/.test(lines[i]!)
      ) {
        issues.push({
          severity: "performance",
          rule: "server-cache-react",
          message:
            "Async server function makes db/auth queries without React.cache() — same query runs on every call site within a request",
          help: 'import { cache } from "react"\nexport const getData = cache(async () => { /* your query */ })',
          file: filePath,
          line: i + 1,
          column: 1,
          url: this.url,
        });
        break; // one issue per file is enough
      }
    }

    return issues;
  },
};

export default serverCacheReact;
