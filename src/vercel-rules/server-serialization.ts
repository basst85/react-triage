// ── server-serialization ──────────────────────────────────────────
// Minimize data passed from Server to Client Components.
// Impact: HIGH — reduces data transfer size

import type { VercelRule } from "./rule";

const serverSerialization: VercelRule = {
  id: "server-serialization",
  title: "Minimize Serialization at RSC Boundaries",
  impact: "HIGH",
  severity: "performance",
  description: "Passing entire objects from Server to Client Components serializes all fields into HTML. Only pass the fields the client needs.",
  url: "https://github.com/vercel-labs/agent-skills/blob/main/skills/react-best-practices/rules/server-serialization.md",

  check(filePath, content) {
    const issues: ReturnType<VercelRule["check"]> = [];

    // Only check server component files (.tsx/.jsx without "use client")
    if (!filePath.endsWith(".tsx") && !filePath.endsWith(".jsx")) return issues;
    const firstLines = content.slice(0, 300);
    if (firstLines.includes("'use client'") || firstLines.includes('"use client"')) return issues;

    const lines = content.split("\n");

    // Detect pattern: variable = await fetch/query, then passed as single prop like <Component data={variable} />
    // This suggests the entire result object is passed to a child
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!.trim();

      // Match: <ClientComponent data={bigObject} /> or similar patterns
      // where the prop value is a single variable (not destructured)
      const jsxPropMatch = line.match(/<(\w+)\s+(\w+)=\{(\w+)\}\s*\/?\s*>/);
      if (!jsxPropMatch) continue;

      const componentName = jsxPropMatch[1]!;
      const propName = jsxPropMatch[2]!;
      const varName = jsxPropMatch[3]!;

      // Skip if prop name suggests it's already specific
      if (/^(?:id|name|title|label|value|error|loading|disabled|className|style|key|ref|children)$/.test(propName)) {
        continue;
      }

      // Check if varName was from an await (fetched data)
      const prevContent = content.slice(0, content.indexOf(line));
      const isFetchedVar = new RegExp(`(?:const|let)\\s+${varName}\\s*=\\s*await\\s+`).test(prevContent);

      if (isFetchedVar && /^[A-Z]/.test(componentName)) {
        issues.push({
          severity: "performance",
          rule: "server-serialization",
          message: `Entire fetched object "${varName}" passed to <${componentName}> — only pass needed fields`,
          help: `Destructure: <${componentName} ${propName}={${varName}.specificField} /> to reduce serialization`,
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

export default serverSerialization;
