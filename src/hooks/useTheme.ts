"use client";

import { useCallback, useEffect, useState } from "react";

export type Theme = "light" | "dark";

const STORAGE_KEY = "s-notes:theme";

/**
 * Dark mode is class-based (tailwind darkMode: "class"). The initial class is
 * applied by an inline script in the root layout to avoid a flash of the wrong
 * theme; this hook only reads and updates it afterwards.
 */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    setTheme(
      document.documentElement.classList.contains("dark") ? "dark" : "light"
    );
  }, []);

  const apply = useCallback((next: Theme) => {
    document.documentElement.classList.toggle("dark", next === "dark");
    setTheme(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Private-mode browsers can reject writes; the theme still applies for
      // this session.
    }
  }, []);

  const toggle = useCallback(() => {
    apply(
      document.documentElement.classList.contains("dark") ? "light" : "dark"
    );
  }, [apply]);

  return { theme, setTheme: apply, toggle };
}
