import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { StaffForm, buildStage1Payload } from "./staff-form"
import { SECTIONS } from "@/lib/staff-sections"
import { stage1Schema } from "@/lib/staff-schema"

const OFFICE = "ETO Abia, Abia"

afterEach(() => vi.unstubAllGlobals())

function mockFetch(status: number, body: unknown) {
  const fn = vi.fn(async (..._args: unknown[]) => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }))
  vi.stubGlobal("fetch", fn)
  return fn
}

function fillValidForm(container: HTMLElement) {
  const [stateSel, officeSel] = screen.getAllByRole("combobox")
  fireEvent.change(stateSel, { target: { value: "Abia" } })
  fireEvent.change(officeSel, { target: { value: "ETO Abia" } })
  SECTIONS.forEach((section, i) => {
    if (section.listOnly) return
    const yes = container.querySelector<HTMLInputElement>(
      `input[name="sections.${i}.status"][value="YES"]`
    )!
    fireEvent.click(yes)
  })
  const staffInputs = container.querySelectorAll<HTMLInputElement>(".nrs-check-extra input")
  const vals = ["Ada Obi", "IR123", "Officer", "08012345678", "ada@example.com"]
  vals.forEach((v, i) => fireEvent.change(staffInputs[i], { target: { value: v } }))
}

describe("StaffForm (officer, step 1)", () => {
  it("has no unlock, password, score, total or sign-off UI", () => {
    const { container } = render(<StaffForm />)
    expect(screen.queryByRole("button", { name: /unlock scoring/i })).toBeNull()
    expect(container.querySelector("input[type=password]")).toBeNull()
    expect(container.querySelector(".nrs-check-score")).toBeNull()
    expect(container.querySelector(".nrs-check-table--scored")).toBeNull()
    expect(screen.queryByText(/TOTAL SCORE/)).toBeNull()
    expect(screen.queryByText(/Checked by/)).toBeNull()
  })

  it("renders 10 rows and a four-column header without Score", () => {
    const { container } = render(<StaffForm />)
    expect(container.querySelectorAll(".nrs-check-row")).toHaveLength(10)
    const heads = Array.from(container.querySelectorAll(".nrs-check-head > div")).map(
      (d) => d.textContent
    )
    expect(heads).toEqual(["S/N", "Issues", "Yes / No", "Remarks / actions required"])
  })

  it("shows Number of staff as a heading: no YES/NO or remarks, only the staff list", () => {
    const { container } = render(<StaffForm />)
    const i = SECTIONS.findIndex((x) => x.key === "s2")
    expect(container.querySelector(`input[name="sections.${i}.status"]`)).toBeNull()
    expect(screen.getByText("Number of staff")).toBeInTheDocument()
    expect(container.querySelectorAll(".nrs-check-extra input").length).toBe(5)
    expect(container.querySelectorAll('input[type="radio"]').length).toBe((SECTIONS.length - 1) * 2)
  })

  it("shows the scorer banner linking to /staff/score", () => {
    render(<StaffForm />)
    const link = screen.getByRole("link", { name: "CSQAU scorer? Open the scoring page" })
    expect(link).toHaveAttribute("href", "/staff/score")
  })

  it("buildStage1Payload passes stage1Schema and has no score or sign-off keys", () => {
    const payload = buildStage1Payload({
      tax_office: OFFICE,
      sections: SECTIONS.map((_, i) => ({
        status: SECTIONS[i].listOnly ? "N/A" : i % 2 ? "NO" : "YES",
        remarks: i ? "note" : undefined,
      })),
      staff: [{ name: "Ada", ir: "1", rank: "Officer", phone: "08012345678", email: "a@b.ng" }],
    })
    expect(stage1Schema.safeParse(payload).success).toBe(true)
    expect(payload.sections).toHaveLength(10)
    expect(payload.sections[0].remarks).toBe("")
    expect(JSON.stringify(payload)).not.toMatch(/score|total|checked_by|head_tpsu|controller/)
  })

  it("refuses a bad staff phone or email, shows the message and sends nothing", async () => {
    const fetchMock = mockFetch(201, { id: "x", reference: "NRS-X" })
    const { container } = render(<StaffForm />)
    fillValidForm(container)
    const staffInputs = container.querySelectorAll<HTMLInputElement>(".nrs-check-extra input")
    fireEvent.change(staffInputs[3], { target: { value: "dc" } })
    fireEvent.change(staffInputs[4], { target: { value: "dsc" } })
    fireEvent.click(screen.getByRole("button", { name: /submit checklist/i }))
    expect(await screen.findByText(/valid Nigerian phone number/)).toBeInTheDocument()
    expect(screen.getByText(/valid email address/)).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("shows validation errors and does not call fetch for an incomplete form", async () => {
    const fetchMock = mockFetch(201, { id: "x", reference: "NRS-X" })
    render(<StaffForm />)
    fireEvent.click(screen.getByRole("button", { name: /submit checklist/i }))
    expect(await screen.findByText("Please select the tax office")).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("posts JSON and shows the reference on 201", async () => {
    const fetchMock = mockFetch(201, { id: "abc", reference: "NRS-1A2B3C4D" })
    const { container } = render(<StaffForm />)
    fillValidForm(container)
    fireEvent.click(screen.getByRole("button", { name: /submit checklist/i }))
    expect(await screen.findByText("Checklist submitted!")).toBeInTheDocument()
    expect(screen.getByText(/NRS-1A2B3C4D/)).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe("/api/staff")
    expect(init.method).toBe("POST")
    expect(stage1Schema.safeParse(JSON.parse(init.body as string)).success).toBe(true)
  })

  it.each([
    [400, "Invalid submission"],
    [503, "Storage is not configured"],
  ])("shows the server error on %i", async (status, message) => {
    mockFetch(status, { error: message })
    const { container } = render(<StaffForm />)
    fillValidForm(container)
    fireEvent.click(screen.getByRole("button", { name: /submit checklist/i }))
    expect(await screen.findByText(message)).toBeInTheDocument()
    expect(screen.queryByText("Checklist submitted!")).toBeNull()
  })

  it("Submit another response resets the form", async () => {
    mockFetch(201, { id: "abc", reference: "NRS-1A2B3C4D" })
    const { container } = render(<StaffForm />)
    fillValidForm(container)
    fireEvent.click(screen.getByRole("button", { name: /submit checklist/i }))
    fireEvent.click(await screen.findByRole("button", { name: "Submit another response" }))
    await waitFor(() => expect(container.querySelectorAll(".nrs-check-row")).toHaveLength(10))
    expect(container.querySelectorAll("input[type=radio]:checked")).toHaveLength(0)
  })
})
