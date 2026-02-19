// ── Exit Policy Evaluation ────────────────────────────────────────
//
// Evaluates whether a scan result should produce a non-zero exit code
// based on an exact severity match passed via `--fail-on`.

import type {
  ScanResult,
  Severity,
  VulnerabilitySeverity,
} from "./types";

const securityToIssueSeverity: Record<VulnerabilitySeverity, Severity> = {
  critical: "critical",
  high: "performance",
  moderate: "best-practice",
  low: "info",
};

function matchesSeverity(found: Severity, failOn: Severity): boolean {
  return found === failOn;
}

export interface FailOnPolicyResult {
  shouldFail: boolean;
  failOn: Severity;
  issueMatches: number;
  dependencyMatches: number;
  vulnerabilityMatches: number;
  totalMatches: number;
  matchedBySeverity: Record<Severity, number>;
}

export function evaluateFailOnPolicy(
  result: ScanResult,
  failOn: Severity | null
): FailOnPolicyResult | null {
  if (!failOn) return null;

  const issueMatches = result.issues.filter((issue) =>
    matchesSeverity(issue.severity, failOn)
  ).length;

  const dependencyMatches = result.dependencyIssues.filter((issue) =>
    matchesSeverity(issue.severity, failOn)
  ).length;

  const vulnerabilityMatches = result.securityAudit.vulnerabilities.filter(
    (vulnerability) =>
      matchesSeverity(securityToIssueSeverity[vulnerability.severity], failOn)
  ).length;

  const totalMatches = issueMatches + dependencyMatches + vulnerabilityMatches;

  const matchedBySeverity: Record<Severity, number> = {
    critical: 0,
    performance: 0,
    "best-practice": 0,
    info: 0,
  };

  for (const issue of result.issues) {
    if (matchesSeverity(issue.severity, failOn)) {
      matchedBySeverity[issue.severity] += 1;
    }
  }

  for (const issue of result.dependencyIssues) {
    if (matchesSeverity(issue.severity, failOn)) {
      matchedBySeverity[issue.severity] += 1;
    }
  }

  for (const vulnerability of result.securityAudit.vulnerabilities) {
    const mappedSeverity = securityToIssueSeverity[vulnerability.severity];
    if (matchesSeverity(mappedSeverity, failOn)) {
      matchedBySeverity[mappedSeverity] += 1;
    }
  }

  return {
    shouldFail: totalMatches > 0,
    failOn,
    issueMatches,
    dependencyMatches,
    vulnerabilityMatches,
    totalMatches,
    matchedBySeverity,
  };
}
