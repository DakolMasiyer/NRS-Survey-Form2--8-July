import { describe, expect, it } from "vitest"
import { averageScore } from "./score"

describe("averageScore", () => {
  it("returns null when nothing is entered", () => {
    expect(averageScore([])).toBeNull()
    expect(averageScore(["", "", ""])).toBeNull()
  })

  it("averages the entered scores", () => {
    expect(averageScore(["100", "50"])).toBe(75)
  })

  it("ignores blank entries", () => {
    expect(averageScore(["80", "", "60"])).toBe(70)
  })

  it("rounds to one decimal place", () => {
    expect(averageScore(["33", "33", "34"])).toBe(33.3)
  })

  it("treats a zero score as entered", () => {
    expect(averageScore(["0"])).toBe(0)
  })
})
