"use client";

import { CodeBlockLowlight } from "@tiptap/extension-code-block-lowlight";
import {
  NodeViewContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type ReactNodeViewProps,
} from "@tiptap/react";
import { createLowlight } from "lowlight";
import bash from "highlight.js/lib/languages/bash";
import css from "highlight.js/lib/languages/css";
import go from "highlight.js/lib/languages/go";
import java from "highlight.js/lib/languages/java";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import markdown from "highlight.js/lib/languages/markdown";
import python from "highlight.js/lib/languages/python";
import rust from "highlight.js/lib/languages/rust";
import sql from "highlight.js/lib/languages/sql";
import typescript from "highlight.js/lib/languages/typescript";
import xml from "highlight.js/lib/languages/xml";
import yaml from "highlight.js/lib/languages/yaml";

/**
 * Registered one by one rather than via lowlight's `common` bundle: `common`
 * pulls in ~35 grammars, and the note page already carries the whole editor.
 * A language parsed out of Markdown that isn't here renders unhighlighted
 * rather than failing.
 */
const lowlight = createLowlight({
  bash,
  css,
  go,
  java,
  javascript,
  json,
  markdown,
  python,
  rust,
  sql,
  typescript,
  xml,
  yaml,
});

// Aliases the picker offers under friendlier names.
lowlight.registerAlias({
  bash: ["shell", "sh", "zsh"],
  javascript: ["js", "jsx"],
  typescript: ["ts", "tsx"],
  xml: ["html"],
  yaml: ["yml"],
});

/** Offered in the picker; anything else parsed from Markdown is kept as-is on
 *  the node, it just isn't in the dropdown. */
const LANGUAGES = [
  "typescript",
  "tsx",
  "javascript",
  "jsx",
  "json",
  "python",
  "sql",
  "bash",
  "java",
  "rust",
  "go",
  "css",
  "html",
  "yaml",
  "markdown",
] as const;

function CodeBlockView({ node, updateAttributes, editor }: ReactNodeViewProps) {
  const language = (node.attrs.language as string | null) ?? "";
  const known = !language || LANGUAGES.includes(language as (typeof LANGUAGES)[number]);

  return (
    <NodeViewWrapper className="relative my-4 rounded-lg border border-border bg-elevated">
      <select
        // The select sits inside the node view but outside its editable
        // content, so it must be marked non-editable for ProseMirror.
        contentEditable={false}
        value={language}
        disabled={!editor.isEditable}
        aria-label="Code language"
        onChange={(event) =>
          updateAttributes({ language: event.target.value || null })
        }
        className="absolute right-2 top-2 z-10 rounded border border-border bg-surface px-1.5 py-0.5 text-[11px] text-muted focus:outline-none focus:ring-1 focus:ring-accent"
      >
        <option value="">plain text</option>
        {!known ? <option value={language}>{language}</option> : null}
        {LANGUAGES.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>

      <pre className="overflow-x-auto px-4 py-3 pr-28 text-[13px] leading-relaxed">
        <NodeViewContent<"code"> as="code" className="font-mono" />
      </pre>
    </NodeViewWrapper>
  );
}

export const CodeBlock = CodeBlockLowlight.extend({
  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockView);
  },
}).configure({ lowlight, defaultLanguage: null });
