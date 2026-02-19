import { resolve } from "path";
import { builtinModules } from "module";
import type { DependencyIssue } from "./types";

const HEAVY_DEV_ONLY_PACKAGES = new Set([
  "@faker-js/faker",
  "faker",
  "storybook",
  "@storybook/react",
  "@testing-library/react",
  "@testing-library/jest-dom",
  "jest",
  "vitest",
  "cypress",
  "playwright",
  "msw",
  "ts-node",
  "nodemon",
  "webpack-dev-server",
]);

const SCAN_GLOB = "**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs}";
const SKIP_DIR_PREFIXES = [
  "node_modules",
  ".next",
  "dist",
  "build",
  ".git",
  "coverage",
  ".turbo",
  "out",
];

const SPECIFIER_PATTERNS = [
  /\bimport\s+[^"'`]*?\sfrom\s*["'`]([^"'`]+)["'`]/g,
  /\bexport\s+[^"'`]*?\sfrom\s*["'`]([^"'`]+)["'`]/g,
  /\bimport\s*["'`]([^"'`]+)["'`]/g,
  /\brequire\s*\(\s*["'`]([^"'`]+)["'`]\s*\)/g,
  /\bimport\s*\(\s*["'`]([^"'`]+)["'`]\s*\)/g,
  /\b(?:jest|vi)\.mock\s*\(\s*["'`]([^"'`]+)["'`]/g,
];

const BUILTIN_MODULES = new Set(
  builtinModules.flatMap((moduleName) =>
    moduleName.startsWith("node:")
      ? [moduleName, moduleName.slice(5)]
      : [moduleName, `node:${moduleName}`]
  )
);

function normalizePackageName(specifier: string): string | null {
  if (
    !specifier ||
    specifier.startsWith(".") ||
    specifier.startsWith("/") ||
    specifier.startsWith("#") ||
    specifier.startsWith("@/") ||
    specifier.startsWith("~/") ||
    specifier.includes("://")
  ) {
    return null;
  }

  if (BUILTIN_MODULES.has(specifier)) {
    return null;
  }

  if (specifier.startsWith("@")) {
    const parts = specifier.split("/");
    return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : null;
  }

  const [pkg] = specifier.split("/");
  return pkg || null;
}

function extractUsedPackages(content: string): Set<string> {
  const used = new Set<string>();

  for (const pattern of SPECIFIER_PATTERNS) {
    for (const match of content.matchAll(pattern)) {
      const rawSpecifier = match[1];
      if (!rawSpecifier) continue;

      const pkgName = normalizePackageName(rawSpecifier);
      if (pkgName) {
        used.add(pkgName);
      }
    }
  }

  return used;
}

function isPackageTokenBoundary(char: string | undefined): boolean {
  if (!char) return true;
  return !/[A-Za-z0-9@/_-]/.test(char);
}

function scriptMentionsPackage(command: string, pkgName: string): boolean {
  if (!command || !pkgName) return false;

  let fromIndex = 0;
  while (fromIndex < command.length) {
    const index = command.indexOf(pkgName, fromIndex);
    if (index === -1) return false;

    const prev = index > 0 ? command[index - 1] : undefined;
    const next = command[index + pkgName.length];

    if (isPackageTokenBoundary(prev) && isPackageTokenBoundary(next)) {
      return true;
    }

    fromIndex = index + pkgName.length;
  }

  return false;
}

async function findUsedDeclaredPackages(
  targetPath: string,
  deps: Record<string, string>,
  devDeps: Record<string, string>
): Promise<Set<string>> {
  const declaredPackages = new Set([
    ...Object.keys(deps),
    ...Object.keys(devDeps),
  ]);
  const used = new Set<string>();

  const pkgPath = resolve(targetPath, "package.json");
  const pkgFile = Bun.file(pkgPath);
  if (await pkgFile.exists()) {
    try {
      const pkg = await pkgFile.json();
      const scripts = pkg.scripts ?? {};
      const scriptValues = Object.values<string>(scripts);

      for (const command of scriptValues) {
        for (const packageName of declaredPackages) {
          if (scriptMentionsPackage(command, packageName)) {
            used.add(packageName);
          }
        }
      }
    } catch {
      // ignore parse errors
    }
  }

  const glob = new Bun.Glob(SCAN_GLOB);

  for await (const filePath of glob.scan({
    cwd: targetPath,
    absolute: false,
    onlyFiles: true,
  })) {
    if (SKIP_DIR_PREFIXES.some((prefix) => filePath.startsWith(prefix))) {
      continue;
    }

    const absPath = resolve(targetPath, filePath);
    const content = await Bun.file(absPath).text();
    const packagesInFile = extractUsedPackages(content);

    for (const packageName of packagesInFile) {
      if (declaredPackages.has(packageName)) {
        used.add(packageName);
      }
    }
  }

  return used;
}

export async function checkDependencies(
  targetPath: string
): Promise<DependencyIssue[]> {
  const issues: DependencyIssue[] = [];

  const pkgPath = resolve(targetPath, "package.json");
  const pkgFile = Bun.file(pkgPath);

  if (!(await pkgFile.exists())) return issues;

  let pkg: Record<string, any>;
  try {
    pkg = await pkgFile.json();
  } catch {
    return issues;
  }

  const deps = pkg.dependencies ?? {};
  const devDeps = pkg.devDependencies ?? {};

  const usedPackages = await findUsedDeclaredPackages(targetPath, deps, devDeps);

  if (deps.react && deps["react-dom"]) {
    const reactVer = deps.react.replace(/[\^~>=<]*/g, "");
    const domVer = deps["react-dom"].replace(/[\^~>=<]*/g, "");
    if (reactVer !== domVer) {
      issues.push({
        type: "version-mismatch",
        message: `react (${deps.react}) and react-dom (${deps["react-dom"]}) versions don't match`,
        severity: "critical",
      });
    }
  }

  for (const dep of Object.keys(deps)) {
    if (HEAVY_DEV_ONLY_PACKAGES.has(dep)) {
      issues.push({
        type: "dev-in-prod",
        message: `"${dep}" should be in devDependencies, not dependencies`,
        severity: "performance",
      });
    }

    if (!usedPackages.has(dep)) {
      issues.push({
        type: "unused",
        message: `"${dep}" appears unused in dependencies`,
        severity: "performance",
      });
    }
  }

  for (const devDep of Object.keys(devDeps)) {
    if (!usedPackages.has(devDep)) {
      issues.push({
        type: "unused",
        message: `"${devDep}" appears unused in devDependencies`,
        severity: "best-practice",
      });
    }
  }

  try {
    const proc = Bun.spawn(["bun", "pm", "ls", "--all"], {
      stdout: "pipe",
      stderr: "pipe",
      cwd: targetPath,
    });
    const output = await new Response(proc.stdout).text();
    await proc.exited;

    const reactOccurrences = output
      .split("\n")
      .filter((line) => /\breact@\d/.test(line));

    if (reactOccurrences.length > 1) {
      issues.push({
        type: "duplicate",
        message: `Multiple React installations detected (${reactOccurrences.length} found) — this causes hooks errors`,
        severity: "critical",
      });
    }
  } catch {
    // Ignore if bun pm ls fails
  }

  return issues;
}
