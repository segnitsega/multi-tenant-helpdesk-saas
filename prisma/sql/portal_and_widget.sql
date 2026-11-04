-- Portal magic links + widget settings (Phase 15)

CREATE TABLE IF NOT EXISTS "public"."customer_magic_links" (
  "id" uuid NOT NULL,
  "workspace_id" uuid NOT NULL,
  "email" text NOT NULL,
  "token_hash" text NOT NULL,
  "expires_at" timestamptz(3) NOT NULL,
  "used_at" timestamptz(3),
  "created_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "customer_magic_links_token_hash_key"
  ON "public"."customer_magic_links" ("token_hash");
CREATE INDEX IF NOT EXISTS "customer_magic_links_workspace_id_email_idx"
  ON "public"."customer_magic_links" ("workspace_id", "email");
CREATE INDEX IF NOT EXISTS "customer_magic_links_workspace_id_idx"
  ON "public"."customer_magic_links" ("workspace_id");

DO $$ BEGIN
  ALTER TABLE "public"."customer_magic_links"
    ADD CONSTRAINT "customer_magic_links_workspace_id_fkey"
    FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces" ("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "public"."widget_settings" (
  "workspace_id" uuid NOT NULL,
  "color" text NOT NULL DEFAULT '#2563eb',
  "greeting" text NOT NULL DEFAULT 'Hi! How can we help?',
  "allowed_origins" json NOT NULL DEFAULT '[]'::json,
  "show_powered_by" bool NOT NULL DEFAULT true,
  "created_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("workspace_id")
);

DO $$ BEGIN
  ALTER TABLE "public"."widget_settings"
    ADD CONSTRAINT "widget_settings_workspace_id_fkey"
    FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces" ("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE customer_magic_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_magic_links FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON customer_magic_links;
CREATE POLICY tenant_isolation ON customer_magic_links
  USING (workspace_id = NULLIF(current_setting('app.workspace_id', true), '')::uuid)
  WITH CHECK (workspace_id = NULLIF(current_setting('app.workspace_id', true), '')::uuid);

ALTER TABLE widget_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE widget_settings FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON widget_settings;
CREATE POLICY tenant_isolation ON widget_settings
  USING (workspace_id = NULLIF(current_setting('app.workspace_id', true), '')::uuid)
  WITH CHECK (workspace_id = NULLIF(current_setting('app.workspace_id', true), '')::uuid);
