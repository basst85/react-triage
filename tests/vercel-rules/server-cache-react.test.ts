import { describe, it, expect } from "bun:test";
import rule from "../../src/vercel-rules/server-cache-react";

describe("server-cache-react", () => {
  // ── Should flag ───────────────────────────────────────────────────

  it("flags async server function with Prisma query and no React.cache()", () => {
    const content = `
export async function getUser(id: string) {
  return await prisma.user.findUnique({ where: { id } });
}`;
    const issues = rule.check("lib/data.ts", content);
    expect(issues.length).toBe(1);
    expect(issues[0]!.rule).toBe("server-cache-react");
  });

  it("flags Prisma query accessed via db. prefix", () => {
    const content = `
export async function getPosts() {
  return db.post.findMany({ take: 10 });
}`;
    const issues = rule.check("lib/posts.ts", content);
    expect(issues.length).toBe(1);
  });

  it("flags auth() call without React.cache()", () => {
    const content = `
import { auth } from "@/lib/auth";

export async function getCurrentUser() {
  const session = await auth();
  return session?.user;
}`;
    const issues = rule.check("lib/session.ts", content);
    expect(issues.length).toBe(1);
  });

  it("flags getServerSession() call without React.cache()", () => {
    const content = `
export async function getUser() {
  const session = await getServerSession(authOptions);
  return session?.user;
}`;
    const issues = rule.check("lib/user.ts", content);
    expect(issues.length).toBe(1);
  });

  it("includes help text with React.cache import example", () => {
    const content = `
export async function getData() {
  return await prisma.item.findMany();
}`;
    const issues = rule.check("lib/data.ts", content);
    expect(issues.length).toBe(1);
    expect(issues[0]!.help).toContain("cache");
  });

  // ── Should NOT flag ───────────────────────────────────────────────

  it("does not flag when React.cache() is already imported and used", () => {
    const content = `
import { cache } from "react";

export const getUser = cache(async (id: string) => {
  return await prisma.user.findUnique({ where: { id } });
});`;
    const issues = rule.check("lib/data.ts", content);
    expect(issues.length).toBe(0);
  });

  it("does not flag client components", () => {
    const content = `"use client";
import { useState } from "react";

export function UserCard() {
  return prisma.user.findUnique({ where: { id: "1" } });
}`;
    const issues = rule.check("components/UserCard.tsx", content);
    expect(issues.length).toBe(0);
  });

  it("does not flag plain TS utility files without db queries", () => {
    const content = `
export function formatDate(date: Date): string {
  return date.toISOString();
}`;
    const issues = rule.check("lib/format.ts", content);
    expect(issues.length).toBe(0);
  });

  it("does not flag when cache() is already called", () => {
    const content = `
import { cache } from "react";

const cachedQuery = cache(async () => {
  return await db.post.findMany();
});`;
    const issues = rule.check("lib/queries.ts", content);
    expect(issues.length).toBe(0);
  });
});
