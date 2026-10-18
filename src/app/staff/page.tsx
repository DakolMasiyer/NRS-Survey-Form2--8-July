import type { Metadata } from "next"
import { TopBar, Nav, Footer } from "../chrome"
import { Letterhead } from "../letterhead"
import { StaffForm } from "./staff-form"

export const metadata: Metadata = {
  title: "Service Optimization Checklist | Nigeria Revenue Service",
  description:
    "Checklist for the optimization of Customer Service Units / Self-Service Stations — Customer Service Quality Assurance Unit.",
}

export default function StaffPage() {
  return (
    <>
      <TopBar />
      <Nav cta={{ href: "#form", label: "Open Checklist" }} />

      <section className="nrs-form-section" id="form" style={{ borderTop: "none", padding: "48px 0 72px" }}>
        <div className="nrs-form-section__inner">
          <div className="nrs-form-card nrs-form-card--wide">
            <Letterhead
              title="Checklist for the Optimization of Customer Service Units / Self-Service Stations"
              units={["Customer Service Group", "Customer Service Quality Assurance Unit"]}
            />

            <div className="nrs-form-card__body">
              <StaffForm />
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  )
}
