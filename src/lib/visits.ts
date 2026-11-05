import type { Row, Sql } from "./db"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export type PendingSummary = {
  id: string
  submitted_at: string | Date
  first_staff_name: string | null
}

export async function createPending(
  sql: Sql,
  input: { tax_office: string; payload: unknown },
): Promise<{ id: string; submitted_at: string | Date }> {
  const rows = await sql`
    INSERT INTO checklist_visits (tax_office, payload)
    VALUES (${input.tax_office}, ${JSON.stringify(input.payload)}::jsonb)
    RETURNING id, submitted_at`
  const row = rows[0]
  if (!row) throw new Error("createPending returned no row")
  return { id: row.id as string, submitted_at: row.submitted_at as string | Date }
}

export async function listPending(sql: Sql, tax_office: string): Promise<PendingSummary[]> {
  const rows = await sql`
    SELECT id, submitted_at, payload->'staff'->0->>'name' AS first_staff_name
    FROM checklist_visits
    WHERE tax_office = ${tax_office} AND status = 'pending'
    ORDER BY submitted_at DESC, id`
  return rows.map((r) => ({
    id: r.id as string,
    submitted_at: r.submitted_at as string | Date,
    first_staff_name: (r.first_staff_name as string | null) ?? null,
  }))
}

export async function getVisit(sql: Sql, id: string): Promise<Row | null> {
  if (!UUID_RE.test(id)) return null
  const rows = await sql`SELECT * FROM checklist_visits WHERE id = ${id}::uuid`
  return rows[0] ?? null
}

/** Atomic pending -> scored. Returns null when the id is unknown/malformed or already scored. */
export async function scoreVisit(
  sql: Sql,
  input: { id: string; scores: unknown; signoffs: unknown; total_score: number },
): Promise<Row | null> {
  if (!UUID_RE.test(input.id)) return null
  const rows = await sql`
    UPDATE checklist_visits
    SET status = 'scored',
        scores = ${JSON.stringify(input.scores)}::jsonb,
        signoffs = ${JSON.stringify(input.signoffs)}::jsonb,
        total_score = ${input.total_score},
        scored_at = now()
    WHERE id = ${input.id}::uuid AND status = 'pending'
    RETURNING *`
  return rows[0] ?? null
}

export async function markSynced(sql: Sql, id: string): Promise<void> {
  await sql`UPDATE checklist_visits SET sheet_synced_at = now(), sheet_error = NULL WHERE id = ${id}::uuid`
}

export async function markSyncError(sql: Sql, id: string, message: string): Promise<void> {
  await sql`UPDATE checklist_visits SET sheet_error = ${message.slice(0, 500)} WHERE id = ${id}::uuid`
}
