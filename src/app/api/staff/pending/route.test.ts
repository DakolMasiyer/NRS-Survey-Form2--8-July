// @vitest-environment node
import type { PGlite } from "@electric-sql/pglite"
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { getSql, type Sql } from "@/lib/db"
import { POST } from "./route"
import {
  count,
  createTestDb,
  NO_CODE_HEADERS,
  resetDb,
  FAKE_CODE,
  insertPending,
  OFFICE,
  OTHER_OFFICE,
  post,
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

const list = (office: unknown, headers: Record<string, string> = withCode()) =>
  POST(post("/api/staff/pending", { tax_office: office }, { "x-forwarded-for": "203.0.113.9", ...headers }))

describe("POST /api/staff/pending", () => {
  it.each(NO_CODE_HEADERS)("returns 403 without touching the DB when the code header is missing/empty (%j)", async (headers) => {
    const res = await list(OFFICE, headers)
    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ error: "CSQAU access code required" })
    expect(getSql).not.toHaveBeenCalled()
  })

  it("returns 403 for a wrong code and records the attempt", async () => {
    const res = await list(OFFICE, withCode("wrong"))
    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ error: "CSQAU access code required" })
    expect(await count(sql, "access_attempts")).toBe(1)
  })

  it("returns 429 with Retry-After on the 6th wrong attempt", async () => {
    for (let i = 0; i < 5; i++) expect((await list(OFFICE, withCode("wrong"))).status).toBe(403)
    const res = await list(OFFICE, withCode("wrong"))
    expect(res.status).toBe(429)
    expect(Number(res.headers.get("Retry-After"))).toBeGreaterThanOrEqual(1)
  })

  it("lists only pending visits for the requested office", async () => {
    const mine = await insertPending(sql, OFFICE, "Ada")
    const scored = await insertPending(sql, OFFICE, "Bayo")
    await insertPending(sql, OTHER_OFFICE, "Chi")
    await sql`UPDATE checklist_visits SET status = 'scored' WHERE id = ${scored}::uuid`

    const res = await list(OFFICE)
    expect(res.status).toBe(200)
    const { visits } = await res.json()
    expect(visits).toHaveLength(1)
    expect(visits[0]).toMatchObject({ id: mine, first_staff_name: "Ada" })
    expect(new Date(visits[0].submitted_at).toISOString()).toBe(visits[0].submitted_at)
  })

  it.each(["Nowhere, Atlantis", "", 5])("rejects an invalid tax_office (%j) with 400", async (office) => {
    const res = await list(office)
    expect(res.status).toBe(400)
  })
})
