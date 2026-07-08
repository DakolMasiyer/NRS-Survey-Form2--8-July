import type { Metadata } from "next"
import { TopBar, Nav, Footer } from "../chrome"
import { TaxpayerForm } from "./taxpayer-form"

export const metadata: Metadata = {
  title: "Taxpayer Satisfaction Survey | Nigeria Revenue Service",
  description:
    "Share your experience with the Nigeria Revenue Service — compliance, ease of payment, issue resolution and digital services.",
}

export default function TaxpayerPage() {
  return (
    <>
      <TopBar />
      <Nav cta={{ href: "#form", label: "Start Survey" }} />

      <section className="nrs-form-section" id="form" style={{ borderTop: "none" }}>
        <div className="nrs-form-section__inner">
          <span className="nrs-section-badge">Strategic Management Office · Customer Service Group</span>
          <h2 className="nrs-section-title">Taxpayer Satisfaction Survey</h2>
          <p className="nrs-section-sub">
            Help the Nigeria Revenue Service improve. Your responses go directly
            to the Customer Service Group and are reviewed regularly.
          </p>

          <div className="nrs-form-card">
            <div className="nrs-form-card__header">
              <div className="nrs-form-card__header-icon">
                <svg viewBox="0 0 20 20">
                  <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                  <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="nrs-form-card__header-text">
                <strong>Taxpayer Satisfaction Survey</strong>
                <span>Takes about 3 minutes · personal details optional</span>
              </div>
            </div>

            <div className="nrs-form-card__meta">
              <div className="nrs-form-card__meta-item">
                <svg viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" /></svg>
                ≈ 3 minutes
              </div>
              <div className="nrs-form-card__meta-item">
                <svg viewBox="0 0 20 20"><path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" /></svg>
                14 questions
              </div>
            </div>

            <div className="nrs-form-card__body">
              <TaxpayerForm />
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  )
}
