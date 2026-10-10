# Setting up the repository on GitHub

What the files cannot do: the settings Paul applies by hand in GitHub before the repository goes public
(docs/transparency.md §2). Each line is a box to tick; the strings are exact, to paste. The visibility
change itself is last, and is Paul's click.

## Before anything: two addresses

- [ ] **security@tinylittleoffice.com** exists and reaches Paul (SECURITY.md, the issue chooser).
- [ ] **conduct@tinylittleoffice.com** exists and reaches Paul (CODE_OF_CONDUCT.md).

## The name and the About box (the repository's front page, the gear beside About)

- [ ] Name: `tinylittleoffice`, or keep `tinyoffice`. If renamed, change `ftrain/tinyoffice` in
      `.github/ISSUE_TEMPLATE/config.yml` (GitHub redirects the old address, but the links should be true).
- [ ] Description: `A free office suite where your document is the link. No account, nothing stored, the code open.`
- [ ] Website: `https://tinylittleoffice.com`
- [ ] Topics: `office-suite` `privacy` `local-first` `no-backend` `pwa` `web-components` `lit`
      `cloudflare-workers` `typescript` `offline-first` `url-as-document` `markdown`
- [ ] Include in the home page: **Releases** on, **Packages** off, **Deployments** off (the site deploys
      from this machine, not from GitHub).

## General (Settings → General)

- [ ] Social preview: the Office mark's share card, `public/og.png` (drawn by `npm run icons`).
- [ ] Features: **Issues** on; **Discussions** on; **Wiki** off (the docs are in `docs/`); **Projects** off.
- [ ] Pull requests: allow **squash merging** and **merge commits**, not rebase merging; tick **Always suggest
      updating pull request branches** and **Automatically delete head branches**.

## Discussions (the Discussions tab → the pencil beside Categories)

- [ ] `Announcements` (announcement format: only maintainers post)
- [ ] `Ideas` (open-ended discussion)
- [ ] `Q&A` (question and answer)
- [ ] `Show and tell` (open-ended discussion)
- [ ] Delete the default `General` and `Polls` if GitHub made them.

## Labels (Issues → Labels)

- [ ] `bug` (`#d73a4a`, "Something is wrong") and `idea` (`#a2eeef`, "Something it could do"): the issue
      templates apply these.
- [ ] One per app, colour `#c5def5`: `app: write`, `app: sheet`, `app: deck`, `app: outline`, `app: todo`,
      `app: board`, `app: calc`, `app: cal`, `app: draw`, `app: anim`, `app: diagram`, `app: trip`,
      `app: site`.
- [ ] `kit` (`#fbca04`, "The shell, the bar, the editor and the rest of src/kit"), `kernel` (`#fbca04`,
      "src/doc: the model, TLO, the operations"), `tinier` and `media` (`#bfd4f2`, "A Worker"),
      `docs` (`#0075ca`), `security` (`#b60205`, "Security-relevant, after disclosure").
- [ ] Delete the defaults that do not fit (`enhancement`, `question`, `wontfix`, `invalid`, `duplicate`,
      `good first issue` and `help wanted` may stay).

## Security (Settings → Code security, and Security → Advisories)

- [ ] **Private vulnerability reporting** on (a second door to SECURITY.md's address).
- [ ] **Dependency graph** and **Dependabot alerts** on; Dependabot security updates on; version updates
      off (a dependency changes only with its line in `scripts/dependencies.json`).
- [ ] **Secret scanning** and **push protection** on.
- [ ] Code scanning: not yet (CI runs `npm audit` with no ignores).

## The main branch (Settings → Rules → Rulesets → New branch ruleset)

- [ ] Ruleset name: `main`; enforcement: **Active**; target: the default branch.
- [ ] **Restrict deletions**; **Block force pushes**.
- [ ] **Require a pull request before merging**: 0 approvals while Paul works alone (1 once there is a second
      maintainer); dismiss stale approvals; require conversation resolution.
- [ ] **Require status checks to pass**: the check `check` (the CI workflow's one job: types, strings, the
      generated pages, advisories, unit, browser, build; the network test is in the unit tests when it lands);
      tick **Require branches to be up to date before merging**.
- [ ] **Require signed commits**: recommended, not required, until every contributor signs (transparency.md
      §2); revisit at launch.
- [ ] Bypass list: Paul, for the deploy commits from this machine.

## Releases

A release is a tag `v*`: `.github/workflows/release.yml` builds it, builds it twice more to show the bytes are
the same, attests `dist/` and an archive of it, and publishes the archive with notes naming the commit and the
CSP's script hashes (docs/transparency.md §1 item 3).

- [ ] Tags are signed, so anyone can see who made a release as well as what it is:
      `git tag -s v1.0.0 -m "Tiny Little Office v1.0.0" && git push origin v1.0.0`. `-s` signs with a GPG key,
      or with an SSH key under `git config gpg.format ssh` and `user.signingkey`; add the same key to the
      GitHub account as a **signing key**, so the tag shows as Verified. Anyone checks one with `git tag -v`.
- [ ] A tag ruleset (Settings → Rules → Rulesets → New tag ruleset): target `refs/tags/v*`; **Restrict creations**,
      **Restrict updates**, **Restrict deletions**, **Block force pushes**; bypass list: Paul, so only he makes
      a release.
- [ ] Settings → Actions → General → Workflow permissions: leave **Read repository contents** as the default;
      the release workflow asks for its own (`contents: write`, `id-token: write`, `attestations: write`).

A release is checked with `gh attestation verify tinylittleoffice-v1.0.0.tar.gz -R ftrain/tinyoffice` (built
by that workflow, from that commit), and the live site against it with
`npm run verify-deploy -- https://tinylittleoffice.com/ v1.0.0`.

## Last

- [ ] Settings → General → Danger Zone → **Change visibility → Public**.
