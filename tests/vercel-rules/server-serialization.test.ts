import { describe, it, expect } from "bun:test";
import rule from "../../src/vercel-rules/server-serialization";

describe("server-serialization", () => {
  // ── Should flag ───────────────────────────────────────────────────

  it("flags entire fetched object passed to a Client Component", () => {
    const content = `
export default async function Page() {
  const user = await fetchUser();
  return <UserCard user={user} />;
}`;
    const issues = rule.check("page.tsx", content);
    expect(issues.length).toBe(1);
    expect(issues[0]!.rule).toBe("server-serialization");
    expect(issues[0]!.message).toContain("user");
    expect(issues[0]!.message).toContain("UserCard");
  });

  it("flags fetched product object passed to ProductDetail", () => {
    const content = `
export default async function ProductPage({ params }: Props) {
  const product = await getProduct(params.id);
  return <ProductDetail product={product} />;
}`;
    const issues = rule.check("product/page.tsx", content);
    expect(issues.length).toBe(1);
    expect(issues[0]!.message).toContain("product");
  });

  it("includes help text about destructuring", () => {
    const content = `
export default async function Page() {
  const order = await getOrder(id);
  return <OrderSummary order={order} />;
}`;
    const issues = rule.check("page.tsx", content);
    expect(issues.length).toBe(1);
    expect(issues[0]!.help).toContain("Destructure");
  });

  // ── Should NOT flag ───────────────────────────────────────────────

  it("does not flag when passing a specific field", () => {
    const content = `
export default async function Page() {
  const user = await fetchUser();
  return <UserCard name={user.name} />;
}`;
    // name={user.name} is a specific field, not the whole object
    const issues = rule.check("page.tsx", content);
    expect(issues.length).toBe(0);
  });

  it("does not flag generic prop names like `id`, `name`, `title`", () => {
    const content = `
export default async function Page() {
  const post = await getPost(params.id);
  return <PostHeader title={post.title} />;
}`;
    const issues = rule.check("page.tsx", content);
    expect(issues.length).toBe(0);
  });

  it("does not flag lowercase component names (HTML elements)", () => {
    const content = `
export default async function Page() {
  const data = await fetchData();
  return <div data={data} />;
}`;
    const issues = rule.check("page.tsx", content);
    expect(issues.length).toBe(0);
  });

  it("does not flag client components", () => {
    const content = `"use client";

export default async function Page() {
  const user = await fetchUser();
  return <UserCard user={user} />;
}`;
    const issues = rule.check("page.tsx", content);
    expect(issues.length).toBe(0);
  });

  it("does not flag .ts files", () => {
    const content = `
const user = await fetchUser();
renderCard(user);
`;
    const issues = rule.check("utils.ts", content);
    expect(issues.length).toBe(0);
  });
});
