// Shared helpers for the /api/staff route tests (not a route; Vitest only).
import { readFileSync } from "node:fs"
import path from "node:path"
import { PGlite } from "@electric-sql/pglite"
import { NextRequest } from "next/server"
import type { Row, Sql } from "@/lib/db"
import { SECTIONS } from "@/lib/staff-sections"
import { formatTaxOffice, TAX_OFFICES } from "@/lib/tax-offices"

export const FAKE_CODE = "test-code-not-real"
export const OFFICE = formatTaxOffice(TAX_OFFICES[0].state, TAX_OFFICES[0].offices[0])
export const OTHER_OFFICE = formatTaxOffice(TAX_OFFICES[1].state, TAX_OFFICES[1].offices[0])
export const UNKNOWN_ID = "00000000-0000-4000-8000-000000000000"

const MIGRATION = readFileSync(
  path.join(process.cwd(), "db", "migrations", "001_checklist_visits.sql"),
  "utf8",
)

export async function createTestDb(): Promise<{ db: PGlite; sql: Sql }> {
  const db = new PGlite()
  await db.exec(MIGRATION)
  const sql: Sql = async (strings, ...values) => {
    let text = strings[0] ?? ""
    for (let i = 0; i < values.length; i++) text += `$${i + 1}${strings[i + 1] ?? ""}`
    const res = await db.query<Row>(text, values as unknown[])
    return res.rows
  }
  return { db, sql }
}

export function stage1Body(overrides: Record<string, unknown> = {}) {
  return {
    tax_office: OFFICE,
    sections: SECTIONS.map((s) => ({ status: s.listOnly ? "N/A" : "YES" })),
    staff: [{ name: "Ada Obi", ir: "123", rank: "Officer", phone: "08011112222", email: "ada@example.test" }],
    ...overrides,
  }
}

const sig = (n: string) => ({ name: n, ir_rank: `${n}-rank`, phone: "08000000000", email: `${n}@example.test` })
export function scoringBody(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    scores: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
    signoffs: { checked_by: sig("chk"), head_tpsu: sig("head"), controller: sig("ctl") },
    ...overrides,
  }
}

export function post(url: string, body?: unknown, headers: Record<string, string> = {}) {
  return new NextRequest(`http://localhost${url}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body ?? {}),
  })
}

export const withCode = (code = FAKE_CODE) => ({ "x-csqau-code": code })
export const idCtx = (id: string) => ({ params: Promise.resolve({ id }) })

export async function insertPending(sql: Sql, office = OFFICE, name = "Ada Obi") {
  const rows = await sql`
    INSERT INTO checklist_visits (tax_office, payload)
    VALUES (${office}, ${JSON.stringify(stage1Body({ tax_office: office, staff: [{ name }] }))}::jsonb)
    RETURNING id`
  return rows[0].id as string
}

export async function count(sql: Sql, table: "access_attempts" | "checklist_visits") {
  const rows =
    table === "access_attempts"
      ? await sql`SELECT count(*)::int AS n FROM access_attempts`
      : await sql`SELECT count(*)::int AS n FROM checklist_visits`
  return Number(rows[0].n)
}

export async function resetDb(sql: Sql) {
  await sql`TRUNCATE checklist_visits, access_attempts`
}

/** Header sets for the "no code" cases. */
export const NO_CODE_HEADERS: Record<string, string>[] = [{}, { "x-csqau-code": "" }]
