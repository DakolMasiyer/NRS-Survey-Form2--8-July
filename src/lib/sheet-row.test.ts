import { describe, expect, it } from "vitest"
import { buildSheetRow } from "./sheet-row"
import { SECTIONS } from "./staff-sections"
import type { Stage1Payload } from "./staff-schema"

const staff = [
  { name: "Ada", ir: "123", rank: "Officer", phone: "0801", email: "ada@nrs.gov.ng" },
  { name: "Bayo", ir: "456", rank: "Clerk", phone: "0802", email: "bayo@nrs.gov.ng" },
]
const payload: Stage1Payload = {
  tax_office: "ETO Garki, FCT",
  sections: SECTIONS.map((_, i) => (i === 2 ? { status: "NO", remarks: "No printer" } : { status: "YES" })),
  staff,
}
const sig = (n: string) => ({ name: n, ir_rank: `${n}-IR`, phone: `${n}-ph`, email: `${n}@x.ng` })

describe("buildSheetRow", () => {
  const row = buildSheetRow({
    id: "11111111-1111-4111-8111-111111111111",
    submitted_at: "2026-11-04T09:30:00.000Z",
    tax_office: payload.tax_office,
    payload,
    scores: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
    signoffs: { checked_by: sig("chk"), head_tpsu: sig("head"), controller: sig("ctl") },
    total_score: 55,
  })

  it("fills the header fields and ISO timestamp", () => {
    expect(row.submitted_at).toBe("2026-11-04T09:30:00.000Z")
    expect(row.tax_office).toBe("ETO Garki, FCT")
    expect(row.submission_id).toBe("11111111-1111-4111-8111-111111111111")
    expect(row.total_score).toBe(55)
  })

  it("converts a Date to an ISO string", () => {
    const r = buildSheetRow({
      id: "x",
      submitted_at: new Date("2026-11-04T09:30:00Z"),
      tax_office: payload.tax_office,
      payload,
      scores: Array(10).fill(1),
      signoffs: { checked_by: sig("a"), head_tpsu: sig("b"), controller: sig("c") },
      total_score: 1,
    })
    expect(r.submitted_at).toBe("2026-11-04T09:30:00.000Z")
  })

  it("writes titles, statuses, remarks (empty when absent) and numeric scores per section", () => {
    expect(row.s1_title).toBe(SECTIONS[0].title)
    expect(row.s10_title).toBe(SECTIONS[9].title)
    expect(row.s1_status).toBe("YES")
    expect(row.s1_remarks).toBe("")
    expect(row.s3_status).toBe("NO")
    expect(row.s3_remarks).toBe("No printer")
    expect(row.s1_score).toBe(10)
    expect(row.s10_score).toBe(100)
    expect(typeof row.s5_score).toBe("number")
  })

  it("serialises staff as the JSON the form used to send", () => {
    expect(row.s2_staff).toBe(JSON.stringify(staff))
    expect(JSON.parse(row.s2_staff as string)).toEqual(staff)
  })

  it("flattens the three sign-off blocks", () => {
    expect(row.checked_by_name).toBe("chk")
    expect(row.checked_by_ir_rank).toBe("chk-IR")
    expect(row.head_tpsu_phone).toBe("head-ph")
    expect(row.controller_email).toBe("ctl@x.ng")
  })

  it("throws if the score count is wrong", () => {
    expect(() =>
      buildSheetRow({
        id: "x",
        submitted_at: new Date(),
        tax_office: payload.tax_office,
        payload,
        scores: [1, 2],
        signoffs: { checked_by: sig("a"), head_tpsu: sig("b"), controller: sig("c") },
        total_score: 1,
      })
    ).toThrow()
  })
})
