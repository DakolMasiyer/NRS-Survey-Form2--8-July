/*
 * Service Optimization Checklist sections, shared by the officer form, the
 * scorer page and the server (schemas, sheet rows).
 */

export type StaffSection = { key: string; title: string; items?: string[] }

export const YES_NO = ["YES", "NO"]

export const SECTIONS: StaffSection[] = [
  {
    key: "s1",
    title: "Ambience (Is the unit conducive?)",
    items: ["Accommodation", "Setting"],
  },
  {
    key: "s2",
    title: "Number of staff",
  },
  {
    key: "s3",
    title: "Availability of working tools",
    items: [
      "Technical forms",
      "Computers",
      "Network connection",
      "Printers",
      "Photocopier",
      "Scanner",
      "Dedicated phone line",
      "Office e-mail address",
    ],
  },
  {
    key: "s4",
    title: "Educational & information materials",
    items: [
      "Availability of educational materials",
      "Availability of information materials",
      "Display rack for educational/informative materials",
    ],
  },
  {
    key: "s5",
    title: "Technical / non-technical registers maintained in the unit",
    items: [
      "VAT",
      "TCC",
      "Enquiries",
      "Complaints",
      "Dispatch to other units",
      "Tax consultants",
      "File transfer to other offices",
    ],
  },
  {
    key: "s6",
    title: "Progress report on REV 360 implementation",
    items: [
      "Tax ID registration",
      "Updates",
      "Self-service station utilization",
      "Monthly filing",
      "Annual filing",
      "Withholding Tax",
      "Withholding VAT",
      "Gap between commenced and active companies",
      "Stamp duties",
      "Review",
    ],
  },
  {
    key: "s7",
    title: "Relationship management programmes held by the office",
    items: ["Taxpayer workshops", "Tax clinics", "Road shows", "Tax Thursday"],
  },
  {
    key: "s8",
    title: "Newly registered taxpayers",
    items: [
      "Number of newly registered taxpayers in the immediate preceding month",
      "Gap between number of taxpayers on the office master list / register on REV 360",
    ],
  },
  {
    key: "s9",
    title: "Taxpayer complaints handling and resolution",
    items: [
      "Number received in the previous month",
      "Number resolved",
      "List of cases escalated to management",
    ],
  },
  {
    key: "s10",
    title: "Any other issues for Management information",
  },
]
