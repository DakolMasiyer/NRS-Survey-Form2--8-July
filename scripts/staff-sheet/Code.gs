// NRS STAFF Service Optimization Checklist — Apps Script webhook
// Matches payload keys documented in src/app/api/staff/route.ts

const SECTION_KEYS = ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8", "s9", "s10"]
const STAFF_RESPONSE_SHEET_ID = "16Lk2g1M6ntN2sAurQLVbBP55lzugCb6lENhHVJwY3Ak"

function buildHeaders() {
  const headers = ["submitted_at", "tax_office"]
  SECTION_KEYS.forEach((s) => {
    headers.push(`${s}_title`, `${s}_status`, `${s}_remarks`, `${s}_score`)
  })
  headers.push("s2_staff_count", "s2_staff", "total_score")
  ;["checked_by", "head_tpsu", "controller"].forEach((p) => {
    headers.push(`${p}_name`, `${p}_ir_rank`, `${p}_phone`, `${p}_email`)
  })
  // Last column. Headers are only written to an empty sheet, so on a live sheet add this header cell by hand.
  headers.push("submission_id")
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

/**
 * One-time repair for rows submitted before s2_staff_count existed.
 *
 * Run this manually from the Apps Script editor after adding the
 * `s2_staff_count` header. It derives the count from the saved `s2_staff`
 * JSON, writes the visible count into `s2_status`, and clears `s2_score`.
 * Rows with missing or malformed staff data are left unchanged and reported
 * in the execution log.
 */
function backfillStaffCounts() {
  const ss = SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById(STAFF_RESPONSE_SHEET_ID)
  const sheet = ss.getSheets()[0]
  const lastRow = sheet.getLastRow()
  let lastColumn = sheet.getLastColumn()
  if (lastRow < 2 || lastColumn === 0) return

  let headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0]
  let staffColumn = headers.indexOf("s2_staff") + 1
  let countColumn = headers.indexOf("s2_staff_count") + 1
  const statusColumn = headers.indexOf("s2_status") + 1
  const scoreColumn = headers.indexOf("s2_score") + 1

  if (!staffColumn || !statusColumn || !scoreColumn) {
    throw new Error("Missing required headers: s2_staff, s2_status, or s2_score")
  }

  // If s2_staff_count column does not exist yet, insert it right before s2_staff
  if (!countColumn) {
    sheet.insertColumnBefore(staffColumn)
    sheet.getRange(1, staffColumn).setValue("s2_staff_count")
    lastColumn = sheet.getLastColumn()
    headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0]
    countColumn = headers.indexOf("s2_staff_count") + 1
    staffColumn = headers.indexOf("s2_staff") + 1
  }

  const rows = sheet.getRange(2, 1, lastRow - 1, lastColumn).getValues()
  let updated = 0
  rows.forEach((row, index) => {
    const rawStaff = row[staffColumn - 1]
    if (typeof rawStaff !== "string" || rawStaff.trim() === "") return
    try {
      const staff = JSON.parse(rawStaff)
      if (!Array.isArray(staff)) throw new Error("staff list is not an array")
      const rowNumber = index + 2
      sheet.getRange(rowNumber, countColumn).setValue(staff.length)
      sheet.getRange(rowNumber, statusColumn).setValue(staff.length)
      sheet.getRange(rowNumber, scoreColumn).clearContent()
      updated++
    } catch (error) {
      console.log(`Row ${index + 2} was skipped: ${error}`)
    }
  })
  console.log(`Backfilled ${updated} staff-count row(s).`)
}
