/**
 * Tracked changes, for any host whose document is written by several people (docs/library.md, Tracked changes and
 * comments for a host): the host gives its versions in order, each with its author, and gets back who put in and who
 * took out each word, and who changed its formatting. Each version is compared with the one before it, block by block
 * (each block by its kind and its words) and, inside a block that changed, word by word. A word put in carries its
 * author and the change that put it in; a word taken out stays, carrying who took it out, so it can be drawn struck
 * through; a word someone put in and then took out again themself, before anyone reviewed it, is simply gone. A
 * change rejected stays in sight as a change of its own (its words struck through as rejected, or words taken out put
 * back as restored), for its author and everyone else to accept: the host says which changes were rejected, and which
 * reviewed, before each version.
 * Formatting is tracked as words are (Paul, 2026-10-16: "When I bold and change formatting you should track that as a
 * change"): a word whose marks change (bold, italic, underline, struck, highlighted, code, a link) and a block whose
 * kind or alignment changes, its words the same, carry who changed them and what they were, to be drawn, accepted or
 * put back; so does a field of the head (the title, the paper). The words are a block's text as the editor counts it
 * (an icon or a footnote mark one character, U+FFFC), so a token's place is a place in the editor (kit/text/text.ts
 * domPoint), where kit/text/redline.ts draws them. Pure: no DOM, nothing kept between calls.
 */
import { parse, write, writeBlock, type Block, type Run } from '../../doc/index.ts';
import { diffLines } from './diff.ts';

export interface Tok {
  t: string;
  /** Who put it in: the version's author, as the host names people (an email). */
  ins?: string;
  /** Who took it out. */
  del?: string;
  /** The change that put it in, and the change that took it out (Change.id). */
  insId?: string;
  delId?: string;
  /** Taken out as a change was rejected (words someone else put in), or put back as one was (words someone else took out). */
  rejected?: true;
  restored?: true;
  /** Its marks, as one string (marksOf); and, its marks changed, who changed them, as which change, from what. */
  m?: string;
  fmt?: string;
  fmtId?: string;
  was?: string;
  /** A restyling beneath this one, made by someone else and still open: kept, so that each is seen and can be rejected. */
  under?: Under;
  /** Put back (`restored`): whose taking out it undid, and as which change, so that rejecting one or both is exact. */
  from?: { del: string; delId?: string; m?: string };
}

/** A restyling with another made over it (a word's marks, a block's kind or look, a setting): who, which change, from what. */
export interface Under {
  fmt: string;
  fmtId: string;
  was?: string;
  wasKind?: string;
  wasLook?: string;
  rejected?: true;
  under?: Under;
}
/** A token's, a block's or a setting's restylings, the latest first, each with what it was and what it made. */
export function restylings(x: { fmt?: string; fmtId?: string; was?: string; wasKind?: string; wasLook?: string; rejected?: true; under?: Under }): Under[] {
  const out: Under[] = [];
  let at: Under | undefined = x.fmtId && x.fmt ? { fmt: x.fmt, fmtId: x.fmtId, was: x.was, wasKind: x.wasKind, wasLook: x.wasLook, rejected: x.rejected, under: x.under } : undefined;
  while (at) (out.push(at), (at = at.under));
  return out;
}
/** The restyling now on top taken off, the one beneath (if any) on top again. */
function popped<T extends { fmt?: string; fmtId?: string; was?: string; wasKind?: string; wasLook?: string; rejected?: true; under?: Under }>(x: T): T {
  const { fmt: _f, fmtId: _i, was: _w, wasKind: _k, wasLook: _l, rejected: _r, under, ...rest } = x;
  return (under ? { ...rest, fmt: under.fmt, fmtId: under.fmtId, was: under.was, wasKind: under.wasKind, wasLook: under.wasLook, rejected: under.rejected, under: under.under } : rest) as T;
}
/** What lies beneath a new restyling: the one there now, if any. */
const beneath = (x: { fmt?: string; fmtId?: string; was?: string; wasKind?: string; wasLook?: string; rejected?: true; under?: Under }): Under | undefined => restylings(x)[0];
export interface Tracked {
  /** The block's kind ("p", "h2", "li0", "fence:sheet"): blocks of different kinds are different blocks. */
  kind: string;
  toks: Tok[];
  /** The whole block was put in, or taken out, by this person, as this change. */
  ins?: string;
  del?: string;
  insId?: string;
  delId?: string;
  /** Taken out as a change was rejected (a block someone else put in). */
  rejected?: true;
  /** A restyling beneath this block's, by someone else, still open (Under). */
  under?: Under;
  /** A card (a table, another document, a rule): its source as written, and as it was before the changes open on it. */
  src?: string;
  wasSrc?: string;
  /** Everything about it but its kind and its words (lookOf): its look, beside its kind. */
  look?: string;
  /** Its kind or look changed, its words the same: by whom, as which change, from what. */
  fmt?: string;
  fmtId?: string;
  wasKind?: string;
  wasLook?: string;
}

/**
 * The marks a run carries, as one string: the letters of its marks in order, and its link after a ">" ("bi>https://…");
 * an icon or a footnote, what it is ("!ic:star", "!fn:the note's words"), so a note rewritten is a change too.
 */
export function marksOf(r: Run): string {
  if (r.ic) return `!ic:${r.ic}`;
  if (r.fn !== undefined) return `!fn:${r.fn}`;
  const letters = (['b', 'i', 'u', 's', 'h', 'c'] as const).filter((k) => r[k]).join('');
  return r.href ? `${letters}>${r.href}` : letters;
}
/** Words with the marks a string of marksOf's names (an icon or a footnote, itself). */
export function runOf(t: string, sig = ''): Run {
  if (sig.startsWith('!ic:')) return { t: '', ic: sig.slice(4) };
  if (sig.startsWith('!fn:')) return { t: '', fn: sig.slice(4) };
  const [letters, href] = sig.split('>');
  const r: Run = { t };
  for (const k of ['b', 'i', 'u', 's', 'h', 'c'] as const) if (letters.includes(k)) r[k] = true;
  if (href) r.href = href;
  return r;
}
/** What changed between two strings of marks: "+b" for bold put on, "-i" for italic taken off, "+a" and "-a" for a link. */
function styleDiff(was = '', now = ''): string[] {
  if (was.startsWith('!fn:') || now.startsWith('!fn:')) return ['note'];
  if (was.startsWith('!ic:') || now.startsWith('!ic:')) return ['icon'];
  const [a, ha = ''] = was.split('>');
  const [b, hb = ''] = now.split('>');
  const out: string[] = [];
  for (const k of 'biushc') {
    if (b.includes(k) && !a.includes(k)) out.push(`+${k}`);
    if (a.includes(k) && !b.includes(k)) out.push(`-${k}`);
  }
  if (ha !== hb) out.push(hb ? '+a' : '-a');
  return out;
}

/**
 * Everything about a block but its kind and its words, as one string, so that any of it changed is a change: its id,
 * classes (alignment, the title, a rule) and attributes, a task's tick, a table's columns, a connection's direction and
 * label. Read back by lookTo, to put a block back as it was.
 */
export function lookOf(b: Block): string {
  const a = b.a ?? {};
  const parts: string[] = [];
  if (a.id) parts.push(`#${a.id}`);
  // In the order written, so a block put back is written as it was.
  for (const c of a.cls ?? []) parts.push(`.${c}`);
  for (const k of Object.keys(a.kv ?? {})) parts.push(`${k}=${JSON.stringify(a.kv![k])}`);
  if (b.k === 'li' && b.done !== undefined) parts.push(b.done ? '+done' : '+todo');
  if (b.k === 'table') parts.push(`+cols=${JSON.stringify(b.cols)}`);
  if (b.k === 'edge') parts.push(`+dir=${b.dir}`, ...(b.label ? [`+label=${JSON.stringify(b.label)}`] : []));
  return parts.join(' ');
}
/** A block with another look (lookOf's string) put on it: its id, classes and attributes, tick, columns, direction. */
export function lookTo(b: Block, look: string): Block {
  const a: { id?: string; cls?: string[]; kv?: Record<string, string> } = {};
  const out = { ...b } as Block & { done?: boolean; label?: string };
  if (out.k === 'li') delete (out as { done?: boolean }).done;
  for (const part of look.match(/(?:[^\s"]+|"(?:\\.|[^"\\])*")+/g) ?? []) {
    if (part.startsWith('#')) a.id = part.slice(1);
    else if (part.startsWith('.')) (a.cls ??= []).push(part.slice(1));
    else if (part === '+done' || part === '+todo') (out as { done?: boolean }).done = part === '+done';
    else if (part.startsWith('+cols=') && out.k === 'table') out.cols = JSON.parse(part.slice(6));
    else if (part.startsWith('+dir=') && out.k === 'edge') out.dir = part.slice(5) as typeof out.dir;
    else if (part.startsWith('+label=') && out.k === 'edge') out.label = JSON.parse(part.slice(7));
    else if (part.startsWith('+')) continue;
    else if (part.includes('=')) (a.kv ??= {})[part.slice(0, part.indexOf('='))] = JSON.parse(part.slice(part.indexOf('=') + 1));
  }
  if (a.id || a.cls || a.kv) out.a = a;
  else delete out.a;
  return out;
}
/** A block from its source as written (a card's, kept by the tracking): read after a line of words, so a rule ("---") is not taken for a head's opening. */
export const blockFrom = (src: string): Block | undefined => parse(`x\n\n${src}\n`).blocks[1];
/** A block's kind, from kindOf's name, holding these runs. */
export function kindTo(b: Block, kind: string): Block {
  const runs = 'runs' in b ? b.runs : [];
  if (/^h[1-6]$/.test(kind)) return { k: 'h', level: Number(kind[1]) as 1, runs, ...(b.a ? { a: b.a } : {}) };
  if (kind.startsWith('li')) return { k: 'li', depth: parseInt(kind.slice(2)) || 0, ...(kind.endsWith('o') ? { ord: true as const } : {}), runs, ...(b.a ? { a: b.a } : {}) };
  if (kind === 'quote') return { k: 'quote', runs, ...(b.a ? { a: b.a } : {}) };
  if (kind === 'p') return { k: 'p', runs, ...(b.a ? { a: b.a } : {}) };
  return b;
}

/** A document as written, its head's fields in one order: a field's place among them is no part of what it says. */
export const same = (d: { head: Record<string, string>; blocks: Block[] }) =>
  write({
    head: Object.fromEntries(Object.entries(d.head).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))),
    blocks: d.blocks,
  });
/** A head field (the document's title, paper, look…) tracked as an entry of its own: kind "head:<key>", its value its look. */
export const isHead = (b: Tracked) => b.kind.startsWith('head:');
/** The entry that stands for changes no part of the tracking could say where they are: never empty-handed. */
export const OTHER = 'head:~';

const ATOM = '￼';

function kindOf(b: Block): string {
  if (b.k === 'h') return `h${b.level}`;
  if (b.k === 'li') return `li${b.depth}${b.ord ? 'o' : ''}`;
  if (b.k === 'fence') return `fence:${b.lang}`;
  return b.k;
}
/** A block's words as the editor counts them. */
export function textOf(b: Block): string {
  if (b.k === 'h' || b.k === 'p' || b.k === 'li' || b.k === 'quote') return b.runs.map((r) => (r.ic || r.fn !== undefined ? ATOM : r.t)).join('');
  if (b.k === 'fence') return b.body;
  if (b.k === 'table') return [b.cols.map((c) => c.name).join(' | '), ...b.rows.map((r) => r.join(' | '))].join('\n');
  if (b.k === 'edge') return `${b.from} ${b.to}`;
  return '';
}

/** Words, the spaces between them and each mark of punctuation, each a token: "days." is "days" and ".". */
const tokens = (s: string): string[] => s.match(/\s+|[\p{L}\p{N}]+|[^\s\p{L}\p{N}]/gu) ?? [];

/** A block's tokens, each with its marks: a run at a time, so a word bolded is a word with new marks. */
function toksOf(b: Block): Tok[] {
  if (b.k === 'h' || b.k === 'p' || b.k === 'li' || b.k === 'quote')
    return b.runs.flatMap((r) => (r.ic || r.fn !== undefined ? [{ t: ATOM, m: marksOf(r) }] : tokens(r.t).map((t) => ({ t, m: marksOf(r) }))));
  return tokens(textOf(b)).map((t) => ({ t, m: '' }));
}
/** A block as the tracking reads it: its kind, its look, its tokens with their marks, its words. */
const TEXT = /^(p|h[1-6]|li\d+o?|quote)$/;
const readBlock = (b: Block) => ({ kind: kindOf(b), look: lookOf(b), toks: toksOf(b), text: textOf(b), ...(TEXT.test(kindOf(b)) ? {} : { src: writeBlock(b) }) });
type Read = ReturnType<typeof readBlock>;
/** What a block is, to tell it changed: its kind, its look and its words with their marks. */
const keyOf = (kind: string, look: string, toks: readonly Tok[]) => `${kind}\0${look}\0${toks.map((x) => `${x.t}\u0001${x.m ?? ''}`).join('\u0002')}`;

const live = (b: Tracked) => !b.del;
const liveText = (b: Tracked) =>
  b.toks
    .filter((x) => !x.del)
    .map((x) => x.t)
    .join('');

/** A block's tokens brought to `next`'s words and marks, `by` putting in, taking out and restyling; `touch` hears of each. */
function retoken(b: Tracked, next: Read, by: string, mint: () => string, rejected: (id?: string) => boolean, open: (id?: string) => boolean, touch: () => void): Tracked {
  const was = b.toks;
  const alive = was.filter((x) => !x.del);
  const now = next.toks;
  let j = 0; // into `now`
  const out: Tok[] = [];
  let k = 0; // into `was`, so the words already taken out keep their places
  const flushDead = () => {
    while (k < was.length && was[k].del) out.push(was[k++]);
  };
  // A run of words taken out and put in with nothing kept between them is one change ("30" for "45"); and one that
  // touches the same person's change nobody has reviewed yet goes on with it: a stretch of someone's typing, saved at
  // every pause, is one edit.
  let run = '';
  const goesOn = (): string => {
    const prev = out.at(-1);
    if (prev?.del === by && open(prev.delId)) return prev.delId!;
    if (prev && !prev.del && prev.ins === by && open(prev.insId)) return prev.insId!;
    if (prev && !prev.del && prev.fmt === by && open(prev.fmtId)) return prev.fmtId!;
    const after = was.slice(k).find((x) => !x.del);
    if (after?.ins === by && open(after.insId)) return after.insId!;
    if (after?.fmt === by && open(after.fmtId)) return after.fmtId!;
    return '';
  };
  for (const c of diffLines(
    alive.map((x) => x.t),
    now.map((x) => x.t),
  )) {
    if (c.kind === '+') {
      touch();
      run ||= goesOn() || mint();
      const nt = now[j++];
      // Words put back where they were taken out: by whoever took them out, nobody having reviewed it, the taking out
      // undone; by anyone else, or after a review, a change of its own (a deletion rejected), shown as words restored.
      if (k < was.length && was[k].del && was[k].t === nt.t) {
        const { del: who, delId, ...back } = was[k++];
        out.push(who === by && open(delId) ? { ...back, m: nt.m } : { ...back, m: nt.m, ins: by, insId: run, restored: true, from: { del: who!, delId, m: back.m } });
      } else out.push({ t: nt.t, m: nt.m, ins: by, insId: run });
      continue;
    }
    flushDead();
    const tok = was[k++];
    if (c.kind === ' ') {
      const nt = now[j++];
      if ((tok.m ?? '') === (nt.m ?? '')) {
        run = '';
        out.push(tok);
        continue;
      }
      // The same words with other marks: words this person put in and nobody has reviewed are simply restyled; their own
      // restyling goes on (and is gone when the marks are back as they were); anyone else's is a change of its own.
      touch();
      if (tok.ins === by && open(tok.insId)) out.push({ ...tok, m: nt.m });
      else if (tok.fmt === by && open(tok.fmtId)) out.push(nt.m === tok.was ? { ...popped(tok), m: nt.m } : { ...tok, m: nt.m });
      else {
        run ||= goesOn() || mint();
        const { rejected: _r, ...rest } = tok;
        out.push({ ...rest, m: nt.m, fmt: by, fmtId: run, was: tok.m ?? '', under: beneath(tok), ...(rejected(tok.fmtId) ? { rejected: true as const } : {}) });
      }
      continue;
    }
    // Taken out: gone if its own author takes it out again before anyone has reviewed it, else struck through as theirs
    // who took it out (a rejection, where they rejected the change that put it in). Words accepted are anyone's words.
    touch();
    run ||= goesOn() || mint();
    if (tok.ins !== by || !open(tok.insId)) out.push({ ...tok, del: by, delId: run, ...(rejected(tok.insId) ? { rejected: true as const } : {}) });
  }
  flushDead();
  return { ...b, toks: out };
}

/** A block paired with its next self, its words brought along (retoken) and a change of kind or look, the words the same, tracked. */
function restyle(b: Tracked, next: Read, by: string, mint: () => string, rejected: (id?: string) => boolean, open: (id?: string) => boolean, touch: () => void): Tracked {
  const r = retoken(b, next, by, mint, rejected, open, touch);
  const look = next.look;
  if (b.kind === next.kind && (b.look ?? '') === look) return r;
  touch();
  const moved = { ...r, kind: next.kind, look };
  // Their own block, or their own restyling of it, nobody having reviewed it: restyled, or back as it was.
  if (b.ins === by && open(b.insId)) return moved;
  if (b.fmt === by && open(b.fmtId)) return next.kind === b.wasKind && look === (b.wasLook ?? '') ? popped(moved) : moved;
  const { rejected: _r, ...rest } = moved;
  return { ...rest, fmt: by, fmtId: mint(), wasKind: b.kind, wasLook: b.look ?? '', under: beneath(b), ...(rejected(b.fmtId) ? { rejected: true as const } : {}) };
}

/**
 * Every version's blocks, tracked from the first given to the last: the head's fields first, each an entry of its
 * own, then the blocks. `rejectedBy(id, seq)`: whether a change had been rejected before the version numbered `seq` in
 * the host's log (Step's `seq`, its place in the list otherwise); `reviewedBy(id, seq)`: whether anyone had accepted or
 * rejected it by then (a change reviewed is closed: an edit beside it is a change of its own). Neither given, nothing
 * was.
 */
export function track(versions: readonly Step[], rejectedBy: (id: string, seq: number) => boolean = () => false, reviewedBy: (id: string, seq: number) => boolean = () => false): Tracked[] {
  if (!versions.length) return [];
  const first = parse(versions[0].text);
  let doc: Tracked[] = [
    ...Object.entries(first.head).map(([k, value]) => ({ kind: `head:${k}`, look: value, toks: [] })),
    ...first.blocks.map((b) => {
      const r = readBlock(b);
      return { kind: r.kind, look: r.look, toks: r.toks, ...(r.src !== undefined ? { src: r.src } : {}) };
    }),
  ];
  for (const [vi, v] of versions.entries()) if (vi) doc = trackOn(doc, v, vi, rejectedBy, reviewedBy, versions[vi - 1].text);
  return doc;
}

/**
 * A version as the tracking reads it: who wrote it, its TLO text, its hash (which names its changes: "<hash>:0" is the
 * first change it made; its place in the list without one) and its place in the host's log, which `rejectedBy` and
 * `reviewedBy` are asked about.
 */
export interface Step {
  author: string;
  text: string;
  hash?: string;
  seq?: number;
}

/** The tracked blocks taken one version further: the `vi`th, `v`. (The words being typed and not yet saved are a version too.) */
export function trackOn(
  doc: readonly Tracked[],
  v: Step,
  vi: number,
  rejectedBy: (id: string, seq: number) => boolean = () => false,
  reviewedBy: (id: string, seq: number) => boolean = () => false,
  /** The version before, as written: to tell any difference the tracking did not otherwise find. */
  prev?: string,
): Tracked[] {
  const by = v.author;
  // Whether anything this version did was tracked: if not, and the version differs, a change of its own says so.
  let touched = false;
  const touch = () => void (touched = true);
  const heads = doc.filter(isHead);
  doc = doc.filter((b) => !isHead(b));
  // A change still open to going on: nobody had accepted or rejected it before this version.
  const open = (id?: string) => !!id && !reviewedBy(id, v.seq ?? vi);
  // Each change's id: the version that made it, and its place among that version's changes.
  let n = 0;
  const mint = () => `${v.hash ?? vi}:${n++}`;
  const rejected = (id?: string) => !!id && rejectedBy(id, v.seq ?? vi);
  const parsed = parse(v.text);
  const next = parsed.blocks.map(readBlock);
  const alive = doc.filter(live);
  const out: Tracked[] = [];
  let k = 0; // into `doc`
  const flushDead = () => {
    while (k < doc.length && doc[k].del) out.push(doc[k++]);
  };
  // The block diff, with each run of blocks taken out and put in paired off: a pair is one block changed.
  const changes = diffLines(
    alive.map((b) =>
      keyOf(
        b.kind,
        b.look ?? '',
        b.toks.filter((x) => !x.del),
      ),
    ),
    next.map((b) => keyOf(b.kind, b.look, b.toks)),
  );
  let j = 0; // into `next`
  for (let c = 0; c < changes.length;) {
    if (changes[c].kind === ' ') {
      flushDead();
      out.push(doc[k++]);
      j++;
      c++;
      continue;
    }
    // The blocks taken out here, in order, with the blocks taken out before among them as they stand: emitted in that
    // order, each struck or paired as it comes, so nothing taken out moves past anything else taken out.
    const seq: { b: Tracked; dead: boolean }[] = [];
    const come: Read[] = [];
    for (; c < changes.length && changes[c].kind !== ' '; c++) {
      if (changes[c].kind === '-') {
        while (k < doc.length && doc[k].del) seq.push({ b: doc[k++], dead: true });
        seq.push({ b: doc[k++], dead: false });
      } else come.push(next[j++]);
    }
    const gone = seq.filter((x) => !x.dead).map((x) => x.b);
    let si = 0;
    /** Everything in `seq` up to `g` emitted: the dead as they stand, the others struck; `g` itself left to the caller. */
    const reach = (g?: Tracked) => {
      while (si < seq.length) {
        const e = seq[si++];
        if (e.b === g) return;
        if (e.dead) out.push(e.b);
        else strike(e.b);
      }
    };
    // Paired by kind, in order: a heading's change is the heading's, not the paragraph after it. A block taken out is
    // struck through where it was, unless its own author takes out what they alone put in and nobody has reviewed.
    const strike = (g: Tracked) => {
      touch();
      if (g.ins !== by || !open(g.insId)) out.push({ ...g, del: by, delId: mint(), ...(rejected(g.insId) ? { rejected: true as const } : {}) });
    };
    const left = [...gone];
    for (const n of come) {
      // Paired by kind; failing that, by words, the kind changed (a paragraph made a heading).
      let at = left.findIndex((g) => g.kind === n.kind);
      // (between kinds of text alone: a paragraph made a rule is a paragraph taken out and a rule put in).
      if (at < 0 && TEXT.test(n.kind)) at = left.findIndex((g) => TEXT.test(g.kind) && liveText(g) === n.text);
      if (at < 0) {
        // A block put in right after one this person put in, still unreviewed (Enter, and on typing), is the same edit.
        touch();
        const prev = out.at(-1);
        const id = prev && !prev.del && prev.ins === by && open(prev.insId) ? prev.insId! : mint();
        out.push({ kind: n.kind, look: n.look, toks: n.toks.map((x) => ({ ...x, ins: by, insId: id })), ins: by, insId: id, ...(n.src !== undefined ? { src: n.src } : {}) });
        continue;
      }
      const match = left.splice(0, at + 1).pop()!;
      reach(match);
      const next = restyle(match, n, by, mint, rejected, open, touch);
      // A card changed: what it was before the changes open on it is kept, so that rejecting them puts it back whole.
      if (n.src !== undefined) {
        next.src = n.src;
        const pending = [match.fmtId, ...match.toks.flatMap((x) => [x.insId, x.delId, x.fmtId])].some((id) => id && open(id));
        next.wasSrc = pending && match.wasSrc !== undefined ? match.wasSrc : match.src;
      }
      out.push(next);
    }
    reach();
  }
  flushDead();
  // The head's fields, each an entry: a field changed is a change of its value, by whom and from what, as a block's
  // look is (their own, unreviewed, goes on, and is gone when the field is back as it was).
  const fields = new Set([...heads.map((h) => h.kind.slice(5)).filter((k) => k !== '~'), ...Object.keys(parsed.head)]);
  const headsOut: Tracked[] = heads.filter((h) => h.kind === OTHER);
  for (const key of fields) {
    const kind = `head:${key}`;
    const old = heads.find((h) => h.kind === kind);
    const was = old?.look ?? '';
    const now = parsed.head[key] ?? '';
    if (was === now) {
      if (old) headsOut.push(old);
      continue;
    }
    touch();
    if (old?.fmt === by && open(old.fmtId)) {
      if (now === (old.wasLook ?? '')) {
        const back = popped({ ...old, look: now });
        if (now || back.fmtId) headsOut.push(back);
      } else headsOut.push({ ...old, look: now });
    } else headsOut.push({ kind, look: now, toks: [], fmt: by, fmtId: mint(), wasLook: was, under: old ? beneath(old) : undefined, ...(rejected(old?.fmtId) ? { rejected: true as const } : {}) });
  }
  // Nothing found, yet the version is not the one before: a change no part of the tracking can place, said all the same.
  if (!touched && prev !== undefined && same(parse(prev)) !== same(parsed)) headsOut.push({ kind: OTHER, look: '', toks: [], fmt: by, fmtId: mint(), wasLook: '' });
  return [...headsOut, ...out];
}

/** One person's change: words they put in, words they took out, or both at one place. */
export interface Change {
  id: string;
  author: string;
  /** The words put in, and taken out, as they read. */
  put: string;
  took: string;
  /** The words restyled, and how (styleDiff's "+b", "-i"; a block's "kind:p>h2", "look:>center"). */
  styled: string;
  styles: string[];
  /** An edit, a rejection of someone's words put in, words someone took out put back, or a restyling alone. */
  kind: 'edit' | 'rejection' | 'restore' | 'format';
}

/** Every change the tracked blocks hold, in the order they read. */
export function changesOf(doc: readonly Tracked[]): Change[] {
  const out = new Map<string, Change>();
  const how = new Map<string, Set<Change['kind']>>();
  const add = (id: string | undefined, author: string | undefined, kind: 'put' | 'took' | 'styled', t: string, h: Change['kind'] = 'edit', styles: string[] = []) => {
    if (!id || !author) return;
    const c = out.get(id) ?? { id, author, put: '', took: '', styled: '', styles: [], kind: 'edit' };
    c[kind] += t;
    for (const st of styles) if (!c.styles.includes(st)) c.styles.push(st);
    out.set(id, c);
    how.set(id, (how.get(id) ?? new Set()).add(h));
  };
  for (const b of doc) {
    if (isHead(b)) {
      let now = b.look ?? '';
      for (const u of restylings(b)) {
        add(u.fmtId, u.fmt, 'styled', '', u.rejected ? 'rejection' : 'format', [b.kind === OTHER ? 'other' : `${b.kind}:${u.wasLook ?? ''}>${now}`]);
        now = u.wasLook ?? '';
      }
      continue;
    }
    // A block put in or taken out is a change even with no words in it (a rule, an empty line).
    // (A block put in stays its author's change though someone else has since taken it out.)
    if (b.insId && b.ins) add(b.insId, b.ins, 'put', '', 'edit', [`+block:${b.kind}`]);
    if (b.delId && b.del) add(b.delId, b.del, 'took', '', b.rejected ? 'rejection' : 'edit', [`-block:${b.kind}`]);
    if (b.fmtId) {
      let kind = b.kind;
      let look = b.look ?? '';
      for (const u of restylings(b)) {
        const styles = [...(u.wasKind !== kind ? [`kind:${u.wasKind}>${kind}`] : []), ...((u.wasLook ?? '') !== look ? [`look:${u.wasLook ?? ''}>${look}`] : [])];
        add(u.fmtId, u.fmt, 'styled', liveText(b), u.rejected ? 'rejection' : 'format', styles);
        kind = u.wasKind ?? kind;
        look = u.wasLook ?? '';
      }
    }
    for (const tok of b.toks) {
      if (tok.fmtId && !tok.del) {
        let now = tok.m ?? '';
        for (const u of restylings(tok)) {
          add(u.fmtId, u.fmt, 'styled', tok.t, u.rejected ? 'rejection' : 'format', styleDiff(u.was, now));
          now = u.was ?? '';
        }
      }
      // Words put in stay their author's change even when someone else has since taken them out.
      add(tok.insId, tok.ins, 'put', tok.t, tok.restored ? 'restore' : 'edit');
      // The taking out a restoring undid stays its author's change.
      if (tok.from?.delId) add(tok.from.delId, tok.from.del, 'took', tok.t);
      if (tok.delId) add(tok.delId, tok.del, 'took', tok.t, tok.rejected ? 'rejection' : 'edit');
      else if (b.delId) add(b.delId, b.del, 'took', tok.t);
    }
  }
  // What each change is, all told: a rejection, a restoring, a restyling and nothing else, or an edit.
  for (const c of out.values()) {
    const h = how.get(c.id)!;
    const blocks = c.styles.some((x) => x.startsWith('+block:') || x.startsWith('-block:'));
    c.kind = h.has('rejection') ? 'rejection' : h.has('restore') ? 'restore' : !c.put && !c.took && !blocks ? 'format' : 'edit';
  }
  return [...out.values()];
}
