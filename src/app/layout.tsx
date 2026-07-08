import type { Metadata } from "next"
import "./globals.css"
import "./nrs-tokens.css"

export const metadata: Metadata = {
  title: "NRS Service Surveys | Nigeria Revenue Service",
  description:
    "Nigeria Revenue Service feedback portal — Taxpayer Satisfaction Survey and Service Optimization Checklist.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
