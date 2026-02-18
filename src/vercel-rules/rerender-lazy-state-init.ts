// ── rerender-lazy-state-init ──────────────────────────────────────
// Pass function to useState for expensive initial values.
// Impact: MEDIUM — wasted computation on every render

import type { VercelRule } from "./rule";

// Known expensive initializers
const EXPENSIVE_CALLS = /(?:JSON\.parse|localStorage\.\w+|sessionStorage\.\w+|buildIndex|parse|compute|calculate|transform|process|generate)/;

const rerenderLazyStateInit: VercelRule = {
  id: "rerender-lazy-state-init",
  title: "Use Lazy State Initialization",
  impact: "HIGH",
  severity: "performance",
  description: "Expensive expressions passed directly to useState run on every render. Use a function form () => value to run only once.",
  url: "https://github.com/vercel-labs/agent-skills/blob/main/skills/react-best-practices/rules/rerender-lazy-state-init.md",

  check(filePath, content) {
    const issues: ReturnType<VercelRule["check"]> = [];
    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;

      // Match: useState(expensiveCall(...)) — not already a function form
      const match = line.match(/useState\s*\(\s*([^)]+)\)/);
      if (!match) continue;

      const initializer = match[1]!.trim();

      // Skip if already a function form: useState(() => ...) or useState(function
      if (initializer.startsWith("() =>") || initializer.startsWith("function")) continue;
      // Skip simple primitives: useState(0), useState(''), useState(true/false), useState(null/undefined)
      if (/^(?:\d+|'[^']*'|"[^"]*"|true|false|null|undefined|\{\}|\[\])$/.test(initializer)) continue;
      // Skip simple variable references: useState(props.x)
      if (/^\w+(?:\.\w+)?$/.test(initializer) && !EXPENSIVE_CALLS.test(initializer)) continue;

      // Flag if the initializer contains known expensive operations
      if (EXPENSIVE_CALLS.test(initializer)) {
        issues.push({
          severity: "performance",
          rule: "rerender-lazy-state-init",
          message: `Expensive initializer in useState() runs on every render — use lazy form`,
          help: `Replace useState(${initializer.slice(0, 40)}) with useState(() => ${initializer.slice(0, 40)})`,
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

export default rerenderLazyStateInit;
