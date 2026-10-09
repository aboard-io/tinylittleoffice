-- One row per short link: the ciphertext and its IV as the site sent them, when to forget it (ms since the
-- epoch), the hash of the owner key that may replace it (base64url of sha256; null for a row nobody can
-- update), the version (1 when made, one more per update) and when it was last updated.
-- Idempotent for a fresh D1: the service launches with these columns, so there is no ALTER path and none is needed.
CREATE TABLE IF NOT EXISTS links (
  id TEXT PRIMARY KEY,
  c TEXT NOT NULL,
  iv TEXT NOT NULL,
  exp INTEGER NOT NULL,
  owner TEXT,
  ver INTEGER NOT NULL DEFAULT 1,
  updated INTEGER
);
CREATE INDEX IF NOT EXISTS links_exp ON links (exp);
