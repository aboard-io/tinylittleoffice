// Pages edited where they stand (a website, a bill split): the editor's side of the frame, worked by the
// messages the frame's script sends as a person types in it, and checked by the text saved and the page drawn next
// (ported from e2e/site.spec.ts and e2e/forms.spec.ts).
import { test, expect } from 'vitest';
import { mount, button, settle, type, type Editor } from './helpers.ts';
import { shell, bodyOf, editorOf, framed, until, texts, shortcut, settleAll, choose, downloaded } from './helpers-apps.ts';


/** Wait for the page to be drawn afresh, with whatever check says it has been. */
async function drawn(el: Editor, check: () => void) {
  await until(async () => {
    await settle(el);
    check();
  }, 2500);
}

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
