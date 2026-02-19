import { resolve } from "path";
import type { TriageIssue } from "./types";

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
