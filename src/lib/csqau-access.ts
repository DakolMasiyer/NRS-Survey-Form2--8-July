import { timingSafeEqual } from "node:crypto"

/**
 * Checks a CSQAU access code against CSQAU_ACCESS_CODE.
 * Throws if the env var is not configured, so a misconfigured deploy fails loudly
 * instead of silently leaving scoring open or locked.
 */
export function verifyCsqauCode(code: unknown): boolean {
  const expected = process.env.CSQAU_ACCESS_CODE
  if (!expected) throw new Error("CSQAU_ACCESS_CODE is not configured")
  if (typeof code !== "string") return false

  const given = Buffer.from(code)
  const wanted = Buffer.from(expected)
  return given.length === wanted.length && timingSafeEqual(given, wanted)
}
