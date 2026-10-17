> Read [README.md](README.md) first: context, ground rules, gate command, open questions.

# Batch 5: release prep (A13, A14)
1. Run the full gate. Push the branch; create a Vercel **preview** deployment (ask the owner before any production deploy).
2. Verify env vars exist in Vercel without printing values: `NRS_TAXPAYER_WEBHOOK_URL`, `NRS_SPAFF_WEBHOOK_URL` (+ `_BACKUP`s) and the new `CSQAU_ACCESS_CODE`.
3. Smoke test with obvious test data: one taxpayer and one staff submission (locked and unlocked); confirm rows land in both sheets with correct columns.
4. Owner checklist: sheet access for every field team member (A13); visit approval and Monday 19 Oct start (A14); the CSQAU access code shared only with checkers.
