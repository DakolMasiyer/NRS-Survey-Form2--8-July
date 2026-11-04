import { createHash } from "node:crypto"
import type { Sql } from "./db"
import { verifyCsqauCode } from "./csqau-access"

export const MAX_FAILED_ATTEMPTS = 5
export const WINDOW_MINUTES = 15

export type AccessResult =
  | { ok: true }
  | { ok: false; status: 401 | 429 | 503; error: string; retryAfterSeconds?: number }

export function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex")
}

export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  if (forwarded) return forwarded
  const real = headers.get("x-real-ip")?.trim()
  if (real) return real
  return "unknown"
}

export async function checkAccess(args: {
  sql: Sql
  code: unknown
  ip: string
}): Promise<AccessResult> {
  const { sql, code, ip } = args
  const ipHash = hashIp(ip)

  const [stats] = await sql`
    SELECT count(*)::int AS failures,
           CEIL(EXTRACT(EPOCH FROM (min(attempted_at) + make_interval(mins => ${WINDOW_MINUTES}) - now())))::int AS retry_after
    FROM access_attempts
    WHERE ip_hash = ${ipHash}
      AND attempted_at > now() - make_interval(mins => ${WINDOW_MINUTES})`
  const failures = Number(stats?.failures ?? 0)
  if (failures >= MAX_FAILED_ATTEMPTS) {
    const retryAfterSeconds = Math.min(
      Math.max(Number(stats?.retry_after ?? 1), 1),
      WINDOW_MINUTES * 60,
    )
    return {
      ok: false,
      status: 429,
      error: "Too many incorrect attempts. Try again later.",
      retryAfterSeconds,
    }
  }

  let valid: boolean
  try {
    valid = verifyCsqauCode(code)
  } catch (err) {
    return {
      ok: false,
      status: 503,
      error: err instanceof Error ? err.message : "Access code is not configured",
    }
  }
  if (valid) return { ok: true }

  await sql`INSERT INTO access_attempts (ip_hash) VALUES (${ipHash})`
  return { ok: false, status: 401, error: "Incorrect access code" }
}
