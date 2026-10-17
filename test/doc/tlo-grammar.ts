/**
 * TLO's grammar, written down once, and the generators the properties are
 * fuzzed from (test/doc/properties.test.ts, test/browser/paste-properties.test.ts,
 * scripts/dictionary.ts). Dev only: nothing here ships; the parser in
 * src/doc/tlo.ts is not generated from it. The grammar documents the parser,
 * and where the two disagree the property that finds it fails, naming the
 * text; docs/kernel.md (§2, "Grammar the kernel must preserve") decides which
 * one is wrong.
 *
 * Two generators, one for each side of the format:
 *
 *   textOf(rule)    texts from the EBNF below, lenient forms and all: the
 *                   reader must take any of them, and what the writer gives
 *                   back is canonical (a fixpoint).
 *   arbitraryDoc()  models of the kernel (src/doc/model.ts) as far as the
 *                   format can say them: parse(write(d)) is d. What the
 *                   format cannot say is listed in `sayable`, one rule a
 *                   line, and the generator keeps to it. With `edges`, it
 *                   breaks the first rule as an editor would before the
 *                   format has its say: marks and links on the spaces at a
 *                   run's ends, on spaces alone and on a line break; the
 *                   format lets them go (`sayableRuns`), and so does the
 *                   editor as it edits (kit/text/textops.ts `settle`).
 *
 * Both are biased to the hard cases: marks at a block's edges, attributes
 * that look like words, "\{", "~~" beside a link, empty cells, items nested
 * deep, icons and emoji in names, right-to-left words, and spaces at a line's
 * ends and empty lines in a block (a space before "{.right}", an item whose
 * words are one space, a cell of spaces, a break at a paragraph's end).
 */
import fc from 'fast-check';
import { balanceNote, normalRuns, write, writeInline, type Attrs, type Block, type Column, type ColType, type Dir, type Doc, type Run } from '../../src/doc/index.ts';
import { apply as applyOp, runLength, type Op } from '../../src/doc/ops.ts';

/* ---------- the grammar ---------- */

/**
 * TLO as text. ISO 14977 EBNF, read by `readGrammar` below: "=" defines,
 * "|" chooses, "," is optional between terms, [ ] is optional, { } is
 * repeated, ( ) groups, "…" is a literal (JSON's escapes: \n a new line,
 * \\ a backslash, \" a quote, \u0060 a backtick), ? name ? a pool of words in POOLS. The first choice of a
 * rule that recurses is the one that does not, so a deep generation ends.
 */
export const TLO_EBNF = String.raw`
document   = [ head ] , block , { "\n" , block } ;
head       = "---\n" , field , { field } , ( "---\n" | "...\n" ) ;
field      = ? key ? , ": " , ? value ? , "\n" ;

block      = paragraph | heading | items | quote | rule | table | fence | edges ;

paragraph  = [ "\\" ] , line , { "\n" , bline } , [ attrs ] , "\n" | "<br>\n" | "|\n" ;
bline      = line | "\\" ;
heading    = hashes , " " , line , [ attrs ] , [ " " , hashes ] , "\n" ;
hashes     = "#" | "##" | "###" | "####" | "#####" | "######" ;
items      = item , { item } ;
item       = indent , marker , " " , [ task ] , bline , [ attrs ] , "\n" , [ indent , "  " , bline , "\n" ] ;
indent     = "" | "  " | "    " | "      " | "\t" ;
marker     = "-" | "*" | "+" | "1." | "2." | "1)" ;
task       = "[ ] " | "[x] " | "[X] " ;
quote      = ">" , [ " " ] , line , "\n" , { "> " , bline , "\n" | ">\n" } , [ attrs , "\n" ] ;
rule       = ( "---" | "***" | "___" | "- - -" | "-----" ) , [ attrs ] , "\n" ;

table      = [ "| " ] , colhead , { " | " , colhead } , [ " |" ] , "\n" , sep , "\n" , { row , "\n" } , [ attrs , "\n" ] ;
colhead    = ? name ? , [ ":" , coltype ] | ? name ? , ": " , coltype | ? name ? , ":money(" , ? currency ? , ")" ;
coltype    = "text" | "number" | "money" | "percent" | "date" | "time" | "check" | "url" | "rich" | "long" | "icon" | "name" | "option" ;
sep        = "--- | ---" | "| --- | --- |" | ":--- | ---:" | "---|---|---" ;
row        = [ "| " ] , cell , { " | " , cell } , [ " |" ] ;
cell       = "" | ? cell ? | "\\ " , ? cell ? | ? cell ? , "\\ " | "\\ " ;

fence      = ticks , [ ? lang ? ] , [ attrs ] , "\n" , { ? body ? , "\n" } , ticks , "\n" | "~~~" , [ ? lang ? ] , "\n" , { ? body ? , "\n" } , "~~~\n" ;
ticks      = "\u0060\u0060\u0060" | "\u0060\u0060\u0060\u0060" ;
edges      = edge , { edge } ;
edge       = "~ " , ? node ? , " " , dir , " " , ? node ? , [ ": " , ? words ? ] , [ attrs ] , "\n" ;
dir        = "->" | "<-" | "<->" | "--" ;

attrs      = " {" , attr , { " " , attr } , "}" ;
attr       = "#" , ? ident ? | "." , ? ident ? | ? ident ? , "=" , ? ident ? | ? ident ? , "=\"" , ? words ? , "\"" ;

line       = inline , { inline } ;
inline     = ? words ? | " " | escape | ? url ? | icon | marked | link | note ;
marked     = "**" , line , "**" | "*" , line , "*" | "__" , line , "__" | "_" , line , "_" | "~~" , line , "~~" | "==" , line , "==" | "++" , line , "++" | "<u>" , line , "</u>" | "\u0060" , ? words ? , "\u0060" ;
link       = "[" , line , "](" , ( ? href ? | ? page ? ) , ")" ;
icon       = ":" , ? icon ? , ":" ;
note       = "^[" , line , "]" ;
escape     = "\\" , ( "*" | "_" | "{" | "[" | "]" | "#" | "|" | "~" | "=" | ":" | "<" | "^" | "\\" | "\u0060" | " " ) ;
`;

/** The words the grammar's ? name ? terms are drawn from: plain ones, and the ones that have broken something. */
export const POOLS: Record<string, string[]> = {
  key: ['title', 'by', 'chart', 'lock', 'currency', 'zone', 'theme', 'mode', 'kind', 'x-y'],
  value: ['Hello', 'Two words', '"quoted"', 'bar', 'A1:B2', '$', 'Europe/London', 'שלום', '🚀 launch', 'a: b'],
  words: [
    'word',
    'Two words',
    'a',
    'x',
    '5 * 3',
    'snake_case',
    '2*3',
    'key=value',
    '{.cls}',
    '{#id}',
    '\\{',
    '~~',
    '**',
    '==',
    '++',
    '_',
    '*',
    '#',
    '- ',
    '1.',
    '>',
    '|',
    '[',
    ']',
    '(',
    ')',
    '^',
    '`',
    ':',
    ':x',
    '<u>',
    'شكرا',
    'שלום עולם',
    '🚀',
    '👩‍💻',
    '日本語',
    'é',
    '…',
    'a\\',
    'done.',
  ],
  url: ['https://x.y/', 'https://e.com/a_b?q=1&r=_2_', 'http://x.y/a*b*', 'mailto:a@b.c', 'https://x.y/~~s~~'],
  // An address with a pair of brackets in it (Wikipedia's): read whole, written with the brackets escaped.
  page: ['https://en.wikipedia.org/wiki/Grand_Concourse_(Bronx)', 'https://x.y/A_(b)_1.jpg', 'https://www.youtube.com/watch?v=eRVYwDtI2E8'],
  href: ['https://x.y/', 'https://e.com/a_b?q=1', 'mailto:a@b.c', 'tel:+1', '#top', 'https://x.y/a%20b'],
  icon: ['star', 'rocket', 'map-pin', 'x', 'a1'],
  ident: ['a', 'id', 'big', 'x-y', 'due', 'depth', 'chart', 'lock', '2'],
  name: ['Name', 'Qty', 'Price', '# of units', 'Time', '', '🚀 Launch', 'שם', 'a|b', 'Note'],
  currency: ['£', 'GBP', 'R$', 'eur'],
  cell: ['1', '2.5', 'words', '=A1+B1', '=SUM(A1:B3)', 'a \\| b', 'x\\\\y', '1<br>2', '🚀', 'שלום', '| lead', '-', '#'],
  lang: ['sheet', 'Draw', 'js', 'qr', 'notes'],
  body: ['a | b', '--- | ---', '```', '~~~', 'x', '', '# not a heading', '  indented'],
  node: ['A', 'Web', 'Two words', '🚀', 'שלום', '#id', 'a-b'],
};

type Expr = { k: 'lit'; s: string } | { k: 'ref'; name: string } | { k: 'pool'; name: string } | { k: 'seq'; xs: Expr[] } | { k: 'alt'; xs: Expr[] } | { k: 'opt'; x: Expr } | { k: 'rep'; x: Expr };

/** The tiny reader: EBNF text to rules. Throws on anything it does not know, naming where. */
export function readGrammar(src: string): Map<string, Expr> {
  const toks = [...src.matchAll(/\s*(?:("(?:\\.|[^"\\])*")|(\?\s*[\w-]+\s*\?)|([\w-]+)|([=|,[\]{}();]))/gy)];
  if (
    toks
      .map((m) => m[0])
      .join('')
      .trim() !== src.trim()
  )
    throw new Error('grammar: unreadable near ' + JSON.stringify(src.slice(toks.map((m) => m[0]).join('').length, toks.map((m) => m[0]).join('').length + 40)));
  let i = 0;
  const peek = () => toks[i]?.[4] ?? (toks[i] ? 'term' : 'end');
  const want = (c: string) => {
    if (toks[i]?.[4] !== c) throw new Error(`grammar: wanted ${c} at token ${i} (${toks[i]?.[0].trim()})`);
    i++;
  };
  const alt = (): Expr => {
    const xs = [seq()];
    while (peek() === '|') (i++, xs.push(seq()));
    return xs.length === 1 ? xs[0] : { k: 'alt', xs };
  };
  const seq = (): Expr => {
    const xs: Expr[] = [];
    for (;;) {
      const m = toks[i];
      if (!m) break;
      if (m[1]) (xs.push({ k: 'lit', s: JSON.parse(m[1]) as string }), i++);
      else if (m[2]) (xs.push({ k: 'pool', name: m[2].slice(1, -1).trim() }), i++);
      else if (m[3]) (xs.push({ k: 'ref', name: m[3] }), i++);
      else if (m[4] === ',') i++;
      else if (m[4] === '[') (i++, xs.push({ k: 'opt', x: alt() }), want(']'));
      else if (m[4] === '{') (i++, xs.push({ k: 'rep', x: alt() }), want('}'));
      else if (m[4] === '(') (i++, xs.push(alt()), want(')'));
      else break;
    }
    return xs.length === 1 ? xs[0] : { k: 'seq', xs };
  };
  const rules = new Map<string, Expr>();
  while (i < toks.length) {
    const name = toks[i]?.[3];
    if (!name) throw new Error(`grammar: a rule's name wanted at token ${i}`);
    i++;
    want('=');
    rules.set(name, alt());
    want(';');
  }
  for (const e of rules.values()) check(e, rules);
  return rules;
}
function check(e: Expr, rules: Map<string, Expr>): void {
  if (e.k === 'ref' && !rules.has(e.name)) throw new Error(`grammar: no rule ${e.name}`);
  if (e.k === 'pool' && !POOLS[e.name]) throw new Error(`grammar: no pool ${e.name}`);
  if (e.k === 'seq' || e.k === 'alt') e.xs.forEach((x) => check(x, rules));
  if (e.k === 'opt' || e.k === 'rep') check(e.x, rules);
}

export const RULES = readGrammar(TLO_EBNF);

/** Texts of one rule of the grammar (the whole document by default). Depth is bounded: past it, a choice takes its first. */
export function textOf(rule = 'document'): fc.Arbitrary<string> {
  const arbs = fc.letrec<Record<string, string>>((tie) => {
    const out: Record<string, fc.Arbitrary<string>> = {};
    const gen = (e: Expr): fc.Arbitrary<string> => {
      switch (e.k) {
        case 'lit':
          return fc.constant(e.s);
        case 'pool':
          return fc.constantFrom(...POOLS[e.name]);
        case 'ref':
          return tie(e.name);
        case 'seq':
          return fc.tuple(...e.xs.map(gen)).map((xs) => xs.join(''));
        case 'alt':
          return fc.oneof({ depthSize: 'small', maxDepth: 4, depthIdentifier: 'tlo' }, ...e.xs.map(gen));
        case 'opt':
          return fc.option(gen(e.x), { nil: '', depthSize: 'small', maxDepth: 4, depthIdentifier: 'tlo' });
        case 'rep':
          return fc.array(gen(e.x), { maxLength: 3, depthIdentifier: 'tlo' }).map((xs) => xs.join(''));
      }
    };
    for (const [name, e] of RULES) out[name] = gen(e);
    return out;
  });
  return arbs[rule];
}

/* ---------- the model, as far as the format can say it ---------- */

const pick = <T>(xs: readonly T[]) => fc.constantFrom(...xs);
const MARK_KEYS = ['b', 'i', 'u', 's', 'h'] as const;

/** Words for a run: the plain and the hard, now and then with spaces at their ends. */
const word = pick([...POOLS.words.filter((w) => w.trim() === w && w), 'one', 'two', 'three']);
const spaces = pick(['', '', '', ' ', '  ']);
const phrase = fc.tuple(spaces, fc.array(word, { minLength: 1, maxLength: 3 }), spaces).map(([a, ws, z]) => a + ws.join(' ') + z);

/** A run of words with marks, an icon, or a footnote whose words are themselves runs written as inline Markdown. */
export const arbitraryRun = (notes = true): fc.Arbitrary<Run> =>
  fc.oneof(
    {
      weight: 6,
      arbitrary: fc
        .record({ t: phrase, marks: fc.subarray([...MARK_KEYS]), href: fc.option(pick(POOLS.href), { nil: undefined, freq: 4 }) })
        .map(({ t, marks, href }) => Object.assign({ t }, ...marks.map((m) => ({ [m]: true })), href ? { href } : {}) as Run),
    },
    { weight: 2, arbitrary: pick([' ', '  ']).map((t): Run => ({ t })) },
    { weight: 1, arbitrary: pick(POOLS.icon).map((ic): Run => ({ t: '', ic })) },
    ...(notes
      ? [{ weight: 1, arbitrary: fc.array(arbitraryRun(false), { minLength: 0, maxLength: 3 }).map((rs): Run => ({ t: '', fn: balanceNote(writeInline(sayableLine(normalRuns(rs)))) })) }]
      : []),
  );

/** One line of runs (no line break), as the format can say it. */
const arbitraryLine = fc.array(arbitraryRun(), { minLength: 1, maxLength: 5 }).map((rs) => sayableLine(normalRuns(rs)));
/** Lines of runs joined by '\n', some of them empty (a break at a block's end, two breaks). */
const arbitraryLines = (max: number) =>
  fc
    .array(fc.oneof({ weight: 4, arbitrary: arbitraryLine }, { weight: 1, arbitrary: fc.constant<Run[]>([]) }), { minLength: 1, maxLength: max })
    .map((ls) => normalRuns(ls.flatMap((l, i) => (i ? [{ t: '\n' }, ...l] : l))));

/** Marks for a run an editor makes: the five and code, a link now and then. */
const editorMarks = fc.record({ marks: fc.subarray([...MARK_KEYS, 'c' as const], { minLength: 1 }), href: fc.option(pick(POOLS.href), { nil: undefined, freq: 4 }) });
const marked = (t: string, { marks, href }: { marks: readonly string[]; href?: string }): Run => Object.assign({ t }, ...marks.map((m) => ({ [m]: true })), href ? { href } : {}) as Run;
/**
 * A run as an editor may hold it before the format has its say: any run the format can say, words with a mark on the
 * spaces at their ends ("a " bold before plain words: typed so, or left so when the words after went), and spaces
 * alone with a mark or a link (Mod+B over a space).
 */
const edgyRun: fc.Arbitrary<Run> = fc.oneof(
  { weight: 4, arbitrary: arbitraryRun() },
  { weight: 3, arbitrary: fc.tuple(pick([' ', '', '  ']), word, pick([' ', '  ', ''])).chain(([a, w, z]) => editorMarks.map((m) => marked(a + w + z, m))) },
  { weight: 1, arbitrary: fc.tuple(pick([' ', '  ']), editorMarks).map(([t, m]) => marked(t, m)) },
);
/** One line of runs with marks at their edges, as an editor may hold it. */
const edgyLine = fc.array(edgyRun, { minLength: 1, maxLength: 5 }).map(normalRuns);
/** Lines of them, a line break now and then carrying the marks of the words around it (Mod+B over two lines). */
const edgyLines = (max: number) =>
  fc
    .array(fc.tuple(fc.oneof({ weight: 4, arbitrary: edgyLine }, { weight: 1, arbitrary: fc.constant<Run[]>([]) }), fc.option(editorMarks, { nil: undefined, freq: 3 })), {
      minLength: 1,
      maxLength: max,
    })
    .map((ls) => normalRuns(ls.flatMap(([l, m], i) => (i ? [m ? marked('\n', m) : { t: '\n' }, ...l] : l))));

/**
 * What the format cannot say, kept out of a generated model (each a fact of
 * Markdown's, not a bug; a rule here that turns out to be a bug is reported
 * and taken out, as "a line's words never begin or end with spaces" was on
 * 2026-10-10: the writer escapes them, "\ "):
 *   - a mark or a link never begins or ends with a space (it closes before
 *     trailing spaces, docs/kernel.md: "no space just inside a mark"), so a
 *     run of spaces carries no marks;
 *   - an empty text block is a paragraph's "<br>" only; a heading, an item
 *     or a quote with no words reads as one with none, which the generator
 *     makes as such.
 */
export function sayableLine(runs: Run[]): Run[] {
  const out = runs.map((r): Run => {
    if (r.ic || r.fn !== undefined || r.t.trim()) return r;
    return { t: r.t };
  });
  // Spaces just inside a mark move outside it.
  const spaced: Run[] = [];
  for (const r of out) {
    if (r.ic || r.fn !== undefined || !r.t.trim() || !(MARK_KEYS.some((k) => r[k]) || r.href)) {
      spaced.push(r);
      continue;
    }
    const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(r.t)!;
    if (m[1]) spaced.push({ t: m[1] });
    spaced.push({ ...r, t: m[2] });
    if (m[3]) spaced.push({ t: m[3] });
  }
  return normalRuns(spaced);
}

const ident = pick(POOLS.ident);
/** Attributes: an id, classes, keys and values (a value with spaces is quoted; one with a quote has it written as '). */
export const arbitraryAttrs: fc.Arbitrary<Attrs | undefined> = fc.option(
  fc
    .record({
      id: fc.option(ident, { nil: undefined }),
      cls: fc.option(fc.uniqueArray(ident, { minLength: 1, maxLength: 2 }), { nil: undefined }),
      kv: fc.option(fc.dictionary(ident, pick(['1', 'bar', 'a b', '2027-03-01', 'x-y'])), { nil: undefined }),
    })
    .map((a) => {
      const out: Attrs = {};
      if (a.id) out.id = a.id;
      if (a.cls) out.cls = a.cls;
      // (fast-check's dictionaries have no prototype; the parser's objects do.)
      if (a.kv && Object.keys(a.kv).length) out.kv = { ...a.kv };
      return Object.keys(out).length ? out : undefined;
    }),
  { nil: undefined, freq: 3 },
);
const withA = <B extends Block>(b: B, a: Attrs | undefined): B => (a ? { ...b, a } : b);

const COLTYPES: ColType[] = ['text', 'number', 'money', 'percent', 'date', 'time', 'check', 'url', 'rich', 'long', 'icon', 'name', 'option'];
const arbitraryColumn: fc.Arbitrary<Column> = fc
  .record({
    name: pick(['Name', 'Qty', 'Price', '# of units', 'Time', '🚀 Launch', 'שם', 'a|b', 'Note', 'x\\y']),
    type: pick(COLTYPES),
    currency: fc.option(pick(['£', 'GBP', 'R$']), { nil: undefined }),
  })
  .map((c) => (c.type === 'money' && c.currency ? { name: c.name, type: c.type, currency: c.currency } : { name: c.name, type: c.type }));
const arbitraryCell = pick(['', '1', '2.5', 'words', '=A1+B1', '=SUM(A1:B3)', 'a | b', 'x\\y', 'two\nlines', '🚀', 'שלום', '-', '#', '=C2*2', ' ', '  ', ' a', 'b ', 'x\\ ', 'two \n']);

/** A table: typed columns, raw cells (empty ones too), rows as wide as the columns. */
export const arbitraryTable = (maxCols = 4, maxRows = 4): fc.Arbitrary<Extract<Block, { k: 'table' }>> =>
  fc
    .integer({ min: 1, max: maxCols })
    .chain((n) =>
      fc
        .record({ cols: fc.array(arbitraryColumn, { minLength: n, maxLength: n }), rows: fc.array(fc.array(arbitraryCell, { minLength: n, maxLength: n }), { maxLength: maxRows }), a: arbitraryAttrs })
        .map(({ cols, rows, a }) => withA({ k: 'table' as const, cols, rows }, a)),
    );

/** One block of any of the nine kinds, its words lines of `line` (a heading's one). */
const blockOf = (line: fc.Arbitrary<Run[]>, lines: (max: number) => fc.Arbitrary<Run[]>): fc.Arbitrary<Block> =>
  fc.oneof(
    {
      weight: 4,
      arbitrary: fc
        .record({ runs: fc.oneof({ weight: 9, arbitrary: lines(3) }, { weight: 1, arbitrary: fc.constant<Run[]>([]) }), a: arbitraryAttrs })
        .map(({ runs, a }): Block => withA({ k: 'p', runs }, a)),
    },
    { weight: 2, arbitrary: fc.record({ level: pick([1, 2, 3, 4, 5, 6] as const), runs: line, a: arbitraryAttrs }).map(({ level, runs, a }): Block => withA({ k: 'h', level, runs }, a)) },
    {
      weight: 4,
      arbitrary: fc
        .record({ depth: fc.integer({ min: 0, max: 4 }), ord: fc.boolean(), done: fc.option(fc.boolean(), { nil: undefined }), runs: lines(2), a: arbitraryAttrs })
        .map(({ depth, ord, done, runs, a }): Block => withA({ k: 'li', depth, ...(ord ? { ord: true as const } : {}), ...(done === undefined ? {} : { done }), runs }, a)),
    },
    { weight: 2, arbitrary: fc.record({ runs: lines(3), a: arbitraryAttrs }).map(({ runs, a }): Block => withA({ k: 'quote', runs }, a)) },
    { weight: 1, arbitrary: arbitraryAttrs.map((a): Block => withA({ k: 'hr' }, a)) },
    { weight: 2, arbitrary: arbitraryTable() },
    {
      weight: 1,
      arbitrary: fc
        .record({ lang: pick(['', 'sheet', 'draw', 'js', 'qr']), body: fc.array(pick(POOLS.body), { maxLength: 3 }).map((ls) => ls.join('\n')), a: arbitraryAttrs })
        .map(({ lang, body, a }): Block => withA({ k: 'fence', lang, body }, a)),
    },
    {
      weight: 1,
      arbitrary: fc
        .record({
          from: pick(POOLS.node),
          to: pick(POOLS.node),
          dir: pick<Dir>(['->', '<-', '<->', '--']),
          label: fc.option(pick(['feeds', 'two words', '🚀', 'שלום']), { nil: undefined }),
          a: arbitraryAttrs,
        })
        .map(({ label, a, ...e }): Block => withA({ k: 'edge', ...e, ...(label ? { label } : {}) }, a)),
    },
  );
/** One block of any of the nine kinds, as the format can say it. */
export const arbitraryBlock: fc.Arbitrary<Block> = blockOf(arbitraryLine, arbitraryLines);
/** One block as an editor may hold it before the format has its say: marks at the edges of its words. */
export const edgyBlock: fc.Arbitrary<Block> = blockOf(edgyLine, edgyLines);

/** A head: the shell's keys and an app's, values on one line with no spaces at their ends. */
const arbitraryHead = fc
  .dictionary(pick(['title', 'by', 'chart', 'lock', 'currency', 'zone', 'x-y']), pick(['Hello', 'Two words', 'bar', 'A1:B2', '$', 'שלום', '🚀 launch', 'a: b']), { maxKeys: 4 })
  .map((h) => ({ ...h }));

/** A document of the kernel: a head and blocks, as the format can say them; with `edges`, marks at the edges of the words too. */
export const arbitraryDoc = (maxBlocks = 8, edges = false): fc.Arbitrary<Doc> =>
  fc.record({ head: arbitraryHead, blocks: fc.array(edges ? edgyBlock : arbitraryBlock, { maxLength: maxBlocks }) }).map(sayableDoc);

/**
 * The rules between blocks, as the format has them (each one Markdown's or
 * the format's own way of reading, docs/kernel.md §2):
 *   - an item is at most one deeper than the item before it (a deeper one
 *     reads as the next depth: nesting is by indent, relative);
 *   - an item after a block that is no item begins at depth 0... unless it
 *     follows a fence, which leaves the list's nesting as it was;
 *   - consecutive quotes and consecutive paragraphs are written apart and
 *     read apart; a quote's attrs ride on its last line.
 */
export function sayableDoc(d: Doc): Doc {
  const blocks: Block[] = [];
  let depth = -1;
  for (const b of d.blocks) {
    if (b.k === 'li') {
      const nb = { ...b, depth: Math.min(b.depth, depth + 1) };
      depth = nb.depth;
      blocks.push(nb);
      continue;
    }
    if (b.k !== 'fence') depth = -1;
    blocks.push(b);
  }
  return { head: d.head, blocks };
}

/* ---------- operations over a document ---------- */

/** An operation that applies to `doc`, of any of the eight kinds the document allows. */
export function arbitraryOp(doc: Doc): fc.Arbitrary<Op> {
  const n = doc.blocks.length;
  const texts = doc.blocks.flatMap((b, i) => ('runs' in b ? [i] : []));
  const tables = doc.blocks.flatMap((b, i) => (b.k === 'table' ? [i] : []));
  const ops: fc.Arbitrary<Op>[] = [
    fc.record({ key: pick(['title', 'lock', 'chart', 'new']), value: fc.option(pick(['x', 'A1:B2', 'bar']), { nil: undefined }) }).map(({ key, value }): Op => ({ op: 'head', key, value })),
    fc
      .integer({ min: 0, max: n })
      .chain((at) => fc.record({ n: fc.integer({ min: 0, max: n - at }), blocks: fc.array(arbitraryBlock, { maxLength: 2 }) }).map((x): Op => ({ op: 'splice', at, ...x }))),
  ];
  if (n)
    ops.push(
      fc.integer({ min: 0, max: n - 1 }).chain((at) => fc.integer({ min: 1, max: n - at }).chain((len) => fc.integer({ min: 0, max: n - len }).map((to): Op => ({ op: 'move', at, n: len, to })))),
    );
  if (texts.length)
    ops.push(
      pick(texts).chain((at) => {
        const len = runLength((doc.blocks[at] as Extract<Block, { runs: Run[] }>).runs);
        return fc
          .integer({ min: 0, max: len })
          .chain((from) =>
            fc.record({ to: fc.integer({ min: from, max: len }), runs: fc.array(arbitraryRun(), { maxLength: 2 }) }).map(({ to, runs }): Op => ({ op: 'text', at, from, to, runs: normalRuns(runs) })),
          );
      }),
    );
  if (tables.length) {
    const cell = pick(['', '9', '=A1', '=SUM(A1:C9)', 'w', '=B2*2']);
    ops.push(
      pick(tables).chain((at) => {
        const t = doc.blocks[at] as Extract<Block, { k: 'table' }>;
        const w = t.cols.length;
        const h = t.rows.length;
        const kinds: fc.Arbitrary<Op>[] = [
          fc
            .record({
              r: fc.integer({ min: 0, max: h }),
              c: fc.integer({ min: 0, max: w }),
              values: fc.array(fc.array(cell, { minLength: 1, maxLength: 3 }), { minLength: 1, maxLength: 3 }),
              force: fc.boolean(),
            })
            .map(({ force, ...x }): Op => ({ op: 'cells', at, ...x, ...(force ? { force: true as const } : {}) })),
          fc
            .record({ r: fc.integer({ min: 0, max: h }), rows: fc.array(fc.array(cell, { minLength: w, maxLength: w }), { minLength: 1, maxLength: 2 }) })
            .map(({ r, rows }): Op => ({ op: 'rows', at, r, n: rows.length, rows })),
          fc
            .record({ c: fc.integer({ min: 0, max: w }), cols: fc.array(arbitraryColumn, { minLength: 1, maxLength: 2 }) })
            .filter(({ cols }) => w + cols.length <= 26)
            .map(({ c, cols }): Op => ({ op: 'cols', at, c, n: cols.length, cols })),
          fc.record({ c: fc.integer({ min: 0, max: w - 1 }), col: arbitraryColumn }).map(({ c, col }): Op => ({ op: 'col', at, c, col })),
        ];
        if (h) kinds.push(fc.integer({ min: 0, max: h - 1 }).chain((r) => fc.integer({ min: 1, max: h - r }).map((k): Op => ({ op: 'rows', at, r, n: k }))));
        if (w > 1)
          kinds.push(
            fc.integer({ min: 0, max: w - 1 }).chain((c) =>
              fc
                .integer({ min: 1, max: Math.max(1, w - 1 - c) })
                .filter((k) => c + k <= w && w - k >= 1)
                .map((k): Op => ({ op: 'cols', at, c, n: k })),
            ),
          );
        return fc.oneof(...kinds);
      }),
    );
  }
  return fc.oneof(...ops);
}

/** A document and a run of operations that apply to it one after another; with `edges`, the document's words with marks at their edges, as an editor may hold them. */
export function arbitraryEdits(maxOps = 6, edges = false): fc.Arbitrary<{ doc: Doc; ops: Op[] }> {
  return arbitraryDoc(8, edges).chain((doc) => {
    const step = (d: Doc, left: number): fc.Arbitrary<Op[]> => (left ? arbitraryOp(d).chain((op) => step(applyOp(d, op), left - 1).map((rest) => [op, ...rest])) : fc.constant([]));
    return fc
      .integer({ min: 1, max: maxOps })
      .chain((k) => step(doc, k))
      .map((ops) => ({ doc, ops }));
  });
}

/** The text of a generated document, as the writer has it. */
export const arbitraryText = (maxBlocks?: number): fc.Arbitrary<string> => arbitraryDoc(maxBlocks).map(write);

/** How many runs a property makes: 200 by default, VITE_FUZZ_RUNS (npm run fuzz: 2,000) when asked, in node and in the browser alike. */
export const RUNS = Number((import.meta as { env?: Record<string, string | undefined> }).env?.VITE_FUZZ_RUNS) || 200;
