export const meta = {
  name: 'round-seventeen',
  description: "Round seventeen: Paul's answers of 2026-10-11: zip files named and titled, Urdu in Nastaliq, IBM Plex on the site and the box, the language in the link, a Display Link that reads, American English, lazy templates, a hundred short links a day. Opus builds two at a time, Sonnet reviews, Opus fixes, Sonnet merges one at a time",
  phases: [
    { title: 'Build', detail: 'Opus, two at a time', model: 'opus' },
    { title: 'Review', detail: 'Sonnet reads the branch against its directive; Opus acts on the findings', model: 'sonnet' },
    { title: 'Merge', detail: 'one at a time into main, checks green, push', model: 'sonnet' },
  ],
}

const S = '/home/exedev/.claude/projects/-home-exedev-workspace-tinyoffice/directives'
const TASKS = [
  { id: 'r17-no-board-todo', directive: `${S}/directive-r17-no-board-todo.md`, what: "the Kanban Board and the To-do List are gone: the apps, their routes, exports, strings in 19 languages, templates, hand-offs, docs and tests; ten apps on the home page; task lines in the Word Processor and Outliner stay (Paul: the implied state change is too confusing when it doesn't save to a server)" },
  { id: 'r17-no-media', directive: `${S}/directive-r17-no-media.md`, what: "pictures from the web and embeds are gone from main (the code stays on the branch web-pictures-and-embeds): the picture proxy and the whitelist, the gate and the lazy loading, the Web Picture and Web Embed inserts, the picture and embed lines of the format (now words with a link), the live cards, every frame and img host in the policy, the lints, the fixtures and the strings in 19 languages (Paul: get rid of images and embeds, save the code in a branch, remove them from main)" },
  { id: 'r17-no-site', directive: `${S}/directive-r17-no-site.md`, what: "the Website Builder is gone entirely: the app, its frame and plugin, its exports, routes, strings, templates, docs and tests, twelve apps on the home page (Paul: get rid of the Website Builder entirely)" },
  { id: 'r17-no-signing', directive: `${S}/directive-r17-no-signing.md`, what: "signatures are gone everywhere: the key, the signing dialog and shield, the signatures fence and the contract template's, the vectors and docs, in all 19 languages; passwords stay (Paul: get rid of signatures everywhere including templates)" },
  { id: 'r17-public', directive: `${S}/directive-r17-public.md`, what: "the home page's footer (Made with respect by Aboard, Open source) in 19 languages, and the repository ready for strangers at aboard-io/tinylittleoffice: every old name replaced, package metadata, README for a stranger, CONTRIBUTING, SECURITY, a code of conduct, CI running the deploy's checks, dependabot, issue templates (Paul: start preparing this repo for public release and maintenance)" },
  { id: 'r17-lazy-templates', directive: `${S}/directive-r17-lazy-templates.md`, what: "a definition is light again: each app's templates are a chunk loaded when asked for, Blank shown at once, preloaded on intent, with budgets for the apps chunk and each templates chunk (Paul: lazy templates is right)" },
  { id: 'r17-shortener', directive: `${S}/directive-r17-shortener.md`, what: "the short link is immutable (no update, no owner secret, nothing in the address bar but the document; the links table is production's four columns), and the shortener allows a hundred links a day per address counted under a keyed hash kept for a day in D1 and swept, the per-minute limiter and the in-memory brake gone, and the longest life a month (Paul: make the short link immutable for now; make it 100 links a day; make the max expire a month)" },
  { id: 'r17-copies', directive: `${S}/directive-r17-copies.md`, what: "a link is a copy and Share says so in every language: one sentence under the link, once in the Display Link's header for someone who arrived by a link, in About and the threat model and the skill (Paul: docs are not collaborative, that's fine, communicate it in all the languages)" },
  { id: 'r17-short-size', directive: `${S}/directive-r17-short-size.md`, what: "the short link's limit is shown before the press: a short-link target in the link-size table and the header's room line, the Make-a-short-link button disabled with the numbers when the document is over, and measure reporting it (Paul: do we let people know if their doc is too big for a short link; add that limit to the usage indicator)" },
  { id: 'r17-american', directive: `${S}/directive-r17-american.md`, what: "the product's English is American in every string and every template, New York where a template is placed, and a calendar with no zone is read in the reader's own (Paul: American English)" },
  { id: 'r17-lang-link', directive: `${S}/directive-r17-lang-link.md`, what: "the language is a parameter of the link and never written to the device: lang in the route, the menu rewrites the link, a link opens in its language, the API makes one (Paul: encode the parameter in the link)" },
  { id: 'r17-display-text', directive: `${S}/directive-r17-display-text.md`, what: "a Display Link can be read: one text layer from the kernel (and each spatial app's own) drawn as HTML before the pages for a screen reader, a Text button that shows it reflowed, in exports and the API (Paul: deal with the Display Link)" },
  { id: 'r17-plex', directive: `${S}/directive-r17-plex.md`, what: "the type is IBM Plex, self-hosted (Sans, Serif, Mono; Arabic and Devanagari behind unicode-range), on the site and on the measuring box, every width recalibrated in it (Paul: use IBM Plex to measure, we use Plex everywhere)" },
  { id: 'r17-urdu', directive: `${S}/directive-r17-urdu.md`, what: "Urdu reads in Nastaliq where the device has it, with the taller line it needs, Naskh as the fallback (Paul: choose the best path for colloquial speakers of Urdu)" },
  { id: 'r17-zip-titles', directive: `${S}/directive-r17-zip-titles.md`, what: "Download everything names each file by its title and writes the title into the document's head, so a document comes back as it was named (Paul: name the docs and put the title into the header, do both)" },
  { id: 'r17-chrome-align', directive: `${S}/directive-r17-chrome-align.md`, what: "the templates dialog's previews sit at the far left and at the top of their rows, and the drawer's and the home page's icons align with the first line of their words so they stay put when the size grows (Paul: align the previews to the far left; align the icons in the main menu to the top)" },
  { id: 'r17-docs', directive: `${S}/directive-r17-docs.md`, after: ['r17-no-board-todo', 'r17-no-media', 'r17-no-site', 'r17-no-signing', 'r17-shortener', 'r17-copies', 'r17-short-size', 'r17-american', 'r17-lang-link', 'r17-public'], what: "the README rewritten whole for a stranger, the docs indexed and cleaned with history moved aside, and the truth about saving said everywhere: Private is the default, Saved is a choice on this device, a short link is the one thing a server holds (Paul: the README needs a full rewrite; clean up docs; saying we never save anything is wrong, say that's the default)" },
]
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
