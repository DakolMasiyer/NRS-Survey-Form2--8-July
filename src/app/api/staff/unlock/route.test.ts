// @vitest-environment node
import type { PGlite } from "@electric-sql/pglite"
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { DatabaseNotConfiguredError, getSql, type Sql } from "@/lib/db"
import { POST } from "./route"
import { count, createTestDb, FAKE_CODE, post, resetDb } from "../test-support"

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

const unlock = (code: unknown, headers: Record<string, string> = {}) =>
  POST(post("/api/staff/unlock", { code }, { "x-forwarded-for": "203.0.113.9", ...headers }))

describe("POST /api/staff/unlock", () => {
  it("accepts the right code", async () => {
    const res = await unlock(FAKE_CODE)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
    expect(await count(sql, "access_attempts")).toBe(0)
  })

  it("rejects a wrong code with 401 and records the attempt", async () => {
    const res = await unlock("wrong")
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: "Incorrect access code" })
    expect(await count(sql, "access_attempts")).toBe(1)
  })

  it("locks out on the 6th attempt with 429 and Retry-After", async () => {
    for (let i = 0; i < 5; i++) expect((await unlock("wrong")).status).toBe(401)
    const res = await unlock(FAKE_CODE)
    expect(res.status).toBe(429)
    const body = await res.json()
    expect(body.retryAfterSeconds).toBeGreaterThanOrEqual(1)
    expect(res.headers.get("Retry-After")).toBe(String(body.retryAfterSeconds))
  })

  it("returns 503 when the database is not configured", async () => {
    vi.mocked(getSql).mockImplementation(() => {
      throw new DatabaseNotConfiguredError()
    })
    const res = await unlock(FAKE_CODE)
    expect(res.status).toBe(503)
  })

  it("returns 503 when CSQAU_ACCESS_CODE is not configured", async () => {
    vi.stubEnv("CSQAU_ACCESS_CODE", "")
    const res = await unlock(FAKE_CODE)
    expect(res.status).toBe(503)
  })

  it("rejects invalid JSON with 400", async () => {
    const res = await POST(post("/api/staff/unlock", "{nope"))
    expect(res.status).toBe(400)
  })
})
