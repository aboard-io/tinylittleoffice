/**
 * A comment's quote (docs/library.md, Tracked changes and comments for a host): the words selected in the editor, as a
 * comment keeps them, with where they begin, which kit/text/redline.ts pinComments finds them by again. Pure, with no
 * DOM: the bubble's Comment (kit/text/text-commands.ts) says it in its "text-comment".
 */
import { textOf } from './changes.ts';
import type { Block } from '../../doc/index.ts';
import type { Sel } from './textops.ts';

/**
 * The words selected in the editor, as a comment keeps them (Quote): the words, and where they begin, its block and
 * its place there as the editor counts (a selection over several blocks, their words a line each). Null with no
 * selection, or one with no words in it. What pinComments finds a comment by.
 */
export interface Quote {
  quote: string;
  block: number;
  offset: number;
}
export function quoteAt(text: { model: readonly Block[]; sel: Sel | null }): Quote | null {
  const sel = text.sel;
  if (!sel) return null;
  const [s, e] = [sel.anchor, sel.focus].sort((a, b) => a.block - b.block || a.offset - b.offset);
  const lines: string[] = [];
  for (let i = s.block; i <= e.block; i++) lines.push(textOf(text.model[i]).slice(i === s.block ? s.offset : 0, i === e.block ? e.offset : undefined));
  const quote = lines.join('\n');
  return quote.trim() ? { quote, block: s.block, offset: s.offset } : null;
}
