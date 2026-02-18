// ── Diagnosis Engine ───────────────────────────────────────────────
//
// Combines Oxlint scan results with custom checks, calculates
// a health score, and produces a unified ScanResult.

import type {
  ScanResult,
  TriageIssue,
  DependencyIssue,
  ProjectStats,
  SecurityAuditResult,
  Severity,
} from "./types";
import { SCORE_PENALTIES } from "./rules";
import { runOxlintScan } from "./scanner";
import {
  checkDependencies,
  checkTsConfig,
  gatherProjectStats,
  checkAsyncClientComponents,
  checkConsoleLogs,
} from "./checks";
import { runVercelRules } from "./vercel-rules/index";
import { runSecurityAudit } from "./security";

/**
 * Calculate the health score from 0-100 based on found issues.
 */
function calculateScore(
  issues: TriageIssue[],
  depIssues: DependencyIssue[],
  securityAudit: SecurityAuditResult,
  stats: ProjectStats
): number {
  let score = 100;

  // Deduct for code issues
  for (const issue of issues) {
    score -= SCORE_PENALTIES[issue.severity];
  }

  // Deduct for dependency issues
  for (const dep of depIssues) {
    score -= SCORE_PENALTIES[dep.severity];
  }

  // Deduct for security vulnerabilities
  score -= securityAudit.summary.critical * 15;
  score -= securityAudit.summary.high * 8;
  score -= securityAudit.summary.moderate * 3;
  score -= securityAudit.summary.low * 1;

  // Deduct if high client component ratio (>60% in Next.js project)
  if (stats.nextVersion) {
    const total = stats.clientComponents + stats.serverComponents;
    if (total > 0) {
      const ratio = stats.clientComponents / total;
      if (ratio > 0.8) {
        score -= 5; // Very high client ratio
      } else if (ratio > 0.6) {
        score -= 2; // Moderately high
      }
    }
  }

  // Clamp between 0 and 100
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Run a complete triage scan on the given path.
 */
export async function diagnose(targetPath: string): Promise<ScanResult> {
  const startTime = performance.now();

  // Run all checks in parallel where possible
  const [oxlintResult, depIssues, tsConfigResult, projectStats, asyncIssues, consoleIssues, vercelIssues, securityAudit] =
    await Promise.all([
      runOxlintScan(targetPath),
      checkDependencies(targetPath),
      checkTsConfig(targetPath),
      gatherProjectStats(targetPath),
      checkAsyncClientComponents(targetPath),
      checkConsoleLogs(targetPath),
      runVercelRules(targetPath),
      runSecurityAudit(targetPath),
    ]);

  // Merge config results into stats
  const stats: ProjectStats = {
    ...projectStats,
    strictMode: tsConfigResult.strictMode,
    jsxTransform: tsConfigResult.jsxTransform,
    target: tsConfigResult.target,
  };

  // Combine all issues
  const allIssues: TriageIssue[] = [
    ...oxlintResult.issues,
    ...tsConfigResult.issues,
    ...asyncIssues,
    ...consoleIssues,
    ...vercelIssues,
  ];

  // Sort: critical first, then performance, then best-practice, then info
  const severityOrder: Record<Severity, number> = {
    critical: 0,
    performance: 1,
    "best-practice": 2,
    info: 3,
  };
  allIssues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  // Override file count with our own scan if oxlint reported 0
  if (oxlintResult.fileCount === 0) {
    stats.totalFiles = projectStats.totalFiles;
  }

  const score = calculateScore(allIssues, depIssues, securityAudit, stats);
  const timeTaken = Math.round(performance.now() - startTime);

  return {
    score,
    timeTaken,
    issues: allIssues,
    stats,
    dependencyIssues: depIssues,
    securityAudit,
  };
}
