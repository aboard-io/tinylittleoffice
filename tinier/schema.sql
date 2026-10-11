-- One row per short link: the ciphertext and its IV as the site sent them, and when to forget it (ms since the
-- epoch). A short link is never changed, so these four columns are all there is. Idempotent.
-- The daily counts are tinier/migrations/0001-brakes.sql.
CREATE TABLE IF NOT EXISTS links (
  id TEXT PRIMARY KEY,
  c TEXT NOT NULL,
  iv TEXT NOT NULL,
  exp INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS links_exp ON links (exp);
