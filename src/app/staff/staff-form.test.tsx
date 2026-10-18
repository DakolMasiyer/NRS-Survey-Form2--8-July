import { fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { StaffForm } from "./staff-form"

const SCORE_PLACEHOLDER = "0–100"
const TOTAL_LABEL = "TOTAL SCORE (auto-computed average)"

function mockUnlock(ok: boolean) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok,
      json: async () => (ok ? { ok: true } : { error: "Incorrect access code" }),
    }))
  )
}

async function tryCode(container: HTMLElement, code: string) {
  const input = container.querySelector<HTMLInputElement>("input[type=password]")!
  fireEvent.change(input, { target: { value: code } })
  fireEvent.click(screen.getByRole("button", { name: "Unlock scoring" }))
}

afterEach(() => vi.unstubAllGlobals())

describe("StaffForm scoring lock", () => {
  it("hides score fields and the total until unlocked", () => {
    render(<StaffForm />)
    expect(screen.queryAllByPlaceholderText(SCORE_PLACEHOLDER)).toHaveLength(0)
    expect(screen.queryByText(TOTAL_LABEL)).not.toBeInTheDocument()
  })

  it("labels the first sign-off block as CSQAU", () => {
    render(<StaffForm />)
    expect(screen.getByText("Checked by (CSQAU)")).toBeInTheDocument()
  })

  it("shows score fields for all 10 sections and the total after a successful unlock", async () => {
    mockUnlock(true)
    const { container } = render(<StaffForm />)
    await tryCode(container, "test-code")
    expect(await screen.findAllByPlaceholderText(SCORE_PLACEHOLDER)).toHaveLength(10)
    expect(screen.getByText(TOTAL_LABEL)).toBeInTheDocument()
  })

  it("stays locked and shows the error when the code is rejected", async () => {
    mockUnlock(false)
    const { container } = render(<StaffForm />)
    await tryCode(container, "wrong")
    expect(await screen.findByText("Incorrect access code")).toBeInTheDocument()
    expect(screen.queryAllByPlaceholderText(SCORE_PLACEHOLDER)).toHaveLength(0)
  })
})
