/*
 * NRS channel details shown on the taxpayer survey.
 * Sources: the paper Taxpayer Satisfaction Survey (Q7) and NRS's official social pages
 * and flyer. Add further handles (e.g. TikTok, YouTube) here only once confirmed.
 */

export const NRS_CONTACT = {
  helpdeskEmail: "helpdesk@nrs.gov.ng",
  phone: "0209 460 2700",
} as const

export type ChannelKey =
  | "knows_website"
  | "knows_contact_centre"
  | "knows_ussd"
  | "knows_tax_id_url"
  | "knows_rev360"
  | "knows_einvoicing"

// The key is also the payload / spreadsheet column name, so keep it stable.
export const NRS_CHANNELS: { key: ChannelKey; label: string; detail: string }[] = [
  { key: "knows_website", label: "NRS Website", detail: "www.nrs.gov.ng" },
  { key: "knows_contact_centre", label: "NRS Contact Centre", detail: NRS_CONTACT.phone },
  { key: "knows_ussd", label: "NRS USSD Code", detail: "*829#" },
  { key: "knows_tax_id_url", label: "Tax ID Portal", detail: "taxid.nrs.gov.ng" },
  { key: "knows_rev360", label: "Rev360 Self-Service Portal", detail: "selfservice.nrs.gov.ng" },
  { key: "knows_einvoicing", label: "NRS E-Invoicing Platform", detail: "einvoice.nrs.gov.ng" },
]

export type SocialPlatform = "Facebook" | "X" | "Instagram" | "LinkedIn"

export const NRS_SOCIALS: { platform: SocialPlatform; handle: string }[] = [
  { platform: "Facebook", handle: "OfficialNRSNigeria" },
  { platform: "X", handle: "@NigeriaRevenue" },
  { platform: "Instagram", handle: "@nigeriarevenue" },
  { platform: "LinkedIn", handle: "Nigeria Revenue Service" },
]

// Rev360 comfort scale as printed on the paper form (Q8).
export const REV360_COMFORT_OPTIONS = [
  "Very Comfortable",
  "Comfortable",
  "Neutral",
  "Uncomfortable",
  "Never Used",
]
