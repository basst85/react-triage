// ── Terminal Dashboard ─────────────────────────────────────────────
//
// Beautiful CLI output using @clack/prompts, picocolors, and cli-table3.
// Renders health score bar, vitals table, categorized issues, and
// clickable file links.

import { intro, outro, note, log } from "@clack/prompts";
import pc from "picocolors";
import Table from "cli-table3";
import type { CliOptions, ScanResult, Severity, TriageIssue } from "../types";
import {
  renderHealthBar,
  severityIcon,
  formatFileLink,
  createLink,
  vulnSeverityBadge,
} from "./format";
import { A11Y_RULES } from "../rules";

// ── Vitals Table ───────────────────────────────────────────────────

function renderVitalsTable(result: ScanResult): void {
  const { stats } = result;

  const table = new Table({
    style: { head: [], border: [] },
    chars: {
      mid: "",
      "left-mid": "",
      "mid-mid": "",
      "right-mid": "",
    },
  });

  // React version
  if (stats.reactVersion) {
    const major = parseInt(stats.reactVersion.split(".")[0] ?? "0", 10);
    const status = major >= 18 ? pc.green("OK") : pc.red("OUTDATED");
    table.push([pc.dim("React"), pc.white(stats.reactVersion), status]);
  }

  // React DOM version
  if (stats.reactDomVersion && stats.reactDomVersion !== stats.reactVersion) {
    table.push([pc.dim("React DOM"), pc.white(stats.reactDomVersion), pc.yellow("MISMATCH")]);
  }

  // Next.js version
  if (stats.nextVersion) {
    const major = parseInt(stats.nextVersion.split(".")[0] ?? "0", 10);
    const status = major >= 14 ? pc.green("OK") : pc.yellow("UPGRADE");
    table.push([pc.dim("Next.js"), pc.white(stats.nextVersion), status]);
  }

  // Component ratio
  if (stats.nextVersion) {
    const total = stats.clientComponents + stats.serverComponents;
    if (total > 0) {
      const ratio = Math.round((stats.clientComponents / total) * 100);
      const clientStatus =
        ratio > 80 ? pc.red("HIGH") : ratio > 50 ? pc.yellow("WATCH") : pc.green("GOOD");
      table.push([
        pc.dim("Client/Server"),
        pc.white(`${stats.clientComponents}/${stats.serverComponents}`),
        clientStatus,
      ]);
    }
  }

  // TypeScript config
  table.push([
    pc.dim("Strict Mode"),
    stats.strictMode ? pc.white("Enabled") : pc.white("Disabled"),
    stats.strictMode ? pc.green("SAFE") : pc.red("RISK"),
  ]);

  if (stats.target) {
    table.push([pc.dim("TS Target"), pc.white(stats.target), pc.dim("")]);
  }

  // File count
  table.push([
    pc.dim("Files Scanned"),
    pc.white(String(stats.totalFiles)),
    pc.dim(""),
  ]);

  console.log(table.toString());
}

// ── Issue Renderer ─────────────────────────────────────────────────

function renderIssues(issues: TriageIssue[], maxPerCategory: number = 5, filter?: Set<Severity>): void {
  const critical = issues.filter((i) => i.severity === "critical");
  const performance = issues.filter((i) => i.severity === "performance");
  const bestPractice = issues.filter((i) => i.severity === "best-practice");
  const info = issues.filter((i) => i.severity === "info");

  const show = (severity: Severity) => !filter || filter.size === 0 || filter.has(severity);

  if (critical.length > 0 && show("critical")) {
    console.log(pc.bold(pc.red("\n  🚨 CRITICAL — Must fix now:\n")));
    renderIssueGroup(critical, maxPerCategory);
  }

  if (performance.length > 0 && show("performance")) {
    console.log(pc.bold(pc.yellow("\n  🚀 PERFORMANCE — Causes slowdowns:\n")));
    renderIssueGroup(performance, maxPerCategory);
  }

  if (bestPractice.length > 0 && show("best-practice")) {
    console.log(pc.bold(pc.blue("\n  💡 BEST PRACTICES — Recommended improvements:\n")));
    renderIssueGroup(bestPractice, maxPerCategory);
  }

  if (info.length > 0 && show("info")) {
    console.log(pc.bold(pc.dim("\n  ○ INFO — For your awareness:\n")));
    renderIssueGroup(info, maxPerCategory === Infinity ? Infinity : 3);
  }
}

function renderIssueGroup(issues: TriageIssue[], max: number): void {
  const shown = issues.slice(0, max);
  const remaining = issues.length - shown.length;

  for (const issue of shown) {
    const icon = severityIcon(issue.severity);
    console.log(`   ${icon} ${pc.white(issue.message)}`);

    if (issue.help) {
      console.log(`     ${pc.dim(`💊 ${issue.help}`)}`);
    }

    if (issue.file) {
      console.log(`     ${formatFileLink(issue.file, issue.line, issue.column)}`);
    }

    if (issue.url) {
      console.log(`     ${pc.dim(createLink("📖 Docs", issue.url))}`);
    }

    console.log(""); // spacing
  }

  if (remaining > 0) {
    console.log(pc.dim(`   ... and ${remaining} more in this category.\n`));
  }
}

// ── Large Files Warning ────────────────────────────────────────────

function renderLargeFiles(result: ScanResult): void {
  const { largeFiles } = result.stats;
  if (largeFiles.length === 0) return;

  console.log(pc.bold(pc.magenta("\n  📏 LARGE FILES — Consider splitting:\n")));

  for (const file of largeFiles.slice(0, 5)) {
    console.log(`   ${pc.magenta("◆")} ${pc.white(file.file)} ${pc.dim(`(${file.lines} lines)`)}`);
  }

  if (largeFiles.length > 5) {
    console.log(pc.dim(`\n   ... and ${largeFiles.length - 5} more large files.`));
  }

  console.log("");
}

// ── Dependency Issues ──────────────────────────────────────────────

function renderDependencyIssues(result: ScanResult): void {
  const { dependencyIssues } = result;
  if (dependencyIssues.length === 0) return;

  console.log(pc.bold(pc.cyan("\n  📦 DEPENDENCIES:\n")));

  for (const dep of dependencyIssues) {
    const icon = severityIcon(dep.severity);
    console.log(`   ${icon} ${pc.white(dep.message)}`);
  }

  console.log("");
}

// ── Security Audit ─────────────────────────────────────────────────

function renderSecurityAudit(result: ScanResult): void {
  const { securityAudit } = result;
  if (securityAudit.summary.total === 0) return;

  const { summary } = securityAudit;

  // Header with summary counts
  const parts: string[] = [];
  if (summary.critical > 0) parts.push(pc.red(`${summary.critical} critical`));
  if (summary.high > 0) parts.push(pc.red(`${summary.high} high`));
  if (summary.moderate > 0) parts.push(pc.yellow(`${summary.moderate} moderate`));
  if (summary.low > 0) parts.push(pc.dim(`${summary.low} low`));

  console.log(
    pc.bold(pc.red(`\n  🔒 SECURITY — ${summary.total} vulnerabilit${summary.total === 1 ? "y" : "ies"} found (${parts.join(", ")})`)) + "\n"
  );

  // Show individual vulnerabilities (max 10)
  const shown = securityAudit.vulnerabilities.slice(0, 10);
  const remaining = securityAudit.vulnerabilities.length - shown.length;

  for (const vuln of shown) {
    const badge = vulnSeverityBadge(vuln.severity);
    const cvss = vuln.cvssScore !== null ? pc.dim(` (CVSS ${vuln.cvssScore})`) : "";
    console.log(`   ${badge} ${pc.white(pc.bold(vuln.package))}${cvss}`);
    console.log(`     ${pc.white(vuln.title)}`);
    console.log(`     ${pc.dim(`Affected: ${vuln.vulnerableVersions}`)}`);

    if (vuln.cwe.length > 0) {
      console.log(`     ${pc.dim(`CWE: ${vuln.cwe.join(", ")}`)}`);
    }

    if (vuln.url) {
      console.log(`     ${pc.dim(createLink("📖 Advisory", vuln.url))}`);
    }

    console.log(""); // spacing
  }

  if (remaining > 0) {
    console.log(pc.dim(`   ... and ${remaining} more vulnerabilities.\n`));
  }

  console.log(
    pc.dim("   💊 Run ") +
    pc.cyan("bun update") +
    pc.dim(" or ") +
    pc.cyan("bun update --latest") +
    pc.dim(" to fix.\n")
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────

export function showDashboard(result: ScanResult, options?: CliOptions): void {
  const showAll = options?.showAll ?? false;
  const filter = options?.severityFilter;
  const a11yOnly = options?.a11yOnly ?? false;
  const maxPerCategory = showAll ? Infinity : 5;

  // Pre-filter issues when --a11y is active
  const baseIssues = a11yOnly
    ? result.issues.filter((i) => A11Y_RULES.has(i.rule))
    : result.issues;

  console.clear();
  intro(pc.bgCyan(pc.black(" ⚛️  REACT TRIAGE ")));

  // Score card
  note(
    `
    Health Score:  ${renderHealthBar(result.score)}
    
    Scan Time:     ${pc.dim(`${result.timeTaken}ms`)}
    Files:         ${pc.dim(String(result.stats.totalFiles))}
    Issues:        ${pc.dim(String(result.issues.length))}
    Vulnerabilities: ${result.securityAudit.summary.total === 0 ? pc.green("0") : pc.red(String(result.securityAudit.summary.total))}
  `,
    "TRIAGE REPORT"
  );

  // Vitals
  log.info(pc.cyan("📊 Project Vitals"));
  renderVitalsTable(result);

  // Dependency issues
  renderDependencyIssues(result);

  // Security audit
  renderSecurityAudit(result);

  // Code issues
  const hasFilter = filter && filter.size > 0;
  const filteredIssues = hasFilter
    ? baseIssues.filter((i) => filter.has(i.severity))
    : baseIssues;

  if (filteredIssues.length > 0) {
    const totalLabel = a11yOnly ? `${result.issues.length} total` : String(result.issues.length);
    const countLabel = hasFilter
      ? `${filteredIssues.length} of ${totalLabel}`
      : a11yOnly
      ? `${filteredIssues.length} accessibility issue${filteredIssues.length !== 1 ? "s" : ""} (of ${totalLabel})`
      : String(filteredIssues.length);
    log.warning(
      pc.yellow(`⚠️  Found ${countLabel} issue${filteredIssues.length !== 1 && !a11yOnly ? "s" : ""}`)
    );
    renderIssues(baseIssues, maxPerCategory, filter);
  } else {
    const msg = a11yOnly
      ? pc.green("No accessibility issues found. ♿️")
      : pc.green("No issues found. Your project is healthy! 🍎");
    log.success(msg);
  }

  // Large files
  renderLargeFiles(result);

  // Outro
  if (result.score >= 90) {
    outro(pc.green("Excellent! Your React project follows best practices. ✨"));
  } else if (result.score >= 60) {
    const criticalCount = result.issues.filter((i) => i.severity === "critical").length;
    if (criticalCount > 0) {
      outro(`Fix the ${pc.red(String(criticalCount))} critical issue${criticalCount !== 1 ? "s" : ""} first.`);
    } else {
      outro("Some improvements possible. Check the performance suggestions above.");
    }
  } else {
    outro(pc.red("⚠️  Your project needs attention. Start with the critical issues."));
  }
}
