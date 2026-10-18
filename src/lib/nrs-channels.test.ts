import { describe, expect, it } from "vitest"
import { schema } from "@/app/taxpayer/taxpayer-form"
import {
  NRS_CHANNELS,
  NRS_CONTACT,
  NRS_SOCIALS,
  REV360_COMFORT_OPTIONS,
} from "./nrs-channels"

describe("NRS channel constants", () => {
  it("lists the six channels from the paper form, in order", () => {
    expect(NRS_CHANNELS.map((c) => c.label)).toEqual([
      "NRS Website",
      "NRS Contact Centre",
      "NRS USSD Code",
      "Tax ID Portal",
      "Rev360 Self-Service Portal",
      "NRS E-Invoicing Platform",
    ])
  })

  it("keeps the payload keys the sheet already uses", () => {
    expect(NRS_CHANNELS.map((c) => c.key)).toEqual([
      "knows_website",
      "knows_contact_centre",
      "knows_ussd",
      "knows_tax_id_url",
      "knows_rev360",
      "knows_einvoicing",
    ])
    for (const { key } of NRS_CHANNELS) expect(Object.keys(schema.shape)).toContain(key)
  })

  it("has no empty labels, details, handles or contacts", () => {
    for (const c of NRS_CHANNELS) {
      expect(c.label.trim()).not.toBe("")
      expect(c.detail.trim()).not.toBe("")
    }
    for (const s of NRS_SOCIALS) {
      expect(s.platform.trim()).not.toBe("")
      expect(s.handle.trim()).not.toBe("")
    }
    expect(NRS_CONTACT.helpdeskEmail).toMatch(/^[^@\s]+@[^@\s]+\.[^@\s]+$/)
    expect(NRS_CONTACT.phone.trim()).not.toBe("")
  })

  it("has the confirmed social handles", () => {
    expect(NRS_SOCIALS).toEqual([
      { platform: "Facebook", handle: "OfficialNRSNigeria" },
      { platform: "X", handle: "@NigeriaRevenue" },
      { platform: "Instagram", handle: "@nigeriarevenue" },
      { platform: "LinkedIn", handle: "Nigeria Revenue Service" },
    ])
  })

  it("uses the paper form's Rev360 comfort scale", () => {
    expect(REV360_COMFORT_OPTIONS).toEqual([
      "Very Comfortable",
      "Comfortable",
      "Neutral",
      "Uncomfortable",
      "Never Used",
    ])
  })
})
