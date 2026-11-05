import { SECTIONS } from "./staff-sections"

/*
 * Spreadsheet column order for the staff checklist. Keep in step with
 * buildHeaders() in scripts/staff-sheet/Code.gs and buildSheetRow() in
 * src/lib/sheet-row.ts (staff-columns.test.ts fails if they drift).
 *
 * submission_id is the last column.
 */
export const SIGNOFF_PREFIXES = ["checked_by", "head_tpsu", "controller"] as const

export const STAFF_COLUMNS = [
  "submitted_at",
  "tax_office",
  ...SECTIONS.flatMap((s) => [`${s.key}_title`, `${s.key}_status`, `${s.key}_remarks`, `${s.key}_score`]),
  "s2_staff",
  "total_score",
  ...SIGNOFF_PREFIXES.flatMap((p) => [`${p}_name`, `${p}_ir_rank`, `${p}_phone`, `${p}_email`]),
  "submission_id",
] as const
