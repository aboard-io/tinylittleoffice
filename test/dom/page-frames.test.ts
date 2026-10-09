// Pages edited where they stand (an invoice, a website, a bill split): the editor's side of the frame, worked by the
// messages the frame's script sends as a person types in it, and checked by the text saved and the page drawn next
// (ported from e2e/invoice.spec.ts, e2e/site.spec.ts and e2e/forms.spec.ts; e2e/invoice.spec.ts keeps the frame's own script).
import { test, expect } from 'vitest';
import { mount, button, settle, type, type Editor } from './helpers.ts';
import { shell, bodyOf, editorOf, framed, until, texts, shortcut, settleAll, choose, downloaded } from './helpers-apps.ts';

/** What the page shows in a place: the words of the element with this data-inv. */
const inv = (f: ReturnType<typeof framed>, what: string) => f.page().querySelector(`[data-inv="${what}"]`)?.textContent?.trim();
/** The field of the page with this name, as the frame's script names it. */
const fieldNamed = (f: ReturnType<typeof framed>, name: string) => f.page().querySelector(`[data-lf][aria-label="${name}"]`);

/** Wait for the page to be drawn afresh, with whatever check says it has been. */
async function drawn(el: Editor, check: () => void) {
  await until(async () => {
    await settle(el);
    check();
  }, 2500);
}

test('an invoice is typed straight onto the page, and the sums are done as you go', async () => {
  await shell('#/v0/invoice', { open: 'edit' });
  const el = editorOf('invoice');
  const f = framed(el);
  // Empty, it is the invoice all the same, every field a hint of what goes there.
  expect(f.frame().classList.contains('sample')).toBe(false);
  expect(fieldNamed(f, 'From, line 1')?.getAttribute('data-hint')).toBe('Your name');
  expect(fieldNamed(f, 'To, line 1')?.getAttribute('data-hint')).toBe('Who this is for');
  expect(inv(f, 'total')).toBe('$0.00');
  // (Its own buttons add and remove, so the frame's script adds no bar.)
  expect(f.page().querySelector('[data-lf-add]')).toBeTruthy();
  // Typing into a hint makes its line of the text; Tab moves on, and once the typing pauses the page is drawn
  // again with the cursor where it went (the hint's row has been made meanwhile, so it is numbered now).
  f.post({ lf: 'set', k: 0, f: 0, p: 0, v: 'Harbor Studio' });
  await settleAll();
  // (Who it is from is a setting: it goes in the header.)
  expect(bodyOf()).toMatch(/^---\nfrom: Harbor Studio\n---\n?$/);
  f.post({ lf: 'done', n: '+0,0,1' });
  await drawn(el, () => expect(f.data()?.f).toBe('0,0,1'));
  expect(f.page().querySelector('[data-lf="0,0,1"]')).toBeTruthy();
  f.post({ lf: 'set', r: 0, f: 0, p: 1, v: 'Harbor Studio | 14 Quay Street' });
  f.post({ lf: 'done', n: '+2,0' });
  f.post({ lf: 'set', k: 2, f: 0, v: '0042' });
  await settleAll();
  expect(document.title).toBe('Invoice 0042 · TinyLittleOffice');
  // A row goes under the items with its words selected to type over (the trailing comma); the quantity and price follow.
  f.post({ lf: 'done' });
  await drawn(el, () => expect(f.page().querySelector('[data-lf-add]')).toBeTruthy());
  const add = f.page().querySelector('[data-lf-add]')!;
  f.post({ lf: 'add', k: +add.getAttribute('data-lf-add')!, r: +add.getAttribute('data-lf-after')! });
  await drawn(el, () => expect(f.data()?.f).toMatch(/^\d+,$/));
  const row = parseInt(f.data()!.f, 10);
  expect(f.page().querySelector(`[data-lf^="${row},0"]`)?.getAttribute('aria-label')).toBe(`What, row ${row + 1}`);
  f.post({ lf: 'set', r: row, f: 0, v: 'Design' });
  f.post({ lf: 'set', r: row, f: 1, v: '12' });
  // (Field 2 is the units: hours, days.)
  f.post({ lf: 'set', r: row, f: 2, v: 'hours' });
  f.post({ lf: 'set', r: row, f: 3, v: '150' });
  f.post({ lf: 'done' });
  await drawn(el, () => expect(inv(f, 'total')).toBe('$1,800.00'));
  expect(bodyOf()).toContain('\nDesign | 12 | hours | 150');
  expect(inv(f, 'amount')).toBe('$1,800.00');
  // Tax is a rate typed beside its line of the sums.
  f.post({ lf: 'set', k: 5, f: 0, v: '8%' });
  f.post({ lf: 'done' });
  await drawn(el, () => expect(inv(f, 'taxed')).toBe('$144.00'));
  expect(inv(f, 'total')).toBe('$1,944.00');
  // Another row, and its button takes it away.
  const add2 = f.page().querySelector('[data-lf-add]')!;
  f.post({ lf: 'add', k: +add2.getAttribute('data-lf-add')!, r: +add2.getAttribute('data-lf-after')! });
  await drawn(el, () => expect(f.data()?.f).toMatch(/^\d+,$/));
  const row2 = parseInt(f.data()!.f, 10);
  expect(f.page().querySelector(`[data-lf^="${row2},0"]`)?.getAttribute('aria-label')).toMatch(/^What, row/);
  f.post({ lf: 'set', r: row2, f: 0, v: 'Build' });
  f.post({ lf: 'done' });
  await drawn(el, () => expect(f.page().querySelectorAll('tbody tr[data-inv=item]')).toHaveLength(2));
  expect(inv(f, 'total')).toBe('$1,954.80');
  const remove = f.page().querySelector('[aria-label="Remove the line Build"]')!;
  f.post({ lf: 'remove', r: +remove.getAttribute('data-lf-remove')! });
  await drawn(el, () => expect(f.page().querySelectorAll('tbody tr[data-inv=item]')).toHaveLength(1));
  expect(inv(f, 'total')).toBe('$1,944.00');
  // What is saved is the text, as anyone would have written it: the settings in its header, in their order, then the items as a table. (Ctrl+Shift+T pressed in the page comes as a message.)
  f.post({ lf: 'key', key: 'T', shift: true });
  await settle(el);
  expect(el.querySelector<HTMLTextAreaElement>('textarea[aria-label="Invoice, as text"]')!.value).toBe('---\nfrom: Harbor Studio | 14 Quay Street\nnumber: 0042\ntax: 8%\n---\nWhat | Qty:number | Units | Price:money\n--- | --- | --- | ---\nDesign | 12 | hours | 150');
});

test('the example invoice is edited where it stands, and the page it downloads is clean', async () => {
  await shell('#/v0/invoice', { open: 'edit' });
  const el = editorOf('invoice');
  const f = framed(el);
  button(el, 'Start from an example').click();
  await settle(el);
  expect(inv(f, 'total')).toBe('$5,486.40');
  // A quantity changed changes the sums; a cleared field shows its hint again.
  const qty = fieldNamed(f, 'Qty, row 7')!.getAttribute('data-lf')!.split(',').map(Number);
  f.post({ lf: 'set', r: qty[0], f: qty[1], v: '10' });
  f.post({ lf: 'done' });
  await drawn(el, () => expect(inv(f, 'total')).toBe('$5,162.40'));
  expect(inv(f, 'amount')).toBe('$1,500.00');
  const due = fieldNamed(f, 'Due')!.getAttribute('data-lf')!.split(',').map(Number);
  f.post({ lf: 'set', r: due[0], f: due[1], v: '' });
  // (Escape blurs the field: the page is drawn again at once.)
  f.post({ lf: 'done' });
  // A date is the browser's own date box, emptied.
  await drawn(el, () => expect((fieldNamed(f, 'Due') as HTMLInputElement | null)?.value).toBe(''));
  expect(fieldNamed(f, 'Due')!.getAttribute('type')).toBe('date');
  shortcut('t', { mod: true, shift: true });
  await settle(el);
  expect(el.querySelector<HTMLTextAreaElement>('textarea[aria-label="Invoice, as text"]')!.value).toMatch(/^---\nfrom: Harbor Studio \| 14 Quay Street\nto: Acme Ltd \| Accounts payable\nnumber: 0042\ndate: 2027-03-01\ntax: 8%\n---\nWhat \| Qty:number \| Units \| Price:money\n--- \| --- \| --- \| ---\nDesign \| 10 \| hours \| 150\n/);
  // The downloaded page carries none of the editing. (The PDF is drawn on a canvas: e2e/invoice.spec.ts.)
  const file = await downloaded(() => choose('Download', /Web page/));
  expect(file.name).toBe('invoice-0042.html');
  const html = await file.text();
  expect(html).toContain('<td>Design</td><td class="n">10</td><td class="u">hours</td>');
  expect(html).not.toContain('data-lf');
  expect(html).not.toContain('<script>');
});

const TWO = 'theme: teal\n\n# Harbor Coffee\n\nRoasted on the quay.\n\n> Menu | #menu\n\n- :coffee: Daily | Fresh\n\n# Menu\n\nEspresso and buns.\n\n## Coffee\n\n- Espresso | 3.00';
const nav = (f: ReturnType<typeof framed>) => texts(f.page(), 'nav[aria-label="Pages"] a');
/** The part of the page the frame is told to open on. */
const placed = (f: ReturnType<typeof framed>) => JSON.parse(f.page().getElementById('lf-at')?.textContent ?? '""');

test('a site of two pages: the page drawn afresh keeps its place, and the download is the same file', async () => {
  await shell('#/v0/site');
  const el = editorOf('site');
  const f = framed(el);
  const area = el.querySelector<HTMLTextAreaElement>('textarea[aria-label="Website, as text"]')!;
  type(area, TWO);
  await settle(el);
  expect(nav(f)).toEqual(['Home', 'Menu']);
  expect(f.page().querySelector('#home h1')?.textContent).toBe('Harbor Coffee');
  expect(f.page().querySelector('#menu h2')?.textContent).toBe('Coffee');
  expect(placed(f)).toBe('');
  // The nav switches pages inside the frame (e2e/site.spec.ts), which says which is on show; the text changes under it,
  // and the page drawn afresh opens on Menu.
  f.post({ lf: 'hash', h: '#menu' });
  type(area, TWO + '\n- Flat white | 4.20');
  await settle(el);
  expect(f.page().querySelectorAll('#menu .cards li')).toHaveLength(2);
  expect(placed(f)).toBe('#menu');
  // What downloads is the whole site, one file, without the editor's own script.
  const file = await downloaded(() => choose('Download', /Web page/));
  expect(file.name).toBe('harbor-coffee.html');
  const html = await file.text();
  expect(html).toContain('<section class="page" id="home">');
  expect(html).toContain('<section class="page" id="menu">');
  expect(html).toContain('<nav aria-label="Pages"><a href="#home">Home</a><a href="#menu">Menu</a></nav>');
  expect(html).toContain('--a:#0f766e');
  expect(html).not.toContain('lf-at');
  expect(html.match(/<script>/g)).toHaveLength(1);
});

test('on the picture: a page is added after the one on show, named, moved, and taken away', async () => {
  localStorage.setItem('tinyoffice.keep', '1');
  localStorage.setItem('tinyoffice.edit', 'text');
  const { el, last } = await mount('site');
  const f = framed(el);
  const text = '# Harbor Coffee\n\nRoasted on the quay.\n\n# Menu\n\nEspresso.\n\n# Visit\n\nQuay Street.';
  type(el.querySelector('textarea[aria-label="Website, as text"]'), text);
  await settle(el);
  shortcut('t', { mod: true, shift: true });
  await settle(el);
  // Menu chosen in the nav: the frame says so.
  f.post({ lf: 'hash', h: '#menu' });
  // A new page follows the one on show, with its title ready to type over.
  f.post({ lf: 'add', k: f.data()!.k.findIndex((k) => k.name === 'Page') });
  await settle(el);
  expect(nav(f)).toEqual(['Home', 'Menu', 'Title', 'Visit']);
  expect(f.data()!.f).toBe('4,');
  // (The frame's script finds "Title" in the page and makes it the field "Title, row 5".)
  expect(f.data()!.v).toContainEqual([4, 0, 'Title', 'Title']);
  f.post({ lf: 'set', r: 4, f: 0, v: 'Hours' });
  f.post({ lf: 'done' });
  await drawn(el, () => expect(nav(f)).toEqual(['Home', 'Menu', 'Hours', 'Visit']));
  // The page on show can be moved past its neighbour, and taken away with everything in it.
  const row = (id: string) => f.data()!.p.find((p) => p[0] === id)![1];
  f.post({ lf: 'part', r: row('hours'), do: 'down' });
  await settle(el);
  expect(nav(f)).toEqual(['Home', 'Menu', 'Visit', 'Hours']);
  f.post({ lf: 'part', r: row('hours'), do: 'up' });
  await settle(el);
  expect(nav(f)).toEqual(['Home', 'Menu', 'Hours', 'Visit']);
  f.post({ lf: 'part', r: row('hours'), do: 'remove' });
  await settle(el);
  expect(nav(f)).toEqual(['Home', 'Menu', 'Visit']);
  expect(placed(f)).toBe('');
  expect(last()).toBe(text);
});
