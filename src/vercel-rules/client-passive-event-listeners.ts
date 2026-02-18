// ── client-passive-event-listeners ─────────────────────────────────
// Use passive listeners for scroll/touch events.
// Impact: MEDIUM — eliminates scroll delay

import type { VercelRule } from "./rule";

const clientPassiveEventListeners: VercelRule = {
  id: "client-passive-event-listeners",
  title: "Use Passive Event Listeners",
  impact: "HIGH",
  severity: "performance",
  description: "Touch and wheel event listeners without { passive: true } cause scroll delay as the browser waits to check for preventDefault().",
  url: "https://github.com/vercel-labs/agent-skills/blob/main/skills/react-best-practices/rules/client-passive-event-listeners.md",

  check(filePath, content) {
    const issues: ReturnType<VercelRule["check"]> = [];
    const lines = content.split("\n");

    // Detect addEventListener for touch/wheel/scroll without passive option
    const scrollEvents = /addEventListener\s*\(\s*['"](?:touchstart|touchmove|wheel|scroll)['"]/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      if (!scrollEvents.test(line)) continue;

      // Check if passive is set (on same line or next few lines)
      const context = lines.slice(i, Math.min(i + 3, lines.length)).join(" ");
      if (!context.includes("passive")) {
        const eventType = line.match(/['"](\w+)['"]/)?.[1] ?? "scroll";
        issues.push({
          severity: "performance",
          rule: "client-passive-event-listeners",
          message: `"${eventType}" listener without { passive: true } — causes scroll delay`,
          help: `Add { passive: true } as the third argument to addEventListener`,
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

export default clientPassiveEventListeners;
