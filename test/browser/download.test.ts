// The Download menu: the drawer's This document row (round nine: the header is the title), placed under its row at
// every size, and a table of formats, each with view, share, download and copy link (kit/exports.ts exportItems,
// kit/menu.ts's rows of actions).
import { test, expect, afterEach, vi } from 'vitest';
import { page } from 'vitest/browser';
import { mount, openDrawerDoc, until } from './helpers.ts';
import { encodeDoc } from '../../src/kit/codec.ts';
import { appOf } from '../../src/kit/apps.ts';
import { parseHash } from '../../src/kit/route.ts';
import { keepSize, stepSize } from '../../src/kit/zoom.ts';
import type { ToShell } from '../../src/kit/shell.ts';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  stepSize(0);
  history.replaceState(null, '', location.pathname);
});

const menu = (shell: HTMLElement) => shell.querySelector<HTMLElement>('.to-drawer-download [popover]')!;
/** Download, from the drawer (opened first, unless it is). */
async function openDownload(shell: ToShell) {
  if (!shell.querySelector('dialog.to-drawer[open]')) await openDrawerDoc(shell);
  shell.querySelector<HTMLButtonElement>('.to-drawer-download > button')!.click();
  await until(() => menu(shell).matches(':popover-open'));
  await until(() => !!menu(shell).style.top).catch(() => {});
}

test("at every size on a phone the drawer's Download row opens its menu under it, inside the screen, never off its left edge", async () => {
  await page.viewport(390, 844);
  for (const at of [1, 1.5, 2, 2.5]) {
    keepSize(at);
    const shell = await mount(`#/v1/write/${encodeDoc('# Notes\n\nWords.\n')}`);
    await until(() => !!shell.querySelector('to-write-editor'));
    await openDownload(shell);
    const b = shell.querySelector('.to-drawer-download > button')!.getBoundingClientRect();
    const m = menu(shell).getBoundingClientRect();
    // The row is the drawer's, under Share…; no Share or Download in the header.
    expect(shell.querySelector('.to-header .to-share, .to-header .to-download')).toBeNull();
    expect(b.top, `size ${at}`).toBeGreaterThanOrEqual(shell.querySelector('.to-drawer-share')!.getBoundingClientRect().bottom - 0.5);
    expect(m.top, `size ${at}`).toBeGreaterThanOrEqual(b.bottom - 1);
    expect(m.top, `size ${at}`).toBeLessThan(b.bottom + 20);
    expect(m.right, `size ${at}`).toBeLessThanOrEqual(390);
    expect(m.left, `size ${at}`).toBeGreaterThanOrEqual(0);
    menu(shell).hidePopover();
    shell.querySelector<HTMLDialogElement>('dialog.to-drawer')!.close();
  }
});

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

/** A device whose share sheet takes files, while `body` runs; what it was handed. */
async function shareSheet(body: (shared: ShareData[]) => Promise<void>) {
  const shared: ShareData[] = [];
  const nav = navigator as unknown as Record<string, unknown>;
  Object.defineProperty(navigator, 'canShare', { value: (d: ShareData) => !!d.files?.every((f) => /^(application\/pdf|image\/|text\/)/.test(f.type)), configurable: true });
  Object.defineProperty(navigator, 'share', { value: async (d: ShareData) => void shared.push(d), configurable: true });
  try {
    await body(shared);
  } finally {
    delete nav.canShare;
    delete nav.share;
  }
}

const NOTES = `#/v1/write/${encodeDoc('---\ntitle: Notes\n---\n# Notes\n\nWords.\n')}`;
const rows = (shell: HTMLElement) => [...shell.querySelectorAll<HTMLElement>('.to-drawer-download .to-menu-row')];
const row = (shell: HTMLElement, name: string) => rows(shell).find((r) => r.getAttribute('aria-label') === name)!;
const acts = (r: HTMLElement) => [...r.querySelectorAll<HTMLButtonElement>('[role=menuitem]')];

test("the Word Processor's Download menu is a row per format, each with view, download and copy link, and share where the device takes the file", async () => {
  await page.viewport(390, 844);
  let shell = await mount(NOTES);
  await until(() => !!shell.querySelector('to-write-editor'));
  await openDownload(shell);
  const items = [...menu(shell).children].map((el) => el.getAttribute('aria-label') ?? el.textContent!.trim());
  expect(items[0]).toContain('Print, or save as PDF');
  expect(rows(shell).map((r) => r.getAttribute('aria-label'))).toEqual(['PDF file', 'Picture (PNG)', 'Text (TLO)', 'Word (DOCX)', 'Markdown', 'Rich Text (RTF)', 'Web page (HTML)']);
  // No share sheet here (a desktop browser): three actions; a .docx the browser cannot show has no View.
  expect(acts(row(shell, 'PDF file')).map((b) => b.getAttribute('aria-label'))).toEqual(['View the .pdf', 'Download the .pdf', 'Copy a link that downloads the .pdf']);
  expect(acts(row(shell, 'Word (DOCX)')).map((b) => b.getAttribute('aria-label'))).toEqual(['Download the .docx', 'Copy a link that downloads the .docx']);
  for (const b of acts(row(shell, 'PDF file'))) expect(b.title).toBe(b.getAttribute('aria-label'));
  // Wider than a menu: the screen's width less the gutters on a phone.
  expect(menu(shell).getBoundingClientRect().width).toBeGreaterThan(340);
  menu(shell).hidePopover();
  await shareSheet(async () => {
    shell = await mount(NOTES);
    await until(() => !!shell.querySelector('to-write-editor'));
    await openDownload(shell);
    expect(acts(row(shell, 'PDF file')).map((b) => b.getAttribute('aria-label'))).toEqual(['View the .pdf', 'Share the .pdf…', 'Download the .pdf', 'Copy a link that downloads the .pdf']);
    expect(acts(row(shell, 'Word (DOCX)')).map((b) => b.getAttribute('aria-label'))).toEqual(['Download the .docx', 'Copy a link that downloads the .docx']);
    menu(shell).hidePopover();
  });
});

test('View opens the file in a new tab from a blob of its type; Share hands the share sheet the file; Download downloads it', async () => {
  await page.viewport(390, 844);
  const tab = { opener: window as Window | null, location: { href: '' }, close: vi.fn() };
  const open = vi.spyOn(window, 'open').mockImplementation(() => tab as unknown as Window);
  let shell = await mount(NOTES);
  await until(() => !!shell.querySelector('to-write-editor'));
  await openDownload(shell);
  acts(row(shell, 'PDF file'))[0].click();
  expect(open).toHaveBeenCalledTimes(1);
  await until(() => tab.location.href.startsWith('blob:'), 8000);
  expect(tab.opener).toBe(null);
  const blob = await (await fetch(tab.location.href)).blob();
  expect(blob.type).toBe('application/pdf');
  expect(new TextDecoder('latin1').decode(new Uint8Array(await blob.slice(0, 8).arrayBuffer()))).toBe('%PDF-1.4');
  // Markdown is shown as the text it is.
  tab.location.href = '';
  await openDownload(shell);
  acts(row(shell, 'Markdown'))[0].click();
  await until(() => tab.location.href.startsWith('blob:'));
  const md = await (await fetch(tab.location.href)).blob();
  expect(md.type).toBe('text/plain;charset=utf-8');
  expect(await md.text()).toContain('# Notes');
  await shareSheet(async (shared) => {
    shell = await mount(NOTES);
    await until(() => !!shell.querySelector('to-write-editor'));
    await openDownload(shell);
    acts(row(shell, 'Picture (PNG)'))[1].click();
    await until(() => shared.length === 1, 8000);
    const file = shared[0].files![0];
    expect(file).toBeInstanceOf(File);
    expect(file.type).toBe('image/png');
    expect(file.name).toBe('notes.png');
    // Download downloads, the share sheet being Share's.
    const got = downloads();
    await openDownload(shell);
    acts(row(shell, 'Text (TLO)'))
      .find((b) => b.getAttribute('aria-label') === 'Download the .tlo')!
      .click();
    await until(() => got.has('notes.tlo'));
    expect(shared.length).toBe(1);
  });
});

test('Copy link gives the link that downloads the file, and opening it downloads the file (.pdf, .png, .md)', async () => {
  const shell = await mount(NOTES);
  await until(() => !!shell.querySelector('to-write-editor'));
  const links: Record<string, string> = {};
  await clipboard(async (copied) => {
    for (const [name, ext] of [
      ['PDF file', 'pdf'],
      ['Picture (PNG)', 'png'],
      ['Markdown', 'md'],
    ]) {
      await openDownload(shell);
      acts(row(shell, name)).at(-1)!.click();
      await until(() => copied().includes(`#/v1/write.${ext}/`));
      links[ext] = copied();
    }
  });
  const got = downloads();
  for (const ext of ['pdf', 'png', 'md']) {
    const opened = await mount(new URL(links[ext]).hash);
    await until(() => got.has(`notes.${ext}`), 8000);
    // The document is shown behind, at its own link again.
    await until(() => !!opened.querySelector('to-write-editor') && parseHash(location.hash).view === '');
  }
  expect(await got.get('notes.md')!.text()).toContain('# Notes');
  expect(got.get('notes.png')!.type).toBe('image/png');
});

test("the keys: Up and Down between rows, Left and Right between a row's actions, Enter acts, Home and End", async () => {
  await page.viewport(390, 844);
  const shell = await mount(NOTES);
  await until(() => !!shell.querySelector('to-write-editor'));
  await openDrawerDoc(shell);
  const button = shell.querySelector<HTMLButtonElement>('.to-drawer-download > button')!;
  button.focus();
  button.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  button.click();
  await until(() => menu(shell).matches(':popover-open'));
  const key = (k: string) => document.activeElement!.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
  const print = menu(shell).querySelector<HTMLElement>('.to-menu-item')!;
  await until(() => document.activeElement === print);
  const pdf = acts(row(shell, 'PDF file'));
  key('ArrowDown');
  expect(document.activeElement).toBe(pdf[0]);
  key('ArrowRight');
  expect(document.activeElement).toBe(pdf[1]);
  key('ArrowRight');
  key('ArrowRight');
  expect(document.activeElement).toBe(pdf[0]);
  key('ArrowLeft');
  expect(document.activeElement).toBe(pdf.at(-1));
  // Down from any action goes to the next row's first.
  key('ArrowDown');
  expect(document.activeElement).toBe(acts(row(shell, 'Picture (PNG)'))[0]);
  key('ArrowUp');
  key('ArrowUp');
  expect(document.activeElement).toBe(print);
  // The stops: Print, each row's first action, then the hand-offs ("Open in"), each an item of its own.
  const stops = [...menu(shell).querySelectorAll<HTMLElement>('[role^=menuitem]')].filter((el) => !el.closest('.to-menu-row') || el === acts(el.closest('.to-menu-row')!)[0]);
  expect(stops.length).toBeGreaterThan(rows(shell).length + 1);
  expect(stops[rows(shell).length]).toBe(acts(row(shell, 'Web page (HTML)'))[0]);
  expect(stops.at(-1)!.closest('[role=group]')!.getAttribute('aria-label')).toBe('Open in');
  key('End');
  expect(document.activeElement).toBe(stops.at(-1));
  key('ArrowUp');
  for (let i = 0; i < stops.length - rows(shell).length - 2; i++) key('ArrowUp');
  expect(document.activeElement).toBe(acts(row(shell, 'Web page (HTML)'))[0]);
  key('Home');
  expect(document.activeElement).toBe(print);
  // A screen reader hears the row (a group named for the format), then the action.
  expect(row(shell, 'PDF file').getAttribute('role')).toBe('group');
  expect(menu(shell).getAttribute('role')).toBe('menu');
  // Enter does the action in hand: the link copied, the menu closed, the focus back on the button.
  await clipboard(async (copied) => {
    key('ArrowDown');
    key('ArrowLeft');
    key('Enter');
    await until(() => copied().includes('#/v1/write.pdf/'));
  });
  await until(() => !menu(shell).matches(':popover-open'));
  expect(document.activeElement).toBe(button);
  // Escape closes.
  button.click();
  await until(() => menu(shell).matches(':popover-open'));
  menu(shell).dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
  await until(() => !menu(shell).matches(':popover-open'));
});

test('at size 2 the actions never overlap, each a whole target, and the table scrolls inside the popover', async () => {
  await page.viewport(390, 844);
  keepSize(2);
  const shell = await mount(NOTES);
  await until(() => !!shell.querySelector('to-write-editor'));
  await openDownload(shell);
  const m = menu(shell);
  const box = m.getBoundingClientRect();
  expect(box.bottom).toBeLessThanOrEqual(844);
  expect(box.right).toBeLessThanOrEqual(390);
  expect(m.scrollHeight).toBeGreaterThan(m.clientHeight);
  for (const r of rows(shell)) {
    const rects = acts(r).map((b) => b.getBoundingClientRect());
    for (const a of rects) {
      expect(a.width).toBeGreaterThanOrEqual(44);
      expect(a.height).toBeGreaterThanOrEqual(44);
    }
    for (let i = 1; i < rects.length; i++) expect(rects[i].left).toBeGreaterThanOrEqual(rects[i - 1].right - 0.5);
  }
});

/** A row's actions, by what each does: view, share, download, link. */
const kinds = (r: HTMLElement) =>
  acts(r).map((b) =>
    b
      .getAttribute('aria-label')!
      .replace(/^(\w+).*/, '$1')
      .toLowerCase(),
  );

test('the table reads each format: View where the browser shows the file, Share where the device takes it, Download and Copy link always (Write, Animator)', async () => {
  await page.viewport(390, 844);
  await shareSheet(async () => {
    let shell = await mount(NOTES);
    await until(() => !!shell.querySelector('to-write-editor'));
    await openDownload(shell);
    // The share sheet here takes PDFs, pictures and texts: a .docx it does not, and the browser shows a .docx not at all.
    const want: Record<string, string[]> = {
      'PDF file': ['view', 'share', 'download', 'copy'],
      'Picture (PNG)': ['view', 'share', 'download', 'copy'],
      'Web page (HTML)': ['view', 'share', 'download', 'copy'],
      Markdown: ['view', 'share', 'download', 'copy'],
      'Text (TLO)': ['view', 'share', 'download', 'copy'],
      'Word (DOCX)': ['download', 'copy'],
    };
    for (const [name, has] of Object.entries(want)) expect(kinds(row(shell, name)), name).toEqual(has);
    expect(menu(shell).getBoundingClientRect().right).toBeLessThanOrEqual(390);
    menu(shell).hidePopover();
    shell = await mount(`#/v1/anim/${encodeDoc(appOf('anim')!.blank())}`);
    await until(() => !!shell.querySelector('to-anim-editor'));
    await openDownload(shell);
    expect(rows(shell).map((r) => r.getAttribute('aria-label'))).toEqual(['PDF file', 'Picture (PNG)', 'Web page (HTML)', 'Markdown', 'Text (TLO)', 'Animated GIF', 'Animated SVG']);
    expect(kinds(row(shell, 'Animated GIF'))).toEqual(['view', 'share', 'download', 'copy']);
    expect(acts(row(shell, 'Animated GIF')).map((b) => b.getAttribute('aria-label'))).toEqual(['View the .gif', 'Share the .gif…', 'Download the .gif', 'Copy a link that downloads the .gif']);
    menu(shell).hidePopover();
  });
});

test('a ".<ext>" link downloads any of the app\'s formats, a kit\'s or its own, and an extension it has not opens the document plainly', async () => {
  const got = downloads();
  const payload = NOTES.slice('#/v1/write/'.length);
  for (const ext of ['tlo', 'docx']) {
    const shell = await mount(`#/v1/write.${ext}/${payload}`);
    await until(() => got.has(`notes.${ext}`), 8000);
    await until(() => !!shell.querySelector('to-write-editor') && parseHash(location.hash).view === '');
  }
  expect(got.get('notes.docx')!.type).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  expect(await got.get('notes.tlo')!.text()).toContain('app: write');
  // An animation's GIF, by its own link.
  const anim = await mount(`#/v1/anim.gif/${encodeDoc(appOf('anim')!.blank())}`);
  await until(() => [...got.keys()].some((n) => n.endsWith('.gif')), 15000);
  await until(() => !!anim.querySelector('to-anim-editor'));
  // No such format: the document, and nothing else (no file, no word about it).
  got.clear();
  const shell = await mount(`#/v1/write.nope/${payload}`);
  await until(() => !!shell.querySelector('to-write-editor') && parseHash(location.hash).view === '');
  await new Promise((r) => setTimeout(r, 300));
  expect(got.size).toBe(0);
  expect(shell.querySelector('to-toast [role=status]')?.textContent ?? '').toBe('');
}, 40_000);
