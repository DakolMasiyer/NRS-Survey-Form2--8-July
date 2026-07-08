import Link from "next/link"
import { NRS_LOGO } from "./nrs-logo"

export function TopBar() {
  return (
    <div className="nrs-topbar">
      <div className="nrs-topbar__inner">
        <span className="nrs-topbar__text">
          🔒 Official Federal Government of Nigeria website &nbsp;·&nbsp;{" "}
          <strong>nrs.gov.ng</strong>
        </span>
        <div className="nrs-topbar__links">
          <a href="https://selfservice.nrs.gov.ng/" target="_blank" rel="noopener noreferrer">Rev360 Portal</a>
          <a href="https://taxid.nrs.gov.ng/" target="_blank" rel="noopener noreferrer">Tax ID</a>
          <a href="https://www.nrs.gov.ng/overview/quick-link" target="_blank" rel="noopener noreferrer">Quick Links</a>
        </div>
      </div>
    </div>
  )
}

export function Nav({ cta }: { cta?: { href: string; label: string } }) {
  return (
    <nav className="nrs-nav">
      <div className="nrs-nav__inner">
        <Link href="/">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={NRS_LOGO} alt="Nigeria Revenue Service" className="nrs-nav__logo" />
        </Link>
        <div className="nrs-nav__links">
          <a href="https://www.nrs.gov.ng/help--support/faq" target="_blank" rel="noopener noreferrer">FAQs</a>
          <a href="https://www.nrs.gov.ng/help--support/office-locator" target="_blank" rel="noopener noreferrer">Offices</a>
          {cta && (
            <a href={cta.href} className="nrs-btn nrs-btn--primary nrs-btn--nav">
              {cta.label}
            </a>
          )}
        </div>
      </div>
    </nav>
  )
}

export function Footer() {
  return (
    <footer style={{ background: "#111827", padding: "28px 0", borderTop: "1px solid rgba(255,255,255,.06)" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,.35)" }}>
          © {new Date().getFullYear()} Nigeria Revenue Service. All rights reserved.
        </p>
        <span style={{ fontSize: 12, color: "rgba(255,255,255,.4)", border: "1px solid rgba(255,255,255,.15)", padding: "4px 10px", borderRadius: 3 }}>
          🔒 Official Government Website
        </span>
      </div>
    </footer>
  )
}
