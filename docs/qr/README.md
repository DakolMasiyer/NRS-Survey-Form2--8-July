# Printed QR codes

## Posters (current design)
`poster/` holds the 2:3 posters built to match the approved reference poster (1066 x 1600 px).

| File | Use |
|---|---|
| `poster/poster-taxpayer.pdf` | Public poster, 200 x 300 mm, vector, fonts embedded. Scan target `/t`. |
| `poster/poster-staff.pdf` | Internal card (CSQAU visits), same design, scan target `/s`. |
| `poster/*.png` | 2132 x 3200 px previews / non-vector use |
| `poster/*.svg` | Editable source (uses system Tahoma, so view/print via the PDF) |

Rebuild: `node scripts/make-poster.ts` then `scripts/render-poster.sh`.

Fidelity to the reference (measured, 1066 x 1600): logo, headline, body lines, footer and QR frame all sit within
0-1 px of the reference. The QR is a 29 x 29 module code (error correction Q), the same size as the reference's.

Known differences from the reference:
- **Headline font.** The reference headline is probably Haettenschweiler (not installed, proprietary). The poster uses
  Saira Extra Condensed Black (open licence), squeezed to the reference width. Supply the original font to get an exact match.
- **Body/footer font** is Tahoma (matches the reference). It is a system font: embedded in the PDFs, but do not redistribute the font file.
- **Wording.** "It's anonymous" became "It's confidential" (the form asks for no name, but Tax ID and email are optional).
  The staff card has its own internal wording.
- **QR frame gap.** The reference leaves about 1.3 modules between the QR and the corner brackets (less than the
  usual 4-module blank border). It is kept for fidelity and scans correctly in tests, but test a printed proof.

## Small cards (earlier design)

| File | Use |
|---|---|
| `taxpayer-survey.pdf` / `.svg` | Public poster/handout card, 100 × 130 mm (taxpayer survey) |
| `staff-checklist.pdf` / `.svg` | Internal card (CSQAU visits only, not for public display) |
| `*-qr-only.svg` / `.png` | The bare code, to place in your own layout (keep the white border) |

Each code encodes only `https://nrssurvey.dako.studio/t` (taxpayer) or `/s` (staff). The cards show no web address. Codes printed earlier for `survey.dako.studio` still work, because that host redirects to `nrssurvey.dako.studio`.

## Changing where a code goes (no reprint)
`/t` and `/s` are temporary (307) redirects defined in `src/lib/short-link.ts`. In Vercel set
`SHORTLINK_TAXPAYER_URL` / `SHORTLINK_STAFF_URL` to an absolute `https://` URL or a path starting with `/`
(unset = `/taxpayer` and `/staff`), then redeploy or promote. Printed codes keep working.

## The one thing that cannot change
The hostname `nrssurvey.dako.studio`. Keep that domain renewed and pointed at this Vercel project.
If the host ever has to change, regenerate with `node scripts/make-qr.ts https://new-host` and reprint.

## Before printing
Scan a printed proof with two or three phones at the real size. Keep each code at least 2.5 cm wide.
