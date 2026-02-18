// ── navigation-in-try-catch ───────────────────────────────────────
// Don't wrap redirect/notFound inside try-catch in Server Actions.
// Impact: HIGH — navigation silently fails when caught

import type { VercelRule } from "./rule";

const navigationInTryCatch: VercelRule = {
  id: "navigation-in-try-catch",
  title: "Navigation APIs Inside try-catch in Server Actions",
  impact: "HIGH",
  severity: "critical",
  description:
    "redirect(), notFound(), forbidden(), and unauthorized() throw special errors that Next.js handles internally. Wrapping them in try-catch causes navigation to silently fail.",
  url: "https://nextjs.org/docs/app/api-reference/functions/redirect#behavior",

  check(filePath, content) {
    const issues: ReturnType<VercelRule["check"]> = [];

    // Only check files with "use server" directive
    if (
      !content.includes("'use server'") &&
      !content.includes('"use server"')
    )
      return issues;

    // Only check .ts/.tsx files
    if (
      !filePath.endsWith(".ts") &&
      !filePath.endsWith(".tsx") &&
      !filePath.endsWith(".js") &&
      !filePath.endsWith(".jsx")
    )
      return issues;

    const lines = content.split("\n");

    // Navigation functions that throw special errors
    const NAV_FUNCTIONS =
      /\b(?:redirect|permanentRedirect|notFound|forbidden|unauthorized)\s*\(/;

    // Track try-catch nesting
    let tryDepth = 0;
    let tryStartLine = -1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      const trimmed = line.trim();

      // Detect try block start
      if (/\btry\s*\{/.test(trimmed)) {
        if (tryDepth === 0) {
          tryStartLine = i;
        }
        tryDepth++;
      }

      // Detect block end — basic brace tracking
      if (trimmed === "}" || trimmed.startsWith("} catch")) {
        if (/\}\s*catch\s*\(/.test(trimmed) || /\}\s*catch\s*\{/.test(trimmed)) {
          // We're in the catch block now, depth stays until catch block closes
        } else if (tryDepth > 0 && i > tryStartLine) {
          // Could be end of try or catch block
        }
      }

      // Simple approach: check if navigation call appears between try { and } catch
      if (tryDepth > 0 && NAV_FUNCTIONS.test(trimmed)) {
        // Check if there's an unstable_rethrow nearby (within 10 lines)
        const surroundingBlock = lines
          .slice(Math.max(0, tryStartLine), Math.min(lines.length, i + 20))
          .join("\n");

        if (!surroundingBlock.includes("unstable_rethrow")) {
          const matchedFn = trimmed.match(
            /\b(redirect|permanentRedirect|notFound|forbidden|unauthorized)\s*\(/
          );
          const fnName = matchedFn?.[1] ?? "redirect";

          issues.push({
            severity: "critical",
            rule: "navigation-in-try-catch",
            message: `${fnName}() inside try-catch — this throws a special error that will be caught, breaking navigation`,
            help: `Move ${fnName}() outside try-catch, or use unstable_rethrow(error) in the catch block`,
            file: filePath,
            line: i + 1,
            column: 1,
            url: this.url,
          });
        }
      }

      // Track try depth based on braces (simplified)
      if (/\btry\s*\{/.test(trimmed)) {
        // Already handled above
      } else if (/\}\s*catch\b/.test(trimmed)) {
        // Entering catch block — still in try scope for our purposes
      } else if (/\}\s*finally\b/.test(trimmed)) {
        tryDepth = Math.max(0, tryDepth - 1);
      }

      // Reset depth when we clearly exit the try/catch/finally
      if (tryDepth > 0 && trimmed === "}" && i > tryStartLine + 1) {
        // Check if next non-empty line is catch/finally
        const nextLine = lines[i + 1]?.trim() ?? "";
        if (
          !nextLine.startsWith("catch") &&
          !nextLine.startsWith("finally") &&
          !/\}\s*catch/.test(trimmed) &&
          !/\}\s*finally/.test(trimmed)
        ) {
          tryDepth = Math.max(0, tryDepth - 1);
        }
      }
    }

    return issues;
  },
};

export default navigationInTryCatch;
