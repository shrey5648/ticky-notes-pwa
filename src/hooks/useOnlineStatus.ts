"use client";

import { useEffect, useState } from "react";

/**
 * Tracks connectivity for the offline indicator.
 *
 * Starts optimistic (`true`) rather than reading navigator.onLine during
 * render, because the server has no such value and a mismatch would hydrate
 * incorrectly. The real value lands in the effect immediately after mount.
 */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(navigator.onLine);
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  return online;
}
