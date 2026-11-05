// @vitest-environment node
import type { PGlite } from "@electric-sql/pglite"
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { DatabaseNotConfiguredError, getSql, type Sql } from "@/lib/db"
import { currentLagosMonth } from "@/lib/overview"
import { POST } from "./route"
import {
  FAKE_CODE,
  NO_CODE_HEADERS,
  OFFICE,
  OTHER_OFFICE,
  count,
  createTestDb,
  insertPending,
  post,
  resetDb,
  withCode,
} from "../test-support"

vi.mock("@/lib/db", async (orig) => ({ ...(await orig<typeof import("@/lib/db")>()), getSql: vi.fn() }))

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
  vi.stubEnv("CSQAU_ACCESS_CODE", FAKE_CODE)
  vi.mocked(getSql).mockReturnValue(sql)
})
afterEach(async () => {
  vi.unstubAllEnvs()
  vi.clearAllMocks()
})

const overview = (body: unknown, headers: Record<string, string> = withCode()) =>
  POST(post("/api/staff/overview", body, { "x-forwarded-for": "203.0.113.9", ...headers }))

describe("POST /api/staff/overview", () => {
  it.each(NO_CODE_HEADERS)("returns 403 without touching the DB when the code header is missing/empty (%j)", async (headers) => {
    const res = await overview({}, headers)
    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ error: "CSQAU access code required" })
    expect(getSql).not.toHaveBeenCalled()
  })

  it("returns 403 for a wrong code and records the attempt", async () => {
    const res = await overview({}, withCode("wrong"))
    expect(res.status).toBe(403)
    expect(await count(sql, "access_attempts")).toBe(1)
  })

  it("returns 429 with Retry-After on the 6th wrong attempt", async () => {
    for (let i = 0; i < 5; i++) expect((await overview({}, withCode("wrong"))).status).toBe(403)
    const res = await overview({}, withCode("wrong"))
    expect(res.status).toBe(429)
    expect(Number(res.headers.get("Retry-After"))).toBeGreaterThanOrEqual(1)
  })

  it.each(["2026-13", "2026-1", "2026-11-01", "", 5, null])("rejects an invalid month (%j) with 400", async (month) => {
    const res = await overview({ month })
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: "month must look like 2026-11" })
  })

  it("uses the current Nigeria month when month is absent", async () => {
    const res = await overview({})
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.month).toBe(currentLagosMonth())
    expect(body.months).toContain(currentLagosMonth())
  })

  it("treats a non-JSON body as {}", async () => {
    const res = await overview("not json")
    expect(res.status).toBe(200)
    expect((await res.json()).month).toBe(currentLagosMonth())
  })

  it("returns 503 when the database is not configured", async () => {
    vi.mocked(getSql).mockImplementation(() => {
      throw new DatabaseNotConfiguredError()
    })
    const res = await overview({})
    expect(res.status).toBe(503)
  })

  it("returns the exact shape with no-store, counting the requested month", async () => {
    const a = await insertPending(sql, OFFICE, "Ada")
    const b = await insertPending(sql, OTHER_OFFICE, "Bayo")
    const c = await insertPending(sql, OTHER_OFFICE, "Chi")
    await sql`UPDATE checklist_visits SET submitted_at = '2026-10-31T23:30:00Z' WHERE id = ${a}::uuid`
    await sql`UPDATE checklist_visits SET submitted_at = '2026-11-02T09:00:00Z', status = 'scored' WHERE id = ${b}::uuid`
    await sql`UPDATE checklist_visits SET submitted_at = '2026-10-31T22:59:00Z' WHERE id = ${c}::uuid`

    const res = await overview({ month: "2026-11" })
    expect(res.status).toBe(200)
    expect(res.headers.get("Cache-Control")).toBe("no-store")
    const body = await res.json()
    expect(Object.keys(body).sort()).toEqual(["month", "months", "offices", "summary"])
    expect(body.month).toBe("2026-11")
    expect(body.months).toEqual(expect.arrayContaining(["2026-11", "2026-10", currentLagosMonth()]))
    expect([...body.months].sort().reverse()).toEqual(body.months)
    expect(new Set(body.months).size).toBe(body.months.length)
    expect(body.summary).toEqual({
      offices_total: 199,
      submitted: 2,
      not_submitted: 197,
      waiting: 1,
      scored: 1,
      submissions: 2,
    })
    expect(body.offices).toHaveLength(199)
    expect(Object.keys(body.offices[0]).sort()).toEqual(
      ["label", "last_submitted_at", "name", "pending", "scored", "state", "status", "tax_office"],
    )
    const first = body.offices.find((o: { tax_office: string }) => o.tax_office === OFFICE)
    expect(first).toMatchObject({ status: "waiting", pending: 1, scored: 0, last_submitted_at: "2026-10-31T23:30:00.000Z" })
    const second = body.offices.find((o: { tax_office: string }) => o.tax_office === OTHER_OFFICE)
    expect(second).toMatchObject({ status: "scored", pending: 0, scored: 1 })
  })

  it("never exposes payload or staff details", async () => {
    const marker = "ZZ-UNIQUE-STAFF-MARKER"
    await insertPending(sql, OFFICE, marker)
    const res = await overview({})
    const text = await res.text()
    expect(res.status).toBe(200)
    expect(text).not.toContain(marker)
    expect(text).not.toContain("payload")
    expect(text).not.toContain("example.test")
  })
})
