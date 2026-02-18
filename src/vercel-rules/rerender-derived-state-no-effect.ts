// ── rerender-derived-state-no-effect ──────────────────────────────
// Derive state during render, not in effects.
// Impact: MEDIUM — avoids redundant renders

import type { VercelRule } from "./rule";

const rerenderDerivedStateNoEffect: VercelRule = {
  id: "rerender-derived-state-no-effect",
  title: "Calculate Derived State During Rendering",
  impact: "HIGH",
  severity: "performance",
  description: "Using useEffect + setState to derive values from props/state causes an extra render cycle. Compute derived values directly during render.",
  url: "https://github.com/vercel-labs/agent-skills/blob/main/skills/react-best-practices/rules/rerender-derived-state-no-effect.md",

  check(filePath, content) {
    const issues: ReturnType<VercelRule["check"]> = [];

    // Only check component files
    if (!filePath.endsWith(".tsx") && !filePath.endsWith(".jsx")) return issues;
    if (!content.includes("useEffect") || !content.includes("useState")) return issues;

    const lines = content.split("\n");

    // Pattern: useState for derived value, then useEffect that sets it from other state/props
    // Detect: useEffect(() => { setX(derived from Y) }, [Y])
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!.trim();
      if (!/useEffect\s*\(/.test(line)) continue;

      // Look in the effect body for a lone setState call
      const effectBlock = lines.slice(i, Math.min(i + 8, lines.length)).join("\n");

      // Match: useEffect(() => { setSomething(expression) }, [deps])
      const setterMatch = effectBlock.match(/\bset([A-Z]\w*)\s*\(/);
      if (!setterMatch) continue;

      const stateVar = setterMatch[1]!;
      const stateVarLower = stateVar.charAt(0).toLowerCase() + stateVar.slice(1);

      // Count statements in the effect — if only 1 (the setter), it's likely derived state
      const statementsInEffect = effectBlock.split("\n")
        .map(l => l.trim())
        .filter(l => l && !l.startsWith("//") && !l.startsWith("useEffect") && l !== "}" && l !== "},")
        .filter(l => !l.startsWith("[") && !l.startsWith(")"));

      // Only flag if the effect body is simple (1-2 statements)
      if (statementsInEffect.length <= 3) {
        issues.push({
          severity: "performance",
          rule: "rerender-derived-state-no-effect",
          message: `useEffect updates "${stateVarLower}" from other state — compute during render instead`,
          help: `Replace useState + useEffect with: const ${stateVarLower} = computedValue`,
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

export default rerenderDerivedStateNoEffect;
