// Every format of every app (kit/exports.ts formatsOf) builds, for the app's blank document, to bytes of the type it
// says: the drawn ones too (the PDF, the PNG, a GIF, a slide's pictures), which need the browser's canvas.
import { test, expect } from 'vitest';
import { apps } from '../../src/kit/apps.ts';
import { fileOf, formatsOf } from '../../src/kit/exports.ts';
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
