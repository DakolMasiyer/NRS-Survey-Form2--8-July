// @vitest-environment node
import { NextRequest, NextResponse } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const proxy = vi.fn<(req: NextRequest, vars: string[]) => Promise<NextResponse>>(async () => NextResponse.json({ ok: true }))
vi.mock("@/lib/webhook", () => ({ proxyToWebhooks: (req: NextRequest, vars: string[]) => proxy(req, vars) }))

import { POST } from "./route"

const post = (body: unknown) =>
  POST(new NextRequest("http://localhost/api/taxpayer", { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body) }))

beforeEach(() => proxy.mockClear())

describe("POST /api/taxpayer contact validation", () => {
  it("passes a response with blank optional contacts to the webhooks", async () => {
    const res = await post({ tax_office: "x", phone: "", email: "", contact_email: "" })
    expect(res.status).toBe(200)
    expect(proxy).toHaveBeenCalledTimes(1)
  })

  it("passes valid contacts and unrelated fields through", async () => {
    const res = await post({ phone: "+1 415 555 2671", email: "a@b.ng", contact_email: "c@d.com", suggestions: "hi" })
    expect(res.status).toBe(200)
    expect(proxy).toHaveBeenCalledTimes(1)
  })

  it.each([
    [{ email: "efv" }, "valid email"],
    [{ contact_email: "c df f" }, "valid email"],
    [{ phone: "fve" }, "valid phone"],
  ])("refuses %j with 400 and never reaches the webhooks", async (body, text) => {
    const res = await post(body)
    expect(res.status).toBe(400)
    expect(((await res.json()) as { error: string }).error).toContain(text)
    expect(proxy).not.toHaveBeenCalled()
  })

  it("refuses invalid JSON and oversized bodies", async () => {
    expect((await post("not json")).status).toBe(400)
    expect((await post({ suggestions: "x".repeat(60_000) })).status).toBe(413)
    expect(proxy).not.toHaveBeenCalled()
  })
})
