import { NextRequest, NextResponse } from "next/server"
import { verifyCsqauCode } from "@/lib/csqau-access"

/*
 * CSQAU scoring unlock. POST { code } → 200 { ok: true } when the code matches
 * CSQAU_ACCESS_CODE. The form keeps the code in memory and sends it with the
 * submission in the x-csqau-code header; /api/staff re-verifies it there.
 */
export async function POST(req: NextRequest) {
  let body: { code?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  try {
    if (!verifyCsqauCode(body?.code)) {
      return NextResponse.json({ error: "Incorrect access code" }, { status: 401 })
    }
  } catch (err) {
    console.error("CSQAU unlock failed:", err)
    return NextResponse.json({ error: "CSQAU_ACCESS_CODE is not configured" }, { status: 503 })
  }

  return NextResponse.json({ ok: true })
}
