// @vitest-environment node
import type { PGlite } from "@electric-sql/pglite"
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { getSql, type Sql } from "@/lib/db"
import { sendToWebhooks } from "@/lib/webhook"
import { POST } from "./route"
import {
  count,
  createTestDb,
  NO_CODE_HEADERS,
  resetDb,
  FAKE_CODE,
  insertPending,
  post,
  scoringBody,
  UNKNOWN_ID,
  withCode,
} from "../test-support"

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
  vi.stubEnv("CSQAU_ACCESS_CODE", FAKE_CODE)
  vi.mocked(getSql).mockReturnValue(sql)
  vi.mocked(sendToWebhooks).mockResolvedValue({ configured: 1, delivered: 1, failures: [] })
})
afterEach(async () => {
  vi.unstubAllEnvs()
  vi.clearAllMocks()
})

const score = (body: unknown, headers: Record<string, string> = withCode()) =>
  POST(post("/api/staff/score", body, { "x-forwarded-for": "203.0.113.9", ...headers }))

async function visitRow(id: string) {
  return (await sql`SELECT * FROM checklist_visits WHERE id = ${id}::uuid`)[0]
}

describe("POST /api/staff/score: access", () => {
  it.each(NO_CODE_HEADERS)("returns 403 without touching the DB when the code header is missing/empty (%j)", async (headers) => {
    const res = await score(scoringBody(UNKNOWN_ID), headers)
    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ error: "CSQAU access code required" })
    expect(getSql).not.toHaveBeenCalled()
    expect(sendToWebhooks).not.toHaveBeenCalled()
  })

  it("returns 403 for a wrong code and records the attempt", async () => {
    const id = await insertPending(sql)
    const res = await score(scoringBody(id), withCode("wrong"))
    expect(res.status).toBe(403)
    expect(await count(sql, "access_attempts")).toBe(1)
    expect((await visitRow(id)).status).toBe("pending")
  })

  it("returns 429 on the 6th wrong attempt", async () => {
    for (let i = 0; i < 5; i++) await score(scoringBody(UNKNOWN_ID), withCode("wrong"))
    const res = await score(scoringBody(UNKNOWN_ID), withCode("wrong"))
    expect(res.status).toBe(429)
    expect(res.headers.get("Retry-After")).not.toBeNull()
  })
})

describe("POST /api/staff/score: scoring", () => {
  it("saves scores with a server-computed total and sends one sheet row", async () => {
    const id = await insertPending(sql)
    const res = await score(scoringBody(id))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ saved: true, sheetSynced: true, total_score: 55 })

    const row = await visitRow(id)
    expect(row.status).toBe("scored")
    expect(row.scores).toEqual([10, 20, 30, 40, 50, 60, 70, 80, 90, 100])
    expect(Number(row.total_score)).toBe(55)
    expect(row.sheet_synced_at).not.toBeNull()

    expect(sendToWebhooks).toHaveBeenCalledTimes(1)
    const [vars, sent] = vi.mocked(sendToWebhooks).mock.calls[0]
    expect(vars).toEqual(["NRS_SPAFF_WEBHOOK_URL", "NRS_SPAFF_WEBHOOK_URL_BACKUP"])
    expect(sent).toMatchObject({ submission_id: id, total_score: 55 })
  })

  it("rejects a client-sent total_score (unknown key) with 400", async () => {
    const id = await insertPending(sql)
    const res = await score(scoringBody(id, { total_score: 100 }))
    expect(res.status).toBe(400)
    expect((await visitRow(id)).status).toBe("pending")
    expect(sendToWebhooks).not.toHaveBeenCalled()
  })

  it.each([[[-1, 0, 0, 0, 0, 0, 0, 0, 0, 0]], [[101, 0, 0, 0, 0, 0, 0, 0, 0, 0]], [[1, 2, 3]]])(
    "rejects invalid scores %j with 400",
    async (scores) => {
      const id = await insertPending(sql)
      const res = await score(scoringBody(id, { scores }))
      expect(res.status).toBe(400)
      expect((await visitRow(id)).status).toBe("pending")
    },
  )

  it("rejects invalid JSON with 400", async () => {
    const res = await POST(post("/api/staff/score", "{nope", withCode()))
    expect(res.status).toBe(400)
  })

  it("returns 409 on a second score and does not overwrite or resend", async () => {
    const id = await insertPending(sql)
    expect((await score(scoringBody(id))).status).toBe(200)
    const res = await score(scoringBody(id, { scores: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }))
    expect(res.status).toBe(409)
    expect(await res.json()).toEqual({ error: "already scored" })
    expect(Number((await visitRow(id)).total_score)).toBe(55)
    expect(sendToWebhooks).toHaveBeenCalledTimes(1)
  })

  it("returns 404 for an unknown id", async () => {
    const res = await score(scoringBody(UNKNOWN_ID))
    expect(res.status).toBe(404)
  })

  it("keeps the record and reports sheetSynced:false when a webhook fails", async () => {
    vi.mocked(sendToWebhooks).mockResolvedValue({
      configured: 1,
      delivered: 0,
      failures: [new Error("Webhook responded 500")],
    })
    vi.spyOn(console, "error").mockImplementation(() => {})
    const id = await insertPending(sql)
    const res = await score(scoringBody(id))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ saved: true, sheetSynced: false, total_score: 55 })
    const row = await visitRow(id)
    expect(row.status).toBe("scored")
    expect(row.sheet_synced_at).toBeNull()
    expect(row.sheet_error).toContain("Webhook responded 500")
  })

  it("treats a partial delivery (one webhook failed) as not synced", async () => {
    vi.mocked(sendToWebhooks).mockResolvedValue({
      configured: 2,
      delivered: 1,
      failures: [new Error("backup down")],
    })
    const id = await insertPending(sql)
    const res = await score(scoringBody(id))
    expect((await res.json()).sheetSynced).toBe(false)
    expect((await visitRow(id)).sheet_synced_at).toBeNull()
  })

  it("reports sheetSynced:false when no webhook is configured", async () => {
    vi.mocked(sendToWebhooks).mockResolvedValue({ configured: 0, delivered: 0, failures: [] })
    const id = await insertPending(sql)
    const res = await score(scoringBody(id))
    expect(res.status).toBe(200)
    expect((await res.json()).sheetSynced).toBe(false)
    const row = await visitRow(id)
    expect(row.sheet_synced_at).toBeNull()
    expect(row.sheet_error).toBe("no webhook configured")
  })
})
