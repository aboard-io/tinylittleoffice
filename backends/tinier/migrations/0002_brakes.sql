-- How many links an address made on a UTC day, kept under h = base64url(sha256(BRAKE_KEY ‖ day ‖ address)),
-- never the address itself. day is the UTC day number (days since 1970-01-01); the hourly sweep deletes the
-- rows of every day but today and yesterday. Idempotent, as 0001_links.sql says.
CREATE TABLE IF NOT EXISTS brakes (
  h TEXT PRIMARY KEY,
  n INTEGER NOT NULL,
  day INTEGER NOT NULL
);
