import { NextRequest } from "next/server"
import { shortLinkRedirect } from "@/lib/short-link"

// Printed QR target for the staff checklist. Override with SHORTLINK_STAFF_URL.
export const dynamic = "force-dynamic"

export function GET(req: NextRequest) {
  return shortLinkRedirect(req, "SHORTLINK_STAFF_URL", "/staff")
}
