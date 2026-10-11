export const meta = {
  name: 'round-sixteen-merges',
  description: 'The two branches of round sixteen that built green but reported themselves not ok for faults outside their work (reflow at 200%, the e2e specs brought up to date) are merged into main one at a time by Sonnet, checks green, pushed',
  phases: [{ title: 'Merge', detail: 'one at a time into main', model: 'sonnet' }],
}
const S = '/home/exedev/.claude/projects/-home-exedev-workspace-tinyoffice/directives'
const MERGE_SCHEMA = { type: 'object', properties: { merged: { type: 'boolean' }, commit: { type: 'string' }, tests: { type: 'string' }, notes: { type: 'string' } }, required: ['merged', 'tests', 'notes'] }
const mergePrompt = (id, r) => `Merge the finished branch into main and leave main green. The main checkout is /home/exedev/workspace/tinyoffice-next (branch main: the rebuilt tree became main on 2026-10-11); the branch is ${r.branch} at ${r.commit} (worktree ${r.worktree}). Other merges run one at a time through this same checkout. Steps:
0. \`git -C ${r.worktree} ls-files node_modules\` must print nothing; if it prints a path, in the worktree run \`git rm --cached node_modules && git commit -m "Drop the node_modules link"\` first. Never let a merge replace main's real node_modules directory.
1. cd /home/exedev/workspace/tinyoffice-next && git status --short must be empty and .git/index.lock absent (else wait 60 s and retry up to fifteen times, then stop and report). git merge --no-edit ${r.branch}.
2. Resolve conflicts keeping both sides' intent: src/i18n/en.ts keeps every section with no duplicate key (TS1117 = duplicate: delete the later copy); public/llms.txt and skill/tinyoffice/SKILL.md are regenerated with \`npm run skill\`; generated docs (docs/network.md, docs/dependencies.md) with their scripts; never discard either side's code.
3. npx tsc --noEmit -p .; npm run i18n:check; npx vitest run; npm run build — one at a time, never in the background. A browser test file that times out under load is rerun alone before it counts as failing. A failure caused by the merge: fix minimally and commit. A failure inside the branch's own work: fix if small, else report merged=false with the failure text and do not push.
4. When all green: git push origin main; then rm -f ${r.worktree}/node_modules and git -C /home/exedev/workspace/tinyoffice-next worktree remove ${r.worktree} and git -C /home/exedev/workspace/tinyoffice-next branch -D ${r.branch}.
Return merged, the commit hash on main, the exact test/build results, and notes.`

const BRANCHES = [
  { id: 'r16-reflow', branch: 'main-r16-reflow', commit: '90d6a08', worktree: '/home/exedev/workspace/tinyoffice-next-r16-reflow' },
  { id: 'r16-e2e', branch: 'main-r16-e2e', commit: 'c7ea4bd', worktree: '/home/exedev/workspace/tinyoffice-next-r16-e2e' },
]
const out = []
for (const r of BRANCHES) {
  log(`merging ${r.id}`)
  out.push({ task: r.id, merge: await agent(mergePrompt(r.id, r) + ' Note: an e2e spec of the Website Builder (e2e/site-phone.spec.ts) may fail; that app is deleted in the next round, so that one failure does not block the merge: name it in notes.', { label: `merge:${r.id}`, phase: 'Merge', model: 'sonnet', schema: MERGE_SCHEMA }) })
}
return out
