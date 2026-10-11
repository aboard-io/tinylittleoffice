# Restoring what the rebuild lost — the common contract

Paul (the owner, 2026-10-09): "We've lost the password-protection and document signing functions entirely. What else have we lost? I'm not talking about things we decided to get rid of. We need to see the signed documents and things need to be shown as signed or not, the contract needs to work, and so forth."

Binding: directive-r4-common.md (the contract, the two standing rules), docs/gap-analysis.md in the tree (the audit of what is missing, section by section; your directive names your rows), the old tree at /home/exedev/workspace/tinyoffice (read-only reference: port its pure modules as they are where they are pure, rewrite what touched the DOM on the kernel and the kit), docs/editing.md, docs/kernel.md. Everything restored keeps the new tree's rules: native APIs, `<to-dialog>`/`<to-context>`/`<to-text>`, strings through t(), DOM tests per behaviour, byte-stable documents, phone first, no compat shims (an old link format is not read unless the directive says the feature is wanted on its own merits). Pacing: one test command at a time, never in the background (a 2-core box shared with another agent); WIP commits; final commit(s) in the house voice. Do not merge or push.

Report (structured): branch, commit, worktree, done (one line per gap row restored), tests, kitFiles, left, ok.
