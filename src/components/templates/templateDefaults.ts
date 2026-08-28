import type { TemplateCategory } from "@/types";

export interface BuiltinTemplate {
  key: string;
  name: string;
  category: TemplateCategory;
  description: string;
  content: string;
}

export interface TemplateTokens {
  date?: string;
  time?: string;
  author?: string;
  title?: string;
}

/**
 * Token replacement for template instantiation. Unknown tokens are left intact
 * so a stray `{{foo}}` in prose survives rather than vanishing.
 */
export function renderTemplate(
  content: string,
  tokens: TemplateTokens = {}
): string {
  const now = new Date();
  const values: Record<string, string> = {
    date: tokens.date ?? now.toISOString().slice(0, 10),
    time:
      tokens.time ??
      now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }),
    author: tokens.author ?? "",
    title: tokens.title ?? "",
  };
  return content.replace(/\{\{\s*(\w+)\s*\}\}/g, (raw, key: string) => {
    const value = values[key.toLowerCase()];
    return value === undefined ? raw : value;
  });
}

export const BUILTIN_TEMPLATES: BuiltinTemplate[] = [
  {
    key: "meeting",
    name: "Meeting Notes",
    category: "meeting",
    description: "Agenda, discussion, decisions, and action items.",
    content: `# {{title}}

**Date:** {{date}} {{time}}
**Author:** {{author}}
**Attendees:**

## Agenda
1.
2.

## Discussion

## Decisions
-

## Action Items
- [ ] Owner — task — due
- [ ]

## Related
- [[ ]]
`,
  },
  {
    key: "bug",
    name: "Bug Report",
    category: "bug",
    description: "Repro steps, expected vs. actual, environment.",
    content: `# Bug: {{title}}

**Reported:** {{date}} by {{author}}
#bug

## Summary

## Steps to Reproduce
1.
2.
3.

## Expected

## Actual

## Environment
| Field | Value |
| --- | --- |
| Version | |
| Browser / OS | |

## Logs
\`\`\`
\`\`\`
`,
  },
  {
    key: "scope",
    name: "Project Scope",
    category: "scope",
    description: "Goals, non-goals, milestones, and risks.",
    content: `# {{title}} — Project Scope

**Drafted:** {{date}} · **Owner:** {{author}}

## Problem

## Goals
-

## Non-Goals
-

## Milestones
- [ ] M1 —
- [ ] M2 —

## Risks & Open Questions
| Risk | Impact | Mitigation |
| --- | --- | --- |
| | | |

## Success Metrics
`,
  },
  {
    key: "docs",
    name: "Technical Spec",
    category: "docs",
    description: "Architecture, data model, API surface, rollout.",
    content: `# {{title}} — Technical Specification

**Author:** {{author}} · **Last updated:** {{date}}
#architecture

## Overview

## Architecture

## Data Model
\`\`\`typescript
interface Example {
  id: string;
}
\`\`\`

## API Surface
| Method | Path | Purpose |
| --- | --- | --- |
| | | |

## Rollout Plan
- [ ]

## Alternatives Considered

## References
- [[ ]]
`,
  },
];
