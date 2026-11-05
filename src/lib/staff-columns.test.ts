import { readFileSync } from "node:fs"
import path from "node:path"
import vm from "node:vm"
import { describe, expect, it } from "vitest"
import { buildSheetRow } from "./sheet-row"
import { STAFF_COLUMNS } from "./staff-columns"
import { SECTIONS } from "./staff-sections"
import type { Stage1Payload } from "./staff-schema"

const gs = readFileSync(path.join(process.cwd(), "scripts/staff-sheet/Code.gs"), "utf8")

// Run Code.gs in a bare context (doPost is only defined, never called) and read HEADERS.
function appsScriptHeaders(): string[] {
  return vm.runInNewContext(`${gs}\nHEADERS`) as string[]
}

const person = { name: "A", ir: "1", rank: "R", phone: "080", email: "a@x.ng" }
const sig = { name: "S", ir_rank: "IR", phone: "081", email: "s@x.ng" }
const payload: Stage1Payload = {
  tax_office: "ETO Garki, FCT",
  sections: SECTIONS.map(() => ({ status: "YES" as const })),
  staff: [person],
}

describe("staff sheet columns", () => {
  it("matches HEADERS in the Apps Script, in order", () => {
    expect(appsScriptHeaders()).toEqual([...STAFF_COLUMNS])
  })

  it("has no duplicate columns and ends with submission_id", () => {
    expect(new Set(STAFF_COLUMNS).size).toBe(STAFF_COLUMNS.length)
    expect(STAFF_COLUMNS[STAFF_COLUMNS.length - 1]).toBe("submission_id")
  })

  it("starts with submitted_at, tax_office, then the section blocks", () => {
    expect(STAFF_COLUMNS.slice(0, 6)).toEqual(["submitted_at", "tax_office", "s1_title", "s1_status", "s1_remarks", "s1_score"])
    expect(STAFF_COLUMNS).toHaveLength(2 + SECTIONS.length * 4 + 2 + 12 + 1)
  })

  it("buildSheetRow returns exactly the columns", () => {
    const row = buildSheetRow({
      id: "11111111-1111-4111-8111-111111111111",
      submitted_at: new Date("2026-11-04T10:00:00Z"),
      tax_office: payload.tax_office,
      payload,
      scores: SECTIONS.map(() => 50),
      signoffs: { checked_by: sig, head_tpsu: sig, controller: sig },
      total_score: 50,
    })
    expect(Object.keys(row)).toEqual([...STAFF_COLUMNS])
    expect(Object.keys(row).at(-1)).toBe("submission_id")
  })
})
