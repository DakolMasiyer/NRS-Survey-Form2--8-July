import { NextRequest } from "next/server"
import { shortLinkRedirect } from "@/lib/short-link"

// Printed QR target for the taxpayer survey. Override with SHORTLINK_TAXPAYER_URL.
export const dynamic = "force-dynamic"

export function GET(req: NextRequest) {
  return shortLinkRedirect(req, "SHORTLINK_TAXPAYER_URL", "/taxpayer")
}
