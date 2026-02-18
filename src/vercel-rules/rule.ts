// ── Vercel Rule Interface ──────────────────────────────────────────
//
// Each rule is a standalone module exporting a VercelRule object.
// The runner scans files and invokes each rule's `check` function.

import type { Severity, TriageIssue } from "../types";

export interface VercelRule {
  /** Unique rule id, e.g. "async-parallel" */
  id: string;
  /** Short human-readable title */
  title: string;
  /** Impact category from Vercel Best Practices */
  impact: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  /** Maps to react-triage severity */
  severity: Severity;
  /** Description for help text */
  description: string;
  /** Reference URL */
  url: string;
  /**
   * Check a single file for violations.
   * Receives the file path (relative) and its content.
   * Returns an array of issues found.
   */
  check(filePath: string, content: string): TriageIssue[];
}
