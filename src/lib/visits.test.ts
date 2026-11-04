// @vitest-environment node
import { readFileSync } from "node:fs"
import path from "node:path"
import { PGlite } from "@electric-sql/pglite"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import type { Row, Sql } from "./db"
import {
  createPending,
  getVisit,
  listPending,
  markSyncError,
  markSynced,
  scoreVisit,
} from "./visits"

const MIGRATION = readFileSync(
  path.join(process.cwd(), "db", "migrations", "001_checklist_visits.sql"),
  "utf8",
)

function adapt(db: PGlite): Sql {
  return async (strings, ...values) => {
    let text = strings[0] ?? ""
    for (let i = 0; i < values.length; i++) text += `$${i + 1}${strings[i + 1] ?? ""}`
    const res = await db.query<Row>(text, values as unknown[])
    return res.rows
  }
}

let db: PGlite
let sql: Sql

beforeEach(async () => {
  db = new PGlite()
  await db.exec(MIGRATION)
  sql = adapt(db)
})

afterEach(async () => {
  await db.close()
})

const payload = (name?: string) => ({
  tax_office: "Ikeja",
  sections: [],
  staff: name ? [{ name }] : [],
})

const signoffs = { checked_by: { name: "A" }, head_tpsu: { name: "B" }, controller: { name: "C" } }
const UNKNOWN_UUID = "00000000-0000-4000-8000-000000000000"

describe("migration", () => {
  it("is idempotent", async () => {
    await expect(db.exec(MIGRATION)).resolves.toBeDefined()
    await expect(db.exec(MIGRATION)).resolves.toBeDefined()
  })
})

describe("createPending / listPending", () => {
  it("lists a created record", async () => {
    const created = await createPending(sql, { tax_office: "Ikeja", payload: payload("Ada") })
    expect(created.id).toMatch(/^[0-9a-f-]{36}$/)
    const list = await listPending(sql, "Ikeja")
    expect(list).toHaveLength(1)
    expect(list[0]).toMatchObject({ id: created.id, first_staff_name: "Ada" })
  })

  it("filters by office, hides scored rows, newest first", async () => {
    const a = await createPending(sql, { tax_office: "Ikeja", payload: payload("A") })
    const b = await createPending(sql, { tax_office: "Ikeja", payload: payload("B") })
    const c = await createPending(sql, { tax_office: "Ikeja", payload: payload("C") })
    await createPending(sql, { tax_office: "Abuja", payload: payload("X") })
    await sql`UPDATE checklist_visits SET submitted_at = now() - interval '3 hours' WHERE id = ${a.id}::uuid`
    await sql`UPDATE checklist_visits SET submitted_at = now() - interval '1 hour' WHERE id = ${b.id}::uuid`
    await scoreVisit(sql, { id: c.id, scores: [], signoffs, total_score: 50 })

    const list = await listPending(sql, "Ikeja")
    expect(list.map((r) => r.id)).toEqual([b.id, a.id])
    expect(await listPending(sql, "Nowhere")).toEqual([])
  })

  it("first_staff_name is null when no staff", async () => {
    await createPending(sql, { tax_office: "Ikeja", payload: payload() })
    const list = await listPending(sql, "Ikeja")
    expect(list[0]?.first_staff_name).toBeNull()
  })
})

describe("getVisit", () => {
  it("returns the full row", async () => {
    const { id } = await createPending(sql, { tax_office: "Ikeja", payload: payload("Ada") })
    const row = await getVisit(sql, id)
    expect(row).toMatchObject({ id, tax_office: "Ikeja", status: "pending", scores: null })
    expect(row?.payload).toEqual(payload("Ada"))
  })

  it("returns null for unknown and malformed ids", async () => {
    expect(await getVisit(sql, UNKNOWN_UUID)).toBeNull()
    expect(await getVisit(sql, "not-a-uuid")).toBeNull()
    expect(await getVisit(sql, "")).toBeNull()
  })
})

describe("scoreVisit", () => {
  it("succeeds once; a second call returns null and keeps the first scores", async () => {
    const { id } = await createPending(sql, { tax_office: "Ikeja", payload: payload("Ada") })
    const first = await scoreVisit(sql, { id, scores: [1, 2], signoffs, total_score: 77.5 })
    expect(first).toMatchObject({ id, status: "scored" })
    expect(Number(first?.total_score)).toBe(77.5)
    expect(first?.scored_at).toBeTruthy()

    const second = await scoreVisit(sql, { id, scores: [9, 9], signoffs, total_score: 10 })
    expect(second).toBeNull()
    const row = await getVisit(sql, id)
    expect(row?.scores).toEqual([1, 2])
    expect(Number(row?.total_score)).toBe(77.5)
  })

  it("returns null for unknown or malformed id", async () => {
    expect(await scoreVisit(sql, { id: UNKNOWN_UUID, scores: [], signoffs, total_score: 1 })).toBeNull()
    expect(await scoreVisit(sql, { id: "nope", scores: [], signoffs, total_score: 1 })).toBeNull()
  })

  it("produces exactly one winner for concurrent calls", async () => {
    const { id } = await createPending(sql, { tax_office: "Ikeja", payload: payload("Ada") })
    const results = await Promise.all([
      scoreVisit(sql, { id, scores: [1], signoffs, total_score: 10 }),
      scoreVisit(sql, { id, scores: [2], signoffs, total_score: 20 }),
    ])
    expect(results.filter((r) => r !== null)).toHaveLength(1)
  })
})

describe("markSynced / markSyncError", () => {
  it("markSyncError stores a truncated message and leaves sheet_synced_at null", async () => {
    const { id } = await createPending(sql, { tax_office: "Ikeja", payload: payload("Ada") })
    await markSyncError(sql, id, "x".repeat(800))
    const row = await getVisit(sql, id)
    expect((row?.sheet_error as string).length).toBe(500)
    expect(row?.sheet_synced_at).toBeNull()
  })

  it("markSynced sets the timestamp and clears the error", async () => {
    const { id } = await createPending(sql, { tax_office: "Ikeja", payload: payload("Ada") })
    await markSyncError(sql, id, "boom")
    await markSynced(sql, id)
    const row = await getVisit(sql, id)
    expect(row?.sheet_synced_at).toBeTruthy()
    expect(row?.sheet_error).toBeNull()
  })
})
