import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ScoreApp } from "./score-app"
import { SECTIONS } from "@/lib/staff-sections"

const ID = "11111111-1111-4111-8111-111111111111"
const CODE = "test-code-not-a-secret"
const OFFICE_VALUE = "ETO Abia, Abia"
const SCORE_PLACEHOLDER = "0–100"

type Reply = { status: number; body: unknown }
type Handler = Reply | ((init: RequestInit) => Reply)

let routes: Record<string, Handler>
let fetchMock: ReturnType<typeof vi.fn>

function jsonBody(init: RequestInit) {
  return JSON.parse(String(init.body)) as Record<string, unknown>
}
function headerOf(init: RequestInit, name: string) {
  return (init.headers as Record<string, string>)[name]
}
function callsTo(url: string) {
  return fetchMock.mock.calls.filter((c) => c[0] === url)
}

const visit = {
  id: ID,
  tax_office: OFFICE_VALUE,
  submitted_at: "2026-11-02T10:30:00.000Z",
  payload: {
    tax_office: OFFICE_VALUE,
    sections: SECTIONS.map((_, i) => ({
      status: i % 2 === 0 ? "YES" : "NO",
      remarks: i === 0 ? "Ceiling leaks near the counter" : "",
    })),
    staff: [{ name: "Amina Bello", ir: "IR123", rank: "Senior Officer", phone: "0803", email: "a@nrs.gov.ng" }],
  },
}

beforeEach(() => {
  routes = {
    "/api/staff/unlock": { status: 200, body: { ok: true } },
    "/api/staff/pending": {
      status: 200,
      body: { visits: [{ id: ID, submitted_at: visit.submitted_at, first_staff_name: "Amina Bello" }] },
    },
    [`/api/staff/pending/${ID}`]: { status: 200, body: visit },
    "/api/staff/score": { status: 200, body: { saved: true, sheetSynced: true, total_score: 72.5 } },
    [`/api/staff/score/${ID}/resend`]: { status: 200, body: { sheetSynced: true } },
  }
  fetchMock = vi.fn(async (url: string, init: RequestInit) => {
    const handler = routes[url]
    if (!handler) throw new Error(`Unexpected fetch to ${url}`)
    const { status, body } = typeof handler === "function" ? handler(init) : handler
    return { status, ok: status < 400, json: async () => body }
  })
  vi.stubGlobal("fetch", fetchMock)
})
afterEach(() => vi.unstubAllGlobals())

async function unlock(code = CODE) {
  fireEvent.change(document.querySelector("input[type=password]")!, { target: { value: code } })
  fireEvent.click(screen.getByRole("button", { name: "Unlock" }))
}

async function unlockAndPickOffice() {
  await unlock()
  await waitFor(() => expect(document.querySelectorAll("select").length).toBeGreaterThan(0))
  fireEvent.change(document.querySelectorAll("select")[0], { target: { value: "Abia" } })
  fireEvent.change(document.querySelectorAll("select")[1], { target: { value: "ETO Abia" } })
}

async function openReview() {
  await unlockAndPickOffice()
  await waitFor(() => expect(document.querySelectorAll("select")).toHaveLength(3))
  fireEvent.change(document.querySelectorAll("select")[2], { target: { value: ID } })
  await screen.findByText("Ceiling leaks near the counter")
}

function scoreInputs() {
  return screen.getAllByPlaceholderText(SCORE_PLACEHOLDER) as HTMLInputElement[]
}
function fillScores(value: string) {
  for (const input of scoreInputs()) fireEvent.change(input, { target: { value } })
}
function fillSignoffs() {
  // Each sign-off block has four text inputs: name, IR / rank, phone, email.
  const values = ["Some Value", "Some Value", "0803 123 4567", "someone@nrs.gov.ng"]
  document.querySelectorAll<HTMLInputElement>("input[type=text]").forEach((input, i) => {
    fireEvent.change(input, { target: { value: values[i % 4] } })
  })
}

describe("ScoreApp gate", () => {
  it("renders only the passcode box and makes no request before unlock", () => {
    render(<ScoreApp />)
    expect(document.querySelectorAll("input")).toHaveLength(1)
    expect(document.querySelector("input[type=password]")).not.toBeNull()
    expect(screen.getByRole("button", { name: "Unlock" })).toBeInTheDocument()
    expect(document.querySelectorAll("select")).toHaveLength(0)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("shows the server error for a wrong code and stays locked", async () => {
    routes["/api/staff/unlock"] = { status: 401, body: { error: "Incorrect access code" } }
    render(<ScoreApp />)
    await unlock("wrong")
    expect(await screen.findByText("Incorrect access code")).toBeInTheDocument()
    expect(document.querySelector("input[type=password]")).not.toBeNull()
    expect(document.querySelectorAll("select")).toHaveLength(0)
    expect(callsTo("/api/staff/pending")).toHaveLength(0)
  })

  it("shows how long to wait when rate limited", async () => {
    routes["/api/staff/unlock"] = {
      status: 429,
      body: { error: "Too many attempts.", retryAfterSeconds: 540 },
    }
    render(<ScoreApp />)
    await unlock()
    expect(await screen.findByText(/Too many attempts\..*9 minute\(s\)/)).toBeInTheDocument()
  })

  it("disables the button while the unlock request is in flight", async () => {
    let release!: () => void
    fetchMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = () => resolve({ status: 200, ok: true, json: async () => ({ ok: true }) })
        })
    )
    render(<ScoreApp />)
    await unlock()
    expect(screen.getByRole("button", { name: "Checking…" })).toBeDisabled()
    release()
    await waitFor(() => expect(document.querySelectorAll("select").length).toBeGreaterThan(0))
  })

  it("reveals the office picker after a successful unlock", async () => {
    render(<ScoreApp />)
    await unlock()
    await waitFor(() => expect(document.querySelectorAll("select")).toHaveLength(2))
    expect(document.querySelector("input[type=password]")).toBeNull()
    expect(callsTo("/api/staff/pending")).toHaveLength(0)
  })
})

describe("ScoreApp picker", () => {
  it("loads pending visits for the chosen office with the code header", async () => {
    render(<ScoreApp />)
    await unlockAndPickOffice()
    await waitFor(() => expect(callsTo("/api/staff/pending")).toHaveLength(1))
    const init = callsTo("/api/staff/pending")[0][1] as RequestInit
    expect(headerOf(init, "x-csqau-code")).toBe(CODE)
    expect(jsonBody(init)).toEqual({ tax_office: OFFICE_VALUE })
    const option = await screen.findByRole("option", { name: /Amina Bello/ })
    expect(option.textContent).toMatch(/2026/)
  })

  it("says so when the office has no pending submissions", async () => {
    routes["/api/staff/pending"] = { status: 200, body: { visits: [] } }
    render(<ScoreApp />)
    await unlockAndPickOffice()
    expect(await screen.findByText("No pending submissions for this office")).toBeInTheDocument()
  })

  it("returns to the gate when the list call answers 403", async () => {
    routes["/api/staff/pending"] = { status: 403, body: { error: "Forbidden" } }
    render(<ScoreApp />)
    await unlockAndPickOffice()
    expect(await screen.findByText("Forbidden")).toBeInTheDocument()
    expect(document.querySelector("input[type=password]")).not.toBeNull()
    expect(document.querySelectorAll("select")).toHaveLength(0)
  })
})

describe("ScoreApp review", () => {
  it("shows the officer answers read-only with only the score boxes editable", async () => {
    render(<ScoreApp />)
    await openReview()
    const table = document.querySelector<HTMLElement>(".nrs-check-table")!
    const remarks = within(table).getByText("Ceiling leaks near the counter")
    expect(remarks.tagName).not.toBe("TEXTAREA")
    expect(remarks.tagName).not.toBe("INPUT")
    expect(table.querySelectorAll("textarea, select, input[type=radio]")).toHaveLength(0)
    const inputs = table.querySelectorAll("input")
    expect(inputs).toHaveLength(SECTIONS.length)
    inputs.forEach((i) => expect(i.type).toBe("number"))
    expect(within(table).getByText("Amina Bello")).toBeInTheDocument()
    expect(within(table).getByText("Ambience (Is the unit conducive?)")).toBeInTheDocument()
    expect(within(table).getAllByText("YES").length).toBeGreaterThan(0)
    // 10 scores + 12 sign-off fields, nothing else.
    expect(document.querySelectorAll("input")).toHaveLength(SECTIONS.length + 12)
  })

  it("titles the sign-off blocks with Head CSU (not TPSU)", async () => {
    render(<ScoreApp />)
    await openReview()
    expect(screen.getByText("Checked by (CSQAU)")).toBeInTheDocument()
    expect(screen.getByText("Head CSU")).toBeInTheDocument()
    expect(screen.getByText("Tax Controller / State Monitor")).toBeInTheDocument()
    expect(screen.queryByText(/TPSU/)).not.toBeInTheDocument()
  })

  it("previews the total as scores are entered", async () => {
    render(<ScoreApp />)
    await openReview()
    fireEvent.change(scoreInputs()[0], { target: { value: "80" } })
    fireEvent.change(scoreInputs()[1], { target: { value: "60" } })
    expect(screen.getByText("70%")).toBeInTheDocument()
  })

  it("requires scores and sign-offs and sends nothing when invalid", async () => {
    render(<ScoreApp />)
    await openReview()
    fireEvent.click(screen.getByRole("button", { name: "Save scores" }))
    expect((await screen.findAllByText("Enter a score")).length).toBe(SECTIONS.length)
    expect(callsTo("/api/staff/score")).toHaveLength(0)
  })

  it("range-checks scores", async () => {
    render(<ScoreApp />)
    await openReview()
    fillScores("50")
    fireEvent.change(scoreInputs()[3], { target: { value: "101" } })
    fillSignoffs()
    fireEvent.click(screen.getByRole("button", { name: "Save scores" }))
    expect(await screen.findByText("Score must be between 0 and 100")).toBeInTheDocument()
    expect(callsTo("/api/staff/score")).toHaveLength(0)
  })

  it("refuses a bad sign-off phone or email in all three blocks and sends nothing", async () => {
    render(<ScoreApp />)
    await openReview()
    fillScores("50")
    fillSignoffs()
    document.querySelectorAll<HTMLInputElement>("input[type=text]").forEach((input, i) => {
      if (i % 4 === 2) fireEvent.change(input, { target: { value: "wec" } })
      if (i % 4 === 3) fireEvent.change(input, { target: { value: "ec" } })
    })
    fireEvent.click(screen.getByRole("button", { name: "Save scores" }))
    expect((await screen.findAllByText(/valid Nigerian phone number/)).length).toBe(3)
    expect(screen.getAllByText(/valid email address/).length).toBe(3)
    expect(callsTo("/api/staff/score")).toHaveLength(0)
  })

  it("requires every sign-off field", async () => {
    render(<ScoreApp />)
    await openReview()
    fillScores("50")
    fireEvent.click(screen.getByRole("button", { name: "Save scores" }))
    expect((await screen.findAllByText("Required")).length).toBe(12)
    expect(callsTo("/api/staff/score")).toHaveLength(0)
  })

  it("saves the id and scores without a total and shows the success state", async () => {
    render(<ScoreApp />)
    await openReview()
    fillScores("50")
    fillSignoffs()
    fireEvent.click(screen.getByRole("button", { name: "Save scores" }))
    expect(await screen.findByText("Scored. Total 72.5%")).toBeInTheDocument()
    const init = callsTo("/api/staff/score")[0][1] as RequestInit
    expect(headerOf(init, "x-csqau-code")).toBe(CODE)
    const body = jsonBody(init)
    expect(body.id).toBe(ID)
    expect(body.scores).toEqual(Array(10).fill(50))
    expect(Object.keys(body).sort()).toEqual(["id", "scores", "signoffs"])
    expect(Object.keys(body.signoffs as object).sort()).toEqual(["checked_by", "controller", "head_tpsu"])
  })

  it("returns to the picker with Score another", async () => {
    render(<ScoreApp />)
    await openReview()
    fillScores("50")
    fillSignoffs()
    fireEvent.click(screen.getByRole("button", { name: "Save scores" }))
    fireEvent.click(await screen.findByRole("button", { name: "Score another" }))
    await waitFor(() => expect(document.querySelectorAll("select").length).toBeGreaterThan(0))
    expect(screen.queryByText("Scored. Total 72.5%")).not.toBeInTheDocument()
  })

  it("warns when the sheet update failed and resends on request", async () => {
    routes["/api/staff/score"] = { status: 200, body: { saved: true, sheetSynced: false, total_score: 61 } }
    render(<ScoreApp />)
    await openReview()
    fillScores("50")
    fillSignoffs()
    fireEvent.click(screen.getByRole("button", { name: "Save scores" }))
    expect(await screen.findByText(/Saved, but the sheet update failed/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Resend to sheet" }))
    expect(await screen.findByText("Scored. Total 61%")).toBeInTheDocument()
    expect(callsTo(`/api/staff/score/${ID}/resend`)).toHaveLength(1)
  })

  it("keeps the resend button when the resend fails", async () => {
    routes["/api/staff/score"] = { status: 200, body: { saved: true, sheetSynced: false, total_score: 61 } }
    routes[`/api/staff/score/${ID}/resend`] = { status: 502, body: { error: "Sheet unreachable" } }
    render(<ScoreApp />)
    await openReview()
    fillScores("50")
    fillSignoffs()
    fireEvent.click(screen.getByRole("button", { name: "Save scores" }))
    fireEvent.click(await screen.findByRole("button", { name: "Resend to sheet" }))
    expect(await screen.findByText("Sheet unreachable")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Resend to sheet" })).toBeInTheDocument()
  })

  it("shows the conflict message on 409 and goes back to the list", async () => {
    routes["/api/staff/score"] = { status: 409, body: { error: "already scored" } }
    render(<ScoreApp />)
    await openReview()
    fillScores("50")
    fillSignoffs()
    const listCallsBefore = callsTo("/api/staff/pending").length
    fireEvent.click(screen.getByRole("button", { name: "Save scores" }))
    expect(await screen.findByText("Someone else already scored this submission")).toBeInTheDocument()
    expect(callsTo("/api/staff/pending").length).toBeGreaterThan(listCallsBefore)
  })

  it("returns to the gate when saving answers 403", async () => {
    routes["/api/staff/score"] = { status: 403, body: { error: "Forbidden" } }
    render(<ScoreApp />)
    await openReview()
    fillScores("50")
    fillSignoffs()
    fireEvent.click(screen.getByRole("button", { name: "Save scores" }))
    expect(await screen.findByText("Forbidden")).toBeInTheDocument()
    expect(document.querySelector("input[type=password]")).not.toBeNull()
  })

  it("shows the server error on 400", async () => {
    routes["/api/staff/score"] = { status: 400, body: { error: "Invalid scores" } }
    render(<ScoreApp />)
    await openReview()
    fillScores("50")
    fillSignoffs()
    fireEvent.click(screen.getByRole("button", { name: "Save scores" }))
    expect(await screen.findByText("Invalid scores")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Save scores" })).toBeInTheDocument()
  })

  it("refreshes the list when the chosen visit is already scored", async () => {
    routes[`/api/staff/pending/${ID}`] = { status: 409, body: { error: "already scored" } }
    render(<ScoreApp />)
    await unlockAndPickOffice()
    await waitFor(() => expect(document.querySelectorAll("select")).toHaveLength(3))
    const before = callsTo("/api/staff/pending").length
    fireEvent.change(document.querySelectorAll("select")[2], { target: { value: ID } })
    expect(await screen.findByText("already scored")).toBeInTheDocument()
    await waitFor(() => expect(callsTo("/api/staff/pending").length).toBeGreaterThan(before))
  })
})

describe("ScoreApp overview link", () => {
  it("is absent at the gate", () => {
    render(<ScoreApp />)
    expect(screen.queryByRole("link", { name: "See who has submitted" })).toBeNull()
  })

  it("appears after unlock and points to /staff/overview", async () => {
    render(<ScoreApp />)
    await unlock()
    const link = await screen.findByRole("link", { name: "See who has submitted" })
    expect(link).toHaveAttribute("href", "/staff/overview")
  })
})
