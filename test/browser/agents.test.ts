// The agent and sharing surface in the shell: a plain link made the packed one on arrival; a .tlo dropped or
// opened from the menu; Download's .tlo, .md and .pdf, and the links that download; Compare; posting to a
// service through the link guard; the embed code and the embed view; a deck's show link.
import { test, expect, afterEach, vi } from 'vitest';
import { page } from 'vitest/browser';
import { mount, tick, until, openShare, openDrawerDoc } from './helpers.ts';
import { decodeDoc, encodeDoc } from '../../src/kit/codec.ts';
import { parseHash } from '../../src/kit/route.ts';
import { store } from '../../src/kit/store.ts';
import type { ToShell } from '../../src/kit/shell.ts';
import type { ToDialog } from '../../src/kit/dialog.ts';
import type { ToDrawer } from '../../src/kit/drawer.ts';

afterEach(() => {
  vi.restoreAllMocks();
  store.remove('tinyoffice.mastodon');
  document.querySelectorAll('dialog[open]').forEach((d) => (d as HTMLDialogElement).close());
  history.replaceState(null, '', location.pathname);
});

const docNow = () => decodeDoc(parseHash(location.hash).payload);

/** What copyText hands the clipboard, while `body` runs. */
async function clipboard(body: (copied: () => string) => Promise<void>) {
  let copied = '';
  const clip = navigator.clipboard.writeText;
  navigator.clipboard.writeText = async (s: string) => void (copied = s);
  try {
    await body(() => copied);
  } finally {
    navigator.clipboard.writeText = clip;
  }
}

/** The files a download hands over (the <a download> path: no save picker here), by name. */
function downloads(): Map<string, File> {
  const got = new Map<string, File>();
  vi.stubGlobal('showSaveFilePicker', undefined);
  vi.spyOn(URL, 'createObjectURL').mockImplementation((f) => {
    got.set((f as File).name, f as File);
    return 'blob:nothing';
  });
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  return got;
}
/** Download ▾ opened, and on the format with these words the action starting so ("Download", "Copy a link") chosen. */
async function choose(shell: HTMLElement, words: string, action = 'Download') {
  if (!shell.querySelector('dialog.to-drawer[open]')) await openDrawerDoc(shell);
  shell.querySelector<HTMLButtonElement>('.to-drawer-download > button')!.click();
  await until(() => !!shell.querySelector('.to-drawer-download [popover]:popover-open'));
  const row = [...shell.querySelectorAll<HTMLElement>('.to-drawer-download .to-menu-row')].find((r) => r.getAttribute('aria-label') === words)!;
  [...row.querySelectorAll<HTMLButtonElement>('[role=menuitem]')].find((b) => b.getAttribute('aria-label')!.startsWith(action))!.click();
}

test('a plain link becomes the packed link on arrival, the document and its name as written', async () => {
  const shell = await mount('#title=Shopping&app=todo&doc=-+%5B+%5D+Milk%0A-+%5Bx%5D+Eggs&by=chores-agent');
  await until(() => !!shell.querySelector('to-todo-editor'));
  expect(location.hash).toMatch(/^#\/v1\/todo\/[yzr][A-Za-z0-9_~]+$/);
  expect(docNow()).toBe('---\nby: chores-agent\ntitle: Shopping\n---\n- [ ] Milk\n- [x] Eggs\n');
  expect(shell.querySelector<HTMLInputElement>('.to-title')!.value).toBe('Shopping');
  // md= with no app anywhere is a text.
  await mount('#md=%23+Hello%0A%0AWorld');
  await until(() => parseHash(location.hash).app === 'write');
  expect(docNow()).toBe('# Hello\n\nWorld\n');
});

test('Download gives every app a .tlo that names its app, Markdown, and the .pdf file; the links that download are copied', async () => {
  const shell = await mount(`#/v1/todo/${encodeDoc('---\ntitle: Groceries\n---\n- [ ] Milk^[oat]\n')}`);
  await until(() => !!shell.querySelector('to-todo-editor'));
  const got = downloads();
  await choose(shell, 'Text (TLO)');
  await until(() => got.has('groceries.tlo'));
  expect(await got.get('groceries.tlo')!.text()).toBe('---\ntitle: Groceries\napp: todo\n---\n- [ ] Milk^[oat]\n');
  await choose(shell, 'PDF file');
  await until(() => got.has('groceries.pdf'), 8000);
  const pdf = new Uint8Array(await got.get('groceries.pdf')!.arrayBuffer());
  expect(new TextDecoder('latin1').decode(pdf.slice(0, 8))).toBe('%PDF-1.4');
  expect(new TextDecoder('latin1').decode(pdf)).toContain('/Filter /DCTDecode');
  // An app with no Markdown of its own (a drawing) has the kit's: the text, notes in the reference form.
  const draw = await mount(
    `#/v1/draw/${encodeDoc('---\ntitle: Boxes\nalt: Two boxes^[drawn by hand]\n---\nKind | X | Y | W | H | Style | Label\n--- | --- | --- | --- | --- | --- | ---\nr | 1 | 1 | 8 | 4 | 1 | A\n')}`,
  );
  await until(() => !!draw.querySelector('to-draw-editor'));
  await choose(draw, 'Markdown');
  await until(() => got.has('boxes.md'));
  expect(await got.get('boxes.md')!.text()).toContain('Kind | X | Y | W | H | Style | Label');
  await clipboard(async (copied) => {
    await choose(draw, 'Picture (SVG)', 'Copy a link');
    await until(() => copied().includes('#/v1/draw.svg/'));
    expect(parseHash(new URL(copied()).hash).payload).toBe(parseHash(location.hash).payload);
    await choose(draw, 'PDF file', 'Copy a link');
    await until(() => copied().includes('#/v1/draw.pdf/'));
  });
});

test('a .tlo dropped on the page opens as its own app and title; a .md from the menu opens in the app open now', async () => {
  const shell = await mount(`#/v1/write/${encodeDoc('Hello\n')}`);
  await until(() => !!shell.querySelector('to-write-editor'));
  const drop = new DataTransfer();
  drop.items.add(new File(['---\ntitle: Packing\napp: todo\n---\n- [ ] Socks\n'], 'packing.tlo', { type: 'text/plain' }));
  const over = new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: drop });
  shell.dispatchEvent(over);
  expect(over.defaultPrevented).toBe(true);
  shell.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: drop }));
  await until(() => parseHash(location.hash).app === 'todo' && !!shell.querySelector('to-todo-editor'));
  expect(docNow()).toBe('---\ntitle: Packing\n---\n- [ ] Socks\n');

  // The menu: Open a file… is a file picker; a Markdown file with no title is called by its name.
  await shell.querySelector<ToDrawer>('to-drawer')!.show();
  const input = shell.querySelector<HTMLInputElement>('to-drawer .to-open-input')!;
  expect(shell.querySelector('to-drawer .to-drawer-open')!.textContent).toContain('Open a file…');
  expect(input.accept).toContain('.tlo');
  const pick = new DataTransfer();
  pick.items.add(new File(['- [ ] Tent\n'], 'camping.md', { type: 'text/markdown' }));
  input.files = pick.files;
  input.dispatchEvent(new Event('change'));
  await until(() => docNow().includes('Tent'));
  expect(parseHash(location.hash).app).toBe('todo');
  expect(docNow()).toBe('---\ntitle: camping\n---\n- [ ] Tent\n');
  // Something that is not words does not open.
  const before = location.hash;
  const bad = new DataTransfer();
  bad.items.add(new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 1, 2])], 'cat.png', { type: 'image/png' }));
  shell.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: bad }));
  await until(() => document.querySelector('[role=status]')!.textContent === 'That file is not words Tiny Little Office can read.');
  expect(location.hash).toBe(before);
});

test('Compare: two links side by side, what the second changed marked, Swap, a link pasted; from the menu it starts with this document', async () => {
  const a = encodeDoc('---\ntitle: Plan\n---\n# Goals\n\n- Ship\n- Hire\n');
  const b = encodeDoc('---\ntitle: Plan\n---\n# Goals\n\n- Ship\n- Hire two\n- Rest\n');
  const shell = await mount(`#/v1/write/${a}`);
  await until(() => !!shell.querySelector('to-write-editor'));
  await shell.querySelector<ToDrawer>('to-drawer')!.show();
  const item = shell.querySelector<HTMLAnchorElement>('to-drawer .to-drawer-compare')!;
  expect(item.getAttribute('href')).toBe(`#/compare/write/${a}`);
  item.click();
  await until(() => !!shell.querySelector('to-compare'));
  const cmp = shell.querySelector('to-compare')!;
  await until(() => !!cmp.querySelector('.cmp-a'));
  expect(cmp.querySelector('.to-empty')!.textContent).toContain('Paste a second link');
  // The second link pasted in.
  const second = cmp.querySelector<HTMLInputElement>('.cmp-b')!;
  second.value = `https://tinylittleoffice.com/write/#/v1/write/${b}`;
  second.dispatchEvent(new Event('change'));
  await until(() => location.hash === `#/compare/write/${a}/write/${b}`);
  await until(() => !!cmp.querySelector('.cmp-rows'));
  expect(cmp.querySelector('.cmp-sum')!.textContent).toBe('1 block taken out, 2 put in');
  expect([...cmp.querySelectorAll('del.cmp-del')].map((d) => d.textContent)).toEqual(['Taken out: - Hire']);
  expect([...cmp.querySelectorAll('ins.cmp-add')].map((d) => d.textContent)).toEqual(['Put in: - Hire two', 'Put in: - Rest']);
  // Side by side on a wide screen: the old block's cell left of the new; on a phone, the new under the old.
  const cells = () => {
    const row = cmp.querySelector('.cmp-row.changed')!;
    return [row.children[0].getBoundingClientRect(), row.children[1].getBoundingClientRect()];
  };
  await page.viewport(1100, 800);
  await until(() => cells()[1].left > cells()[0].left);
  expect(Math.round(cells()[1].top)).toBe(Math.round(cells()[0].top));
  await page.viewport(390, 844);
  await until(() => cells()[1].top > cells()[0].top);
  expect(Math.round(cells()[1].left)).toBe(Math.round(cells()[0].left));
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
  cmp.querySelector<HTMLButtonElement>('.cmp-swap')!.click();
  await until(() => location.hash === `#/compare/write/${b}/write/${a}`);
  await until(() => cmp.querySelector('.cmp-sum')!.textContent === '2 blocks taken out, 1 put in');
  // Not a link of ours: said in the box, the address unchanged.
  second.value = 'https://example.com/';
  second.dispatchEvent(new Event('change'));
  await tick(30);
  expect(second.validationMessage).toBe('Not a link to a Tiny Little Office document');
  expect(location.hash).toBe(`#/compare/write/${b}/write/${a}`);
});

/** The Share dialog of a document, open. */
async function share(app: string, text: string): Promise<{ shell: ToShell; d: ToDialog }> {
  const shell = await mount(`#/v1/${app}/${encodeDoc(text)}`);
  await until(() => !!shell.querySelector(`to-${app}-editor`));
  await openShare(shell);
  const d = shell.querySelector<ToDialog>('to-dialog.to-share-dialog')!;
  await until(() => d.dialog.open && !!d.querySelector('.to-share-post'));
  return { shell, d };
}
const guardHost = () => document.querySelector('to-dialog.to-link-guard dialog[open] .lg-host')?.textContent ?? '';

test('Post the link: each service’s compose box with the title and the link, through the link guard; Mastodon asks its server once', async () => {
  const { shell, d } = await share('write', '---\ntitle: Notes\n---\nHello\n');
  const open = vi.spyOn(window, 'open').mockImplementation(() => null);
  const go = async (cls: string, host: string) => {
    d.querySelector<HTMLButtonElement>(`.to-post-${cls}`)!.click();
    await until(() => guardHost() === host);
    document.querySelector<HTMLButtonElement>('to-dialog.to-link-guard .lg-go')!.click();
    await until(() => open.mock.calls.length > 0);
    const [url, target, features] = open.mock.calls.pop()!;
    expect([target, features]).toEqual(['_blank', 'noopener,noreferrer']);
    return new URL(String(url));
  };
  const bsky = await go('bluesky', 'bsky.app');
  expect(bsky.pathname).toBe('/intent/compose');
  expect(bsky.searchParams.get('text')).toBe(`Notes ${shell.link}`);
  const x = await go('x', 'x.com');
  expect([x.searchParams.get('text'), x.searchParams.get('url')]).toEqual(['Notes', shell.link]);
  const li = await go('linkedin', 'www.linkedin.com');
  expect(li.searchParams.get('url')).toBe(shell.link);
  // Mastodon: no server known, so the field for one; a handle or an address both give the host.
  d.querySelector<HTMLButtonElement>('.to-post-mastodon')!.click();
  await until(() => !!d.querySelector('.to-mastodon-server'));
  const box = d.querySelector<HTMLInputElement>('.to-mastodon-server')!;
  await until(() => document.activeElement === box);
  box.value = '@paul@Hachyderm.io';
  d.querySelector<HTMLFormElement>('.to-mastodon')!.requestSubmit();
  await until(() => guardHost() === 'hachyderm.io');
  expect(store.get('tinyoffice.mastodon')).toBe('hachyderm.io');
  document.querySelector<HTMLButtonElement>('to-dialog.to-link-guard .lg-cancel')!.click();
  await tick(30);
  // Asked once: the next time it goes straight there.
  d.querySelector<HTMLButtonElement>('.to-post-mastodon')!.click();
  await until(() => guardHost() === 'hachyderm.io');
});

test('Email opens the mail app with the title and the link (the guard says who it writes to)', async () => {
  const { shell, d } = await share('write', '---\ntitle: Notes\n---\nHello\n');
  const open = vi.spyOn(window, 'open').mockImplementation(() => null);
  d.querySelector<HTMLButtonElement>('.to-post-email')!.click();
  await until(() => !!document.querySelector('to-dialog.to-link-guard dialog[open] .lg-what'));
  expect(document.querySelector('to-dialog.to-link-guard .lg-what')!.textContent).toBe('This link writes an email to');
  document.querySelector<HTMLButtonElement>('to-dialog.to-link-guard .lg-go')!.click();
  await until(() => open.mock.calls.length > 0);
  expect(String(open.mock.calls[0][0])).toBe(`mailto:?subject=Notes&body=${encodeURIComponent(shell.link)}`);
});

test('Copy embed code: a lazy, no-referrer frame of the embed page; the embed view is the pages alone, with a way to open them', async () => {
  const { shell, d } = await share('write', '---\ntitle: Notes\n---\nHello\n');
  await clipboard(async (copied) => {
    d.querySelector<HTMLButtonElement>('.to-copy-embed')!.click();
    await until(() => copied().startsWith('<iframe'));
    const code = copied();
    expect(code).toContain('loading="lazy"');
    expect(code).toContain('referrerpolicy="no-referrer"');
    expect(code).toContain('title="Notes"');
    const src = /src="([^"]+)"/.exec(code)![1].replace(/&amp;/g, '&');
    expect(new URL(src).pathname.endsWith('/embed/')).toBe(true);
    expect(new URL(src).hash).toBe(`#/v1/write.embed/${parseHash(location.hash).payload}`);
  });
  await until(() => document.querySelector('[role=status]')!.textContent === 'Embed code copied');
  d.close();
  // The embed view itself.
  const embedded = await mount(`#/v1/write.embed/${encodeDoc('---\ntitle: Notes\n---\nHello\n')}`);
  await until(() => !!embedded.querySelector('.to-embed .to-display-page svg'));
  expect(embedded.querySelector('to-write-editor, .to-header')).toBeNull();
  expect(embedded.querySelector('.to-embed-title')!.textContent).toBe('Notes');
  const openIt = embedded.querySelector<HTMLAnchorElement>('.to-embed-open')!;
  expect(openIt.target).toBe('_blank');
  expect(new URL(openIt.href).hash).toBe(`#/v1/write/${encodeDoc('---\ntitle: Notes\n---\nHello\n')}`);
  void shell;
  // A plain link may ask for the embed view too (what /tinyoffice.js's embed() writes).
  const plain = await mount('#app=todo&view=embed&title=Packing&doc=-+%5B+%5D+Socks');
  await until(() => !!plain.querySelector('.to-embed .to-display-page svg'));
  expect(location.hash).toMatch(/^#\/v1\/todo\.embed\//);
  expect(plain.querySelector('.to-embed-title')!.textContent).toBe('Packing');
});

test('a deck’s show link opens it presenting, its way out "Edit this deck"; Share copies it', async () => {
  const deck = '## :rocket: Launch {.title}\n\n---\n\n## Goals\n\n- Ship\n';
  const shell = await mount(`#/v1/deck/${encodeDoc(deck)}?show`);
  await until(() => !!shell.querySelector('to-deck-editor .deck-show'));
  const out = [...shell.querySelectorAll<HTMLButtonElement>('.deck-show .ctl button')].find((b) => b.getAttribute('aria-label') === 'Edit this deck')!;
  expect(out).toBeTruthy();
  out.click();
  await until(() => !shell.querySelector('.deck-show'));
  // A deck's Share has the show link; another app's does not.
  await openShare(shell);
  const d = shell.querySelector<ToDialog>('to-dialog.to-share-dialog')!;
  await until(() => !!d.querySelector('.to-copy-show'));
  await clipboard(async (copied) => {
    d.querySelector<HTMLButtonElement>('.to-copy-show')!.click();
    await until(() => copied() === `${shell.link}?show`);
  });
  d.close();
  const other = await share('write', 'Hello\n');
  expect(other.d.querySelector('.to-copy-show')).toBeNull();
});
