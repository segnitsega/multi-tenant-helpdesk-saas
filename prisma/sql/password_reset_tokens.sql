CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token_hash text NOT NULL,
  expires_at timestamptz(3) NOT NULL,
  used_at timestamptz(3),
  created_at timestamptz(3) NOT NULL,
  CONSTRAINT password_reset_tokens_token_hash_key UNIQUE (token_hash)
);

CREATE INDEX IF NOT EXISTS password_reset_tokens_user_id_idx_6c952402
  ON public.password_reset_tokens (user_id);
