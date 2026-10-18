import { NextRequest } from "next/server"
import { proxyToWebhooks } from "@/lib/webhook"

/*
 * Taxpayer Satisfaction Survey → NRS_TAXPAYER_WEBHOOK_URL (+ _BACKUP)
 *
 * Payload keys (spreadsheet column order):
 *   submitted_at, tax_office, has_tax_id, tax_id, rc_bn, address,
 *   line_of_business, phone_email, tax_compliant, non_compliance_reasons,
 *   non_compliance_other, ease_of_payment, wait_time, issue_resolved,
 *   resolution_satisfaction, knows_website, knows_contact_centre,
 *   knows_ussd, knows_tax_id_url, knows_rev360, rev360_comfort,
 *   knows_einvoicing, knows_social_media, suggestions, contact_email,
 *   phone, email
 *
 * phone_email is a legacy column (old combined field); the form no longer sends it.
 * Column list lives in src/lib/taxpayer-columns.ts.
 */
export async function POST(req: NextRequest) {
  return proxyToWebhooks(req, [
    "NRS_TAXPAYER_WEBHOOK_URL",
    "NRS_TAXPAYER_WEBHOOK_URL_BACKUP",
  ])
}
