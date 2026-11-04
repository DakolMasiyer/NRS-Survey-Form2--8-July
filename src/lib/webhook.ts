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

function configuredUrls(envVars: string[]) {
  return envVars
    .map((name) => process.env[name])
    .filter((url): url is string => Boolean(url))
}

/**
 * Posts `body` to every configured webhook in parallel. Never throws for a
 * failed webhook: failures are returned (and logged) so the caller decides.
 * `configured: 0` means none of the env vars is set.
 */
export async function sendToWebhooks(envVars: string[], body: unknown) {
  const webhookUrls = configuredUrls(envVars)

  const results = await Promise.allSettled(
    webhookUrls.map((url) => postToWebhook(url, body))
  )

  const failures = results
    .filter((r): r is PromiseRejectedResult => r.status === "rejected")
    .map((r) => r.reason as unknown)

  failures.forEach((reason) => console.error("NRS webhook failed:", reason))

  return {
    configured: webhookUrls.length,
    delivered: results.length - failures.length,
    failures,
  }
}

export async function proxyToWebhooks(req: NextRequest, envVars: string[]) {
  if (configuredUrls(envVars).length === 0) {
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

  const { delivered, failures } = await sendToWebhooks(envVars, body)

  if (delivered === 0) {
    return NextResponse.json({ error: "All webhooks failed" }, { status: 502 })
  }

  return NextResponse.json({
    ok: true,
    ...(failures.length > 0 && { partialFailure: true }),
  })
}
