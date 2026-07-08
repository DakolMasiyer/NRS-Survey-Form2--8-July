import { NextRequest, NextResponse } from "next/server"

/*
 * NRS Webhook Proxy (shared)
 *
 * Each form posts its payload to one or two webhooks in parallel, so
 * responses can be backed up in both Excel (Power Automate) and Google
 * Sheets (Apps Script) at the same time. Each form has its own pair of
 * env vars (primary + backup) — either can point at either provider.
 *
 * ── GOOGLE SHEETS via Google Apps Script ────────────────────────────────────
 * 1. script.google.com → New project
 * 2. doPost(e): JSON.parse(e.postData.contents) and appendRow with the
 *    form's payload keys (see each route file's header comment).
 * 3. Deploy → Web app · Execute as: Me · Access: Anyone → copy URL
 * 4. Set the form's env var in .env.local / Vercel.
 *
 * ── MICROSOFT EXCEL via Power Automate ──────────────────────────────────────
 * 1. power.microsoft.com → Automated cloud flow
 * 2. Trigger "When an HTTP request is received" (POST) → "Add a row into a table"
 * 3. Copy the HTTP POST URL into the form's env var.
 */

async function postToWebhook(url: string, body: unknown) {
  const upstream = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })

  if (!upstream.ok) {
    const text = await upstream.text().catch(() => "")
    throw new Error(`Webhook returned ${upstream.status}: ${text}`)
  }
}

export async function proxyToWebhooks(req: NextRequest, envVars: string[]) {
  const webhookUrls = envVars
    .map((name) => process.env[name])
    .filter((url): url is string => Boolean(url))

  if (webhookUrls.length === 0) {
    return NextResponse.json(
      { error: `${envVars[0]} is not configured` },
      { status: 503 }
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const results = await Promise.allSettled(
    webhookUrls.map((url) => postToWebhook(url, body))
  )

  const failures = results.filter(
    (r): r is PromiseRejectedResult => r.status === "rejected"
  )

  failures.forEach((f) => console.error("NRS webhook failed:", f.reason))

  if (failures.length === results.length) {
    return NextResponse.json({ error: "All webhooks failed" }, { status: 502 })
  }

  return NextResponse.json({
    ok: true,
    ...(failures.length > 0 && { partialFailure: true }),
  })
}
