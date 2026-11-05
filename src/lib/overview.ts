import { formatTaxOffice, TAX_OFFICES } from "./tax-offices"
import type { OfficeActivityRow } from "./visits"

export type OfficeStatus = "not_submitted" | "waiting" | "scored"

export type OverviewOffice = {
  state: string
  label: string
  name: string
  tax_office: string
  status: OfficeStatus
  pending: number
  scored: number
  last_submitted_at: string | null
}

export type OverviewSummary = {
  offices_total: number
  submitted: number
  not_submitted: number
  waiting: number
  scored: number
  submissions: number
}

export type Overview = {
  month: string
  months: string[]
  summary: OverviewSummary
  offices: OverviewOffice[]
}

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/
const HOUR_MS = 60 * 60 * 1000

export function isValidMonth(s: unknown): s is string {
  return typeof s === "string" && MONTH_RE.test(s)
}

/** "YYYY-MM" in Nigeria time (UTC+1, no daylight saving). */
export function currentLagosMonth(now: Date = new Date()): string {
  return new Date(now.getTime() + HOUR_MS).toISOString().slice(0, 7)
}

export function buildOverview(
  activity: OfficeActivityRow[],
  month: string,
  months: string[],
  now: Date = new Date(),
): Overview {
  const byOffice = new Map(activity.map((a) => [a.tax_office, a]))
  const offices: OverviewOffice[] = TAX_OFFICES.flatMap((s) =>
    s.offices.map((name) => {
      const tax_office = formatTaxOffice(s.state, name)
      const a = byOffice.get(tax_office)
      const pending = a?.pending ?? 0
      const scored = a?.scored ?? 0
      const status: OfficeStatus = pending > 0 ? "waiting" : scored > 0 ? "scored" : "not_submitted"
      return {
        state: s.state,
        label: s.label,
        name,
        tax_office,
        status,
        pending,
        scored,
        last_submitted_at: a ? new Date(a.last_submitted_at).toISOString() : null,
      }
    }),
  )
  const waiting = offices.filter((o) => o.status === "waiting").length
  const scoredOffices = offices.filter((o) => o.status === "scored").length
  const submitted = waiting + scoredOffices
  return {
    month,
    months: Array.from(new Set([...months, month, currentLagosMonth(now)])).sort().reverse(),
    summary: {
      offices_total: offices.length,
      submitted,
      not_submitted: offices.length - submitted,
      waiting,
      scored: scoredOffices,
      submissions: offices.reduce((n, o) => n + o.pending + o.scored, 0),
    },
    offices,
  }
}
