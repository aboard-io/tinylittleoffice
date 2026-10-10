# TR-4: reproducible, attested builds, /version.json, verify-deploy

Read first: directive-r4-common.md, docs/transparency.md §1 item 3 (the brief), vite.config.ts and vite.api.config.ts, scripts/check-build.ts, scripts/headers.ts (the CSP's script hashes, if any), scripts/offline-files.ts (files.json), scripts/deploy.mjs, src/kit/drawer.ts (About), src/sw.ts or the service worker, package.json.

Build:
1. Reproducible: `npm run build` from the same commit gives byte-identical `dist/`: find and remove every source of difference (build timestamps, hash salts, absolute paths, object-key order, `Date.now()` in the build, files.json ordering). `scripts/reproducible.ts` builds twice into two folders and diffs their hashes, printing the first difference; `npm run build:verify`. CI (TR-3's ci.yml; add the step if the file exists, else leave a note in docs/transparency.md) runs it.
2. `/version.json` emitted into dist at build: `{ commit, tag (or ""), built (the commit's own date, not the clock), csp: { scripts: [hashes] } }`; the About dialog shows "Running commit abc1234" from it (fetched lazily) with a link to the commit on GitHub; `files.json` lists it for offline.
3. `scripts/verify-deploy.ts <url> [commit]`: builds that commit in a temp worktree (or uses the current dist when it matches), fetches every file files.json names from the live site, hashes them and compares; prints a table and exits non-zero on a difference; `npm run verify-deploy`. The site's own `/version.json` is read first so the script can say which commit it is checking.
4. `.github/workflows/release.yml`: on a tag `v*`: `npm ci`, build, `build:verify`, `actions/attest-build-provenance` on `dist/`, upload `dist/` as the release's artifact, and release notes that include the CSP script hashes and the commit. Signed tags are a note in docs/github-setup.md (TR-3 writes it; append if it exists, else create a short one).
5. docs/transparency.md: mark item 3 built with the date and the file names.

Tests: `scripts/reproducible.ts` run once in your worktree and its result in the report (two builds identical: yes/no, and what you fixed); a unit test for the version.json shape; the suite green. No new dependencies. PW_PORT=4440.
