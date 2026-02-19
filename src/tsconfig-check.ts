import { resolve } from "path";
import type { TriageIssue } from "./types";

export async function checkTsConfig(
  targetPath: string
): Promise<{
  issues: TriageIssue[];
  strictMode: boolean;
  jsxTransform: string | null;
  target: string | null;
}> {
  const issues: TriageIssue[] = [];
  let strictMode = false;
  let jsxTransform: string | null = null;
  let target: string | null = null;

  const tsconfigPath = resolve(targetPath, "tsconfig.json");
  const tsconfigFile = Bun.file(tsconfigPath);

  if (!(await tsconfigFile.exists())) {
    issues.push({
      severity: "best-practice",
      rule: "tsconfig-missing",
      message: "No tsconfig.json found — TypeScript recommended for React projects",
      file: "tsconfig.json",
      line: 0,
      column: 0,
    });
    return { issues, strictMode, jsxTransform, target };
  }

  let tsconfig: Record<string, any>;
  try {
    const text = await tsconfigFile.text();
    const cleaned = text
      .replace(/\/\/.*$/gm, "")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/,\s*([\]}])/g, "$1");
    tsconfig = JSON.parse(cleaned);
  } catch {
    return { issues, strictMode, jsxTransform, target };
  }

  const compilerOptions = tsconfig.compilerOptions ?? {};

  strictMode = compilerOptions.strict === true;
  if (!strictMode) {
    issues.push({
      severity: "best-practice",
      rule: "tsconfig-strict",
      message: '"strict" is not enabled in tsconfig.json — recommended for modern React',
      file: "tsconfig.json",
      line: 0,
      column: 0,
    });
  }

  jsxTransform = compilerOptions.jsx ?? null;
  if (jsxTransform && !["react-jsx", "react-jsxdev"].includes(jsxTransform)) {
    issues.push({
      severity: "performance",
      rule: "tsconfig-jsx-transform",
      message: `JSX transform is "${jsxTransform}" — use "react-jsx" for smaller bundles (no React imports needed). This also causes false-positive "react-in-jsx-scope" warnings across every JSX file; switching to "react-jsx" eliminates them all automatically.`,
      file: "tsconfig.json",
      line: 0,
      column: 0,
    });
  }

  target = compilerOptions.target ?? null;
  if (target) {
    const lowTarget = target.toLowerCase();
    const oldTargets = ["es5", "es6", "es2015", "es2016", "es2017", "es2018", "es2019"];
    if (oldTargets.includes(lowTarget)) {
      issues.push({
        severity: "performance",
        rule: "tsconfig-target",
        message: `Target is "${target}" — consider ES2020+ to reduce polyfill bloat`,
        file: "tsconfig.json",
        line: 0,
        column: 0,
      });
    }
  }

  return { issues, strictMode, jsxTransform, target };
}
