// ── bundle-dynamic-imports ─────────────────────────────────────────
// Use next/dynamic for heavy components not needed on initial render.
// Impact: CRITICAL — directly affects TTI and LCP

import type { VercelRule } from "./rule";

// Known heavy libraries that should be dynamically imported
const HEAVY_IMPORTS = new Set([
  "monaco-editor",
  "@monaco-editor/react",
  "react-quill",
  "draft-js",
  "slate",
  "slate-react",
  "chart.js",
  "recharts",
  "react-chartjs-2",
  "d3",
  "three",
  "@react-three/fiber",
  "react-map-gl",
  "mapbox-gl",
  "leaflet",
  "react-leaflet",
  "react-pdf",
  "@react-pdf/renderer",
  "react-markdown",
  "react-syntax-highlighter",
  "prism-react-renderer",
  "codemirror",
  "@codemirror/view",
  "ace-builds",
  "react-ace",
  "react-datepicker",
  "react-big-calendar",
  "react-dnd",
  "framer-motion",
  "lottie-react",
  "react-player",
  "video.js",
  "cropperjs",
  "react-cropper",
]);

const bundleDynamicImports: VercelRule = {
  id: "bundle-dynamic-imports",
  title: "Dynamic Imports for Heavy Components",
  impact: "CRITICAL",
  severity: "critical",
  description: "Heavy libraries imported statically bloat the initial bundle. Use next/dynamic or React.lazy() to load them on demand.",
  url: "https://github.com/vercel-labs/agent-skills/blob/main/skills/react-best-practices/rules/bundle-dynamic-imports.md",

  check(filePath, content) {
    const issues: ReturnType<VercelRule["check"]> = [];
    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      const importMatch = line.match(/^import\s+.*from\s+['"]([^'"]+)['"]/);
      if (!importMatch) continue;

      const pkg = importMatch[1]!;
      // Check against known heavy packages
      for (const heavy of HEAVY_IMPORTS) {
        if (pkg === heavy || pkg.startsWith(heavy + "/")) {
          issues.push({
            severity: "critical",
            rule: "bundle-dynamic-imports",
            message: `Static import of heavy library "${pkg}" — use next/dynamic or React.lazy()`,
            help: `Replace with: const Component = dynamic(() => import('${pkg}'), { ssr: false })`,
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

export default bundleDynamicImports;
