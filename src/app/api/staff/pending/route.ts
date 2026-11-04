import { NextRequest, NextResponse } from "next/server"
import { handleRouteError, jsonError, readJson, requireCsqau, toIso } from "@/lib/staff-api"
import { isValidTaxOffice } from "@/lib/tax-offices"
import { listPending } from "@/lib/visits"

/*
 * POST { tax_office } with header x-csqau-code
 *   -> 200 { visits: [{ id, submitted_at, first_staff_name }] } (pending only, newest first)
 */
export async function POST(req: NextRequest) {
  try {
    const gate = await requireCsqau(req)
    if ("response" in gate) return gate.response

    const body = await readJson(req)
    const office = (body as { tax_office?: unknown } | null)?.tax_office
    if (typeof office !== "string" || !isValidTaxOffice(office)) {
      return jsonError(400, "Please select a tax office from the list")
    }

    const visits = await listPending(gate.sql, office)
    return NextResponse.json({
      visits: visits.map((v) => ({
        id: v.id,
        submitted_at: toIso(v.submitted_at),
        first_staff_name: v.first_staff_name,
      })),
    })
  } catch (err) {
    return handleRouteError(err)
  }
}
