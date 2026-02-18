// ── bundle-defer-third-party ───────────────────────────────────────
// Load analytics/logging after hydration.
// Impact: MEDIUM — loads after hydration

import type { VercelRule } from "./rule";

// Non-critical third-party packages that should load after hydration
const DEFERRABLE_PACKAGES = new Set([
  "@vercel/analytics",
  "@vercel/speed-insights",
  "@sentry/nextjs",
  "@sentry/react",
  "posthog-js",
  "@posthog/react",
  "mixpanel-browser",
  "@segment/analytics-next",
  "hotjar-react-hook",
  "@hotjar/browser",
  "react-ga4",
  "@google-analytics/ga",
  "intercom-react",
  "crisp-sdk-web",
  "drift-react",
  "@datadog/browser-rum",
  "logrocket",
  "fullstory-browser",
  "amplitude-js",
  "@amplitude/analytics-browser",
]);

const bundleDeferThirdParty: VercelRule = {
  id: "bundle-defer-third-party",
  title: "Defer Non-Critical Third-Party Libraries",
  impact: "HIGH",
  severity: "performance",
  description: "Analytics, logging, and error tracking don't block user interaction. Load them after hydration with next/dynamic or lazy import.",
  url: "https://github.com/vercel-labs/agent-skills/blob/main/skills/react-best-practices/rules/bundle-defer-third-party.md",

  check(filePath, content) {
    const issues: ReturnType<VercelRule["check"]> = [];

    // Only flag in layout/page/component files, not in utility files
    if (!filePath.endsWith(".tsx") && !filePath.endsWith(".jsx")) return issues;

    const lines = content.split("\n");
    const hasDynamic = content.includes("next/dynamic") || content.includes("React.lazy");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      const importMatch = line.match(/^import\s+.*from\s+['"]([^'"]+)['"]/);
      if (!importMatch) continue;

      const pkg = importMatch[1]!;
      for (const deferrable of DEFERRABLE_PACKAGES) {
        if (pkg === deferrable || pkg.startsWith(deferrable + "/")) {
          // If they're already using dynamic/lazy, skip
          if (hasDynamic) break;
          issues.push({
            severity: "performance",
            rule: "bundle-defer-third-party",
            message: `Static import of "${pkg}" — load analytics/tracking after hydration`,
            help: `Use next/dynamic with { ssr: false } or load in useEffect`,
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

export default bundleDeferThirdParty;
