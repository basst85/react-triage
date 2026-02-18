// ── server-dedup-props ────────────────────────────────────────────
// Avoid passing both an array and a transformed version as separate RSC props.
// Impact: LOW — reduces unnecessary serialization at RSC boundaries

import type { VercelRule } from "./rule";

const serverDedupProps: VercelRule = {
  id: "server-dedup-props",
  title: "Avoid Duplicate Serialization in RSC Props",
  impact: "LOW",
  severity: "performance",
  description:
    "RSC→client serialization deduplicates by object reference. Passing both an array and a transformed version (toSorted, filter, map…) as separate props serializes both arrays. Send once and transform in the client.",
  url: "https://github.com/vercel-labs/agent-skills/blob/main/skills/react-best-practices/rules/server-dedup-props.md",

  check(filePath, content) {
    const issues: ReturnType<VercelRule["check"]> = [];

    // Only RSC files: tsx/jsx, no 'use client'
    if (!filePath.endsWith(".tsx") && !filePath.endsWith(".jsx")) return issues;
    const firstLines = content.slice(0, 300);
    if (firstLines.includes("'use client'") || firstLines.includes('"use client"'))
      return issues;

    const lines = content.split("\n");

    // Look for a transformed prop: someProp={varName.toSorted( / .filter( / .map( etc.
    // Then check if varName also appears as a direct prop value within ±8 lines
    const TRANSFORMS = ["toSorted", "toReversed", "filter", "map", "slice", "flat", "flatMap"];
    const transformRegex = new RegExp(
      `\\w+=\\{(\\w+)\\.(${TRANSFORMS.join("|")})\\s*\\(`
    );

    for (let i = 0; i < lines.length; i++) {
      const match = lines[i]!.match(transformRegex);
      if (!match) continue;

      const sourceVar = match[1]!;
      const transform = match[2]!;

      // Scan nearby lines for the same variable passed as a direct prop: prop={sourceVar}
      const start = Math.max(0, i - 8);
      const end = Math.min(lines.length - 1, i + 8);
      const directPropRegex = new RegExp(`\\w+=\\{${sourceVar}\\}(?:[^.]|$)`);

      for (let j = start; j <= end; j++) {
        if (j === i) continue;
        if (directPropRegex.test(lines[j]!)) {
          issues.push({
            severity: "performance",
            rule: "server-dedup-props",
            message: `RSC passes both "${sourceVar}" and "${sourceVar}.${transform}()" as props — serializes the array twice`,
            help: `Pass only "${sourceVar}" to the client component and apply .${transform}() there with useMemo`,
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

export default serverDedupProps;
