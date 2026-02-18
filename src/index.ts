#!/usr/bin/env bun
// ── React Triage ──────────────────────────────────────────────────
//
// A blazing-fast React & Next.js project health checker.
// Powered by Bun + Oxlint.
//
// Usage:
//   bunx react-triage [path]
//   bunx react-triage --help

import { intro, spinner } from "@clack/prompts";
import pc from "picocolors";
import { resolve } from "path";
import { diagnose } from "./diagnosis";
import { exportToMarkdown, showDashboard } from "./reporter";
import type { CliOptions, Severity } from "./types";

const args = process.argv.slice(2);

// Help flag
if (args.includes("--help") || args.includes("-h")) {
  console.log(`
${pc.bgCyan(pc.black(" ⚛️  REACT TRIAGE "))}

${pc.bold("Usage:")}
  ${pc.cyan("react-triage")} [path]       Scan a React/Next.js project
  ${pc.cyan("react-triage")} --help       Show this help message
  ${pc.cyan("react-triage")} --version    Show version

${pc.bold("Options:")}
  ${pc.cyan("--show-all")}                Show all issues (no truncation per category)
  ${pc.cyan("--to-markdown=<file>")}      Export results to a Markdown file
  ${pc.cyan("--critical")}                Show only critical issues
  ${pc.cyan("--performance")}             Show only performance issues
  ${pc.cyan("--best-practices")}          Show only best-practice issues

  Severity filters can be combined:
    ${pc.dim("react-triage --critical --performance")}

${pc.bold("What it checks:")}
  ${pc.red("🚨 Critical")}      Hooks violations, async client components, crashes
  ${pc.yellow("🚀 Performance")}   Unnecessary re-renders, missing optimizations
  ${pc.blue("💡 Best Practices")} Next.js patterns, security, accessibility
  ${pc.dim("📦 Dependencies")}   Version mismatches, duplicates, misplaced packages
  ${pc.red("🔒 Security")}      Known vulnerabilities via ${pc.cyan("bun audit")}
  ${pc.dim("⚙️  Config")}        tsconfig.json settings, JS/TS target

${pc.bold("Powered by:")} Bun + Oxlint (Rust-native analysis)
`);
  process.exit(0);
}

// Version flag
if (args.includes("--version") || args.includes("-v")) {
  const pkg = await Bun.file(resolve(import.meta.dir, "..", "package.json")).json();
  console.log(pkg.version ?? "0.1.0");
  process.exit(0);
}

// Parse CLI options
const severityFilter = new Set<Severity>();
if (args.includes("--critical")) {
  severityFilter.add("critical");
}
if (args.includes("--performance")) {
  severityFilter.add("performance");
}
if (args.includes("--best-practices")) {
  severityFilter.add("best-practice");
}

const markdownArg = args.find((arg) => arg.startsWith("--to-markdown="));
const toMarkdown = markdownArg ? markdownArg.slice("--to-markdown=".length) : null;

const cliOptions: CliOptions = {
  showAll: args.includes("--show-all"),
  toMarkdown,
  severityFilter,
};

// Target path (default: current directory) — first arg that doesn't start with --
const positionalArgs = args.filter((arg) => !arg.startsWith("--"));
const targetPath = resolve(positionalArgs[0] ?? ".");

// Verify the path exists
const targetFile = Bun.file(resolve(targetPath, "package.json"));
if (!(await targetFile.exists())) {
  console.error(
    pc.red(`\n  ✖ No package.json found in ${targetPath}\n  Make sure you're in a React project directory.\n`)
  );
  process.exit(1);
}

// Run the scan
console.clear();
intro(pc.bgCyan(pc.black(" ⚛️  REACT TRIAGE ")));

const spin = spinner();

spin.start("Scanning project vitals...");

try {
  const result = await diagnose(targetPath);
  spin.stop("Scan complete.");

  // Show the full dashboard
  showDashboard(result, cliOptions);

  // Export to Markdown if requested
  if (cliOptions.toMarkdown) {
    const mdPath = resolve(cliOptions.toMarkdown);
    await exportToMarkdown(result, mdPath, cliOptions);
    console.log(pc.green(`\n  📄 Report exported to ${mdPath}\n`));
  }
} catch (error) {
  spin.stop("Scan failed.");
  console.error(pc.red(`\n  ✖ Error during scan: ${error}\n`));
  process.exit(1);
}
