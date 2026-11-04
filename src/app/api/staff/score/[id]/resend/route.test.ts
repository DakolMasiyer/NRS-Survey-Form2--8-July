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
  idCtx,
  insertPending,
  post,
  scoringBody,
  UNKNOWN_ID,
  withCode,
} from "../../../test-support"
import { POST as scorePost } from "../../route"

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
  vi.spyOn(console, "error").mockImplementation(() => {})
})
afterEach(async () => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
  vi.clearAllMocks()
})

const resend = (id: string, headers: Record<string, string> = withCode()) =>
  POST(post(`/api/staff/score/${id}/resend`, {}, { "x-forwarded-for": "203.0.113.9", ...headers }), idCtx(id))

/** Scores a visit while the sheet is failing, leaving it scored but unsynced. */
async function scoredUnsynced() {
  vi.mocked(sendToWebhooks).mockResolvedValueOnce({
    configured: 1,
    delivered: 0,
    failures: [new Error("down")],
  })
  const id = await insertPending(sql)
  const res = await scorePost(post("/api/staff/score", scoringBody(id), withCode()))
  expect((await res.json()).sheetSynced).toBe(false)
  vi.mocked(sendToWebhooks).mockClear()
  return id
}

describe("POST /api/staff/score/[id]/resend", () => {
  it.each(NO_CODE_HEADERS)("returns 403 without touching the DB when the code header is missing/empty (%j)", async (headers) => {
    const res = await resend(UNKNOWN_ID, headers)
    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ error: "CSQAU access code required" })
    expect(getSql).not.toHaveBeenCalled()
  })

  it("returns 403 for a wrong code and records the attempt", async () => {
    const res = await resend(UNKNOWN_ID, withCode("wrong"))
    expect(res.status).toBe(403)
    expect(await count(sql, "access_attempts")).toBe(1)
  })

  it("returns 404 for an unknown id", async () => {
    expect((await resend(UNKNOWN_ID)).status).toBe(404)
  })

  it("returns 409 when the visit is not scored yet", async () => {
    const id = await insertPending(sql)
    const res = await resend(id)
    expect(res.status).toBe(409)
    expect(await res.json()).toEqual({ error: "not scored yet" })
    expect(sendToWebhooks).not.toHaveBeenCalled()
  })

  it("does not send again when already synced", async () => {
    const id = await insertPending(sql)
    vi.mocked(sendToWebhooks).mockResolvedValueOnce({ configured: 1, delivered: 1, failures: [] })
    await scorePost(post("/api/staff/score", scoringBody(id), withCode()))
    vi.mocked(sendToWebhooks).mockClear()

    const res = await resend(id)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ sheetSynced: true, alreadySynced: true })
    expect(sendToWebhooks).not.toHaveBeenCalled()
  })

  it("sends the row, marks the visit synced and clears the error", async () => {
    const id = await scoredUnsynced()
    vi.mocked(sendToWebhooks).mockResolvedValueOnce({ configured: 1, delivered: 1, failures: [] })
    const res = await resend(id)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ sheetSynced: true })
    expect(sendToWebhooks).toHaveBeenCalledTimes(1)
    expect(vi.mocked(sendToWebhooks).mock.calls[0][1]).toMatchObject({ submission_id: id, total_score: 55 })
    const row = (await sql`SELECT sheet_synced_at, sheet_error FROM checklist_visits WHERE id = ${id}::uuid`)[0]
    expect(row.sheet_synced_at).not.toBeNull()
    expect(row.sheet_error).toBeNull()
  })

  it("returns 502 and records the error when the sheet fails again", async () => {
    const id = await scoredUnsynced()
    vi.mocked(sendToWebhooks).mockResolvedValueOnce({
      configured: 1,
      delivered: 0,
      failures: [new Error("still down")],
    })
    const res = await resend(id)
    expect(res.status).toBe(502)
    expect((await res.json()).error).toContain("still down")
    const row = (await sql`SELECT sheet_synced_at, sheet_error FROM checklist_visits WHERE id = ${id}::uuid`)[0]
    expect(row.sheet_synced_at).toBeNull()
    expect(row.sheet_error).toBe("still down")
  })
})
