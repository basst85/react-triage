// ── Vercel Rules Index ─────────────────────────────────────────────
//
// Exports all Vercel Best Practice rules and a runner that scans
// project files against them.

import { resolve } from "path";
import type { TriageIssue } from "../types";
import type { VercelRule } from "./rule";

// ── CRITICAL rules ────────────────────────────────────────────────
import asyncParallel from "./async-parallel";
import asyncDeferAwait from "./async-defer-await";
import asyncDependencies from "./async-dependencies";
import asyncApiRoutes from "./async-api-routes";
import asyncSuspenseBoundaries from "./async-suspense-boundaries";
import bundleDynamicImports from "./bundle-dynamic-imports";
import serverParallelFetching from "./server-parallel-fetching";
import serverAuthActions from "./server-auth-actions";

// ── HIGH rules ────────────────────────────────────────────────────
import bundleDeferThirdParty from "./bundle-defer-third-party";
import bundleConditional from "./bundle-conditional";
import serverSerialization from "./server-serialization";
import serverCacheLru from "./server-cache-lru";

// ── MEDIUM-HIGH rules ─────────────────────────────────────────────
import clientSwrDedup from "./client-swr-dedup";
import clientPassiveEventListeners from "./client-passive-event-listeners";

// ── MEDIUM rules ──────────────────────────────────────────────────
import rerenderDerivedStateNoEffect from "./rerender-derived-state-no-effect";
import rerenderLazyStateInit from "./rerender-lazy-state-init";
import rerenderMemoDefaultValue from "./rerender-memo-default-value";
import serverCacheReact from "./server-cache-react";
import jsTosortedImmutable from "./js-tosorted-immutable";

// ── LOW rules ─────────────────────────────────────────────────────
import serverDedupProps from "./server-dedup-props";
import renderingConditionalRender from "./rendering-conditional-render";

// ── Composition pattern rules (HIGH — architecture) ───────────────
import compositionBooleanProps from "./composition-boolean-props";
import compositionCompoundComponents from "./composition-compound-components";

// ── Next.js Best Practices rules (from vercel-labs/next-skills) ────
import metadataInClientComponent from "./metadata-in-client-component";
import navigationInTryCatch from "./navigation-in-try-catch";
import imageFillMissingSizes from "./image-fill-missing-sizes";
import useNextOg from "./use-next-og";
import fontManualLink from "./font-manual-link";
import hydrationBrowserApi from "./hydration-browser-api";

export const ALL_VERCEL_RULES: VercelRule[] = [
  // CRITICAL
  asyncParallel,
  asyncDeferAwait,
  asyncDependencies,
  asyncApiRoutes,
  asyncSuspenseBoundaries,
  bundleDynamicImports,
  serverParallelFetching,
  serverAuthActions,
  metadataInClientComponent,
  navigationInTryCatch,
  hydrationBrowserApi,
  // HIGH
  bundleDeferThirdParty,
  bundleConditional,
  serverSerialization,
  serverCacheLru,
  imageFillMissingSizes,
  fontManualLink,
  compositionBooleanProps,
  compositionCompoundComponents,
  // MEDIUM-HIGH
  clientSwrDedup,
  clientPassiveEventListeners,
  // MEDIUM
  rerenderDerivedStateNoEffect,
  rerenderLazyStateInit,
  rerenderMemoDefaultValue,
  serverCacheReact,
  jsTosortedImmutable,
  useNextOg,
  // MEDIUM
  renderingConditionalRender,
  // LOW
  serverDedupProps,
];

// Files/directories to skip
const SKIP_PREFIXES = ["node_modules", ".next", "dist", "build", ".git"];

/**
 * Run all Vercel rules against every file in the project.
 */
export async function runVercelRules(targetPath: string): Promise<TriageIssue[]> {
  const issues: TriageIssue[] = [];
  const glob = new Bun.Glob("**/*.{tsx,jsx,ts,js}");

  for await (const filePath of glob.scan({
    cwd: targetPath,
    absolute: false,
    onlyFiles: true,
  })) {
    // Skip non-project files
    if (SKIP_PREFIXES.some((prefix) => filePath.startsWith(prefix))) continue;

    const absPath = resolve(targetPath, filePath);
    const content = await Bun.file(absPath).text();

    for (const rule of ALL_VERCEL_RULES) {
      const found = rule.check(filePath, content);
      issues.push(...found);
    }
  }

  return issues;
}
