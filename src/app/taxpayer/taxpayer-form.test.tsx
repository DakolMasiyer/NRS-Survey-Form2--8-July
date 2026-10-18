import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { TaxpayerForm, schema } from "./taxpayer-form"

const VALID = {
  tax_office: "ETO Garki, FCT",
  tax_compliant: "YES",
  non_compliance_reasons: [],
  ease_of_payment: "EASY",
  wait_time: "Less than 15 minutes",
  issue_resolved: "YES",
  resolution_satisfaction: "GOOD",
  knows_website: "YES",
  knows_contact_centre: "YES",
  knows_ussd: "NO",
  knows_tax_id_url: "NO",
  knows_rev360: "NO",
  knows_einvoicing: "NO",
  knows_social_media: "YES",
}

describe("taxpayer schema", () => {
  it("accepts a response with Section A left entirely empty", () => {
    expect(schema.safeParse(VALID).success).toBe(true)
  })

  it("accepts has_tax_id blank or answered", () => {
    expect(schema.safeParse({ ...VALID, has_tax_id: "" }).success).toBe(true)
    expect(schema.safeParse({ ...VALID, has_tax_id: "NO", phone: "0801", email: "a@b.ng" }).success).toBe(true)
  })

  it("still requires the tax office, and only a listed one", () => {
    expect(schema.safeParse({ ...VALID, tax_office: "" }).success).toBe(false)
    expect(schema.safeParse({ ...VALID, tax_office: "Nonsense, Lagos" }).success).toBe(false)
  })

  it("still requires the service-experience answers", () => {
    expect(schema.safeParse({ ...VALID, ease_of_payment: "" }).success).toBe(false)
    expect(schema.safeParse({ ...VALID, knows_ussd: "" }).success).toBe(false)
  })

  it("no longer has the combined phone_email field", () => {
    expect(Object.keys(schema.shape)).not.toContain("phone_email")
    expect(Object.keys(schema.shape)).toEqual(expect.arrayContaining(["phone", "email"]))
  })
})

describe("TaxpayerForm layout", () => {
  it("leaves the Tax Office unnumbered and starts numbering at 1", () => {
    const { container } = render(<TaxpayerForm />)
    const officeLabel = screen.getByText("Tax Office").closest(".nrs-form-label")!
    expect(officeLabel.querySelector(".nrs-q-num")).toBeNull()
    expect(container.querySelector(".nrs-q-num")?.textContent).toBe("1")
  })

  it("marks optional questions instead of starring required ones", () => {
    const { container } = render(<TaxpayerForm />)
    expect(container.querySelector(".nrs-req")).toBeNull()
    const taxIdLabel = screen.getByText(/Does your company have a Tax ID/).closest(".nrs-form-label")!
    expect(taxIdLabel).toHaveTextContent("(optional)")
    const complianceLabel = screen.getByText("Have you been tax compliant?").closest(".nrs-form-label")!
    expect(complianceLabel).not.toHaveTextContent("(optional)")
  })

  it("shows separate optional phone and email fields when the company has no Tax ID", () => {
    render(<TaxpayerForm />)
    fireEvent.click(screen.getAllByLabelText("NO")[0])
    expect(screen.getByText("Phone number (optional)")).toBeInTheDocument()
    expect(screen.getByText("Email address (optional)")).toBeInTheDocument()
  })
})
