> Read [README.md](README.md) first: context, ground rules, gate command, open questions.

# Batch 0: test harness and baseline tests
**Goal:** make "tests ensure work is done" possible. No behaviour changes.

Steps:
1. `npm i -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom`. Vitest 5 needs `@types/node` ^22 or >=24, so also bump `@types/node` to `^24` (matches Vercel's Node 24) in the same install; do not use `--force`. Confirm `package-lock.json` changed and no other lockfile appeared.
2. Create `vitest.config.mts` (`.mts` avoids a CommonJS/ESM warning): `plugins: [react()]`, `test: { environment: "jsdom", globals: true, setupFiles: ["./vitest.setup.ts"] }`, `resolve.alias: { "@": path.resolve(__dirname, "src") }`. Create `vitest.setup.ts` importing `@testing-library/jest-dom/vitest`.
3. Add `"test": "vitest run"` to `package.json` scripts. Ensure `tsconfig.json` includes the new files and `vitest/globals` types if you use globals (or import `describe/it/expect` explicitly; preferred).
4. Create `src/lib/score.ts` exporting `averageScore(values: string[]): number | null` that ignores `""`, averages the rest and rounds to 1 decimal (extract the logic currently duplicated at `staff-form.tsx:205-213` and `:230-235`; then make `staff-form.tsx` call it in both places).
5. Tests:
   - `src/lib/tax-offices.test.ts`: `TAX_OFFICES` flattened has **199** offices; Lagos has **45**; all "office, state" strings from `formatTaxOffice` are unique; each passes `isValidTaxOffice`; `isValidTaxOffice("Nonsense, Lagos")` is false; names "ETO Keffi", "GBTO Nasarawa", "ETO 9th Mile", "Non-Residence Tax Office" exist.
   - `src/lib/score.test.ts`: `[]`→null; `["","",""]`→null; `["100","50"]`→75; `["33","33","34"]`→33.3; `["0"]`→0.
6. Update `CLAUDE.md` Commands: add `npm test`; change "no test framework" sentence.

Definition of done: gate passes; `npm test` shows the new tests passing (paste output). Commit: "Add Vitest harness and baseline tests".

**Status: done.** `vitest.config.mts`, `@types/node` bumped ^20 to ^24, 11 tests passing; lint, tsc and build pass.
