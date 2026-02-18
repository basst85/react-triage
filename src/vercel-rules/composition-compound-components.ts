// ── composition-compound-components ──────────────────────────────
// Detect render-prop proliferation — the anti-pattern that compound
// components with shared context solve.
// Impact: HIGH — enables flexible composition without prop drilling

import type { VercelRule } from "./rule";

const compositionCompoundComponents: VercelRule = {
  id: "composition-compound-components",
  title: "Use Compound Components Instead of Render Props",
  impact: "HIGH",
  severity: "best-practice",
  description:
    "Components with multiple renderX props (renderHeader, renderFooter…) hide conditionals and force consumers to manage internals. Use compound components with a shared context so consumers compose exactly what they need.",
  url: "https://github.com/vercel-labs/agent-skills/blob/main/skills/vercel-composition-patterns/rules/architecture-compound-components.md",

  check(filePath, content) {
    const issues: ReturnType<VercelRule["check"]> = [];

    // Only tsx/jsx component files
    if (!filePath.endsWith(".tsx") && !filePath.endsWith(".jsx")) return issues;

    // Skip if compound pattern already in use (createContext / Context.Provider exported)
    if (/createContext\s*\(/.test(content)) return issues;

    const lines = content.split("\n");

    // ── Signal 1: Props type has 2+ render* function props ──────────
    // E.g. renderHeader?: () => ReactNode
    const renderPropTypeRegex =
      /render[A-Z]\w*\s*\??\s*:\s*(?:\(\s*\)\s*=>|\(\s*\w[^)]*\)\s*=>|React\.ReactNode|ReactNode|JSX\.Element)/g;
    const renderPropTypes = [...content.matchAll(renderPropTypeRegex)];

    if (renderPropTypes.length >= 2) {
      // Find the line of the first match
      const firstMatchIndex = content.indexOf(renderPropTypes[0]![0]);
      const lineNum = content.slice(0, firstMatchIndex).split("\n").length;
      const propNames = renderPropTypes.map((m) => m[0].split(/[\s?:(]/)[0]!).join(", ");

      issues.push({
        severity: "best-practice",
        rule: "composition-compound-components",
        message: `${renderPropTypes.length} render* props detected (${propNames}) — use compound components with createContext instead`,
        help:
          "Export a compound object: const MyComponent = { Frame, Header, Input, Footer } — consumers compose exactly what they need",
        file: filePath,
        line: lineNum,
        column: 1,
        url: this.url,
      });

      return issues; // one issue per signal is enough
    }

    // ── Signal 2: render* props destructured in component parameters ─
    // E.g. function Foo({ renderHeader, renderFooter, renderActions })
    const destructureRenderRegex =
      /function\s+\w+\s*\(\s*\{[^}]*render[A-Z]\w*[^}]*render[A-Z]\w*[^}]*\}/;
    const arrowRenderRegex =
      /(?:const|let)\s+\w+\s*=\s*\([^)]*render[A-Z]\w*[^)]*render[A-Z]\w*[^)]*\)\s*=>/;

    for (let i = 0; i < lines.length; i++) {
      // Multi-line: collect up to 6 lines for the function signature
      const block = lines.slice(i, Math.min(i + 6, lines.length)).join(" ");
      if (destructureRenderRegex.test(block) || arrowRenderRegex.test(block)) {
        issues.push({
          severity: "best-practice",
          rule: "composition-compound-components",
          message:
            "Component accepts multiple render* function props — use compound components with shared context instead",
          help:
            "Export a compound object: const MyComponent = { Frame, Header, Input, Footer } — consumers compose exactly what they need",
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

export default compositionCompoundComponents;
