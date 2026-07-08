import type { Metadata } from "next"
import { TopBar, Nav, Footer } from "../chrome"
import { SpaffForm } from "./spaff-form"

export const metadata: Metadata = {
  title: "Service Optimization Checklist | Nigeria Revenue Service",
  description:
    "Checklist for the optimization of Customer Service Units / Self-Service Stations — Customer Service Quality Assurance Unit.",
}

export default function SpaffPage() {
  return (
    <>
      <TopBar />
      <Nav cta={{ href: "#form", label: "Open Checklist" }} />

      <section className="nrs-form-section" id="form" style={{ borderTop: "none" }}>
        <div className="nrs-form-section__inner">
          <span className="nrs-section-badge">Customer Service Quality Assurance Unit</span>
          <h2 className="nrs-section-title">
            Checklist for the Optimization of Customer Service Units / Self-Service Stations
          </h2>
          <p className="nrs-section-sub">
            For official use during service optimization visits. Complete every
            section — the total score is computed automatically.
          </p>

          <div className="nrs-form-card">
            <div className="nrs-form-card__header">
              <div className="nrs-form-card__header-icon">
                <svg viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm2 10a1 1 0 10-2 0v3a1 1 0 102 0v-3zm2-3a1 1 0 011 1v5a1 1 0 11-2 0v-5a1 1 0 011-1zm4-1a1 1 0 10-2 0v7a1 1 0 102 0V8z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="nrs-form-card__header-text">
                <strong>Service Optimization Visit — 2026</strong>
                <span>10 sections · YES/NO, remarks and score per section · auto total</span>
              </div>
            </div>

            <div className="nrs-form-card__meta">
              <div className="nrs-form-card__meta-item">
                <svg viewBox="0 0 20 20"><path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" /></svg>
                10 sections
              </div>
              <div className="nrs-form-card__meta-item">
                <svg viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" /></svg>
                Official use only
              </div>
            </div>

            <div className="nrs-form-card__body">
              <SpaffForm />
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  )
}
