/**
 * Website: a site of little pages from a few lines of text, a shop with a cart if it lists what it sells,
 * downloaded as one HTML file. Quick Links (a link-in-bio page) is a set of its templates: one page in
 * one column (`look: links`). The reading is model.ts, the page and the pictures view.ts, the looks
 * theme.ts; the editor is editor.ts, the page in a frame with the words of the section in hand beside it.
 */
import { PanelsTopLeft } from 'lucide';
import { parse } from '../../doc/index.ts';
import { defineApp } from '../../kit/app.ts';
import { t } from '../../kit/i18n.ts';
import { siteOf } from '../write/view.ts';
import { retitle, titleOf } from './model.ts';
import { templates } from './templates.ts';
import { sitePage, sitePictures } from './view.ts';

export default defineApp({
  id: 'site',
  get name() {
    return t('Website Builder');
  },
  get noun() {
    return t('site');
  },
  get group() {
    return t('Web');
  },
  icon: PanelsTopLeft,
  get blurb() {
    return t('A website of little pages, or a page of quick links, downloaded as a single HTML file; a shop with a cart if you list what you sell.');
  },
  blank: () => '',
  get templates() {
    return templates();
  },
  editor: () => import('./editor.ts'),
  title: titleOf,
  retitle,
  view: (doc, opts) => sitePictures(doc, opts?.small),
  exports: [
    // In place of the kit's pictures of the pages: the site itself, every page in one file, ready to put on the web.
    { ext: 'html', label: () => t('The website (HTML)'), mime: 'text/html', build: (doc, ctx) => sitePage(parse(doc), { base: siteOf(ctx.link) }) },
  ],
});
