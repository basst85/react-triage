// ── font-manual-link ─────────────────────────────────────────────
// Use next/font instead of manual <link> or @import for Google Fonts.
// Impact: HIGH — next/font self-hosts fonts with zero layout shift

import type { VercelRule } from "./rule";

const fontManualLink: VercelRule = {
  id: "font-manual-link",
  title: "Use next/font Instead of Manual Font Links",
  impact: "HIGH",
  severity: "performance",
  description:
    "Manual <link> tags and CSS @import for Google Fonts block rendering and cause layout shift. Use next/font for self-hosted, optimized fonts with zero CLS.",
  url: "https://nextjs.org/docs/app/building-your-application/optimizing/fonts",

  check(filePath, content) {
    const issues: ReturnType<VercelRule["check"]> = [];

    // Check TSX/JSX for link tags, and CSS files for @import
    const isComponent =
      filePath.endsWith(".tsx") ||
      filePath.endsWith(".jsx") ||
      filePath.endsWith(".ts") ||
      filePath.endsWith(".js");
    const isCss = filePath.endsWith(".css");

    if (!isComponent && !isCss) return issues;

    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;

      // Detect: <link href="...fonts.googleapis.com..." /> in JSX
      if (
        isComponent &&
        /fonts\.googleapis\.com/.test(line) &&
        /<link\b/.test(line)
      ) {
        issues.push({
          severity: "performance",
          rule: "font-manual-link",
          message:
            "Manual <link> to Google Fonts — blocks rendering and causes layout shift",
          help: "Use next/font/google for self-hosted, optimized fonts: import { Inter } from 'next/font/google'",
          file: filePath,
          line: i + 1,
          column: 1,
          url: this.url,
        });
      }

      // Detect: <link href="...fonts.gstatic.com..." /> (font file links)
      if (
        isComponent &&
        /fonts\.gstatic\.com/.test(line) &&
        /<link\b/.test(line)
      ) {
        issues.push({
          severity: "performance",
          rule: "font-manual-link",
          message:
            "Manual <link> to font files — use next/font for automatic optimization",
          help: "Use next/font/google or next/font/local instead of manual font links",
          file: filePath,
          line: i + 1,
          column: 1,
          url: this.url,
        });
      }

      // Detect: @import url('...fonts.googleapis.com...') in CSS
      if (isCss && /@import\s+url\s*\(/.test(line) && /fonts\.googleapis\.com/.test(line)) {
        issues.push({
          severity: "performance",
          rule: "font-manual-link",
          message:
            "@import for Google Fonts in CSS — blocks rendering",
          help: "Remove @import and use next/font/google in your layout.tsx instead",
          file: filePath,
          line: i + 1,
          column: 1,
          url: this.url,
        });
      }

      // Detect: dangerouslySetInnerHTML with fonts.googleapis.com
      if (isComponent && /fonts\.googleapis\.com/.test(line) && /dangerouslySetInnerHTML/.test(content)) {
        // Only flag once per file for this pattern
        if (i === lines.findIndex((l) => /fonts\.googleapis\.com/.test(l))) {
          issues.push({
            severity: "performance",
            rule: "font-manual-link",
            message:
              "Google Fonts loaded via inline HTML — use next/font for optimization",
            help: "Use next/font/google instead of injecting font stylesheets manually",
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

export default fontManualLink;
