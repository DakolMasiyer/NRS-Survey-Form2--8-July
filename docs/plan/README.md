# NRS Service Surveys: post-walkthrough execution plan (LLM-agnostic)

Written so any competent LLM or developer can execute it cold. Nothing here depends on Claude-specific tools. Each batch is self-contained: goal, files, steps, tests, commands, definition of done.

Hand an executor this README plus **one** batch file at a time.

## 1. Context

NRS (Nigeria Revenue Service) Customer Service Group uses two QR-code web forms in field visits, starting **Mon 19 Oct 2026** (today is Sat 17 Oct):
- `/taxpayer`: Taxpayer Satisfaction Survey (public).
- `/staff`: Service Optimization Checklist (internal assessors, auto-scored).

The 16 Oct walkthrough produced the action items below (source: `/Users/dakolmasiyer/Projects/nrs-service-optimization/meeting/NRS_Walkthrough_Analysis.md`; paper forms: `~/Downloads/NRS.pdf` = taxpayer form, `~/Downloads/NIGERIA.pdf` = checklist; offices: `~/Downloads/TAXPAYER SERVICE UNITS NATIONWIDE.docx1 (1)1.pdf`; social screenshots on Desktop dated 2026-10-17 19:00).

Repo: `/Users/dakolmasiyer/Projects/nrs-service-surveys`, branch `feat/tax-office-dropdown` (clean at plan time). Stack: Next.js + TypeScript, react-hook-form + zod, Vercel. Package manager **npm** (`package-lock.json`). No tests exist yet.

## 2. Ground rules for every executor (from the project's CLAUDE.md and the owner's standing instructions)
1. Read each file before editing it. Keep changes minimal and surgical; no unrelated "improvements".
2. TypeScript only. Use **npm** (never pnpm/yarn). Raise errors explicitly; **no silent fallbacks** or swallowed exceptions.
3. **Never write a real secret** into any file, including docs and `.env.local.example` (placeholder names only).
4. If something isn't in this plan or the meeting analysis, don't build it; ask the owner.
5. Do not say "done" until the batch gate passes and you have pasted the real command output. "Should work" doesn't count.
6. One batch = one commit on the feature branch. Do not start batch N+1 if batch N's gate fails.
7. Commit messages end with the repo's attribution line only if your tool requires one; otherwise plain messages are fine.

**Batch gate (run all, all must pass):**
```
npm run lint
npx tsc --noEmit
npm run build
npm test            # available from Batch 0 onwards
```

## 3. Findings that shape the plan
- **Offices (A3/A4) are already done.** The units PDF has exactly **199** numbered offices; `src/lib/tax-offices.ts` has the same 199. Differences are only PDF glitches ("KefÏ", "OfÏce"), PDF typo "Nassaraw" (repo has correct "Nasarawa") and "9 Mile" (repo: "9th Mile"). The "174" figure from the meeting is wrong. Lagos has 45 units (Island 21 + Mainland East 14 + Mainland West 10). Work left: a regression test only.
- **Tagline confirmed:** "Inspiring Trust, Sustaining Growth" (handwritten on the paper form; printed on the official NRS flyer). Address on the paper form: "Plot 1241, Kur Mohammed Avenue, Central Business District, Abuja, FCT". (The units PDF's "Together We Rise…" / "20 Sokode Crescent" is a different document; owner chose the paper-form version.)
- **Social/contact data confirmed from screenshots:** Facebook `OfficialNRSNigeria` (page "Nigeria Revenue Service - NRS"); X `@NigeriaRevenue`; Instagram `@nigeriarevenue`; LinkedIn "Nigeria Revenue Service" (name only, no URL seen); email `helpdesk@nrs.gov.ng`; phone `+234 209 460 2700` (write as `0209 460 2700` on the form like the paper copy). Existing copy `@nigeriarevenue on Facebook, X, Instagram and LinkedIn` (`taxpayer-form.tsx:392`) is wrong. TikTok/YouTube handles are not visible; leave them out until the owner adds them.
- **Paper checklist sign-off has 4 blocks** (Checked by [handwritten "CSQAU"], Head HCSU, Tax Controller/State Monitor, Regional Administrator), each with name, IR/Rank, sign/date, phone, email. Code has 3 blocks and "Head TPSU". **Do not change** the block list until the owner confirms (see §6).
- **Paper taxpayer form:** Sections A–E, 10 numbered questions; Q7 is a channels table (website www.nrs.gov.ng, contact centre 0209 460 2700, USSD *829#, Tax ID Portal taxid.nrs.gov.ng, Rev360 Self-Service Portal selfservice.nrs.gov.ng, E-Invoicing Platform "—"); Q8 comfort scale is Very Comfortable / Comfortable / Neutral / Uncomfortable / Never Used; closing lines "WE THANK YOU FOR YOUR TIME AND FEEDBACK!" and "Powered by the Customer Service Group, Nigeria Revenue Service (NRS)".

## 4. Action items → batches

| ID | Action (from meeting) | Status | Batch |
|---|---|---|---|
| A1 (D1–D3) | Hide scores from field officer; checker-only scoring | To do | 1 |
| A2 (D4) | Rename "Checked by" to CSQAU wording | To do | 1 |
| A3/A4 | Full office list; verify count | **Done (199)**, add test | 0 |
| A5 | Balanced Scorecard template | Blocked (owner/Joy Fan) | 4 |
| A6 | Attribute-to-tool mapping | Blocked on A5 | 4 |
| A7 | Auto-ranking of offices | Parked by meeting; **not in plan** | none |
| A8 | Header: logo, SMO above CSG, centred, stacked, tagline | To do | 2b |
| A9 | Social handles/contacts beside channel icons | Unblocked (data in §3) | 3 |
| A10 | Re-check digital vs paper form; match its look | To do | 2b, 3 |
| A11 | Restore Section A/B content, optional | To do | 2 |
| A12 (D10) | Asterisk/optional rules | To do | 2 |
| D8 | 5-minute length; compact channels grid | To do | 2, 3 |
| D9 | Business/Tax-ID section optional | To do | 2 |
| D11 | Tax Office not numbered | To do | 2 |
| A13 | Confirm field team has sheet access | Owner task | 5 |
| A14 | Confirm approval + Monday start | Owner task | 5 |

---

## Batch files

- [batch-0.md](batch-0.md): Batch 0: test harness and baseline tests
- [batch-1.md](batch-1.md): Batch 1: staff checklist access control (A1, A2, D1–D4): highest priority
- [batch-2.md](batch-2.md): Batch 2: taxpayer form content fixes (D9–D11, A11, A12, D8)
- [batch-2b.md](batch-2b.md): Batch 2b: letterhead and paper-form look (A8, A10): before Monday
- [batch-3.md](batch-3.md): Batch 3: channels grid and social handles (A9, A10, D8)
- [batch-4.md](batch-4.md): Batch 4: blocked on NRS (A5, A6)
- [batch-5.md](batch-5.md): Batch 5: release prep (A13, A14)
- [batch-6.md](batch-6.md): Batch 6: two-step staff checklist (officer submits, CSQAU scorer reviews and scores). **Approved, in progress (Neon + Vercel storage design).**

---

## 6. Assumptions and open questions (confirm with the owner; don't guess)
1. **Locked submissions are allowed** (officers can submit status/remarks without scores; rows have blank score columns). If the owner wants officers to be unable to submit at all, Batch 1 step 4 changes.
2. **Sign-off blocks:** paper form has a 4th "Regional Administrator" block and "Head HCSU" (code: "Head TPSU"). Change only on owner confirmation.
3. **Sheet columns:** Batch 2's phone/email split changes the taxpayer payload; confirm the sheet and `Code.gs` before deploying.
4. **Rev360 comfort scale** change (Batch 3) alters stored values.
5. The access code is a shared secret, not per-user identity. It does not record who scored; per-user logins remain the long-term option from the meeting.

## 7. Files most affected
`vitest.config.ts`, `vitest.setup.ts`, `package.json`, `CLAUDE.md`, `.env.local.example`, `src/lib/score.ts`, `src/lib/csqau-access.ts`, `src/lib/nrs-channels.ts`, `src/app/letterhead.tsx`, `src/app/form-controls.tsx`, `src/app/nrs-tokens.css`, `src/app/staff/page.tsx`, `src/app/staff/staff-form.tsx`, `src/app/api/staff/route.ts`, `src/app/api/staff/unlock/route.ts`, `src/app/taxpayer/page.tsx`, `src/app/taxpayer/taxpayer-form.tsx`, `src/app/api/taxpayer/route.ts`, `scripts/*/Code.gs` (only if columns change), plus matching `*.test.ts(x)` files.
