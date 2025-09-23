This repository is a small Next.js site (Team AMW) with a local SQLite data layer and a tiny admin UI.

Quick context for an AI coding assistant:

- Tech stack: Next.js (app router), TypeScript, Tailwind, server actions ("use server"), Better-SQLite3 for local DB, Firebase Admin for auth.
- Dev start: `npm install` then `npm run dev` (dev server runs on port 9002 by default). See `package.json` scripts.
- Seed data: `src/data/*.json` are used by `src/lib/db.ts` to initialize `amwhub.db` on first run. Editing those JSON files before first run is how content is seeded.

What to read first (fast path):
- `README.md` — high-level project purpose and quick start.
- `src/lib/db.ts` — primary data layer, migrations, and the JSON-to-SQLite import logic.
- `src/app/page.tsx` and `src/app/layout.tsx` — entry points and global components (Toaster is mounted here).
- `src/app/actions/*` — server actions that modify DB (add/update/remove streamers, events, media). They show validation patterns (zod) and cache revalidation via `revalidatePath`.
- `src/lib/firebase-admin.ts` and `src/lib/firebase.ts` — server and client Firebase initialization and expected env vars.

Important project conventions and patterns:
- Single-file SQLite DB: `amwhub.db` at repo root. Code expects `process.cwd()` to point to repo root. Avoid moving the DB path.
- Migrations are done in `src/lib/db.ts` using presence checks for tables and PRAGMA to add columns. Prefer modifying the migration functions when changing data schema.
- Server actions are used for stateful mutations and revalidate caches. They are declared with `'use server'` and return simple {success,message} objects. Follow existing zod validation styles when adding new actions.
- JSON fields in SQLite: arrays/objects are serialized as JSON strings in columns (e.g., `schedule`, `participants`, `media`, `imageUrls`). When reading/writing, follow the same JSON.stringify/parse pattern.
- Auth: Firebase Admin is initialized server-side; `adminAuth` is exported from `src/lib/firebase-admin.ts` and used by actions (e.g., `getFirebaseAuthUsers`). Ensure env vars from `.env` are provided.

Build & debugging tips (project-specific):
- Dev server: `npm run dev` uses turbopack and binds to port 9002. If port conflicts occur, inspect the console output for the final URL.
- DB migrations run on import of `src/lib/db.ts`. When testing migrations locally, delete `amwhub.db` to force re-migration from `src/data/*.json`.
- Types: `src/lib/types.ts` describes domain shapes. Use them for new server action return values and DB shape assumptions.
- Remote images: `next.config.ts` defines allowed image remotePatterns (e.g., `i.ytimg.com`, `static-cdn.jtvnw.net`). Add domains there if fetching thumbnails from new sources.

Examples (copyable patterns to follow):
- Server action skeleton (validation + revalidation):

- DB migration pattern: check for table in `sqlite_master`, create table, then call `migrate*()` which reads `src/data/*.json` and bulk inserts.

Files to reference when changing behavior:
- Data: `src/data/` (config.json, streams.json, events.json, media.json)
- Data layer: `src/lib/db.ts`
- Server actions: `src/app/actions/manage-events.ts`, `src/app/actions/manage-streamers.ts`, `src/app/actions/manage-media.ts`
- Firebase: `src/lib/firebase-admin.ts`, `src/lib/firebase.ts`
- Types: `src/lib/types.ts`

Do NOT:
- Change the location of `amwhub.db` without updating `src/lib/db.ts` and any developer docs.
- Make unchecked assumptions about DB column types — confirm with `PRAGMA table_info(table)` or `src/lib/types.ts`.

If anything is ambiguous, ask the maintainer for:
- exact expected env vars or a sanitized `.env.example` if missing values
- desired behavior for schema changes (migrate-in-place vs. re-seed DB)

If this file existed before, merge preserved content here. Keep instructions concise and focused on actionable patterns.

— end
