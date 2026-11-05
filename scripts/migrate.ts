// Applies db/migrations/*.sql in filename order. Usage: DATABASE_URL=... node scripts/migrate.ts
// Plain Node does not load .env.local, so export DATABASE_URL in the shell first.
import { readdir, readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { Pool } from "@neondatabase/serverless"

const url = process.env.DATABASE_URL
if (!url) throw new Error("DATABASE_URL is not configured")

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "db", "migrations")
const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort()

const pool = new Pool({ connectionString: url })
try {
  await pool.query(
    "CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())",
  )
  const done = new Set(
    (await pool.query("SELECT name FROM schema_migrations")).rows.map((r) => String(r.name)),
  )
  let applied = 0
  for (const file of files) {
    if (done.has(file)) {
      console.log(`skip    ${file} (already applied)`)
      continue
    }
    const client = await pool.connect()
    try {
      await client.query("BEGIN")
      await client.query(await readFile(path.join(dir, file), "utf8"))
      await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [file])
      await client.query("COMMIT")
    } catch (err) {
      await client.query("ROLLBACK")
      throw err
    } finally {
      client.release()
    }
    console.log(`applied ${file}`)
    applied++
  }
  console.log(`Done: ${applied} applied, ${files.length - applied} skipped.`)
} finally {
  await pool.end()
}
