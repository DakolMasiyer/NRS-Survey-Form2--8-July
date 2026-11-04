import { NextRequest, NextResponse } from "next/server"
import { getSql } from "@/lib/db"
import { handleRouteError, jsonError, readJson } from "@/lib/staff-api"
import { stage1Schema } from "@/lib/staff-schema"
import { createPending } from "@/lib/visits"

/*
 * Officer submit (step 1 of the two-step checklist). No access code needed.
 * POST { tax_office, sections: [{status, remarks?}] x10, staff: [...] }
 *   -> 201 { id, reference }
 * Stores a pending record; nothing is written to the sheet until the CSQAU
 * scorer scores it (POST /api/staff/score). Any score or sign-off key is a 400.
 */
export async function POST(req: NextRequest) {
  const body = await readJson(req)
  if (body === null) return jsonError(400, "Invalid JSON body")

  const parsed = stage1Schema.safeParse(body)
  if (!parsed.success) return jsonError(400, parsed.error.issues[0]?.message ?? "Invalid submission")

  try {
    const { id } = await createPending(getSql(), {
      tax_office: parsed.data.tax_office,
      payload: parsed.data,
    })
    return NextResponse.json({ id, reference: `NRS-${id.slice(0, 8).toUpperCase()}` }, { status: 201 })
  } catch (err) {
    return handleRouteError(err)
  }
}
