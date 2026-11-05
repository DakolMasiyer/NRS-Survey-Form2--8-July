# NRS Service Surveys user guide

`NRS-Service-Surveys-Guide.pdf` is the plain-language guide for NRS staff (10 pages, A4).
`guide.html` is the self-contained source that is printed to PDF (logo, headline font, QR codes and screenshots are embedded).

## Rebuild
```
node scripts/make-guide.ts      # writes docs/guide/guide.html (needs Node 24 and `npm ci`)
scripts/render-guide.sh         # prints the PDF with headless Chrome, then checks for forbidden text
```
`render-guide.sh` fails if the PDF text contains a passcode-like or secret-like string. The guide must never contain a passcode, token, webhook address, database connection string or personal contact detail; environment variables appear by name only.

## Images
`img/` holds screenshots of the live public pages (`/taxpayer`, `/staff`, `/staff/score` gate), taken with headless Chrome (GET only). The Submissions overview and the scoring review screen are drawn in HTML and marked SAMPLE. Replace the overview mock-up with a real screenshot once the page is live.
