import { NextRequest, NextResponse } from "next/server"
import { handleRouteError, jsonError, requireCsqau, syncVisitToSheet } from "@/lib/staff-api"
import { getVisit } from "@/lib/visits"

/*
 * POST with header x-csqau-code: re-send a scored visit to the sheet.
 * 404 unknown, 409 not scored yet, 200 { sheetSynced: true, alreadySynced: true } when
 * already synced (nothing is sent, so no duplicate row), 200 { sheetSynced: true } on
 * success, 502 { error } when the sheet update fails again.
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const gate = await requireCsqau(req)
    if ("response" in gate) return gate.response

    const { id } = await ctx.params
    const visit = await getVisit(gate.sql, id)
    if (!visit) return jsonError(404, "Submission not found")
    if (visit.status !== "scored") return jsonError(409, "not scored yet")
    if (visit.sheet_synced_at) {
      return NextResponse.json({ sheetSynced: true, alreadySynced: true })
    }

    const sync = await syncVisitToSheet(gate.sql, visit)
    if (!sync.synced) return jsonError(502, `Sheet update failed: ${sync.reason}`)
    return NextResponse.json({ sheetSynced: true })
  } catch (err) {
    return handleRouteError(err)
  }
}
