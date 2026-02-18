// ── hydration-browser-api ─────────────────────────────────────────
// Don't use browser-only APIs directly in JSX render output.
// Impact: HIGH — causes hydration mismatch or server-side crashes

import type { VercelRule } from "./rule";

const hydrationBrowserApi: VercelRule = {
  id: "hydration-browser-api",
  title: "Browser API in Server/Shared Component Render",
  impact: "HIGH",
  severity: "critical",
  description:
    "Using window, document, or localStorage directly in render output (JSX) causes hydration mismatches or server-side ReferenceErrors. Guard with useEffect or 'use client' + mounted check.",
  url: "https://nextjs.org/docs/messages/react-hydration-error",

  check(filePath, content) {
    const issues: ReturnType<VercelRule["check"]> = [];

    // Only check .tsx/.jsx files
    if (!filePath.endsWith(".tsx") && !filePath.endsWith(".jsx")) return issues;

    // Skip test files
    if (/\.(test|spec|stories)\.[tj]sx?$/.test(filePath)) return issues;

    const lines = content.split("\n");

    // Check if file has a mounted guard (common fix pattern)
    const hasMountedGuard =
      /\bmounted\b/.test(content) || /\bisClient\b/.test(content) || /\bisServer\b/.test(content);

    // Track if we're inside JSX return context
    let inReturnBlock = false;
    let braceDepth = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      const trimmed = line.trim();

      // Detect return ( — start of JSX block
      if (/\breturn\s*\(?\s*$/.test(trimmed) || /\breturn\s*\(</.test(trimmed)) {
        inReturnBlock = true;
        braceDepth = 0;
      }

      if (inReturnBlock) {
        // Track parentheses depth
        for (const ch of line) {
          if (ch === "(") braceDepth++;
          if (ch === ")") braceDepth--;
        }
        if (braceDepth < 0) {
          inReturnBlock = false;
          braceDepth = 0;
        }
      }

      // Only flag browser API usage inside JSX expressions (inside {})
      if (!inReturnBlock) continue;
      if (hasMountedGuard) continue;

      // Detect: {window.innerWidth}, {document.title}, {localStorage.getItem(...)}
      // Must be inside JSX expression context (curly braces)
      const browserApiInJsx =
        /\{\s*(?:window\.(?:innerWidth|innerHeight|location|navigator|screen|devicePixelRatio|scrollX|scrollY)|document\.(?:title|referrer|cookie|domain)|localStorage\.(?:getItem|length)|sessionStorage\.(?:getItem|length))/.test(
          line
        );

      if (browserApiInJsx) {
        const apiMatch = line.match(
          /\b(window\.\w+|document\.\w+|localStorage\.\w+|sessionStorage\.\w+)/
        );
        const apiName = apiMatch?.[1] ?? "browser API";

        issues.push({
          severity: "critical",
          rule: "hydration-browser-api",
          message: `\`${apiName}\` used directly in JSX — causes hydration mismatch (server has no ${apiName.split(".")[0]})`,
          help: "Use useEffect + useState to read browser APIs after mount, or wrap in a client-only component",
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

export default hydrationBrowserApi;
