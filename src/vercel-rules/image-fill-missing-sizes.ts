// ── image-fill-missing-sizes ──────────────────────────────────────
// <Image fill> without sizes causes the browser to download the largest image.
// Impact: HIGH — wastes bandwidth on oversized images

import type { VercelRule } from "./rule";

const imageFillMissingSizes: VercelRule = {
  id: "image-fill-missing-sizes",
  title: "Image with fill Missing sizes Prop",
  impact: "HIGH",
  severity: "performance",
  description:
    'Using <Image fill /> without a `sizes` prop causes the browser to download the largest image variant. Always provide `sizes` for proper responsive behavior.',
  url: "https://nextjs.org/docs/app/api-reference/components/image#sizes",

  check(filePath, content) {
    const issues: ReturnType<VercelRule["check"]> = [];

    // Only check .tsx/.jsx files
    if (!filePath.endsWith(".tsx") && !filePath.endsWith(".jsx")) return issues;

    // Must use Image component
    if (!content.includes("next/image")) return issues;

    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;

      // Detect <Image with fill prop
      if (/<Image\b/.test(line)) {
        // Collect the full JSX tag (might span multiple lines)
        let tag = line;
        let endLine = i;
        // Look ahead up to 15 lines to find the closing />  or >
        for (let j = i; j < Math.min(i + 15, lines.length); j++) {
          tag = lines.slice(i, j + 1).join("\n");
          endLine = j;
          if (/\/\s*>/.test(lines[j]!) || (j > i && /^\s*>/.test(lines[j]!))) {
            break;
          }
        }

        // Check if `fill` prop is present
        const hasFill =
          /\bfill\b(?:\s*=\s*\{?\s*true\s*\}?)?/.test(tag) &&
          !tag.includes("fill={false}");

        // Check if `sizes` prop is present
        const hasSizes = /\bsizes\s*=/.test(tag);

        if (hasFill && !hasSizes) {
          issues.push({
            severity: "performance",
            rule: "image-fill-missing-sizes",
            message:
              "<Image fill /> without `sizes` — browser downloads the largest image variant",
            help: 'Add sizes prop, e.g. sizes="(max-width: 768px) 100vw, 33vw" for responsive behavior',
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

export default imageFillMissingSizes;
