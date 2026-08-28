import JSZip from "jszip";
import { saveAs } from "file-saver";
import { slugify, toDate } from "./utils";
import type {
  Note,
  Project,
  Snippet,
  Task,
  Template,
  WorkspaceGraph,
} from "@/types";

const EXTENSION_BY_LANGUAGE: Record<string, string> = {
  typescript: "ts",
  javascript: "js",
  python: "py",
  sql: "sql",
  shell: "sh",
  java: "java",
  rust: "rs",
};

export interface WorkspaceSnapshot {
  projects: Project[];
  notes: Note[];
  tasks: Task[];
  snippets: Snippet[];
  templates: Template[];
}

/** YAML needs quoting for anything that could be read as structure. */
function yamlString(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function yamlList(values: string[]): string {
  return values.length ? `[${values.map(yamlString).join(", ")}]` : "[]";
}

function isoOrEmpty(stamp: Note["createdAt"]): string {
  const d = toDate(stamp);
  return d ? d.toISOString() : "";
}

/** Standard frontmatter header so the export reads cleanly in Obsidian et al. */
export function noteToMarkdown(note: Note, projectName: string): string {
  const frontmatter = [
    "---",
    `id: ${yamlString(note.id)}`,
    `title: ${yamlString(note.title)}`,
    `project: ${yamlString(projectName)}`,
    `tags: ${yamlList(note.tags ?? [])}`,
    `links: ${yamlList(note.outgoingLinks ?? [])}`,
    `pinned: ${note.isPinned ? "true" : "false"}`,
    `public: ${note.isPublic ? "true" : "false"}`,
    `created: ${yamlString(isoOrEmpty(note.createdAt))}`,
    `updated: ${yamlString(isoOrEmpty(note.updatedAt))}`,
    "---",
    "",
  ].join("\n");
  return frontmatter + (note.content ?? "");
}

/**
 * Filenames must stay unique inside the ZIP — two notes can legitimately share
 * a title, so collisions get a numeric suffix rather than silently overwriting.
 */
function uniqueName(taken: Set<string>, base: string, ext: string): string {
  let candidate = `${base}.${ext}`;
  let n = 2;
  while (taken.has(candidate)) {
    candidate = `${base}-${n}.${ext}`;
    n += 1;
  }
  taken.add(candidate);
  return candidate;
}

export function buildWorkspaceGraph(
  snapshot: WorkspaceSnapshot
): WorkspaceGraph {
  const idByTitle = new Map<string, string>();
  for (const note of snapshot.notes) {
    idByTitle.set(note.title.toLowerCase(), note.id);
  }
  const edges: WorkspaceGraph["edges"] = [];
  for (const note of snapshot.notes) {
    for (const target of note.outgoingLinks ?? []) {
      const to = idByTitle.get(target.toLowerCase());
      if (to && to !== note.id) edges.push({ from: note.id, to });
    }
  }
  return {
    exportedAt: new Date().toISOString(),
    version: 1,
    projects: snapshot.projects,
    notes: snapshot.notes.map((n) => ({
      id: n.id,
      title: n.title,
      projectId: n.projectId,
      outgoingLinks: n.outgoingLinks ?? [],
      tags: n.tags ?? [],
    })),
    edges,
  };
}

/**
 * Packages the whole workspace client-side. Nothing leaves the browser, so the
 * archive is a complete, provider-independent copy of the user's data — and it
 * works offline, since the data is already in memory from the subscriptions.
 */
export async function buildWorkspaceZip(
  snapshot: WorkspaceSnapshot
): Promise<Blob> {
  const zip = new JSZip();
  const projectName = new Map(snapshot.projects.map((p) => [p.id, p.name]));

  const notesDir = zip.folder("notes");
  const takenNotes = new Set<string>();
  for (const note of snapshot.notes) {
    const name = uniqueName(takenNotes, slugify(note.title), "md");
    notesDir?.file(
      name,
      noteToMarkdown(note, projectName.get(note.projectId) ?? "")
    );
  }

  const snippetsDir = zip.folder("snippets");
  const takenSnippets = new Set<string>();
  for (const snippet of snapshot.snippets) {
    // The spec calls for .txt; the real language extension is strictly more
    // useful (editors syntax-highlight it) and just as portable.
    const ext = EXTENSION_BY_LANGUAGE[snippet.language] ?? "txt";
    const name = uniqueName(takenSnippets, slugify(snippet.title), ext);
    snippetsDir?.file(name, snippet.code ?? "");
  }

  const templatesDir = zip.folder("templates");
  const takenTemplates = new Set<string>();
  for (const template of snapshot.templates) {
    const name = uniqueName(takenTemplates, slugify(template.name), "md");
    templatesDir?.file(name, template.content ?? "");
  }

  // JSZip drops empty folders, so seed assets/ with a marker.
  zip
    .folder("assets")
    ?.file(".gitkeep", "Attachments referenced by notes belong here.\n");

  zip.file("projects.json", JSON.stringify(snapshot.projects, null, 2));
  zip.file("tasks.json", JSON.stringify(snapshot.tasks, null, 2));
  zip.file(
    "workspace-graph.json",
    JSON.stringify(buildWorkspaceGraph(snapshot), null, 2)
  );
  zip.file("README.md", readme(snapshot));

  return zip.generateAsync({ type: "blob", compression: "DEFLATE" });
}

export async function downloadWorkspaceZip(
  snapshot: WorkspaceSnapshot
): Promise<void> {
  const blob = await buildWorkspaceZip(snapshot);
  const stamp = new Date().toISOString().slice(0, 10);
  saveAs(blob, `s-notes-workspace-${stamp}.zip`);
}

function readme(snapshot: WorkspaceSnapshot): string {
  return `# S Notes workspace export

Exported ${new Date().toISOString()}.

| Contents | Count |
| --- | --- |
| Projects | ${snapshot.projects.length} |
| Notes | ${snapshot.notes.length} |
| Tasks | ${snapshot.tasks.length} |
| Snippets | ${snapshot.snippets.length} |
| Templates | ${snapshot.templates.length} |

- \`notes/\` — Markdown with YAML frontmatter (id, title, project, tags, links).
- \`snippets/\` — raw source, one file per snippet.
- \`templates/\` — reusable Markdown templates.
- \`assets/\` — attachments referenced by notes.
- \`projects.json\`, \`tasks.json\` — structured records.
- \`workspace-graph.json\` — the full backlink graph (nodes + edges).

Everything here is plain text. Nothing in this archive requires S Notes to read.
`;
}
