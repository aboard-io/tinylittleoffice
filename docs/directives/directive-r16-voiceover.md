# R16-voiceover: what is said is heard

**The review of 2026-10-11.** The blind reader on an iPhone: *"'Copy link', 'Downloaded', 'Password copied' and 'Updated · version n' are all said inside a modal dialog, so VoiceOver says nothing, and I never know whether the copy worked … In the words editor, lists aren't lists, the placeholder is read as if it were text, and on a phone the hidden bar stays in my swipe order while touches go through it. Nothing in the test suite reads the accessibility tree."*

## What is wrong today

1. `src/kit/toast.ts`: the one role=status region sits outside every dialog. While a modal is open (the drawer, Share, privacy), the page outside it is inert, so the message never reaches the accessibility tree. This was verified with CDP `Accessibility.getFullAXTree`. The same message twice in a row is not announced again.
2. `src/kit/exports.ts:114` and `:135` pass `role="img" aria-label="${title}"` to `pageSvg`, which then appends its own pair (`draw.ts:23`). The parser keeps the first, so every exported page is announced as the title, and its alt is dropped.
3. `src/kit/text.ts:1265`: a list item is `<li role="none" style="--d:…">` with no list, no level and no position. A task's state exists only as the CSS glyph '☐' or '☑'.
4. `src/styles/text.css:24-25`: the placeholder is `::before { content: attr(data-placeholder) }`, which VoiceOver reads as the box's value.
5. `src/styles/responsive.css:131-138`: the phone bar and 'All commands…', slid away with transform and opacity, stay exposed and in the swipe order (`chrome.ts` indoc). The app bar under a docked context row is the same.
6. `src/kit/link-guard.ts`: the guard focuses Cancel with no `aria-describedby`, so the host it exists to show is not spoken.

## The design

- **The toast speaks where the person is.** On each toast, find the topmost open modal (`document.querySelector('dialog:modal')`). Write the message into an sr-only `role=status` inside it, created once per dialog, or into the page's region when no dialog is open. Clear the message, then set it on the next frame, so that a repeat is announced. The visible toast is unchanged.
- **Exports keep each page's alt.** htmlOf and printHtml pass no role or label. pageSvg refuses to add a role when `attrs` already has one.
- **Lists are lists, in ARIA, on the flat model.** Each li gets `role="listitem" aria-level=${depth+1} aria-setsize aria-posinset`, counted over its run in `render()`. The run is wrapped in `role="list"` if that is simpler in render(). A task line starts with an sr-only, `contenteditable=false` span reading t('done') or t('not done'). The generated markers get empty alt text: `content: '•' / ''`.
- **The placeholder** is `aria-placeholder` on the editable div, and the visible text gets `content: attr(data-placeholder) / ''`.
- **What is hidden is inert.** Where chrome.ts clears indoc (and where data-context-row is set), set `inert` on the bar and the palette button, so the CSS and the flag change together.
- **Dialogs describe themselves.** `<to-dialog>` gets an optional `describedby` that is set on the dialog element. The guard is described by `.lg-what .lg-host .lg-warn`.

## Where

`src/kit/toast.ts`, `src/kit/dialog.ts`, `src/kit/exports.ts`, `src/kit/draw.ts`, `src/kit/text.ts`, `src/styles/text.css`, `src/kit/chrome.ts`, `src/styles/responsive.css`, `src/kit/link-guard.ts`.

## Proof

- `test/browser/toast.test.ts`: open a `<to-dialog>`, call `toast('x')`, and check that the status element holding 'x' is inside `dialog:modal`. A second identical toast changes the region's text again.
- `test/formats.test.ts`: `htmlOf(pages)` contains each page's alt, and no `<svg>` has two role attributes.
- `test/browser/text.test.ts`: a nested list exposes role, level and posinset on each item, a task carries its state, and an empty `<to-text placeholder>` has aria-placeholder and empty text.
- A walks rule (`test/browser/walks.test.ts`): no element that is opacity 0 or translated out of the window is focusable or un-inert.
- `test/browser/guard.test.ts`: the open guard's aria-describedby resolves to text containing the host.
- One WebKit `toMatchAriaSnapshot` in `e2e/a11y.spec.ts` for the Word Processor's first template.

## Not this

- No semantic text layer for the Display Link yet. That waits on Paul's answer and is the next round's.
- No change to the flat block model.