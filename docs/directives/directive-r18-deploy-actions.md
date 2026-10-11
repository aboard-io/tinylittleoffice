# R18-deploy-actions: a tag deploys, from GitHub Actions

**Paul, 2026-10-11:** *"Since this is an open source project GitHub Actions can handle the deploy to Cloudflare. Is that right?"* It is: a public runner, a public log, provenance on the npm package, no Cloudflare credential on the dev box. Deploys are tags (the v1 plan: one commit per task on main, a tag per deploy, release/vN for maintenance).

## The design

- **One script, two callers.** `scripts/deploy.mjs` stays the deploy and keeps working from a box; it reads `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` and `NPM_TOKEN` from the environment first and from the checkout's `.env` second, and refuses with a clear sentence when a needed one is missing. The npm step publishes with `--provenance` when `ACTIONS_ID_TOKEN_REQUEST_URL` is set (a runner) and without it elsewhere.
- **`.github/workflows/deploy.yml`**: on `push` of tags matching `v*` (and `workflow_dispatch` with a tag input, for a re-run). Ubuntu, Node 24, `npm ci`, `npx playwright install --with-deps chromium webkit`, the fonts the measuring tests need (what r17-plex installs on the box, from the repo's own files, plus the Noto packages), then `npm run deploy` with the three secrets as env, `permissions: { contents: read, id-token: write }` for provenance. Every third-party action is pinned by full commit hash with the version in a trailing comment (`uses: actions/checkout@<sha> # v4.2.2`), never by tag, so a hijacked action cannot read the token; a test reads the workflow and fails on any `uses:` without a 40-hex ref. The three secrets already exist in the repository (`CLOUDFLARE_API_TOKEN` is an account-owned token scoped to Workers Scripts, D1 and Account Settings on the account and Workers Routes and Zone Read on the one zone; `CLOUDFLARE_ACCOUNT_ID`; `NPM_TOKEN`): the workflow names them, nobody creates them. Concurrency one deploy at a time, cancel-in-progress false. After the deploy, the same job runs `npm run verify-deploy -- https://tinylittleoffice.com/` and fails the run if the live files differ from the build.
- **The shortener's migrations** apply in the deploy script before the shortener Worker ships: `npx wrangler d1 migrations apply tinier --remote -c tinier/wrangler.jsonc`, with `tinier/wrangler.jsonc` naming `migrations_dir: "migrations"` (r17-shortener's files, renamed to wrangler's `NNNN_name.sql` form). The `BRAKE_KEY` secret is set once by hand (`wrangler secret put`) and the deploy checks it exists (`wrangler secret list`) and stops with a sentence if not.
- **Protection.** A tag ruleset on the repository allows `v*` tags to be created by maintainers only; the workflow's environment `production` requires no reviewers (a tag push is the approval). Say in the report what ruleset the files assume; I set it by hand.
- **CI** (`ci.yml` from r17-public) runs on pushes to main and on pull requests, with no secrets, and is the required check on main once it exists.
- **A release.** The deploy job ends by creating the GitHub release for the tag with `scripts/release-notes.ts`'s output as the body (`gh release create` is available on the runner).
- docs/self-host.md and docs/transparency.md: how a deploy happens, where the log is, how to verify it yourself.

## Proof

- A node test that parses `deploy.yml` and checks: the trigger, the permissions, the three env names, that `npm run deploy` and `npm run verify-deploy` are run, the concurrency group.
- `scripts/deploy.mjs` has a `--dry-run` that performs every check and prints the deploy steps without shipping; a test runs it with the secrets unset and expects the sentence naming the missing one.
- The tinier tests cover the migrations directory's files applying in order on a fresh database and on one that already has the four columns.

## Not this

- No deploy on push to main; no previews on pull requests (that is a later round if wanted).
- No credential in any file of the repo, and no credential printed by any step.
