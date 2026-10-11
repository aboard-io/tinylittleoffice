# The repository on GitHub

The source is public at **https://github.com/aboard-io/tinylittleoffice**, in the Aboard organization, under
the MIT License. It was renamed, moved to the organization and opened on 2026-10-11; GitHub redirects the old
address. This page is what the files in the repository cannot do: the settings set by hand, each a box to check,
with the strings exact, to paste. The files assume every one of them.

## Who may push

- **Paul** (an owner of the organization) is the repository's admin, and the only one who may tag a release.
- **Maintainers** are an organization team with the **Maintain** role on the repository; while there is no
  second maintainer the team is Paul alone.
- **Everyone else** works in a fork and opens a pull request; CI runs on it, and a maintainer merges it.
- [ ] Settings → Collaborators and teams: the maintainers' team with **Maintain**; nobody with **Admin** but
      the organization's owners.
- [ ] The organization's Settings → Actions: allow GitHub's own actions and those of verified creators
      (`actions/checkout`, `actions/setup-node`, `actions/attest-build-provenance`); require approval for
      workflows from first-time contributors' forks.

## The branch rule (Settings → Rules → Rulesets → New branch ruleset)

- [ ] Ruleset name: `main`; enforcement: **Active**; target: the default branch.
- [ ] **Restrict deletions**; **Block force pushes**.
- [ ] **Require a pull request before merging**: 0 approvals while Paul works alone (1 once there is a second
      maintainer); dismiss stale approvals; require conversation resolution.
- [ ] **Require status checks to pass**: the check `check` (the CI workflow's one job, `.github/workflows/ci.yml`:
      every check a deploy runs, then the lints, the advisories and the build made twice); check **Require
      branches to be up to date before merging**.
- [ ] **Require signed commits**: recommended, not required, until every contributor signs; revisit at launch.
- [ ] Bypass list: the organization's admins, for the deploy commits made from Paul's machine.

## The About box (the repository's front page, the gear beside About)

- [ ] Description: `A free office suite where your document is the link. No account; nothing kept unless you choose; the code open.`
- [ ] Website: `https://tinylittleoffice.com`
- [ ] Topics: `office-suite` `privacy` `local-first` `no-backend` `pwa` `web-components` `lit` `cloudflare-workers`
      `typescript` `url-as-document` `markdown`
- [ ] Include in the home page: **Releases** on, **Packages** off, **Deployments** off (the site deploys from
      Paul's machine, not from GitHub).

## General (Settings → General)

- [ ] Social preview: the Office mark's share card, `public/og.png` (drawn by `npm run icons`).
- [ ] Features: **Issues** on; **Discussions** off; **Wiki** off (the docs are in `docs/`); **Projects** off.
- [ ] Pull requests: allow **squash merging** and **merge commits**, not rebase merging; check **Always suggest
      updating pull request branches** and **Automatically delete head branches**.

## Issues (Issues → Labels)

The issue chooser (`.github/ISSUE_TEMPLATE/`) offers a bug and a feature, and sends a security problem to the
private report; there are no blank issues.

- [ ] `bug` (`#d73a4a`, "Something is wrong") and `feature` (`#a2eeef`, "Something it could do"): the templates
      apply these.
- [ ] `dependencies` (`#0366d6`): Dependabot applies it to its pull requests.
- [ ] One per app in the registry (`src/kit/apps.ts`), color `#c5def5`: `app: <id>` (`app: write`, `app: sheet`…).
- [ ] `kit` (`#fbca04`, "The shell, the bar, the editor and the rest of src/kit"), `kernel` (`#fbca04`,
      "src/doc: the model, TLO, the operations"), `tinier` (`#bfd4f2`, "The short-link service"),
      `docs` (`#0075ca`), `security` (`#b60205`, "Security-relevant, after disclosure").
- [ ] Delete the defaults that do not fit (`enhancement`, `question`, `wontfix`, `invalid`; `duplicate`,
      `good first issue` and `help wanted` may stay).

## Security (Settings → Code security)

- [ ] **Private vulnerability reporting** on: it is the only way SECURITY.md and the issue chooser give to report
      a hole (no email address).
- [ ] **Dependency graph** and **Dependabot alerts** on; **Dependabot security updates** on. Version updates are
      `.github/dependabot.yml`: npm, weekly, the site's dependencies in one pull request and the tools' in
      another. Such a pull request also needs `npm run docs:deps` run on its branch (docs/dependencies.md names
      each exact version), or CI fails it.
- [ ] **Secret scanning** and **push protection** on.
- [ ] Code scanning: not yet (CI runs `npm audit` with no ignores).
- [ ] **conduct@tinylittleoffice.com** exists and reaches Paul (CODE_OF_CONDUCT.md names it for reports).

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

A release is checked with `gh attestation verify tinylittleoffice-v1.0.0.tar.gz -R aboard-io/tinylittleoffice`
(built by that workflow, from that commit), and the live site against it with
`npm run verify-deploy -- https://tinylittleoffice.com/ v1.0.0`.
