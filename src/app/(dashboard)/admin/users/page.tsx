"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Eye,
  Loader2,
  RefreshCw,
  Search,
  Shield,
  ShieldCheck,
  Trash2,
  UserRound,
  Users,
} from "lucide-react";
import { useApiFetch, useAuth } from "@/lib/auth-context";
import { ROLES, type AdminUserRow, type Role } from "@/lib/roles";
import { Button, EmptyState, Input, Spinner, Tooltip } from "@/components/ui";
import { cn, relativeTimeFromMs } from "@/lib/utils";

export default function AdminUsersPage() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const apiFetch = useApiFetch();

  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | Role | "disabled">("all");
  /** uid currently being mutated, so only that row shows a spinner. */
  const [pending, setPending] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch("/api/admin/users");
      setUsers(data.users ?? []);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not load users."
      );
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    if (!authLoading && isAdmin) void load();
  }, [authLoading, isAdmin, load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((row) => {
      if (filter === "disabled" && !row.disabled) return false;
      if ((filter === "admin" || filter === "user") && row.role !== filter) {
        return false;
      }
      if (!q) return true;
      return (
        row.email.toLowerCase().includes(q) ||
        row.displayName.toLowerCase().includes(q) ||
        row.uid.toLowerCase().includes(q)
      );
    });
  }, [users, search, filter]);

  const adminCount = useMemo(
    () => users.filter((u) => u.role === "admin" && !u.disabled).length,
    [users]
  );

  async function mutate(
    uid: string,
    body: Record<string, unknown>,
    optimistic: Partial<AdminUserRow>
  ) {
    setPending(uid);
    setError(null);
    const before = users;
    // Optimistic so the row responds immediately; the server is still the
    // authority and a failure restores the previous list.
    setUsers((rows) =>
      rows.map((row) => (row.uid === uid ? { ...row, ...optimistic } : row))
    );
    try {
      await apiFetch(`/api/admin/users/${uid}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
    } catch (caught) {
      setUsers(before);
      setError(caught instanceof Error ? caught.message : "Update failed.");
    } finally {
      setPending(null);
    }
  }

  async function remove(row: AdminUserRow) {
    const confirmed = confirm(
      `Permanently delete ${row.email || row.uid}?\n\n` +
        "This also deletes every project, note, task and snippet they own. " +
        "This cannot be undone."
    );
    if (!confirmed) return;

    setPending(row.uid);
    setError(null);
    try {
      await apiFetch(`/api/admin/users/${row.uid}`, { method: "DELETE" });
      setUsers((rows) => rows.filter((r) => r.uid !== row.uid));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Delete failed.");
    } finally {
      setPending(null);
    }
  }

  if (authLoading) {
    return (
      <div className="grid flex-1 place-items-center">
        <Spinner />
      </div>
    );
  }

  // Defense in depth: the API rejects non-admins regardless, but there's no
  // reason to render a console the caller can't use.
  if (!isAdmin) {
    return (
      <div className="grid flex-1 place-items-center px-6">
        <EmptyState
          icon={<Shield className="h-7 w-7" />}
          title="Administrator access required"
          hint="Your account doesn't have the admin role. Ask an administrator if you need access."
          action={
            <Link href="/" className="text-sm text-accent hover:underline">
              Back to overview
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-5xl px-6 py-8">
        <header className="flex flex-wrap items-center gap-3">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent/10">
            <Users className="h-4 w-4 text-accent" />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-semibold text-fg">User management</h1>
            <p className="text-xs text-muted">
              {users.length} accounts · {adminCount} active{" "}
              {adminCount === 1 ? "administrator" : "administrators"}
            </p>
          </div>
          <Button size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            Refresh
          </Button>
        </header>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[14rem] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by email, name or UID"
              className="pl-8"
            />
          </div>

          <div className="flex gap-0.5 rounded-lg border border-border bg-surface p-0.5">
            {(["all", "admin", "user", "disabled"] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={cn(
                  "rounded-md px-2.5 py-1.5 text-xs capitalize transition",
                  filter === key
                    ? "bg-elevated font-medium text-fg"
                    : "text-muted hover:text-fg"
                )}
              >
                {key}
              </button>
            ))}
          </div>
        </div>

        {error ? (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-400">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {error}
          </div>
        ) : null}

        {loading && users.length === 0 ? (
          <div className="mt-8 flex items-center gap-2 text-sm text-muted">
            <Spinner /> Loading accounts…
          </div>
        ) : filtered.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              icon={<UserRound className="h-6 w-6" />}
              title={users.length ? "No matching accounts" : "No accounts yet"}
              hint={
                users.length
                  ? "Try a different search or filter."
                  : "Users appear here after their first sign-in."
              }
            />
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[48rem] text-sm">
              <thead>
                <tr className="border-b border-border bg-surface text-left text-[11px] uppercase tracking-wide text-muted">
                  <th className="px-4 py-2.5 font-medium">User</th>
                  <th className="px-4 py-2.5 font-medium">Role</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">Last sign-in</th>
                  <th className="px-4 py-2.5 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => {
                  const isSelf = row.uid === user?.uid;
                  const busy = pending === row.uid;
                  return (
                    <tr
                      key={row.uid}
                      className={cn(
                        "border-b border-border last:border-0",
                        row.disabled && "opacity-60"
                      )}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={cn(
                              "grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-semibold",
                              row.role === "admin"
                                ? "bg-accent/15 text-accent"
                                : "bg-elevated text-muted"
                            )}
                          >
                            {initials(row)}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-fg">
                              {row.displayName || row.email || "Anonymous"}
                              {isSelf ? (
                                <span className="ml-1.5 text-[10px] text-muted">
                                  (you)
                                </span>
                              ) : null}
                            </p>
                            <p className="truncate text-[11px] text-muted">
                              {row.email || row.uid}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <select
                          value={row.role}
                          disabled={busy || isSelf}
                          aria-label={`Role for ${row.email || row.uid}`}
                          title={
                            isSelf ? "You can't change your own role." : undefined
                          }
                          onChange={(event) =>
                            void mutate(
                              row.uid,
                              { role: event.target.value },
                              { role: event.target.value as Role }
                            )
                          }
                          className={cn(
                            "h-7 rounded-md border border-border bg-surface px-2 text-xs capitalize text-fg",
                            "focus:border-accent focus:outline-none disabled:opacity-60"
                          )}
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="px-4 py-3">
                        {row.disabled ? (
                          <span className="flex items-center gap-1 text-xs text-amber-500">
                            <Ban className="h-3 w-3" /> Disabled
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-emerald-500">
                            <CheckCircle2 className="h-3 w-3" /> Active
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-xs text-muted">
                        {relativeTimeFromMs(row.lastSignInAt)}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {busy ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted" />
                          ) : null}

                          <Tooltip label="View this user's content">
                            <Link
                              href={`/admin/users/${row.uid}`}
                              aria-label="View workspace"
                              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-elevated text-fg transition hover:bg-border/40"
                            >
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Tooltip>

                          <Tooltip
                            label={
                              isSelf
                                ? "You can't disable your own account"
                                : row.disabled
                                  ? "Re-enable account"
                                  : "Disable account"
                            }
                          >
                            <Button
                              size="icon"
                              disabled={busy || isSelf}
                              aria-label={
                                row.disabled ? "Enable account" : "Disable account"
                              }
                              onClick={() =>
                                void mutate(
                                  row.uid,
                                  { disabled: !row.disabled },
                                  { disabled: !row.disabled }
                                )
                              }
                            >
                              {row.disabled ? (
                                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                              ) : (
                                <Ban className="h-4 w-4" />
                              )}
                            </Button>
                          </Tooltip>

                          <Tooltip
                            label={
                              isSelf
                                ? "You can't delete your own account here"
                                : "Delete account and all its data"
                            }
                          >
                            <Button
                              size="icon"
                              disabled={busy || isSelf}
                              aria-label="Delete account"
                              onClick={() => void remove(row)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </Tooltip>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <p className="mt-4 text-[11px] text-muted">
          Changing a role or disabling an account revokes that user&apos;s refresh
          tokens, so the change takes effect on their next request rather than
          when their current token expires.
        </p>
      </div>
    </div>
  );
}

function initials(row: AdminUserRow): string {
  const source = row.displayName || row.email;
  if (!source) return "?";
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  return (
    (parts[0]?.[0] ?? "?").toUpperCase() + (parts[1]?.[0] ?? "").toUpperCase()
  );
}
