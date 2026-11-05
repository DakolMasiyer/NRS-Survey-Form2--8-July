import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { OverviewApp } from "./overview-app"

const CODE = "test-code-not-a-secret"

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

function office(
  label: string,
  name: string,
  status: "not_submitted" | "waiting" | "scored",
  pending: number,
  scored: number,
  last: string | null
) {
  return {
    state: label,
    label,
    name,
    tax_office: `${name}, ${label}`,
    status,
    pending,
    scored,
    last_submitted_at: last,
    // Must never be rendered.
    first_staff_name: "SHOULD NOT SHOW",
  }
}

// 23:56 UTC on 3 Nov is 00:56 on 4 Nov in Nigeria (UTC+1).
const NEAR_MIDNIGHT = "2026-11-03T23:56:00.000Z"

const NOVEMBER = {
  month: "2026-11",
  months: ["2026-11", "2026-10"],
  summary: { offices_total: 5, submitted: 3, not_submitted: 2, waiting: 1, scored: 2, submissions: 4 },
  offices: [
    office("Abia", "ETO Abia", "scored", 0, 2, NEAR_MIDNIGHT),
    office("Abia", "ETO Aba", "not_submitted", 0, 0, null),
    office("Lagos", "ETO Ikeja", "waiting", 1, 0, "2026-11-04T10:30:00.000Z"),
    office("Lagos", "ETO Ikoyi", "scored", 0, 1, "2026-11-02T09:00:00.000Z"),
    office("FCT", "ETO Garki", "not_submitted", 0, 0, null),
  ],
}
const OCTOBER = {
  ...NOVEMBER,
  month: "2026-10",
  summary: { offices_total: 5, submitted: 1, not_submitted: 4, waiting: 0, scored: 1, submissions: 1 },
  offices: NOVEMBER.offices.map((o) => ({ ...o, status: "not_submitted" as const, pending: 0, scored: 0, last_submitted_at: null })),
}

beforeEach(() => {
  routes = {
    "/api/staff/unlock": { status: 200, body: { ok: true } },
    "/api/staff/overview": (init) => ({
      status: 200,
      body: jsonBody(init).month === "2026-10" ? OCTOBER : NOVEMBER,
    }),
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

function unlock(code = CODE) {
  fireEvent.change(document.querySelector("input[type=password]")!, { target: { value: code } })
  fireEvent.click(screen.getByRole("button", { name: "Unlock" }))
}

async function unlocked() {
  render(<OverviewApp />)
  unlock()
  await screen.findByText("ETO Abia")
}

function tile(label: string) {
  return screen.getByText(label, { selector: ".nrs-ov-tile__label" }).closest("li")!
}
function select(id: string) {
  return document.getElementById(id) as HTMLSelectElement
}

describe("OverviewApp gate", () => {
  it("renders only the passcode box and makes no request before unlock", () => {
    render(<OverviewApp />)
    expect(document.querySelectorAll("input")).toHaveLength(1)
    expect(document.querySelector("input[type=password]")).not.toBeNull()
    expect(screen.getByRole("button", { name: "Unlock" })).toBeInTheDocument()
    expect(screen.getByText(/This page is for NRS staff/)).toBeInTheDocument()
    expect(document.querySelectorAll("select")).toHaveLength(0)
    expect(screen.queryByRole("table")).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("shows the server error for a wrong code and stays locked", async () => {
    routes["/api/staff/unlock"] = { status: 401, body: { error: "Incorrect access code" } }
    render(<OverviewApp />)
    unlock("wrong")
    expect(await screen.findByText("Incorrect access code")).toBeInTheDocument()
    expect(document.querySelector("input[type=password]")).not.toBeNull()
    expect(callsTo("/api/staff/overview")).toHaveLength(0)
  })

  it("shows how long to wait when rate limited", async () => {
    routes["/api/staff/unlock"] = { status: 429, body: { error: "Too many attempts.", retryAfterSeconds: 540 } }
    render(<OverviewApp />)
    unlock()
    expect(await screen.findByText(/Too many attempts\..*9 minute\(s\)/)).toBeInTheDocument()
    expect(callsTo("/api/staff/overview")).toHaveLength(0)
  })

  it("disables the button while the unlock request is in flight", async () => {
    let release!: () => void
    fetchMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = () => resolve({ status: 200, ok: true, json: async () => ({ ok: true }) })
        })
    )
    render(<OverviewApp />)
    unlock()
    expect(screen.getByRole("button", { name: "Checking…" })).toBeDisabled()
    release()
    await screen.findByText("ETO Abia")
  })
})

describe("OverviewApp after unlock", () => {
  it("requests the overview once with {} and the code header", async () => {
    await unlocked()
    const calls = callsTo("/api/staff/overview")
    expect(calls).toHaveLength(1)
    expect(jsonBody(calls[0][1])).toEqual({})
    expect(headerOf(calls[0][1], "x-csqau-code")).toBe(CODE)
  })

  it("shows the summary tiles with their numbers and labels", async () => {
    await unlocked()
    expect(within(tile("Offices")).getByText("5")).toBeInTheDocument()
    expect(within(tile("Submitted")).getByText("3")).toBeInTheDocument()
    expect(within(tile("Not submitted")).getByText("2")).toBeInTheDocument()
    expect(within(tile("Waiting to be scored")).getByText("1")).toBeInTheDocument()
    expect(within(tile("Scored")).getByText("2")).toBeInTheDocument()
  })

  it("groups the table by state with x of y submitted", async () => {
    await unlocked()
    expect(screen.getByText("Abia: 1 of 2 submitted")).toBeInTheDocument()
    expect(screen.getByText("Lagos: 2 of 2 submitted")).toBeInTheDocument()
    expect(screen.getByText("FCT: 0 of 1 submitted")).toBeInTheDocument()
    const rows = screen.getAllByRole("row").map((r) => r.textContent ?? "")
    const order = ["Abia:", "ETO Abia", "ETO Aba", "Lagos:", "ETO Ikeja", "ETO Ikoyi", "FCT:", "ETO Garki"]
    const positions = order.map((t) => rows.findIndex((r) => r.startsWith(t)))
    expect(positions.every((p) => p >= 0)).toBe(true)
    expect([...positions].sort((a, b) => a - b)).toEqual(positions)
  })

  it("shows status text, submission count and Nigeria-time dates", async () => {
    await unlocked()
    const row = screen.getByText("ETO Abia").closest("tr")!
    expect(within(row).getByText("Scored")).toBeInTheDocument()
    expect(within(row).getByText("2")).toBeInTheDocument()
    // 23:56 UTC on 3 Nov is 00:56 on 4 Nov in Lagos.
    expect(within(row).getByText("4 Nov 2026, 00:56")).toBeInTheDocument()
    const ikeja = screen.getByText("ETO Ikeja").closest("tr")!
    expect(within(ikeja).getByText("Waiting to be scored")).toBeInTheDocument()
    expect(within(ikeja).getByText("4 Nov 2026, 11:30")).toBeInTheDocument()
    const aba = screen.getByText("ETO Aba").closest("tr")!
    expect(within(aba).getByText("Not submitted")).toBeInTheDocument()
    expect(within(aba).getByText("—")).toBeInTheDocument()
  })

  it("filters by state and hides other states", async () => {
    await unlocked()
    fireEvent.change(select("ov-state"), { target: { value: "Lagos" } })
    expect(screen.getByText("ETO Ikeja")).toBeInTheDocument()
    expect(screen.queryByText("ETO Abia")).toBeNull()
    expect(screen.queryByText("FCT: 0 of 1 submitted")).toBeNull()
  })

  it("filters by status, hides empty states and shows an empty message", async () => {
    await unlocked()
    fireEvent.change(select("ov-status"), { target: { value: "waiting" } })
    expect(screen.getByText("ETO Ikeja")).toBeInTheDocument()
    expect(screen.queryByText("ETO Ikoyi")).toBeNull()
    expect(screen.queryByText(/^Abia:/)).toBeNull()
    // The header still counts every office in the state.
    expect(screen.getByText("Lagos: 2 of 2 submitted")).toBeInTheDocument()

    fireEvent.change(select("ov-state"), { target: { value: "FCT" } })
    expect(screen.getByText("No offices match these filters")).toBeInTheDocument()
    expect(screen.queryByRole("table")).toBeNull()
  })

  it("refetches with the chosen month and updates the page", async () => {
    await unlocked()
    expect(select("ov-month").value).toBe("2026-11")
    expect(within(select("ov-month")).getByRole("option", { name: "November 2026" })).toBeInTheDocument()
    fireEvent.change(select("ov-month"), { target: { value: "2026-10" } })
    await waitFor(() => expect(within(tile("Not submitted")).getByText("4")).toBeInTheDocument())
    const calls = callsTo("/api/staff/overview")
    expect(calls).toHaveLength(2)
    expect(jsonBody(calls[1][1])).toEqual({ month: "2026-10" })
    expect(headerOf(calls[1][1], "x-csqau-code")).toBe(CODE)
    expect(select("ov-month").value).toBe("2026-10")
  })

  it("returns to the gate with the message on a 403", async () => {
    await unlocked()
    routes["/api/staff/overview"] = { status: 403, body: { error: "Access code no longer valid" } }
    fireEvent.change(select("ov-month"), { target: { value: "2026-10" } })
    expect(await screen.findByText("Access code no longer valid")).toBeInTheDocument()
    expect(document.querySelector("input[type=password]")).not.toBeNull()
    expect(screen.queryByRole("table")).toBeNull()
  })

  it("keeps the previous data and shows an error when a refetch fails", async () => {
    await unlocked()
    routes["/api/staff/overview"] = { status: 503, body: { error: "Service unavailable" } }
    fireEvent.change(select("ov-month"), { target: { value: "2026-10" } })
    expect(await screen.findByText("Service unavailable")).toBeInTheDocument()
    expect(screen.getByText("ETO Abia")).toBeInTheDocument()
    expect(within(tile("Offices")).getByText("5")).toBeInTheDocument()
    expect(select("ov-month").value).toBe("2026-11")
  })

  it("shows a loading state during a fetch", async () => {
    await unlocked()
    let release!: () => void
    fetchMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = () => resolve({ status: 200, ok: true, json: async () => OCTOBER })
        })
    )
    fireEvent.change(select("ov-month"), { target: { value: "2026-10" } })
    expect(await screen.findByText("Updating…")).toBeInTheDocument()
    release()
    await waitFor(() => expect(screen.queryByText("Updating…")).toBeNull())
  })

  it("never renders staff names, even if the response contains them", async () => {
    await unlocked()
    expect(screen.queryByText(/SHOULD NOT SHOW/)).toBeNull()
    expect(document.body.textContent).not.toContain("SHOULD NOT SHOW")
  })

  it("links to the scoring page", async () => {
    await unlocked()
    expect(screen.getByRole("link", { name: "Go to scoring" })).toHaveAttribute("href", "/staff/score")
  })
})
