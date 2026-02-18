// ── composition-boolean-props ─────────────────────────────────────
// Detect boolean prop proliferation — a sign that composition is needed.
// Impact: HIGH — prevents exponentially complex component variants

import type { VercelRule } from "./rule";

const compositionBooleanProps: VercelRule = {
  id: "composition-boolean-props",
  title: "Avoid Boolean Prop Proliferation",
  impact: "HIGH",
  severity: "best-practice",
  description:
    "Components with 3+ boolean props (isX, hasX, showX…) create exponential state combinations and unmaintainable conditional logic. Use composition with explicit variant components instead.",
  url: "https://github.com/vercel-labs/agent-skills/blob/main/skills/vercel-composition-patterns/rules/architecture-avoid-boolean-props.md",

  check(filePath, content) {
    const issues: ReturnType<VercelRule["check"]> = [];

    // Only tsx/jsx component files
    if (!filePath.endsWith(".tsx") && !filePath.endsWith(".jsx")) return issues;

    // Find Props interfaces and types: interface XxxProps { … } or type XxxProps = { … }
    // Use a line-based scan to handle multiline blocks robustly
    const lines = content.split("\n");

    // Find opening of a Props type/interface
    const propsOpenRegex =
      /(?:interface|type)\s+\w*[Pp]rops\w*\s*(?:extends[^{]*)?\{|(?:interface|type)\s+\w*[Pp]rops\w*\s*=/;

    for (let i = 0; i < lines.length; i++) {
      if (!propsOpenRegex.test(lines[i]!)) continue;

      // Collect lines of this block until the closing brace
      let depth = 0;
      const blockLines: string[] = [];
      let blockStart = i;

      for (let j = i; j < Math.min(i + 80, lines.length); j++) {
        const l = lines[j]!;
        depth += (l.match(/\{/g) ?? []).length;
        depth -= (l.match(/\}/g) ?? []).length;
        blockLines.push(l);
        if (j > i && depth <= 0) break;
      }

      const block = blockLines.join("\n");

      // Count boolean-flavoured props: isX, hasX, showX, hideX, enableX, disableX, withX
      const boolPropRegex =
        /\b(?:is|has|show|hide|enable|disable|with)[A-Z]\w*\s*\??\s*:\s*boolean/g;
      const boolProps = [...block.matchAll(boolPropRegex)];

      if (boolProps.length >= 3) {
        const propNames = boolProps
          .map((m) => m[0].split(/[\s?:]/)[0]!)
          .join(", ");

        issues.push({
          severity: "best-practice",
          rule: "composition-boolean-props",
          message: `${boolProps.length} boolean props detected (${propNames}) — use explicit variant components instead`,
          help:
            "Create separate ChannelComposer, ThreadComposer, EditComposer components rather than a single component with boolean switches",
          file: filePath,
          line: blockStart + 1,
          column: 1,
          url: this.url,
        });
      }
    }

    return issues;
  },
};

export default compositionBooleanProps;
