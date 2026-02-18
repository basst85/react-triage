# ⚛️ React Triage

[![npm version](https://img.shields.io/npm/v/react-triage.svg)](https://www.npmjs.com/package/react-triage)
[![license](https://img.shields.io/npm/l/react-triage.svg)](https://github.com/basst85/react-triage/blob/main/LICENSE)
[![powered by bun](https://img.shields.io/badge/powered%20by-bun-f9f1e1?logo=bun)](https://bun.sh)

Blazing-fast React & Next.js project health checker.

Scans your codebase with Rust-native analysis, 29 Vercel best-practice rules, a security audit, and dependency health checks. All in a single command.

## What it checks

| Category | Description |
|---|---|
| 🚨 **Critical** | Hooks violations, async client components, state mutations |
| 🚀 **Performance** | Unnecessary re-renders, missing optimizations, slow patterns |
| 💡 **Best Practices** | Next.js patterns, accessibility, client/server component ratio |
| 📦 **Dependencies** | Version mismatches, duplicates, dev packages in production |
| 🔒 **Security** | Known CVEs via `bun audit` (npm advisory database) |
| ⚙️ **Config** | tsconfig.json strictness, JSX transform, TS target |
| 📏 **Large Files** | Files over 400 lines. Candidates for refactoring |

## Vercel Best Practice Rules

29 rules based on Vercel's React & Next.js best practices:

<details>
<summary>🔴 Critical impact</summary>

| Rule | Description |
|---|---|
| `async-parallel` | Sequential `await` calls that should be parallelised with `Promise.all` |
| `async-defer-await` | Unnecessary `await` on non-async return values |
| `async-dependencies` | Async operations used incorrectly as hook dependencies |
| `async-api-routes` | Missing `await` on async operations inside Next.js API routes |
| `async-suspense-boundaries` | Async Server Components missing a `<Suspense>` boundary |
| `bundle-dynamic-imports` | Large components loaded eagerly instead of with `next/dynamic` |
| `server-parallel-fetching` | Sequential `fetch` calls in Server Components that can run in parallel |
| `server-auth-actions` | Server Actions missing authentication/authorisation guard |
| `metadata-in-client-component` | `export const metadata` inside a Client Component (silently ignored by Next.js) |
| `navigation-in-try-catch` | `redirect()` or `notFound()` wrapped in `try/catch` (they throw intentionally) |
| `hydration-browser-api` | Browser-only APIs (`window`, `document`, `localStorage`) used during SSR |

</details>

<details>
<summary>🟠 High impact</summary>

| Rule | Description |
|---|---|
| `bundle-defer-third-party` | Third-party `<Script>` tags not using `strategy="lazyOnload"` or `"afterInteractive"` |
| `bundle-conditional` | Heavy imports loaded unconditionally instead of behind a dynamic import |
| `server-serialization` | Non-serialisable values (class instances, functions) passed from Server → Client component |
| `server-cache-lru` | `React.cache()` only deduplicates within one request — server-side data functions need an LRU cache to avoid redundant queries across requests |
| `image-fill-missing-sizes` | `<Image fill>` without a `sizes` attribute (causes oversized image downloads) |
| `font-manual-link` | Manual `<link>` / CSS `@import` for Google Fonts instead of `next/font` |
| `composition-boolean-props` | Components with 3+ boolean props (`isX`, `hasX`, `showX`…) — use composition with explicit variant components |
| `composition-compound-components` | Components with multiple `renderX` props — use compound components with shared context |

</details>

<details>
<summary>🟡 Medium impact</summary>

| Rule | Description |
|---|---|
| `client-swr-dedup` | SWR/React Query calls without stable cache keys, preventing deduplication |
| `client-passive-event-listeners` | Scroll/wheel/touch event listeners missing `{ passive: true }` |
| `rerender-derived-state-no-effect` | Derived state computed inside `useEffect` — calculate inline instead |
| `rerender-lazy-state-init` | Expensive `useState` initialisers not using the lazy initialiser form |
| `rerender-memo-default-value` | Components wrapped in `React.memo` with unstable default prop objects/arrays |
| `server-cache-react` | Async server functions making DB/auth queries without `React.cache()` — wrap to deduplicate within a single request |
| `js-tosorted-immutable` | `.sort()` mutates arrays in place — use `.toSorted()` (or `[...arr].sort()` for older targets) to avoid React state/prop mutation bugs |
| `use-next-og` | Manual `<meta property="og:image">` tags instead of `next/og` |

</details>

<details>
<summary>🟢 Low impact</summary>

| Rule | Description |
|---|---|
| `rendering-conditional-render` | `{count && <JSX>}` renders `"0"` when condition is a falsy number — only flags numeric conditions (`.length`, `count`, `total`, etc.) |
| `server-dedup-props` | Passing both an array and a transformed copy as separate RSC→client props serialises both — send once, transform in the client |

</details>

## Prerequisites

React Triage requires [Bun](https://bun.sh) as its runtime.

```bash
# Install Bun (if not already installed)
curl -fsSL https://bun.sh/install | bash
```

## Install

```bash
# Global install via Bun (recommended)
bun add -g react-triage

# Or via npm
npm install -g react-triage

# Or run directly without installing
bunx react-triage
```

## Usage

```bash
# Scan the current directory
react-triage

# Scan a specific path
react-triage ./my-react-app

# Show all issues (no truncation)
react-triage --show-all

# Export results to Markdown
react-triage --to-markdown=report.md

# Filter by severity (combinable)
react-triage --critical
react-triage --critical --performance
react-triage --best-practices

# Help / version
react-triage --help
react-triage --version
```

## CLI Options

| Flag | Description |
|---|---|
| `--show-all` | Show all issues instead of truncating per category |
| `--to-markdown=<file>` | Export the full report as a Markdown file |
| `--critical` | Show only critical issues |
| `--performance` | Show only performance issues |
| `--best-practices` | Show only best-practice issues |
| `--help`, `-h` | Show help |
| `--version`, `-v` | Show version |

Severity filters can be combined: `react-triage --critical --performance`

## Scoring

React Triage calculates a **health score from 0–100**:

| Deduction | Amount |
|---|---|
| Critical issue | −10 pts |
| Performance issue | −3 pts |
| Best-practice issue | −1 pt |
| Security critical CVE | −15 pts |
| Security high CVE | −8 pts |
| Security moderate CVE | −3 pts |
| High client-component ratio (>80 %) | −5 pts |
| Elevated client-component ratio (>60 %) | −2 pts |


## License

MIT
