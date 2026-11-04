import { SECTIONS } from "./staff-sections"
import { SIGNOFF_PREFIXES, STAFF_COLUMNS } from "./staff-columns"
import type { Signatory, Stage1Payload } from "./staff-schema"

export type SheetVisit = {
  id: string
  submitted_at: string | Date
  tax_office: string
  payload: Stage1Payload
  scores: number[]
  signoffs: Record<(typeof SIGNOFF_PREFIXES)[number], Signatory>
  total_score: number
}

export type SheetRow = Record<(typeof STAFF_COLUMNS)[number], string | number>

// Flat object whose keys are exactly STAFF_COLUMNS, ready to POST to the sheet webhook.
export function buildSheetRow(visit: SheetVisit): SheetRow {
  if (visit.payload.sections.length !== SECTIONS.length || visit.scores.length !== SECTIONS.length) {
    throw new Error(`Expected ${SECTIONS.length} sections and scores`)
  }

  const row: Record<string, string | number> = {
    submitted_at: new Date(visit.submitted_at).toISOString(),
    tax_office: visit.tax_office,
  }
  SECTIONS.forEach((section, i) => {
    row[`${section.key}_title`] = section.title
    row[`${section.key}_status`] = visit.payload.sections[i].status
    row[`${section.key}_remarks`] = visit.payload.sections[i].remarks ?? ""
    row[`${section.key}_score`] = visit.scores[i]
  })
  row.s2_staff = JSON.stringify(visit.payload.staff)
  row.total_score = visit.total_score
  for (const prefix of SIGNOFF_PREFIXES) {
    const sig = visit.signoffs[prefix]
    row[`${prefix}_name`] = sig.name
    row[`${prefix}_ir_rank`] = sig.ir_rank
    row[`${prefix}_phone`] = sig.phone
    row[`${prefix}_email`] = sig.email
  }
  row.submission_id = visit.id

  return row as SheetRow
}
