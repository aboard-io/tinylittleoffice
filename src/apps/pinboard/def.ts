/**
 * Pinboard: a board to pin things to and draw on together, as a group watching a film pins its frames, writes notes,
 * gathers them in frames ("Act one", "Motifs: mirrors"), draws arrows between ideas and scribbles. The document is a
 * table, a row per thing, a picture's bytes the host's own image fence (model.ts says why each thing has an id); the
 * drawing is view.ts; the editor editor.ts, an unbounded canvas panned and zoomed.
 */
import { StickyNote } from 'lucide';
import { apply, parse, write, type Doc as Kernel } from '../../doc/index.ts';
import { defineApp, type Doc } from '../../kit/core/app.ts';
import { utf8 } from '../../kit/draw/draw.ts';
import { t } from '../../kit/core/i18n.ts';
import { boardText, emptyTable, readBoard } from './model.ts';
import { boardPage, boardToSvg } from './view.ts';

const headOf = (doc: Doc): Kernel => parse(doc);
const titleOf = (doc: Doc): string => headOf(doc).head.title ?? '';
const retitle = (doc: Doc, title: string): Doc => write(apply(headOf(doc), { op: 'head', key: 'title', value: title.replace(/\n/g, ' ').trim() || undefined }));

export default defineApp({
  id: 'pinboard',
  get name() {
    return t('common-pinboard');
  },
  get noun() {
    return t('pinboard-pinboard');
  },
  get group() {
    return t('common-design');
  },
  icon: StickyNote,
  get blurb() {
    return t('pinboard-notes-pictures-frames-and-arrows');
  },
  // The table is born with the board, so two people's first notes land in one table (model.ts).
  blank: () => write({ head: {}, blocks: [emptyTable()] }),
  templates: () => import('./templates.ts').then((m) => m.templates()),
  editor: () => import('./editor.ts'),
  title: titleOf,
  retitle,
  view: (doc) => [boardPage(parse(doc))],
  text: (doc) => boardText(readBoard(parse(doc))),
  exports: [{ ext: 'svg', label: () => t('common-picture-svg'), mime: 'image/svg+xml', shows: 'own', build: (doc) => utf8(boardToSvg(parse(doc))) }],
  commands: () => import('./commands.ts'),
});
