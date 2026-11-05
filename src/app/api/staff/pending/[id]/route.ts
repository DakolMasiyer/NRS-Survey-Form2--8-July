import { NextRequest, NextResponse } from "next/server"
import { handleRouteError, jsonError, requireCsqau, toIso } from "@/lib/staff-api"
import { getVisit } from "@/lib/visits"

/*
 * POST with header x-csqau-code -> 200 { id, tax_office, submitted_at, payload }
 * 404 unknown/malformed id, 409 { error: "already scored" } when no longer pending.
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const gate = await requireCsqau(req)
    if ("response" in gate) return gate.response

    const { id } = await ctx.params
    const visit = await getVisit(gate.sql, id)
    if (!visit) return jsonError(404, "Submission not found")
    if (visit.status !== "pending") return jsonError(409, "already scored")

    return NextResponse.json({
      id: visit.id,
      tax_office: visit.tax_office,
      submitted_at: toIso(visit.submitted_at),
      payload: visit.payload,
    })
  } catch (err) {
    return handleRouteError(err)
  }
}
