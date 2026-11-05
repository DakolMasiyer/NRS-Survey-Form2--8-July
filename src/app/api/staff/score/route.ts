import { NextRequest, NextResponse } from "next/server"
import { averageScore } from "@/lib/score"
import { handleRouteError, jsonError, readJson, requireCsqau, syncVisitToSheet } from "@/lib/staff-api"
import { scoringSchema } from "@/lib/staff-schema"
import { getVisit, scoreVisit } from "@/lib/visits"

/*
 * POST { id, scores: number[10], signoffs } with header x-csqau-code.
 * The total is computed here; a client-sent total_score is rejected (strict schema).
 * 200 { saved: true, sheetSynced, total_score }; sheetSynced=false means the record
 * is saved but the sheet update failed (use /score/[id]/resend). 404 unknown id,
 * 409 { error: "already scored" }.
 */
export async function POST(req: NextRequest) {
  try {
    const gate = await requireCsqau(req)
    if ("response" in gate) return gate.response

    const body = await readJson(req)
    if (body === null) return jsonError(400, "Invalid JSON body")
    const parsed = scoringSchema.safeParse(body)
    if (!parsed.success) return jsonError(400, parsed.error.issues[0]?.message ?? "Invalid scores")
    const { id, scores, signoffs } = parsed.data

    const total_score = averageScore(scores.map(String))
    if (total_score === null) throw new Error("Total score could not be computed")

    const scored = await scoreVisit(gate.sql, { id, scores, signoffs, total_score })
    if (!scored) {
      if (!(await getVisit(gate.sql, id))) return jsonError(404, "Submission not found")
      return jsonError(409, "already scored")
    }

    const sync = await syncVisitToSheet(gate.sql, scored)
    return NextResponse.json({ saved: true, sheetSynced: sync.synced, total_score })
  } catch (err) {
    return handleRouteError(err)
  }
}
