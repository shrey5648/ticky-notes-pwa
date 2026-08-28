"use client";

import { useEffect, useRef, useState } from "react";
import { Play, ShieldAlert, Square, Trash2 } from "lucide-react";
import {
  DEFAULT_TIMEOUT_MS,
  isRunnable,
  runInSandbox,
  stripTypeScript,
  type RunResult,
} from "@/lib/code-runner";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { SnippetLanguage } from "@/types";

interface Props {
  code: string;
  language: SnippetLanguage;
}

const LEVEL_STYLES: Record<string, string> = {
  log: "text-fg",
  info: "text-blue-400",
  warn: "text-amber-400",
  error: "text-red-400",
};

/**
 * "Run" panel for the snippet vault. Execution happens in a disposable Web
 * Worker (see lib/code-runner) with a hard timeout, so an infinite loop costs
 * the user a few seconds rather than a frozen tab.
 */
export function CodeRunnerSandbox({ code, language }: Props) {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // A previous snippet's output would be misleading next to new code.
  useEffect(() => {
    setResult(null);
  }, [code, language]);

  const runnable = isRunnable(language);

  async function run() {
    if (!runnable || running) return;
    setRunning(true);
    setResult(null);
    const source = language === "typescript" ? stripTypeScript(code) : code;
    const outcome = await runInSandbox(source, DEFAULT_TIMEOUT_MS);
    if (!mounted.current) return;
    setResult(outcome);
    setRunning(false);
  }

  if (!runnable) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-xs text-muted">
        <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
        The in-browser runner executes JavaScript and TypeScript only.{" "}
        <span className="capitalize">{language}</span> snippets are stored and
        highlighted, not run.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-surface">
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
        <Button
          variant="primary"
          size="sm"
          onClick={run}
          disabled={running || !code.trim()}
        >
          {running ? (
            <>
              <Square className="h-3 w-3" /> Running…
            </>
          ) : (
            <>
              <Play className="h-3 w-3" /> Run
            </>
          )}
        </Button>

        {result ? (
          <span className="text-[11px] text-muted">
            {result.timedOut ? "terminated" : `${Math.round(result.durationMs)}ms`}
          </span>
        ) : null}

        <span className="ml-auto flex items-center gap-1.5 text-[11px] text-muted">
          <ShieldAlert className="h-3 w-3" />
          Isolated worker · {DEFAULT_TIMEOUT_MS / 1000}s limit
        </span>

        {result ? (
          <button
            type="button"
            aria-label="Clear output"
            onClick={() => setResult(null)}
            className="rounded p-1 text-muted transition hover:text-fg"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>

      <div className="max-h-64 overflow-y-auto p-3 font-mono text-xs leading-relaxed">
        {!result && !running ? (
          <p className="text-muted">
            Output appears here.{" "}
            {language === "typescript"
              ? "Type annotations are stripped before running — they aren't compiled."
              : null}
          </p>
        ) : null}

        {running ? <p className="text-muted">Executing…</p> : null}

        {result?.logs.map((line, index) => (
          <pre
            key={index}
            className={cn("whitespace-pre-wrap", LEVEL_STYLES[line.level])}
          >
            {line.text}
          </pre>
        ))}

        {result?.result !== undefined ? (
          <pre className="mt-1 whitespace-pre-wrap border-t border-border pt-1 text-emerald-400">
            {"→ "}
            {result.result}
          </pre>
        ) : null}

        {result?.error ? (
          <pre className="mt-1 whitespace-pre-wrap text-red-400">{result.error}</pre>
        ) : null}

        {result &&
        !result.logs.length &&
        result.result === undefined &&
        !result.error ? (
          <p className="text-muted">Ran with no output.</p>
        ) : null}
      </div>
    </div>
  );
}
