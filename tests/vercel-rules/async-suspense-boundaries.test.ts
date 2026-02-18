import { describe, it, expect } from "bun:test";
import rule from "../../src/vercel-rules/async-suspense-boundaries";

describe("async-suspense-boundaries", () => {
  // ── Should flag ───────────────────────────────────────────────────

  it("flags async component with await and no Suspense", () => {
    const content = `
export default async function Page() {
  const data = await fetchData();
  return (
    <main>
      <h1>{data.title}</h1>
    </main>
  );
}`;
    const issues = rule.check("page.tsx", content);
    expect(issues.length).toBe(1);
    expect(issues[0]!.rule).toBe("async-suspense-boundaries");
  });

  it("flags async named export component without Suspense", () => {
    const content = `
export async function UserProfile() {
  const user = await getUser();
  return <div>{user.name}</div>;
}`;
    const issues = rule.check("UserProfile.tsx", content);
    expect(issues.length).toBe(1);
  });

  it("reports the line of the async component definition", () => {
    const content = `
import { getUserData } from "@/lib/data";

export default async function Dashboard() {
  const stats = await getUserData();
  return <section>{stats.total}</section>;
}`;
    const issues = rule.check("dashboard.tsx", content);
    expect(issues.length).toBe(1);
    expect(issues[0]!.line).toBe(4);
  });

  // ── Should NOT flag ───────────────────────────────────────────────

  it("does not flag async component that already uses Suspense", () => {
    const content = `
import { Suspense } from "react";

export default async function Page() {
  return (
    <main>
      <Suspense fallback={<Loading />}>
        <DataList />
      </Suspense>
    </main>
  );
}`;
    const issues = rule.check("page.tsx", content);
    expect(issues.length).toBe(0);
  });

  it("does not flag synchronous components", () => {
    const content = `
export default function StaticPage() {
  return <main><h1>Hello</h1></main>;
}`;
    const issues = rule.check("page.tsx", content);
    expect(issues.length).toBe(0);
  });

  it("skips .ts files entirely", () => {
    const content = `
export async function getPageData() {
  const data = await fetchData();
  return data;
}`;
    const issues = rule.check("data.ts", content);
    expect(issues.length).toBe(0);
  });

  it("does not flag if there is no await before return", () => {
    const content = `
export default async function Page({ params }: Props) {
  return <main><ClientComponent /></main>;
}`;
    const issues = rule.check("page.tsx", content);
    expect(issues.length).toBe(0);
  });
});
