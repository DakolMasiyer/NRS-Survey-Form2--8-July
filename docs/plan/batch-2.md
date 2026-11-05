> Read [README.md](README.md) first: context, ground rules, gate command, open questions.

# Batch 2: taxpayer form content fixes (D9–D11, A11, A12, D8)
Read `src/app/taxpayer/taxpayer-form.tsx`, `src/app/form-controls.tsx` (`QuestionLabel` already supports `optional`), `src/app/api/taxpayer/route.ts`, `scripts/taxpayer-sheet/Code.gs`.

Steps:
1. Tax Office stays first but **unnumbered** (`taxpayer-form.tsx:191`: render without `num`); remaining questions number from 1 (`next()` starts after the office).
2. `has_tax_id` becomes optional in the zod schema (`:54`); Section A fields stay optional (trade-fair use). Business details block (RC/BN, address, line of business) shown for NO as today.
3. Split `phone_email` into `phone` and `email` fields (paper form has separate lines). Update schema, defaults, payload, the route header comment and `Code.gs` column handling. **Check the live sheet's header row before deploying**; a changed column set can misalign existing rows. If unsure, ask the owner; do not guess.
4. Required/optional rule (D10): everything required **except** fields marked optional; mark optional ones with `QuestionLabel optional`; no asterisks on required ones.
5. Page text in `taxpayer/page.tsx`: "about 5 minutes" (replace "≈ 3 minutes" at `:36,:43`); remove the hard-coded "14 questions" (`:47`) or derive it from a shared constant. (Header/letterhead is Batch 2b.)
6. Tests: schema accepts an empty Section A and missing `has_tax_id`; rejects missing Tax Office; first rendered question number is 1 and Tax Office has no number; payload keys equal the documented column list (export the key list from one place and assert it matches the route header comment).

Definition of done: gate passes. Commit: "Taxpayer form: optional Section A, unnumbered office, split phone/email".

**Status: done.** Implementation notes and deviations:
- Column handling (step 3): to keep existing sheet rows aligned, `phone_email` stays in its old position as a legacy column (no longer sent) and `phone`, `email` are **appended at the end**. Single source: `src/lib/taxpayer-columns.ts`; `taxpayer-columns.test.ts` fails if the form schema, the route header comment or `scripts/taxpayer-sheet/Code.gs` drift.
- **Release step (owner):** redeploy `Code.gs` (clasp) *and* add `phone`, `email` to the end of the live sheet's header row by hand (headers are only written to an empty sheet). If the script isn't redeployed first, the new phone/email values are silently dropped by the old script.
- D10: `QuestionLabel` no longer renders a red `*`; optional questions/fields say "(optional)". This also removes the star from the Tax Office and Sign-off labels on `/staff`.
- The "14 questions" chip was removed (the real count is 15 after this batch and changes again in Batch 3); time text now says 5 minutes.
- 44 tests passing; tsc, lint, build pass. No requests were sent to any webhook.
