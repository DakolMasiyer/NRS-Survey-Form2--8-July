import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { Letterhead } from "./letterhead"

const ADDRESS = "Plot 1241, Kur Mohammed Avenue, Central Business District, Abuja, FCT"

function follows(a: Node, b: Node) {
  return Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)
}

describe("Letterhead", () => {
  it("stacks Strategic Management Office above the unit, then address, rule and title", () => {
    render(
      <Letterhead
        title="Taxpayer Satisfaction Survey"
        units={["Customer Service Group"]}
        address={ADDRESS}
        subtitle="Help us serve you better"
      />
    )
    const logo = screen.getByAltText("Nigeria Revenue Service")
    const tagline = screen.getByText("Inspiring Trust, Sustaining Growth")
    const smo = screen.getByText("Strategic Management Office")
    const unit = screen.getByText("Customer Service Group")
    const address = screen.getByText(ADDRESS)
    const title = screen.getByRole("heading", { name: "Taxpayer Satisfaction Survey" })

    expect(follows(logo, tagline)).toBe(true)
    expect(follows(tagline, smo)).toBe(true)
    expect(follows(smo, unit)).toBe(true)
    expect(follows(unit, address)).toBe(true)
    expect(follows(address, title)).toBe(true)
  })

  it("renders several units in the order given (checklist: CSG then CSQAU)", () => {
    render(
      <Letterhead
        title="Checklist"
        units={["Customer Service Group", "Customer Service Quality Assurance Unit"]}
      />
    )
    expect(
      follows(
        screen.getByText("Customer Service Group"),
        screen.getByText("Customer Service Quality Assurance Unit")
      )
    ).toBe(true)
  })

  it("omits the address when none is given", () => {
    const { container } = render(<Letterhead title="Checklist" units={["Customer Service Group"]} />)
    expect(container.querySelector(".nrs-letterhead__address")).toBeNull()
  })
})
