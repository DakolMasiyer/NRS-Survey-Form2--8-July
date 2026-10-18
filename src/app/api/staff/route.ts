import { NextRequest, NextResponse } from "next/server"
import { verifyCsqauCode } from "@/lib/csqau-access"
import { proxyToWebhooks } from "@/lib/webhook"

/*
 * Service Optimization Checklist (STAFF) → NRS_SPAFF_WEBHOOK_URL (+ _BACKUP)
 *
 * Payload keys (spreadsheet column order):
 *   submitted_at, tax_office,
 *   for each section s1..s10: sN_status (YES/NO), sN_remarks, sN_score,
 *   s2_staff (JSON array of { name, ir, rank, phone, email }),
 *   total_score,
 *   checked_by_{name,ir_rank,phone,email},
 *   head_tpsu_{name,ir_rank,phone,email},
 *   controller_{name,ir_rank,phone,email}
 *
 * Scores (sN_score, total_score) are CSQAU-only: they are accepted only when the
 * x-csqau-code header matches CSQAU_ACCESS_CODE. Unscored submissions leave those
 * columns blank.
 */
const SCORE_KEY = /^(s\d+_score|total_score)$/

export async function POST(req: NextRequest) {
  // An unparseable body falls through so proxyToWebhooks returns its own 400.
  const body: unknown = await req.clone().json().catch(() => null)

  if (body && typeof body === "object" && Object.keys(body).some((k) => SCORE_KEY.test(k))) {
    let authorised: boolean
    try {
      authorised = verifyCsqauCode(req.headers.get("x-csqau-code"))
    } catch (err) {
      console.error("CSQAU check failed:", err)
      return NextResponse.json({ error: "CSQAU_ACCESS_CODE is not configured" }, { status: 503 })
    }
    if (!authorised) {
      return NextResponse.json({ error: "Scoring requires CSQAU authorization" }, { status: 403 })
    }
  }

  return proxyToWebhooks(req, [
    "NRS_SPAFF_WEBHOOK_URL",
    "NRS_SPAFF_WEBHOOK_URL_BACKUP",
  ])
}
