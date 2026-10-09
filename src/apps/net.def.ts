import { nested, outlineToNet, readTree } from '../lib/outlinemodel.ts';
import { plainInline } from '../lib/richtext.ts';
/** Network: things and the connections between them. */
import { readLines, writeLines, type Kind as LineKind } from '../lib/lines.ts';
import { parse } from '../lib/tlo.ts';
import { defineDiagram, frame, join, shape, type Diagram } from '../lib/diagram.ts';
import { textWidth } from '../kit/core.ts';

const form: LineKind[] = [
  { name: 'Arrow', is: '~ {From} -> {To}[: {Label}]' },
  { name: 'Link', is: '~ {From} -- {To}[: {Label}]' },
  { name: 'Thing', is: '- {Thing}' },
];

function layout(text: string): Diagram {
  const names: string[] = [];
  const at = (name: string) => (names.includes(name) ? names.indexOf(name) : names.push(name) - 1);
  const links: { a: number; b: number; arrow: boolean; label: string }[] = [];
  for (const r of readLines(text, form)) {
    if (r.kind < 2) links.push({ a: at(r.values[0]), b: at(r.values[1]), arrow: r.kind === 0, label: r.values[2] });
    else if (r.kind === 2) at(r.values[0]);
  }
  if (!names.length) return frame([]);
  // Round a circle, starting at the top; a lone pair sits side by side.
  const n = names.length;
  const radius = n < 3 ? 110 : Math.max(120, (n * 150) / (2 * Math.PI));
  const nodes = names.map((name, i) => {
    const a = n < 3 ? Math.PI * i : (i / n) * Math.PI * 2 - Math.PI / 2;
    const w = Math.max(84, Math.min(170, textWidth(name, 14) + 30));
    return shape('o', Math.cos(a) * radius * 1.35 - w / 2, Math.sin(a) * radius - 20, w, 40, name, 1, 'b');
  });
  return frame([...nodes, ...links.map((l) => join(l.a, l.b, l.arrow, l.label))], 30);
}

/** A connection, however it points ("<-" turned round), as the form writes it: an arrow, or a plain line. */
const edge = (a: string, dir: string, b: string, label = '') => {
  const [from, to] = dir === '<-' ? [b, a] : [a, b];
  return `~ ${from.trim()} ${/[<>]/.test(dir) ? '->' : '--'} ${to.trim()}${label.trim() ? `: ${label.trim()}` : ''}`;
};

/** A network as it is loosely written: "A > B: label" and "A - B" lines as joins, any other line a thing on its own. */
function read(text: string): string {
  // A nested list (an outline) is a tree: each thing joined to the one it is under.
  if (nested(text)) return writeLines(readLines(outlineToNet(readTree(text).items, readTree(text).links, plainInline), form), form);
  const loose = (l: string) => {
    const m = /^(.+?)\s+(<->|->|<-|--|>|-)\s+([^:]+?)(?::\s*(.*))?$/.exec(l.trim());
    return m ? edge(m[1], m[2], m[3], m[4]) : `- ${l.trim()}`;
  };
  const lines = parse(text).blocks.flatMap((b) => (b.k === 'edge' ? [edge(b.from, b.dir, b.to, b.label)] : b.k === 'li' ? [loose(b.text)] : b.k === 'p' ? b.text.split('\n').filter((l) => l.trim()).map(loose) : []));
  return writeLines(readLines(lines.join('\n'), form), form);
}

export const spec = {
  form,
  hint: 'A connection per line: "~ A -- B", or "~ A -> B" for an arrow. Add ": label" to name it. "- Name" is a thing on its own.',
  example: '~ Web -> API: requests\n~ API -> Database: queries\n~ API -> Cache\n~ Worker -> Database\n~ API -- Worker: queue\n\n- Monitoring',
  layout,
};

export default defineDiagram({ id: 'net', name: 'Network', icon: 'net', blurb: 'Things and the connections between them, drawn round a circle.', read }, spec);
