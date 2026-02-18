import { describe, it, expect } from "bun:test";
import rule from "../../src/vercel-rules/rerender-derived-state-no-effect";

describe("rerender-derived-state-no-effect", () => {
  // ── Should flag ───────────────────────────────────────────────────

  it("flags useEffect that only sets derived state from a prop", () => {
    const content = `
import { useState, useEffect } from "react";

function UserList({ users }: Props) {
  const [filteredUsers, setFilteredUsers] = useState(users);

  useEffect(() => {
    setFilteredUsers(users.filter(u => u.active));
  }, [users]);

  return <ul>{filteredUsers.map(u => <li key={u.id}>{u.name}</li>)}</ul>;
}`;
    const issues = rule.check("UserList.tsx", content);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0]!.rule).toBe("rerender-derived-state-no-effect");
  });

  it("flags useEffect with a single setState transforming another state", () => {
    const content = `
function Search({ query }: Props) {
  const [results, setResults] = useState<string[]>([]);

  useEffect(() => {
    setResults(items.filter(i => i.includes(query)));
  }, [query]);

  return <div>{results.join(", ")}</div>;
}`;
    const issues = rule.check("Search.tsx", content);
    expect(issues.length).toBeGreaterThan(0);
  });

  it("includes help text about computing during render", () => {
    const content = `
function Sorted({ items }: Props) {
  const [sorted, setSorted] = useState(items);
  useEffect(() => {
    setSorted([...items].sort());
  }, [items]);
  return <ul>{sorted.map(i => <li>{i}</li>)}</ul>;
}`;
    const issues = rule.check("Sorted.tsx", content);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0]!.help).toMatch(/during render|const /);
  });

  // ── Should NOT flag ───────────────────────────────────────────────

  it("does not flag useEffect with a fetch side-effect", () => {
    const content = `
function Post({ id }: Props) {
  const [post, setPost] = useState(null);

  useEffect(() => {
    fetch(\`/api/posts/\${id}\`)
      .then(r => r.json())
      .then(setPost);
  }, [id]);

  return post ? <Article post={post} /> : null;
}`;
    const issues = rule.check("Post.tsx", content);
    expect(issues.length).toBe(0);
  });

  it("does not flag files without both useState and useEffect", () => {
    const content = `
function StaticList({ items }: Props) {
  return <ul>{items.map(i => <li key={i}>{i}</li>)}</ul>;
}`;
    const issues = rule.check("StaticList.tsx", content);
    expect(issues.length).toBe(0);
  });

  it("does not flag .ts utility files", () => {
    const content = `
import { useState, useEffect } from "react";
function setup() {
  const [x, setX] = useState(0);
  useEffect(() => { setX(1); }, []);
}`;
    const issues = rule.check("utils.ts", content);
    expect(issues.length).toBe(0);
  });
});
