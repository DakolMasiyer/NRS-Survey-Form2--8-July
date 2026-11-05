import { describe, expect, it } from "vitest"
import { scoringSchema, stage1Schema } from "./staff-schema"
import { SECTIONS } from "./staff-sections"

const person = { name: "A", ir: "1", rank: "R", phone: "080", email: "a@x.ng" }
const sig = { name: "S", ir_rank: "IR", phone: "081", email: "s@x.ng" }
const ID = "11111111-1111-4111-8111-111111111111"

function stage1(over: Record<string, unknown> = {}) {
  return {
    tax_office: "ETO Garki, FCT",
    sections: SECTIONS.map((s) => ({ status: s.listOnly ? "N/A" : "YES", remarks: "ok" })),
    staff: [person],
    ...over,
  }
}

function scoring(over: Record<string, unknown> = {}) {
  return {
    id: ID,
    scores: SECTIONS.map(() => 80),
    signoffs: { checked_by: sig, head_tpsu: sig, controller: sig },
    ...over,
  }
}

describe("stage1Schema", () => {
  it("accepts a valid payload (remarks optional)", () => {
    expect(stage1Schema.safeParse(stage1()).success).toBe(true)
    const noRemarks = stage1({ sections: SECTIONS.map((s) => ({ status: s.listOnly ? "N/A" : "NO" })) })
    expect(stage1Schema.safeParse(noRemarks).success).toBe(true)
  })

  it("treats the Number of staff row as a heading: N/A only there, YES/NO everywhere else", () => {
    const base = SECTIONS.map((s) => ({ status: s.listOnly ? "N/A" : "YES" }))
    const s2 = SECTIONS.findIndex((s) => s.key === "s2")
    expect(s2).toBeGreaterThan(-1)
    const answeredHeading = base.map((s, i) => (i === s2 ? { status: "YES" } : s))
    expect(stage1Schema.safeParse(stage1({ sections: answeredHeading })).success).toBe(false)
    const naQuestion = base.map((s, i) => (i === 0 ? { status: "N/A" } : s))
    expect(stage1Schema.safeParse(stage1({ sections: naQuestion })).success).toBe(false)
  })

  it.each(["score", "total_score", "checked_by"])("rejects an unknown top-level key: %s", (key) => {
    expect(stage1Schema.safeParse(stage1({ [key]: 1 })).success).toBe(false)
  })

  it("rejects a score on a section", () => {
    const sections = SECTIONS.map(() => ({ status: "YES", score: 50 }))
    expect(stage1Schema.safeParse(stage1({ sections })).success).toBe(false)
  })

  it("rejects 9 or 11 sections", () => {
    expect(stage1Schema.safeParse(stage1({ sections: SECTIONS.slice(1).map(() => ({ status: "YES" })) })).success).toBe(false)
    expect(stage1Schema.safeParse(stage1({ sections: [...SECTIONS, SECTIONS[0]].map(() => ({ status: "YES" })) })).success).toBe(false)
  })

  it("rejects a bad status", () => {
    const sections = SECTIONS.map(() => ({ status: "MAYBE" }))
    expect(stage1Schema.safeParse(stage1({ sections })).success).toBe(false)
  })

  it("rejects an invalid or empty office", () => {
    expect(stage1Schema.safeParse(stage1({ tax_office: "Nowhere, FCT" })).success).toBe(false)
    expect(stage1Schema.safeParse(stage1({ tax_office: "" })).success).toBe(false)
  })

  it("rejects an empty staff list and an incomplete staff member", () => {
    expect(stage1Schema.safeParse(stage1({ staff: [] })).success).toBe(false)
    expect(stage1Schema.safeParse(stage1({ staff: [{ ...person, email: "" }] })).success).toBe(false)
  })

  it("rejects remarks over 2000 characters", () => {
    const sections = SECTIONS.map(() => ({ status: "YES", remarks: "x".repeat(2001) }))
    expect(stage1Schema.safeParse(stage1({ sections })).success).toBe(false)
  })
})

describe("scoringSchema", () => {
  it("accepts 10 valid scores, including the 0 and 100 bounds", () => {
    expect(scoringSchema.safeParse(scoring()).success).toBe(true)
    expect(scoringSchema.safeParse(scoring({ scores: [0, 100, 0, 100, 0, 100, 0, 100, 0, 100] })).success).toBe(true)
  })

  it("rejects 9 or 11 scores", () => {
    expect(scoringSchema.safeParse(scoring({ scores: Array(9).fill(50) })).success).toBe(false)
    expect(scoringSchema.safeParse(scoring({ scores: Array(11).fill(50) })).success).toBe(false)
  })

  it.each([-1, 101, NaN, Infinity, "50"])("rejects a bad score: %s", (bad) => {
    const scores: unknown[] = SECTIONS.map(() => 50)
    scores[3] = bad
    expect(scoringSchema.safeParse(scoring({ scores })).success).toBe(false)
  })

  it("rejects a missing sign-off field and a missing sign-off block", () => {
    const { phone: _phone, ...partial } = sig
    void _phone
    expect(
      scoringSchema.safeParse(scoring({ signoffs: { checked_by: partial, head_tpsu: sig, controller: sig } })).success
    ).toBe(false)
    expect(scoringSchema.safeParse(scoring({ signoffs: { checked_by: sig, head_tpsu: sig } })).success).toBe(false)
  })

  it("rejects a non-uuid id", () => {
    expect(scoringSchema.safeParse(scoring({ id: "123" })).success).toBe(false)
  })

  it("rejects extra keys (e.g. a client-sent total)", () => {
    expect(scoringSchema.safeParse(scoring({ total_score: 80 })).success).toBe(false)
  })
})
