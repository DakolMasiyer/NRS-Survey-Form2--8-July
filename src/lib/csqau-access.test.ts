import { afterEach, describe, expect, it, vi } from "vitest"
import { verifyCsqauCode } from "./csqau-access"

afterEach(() => vi.unstubAllEnvs())

describe("verifyCsqauCode", () => {
  it("accepts the configured code", () => {
    vi.stubEnv("CSQAU_ACCESS_CODE", "test-code")
    expect(verifyCsqauCode("test-code")).toBe(true)
  })

  it("rejects a wrong code, including one of a different length", () => {
    vi.stubEnv("CSQAU_ACCESS_CODE", "test-code")
    expect(verifyCsqauCode("test-codf")).toBe(false)
    expect(verifyCsqauCode("test")).toBe(false)
    expect(verifyCsqauCode("")).toBe(false)
  })

  it("rejects non-string input", () => {
    vi.stubEnv("CSQAU_ACCESS_CODE", "test-code")
    expect(verifyCsqauCode(null)).toBe(false)
    expect(verifyCsqauCode(undefined)).toBe(false)
    expect(verifyCsqauCode(1234)).toBe(false)
  })

  it("throws when the env var is unset or empty", () => {
    vi.stubEnv("CSQAU_ACCESS_CODE", "")
    expect(() => verifyCsqauCode("anything")).toThrow("CSQAU_ACCESS_CODE is not configured")
  })
})
