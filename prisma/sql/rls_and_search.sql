-- Row-Level Security + full-text search (run once as Neon owner after tables exist).
-- Tenant context is set per transaction: set_config('app.workspace_id', '<uuid>', true)

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'workspace_counters','memberships','invitations','customers','tickets','messages',
    'attachments','tags','ticket_tags','custom_field_defs','ticket_custom_values',
    'canned_replies','sla_policies','automation_rules','saved_views','audit_logs'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', t);
    EXECUTE format($f$
      CREATE POLICY tenant_isolation ON %I
      USING (workspace_id = NULLIF(current_setting('app.workspace_id', true), '')::uuid)
      WITH CHECK (workspace_id = NULLIF(current_setting('app.workspace_id', true), '')::uuid)
    $f$, t);
  END LOOP;
END $$;

ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON workspaces;
CREATE POLICY tenant_isolation ON workspaces
  USING (id = NULLIF(current_setting('app.workspace_id', true), '')::uuid)
  WITH CHECK (id = NULLIF(current_setting('app.workspace_id', true), '')::uuid);

-- Full-text search columns (not in Prisma contract; queried via raw SQL later)
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS search tsvector;
CREATE INDEX IF NOT EXISTS tickets_search_idx ON tickets USING GIN (search);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS search tsvector;
CREATE INDEX IF NOT EXISTS messages_search_idx ON messages USING GIN (search);

CREATE OR REPLACE FUNCTION messages_search_update() RETURNS trigger AS $$
BEGIN
  NEW.search := to_tsvector('english', coalesce(NEW.body_text, ''));
  RETURN NEW;
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS messages_search_trg ON messages;
CREATE TRIGGER messages_search_trg BEFORE INSERT OR UPDATE OF body_text ON messages
  FOR EACH ROW EXECUTE FUNCTION messages_search_update();

CREATE OR REPLACE FUNCTION tickets_search_update() RETURNS trigger AS $$
BEGIN
  NEW.search := to_tsvector('english', coalesce(NEW.subject, ''));
  RETURN NEW;
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tickets_search_trg ON tickets;
CREATE TRIGGER tickets_search_trg BEFORE INSERT OR UPDATE OF subject ON tickets
  FOR EACH ROW EXECUTE FUNCTION tickets_search_update();

CREATE INDEX IF NOT EXISTS tickets_sla_scan_idx ON tickets (workspace_id, sla_first_response_due_at)
  WHERE first_response_at IS NULL AND NOT sla_first_response_breached;

CREATE INDEX IF NOT EXISTS tickets_sla_resolution_scan_idx ON tickets (workspace_id, sla_resolution_due_at)
  WHERE resolved_at IS NULL AND NOT sla_resolution_breached;
