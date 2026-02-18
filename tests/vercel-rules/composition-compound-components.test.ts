import { describe, it, expect } from "bun:test";
import rule from "../../src/vercel-rules/composition-compound-components";

describe("composition-compound-components", () => {
  // ── Should flag ───────────────────────────────────────────────────

  it("flags 2+ render* typed props in an interface", () => {
    const content = `
interface CardProps {
  title: string;
  renderHeader?: () => ReactNode;
  renderFooter?: () => ReactNode;
}

export function Card({ title, renderHeader, renderFooter }: CardProps) {
  return (
    <div>
      {renderHeader?.()}
      <h2>{title}</h2>
      {renderFooter?.()}
    </div>
  );
}`;
    const issues = rule.check("Card.tsx", content);
    expect(issues.length).toBe(1);
    expect(issues[0]!.rule).toBe("composition-compound-components");
    expect(issues[0]!.message).toContain("2 render*");
  });

  it("flags 3 render* props", () => {
    const content = `
interface LayoutProps {
  renderHeader: () => JSX.Element;
  renderSidebar: () => ReactNode;
  renderFooter: () => ReactNode;
}
export function Layout(props: LayoutProps) {}`;
    const issues = rule.check("Layout.tsx", content);
    expect(issues.length).toBe(1);
    expect(issues[0]!.message).toContain("3 render*");
  });

  it("flags multiple render* props destructured in function signature", () => {
    const content = `
export function DataTable({ renderHeader, renderRow, renderFooter, data }: Props) {
  return <table>{data.map(row => renderRow(row))}</table>;
}`;
    const issues = rule.check("DataTable.tsx", content);
    expect(issues.length).toBe(1);
  });

  it("includes help text about compound components with createContext", () => {
    const content = `
interface PanelProps {
  renderTitle?: () => ReactNode;
  renderActions?: () => ReactNode;
}
export function Panel(props: PanelProps) {}`;
    const issues = rule.check("Panel.tsx", content);
    expect(issues.length).toBe(1);
    // Help text should suggest compound component pattern
    expect(issues[0]!.help).toMatch(/compound|compose|consumers/i);
  });

  // ── Should NOT flag ───────────────────────────────────────────────

  it("does not flag components that already use createContext", () => {
    const content = `
const PanelContext = createContext<PanelContextValue | null>(null);

export function Panel({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <PanelContext.Provider value={{ open, setOpen }}>
      {children}
    </PanelContext.Provider>
  );
}`;
    const issues = rule.check("Panel.tsx", content);
    expect(issues.length).toBe(0);
  });

  it("does not flag a single render* prop", () => {
    const content = `
interface ItemProps {
  renderIcon?: () => ReactNode;
  label: string;
}
export function Item({ renderIcon, label }: ItemProps) {}`;
    const issues = rule.check("Item.tsx", content);
    expect(issues.length).toBe(0);
  });

  it("does not flag .ts files", () => {
    const content = `
interface RendererProps {
  renderHeader: () => string;
  renderFooter: () => string;
}`;
    const issues = rule.check("renderer.ts", content);
    expect(issues.length).toBe(0);
  });

  it("does not flag on*Handler props (event handlers, not render props)", () => {
    const content = `
interface ButtonProps {
  onSubmit: () => void;
  onCancel: () => void;
  onReset: () => void;
  label: string;
}
export function Form({ onSubmit, onCancel, onReset, label }: ButtonProps) {}`;
    const issues = rule.check("Form.tsx", content);
    expect(issues.length).toBe(0);
  });
});
