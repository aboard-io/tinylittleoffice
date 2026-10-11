/**
 * Diagram: shapes with meaning, drawn from a few lines of text. One app, eight kinds (the head's `kind:`):
 * mind map, org chart, family tree, swimlanes, timeline, Venn, seating chart and network. The document is
 * list items and connections (model.ts); each kind's drawing is view.ts, through Draw's renderer; the editor
 * (editor.ts) is the picture itself, tapped, typed on and dragged.
 */
import { Workflow } from 'lucide';
import { apply, parse, write, type Doc as Kernel, type TextNode } from '../../doc/index.ts';
import { defineApp, lookup, type Doc } from '../../kit/app.ts';
import { utf8 } from '../../kit/draw.ts';
import { t } from '../../kit/i18n.ts';
import { templates } from './templates.ts';
import { diagramToOutline, edgesOf, isTree, kindOf, linesOf } from './model.ts';
import { diagramPage, diagramSvg, layout, toDrawing } from './view.ts';

const headOf = (doc: Doc): Kernel => parse(doc);
export const titleOf = (doc: Doc): string => headOf(doc).head.title ?? '';
export const retitle = (doc: Doc, title: string): Doc => write(apply(headOf(doc), { op: 'head', key: 'title', value: title.replace(/\n/g, ' ').trim() || undefined }));

const ARROWS = { '->': '→', '<-': '←', '<->': '↔', '--': '—' } as const;

/**
 * A diagram as text: each thing a heading (by its depth in a tree), with its words under it: a line's key ("Sales",
 * "Top table", "1990") and what follows it, or a person's name and the role or years on their second line. Then
 * the connections, "A → B: label", as a list under Connections. A mind map, an org chart and the rest are all this.
 */
export function diagramText(doc: Kernel): TextNode[] {
  const tree = isTree(kindOf(doc));
  const out: TextNode[] = [];
  for (const l of linesOf(doc)) {
    const [name, ...rest] = (l.key ? l.key.words : l.all.words).split('\n');
    const words = l.key ? l.words.words : rest.join('\n');
    const heading = name.trim() || (l.key ?? l.all).icon;
    if (heading) out.push({ k: 'h', level: (tree ? Math.min(4, l.depth + 2) : 2) as 2 | 3 | 4, runs: [{ t: heading }] });
    if (words.trim()) out.push({ k: 'p', runs: [{ t: words.trim() }] });
  }
  const edges = edgesOf(doc);
  if (edges.length)
    out.push(
      { k: 'h', level: 2, runs: [{ t: t('Connections') }] },
      { k: 'list', ord: false, items: edges.map((e) => ({ runs: [{ t: `${e.from} ${ARROWS[e.dir]} ${e.to}${e.label ? `: ${e.label}` : ''}` }] })) },
    );
  return out;
}

export default defineApp({
  id: 'diagram',
  get name() {
    return t('Diagram Maker');
  },
  get noun() {
    return t('diagram');
  },
  get group() {
    return t('Design');
  },
  icon: Workflow,
  get blurb() {
    return t('Mind maps, org charts, family trees, swimlanes, timelines, Venns, seating charts and networks, drawn from a few lines.');
  },
  blank: () => '',
  get templates() {
    return templates();
  },
  // A blank page a kind, the mind map first: no generic Blank above them (Paul, 2026-10-10).
  blankInTemplates: true,
  editor: () => import('./editor.ts'),
  commands: () => import('./commands.ts'),
  title: titleOf,
  retitle,
  view: (doc, opts) => [diagramPage(parse(doc), opts?.upTo, opts?.thumb)],
  text: (doc) => diagramText(parse(doc)),
  // Presented on a slide, a shape a step: the picture builds as its kind lays it out.
  steps: (doc) => layout(parse(doc)).shapes.length,
  exports: [{ ext: 'svg', label: () => t('Picture (SVG)'), mime: 'image/svg+xml', shows: 'own', build: (doc) => utf8(diagramSvg(parse(doc))) }],
  // Its picture as shapes to move about by hand.
  handoffs: [
    { to: 'outline', label: () => t('Show as outline'), convert: (doc) => diagramToOutline(parse(doc)) },
    { to: 'draw', label: () => t('Open in {app}', { app: lookup.appOf('draw')?.name ?? t('Drawing Tool') }), convert: (doc) => toDrawing(parse(doc)) },
  ],
});
