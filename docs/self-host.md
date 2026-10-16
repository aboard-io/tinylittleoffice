# Running your own copy

Tiny Little Office runs on anyone's Cloudflare account exactly as it runs at tinylittleoffice.com: the same
code, the same two Workers, nothing of ours in between. A document is its link, so a copy of your own
needs no data from ours; a link made on one copy opens on another (the part after `#` is the document, and
any copy reads it). This takes about thirty minutes, most of it waiting for a domain's certificate.

## What you are deploying

| Worker | Config | What it is | Storage |
| --- | --- | --- | --- |
| the site | `wrangler.jsonc` | `dist/` as static assets, with `dist/_headers` (the Content-Security-Policy), and a small Worker (`site/`) that runs first only for the home page, each app's page and `/card`: the preview cards a person sends with a link to a network | D1: the `cards` table, in the shortener's database |
| tinier | `tinier/wrangler.jsonc` | the short-link service: ciphertext in, ciphertext out, a hundred links a day per address (docs/crypto/short-links.md) | D1: the links and the daily counts, swept hourly by a cron trigger (the cards with them) |

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
ours to yours, in six places:

1. **The routes.** In `wrangler.jsonc` and `tinier/wrangler.jsonc`, set each
   `routes` pattern to its address, keeping `"custom_domain": true`. Cloudflare makes the DNS record and
   the certificate the first time it deploys.
2. **The site the Worker serves.** In `tinier/wrangler.jsonc`, set
   `"vars": { "SITE": "https://office.example.org" }`, in place of ours. tinier lets only that site call it, and leads a
   short link nowhere else. (Without the var it falls back to `https://tinylittleoffice.com`, and your site
   would be refused.) The file names ours, tinylittleoffice.com and its mirror on GitHub Pages; the var may name
   several, comma-separated, yours first (docs/mirror.md).
3. **The build's settings,** in a file `.env.production` (not committed; `.env.example` lists them):

   ```sh
   VITE_SITE_URL=https://office.example.org/        # the canonical link, the share cards, the sitemap and the structured data
   VITE_TINIER=https://tinier.example.org/          # your short-link service
   ```

4. **The policy.** The build writes the `connect-src` of `dist/_headers` from `src/kit/core/network.ts`, whose
   `tinier` entry names `tinier.tinylittleoffice.com`: change its `host` to your tinier's, or the browser will
   refuse every short link.
5. **The brake.** tinier counts its own, a hundred links a day per address, in D1, under a keyed hash: set the
   Worker secret `BRAKE_KEY` (tinier/wrangler.jsonc says how). The site's own Worker (`site/`, which keeps the
   preview cards a person sends with a link to a network) counts cards the same way under its own `BRAKE_KEY`.
6. **The cards' database.** `wrangler.jsonc` binds the shortener's database too (the `cards` table): put the same
   `database_id` there as in `tinier/wrangler.jsonc`.

## 3. The short links' database

```sh
npx wrangler d1 create tinier
```

Put the `database_id` it prints into `tinier/wrangler.jsonc` (it is not a secret, but it is your account's,
so a fork that is public will show it). The tables are `tinier/migrations/` (wrangler's numbered
`NNNN_name.sql` files, the directory `migrations_dir` names); the deploy applies the ones the database has not had,
before the shortener ships, so there is nothing to run by hand. Each is safe on a database that has its tables
already, as one made before wrangler kept its record does.

Then give tinier the secret its daily counts are kept under: any long random string, kept nowhere else. This is
the one thing set by hand, once; the deploy checks it is there and stops, saying so, if it is not.

```sh
openssl rand -base64 32 | npx wrangler secret put BRAKE_KEY -c tinier/wrangler.jsonc
openssl rand -base64 32 | npx wrangler secret put BRAKE_KEY
```

The second is the site's Worker's own, for the preview cards. Without its key either Worker answers nothing and says
why. On a development machine, put `BRAKE_KEY=<any string>` in `tinier/.dev.vars` for `npm run tinier:dev` and in
`.dev.vars` for `npm run site:dev` (both ignored by git); each applies the migrations to its local database, and
`site:dev` serves the build in `dist/` with the Worker in front, where the dev server sends `/card`.

## 4. Deploy

The deploy reads three credentials from the environment, or else from the checkout's `.env` (ignored by git;
`.env.example` lists them), and stops before it does anything, naming the one that is missing:

| Name | What |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | an account API token (My Profile, or the account's Manage Account → Account API Tokens): **Workers Scripts: Edit**, **D1: Edit** and **Account Settings: Read** on the account; **Workers Routes: Edit** and **Zone: Read** on your zone |
| `CLOUDFLARE_ACCOUNT_ID` | the account's id (the dashboard's Workers & Pages overview shows it) |
| `NPM_TOKEN` | a granular npm token that may publish the command line's package; asked for only when `packages/doc` is not private |

```sh
npm run deploy
```

That checks both Workers' `BRAKE_KEY` is set, runs the checks we run before shipping (the types, the strings, the unit
and browser tests, the build, what the build wrote, and the smoke run on the built site when something on screen
changed), then applies the shortener's migrations, deploys the two Workers in turn, and publishes the command line
to npm when its version is new. `npm run deploy -- --dry-run` makes every check and prints the steps it would
take, and ships nothing. No credential is printed, and none is seen by the tests or the build: the script takes
them out of the environment first and hands them to Wrangler and npm alone.

Last, the deploy publishes the command line to npm, as `tinylittleoffice` (`npx tinylittleoffice lint …`), when
`packages/doc/package.json` has a version npm does not and the checkout's `.env` holds `NPM_TOKEN` (a granular
access token of the npm account that owns the package). Without one it says so and goes on: the site does not
wait for npm. A copy of your own needs no package of its own: `npx tinylittleoffice link … --site https://your.site/`
makes links to your copy.

Open your site, write something, make a short link and open it in another browser.

### From GitHub, on a tag

A fork can deploy the way tinylittleoffice.com does: `.github/workflows/deploy.yml` runs the same script on a
GitHub runner when a tag `v*` is pushed. Put the three names above in the fork's Settings → Secrets and variables →
Actions as repository secrets, make an environment `production` (Settings → Environments; no reviewers needed), and
change `https://tinylittleoffice.com/` in the workflow to your address. The workflows assume these settings, set by
hand on GitHub as aboard-io/tinylittleoffice has them:

- Settings → Environments → `production`: no required reviewers (the tag is the approval), no wait timer;
  **Deployment branches and tags**: selected, the tag rule `v*`, so nothing but a tag deploys. Stronger: keep the
  three secrets in that environment rather than the repository (the workflow reads them the same way), so only a
  run from a tag `v*` can read them at all, not any workflow someone with write access adds on a branch.
- A tag ruleset (Settings → Rules → Rulesets → New tag ruleset): enforcement **Active**, target the pattern `v*`;
  **Restrict creations**, **Restrict updates**, **Restrict deletions**, **Block force pushes**; bypass list: the
  **Maintain** role (and the organization's admins), so only maintainers can create a tag `v*`, and so only they
  can deploy. The workflows assume this ruleset: a tag `v*` that exists is a maintainer's decision to ship.
- Settings → Actions → General → Workflow permissions: leave **Read repository contents** as the default; the
  deploy workflow asks for its own per job: the deploy `contents: read` and `id-token: write` (npm's provenance),
  the release `contents: write`, `id-token: write` and `attestations: write`.
- A branch ruleset on `main` requiring the check `check` (the CI workflow's one job, `.github/workflows/ci.yml`:
  every check a deploy runs, then the lints, the advisories and the build made twice), chosen once CI has run on
  main once.

Then:

```sh
git tag -s v1.0.0 -m "v1.0.0" && git push origin v1.0.0
```

### How tinylittleoffice.com is deployed

Every deploy of tinylittleoffice.com is a tag `v*` on https://github.com/aboard-io/tinylittleoffice, and its whole
log is public: the repository's **Actions** tab, the workflow **Deploy**, one run per tag. A run:

1. checks the tag out and installs what the lockfile names (`npm ci`), the browsers and the fonts the tests measure in;
2. runs `npm run deploy` with the three secrets, which only that step is given: the checks, the shortener's
   migrations, the site, the shortener, and the command line on npm, published with **provenance** (npm's record
   of the repository, the commit and the workflow run that built the package, vouched for by the runner's identity:
   the package's page on npmjs.com shows it, and `npm audit signatures` checks it); a prerelease (1.1.0-next) is
   published under its own tag, `next`, and `latest` is moved to it, so `npx tinylittleoffice` is always the newest;
3. fetches every file of the live site and compares it with the build (`npm run verify-deploy`), and fails the
   run if one differs;
4. builds the tag again, shows it is the same bytes, attests it, checks once more that it is what the site
   serves, and makes the GitHub release with the archive and its notes (`scripts/release-notes.ts`: the commit,
   the policy's script hashes, how to check them).

To check it yourself, from any clone:

```sh
npm run verify-deploy -- https://tinylittleoffice.com/        # the commit the site says it runs, built here and compared file by file
gh attestation verify tinylittleoffice-v1.0.0.tar.gz -R aboard-io/tinylittleoffice   # the release's archive, built by that workflow
```

## 5. Telling copies apart

A copy of your own is not ours, and its readers deserve to know which one they are reading. The About
dialog (the menu, then About) names the commit the copy was built from, linked to that commit in the
repository it came from; the site serves the same as `/version.json` (the commit, the tag, the build time
and the policy's script hashes; docs/threat-model.md, "Checking it yourself"), and the home page's foot ends
with its tag or commit. Build from a commit you have pushed, so
anyone can read the code your copy runs, and anyone can build it again and compare.

## Keeping up

Pull from this repository into your fork, read what changed, `npm ci` and deploy again. A document needs no
migration: the format is read leniently and written the same way on every copy.

## Without a short-link service

It is optional. Without tinier, the short link is the one thing that does not work: Share still copies
the Edit link and the Present link, draws the QR code and hands the link to the device's share sheet.
