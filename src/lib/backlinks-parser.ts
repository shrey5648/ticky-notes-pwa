/**
 * Wiki-link parsing for `[[Note Title]]` syntax.
 *
 * Links are stored by title (not id) so `outgoingLinks` can be queried directly
 * with `array-contains` against the current note's title — the reverse-reference
 * lookup used by the backlinks footer.
 */

/** Matches [[Target]] and [[Target|Alias]], excluding ] inside the target. */
const WIKI_LINK = /\[\[([^\[\]|]+)(?:\|([^\[\]]+))?\]\]/g;

export interface WikiLink {
  raw: string;
  target: string;
  label: string;
  start: number;
  end: number;
}

export function parseWikiLinks(content: string): WikiLink[] {
  const links: WikiLink[] = [];
  WIKI_LINK.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = WIKI_LINK.exec(content)) !== null) {
    const target = match[1].trim();
    if (!target) continue;
    links.push({
      raw: match[0],
      target,
      label: (match[2] ?? match[1]).trim(),
      start: match.index,
      end: match.index + match[0].length,
    });
  }
  return links;
}

/** Deduplicated, order-preserving linked titles for `outgoingLinks`. */
export function extractOutgoingLinks(content: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const { target } of parseWikiLinks(stripCodeBlocks(content))) {
    const key = target.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(target);
  }
  return out;
}

/** Tags are `#word` outside code and outside markdown headings. */
export function extractTags(content: string): string[] {
  const body = stripCodeBlocks(content).replace(/^#{1,6}\s.*$/gm, "");
  const seen = new Set<string>();
  const out: string[] = [];
  for (const m of body.matchAll(/(?:^|\s)(#[\w-]{2,40})/g)) {
    const tag = m[1].toLowerCase();
    if (seen.has(tag)) continue;
    seen.add(tag);
    out.push(tag);
  }
  return out;
}

/** Fenced and inline code must not contribute links or tags. */
export function stripCodeBlocks(content: string): string {
  return content.replace(/```[\s\S]*?```/g, " ").replace(/`[^`\n]*`/g, " ");
}

/**
 * Rewrites `[[Title]]` into a markdown link the renderer turns into a pill.
 * Unresolved targets get a `#new=` href so the UI can mark them distinctly.
 */
export function wikiLinksToMarkdown(
  content: string,
  resolve: (title: string) => string | undefined
): string {
  return content.replace(WIKI_LINK, (raw, rawTarget: string, alias?: string) => {
    const target = rawTarget.trim();
    if (!target) return raw;
    const id = resolve(target);
    const href = id ? `/notes/${id}` : `#new=${encodeURIComponent(target)}`;
    const label = (alias ?? rawTarget).trim();
    return `[${label}](${href})`;
  });
}

/** Cursor sits inside an unterminated `[[` — used to trigger autocomplete. */
export function activeWikiLinkQuery(
  content: string,
  cursor: number
): { query: string; start: number } | null {
  const before = content.slice(0, cursor);
  const open = before.lastIndexOf("[[");
  if (open === -1) return null;
  const between = before.slice(open + 2);
  if (between.includes("]]") || between.includes("\n")) return null;
  return { query: between, start: open };
}

/** Case-insensitive subsequence match, ranked by how tight the match is. */
export function fuzzyRank<T>(
  items: T[],
  query: string,
  key: (item: T) => string,
  limit = 8
): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return items.slice(0, limit);
  const scored: Array<{ item: T; score: number }> = [];
  for (const item of items) {
    const target = key(item).toLowerCase();
    let ti = 0;
    let first = -1;
    let last = -1;
    for (const ch of q) {
      const found = target.indexOf(ch, ti);
      if (found === -1) {
        ti = -1;
        break;
      }
      if (first === -1) first = found;
      last = found;
      ti = found + 1;
    }
    if (ti === -1) continue;
    // Tighter spans and earlier starts rank higher.
    scored.push({ item, score: (last - first) * 2 + first });
  }
  scored.sort((a, b) => a.score - b.score);
  return scored.slice(0, limit).map((s) => s.item);
}
