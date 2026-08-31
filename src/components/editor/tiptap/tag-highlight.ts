import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { EditorState } from "@tiptap/pm/state";

/** Mirrors `extractTags` in `backlinks-parser` so the editor highlights
 *  exactly the tags the backlink index will end up storing. */
const TAG = /(^|\s)(#[\w-]{2,40})/g;

/**
 * `#tag` stays plain text rather than becoming a node: the Markdown serializer
 * only escapes `#` when it would read as a heading, so tags survive the round
 * trip untouched and just need styling.
 */
function tagDecorations(state: EditorState): DecorationSet {
  const decorations: Decoration[] = [];

  state.doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return;
    // Tags inside code are literal text, not references.
    if (node.marks.some((mark) => mark.type.name === "code")) return;

    TAG.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = TAG.exec(node.text)) !== null) {
      const from = pos + match.index + match[1].length;
      decorations.push(
        Decoration.inline(from, from + match[2].length, { class: "note-tag" })
      );
    }
  });

  return DecorationSet.create(state.doc, decorations);
}

export const TagHighlight = Extension.create({
  name: "tagHighlight",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("tagHighlight"),
        state: {
          init: (_config, state) => tagDecorations(state),
          apply: (transaction, previous, _oldState, newState) =>
            transaction.docChanged ? tagDecorations(newState) : previous,
        },
        props: {
          decorations(state) {
            return this.getState(state);
          },
        },
      }),
    ];
  },
});
