# Transparency, and how to say what this is

Paul, 2026-10-09: the platform will be open-sourced; people concerned about security must be able to see for
themselves. This is the pre-launch list for that, and the words we use for everyone else. Each item below is a
piece of work with a check; the launch waits for the checks marked **gate**.

## 1. Verifiable, not claimed

The strongest fact is architectural: no server holds documents, so there is nothing to breach, subpoena or
leak. Everything here makes that checkable by a stranger.

1. **What leaves your browser** (gate). A page, `docs/network.md` and `/network` on the site, generated from
   the code: every request the site can make (map tiles and place search, the short-link service, the
   Bluesky and Wikipedia embeds, the icon set's lazy chunk, web pictures), when it happens (only after a tap,
   or never until a switch), what it carries, and the switch that stops it. A test in `test/network.test.ts`
   greps the built site for every host it can reach and fails if one is not on the page. The `connect-src`,
   `img-src` and `frame-src` of the CSP are generated from the same list.
2. **A threat model** (gate). `docs/threat-model.md`: what we protect against (the host learning a document;
   a short link's service reading one; a shared link altered in transit; a scam link or a tracking picture
   inside a document; a reader fetching a picture and revealing their IP), what we do not (someone you gave
   the link to passing it on; a compromised device or browser extension; a weak password), and why each
   design choice follows. Plain words, no reassurance.
3. **Reproducible, attested builds** (gate). `npm run build` from a tag gives byte-identical `dist/`;
   `scripts/verify-deploy.ts` fetches the live site, hashes every file and compares with the tag's build;
   the live site serves `/version.json` (commit, tag, build time, the CSP hashes) and a build attestation
   (GitHub's artifact attestation on the release). The CSP's script hashes are listed in the release notes.
4. **Dependencies you can read in one sitting.** `docs/dependencies.md` generated from package.json: each
   dependency, its exact version, its licence, the native API it beat and why (the standing rule), and the
   size it adds. Nothing vendored minified; the lockfile committed; `npm audit` in CI with no ignores.
5. **The crypto in the open** (gate). One short document each, with test vectors in the repo and the fact
   that it is WebCrypto with no library: `docs/crypto/password.md` (PBKDF2 → AES-GCM: parameters, the sealed
   payload form), `docs/crypto/signing.md` (Ed25519 with the P-256 fallback, the envelope's signed message,
   key storage under Saved), `docs/crypto/short-links.md` (AES-256-GCM, the key in the fragment, the owner
   capability, what tinier stores and for how long, what its logs hold: nothing).
6. **Self-hosting as a first-class path.** `npm run deploy` against anyone's Cloudflare account (the
   shortener included), a `docs/self-host.md` that takes thirty minutes, and the site's About naming the
   commit it runs so a self-hoster's copy is distinguishable.
7. **No telemetry, asserted.** No analytics, no error reporting, no fonts from a CDN, no fetch the person did
   not cause; a test asserts the built site contains no such host, and the threat model says so.
8. **Hygiene.** `SECURITY.md` (a disclosure address, a 72-hour acknowledgement, coordinated disclosure, no
   bounty yet, a thanks list); signed release tags; a changelog naming security-relevant changes;
   `LICENSE` (MIT); `CODE_OF_CONDUCT.md`; `CONTRIBUTING.md` that points at the standards (docs/editing.md,
   the kit's rules) so contributions keep them.
9. **Later:** an independent audit of the crypto and the shortener, published in full; a public test
   dashboard; a signed SBOM with each release.

## 2. The GitHub repository, set up for visibility

Done once, before the repo goes public (the visibility change itself is Paul's click):

- Name `tinylittleoffice` (or keep `tinyoffice` with the full name in the description); description "A free
  office suite where your document is the link. No account, nothing stored, the code open."; the website
  field; topics: `office-suite`, `privacy`, `local-first`, `no-backend`, `pwa`, `web-components`, `lit`,
  `cloudflare-workers`, `typescript`, `offline-first`, `url-as-document`, `markdown`.
- README that opens with the one-sentence and the paragraph below, then: what it is not (no server, no
  account, no telemetry), how to run it (`npm ci && npm run dev`), how it is built (the kernel, the kit,
  the apps), the standards it keeps, how to self-host, how to report a security issue, licence.
- Social preview image from the Office mark; the per-app share cards in `public/og/`.
- Discussions on (Announcements, Ideas, Q&A, Show and tell), Issues with three templates (bug, idea,
  security → the SECURITY.md address, not an issue), labels for the apps and the kit.
- Branch protection on `main`: CI green required (typecheck, strings, unit, DOM, build, the network test),
  signed commits recommended, no force-push; releases from tags with the attestation and the CSP hashes.
- `SECURITY.md`, `LICENSE`, `CODE_OF_CONDUCT.md`, `CONTRIBUTING.md`, `.github/` with the CI workflow, the
  release workflow (build, attest, publish `dist/` as the release's artifact), and the issue templates.
- The old tree's history is in the same repo (tagged `v0-before-rebuild`): keep it; the README says what
  it is.
- A `docs/` index page listing every document in the folder, so a reader starts from one place.

## 3. How to explain it

One sentence: **Tiny Little Office is a free office suite where your document is the link. There's no
account, nothing is stored anywhere, and whoever has the link has the document.**

A paragraph: *Open it and start typing. A letter, a spreadsheet, a presentation, a drawing, a to-do list, a
website. When you want to share it, copy the link. The whole document lives inside that link, so sending it
is like handing someone the paper itself. Nothing is uploaded, there's no sign-up, and we never see what you
write. If you want to keep working on it, keep the link; if you want it to stay private, don't share it. It
works on a phone, works offline once you keep a copy, and it's free, with the code open for anyone to read.*

The metaphor: the note passed in class. The note is the thing, not a reference to something kept elsewhere.
Lead with "nothing is stored", not "the URL encodes the document"; the technical readers find the second
behind the first.

For the About page, the App Store-style blurb and the share cards, use these words; for the threat model and
the network page, use none of them.
