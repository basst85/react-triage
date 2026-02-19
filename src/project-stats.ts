import { resolve } from "path";
import type { ProjectStats } from "./types";

export async function gatherProjectStats(
  targetPath: string
): Promise<ProjectStats> {
  const stats: ProjectStats = {
    reactVersion: null,
    reactDomVersion: null,
    nextVersion: null,
    totalFiles: 0,
    clientComponents: 0,
    serverComponents: 0,
    largeFiles: [],
    strictMode: false,
    jsxTransform: null,
    target: null,
  };

  const pkgFile = Bun.file(resolve(targetPath, "package.json"));
  if (await pkgFile.exists()) {
    try {
      const pkg = await pkgFile.json();
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
      stats.reactVersion = allDeps.react?.replace(/[\^~>=<]*/g, "") ?? null;
      stats.reactDomVersion =
        allDeps["react-dom"]?.replace(/[\^~>=<]*/g, "") ?? null;
      stats.nextVersion = allDeps.next?.replace(/[\^~>=<]*/g, "") ?? null;
    } catch {
      // ignore parse errors
    }
  }

  const glob = new Bun.Glob("**/*.{tsx,jsx,ts,js}");
  const LARGE_FILE_THRESHOLD = 400;

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

    stats.totalFiles++;

    const absPath = resolve(targetPath, filePath);
    const file = Bun.file(absPath);
    const content = await file.text();
    const lines = content.split("\n").length;

    if (lines > LARGE_FILE_THRESHOLD) {
      stats.largeFiles.push({ file: filePath, lines });
    }

    if (filePath.endsWith(".tsx") || filePath.endsWith(".jsx")) {
      const firstLines = content.slice(0, 200);
      if (
        firstLines.includes("'use client'") ||
        firstLines.includes('"use client"')
      ) {
        stats.clientComponents++;
      } else {
        stats.serverComponents++;
      }
    }
  }

  stats.largeFiles.sort((a, b) => b.lines - a.lines);

  return stats;
}
