import { NextRequest, NextResponse } from "next/server"

/*
 * Short links for printed QR codes: /t → taxpayer survey, /s → staff checklist.
 *
 * The QR codes encode only https://<host>/t or /s, so the real destination can change
 * without reprinting. Set the env var to repoint a link (an absolute https:// URL or a
 * path starting with "/"); leave it unset to use the default form path.
 *
 * The redirect is a temporary 307 with no-store: a permanent 301 would be cached by
 * browsers and ignore a later change.
 */
export function shortLinkRedirect(req: NextRequest, envName: string, defaultPath: string) {
  const target = process.env[envName] || defaultPath

  let location: URL
  try {
    location = target.startsWith("/") && !target.startsWith("//")
      ? new URL(target, req.url)
      : new URL(target)
  } catch {
    throw new Error(`${envName} must be an absolute https:// URL or a path starting with "/"`)
  }
  if (location.protocol !== "https:" && location.hostname !== "localhost") {
    throw new Error(`${envName} must use https://`)
  }

  const res = NextResponse.redirect(location, 307)
  res.headers.set("Cache-Control", "no-store")
  return res
}
