import Link from "next/link"
import { TopBar, Nav, Footer } from "./chrome"

const SURVEYS = [
  {
    href: "/taxpayer",
    badge: "For Taxpayers",
    title: "Taxpayer Satisfaction Survey",
    body:
      "Tell us about your experience with NRS — tax compliance, ease of payment, issue resolution and our digital services. Takes about 3 minutes.",
    meta: ["≈ 3 minutes", "14 questions"],
    cta: "Start Survey",
  },
  {
    href: "/staff",
    badge: "For NRS Assessors",
    title: "Service Optimization Checklist",
    body:
      "Checklist for the optimization of Customer Service Units / Self-Service Stations. For official use during service optimization visits.",
    meta: ["10 sections", "Auto-scored"],
    cta: "Open Checklist",
  },
]

export default function Home() {
  return (
    <>
      <TopBar />
      <Nav cta={{ href: "#surveys", label: "Choose a Survey" }} />

      <section className="nrs-hero">
        <div className="nrs-hero__inner" style={{ gridTemplateColumns: "1fr" }}>
          <div style={{ textAlign: "center", maxWidth: 640, margin: "0 auto" }}>
            <div className="nrs-hero__eyebrow" style={{ justifyContent: "center" }}>
              Customer Service Group · Strategic Management Office
            </div>
            <h1>
              NRS Service
              <em>Feedback Portal</em>
            </h1>
            <p className="nrs-hero__sub" style={{ maxWidth: 560, margin: "0 auto 36px" }}>
              Choose the form that applies to you. Taxpayers can share their
              experience with NRS, while NRS assessors can complete the service
              optimization visit checklist.
            </p>
          </div>
        </div>
      </section>

      <section className="nrs-form-section" id="surveys">
        <div className="nrs-form-section__inner">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24, maxWidth: 900 }}>
            {SURVEYS.map((s) => (
              <div key={s.href} className="nrs-hero__card" style={{ maxWidth: "none", display: "flex", flexDirection: "column", gap: 0 }}>
                <span className="nrs-section-badge">{s.badge}</span>
                <h3 style={{ fontSize: 22, fontWeight: 800, color: "var(--nrs-text)", margin: "6px 0 10px" }}>
                  {s.title}
                </h3>
                <p style={{ fontSize: 14, color: "#6B7280", lineHeight: 1.7, marginBottom: 20, flexGrow: 1 }}>
                  {s.body}
                </p>
                <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
                  {s.meta.map((m) => (
                    <span key={m} className="nrs-form-card__meta-item">{m}</span>
                  ))}
                </div>
                <Link href={s.href} className="nrs-btn nrs-btn--primary" style={{ justifyContent: "center" }}>
                  {s.cta}
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="white">
                    <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </>
  )
}
