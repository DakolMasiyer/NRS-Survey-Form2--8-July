"use client"

import Link from "next/link"
import { useRef, useState } from "react"
import { TextField } from "../../form-controls"

type Status = "not_submitted" | "waiting" | "scored"
type OfficeRow = {
  state: string
  label: string
  name: string
  tax_office: string
  status: Status
  pending: number
  scored: number
  last_submitted_at: string | null
}
type Summary = {
  offices_total: number
  submitted: number
  not_submitted: number
  waiting: number
  scored: number
  submissions: number
}
type Overview = { month: string; months: string[]; summary: Summary; offices: OfficeRow[] }
type ApiResult = { status: number; body: Record<string, unknown> }

const REVOKED = "The access code is no longer accepted. Enter it again."
const STATUS_LABEL: Record<Status, string> = {
  not_submitted: "Not submitted",
  waiting: "Waiting to be scored",
  scored: "Scored",
}
const STATUSES = Object.keys(STATUS_LABEL) as Status[]

const monthFormat = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", month: "long", year: "numeric" })
function monthLabel(month: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(month)
  if (!match) throw new Error(`Invalid month: ${month}`)
  return monthFormat.format(new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1)))
}

const whenFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Africa/Lagos",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
})
function formatWhen(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) throw new Error(`Invalid submission time: ${iso}`)
  const p = Object.fromEntries(whenFormat.formatToParts(d).map((x) => [x.type, x.value]))
  return `${p.day} ${p.month} ${p.year}, ${p.hour}:${p.minute}`
}

function errorText(body: Record<string, unknown>, fallback: string) {
  return typeof body.error === "string" ? body.error : fallback
}

function waitText(body: Record<string, unknown>, fallback: string) {
  const message = errorText(body, fallback)
  const secs = body.retryAfterSeconds
  if (typeof secs !== "number") return message
  const wait = secs >= 60 ? `${Math.ceil(secs / 60)} minute(s)` : `${secs} second(s)`
  return `${message} Please wait ${wait} before trying again.`
}

function readOverview(body: Record<string, unknown>): Overview {
  if (
    typeof body.month !== "string" ||
    !Array.isArray(body.months) ||
    !Array.isArray(body.offices) ||
    !body.summary ||
    typeof body.summary !== "object"
  ) {
    throw new Error("The server returned the overview in an unexpected format")
  }
  for (const o of body.offices as OfficeRow[]) {
    if (!STATUSES.includes(o.status)) throw new Error("The server returned an unknown office status")
  }
  return {
    month: body.month,
    months: body.months as string[],
    summary: body.summary as Summary,
    offices: body.offices as OfficeRow[],
  }
}

export function OverviewApp() {
  // The access code lives only in React state; it is never persisted.
  const [code, setCode] = useState<string | null>(null)
  const [codeInput, setCodeInput] = useState("")
  const [gateMessage, setGateMessage] = useState<string | null>(null)
  const [unlocking, setUnlocking] = useState(false)

  const [data, setData] = useState<Overview | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadMessage, setLoadMessage] = useState<string | null>(null)
  const [stateFilter, setStateFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const request = useRef(0)

  async function call(path: string, body: unknown, withCode: string | null): Promise<ApiResult> {
    const res = await fetch(path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(withCode !== null && { "x-csqau-code": withCode }),
      },
      body: JSON.stringify(body),
    })
    const parsed: unknown = await res.json().catch(() => ({}))
    const json = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {}
    return { status: res.status, body: json }
  }

  function backToGate(message: string) {
    request.current++
    setCode(null)
    setData(null)
    setLoading(false)
    setLoadMessage(null)
    setStateFilter("")
    setStatusFilter("")
    setGateMessage(message)
  }

  async function load(activeCode: string, month?: string) {
    const requestId = ++request.current
    setLoading(true)
    setLoadMessage(null)
    try {
      const { status, body } = await call("/api/staff/overview", month ? { month } : {}, activeCode)
      if (requestId !== request.current) return
      if (status === 403) return backToGate(errorText(body, REVOKED))
      if (status === 429) {
        setLoadMessage(waitText(body, "Too many requests."))
        return
      }
      if (status !== 200) {
        setLoadMessage(errorText(body, "Could not load the overview"))
        return
      }
      setData(readOverview(body))
    } catch (err) {
      if (requestId !== request.current) return
      setLoadMessage(err instanceof Error ? err.message : "Could not load the overview")
    } finally {
      if (requestId === request.current) setLoading(false)
    }
  }

  async function unlock() {
    setUnlocking(true)
    setGateMessage(null)
    try {
      const { status, body } = await call("/api/staff/unlock", { code: codeInput }, null)
      if (status === 200 && body.ok === true) {
        const accepted = codeInput
        setCode(accepted)
        setCodeInput("")
        void load(accepted)
      } else if (status === 429) {
        setGateMessage(waitText(body, "Too many attempts."))
      } else {
        setGateMessage(errorText(body, "Could not verify the access code"))
      }
    } catch (err) {
      setGateMessage(err instanceof Error ? err.message : "Could not verify the access code")
    } finally {
      setUnlocking(false)
    }
  }

  // ---------------------------------------------------------------- gate
  if (code === null) {
    return (
      <div style={{ border: "2px solid var(--nrs-gray-300)", borderRadius: "var(--nrs-r-md)", padding: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: "var(--nrs-navy)", marginBottom: 6 }}>
          Submissions overview access
        </div>
        <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--nrs-gray-700)" }}>
          This page is for NRS staff. Enter the access code to see which offices have submitted.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!unlocking && codeInput !== "") void unlock()
          }}
          style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}
        >
          <div style={{ flex: "1 1 220px" }}>
            <TextField
              label="Access code"
              type="password"
              value={codeInput}
              onChange={setCodeInput}
              error={gateMessage ?? undefined}
            />
          </div>
          <button
            type="submit"
            className="nrs-btn nrs-btn--outline"
            style={{ fontSize: 13, padding: "12px 16px" }}
            disabled={unlocking || codeInput === ""}
          >
            {unlocking ? "Checking…" : "Unlock"}
          </button>
        </form>
      </div>
    )
  }

  // ---------------------------------------------------------------- unlocked
  const nav = (
    <p style={{ margin: "0 0 16px", fontSize: 13 }}>
      <Link href="/staff/score" className="nrs-ov-link">
        Go to scoring
      </Link>
    </p>
  )

  if (data === null) {
    return (
      <div>
        {nav}
        {loading && (
          <p role="status" style={{ fontSize: 14, color: "var(--nrs-gray-700)" }}>
            Loading the overview…
          </p>
        )}
        {loadMessage && <p className="nrs-field-error">{loadMessage}</p>}
        {!loading && (
          <button type="button" className="nrs-btn nrs-btn--outline" onClick={() => void load(code)}>
            Try again
          </button>
        )}
      </div>
    )
  }

  const { summary } = data
  const tiles: { key: string; label: string; value: number; tone: string }[] = [
    { key: "total", label: "Offices", value: summary.offices_total, tone: "neutral" },
    { key: "submitted", label: "Submitted", value: summary.submitted, tone: "submitted" },
    { key: "not_submitted", label: "Not submitted", value: summary.not_submitted, tone: "not_submitted" },
    { key: "waiting", label: "Waiting to be scored", value: summary.waiting, tone: "waiting" },
    { key: "scored", label: "Scored", value: summary.scored, tone: "scored" },
  ]

  const states: { label: string; offices: OfficeRow[] }[] = []
  for (const o of data.offices) {
    const last = states[states.length - 1]
    if (last && last.label === o.label) last.offices.push(o)
    else states.push({ label: o.label, offices: [o] })
  }
  const visibleStates = states
    .filter((s) => stateFilter === "" || s.label === stateFilter)
    .map((s) => ({
      ...s,
      visible: s.offices.filter((o) => statusFilter === "" || o.status === statusFilter),
    }))
    .filter((s) => s.visible.length > 0)

  return (
    <div aria-busy={loading}>
      {nav}

      <div className="nrs-ov-controls">
        <div className="nrs-ov-control">
          <label htmlFor="ov-month">Month</label>
          <select
            id="ov-month"
            className="nrs-select"
            value={data.month}
            disabled={loading}
            onChange={(e) => void load(code, e.target.value)}
          >
            {data.months.map((m) => (
              <option key={m} value={m}>
                {monthLabel(m)}
              </option>
            ))}
          </select>
        </div>
        {loading && (
          <p role="status" className="nrs-ov-loading">
            Updating…
          </p>
        )}
      </div>
      {loadMessage && <p className="nrs-field-error">{loadMessage}</p>}

      <ul className="nrs-ov-tiles">
        {tiles.map((t) => (
          <li key={t.key} className={`nrs-ov-tile nrs-ov-tile--${t.tone}`}>
            <span className="nrs-ov-tile__value">{t.value}</span>
            <span className="nrs-ov-tile__label">{t.label}</span>
          </li>
        ))}
      </ul>

      <div className="nrs-ov-controls">
        <div className="nrs-ov-control">
          <label htmlFor="ov-state">State</label>
          <select
            id="ov-state"
            className="nrs-select"
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
          >
            <option value="">All states</option>
            {states.map((s) => (
              <option key={s.label} value={s.label}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div className="nrs-ov-control">
          <label htmlFor="ov-status">Status</label>
          <select
            id="ov-status"
            className="nrs-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {visibleStates.length === 0 ? (
        <p style={{ fontSize: 14, color: "var(--nrs-gray-700)" }}>No offices match these filters</p>
      ) : (
        <table className="nrs-ov-table">
          <thead>
            <tr>
              <th scope="col">Office</th>
              <th scope="col">Status</th>
              <th scope="col">Submissions</th>
              <th scope="col">Latest</th>
            </tr>
          </thead>
          <tbody>
            {visibleStates.map((s) => (
              <StateRows key={s.label} label={s.label} all={s.offices} visible={s.visible} />
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

function StateRows({ label, all, visible }: { label: string; all: OfficeRow[]; visible: OfficeRow[] }) {
  const submitted = all.filter((o) => o.status !== "not_submitted").length
  return (
    <>
      <tr className="nrs-ov-state">
        <th scope="colgroup" colSpan={4}>
          {label}: {submitted} of {all.length} submitted
        </th>
      </tr>
      {visible.map((o) => (
        <tr key={o.tax_office} className="nrs-ov-row">
          <th scope="row" data-label="Office">
            {o.name}
          </th>
          <td data-label="Status">
            <span className={`nrs-ov-badge nrs-ov-badge--${o.status}`}>{STATUS_LABEL[o.status]}</span>
          </td>
          <td data-label="Submissions">{o.pending + o.scored}</td>
          <td data-label="Latest">{o.last_submitted_at === null ? "—" : formatWhen(o.last_submitted_at)}</td>
        </tr>
      ))}
    </>
  )
}
