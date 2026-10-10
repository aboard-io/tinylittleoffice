/**
 * The rules of the code, read from the code (directive r9-lints): the pure readers test/lints.test.ts holds
 * the tree to, each run over a tiny bad file in test/fixtures/lints too, so a lint that stops catching is seen.
 *
 *   bareWords(source)    the words a person would read in an html`` or svg`` template that are not through t()
 *   importsOf(source)    a module's imports: static, type-only or lazy
 *   graphProblems(mods)  the module graph's cycles and the edges its layers forbid
 *
 * Nothing here ships: it is read by the tests alone (test/dist-dev-only.test.ts holds the built site to that).
 */
import { createScanner, SyntaxKind as K, computeLineStarts } from 'typescript/unstable/ast';

/* ---------- The templates ---------- */

/** A tagged template's static parts, each with the offset of its first character in the source. */
export interface Template {
  tag: string;
  parts: { text: string; at: number }[];
}

/** After these a `/` divides; after anything else it starts a regular expression. */
const ENDS = new Set([K.Identifier, K.NumericLiteral, K.BigIntLiteral, K.StringLiteral, K.NoSubstitutionTemplateLiteral, K.TemplateTail, K.CloseParenToken, K.CloseBracketToken, K.CloseBraceToken, K.ThisKeyword, K.SuperKeyword, K.TrueKeyword, K.FalseKeyword, K.NullKeyword]);

export interface Token {
  k: K;
  /** As written. */
  text: string;
  /** A string's or a template part's value, unquoted. */
  value: string;
  start: number;
  /** A template part: the index of its template's first token (a NoSubstitutionTemplateLiteral or a TemplateHead). */
  tpl?: number;
}

/**
 * A source's tokens, read with the TypeScript compiler's own scanner. The scanner reads one token without
 * knowing what came before, so two things are told it here: a `/` where an expression starts is a regular
 * expression's, and a `}` that closes a template's hole goes back into the template. With those, a backtick or
 * a word in a string, a comment or a regular expression is never taken for code.
 */
export function tokensOf(source: string): Token[] {
  const s = createScanner(true, undefined, source);
  const out: Token[] = [];
  const stack: (number | null)[] = [];
  let prev = K.Unknown;
  for (let k = s.scan(); k !== K.EndOfFile; k = s.scan()) {
    let tpl: number | undefined;
    if ((k === K.SlashToken || k === K.SlashEqualsToken) && !ENDS.has(prev)) k = s.reScanSlashToken();
    if (k === K.CloseBraceToken && stack.length) {
      const open = stack.pop()!;
      if (open !== null) {
        k = s.reScanTemplateToken(false);
        tpl = open;
        if (k === K.TemplateMiddle) stack.push(open);
      }
    } else if (k === K.OpenBraceToken) stack.push(null);
    else if (k === K.NoSubstitutionTemplateLiteral || k === K.TemplateHead) {
      tpl = out.length;
      if (k === K.TemplateHead) stack.push(out.length);
    }
    out.push({ k, text: s.getTokenText(), value: s.getTokenValue(), start: s.getTokenStart(), tpl });
    prev = k;
  }
  return out;
}

/** The line (from 1) of an offset in a source. */
function liner(source: string): (at: number) => number {
  const lines = computeLineStarts(source);
  return (at) => {
    let lo = 0;
    let hi = lines.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (lines[mid] <= at) lo = mid;
      else hi = mid - 1;
    }
    return lo + 1;
  };
}

/** Every template literal in a source, with the identifier before it (its tag) or '' untagged, and its static parts. */
export function templatesOf(source: string): Template[] {
  const toks = tokensOf(source);
  const byStart = new Map<number, Template>();
  const out: Template[] = [];
  toks.forEach((t, i) => {
    if (t.tpl === undefined) return;
    // A part as written, less its backtick or `}` before and its `${` or backtick after.
    const part = { text: t.text.slice(1, t.k === K.TemplateHead || t.k === K.TemplateMiddle ? -2 : -1), at: t.start + 1 };
    if (t.tpl === i) {
      const before = toks[i - 1];
      const tpl: Template = { tag: before?.k === K.Identifier ? before.text : '', parts: [part] };
      byStart.set(i, tpl);
      out.push(tpl);
    } else byStart.get(t.tpl)!.parts.push(part);
  });
  return out;
}

/* ---------- Bare words ---------- */

/** The attributes a person reads (or hears read): every other attribute's value is the code's. */
export const READ_ATTRS = new Set(['title', 'alt', 'placeholder', 'label', 'heading', 'aria-label', 'aria-description', 'aria-roledescription', 'aria-placeholder', 'aria-valuetext']);

/** Words that are a word in no language: a file format's name, written so in every language (the Share dialog's QR code's PNG and SVG). Kept short. */
export const NOT_WORDS = new Set<string>(['PNG', 'SVG']);

/** Exact phrases allowed as they are, each with its reason. Kept short. */
export const ALLOWED: Record<string, string> = {
  'https://': 'the start of a web address, the link field’s placeholder: the same in every language',
  'mastodon.social': 'a Mastodon server’s address, the example in the field that asks for yours: a name, not words',
};

export interface Bare {
  line: number;
  words: string;
}

const HOLE = '\u0001';

/** The words of a piece of markup a person would read: letters outside holes and entities, trimmed. */
function wordsIn(text: string): string | null {
  const plain = text.replace(/&[#\w]+;/g, ' ');
  const words = plain.match(/\p{L}+/gu)?.filter((w) => !NOT_WORDS.has(w));
  if (!words?.length) return null;
  const phrase = plain.split(HOLE).map((p) => p.replace(/\s+/g, ' ').trim()).filter((p) => /\p{L}/u.test(p)).join(' … ');
  return ALLOWED[phrase] !== undefined ? null : phrase;
}

/**
 * The bare words of a source: in every html`` and svg`` template, the text between tags and the values of the
 * attributes a person reads (READ_ATTRS), outside `${…}`, comments, <style> and entities. A word through t() is
 * in a hole, so what is left is a word nobody can translate.
 */
export function bareWords(source: string): Bare[] {
  const lineOf = liner(source);
  const out: Bare[] = [];
  for (const tpl of templatesOf(source)) {
    if (tpl.tag !== 'html' && tpl.tag !== 'svg') continue;
    let src = '';
    const at: number[] = [];
    tpl.parts.forEach((p, i) => {
      if (i) {
        src += HOLE;
        at.push(p.at);
      }
      src += p.text;
      for (let j = 0; j < p.text.length; j++) at.push(p.at + j);
    });
    const say = (from: number, to: number) => {
      const words = wordsIn(src.slice(from, to));
      if (words) out.push({ line: lineOf(at[Math.min(from + src.slice(from, to).search(/\p{L}/u), at.length - 1)]), words });
    };
    let i = 0;
    while (i < src.length) {
      const lt = src.indexOf('<', i);
      const end = lt < 0 ? src.length : lt;
      say(i, end);
      if (lt < 0) break;
      if (src.startsWith('<!--', lt)) {
        const close = src.indexOf('-->', lt + 4);
        i = close < 0 ? src.length : close + 3;
        continue;
      }
      if (!/[a-zA-Z/]/.test(src[lt + 1] ?? '')) {
        // A "<" that opens no tag is a word's.
        say(lt, lt + 1);
        i = lt + 1;
        continue;
      }
      // A tag: its name, then its attributes.
      const name = /^<\/?([^\s/>]*)/.exec(src.slice(lt))!;
      let j = lt + name[0].length;
      for (;;) {
        while (j < src.length && /[\s/]/.test(src[j])) j++;
        if (j >= src.length || src[j] === '>') break;
        const attr = /^[^\s=>/]+/.exec(src.slice(j));
        if (!attr) {
          j++;
          continue;
        }
        j += attr[0].length;
        while (/\s/.test(src[j] ?? '')) j++;
        if (src[j] !== '=') continue;
        j++;
        while (/\s/.test(src[j] ?? '')) j++;
        const q = src[j];
        let from: number;
        let to: number;
        if (q === '"' || q === "'") {
          from = j + 1;
          to = src.indexOf(q, from);
          if (to < 0) to = src.length;
          j = to + 1;
        } else {
          from = j;
          while (j < src.length && !/[\s>]/.test(src[j])) j++;
          to = j;
        }
        if (READ_ATTRS.has(attr[0].toLowerCase())) say(from, to);
      }
      i = j + 1;
      const tag = name[1].toLowerCase();
      if (tag === 'style' || tag === 'script') {
        const close = src.indexOf(`</${tag}`, i);
        i = close < 0 ? src.length : close;
      }
    }
  }
  return out;
}

/* ---------- The module graph ---------- */

export interface Import {
  /** The specifier as written. */
  spec: string;
  /** `import type`, `export type`: gone from the built code. */
  type: boolean;
  /** `import('…')`: a chunk loaded when asked for. */
  lazy: boolean;
}

/** A module's imports and re-exports, read from its tokens (so a word "import" in a string, a comment or a template is not one). */
export function importsOf(source: string): Import[] {
  const toks = tokensOf(source).filter((t) => t.tpl === undefined || t.k === K.NoSubstitutionTemplateLiteral || t.k === K.TemplateHead);
  const out: Import[] = [];
  /** From token i, the module named after the next `from` before a `;`, or none (`export const …`). */
  const from = (i: number, type: boolean) => {
    for (; i < toks.length && toks[i].k !== K.SemicolonToken; i++) {
      if (toks[i].k === K.FromKeyword && toks[i + 1]?.k === K.StringLiteral) {
        out.push({ spec: toks[i + 1].value, type, lazy: false });
        return;
      }
    }
  };
  toks.forEach((t, i) => {
    const [a, b] = [toks[i + 1], toks[i + 2]];
    if (toks[i - 1]?.k === K.DotToken) return;
    if (t.k === K.ImportKeyword) {
      if (a?.k === K.OpenParenToken && b?.k === K.StringLiteral) out.push({ spec: b.value, type: false, lazy: true });
      else if (a?.k === K.StringLiteral) out.push({ spec: a.value, type: false, lazy: false });
      // `import type X from`, `import type { … } from`; but `import type from '…'` imports a binding named "type".
      else if (a && a.k !== K.DotToken && a.k !== K.OpenParenToken) from(i + 1, a.k === K.TypeKeyword && b?.k !== K.FromKeyword && b?.k !== K.CommaToken);
    } else if (t.k === K.ExportKeyword) {
      const type = a?.k === K.TypeKeyword;
      const open = type ? b : a;
      if (open?.k === K.OpenBraceToken || open?.k === K.AsteriskToken) from(i + 1, type);
    }
  });
  return out;
}

export interface Module {
  /** Its path from the root, forward slashes: "src/kit/app.ts". */
  path: string;
  source: string;
}

/** A module's imports of other modules of the tree, resolved to their paths ("../doc/index.ts" from src/kit/x.ts is src/doc/index.ts). */
export function edgesOf(m: Module): (Import & { to: string })[] {
  const dir = m.path.split('/').slice(0, -1);
  return importsOf(m.source)
    .filter((i) => i.spec.startsWith('.'))
    .map((i) => {
      const parts = [...dir];
      for (const p of i.spec.split('/')) {
        if (p === '..') parts.pop();
        else if (p !== '.') parts.push(p);
      }
      return { ...i, to: parts.join('/') };
    });
}

const appOfPath = (p: string) => /^src\/apps\/([^/]+)\//.exec(p)?.[1];

/**
 * The layers' rules, each a sentence the failure prints with the edge that breaks it:
 *   - no cycle among the modules' static imports (a type import is gone from the code; a lazy one is a chunk's door);
 *   - an app imports no other app (what two apps share lives in the kit or the kernel);
 *   - the kit imports the apps only in kit/apps.ts, the registry;
 *   - the kernel (src/doc) imports nothing of the kit or the apps;
 *   - a language (src/i18n) is loaded only by kit/i18n.ts, lazily.
 * `shared` names the app modules another app may still import, each with its reason (see SHARED below).
 */
export function graphProblems(mods: Module[], shared: Record<string, string> = {}): string[] {
  const problems: string[] = [];
  const graph = new Map<string, string[]>();
  for (const m of mods) {
    const edges = edgesOf(m);
    graph.set(m.path, edges.filter((e) => !e.type && !e.lazy && e.to.endsWith('.ts')).map((e) => e.to));
    for (const e of edges) {
      const edge = `${m.path} → ${e.to}`;
      const [from, to] = [appOfPath(m.path), appOfPath(e.to)];
      if (from && to && from !== to && !(e.to in shared)) problems.push(`an app imports another app: ${edge}`);
      if (m.path.startsWith('src/kit/') && e.to.startsWith('src/apps/') && m.path !== 'src/kit/apps.ts') problems.push(`the kit imports an app outside kit/apps.ts: ${edge}`);
      if (m.path.startsWith('src/doc/') && /^src\/(kit|apps)\//.test(e.to)) problems.push(`the kernel imports the kit or an app: ${edge}`);
      if (e.to.startsWith('src/i18n/') && !(m.path === 'src/kit/i18n.ts' && e.lazy) && !m.path.startsWith('src/i18n/')) problems.push(`a language is imported outside kit/i18n.ts’s lazy load: ${edge}`);
    }
  }
  for (const cycle of cyclesOf(graph)) problems.push(`an import cycle: ${[...cycle, cycle[0]].join(' → ')}`);
  return problems;
}

/** Each strongly connected group of more than one module (Tarjan's), as one cycle through it found by a walk. */
export function cyclesOf(graph: Map<string, string[]>): string[][] {
  let n = 0;
  const index = new Map<string, number>();
  const low = new Map<string, number>();
  const stack: string[] = [];
  const on = new Set<string>();
  const groups: string[][] = [];
  const visit = (v: string) => {
    index.set(v, n);
    low.set(v, n++);
    stack.push(v);
    on.add(v);
    for (const w of graph.get(v) ?? []) {
      if (!index.has(w)) {
        visit(w);
        low.set(v, Math.min(low.get(v)!, low.get(w)!));
      } else if (on.has(w)) low.set(v, Math.min(low.get(v)!, index.get(w)!));
    }
    if (low.get(v) === index.get(v)) {
      const group: string[] = [];
      let w: string;
      do {
        w = stack.pop()!;
        on.delete(w);
        group.push(w);
      } while (w !== v);
      if (group.length > 1) groups.push(group);
    }
  };
  for (const v of [...graph.keys()].sort()) if (!index.has(v)) visit(v);
  // One cycle through each group: from its first module, the shortest way back to it within the group.
  return groups.map((g) => {
    const inGroup = new Set(g);
    const start = [...g].sort()[0];
    const back = new Map<string, string>();
    const queue = [start];
    for (let i = 0; i < queue.length; i++) {
      for (const w of graph.get(queue[i]) ?? []) {
        if (!inGroup.has(w)) continue;
        if (w === start) {
          const path = [queue[i]];
          while (path[0] !== start) path.unshift(back.get(path[0])!);
          return path;
        }
        if (!back.has(w)) {
          back.set(w, queue[i]);
          queue.push(w);
        }
      }
    }
    return g;
  });
}

/* ---------- The kernel holds no DOM ---------- */

export const DOM_NAMES = new Set(['window', 'document', 'navigator', 'localStorage']);

/** The lines of a source that name the browser's globals (not as a property, `x.document`, or as a key, `{ document: … }`). */
export function domNames(source: string): Bare[] {
  const lineOf = liner(source);
  const toks = tokensOf(source);
  return toks
    .filter((t, i) => t.k === K.Identifier && DOM_NAMES.has(t.text) && toks[i - 1]?.k !== K.DotToken && toks[i - 1]?.k !== K.QuestionDotToken && !(toks[i + 1]?.k === K.ColonToken && (toks[i - 1]?.k === K.OpenBraceToken || toks[i - 1]?.k === K.CommaToken)))
    .map((t) => ({ line: lineOf(t.start), words: t.text }));
}
