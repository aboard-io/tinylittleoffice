/**
 * Rich text model and a compact markup for it.
 *
 * Blocks: one per line.  Prefixes:  "# " h1, "## " h2, "- " bullet, "+ " numbered.
 * A list item one level in repeats its marker ("-- ", "++ "), up to MAX_DEPTH levels.
 * Inline: toggles  *bold*  _italic_  ^underline^  ~strike~  =highlight= ; an icon
 * is its name between colons, ":rocket:"; "\" escapes. A block may start with
 * ">c ", ">r " or ">j " to be centred, right-aligned or justified.
 * Embed: a line "@@<app>/<payload>" is another TinyLittleOffice document, shown as
 * a preview that links to it (see lib/embed.ts).
 */
export interface Run {
  t: string;
  b?: boolean;
  i?: boolean;
  u?: boolean;
  s?: boolean;
  /** Highlighted, in yellow. */
  h?: boolean;
  /** An icon, by name, in the line of text (t is then ''). */
  ic?: string;
}
export type Align = 'c' | 'r' | 'j';
export type BlockKind = 'p' | 'h1' | 'h2' | 'ul' | 'ol' | 'e';
export interface Block {
  k: BlockKind;
  runs: Run[];
  /** For an embed ("e"): the document it points at, as "<app>/<payload>". */
  ref?: string;
  /** For list items: how far in, 0 (absent) for the outer level. */
  d?: number;
  /** Centred, right-aligned or justified; absent for the usual left. */
  a?: Align;
}

export const MAX_DEPTH = 3;

const EMBED = /^@@([a-z]+\/[A-Za-z0-9_-]*)$/;

const FLAGS = ['b', 'i', 'u', 's', 'h'] as const;
const MARK: Record<(typeof FLAGS)[number], string> = { b: '*', i: '_', u: '^', s: '~', h: '=' };
const UNMARK: Record<string, (typeof FLAGS)[number]> = { '*': 'b', _: 'i', '^': 'u', '~': 's', '=': 'h' };
const ALIGN = /^>([crj]) /;
const ICON = /^:([a-z][a-z0-9-]*):/;
const PREFIX: Record<BlockKind, string> = { p: '', h1: '# ', h2: '## ', ul: '- ', ol: '+ ', e: '@@' };
const SPECIAL = /[\\*_^~=]/g;

export function serializeDoc(blocks: Block[]): string {
  const lines: string[] = [];
  for (const blk of blocks) {
    if (blk.k === 'e') {
      if (blk.ref && EMBED.test('@@' + blk.ref)) lines.push('@@' + blk.ref);
      continue;
    }
    let out = (blk.a ? `>${blk.a} ` : '') + (blk.k === 'ul' || blk.k === 'ol' ? PREFIX[blk.k][0].repeat(1 + Math.min(MAX_DEPTH, blk.d ?? 0)) + ' ' : PREFIX[blk.k]);
    out += serializeInline(blk.runs, blk.k === 'p' || !!blk.a);
    lines.push(out);
  }
  // Drop trailing empty paragraphs.
  while (lines.length && lines[lines.length - 1] === '') lines.pop();
  return lines.join('\n');
}

/** Runs as one line of marks. With `bare`, a line that would read as a block prefix is escaped. */
export function serializeInline(runs: Run[], bare = false): string {
  let out = '';
  {
    const state: Record<string, boolean> = { b: false, i: false, u: false, s: false, h: false };
    let first = true;
    for (const run of runs) {
      if (run.ic) {
        out += `:${run.ic}:`;
        first = false;
        continue;
      }
      if (!run.t) continue;
      for (const f of FLAGS) {
        if (!!run[f] !== state[f]) {
          out += MARK[f];
          state[f] = !state[f];
        }
      }
      // (":name:" would read as an icon, so a colon that starts one is escaped.)
      // (A web address is read whole, so nothing inside it needs escaping.)
      let text = run.t
        .split(/((?:^|(?<=[\s(]))(?:https?:\/\/|mailto:)\S+)/)
        .map((part, n) => (n % 2 ? part : part.replace(SPECIAL, (m) => '\\' + m).replace(/:(?=[a-z][a-z0-9-]*:)/g, '\\:')))
        .join('');
      // A paragraph that would start with a prefix marker must be escaped.
      if (first && bare && /^(#|-+ |\++ |@@|>[crj] )/.test(text)) text = '\\' + text;
      first = false;
      out += text;
    }
    // Close open marks so each line is self-contained.
    for (const f of FLAGS) if (state[f]) out += MARK[f];
  }
  return out;
}

/** One line's marks ( *bold* _italic_ ^underline^ ~strike~ ) as runs. */
export function parseInline(line: string): Run[] {
  const runs: Run[] = [];
  const state: Record<string, boolean> = { b: false, i: false, u: false, s: false, h: false };
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
    const icon = ch === ':' ? ICON.exec(line.slice(i)) : null;
    // A web address is taken whole: the marks inside it (an "=" in its query, an "_" in its path) are its own.
    const url = (ch === 'h' || ch === 'm') && (i === 0 || /\s|\(/.test(line[i - 1])) ? /^(?:https?:\/\/|mailto:)\S+/.exec(line.slice(i)) : null;
    if (ch === '\\' && i + 1 < line.length) buf += line[++i];
    else if (url) {
      buf += url[0].replace(/[.,;:!?)]+$/, (tail) => ((i += -tail.length), ''));
      i += url[0].length - 1;
    } else if (icon) {
      flush();
      runs.push({ t: '', ic: icon[1] });
      i += icon[0].length - 1;
    } else if (UNMARK[ch]) {
      flush();
      state[UNMARK[ch]] = !state[UNMARK[ch]];
    } else buf += ch;
  }
  flush();
  return runs;
}

/** The marks as words: what a line says, without them. */
export const plainInline = (line: string) => parseInline(line).map((r) => r.t).join('');
export const ALIGN_NAMES: Record<Align, string> = { c: 'center', r: 'right', j: 'justify' };

/**
 * Toggle a mark on a stretch of a line: "*" round "word" makes it bold;
 * round "*word*" takes the bold off. Returns the new line and where the
 * stretch now sits.
 */
export function toggleMark(line: string, from: number, to: number, mark: string): { line: string; from: number; to: number } {
  const inner = line.slice(from, to);
  if (inner.startsWith(mark) && inner.endsWith(mark) && inner.length >= 2) return { line: line.slice(0, from) + inner.slice(1, -1) + line.slice(to), from, to: to - 2 };
  if (line[from - 1] === mark && line[to] === mark) return { line: line.slice(0, from - 1) + inner + line.slice(to + 1), from: from - 1, to: to - 1 };
  return { line: line.slice(0, from) + mark + inner + mark + line.slice(to), from: from + 1, to: to + 1 };
}

export function parseDoc(text: string): Block[] {
  if (!text) return [{ k: 'p', runs: [] }];
  const blocks: Block[] = [];
  for (const rawLine of text.split('\n')) {
    let line = rawLine;
    const embed = EMBED.exec(line);
    if (embed) {
      blocks.push({ k: 'e', runs: [], ref: embed[1] });
      continue;
    }
    let k: BlockKind = 'p';
    let d = 0;
    const align = ALIGN.exec(line);
    if (align) line = line.slice(align[0].length);
    const item = /^(-{1,4}|\+{1,4}) /.exec(line);
    if (line.startsWith('## ')) {
      k = 'h2';
      line = line.slice(3);
    } else if (line.startsWith('# ')) {
      k = 'h1';
      line = line.slice(2);
    } else if (item) {
      k = item[1][0] === '-' ? 'ul' : 'ol';
      d = item[1].length - 1;
      line = line.slice(item[0].length);
    }
    const runs = parseInline(line);
    const blk: Block = d ? { k, runs, d } : { k, runs };
    if (align) blk.a = align[1] as Align;
    blocks.push(blk);
  }
  return blocks;
}

/** Plain-text length of a document, handy for word/char counts. */
export function docText(blocks: Block[]): string {
  return blocks.map((b) => b.runs.map((r) => r.t).join('')).join('\n');
}

/**
 * Web addresses in a piece of text. Nothing is stored for a link: an address
 * in the text is a link wherever the text is shown.
 */
export function linkify(text: string): { t: string; url?: string }[] {
  const out: { t: string; url?: string }[] = [];
  let last = 0;
  for (const m of text.matchAll(/https?:\/\/[^\s<>"']+/g)) {
    // Punctuation after an address belongs to the sentence, not the address.
    const url = m[0].replace(/[.,;:!?)\]]+$/, '');
    if (url.length < 10) continue;
    if (m.index > last) out.push({ t: text.slice(last, m.index) });
    out.push({ t: url, url });
    last = m.index + url.length;
  }
  if (last < text.length) out.push({ t: text.slice(last) });
  return out;
}
