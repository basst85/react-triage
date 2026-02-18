import { describe, it, expect } from "bun:test";
import rule from "../../src/vercel-rules/bundle-dynamic-imports";

describe("bundle-dynamic-imports", () => {
  // ── Should flag ───────────────────────────────────────────────────

  it("flags static import of monaco-editor", () => {
    const content = `import MonacoEditor from 'monaco-editor';

export default function Editor() {
  return <MonacoEditor />;
}`;
    const issues = rule.check("editor.tsx", content);
    expect(issues.length).toBe(1);
    expect(issues[0]!.rule).toBe("bundle-dynamic-imports");
    expect(issues[0]!.message).toContain("monaco-editor");
  });

  it("flags @monaco-editor/react static import", () => {
    const content = `import Editor from '@monaco-editor/react';`;
    const issues = rule.check("editor.tsx", content);
    expect(issues.length).toBe(1);
    expect(issues[0]!.message).toContain("@monaco-editor/react");
  });

  it("flags static import of framer-motion", () => {
    const content = `import { motion, AnimatePresence } from 'framer-motion';`;
    const issues = rule.check("animation.tsx", content);
    expect(issues.length).toBe(1);
    expect(issues[0]!.message).toContain("framer-motion");
  });

  it("flags static import of react-pdf", () => {
    const content = `import { PDFViewer } from 'react-pdf';`;
    const issues = rule.check("viewer.tsx", content);
    expect(issues.length).toBe(1);
  });

  it("flags static import of recharts", () => {
    const content = `import { BarChart, LineChart } from 'recharts';`;
    const issues = rule.check("charts.tsx", content);
    expect(issues.length).toBe(1);
    expect(issues[0]!.message).toContain("recharts");
  });

  it("includes help text with next/dynamic suggestion", () => {
    const content = `import ReactQuill from 'react-quill';`;
    const issues = rule.check("editor.tsx", content);
    expect(issues.length).toBe(1);
    expect(issues[0]!.help).toMatch(/dynamic|import/);
  });

  it("reports the correct line number", () => {
    const content = `// Editor component
// uses heavy lib
import MonacoEditor from 'monaco-editor';
`;
    const issues = rule.check("editor.tsx", content);
    expect(issues.length).toBe(1);
    expect(issues[0]!.line).toBe(3);
  });

  // ── Should NOT flag ───────────────────────────────────────────────

  it("does not flag lightweight imports like react", () => {
    const content = `import React, { useState } from 'react';`;
    const issues = rule.check("component.tsx", content);
    expect(issues.length).toBe(0);
  });

  it("does not flag next/dynamic itself", () => {
    const content = `import dynamic from 'next/dynamic';
const MonacoEditor = dynamic(() => import('monaco-editor'), { ssr: false });`;
    const issues = rule.check("editor.tsx", content);
    expect(issues.length).toBe(0);
  });

  it("does not flag React.lazy wrapping a heavy lib", () => {
    const content = `const MonacoEditor = React.lazy(() => import('monaco-editor'));`;
    const issues = rule.check("editor.tsx", content);
    expect(issues.length).toBe(0);
  });

  it("does not flag common UI libraries like @radix-ui", () => {
    const content = `import * as Dialog from '@radix-ui/react-dialog';`;
    const issues = rule.check("dialog.tsx", content);
    expect(issues.length).toBe(0);
  });
});
