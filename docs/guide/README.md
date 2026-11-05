# NRS Service Surveys user guide

Two PDFs are built from one script (`scripts/make-guide.ts`), for two audiences:

| Variant | File | Audience | Committed? |
|---|---|---|---|
| general | `docs/guide/NRS-Service-Surveys-Guide.pdf` (8 pages, A4) | Offices and staff | Yes |
| admin | `docs/guide/admin-build/NRS-Service-Surveys-Admin-Guide.pdf` (11 pages) | The NRS administrator | **No** (git-ignored) |

The general copy has no passcode, no Google Sheets links, no hosting or database details. The admin copy adds the scoring passcode, both sheet links, where things are saved, who-to-change-what and an IT page, and is marked confidential on every page.

## Rebuild (Node 24, after `npm ci`)
```
node scripts/make-guide.ts general && bash scripts/render-guide.sh general
GUIDE_PASSCODE='<the passcode>' node scripts/make-guide.ts admin && GUIDE_PASSCODE='<the passcode>' bash scripts/render-guide.sh admin
```
The passcode is only ever read from the `GUIDE_PASSCODE` environment variable (the admin build fails without it). Never put it in a file, commit it or paste it into chat. `render-guide.sh` prints page count and font checks and fails if the general PDF contains a secret-like or vendor string, or if the admin PDF is missing the passcode or the sheet links.

## Images
`img/` holds screenshots of the live pages (`/taxpayer`, `/staff`, `/staff/score` gate, a sample of `/staff/overview`), taken with headless Chrome (GET only; the overview shot uses demo data). The scoring review screen is drawn in HTML and marked SAMPLE.
