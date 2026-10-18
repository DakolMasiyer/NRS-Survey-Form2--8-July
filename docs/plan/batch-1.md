> Read [README.md](README.md) first: context, ground rules, gate command, open questions.

# Batch 1: staff checklist access control (A1, A2, D1–D4): highest priority
**Design (owner-approved):** one `/staff` form. Score inputs and the TOTAL panel are hidden until a checker enters a **CSQAU access code**, which the **server** verifies. The API also rejects any score without a valid code, so hiding in the UI is not the only protection.

Before coding, read `src/lib/webhook.ts`, `src/app/api/staff/route.ts`, `scripts/staff-sheet/Code.gs` (check how blank score columns are handled; a locked submission has none).

Steps:
1. `src/lib/csqau-access.ts`: `verifyCsqauCode(code: unknown): boolean`. Reads `process.env.CSQAU_ACCESS_CODE`; **throws** an Error if unset or empty (no fallback); returns false for non-string; compares with `crypto.timingSafeEqual` on equal-length buffers.
2. `src/app/api/staff/unlock/route.ts`: `POST { code }` → 200 `{ ok: true }` if valid, 401 `{ error }` if not, 503 with a clear message if env unset (matches the webhook proxy's "not configured" status).
3. `src/app/api/staff/route.ts`: before proxying, read the JSON body from `req.clone()`. If any key matches `/^s\d+_score$/` or equals `total_score`, require header `x-csqau-code` to verify; otherwise return 403 `{ error: "Scoring requires CSQAU authorization" }`. Update the route header comment (payload now: score keys present only when authorized).
4. `staff-form.tsx`: add an "Authorize scoring (CSQAU)" control near the top (code input + button → calls `/api/staff/unlock`; on success keep the code in component state and set `unlocked`). While locked: do not render the score inputs (`:382-391`) or the TOTAL panel (`:398-416`); make `score` optional in the zod schema; omit `sN_score`/`total_score` from the payload. While unlocked: scores required as today; send `x-csqau-code` on submit. Rename the sign-off title "Checked by" → "Checked by (CSQAU)" (`:425`). Keep payload keys `checked_by_*` unchanged so sheet columns don't move.
5. `.env.local.example`: add `CSQAU_ACCESS_CODE=` with a comment (empty placeholder only).
6. Tests: `csqau-access.test.ts` (right/wrong/non-string; unset env throws). `src/app/api/staff/route.test.ts` (mock `proxyToWebhooks`): scores without header → 403 and proxy not called; scores with valid header → proxied; no score keys → proxied. `unlock/route.test.ts`: 200/401/500. `staff-form.test.tsx`: locked render has no "Score" inputs and no "TOTAL SCORE"; after a mocked successful unlock they appear.
7. Manual check (`npm run dev` with `CSQAU_ACCESS_CODE=test-code` exported in the shell, never written to a file): inspect the DOM while locked (no score inputs); `curl -X POST localhost:3000/api/staff -d '{"s1_score":90}' -H 'content-type: application/json'` returns 403. **Warning:** if `.env.local` holds real `NRS_*_WEBHOOK_URL` values, any request that passes the guard is forwarded to the live sheet. Start the dev server with those variables blanked (e.g. `NRS_SPAFF_WEBHOOK_URL= NRS_SPAFF_WEBHOOK_URL_BACKUP= CSQAU_ACCESS_CODE=test-code npm run dev`) and only send requests you expect to be rejected, or expect a 503 "not configured" from the proxy.

Definition of done: gate passes; manual checks recorded. Commit: "Hide checklist scores behind CSQAU access code".

**Status: done.** Implemented as specified; the unlock route returns 503 (not 500) when the env var is unset. 30 tests passing; tsc, lint, build pass. Locked submissions omit all `sN_score`/`total_score` keys; `Code.gs` already writes blanks (`data[key] ?? ""`), so no sheet change was needed. The form re-locks after "Submit another response".
