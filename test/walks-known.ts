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
];
