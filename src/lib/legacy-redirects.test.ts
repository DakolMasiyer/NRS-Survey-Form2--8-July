// @vitest-environment node
import { describe, expect, it } from "vitest"
import nextConfig from "../../next.config"

describe("legacy redirects", () => {
  it("sends the old /spaff checklist address to /staff with a temporary redirect", async () => {
    const redirects = await nextConfig.redirects?.()
    expect(redirects).toContainEqual({ source: "/spaff", destination: "/staff", permanent: false })
  })
})
