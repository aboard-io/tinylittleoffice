#!/usr/bin/env bash
# Makes test/links/corpus.json: the links each release of the site made, frozen, which every later release must open
# as the one that made them did (test/links.test.ts). For each tag (the releases where the link's code changed, and
# any named), a worktree of the tag runs test/links/make.ts and the links are merged: one entry a distinct link, with
# the tags that made it. Run it to add a release's links; an entry already there is never changed or removed. A sealed
# link has a fresh salt and nonce each run, so a run adds a release's sealed links again: harmless, and more to open.
#
#   scripts/link-corpus.sh                 the v1 releases where the link changed, and HEAD
#   scripts/link-corpus.sh v2.0.0          a release's links added to those there
set -euo pipefail
root=$(cd "$(dirname "$0")/.." && pwd)
tags=("$@")
[ ${#tags[@]} -eq 0 ] && tags=(v1.0.0 v1.1.0 v1.2.0 v1.2.32 v1.2.36 v1.2.37 v1.2.38 HEAD)
work=$(mktemp -d)
trap 'for d in "$work"/tree-*; do git -C "$root" worktree remove --force "$d" 2>/dev/null || true; done; rm -rf "$work"' EXIT
for tag in "${tags[@]}"; do
  sha=$(git -C "$root" rev-parse --short "$tag^{commit}")
  name=$tag; [ "$tag" = HEAD ] && name=$(git -C "$root" describe --tags HEAD)
  tree="$work/tree-$sha"
  git -C "$root" worktree add --detach --quiet "$tree" "$sha"
  ln -s "$root/node_modules" "$tree/node_modules"
  sed "s|'\.\./\.\./src/|'../src/|g" "$root/test/links/make.ts" >"$tree/test/zz-make-links.test.ts"
  echo "== $name ($sha)"
  (cd "$tree" && LINK_CORPUS_OUT="$work/$sha.json" LINK_CORPUS_TAG="$name" npx vitest run --project unit test/zz-make-links.test.ts --reporter=dot >/dev/null)
  git -C "$root" worktree remove --force "$tree"
done
node --input-type=module - "$root/test/links/corpus.json" "$work"/*.json <<'JS'
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
const [out, ...runs] = process.argv.slice(2);
const had = existsSync(out) ? JSON.parse(readFileSync(out, 'utf8')) : { entries: [] };
const byLink = new Map(had.entries.map((e) => [e.link, e]));
for (const f of runs) {
  const { tag, entries } = JSON.parse(readFileSync(f, 'utf8'));
  for (const e of entries) {
    // v1.0.0 sealed under a password the person chose, and was never public: f228ad07 (v1.1.0) made the app choose every
    // password, under another key derivation, before anyone could seal a link (Paul, 2026-11-27).
    if (tag === 'v1.0.0' && e.kind === 'sealed') continue;
    const at = byLink.get(e.link);
    if (at) { if (!at.made.includes(tag)) at.made.push(tag); continue; }
    byLink.set(e.link, { ...e, made: [tag] });
  }
}
const entries = [...byLink.values()];
writeFileSync(out, JSON.stringify({ about: 'Links the releases of tinylittleoffice.com made (scripts/link-corpus.sh); frozen: test/links.test.ts', entries }, null, 1) + '\n');
console.log(`${entries.length} links`);
JS
