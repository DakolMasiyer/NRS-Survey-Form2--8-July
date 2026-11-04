import { NextRequest, NextResponse } from "next/server"
import { checkAccess, clientIp } from "@/lib/access-guard"
import { getSql } from "@/lib/db"
import { handleRouteError, jsonError, readJson, tooManyAttempts } from "@/lib/staff-api"

/*
 * CSQAU scorer unlock. POST { code } -> 200 { ok: true } | 401 | 429 (+ Retry-After) | 503.
 * Failed attempts are recorded per hashed IP; 5 failures in 15 minutes lock that IP out.
 * The scorer page keeps the code in memory and sends it as x-csqau-code on later calls.
 */
export async function POST(req: NextRequest) {
  const body = await readJson(req)
  if (body === null || typeof body !== "object") return jsonError(400, "Invalid JSON body")

  try {
    const access = await checkAccess({
      sql: getSql(),
      code: (body as { code?: unknown }).code,
      ip: clientIp(req.headers),
    })
    if (access.ok) return NextResponse.json({ ok: true })
    if (access.status === 429) return tooManyAttempts(access.error, access.retryAfterSeconds)
    return jsonError(access.status, access.error)
  } catch (err) {
    return handleRouteError(err)
  }
}
