"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Code2, Copy, Globe, Lock, Plus, Search, Trash2 } from "lucide-react";
import { useSnippetActions, useSnippets } from "@/lib/firestore-hooks";
import { CodeRunnerSandbox } from "./CodeRunnerSandbox";
import { Button, EmptyState, Input, Spinner, Tooltip } from "@/components/ui";
import { cn, relativeTime } from "@/lib/utils";
import { SNIPPET_LANGUAGES, type Snippet, type SnippetLanguage } from "@/types";

interface Props {
  /** Scopes the vault to one project; omit for the cross-project vault. */
  projectId?: string;
}

export function SnippetVault({ projectId }: Props) {
  const { snippets, loading } = useSnippets(projectId);
  const actions = useSnippetActions();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return snippets;
    return snippets.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.language.includes(q) ||
        (s.code ?? "").toLowerCase().includes(q)
    );
  }, [snippets, search]);

  // Keep a valid selection as the list loads, filters, or the selection is
  // deleted out from under us.
  useEffect(() => {
    if (selectedId && filtered.some((s) => s.id === selectedId)) return;
    setSelectedId(filtered[0]?.id ?? null);
  }, [filtered, selectedId]);

  const selected = filtered.find((s) => s.id === selectedId) ?? null;

  async function createSnippet() {
    try {
      const id = await actions.create({
        title: "New snippet",
        projectId: projectId ?? null,
        language: "typescript",
        code: "// Write something, then press Run.\nconsole.log('hello');\n",
      });
      setSelectedId(id);
    } catch (error) {
      console.error("[snippets] create failed", error);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-10 text-sm text-muted">
        <Spinner /> Loading snippets…
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[18rem_1fr]">
      <aside className="flex flex-col gap-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search snippets"
              className="pl-8"
            />
          </div>
          <Button
            variant="primary"
            size="icon"
            onClick={createSnippet}
            aria-label="New snippet"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={<Code2 className="h-6 w-6" />}
            title={search ? "No matches" : "No snippets yet"}
            hint={
              search
                ? "Try a different search."
                : "Save reusable code here — JavaScript and TypeScript can be run in place."
            }
          />
        ) : (
          <ul className="space-y-1">
            {filtered.map((snippet) => (
              <li key={snippet.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(snippet.id)}
                  className={cn(
                    "w-full rounded-lg border px-3 py-2 text-left transition",
                    snippet.id === selectedId
                      ? "border-accent/50 bg-elevated"
                      : "border-border bg-surface hover:border-accent/30"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-fg">
                      {snippet.title}
                    </span>
                    {snippet.isPublic ? (
                      <Globe className="ml-auto h-3 w-3 shrink-0 text-emerald-400" />
                    ) : null}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted">
                    <span>{snippet.language}</span>
                    <span>·</span>
                    <span>{relativeTime(snippet.updatedAt)}</span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      {selected ? (
        <SnippetDetail key={selected.id} snippet={selected} />
      ) : (
        <EmptyState
          icon={<Code2 className="h-7 w-7" />}
          title="Select a snippet"
          hint="Pick one from the list, or create a new snippet to get started."
          action={
            <Button variant="primary" size="sm" onClick={createSnippet}>
              <Plus className="h-3.5 w-3.5" /> New snippet
            </Button>
          }
        />
      )}
    </div>
  );
}

function SnippetDetail({ snippet }: { snippet: Snippet }) {
  const actions = useSnippetActions();

  const [title, setTitle] = useState(snippet.title);
  const [code, setCode] = useState(snippet.code ?? "");
  const [language, setLanguage] = useState<SnippetLanguage>(snippet.language);
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  // Debounced persistence — the vault is an editor, not a form with a save
  // button, so edits go to Firestore on their own.
  useEffect(() => {
    if (
      title === snippet.title &&
      code === (snippet.code ?? "") &&
      language === snippet.language
    ) {
      return;
    }
    const timer = setTimeout(() => {
      actions
        .update(snippet.id, { title, code, language })
        .catch((error) => console.error("[snippets] save failed", error));
    }, 400);
    return () => clearTimeout(timer);
  }, [title, code, language, snippet, actions]);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timer);
  }, [copied]);

  // window is unavailable during SSR, so the absolute URL is built post-mount.
  useEffect(() => {
    setShareUrl(
      snippet.shareSlug
        ? `${window.location.origin}/share/${snippet.shareSlug}`
        : null
    );
  }, [snippet.shareSlug]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch (error) {
      console.error("[snippets] clipboard unavailable", error);
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          aria-label="Snippet title"
          className="min-w-0 flex-1 bg-transparent text-base font-semibold text-fg focus:outline-none"
        />

        <select
          value={language}
          onChange={(event) => setLanguage(event.target.value as SnippetLanguage)}
          aria-label="Language"
          className="h-8 rounded-md border border-border bg-surface px-2 text-xs text-fg focus:outline-none"
        >
          {SNIPPET_LANGUAGES.map((lang) => (
            <option key={lang} value={lang}>
              {lang}
            </option>
          ))}
        </select>

        <Tooltip label={copied ? "Copied" : "Copy code"}>
          <Button size="icon" onClick={copy} aria-label="Copy code">
            {copied ? (
              <Check className="h-4 w-4 text-emerald-400" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </Tooltip>

        <Tooltip label={snippet.isPublic ? "Make private" : "Publish read-only link"}>
          <Button
            size="icon"
            aria-label={snippet.isPublic ? "Make private" : "Publish"}
            onClick={() =>
              actions
                .setPublic(snippet, !snippet.isPublic)
                .catch((error) =>
                  console.error("[snippets] share toggle failed", error)
                )
            }
          >
            {snippet.isPublic ? (
              <Globe className="h-4 w-4 text-emerald-400" />
            ) : (
              <Lock className="h-4 w-4" />
            )}
          </Button>
        </Tooltip>

        <Tooltip label="Delete snippet">
          <Button
            size="icon"
            aria-label="Delete snippet"
            onClick={() => {
              if (confirm(`Delete "${snippet.title}"? This cannot be undone.`)) {
                void actions.remove(snippet.id, snippet.title);
              }
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </Tooltip>
      </div>

      {shareUrl ? (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-xs">
          <Globe className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
          <span className="shrink-0 text-muted">Public link:</span>
          <code className="truncate text-fg">{shareUrl}</code>
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(shareUrl)}
            className="ml-auto shrink-0 text-accent hover:underline"
          >
            Copy
          </button>
        </div>
      ) : null}

      <textarea
        value={code}
        onChange={(event) => setCode(event.target.value)}
        spellCheck={false}
        aria-label="Snippet code"
        rows={16}
        className="w-full resize-y rounded-lg border border-border bg-surface p-3 font-mono text-xs leading-relaxed text-fg focus:border-accent focus:outline-none"
      />

      <CodeRunnerSandbox code={code} language={language} />
    </div>
  );
}
