export const meta = {
  name: 'round-six',
  description: "Paul's 2026-10-10 list: a keystroke no longer projects the whole document; no hyphen in a link; icons drawn and emoji in the picker; a placed animation plays; Select All and the page that would not stay scrolled; paste keeps lists and brings no syntax; :word completion; a contract row this browser cannot check. Opus builds two at a time, Sonnet merges one at a time",
  phases: [
    { title: 'Build', detail: 'Opus, two at a time', model: 'opus' },
    { title: 'Merge', detail: 'one at a time into next, checks green, push', model: 'sonnet' },
  ],
}

const S = '/home/exedev/.claude/projects/-home-exedev-workspace-tinyoffice/directives'
const TASKS = [
  { id: 'r6-perf', directive: `${S}/directive-r6-perf.md`, what: 'a keystroke costs only what it changed: the link (encode, replaceState, keep, title, signature) is projected when typing pauses and flushed before anything reads it, the editor never re-reads its own echo, the bar draws only when what it shows changes, icons and plurals are memoized; measured with a 1,500-word document' },
  { id: 'r6-urls', directive: `${S}/directive-r6-urls.md`, what: 'no hyphen in any generated link: the alphabet writes ~ for 62 and reads - leniently, every validator and the skill agree, the crypto vectors keep their bytes' },
  { id: 'r6-icons', directive: `${S}/directive-r6-icons.md`, what: 'an icon in rich text drawn as the icon (never the text :name:), icons outside the starter set loaded lazily by the editor, the views and the exports, and an Emoji set beside Lucide in the icon picker from a generated CLDR table' },
  { id: 'r6-anim', directive: `${S}/directive-r6-anim-placed.md`, what: 'an animation placed in a site page, a slide, a text or any display plays (SMIL, started when its slide or page is shown), with a new ViewOpts.still for print, PDF, PNG and thumbnails' },
  { id: 'r6-text', directive: `${S}/directive-r6-text-fixes.md`, what: 'Mod+A in a doc-shaped <to-text> selects the whole document as a model selection, and the page scrolls to the caret only after an edit the person made, never after a render, a restore or an autosave' },
  { id: 'r6-paste', directive: `${S}/directive-r6-paste.md`, what: 'paste keeps lists (Google Docs, Word, Apple Notes, Notion, plain bullets), headings, marks and links from HTML and Markdown-looking text, brings no HTML remnant or marker, fits to what the host can hold, and the writer escapes every marker a pasted run could re-read as' },
  { id: 'r6-complete', directive: `${S}/directive-r6-complete.md`, after: ['r6-icons', 'r6-text'], what: 'typing : and letters in any <to-text> opens a completion of icons and emoji under the caret: Up/Down, Enter/Tab picks, Escape dismisses, :name: typed in full becomes the icon' },
  { id: 'r6-contract', directive: `${S}/directive-r6-contract-check.md`, after: ['r6-text'], what: "a contract row whose signature this browser cannot check says Cannot check here in grey, with the Privacy dialog's helpers, never red" },
]
const FIX_SCHEMA = { type: 'object', properties: { branch: { type: 'string' }, commit: { type: 'string' }, worktree: { type: 'string' }, done: { type: 'string' }, tests: { type: 'string' }, kitFiles: { type: 'string' }, left: { type: 'string' }, ok: { type: 'boolean' } }, required: ['branch', 'commit', 'worktree', 'done', 'tests', 'ok'] }
const MERGE_SCHEMA = { type: 'object', properties: { merged: { type: 'boolean' }, commit: { type: 'string' }, tests: { type: 'string' }, notes: { type: 'string' } }, required: ['merged', 'tests', 'notes'] }

const buildPrompt = (k) => `You are building one item of round six for Tiny Little Office's rebuilt tree: ${k.what}. The design is in your directive ${k.directive}: read it in full first, then ${S}/directive-r6-common.md and ${S}/directive-r4-common.md (the contract), then every file the directive names, in full.
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
  const m = await (mergeChain = mergeChain.then(() => {
    log(`merging ${k.id}`)
    return agent(mergePrompt(k.id, r), { label: `merge:${k.id}`, phase: 'Merge', model: 'sonnet', schema: MERGE_SCHEMA })
  }).catch(() => null))
  settle(k.id, !!(m && m.merged))
  return { task: k.id, build: r, merge: m }
}))
return out
