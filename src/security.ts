// ── Security Audit Scanner ─────────────────────────────────────────
//
// Runs `bun audit --json` to check installed packages for known
// security vulnerabilities via the npm advisory database.
// See: https://bun.sh/docs/pm/cli/audit

import type {
  SecurityAuditResult,
  SecurityVulnerability,
  VulnerabilitySeverity,
} from "./types";

/**
 * Raw advisory shape returned by the npm bulk advisory API
 * (the JSON format `bun audit --json` emits).
 */
interface RawAdvisory {
  id: number;
  url: string;
  title: string;
  severity: string;
  vulnerable_versions: string;
  cwe: string[];
  cvss?: {
    score: number;
    vectorString?: string;
  };
}

/** Map of package name → advisory[] returned by `bun audit --json`. */
type BunAuditJson = Record<string, RawAdvisory[]>;

/**
 * Bun may print informational lines (e.g. lockfile migration)
 * before the JSON payload, even with `--json`.
 *
 * Extract the first JSON object from mixed stdout text.
 */
function parseBunAuditOutput(outputText: string): BunAuditJson | null {
  const firstBrace = outputText.indexOf("{");
  const lastBrace = outputText.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
    return null;
  }

  const candidate = outputText.slice(firstBrace, lastBrace + 1).trim();
  if (!candidate) return null;

  try {
    const parsed = JSON.parse(candidate);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }

    return parsed as BunAuditJson;
  } catch {
    return null;
  }
}

/**
 * Normalise the severity string from the registry into our union type.
 */
function normaliseSeverity(raw: string): VulnerabilitySeverity {
  const lower = raw.toLowerCase();
  if (lower === "critical") return "critical";
  if (lower === "high") return "high";
  if (lower === "moderate") return "moderate";
  return "low";
}

/**
 * Run `bun audit --json` on the given project path.
 *
 * Requires a `bun.lock` file in the target directory.
 * If no lockfile is found or the command fails gracefully,
 * an empty result is returned.
 */
export async function runSecurityAudit(
  targetPath: string
): Promise<SecurityAuditResult> {
  const empty: SecurityAuditResult = {
    vulnerabilities: [],
    summary: { total: 0, critical: 0, high: 0, moderate: 0, low: 0 },
  };

  try {
    const proc = Bun.spawn(["bun", "audit", "--json"], {
      stdout: "pipe",
      stderr: "pipe",
      cwd: targetPath,
    });

    const outputText = await new Response(proc.stdout).text();
    await proc.exited; // exit code 1 = vulnerabilities found, 0 = clean

    const raw = parseBunAuditOutput(outputText);
    if (!raw) {
      return empty;
    }

    // An empty result is just `{}`
    if (typeof raw !== "object") return empty;

    const vulnerabilities: SecurityVulnerability[] = [];

    for (const [pkgName, advisories] of Object.entries(raw)) {
      if (!Array.isArray(advisories)) continue;

      for (const advisory of advisories) {
        vulnerabilities.push({
          id: advisory.id,
          package: pkgName,
          title: advisory.title ?? "Unknown vulnerability",
          severity: normaliseSeverity(advisory.severity ?? "low"),
          url: advisory.url ?? "",
          vulnerableVersions: advisory.vulnerable_versions ?? "*",
          cwe: advisory.cwe ?? [],
          cvssScore: advisory.cvss?.score ?? null,
        });
      }
    }

    // Build summary counts
    const summary = {
      total: vulnerabilities.length,
      critical: vulnerabilities.filter((v) => v.severity === "critical").length,
      high: vulnerabilities.filter((v) => v.severity === "high").length,
      moderate: vulnerabilities.filter((v) => v.severity === "moderate").length,
      low: vulnerabilities.filter((v) => v.severity === "low").length,
    };

    // Sort: critical → high → moderate → low
    const severityOrder: Record<VulnerabilitySeverity, number> = {
      critical: 0,
      high: 1,
      moderate: 2,
      low: 3,
    };
    vulnerabilities.sort(
      (a, b) => severityOrder[a.severity] - severityOrder[b.severity]
    );

    return { vulnerabilities, summary };
  } catch {
    // If `bun audit` is not available or errors out, fail silently
    return empty;
  }
}
