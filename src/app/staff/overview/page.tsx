import type { Metadata } from "next"
import { Footer } from "../../chrome"
import { Letterhead } from "../../letterhead"
import { OverviewApp } from "./overview-app"

export const metadata: Metadata = {
  title: "Submissions Overview | Nigeria Revenue Service",
  description: "Passcode-protected overview of which offices have submitted the Service Optimization Checklist.",
  robots: { index: false, follow: false },
}

export default function OverviewPage() {
  return (
    <>
      <section className="nrs-form-section" id="form" style={{ borderTop: "none", padding: "48px 0 72px" }}>
        <div className="nrs-form-section__inner">
          <div className="nrs-form-card nrs-form-card--wide">
            <Letterhead
              title="Submissions overview"
              units={["Customer Service Group", "Customer Service Quality Assurance Unit"]}
            />

            <div className="nrs-form-card__body">
              <OverviewApp />
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  )
}
