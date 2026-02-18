// ── metadata-in-client-component ──────────────────────────────────
// Metadata exports are only supported in Server Components.
// Impact: HIGH — metadata silently ignored in client components

import type { VercelRule } from "./rule";

const metadataInClientComponent: VercelRule = {
  id: "metadata-in-client-component",
  title: "Metadata Not Supported in Client Components",
  impact: "HIGH",
  severity: "critical",
  description:
    "The `metadata` object and `generateMetadata` function are only supported in Server Components. In files with 'use client', metadata is silently ignored.",
  url: "https://nextjs.org/docs/app/building-your-application/optimizing/metadata",

  check(filePath, content) {
    const issues: ReturnType<VercelRule["check"]> = [];

    // Only check .tsx/.jsx/.ts files in the app directory
    if (
      !filePath.endsWith(".tsx") &&
      !filePath.endsWith(".jsx") &&
      !filePath.endsWith(".ts")
    )
      return issues;

    // Must be a client component
    const firstLines = content.slice(0, 300);
    if (
      !firstLines.includes("'use client'") &&
      !firstLines.includes('"use client"')
    )
      return issues;

    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!.trim();

      // Detect: export const metadata = ...
      if (/^export\s+const\s+metadata\b/.test(line)) {
        issues.push({
          severity: "critical",
          rule: "metadata-in-client-component",
          message:
            '`export const metadata` in a "use client" file — metadata is only supported in Server Components',
          help: "Remove 'use client' and move client logic to child components, or extract metadata to a parent layout",
          file: filePath,
          line: i + 1,
          column: 1,
          url: this.url,
        });
      }

      // Detect: export async function generateMetadata
      if (/^export\s+(async\s+)?function\s+generateMetadata\b/.test(line)) {
        issues.push({
          severity: "critical",
          rule: "metadata-in-client-component",
          message:
            '`generateMetadata` in a "use client" file — metadata is only supported in Server Components',
          help: "Remove 'use client' and move client logic to child components, or extract metadata to a parent layout",
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

export default metadataInClientComponent;
