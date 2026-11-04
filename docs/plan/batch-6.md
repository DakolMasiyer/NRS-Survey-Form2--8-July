> Read [README.md](README.md) first: context, ground rules, gate command.

# Batch 6: two-step staff checklist on Vercel storage (Neon Postgres)

**Status: approved by the owner 2026-11-04; being executed in waves (see Execution).**

## Context
Officers and CSQAU scorers work at **different times**. Today `/staff` is one form with one submission, so an unscored submission can never be completed later. The owner wants: officer submits answers -> the CSQAU scorer opens a passcode-protected page, picks the office from a dropdown, sees the officer's saved answers read-only, scores them -> the final answers land in the existing Google Sheet. One staff QR only: `/staff` gets a clear button that sends the scorer to the scoring page, where a passcode hides everything until entered.

This replaces the earlier Apps Script design (which stored pending rows in the sheet). Earlier batches (0-5) are done and live at `survey.dako.studio` (production deploy `b58087d`).

## Owner decisions (all confirmed)
| Topic | Decision |
|---|---|
| Storage | **Neon Postgres via Vercel Marketplace** (pending + scored records). Sheet script stays append-only. |
| Final output | **Existing Google Sheet**, same columns, one complete row per scored visit. |
| Traceability | Add **`submission_id`** as the last sheet column (owner adds the header cell, redeploys `Code.gs`). |
| Retention | Keep scored records in the database (server-only access). |
| Scorer view | State -> Office (existing `TaxOfficeSelect`) -> that office's pending submissions by date -> **read-only** answers. |
| Sign-offs | Checked by (CSQAU), Head, Tax Controller are typed on the scorer's screen after scoring. |
| Entry | `/s` QR -> `/staff`; a visible **"CSQAU scorer? Open the scoring page"** button -> `/staff/score`; passcode gates the whole page (no data is fetched before unlock). |
| Public hostname | **`nrssurvey.dako.studio`** becomes the address in all QR codes. `survey.dako.studio` **stays and redirects** to it, so anything already printed or shared keeps working. New Cloudflare DNS record via the script with a fresh scoped token (owner revokes afterwards). |

## Flow
1. **Officer `/staff`:** status, remarks, staff list, tax office -> Submit -> row inserted as `pending`; officer sees a reference id. No scores, no code, no sign-off blocks. Nothing is written to the sheet yet.
2. **Scorer `/staff/score`:** passcode screen only -> after unlock: State -> Office -> pending list (date/time + first staff name) -> pick one -> answers shown read-only in the checklist table -> scores (0-100 per section) -> sign-off blocks -> Save.
3. **Server on save:** verify code, validate, **recompute total**, atomically flip `pending -> scored` (second scorer gets 409), then POST the final row to the sheet webhook(s). If the webhook fails the record stays `scored` with `sheet_synced_at = null`; the scorer sees "Saved, but the sheet update failed" with a **Resend** button (idempotent via `submission_id`).

## Design
**Database (additive; Neon, server-only, no public API):**
```
checklist_visits(id uuid pk default gen_random_uuid(), tax_office text not null,
  status text not null default 'pending' check (status in ('pending','scored')),
  submitted_at timestamptz not null default now(), payload jsonb not null,
  scores jsonb, signoffs jsonb, total_score numeric(4,1), scored_at timestamptz,
  sheet_synced_at timestamptz, sheet_error text)      -- index (tax_office, status)
access_attempts(ip_hash text not null, attempted_at timestamptz not null default now())
```
Atomic scoring: `UPDATE checklist_visits SET ... WHERE id=$1 AND status='pending' RETURNING *` (no row = conflict). Lockout: >5 failed codes per hashed IP in 15 min -> 429 with Retry-After (the DB makes real lockout possible; also closes the "guessable code" gap).

**Server modules** (new unless noted):
- `src/lib/db.ts` lazy `getSql()` with `@neondatabase/serverless` (no Proxy, safe at build time); needs `DATABASE_URL`, raise a clear error if unset.
- `src/lib/visits.ts` data layer: `createPending`, `listPending(office)`, `getVisit(id)`, `scoreVisit(...)` (atomic), `markSynced/markSyncError`.
- `src/lib/staff-sections.ts` + `src/lib/staff-schema.ts`: extract `SECTIONS` and zod schemas out of `src/app/staff/staff-form.tsx` so server and both pages share them (stage-1 schema rejects any score/sign-off key; scoring schema: 10 numeric scores 0-100, three complete sign-off blocks).
- `src/lib/webhook.ts` (modify): export `sendToWebhooks(envVars, body)` from the existing internal `postToWebhook`; `proxyToWebhooks` keeps its behaviour (taxpayer route and its tests unchanged).
- `src/lib/sheet-row.ts`: `buildSheetRow(visit)` -> existing staff columns (`submitted_at` = officer submit time, server `total_score`) + `submission_id`.
- `src/lib/csqau-access.ts` (reuse `verifyCsqauCode`) + new `src/lib/access-guard.ts` (code check + lockout + hashed IP).
- Routes: `POST /api/staff` (officer submit, rewritten), `POST /api/staff/unlock` (adds lockout), `POST /api/staff/pending` (list by office), `POST /api/staff/pending/[id]` (get), `POST /api/staff/score`, `POST /api/staff/score/[id]/resend`. All except officer submit require `x-csqau-code`.

**UI** (reuse the existing checklist table CSS, `TaxOfficeSelect`, `SignatoryBlock` -> extract to `src/app/staff/signatory-block.tsx`):
- `staff-form.tsx`: remove unlock box, score inputs, total panel, sign-offs; add the top scorer button/banner; success state shows the reference.
- New `src/app/staff/score/page.tsx` + `score-app.tsx`: passcode gate -> picker -> list -> read-only table + scoring.

**Sheet:** `scripts/staff-sheet/Code.gs` HEADERS gets `submission_id` appended (nothing else changes). Add `staff-columns.test.ts` (like `taxpayer-columns.test.ts`) keeping `Code.gs` HEADERS, the route comment and `buildSheetRow` in sync.

**Environments:** Production uses the production Neon DB. **Local and Preview use a separate Neon database/branch and a TEST copy of the staff sheet** (lesson from the earlier live-sheet mishap: never point tests at live webhooks).

## Steps (one commit each; full gate after each: `npm run lint`, `npx tsc --noEmit`, `npm run build`, `npm test`, on Node 24)
- **6.H Hostname `nrssurvey.dako.studio` (do first, so the posters are only reprinted once):**
  1. DNS: make the hostname a parameter of `~/cf-dns.sh` (default stays explicit, no silent fallback); owner creates a fresh token scoped to Zone:DNS:Edit on `dako.studio`; dry run, then `--apply` for `A nrssurvey.dako.studio -> 76.76.21.21` (DNS only); verify with `dig` against 1.1.1.1/8.8.8.8. The token is used inline only, never written to a file; owner revokes it afterwards. (Local resolver may cache the miss; verify with `curl --resolve`.)
  2. Vercel: `vercel domains add nrssurvey.dako.studio` on the linked project; confirm certificate issued and `/t`, `/s`, `/taxpayer`, `/staff` answer on it.
  3. Code: `next.config.ts` redirect with `has: [{ type: "host", value: "survey.dako.studio" }]` -> `https://nrssurvey.dako.studio/:path*` (temporary 307, listed **before** the `/spaff` rule). Extend `src/lib/legacy-redirects.test.ts` to assert the rule and its host condition.
  4. QR and posters: change the default host in `scripts/make-poster.ts` and `scripts/make-qr.ts` to `https://nrssurvey.dako.studio`; regenerate `docs/qr/poster/*` and the small cards with `scripts/render-poster.sh`; re-verify every file decodes to the new URL (OpenCV decode + PDF fonts check as before); update `docs/qr/README.md`; save fresh copies to `~/Downloads/NRS-QR-Posters-v2/`. Owner reprints only if the old codes were already printed; the old codes keep working through the redirect.
  5. Production deploy for the redirect to take effect: **needs the owner's explicit go-ahead** (separate from approving this plan). Then verify `survey.dako.studio/t` -> 307 -> `nrssurvey.dako.studio/t` -> 307 -> `/taxpayer`.
- **6.0 Docs:** rewrite `docs/plan/batch-6.md` to this design; update `docs/plan/README.md` and replace the old hostname in `docs/plan/batch-5.md` notes.
- **6.1 Provision + schema (owner consent for install):** `vercel integration add neon` (terms/account may need a browser step); create dev DB; `db/migrations/001_checklist_visits.sql`; `scripts/migrate.ts` (idempotent, reads `DATABASE_URL`; plain Node does not auto-load `.env.local`). Dev dep `@electric-sql/pglite` (in-process Postgres) for tests.
- **6.2 Extract shared pieces** (sections, schemas, `SignatoryBlock`, `sendToWebhooks`), no behaviour change; existing 68 tests stay green.
- **6.3 Data layer + routes + guard.** Tests (PGlite for real SQL): create/list filters by office and status; atomic score then second score -> conflict; total recomputed and client total ignored; scores out of 0-100 / NaN / missing rejected; stage-1 payload with score keys rejected; every protected route returns 403 without the code and **never touches the DB**; lockout at the 6th failure -> 429; webhook failure leaves `sheet_synced_at` null and returns the warning; resend is idempotent; missing `DATABASE_URL` -> clear 503.
- **6.4 Officer form + scorer button.** Tests: no score/sign-off fields; submit payload has no score keys; button links to `/staff/score`; success shows the reference.
- **6.5 Scorer page.** Tests: before unlock nothing but the code box renders and **no list/pending fetch is made**; wrong code message and lockout message; State -> Office -> list -> select loads answers with disabled inputs; scores required; save sends id + scores (no total); 409 and sheet-failed messages.
- **6.6 Sheet column + `staff-columns.test.ts`.**
- **6.7 Release (owner-gated):** (a) owner creates the TEST sheet copy + script, sets a Preview webhook URL, and a long random `CSQAU_ACCESS_CODE` (Preview + Production; never written to any file); (b) Preview deploy with the dev DB: full browser run (officer submit via `/s` -> scorer button -> passcode -> pick office -> score -> row appears in TEST sheet with `submission_id` and server total; second scorer gets 409); (c) owner adds the `submission_id` header cell and redeploys `Code.gs` on the live sheet **before** production; (d) production DB env set, deploy to production only on explicit go-ahead; smoke test with one obvious test record, then remove it (SQL + sheet row); update docs.

## Execution: parallel fan-out (independent work runs in agents; dependent work waits)
**Shared rules for every agent** (each gets a self-contained prompt that points at `docs/plan/batch-6.md`, `docs/plan/README.md` ground rules and this contract; agents never receive the Cloudflare token or any secret): work in its own git worktree/branch; touch **only its listed files**; run `npm ci` once, then only `npx tsc --noEmit` and `npx vitest run <its tests>` (**no `next build`, no dev server**, to avoid the memory pressure that killed the dev server earlier); Node 24 via `export PATH=/Users/dakolmasiyer/.local/node-v24.22.2-darwin-x64/bin:$PATH`; never contact the live sheets/webhooks; never write a secret to a file; commit on its branch and report files changed, tests added and anything uncertain. **I merge the branches into `feat/tax-office-dropdown`, resolve conflicts, and run the full gate (lint, tsc, build, tests).** At most 3 agents run at once.

**Wave 0 (me, sequential, small):** (a) 6.0 docs (so agents can read the design from the repo); (b) 6.H DNS + Vercel domain attach for `nrssurvey.dako.studio`, using the owner's new Cloudflare token inline only (dry run, then apply, verify with `dig` and `curl --resolve`); the owner revokes the token afterwards; (c) 6.1 Neon provisioning, which needs the owner's consent and possibly a browser step, so it runs in parallel with Wave 1 but is never delegated.

**Wave 1 (3 agents in parallel, disjoint files):**
- **Agent A, hostname + QR:** `next.config.ts`, `src/lib/legacy-redirects.test.ts`, `scripts/make-poster.ts`, `scripts/make-qr.ts`, `scripts/render-poster.sh`, `docs/qr/**`, copy to `~/Downloads/NRS-QR-Posters-v2/` (step 6.H items 3-4; verification by decode needs Python via `uv`).
- **Agent B, data layer:** `db/migrations/001_checklist_visits.sql`, `scripts/migrate.ts`, `src/lib/{db,visits,access-guard}.ts` + tests on PGlite; the only agent allowed to edit `package.json`/lockfile (`@neondatabase/serverless`, `@electric-sql/pglite`); `.env.local.example`.
- **Agent C, shared pieces + sheet:** extract `SECTIONS`/schemas to `src/lib/{staff-sections,staff-schema}.ts`, `SignatoryBlock` to `src/app/staff/signatory-block.tsx` (edit `staff-form.tsx` only to import them, no behaviour change), export `sendToWebhooks` in `src/lib/webhook.ts`, add `src/lib/sheet-row.ts`, append `submission_id` in `scripts/staff-sheet/Code.gs`, add `staff-columns.test.ts`. Existing 68 tests must stay green.

**Wave 2 (starts after Wave 1 is merged and green; 3 agents in parallel, disjoint files, coded against the API contract below with mocked `fetch`):**
- **Agent D, routes:** `src/app/api/staff/**` (submit, unlock + lockout, pending list/get, score, resend) + tests.
- **Agent E, officer form:** `src/app/staff/staff-form.tsx` (+ test): remove unlock/scores/sign-offs, add the scorer button, show the reference.
- **Agent F, scorer page:** `src/app/staff/score/{page,score-app}.tsx` (+ tests): passcode gate, State -> Office -> list -> read-only answers -> scores -> sign-offs.

**Wave 3 (me, sequential, owner-gated):** integrate all branches, full gate, Preview deploy against the dev DB + TEST sheet, browser E2E, then step 6.7 (production only on explicit go-ahead).

**API contract (agents D, E, F build to this; all errors are `{ "error": string }`):**
- `POST /api/staff` body `{tax_office, sections:[{status,remarks}] x10, staff:[{name,ir,rank,phone,email}]}` -> `201 {id, reference}`; `400`; any score/sign-off key -> `400`.
- `POST /api/staff/unlock` `{code}` -> `200 {ok:true}` | `401` | `429 {error, retryAfterSeconds}` | `503`.
- `POST /api/staff/pending` header `x-csqau-code`, body `{tax_office}` -> `200 {visits:[{id, submitted_at, first_staff_name}]}` | `403` | `429`.
- `POST /api/staff/pending/[id]` header code -> `200 {id, tax_office, submitted_at, payload}` | `404` | `403`.
- `POST /api/staff/score` header code, body `{id, scores:number[10], signoffs:{checked_by,head_tpsu,controller}}` (each sign-off `{name, ir_rank, phone, email}`) -> `200 {saved:true, sheetSynced:boolean, total_score}` | `409 {error:"already scored"}` | `400` | `403`.
- `POST /api/staff/score/[id]/resend` header code -> `200 {sheetSynced:true}` | `409` (not scored) | `403`.

## Critical files
Modify: `src/app/staff/staff-form.tsx`, `src/app/api/staff/route.ts`, `src/app/api/staff/unlock/route.ts`, `src/lib/webhook.ts`, `scripts/staff-sheet/Code.gs`, `package.json` (+ lockfile), `.env.local.example`, `docs/plan/*`. New: `src/lib/{db,visits,staff-sections,staff-schema,sheet-row,access-guard}.ts`, `src/app/staff/{signatory-block.tsx,score/page.tsx,score/score-app.tsx}`, `src/app/api/staff/{pending,score}/**`, `db/migrations/001_checklist_visits.sql`, `scripts/migrate.ts`, matching `*.test.ts(x)`.
Reuse: `verifyCsqauCode` (`src/lib/csqau-access.ts`), `averageScore` (`src/lib/score.ts`), `TaxOfficeSelect`, `isValidTaxOffice` (`src/lib/tax-offices.ts`), the checklist table styles in `src/app/nrs-tokens.css`, `postToWebhook` (`src/lib/webhook.ts`).

## Risks and notes
- Pending/scored rows hold staff names, phones and emails (NDPA): database is server-only, retained by owner choice; access gated by passcode + lockout.
- Neon free tier scales to zero; first request after idle may take a moment.
- If the sheet webhook fails after scoring, the record is safe in the database and can be resent; a lost response before a retry could still duplicate a row, which `submission_id` makes visible.
- The current short, patterned access code should be replaced before launch.
- Existing production keeps working until step 6.7; all database changes are additive. Rollback = promote the previous deployment.
- Hostname: the QR hostname is the one thing that cannot change later; `nrssurvey.dako.studio` must stay registered and pointed at this Vercel project. Two hostnames serve the same app until the redirect is deployed.
- Outstanding owner items from earlier batches still apply (taxpayer `Code.gs` + headers, junk rows in the staff sheet, merge to `main`).
