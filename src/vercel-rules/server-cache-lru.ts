// ── server-cache-lru ──────────────────────────────────────────────
// Use LRU cache for cross-request caching of expensive DB queries.
// Impact: HIGH — caches across requests, eliminates redundant DB hits

import type { VercelRule } from "./rule";

const serverCacheLru: VercelRule = {
  id: "server-cache-lru",
  title: "Cross-Request LRU Caching",
  impact: "HIGH",
  severity: "performance",
  description:
    "React.cache() only deduplicates within one request. Server-side data utility functions accessed by sequential requests should use an LRU cache to avoid redundant database queries.",
  url: "https://github.com/vercel-labs/agent-skills/blob/main/skills/react-best-practices/rules/server-cache-lru.md",

  check(filePath, content) {
    const issues: ReturnType<VercelRule["check"]> = [];

    // Only plain TS files — data/utility/repository layers
    if (!filePath.endsWith(".ts")) return issues;

    const firstLines = content.slice(0, 300);
    if (firstLines.includes("'use client'") || firstLines.includes('"use client"'))
      return issues;

    // Must look like a data-access file
    const looksLikeDataFile =
      /lib\/|utils\/|helpers\/|services\/|data\/|queries\/|db\/|repositories\//.test(
        filePath
      ) || /\.service\.ts$|\.repo\.ts$|\.query\.ts$|\.dal\.ts$/.test(filePath);
    if (!looksLikeDataFile) return issues;

    // Must have actual db queries.
    // Matches both single-level (db.method()) and multi-level ORM calls (prisma.model.method())
    const hasDbQuery =
      /\b(?:prisma|db|supabase|drizzle|sql|mongoose|sequelize)(?:\.\w+)+\s*\(/.test(
        content
      );
    if (!hasDbQuery) return issues;

    // Skip if any cross-request caching is already present
    const hasLRU = /LRUCache|lru-cache|lruCache/.test(content);
    const hasRedis = /\bredis\b|\bioredis\b|\bupstash\b/.test(content);
    const hasCacheInstance =
      /(?:const|let)\s+\w*[Cc]ache\w*\s*=\s*new\s+\w+/.test(content);
    if (hasLRU || hasRedis || hasCacheInstance) return issues;

    // Find the first db query line
    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      if (
        /\b(?:prisma|db|supabase|drizzle|sql|mongoose|sequelize)(?:\.\w+)+\s*\(/.test(
          lines[i]!
        )
      ) {
        issues.push({
          severity: "performance",
          rule: "server-cache-lru",
          message:
            "Data fetching functions lack cross-request caching — sequential requests hit the database unnecessarily",
          help: 'import { LRUCache } from "lru-cache"\nconst cache = new LRUCache({ max: 500, ttl: 5 * 60 * 1000 })',
          file: filePath,
          line: i + 1,
          column: 1,
          url: this.url,
        });
        break;
      }
    }

    return issues;
  },
};

export default serverCacheLru;
