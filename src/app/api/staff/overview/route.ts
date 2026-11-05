import { NextRequest, NextResponse } from "next/server"
import { buildOverview, currentLagosMonth, isValidMonth } from "@/lib/overview"
import { handleRouteError, jsonError, readJson, requireCsqau } from "@/lib/staff-api"
import { activityMonths, officeActivity } from "@/lib/visits"

/*
 * POST { month?: "YYYY-MM" } with header x-csqau-code
 *   -> 200 { month, months, summary, offices[] } (counts and dates only; no payload or staff details)
 * Month is attributed in Nigeria time; absent month = current Nigeria month.
 */
export async function POST(req: NextRequest) {
  try {
    const gate = await requireCsqau(req)
    if ("response" in gate) return gate.response

    const body = await readJson(req)
    const raw = (body as { month?: unknown } | null)?.month
    if (raw !== undefined && !isValidMonth(raw)) {
      return jsonError(400, "month must look like 2026-11")
    }
    const month = raw ?? currentLagosMonth()

    const [activity, months] = await Promise.all([
      officeActivity(gate.sql, month),
      activityMonths(gate.sql),
    ])
    return NextResponse.json(buildOverview(activity, month, months), {
      headers: { "Cache-Control": "no-store" },
    })
  } catch (err) {
    return handleRouteError(err)
  }
}
