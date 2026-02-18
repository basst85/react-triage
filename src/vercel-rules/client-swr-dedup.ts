// ── client-swr-dedup ──────────────────────────────────────────────
// Use SWR/React Query for automatic request deduplication.
// Impact: MEDIUM-HIGH — automatic deduplication

import type { VercelRule } from "./rule";

const clientSwrDedup: VercelRule = {
  id: "client-swr-dedup",
  title: "Use SWR for Automatic Deduplication",
  impact: "HIGH",
  severity: "performance",
  description: "useEffect + fetch causes duplicate requests when multiple instances mount. Use SWR or React Query for automatic deduplication.",
  url: "https://github.com/vercel-labs/agent-skills/blob/main/skills/react-best-practices/rules/client-swr-dedup.md",

  check(filePath, content) {
    const issues: ReturnType<VercelRule["check"]> = [];

    // Only check client component files
    if (!filePath.endsWith(".tsx") && !filePath.endsWith(".jsx") && !filePath.endsWith(".ts")) return issues;

    const lines = content.split("\n");
    const hasSwrOrQuery = /(?:useSWR|useQuery|@tanstack\/react-query|swr)/.test(content);
    if (hasSwrOrQuery) return issues;

    // Detect: useEffect(() => { fetch(...) }, [])
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!.trim();
      if (!/useEffect\s*\(/.test(line)) continue;

      // Look in the next 10 lines for fetch/axios call
      for (let j = i; j < Math.min(i + 10, lines.length); j++) {
        const bodyLine = lines[j]!;
        if (/(?:fetch\s*\(|axios\.\w+\s*\(|\.get\s*\(|\.post\s*\()/.test(bodyLine)) {
          // Check if the effect has empty deps or simple deps (data fetching pattern)
          const effectBlock = lines.slice(i, Math.min(i + 15, lines.length)).join("\n");
          if (/\],?\s*\)/.test(effectBlock)) {
            issues.push({
              severity: "performance",
              rule: "client-swr-dedup",
              message: "useEffect + fetch pattern detected — consider useSWR or useQuery for deduplication and caching",
              help: "Replace with: const { data } = useSWR(key, fetcher) for automatic dedup, caching, and revalidation",
              file: filePath,
              line: j + 1,
              column: 1,
              url: this.url,
            });
            break;
          }
        }
      }
    }

    return issues;
  },
};

export default clientSwrDedup;
