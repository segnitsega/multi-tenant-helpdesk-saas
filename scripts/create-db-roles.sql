-- Dev roles for tenant isolation (run as Neon owner once).
-- Neon requires strong passwords — do NOT use weak values like 'app_user'.
-- After creating roles, put matching URLs in .env.local:
--   DATABASE_URL=...app_user...
--   DATABASE_URL_SYSTEM=...system_user_role...

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_user') THEN
    CREATE ROLE app_user LOGIN PASSWORD 'REPLACE_WITH_STRONG_PASSWORD' NOSUPERUSER NOBYPASSRLS;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'system_user_role') THEN
    CREATE ROLE system_user_role LOGIN PASSWORD 'REPLACE_WITH_STRONG_PASSWORD' NOSUPERUSER BYPASSRLS;
  END IF;
END $$;

-- Neon database name is typically "neondb".
GRANT CONNECT ON DATABASE neondb TO app_user, system_user_role;
GRANT USAGE ON SCHEMA public TO app_user, system_user_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user, system_user_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user, system_user_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user, system_user_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO app_user, system_user_role;
