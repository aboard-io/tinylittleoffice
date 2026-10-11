# Transparency, and how to say what this is

Paul, 2026-10-09: the platform will be open-sourced; people concerned about security must be able to see for
themselves. This is the pre-launch list for that, and the words we use for everyone else. Each item below is a
piece of work with a check; the launch waits for the checks marked **gate**.

**Reread on 2026-10-11, the day the repository opened** at https://github.com/aboard-io/tinylittleoffice: every
gate below (items 1, 2, 3 and 5) is built, and so is everything §2 asked for before the repository went public,
but for what §2 now strikes. What is left is marked *Not yet*.

## 1. Verifiable, not claimed

The strongest fact is architectural: no server holds documents, so there is nothing to breach, subpoena or
leak. Everything here makes that checkable by a stranger.

1. **What leaves your browser** (gate). A page, `docs/network.md` and `/network` on the site, generated from
   the code: every request the site can make (map tiles and place search, the short-link service, the icon
   set's lazy chunk, a share to a service), when it happens (only after a tap, or while a map is shown), what
   it carries, and what stops it. A test in `test/network.test.ts` greps the site for every host it can reach
   and fails if one is not on the page. The `connect-src` and `img-src` of the CSP are generated from the same
   list.
   *Pictures and embeds removed, 2026-10-11 (round seventeen).* A document fetches nothing from any other
   site: there are no pictures from the web, no picture proxy and no embeds (the code is kept on the branch
   `web-pictures-and-embeds`). The CSP's `img-src` is the site, `data:`, `blob:` and the map's tiles (no
   `https:` at large), and it has no `frame-src` or `media-src` of another site's, held by `test/csp.test.ts`.
   *Built, 2026-10-10.* `src/kit/network.ts` is the one list of every host the site can reach (what, when,
   what it carries, what stops it, the module, the CSP directive); every module that asks the web takes its
   host from it. `scripts/network-doc.ts` (`npm run docs:network`, run first by `npm run build`) writes
   `docs/network.md` and `public/network.html` (`/network`, plain HTML, no script, linked from About and the
   README). `scripts/headers.ts` writes `connect-src` and `img-src` from the list (`test/csp.test.ts`: every
   host in its directive and nothing else; the map's tiles left `connect-src`, which nothing used). Builds are
   not run in tests, so `test/network.test.ts` reads the source (`src/`, `tinier/`) instead of the built site: every
   host must be on the list (or localhost, or an XML namespace; tests exempt, said why), `src/` names hosts only through the list, and the committed page must be
   what the list says.
2. **A threat model** (gate). `docs/threat-model.md`: what we protect against (the host learning a document;
   a short link's service reading one; a shared link altered in transit; a scam link or a tracking picture
   inside a document), what we do not (someone you gave
   the link to passing it on; a compromised device or browser extension; a weak password), and why each
   design choice follows. Plain words, no reassurance.
   *Built, 2026-10-10.* `docs/threat-model.md`: what is protected against and what is not (a lost phone with
   Saved on, the browser's history and sync, a screenshot and everything the link passes through added to
   the list), a table of each design choice and its threat, what the Cloudflare host can see (the static
   files' requests, the shortener's ciphertext rows and D1's own history), and "If you
   find a hole" pointing at `SECURITY.md` (item 8). It says plainly that whoever serves the code could read
   the fragment, and that item 3 is the answer, not yet built. About links it. *2026-10-11:* About says the
   list in the page's language itself, and links the whole document in the public repository, said to be in English.
3. **Reproducible, attested builds** (gate). `npm run build` from a tag gives byte-identical `dist/`;
   `scripts/verify-deploy.ts` fetches the live site, hashes every file and compares with the tag's build;
   the live site serves `/version.json` (commit, tag, build time, the CSP hashes) and a build attestation
   (GitHub's artifact attestation on the release). The CSP's script hashes are listed in the release notes.
   *Built, 2026-10-10.* Two builds of one commit are the same bytes: `scripts/reproducible.ts`
   (`npm run build:verify`) builds it twice in fresh checkouts at different paths and depths
   (`scripts/builds.ts`), hashes every file and prints the first difference, and compares this checkout's
   `dist/` too when it is that commit's build. The one source of difference was the API build
   (`vite.api.config.ts`): a library build keeps the bundler's `//#region <path>` notes, which named where
   node_modules was on the building machine; they are off. The build writes `dist/version.json`
   (`scripts/version.ts`: the commit, its tag or "", the commit's own date in UTC, the policy's script
   hashes; the shape is `src/kit/version.ts`), checked by `scripts/check-build.ts`; About reads it when it opens and says "Running commit abc1234", a link to the
   commit on GitHub (`github.com` is on the list, `src/kit/network.ts` `source`). `scripts/verify-deploy.ts`
   (`npm run verify-deploy -- <url> [commit]`) reads the site's `/version.json`, builds that commit in a fresh
   checkout (or uses `dist/` when it is that build), fetches every file but `_headers`, and prints a table;
   exit 1 on any difference. `.github/workflows/release.yml`, on a tag `v*`: `npm ci`, build,
   `build:verify`, `check-build`, a byte-stable archive, `actions/attest-build-provenance` over `dist/**` and
   the archive, and a release with the archive and notes (`scripts/release-notes.ts`: the commit, the tag,
   the script hashes, how to check). Signed tags: `docs/github-setup.md`. CI (`.github/workflows/ci.yml`) runs
   `npm run build:verify` after its build.
4. **Dependencies you can read in one sitting.** `docs/dependencies.md` generated from package.json: each
   dependency, its exact version, its licence, the native API it beat and why (the standing rule), and the
   size it adds. Nothing vendored minified; the lockfile committed; `npm audit` in CI with no ignores.
   *Built, 2026-10-10.* `npm run docs:deps` (`scripts/dependencies.ts`) writes it from package.json, the
   lockfile and `scripts/dependencies.json`, the one-line reasons it refuses to run without; the sizes come
   from a build (`-- --sizes`), shared among each chunk's modules; `test/dependencies.test.ts` and CI hold
   the page current; CI runs `npm audit` with no ignores.
5. **The crypto in the open** (gate). One short document each, with test vectors in the repo and the fact
   that it is WebCrypto with no library: `docs/crypto/password.md` (PBKDF2 → AES-GCM: parameters, the sealed
   payload form), `docs/crypto/short-links.md` (AES-256-GCM, the key in the fragment, the owner
   capability, what tinier stores and for how long, what its logs hold: nothing).
   *Built, 2026-10-10.* The two documents, with the byte layouts; the vectors in `test/vectors/password.json`
   and `short-links.json`, checked by
   `test/crypto-vectors.test.ts` against the kit and against WebCrypto called by hand. `sealAt` (crypt.ts)
   and `sealShortAt` (short.ts) take a fixed IV for the vectors; a test fails if the site calls either. "Logs
   nothing" for tinier is held by `test/tinier.test.ts`.
6. **Self-hosting as a first-class path.** `npm run deploy` against anyone's Cloudflare account (the
   shortener included), a `docs/self-host.md` that takes thirty minutes, and the site's About naming the
   commit it runs so a self-hoster's copy is distinguishable.
   *Built, 2026-10-10:* `docs/self-host.md` (the two Workers, D1, the names to change, the policy's
   `connect-src`, `npm run deploy`). The About dialog's commit waits for `/version.json` (item 3).
7. **No telemetry, asserted.** No analytics, no error reporting, no fonts from a CDN, no fetch the person did
   not cause; a test asserts the built site contains no such host, and the threat model says so.
   *Built, 2026-10-10 (the threat model's sentence waits for item 2).* `test/network.test.ts` fails on any
   analytics, error-reporting, font-CDN, tag-manager or session-recording host (a deny-list of 22) anywhere in
   `src/`, `tinier/`, `public/`, `index.html`, `vite.config.ts` and `wrangler.jsonc`; About says,
   in one sentence, that the site asks the web for nothing you did not cause, and links /network.
8. **Hygiene.** `SECURITY.md` (a disclosure address, a 72-hour acknowledgement, coordinated disclosure, no
   bounty yet, a thanks list); signed release tags; a changelog naming security-relevant changes;
   `LICENSE` (MIT); `CODE_OF_CONDUCT.md`; `CONTRIBUTING.md` that points at the standards (docs/editing.md,
   the kit's rules) so contributions keep them.
   *Built, 2026-10-10:* `SECURITY.md`, `LICENSE`, `CODE_OF_CONDUCT.md`, `CONTRIBUTING.md`. *2026-10-11:* a hole
   is reported through GitHub's private vulnerability reporting, not to an address; the code of conduct is the
   Contributor Covenant 2.1 as written. *Not yet:* signed tags and the changelog wait for the first release.
9. **Later:** an independent audit of the crypto and the shortener, published in full; a public test
   dashboard; a signed SBOM with each release.

## 2. The GitHub repository, set up for visibility

Done once, before the repo went public; Paul renamed it, moved it to the aboard-io organization and opened it on
2026-10-11. The settings set by hand are docs/github-setup.md.

- Name `tinylittleoffice` (*met*: aboard-io/tinylittleoffice); description "A free
  office suite where your document is the link. No account, nothing stored, the code open."; the website
  field; topics: `office-suite`, `privacy`, `local-first`, `no-backend`, `pwa`, `web-components`, `lit`,
  `cloudflare-workers`, `typescript`, `url-as-document`, `markdown`.
- README that opens with the one-sentence and the paragraph below, then: what it is not (no server, no
  account, no telemetry), how to run it (`npm ci && npm run dev`), how it is built (the kernel, the kit,
  the apps), the standards it keeps, how to self-host, how to report a security issue, licence.
- Social preview image from the Office mark; the per-app share cards in `public/og/`.
- ~~Discussions on~~ (*struck*, 2026-10-11: Discussions are off; issues are the one place). Issues with two
  templates (a bug, with the link that shows it, redacted of anything private; a feature) and the chooser's
  security link to the private vulnerability report; labels for the apps and the kit.
- Branch protection on `main`: CI green required (every check a deploy runs: types, strings, unit, browser,
  build with its budgets, the smoke run in Chromium and WebKit; then the lints, `npm audit` and the build made
  twice), signed commits recommended, no force-push; releases from tags with the attestation and the CSP hashes.
  Dependabot asks for npm updates weekly, grouped (`.github/dependabot.yml`).
- `SECURITY.md`, `LICENSE`, `CODE_OF_CONDUCT.md`, `CONTRIBUTING.md`, `.github/` with the CI workflow, the
  release workflow (build, attest, publish `dist/` as the release's artifact), and the issue templates.
- The old tree's history is in the same repo (tagged `v0-before-rebuild`): keep it; the README says what
  it is.
- A `docs/` index page listing every document in the folder, so a reader starts from one place.

*Built, 2026-10-10:* the README (the sentence and the paragraph, then the rest in this order), `docs/README.md`
(the index, held to the folder by `test/docs-index.test.ts`), `SECURITY.md`, `LICENSE`, `CODE_OF_CONDUCT.md`,
`CONTRIBUTING.md`, and `.github/`: the CI workflow, the bug and idea templates, the chooser's Security link to
SECURITY.md (no security template), the pull request template. The settings (description, topics,
Discussions, labels, the ruleset on `main`) are a checklist in `docs/github-setup.md`. The release workflow
followed (§1 item 3). *2026-10-11:* CONTRIBUTING made short (the suite, the house rules), the feature template
in the idea's place, the pull request template three lines, CI running every check the deploy runs
(`test/repository.test.ts` compares them), Dependabot, and the package's metadata naming the repository.

## 3. How to explain it

One sentence: **Tiny Little Office is a free office suite where your document is the link. There's no
account, nothing is stored anywhere, and whoever has the link has the document.**

A paragraph: *Open it and start typing. A letter, a spreadsheet, a presentation, a drawing, a calendar.
When you want to share it, copy the link. The whole document lives inside that link, so sending it
is like handing someone the paper itself. Nothing is uploaded, there's no sign-up, and we never see what you
write. If you want to keep working on it, keep the link; if you want it to stay private, don't share it. It
works on a phone, and it's free, with the code open for anyone to read.*

The metaphor: the note passed in class. The note is the thing, not a reference to something kept elsewhere.
Lead with "nothing is stored", not "the URL encodes the document"; the technical readers find the second
behind the first.

For the About page, the App Store-style blurb and the share cards, use these words; for the threat model and
the network page, use none of them.
