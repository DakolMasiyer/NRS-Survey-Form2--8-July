// @vitest-environment node
import type { PGlite } from "@electric-sql/pglite"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { OFFICE, OTHER_OFFICE, createTestDb, insertPending, resetDb } from "@/app/api/staff/test-support"
import type { Sql } from "@/lib/db"
import { buildOverview, currentLagosMonth, isValidMonth } from "./overview"
import { formatTaxOffice, TAX_OFFICES } from "./tax-offices"
import { activityMonths, officeActivity } from "./visits"

describe("isValidMonth", () => {
  it("accepts a well-formed month", () => {
    expect(isValidMonth("2026-11")).toBe(true)
    expect(isValidMonth("2026-01")).toBe(true)
  })
  it.each(["2026-13", "2026-00", "2026-1", "2026-11-01", "", 5, null, undefined])("rejects %j", (v) => {
    expect(isValidMonth(v)).toBe(false)
  })
})

describe("currentLagosMonth", () => {
  it("is still October at 22:59Z on the 31st", () => {
    expect(currentLagosMonth(new Date("2026-10-31T22:59:00Z"))).toBe("2026-10")
  })
  it("is November from 23:00Z on the 31st", () => {
    expect(currentLagosMonth(new Date("2026-10-31T23:00:00Z"))).toBe("2026-11")
    expect(currentLagosMonth(new Date("2026-10-31T23:30:00Z"))).toBe("2026-11")
  })
  it("rolls over the year", () => {
    expect(currentLagosMonth(new Date("2026-12-31T23:30:00Z"))).toBe("2027-01")
  })
  it("defaults to now", () => {
    expect(isValidMonth(currentLagosMonth())).toBe(true)
  })
})

const NOW = new Date("2026-11-05T10:00:00Z")
const ALL = TAX_OFFICES.flatMap((s) => s.offices.map((o) => formatTaxOffice(s.state, o)))

describe("buildOverview", () => {
  it("lists all 199 unique offices in list order", () => {
    const o = buildOverview([], "2026-11", [], NOW)
    expect(o.offices).toHaveLength(199)
    expect(o.offices.map((x) => x.tax_office)).toEqual(ALL)
    expect(new Set(o.offices.map((x) => x.tax_office)).size).toBe(199)
  })

  it("marks offices without rows as not_submitted", () => {
    const o = buildOverview([], "2026-11", [], NOW)
    expect(o.summary).toEqual({
      offices_total: 199,
      submitted: 0,
      not_submitted: 199,
      waiting: 0,
      scored: 0,
      submissions: 0,
    })
    expect(o.offices[0]).toEqual({
      state: TAX_OFFICES[0].state,
      label: TAX_OFFICES[0].label,
      name: TAX_OFFICES[0].offices[0],
      tax_office: OFFICE,
      status: "not_submitted",
      pending: 0,
      scored: 0,
      last_submitted_at: null,
    })
  })

  it("applies the status rules and summary arithmetic", () => {
    const o = buildOverview(
      [
        { tax_office: ALL[0], pending: 1, scored: 2, last_submitted_at: "2026-11-03T08:00:00Z" },
        { tax_office: ALL[1], pending: 0, scored: 1, last_submitted_at: new Date("2026-11-02T08:00:00Z") },
        { tax_office: ALL[2], pending: 2, scored: 0, last_submitted_at: "2026-11-04T08:00:00Z" },
      ],
      "2026-11",
      [],
      NOW,
    )
    expect(o.offices[0].status).toBe("waiting")
    expect(o.offices[1].status).toBe("scored")
    expect(o.offices[2].status).toBe("waiting")
    expect(o.offices[3].status).toBe("not_submitted")
    expect(o.offices[1].last_submitted_at).toBe("2026-11-02T08:00:00.000Z")
    expect(o.summary).toEqual({
      offices_total: 199,
      submitted: 3,
      not_submitted: 196,
      waiting: 2,
      scored: 1,
      submissions: 6,
    })
    expect(o.summary.submitted + o.summary.not_submitted).toBe(199)
    expect(o.summary.waiting + o.summary.scored).toBe(o.summary.submitted)
  })

  it("always includes the current month, sorted newest first without duplicates", () => {
    expect(buildOverview([], "2026-11", [], NOW).months).toEqual(["2026-11"])
    const o = buildOverview([], "2026-09", ["2026-09", "2026-08", "2026-09"], NOW)
    expect(o.months).toEqual(["2026-11", "2026-09", "2026-08"])
  })

  it("adds a requested month that is missing", () => {
    const o = buildOverview([], "2025-03", ["2026-10"], NOW)
    expect(o.months).toEqual(["2026-11", "2026-10", "2025-03"])
  })
})

describe("officeActivity / activityMonths (PGlite)", () => {
  let db: PGlite
  let sql: Sql
  beforeAll(async () => {
    ;({ db, sql } = await createTestDb())
  }, 60_000)
  afterAll(async () => {
    await db.close()
  })
  beforeEach(async () => {
    await resetDb(sql)
  })

  const setTime = (id: string, iso: string) =>
    sql`UPDATE checklist_visits SET submitted_at = ${iso}::timestamptz WHERE id = ${id}::uuid`

  it("attributes months at Nigeria midnight", async () => {
    const a = await insertPending(sql, OFFICE)
    const b = await insertPending(sql, OFFICE)
    const c = await insertPending(sql, OTHER_OFFICE)
    await setTime(a, "2026-10-31T23:30:00Z") // November in Nigeria
    await setTime(b, "2026-10-31T22:59:00Z") // October
    await setTime(c, "2026-11-30T23:00:00Z") // December

    const nov = await officeActivity(sql, "2026-11")
    expect(nov).toHaveLength(1)
    expect(nov[0]).toMatchObject({ tax_office: OFFICE, pending: 1, scored: 0 })
    expect(new Date(nov[0].last_submitted_at).toISOString()).toBe("2026-10-31T23:30:00.000Z")

    const oct = await officeActivity(sql, "2026-10")
    expect(oct).toHaveLength(1)
    expect(oct[0]).toMatchObject({ tax_office: OFFICE, pending: 1 })

    const dec = await officeActivity(sql, "2026-12")
    expect(dec.map((r) => r.tax_office)).toEqual([OTHER_OFFICE])

    expect(await activityMonths(sql)).toEqual(["2026-12", "2026-11", "2026-10"])
  })

  it("counts pending and scored per office and takes the latest submission", async () => {
    const a = await insertPending(sql, OFFICE)
    const b = await insertPending(sql, OFFICE)
    const c = await insertPending(sql, OFFICE)
    await setTime(a, "2026-11-02T10:00:00Z")
    await setTime(b, "2026-11-03T10:00:00Z")
    await setTime(c, "2026-11-04T10:00:00Z")
    await sql`UPDATE checklist_visits SET status = 'scored' WHERE id = ${b}::uuid`
    await sql`UPDATE checklist_visits SET status = 'scored' WHERE id = ${c}::uuid`

    const rows = await officeActivity(sql, "2026-11")
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ pending: 1, scored: 2 })
    expect(new Date(rows[0].last_submitted_at).toISOString()).toBe("2026-11-04T10:00:00.000Z")

    const o = buildOverview(rows, "2026-11", await activityMonths(sql), NOW)
    expect(o.offices.find((x) => x.tax_office === OFFICE)?.status).toBe("waiting")
  })

  it("returns nothing for an empty table", async () => {
    expect(await officeActivity(sql, "2026-11")).toEqual([])
    expect(await activityMonths(sql)).toEqual([])
  })
})
