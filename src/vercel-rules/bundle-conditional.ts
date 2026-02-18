// ── bundle-conditional ─────────────────────────────────────────────
// Load modules only when a feature is activated.
// Impact: HIGH — loads large data only when needed

import type { VercelRule } from "./rule";

const bundleConditional: VercelRule = {
  id: "bundle-conditional",
  title: "Conditional Module Loading",
  impact: "HIGH",
  severity: "performance",
  description: "Large data modules imported at the top-level load even when features are disabled. Use dynamic import() inside conditions.",
  url: "https://github.com/vercel-labs/agent-skills/blob/main/skills/react-best-practices/rules/bundle-conditional.md",

  check(filePath, content) {
    const issues: ReturnType<VercelRule["check"]> = [];

    // Only check component files
    if (!filePath.endsWith(".tsx") && !filePath.endsWith(".jsx")) return issues;

    const lines = content.split("\n");

    // Detect: static import of data/json files (large data bundles)
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      const match = line.match(/^import\s+(\w+)\s+from\s+['"]([^'"]+\.(?:json|data\.\w+))['"]/);
      if (match) {
        const varName = match[1]!;
        const source = match[2]!;
        // Check if the imported data is used conditionally
        const restOfFile = content.slice(content.indexOf(line) + line.length);
        if (/\b(?:if|enabled|show|visible|active)\b/.test(restOfFile) &&
            restOfFile.includes(varName)) {
          issues.push({
            severity: "performance",
            rule: "bundle-conditional",
            message: `"${source}" is statically imported but used conditionally — use dynamic import()`,
            help: "Load large data modules with import() inside useEffect or event handlers",
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

export default bundleConditional;
