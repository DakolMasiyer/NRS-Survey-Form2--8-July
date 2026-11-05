> Read [README.md](README.md) first: context, ground rules, gate command, open questions.

# Batch 5: release prep (A13, A14)
1. Run the full gate. Push the branch; create a Vercel **preview** deployment (ask the owner before any production deploy).
2. Verify env vars exist in Vercel without printing values: `NRS_TAXPAYER_WEBHOOK_URL`, `NRS_SPAFF_WEBHOOK_URL` (+ `_BACKUP`s) and the new `CSQAU_ACCESS_CODE`.
3. Smoke test with obvious test data: one taxpayer and one staff submission (locked and unlocked); confirm rows land in both sheets with correct columns.
4. Owner checklist: sheet access for every field team member (A13); visit approval and Monday 19 Oct start (A14); the CSQAU access code shared only with checkers.

**Status (2026-11-04): steps 1 and 2 done; steps 3 and 4 are owner tasks.**
- Gate passed on Node 24.22 (tsc 0, lint 0 errors, 60/60 tests, build OK). Branch pushed (`dfbf89a..3023f74`).
- Preview deployed (not production): `https://nrs-service-surveys-qp0xd1ozs-dakol-masiyers-projects.vercel.app` (`dpl_C4j5Voge5pE4BPmVUvuAhAwwTG87`). It is behind Vercel Authentication; open it while logged in to Vercel, or use `vercel curl <path> --deployment <url>`.
- Verified through `vercel curl`: `/`, `/taxpayer`, `/staff` return 200 with the new content (letterhead, CSQAU access box, channels, handles). A scored POST to `/api/staff` is refused before any webhook with `503 CSQAU_ACCESS_CODE is not configured`; unlock returns the same 503.
- Vercel env vars today: `NRS_SPAFF_WEBHOOK_URL` and `NRS_TAXPAYER_WEBHOOK_URL` for **Development and Production only** (no `_BACKUP` variants, none for Preview). `CSQAU_ACCESS_CODE` is **not set anywhere**. Previews therefore cannot write to the live sheets, and cannot unlock scoring until the code is added for Preview.
- Not done: the end-to-end smoke test (needs `CSQAU_ACCESS_CODE` on Preview plus test-sheet webhook URLs for Preview), and nothing was promoted to production.

**Release (2026-11-04): deployed to production** from `feat/tax-office-dropdown` at `b58087d` (`dpl_9GskAb1GdopufkhTejMYZR6Tb1ms`), served at `https://survey.dako.studio` (A record `survey` -> 76.76.21.21 in Cloudflare, DNS only; domain attached to the Vercel project).
- Verified on the real domain: `/t` and `/s` return 307 to `/taxpayer` and `/staff`; `/spaff` returns 307 to `/staff`; both forms serve the new content; scored POST without a code returns 403; wrong unlock code returns 401. Scored/valid submissions were not tested against the live sheets.
- `CSQAU_ACCESS_CODE` is set (Production and Preview, sensitive). Redirect targets can be changed with `SHORTLINK_TAXPAYER_URL` / `SHORTLINK_STAFF_URL`.
- **Risk:** `main` does not contain this work. A later git-triggered production deploy from `main` would replace it with old code. Merge the feature branch into `main`.
- Still open: redeploy `scripts/taxpayer-sheet/Code.gs` and add "phone"/"email" headers; delete two junk rows in the staff sheet; print proof scan on real phones before printing QR codes.
