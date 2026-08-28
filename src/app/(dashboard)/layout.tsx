"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Sidebar } from "@/components/layout/Sidebar";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { Spinner } from "@/components/ui";

/**
 * Client-side auth gate. Firebase Auth state lives in IndexedDB, not a cookie,
 * so the server can't know who the user is — every dashboard route resolves
 * auth in the browser and redirects if there's no session.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <span className="flex items-center gap-2 text-sm text-muted">
          <Spinner /> Opening your workspace…
        </span>
      </div>
    );
  }

  // The redirect above is in flight; rendering the shell would flash the
  // signed-in UI at a signed-out visitor.
  if (!user) return null;

  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar />
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">{children}</main>
      <CommandPalette />
    </div>
  );
}
