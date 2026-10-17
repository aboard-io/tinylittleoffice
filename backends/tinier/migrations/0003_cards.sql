-- One row per preview card (tinier/cards.ts): the picture of a shared document's first page (a PNG of 1200 by 630, at
-- most 400 KB), its title and first words, which app made it, and when to forget it (ms since the epoch, a month on).
-- Made by the site's Worker when a person shares with a network with the preview on, read by both Workers; the
-- shortener's hourly sweep deletes the expired ones with the expired links. A card is never changed. Idempotent, as
-- 0001_links.sql says.
CREATE TABLE IF NOT EXISTS cards (
  id TEXT PRIMARY KEY,
  app TEXT NOT NULL,
  title TEXT NOT NULL,
  text TEXT NOT NULL,
  png BLOB NOT NULL,
  exp INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS cards_exp ON cards (exp);
