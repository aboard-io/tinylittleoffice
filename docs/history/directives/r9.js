export const meta = {
  name: 'round-nine',
  description: "Round nine, Paul's 2026-10-10 answer to getting smarter about internals: the bar glides with the keyboard; every nav function in one command registry with the shortcuts, the standard's tables, the skill and a command palette drawn from it and graph lints over it; random walks over the chrome's state machine; the format's grammar written once and everything fuzzed from it; translations measured by font metrics and a glossary lint; the code's rules held by lints; the production build kept minimal. Opus builds, Sonnet reviews, Opus fixes, Sonnet merges",
  phases: [
    { title: 'Build', detail: 'Opus, two at a time', model: 'opus' },
    { title: 'Review', detail: 'Sonnet reads the branch against its directive; Opus acts on the findings', model: 'sonnet' },
    { title: 'Merge', detail: 'one at a time into next, checks green, push', model: 'sonnet' },
  ],
}

const S = '/home/exedev/.claude/projects/-home-exedev-workspace-tinyoffice/directives'
const TASKS = [
  { id: 'r9-chrome', directive: `${S}/directive-r9-chrome.md`, what: "the bottom bar glides with the keyboard (a brisk transition of the column's height, the bar fading while it moves, no glide under reduced motion); Share and Download leave the header for the drawer so the title breathes; the hamburger slides to the very corner and turns translucent while a box has focus; the drawer's This document section is two full-width rows under a heading, and the drawer's dialog draws no focus ring and no gap at its edge" },
  { id: 'r9-commands', directive: `${S}/directive-r9-commands.md`, after: ['r9-chrome'], what: 'every nav function of the kit and the thirteen apps declared once in a command registry; bars, menus, context bars and key handling drawn from it; the shortcuts dialog, docs/editing.md\'s tables and the skill generated; graph lints (keys bound twice, unreachable buttons, labels not in en.ts, commands no test invokes); on a phone the context commands take the bottom bar\'s row with Cut, Copy and Paste so the native callout never covers them; on a phone the bar appears with the focus and goes with it, the document-level commands also in the drawer; a command palette on Mod+K; the chunks no larger' },
  { id: 'r9-grammar', directive: `${S}/directive-r9-grammar.md`, what: 'TLO\'s grammar written down once with a generator from it; properties over parse/write, every op and its inverse, paste, pages, the formula engine and the codec; the compression dictionary trained and measured, changed only on the numbers' },
  { id: 'r9-lints', directive: `${S}/directive-r9-lints.md`, after: ['r9-commands'], what: 'the rules of the code held by code: bare words in templates, the module graph (no cycles, apps never import apps), chunk budgets, no DOM in the model, generated outputs fresh; npm run lint and the build runs it' },
  { id: 'r9-walks', directive: `${S}/directive-r9-walks.md`, after: ['r9-commands'], what: 'fast-check random walks over the chrome\'s state machine (focus, Escape, one modal, no window scroll, the link round-trips, the bar one row, nothing overflows) at phone and desktop, seeded and replayable, per app family' },
  { id: 'r9-i18n', directive: `${S}/directive-r9-i18n.md`, after: ['r9-commands'], what: 'translations measured: each nav label against its slot by font metrics per language, a glossary-drift lint, a translation memory in the extractor, same-as-English decided per key' },
]
const FIX_SCHEMA = { type: 'object', properties: { branch: { type: 'string' }, commit: { type: 'string' }, worktree: { type: 'string' }, done: { type: 'string' }, tests: { type: 'string' }, kitFiles: { type: 'string' }, left: { type: 'string' }, ok: { type: 'boolean' } }, required: ['branch', 'commit', 'worktree', 'done', 'tests', 'ok'] }
const REVIEW_SCHEMA = { type: 'object', properties: { ready: { type: 'boolean' }, findings: { type: 'string' } }, required: ['ready', 'findings'] }
const reviewPrompt = (r, directive) => `Review a finished branch of Tiny Little Office before it merges. The branch is ${r.branch} at ${r.commit}, in the worktree ${r.worktree}; its directive is ${directive}, with ${S}/directive-r9-common.md and the contract ${S}/directive-r4-common.md. Read them in full, then \`git -C ${r.worktree} diff next...${r.branch}\` (and the files it touches where the diff is not enough). Do not run tests (the merge does) and change nothing. Judge only: (1) does the branch do what the directive asks, no less and nothing beyond it; (2) is each behaviour it claims covered by a test that would fail without it; (3) does it break a standing rule (a human never edits markup; strings through t(); no compat shim; native APIs first; one mechanism per idea; nothing committed that should not be, such as node_modules or a generated file edited by hand); (4) is the house voice kept in headers and the commit. Return ready=true when nothing needs changing before the merge, else ready=false with findings: a numbered list, each one line naming the file and what to change, concrete enough for the builder to act on without rereading everything. Taste is not a finding; a missing test, a wrong behaviour or a rule broken is.`
const fixPrompt = (r, directive, findings) => `You are finishing a branch of Tiny Little Office that a review sent back. The branch is ${r.branch} in the worktree ${r.worktree} (work ONLY there; never push or touch another checkout; the node_modules link is never committed). Its directive is ${directive}, with ${S}/directive-r9-common.md; the contract is ${S}/directive-r4-common.md. The review's findings, each to act on or to answer in your report with a reason the directive supports:
${findings}
One test command at a time, never in the background. Commit on the branch in the house voice ending in "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>". Return the structured report (ok=true only when every check is green).`
const MERGE_SCHEMA = { type: 'object', properties: { merged: { type: 'boolean' }, commit: { type: 'string' }, tests: { type: 'string' }, notes: { type: 'string' } }, required: ['merged', 'tests', 'notes'] }

const buildPrompt = (k) => `You are building one item of round nine for Tiny Little Office's rebuilt tree: ${k.what}. The design is in your directive ${k.directive}: read it in full first, then ${S}/directive-r9-common.md and ${S}/directive-r4-common.md (the contract), then every file the directive names, in full.
1. Create your worktree from the CURRENT next: \`git -C /home/exedev/workspace/tinyoffice-next worktree add -b next-${k.id} /home/exedev/workspace/tinyoffice-next-${k.id} next\` (if the path exists, use it), then \`ln -s /home/exedev/workspace/tinyoffice-next/node_modules /home/exedev/workspace/tinyoffice-next-${k.id}/node_modules\` (skip if present). NEVER commit that link: node_modules must never appear in \`git status\`; if it does, \`git rm --cached node_modules\` before committing. Work ONLY in that worktree. Never push, deploy, or touch /home/exedev/workspace/tinyoffice-next or another worktree.
2. Build it as the directive says: reproduce with a failing test first; one test command at a time, never in the background (a 2-core box shared with another agent); WIP commits; final commit(s) on next-${k.id} in the house voice ending in "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>". Leave the worktree in place.
Return the structured report the contract asks for (ok=true only when every check is green).`

const mergePrompt = (id, r) => `Merge the finished branch into next and leave next green. The next checkout is /home/exedev/workspace/tinyoffice-next (branch next); the branch is ${r.branch} at ${r.commit} (worktree ${r.worktree}). Other merges run one at a time through this same checkout. Steps:
0. \`git -C ${r.worktree} ls-files node_modules\` must print nothing; if it prints a path, in the worktree run \`git rm --cached node_modules && git commit -m "Drop the node_modules link"\` first. Never let a merge replace next's real node_modules directory.
1. cd /home/exedev/workspace/tinyoffice-next && git status --short must be empty and .git/index.lock absent (else wait 60 s and retry up to fifteen times, then stop and report). git merge --no-edit ${r.branch}.
2. Resolve conflicts keeping both sides' intent: src/i18n/en.ts keeps every section with no duplicate key (TS1117 = duplicate: delete the later copy); public/llms.txt and skill/tinyoffice/SKILL.md are regenerated with \`npm run skill\`; generated docs (docs/network.md, docs/dependencies.md) with their scripts; never discard either side's code.
3. npx tsc --noEmit -p .; npm run i18n:check; npx vitest run; npm run build — one at a time, never in the background. A browser test file that times out under load is rerun alone before it counts as failing. A failure caused by the merge: fix minimally and commit. A failure inside the branch's own work: fix if small, else report merged=false with the failure text and do not push.
4. When all green: git push origin next; then rm -f ${r.worktree}/node_modules and git -C /home/exedev/workspace/tinyoffice-next worktree remove ${r.worktree} and git -C /home/exedev/workspace/tinyoffice-next branch -D ${r.branch}.
Return merged, the commit hash on next, the exact test/build results, and notes.`

// Two builders at a time (a 2-core box); a task with `after` starts only once those tasks are merged, so it builds on their code.
const SLOTS = 2
let running = 0
const waiters = []
const take = () => (running < SLOTS ? (running++, Promise.resolve()) : new Promise((res) => waiters.push(res)))
const give = () => { running--; const w = waiters.shift(); if (w) { running++; w() } }
const merged = {}
const mergedOf = (id) => (merged[id] ??= {}).p ??= new Promise((res) => (merged[id].res = res))
const settle = (id, ok) => { mergedOf(id); merged[id].res(ok) }

let mergeChain = Promise.resolve()
const out = await Promise.all(TASKS.map(async (k) => {
  const deps = await Promise.all((k.after ?? []).map(mergedOf))
  if (deps.some((d) => !d)) { log(`${k.id} skipped: a task it builds on did not merge`); settle(k.id, false); return { task: k.id, build: null, merge: null, skipped: true } }
  await take()
  log(`building ${k.id}`)
  let r = null
  try { r = await agent(buildPrompt(k), { label: `build:${k.id}`, phase: 'Build', model: 'opus', schema: FIX_SCHEMA }) } finally { give() }
  if (!(r && r.ok)) { settle(k.id, false); return { task: k.id, build: r, merge: null } }
  log(`reviewing ${k.id}`)
  const review = await agent(reviewPrompt(r, k.directive), { label: `review:${k.id}`, phase: 'Review', model: 'sonnet', schema: REVIEW_SCHEMA })
  if (review && !review.ready) {
    log(`fixing ${k.id}`)
    await take()
    let fixed = null
    try { fixed = await agent(fixPrompt(r, k.directive, review.findings), { label: `fix:${k.id}`, phase: 'Review', model: 'opus', schema: FIX_SCHEMA }) } finally { give() }
    if (!(fixed && fixed.ok)) { settle(k.id, false); return { task: k.id, build: r, review, fix: fixed, merge: null } }
    r = { ...r, ...fixed }
  }
  const m = await (mergeChain = mergeChain.then(() => {
    log(`merging ${k.id}`)
    return agent(mergePrompt(k.id, r), { label: `merge:${k.id}`, phase: 'Merge', model: 'sonnet', schema: MERGE_SCHEMA })
  }).catch(() => null))
  settle(k.id, !!(m && m.merged))
  return { task: k.id, build: r, review, merge: m }
}))
return out
