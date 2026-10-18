import type { Metadata } from "next"
import { TopBar, Nav, Footer } from "../chrome"
import { Letterhead } from "../letterhead"
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

      <section className="nrs-form-section" id="form" style={{ borderTop: "none", padding: "48px 0 72px" }}>
        <div className="nrs-form-section__inner">
          <div className="nrs-form-card">
            <Letterhead
              title="Taxpayer Satisfaction Survey"
              units={["Customer Service Group"]}
              address="Plot 1241, Kur Mohammed Avenue, Central Business District, Abuja, FCT"
              subtitle="Help us serve you better — takes about 5 minutes"
              intro="Your feedback helps the Nigeria Revenue Service (NRS) improve tax administration and taxpayer support. Responses are confidential, used strictly for service-improvement purposes, and handled in line with the Nigeria Data Protection Act (NDPA) 2023. Providing your Tax ID or contact details is optional unless stated otherwise."
            />

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
