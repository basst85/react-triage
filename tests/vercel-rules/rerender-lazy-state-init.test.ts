import { describe, it, expect } from "bun:test";
import rule from "../../src/vercel-rules/rerender-lazy-state-init";

describe("rerender-lazy-state-init", () => {
  // ── Should flag ───────────────────────────────────────────────────

  it("flags useState(JSON.parse(...))", () => {
    const content = `
function Settings() {
  const [config, setConfig] = useState(JSON.parse(localStorage.getItem("config") ?? "{}"));
  return <div />;
}`;
    const issues = rule.check("settings.tsx", content);
    expect(issues.length).toBe(1);
    expect(issues[0]!.rule).toBe("rerender-lazy-state-init");
  });

  it("flags useState(localStorage.getItem(...))", () => {
    const content = `
function App() {
  const [theme, setTheme] = useState(localStorage.getItem("theme"));
  return <div className={theme} />;
}`;
    const issues = rule.check("app.tsx", content);
    expect(issues.length).toBe(1);
  });

  it("flags useState with buildIndex() call", () => {
    const content = `
function Search({ data }: Props) {
  const [index, setIndex] = useState(buildIndex(data));
  return <input />;
}`;
    const issues = rule.check("search.tsx", content);
    expect(issues.length).toBe(1);
    expect(issues[0]!.message).toContain("lazy");
  });

  it("flags useState with compute() call", () => {
    const content = `
function Chart() {
  const [points, setPoints] = useState(compute(rawData));
  return <svg />;
}`;
    const issues = rule.check("chart.tsx", content);
    expect(issues.length).toBe(1);
  });

  it("includes help text showing the lazy form", () => {
    const content = `
function Foo() {
  const [x, setX] = useState(JSON.parse(stored));
}`;
    const issues = rule.check("foo.tsx", content);
    expect(issues.length).toBe(1);
    expect(issues[0]!.help).toContain("() =>");
  });

  // ── Should NOT flag ───────────────────────────────────────────────

  it("does not flag useState already using lazy form", () => {
    const content = `
function App() {
  const [config, setConfig] = useState(() => JSON.parse(localStorage.getItem("config") ?? "{}"));
  return <div />;
}`;
    const issues = rule.check("app.tsx", content);
    expect(issues.length).toBe(0);
  });

  it("does not flag useState with primitive values", () => {
    const content = `
function Counter() {
  const [count, setCount] = useState(0);
  const [name, setName] = useState("");
  const [active, setActive] = useState(false);
  const [data, setData] = useState(null);
  return <div />;
}`;
    const issues = rule.check("counter.tsx", content);
    expect(issues.length).toBe(0);
  });

  it("does not flag useState with simple variable reference", () => {
    const content = `
function Foo({ initialCount }: Props) {
  const [count, setCount] = useState(initialCount);
  return <div />;
}`;
    const issues = rule.check("foo.tsx", content);
    expect(issues.length).toBe(0);
  });
});
