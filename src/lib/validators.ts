import { z } from "zod"

/*
 * Shared input rules for the taxpayer survey and the staff checklist (forms and
 * servers use the same ones). Optional fields: blank is fine, but anything typed
 * must be valid.
 */

export const EMAIL_MESSAGE = "Enter a valid email address, like name@example.com"
export const NG_PHONE_MESSAGE = "Enter a valid Nigerian phone number, like 0803 123 4567 or +234 803 123 4567"
export const INTL_PHONE_MESSAGE = "Enter a valid phone number (digits only; start with + and the country code if outside Nigeria)"

// Spaces, dashes, dots and brackets are allowed as separators when typing.
const stripSeparators = (v: string) => v.replace(/[\s\-.()]/g, "")

export function isValidEmail(v: string): boolean {
  const s = v.trim()
  return s.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@.]{2,}$/.test(s) && !s.includes("..")
}

/** 0 + 10 digits, or +234 / 234 followed by 10 digits (an extra 0 after 234 is tolerated). */
export function isValidNgPhone(v: string): boolean {
  const s = stripSeparators(v.trim())
  return /^0\d{10}$/.test(s) || /^\+?2340?\d{10}$/.test(s)
}

/** 7 to 15 digits with an optional leading +. */
export function isValidIntlPhone(v: string): boolean {
  return /^\+?\d{7,15}$/.test(stripSeparators(v.trim()))
}

/** Message for a typed value, or undefined when it is fine. For hand-rolled forms. */
export const emailProblem = (v: string): string | undefined => (isValidEmail(v) ? undefined : EMAIL_MESSAGE)
export const ngPhoneProblem = (v: string): string | undefined => (isValidNgPhone(v) ? undefined : NG_PHONE_MESSAGE)

const trimmed = (max: number) => z.string().trim().max(max)

export const requiredEmail = trimmed(254).min(1, "Required").refine(isValidEmail, EMAIL_MESSAGE)
export const requiredNgPhone = trimmed(50).min(1, "Required").refine(isValidNgPhone, NG_PHONE_MESSAGE)

export const optionalEmail = (max = 200) =>
  trimmed(max)
    .refine((v) => v === "" || isValidEmail(v), EMAIL_MESSAGE)
    .optional()
export const optionalIntlPhone = (max = 50) =>
  trimmed(max)
    .refine((v) => v === "" || isValidIntlPhone(v), INTL_PHONE_MESSAGE)
    .optional()
