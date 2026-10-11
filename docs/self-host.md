# Running your own copy

Tiny Little Office runs on anyone's Cloudflare account exactly as it runs at tinylittleoffice.com: the same
code, the same two Workers, nothing of ours in between. A document is its link, so a copy of your own
needs no data from ours; a link made on one copy opens on another (the part after `#` is the document, and
any copy reads it). This takes about thirty minutes, most of it waiting for a domain's certificate.

## What you are deploying

| Worker | Config | What it is | Storage |
| --- | --- | --- | --- |
| the site | `wrangler.jsonc` | `dist/` as static assets, with `dist/_headers` (the Content-Security-Policy). No script runs on the server. | none |
| tinier | `tinier/wrangler.jsonc` | the short-link service: ciphertext in, ciphertext out (README, "Living short links") | D1: one table, swept hourly by a cron trigger |

Each has `observability` off and `workers_dev` off: no logs, and no `*.workers.dev` copy. Keep it that way
unless you mean to change what your copy knows about its readers.

## What you need

- A Cloudflare account, and a domain whose DNS is on it (a zone). Workers and D1 both have a free tier;
  check Cloudflare's current limits for what your readers will need.
- Node 24 or later, and git.

## 1. The code

```sh
git clone https://github.com/<you>/tinylittleoffice.git && cd tinylittleoffice   # your fork of aboard-io/tinylittleoffice, so your copy is your commits
npm ci
npx wrangler login
```

## 2. Your names

Choose two addresses, for example `office.example.org` (the site) and `tinier.example.org`. Then change
ours to yours, in five places:

1. **The routes.** In `wrangler.jsonc` and `tinier/wrangler.jsonc`, set each
   `routes` pattern to its address, keeping `"custom_domain": true`. Cloudflare makes the DNS record and
   the certificate the first time it deploys.
2. **The site the Worker serves.** In `tinier/wrangler.jsonc`, add
   `"vars": { "SITE": "https://office.example.org" }`. tinier lets only that site call it, and leads a
   short link nowhere else. (Without the var it falls back to `https://tinylittleoffice.com`, and your site
   would be refused.)
3. **The build's settings,** in a file `.env.production` (not committed; `.env.example` lists them):

   ```sh
   VITE_SITE_URL=https://office.example.org/        # the canonical link and the share cards
   VITE_TINIER=https://tinier.example.org/          # your short-link service
   ```

4. **The policy.** In `public/_headers`, the `connect-src` names `https://tinier.tinylittleoffice.com`:
   change it to your tinier's address, or the browser will refuse every short link.
5. **The rate limit.** `tinier/wrangler.jsonc` names a `ratelimits` `namespace_id` ("1"); any number not
   used by another Worker on your account will do.

## 3. The short links' database

```sh
npx wrangler d1 create tinier
```

Put the `database_id` it prints into `tinier/wrangler.jsonc` (it is not a secret, but it is your account's,
so a fork that is public will show it), then make the table:

```sh
npm run tinier:schema      # tinier/schema.sql, on the remote database; safe to run again
```

## 4. Deploy

```sh
npm run deploy
```

That runs the checks we run before shipping (the types, the strings, the unit and browser tests, the build,
what the build wrote, and the smoke run on the built site when something on screen changed), then deploys
the two Workers in turn. `npm run deploy -- --dry-run` checks and deploys nothing.

Open your site, write something, make a short link and open it in another browser.

## 5. Telling copies apart

A copy of your own is not ours, and its readers deserve to know which one they are reading. The About
dialog (the menu, then About) names the commit the copy was built from, linked to that commit in the
repository it came from; the site serves the same as `/version.json` (the commit, the tag, the build time
and the policy's script hashes; docs/transparency.md §1 item 3). Build from a commit you have pushed, so
anyone can read the code your copy runs, and anyone can build it again and compare.

## Keeping up

Pull from this repository into your fork, read what changed, `npm ci` and deploy again. A document needs no
migration: the format is read leniently and written the same way on every copy.

## Without a short-link service

It is optional. Without tinier, the short link is the one thing that does not work: Share still copies
the link and the display link, draws the QR code and hands the link to the device's share sheet.
