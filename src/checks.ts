// ── Custom Check Entry Point ──────────────────────────────────────
//
// Keeps public imports stable while delegating implementations to
// focused modules.

export { checkDependencies } from "./dependency-check";
export { checkTsConfig } from "./tsconfig-check";
export { gatherProjectStats } from "./project-stats";
export { checkAsyncClientComponents, checkConsoleLogs } from "./source-checks";
