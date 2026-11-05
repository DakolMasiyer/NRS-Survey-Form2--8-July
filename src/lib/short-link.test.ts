// @vitest-environment node
import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"
import { GET as taxpayerLink } from "@/app/t/route"
import { GET as staffLink } from "@/app/s/route"

const req = (path: string) => new NextRequest(`https://survey.dako.studio${path}`)

afterEach(() => vi.unstubAllEnvs())

describe("short links", () => {
  it("/t goes to the taxpayer survey and /s to the staff checklist by default", () => {
    vi.stubEnv("SHORTLINK_TAXPAYER_URL", "")
    vi.stubEnv("SHORTLINK_STAFF_URL", "")
    expect(taxpayerLink(req("/t")).headers.get("location")).toBe("https://survey.dako.studio/taxpayer")
    expect(staffLink(req("/s")).headers.get("location")).toBe("https://survey.dako.studio/staff")
  })

  it("redirects temporarily (307) and forbids caching, so it can be repointed later", () => {
    vi.stubEnv("SHORTLINK_TAXPAYER_URL", "")
    const res = taxpayerLink(req("/t"))
    expect(res.status).toBe(307)
    expect(res.headers.get("cache-control")).toBe("no-store")
  })

  it("can be repointed to another site with an absolute https URL", () => {
    vi.stubEnv("SHORTLINK_TAXPAYER_URL", "https://survey.nrs.gov.ng/taxpayer")
    expect(taxpayerLink(req("/t")).headers.get("location")).toBe("https://survey.nrs.gov.ng/taxpayer")
  })

  it("can be repointed to another path on the same site", () => {
    vi.stubEnv("SHORTLINK_STAFF_URL", "/checklist")
    expect(staffLink(req("/s")).headers.get("location")).toBe("https://survey.dako.studio/checklist")
  })

  it("keeps the two links independent", () => {
    vi.stubEnv("SHORTLINK_TAXPAYER_URL", "https://survey.nrs.gov.ng/taxpayer")
    vi.stubEnv("SHORTLINK_STAFF_URL", "")
    expect(staffLink(req("/s")).headers.get("location")).toBe("https://survey.dako.studio/staff")
  })

  it("raises a clear error for a malformed target instead of redirecting somewhere wrong", () => {
    vi.stubEnv("SHORTLINK_TAXPAYER_URL", "not a url")
    expect(() => taxpayerLink(req("/t"))).toThrow("SHORTLINK_TAXPAYER_URL must be an absolute https:// URL")
  })

  it("refuses non-https targets and protocol-relative paths", () => {
    vi.stubEnv("SHORTLINK_TAXPAYER_URL", "http://example.com/form")
    expect(() => taxpayerLink(req("/t"))).toThrow("must use https://")
    vi.stubEnv("SHORTLINK_STAFF_URL", "//evil.example/x")
    expect(() => staffLink(req("/s"))).toThrow()
  })
})
