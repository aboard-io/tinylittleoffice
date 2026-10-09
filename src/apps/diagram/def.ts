/**
 * Diagram: shapes with meaning, drawn from a few lines of text. One app, eight kinds (the head's `kind:`):
 * mind map, org chart, family tree, swimlanes, timeline, Venn, seating chart and network. The document is
 * list items and connections (model.ts); each kind's drawing is view.ts, through Draw's renderer; the editor
 * (editor.ts) is the picture itself, tapped, typed on and dragged.
 */
import { Workflow } from 'lucide';
import { apply, parse, write, type Doc as Kernel } from '../../doc/index.ts';
import { defineApp, lookup, type Doc } from '../../kit/app.ts';
import { utf8 } from '../../kit/draw.ts';
import { t } from '../../kit/i18n.ts';
import { templates } from './templates.ts';
import { diagramPage, diagramSvg, layout, toDrawing } from './view.ts';

const headOf = (doc: Doc): Kernel => parse(doc);
export const titleOf = (doc: Doc): string => headOf(doc).head.title ?? '';
export const retitle = (doc: Doc, title: string): Doc => write(apply(headOf(doc), { op: 'head', key: 'title', value: title.replace(/\n/g, ' ').trim() || undefined }));

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
  editor: () => import('./editor.ts'),
  title: titleOf,
  retitle,
  view: (doc, opts) => [diagramPage(parse(doc), opts?.upTo)],
  // Presented on a slide, a shape a step: the picture builds as its kind lays it out.
  steps: (doc) => layout(parse(doc)).shapes.length,
  exports: [{ ext: 'svg', label: () => t('Picture (SVG)'), mime: 'image/svg+xml', build: (doc) => utf8(diagramSvg(parse(doc))) }],
  // Its picture as shapes to move about by hand.
  handoffs: [{ to: 'draw', label: () => t('Open in {app}', { app: lookup.appOf('draw')?.name ?? t('Drawing Tool') }), convert: (doc) => toDrawing(parse(doc)) }],
});
