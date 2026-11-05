import { readFileSync } from "node:fs"
import path from "node:path"
import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import TaxpayerPage from "./taxpayer/page"
import StaffPage from "./staff/page"
import ScorePage from "./staff/score/page"

describe.each([
  ["taxpayer survey", TaxpayerPage],
  ["staff checklist", StaffPage],
  ["scorer page", ScorePage],
])("%s page", (_name, Page) => {
  it("has no top bar or nav header, and starts with the letterhead", () => {
    const { container } = render(<Page />)
    expect(container.querySelector(".nrs-topbar")).toBeNull()
    expect(container.querySelector(".nrs-nav")).toBeNull()
    expect(container.querySelector("a.nrs-btn--nav")).toBeNull()
    expect(container.firstElementChild?.querySelector(".nrs-letterhead")).not.toBeNull()
    expect(container.querySelector("h1")).not.toBeNull()
  })

  it("keeps the footer", () => {
    const { container } = render(<Page />)
    expect(container.querySelector("footer")).not.toBeNull()
  })
})

describe("nav button contrast", () => {
  it("forces white text on the red nav button so the grey link colour cannot override it", () => {
    const css = readFileSync(path.join(process.cwd(), "src/app/nrs-tokens.css"), "utf8")
    const rule = css.match(/\.nrs-nav__links a\.nrs-btn--nav,\s*\.nrs-nav__links a\.nrs-btn--nav:hover\s*\{([^}]*)\}/)
    expect(rule).not.toBeNull()
    expect(rule![1]).toMatch(/color:\s*var\(--nrs-white\)/)
  })
})
