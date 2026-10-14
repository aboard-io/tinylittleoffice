// Every export format is one object (kit/file/exports.ts formatsOf): what it is, whether the browser shows it, how it is
// built. Under node: the list's shape, nothing switching on an extension, and every format that needs no browser
// built for every app's blank document (the drawn ones are test/browser/formats.test.ts's).
import { test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { apps } from '../src/kit/core/apps.ts';
import { formatsOf, formatsReady, htmlOf } from '../src/kit/file/exports.ts';
import type { AppDef, Export } from '../src/kit/core/app.ts';
import { looksLike } from './formats-bytes.ts';

test("nothing in the kit's exports switches on an extension, nor the shell on a kit format's", () => {
  const read = (file: string) => readFileSync(new URL(file, import.meta.url), 'utf8');
  expect(read('../src/kit/file/exports.ts')).not.toMatch(/ext\s*[!=]==|[!=]==\s*'(pdf|png|html|md|tlo)'/);
  expect(read('../src/kit/core/shell.ts')).not.toMatch(/[!=]==\s*'(pdf|png|html|md|tlo)'|exportAs\('/);
});

test("every app's formats: the kit's less the ones it makes its own way, then its own, each saying what it is", () => {
  for (const def of apps()) {
    const list = formatsOf(def);
    const exts = list.map((f) => f.ext);
    expect(new Set(exts).size, def.id).toBe(exts.length);
    for (const ext of ['pdf', 'png', 'html', 'md', 'tlo', 'json']) expect(exts, def.id).toContain(ext);
    for (const f of list) {
      expect(f.label(), `${def.id}.${f.ext}`).toMatch(/\S/);
      expect(f.mime, `${def.id}.${f.ext}`).toMatch(/^[a-z]+\/[\w.+-]+(;charset=utf-8)?$/);
      expect(['own', 'text', null], `${def.id}.${f.ext}`).toContain(f.shows);
    }
    // An app's own comes after the kit's, and its version of a kit format is the one listed; one this place cannot
    // make (a WebM: no video encoder under node) is not listed.
    for (const own of def.exports ?? []) expect(list.find((f) => f.ext === own.ext)).toBe(own.available ? undefined : own);
  }
  const write = formatsOf(apps().find((a) => a.id === 'write')!);
  expect(write.map((f) => f.ext)).toEqual(['pdf', 'png', 'icon.png', 'tlo', 'json', 'docx', 'md', 'rtf', 'html']);
  expect(write.filter((f) => f.still).map((f) => f.ext)).toEqual(['pdf', 'png', 'icon.png']);
  expect(Object.fromEntries(write.map((f) => [f.ext, f.shows]))).toEqual({ pdf: 'own', png: 'own', 'icon.png': 'own', tlo: 'text', json: 'text', docx: null, md: 'text', rtf: null, html: 'own' });
});

/** Whether a build failed only for want of a browser (a canvas, the page; kit/file/exports.ts's "not drawn"): left to the browser test. */
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

test('the Animator and the Deck have a WebM after the GIF; a format is listed once its check says this browser can make it, and asked once', async () => {
  const exts = (id: string) => (apps().find((a) => a.id === id)!.exports ?? []).map((f) => [f.ext, f.label(), !!f.available]);
  expect(exts('anim')).toEqual([
    ['gif', 'Animated GIF', false],
    ['webm', 'Video (WebM)', true],
    ['svg', 'Animated SVG', false],
  ]);
  expect(exts('deck').slice(-2)).toEqual([
    ['gif', 'An animation of the deck (GIF)', false],
    ['webm', 'A film of the deck (WebM)', true],
  ]);
  let asked = 0;
  const format = (ext: string, ok: boolean): Export => ({ ext, mime: 'video/webm', label: () => ext, shows: 'own', available: async () => (asked++, ok), build: () => '' });
  const def = { ...apps()[0], exports: [format('yes', true), format('no', false)] } as AppDef;
  expect(formatsOf(def).map((f) => f.ext)).not.toContain('yes');
  await Promise.all([formatsReady(def), formatsReady(def)]);
  await formatsReady(def);
  expect(asked).toBe(2);
  const listed = formatsOf(def).map((f) => f.ext);
  expect(listed).toContain('yes');
  expect(listed).not.toContain('no');
  // Under node there is no video encoder: no WebM, however long one waits.
  const anim = apps().find((a) => a.id === 'anim')!;
  await formatsReady(anim);
  expect(formatsOf(anim).map((f) => f.ext)).not.toContain('webm');
});
