-- One row per short link: the ciphertext and its IV as the site sent them, and when to forget it (ms since the
-- epoch). A short link is never changed, so these four columns are all there is. Idempotent: production's database
-- was made by hand before wrangler kept a record, so every migration here takes a database that has its tables.
-- Applied by the deploy (scripts/deploy.mjs): npx wrangler d1 migrations apply tinier --remote -c tinier/wrangler.jsonc
CREATE TABLE IF NOT EXISTS links (
  id TEXT PRIMARY KEY,
  c TEXT NOT NULL,
  iv TEXT NOT NULL,
  exp INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS links_exp ON links (exp);
