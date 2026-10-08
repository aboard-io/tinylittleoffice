-- One row per short link: the ciphertext and its IV as the page sent them, and when to forget it (ms since the epoch).
CREATE TABLE IF NOT EXISTS links (
  id TEXT PRIMARY KEY,
  c TEXT NOT NULL,
  iv TEXT NOT NULL,
  exp INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS links_exp ON links (exp);
