// ── Rule Definitions & Categorization ───────────────────────────────
//
// Maps Oxlint rule codes to React Triage severity categories.
// Based on Vercel React & Next.js best practices.

import type { Severity } from "./types";

// Oxlint outputs codes like "react-hooks(rules-of-hooks)" or "nextjs(no-img-element)"
// We map the rule name (inside parentheses) to a severity category.

export const CRITICAL_RULES = new Set([
  "rules-of-hooks",
  "jsx-key",
  "no-direct-mutation-state",
  "jsx-no-undef",
  "no-script-component-in-head",
  "no-async-client-component",
  "no-typos",
  "require-render-return",
  "valid-jsx-nesting",
]);

export const PERFORMANCE_RULES = new Set([
  "exhaustive-deps",
  "jsx-no-bind",
  "no-unstable-nested-components",
  "jsx-no-useless-fragment",
  "no-string-refs",
  "no-sync-scripts",
  "google-font-display",
  "google-font-preconnect",
  "no-img-element",
  "no-array-index-key",
  // React-perf plugin rules (covers Vercel rerender-* patterns)
  "jsx-no-new-object-as-prop",
  "jsx-no-new-array-as-prop",
  "jsx-no-new-function-as-prop",
  "jsx-no-jsx-as-prop",
  // Oxlint barrel file rule (covers Vercel bundle-barrel-imports)
  "no-barrel-file",
  // NOTE: no-array-sort removed — Oxlint flags safe immutable patterns like
  // [...arr].sort(). The Vercel js-tosorted-immutable rule handles this better.
  // "no-array-sort",
  // Next.js best practices (Oxlint built-in)
  "no-css-tags",
  "next-script-for-ga",
  "jsx-no-constructed-context-values",
]);

// ── jsx-a11y: Accessibility (WCAG) rules ──────────────────────────
//
// Exported separately so --a11y can filter to only these rules.
export const A11Y_RULES = new Set([
  "alt-text",                        // Missing alt on <img>, <area>, <input type=image>
  "anchor-has-content",              // Empty <a> tags
  "anchor-is-valid",                 // Invalid href on <a>
  "aria-role",                       // Invalid ARIA role value
  "aria-props",                      // Invalid ARIA attribute names
  "aria-proptypes",                  // Invalid ARIA attribute values
  "click-events-have-key-events",    // onClick without keyboard equivalent
  "heading-has-content",             // Empty heading elements
  "html-has-lang",                   // <html> missing lang attribute
  "label-has-associated-control",    // <label> not linked to a form control
  "mouse-events-have-key-events",    // onMouseOver/Out without keyboard equivalent
  "no-aria-hidden-on-focusable",     // aria-hidden on focusable elements
  "no-noninteractive-tabindex",      // tabIndex on non-interactive elements
  "no-static-element-interactions",  // Interactive handlers on <div>/<span> etc.
  "role-has-required-aria-props",    // ARIA roles missing required attributes
  "scope",                           // scope attribute only valid on <th>
  "tabindex-no-positive",            // tabIndex > 0 breaks natural focus order
]);

export const BEST_PRACTICE_RULES = new Set([
  "no-html-link-for-pages",
  "jsx-no-target-blank",
  "no-children-prop",
  "no-danger-with-children",
  "no-is-mounted",
  "no-redundant-should-component-update",
  "no-render-return-value",
  "no-unknown-property",
  "no-unescaped-entities",
  "void-dom-elements-no-children",
  "no-find-dom-node",
  "inline-script-id",
  "no-head-element",
  "no-page-custom-font",
  "no-unwanted-polyfillio",
  "no-title-in-document-head",
  "no-before-interactive-script-outside-document",
  "no-document-import-in-page",
  "no-head-import-in-document",
  "no-styled-jsx-in-document",
  "no-duplicate-head",
  // jsx-a11y rules are included via A11Y_RULES spread
  ...A11Y_RULES,
]);

/**
 * Extract the rule name from an oxlint code string.
 * E.g. "react-hooks(rules-of-hooks)" -> "rules-of-hooks"
 *      "nextjs(no-img-element)" -> "no-img-element"
 *      "eslint(no-debugger)" -> "no-debugger"
 */
export function extractRuleName(code: string): string {
  const match = code.match(/\((.+)\)/);
  return match?.[1] ?? code;
}

/**
 * Categorize an oxlint diagnostic code into a severity.
 */
export function categorizeRule(code: string): Severity {
  const rule = extractRuleName(code);

  if (CRITICAL_RULES.has(rule)) return "critical";
  if (PERFORMANCE_RULES.has(rule)) return "performance";
  if (BEST_PRACTICE_RULES.has(rule)) return "best-practice";
  return "info";
}

/**
 * Score penalties per severity category.
 */
export const SCORE_PENALTIES: Record<Severity, number> = {
  critical: 10,
  performance: 3,
  "best-practice": 1,
  info: 0,
};
