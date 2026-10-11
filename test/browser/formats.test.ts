// Every format of every app (kit/exports.ts formatsOf) builds, for the app's blank document, to bytes of the type it
// says: the drawn ones too (the PDF, the PNG, a GIF, a slide's pictures), which need the browser's canvas.
import { test, expect } from 'vitest';
import { apps } from '../../src/kit/apps.ts';
import { fileOf, formatsOf, htmlOf, printHtml } from '../../src/kit/exports.ts';
import { pageSvg } from '../../src/kit/draw.ts';
import { looksLike } from '../formats-bytes.ts';

test('every format of every app builds its blank document into a file of its type', async () => {
  const seen: string[] = [];
  for (const def of apps()) {
    for (const f of formatsOf(def)) {
      const made = await fileOf(f, { doc: def.blank(), ctx: { def, title: '', link: `${location.origin}/#/v1/${def.id}` } });
      expect(made.mime, `${def.id}.${f.ext}`).toBe(f.mime);
      expect(made.name.endsWith(`.${f.ext}`), `${def.id}.${f.ext}`).toBe(true);
      expect(looksLike(f.mime, made.data), `${def.id}.${f.ext}`).toBe(true);
      seen.push(`${def.id}.${f.ext}`);
    }
  }
  expect(seen).toEqual(expect.arrayContaining(['write.pdf', 'write.png', 'write.docx', 'anim.gif', 'deck.pptx', 'deck.zip', 'sheet.chart.png', 'draw.tile.png']));
}, 120_000);

test('the web page and the printed page say each page’s own alt, and no picture is given two roles', () => {
  const pages = [
    { w: 100, h: 80, svg: '', alt: 'A bar chart of rain by month' },
    { w: 100, h: 80, svg: '', alt: 'A map of the route' },
    { w: 100, h: 80, svg: '' },
  ];
  for (const made of [htmlOf(pages, 'The trip'), printHtml(pages, 'The trip')]) {
    const svgs = new DOMParser().parseFromString(made, 'text/html').querySelectorAll('svg');
    expect([...svgs].map((s) => s.getAttribute('aria-label'))).toEqual(['A bar chart of rain by month', 'A map of the route', 'The trip']);
    for (const tag of made.match(/<svg [^>]*>/g)!) expect(tag.match(/ role=/g)?.length ?? 0, tag).toBeLessThanOrEqual(1);
  }
  // A role given by the caller is the one the picture has.
  expect(pageSvg(pages[0], 'role="img" aria-label="Side 1"').match(/ role=/g)).toHaveLength(1);
});
