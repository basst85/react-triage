import { describe, it, expect } from "bun:test";
import rule from "../../src/vercel-rules/async-parallel";

describe("async-parallel", () => {
  // ── Should flag ───────────────────────────────────────────────────

  it("flags two sequential independent awaits", () => {
    const content = `
async function fetchPageData() {
  const user = await fetchUser();
  const posts = await fetchPosts();
  return { user, posts };
}`;
    const issues = rule.check("page.ts", content);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0]!.rule).toBe("async-parallel");
  });

  it("flags sequential awaits with different names", () => {
    const content = `
async function getData() {
  const products = await getProducts();
  const categories = await getCategories();
  return { products, categories };
}`;
    const issues = rule.check("data.ts", content);
    expect(issues.length).toBeGreaterThan(0);
  });

  it("includes help text pointing to Promise.all", () => {
    const content = `
async function load() {
  const alpha = await fetchAlpha();
  const beta = await fetchBeta();
  return [alpha, beta];
}`;
    const issues = rule.check("load.ts", content);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0]!.message).toMatch(/Promise\.all/);
  });

  // ── Should NOT flag ───────────────────────────────────────────────

  it("does not flag awaits that depend on each other", () => {
    const content = `
async function fetchPageData() {
  const user = await fetchUser();
  const posts = await fetchPostsByUser(user.id);
  return { user, posts };
}`;
    const issues = rule.check("page.ts", content);
    expect(issues.length).toBe(0);
  });

  it("does not flag code already using Promise.all", () => {
    const content = `
async function fetchPageData() {
  const [user, posts] = await Promise.all([fetchUser(), fetchPosts()]);
  return { user, posts };
}`;
    const issues = rule.check("page.ts", content);
    expect(issues.length).toBe(0);
  });

  it("does not flag a single await", () => {
    const content = `
async function fetchUser() {
  const user = await db.user.findFirst();
  return user;
}`;
    const issues = rule.check("page.ts", content);
    expect(issues.length).toBe(0);
  });

  it("does not flag awaits separated by other statements", () => {
    const content = `
async function process() {
  const user = await fetchUser();
  console.log("fetched user");
  const posts = await fetchPosts();
  return { user, posts };
}`;
    // Awaits are not on consecutive lines — should not flag
    const issues = rule.check("process.ts", content);
    expect(issues.length).toBe(0);
  });
});
