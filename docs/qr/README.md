# Printed QR codes

| File | Use |
|---|---|
| `taxpayer-survey.pdf` / `.svg` | Public poster/handout card, 100 × 130 mm (taxpayer survey) |
| `staff-checklist.pdf` / `.svg` | Internal card (CSQAU visits only, not for public display) |
| `*-qr-only.svg` / `.png` | The bare code, to place in your own layout (keep the white border) |

Each code encodes only `https://survey.dako.studio/t` (taxpayer) or `/s` (staff). The cards show no web address.

## Changing where a code goes (no reprint)
`/t` and `/s` are temporary (307) redirects defined in `src/lib/short-link.ts`. In Vercel set
`SHORTLINK_TAXPAYER_URL` / `SHORTLINK_STAFF_URL` to an absolute `https://` URL or a path starting with `/`
(unset = `/taxpayer` and `/staff`), then redeploy or promote. Printed codes keep working.

## The one thing that cannot change
The hostname `survey.dako.studio`. Keep that domain renewed and pointed at this Vercel project.
If the host ever has to change, regenerate with `node scripts/make-qr.ts https://new-host` and reprint.

## Before printing
Scan a printed proof with two or three phones at the real size. Keep each code at least 2.5 cm wide.
