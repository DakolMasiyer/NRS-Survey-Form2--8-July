# What this project is
NRS Service Surveys — hub page linking two forms with separate URLs:
- `/` — landing hub with links to both forms
- `/taxpayer` — Taxpayer Satisfaction Survey (public)
- `/staff` — Service Optimization Checklist (internal assessors, auto-scored)

Design system and webhook pattern ported from `nrs-taxpayer-feedback`.

# Stack
- Next.js + TypeScript, react-hook-form + zod, deploys to Vercel.
- Package manager: **npm** (`package-lock.json`).

# Submissions
Each form posts to its own API route which fans out to per-form webhooks:
- `/api/taxpayer` → `NRS_TAXPAYER_WEBHOOK_URL` (+ `_BACKUP`)
- `/api/staff` → `NRS_SPAFF_WEBHOOK_URL` (+ `_BACKUP`)
Shared proxy logic in `src/lib/webhook.ts`. See route file headers for payload columns.

# Commands
- Run locally: `npm run dev`
- Lint: `npm run lint`
- Test: `npm test` (Vitest + Testing Library)
- Build: `npm run build`
- Verification gate: `npm run lint`, `npx tsc --noEmit`, `npm run build`, `npm test`. Staged work plan in `docs/plan/`.
