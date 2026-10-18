import { describe, expect, it } from "vitest"
import { TAX_OFFICES, formatTaxOffice, isValidTaxOffice } from "./tax-offices"

const all = TAX_OFFICES.flatMap((s) => s.offices.map((o) => formatTaxOffice(s.state, o)))

describe("tax office list", () => {
  it("has exactly the 199 units on the CSQAU nationwide list", () => {
    expect(all).toHaveLength(199)
  })

  it("has no duplicate saved values", () => {
    expect(new Set(all).size).toBe(all.length)
  })

  it("merges Lagos's three State Administrations into 45 units", () => {
    const lagos = TAX_OFFICES.find((s) => s.state === "Lagos")
    expect(lagos?.offices).toHaveLength(45)
  })

  it("accepts every listed office", () => {
    for (const value of all) expect(isValidTaxOffice(value)).toBe(true)
  })

  it("rejects values not on the list", () => {
    expect(isValidTaxOffice("Nonsense, Lagos")).toBe(false)
    expect(isValidTaxOffice("")).toBe(false)
  })

  it("uses the corrected spellings, not the PDF's glitches", () => {
    expect(isValidTaxOffice("ETO Keffi, Nasarawa")).toBe(true)
    expect(isValidTaxOffice("GBTO Nasarawa, Nasarawa")).toBe(true)
    expect(isValidTaxOffice("ETO 9th Mile, Enugu")).toBe(true)
    expect(isValidTaxOffice("Non-Residence Tax Office, Lagos")).toBe(true)
  })
})
