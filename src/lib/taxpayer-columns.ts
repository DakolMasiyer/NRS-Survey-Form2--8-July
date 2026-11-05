/*
 * Spreadsheet column order for the taxpayer survey. Keep in step with the header
 * comment in src/app/api/taxpayer/route.ts and HEADERS in scripts/taxpayer-sheet/Code.gs
 * (taxpayer-columns.test.ts fails if they drift).
 *
 * `phone_email` is the old combined field. The form no longer sends it; it stays in
 * place so existing rows stay aligned. `phone` and `email` are appended at the end for
 * the same reason.
 */
export const TAXPAYER_COLUMNS = [
  "submitted_at",
  "tax_office",
  "has_tax_id",
  "tax_id",
  "rc_bn",
  "address",
  "line_of_business",
  "phone_email",
  "tax_compliant",
  "non_compliance_reasons",
  "non_compliance_other",
  "ease_of_payment",
  "wait_time",
  "issue_resolved",
  "resolution_satisfaction",
  "knows_website",
  "knows_contact_centre",
  "knows_ussd",
  "knows_tax_id_url",
  "knows_rev360",
  "rev360_comfort",
  "knows_einvoicing",
  "knows_social_media",
  "suggestions",
  "contact_email",
  "phone",
  "email",
] as const

export const LEGACY_TAXPAYER_COLUMNS: readonly string[] = ["phone_email"]
