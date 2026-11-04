// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest"

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("db", () => {
  it("does not throw merely by importing the module", async () => {
    vi.stubEnv("DATABASE_URL", "")
    await expect(import("./db")).resolves.toBeDefined()
  })

  it("getSql throws DatabaseNotConfiguredError when DATABASE_URL is unset", async () => {
    vi.stubEnv("DATABASE_URL", "")
    const { getSql, DatabaseNotConfiguredError } = await import("./db")
    expect(() => getSql()).toThrow(DatabaseNotConfiguredError)
    expect(() => getSql()).toThrow("DATABASE_URL is not configured")
  })
})
