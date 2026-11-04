// @vitest-environment node
import { describe, expect, it } from "vitest"
import nextConfig from "../../next.config"

describe("legacy redirects", () => {
  it("sends the old /spaff checklist address to /staff with a temporary redirect", async () => {
    const redirects = await nextConfig.redirects?.()
    expect(redirects).toContainEqual({ source: "/spaff", destination: "/staff", permanent: false })
  })

  it("sends the old survey.dako.studio host to nrssurvey.dako.studio with a temporary redirect", async () => {
    const redirects = await nextConfig.redirects?.()
    expect(redirects).toContainEqual({
      source: "/:path*",
      has: [{ type: "host", value: "survey.dako.studio" }],
      destination: "https://nrssurvey.dako.studio/:path*",
      permanent: false,
    })
  })

  it("lists the host redirect before the /spaff rule", async () => {
    const redirects = (await nextConfig.redirects?.()) ?? []
    const hostIndex = redirects.findIndex((r) => r.has?.some((h) => h.type === "host" && h.value === "survey.dako.studio"))
    const spaffIndex = redirects.findIndex((r) => r.source === "/spaff")
    expect(hostIndex).toBe(0)
    expect(spaffIndex).toBeGreaterThan(hostIndex)
  })
})
