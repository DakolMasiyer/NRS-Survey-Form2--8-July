// @vitest-environment node
import { readFileSync } from "node:fs"
import path from "node:path"
import { PGlite } from "@electric-sql/pglite"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { Row, Sql } from "./db"
import { checkAccess, clientIp, hashIp } from "./access-guard"

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

const CODE = "correct-horse-battery"
const IP = "203.0.113.7"

let db: PGlite
let sql: Sql

beforeEach(async () => {
  vi.stubEnv("CSQAU_ACCESS_CODE", CODE)
  db = new PGlite()
  await db.exec(MIGRATION)
  sql = adapt(db)
})

afterEach(async () => {
  vi.unstubAllEnvs()
  await db.close()
})

async function attemptCount(): Promise<number> {
  const rows = await sql`SELECT count(*)::int AS n FROM access_attempts`
  return Number(rows[0]?.n)
}

describe("checkAccess", () => {
  it("accepts the correct code", async () => {
    expect(await checkAccess({ sql, code: CODE, ip: IP })).toEqual({ ok: true })
    expect(await attemptCount()).toBe(0)
  })

  it("rejects a wrong code with 401 and records the attempt", async () => {
    const res = await checkAccess({ sql, code: "wrong", ip: IP })
    expect(res).toEqual({ ok: false, status: 401, error: "Incorrect access code" })
    expect(await attemptCount()).toBe(1)
  })

  it("locks out after 5 failures, even with the right code", async () => {
    for (let i = 0; i < 5; i++) {
      expect((await checkAccess({ sql, code: "wrong", ip: IP })).ok).toBe(false)
    }
    const res = await checkAccess({ sql, code: CODE, ip: IP })
    expect(res).toMatchObject({ ok: false, status: 429 })
    if (res.ok || res.status !== 429) throw new Error("expected 429")
    expect(res.retryAfterSeconds).toBeGreaterThanOrEqual(1)
    expect(res.retryAfterSeconds).toBeLessThanOrEqual(900)
    expect(await attemptCount()).toBe(5)
  })

  it("does not lock out a different IP", async () => {
    for (let i = 0; i < 5; i++) await checkAccess({ sql, code: "wrong", ip: IP })
    expect(await checkAccess({ sql, code: CODE, ip: "198.51.100.1" })).toEqual({ ok: true })
  })

  it("ignores failures older than 15 minutes", async () => {
    const h = hashIp(IP)
    for (let i = 0; i < 5; i++) {
      await sql`INSERT INTO access_attempts (ip_hash, attempted_at) VALUES (${h}, now() - interval '20 minutes')`
    }
    expect(await checkAccess({ sql, code: CODE, ip: IP })).toEqual({ ok: true })
  })

  it("computes retryAfterSeconds from the oldest attempt in the window", async () => {
    const h = hashIp(IP)
    await sql`INSERT INTO access_attempts (ip_hash, attempted_at) VALUES (${h}, now() - interval '14 minutes')`
    for (let i = 0; i < 4; i++) await sql`INSERT INTO access_attempts (ip_hash) VALUES (${h})`
    const res = await checkAccess({ sql, code: CODE, ip: IP })
    if (res.ok || res.status !== 429) throw new Error("expected 429")
    expect(res.retryAfterSeconds).toBeGreaterThanOrEqual(1)
    expect(res.retryAfterSeconds).toBeLessThanOrEqual(61)
  })

  it("never stores the raw IP", async () => {
    await checkAccess({ sql, code: "wrong", ip: IP })
    const rows = await sql`SELECT ip_hash FROM access_attempts`
    expect(rows).toHaveLength(1)
    expect(rows[0]?.ip_hash).toBe(hashIp(IP))
    expect(JSON.stringify(rows)).not.toContain(IP)
    expect(String(rows[0]?.ip_hash)).toMatch(/^[0-9a-f]{64}$/)
  })

  it("returns 503 and records nothing when CSQAU_ACCESS_CODE is unset", async () => {
    vi.stubEnv("CSQAU_ACCESS_CODE", "")
    const res = await checkAccess({ sql, code: "anything", ip: IP })
    expect(res).toMatchObject({ ok: false, status: 503 })
    expect(await attemptCount()).toBe(0)
  })
})

describe("clientIp", () => {
  it("takes the first x-forwarded-for entry", () => {
    const h = new Headers({ "x-forwarded-for": "1.1.1.1, 2.2.2.2", "x-real-ip": "3.3.3.3" })
    expect(clientIp(h)).toBe("1.1.1.1")
  })
  it("falls back to x-real-ip then unknown", () => {
    expect(clientIp(new Headers({ "x-real-ip": "3.3.3.3" }))).toBe("3.3.3.3")
    expect(clientIp(new Headers())).toBe("unknown")
  })
})
