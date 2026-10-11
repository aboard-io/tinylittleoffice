export const meta = {
  name: 'leftovers-one',
  description: 'Two leftovers: a locked document placed inside another draws a locked card (LO-1); the Diagram Maker\'s separators are never typed and never corrupt words (LO-2); Opus builds two at a time, Sonnet merges one at a time',
  phases: [
    { title: 'Build', detail: 'Opus, two at a time', model: 'opus' },
    { title: 'Merge', detail: 'one at a time into next, checks green, push', model: 'sonnet' },
  ],
}

const S = '/home/exedev/.claude/projects/-home-exedev-workspace-tinyoffice/directives'
const TASKS = [
  { id: 'lo-sealed', directive: `${S}/directive-lo-sealed-embed.md`, what: 'a document locked with a password, placed inside another, draws a locked card that can be unlocked, instead of blank' },
  { id: 'lo-seps', directive: `${S}/directive-lo-diagram-seps.md`, what: "the Diagram Maker's separators (comma, colon, bar, plus, the connection arrows) escaped in a thing's words so they never corrupt the model, with comma and plus acting as keys at the end of the words" },
]
const FIX_SCHEMA = { type: 'object', properties: { branch: { type: 'string' }, commit: { type: 'string' }, worktree: { type: 'string' }, done: { type: 'string' }, tests: { type: 'string' }, kitFiles: { type: 'string' }, left: { type: 'string' }, ok: { type: 'boolean' } }, required: ['branch', 'commit', 'worktree', 'done', 'tests', 'ok'] }
const MERGE_SCHEMA = { type: 'object', properties: { merged: { type: 'boolean' }, commit: { type: 'string' }, tests: { type: 'string' }, notes: { type: 'string' } }, required: ['merged', 'tests', 'notes'] }

const buildPrompt = (k) => `You are building a leftover for Tiny Little Office's rebuilt tree: ${k.what}. The design is in your directive ${k.directive}: read it in full first, then ${S}/directive-r4-common.md (the contract), then every file the directive names.
1. Create your worktree from the CURRENT next: \`git -C /home/exedev/workspace/tinyoffice-next worktree add -b next-${k.id} /home/exedev/workspace/tinyoffice-next-${k.id} next\` (if the path exists, use it), then \`ln -s /home/exedev/workspace/tinyoffice-next/node_modules /home/exedev/workspace/tinyoffice-next-${k.id}/node_modules\` (skip if present). NEVER commit that link: node_modules must never appear in \`git status\`; if it does, \`git rm --cached node_modules\` before committing. Work ONLY in that worktree. Never push, deploy, or touch /home/exedev/workspace/tinyoffice-next or another worktree.
2. Build it as the directive says; one test command at a time, never in the background (a 2-core box shared with other agents); WIP commits; final commit(s) on next-${k.id} in the house voice ending in "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>". Leave the worktree in place.
Return the structured report the contract asks for (ok=true only when every check is green).`

const mergePrompt = (id, r) => `Merge the finished branch into next and leave next green. The next checkout is /home/exedev/workspace/tinyoffice-next (branch next); the branch is ${r.branch} at ${r.commit} (worktree ${r.worktree}). Other merges run one at a time through this same checkout. Steps:
0. \`git -C ${r.worktree} ls-files node_modules\` must print nothing; if it prints a path, in the worktree run \`git rm --cached node_modules && git commit -m "Drop the node_modules link"\` first. Never let a merge replace next's real node_modules directory.
1. cd /home/exedev/workspace/tinyoffice-next && git status --short must be empty and .git/index.lock absent (else wait 60 s and retry up to fifteen times, then stop and report). git merge --no-edit ${r.branch}.
2. Resolve conflicts keeping both sides' intent: src/i18n/en.ts keeps every section with no duplicate key (TS1117 = duplicate: delete the later copy); public/llms.txt and skill/tinyoffice/SKILL.md are regenerated with \`npm run skill\`; generated docs (docs/network.md, docs/dependencies.md) with their scripts; never discard either side's code.
3. npx tsc --noEmit -p .; npm run i18n:check; npx vitest run; npm run build — one at a time, never in the background. A browser test file that times out under load is rerun alone before it counts as failing. A failure caused by the merge: fix minimally and commit. A failure inside the branch's own work: fix if small, else report merged=false with the failure text and do not push.
4. When all green: git push origin next; then rm -f ${r.worktree}/node_modules and git -C /home/exedev/workspace/tinyoffice-next worktree remove ${r.worktree} and git -C /home/exedev/workspace/tinyoffice-next branch -D ${r.branch}.
Return merged, the commit hash on next, the exact test/build results, and notes.`

let mergeChain = Promise.resolve()
const out = await Promise.all(TASKS.map(async (k) => {
  log(`building ${k.id}`)
  const r = await agent(buildPrompt(k), { label: `build:${k.id}`, phase: 'Build', model: 'opus', schema: FIX_SCHEMA })
  if (!(r && r.ok)) return { task: k.id, build: r, merge: null }
  const m = await (mergeChain = mergeChain.then(() => {
    log(`merging ${k.id}`)
    return agent(mergePrompt(k.id, r), { label: `merge:${k.id}`, phase: 'Merge', model: 'sonnet', schema: MERGE_SCHEMA })
  }).catch(() => null))
  return { task: k.id, build: r, merge: m }
}))
return out