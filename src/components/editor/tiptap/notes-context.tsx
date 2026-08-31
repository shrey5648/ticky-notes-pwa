"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { Note } from "@/types";

interface NoteLookup {
  /** Note id for a title, or undefined when no such note exists yet. */
  resolve: (title: string) => string | undefined;
}

const NoteLookupContext = createContext<NoteLookup>({ resolve: () => undefined });

/**
 * Wiki-link pills are React node views rendered through portals into this
 * component's tree, so context reaches them and they restyle themselves the
 * moment a linked note is created or renamed.
 */
export function NoteLookupProvider({
  notes,
  children,
}: {
  notes: Note[];
  children: ReactNode;
}) {
  const value = useMemo<NoteLookup>(() => {
    const byTitle = new Map<string, string>();
    for (const note of notes) byTitle.set(note.title.trim().toLowerCase(), note.id);
    return { resolve: (title) => byTitle.get(title.trim().toLowerCase()) };
  }, [notes]);

  return (
    <NoteLookupContext.Provider value={value}>
      {children}
    </NoteLookupContext.Provider>
  );
}

export function useNoteLookup(): NoteLookup {
  return useContext(NoteLookupContext);
}
