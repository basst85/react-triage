// ── server-auth-actions ────────────────────────────────────────────
// Authenticate server actions like API routes.
// Impact: CRITICAL — prevents unauthorized access

import type { VercelRule } from "./rule";

const serverAuthActions: VercelRule = {
  id: "server-auth-actions",
  title: "Authenticate Server Actions",
  impact: "CRITICAL",
  severity: "critical",
  description: "Server Actions are public endpoints. Always verify authentication inside each action.",
  url: "https://github.com/vercel-labs/agent-skills/blob/main/skills/react-best-practices/rules/server-auth-actions.md",

  check(filePath, content) {
    const issues: ReturnType<VercelRule["check"]> = [];

    // Only check files with "use server" directive
    if (!content.includes("'use server'") && !content.includes('"use server"')) {
      return issues;
    }

    const lines = content.split("\n");

    // Check if the "use server" is a file-level directive (first non-comment line)
    const isFileLevel = lines.some((line, idx) => {
      const trimmed = line.trim();
      if (trimmed === "" || trimmed.startsWith("//") || trimmed.startsWith("/*")) return false;
      return idx < 5 && (trimmed === "'use server'" || trimmed === '"use server"');
    });

    if (!isFileLevel) return issues;

    // Find exported async functions (these are server actions)
    const authPatterns = /(?:auth|session|verify|getUser|getSession|getCurrentUser|checkAuth|requireAuth)/i;
    const mutationPatterns = /(?:create|update|delete|remove|add|submit|save|modify|edit|insert)/i;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      const fnMatch = line.match(/export\s+async\s+function\s+(\w+)/);
      if (!fnMatch) continue;

      const fnName = fnMatch[1]!;
      // Only check functions that look like mutations
      if (!mutationPatterns.test(fnName)) continue;

      // Look in the function body (next 20 lines) for auth check
      let hasAuth = false;
      const bodyEnd = Math.min(i + 30, lines.length);
      for (let j = i + 1; j < bodyEnd; j++) {
        if (authPatterns.test(lines[j]!)) {
          hasAuth = true;
          break;
        }
        // Stop at next export
        if (j > i + 1 && /^export\s/.test(lines[j]!.trim())) break;
      }

      if (!hasAuth) {
        issues.push({
          severity: "critical",
          rule: "server-auth-actions",
          message: `Server Action "${fnName}" has no authentication check — it's a public endpoint`,
          help: "Add auth verification (e.g. verifySession()) at the start of the action",
          file: filePath,
          line: i + 1,
          column: 1,
          url: this.url,
        });
      }
    }

    return issues;
  },
};

export default serverAuthActions;
