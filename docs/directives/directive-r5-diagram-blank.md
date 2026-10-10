# R5-B: the Diagram Maker's list has one blank per kind and no generic Blank

Read first: directive-r4-common.md, src/kit/home.ts (the listbox: Blank first, the app's own page), src/kit/app.ts (AppDef, Template), src/kit/drawer.ts and the hamburger's templates view (to-templates), src/apps/diagram/templates.ts (blank(kind) at ~392, "Blank {kind}"), src/apps/diagram/def.ts (blank: () => ''), test/browser/shell.test.ts, src/apps/diagram/tests.

Paul (2026-10-10): the Diagram Maker showed a generic Blank and then a blank per kind, nine blanks; drop the generic one for that app only.

Build: AppDef gets an optional `blankInTemplates?: boolean` ("the app's templates carry its blank pages; the lists add no Blank of their own"). The home listbox and the hamburger's templates view add Blank unless it is set; the app's row name/icon still opens app.blank(). Diagram sets it. Its per-kind blanks lose the word Blank (Paul, 2026-10-09: "don't use the word 'Blank' over and over"): the name is the kind ("Flowchart", "Mind map", "Org chart", "Family tree", "Network", "Sequence", "Swimlanes", …), the blurb "An empty {kind} to start from" or the kind's own one-line description where templates.ts has one; the first entry is the Diagram Maker's default kind, chosen as Blank is for the other apps. The listbox's chosen/first item logic keeps working with no generic entry (the first template is chosen). Nothing else changes for the other twelve apps.

Tests: shell test: the Diagram Maker's list opens with no "Blank" option, its first option is the default kind and is chosen, and the Word Processor's still starts with Blank; model test: no template name contains "Blank"; the skill/llms.txt regenerate (`npm run skill`) if the names appear there. PW_PORT=4430.
