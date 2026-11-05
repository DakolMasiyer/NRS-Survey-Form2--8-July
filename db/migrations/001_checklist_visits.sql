CREATE TABLE IF NOT EXISTS checklist_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tax_office text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'scored')),
  submitted_at timestamptz NOT NULL DEFAULT now(),
  payload jsonb NOT NULL,
  scores jsonb,
  signoffs jsonb,
  total_score numeric(4,1),
  scored_at timestamptz,
  sheet_synced_at timestamptz,
  sheet_error text
);

CREATE INDEX IF NOT EXISTS checklist_visits_office_status_idx
  ON checklist_visits (tax_office, status);

CREATE TABLE IF NOT EXISTS access_attempts (
  ip_hash text NOT NULL,
  attempted_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS access_attempts_ip_time_idx
  ON access_attempts (ip_hash, attempted_at);
