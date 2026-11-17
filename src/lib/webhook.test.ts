import { NextRequest } from "next/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { proxyToWebhooks, sendToWebhooks, sheetSafe } from "./webhook"

const ENV = ["TEST_HOOK", "TEST_HOOK_BACKUP"]
const fetchMock = vi.fn()

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock)
  vi.spyOn(console, "error").mockImplementation(() => {})
})

afterEach(() => {
  fetchMock.mockReset()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

const ok = () => new Response("ok", { status: 200 })
const bad = () => new Response("nope", { status: 500 })

function configure(...which: ("a" | "b")[]) {
  if (which.includes("a")) vi.stubEnv("TEST_HOOK", "https://hook.invalid/a")
  if (which.includes("b")) vi.stubEnv("TEST_HOOK_BACKUP", "https://hook.invalid/b")
}

function req(body: string) {
  return new NextRequest("http://localhost/api/x", { method: "POST", body })
}

describe("sendToWebhooks", () => {
  it("reports configured 0 and does not call fetch when no URL is set", async () => {
    vi.stubEnv("TEST_HOOK", "")
    vi.stubEnv("TEST_HOOK_BACKUP", "")
    expect(await sendToWebhooks(ENV, { a: 1 })).toEqual({ configured: 0, delivered: 0, failures: [] })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("posts the JSON body to every configured URL", async () => {
    configure("a", "b")
    fetchMock.mockResolvedValue(ok())
    const result = await sendToWebhooks(ENV, { a: 1 })
    expect(result).toEqual({ configured: 2, delivered: 2, failures: [] })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe("https://hook.invalid/a")
    expect(init.method).toBe("POST")
    expect(init.body).toBe('{"a":1}')
  })

  it("reports a partial failure without throwing", async () => {
    configure("a", "b")
    fetchMock.mockResolvedValueOnce(ok()).mockResolvedValueOnce(bad())
    const result = await sendToWebhooks(ENV, {})
    expect(result.configured).toBe(2)
    expect(result.delivered).toBe(1)
    expect(result.failures).toHaveLength(1)
  })

  it("reports all failures (HTTP error and network error) without throwing", async () => {
    configure("a", "b")
    fetchMock.mockResolvedValueOnce(bad()).mockRejectedValueOnce(new Error("network down"))
    const result = await sendToWebhooks(ENV, {})
    expect(result).toMatchObject({ configured: 2, delivered: 0 })
    expect(result.failures).toHaveLength(2)
  })
})

describe("proxyToWebhooks", () => {
  it("returns 503 naming the first env var when none is configured", async () => {
    vi.stubEnv("TEST_HOOK", "")
    vi.stubEnv("TEST_HOOK_BACKUP", "")
    const res = await proxyToWebhooks(req("{}"), ENV)
    expect(res.status).toBe(503)
    expect(await res.json()).toEqual({ error: "TEST_HOOK is not configured" })
  })

  it("returns 400 for invalid JSON and does not call fetch", async () => {
    configure("a")
    const res = await proxyToWebhooks(req("not json"), ENV)
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: "Invalid JSON body" })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("returns {ok:true} when all webhooks succeed", async () => {
    configure("a", "b")
    fetchMock.mockResolvedValue(ok())
    const res = await proxyToWebhooks(req('{"x":1}'), ENV)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
  })

  it("returns partialFailure when one of two fails", async () => {
    configure("a", "b")
    fetchMock.mockResolvedValueOnce(ok()).mockResolvedValueOnce(bad())
    const res = await proxyToWebhooks(req("{}"), ENV)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true, partialFailure: true })
  })

  it("returns 502 when all webhooks fail", async () => {
    configure("a", "b")
    fetchMock.mockResolvedValue(bad())
    const res = await proxyToWebhooks(req("{}"), ENV)
    expect(res.status).toBe(502)
    expect(await res.json()).toEqual({ error: "All webhooks failed" })
  })

  it("returns 502 when the only configured webhook fails", async () => {
    configure("a")
    fetchMock.mockRejectedValue(new Error("boom"))
    const res = await proxyToWebhooks(req("{}"), ENV)
    expect(res.status).toBe(502)
  })
})

describe("sheetSafe", () => {
  it("prefixes text that Sheets would turn into a formula or a number with a leading zero", () => {
    expect(
      sheetSafe({ a: "+234 803 123 4567", b: "+1 415 555 2671", c: "=1+1", d: "-5", e: "@x", f: "08031234567", g: "0803 123 4567" }),
    ).toEqual({ a: "'+234 803 123 4567", b: "'+1 415 555 2671", c: "'=1+1", d: "'-5", e: "'@x", f: "'08031234567", g: "'0803 123 4567" })
  })

  it("leaves ordinary values alone (text, dates, ids, numbers, booleans, empty)", () => {
    const row = { name: "Ada", at: "2026-11-05T09:00:00.000Z", id: "d1c7a3ef-ba28", n: 77.1, ok: true, blank: "", zero: "0", staff: "[{\"ir\":\"1\"}]", mail: "a@b.ng" }
    expect(sheetSafe(row)).toEqual(row)
  })

  it("passes non-objects through unchanged", () => {
    expect(sheetSafe("+1")).toBe("+1")
    expect(sheetSafe(null)).toBe(null)
    expect(sheetSafe([1])).toEqual([1])
  })

  it("is applied to what is posted to the webhooks", async () => {
    vi.stubEnv("TEST_HOOK", "https://hook.invalid/a")
    fetchMock.mockResolvedValue(ok())
    await sendToWebhooks(ENV, { phone: "+234 803 123 4567" })
    expect(JSON.parse(fetchMock.mock.calls[0][1].body as string)).toEqual({ phone: "'+234 803 123 4567" })
  })
})
