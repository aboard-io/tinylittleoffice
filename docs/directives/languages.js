export const meta = {
  name: 'languages',
  description: 'Nine languages for Tiny Little Office: Opus builds the checks that make a translation safe to merge, then Sonnet translates en.ts into each language two at a time, and Sonnet merges one at a time',
  phases: [
    { title: 'Tools', detail: 'Opus: the checks, the gaps script, the tests', model: 'opus' },
    { title: 'Translate', detail: 'Sonnet, two at a time, one file each', model: 'sonnet' },
    { title: 'Merge', detail: 'one at a time into next, checks green, push', model: 'sonnet' },
  ],
}
const S = '/home/exedev/.claude/projects/-home-exedev-workspace-tinyoffice/directives'
const NEXT = '/home/exedev/workspace/tinyoffice-next'
const LANGS = [
  { code: 'es', name: 'Spanish (neutral, as a Spanish-language office suite writes it)' },
  { code: 'fr', name: 'French (France)' },
  { code: 'de', name: 'German (Germany; du, not Sie, as consumer software addresses people)' },
  { code: 'pt-br', name: 'Portuguese (Brazil)' },
  { code: 'it', name: 'Italian' },
  { code: 'nl', name: 'Dutch (Netherlands)' },
  { code: 'ja', name: 'Japanese (polite plain form, as consumer software addresses people)' },
  { code: 'zh-hans', name: 'Chinese (Simplified, mainland)' },
  { code: 'ar', name: 'Arabic (Modern Standard; the site runs right to left for it: report anything in the strings that assumes a direction)' },
]
const FIX_SCHEMA = { type: 'object', properties: { branch: { type: 'string' }, commit: { type: 'string' }, worktree: { type: 'string' }, done: { type: 'string' }, tests: { type: 'string' }, kitFiles: { type: 'string' }, left: { type: 'string' }, ok: { type: 'boolean' } }, required: ['branch', 'commit', 'worktree', 'done', 'tests', 'ok'] }
const LANG_SCHEMA = { type: 'object', properties: { code: { type: 'string' }, branch: { type: 'string' }, commit: { type: 'string' }, worktree: { type: 'string' }, glossary: { type: 'string' }, tooLong: { type: 'string' }, ambiguous: { type: 'string' }, checks: { type: 'string' }, ok: { type: 'boolean' } }, required: ['code', 'branch', 'commit', 'worktree', 'checks', 'ok'] }
const MERGE_SCHEMA = { type: 'object', properties: { merged: { type: 'boolean' }, commit: { type: 'string' }, tests: { type: 'string' }, notes: { type: 'string' } }, required: ['merged', 'tests', 'notes'] }

const worktreeSteps = (id) => `1. Create your worktree from the CURRENT next: \`git -C ${NEXT} worktree add -b next-${id} ${NEXT}-${id} next\` (if the path exists, use it), then \`ln -s ${NEXT}/node_modules ${NEXT}-${id}/node_modules\` (skip if present). NEVER commit that link: node_modules must never appear in \`git status\`; if it does, \`git rm --cached node_modules\` before committing. Work ONLY in that worktree. Never push, deploy, or touch ${NEXT} or another worktree.`

const toolsPrompt = `You are building the checks that make a translation of Tiny Little Office safe to merge. Your directive is ${S}/directive-lang-tools.md: read it in full first, then ${S}/directive-r4-common.md (the contract), then every file the directive names.
${worktreeSteps('lang-tools')}
2. Build it as the directive says; one test command at a time, never in the background (a 2-core box shared with another agent); WIP commits; final commit(s) on next-lang-tools in the house voice ending in "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>". Leave the worktree in place.
Return the structured report the contract asks for (ok=true only when every check is green).`

const translatePrompt = (l) => `You are translating Tiny Little Office's strings into ${l.name}; the file is src/i18n/${l.code}.ts. Your directive is ${S}/directive-lang-translate.md: read it in full first, then src/i18n/en.ts in full.
${worktreeSteps(`lang-${l.code}`)}
2. Do what the directive says. The file is long (about 1,700 strings): write it in sections, run the checks, fix, and finish; never leave a key untranslated. One test command at a time, never in the background. Leave the worktree in place.
Return: code, branch, commit, worktree, glossary, tooLong, ambiguous, checks (the exact output of i18n:check, i18n:gaps and the test), ok.`

const mergePrompt = (r) => `Merge the finished branch into next and leave next green. The next checkout is ${NEXT} (branch next); the branch is ${r.branch} at ${r.commit} (worktree ${r.worktree}). Other merges run one at a time through this same checkout. Steps:
0. \`git -C ${r.worktree} ls-files node_modules\` must print nothing; if it prints a path, in the worktree run \`git rm --cached node_modules && git commit -m "Drop the node_modules link"\` first. Never let a merge replace next's real node_modules directory.
1. cd ${NEXT} && git status --short must be empty and .git/index.lock absent (else wait 60 s and retry up to fifteen times, then stop and report). git merge --no-edit ${r.branch}.
2. Resolve conflicts keeping both sides' intent (a language file is new, so conflicts are only in shared files: src/i18n/en.ts keeps every section with no duplicate key; regenerated files with their scripts); never discard either side's code.
3. npx tsc --noEmit -p .; npm run i18n:check; npx vitest run; npm run build — one at a time, never in the background. A browser test file that times out under load is rerun alone before it counts as failing. A failure caused by the merge: fix minimally and commit. A failure inside the branch's own work: fix if small (a missed key: translate it in the same voice), else report merged=false with the failure text and do not push.
4. When all green: git push origin next; then rm -f ${r.worktree}/node_modules and git -C ${NEXT} worktree remove ${r.worktree} and git -C ${NEXT} branch -D ${r.branch}.
Return merged, the commit hash on next, the exact test/build results, and notes.`

let mergeChain = Promise.resolve()
const merge = (label, r) => (mergeChain = mergeChain.then(() => { log(`merging ${label}`); return agent(mergePrompt(r), { label: `merge:${label}`, phase: 'Merge', model: 'sonnet', schema: MERGE_SCHEMA }) }).catch(() => null))

log('building the checks')
const tools = await agent(toolsPrompt, { label: 'build:lang-tools', phase: 'Tools', model: 'opus', schema: FIX_SCHEMA })
if (!(tools && tools.ok)) return { tools, languages: [] }
const toolsMerge = await merge('lang-tools', tools)
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
return { tools, toolsMerge, languages }
