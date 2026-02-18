import { describe, it, expect } from "bun:test";
import rule from "../../src/vercel-rules/rendering-conditional-render";

describe("rendering-conditional-render", () => {
  // ── Should flag (condition likely a number) ───────────────────────

  it("flags `{count && <Item/>}` — classic falsy-number bug", () => {
    const content = `
export function List({ count }: { count: number }) {
  return <div>{count && <Item count={count} />}</div>;
}`;
    const issues = rule.check("list.tsx", content);
    expect(issues.length).toBe(1);
    expect(issues[0]!.rule).toBe("rendering-conditional-render");
    expect(issues[0]!.line).toBe(3);
  });

  it("flags `{items.length && <List/>}` — array length is a number", () => {
    const content = `
function Page() {
  return <main>{items.length && <List items={items} />}</main>;
}`;
    const issues = rule.check("page.tsx", content);
    expect(issues.length).toBe(1);
  });

  it("flags `{total && <Summary/>}` — total is a numeric name", () => {
    const content = `
function Cart({ total }: Props) {
  return <div>{total && <Summary total={total} />}</div>;
}`;
    const issues = rule.check("cart.tsx", content);
    expect(issues.length).toBe(1);
  });

  it("flags `{data.size && <Badge/>}` — size is a numeric name", () => {
    const content = `
function Info({ data }: Props) {
  return <span>{data.size && <Badge />}</span>;
}`;
    const issues = rule.check("info.tsx", content);
    expect(issues.length).toBe(1);
  });

  it("flags `{props.index && <Row/>}` — index is a numeric name", () => {
    const content = `
function Table(props: Props) {
  return <tr>{props.index && <Row />}</tr>;
}`;
    const issues = rule.check("table.tsx", content);
    expect(issues.length).toBe(1);
  });

  it("flags count in multi-line open-paren form", () => {
    const content = `
function Dashboard({ count }: Props) {
  return (
    <div>
      {count && (
        <Badge count={count} />
      )}
    </div>
  );
}`;
    const issues = rule.check("dashboard.tsx", content);
    expect(issues.length).toBe(1);
  });

  // ── Should NOT flag (boolean conditions) ──────────────────────────

  it("does not flag `{isOpen && <Dialog/>}` — boolean prefix 'is'", () => {
    const content = `
function Modal({ isOpen }: Props) {
  return <div>{isOpen && <Dialog />}</div>;
}`;
    const issues = rule.check("modal.tsx", content);
    expect(issues.length).toBe(0);
  });

  it("does not flag `{hasItems && <List/>}` — boolean prefix 'has'", () => {
    const content = `
function Page({ hasItems }: Props) {
  return <div>{hasItems && <List />}</div>;
}`;
    const issues = rule.check("page.tsx", content);
    expect(issues.length).toBe(0);
  });

  it("does not flag `{shouldShow && <Panel/>}` — boolean prefix 'should'", () => {
    const content = `
function Layout({ shouldShow }: Props) {
  return <div>{shouldShow && <Panel />}</div>;
}`;
    const issues = rule.check("layout.tsx", content);
    expect(issues.length).toBe(0);
  });

  it("does not flag `{canEdit && <Editor/>}` — boolean prefix 'can'", () => {
    const content = `
function Page({ canEdit }: Props) {
  return <div>{canEdit && <Editor />}</div>;
}`;
    const issues = rule.check("page.tsx", content);
    expect(issues.length).toBe(0);
  });

  it("does not flag `{isError && <ErrorMsg/>}` — from ConnectedFormInput pattern", () => {
    const content = `
function ConnectedFormInputText({ isError, errorMessage }: Props) {
  return (
    <div>
      {isError && <span className="error">{errorMessage}</span>}
    </div>
  );
}`;
    const issues = rule.check("ConnectedFormInputText.tsx", content);
    expect(issues.length).toBe(0);
  });

  it("does not flag `{props.helpertext && !isError && <Helper/>}` — string|undefined && boolean", () => {
    const content = `
function ConnectedFormInputText(props: Props) {
  return (
    <div>
      {props.helpertext && !isError && <span>{props.helpertext}</span>}
    </div>
  );
}`;
    const issues = rule.check("ConnectedFormInputText.tsx", content);
    expect(issues.length).toBe(0);
  });

  // ── Should NOT flag (negation / comparison — always boolean) ──────

  it("does not flag `{!loading && <Content/>}` — negation is boolean", () => {
    const content = `
function Page({ loading }: Props) {
  return <div>{!loading && <Content />}</div>;
}`;
    const issues = rule.check("page.tsx", content);
    expect(issues.length).toBe(0);
  });

  it("does not flag `{x === 'admin' && <Admin/>}` — comparison is boolean", () => {
    const content = `
function Nav({ role }: Props) {
  return <nav>{role === 'admin' && <AdminPanel />}</nav>;
}`;
    const issues = rule.check("nav.tsx", content);
    expect(issues.length).toBe(0);
  });

  it("does not flag `{items.length > 0 && <List/>}` — comparison is boolean", () => {
    const content = `
function Page({ items }: Props) {
  return <div>{items.length > 0 && <List items={items} />}</div>;
}`;
    const issues = rule.check("page.tsx", content);
    expect(issues.length).toBe(0);
  });

  // ── Should NOT flag (non-numeric unknown) ─────────────────────────

  it("does not flag `{showPanel && <Panel/>}` — 'show' prefix", () => {
    const content = `
function Layout({ showPanel }: Props) {
  return <div>{showPanel && <Panel />}</div>;
}`;
    const issues = rule.check("layout.tsx", content);
    expect(issues.length).toBe(0);
  });

  // ── General non-flag cases ────────────────────────────────────────

  it("does not flag ternary usage — correct pattern", () => {
    const content = `
function List({ count }: { count: number }) {
  return <div>{count > 0 ? <Item count={count} /> : null}</div>;
}`;
    const issues = rule.check("list.tsx", content);
    expect(issues.length).toBe(0);
  });

  it("does not flag `{isLoading ? <Spinner/> : <Content/>}`", () => {
    const content = `
function Page({ isLoading }: Props) {
  return isLoading ? <Spinner /> : <Content />;
}`;
    const issues = rule.check("page.tsx", content);
    expect(issues.length).toBe(0);
  });

  it("does not flag logical && in non-JSX TypeScript files", () => {
    const content = `
export function isValid(a: boolean, b: boolean) {
  return a && b;
}`;
    const issues = rule.check("utils.ts", content);
    expect(issues.length).toBe(0);
  });

  it("does not flag comment lines containing &&", () => {
    const content = `
function Foo() {
  // {isLoading && <Spinner />}  <- old pattern, replaced
  return <div>{isLoading ? <Spinner /> : null}</div>;
}`;
    const issues = rule.check("foo.tsx", content);
    expect(issues.length).toBe(0);
  });

  it("does not flag && in object literal expressions `{key: a && b}`", () => {
    const content = `
function Foo() {
  const style = { display: a && b ? "block" : "none" };
  return <div style={style} />;
}`;
    const issues = rule.check("foo.tsx", content);
    expect(issues.length).toBe(0);
  });

  it("skips .ts files entirely", () => {
    const content = `
const el = items.length && renderList(items);
`;
    const issues = rule.check("utils.ts", content);
    expect(issues.length).toBe(0);
  });
});
