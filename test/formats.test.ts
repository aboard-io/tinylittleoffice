// Every export format is one object (kit/exports.ts formatsOf): what it is, whether the browser shows it, how it is
// built. Under node: the list's shape, nothing switching on an extension, and every format that needs no browser
// built for every app's blank document (the drawn ones are test/browser/formats.test.ts's).
import { test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { apps } from '../src/kit/apps.ts';
import { formatsOf, htmlOf } from '../src/kit/exports.ts';
import { looksLike } from './formats-bytes.ts';

test("nothing in the kit's exports switches on an extension, nor the shell on a kit format's", () => {
  const read = (file: string) => readFileSync(new URL(file, import.meta.url), 'utf8');
  expect(read('../src/kit/exports.ts')).not.toMatch(/ext\s*[!=]==|[!=]==\s*'(pdf|png|html|md|tlo)'/);
  expect(read('../src/kit/shell.ts')).not.toMatch(/[!=]==\s*'(pdf|png|html|md|tlo)'|exportAs\('/);
});

test("every app's formats: the kit's less the ones it makes its own way, then its own, each saying what it is", () => {
  for (const def of apps()) {
    const list = formatsOf(def);
    const exts = list.map((f) => f.ext);
    expect(new Set(exts).size, def.id).toBe(exts.length);
    for (const ext of ['pdf', 'png', 'html', 'md', 'tlo']) expect(exts, def.id).toContain(ext);
    for (const f of list) {
      expect(f.label(), `${def.id}.${f.ext}`).toMatch(/\S/);
      expect(f.mime, `${def.id}.${f.ext}`).toMatch(/^[a-z]+\/[\w.+-]+(;charset=utf-8)?$/);
      expect(['own', 'text', null], `${def.id}.${f.ext}`).toContain(f.shows);
    }
    // An app's own comes after the kit's, and its version of a kit format is the one listed.
    for (const own of def.exports ?? []) expect(list.find((f) => f.ext === own.ext)).toBe(own);
  }
  const write = formatsOf(apps().find((a) => a.id === 'write')!);
  expect(write.map((f) => f.ext)).toEqual(['pdf', 'png', 'tlo', 'docx', 'md', 'rtf', 'html']);
  expect(write.filter((f) => f.still).map((f) => f.ext)).toEqual(['pdf', 'png']);
  expect(Object.fromEntries(write.map((f) => [f.ext, f.shows]))).toEqual({ pdf: 'own', png: 'own', tlo: 'text', docx: null, md: 'text', rtf: null, html: 'own' });
});

/** Whether a build failed only for want of a browser (a canvas, the page; kit/exports.ts's "not drawn"): left to the browser test. */
const wantsBrowser = (err: unknown) =>
  (err instanceof Error && err.message === 'not drawn') ||
  (err instanceof ReferenceError && /\b(document|window|navigator|OffscreenCanvas|Image|createImageBitmap|HTMLCanvasElement|Blob|FileReader|DOMParser|XMLSerializer|fetch)\b/.test(err.message));

test("every format that needs no browser builds, for every app's blank document, to bytes of its type", async () => {
  let built = 0;
  for (const def of apps()) {
    const doc = def.blank();
    for (const f of formatsOf(def)) {
      let out: Uint8Array | string;
      try {
        out = await f.build(doc, { def, title: '', link: 'https://tinylittleoffice.com/#/v1/' + def.id });
      } catch (err) {
        if (wantsBrowser(err)) continue;
        throw new Error(`${def.id}.${f.ext}: ${err}`);
      }
      expect(looksLike(f.mime, out), `${def.id}.${f.ext}`).toBe(true);
      built++;
    }
  }
  expect(built).toBeGreaterThan(40);
});

test('a web page made of a document begins with its text layer, the pages after it hidden from a screen reader', async () => {
  const sheet = apps().find((a) => a.id === 'sheet')!;
  const html = (await formatsOf(sheet)
    .find((f) => f.ext === 'html')!
    .build((await sheet.templates())[0].doc, { def: sheet, title: 'Budget', link: 'https://tinylittleoffice.com/#/v1/sheet' })) as string;
  const main = html.slice(html.indexOf('<main>'));
  expect(main.indexOf('<article class="to-text')).toBeGreaterThan(0);
  expect(main.indexOf('<article class="to-text')).toBeLessThan(main.indexOf('<figure'));
  expect(main).toMatch(/<table><thead><tr><th scope="col">Item<\/th>/);
  expect(main).toContain('<td>$1,200.00</td>');
  expect(main).toMatch(/<div class="pages" aria-hidden="true">\s*<figure>/);
  // Its own words, not a function of the pages.
  expect(htmlOf([], 'T', '', '<p>Hello</p>')).toContain('<article class="to-text sr-only"><p>Hello</p></article>');
});
