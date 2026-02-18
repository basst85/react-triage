// ── use-next-og ──────────────────────────────────────────────────
// Use next/og instead of @vercel/og for OG image generation.
// Impact: MEDIUM — next/og is built into Next.js, no extra dependency needed

import type { VercelRule } from "./rule";

const useNextOg: VercelRule = {
  id: "use-next-og",
  title: "Use next/og Instead of @vercel/og",
  impact: "MEDIUM",
  severity: "best-practice",
  description:
    "`ImageResponse` is built into Next.js via `next/og`. Using `@vercel/og` is unnecessary and adds an extra dependency.",
  url: "https://nextjs.org/docs/app/api-reference/functions/image-response",

  check(filePath, content) {
    const issues: ReturnType<VercelRule["check"]> = [];

    // Only check .ts/.tsx/.js/.jsx files
    if (
      !filePath.endsWith(".ts") &&
      !filePath.endsWith(".tsx") &&
      !filePath.endsWith(".js") &&
      !filePath.endsWith(".jsx")
    )
      return issues;

    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;

      // Detect: import ... from '@vercel/og'
      if (
        /import\s+.*from\s+['"]@vercel\/og['"]/.test(line) ||
        /require\s*\(\s*['"]@vercel\/og['"]\s*\)/.test(line)
      ) {
        issues.push({
          severity: "best-practice",
          rule: "use-next-og",
          message:
            'Import from "@vercel/og" — use "next/og" instead (built into Next.js)',
          help: "Replace: import { ImageResponse } from 'next/og'",
          file: filePath,
          line: i + 1,
          column: 1,
          url: this.url,
        });
      }
    }

    return issues;
  },
};

export default useNextOg;
