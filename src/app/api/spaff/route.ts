import { NextRequest } from "next/server"
import { proxyToWebhooks } from "@/lib/webhook"

/*
 * Service Optimization Checklist (SPAFF) → NRS_SPAFF_WEBHOOK_URL (+ _BACKUP)
 *
 * Payload keys (spreadsheet column order):
 *   submitted_at, tax_office,
 *   for each section s1..s10: sN_status (YES/NO), sN_remarks, sN_score,
 *   s2_staff (JSON array of { name, ir, rank, phone, email }),
 *   total_score,
 *   checked_by_{name,ir_rank,phone,email},
 *   head_tpsu_{name,ir_rank,phone,email},
 *   controller_{name,ir_rank,phone,email}
 */
export async function POST(req: NextRequest) {
  return proxyToWebhooks(req, [
    "NRS_SPAFF_WEBHOOK_URL",
    "NRS_SPAFF_WEBHOOK_URL_BACKUP",
  ])
}
