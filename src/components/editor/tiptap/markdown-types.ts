import type { Node as ProseMirrorNode } from "@tiptap/pm/model";

/**
 * The slice of `prosemirror-markdown`'s serializer state our custom nodes use.
 *
 * `prosemirror-markdown` is only a transitive dependency (via tiptap-markdown),
 * so it is described structurally here rather than imported — that keeps the
 * import graph honest about what this app depends on directly.
 */
export interface MarkdownNodeState {
  write(content: string): void;
  text(text: string, escape?: boolean): void;
  ensureNewLine(): void;
  closeBlock(node: ProseMirrorNode): void;
}

declare module "@tiptap/core" {
  interface Storage {
    /** Installed by the `tiptap-markdown` extension in its `onBeforeCreate`. */
    markdown: {
      getMarkdown(): string;
    };
  }
}

/** Extra serializer surface the table override needs. */
export interface MarkdownTableState extends MarkdownNodeState {
  /** The Markdown accumulated so far; assignable, which is how the table
   *  serializer post-processes the text a cell just produced. */
  out: string;
  renderInline(parent: ProseMirrorNode): void;
}
