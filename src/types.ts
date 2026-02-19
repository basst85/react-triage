// ── Types for React Triage ──────────────────────────────────────────

export type Severity = "critical" | "performance" | "best-practice" | "info";

export interface TriageIssue {
  severity: Severity;
  rule: string;
  message: string;
  help?: string;
  file: string;
  line: number;
  column: number;
  url?: string;
}

export interface ProjectStats {
  reactVersion: string | null;
  reactDomVersion: string | null;
  nextVersion: string | null;
  totalFiles: number;
  clientComponents: number;
  serverComponents: number;
  largeFiles: { file: string; lines: number }[];
  strictMode: boolean;
  jsxTransform: string | null;
  target: string | null;
}

export interface DependencyIssue {
  type: "version-mismatch" | "dev-in-prod" | "duplicate" | "outdated" | "unused";
  message: string;
  severity: Severity;
}

export type VulnerabilitySeverity = "critical" | "high" | "moderate" | "low";

export interface SecurityVulnerability {
  id: number;
  package: string;
  title: string;
  severity: VulnerabilitySeverity;
  url: string;
  vulnerableVersions: string;
  cwe: string[];
  cvssScore: number | null;
}

export interface SecurityAuditResult {
  vulnerabilities: SecurityVulnerability[];
  summary: {
    total: number;
    critical: number;
    high: number;
    moderate: number;
    low: number;
  };
}

export interface ScanResult {
  score: number;
  timeTaken: number;
  issues: TriageIssue[];
  stats: ProjectStats;
  dependencyIssues: DependencyIssue[];
  securityAudit: SecurityAuditResult;
}

export interface OxlintDiagnostic {
  message: string;
  code: string; // e.g. "react-hooks(rules-of-hooks)" or "eslint(no-debugger)"
  severity: "error" | "warning";
  causes: string[];
  url?: string;
  help?: string;
  filename: string;
  labels: {
    span: {
      offset: number;
      length: number;
      line: number;
      column: number;
    };
  }[];
  related: unknown[];
}

export interface OxlintOutput {
  diagnostics: OxlintDiagnostic[];
  number_of_files: number;
  number_of_rules: number;
  threads_count: number;
  start_time: number;
}

export interface CliOptions {
  showAll: boolean;
  toMarkdown: string | null;
  severityFilter: Set<Severity>;
  failOn: Severity | null;
}
