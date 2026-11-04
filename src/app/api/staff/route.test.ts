// @vitest-environment node
import type { PGlite } from "@electric-sql/pglite"
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { DatabaseNotConfiguredError, getSql, type Sql } from "@/lib/db"
import { POST } from "./route"
import { count, createTestDb, post, resetDb, stage1Body } from "./test-support"

vi.mock("@/lib/db", async (orig) => ({ ...(await orig<typeof import("@/lib/db")>()), getSql: vi.fn() }))
vi.mock("@/lib/webhook", () => ({ sendToWebhooks: vi.fn() }))

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
  vi.mocked(getSql).mockReturnValue(sql)
})
afterEach(async () => {
  vi.clearAllMocks()
})

describe("POST /api/staff (officer submit)", () => {
  it("stores a pending record and returns id + reference", async () => {
    const res = await POST(post("/api/staff", stage1Body()))
    expect(res.status).toBe(201)
    const { id, reference } = await res.json()
    expect(reference).toBe(`NRS-${id.slice(0, 8).toUpperCase()}`)
    const rows = await sql`SELECT status, scores FROM checklist_visits WHERE id = ${id}::uuid`
    expect(rows[0]).toMatchObject({ status: "pending", scores: null })
  })

  it("never writes to the sheet", async () => {
    const { sendToWebhooks } = await import("@/lib/webhook")
    await POST(post("/api/staff", stage1Body()))
    expect(sendToWebhooks).not.toHaveBeenCalled()
  })

  it("rejects invalid JSON with 400", async () => {
    const res = await POST(post("/api/staff", "{not json"))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: "Invalid JSON body" })
  })

  it("rejects an invalid payload with 400 and the first issue message", async () => {
    const res = await POST(post("/api/staff", stage1Body({ tax_office: "" })))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: "Please select the tax office" })
    expect(await count(sql, "checklist_visits")).toBe(0)
  })

  it.each(["total_score", "scores", "signoffs", "checked_by", "s1_score"])(
    "rejects a score/sign-off key (%s) with 400",
    async (key) => {
      const res = await POST(post("/api/staff", stage1Body({ [key]: 1 })))
      expect(res.status).toBe(400)
      expect(await count(sql, "checklist_visits")).toBe(0)
    },
  )

  it("rejects a score key inside a section", async () => {
    const body = stage1Body()
    ;(body.sections[0] as Record<string, unknown>).score = 50
    const res = await POST(post("/api/staff", body))
    expect(res.status).toBe(400)
  })

  it("returns 503 when DATABASE_URL is not configured", async () => {
    vi.mocked(getSql).mockImplementation(() => {
      throw new DatabaseNotConfiguredError()
    })
    const res = await POST(post("/api/staff", stage1Body()))
    expect(res.status).toBe(503)
    expect(await res.json()).toEqual({ error: "DATABASE_URL is not configured" })
  })
})
