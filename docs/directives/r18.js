export const meta = {
  name: 'round-eighteen',
  description: "Round eighteen: Paul's phone notes of 2026-10-11: the Outliner's caret above the keyboard, the Animator laid out for a small screen, the Spreadsheet's header stepping aside and numbers by default, the document as JSON with a schema, and an agent working from one fetch. Opus builds two at a time, Sonnet reviews, Opus fixes, Sonnet merges one at a time",
  phases: [
    { title: 'Build', detail: 'Opus, two at a time', model: 'opus' },
    { title: 'Review', detail: 'Sonnet reads the branch against its directive; Opus acts on the findings', model: 'sonnet' },
    { title: 'Merge', detail: 'one at a time into main, checks green, push', model: 'sonnet' },
  ],
}

const S = '/home/exedev/.claude/projects/-home-exedev-workspace-tinyoffice/directives'
const TASKS = [
  { id: 'r18-outline-caret', directive: `${S}/directive-r18-outline-caret.md`, what: "the caret stays above the keyboard in the Outliner: reproduced in WebKit under both keyboard models, one reveal rule through the column, the window never scrolled (Paul: I keep losing my cursor in Outline because it's below the keyboard)" },
  { id: 'r18-anim-phone', directive: `${S}/directive-r18-anim-phone.md`, what: "the Animator on a small screen: the stage first with the filmstrip right under it and a tight scrubber, Draw/Move as one segmented control in the context row with its hint in full, the settings behind one button, no grey padding, nothing cut (Paul: the interface is all over the place with lots of white space)" },
  { id: 'r18-sheet-phone', directive: `${S}/directive-r18-sheet-phone.md`, what: "the Spreadsheet with the keyboard up: the header steps aside while a cell is edited and the active cell stays visible; a number, money or percent column opens the numbers keyboard, a formula or an ABC/123 toggle switches to text (Paul: no room to navigate; default to numbers, let me switch to text)" },
  { id: 'r18-json', directive: `${S}/directive-r18-json.md`, what: "the document as JSON in and out: toJson/fromJson in the API, json and --json in the CLI, a .json download and open, a JSON Schema generated from the kernel's types and held by a test (Paul: the JSON export is a good idea)" },
  { id: 'r18-agent-fast', directive: `${S}/directive-r18-agent-fast.md`, what: "an agent works from one fetch: a short /llms.txt under 6 KB with the link shape, the API line and one example per app, /llms-full.txt the whole, a pointer in the home page for fetchers, api.js held small (Paul: speed is so important and LLMs can be so slow)" },
]
const FIX_SCHEMA = { type: 'object', properties: { branch: { type: 'string' }, commit: { type: 'string' }, worktree: { type: 'string' }, done: { type: 'string' }, tests: { type: 'string' }, kitFiles: { type: 'string' }, left: { type: 'string' }, ok: { type: 'boolean' } }, required: ['branch', 'commit', 'worktree', 'done', 'tests', 'ok'] }
const REVIEW_SCHEMA = { type: 'object', properties: { ready: { type: 'boolean' }, findings: { type: 'string' } }, required: ['ready', 'findings'] }
const reviewPrompt = (r, directive) => `Review a finished branch of Tiny Little Office before it merges. The branch is ${r.branch} at ${r.commit}, in the worktree ${r.worktree}; its directive is ${directive}, with ${S}/directive-r18-common.md and the contract ${S}/directive-r4-common.md. Read them in full, then \`git -C ${r.worktree} diff main...${r.branch}\` (and the files it touches where the diff is not enough). Do not run tests (the merge does) and change nothing. Judge only: (1) does the branch do what the directive asks, no less and nothing beyond it; (2) is each behaviour it claims covered by a test that would fail without it; (3) does it break a standing rule (a human never edits markup; strings through t(); no compat shim; native APIs first; one mechanism per idea; nothing committed that should not be, such as node_modules or a generated file edited by hand); (4) is the house voice kept in headers and the commit. Return ready=true when nothing needs changing before the merge, else ready=false with findings: a numbered list, each one line naming the file and what to change, concrete enough for the builder to act on without rereading everything. Taste is not a finding; a missing test, a wrong behaviour or a rule broken is.`
const fixPrompt = (r, directive, findings) => `You are finishing a branch of Tiny Little Office that a review sent back. The branch is ${r.branch} in the worktree ${r.worktree} (work ONLY there; never push or touch another checkout; the node_modules link is never committed). Its directive is ${directive}, with ${S}/directive-r18-common.md; the contract is ${S}/directive-r4-common.md. The review's findings, each to act on or to answer in your report with a reason the directive supports:
${findings}
One test command at a time, never in the background. Commit on the branch in the house voice ending in "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>". Return the structured report (ok=true only when every check is green).`
const MERGE_SCHEMA = { type: 'object', properties: { merged: { type: 'boolean' }, commit: { type: 'string' }, tests: { type: 'string' }, notes: { type: 'string' } }, required: ['merged', 'tests', 'notes'] }

const buildPrompt = (k) => `You are building one item of round eighteen for Tiny Little Office's rebuilt tree: ${k.what}. The design is in your directive ${k.directive}: read it in full first, then ${S}/directive-r18-common.md and ${S}/directive-r4-common.md (the contract), then every file the directive names, in full.
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
