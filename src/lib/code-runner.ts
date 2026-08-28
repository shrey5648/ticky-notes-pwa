/**
 * Runs untrusted JavaScript inside a throwaway Web Worker.
 *
 * A worker gives us a separate realm with no DOM, no `window`, and no access to
 * the page's Firebase session. It is *isolation*, not a security boundary
 * against a determined attacker — it still shares the origin and can make
 * network requests — so it is only appropriate for code the user wrote
 * themselves, which is exactly the snippet-vault case.
 *
 * Every run gets a fresh worker from a blob URL, so a snippet cannot leave
 * state behind for the next one.
 */

export type ConsoleLevel = "log" | "info" | "warn" | "error";

export interface ConsoleLine {
  level: ConsoleLevel;
  text: string;
}

export interface RunResult {
  logs: ConsoleLine[];
  /** Value of the final expression, formatted. Undefined if there was none. */
  result?: string;
  error?: string;
  durationMs: number;
  timedOut: boolean;
}

const WORKER_SOURCE = `
// Formats values the way a devtools console would, without pulling in a lib.
function format(value, seen) {
  seen = seen || new Set();
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  var t = typeof value;
  if (t === "string") return value;
  if (t === "number" || t === "boolean" || t === "bigint") return String(value);
  if (t === "symbol") return value.toString();
  if (t === "function") return "[Function: " + (value.name || "anonymous") + "]";
  if (value instanceof Error) return value.stack || (value.name + ": " + value.message);
  if (seen.has(value)) return "[Circular]";
  seen.add(value);
  try {
    if (Array.isArray(value)) {
      return "[" + value.map(function (v) { return format(v, seen); }).join(", ") + "]";
    }
    if (value instanceof Map) {
      return "Map(" + value.size + ") {" + Array.from(value.entries())
        .map(function (e) { return format(e[0], seen) + " => " + format(e[1], seen); })
        .join(", ") + "}";
    }
    if (value instanceof Set) {
      return "Set(" + value.size + ") {" + Array.from(value)
        .map(function (v) { return format(v, seen); }).join(", ") + "}";
    }
    return JSON.stringify(value, null, 2);
  } catch (e) {
    return String(value);
  } finally {
    seen.delete(value);
  }
}

var logs = [];
function capture(level) {
  return function () {
    var parts = Array.prototype.slice.call(arguments).map(function (a) { return format(a); });
    logs.push({ level: level, text: parts.join(" ") });
    // Runaway loops that log would exhaust memory before the timeout fires.
    if (logs.length > 1000) {
      logs.push({ level: "warn", text: "Output truncated at 1000 lines." });
      throw new Error("Output limit exceeded");
    }
  };
}

self.console = {
  log: capture("log"), info: capture("info"), debug: capture("log"),
  warn: capture("warn"), error: capture("error"), table: capture("log"),
  trace: capture("log"), dir: capture("log"), group: capture("log"),
  groupEnd: function () {}, time: function () {}, timeEnd: function () {},
  assert: function () {}
};

self.onmessage = function (event) {
  logs = [];
  var started = Date.now();
  try {
    // Indirect eval keeps the snippet in the worker's global scope rather than
    // capturing this function's locals.
    var run = (0, eval);
    var out = run(event.data.code);
    if (out && typeof out.then === "function") {
      out.then(
        function (v) { finish(v, null, started); },
        function (e) { finish(undefined, e, started); }
      );
      return;
    }
    finish(out, null, started);
  } catch (error) {
    finish(undefined, error, started);
  }
};

function finish(value, error, started) {
  self.postMessage({
    logs: logs,
    result: value === undefined ? undefined : format(value),
    error: error ? (error && error.stack ? error.stack : String((error && error.message) || error)) : undefined,
    durationMs: Date.now() - started
  });
}
`;

export const DEFAULT_TIMEOUT_MS = 3000;

/** Languages the in-browser runner can actually execute. */
export function isRunnable(language: string): boolean {
  return language === "javascript" || language === "typescript";
}

/**
 * TypeScript is not compiled — the runner strips the annotations that would be
 * a syntax error in plain JS. This handles ordinary snippets; anything using
 * enums, decorators, or namespaces should be run as JavaScript instead.
 */
export function stripTypeScript(code: string): string {
  return code
    .replace(/^\s*import\s+type\s[^;]*;?$/gm, "")
    .replace(/^\s*(?:export\s+)?interface\s+\w[\s\S]*?^\}/gm, "")
    .replace(/^\s*(?:export\s+)?type\s+\w+\s*=[^;]*;?$/gm, "")
    .replace(/\bas\s+const\b/g, "")
    .replace(/\bas\s+[A-Za-z_$][\w$<>\[\].|\s]*/g, "")
    .replace(
      /(\w)\s*:\s*(?:string|number|boolean|any|unknown|void|never|null|undefined)\b/g,
      "$1"
    )
    .replace(/!\s*(?=[.;)\]])/g, "");
}

export function runInSandbox(
  code: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<RunResult> {
  return new Promise((resolve) => {
    if (typeof Worker === "undefined") {
      resolve({
        logs: [],
        error: "Web Workers are not available in this browser.",
        durationMs: 0,
        timedOut: false,
      });
      return;
    }

    const started = performance.now();
    let url: string | undefined;
    let worker: Worker | undefined;
    let settled = false;

    const settle = (result: RunResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      worker?.terminate();
      if (url) URL.revokeObjectURL(url);
      resolve(result);
    };

    // The only way to stop an infinite loop in a worker is to terminate it,
    // so the timeout is the runner's hard stop, not a soft warning.
    const timer = setTimeout(() => {
      settle({
        logs: [],
        error: `Execution timed out after ${timeoutMs}ms and was terminated.`,
        durationMs: performance.now() - started,
        timedOut: true,
      });
    }, timeoutMs);

    try {
      url = URL.createObjectURL(
        new Blob([WORKER_SOURCE], { type: "application/javascript" })
      );
      worker = new Worker(url);

      worker.onmessage = (event: MessageEvent) => {
        const data = event.data as Omit<RunResult, "timedOut">;
        settle({
          logs: data.logs ?? [],
          result: data.result,
          error: data.error,
          durationMs: data.durationMs ?? performance.now() - started,
          timedOut: false,
        });
      };

      worker.onerror = (event: ErrorEvent) => {
        // Syntax errors surface here rather than as a message.
        event.preventDefault();
        settle({
          logs: [],
          error: event.message || "Worker failed to start.",
          durationMs: performance.now() - started,
          timedOut: false,
        });
      };

      worker.postMessage({ code });
    } catch (error) {
      settle({
        logs: [],
        error: error instanceof Error ? error.message : String(error),
        durationMs: performance.now() - started,
        timedOut: false,
      });
    }
  });
}
