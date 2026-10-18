import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { schema } from "@/app/taxpayer/taxpayer-form"
import { LEGACY_TAXPAYER_COLUMNS, TAXPAYER_COLUMNS } from "./taxpayer-columns"

const root = process.cwd()
const read = (rel: string) => readFileSync(path.join(root, rel), "utf8")

describe("taxpayer sheet columns", () => {
  it("covers every key the form can send, plus submitted_at", () => {
    const sent = [...Object.keys(schema.shape), "submitted_at"]
    for (const key of sent) expect(TAXPAYER_COLUMNS).toContain(key)
  })

  it("has no column the form never sends, other than legacy ones", () => {
    const sent = new Set([...Object.keys(schema.shape), "submitted_at"])
    const orphans = TAXPAYER_COLUMNS.filter((c) => !sent.has(c) && !LEGACY_TAXPAYER_COLUMNS.includes(c))
    expect(orphans).toEqual([])
  })

  it("has no duplicate columns", () => {
    expect(new Set(TAXPAYER_COLUMNS).size).toBe(TAXPAYER_COLUMNS.length)
  })

  it("keeps the old column positions so existing rows stay aligned", () => {
    expect(TAXPAYER_COLUMNS.indexOf("phone_email")).toBe(7)
    expect(TAXPAYER_COLUMNS.indexOf("contact_email")).toBe(24)
    expect(TAXPAYER_COLUMNS.slice(-2)).toEqual(["phone", "email"])
  })

  it("matches the column list in the route header comment", () => {
    const route = read("src/app/api/taxpayer/route.ts")
    const block = route.split("Payload keys (spreadsheet column order):")[1].split("phone_email is a legacy")[0]
    const listed = block.replace(/\*/g, " ").split(",").map((k) => k.trim()).filter(Boolean)
    expect(listed).toEqual([...TAXPAYER_COLUMNS])
  })

  it("matches HEADERS in the Apps Script", () => {
    const gs = read("scripts/taxpayer-sheet/Code.gs")
    const headers = [...gs.split("const HEADERS = [")[1].split("]")[0].matchAll(/"([a-z0-9_]+)"/g)].map((m) => m[1])
    expect(headers).toEqual([...TAXPAYER_COLUMNS])
  })
})
