import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
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

afterEach(() => vi.unstubAllGlobals())

describe("taxpayer schema", () => {
  it("accepts a response with Section A left entirely empty", () => {
    expect(schema.safeParse(VALID).success).toBe(true)
  })

  it("accepts blank optional phone/email but refuses typed junk", () => {
    expect(schema.safeParse({ ...VALID, phone: "", email: "", contact_email: "" }).success).toBe(true)
    expect(schema.safeParse({ ...VALID, phone: "fve" }).success).toBe(false)
    expect(schema.safeParse({ ...VALID, email: "efv" }).success).toBe(false)
    expect(schema.safeParse({ ...VALID, contact_email: "c df f" }).success).toBe(false)
    expect(schema.safeParse({ ...VALID, phone: "+1 415 555 2671", email: "a@b.com", contact_email: "x@y.ng" }).success).toBe(true)
  })

  it("accepts has_tax_id blank or answered", () => {
    expect(schema.safeParse({ ...VALID, has_tax_id: "" }).success).toBe(true)
    expect(schema.safeParse({ ...VALID, has_tax_id: "NO", phone: "08011112222", email: "a@b.ng" }).success).toBe(true)
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
    expect(taxIdLabel).not.toHaveTextContent("(optional)")
    const suggestionsLabel = screen.getByText(/What suggestions do you have/).closest(".nrs-form-label")!
    expect(suggestionsLabel).toHaveTextContent("(optional)")
    const complianceLabel = screen.getByText("Have you been tax compliant?").closest(".nrs-form-label")!
    expect(complianceLabel).not.toHaveTextContent("(optional)")
  })

  it("shows the five paper-form section bars A to E in order", () => {
    const { container } = render(<TaxpayerForm />)
    const bars = [...container.querySelectorAll(".nrs-section-bar")].map((b) => b.textContent)
    expect(bars).toEqual([
      "Section A — Taxpayer / Business Information",
      "Section B — Tax Compliance",
      "Section C — Service Experience",
      "Section D — Digital Channels & Awareness",
      "Section E — Your Feedback",
    ])
  })

  it("ends with the paper form's thank-you and powered-by lines", () => {
    render(<TaxpayerForm />)
    expect(screen.getByText("WE THANK YOU FOR YOUR TIME AND FEEDBACK!")).toBeInTheDocument()
    expect(
      screen.getByText("Powered by the Customer Service Group, Nigeria Revenue Service (NRS)")
    ).toBeInTheDocument()
  })

  it("shows the six channels in one grid with their details", () => {
    const { container } = render(<TaxpayerForm />)
    const rows = [...container.querySelectorAll(".nrs-channel-row")]
    expect(rows).toHaveLength(6)
    expect(rows[0]).toHaveTextContent("NRS Website")
    expect(rows[0]).toHaveTextContent("www.nrs.gov.ng")
    expect(rows[1]).toHaveTextContent("0209 460 2700")
    expect(rows[2]).toHaveTextContent("*829#")
    expect(rows[4]).toHaveTextContent("selfservice.nrs.gov.ng")
    expect(rows[5]).toHaveTextContent("NRS E-Invoicing Platform")
    expect(rows[5]).toHaveTextContent("einvoice.nrs.gov.ng")
    for (const row of rows) expect(row.querySelectorAll("input[type=radio]")).toHaveLength(2)
  })

  it("requires an answer for every channel", async () => {
    const { container } = render(<TaxpayerForm />)
    fireEvent.click(screen.getByRole("button", { name: /Submit Survey/ }))
    await waitFor(() =>
      expect(container.querySelectorAll(".nrs-channel-row .nrs-field-error")).toHaveLength(6)
    )
  })

  it("shows the confirmed social handles and helpdesk contact", () => {
    render(<TaxpayerForm />)
    expect(screen.getByText("OfficialNRSNigeria")).toBeInTheDocument()
    expect(screen.getByText("@NigeriaRevenue")).toBeInTheDocument()
    expect(screen.getByText("@nigeriarevenue")).toBeInTheDocument()
    expect(screen.getByText("Nigeria Revenue Service")).toBeInTheDocument()
    expect(screen.getByText(/helpdesk@nrs\.gov\.ng/)).toBeInTheDocument()
    expect(screen.queryByText(/@nigeriarevenue — Nigeria Revenue Service/)).not.toBeInTheDocument()
  })

  it("asks Rev360 comfort with the paper scale only when Rev360 is familiar", () => {
    render(<TaxpayerForm />)
    expect(screen.queryByText("Never Used")).not.toBeInTheDocument()
    const row = screen.getByText("Rev360 Self-Service Portal").closest(".nrs-channel-row") as HTMLElement
    fireEvent.click(within(row).getByLabelText("YES"))
    for (const option of ["Very Comfortable", "Comfortable", "Neutral", "Uncomfortable", "Never Used"]) {
      expect(screen.getByText(option)).toBeInTheDocument()
    }
  })

  it("asks the non-compliance reasons as their own numbered Q3, worded like the paper form", () => {
    render(<TaxpayerForm />)
    const label = screen.getByText(/If you ticked NO above, what is the reason\?/).closest(".nrs-form-label")!
    expect(label.querySelector(".nrs-q-num")?.textContent).toBe("3")
    expect(screen.getByText("I don't know how to file my taxes or which taxes I owe")).toBeInTheDocument()
    expect(
      screen.getByText("I am worried about unfair assessments, arrears, penalties or interest")
    ).toBeInTheDocument()
    const ease = screen.getByText(/Does NRS make it easy/).closest(".nrs-form-label")!
    expect(ease.querySelector(".nrs-q-num")?.textContent).toBe("4")
  })

  it("keeps the Q3 reasons disabled until Q2 is NO, and clears them when switched back to YES", () => {
    const { container } = render(<TaxpayerForm />)
    const reasons = () => [...container.querySelectorAll<HTMLInputElement>("input[type=checkbox]")]
    expect(reasons()).toHaveLength(5)
    for (const box of reasons()) expect(box).toBeDisabled()

    const q2 = (v: string) => container.querySelector<HTMLInputElement>(`input[name=tax_compliant][value=${v}]`)!
    fireEvent.click(q2("NO"))
    for (const box of reasons()) expect(box).toBeEnabled()
    fireEvent.click(reasons()[0])
    expect(reasons()[0]).toBeChecked()

    fireEvent.click(q2("YES"))
    for (const box of reasons()) {
      expect(box).toBeDisabled()
      expect(box).not.toBeChecked()
    }
  })

  it("still refuses NO on Q2 with no reason ticked", () => {
    expect(schema.safeParse({ ...VALID, tax_compliant: "NO", non_compliance_reasons: [] }).success).toBe(false)
    expect(
      schema.safeParse({ ...VALID, tax_compliant: "NO", non_compliance_reasons: ["My tax office is far away"] }).success
    ).toBe(true)
  })

  it("shows separate optional phone and email fields when the company has no Tax ID", () => {
    render(<TaxpayerForm />)
    fireEvent.click(screen.getAllByLabelText("NO")[0])
    expect(screen.getByText("Phone number (optional)")).toBeInTheDocument()
    expect(screen.getByText("Email address (optional)")).toBeInTheDocument()
  })

  it("shows a message under bad optional phone/email entries and sends nothing", async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)
    render(<TaxpayerForm />)
    fireEvent.click(screen.getAllByLabelText("NO")[0])
    const phone = document.querySelector<HTMLInputElement>("input[type=tel]")!
    const [email, contactEmail] = Array.from(document.querySelectorAll<HTMLInputElement>("input[type=email]"))
    fireEvent.change(phone, { target: { value: "fve" } })
    fireEvent.change(email, { target: { value: "efv" } })
    fireEvent.change(contactEmail, { target: { value: "c df f" } })
    fireEvent.click(screen.getByRole("button", { name: /submit/i }))
    expect(await screen.findByText(/valid phone number/)).toBeInTheDocument()
    expect((await screen.findAllByText(/valid email address/)).length).toBe(2)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
