import { describe, it, expect } from "bun:test";
import rule from "../../src/vercel-rules/server-cache-lru";

describe("server-cache-lru", () => {
  // ── Should flag ───────────────────────────────────────────────────

  it("flags Prisma query in a lib data file without LRU cache", () => {
    const content = `
export async function getUserById(id: string) {
  return await prisma.user.findUnique({ where: { id } });
}`;
    const issues = rule.check("lib/data.ts", content);
    expect(issues.length).toBe(1);
    expect(issues[0]!.rule).toBe("server-cache-lru");
  });

  it("flags db. query in a services file", () => {
    const content = `
export async function getAllPosts() {
  return db.post.findMany({ orderBy: { createdAt: "desc" } });
}`;
    const issues = rule.check("services/posts.ts", content);
    expect(issues.length).toBe(1);
  });

  it("flags Prisma in a queries/ file", () => {
    const content = `
export async function getProducts() {
  return prisma.product.findMany();
}`;
    const issues = rule.check("queries/products.ts", content);
    expect(issues.length).toBe(1);
  });

  it("includes help text with LRUCache import example", () => {
    const content = `
export async function getItem(id: string) {
  return db.item.findUnique({ where: { id } });
}`;
    const issues = rule.check("lib/items.ts", content);
    expect(issues.length).toBe(1);
    expect(issues[0]!.help).toContain("LRUCache");
  });

  // ── Should NOT flag ───────────────────────────────────────────────

  it("does not flag when LRUCache is already in use", () => {
    const content = `
import { LRUCache } from "lru-cache";

const cache = new LRUCache({ max: 500, ttl: 5 * 60 * 1000 });

export async function getUserById(id: string) {
  if (cache.has(id)) return cache.get(id);
  const user = await prisma.user.findUnique({ where: { id } });
  cache.set(id, user);
  return user;
}`;
    const issues = rule.check("lib/data.ts", content);
    expect(issues.length).toBe(0);
  });

  it("does not flag when Redis is already in use", () => {
    const content = `
import { redis } from "@/lib/redis";

export async function getUser(id: string) {
  const cached = await redis.get(id);
  if (cached) return JSON.parse(cached);
  return prisma.user.findUnique({ where: { id } });
}`;
    const issues = rule.check("lib/data.ts", content);
    expect(issues.length).toBe(0);
  });

  it("does not flag non-data files (e.g. components)", () => {
    const content = `
export async function fetchUser() {
  return prisma.user.findFirst();
}`;
    // Not in lib/, utils/, etc.
    const issues = rule.check("components/UserCard.ts", content);
    expect(issues.length).toBe(0);
  });

  it("does not flag client components", () => {
    const content = `"use client";

export async function getUser() {
  return prisma.user.findFirst();
}`;
    const issues = rule.check("lib/data.ts", content);
    expect(issues.length).toBe(0);
  });

  it("does not flag files without db queries", () => {
    const content = `
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(amount);
}`;
    const issues = rule.check("lib/format.ts", content);
    expect(issues.length).toBe(0);
  });

  it("does not flag .tsx files (only plain .ts)", () => {
    const content = `
export async function UserList() {
  return prisma.user.findMany();
}`;
    const issues = rule.check("lib/UserList.tsx", content);
    expect(issues.length).toBe(0);
  });
});
