/** Average of the entered scores, rounded to one decimal; null when none are entered. */
export function averageScore(values: string[]): number | null {
  const entered = values.filter((v) => v !== "")
  if (entered.length === 0) return null
  const sum = entered.reduce((total, v) => total + (Number(v) || 0), 0)
  return Math.round((sum / entered.length) * 10) / 10
}
