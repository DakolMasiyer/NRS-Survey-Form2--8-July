// NRS SPAFF Service Optimization Checklist — Apps Script webhook
// Matches payload keys documented in src/app/api/spaff/route.ts

const SECTION_KEYS = ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8", "s9", "s10"]

function buildHeaders() {
  const headers = ["submitted_at", "tax_office"]
  SECTION_KEYS.forEach((s) => {
    headers.push(`${s}_title`, `${s}_status`, `${s}_remarks`, `${s}_score`)
  })
  headers.push("s2_staff", "total_score")
  ;["checked_by", "head_tpsu", "controller"].forEach((p) => {
    headers.push(`${p}_name`, `${p}_ir_rank`, `${p}_phone`, `${p}_email`)
  })
  return headers
}

const HEADERS = buildHeaders()

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
