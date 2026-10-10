// What the walks (test/browser/walks.test.ts) have found and left for the next round: each a rule broken, the words of
// the break it excuses, why it is left, and a seed that replays it. A walk meeting one goes on walking; one not met in
// any walk of a full run (`npm run walks`) is fixed and comes out of this list. Each is numbered in the round's report.
export interface Known {
  id: string;
  /** The rule it breaks (walks.test.ts: focus, back, modal, window, link, bar, overflow, names, keystroke, errors). */
  rule: string;
  /** The break's words it excuses, and nothing else. */
  matches: RegExp;
  /** Why it is left, and what would fix it. */
  why: string;
  /** VITE_WALK_SEED (and the family and size) that replays it. */
  replay: string;
}

export const KNOWN: Known[] = [
  {
    id: 'block-ends-unsayable',
    rule: 'link',
    matches: /\(only a block’s words ending in spaces or a line break\)/,
    why: 'Enter in the middle of a paragraph (or Shift+Enter at its end) leaves the words before it ending in a space or a line break, and the kernel holds them so; the format cannot say a line that ends in either (test/doc/tlo-grammar.ts sayableLine: “a line’s words never begin or end with spaces”), so the link reads back without them, and a document reopened from its link has lost a space or an empty last line. Worst with attributes: “Portland,  {.right}”. The fix is the kernel’s: either the writer says them (an escape for a space at a line’s end, a break as “\\” at a paragraph’s end, as Markdown does) or the split trims them; a decision for docs/kernel.md §2.',
    replay: 'VITE_WALK_SEED=1891995401, text at a desktop: ArrowDown, type "tiny", Enter in the Word Processor’s letter',
  },
  {
    id: 'dialog-from-dialog',
    rule: 'modal',
    matches: /\(each opened from a control inside the one under it\)$/,
    why: 'A modal <dialog> opened from a button inside another stacks on it: an app’s templates from its row in the drawer (kit/home.ts ToTemplates, over the whole screen: Paul 2026-10-09), Privacy and keys and About from the drawer (kit/drawer.ts), Password… from Share (kit/share-dialog.ts, kit/privacy-dialog.ts). Escape and the backdrop close the top one and the focus comes back to its button, so nothing is lost; but the rule is one modal at a time. The fix is a design choice for each: the drawer (or Share) closes and hands over, the second dialog given a Back to the first; or the second is a page of the first.',
    replay: 'step "templates" from any state (VITE_WALK_SEED=1438393384, text at a phone); Share, Tab to Password…, Space (VITE_WALK_SEED=-445799283, canvas at a phone)',
  },
];
