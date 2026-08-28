import type { Timestamp } from "firebase/firestore";

/** Firestore writes use serverTimestamp(); reads come back as Timestamp.
 *  A doc can be briefly null-timestamped in the local cache before the
 *  server value lands, so every timestamp field is nullable on read. */
export type Stamp = Timestamp | null;

export interface Project {
  id: string;
  name: string;
  description: string;
  colorHex: string;
  icon: string;
  isArchived: boolean;
  positionOrder: number;
  createdAt: Stamp;
  updatedAt: Stamp;
}

export interface Note {
  id: string;
  projectId: string;
  title: string;
  content: string;
  outgoingLinks: string[];
  tags: string[];
  isPinned: boolean;
  isPublic: boolean;
  shareSlug: string | null;
  createdAt: Stamp;
  updatedAt: Stamp;
}

export const TASK_STATUSES = [
  "BACKLOG",
  "TODO",
  "IN_PROGRESS",
  "REVIEW",
  "DONE",
] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  positionOrder: number;
  dueDate: Stamp;
  createdAt: Stamp;
  updatedAt: Stamp;
}

export const SNIPPET_LANGUAGES = [
  "typescript",
  "javascript",
  "python",
  "sql",
  "shell",
  "java",
  "rust",
] as const;
export type SnippetLanguage = (typeof SNIPPET_LANGUAGES)[number];

export interface Snippet {
  id: string;
  projectId: string | null;
  title: string;
  code: string;
  language: SnippetLanguage;
  isPublic: boolean;
  shareSlug: string | null;
  createdAt: Stamp;
  updatedAt: Stamp;
}

export type TemplateCategory = "meeting" | "bug" | "scope" | "docs" | "custom";

export interface Template {
  id: string;
  name: string;
  category: TemplateCategory;
  content: string;
  createdAt: Stamp;
}

export interface QuickLink {
  id: string;
  title: string;
  url: string;
  favicon: string;
  positionOrder: number;
}

export type ActivityEntityType = "NOTE" | "TASK" | "SNIPPET" | "PROJECT";
export type ActivityAction =
  | "CREATED"
  | "UPDATED"
  | "DELETED"
  | "STATUS_CHANGED";

export interface Activity {
  id: string;
  entityType: ActivityEntityType;
  action: ActivityAction;
  metadata: {
    entityTitle: string;
    prevStatus?: string;
    newStatus?: string;
  };
  timestamp: Stamp;
}

/** Shape of workspace-graph.json emitted by the ZIP exporter. */
export interface WorkspaceGraph {
  exportedAt: string;
  version: 1;
  projects: Project[];
  notes: Array<
    Pick<Note, "id" | "title" | "projectId" | "outgoingLinks" | "tags">
  >;
  edges: Array<{ from: string; to: string }>;
}

export type SaveState = "idle" | "saving" | "saved" | "error";
