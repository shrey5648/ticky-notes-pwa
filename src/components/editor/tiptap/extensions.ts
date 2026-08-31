import StarterKit from "@tiptap/starter-kit";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { TableKit } from "@tiptap/extension-table";
import { Image } from "@tiptap/extension-image";
import { Placeholder } from "@tiptap/extensions";
import { Markdown } from "tiptap-markdown";
import { Extension, type Extensions } from "@tiptap/core";
import { CodeBlock } from "./code-block";
import { MathBlock, MathInline } from "./math";
import { TagHighlight } from "./tag-highlight";
import { MarkdownTable } from "./table";
import { WikiLink } from "./wiki-link";

/**
 * `tiptap-markdown` marks only bullet and ordered lists as "tight", so task
 * lists were serialized loose — a blank line between every checkbox. The
 * serializer reads this attribute straight off the node.
 */
const TightTaskList = Extension.create({
  name: "tightTaskList",
  addGlobalAttributes() {
    return [
      {
        types: ["taskList"],
        attributes: {
          tight: {
            default: true,
            parseHTML: (element) =>
              element.getAttribute("data-tight") === "true" ||
              !element.querySelector("p"),
            renderHTML: (attributes) => ({
              "data-tight": attributes.tight ? "true" : null,
            }),
          },
        },
      },
    ];
  },
});

/**
 * The editor's schema is deliberately limited to what Markdown can express.
 *
 * Notes are stored as Markdown — the ZIP export writes `.md` files, the public
 * share page and the admin viewer render with react-markdown, and the backlink
 * index is re-derived from the raw text on every save. Anything the serializer
 * could only round-trip as raw HTML (underline, highlight, text colour, cell
 * alignment) would survive in the editor but come out as literal tags
 * everywhere else, so those marks are left out rather than half-supported.
 */
export function buildExtensions(placeholder: string): Extensions {
  return [
    StarterKit.configure({
      // Replaced below by the lowlight version with a language picker.
      codeBlock: false,
      // No Markdown equivalent; see the note above.
      underline: false,
      heading: { levels: [1, 2, 3, 4, 5, 6] },
      link: {
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
      },
    }),

    CodeBlock,
    TaskList,
    TaskItem.configure({ nested: true }),
    TightTaskList,
    // `table: false` — the bundled node is replaced by MarkdownTable below,
    // which fixes cells that hold only a link pill, formula or image.
    TableKit.configure({ table: false }),
    MarkdownTable.configure({ resizable: true }),
    Image.configure({ inline: false, allowBase64: false }),

    WikiLink,
    MathInline,
    MathBlock,
    TagHighlight,

    Placeholder.configure({ placeholder, showOnlyWhenEditable: true }),

    Markdown.configure({
      html: false,
      tightLists: true,
      bulletListMarker: "-",
      // Bare URLs already in a note are left as written; only links the user
      // actually creates become Markdown links.
      linkify: false,
      breaks: false,
      transformPastedText: true,
      transformCopiedText: true,
    }),
  ];
}
