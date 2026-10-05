/**
 * Lines: the one toolkit behind every app that is written as a few lines
 * of text. An app says what kinds of line it has, each as a pattern:
 *
 *   { name: 'Dish', is: '{Dish} | {Price}[ | {What it is}]' }
 *
 * and from that alone a line can be read into its fields and written back,
 * which is all a form needs: people fill in boxes, and what is saved (and
 * shared, and written by programs) is still the plain text.
 *
 * In a pattern, {Name} is a field; [..] is a part that may be left out;
 * everything else is written as it stands. A field may say what it holds:
 * {Text:long}, {Day:date}, {Picture:icon}, {Colour:choice=red,green}.
 */
export interface Kind {
  name: string;
  /** The pattern. An empty pattern is a blank line that means something (the next card, the next table). */
  is: string;
  /** There is at most one of these, and it goes at the top (a title, a setting). */
  once?: boolean;
  /** Lines of this kind nest: they can be indented under one another. */
  indent?: boolean;
  /** Lines of this kind sit at exactly this depth (an answer, under its question). */
  at?: number;
}

export interface Field {
  name: string;
  type: 'text' | 'long' | 'date' | 'icon' | 'choice';
  options: string[];
}

export interface Row {
  kind: number;
  values: string[];
  depth: number;
}

type Part = string | Field | Part[];
interface Compiled {
  fields: Field[];
  re: RegExp;
  write(values: string[]): string;
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function compile(kind: Kind): Compiled {
  const fields: Field[] = [];
  let at = 0;
  const src = kind.is;
  // The pattern as a tree: text, fields, and bracketed parts that may be left out.
  const parts = (): Part[] => {
    const out: Part[] = [];
    while (at < src.length && src[at] !== ']') {
      if (src[at] === '[') {
        at++;
        out.push(parts());
        at++;
      } else if (src[at] === '{') {
        const end = src.indexOf('}', at);
        const [name, type = 'text'] = src.slice(at + 1, end).split(':');
        const field: Field = { name, type: type.split('=')[0] as Field['type'], options: type.includes('=') ? type.split('=')[1].split(',') : [] };
        fields.push(field);
        out.push(field);
        at = end + 1;
      } else {
        const next = [src.indexOf('{', at), src.indexOf('[', at), src.indexOf(']', at)].filter((n) => n >= 0);
        const end = next.length ? Math.min(...next) : src.length;
        out.push(src.slice(at, end));
        at = end;
      }
    }
    return out;
  };
  const tree = parts();
  // Spaces in the pattern are loose in what is read: needed beside a word ("4 x 3", "0 to 9"), optional beside a mark ("a|b").
  const lit = (s: string) => s.replace(/(\s+)|([^\s]+)/g, (_, space, word, i: number) => (word ? esc(word) : /[\w-]/.test(s[i - 1] ?? '') || /[\w-]/.test(s[i + space.length] ?? '') ? '\\s+' : '\\s*'));
  const re = (list: Part[]): string => list.map((p) => (typeof p === 'string' ? lit(p) : Array.isArray(p) ? `(?:${re(p)})?` : p.type === 'icon' ? '([a-z0-9-]+)' : p.type === 'choice' ? `(${p.options.map(esc).join('|')})` : '(.*?)')).join('');
  const has = (list: Part[], values: string[]): boolean => list.some((p) => (typeof p === 'string' ? false : Array.isArray(p) ? has(p, values) : !!values[fields.indexOf(p)]?.trim()));
  const write = (list: Part[], values: string[]): string => list.map((p) => (typeof p === 'string' ? p : Array.isArray(p) ? (has(p, values) ? write(p, values) : '') : (values[fields.indexOf(p)] ?? '').replace(/\n/g, ' ').trim())).join('');
  return { fields, re: new RegExp(`^${re(tree)}$`, 'i'), write: (values) => write(tree, values).trimEnd() };
}

/** What is left for a line no kind claims: kept exactly as it was written. */
const OTHER: Kind = { name: 'Line', is: '{Text}' };
const cache = new WeakMap<Kind[], { kinds: Kind[]; made: Compiled[] }>();

/** An app's kinds, ready to use: with the catch-all added, unless it has one of its own. */
export function kindsOf(given: Kind[]): { kinds: Kind[]; made: Compiled[] } {
  let hit = cache.get(given);
  if (!hit) {
    const kinds = given.some((k) => /^\{[^}]*\}$/.test(k.is) && k.at === undefined) ? given : [...given, OTHER];
    cache.set(given, (hit = { kinds, made: kinds.map(compile) }));
  }
  return hit;
}

export const fieldsOf = (given: Kind[], kind: number) => kindsOf(given).made[kind].fields;

export function readLines(text: string, given: Kind[]): Row[] {
  const { kinds, made } = kindsOf(given);
  const divider = kinds.findIndex((k) => k.is === '');
  const mark = (k: Kind) => /^[^{[]*/.exec(k.is)![0].length;
  const order = kinds.map((_, i) => i).sort((a, b) => mark(kinds[b]) - mark(kinds[a]) || a - b);
  const rows: Row[] = [];
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    const depth = Math.floor(raw.replace(/\t/g, '  ').search(/\S|$/) / 2);
    if (!line) {
      if (divider >= 0 && rows.length) rows.push({ kind: divider, values: [], depth: 0 });
      continue;
    }
    // The kind whose opening mark is longest is tried first ("## " before "# "); otherwise in the order given.
    const kind = order.find((i) => kinds[i].is !== '' && (kinds[i].at === undefined || kinds[i].at === depth) && made[i].re.test(line))!;
    const k = kinds[kind];
    // (A line nothing else claims keeps its indent as part of its text, so nothing about it is lost.)
    if (k === OTHER) rows.push({ kind, values: [raw.trimEnd()], depth: 0 });
    else rows.push({ kind, values: made[kind].re.exec(line)!.slice(1).map((v) => (v ?? '').trim()), depth: k.indent ? depth : (k.at ?? 0) });
  }
  return rows;
}

export function writeLines(rows: Row[], given: Kind[]): string {
  const { kinds, made } = kindsOf(given);
  return rows
    .map((r) => (kinds[r.kind].is === '' ? '' : kinds[r.kind] === OTHER ? r.values[0] : '  '.repeat(r.depth) + made[r.kind].write(r.values)))
    // A row with nothing in it yet is not written down (a blank line would mean something else, or nothing).
    .filter((_, i) => kinds[rows[i].kind].is === '' || rows[i].values.some((v) => v.trim()))
    .join('\n');
}
