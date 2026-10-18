// @vitest-environment node
import { NextRequest } from "next/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { POST } from "./route"

function request(body: string) {
  return new NextRequest("http://localhost/api/staff/unlock", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  })
}

beforeEach(() => {
  vi.stubEnv("CSQAU_ACCESS_CODE", "test-code")
  vi.spyOn(console, "error").mockImplementation(() => {})
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe("POST /api/staff/unlock", () => {
  it("returns 200 for the right code", async () => {
    const res = await POST(request(JSON.stringify({ code: "test-code" })))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
  })

  it("returns 401 for a wrong code", async () => {
    const res = await POST(request(JSON.stringify({ code: "nope" })))
    expect(res.status).toBe(401)
  })

  it("returns 400 for a body that is not JSON", async () => {
    const res = await POST(request("not json"))
    expect(res.status).toBe(400)
  })

  it("returns 503 when the access code is not configured", async () => {
    vi.stubEnv("CSQAU_ACCESS_CODE", "")
    const res = await POST(request(JSON.stringify({ code: "test-code" })))
    expect(res.status).toBe(503)
  })
})
