/**
 * markdown-it rules for the two syntaxes this workspace uses that plain
 * CommonMark/GFM has no concept of: `[[wiki links]]` and `$math$`.
 *
 * tiptap-markdown parses by running markdown-it and feeding the resulting HTML
 * through the editor's `parseHTML` rules, so each rule here only has to emit a
 * tag the matching node recognises. Serialization back to Markdown lives with
 * the nodes themselves (see `wiki-link.tsx` and `math.tsx`).
 */

import type MarkdownIt from "markdown-it";
import type StateInline from "markdown-it/lib/rules_inline/state_inline";
import type StateBlock from "markdown-it/lib/rules_block/state_block";

const DOLLAR = 0x24; /* $ */
const OPEN_BRACKET = 0x5b; /* [ */

function attr(value: string): string {
  // Values land in an HTML attribute that the DOM parser reads back verbatim,
  // so every character that could close the attribute or the tag must go.
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/* -------------------------------------------------------------- wiki links */

/** `[[Target]]` and `[[Target|Alias]]`, mirroring `backlinks-parser`. */
function wikiLinkRule(state: StateInline, silent: boolean): boolean {
  const start = state.pos;
  if (state.src.charCodeAt(start) !== OPEN_BRACKET) return false;
  if (state.src.charCodeAt(start + 1) !== OPEN_BRACKET) return false;

  const close = state.src.indexOf("]]", start + 2);
  if (close === -1) return false;

  const body = state.src.slice(start + 2, close);
  // A newline or a nested bracket means this was never a wiki link.
  if (!body || /[\n\[\]]/.test(body)) return false;

  const [rawTarget, rawLabel] = body.split("|");
  const target = rawTarget.trim();
  if (!target) return false;

  if (!silent) {
    const token = state.push("wiki_link", "", 0);
    token.meta = { target, label: rawLabel?.trim() || null };
  }

  state.pos = close + 2;
  return true;
}

/* -------------------------------------------------------------------- math */

/**
 * `$...$`, rejecting the cases that are almost certainly currency: a digit
 * immediately after the closing `$`, and whitespace hugging either delimiter.
 */
function mathInlineRule(state: StateInline, silent: boolean): boolean {
  const start = state.pos;
  if (state.src.charCodeAt(start) !== DOLLAR) return false;
  // `$$` opens block math, which the block rule owns.
  if (state.src.charCodeAt(start + 1) === DOLLAR) return false;

  let pos = start + 1;
  let close = -1;
  while (pos < state.posMax) {
    const code = state.src.charCodeAt(pos);
    if (code === 0x5c /* \ */) {
      pos += 2;
      continue;
    }
    if (code === 0x0a /* \n */) return false;
    if (code === DOLLAR) {
      close = pos;
      break;
    }
    pos += 1;
  }
  if (close === -1) return false;

  const latex = state.src.slice(start + 1, close);
  if (!latex.trim()) return false;
  if (/^\s/.test(latex) || /\s$/.test(latex)) return false;

  const after = state.src.charCodeAt(close + 1);
  if (after >= 0x30 && after <= 0x39) return false; // "$5 or $6" is money

  if (!silent) {
    const token = state.push("math_inline", "", 0);
    token.content = latex;
  }

  state.pos = close + 1;
  return true;
}

/** A `$$` fence, either on its own lines or collapsed onto one. */
function mathBlockRule(
  state: StateBlock,
  startLine: number,
  endLine: number,
  silent: boolean
): boolean {
  const from = state.bMarks[startLine] + state.tShift[startLine];
  const to = state.eMarks[startLine];
  const first = state.src.slice(from, to).trim();
  if (!first.startsWith("$$")) return false;

  // `$$x^2$$` on a single line.
  if (first.length > 4 && first.endsWith("$$")) {
    if (!silent) {
      const token = state.push("math_block", "", 0);
      token.content = first.slice(2, -2).trim();
      token.map = [startLine, startLine + 1];
    }
    state.line = startLine + 1;
    return true;
  }
  if (first !== "$$") return false;
  if (silent) return true;

  let line = startLine + 1;
  const lines: string[] = [];
  while (line < endLine) {
    const text = state.src.slice(
      state.bMarks[line] + state.tShift[line],
      state.eMarks[line]
    );
    if (text.trim() === "$$") break;
    lines.push(text);
    line += 1;
  }

  const token = state.push("math_block", "", 0);
  token.content = lines.join("\n").trim();
  token.map = [startLine, line + 1];
  // Past the closing fence, or to the end of input when it was never closed.
  state.line = Math.min(line + 1, endLine);
  return true;
}

/* ---------------------------------------------------------------- plugins */

// tiptap-markdown re-runs every extension's `setup` against the same
// markdown-it instance on each parse, so installation has to be idempotent or
// the rules stack up one copy per `setContent`.
const installed = new WeakMap<MarkdownIt, Set<string>>();

function once(md: MarkdownIt, key: string): boolean {
  let keys = installed.get(md);
  if (!keys) {
    keys = new Set();
    installed.set(md, keys);
  }
  if (keys.has(key)) return false;
  keys.add(key);
  return true;
}

export function wikiLinkMarkdownIt(md: MarkdownIt): void {
  if (!once(md, "wiki_link")) return;
  // Before `link`, or markdown-it consumes the first `[` as a link opener.
  md.inline.ruler.before("link", "wiki_link", wikiLinkRule);
  md.renderer.rules.wiki_link = (tokens, index) => {
    const { target, label } = tokens[index].meta as {
      target: string;
      label: string | null;
    };
    const labelAttr = label ? ` data-label="${attr(label)}"` : "";
    return `<span data-wiki-link data-target="${attr(target)}"${labelAttr}>${
      attr(label ?? target)
    }</span>`;
  };
}

export function mathMarkdownIt(md: MarkdownIt): void {
  if (!once(md, "math")) return;
  // Before `escape`, so `\` inside formulas is never treated as an escape.
  md.inline.ruler.before("escape", "math_inline", mathInlineRule);
  md.block.ruler.before("fence", "math_block", mathBlockRule, {
    alt: ["paragraph", "blockquote", "list"],
  });

  md.renderer.rules.math_inline = (tokens, index) =>
    `<span data-math-inline data-latex="${attr(tokens[index].content)}"></span>`;
  md.renderer.rules.math_block = (tokens, index) =>
    `<div data-math-block data-latex="${attr(tokens[index].content)}"></div>`;
}
