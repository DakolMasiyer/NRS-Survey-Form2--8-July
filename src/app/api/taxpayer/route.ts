import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { optionalEmail, optionalIntlPhone } from "@/lib/validators"
import { proxyToWebhooks } from "@/lib/webhook"

// Same contact rules as the form, enforced here so a direct call cannot write junk
// into the sheet. Other fields pass through untouched.
const contactSchema = z.looseObject({
  phone: optionalIntlPhone(50),
  email: optionalEmail(200),
  contact_email: optionalEmail(200),
})
const MAX_BODY_CHARS = 50_000

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
  let text: string
  try {
    text = await req.clone().text()
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 })
  }
  if (text.length > MAX_BODY_CHARS) {
    return NextResponse.json({ error: "Submission is too large" }, { status: 413 })
  }
  let body: unknown
  try {
    body = JSON.parse(text)
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }
  const checked = contactSchema.safeParse(body)
  if (!checked.success) {
    return NextResponse.json({ error: checked.error.issues[0]?.message ?? "Invalid submission" }, { status: 400 })
  }
  return proxyToWebhooks(req, [
    "NRS_TAXPAYER_WEBHOOK_URL",
    "NRS_TAXPAYER_WEBHOOK_URL_BACKUP",
  ])
}
