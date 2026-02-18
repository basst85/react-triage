// ── Formatting Utilities ──────────────────────────────────────────
//
// Shared helpers for terminal output: health bar, severity badges,
// clickable file links, and OSC 8 hyperlinks.

import pc from "picocolors";
import type { Severity, VulnerabilitySeverity } from "../types";

// ── Health Score Bar ───────────────────────────────────────────────

export function renderHealthBar(score: number): string {
  const width = 30;
  const filled = Math.round((score / 100) * width);
  const empty = width - filled;

  const bar = "█".repeat(filled) + "░".repeat(empty);

  let colorFn = pc.red;
  if (score > 60) colorFn = pc.yellow;
  if (score > 85) colorFn = pc.green;

  return `${colorFn(bar)} ${colorFn(`${score}/100`)}`;
}

// ── Severity Badge ─────────────────────────────────────────────────

export function severityBadge(severity: Severity): string {
  switch (severity) {
    case "critical":
      return pc.bgRed(pc.white(pc.bold(" CRITICAL ")));
    case "performance":
      return pc.bgYellow(pc.black(pc.bold(" PERF ")));
    case "best-practice":
      return pc.bgBlue(pc.white(pc.bold(" TIP ")));
    case "info":
      return pc.bgBlack(pc.white(" INFO "));
  }
}

export function severityIcon(severity: Severity): string {
  switch (severity) {
    case "critical":
      return pc.red("✖");
    case "performance":
      return pc.yellow("!");
    case "best-practice":
      return pc.blue("◆");
    case "info":
      return pc.dim("○");
  }
}

// ── Clickable File Link ────────────────────────────────────────────
// Format: path/file.tsx:line:col — VS Code recognizes this for Cmd+Click

export function formatFileLink(filePath: string, line: number, col: number = 1): string {
  if (!filePath) return "";
  return pc.blue(pc.underline(`${filePath}:${line}:${col}`));
}

// ── OSC 8 Hyperlink (for web URLs) ────────────────────────────────

export function createLink(text: string, url: string): string {
  const OSC = "\u001B]8;;";
  const BEL = "\u001B\\";
  return `${OSC}${url}${BEL}${text}${OSC}${BEL}`;
}

// ── Vulnerability Severity Helpers ─────────────────────────────────

export function vulnSeverityColor(severity: VulnerabilitySeverity): (text: string) => string {
  switch (severity) {
    case "critical": return (t: string) => pc.bgRed(pc.white(pc.bold(t)));
    case "high":     return pc.red;
    case "moderate": return pc.yellow;
    case "low":      return pc.dim;
  }
}

export function vulnSeverityBadge(severity: VulnerabilitySeverity): string {
  switch (severity) {
    case "critical": return pc.bgRed(pc.white(pc.bold(" CRITICAL ")));
    case "high":     return pc.bgRed(pc.white(" HIGH "));
    case "moderate": return pc.bgYellow(pc.black(" MODERATE "));
    case "low":      return pc.bgBlack(pc.white(" LOW "));
  }
}
