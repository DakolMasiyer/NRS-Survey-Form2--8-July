> Read [README.md](README.md) first: context, ground rules, gate command.

# Batch 6: two-step staff checklist (officer submits, CSQAU scorer reviews and scores)

**Status: proposed, awaiting owner approval. Nothing here is built.**

## Why
Officers and CSQAU scorers work at **separate times**. Today there is one form and one submission, so an unscored submission can never be completed later (the scorer would have to retype everything and create a duplicate row). The scorer must be able to open the officer's saved answers, review them, and add scores.

## Owner decisions (2026-11-04)
| Question | Decision |
|---|---|
| Where are pending submissions stored? | **Google Sheet via Apps Script** (a "Pending" tab in the existing staff spreadsheet). Supabase was recommended and declined. |
| Scorer's dropdown | **State -> Office -> that office's pending submissions** (reuse `TaxOfficeSelect`, then list by date). |
| Head HCSU / Tax Controller details | Typed **on the scorer's screen after scoring** (two steps, not three). |
| Can the scorer edit officer answers? | **No, view only.** |
| Assumed, confirm | The final row reaches the main sheet (`Sheet1`) **only when scored**, so it has no blank score columns. |

## Flow
1. **Officer, `/staff`:** fills sections (status, remarks), staff list, tax office. No scores, no code. Submit stores a **pending** record and returns a short id. The form no longer has the unlock box or any score field.
2. **Scorer, `/staff/score`:** enters the CSQAU access code (kept in page memory, as now), picks State -> Office, then one of that office's pending submissions (date/time, first staff name for recognition). The officer's answers load **read-only**.
3. The scorer enters a score (0-100) per section, plus Checked by (CSQAU), Head and Tax Controller details, and saves.
4. The server validates, **recomputes the total**, appends the complete row to `Sheet1` (existing columns, unchanged), and marks the pending row **scored**.

## Design (Google Sheet / Apps Script as the store)
**Pending tab** (auto-created): `id, submitted_at, tax_office, status, payload_json, scored_at`. `payload_json` is the whole stage-1 payload (cell limit 50,000 characters: the server must reject a payload over 45,000 characters with a clear error).

**Apps Script actions** (extend `scripts/staff-sheet/Code.gs`, one `doPost` that switches on `action`):
| Action | Does |
|---|---|
| `submit_pending` | Appends to Pending with a new UUID, status `pending`. Returns `{id}`. |
| `list_pending` `{tax_office}` | Returns that office's `pending` rows: `{id, submitted_at, first_staff_name}`. |
| `get_pending` `{id}` | Returns the stored payload for a pending id. |
| `complete` `{id, scores, signoffs, total}` | Under `LockService` (10 s wait): refuses if not `pending` (`conflict`), appends the merged final row to `Sheet1`, marks Pending `scored` + `scored_at`. |

**Auth between Next.js and Apps Script:** every action carries `secret` in the JSON body (Apps Script cannot read headers), compared with Script Property `STAFF_SHEET_SECRET`; mismatch returns `unauthorized`. The same value is Vercel env `STAFF_SHEET_SECRET`. The existing unauthenticated "append a row" path stays **only during the transition** and is removed in step 6.6 (it is an existing hole: anyone with the web-app URL can append rows).

**Next.js routes** (all verify the CSQAU code with `verifyCsqauCode`, header `x-csqau-code`, except the officer submit):
- `POST /api/staff` -> officer submit; **rejects any score key** (stage 1 never carries scores); forwards `submit_pending`.
- `POST /api/staff/pending/list`, `.../get` -> code required, forward the read actions.
- `POST /api/staff/score` -> code required; server validates: `id` present, 10 scores each a number 0-100, sign-off blocks all non-empty; **recomputes `total_score` with `averageScore`** (`src/lib/score.ts`) and ignores any client total; forwards `complete`; maps `conflict` to HTTP 409.
- `/api/staff/unlock` stays.

**Webhook backup:** `NRS_SPAFF_WEBHOOK_URL_BACKUP` (Power Automate) cannot read or update, so it only receives the final scored row, posted by the Next.js route after `complete` succeeds (reuse `postToWebhook` from `src/lib/webhook.ts`). Not set in Vercel today.

## Known limits of this choice (owner accepted)
Apps Script is slow (1-3 s per call), has no transactions (the lock covers concurrent scoring), scans the sheet on each read (fine for hundreds of rows), and the shared secret + CSQAU code are the only access control. Pending rows contain staff names, phones and emails, so **read access must be gated by the access code**, and the code should be **long and random**. Recommend replacing the current short, patterned `CSQAU_ACCESS_CODE` before launch (never write the value in any file).

## Steps (one commit per step; gate after each; see README)
**6.1 Apps Script store + test harness.** Extend `Code.gs` as above. Add `scripts/staff-sheet/code.test.ts`: load `Code.gs` into a Node `vm` context with fake `SpreadsheetApp`, `LockService`, `PropertiesService`, `ContentService`, `Utilities` (in-memory sheets). Tests: submit then list shows it; list filters by office and hides scored rows; get returns the payload; complete appends the right columns in `HEADERS` order and marks scored; second complete returns `conflict`; wrong or missing secret returns `unauthorized` for every action; payload over 45,000 characters is refused; legacy append still works until 6.6.

**6.2 Server routes + validation.** New `src/lib/staff-sheet.ts` (calls the Apps Script URL with the secret; raises on non-OK, never swallows). Routes as above. Tests with mocked `fetch`: officer submit with a score key is rejected; list/get/score without the code return 403; invalid scores (negative, 101, NaN, missing) rejected; client-sent `total_score` ignored and recomputed; 409 on conflict; a missing `STAFF_SHEET_SECRET` or webhook URL returns a clear 503.

**6.3 Officer form.** `staff-form.tsx`: remove the unlock box, score inputs, total panel and sign-off blocks; submit shows "Submitted for scoring" with the reference id. Keep the table look. Update tests (no score column ever; submit payload has no score keys and no sign-off blocks).

**6.4 Scorer page.** New `src/app/staff/score/page.tsx` + `score-form.tsx`: code box, `TaxOfficeSelect`, pending list, read-only answers (same table look, inputs disabled), score column, sign-off blocks, save. Handles 401/403/409 with clear messages. Tests: code gate, list and select, answers are read-only, scores required, save sends the id and scores (no total), conflict message.

**6.5 Short link and QR.** Decide whether the staff QR (`/s`) points at the officer form (`/staff`) or the scorer page (`/staff/score`); the poster says "Scan the code below to begin." Default: officer form. No reprint needed either way (see `src/lib/short-link.ts`).

**6.6 Release (owner steps marked).**
1. **Owner:** make a copy of the staff spreadsheet named "... TEST" and attach the same script there for testing; set Script Property `STAFF_SHEET_SECRET` (long random); deploy it as a web app; give the TEST web-app URL to Vercel **Preview** only.
2. Run the full flow on a Preview against the TEST sheet (officer submit -> scorer lists, opens, scores -> row appears in TEST `Sheet1`, Pending marked scored; second scorer gets the conflict message).
3. **Owner:** `clasp push` (or paste `Code.gs`) to the live script and **Deploy > Manage deployments > Edit > New version** on the existing deployment (the URL must not change); set `STAFF_SHEET_SECRET` in Script Properties and in Vercel Production.
4. Replace `CSQAU_ACCESS_CODE` with a long random value (Production + Preview), tell the checkers.
5. Deploy to production (explicit owner go-ahead), smoke-test with one obvious test record, then delete it.
6. Remove the legacy unauthenticated append path from `Code.gs` and redeploy the script.

## Definition of done
Gate passes after every step; the TEST end-to-end flow works; two scorers cannot both score one record; no score is ever accepted from `/api/staff`; the total in the sheet is always the server-computed one.
