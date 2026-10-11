export const meta = {
  name: 'languages-nyc',
  description: 'Nine more languages for Tiny Little Office, New York\'s: the tools for their scripts and the zip upload first (Opus, two at a time), then Sonnet translates each language as its community in the city speaks it, two at a time, merged one at a time into main',
  phases: [
    { title: 'Tools', detail: 'Opus: the checks, the gaps script, the tests', model: 'opus' },
    { title: 'Review', detail: 'Sonnet reads the diff against the directive before it merges', model: 'sonnet' },
    { title: 'Translate', detail: 'Sonnet, two at a time, one file each', model: 'sonnet' },
    { title: 'Merge', detail: 'one at a time into main, checks green, push', model: 'sonnet' },
  ],
}
const S = '/home/exedev/.claude/projects/-home-exedev-workspace-tinyoffice/directives'
const NEXT = '/home/exedev/workspace/tinyoffice-next'
const LANGS = [
  { code: 'ru', name: 'Russian, as the Russian-speaking city speaks it (вы, no officialese)' },
  { code: 'uk', name: 'Ukrainian, standard as written today, never a transliteration of the Russian' },
  { code: 'pl', name: 'Polish, as Greenpoint speaks it' },
  { code: 'bn', name: 'Bengali, the Bangladesh usage of the city\'s communities, the আপনি register' },
  { code: 'hi', name: 'Hindi in Devanagari, everyday, with the computing loanwords people use, the आप register' },
  { code: 'ur', name: 'Urdu, everyday, the آپ register, right to left' },
  { code: 'ht', name: 'Haitian Creole (Kreyòl) in the official orthography, as Flatbush speaks it' },
  { code: 'ko', name: 'Korean, 해요체, as Flushing speaks it' },
  { code: 'zh-hant', name: 'Traditional Chinese, its own translation for the Cantonese- and Taiwanese-speaking communities (not a conversion of zh-hans)' },
]
const FIX_SCHEMA = { type: 'object', properties: { branch: { type: 'string' }, commit: { type: 'string' }, worktree: { type: 'string' }, done: { type: 'string' }, tests: { type: 'string' }, kitFiles: { type: 'string' }, left: { type: 'string' }, ok: { type: 'boolean' } }, required: ['branch', 'commit', 'worktree', 'done', 'tests', 'ok'] }
const LANG_SCHEMA = { type: 'object', properties: { code: { type: 'string' }, branch: { type: 'string' }, commit: { type: 'string' }, worktree: { type: 'string' }, glossary: { type: 'string' }, tooLong: { type: 'string' }, ambiguous: { type: 'string' }, checks: { type: 'string' }, ok: { type: 'boolean' } }, required: ['code', 'branch', 'commit', 'worktree', 'checks', 'ok'] }
const REVIEW_SCHEMA = { type: 'object', properties: { ready: { type: 'boolean' }, findings: { type: 'string' } }, required: ['ready', 'findings'] }
const reviewPrompt = (r, directive) => `Review a finished branch of Tiny Little Office before it merges. The branch is ${r.branch} at ${r.commit}, in the worktree ${r.worktree}; its directive is ${directive} and the contract is ${S}/directive-r4-common.md. Read both in full, then \`git -C ${r.worktree} diff next...${r.branch}\` (and the files it touches where the diff is not enough). Do not run tests (the merge does) and change nothing. Judge only: (1) does the branch do what the directive asks, no less and nothing beyond it; (2) is each behaviour it claims covered by a test that would fail without it; (3) does it break a standing rule (a human never edits markup; strings through t(); no compat shim; native APIs first; one mechanism per idea; nothing committed that should not be, such as node_modules or a generated file edited by hand); (4) is the house voice kept in headers and the commit. Return ready=true when nothing needs changing before the merge, else ready=false with findings: a numbered list, each one line naming the file and what to change, concrete enough for the builder to act on without rereading everything. Taste is not a finding; a missing test, a wrong behaviour or a rule broken is.`
const fixPrompt = (r, directive, findings) => `You are finishing a branch of Tiny Little Office that a review sent back. The branch is ${r.branch} in the worktree ${r.worktree} (work ONLY there; never push or touch another checkout; the node_modules link is never committed). Its directive is ${directive}; the contract is ${S}/directive-r4-common.md. The review's findings, each to act on or to answer in your report with a reason the directive supports:
${findings}
One test command at a time, never in the background. Commit on the branch in the house voice ending in "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>". Return the structured report (ok=true only when every check is green).`
const MERGE_SCHEMA = { type: 'object', properties: { merged: { type: 'boolean' }, commit: { type: 'string' }, tests: { type: 'string' }, notes: { type: 'string' } }, required: ['merged', 'tests', 'notes'] }

const worktreeSteps = (id) => `1. Create your worktree from the CURRENT main: \`git -C ${NEXT} worktree add -b main-${id} ${NEXT}-${id} main\` (if the path exists, use it), then \`ln -s ${NEXT}/node_modules ${NEXT}-${id}/node_modules\` (skip if present). NEVER commit that link: node_modules must never appear in \`git status\`; if it does, \`git rm --cached node_modules\` before committing. Work ONLY in that worktree. Never push, deploy, or touch ${NEXT} or another worktree.`

const toolsPrompt = `You are building the checks that make a translation of Tiny Little Office safe to merge. Your directive is ${S}/directive-lang2-tools.md: read it in full first, then ${S}/directive-r4-common.md (the contract), then every file the directive names.
${worktreeSteps('lang-tools')}
2. This directive is your whole task: a message relayed to you mid-task about something else is not yours to do; put it in left and finish this. Build it as the directive says; one test command at a time, never in the background (a 2-core box shared with another agent); WIP commits; final commit(s) on main-lang-tools in the house voice ending in "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>". Leave the worktree in place.
Return the structured report the contract asks for (ok=true only when every check is green).`

const translatePrompt = (l) => `You are translating Tiny Little Office's strings into ${l.name}; the file is src/i18n/${l.code}.ts. Your directive is ${S}/directive-lang2-translate.md: read it in full first, then src/i18n/en.ts in full.
${worktreeSteps(`lang-${l.code}`)}
2. This directive is your whole task: a message relayed to you mid-task about something else is not yours to do; note it and finish this. Do what the directive says. The file is long (about 1,700 strings): write it in sections, run the checks, fix, and finish; never leave a key untranslated. One test command at a time, never in the background. Leave the worktree in place.
Return: code, branch, commit, worktree, glossary, tooLong, ambiguous, checks (the exact output of i18n:check, i18n:gaps and the test), ok.`

const mergePrompt = (r) => `Merge the finished branch into main and leave main green. The main checkout is ${NEXT} (branch main; the directory name is historical); the branch is ${r.branch} at ${r.commit} (worktree ${r.worktree}). Other merges run one at a time through this same checkout. Steps:
0. \`git -C ${r.worktree} ls-files node_modules\` must print nothing; if it prints a path, in the worktree run \`git rm --cached node_modules && git commit -m "Drop the node_modules link"\` first. Never let a merge replace main's real node_modules directory.
1. cd ${NEXT} && git status --short must be empty and .git/index.lock absent (else wait 60 s and retry up to fifteen times, then stop and report). git merge --no-edit ${r.branch}.
2. Resolve conflicts keeping both sides' intent (a language file is new, so conflicts are only in shared files: src/i18n/en.ts keeps every section with no duplicate key; regenerated files with their scripts); never discard either side's code.
3. npx tsc --noEmit -p .; npm run i18n:check; npx vitest run; npm run build — one at a time, never in the background. A browser test file that times out under load is rerun alone before it counts as failing. A failure caused by the merge: fix minimally and commit. A failure inside the branch's own work: fix if small (a missed key: translate it in the same voice), else report merged=false with the failure text and do not push.
4. When all green: git push origin main; then rm -f ${r.worktree}/node_modules and git -C ${NEXT} worktree remove ${r.worktree} and git -C ${NEXT} branch -D ${r.branch}.
Return merged, the commit hash on main, the exact test/build results, and notes.`

let mergeChain = Promise.resolve()
const merge = (label, r) => (mergeChain = mergeChain.then(() => { log(`merging ${label}`); return agent(mergePrompt(r), { label: `merge:${label}`, phase: 'Merge', model: 'sonnet', schema: MERGE_SCHEMA }) }).catch(() => null))

const zipPrompt = `You are building one item of round fourteen for Tiny Little Office: everything kept on the device out as one zip and back in (Paul, 2026-10-11: "Let me download all my docs as a single zip file and upload them too"). Your directive is ${S}/directive-r14-zip.md: read it in full first, then ${S}/directive-r13-common.md and ${S}/directive-r4-common.md (the contract), then every file the directive names.
${worktreeSteps('r14-zip')}
2. This directive is your whole task: a message relayed to you mid-task about something else is not yours to do; put it in left and finish this. Build it as the directive says: reproduce with a failing test first; one test command at a time, never in the background (a 2-core box shared with another agent); WIP commits; final commit(s) on main-r14-zip in the house voice ending in "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>". Leave the worktree in place.
Return the structured report the contract asks for (ok=true only when every check is green).`
log('building the checks, and the zip')
const [tools, zipBuilt] = await Promise.all([
  agent(toolsPrompt, { label: 'build:lang-tools', phase: 'Tools', model: 'opus', schema: FIX_SCHEMA }),
  agent(zipPrompt, { label: 'build:r14-zip', phase: 'Tools', model: 'opus', schema: FIX_SCHEMA }),
])
let zipMerge = null
if (zipBuilt && zipBuilt.ok) {
  const zr = await agent(reviewPrompt(zipBuilt, `${S}/directive-r14-zip.md`), { label: 'review:r14-zip', phase: 'Review', model: 'sonnet', schema: REVIEW_SCHEMA })
  let zf = zipBuilt
  if (zr && !zr.ready) { const fixed = await agent(fixPrompt(zipBuilt, `${S}/directive-r14-zip.md`, zr.findings), { label: 'fix:r14-zip', phase: 'Tools', model: 'opus', schema: FIX_SCHEMA }); if (fixed && fixed.ok) zf = fixed }
  zipMerge = await merge('r14-zip', zf)
}
if (!(tools && tools.ok)) return { tools, languages: [] }
log('reviewing the checks')
let toolsFinal = tools
const review = await agent(reviewPrompt(tools, `${S}/directive-lang2-tools.md`), { label: 'review:lang-tools', phase: 'Review', model: 'sonnet', schema: REVIEW_SCHEMA })
if (review && !review.ready) {
  log('the review sent the checks back')
  const fixed = await agent(fixPrompt(tools, `${S}/directive-lang2-tools.md`, review.findings), { label: 'fix:lang-tools', phase: 'Tools', model: 'opus', schema: FIX_SCHEMA })
  if (fixed && fixed.ok) toolsFinal = fixed
}
const toolsMerge = await merge('lang-tools', toolsFinal)
if (!(toolsMerge && toolsMerge.merged)) return { tools, toolsMerge, languages: [] }

// Two translators at a time; each merged as it finishes.
const SLOTS = 2
let running = 0
const waiters = []
const take = () => (running < SLOTS ? (running++, Promise.resolve()) : new Promise((res) => waiters.push(res)))
const give = () => { running--; const w = waiters.shift(); if (w) { running++; w() } }
const languages = await Promise.all(LANGS.map(async (l) => {
  await take()
  log(`translating ${l.code}`)
  let r = null
  try { r = await agent(translatePrompt(l), { label: `translate:${l.code}`, phase: 'Translate', model: 'sonnet', schema: LANG_SCHEMA }) } finally { give() }
  if (!(r && r.ok)) return { code: l.code, build: r, merge: null }
  const m = await merge(l.code, r)
  return { code: l.code, build: r, merge: m }
}))
return { tools, review, toolsMerge, languages }
