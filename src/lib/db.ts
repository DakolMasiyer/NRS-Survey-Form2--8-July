import { neon } from "@neondatabase/serverless"

export type Row = Record<string, unknown>
export type Sql = (strings: TemplateStringsArray, ...values: unknown[]) => Promise<Row[]>

/** Thrown when DATABASE_URL is missing; route handlers should map it to HTTP 503. */
export class DatabaseNotConfiguredError extends Error {
  constructor() {
    super("DATABASE_URL is not configured")
    this.name = "DatabaseNotConfiguredError"
  }
}

let sql: Sql | undefined

/** Lazily creates the Neon client so importing this module (and `next build`) never needs the env var. */
export function getSql(): Sql {
  if (sql) return sql
  const url = process.env.DATABASE_URL
  if (!url) throw new DatabaseNotConfiguredError()
  sql = neon(url) as unknown as Sql
  return sql
}
