import { describe, expect, it } from "vitest"
import {
  isValidEmail,
  isValidIntlPhone,
  isValidNgPhone,
  optionalEmail,
  optionalIntlPhone,
  requiredEmail,
  requiredNgPhone,
} from "./validators"

describe("isValidEmail", () => {
  it.each(["name@example.com", "a.b+c@nrs.gov.ng", " padded@example.ng "])("accepts %s", (v) => {
    expect(isValidEmail(v)).toBe(true)
  })
  it.each(["dsc", "dc", "a@b", "a@b.c", "@example.com", "a b@example.com", "a@@example.com", "a@exa..mple.com", ""])(
    "rejects %j",
    (v) => expect(isValidEmail(v)).toBe(false),
  )
})

describe("isValidNgPhone", () => {
  it.each(["08031234567", "0803 123 4567", "0803-123-4567", "+2348031234567", "+234 803 123 4567", "2348031234567", "+23408031234567", "(0803) 123 4567"])(
    "accepts %s",
    (v) => expect(isValidNgPhone(v)).toBe(true),
  )
  it.each(["dc", "wec", "0801", "080312345", "080312345678", "+2348031234", "+1 415 555 2671", "0803abc4567", ""])("rejects %j", (v) =>
    expect(isValidNgPhone(v)).toBe(false),
  )
})

describe("isValidIntlPhone", () => {
  it.each(["08031234567", "+1 415 555 2671", "+44 20 7946 0958", "1234567"])("accepts %s", (v) => expect(isValidIntlPhone(v)).toBe(true))
  it.each(["fve", "123456", "+1234567890123456", "12-ab-5678", ""])("rejects %j", (v) => expect(isValidIntlPhone(v)).toBe(false))
})

describe("zod helpers", () => {
  it("required ones refuse blank and junk", () => {
    expect(requiredEmail.safeParse("").success).toBe(false)
    expect(requiredEmail.safeParse("dsc").success).toBe(false)
    expect(requiredEmail.safeParse("  a@b.ng ").data).toBe("a@b.ng")
    expect(requiredNgPhone.safeParse("").success).toBe(false)
    expect(requiredNgPhone.safeParse("dc").success).toBe(false)
    expect(requiredNgPhone.safeParse("0803 123 4567").success).toBe(true)
  })
  it("optional ones accept absent, blank and spaces-only, but refuse typed junk", () => {
    for (const s of [optionalEmail(200), optionalIntlPhone(50)]) {
      expect(s.safeParse(undefined).success).toBe(true)
      expect(s.safeParse("").success).toBe(true)
      expect(s.safeParse("   ").success).toBe(true)
    }
    expect(optionalEmail(200).safeParse("efv").success).toBe(false)
    expect(optionalEmail(200).safeParse("a@b.ng").success).toBe(true)
    expect(optionalIntlPhone(50).safeParse("fve").success).toBe(false)
    expect(optionalIntlPhone(50).safeParse("+1 415 555 2671").success).toBe(true)
  })
})
