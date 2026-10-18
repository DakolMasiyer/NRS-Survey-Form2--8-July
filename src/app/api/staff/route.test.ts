// @vitest-environment node
import { NextRequest, NextResponse } from "next/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/webhook", () => ({
  proxyToWebhooks: vi.fn(async () => NextResponse.json({ ok: true })),
}))

import { proxyToWebhooks } from "@/lib/webhook"
import { POST } from "./route"

function request(body: unknown, code?: string) {
  return new NextRequest("http://localhost/api/staff", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(code && { "x-csqau-code": code }) },
    body: typeof body === "string" ? body : JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.stubEnv("CSQAU_ACCESS_CODE", "test-code")
  vi.spyOn(console, "error").mockImplementation(() => {})
  vi.mocked(proxyToWebhooks).mockClear()
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe("POST /api/staff", () => {
  it("passes an unscored submission through without a code", async () => {
    const res = await POST(request({ tax_office: "ETO Garki, FCT", s1_status: "YES", s1_remarks: "" }))
    expect(res.status).toBe(200)
    expect(proxyToWebhooks).toHaveBeenCalledTimes(1)
  })

  it("rejects a section score without a code", async () => {
    const res = await POST(request({ s1_score: 90 }))
    expect(res.status).toBe(403)
    expect(proxyToWebhooks).not.toHaveBeenCalled()
  })

  it("rejects a total score without a code", async () => {
    const res = await POST(request({ total_score: 90 }))
    expect(res.status).toBe(403)
    expect(proxyToWebhooks).not.toHaveBeenCalled()
  })

  it("rejects scores with a wrong code", async () => {
    const res = await POST(request({ s10_score: 90 }, "wrong"))
    expect(res.status).toBe(403)
    expect(proxyToWebhooks).not.toHaveBeenCalled()
  })

  it("passes scores through with the right code", async () => {
    const res = await POST(request({ s1_score: 90, total_score: 90 }, "test-code"))
    expect(res.status).toBe(200)
    expect(proxyToWebhooks).toHaveBeenCalledTimes(1)
  })

  it("returns 503 for a scored submission when the access code is not configured", async () => {
    vi.stubEnv("CSQAU_ACCESS_CODE", "")
    const res = await POST(request({ s1_score: 90 }, "test-code"))
    expect(res.status).toBe(503)
    expect(proxyToWebhooks).not.toHaveBeenCalled()
  })

  it("leaves an unparseable body to the webhook proxy to reject", async () => {
    await POST(request("not json"))
    expect(proxyToWebhooks).toHaveBeenCalledTimes(1)
  })
})
