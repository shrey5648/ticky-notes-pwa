"use client";

import { Code2 } from "lucide-react";
import { SnippetVault } from "@/components/snippets/SnippetVault";

export default function SnippetsPage() {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <header className="mb-6 flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent/10">
            <Code2 className="h-4 w-4 text-accent" />
          </span>
          <div>
            <h1 className="text-lg font-semibold text-fg">Code Vault</h1>
            <p className="text-xs text-muted">
              Every snippet across your workspace. JavaScript and TypeScript run in
              an isolated worker.
            </p>
          </div>
        </header>

        {/* No projectId: this is the cross-project view. */}
        <SnippetVault />
      </div>
    </div>
  );
}
