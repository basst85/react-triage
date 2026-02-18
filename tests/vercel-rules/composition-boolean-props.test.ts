import { describe, it, expect } from "bun:test";
import rule from "../../src/vercel-rules/composition-boolean-props";

describe("composition-boolean-props", () => {
  // ── Should flag ───────────────────────────────────────────────────

  it("flags interface with 3+ boolean props", () => {
    const content = `
interface ButtonProps {
  isLoading: boolean;
  isDisabled: boolean;
  hasError: boolean;
  label: string;
}

export function Button(props: ButtonProps) {
  return <button>{props.label}</button>;
}`;
    const issues = rule.check("Button.tsx", content);
    expect(issues.length).toBe(1);
    expect(issues[0]!.rule).toBe("composition-boolean-props");
    expect(issues[0]!.message).toContain("3 boolean props");
  });

  it("flags type alias with 3+ boolean props", () => {
    const content = `
type CardProps = {
  isExpanded: boolean;
  isSelected: boolean;
  showActions: boolean;
  showFooter: boolean;
  title: string;
};`;
    const issues = rule.check("Card.tsx", content);
    expect(issues.length).toBe(1);
    expect(issues[0]!.message).toContain("4 boolean props");
  });

  it("flags hasX, showX, enableX, withX patterns", () => {
    const content = `
interface ModalProps {
  hasHeader: boolean;
  showOverlay: boolean;
  enableAnimation: boolean;
  withCloseButton: boolean;
  title: string;
}`;
    const issues = rule.check("Modal.tsx", content);
    expect(issues.length).toBe(1);
    expect(issues[0]!.message).toContain("4 boolean props");
  });

  it("includes the prop names in the message", () => {
    const content = `
interface ComposerProps {
  isEditing: boolean;
  isReply: boolean;
  isThread: boolean;
  text: string;
}`;
    const issues = rule.check("Composer.tsx", content);
    expect(issues.length).toBe(1);
    expect(issues[0]!.message).toContain("isEditing");
    expect(issues[0]!.message).toContain("isReply");
    expect(issues[0]!.message).toContain("isThread");
  });

  it("includes help text about variant components", () => {
    const content = `
interface ListProps {
  isCompact: boolean;
  isVirtual: boolean;
  hasCheckboxes: boolean;
}`;
    const issues = rule.check("List.tsx", content);
    expect(issues.length).toBeGreaterThan(0);
    // Help text should suggest separate components instead of boolean switches
    expect(issues[0]!.help).toMatch(/separate|components|boolean switches/i);
  });

  // ── Should NOT flag ───────────────────────────────────────────────

  it("does not flag interface with fewer than 3 boolean props", () => {
    const content = `
interface ButtonProps {
  isLoading: boolean;
  isDisabled: boolean;
  label: string;
}`;
    const issues = rule.check("Button.tsx", content);
    expect(issues.length).toBe(0);
  });

  it("does not flag interfaces that are not Props types", () => {
    const content = `
interface Config {
  isProduction: boolean;
  isDebug: boolean;
  isVerbose: boolean;
}`;
    const issues = rule.check("config.tsx", content);
    // Config does not end with Props
    expect(issues.length).toBe(0);
  });

  it("does not flag .ts files without JSX", () => {
    const content = `
interface FeatureFlags {
  isEnabled: boolean;
  hasNewUI: boolean;
  showBeta: boolean;
}`;
    const issues = rule.check("flags.ts", content);
    expect(issues.length).toBe(0);
  });

  it("does not flag optional boolean props by miscount", () => {
    const content = `
interface BadgeProps {
  isNew?: boolean;
  label: string;
}`;
    const issues = rule.check("Badge.tsx", content);
    expect(issues.length).toBe(0);
  });
});
