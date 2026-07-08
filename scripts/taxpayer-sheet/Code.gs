// NRS Taxpayer Satisfaction Survey — Apps Script webhook
// Matches payload keys documented in src/app/api/taxpayer/route.ts

const HEADERS = [
  "submitted_at", "tax_office", "has_tax_id", "tax_id", "rc_bn", "address",
  "line_of_business", "phone_email", "tax_compliant", "non_compliance_reasons",
  "non_compliance_other", "ease_of_payment", "wait_time", "issue_resolved",
  "resolution_satisfaction", "knows_website", "knows_contact_centre",
  "knows_ussd", "knows_tax_id_url", "knows_rev360", "rev360_comfort",
  "knows_einvoicing", "knows_social_media", "suggestions", "contact_email",
]

function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet()

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS)
  }

  const data = JSON.parse(e.postData.contents)
  sheet.appendRow(HEADERS.map((key) => data[key] ?? ""))

  return ContentService
    .createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON)
}
