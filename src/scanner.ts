// ── Oxlint Scanner ─────────────────────────────────────────────────
//
// Runs oxlint as a subprocess via Bun.spawn with React, Next.js, and
// React Perf plugins enabled. Returns parsed JSON diagnostics.

import { resolve, dirname } from "path";
import type { OxlintOutput, TriageIssue } from "./types";
import { categorizeRule, extractRuleName } from "./rules";

/**
 * Resolve the oxlint binary path.
 * Tries (in order):
 *   1. The oxlint package's own bin (works when installed as dependency)
 *   2. Bare "oxlint" on $PATH (works when globally installed)
 */
function resolveOxlintBin(): string {
  try {
    // Resolve oxlint's package.json → pick the binary from there
    const oxlintPkg = require.resolve("oxlint/package.json");
    const oxlintDir = dirname(oxlintPkg);
    const pkg = require(oxlintPkg);
    // oxlint's package.json has bin.oxlint pointing to the native binary
    const binRelative = typeof pkg.bin === "string" ? pkg.bin : pkg.bin?.oxlint;
    if (binRelative) {
      return resolve(oxlintDir, binRelative);
    }
  } catch {
    // Fall through to bare command
  }
  return "oxlint";
}

/**
 * Build the oxlint CLI arguments for a React/Next.js triage scan.
 */
function buildOxlintArgs(targetPath: string): string[] {
  return [
    resolveOxlintBin(),
    targetPath,
    "--format",
    "json",
    // Enable relevant plugins
    "--react-plugin",
    "--nextjs-plugin",
    "--react-perf-plugin",
    "--jsx-a11y-plugin",
    // Enable rule categories
    "-D",
    "correctness",
    "-D",
    "perf",
    "-D",
    "suspicious",
    "-W",
    "style",
    // Enable barrel file detection (Vercel bundle-barrel-imports)
    "--deny",
    "no-barrel-file",
    // Next.js best practices: CSS link tags → use CSS imports
    "--deny",
    "no-css-tags",
    // Next.js best practices: use @next/third-parties for GA
    "--deny",
    "next-script-for-ga",
    // Disable no-ternary: Vercel best practice (rendering-conditional-render) explicitly
    // recommends ternary ?: over && for JSX conditionals to prevent rendering '0'.
    // The two rules give opposite advice — Vercel wins.
    "--allow",
    "no-ternary",
    // Disable no-array-sort: Oxlint flags every .sort() call, including safe
    // patterns like [...arr].sort(). The Vercel js-tosorted-immutable rule
    // handles this more intelligently — it skips spread/slice/Array.from copies.
    "--allow",
    "no-array-sort",
  ];
}

/**
 * Run Oxlint on the given path and return structured issues.
 */
export async function runOxlintScan(
  targetPath: string
): Promise<{ issues: TriageIssue[]; fileCount: number }> {
  const args = buildOxlintArgs(targetPath);

  const proc = Bun.spawn(args, {
    stdout: "pipe",
    stderr: "pipe",
    cwd: targetPath,
  });

  const outputText = await new Response(proc.stdout).text();
  await proc.exited; // oxlint may exit non-zero when it finds issues

  let output: OxlintOutput;
  try {
    output = JSON.parse(outputText);
  } catch {
    // If JSON parsing fails, try stderr
    const stderrText = await new Response(proc.stderr).text();

    // Oxlint might not have found any files or had an error
    if (stderrText.includes("No files found")) {
      return { issues: [], fileCount: 0 };
    }

    // Return empty on parse failure
    return { issues: [], fileCount: 0 };
  }

  const issues: TriageIssue[] = output.diagnostics.map((diag) => {
    const severity = categorizeRule(diag.code);
    const span = diag.labels?.[0]?.span;

    return {
      severity,
      rule: extractRuleName(diag.code),
      message: diag.message,
      help: diag.help ?? undefined,
      file: diag.filename,
      line: span?.line ?? 0,
      column: span?.column ?? 0,
      url: diag.url ?? undefined,
    };
  });

  return {
    issues,
    fileCount: output.number_of_files,
  };
}
