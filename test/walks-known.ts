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
  // Both of round nine's findings were paid in round ten: the format says every space (next-r10-spaces) and the
  // drawer and Share hand over (next-r10-handover). A new finding goes here with its rule, its words and its seed.
];
