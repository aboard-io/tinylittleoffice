# R17-public: the repository is public at aboard-io/tinylittleoffice, and the home page says who made it

**Paul, 2026-10-11:** *"At the bottom of the home page put: 'Made with respect by Aboard' with a link to Aboard.com. And another that just says 'Open source' with a link to the GitHub repository. … Rename the repository to tinylittleoffice … move the repository to the aboard-io organization and open it. … Let's use MIT license … Start preparing this repo for public release and maintenance."* The repository is now `https://github.com/aboard-io/tinylittleoffice` (renamed, transferred and opened by hand on 2026-10-11; the old names redirect). This directive is the tree's side of it.

## The footer

- The home page (`src/kit/home.ts`) ends with a footer of two lines, through t(): 'Made with respect by Aboard' where 'Aboard' is a link to `https://aboard.com`, and 'Open source', a link to `https://github.com/aboard-io/tinylittleoffice`. Both plain `<a>` with `rel="noopener"` opening in a new tab; the chrome's own links need no guard. Quiet type (the kit's small muted token), left-aligned with the app rows, below them, inside the safe area on a phone. In all 19 language files, in each language's voice ('respect' is the word to keep). The home page's no-copy rule (home-page-drive) stands for everything above the footer.
- `src/kit/network.ts` gains no entry: a link is not a request.

## The repository, ready for strangers

- **Every reference to the old name** goes to the new one: `src/kit/version.ts` (the commit link the site shows), `test/version.test.ts`, `test/browser/drawer.test.ts`, `skill/tinyoffice/SKILL.tpl.md` and `public/llms.txt` (via `npm run skill`), `docs/github-setup.md` (rewrite for the organization: the repo, who may push, the branch rule), `docs/transparency.md` (the repo is public now: the gates it lists as 'before the repo opens' are reread and either met or struck). The About drawer's threat-model link (`THREAT_MODEL` in drawer.ts) points at the public file and is not a 404 any more; r16-honest's in-app section stays.
- **package.json**: `"name": "tinylittleoffice"`, `"repository": {"type": "git", "url": "https://github.com/aboard-io/tinylittleoffice"}`, `"homepage": "https://tinylittleoffice.com"`, `"license": "MIT"`, `"bugs"`; `"private": true` stays (it is a site, not a package); the `packages/doc` package's own metadata the same.
- **LICENSE** stays MIT (Copyright (c) 2026 Paul Ford, as it is; say in the report if a second line naming Aboard is wanted). **README.md** is not this task's: r17-docs rewrites it whole at the round's end; here only the repository's name and the license line in it are corrected.
- **CONTRIBUTING.md**: short. Issues and pull requests welcome; the whole suite must pass (`npm test`, `npm run lint`, `npm run build`); the house rules a contributor must know (strings through t() in 19 languages, a finding is a failing test, native APIs first, no dependencies without a reason, Prettier). **SECURITY.md**: how to report privately (a GitHub private vulnerability report on the repo, enabled in the settings; no email), what is in scope (the site, tinier, the format), and the threat model's link. **CODE_OF_CONDUCT.md**: the Contributor Covenant 2.1, as is.
- **.github/**: `workflows/ci.yml` running on push and pull request: `npm ci`, `npx playwright install --with-deps chromium webkit`, then the same checks the deploy runs (types, lint, i18n, unit, browser, build, the smoke e2e), on Ubuntu, with the Noto fonts the measuring tests need installed (`fonts-noto-core fonts-noto-cjk fonts-noto-extra`) and whatever r17-plex adds; a job that fails on a budget tripwire fails the run. `dependabot.yml` for npm, weekly, grouped. Issue templates: a bug (with the link that shows it, redacted of anything private), a feature. A pull request template of three lines.
- **Repository settings** are mine to set by hand after this merges (branch protection on main, private vulnerability reporting, discussions off, the description and topics); the directive only prepares the files. Say in the report what settings the files assume.

## Proof

- `test/browser/home.test.ts`: the footer's two links with their addresses and `rel`, in English and in one other language.
- A node test that greps the tree (outside docs/directives and docs/reviews) for `ftrain/tinyoffice` and `/home/exedev` and finds nothing.
- `npm run skill` output unchanged except the repo address.
- The CI workflow is valid YAML and names every check the deploy runs (a test that parses it and compares against scripts/deploy.mjs's list).

## Not this

- No change to the deploy script or the Workers.
- No badges, no screenshots, no marketing in the README.
