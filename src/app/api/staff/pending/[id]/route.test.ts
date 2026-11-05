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
  idCtx,
  insertPending,
  OFFICE,
  post,
  UNKNOWN_ID,
  withCode,
} from "../../test-support"

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

const get = (id: string, headers: Record<string, string> = withCode()) =>
  POST(post(`/api/staff/pending/${id}`, {}, { "x-forwarded-for": "203.0.113.9", ...headers }), idCtx(id))

describe("POST /api/staff/pending/[id]", () => {
  it.each(NO_CODE_HEADERS)("returns 403 without touching the DB when the code header is missing/empty (%j)", async (headers) => {
    const res = await get(UNKNOWN_ID, headers)
    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ error: "CSQAU access code required" })
    expect(getSql).not.toHaveBeenCalled()
  })

  it("returns 403 for a wrong code and records the attempt", async () => {
    const res = await get(UNKNOWN_ID, withCode("wrong"))
    expect(res.status).toBe(403)
    expect(await count(sql, "access_attempts")).toBe(1)
  })

  it("returns 429 on the 6th wrong attempt", async () => {
    for (let i = 0; i < 5; i++) await get(UNKNOWN_ID, withCode("wrong"))
    const res = await get(UNKNOWN_ID, withCode("wrong"))
    expect(res.status).toBe(429)
    expect(res.headers.get("Retry-After")).not.toBeNull()
  })

  it("returns the visit with an ISO timestamp", async () => {
    const id = await insertPending(sql, OFFICE, "Ada")
    const res = await get(id)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toMatchObject({ id, tax_office: OFFICE })
    expect(new Date(body.submitted_at).toISOString()).toBe(body.submitted_at)
    expect(body.payload.staff[0].name).toBe("Ada")
  })

  it("returns 404 for an unknown id and for a malformed id", async () => {
    expect((await get(UNKNOWN_ID)).status).toBe(404)
    expect((await get("not-a-uuid")).status).toBe(404)
  })

  it("returns 409 for an already scored visit", async () => {
    const id = await insertPending(sql)
    await sql`UPDATE checklist_visits SET status = 'scored' WHERE id = ${id}::uuid`
    const res = await get(id)
    expect(res.status).toBe(409)
    expect(await res.json()).toEqual({ error: "already scored" })
  })
})
