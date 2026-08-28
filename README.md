# S Notes

A local-first personal knowledge base and project workspace: Markdown notes with
bi-directional `[[links]]`, per-project Kanban boards, a code snippet vault with
an in-browser runner, reusable templates, public read-only sharing, one-click
ZIP export, and offline PWA support.

Sign-in is passwordless email OTP, with `admin` / `user` roles and an
administration console.

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 15 (App Router) + TypeScript |
| Data | Firebase Firestore, multi-tab offline persistence |
| Sign-in | Email OTP (Admin SDK custom tokens) + Google + anonymous guest |
| Email | Nodemailer over SMTP |
| State | Firestore realtime listeners + TanStack Query |
| UI | Tailwind CSS, Radix UI primitives, Lucide icons |
| Markdown | `react-markdown` with GFM, KaTeX, highlight.js |
| PWA | `@ducanh2912/next-pwa` (Workbox) |
| Export | JSZip + file-saver, entirely client-side |

## Setup

```bash
npm install
cp .env.example .env.local   # then fill in the values below
npm run dev
```

### Firebase

1. Create a project at <https://console.firebase.google.com>.
2. **Build → Authentication → Get started.** Enable *Google* and *Anonymous*.
   Email/Password is **not** needed — OTP mints custom tokens server-side.
   Skipping this step fails every sign-in with `auth/configuration-not-found`.
3. **Build → Firestore Database → Create database.** Skipping this fails every
   server route with `PERMISSION_DENIED … has not been used in project`.
4. **Project settings → Your apps → Web** → copy into the `NEXT_PUBLIC_*` vars.
5. **Project settings → Service accounts → Generate new private key** → copy
   into the `FIREBASE_ADMIN_*` vars. Keep the private key on one line with
   literal `\n` escapes, wrapped in quotes.
6. Deploy rules and indexes:

   ```bash
   npx firebase deploy --only firestore:rules,firestore:indexes
   ```

   The composite indexes back the project-scoped queries (`projectId` +
   `updatedAt` / `positionOrder`). Without them those queries fail with a
   console link to create the index.

### Email and the first admin

Set `SMTP_*` to any SMTP host (Gmail needs an App Password, not the account
password), and `ADMIN_EMAILS` to a comma-separated list of addresses that should
receive the `admin` role on their first sign-in.

## Authentication

There is no registration step — receiving a code at an address *is* the proof of
ownership, so the verify route creates the account on first successful use.

```
POST /api/auth/otp/request   { email }
  -> 6-digit code, SHA-256 hashed with the email as salt, stored in otpCodes/
  -> emailed over SMTP

POST /api/auth/otp/verify    { email, code }
  -> constant-time hash compare, then a Firebase custom token
  -> client calls signInWithCustomToken()
```

Codes are never stored in plaintext, expire in 10 minutes, are single-use, and
allow 5 wrong attempts before being burned. Sends are limited to one per minute
and five per hour per address. The request endpoint always returns 200 for a
well-formed address whether or not an account exists, so it cannot be used to
enumerate accounts.

## Roles

Two roles: `admin` and `user`. The role of record is a **Firebase custom
claim** — signed into the ID token, so a client cannot forge or self-assign it,
and the Firestore rules read it directly with no extra lookup.
`userProfiles/{uid}` mirrors it only because claims aren't queryable and the
admin console needs to list and sort accounts.

At `/admin/users`, an admin can list every account with role, status, provider
and last sign-in; promote and demote; disable and re-enable; delete an account
and all of its content; and **read any user's notes, tasks and snippets** at
`/admin/users/[uid]`.

That last capability is worth being explicit about: an admin account is a key to
every user's private notes. Writes stay owner-only — an admin can read content
but not silently edit it — and every account-level action goes through a server
route. Treat admin accounts accordingly.

Guards that cannot be clicked past: an admin cannot demote themselves, disable
themselves, delete themselves, or take any action that would leave zero active
administrators. Changing a role or disabling an account revokes that user's
refresh tokens, so it takes effect on their next request rather than whenever
their current hour-long token happens to expire.

## Data model

Everything is scoped under `users/{uid}/` so one wildcard rule isolates each
tenant:

```
users/{uid}/projects/{id}  notes/{id}  tasks/{id}  snippets/{id}
            templates/{id}  quickLinks/{id}  activity/{id}
shares/{slug}        # public slug -> {uid, entityId, kind}
userProfiles/{uid}   # queryable mirror of Auth, server-written only
otpCodes/{hash}      # hashed one-time codes, server-only
```

`shares/` is top-level and world-readable by design: a public `/share/[slug]`
link has no authenticated user, so it needs a way to find out whose workspace a
slug belongs to. It stores only pointers — the actual read is still gated by
`isPublic == true`, so unpublishing breaks live links immediately.

## How a few things work

**Backlinks.** `outgoingLinks` is re-derived from note content on every save, so
the "Referenced In" footer is just
`where("outgoingLinks", "array-contains", <this note's title>)` — no index to
keep in sync. Links resolve by title, so renaming a note does not rewrite
inbound links (matching how wiki-link tools behave).

**Autosave.** 300ms debounce, flushed on blur, unmount, and `beforeunload`. A
failed write puts the patch back in the queue rather than dropping it, and
incoming Firestore snapshots are ignored while there are unsaved keystrokes.

**Kanban drag.** Optimistic local reorder, then one batched Firestore write. A
rejected write self-corrects on the next snapshot.

**Code runner.** Snippets execute in a disposable Web Worker with a 3s hard
timeout. That is *isolation* (no DOM, no session, fresh realm per run), not a
security sandbox against hostile code — it is scoped to code the user wrote.
TypeScript has its annotations stripped rather than compiled.

**Offline.** Firestore uses `persistentLocalCache` with
`persistentMultipleTabManager()`, so reads come from IndexedDB and writes queue
and replay on reconnect. Workbox caches the app shell.

## Scripts

```bash
npm run dev        # dev server (service worker disabled)
npm run build      # production build + service worker
npm run typecheck  # tsc --noEmit
npm run lint
```
