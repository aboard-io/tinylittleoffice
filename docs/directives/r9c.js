export const meta = {
  name: 'round-nine-finish',
  description: "Round nine, finished: the command registry branch brought to green and merged (the chunk rule read per lazy chunk, the data menus left as data), then the lints, the random walks and the translation metrics on top of it. Opus builds, Sonnet reviews, Opus fixes, Sonnet merges",
  phases: [
    { title: 'Build', detail: 'Opus, two at a time', model: 'opus' },
    { title: 'Review', detail: 'Sonnet reads the branch against its directive; Opus acts on the findings', model: 'sonnet' },
    { title: 'Merge', detail: 'one at a time into next, checks green, push', model: 'sonnet' },
  ],
}

const S = '/home/exedev/.claude/projects/-home-exedev-workspace-tinyoffice/directives'
const FINISH = `You are finishing the command-registry branch of Tiny Little Office, which its builder stopped short of green for three stated reasons. The branch is next-r9-commands at a606988, in the worktree /home/exedev/workspace/tinyoffice-next-r9-commands (work ONLY there; never push or touch another checkout; the node_modules link is never committed; if the link is missing, ln -s /home/exedev/workspace/tinyoffice-next/node_modules there). Read first: ${S}/directive-r9-commands.md, ${S}/directive-r9-common.md, ${S}/directive-r4-common.md (the contract), then the branch's own commit message (git log -1) and its report's three reasons, below. The decisions, made by the design lead after the report:
1. The chunk rule is read per lazy chunk: the main chunk may grow by the palette alone (it did: +0.4k gzip), the apps chunk may not grow (it shrank), and an app's editor plus its lazy commands chunk may grow by what its declarations cost, since they load only when that app opens. Still, make the declarations as terse as the type allows (a label is a key string resolved through t() at draw time, not a thunk, where the type permits; shared helpers for the common shapes; no comment prose inside the arrays), measure again, and put the before/after per chunk in the report. Record the budgets you end with in budgets.json for R9-lints to hold.
2. Menus whose rows are data, not commands (the sheet's column kinds, the formula functions, the deck's slide-document menu, the outline's line menu, the calendar's date and time-zone dialogs, themes and inks) stay hand-built; say so in one sentence in src/kit/commands.ts's header so the next builder does not move them. Commands that exist only as rows of data (themes, inks, the new-document inserts) are marked \`data: true\` and left out of the generated tables of docs/editing.md and the skill (the dialog still shows them), so the standard stays readable.
3. The palette is Mod+K outside words and the bar's end button inside them; no second key. The bar on a phone shows on a tap or a key into the document, not on arrival from a link: that is the rule, keep it.
Then: run the WHOLE suite, one command at a time (npx tsc --noEmit -p .; npm run i18n:check; npx vitest run; npm run build), fix what fails, and rerun the whole browser project after the last fix, never only the affected files. Commit on the branch in the house voice ending in "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>". Return the structured report (ok=true only when every check is green and the chunk numbers are in \`done\`).`
const TASKS = [
  { id: 'r9-commands', directive: `${S}/directive-r9-commands.md`, prompt: FINISH, branch: 'next-r9-commands', what: 'the command registry branch finished and merged' },
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
  try { r = await agent(k.prompt ?? buildPrompt(k), { label: `build:${k.id}`, phase: 'Build', model: 'opus', schema: FIX_SCHEMA }) } finally { give() }
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
