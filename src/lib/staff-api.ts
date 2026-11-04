import { NextRequest, NextResponse } from "next/server"
import { checkAccess, clientIp } from "./access-guard"
import { DatabaseNotConfiguredError, getSql, type Row, type Sql } from "./db"
import { buildSheetRow, type SheetVisit } from "./sheet-row"
import { markSyncError, markSynced } from "./visits"
import { sendToWebhooks } from "./webhook"

export const SHEET_WEBHOOK_VARS = ["NRS_SPAFF_WEBHOOK_URL", "NRS_SPAFF_WEBHOOK_URL_BACKUP"]
export const CODE_REQUIRED_MESSAGE = "CSQAU access code required"

export function jsonError(status: number, error: string) {
  return NextResponse.json({ error }, { status })
}

/** Maps the "database not configured" error to 503; any other error is rethrown. */
export function handleRouteError(err: unknown): NextResponse {
  if (err instanceof DatabaseNotConfiguredError) return jsonError(503, err.message)
  throw err
}

/** Parses the JSON body; returns null when it is not valid JSON. */
export async function readJson(req: NextRequest): Promise<unknown> {
  try {
    return await req.json()
  } catch {
    return null
  }
}

export function toIso(value: unknown): string {
  return new Date(value as string | Date).toISOString()
}

export function tooManyAttempts(error: string, retryAfterSeconds: number | undefined) {
  return NextResponse.json(
    { error, retryAfterSeconds },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds ?? 900) } },
  )
}

/**
 * Gate for the CSQAU-protected routes. A missing or empty `x-csqau-code` header
 * is rejected before the database is touched. Otherwise the code is checked
 * (with lockout); a wrong code is reported as 403.
 */
export async function requireCsqau(
  req: NextRequest,
): Promise<{ sql: Sql } | { response: NextResponse }> {
  const code = req.headers.get("x-csqau-code")
  if (!code) return { response: jsonError(403, CODE_REQUIRED_MESSAGE) }

  const sql = getSql()
  const access = await checkAccess({ sql, code, ip: clientIp(req.headers) })
  if (access.ok) return { sql }
  if (access.status === 401) return { response: jsonError(403, CODE_REQUIRED_MESSAGE) }
  if (access.status === 429) {
    return { response: tooManyAttempts(access.error, access.retryAfterSeconds) }
  }
  return { response: jsonError(access.status, access.error) }
}

/** Sends a scored visit to the sheet webhooks and records the outcome on the row. */
export async function syncVisitToSheet(
  sql: Sql,
  visit: Row,
): Promise<{ synced: true } | { synced: false; reason: string }> {
  const id = visit.id as string
  let reason: string
  try {
    const row = buildSheetRow({
      id,
      submitted_at: visit.submitted_at as string | Date,
      tax_office: visit.tax_office as string,
      payload: visit.payload as SheetVisit["payload"],
      scores: visit.scores as number[],
      signoffs: visit.signoffs as SheetVisit["signoffs"],
      total_score: Number(visit.total_score),
    })
    const result = await sendToWebhooks(SHEET_WEBHOOK_VARS, row)
    if (result.configured > 0 && result.failures.length === 0 && result.delivered >= 1) {
      await markSynced(sql, id)
      return { synced: true }
    }
    reason =
      result.configured === 0
        ? "no webhook configured"
        : result.failures.map((f) => (f instanceof Error ? f.message : String(f))).join("; ") ||
          "webhook delivery failed"
  } catch (err) {
    console.error("Sheet sync failed:", err)
    reason = err instanceof Error ? err.message : String(err)
  }
  await markSyncError(sql, id, reason)
  return { synced: false, reason }
}
