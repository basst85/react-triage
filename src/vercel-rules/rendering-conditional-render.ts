// ── rendering-conditional-render ──────────────────────────────────
// Use ternary ?: for conditional JSX rendering when condition may be a number.
// Impact: MEDIUM — prevents accidental render of "0" and similar bugs
//
// Vercel best practice explicitly recommends:
//   {condition ? <A/> : null}   ✓
//   {count && <A/>}             ✗  — renders "0" when count is 0
//
// This rule only flags conditions that could plausibly be a number, such as:
//   .length, count, num, size, total, index, etc.
//
// It does NOT flag conditions that are clearly boolean or string:
//   isOpen &&, hasItems &&, !expr &&, x === y &&, props.label &&
//
// NOTE: This rule is the authoritative source on ternary-vs-&& in JSX.
// The oxlint `no-ternary` rule is disabled in scanner.ts because it directly
// contradicts this recommendation.

import type { VercelRule } from "./rule";

// ── Heuristics ────────────────────────────────────────────────────

/**
 * Common boolean-variable prefixes. Any identifier starting with one of
 * these (case-insensitive) is treated as boolean → safe with &&.
 */
const BOOLEAN_PREFIXES =
  /^(?:is|has|had|have|should|can|will|did|was|are|show|hide|enable|disable|allow|with|no)/i;

/**
 * Patterns that always produce a boolean:
 *  - negation: !expr
 *  - comparison: ===, !==, ==, !=, >=, <=, >, <
 *  - typeof checks
 *  - in / instanceof
 */
const BOOLEAN_EXPRESSION =
  /^\s*!|[!=]==?|>=?|<=?|\btypeof\b|\binstanceof\b|\bin\b/;

/**
 * Patterns that indicate the condition is very likely a number:
 *  - .length
 *  - identifiers like count, num, total, size, index, offset, score, amount,
 *    width, height, age, quantity, depth, level, step, page, limit
 */
const NUMERIC_TAIL = /\.length$/;
const NUMERIC_NAMES =
  /\b(?:count|num|total|size|index|offset|score|amount|quantity|width|height|age|depth|level|step|page|limit)$/i;

/**
 * Determine whether `condition` (the text before `&&`) could plausibly be
 * a number at runtime.  Returns `true` only when we have positive signal
 * that the condition is numeric.
 */
function conditionCouldBeNumber(condition: string): boolean {
  const c = condition.trim();

  // 1. Definitely boolean: negation, comparison, typeof, etc.
  if (BOOLEAN_EXPRESSION.test(c)) return false;

  // 2. Last meaningful token is a boolean-prefixed identifier → skip
  //    Handles: `isOpen`, `props.isOpen`, `state.hasItems`
  const lastIdent = c.match(/(\w+)\s*$/)?.[1];
  if (lastIdent && BOOLEAN_PREFIXES.test(lastIdent)) return false;

  // 3. Ends with .length → very likely a number
  if (NUMERIC_TAIL.test(c)) return true;

  // 4. Last identifier matches a known numeric name
  if (lastIdent && NUMERIC_NAMES.test(lastIdent)) return true;

  // 5. Unknown — could be string|undefined which is safe.  Lean towards
  //    no-flag to avoid the false positives the user reported.
  return false;
}

const renderingConditionalRender: VercelRule = {
  id: "rendering-conditional-render",
  title: "Use Ternary for Conditional JSX Rendering",
  impact: "MEDIUM",
  severity: "best-practice",
  description:
    "`{count && <Component/>}` renders \"0\" when count is a falsy number (e.g. array.length). Use `{count > 0 ? <Component/> : null}` to prevent silent rendering bugs.",
  url: "https://github.com/vercel-labs/agent-skills/blob/main/skills/react-best-practices/rules/rendering-conditional-render.md",

  check(filePath, content) {
    const issues: ReturnType<VercelRule["check"]> = [];

    // Only JSX/TSX files
    if (!filePath.endsWith(".tsx") && !filePath.endsWith(".jsx")) return issues;

    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      const trimmed = line.trim();

      // Skip comment lines
      if (
        trimmed.startsWith("//") ||
        trimmed.startsWith("*") ||
        trimmed.startsWith("/*")
      ) {
        continue;
      }

      // Match JSX conditional rendering with &&:
      //   {someExpr && <Component ...>
      //   {someExpr && (
      // The { must not contain nested braces to avoid false-positives on object literals.
      const jsxAndMatch = line.match(/\{([^{}\n]+)&&\s*(?:<[A-Za-z]|\()/);
      if (!jsxAndMatch) continue;

      // Extract the condition text (everything between { and &&)
      const condition = jsxAndMatch[1]!;

      // Only flag when the condition could realistically be a number
      if (!conditionCouldBeNumber(condition)) continue;

      issues.push({
        severity: "best-practice",
        rule: "rendering-conditional-render",
        message:
          "`{condition && <JSX>}` may render '0' when condition is a falsy number — use ternary instead",
        help:
          "Replace `{count && <Item/>}` with `{count > 0 ? <Item/> : null}` to prevent accidental rendering of '0'",
        file: filePath,
        line: i + 1,
        column: 1,
        url: this.url,
      });
    }

    return issues;
  },
};

export default renderingConditionalRender;
