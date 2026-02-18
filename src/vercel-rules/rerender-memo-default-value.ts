// ── rerender-memo-default-value ───────────────────────────────────
// Extract default non-primitive props from memoized components.
// Impact: MEDIUM — restores broken memoization

import type { VercelRule } from "./rule";

const rerenderMemoDefaultValue: VercelRule = {
  id: "rerender-memo-default-value",
  title: "Hoist Default Non-Primitive Props",
  impact: "HIGH",
  severity: "performance",
  description: "Default non-primitive parameter values in memo() components break memoization — new instances are created on every render.",
  url: "https://github.com/vercel-labs/agent-skills/blob/main/skills/react-best-practices/rules/rerender-memo-with-default-value.md",

  check(filePath, content) {
    const issues: ReturnType<VercelRule["check"]> = [];
    if (!content.includes("memo(") && !content.includes("memo<")) return issues;

    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;

      // Look for destructured props with non-primitive defaults inside memo components
      // Pattern: { onClick = () => {} } or { items = [] } or { config = {} }
      const defaultMatch = line.match(/(\w+)\s*=\s*(\(\)\s*=>|function|\{[^}]*\}|\[[^\]]*\])/);
      if (!defaultMatch) continue;

      const propName = defaultMatch[1]!;
      const defaultVal = defaultMatch[2]!;

      // Only flag non-primitive defaults
      if (defaultVal === "{}" || defaultVal === "[]" || defaultVal.startsWith("() =>") || defaultVal === "function") {
        // Check if we're inside a memo component — look back *and* include the current line,
        // because memo( and the destructured props are often on the same line.
        const contextBlock = lines.slice(Math.max(0, i - 10), i + 1).join("\n");
        if (/memo\s*[(<]/.test(contextBlock)) {
          issues.push({
            severity: "performance",
            rule: "rerender-memo-default-value",
            message: `Default value for "${propName}" in memo() component creates new reference every render`,
            help: `Extract to module-level constant: const DEFAULT_${propName.toUpperCase()} = ${defaultVal.slice(0, 20)}`,
            file: filePath,
            line: i + 1,
            column: 1,
            url: this.url,
          });
        }
      }
    }

    return issues;
  },
};

export default rerenderMemoDefaultValue;
