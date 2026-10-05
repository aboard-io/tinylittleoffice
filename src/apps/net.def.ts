/** Network: things and the connections between them. */
import { defineDiagram, frame, join, shape, type Diagram } from '../lib/diagram.ts';
import { textWidth } from '../kit/core.ts';

function layout(text: string): Diagram {
  const names: string[] = [];
  const at = (name: string) => (names.includes(name) ? names.indexOf(name) : names.push(name) - 1);
  const links: { a: number; b: number; arrow: boolean; label: string }[] = [];
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const m = /^(.+?)\s+(->|>|--|-|<->)\s+([^:]+?)(?::\s*(.*))?$/.exec(line);
    if (m) links.push({ a: at(m[1].trim()), b: at(m[3].trim()), arrow: m[2].includes('>'), label: m[4]?.trim() ?? '' });
    else at(line.replace(/:.*$/, '').trim());
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

export const spec = {
  hint: 'A connection per line: "A - B", or "A > B" for an arrow. Add ": label" to name it. A name on its own is a lone node.',
  example: 'Web > API: requests\nAPI > Database: queries\nAPI > Cache\nWorker > Database\nAPI - Worker: queue\nMonitoring',
  layout,
};

export default defineDiagram({ id: 'net', group: 'Visualization', under: 'draw', name: 'Network', icon: 'net', blurb: 'Things and the connections between them, drawn round a circle.' }, spec);
