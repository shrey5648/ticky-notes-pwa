"use client";

import { useEditorState, type Editor } from "@tiptap/react";
import {
  Bold,
  Braces,
  Code2,
  Heading1,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Italic,
  Link2,
  Link2Off,
  List,
  ListChecks,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  Sigma,
  Strikethrough,
  Table as TableIcon,
  Trash2,
  Undo2,
  Columns3,
  Rows3,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/ui";

interface Props {
  editor: Editor;
}

export function EditorToolbar({ editor }: Props) {
  // A single subscription drives every button: reading `editor.isActive(...)`
  // during render would not re-run when the selection moves.
  const state = useEditorState({
    editor,
    selector: ({ editor: instance }) => ({
      bold: instance.isActive("bold"),
      italic: instance.isActive("italic"),
      strike: instance.isActive("strike"),
      code: instance.isActive("code"),
      h1: instance.isActive("heading", { level: 1 }),
      h2: instance.isActive("heading", { level: 2 }),
      h3: instance.isActive("heading", { level: 3 }),
      bulletList: instance.isActive("bulletList"),
      orderedList: instance.isActive("orderedList"),
      taskList: instance.isActive("taskList"),
      blockquote: instance.isActive("blockquote"),
      codeBlock: instance.isActive("codeBlock"),
      link: instance.isActive("link"),
      inTable: instance.isActive("table"),
      canUndo: instance.can().undo(),
      canRedo: instance.can().redo(),
    }),
  });

  function setLink() {
    const current = (editor.getAttributes("link").href as string | undefined) ?? "";
    const href = window.prompt("Link URL", current);
    if (href === null) return;
    if (!href.trim()) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: href.trim() })
      .run();
  }

  function addImage() {
    const src = window.prompt("Image URL");
    if (!src?.trim()) return;
    const alt = window.prompt("Alt text (optional)") ?? "";
    editor.chain().focus().setImage({ src: src.trim(), alt }).run();
  }

  return (
    <div
      role="toolbar"
      aria-label="Formatting"
      className="flex flex-wrap items-center gap-0.5 border-b border-border bg-surface/60 px-3 py-1.5"
    >
      <ToolButton
        icon={Undo2}
        label="Undo"
        disabled={!state.canUndo}
        onClick={() => editor.chain().focus().undo().run()}
      />
      <ToolButton
        icon={Redo2}
        label="Redo"
        disabled={!state.canRedo}
        onClick={() => editor.chain().focus().redo().run()}
      />

      <Divider />

      <ToolButton
        icon={Heading1}
        label="Heading 1"
        active={state.h1}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
      />
      <ToolButton
        icon={Heading2}
        label="Heading 2"
        active={state.h2}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      />
      <ToolButton
        icon={Heading3}
        label="Heading 3"
        active={state.h3}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      />

      <Divider />

      <ToolButton
        icon={Bold}
        label="Bold (Cmd/Ctrl + B)"
        active={state.bold}
        onClick={() => editor.chain().focus().toggleBold().run()}
      />
      <ToolButton
        icon={Italic}
        label="Italic (Cmd/Ctrl + I)"
        active={state.italic}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      />
      <ToolButton
        icon={Strikethrough}
        label="Strikethrough"
        active={state.strike}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      />
      <ToolButton
        icon={Code2}
        label="Inline code"
        active={state.code}
        onClick={() => editor.chain().focus().toggleCode().run()}
      />
      <ToolButton
        icon={state.link ? Link2Off : Link2}
        label={state.link ? "Edit or remove link" : "Add link"}
        active={state.link}
        onClick={setLink}
      />

      <Divider />

      <ToolButton
        icon={List}
        label="Bullet list"
        active={state.bulletList}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      />
      <ToolButton
        icon={ListOrdered}
        label="Numbered list"
        active={state.orderedList}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      />
      <ToolButton
        icon={ListChecks}
        label="Task list"
        active={state.taskList}
        onClick={() => editor.chain().focus().toggleTaskList().run()}
      />
      <ToolButton
        icon={Quote}
        label="Quote"
        active={state.blockquote}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      />
      <ToolButton
        icon={Braces}
        label="Code block"
        active={state.codeBlock}
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
      />
      <ToolButton
        icon={Minus}
        label="Divider"
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
      />

      <Divider />

      <ToolButton
        icon={TableIcon}
        label={state.inTable ? "Delete table" : "Insert table"}
        active={state.inTable}
        onClick={() =>
          state.inTable
            ? editor.chain().focus().deleteTable().run()
            : editor
                .chain()
                .focus()
                .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                .run()
        }
      />
      {state.inTable ? (
        <>
          <ToolButton
            icon={Columns3}
            label="Add column"
            onClick={() => editor.chain().focus().addColumnAfter().run()}
          />
          <ToolButton
            icon={Rows3}
            label="Add row"
            onClick={() => editor.chain().focus().addRowAfter().run()}
          />
          <ToolButton
            icon={Trash2}
            label="Delete row"
            onClick={() => editor.chain().focus().deleteRow().run()}
          />
        </>
      ) : null}

      <Divider />

      <ToolButton
        icon={ImageIcon}
        label="Insert image"
        onClick={addImage}
      />
      <ToolButton
        icon={Sigma}
        label="Insert formula"
        onClick={() => editor.chain().focus().insertMathInline().run()}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ pieces */

function Divider() {
  return <span aria-hidden className="mx-1 h-5 w-px bg-border" />;
}

function ToolButton({
  icon: Icon,
  label,
  active = false,
  disabled = false,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <Tooltip label={label}>
      <button
        type="button"
        // mousedown would move focus out of the editor and collapse the
        // selection the command is about to act on.
        onMouseDown={(event) => event.preventDefault()}
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        aria-pressed={active}
        className={cn(
          "rounded-md p-1.5 transition",
          active
            ? "bg-accent/15 text-accent"
            : "text-muted hover:bg-elevated hover:text-fg",
          disabled && "cursor-not-allowed opacity-40 hover:bg-transparent hover:text-muted"
        )}
      >
        <Icon className="h-4 w-4" />
      </button>
    </Tooltip>
  );
}
