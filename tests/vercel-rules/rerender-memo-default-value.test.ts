import { describe, it, expect } from "bun:test";
import rule from "../../src/vercel-rules/rerender-memo-default-value";

describe("rerender-memo-default-value", () => {
  // ── Should flag ───────────────────────────────────────────────────

  it("flags default `= {}` inside a memo() component", () => {
    const content = `
const UserCard = memo(function UserCard({ config = {} }: Props) {
  return <div>{config.name}</div>;
});`;
    const issues = rule.check("UserCard.tsx", content);
    expect(issues.length).toBe(1);
    expect(issues[0]!.rule).toBe("rerender-memo-default-value");
    expect(issues[0]!.message).toContain("config");
  });

  it("flags default `= []` inside memo()", () => {
    const content = `
const List = memo(function List({ items = [] }: Props) {
  return <ul>{items.map(i => <li>{i}</li>)}</ul>;
});`;
    const issues = rule.check("List.tsx", content);
    expect(issues.length).toBe(1);
    expect(issues[0]!.message).toContain("items");
  });

  it("flags default arrow `= () => {}` inside memo()", () => {
    const content = `
const Button = memo(function Button({ onClick = () => {} }: Props) {
  return <button onClick={onClick}>Click</button>;
});`;
    const issues = rule.check("Button.tsx", content);
    expect(issues.length).toBe(1);
    expect(issues[0]!.message).toContain("onClick");
  });

  it("includes help text about extracting to module-level constant", () => {
    const content = `
const Card = memo(function Card({ style = {} }: Props) {
  return <div style={style} />;
});`;
    const issues = rule.check("Card.tsx", content);
    expect(issues.length).toBe(1);
    expect(issues[0]!.help).toContain("DEFAULT_");
  });

  // ── Should NOT flag ───────────────────────────────────────────────

  it("does not flag default primitive values inside memo()", () => {
    const content = `
const Counter = memo(function Counter({ count = 0, label = "" }: Props) {
  return <div>{label}: {count}</div>;
});`;
    const issues = rule.check("Counter.tsx", content);
    expect(issues.length).toBe(0);
  });

  it("does not flag non-primitive defaults in non-memo components", () => {
    const content = `
function List({ items = [] }: Props) {
  return <ul>{items.map(i => <li>{i}</li>)}</ul>;
}`;
    const issues = rule.check("List.tsx", content);
    expect(issues.length).toBe(0);
  });

  it("does not flag already-hoisted constants", () => {
    const content = `
const EMPTY_ITEMS: string[] = [];

const List = memo(function List({ items = EMPTY_ITEMS }: Props) {
  return <ul>{items.map(i => <li>{i}</li>)}</ul>;
});`;
    const issues = rule.check("List.tsx", content);
    expect(issues.length).toBe(0);
  });
});
