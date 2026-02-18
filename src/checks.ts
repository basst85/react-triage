// ── Custom Bun-Native Checks ───────────────────────────────────────
//
// Checks that Oxlint cannot perform: dependency health, config
// validation, project statistics, and async client component detection.

import { resolve, relative } from "path";
import type {
  ProjectStats,
  DependencyIssue,
  TriageIssue,
} from "./types";

// ── Known heavy libraries that shouldn't be in production deps ─────
const HEAVY_DEV_ONLY_PACKAGES = new Set([
  "@faker-js/faker",
  "faker",
  "storybook",
  "@storybook/react",
  "@testing-library/react",
  "@testing-library/jest-dom",
  "jest",
  "vitest",
  "cypress",
  "playwright",
  "msw",
  "ts-node",
  "nodemon",
  "webpack-dev-server",
]);

// ── Dependency Check ───────────────────────────────────────────────

export async function checkDependencies(
  targetPath: string
): Promise<DependencyIssue[]> {
  const issues: DependencyIssue[] = [];

  const pkgPath = resolve(targetPath, "package.json");
  const pkgFile = Bun.file(pkgPath);

  if (!(await pkgFile.exists())) return issues;

  let pkg: Record<string, any>;
  try {
    pkg = await pkgFile.json();
  } catch {
    return issues;
  }

  const deps = pkg.dependencies ?? {};
  const devDeps = pkg.devDependencies ?? {};

  // 1. React / ReactDOM version mismatch
  if (deps.react && deps["react-dom"]) {
    const reactVer = deps.react.replace(/[\^~>=<]*/g, "");
    const domVer = deps["react-dom"].replace(/[\^~>=<]*/g, "");
    if (reactVer !== domVer) {
      issues.push({
        type: "version-mismatch",
        message: `react (${deps.react}) and react-dom (${deps["react-dom"]}) versions don't match`,
        severity: "critical",
      });
    }
  }

  // 2. Heavy packages in production dependencies
  for (const dep of Object.keys(deps)) {
    if (HEAVY_DEV_ONLY_PACKAGES.has(dep)) {
      issues.push({
        type: "dev-in-prod",
        message: `"${dep}" should be in devDependencies, not dependencies`,
        severity: "performance",
      });
    }
  }

  // 3. Check for duplicate React installations via bun pm ls
  try {
    const proc = Bun.spawn(["bun", "pm", "ls", "--all"], {
      stdout: "pipe",
      stderr: "pipe",
      cwd: targetPath,
    });
    const output = await new Response(proc.stdout).text();
    await proc.exited;

    const reactOccurrences = output
      .split("\n")
      .filter((line) => /\breact@\d/.test(line));

    if (reactOccurrences.length > 1) {
      issues.push({
        type: "duplicate",
        message: `Multiple React installations detected (${reactOccurrences.length} found) — this causes hooks errors`,
        severity: "critical",
      });
    }
  } catch {
    // Ignore if bun pm ls fails
  }

  return issues;
}

// ── Config Check (tsconfig.json) ───────────────────────────────────

export async function checkTsConfig(
  targetPath: string
): Promise<{
  issues: TriageIssue[];
  strictMode: boolean;
  jsxTransform: string | null;
  target: string | null;
}> {
  const issues: TriageIssue[] = [];
  let strictMode = false;
  let jsxTransform: string | null = null;
  let target: string | null = null;

  const tsconfigPath = resolve(targetPath, "tsconfig.json");
  const tsconfigFile = Bun.file(tsconfigPath);

  if (!(await tsconfigFile.exists())) {
    issues.push({
      severity: "best-practice",
      rule: "tsconfig-missing",
      message: "No tsconfig.json found — TypeScript recommended for React projects",
      file: "tsconfig.json",
      line: 0,
      column: 0,
    });
    return { issues, strictMode, jsxTransform, target };
  }

  let tsconfig: Record<string, any>;
  try {
    // Read as text to handle JSONC (comments)
    const text = await tsconfigFile.text();
    // Strip single-line comments and trailing commas for basic JSONC support
    const cleaned = text
      .replace(/\/\/.*$/gm, "")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/,\s*([\]}])/g, "$1");
    tsconfig = JSON.parse(cleaned);
  } catch {
    return { issues, strictMode, jsxTransform, target };
  }

  const compilerOptions = tsconfig.compilerOptions ?? {};

  // Check strict mode
  strictMode = compilerOptions.strict === true;
  if (!strictMode) {
    issues.push({
      severity: "best-practice",
      rule: "tsconfig-strict",
      message: '"strict" is not enabled in tsconfig.json — recommended for modern React',
      file: "tsconfig.json",
      line: 0,
      column: 0,
    });
  }

  // Check JSX transform
  jsxTransform = compilerOptions.jsx ?? null;
  if (jsxTransform && !["react-jsx", "react-jsxdev"].includes(jsxTransform)) {
    issues.push({
      severity: "performance",
      rule: "tsconfig-jsx-transform",
      message: `JSX transform is "${jsxTransform}" — use "react-jsx" for smaller bundles (no React imports needed). This also causes false-positive "react-in-jsx-scope" warnings across every JSX file; switching to "react-jsx" eliminates them all automatically.`,
      file: "tsconfig.json",
      line: 0,
      column: 0,
    });
  }

  // Check target
  target = compilerOptions.target ?? null;
  if (target) {
    const lowTarget = target.toLowerCase();
    const oldTargets = ["es5", "es6", "es2015", "es2016", "es2017", "es2018", "es2019"];
    if (oldTargets.includes(lowTarget)) {
      issues.push({
        severity: "performance",
        rule: "tsconfig-target",
        message: `Target is "${target}" — consider ES2020+ to reduce polyfill bloat`,
        file: "tsconfig.json",
        line: 0,
        column: 0,
      });
    }
  }

  return { issues, strictMode, jsxTransform, target };
}

// ── Project Statistics ─────────────────────────────────────────────

export async function gatherProjectStats(
  targetPath: string
): Promise<ProjectStats> {
  const stats: ProjectStats = {
    reactVersion: null,
    reactDomVersion: null,
    nextVersion: null,
    totalFiles: 0,
    clientComponents: 0,
    serverComponents: 0,
    largeFiles: [],
    strictMode: false,
    jsxTransform: null,
    target: null,
  };

  // Read package.json for versions
  const pkgFile = Bun.file(resolve(targetPath, "package.json"));
  if (await pkgFile.exists()) {
    try {
      const pkg = await pkgFile.json();
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
      stats.reactVersion = allDeps.react?.replace(/[\^~>=<]*/g, "") ?? null;
      stats.reactDomVersion =
        allDeps["react-dom"]?.replace(/[\^~>=<]*/g, "") ?? null;
      stats.nextVersion = allDeps.next?.replace(/[\^~>=<]*/g, "") ?? null;
    } catch {
      // ignore parse errors
    }
  }

  // Scan tsx/jsx files for client/server component ratio and file sizes
  const glob = new Bun.Glob("**/*.{tsx,jsx,ts,js}");

  const LARGE_FILE_THRESHOLD = 400;

  for await (const filePath of glob.scan({
    cwd: targetPath,
    absolute: false,
    onlyFiles: true,
  })) {
    // Skip node_modules, .next, dist, build
    if (
      filePath.startsWith("node_modules") ||
      filePath.startsWith(".next") ||
      filePath.startsWith("dist") ||
      filePath.startsWith("build") ||
      filePath.startsWith(".git")
    ) {
      continue;
    }

    stats.totalFiles++;

    const absPath = resolve(targetPath, filePath);
    const file = Bun.file(absPath);
    const content = await file.text();
    const lines = content.split("\n").length;

    // Large file detection
    if (lines > LARGE_FILE_THRESHOLD) {
      stats.largeFiles.push({ file: filePath, lines });
    }

    // Client vs Server component detection (only tsx/jsx)
    if (filePath.endsWith(".tsx") || filePath.endsWith(".jsx")) {
      // Check first few lines for 'use client' directive
      const firstLines = content.slice(0, 200);
      if (
        firstLines.includes("'use client'") ||
        firstLines.includes('"use client"')
      ) {
        stats.clientComponents++;
      } else {
        stats.serverComponents++;
      }
    }
  }

  // Sort large files by line count descending
  stats.largeFiles.sort((a, b) => b.lines - a.lines);

  return stats;
}

// ── Async Client Component Detection ───────────────────────────────

export async function checkAsyncClientComponents(
  targetPath: string
): Promise<TriageIssue[]> {
  const issues: TriageIssue[] = [];
  const glob = new Bun.Glob("**/*.{tsx,jsx}");

  for await (const filePath of glob.scan({
    cwd: targetPath,
    absolute: false,
    onlyFiles: true,
  })) {
    if (
      filePath.startsWith("node_modules") ||
      filePath.startsWith(".next") ||
      filePath.startsWith("dist")
    ) {
      continue;
    }

    const absPath = resolve(targetPath, filePath);
    const content = await Bun.file(absPath).text();

    // Check if file has 'use client' directive AND async default export
    const firstLines = content.slice(0, 200);
    const isClient =
      firstLines.includes("'use client'") ||
      firstLines.includes('"use client"');

    if (
      isClient &&
      /export\s+(default\s+)?async\s+function/.test(content)
    ) {
      issues.push({
        severity: "critical",
        rule: "async-client-component",
        message: "Async Client Component detected — client components cannot be async functions",
        file: filePath,
        line: 1,
        column: 1,
      });
    }
  }

  return issues;
}

// ── Console.log Detection (production readiness) ───────────────────

export async function checkConsoleLogs(
  targetPath: string
): Promise<TriageIssue[]> {
  const issues: TriageIssue[] = [];
  const glob = new Bun.Glob("**/*.{tsx,jsx,ts,js}");
  let count = 0;

  for await (const filePath of glob.scan({
    cwd: targetPath,
    absolute: false,
    onlyFiles: true,
  })) {
    if (
      filePath.startsWith("node_modules") ||
      filePath.startsWith(".next") ||
      filePath.startsWith("dist") ||
      filePath.startsWith("build") ||
      filePath.startsWith(".git")
    ) {
      continue;
    }

    const absPath = resolve(targetPath, filePath);
    const content = await Bun.file(absPath).text();
    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      if (/console\.(log|warn|error|info|debug)\s*\(/.test(lines[i]!)) {
        count++;
        // Only report first 5
        if (count <= 5) {
          issues.push({
            severity: "info",
            rule: "no-console",
            message: `console statement found — remove for production`,
            file: filePath,
            line: i + 1,
            column: 1,
          });
        }
      }
    }
  }

  // If more than 5, add summary
  if (count > 5) {
    issues.push({
      severity: "info",
      rule: "no-console",
      message: `... and ${count - 5} more console statements across the project`,
      file: "",
      line: 0,
      column: 0,
    });
  }

  return issues;
}
