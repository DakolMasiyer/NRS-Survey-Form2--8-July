> Read [README.md](README.md) first: context, ground rules, gate command, open questions.

# Batch 2b: letterhead and paper-form look (A8, A10): before Monday
**Goal:** both pages look like the real forms (centred logo, stacked offices, tagline, red section bars) and stay responsive at 390px width (QR use). The nav stays as site chrome.

Read `src/app/chrome.tsx`, `src/app/nrs-logo.ts` (`NRS_LOGO` base64 JPEG, reuse it), `src/app/nrs-tokens.css` (tokens `--nrs-navy #0D1A3A`, `--nrs-red #b91c1c`; existing `.nrs-form-card*`, `.nrs-section-*`, `.nrs-form-divider`).

Steps:
1. New `src/app/letterhead.tsx` (server-safe component): props `title`, `subtitle?`, `unit` ("CUSTOMER SERVICE GROUP" or "CUSTOMER SERVICE QUALITY ASSURANCE UNIT"), `intro?`. Renders, centred and stacked, top to bottom: logo (about 100px high) → tagline "Inspiring Trust, Sustaining Growth" → "STRATEGIC MANAGEMENT OFFICE" → unit line → address "Plot 1241, Kur Mohammed Avenue, Central Business District, Abuja, FCT" (grey) → thin red rule → bold centred title → red italic subtitle → intro paragraph. Style via new classes in `nrs-tokens.css`.
2. Taxpayer page: remove the red-icon header, meta chips and badge (`taxpayer/page.tsx:19-49`); use `<Letterhead title="TAXPAYER SATISFACTION SURVEY" subtitle="Help us serve you better — takes about 5 minutes" intro="Your feedback helps the Nigeria Revenue Service (NRS) improve tax administration and taxpayer support. Responses are confidential, used strictly for service-improvement purposes, and handled in line with the Nigeria Data Protection Act (NDPA) 2023. Providing your Tax ID or contact details is optional unless stated otherwise." />`.
3. Staff page: same treatment with title "CHECKLIST FOR THE OPTIMIZATION OF CUSTOMER SERVICE UNITS / SELF-SERVICE STATIONS" and the CSQAU unit line (`staff/page.tsx:19-50`).
4. Add `SectionBar` to `form-controls.tsx` (full-width red bar, white caps text) and use it in the taxpayer form for: A "Taxpayer / Business Information", B "Tax Compliance", C "Service Experience", D "Digital Channels & Awareness", E "Your Feedback". Question numbers red, question text bold, as on paper.
5. Staff checklist: render each section as a bordered row with SN, Issues (the item list), YES/NO, Remarks / Actions Required, and Score (only when unlocked, from Batch 1); stack as cards below 640px.
6. Footer lines under the submit button: "WE THANK YOU FOR YOUR TIME AND FEEDBACK!" and "Powered by the Customer Service Group, Nigeria Revenue Service (NRS)".
7. Tests (Testing Library): letterhead renders "STRATEGIC MANAGEMENT OFFICE" before the unit line (compare DOM order), tagline and address present; five section bars in A–E order; staff table has no Score column while locked.
8. Visual check: `npm run dev`, screenshot `/taxpayer` and `/staff` at 1280px and 390px wide, and compare with page 1 of `NRS.pdf` and `NIGERIA.pdf`. **Show the screenshots to the owner and wait for sign-off**; match to the eye is subjective and not testable by assertion.

Definition of done: gate passes and owner approves the screenshots. Commit: "Letterhead and paper-form styling for both forms".

**Status: built and committed; waiting for owner sign-off on the screenshots (step 8).** Notes and deviations:
- `Letterhead` takes `units: string[]` (not one `unit`) because the paper checklist stacks Strategic Management Office, Customer Service Group and the CSQAU line. The address is shown on the taxpayer form only (the paper checklist has none).
- The letterhead title is the page's `<h1>`; the old red-icon card header, meta chips, section badge and page `<h2>`/subtitle were removed from both pages.
- Question numbers are now plain bold red numerals ("1.", as on paper) instead of red circles; this applies on both forms.
- Staff card is wider (`.nrs-form-card--wide`, 1040px). The checklist is a table (S/N, Issues, Yes/No, Remarks, Score) and stacks into labelled cards under 760px. The Score column exists only after unlock.
- Closing "WE THANK YOU…" and "Powered by…" lines are on the taxpayer form only (they are not on the paper checklist).
- Visual check done at 1280px and at 390px (390px via a 390px-wide iframe, because the browser would not shrink below desktop width). 51 tests passing; tsc, lint, build pass.
- Not changed (out of scope): the nav CTA button ("Start Survey" / "Open Checklist") has dark text on red, which is low contrast.
