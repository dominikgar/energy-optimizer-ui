BEGIN;
ALTER TABLE public.user_subscriptions ALTER COLUMN api_key DROP NOT NULL;
ALTER TABLE public.user_subscriptions ADD COLUMN IF NOT EXISTS access_token_digest TEXT;
ALTER TABLE public.user_subscriptions ADD COLUMN IF NOT EXISTS access_token_prefix TEXT;
ALTER TABLE public.user_subscriptions ADD COLUMN IF NOT EXISTS access_token_created_at TIMESTAMPTZ;
ALTER TABLE public.user_subscriptions ADD COLUMN IF NOT EXISTS access_token_last_used_at TIMESTAMPTZ;
CREATE UNIQUE INDEX IF NOT EXISTS user_subscriptions_access_token_digest_idx ON public.user_subscriptions (access_token_digest) WHERE access_token_digest IS NOT NULL;
COMMIT;
