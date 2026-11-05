# What this project is
NRS Service Surveys — hub page linking forms with separate URLs:
- `/` — landing hub with links to both forms
- `/taxpayer` — Taxpayer Satisfaction Survey (public)
- `/staff` — Service Optimization Checklist, step 1 (officers submit; no scoring here)
- `/staff/score` — step 2 (CSQAU scorers; passcode): pick State → Office → pending submission, score, save
- `/staff/overview` — step 3 (NRS team; same passcode): monthly view of which of the 199 offices submitted
- Short links `/t` and `/s` (env `SHORTLINK_*_URL`) are what the QR codes point at; host `nrssurvey.dako.studio`.

Design system and webhook pattern ported from `nrs-taxpayer-feedback`.

# Stack
- Next.js + TypeScript, react-hook-form + zod, deploys to Vercel.
- Package manager: **npm** (`package-lock.json`).

# Submissions
- Taxpayer: `/api/taxpayer` → `NRS_TAXPAYER_WEBHOOK_URL` (+ `_BACKUP`) → taxpayer Google Sheet. Proxy logic in `src/lib/webhook.ts`.
- Staff checklist is two-step and stored in Neon Postgres (`DATABASE_URL`, table `checklist_visits`, migration in `db/migrations/`):
  - `POST /api/staff` saves a `pending` submission (returns a reference `NRS-XXXXXXXX`).
  - CSQAU routes (`/api/staff/unlock|pending|score|overview`) need header `x-csqau-code` (`CSQAU_ACCESS_CODE`); 5 wrong tries per IP hash → 15-minute lockout (`access_attempts`). Gate: `requireCsqau` in `src/lib/staff-api.ts`.
  - Scoring is atomic (`UPDATE … WHERE status='pending'`), the server recomputes the total, then the finished row goes to `NRS_SPAFF_WEBHOOK_URL` (+ `_BACKUP`) → staff Google Sheet (last column `submission_id`); resend is idempotent.
  - Overview (`src/lib/overview.ts`): month = Africa/Lagos month; counts and dates only, never PII.
- Never run local POST tests with live webhook env vars set; blank them first.
- Guide for NRS users: `docs/guide/NRS-Service-Surveys-Guide.pdf` (rebuild: `node scripts/make-guide.ts && bash scripts/render-guide.sh`; never put the passcode in it).

# Commands
- Run locally: `npm run dev`
- Lint: `npm run lint`
- Test: `npm test` (Vitest + Testing Library)
- Build: `npm run build`
- Verification gate: `npm run lint`, `npx tsc --noEmit`, `npm run build`, `npm test`. Staged work plan in `docs/plan/`.
