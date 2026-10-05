/**
 * Rich text model and a compact markup for it.
 *
 * Blocks: one per line.  Prefixes:  "# " h1, "## " h2, "- " bullet, "+ " numbered.
 * Inline: toggles  *bold*  _italic_  ^underline^  ~strike~ ; "\" escapes.
 */
export interface Run {
  t: string;
  b?: boolean;
  i?: boolean;
  u?: boolean;
  s?: boolean;
}
export type BlockKind = 'p' | 'h1' | 'h2' | 'ul' | 'ol';
export interface Block {
  k: BlockKind;
  runs: Run[];
}

const FLAGS = ['b', 'i', 'u', 's'] as const;
const MARK: Record<(typeof FLAGS)[number], string> = { b: '*', i: '_', u: '^', s: '~' };
const UNMARK: Record<string, (typeof FLAGS)[number]> = { '*': 'b', _: 'i', '^': 'u', '~': 's' };
const PREFIX: Record<BlockKind, string> = { p: '', h1: '# ', h2: '## ', ul: '- ', ol: '+ ' };
const SPECIAL = /[\\*_^~]/g;

export function serializeDoc(blocks: Block[]): string {
  const lines: string[] = [];
  for (const blk of blocks) {
    let out = PREFIX[blk.k];
    const state: Record<string, boolean> = { b: false, i: false, u: false, s: false };
    let first = true;
    for (const run of blk.runs) {
      if (!run.t) continue;
      for (const f of FLAGS) {
        if (!!run[f] !== state[f]) {
          out += MARK[f];
          state[f] = !state[f];
        }
      }
      let text = run.t.replace(SPECIAL, (m) => '\\' + m);
      // A paragraph that would start with a prefix marker must be escaped.
      if (first && blk.k === 'p' && /^(#|- |\+ )/.test(text)) text = '\\' + text;
      first = false;
      out += text;
    }
    // Close open marks so each line is self-contained.
    for (const f of FLAGS) if (state[f]) out += MARK[f];
    lines.push(out);
  }
  // Drop trailing empty paragraphs.
  while (lines.length && lines[lines.length - 1] === '') lines.pop();
  return lines.join('\n');
}

export function parseDoc(text: string): Block[] {
  if (!text) return [{ k: 'p', runs: [] }];
  const blocks: Block[] = [];
  for (const rawLine of text.split('\n')) {
    let line = rawLine;
    let k: BlockKind = 'p';
    if (line.startsWith('## ')) {
      k = 'h2';
      line = line.slice(3);
    } else if (line.startsWith('# ')) {
      k = 'h1';
      line = line.slice(2);
    } else if (line.startsWith('- ')) {
      k = 'ul';
      line = line.slice(2);
    } else if (line.startsWith('+ ')) {
      k = 'ol';
      line = line.slice(2);
    }
    const runs: Run[] = [];
    const state: Record<string, boolean> = { b: false, i: false, u: false, s: false };
    let buf = '';
    const flush = () => {
      if (!buf) return;
      const run: Run = { t: buf };
      for (const f of FLAGS) if (state[f]) run[f] = true;
      runs.push(run);
      buf = '';
    };
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '\\' && i + 1 < line.length) {
        buf += line[++i];
      } else if (UNMARK[ch]) {
        flush();
        state[UNMARK[ch]] = !state[UNMARK[ch]];
      } else {
        buf += ch;
      }
    }
    flush();
    blocks.push({ k, runs });
  }
  return blocks;
}

/** Plain-text length of a document, handy for word/char counts. */
export function docText(blocks: Block[]): string {
  return blocks.map((b) => b.runs.map((r) => r.t).join('')).join('\n');
}
