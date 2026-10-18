> Read [README.md](README.md) first: context, ground rules, gate command, open questions.

# Batch 3: channels grid and social handles (A9, A10, D8)
1. New `src/lib/nrs-channels.ts`: `NRS_CHANNELS` (six rows from §3 with label, detail, state key) and `NRS_SOCIALS` (Facebook `OfficialNRSNigeria`, X `@NigeriaRevenue`, Instagram `@nigeriarevenue`, LinkedIn "Nigeria Revenue Service"), `NRS_CONTACT` (helpdesk email, phone). Only values from §3; nothing invented.
2. Replace the four `FAMILIARITY_ITEMS` questions plus the separate Rev360/e-invoicing questions with one compact table (channel, details, Yes/No per row), all required. Keep `knows_*` payload keys unchanged so sheet columns don't move.
3. Rev360 comfort question: use the paper scale (Very Comfortable / Comfortable / Neutral / Uncomfortable / Never Used). It differs from the current digital scale (`taxpayer-form.tsx:40-46`), so **note in the commit that this changes stored values** and flag it to the owner.
4. Social media question: show handles beside platform icons from `NRS_SOCIALS`; replace the wrong text at `:392`.
5. Tests: all six channels render and are required; handles render from the constant; no empty entries in the constants.

Definition of done: gate passes. Commit: "Channels grid and confirmed social handles".

**Status: done.** Notes and deviations:
- Constants live in `src/lib/nrs-channels.ts` (`NRS_CHANNELS`, `NRS_SOCIALS`, `NRS_CONTACT`, `REV360_COMFORT_OPTIONS`); brand badges in `src/app/social-icon.tsx` (simple inline SVG badges, not official logos).
- The six channel rows keep the existing `knows_*` payload keys, so sheet columns are unchanged and `taxpayer-columns.test.ts` still passes. The separate Rev360 / e-invoicing / familiarity questions were merged into one numbered question; the form is now 10 numbered questions (matching the paper form).
- **Stored-value change:** the Rev360 comfort answers now use the paper scale (Very Comfortable / Comfortable / Neutral / Uncomfortable / Never Used) instead of the old wording (Very comfortable / Comfortable / Somewhat comfortable / Not comfortable / I have never used it). Old rows keep the old wording; analyse them separately.
- Rev360 comfort is still asked only when the Rev360 row is answered YES, and is still optional.
- The wrong "@nigeriarevenue … on Facebook, X, Instagram and LinkedIn" text is gone; Facebook is shown as OfficialNRSNigeria, X as @NigeriaRevenue, Instagram as @nigeriarevenue, LinkedIn by name.
- 60 tests passing; tsc, lint, build pass. Checked in a browser (desktop layout and a 390px frame); handles fit on one line at both widths.
