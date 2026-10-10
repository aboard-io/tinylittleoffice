// Insert ▾'s dialogs (kit/insert-dialogs.ts) and another document edited in place (kit/doc-dialog.ts), in a real
// Chromium: the address and OK are one row with the field taking the room, what the address will be shows under
// them, nothing above moves as it arrives, OK answers with what is put in; the doc dialog holds the app's own
// editor, Done answers its text, Cancel nothing, and a table's Rows and Columns set its size.
import { afterEach, expect, test, vi } from 'vitest';
import '../../src/styles.css';
import { appOf } from '../../src/kit/apps.ts';
import { write } from '../../src/doc/index.ts';
import { encodeDoc, toBase64Url } from '../../src/kit/codec.ts';
import { editDoc, editTable, newTable, resizeTable } from '../../src/kit/doc-dialog.ts';
import { askDocLink, askEmbed, askPicture, shortParts } from '../../src/kit/insert-dialogs.ts';
import { TINIER } from '../../src/kit/short.ts';
import { tick, until } from './helpers.ts';

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
});

const field = () => document.querySelector<HTMLInputElement>('.to-ask-dialog .to-ask-url')!;
const ok = () => document.querySelector<HTMLButtonElement>('.to-ask-dialog .to-ask-ok')!;
async function typeUrl(v: string) {
  const f = field();
  f.value = v;
  f.dispatchEvent(new Event('input', { bubbles: true }));
  await tick();
}
/** The field and OK side by side on one row, the field the wider, both in the dialog's top part. */
function oneRow() {
  const f = field().getBoundingClientRect();
  const b = ok().getBoundingClientRect();
  expect(Math.abs(f.top + f.height / 2 - (b.top + b.height / 2))).toBeLessThan(2);
  expect(b.left).toBeGreaterThanOrEqual(f.right);
  expect(f.width).toBeGreaterThan(b.width * 3);
  expect(parseFloat(getComputedStyle(field()).fontSize)).toBeGreaterThanOrEqual(16);
}

test('Web Picture: the address and OK are one row; the picture shows as it is typed, the field stays put; OK answers the address and the words', async () => {
  const got = askPicture();
  await until(() => !!document.querySelector('.to-ask-picture dialog[open]'));
  expect(document.querySelector('.to-ask-picture h2')!.textContent).toBe('Web Picture');
  await until(() => document.activeElement === field());
  oneRow();
  expect(ok().disabled).toBe(true);
  const top = field().getBoundingClientRect().top;
  const dialogTop = document.querySelector('.to-ask-picture dialog')!.getBoundingClientRect().top;
  await typeUrl(`${location.origin}/favicon-32.png`);
  await until(() => !!document.querySelector('.to-ask-preview img.ok'));
  // Hung from the top: the preview grows the dialog downwards; the field has not moved.
  expect(field().getBoundingClientRect().top).toBe(top);
  expect(document.querySelector('.to-ask-picture dialog')!.getBoundingClientRect().top).toBe(dialogTop);
  expect(document.querySelector('.to-ask-preview img')!.getAttribute('referrerpolicy')).toBe('no-referrer');
  const alt = document.querySelector<HTMLInputElement>('.to-ask-alt input')!;
  alt.value = 'A small icon';
  alt.dispatchEvent(new Event('input', { bubbles: true }));
  ok().click();
  expect(await got).toEqual({ url: `${location.origin}/favicon-32.png`, alt: 'A small icon' });
  expect(document.querySelector('.to-ask-picture')).toBeNull();
});

test('Web Picture: an address with no picture behind it says so; closing answers null', async () => {
  const got = askPicture({ url: `${location.origin}/no-such-picture.png` });
  await until(() => !!document.querySelector('.to-ask-broken'));
  expect(document.querySelector('.to-ask-broken')!.textContent).toContain('No picture came');
  document.querySelector<HTMLDialogElement>('.to-ask-picture dialog')!.close();
  expect(await got).toBeNull();
});

test('Web Embed: the sources are a row of icons with names; an address shows the card it will be, its source marked; OK answers the address', async () => {
  const got = askEmbed();
  await until(() => !!document.querySelector('.to-ask-embed dialog[open]'));
  expect(document.querySelector('.to-ask-embed h2')!.textContent).toBe('Web Embed');
  oneRow();
  const names = [...document.querySelectorAll('.to-ask-sources li')].map((li) => li.textContent!.trim());
  expect(names).toEqual(expect.arrayContaining(['YouTube', 'Vimeo', 'Internet Archive', 'Bluesky', 'Mastodon', 'OpenStreetMap']));
  expect(document.querySelectorAll('.to-ask-sources li svg').length).toBe(names.length);
  await typeUrl('https://www.youtube.com/watch?v=abc123');
  await until(() => !!document.querySelector('.to-ask-preview to-embed figure'));
  expect(document.querySelector('.to-ask-sources li.on')!.textContent!.trim()).toBe('YouTube');
  // Nothing is asked of the provider for the preview: the card is the card.
  expect(document.querySelector('.to-ask-preview iframe')).toBeNull();
  ok().click();
  expect(await got).toBe('https://www.youtube.com/watch?v=abc123');
});

test("Tiny Little Office Doc: a long link shows the document's first page small; OK answers its fence", async () => {
  const got = askDocLink();
  await until(() => !!document.querySelector('.to-ask-doc dialog[open]'));
  expect(document.querySelector('.to-ask-doc h2')!.textContent).toBe('Tiny Little Office Doc');
  oneRow();
  await typeUrl('https://example.com/not-a-document');
  expect(document.querySelector('.to-ask-broken')).not.toBeNull();
  expect(ok().disabled).toBe(true);
  const text = appOf('write')!.retitle('Words.\n', 'Plans');
  await typeUrl(`https://tinylittleoffice.com/#/v1/write/${encodeDoc(text)}`);
  await until(() => !!document.querySelector('.to-ask-page svg'));
  expect(document.querySelector('.to-ask-page figcaption b')!.textContent).toBe('Plans');
  expect(document.querySelector('.to-ask-page figcaption small')!.textContent).toBe('Word Processor');
  expect(ok().disabled).toBe(false);
  ok().click();
  expect(await got).toEqual({ k: 'fence', lang: 'write', body: text.replace(/\n$/, '') });
});

test('Tiny Little Office Doc: a short link is opened from the shortener, and only from it', async () => {
  const raw = crypto.getRandomValues(new Uint8Array(32));
  const key = toBase64Url(raw);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const k = await crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt']);
  const long = `https://tinylittleoffice.com/#/v1/sheet/${encodeDoc('A | B\n--- | ---\n1 | 2\n')}`;
  const c = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, k, new TextEncoder().encode(long)));
  const asked: string[] = [];
  vi.stubGlobal('fetch', async (url: string) => (asked.push(url), new Response(JSON.stringify({ c: toBase64Url(c), iv: toBase64Url(iv) }), { status: 200 })));
  expect(shortParts(`https://elsewhere.example/abcdefg#${key}`)).toBeNull();
  // A key is written with "~" for 62 now and was written with "-" before: both are the shortener's.
  const tilde = 'K~_'.repeat(14) + 'K';
  expect(shortParts(`${TINIER}abcdefg#${tilde}`)).toEqual({ at: TINIER, id: 'abcdefg', key: tilde });
  expect(shortParts(`${TINIER}abcdefg#${tilde.replace(/~/g, '-')}.${'o~'.repeat(21)}o`)).toEqual({ at: TINIER, id: 'abcdefg', key: tilde.replace(/~/g, '-') });
  const got = askDocLink();
  await until(() => !!document.querySelector('.to-ask-doc dialog[open]'));
  await typeUrl(`${TINIER}abcdefg#${key}`);
  await until(() => !ok().disabled);
  expect(asked).toEqual([`${TINIER}api/abcdefg`]);
  ok().click();
  expect(await got).toEqual({ k: 'fence', lang: 'sheet', body: 'A | B\n--- | ---\n1 | 2' });
});

test('every dialog hangs from the top of the screen, not its middle', async () => {
  void askEmbed();
  await until(() => !!document.querySelector('.to-ask-embed dialog[open]'));
  const d = document.querySelector('.to-ask-embed dialog')!.getBoundingClientRect();
  expect(d.top).toBeLessThan(innerHeight * 0.15);
  expect(innerHeight - d.bottom).toBeGreaterThan(d.top);
});

/* ---------- <to-doc-dialog> ---------- */

const DRAWING = 'rect 10 10 100 60\n';

test("<to-doc-dialog>: the Drawing Tool's own editor over a drawing; Done answers the text as it now is", async () => {
  const got = editDoc({ app: 'draw', text: DRAWING });
  await until(() => !!document.querySelector('to-doc-dialog dialog[open] to-draw-editor'));
  const d = document.querySelector('to-doc-dialog')!;
  expect(d.querySelector('h2')!.textContent).toBe('Drawing Tool');
  const ed = d.querySelector<HTMLElement & { value: string }>('to-draw-editor')!;
  expect(ed.value).toBe(DRAWING);
  // An edit in the editor (as every editor reports one) is what Done answers.
  ed.dispatchEvent(new CustomEvent('docchange', { detail: 'rect 10 10 200 60\n', bubbles: true }));
  d.querySelector<HTMLButtonElement>('.to-doc-dialog-done')!.click();
  expect(await got).toBe('rect 10 10 200 60\n');
  expect(document.querySelector('to-doc-dialog')).toBeNull();
});

test('<to-doc-dialog>: Cancel answers nothing; Escape closes it only while nothing has changed', async () => {
  let got = editDoc({ app: 'draw', text: DRAWING });
  await until(() => !!document.querySelector('to-doc-dialog dialog[open] to-draw-editor'));
  let d = document.querySelector('to-doc-dialog')!;
  d.querySelector('to-draw-editor')!.dispatchEvent(new CustomEvent('docchange', { detail: 'rect 0 0 5 5\n', bubbles: true }));
  d.dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
  await tick();
  expect(d.dialog.open).toBe(true);
  d.querySelector<HTMLButtonElement>('.to-doc-dialog-cancel')!.click();
  expect(await got).toBeNull();
  got = editDoc({ app: 'draw', text: DRAWING });
  await until(() => !!document.querySelector('to-doc-dialog dialog[open] to-draw-editor'));
  d = document.querySelector('to-doc-dialog')!;
  d.querySelector('.to-doc-dialog-body')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
  expect(await got).toBeNull();
});

test("<to-doc-dialog>: Mod+Z inside is the inner editor's own undo", async () => {
  void editDoc({ app: 'draw', text: DRAWING });
  await until(() => !!document.querySelector('to-doc-dialog dialog[open] to-draw-editor'));
  const ed = document.querySelector('to-doc-dialog to-draw-editor')!;
  const heard: string[] = [];
  ed.addEventListener('docundo', () => heard.push('undo'));
  ed.addEventListener('docredo', () => heard.push('redo'));
  const inner = ed.querySelector<HTMLElement>('svg, button') ?? ed;
  inner.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true, cancelable: true }));
  inner.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, shiftKey: true, bubbles: true, cancelable: true }));
  expect(heard).toEqual(['undo', 'redo']);
});

test('a table in the Spreadsheet: three by three to start; Rows and Columns set its size; Done answers the block', async () => {
  expect(newTable()).toEqual({
    k: 'table',
    cols: [
      { name: 'ColA', type: 'text' },
      { name: 'ColB', type: 'text' },
      { name: 'ColC', type: 'text' },
    ],
    rows: [
      ['', '', ''],
      ['', '', ''],
      ['', '', ''],
    ],
  });
  const got = editTable(newTable());
  await until(() => !!document.querySelector('to-doc-dialog dialog[open] to-sheet-editor'));
  const [rows, cols] = [...document.querySelectorAll<HTMLInputElement>('.to-doc-dialog-size input')];
  expect([rows.value, cols.value]).toEqual(['3', '3']);
  rows.value = '4';
  rows.dispatchEvent(new Event('change', { bubbles: true }));
  await tick();
  cols.value = '4';
  cols.dispatchEvent(new Event('change', { bubbles: true }));
  await tick();
  expect(document.querySelector<HTMLElement & { value: string }>('to-sheet-editor')!.value).toBe(write({ head: {}, blocks: [resizeTable(newTable(), 4, 4)] }));
  document.querySelector<HTMLButtonElement>('.to-doc-dialog-done')!.click();
  const t = await got;
  expect(t!.rows.length).toBe(4);
  expect(t!.cols.map((c) => c.name)).toEqual(['ColA', 'ColB', 'ColC', 'ColD']);
});

test('resizeTable keeps what fits and cuts what does not', () => {
  const t = {
    k: 'table' as const,
    cols: [
      { name: 'A', type: 'text' as const },
      { name: 'B', type: 'number' as const },
    ],
    rows: [
      ['x', '1'],
      ['y', '2'],
      ['z', '3'],
    ],
  };
  expect(resizeTable(t, 2, 1)).toEqual({ k: 'table', cols: [{ name: 'A', type: 'text' }], rows: [['x'], ['y']] });
  expect(resizeTable(t, 4, 3).rows).toEqual([
    ['x', '1', ''],
    ['y', '2', ''],
    ['z', '3', ''],
    ['', '', ''],
  ]);
});
