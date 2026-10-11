export const meta = {
  name: 'round-seventeen-finish',
  description: "Round seventeen's tail: the three branches that built and reviewed green but could not merge while the checkout was dirty (American English, Plex, the short-link size) are merged one at a time; the chrome alignment branch (not ok only for a flaky property test) is reviewed and merged; then a small finish (the shortener's 404, the codec's zone, the cards in Plex) and the docs task build, review and merge",
  phases: [
    { title: 'Merge', detail: 'Sonnet, one at a time into main', model: 'sonnet' },
    { title: 'Build', detail: 'Opus: the finish, then the docs', model: 'opus' },
    { title: 'Review', detail: 'Sonnet reads the branch against its directive; Opus acts on the findings', model: 'sonnet' },
  ],
}

const S = '/home/exedev/.claude/projects/-home-exedev-workspace-tinyoffice/directives'
const FIX_SCHEMA = { type: 'object', properties: { branch: { type: 'string' }, commit: { type: 'string' }, worktree: { type: 'string' }, done: { type: 'string' }, tests: { type: 'string' }, kitFiles: { type: 'string' }, left: { type: 'string' }, ok: { type: 'boolean' } }, required: ['branch', 'commit', 'worktree', 'done', 'tests', 'ok'] }
const REVIEW_SCHEMA = { type: 'object', properties: { ready: { type: 'boolean' }, findings: { type: 'string' } }, required: ['ready', 'findings'] }
const reviewPrompt = (r, directive) => `Review a finished branch of Tiny Little Office before it merges. The branch is ${r.branch} at ${r.commit}, in the worktree ${r.worktree}; its directive is ${directive}, with ${S}/directive-r17-common.md and the contract ${S}/directive-r4-common.md. Read them in full, then \`git -C ${r.worktree} diff main...${r.branch}\` (and the files it touches where the diff is not enough). Do not run tests (the merge does) and change nothing. Judge only: (1) does the branch do what the directive asks, no less and nothing beyond it; (2) is each behaviour it claims covered by a test that would fail without it; (3) does it break a standing rule (a human never edits markup; strings through t(); no compat shim; native APIs first; one mechanism per idea; nothing committed that should not be, such as node_modules or a generated file edited by hand); (4) is the house voice kept in headers and the commit. Return ready=true when nothing needs changing before the merge, else ready=false with findings: a numbered list, each one line naming the file and what to change, concrete enough for the builder to act on without rereading everything. Taste is not a finding; a missing test, a wrong behaviour or a rule broken is.`
const fixPrompt = (r, directive, findings) => `You are finishing a branch of Tiny Little Office that a review sent back. The branch is ${r.branch} in the worktree ${r.worktree} (work ONLY there; never push or touch another checkout; the node_modules link is never committed). Its directive is ${directive}, with ${S}/directive-r17-common.md; the contract is ${S}/directive-r4-common.md. The review's findings, each to act on or to answer in your report with a reason the directive supports:
${findings}
One test command at a time, never in the background. Commit on the branch in the house voice ending in "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>". Return the structured report (ok=true only when every check is green).`
const MERGE_SCHEMA = { type: 'object', properties: { merged: { type: 'boolean' }, commit: { type: 'string' }, tests: { type: 'string' }, notes: { type: 'string' } }, required: ['merged', 'tests', 'notes'] }

const buildPrompt = (k) => `You are building one item of round seventeen for Tiny Little Office's rebuilt tree: ${k.what}. The design is in your directive ${k.directive}: read it in full first, then ${S}/directive-r17-common.md and ${S}/directive-r4-common.md (the contract), then every file the directive names, in full.
1. Create your worktree from the CURRENT main: \`git -C /home/exedev/workspace/tinylittleoffice worktree add -b main-${k.id} /home/exedev/workspace/tinylittleoffice-${k.id} main\` (if the path exists, use it), then \`ln -s /home/exedev/workspace/tinylittleoffice/node_modules /home/exedev/workspace/tinylittleoffice-${k.id}/node_modules\` (skip if present). NEVER commit that link: node_modules must never appear in \`git status\`; if it does, \`git rm --cached node_modules\` before committing. Work ONLY in that worktree. Never push, deploy, or touch /home/exedev/workspace/tinylittleoffice or another worktree.
2. This directive is your whole task: a message relayed to you mid-task about something else (a deck, a link, a note on another app) is not yours to do; put it in left and finish this. Build it as the directive says: reproduce with a failing test first; one test command at a time, never in the background (a 2-core box shared with another agent); WIP commits; final commit(s) on main-${k.id} in the house voice ending in "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>". Leave the worktree in place.
Return the structured report the contract asks for (ok=true only when every check is green).`

const mergePrompt = (id, r) => `Merge the finished branch into main and leave main green. The main checkout is /home/exedev/workspace/tinylittleoffice (branch main: the rebuilt tree became main on 2026-10-11); the branch is ${r.branch} at ${r.commit} (worktree ${r.worktree}). Other merges run one at a time through this same checkout. Steps:
0. \`git -C ${r.worktree} ls-files node_modules\` must print nothing; if it prints a path, in the worktree run \`git rm --cached node_modules && git commit -m "Drop the node_modules link"\` first. Never let a merge replace main's real node_modules directory.
1. cd /home/exedev/workspace/tinylittleoffice && git status --short must be empty and .git/index.lock absent (else wait 60 s and retry up to fifteen times, then stop and report). git merge --no-edit ${r.branch}.
2. Resolve conflicts keeping both sides' intent: src/i18n/en.ts keeps every section with no duplicate key (TS1117 = duplicate: delete the later copy); public/llms.txt and skill/tinyoffice/SKILL.md are regenerated with \`npm run skill\`; generated docs (docs/network.md, docs/dependencies.md) with their scripts; never discard either side's code.
3. npx tsc --noEmit -p .; npm run i18n:check; npx vitest run; npm run build — one at a time, never in the background. A browser test file that times out under load is rerun alone before it counts as failing. A failure caused by the merge: fix minimally and commit. A failure inside the branch's own work: fix if small, else report merged=false with the failure text and do not push.
4. When all green: git push origin main; then rm -f ${r.worktree}/node_modules and git -C /home/exedev/workspace/tinylittleoffice worktree remove ${r.worktree} and git -C /home/exedev/workspace/tinylittleoffice branch -D ${r.branch}.
Return merged, the commit hash on main, the exact test/build results, and notes.`

// Two builders at a time (a 2-core box); a task with `after` starts only once those tasks are merged, so it builds on their code.

const mergeOf = async (id, r) => { log(`merging ${id}`); return agent(mergePrompt(id, r), { label: `merge:${id}`, phase: 'Merge', model: 'sonnet', schema: MERGE_SCHEMA }) }
const reviewThenMerge = async (id, directive, r) => {
  log(`reviewing ${id}`)
  const review = await agent(reviewPrompt(r, directive), { label: `review:${id}`, phase: 'Review', model: 'sonnet', schema: REVIEW_SCHEMA })
  let fixed = null
  if (review && !review.ready) {
    log(`fixing ${id}`)
    fixed = await agent(fixPrompt(r, directive, review.findings), { label: `fix:${id}`, phase: 'Review', model: 'opus', schema: FIX_SCHEMA })
    if (!(fixed && fixed.ok)) return { task: id, review, fix: fixed, merge: null }
    r = { ...r, ...fixed }
  }
  return { task: id, review, fix: fixed, merge: await mergeOf(id, r) }
}
const buildAll = async (k) => {
  log(`building ${k.id}`)
  const r = await agent(buildPrompt(k), { label: `build:${k.id}`, phase: 'Build', model: 'opus', schema: FIX_SCHEMA })
  if (!(r && r.ok)) return { task: k.id, build: r, merge: null }
  return { build: r, ...(await reviewThenMerge(k.id, k.directive, r)) }
}

const out = {}
const W = '/home/exedev/workspace/tinylittleoffice-'
for (const [id, commit] of [['r17-american', 'f8d7b11'], ['r17-plex', 'd7bc311'], ['r17-short-size', '940577f']]) {
  out[id] = await mergeOf(id, { branch: 'main-' + id, commit, worktree: W + id })
}
out['r17-chrome-align'] = await reviewThenMerge('r17-chrome-align', `${S}/directive-r17-chrome-align.md`, { branch: 'main-r17-chrome-align', commit: '3cc23a1', worktree: W + 'r17-chrome-align' })
out['r17-finish'] = await buildAll({ id: 'r17-finish', directive: `${S}/directive-r17-finish.md`, what: "three small things round seventeen left: the shortener answers 404 and never 405 to anything but making and reading a link (Paul: there should be a 404), the codec's dictionary primes America/New_York instead of Europe/London with the byte-stability fixtures regenerated, and the share cards and og.png are drawn in IBM Plex like the rest of the site (Paul: we use Plex everywhere)" })
out['r17-docs'] = await buildAll({ id: 'r17-docs', directive: `${S}/directive-r17-docs.md`, what: "the README rewritten whole for a stranger, the docs indexed and cleaned with history moved aside, and the truth about saving said everywhere: Private is the default, Saved is a choice on this device, a short link is the one thing a server holds (Paul: the README needs a full rewrite; clean up docs; saying we never save anything is wrong, say that's the default)" })
return out
