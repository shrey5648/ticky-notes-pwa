import { Table } from "@tiptap/extension-table";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { MarkdownTableState } from "./markdown-types";

/**
 * A GFM table serializer that replaces the one shipped by `tiptap-markdown`.
 *
 * The upstream version decides whether to emit a cell with
 * `cell.textContent.trim()`, which is empty for a cell holding only an atom —
 * a wiki link, a formula, an image — so those cells were silently dropped on
 * save. Here emptiness is judged by content size instead, and cell text has
 * pipes escaped and newlines flattened so nothing can break out of the row.
 */
export const MarkdownTable = Table.extend({
  addStorage() {
    return {
      ...this.parent?.(),
      markdown: {
        serialize(state: MarkdownTableState, node: ProseMirrorNode) {
          node.forEach((row, _rowOffset, rowIndex) => {
            state.write("| ");
            row.forEach((cell, _cellOffset, cellIndex) => {
              if (cellIndex) state.write(" | ");
              serializeCell(state, cell);
            });
            state.write(" |");
            state.ensureNewLine();

            // GFM needs the delimiter row immediately after the first row,
            // whether or not that row is made of header cells.
            if (rowIndex === 0) {
              const delimiters = Array.from({ length: row.childCount })
                .map(() => "---")
                .join(" | ");
              state.write(`| ${delimiters} |`);
              state.ensureNewLine();
            }
          });
          state.closeBlock(node);
        },
        parse: {
          // Tables come back through markdown-it's GFM table rule.
        },
      },
    };
  },
});

function serializeCell(state: MarkdownTableState, cell: ProseMirrorNode): void {
  if (cell.content.size === 0) return;

  const start = state.out.length;

  cell.forEach((block, _offset, index) => {
    if (index > 0) state.write(" ");
    if (block.isTextblock) {
      state.renderInline(block);
    } else {
      // A list or code block inside a cell has no Markdown table form; keep
      // the words rather than dropping the cell.
      state.write(block.textContent);
    }
  });

  const rendered = state.out.slice(start);
  state.out =
    state.out.slice(0, start) +
    rendered.replace(/\|/g, "\\|").replace(/\s*\n\s*/g, " ");
}
