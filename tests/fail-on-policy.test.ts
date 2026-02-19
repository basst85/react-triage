import { describe, expect, it } from "bun:test";
import { evaluateFailOnPolicy } from "../src/policy";
import type { ScanResult } from "../src/types";

function createScanResult(overrides: Partial<ScanResult> = {}): ScanResult {
  return {
    score: 100,
    timeTaken: 10,
    issues: [],
    stats: {
      reactVersion: null,
      reactDomVersion: null,
      nextVersion: null,
      totalFiles: 1,
      clientComponents: 0,
      serverComponents: 0,
      largeFiles: [],
      strictMode: true,
      jsxTransform: null,
      target: null,
    },
    dependencyIssues: [],
    securityAudit: {
      vulnerabilities: [],
      summary: { total: 0, critical: 0, high: 0, moderate: 0, low: 0 },
    },
    ...overrides,
  };
}

describe("evaluateFailOnPolicy", () => {
  it("returns null when no policy is configured", () => {
    const result = evaluateFailOnPolicy(createScanResult(), null);
    expect(result).toBeNull();
  });

  it("fails when critical issues are present and policy is critical", () => {
    const result = evaluateFailOnPolicy(
      createScanResult({
        issues: [
          {
            severity: "critical",
            rule: "test-rule",
            message: "critical issue",
            file: "src/a.ts",
            line: 1,
            column: 1,
          },
        ],
      }),
      "critical"
    );

    expect(result?.shouldFail).toBe(true);
    expect(result?.totalMatches).toBe(1);
    expect(result?.issueMatches).toBe(1);
  });

  it("does not fail on critical findings when policy is performance", () => {
    const result = evaluateFailOnPolicy(
      createScanResult({
        issues: [
          {
            severity: "critical",
            rule: "critical-rule",
            message: "critical issue",
            file: "src/a.ts",
            line: 1,
            column: 1,
          },
        ],
      }),
      "performance"
    );

    expect(result?.shouldFail).toBe(false);
    expect(result?.issueMatches).toBe(0);
  });

  it("maps high vulnerabilities to performance severity", () => {
    const result = evaluateFailOnPolicy(
      createScanResult({
        securityAudit: {
          vulnerabilities: [
            {
              id: 1,
              package: "foo",
              title: "high vuln",
              severity: "high",
              url: "",
              vulnerableVersions: "*",
              cwe: [],
              cvssScore: null,
            },
          ],
          summary: { total: 1, critical: 0, high: 1, moderate: 0, low: 0 },
        },
      }),
      "performance"
    );

    expect(result?.shouldFail).toBe(true);
    expect(result?.vulnerabilityMatches).toBe(1);
    expect(result?.matchedBySeverity.performance).toBe(1);
  });

  it("passes when no findings match the configured severity", () => {
    const result = evaluateFailOnPolicy(
      createScanResult({
        issues: [
          {
            severity: "best-practice",
            rule: "tip-rule",
            message: "tip",
            file: "src/a.ts",
            line: 1,
            column: 1,
          },
        ],
      }),
      "performance"
    );

    expect(result?.shouldFail).toBe(false);
    expect(result?.totalMatches).toBe(0);
    expect(result?.matchedBySeverity.critical).toBe(0);
    expect(result?.matchedBySeverity.performance).toBe(0);
  });
});
