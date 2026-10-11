# Running your own copy

Tiny Little Office runs on anyone's Cloudflare account exactly as it runs at tinylittleoffice.com: the same
code, the same three Workers, nothing of ours in between. A document is its link, so a copy of your own
needs no data from ours; a link made on one copy opens on another (the part after `#` is the document, and
any copy reads it). This takes about thirty minutes, most of it waiting for a domain's certificate.

## What you are deploying

| Worker | Config | What it is | Storage |
| --- | --- | --- | --- |
| the site | `wrangler.jsonc` | `dist/` as static assets, with `dist/_headers` (the Content-Security-Policy). No script runs on the server. | none |
| tinier | `tinier/wrangler.jsonc` | the short-link service: ciphertext in, ciphertext out, a hundred links a day per address (README, "Short links") | D1: two tables, swept hourly by a cron trigger |
| media | `media/wrangler.jsonc` | the picture proxy, so a picture's site never learns who read a document (docs/network.md) | none (the edge's cache, a week) |

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

Choose three addresses, for example `office.example.org` (the site), `tinier.example.org` and
`media.example.org`. Then change ours to yours, in five places:

1. **The routes.** In `wrangler.jsonc`, `tinier/wrangler.jsonc` and `media/wrangler.jsonc`, set each
   `routes` pattern to its address, keeping `"custom_domain": true`. Cloudflare makes the DNS record and
   the certificate the first time it deploys.
2. **The site the Workers serve.** In `tinier/wrangler.jsonc` and `media/wrangler.jsonc`, add
   `"vars": { "SITE": "https://office.example.org" }`. tinier lets only that site call it, and leads a
   short link nowhere else; media hands picture bytes only to it. (Without the var each falls back to
   `https://tinylittleoffice.com`, and your site would be refused.)
3. **The build's settings,** in a file `.env.production` (not committed; `.env.example` lists them):

   ```sh
   VITE_SITE_URL=https://office.example.org/        # the canonical link and the share cards
   VITE_MEDIA_URL=https://media.example.org         # your picture proxy; empty loads pictures directly, every host asking first
   VITE_TINIER=https://tinier.example.org/          # your short-link service
   ```

4. **The policy.** In `public/_headers`, the `connect-src` names `https://tinier.tinylittleoffice.com`:
   change it to your tinier's address, or the browser will refuse every short link. (`img-src` and the
   proxy's part of `connect-src` are filled from `VITE_MEDIA_URL` by the build.)
5. **The rate limit.** `media/wrangler.jsonc` names a `ratelimits` `namespace_id` ("2"); any number not used
   by another Worker on your account will do. (tinier counts its own, a hundred links a day per address, in D1.)

## 3. The short links' database

```sh
npx wrangler d1 create tinier
```

Put the `database_id` it prints into `tinier/wrangler.jsonc` (it is not a secret, but it is your account's,
so a fork that is public will show it), then make the tables:

```sh
npm run tinier:schema      # tinier/schema.sql and tinier/migrations/, on the remote database; safe to run again
```

A copy made before the daily count was added has the links table already; apply the migration alone:

```sh
npx wrangler d1 execute tinier -c tinier/wrangler.jsonc --remote --file=tinier/migrations/0001-brakes.sql
```

Then give tinier the secret its daily counts are kept under: any long random string, kept nowhere else.

```sh
openssl rand -base64 32 | npx wrangler secret put BRAKE_KEY -c tinier/wrangler.jsonc
```

Without it tinier answers nothing and says why. On a development machine, put `BRAKE_KEY=<any string>` in
`tinier/.dev.vars` (ignored by git) for `npm run tinier:dev`.

## 4. Deploy

```sh
npm run deploy
```

That runs the checks we run before shipping (the types, the strings, the unit and browser tests, the build,
what the build wrote, and the smoke run on the built site when something on screen changed), then deploys
the three Workers in turn. `npm run deploy -- --dry-run` checks and deploys nothing.

Open your site, write something, make a short link and open it in another browser; put a picture from
Wikimedia in a document and check that it comes from your `media.` address (the browser's network panel).

## 5. Telling copies apart

A copy of your own is not ours, and its readers deserve to know which one they are reading. The About
dialog (the menu, then About) names the commit the copy was built from, linked to that commit in the
repository it came from; the site serves the same as `/version.json` (the commit, the tag, the build time
and the policy's script hashes; docs/transparency.md §1 item 3). Build from a commit you have pushed, so
anyone can read the code your copy runs, and anyone can build it again and compare.

## Keeping up

Pull from this repository into your fork, read what changed, `npm ci` and deploy again. A document needs no
migration: the format is read leniently and written the same way on every copy.

## Without a short-link service, or a proxy

Both are optional. Without tinier, the short link is the one thing that does not work: Share still copies
the link and the display link, draws the QR code and hands the link to the device's share sheet. Set
`VITE_MEDIA_URL=` (empty) and skip media: pictures then load straight from their sites, each host asking the
reader first, and the policy's `img-src` allows any https address.
