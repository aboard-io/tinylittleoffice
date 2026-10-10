// The Download menu: placed under its button at every size, and a table of formats, each with view, share,
// download and copy link (kit/exports.ts exportItems, kit/menu.ts's rows of actions).
import { test, expect, afterEach, vi } from 'vitest';
import { page } from 'vitest/browser';
import { mount, until } from './helpers.ts';
import { encodeDoc } from '../../src/kit/codec.ts';
import { parseHash } from '../../src/kit/route.ts';
import { keepSize, stepSize } from '../../src/kit/zoom.ts';
import type { ToShell } from '../../src/kit/shell.ts';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  stepSize(0);
  history.replaceState(null, '', location.pathname);
});

const menu = (shell: HTMLElement) => shell.querySelector<HTMLElement>('.to-download [popover]')!;
async function openDownload(shell: ToShell) {
  shell.querySelector<HTMLButtonElement>('.to-download > button')!.click();
  await until(() => menu(shell).matches(':popover-open'));
  await until(() => !!menu(shell).style.top).catch(() => {});
}

test('at every size on a phone the Download button stays at the header\'s right and its menu comes down under it, never at the left edge', async () => {
  await page.viewport(390, 844);
  for (const at of [1, 1.5, 2, 2.5]) {
    keepSize(at);
    const shell = await mount(`#/v1/write/${encodeDoc('# Notes\n\nWords.\n')}`);
    await until(() => !!shell.querySelector('to-write-editor'));
    await openDownload(shell);
    const b = shell.querySelector('.to-download > button')!.getBoundingClientRect();
    const m = menu(shell).getBoundingClientRect();
    // The button itself stays in the header's one row, at the screen's right (Paul: "the download button just hovers in the left").
    const header = shell.querySelector('.to-header')!.getBoundingClientRect();
    expect(b.right, `size ${at}`).toBeGreaterThan(390 - 24);
    expect(b.bottom, `size ${at}`).toBeLessThanOrEqual(header.bottom);
    expect(shell.querySelector('.to-share')!.getBoundingClientRect().top, `size ${at}`).toBe(b.top);
    expect(m.top, `size ${at}`).toBeGreaterThanOrEqual(b.bottom - 1);
    expect(m.top, `size ${at}`).toBeLessThan(b.bottom + 20);
    expect(m.right, `size ${at}`).toBeLessThanOrEqual(390);
    // Right-aligned to the button (the button is at the screen's right): its right edge near the button's.
    expect(Math.abs(m.right - b.right), `size ${at}`).toBeLessThan(16);
    expect(m.left, `size ${at}`).toBeGreaterThanOrEqual(0);
    menu(shell).hidePopover();
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
const rows = (shell: HTMLElement) => [...shell.querySelectorAll<HTMLElement>('.to-download .to-menu-row')];
const row = (shell: HTMLElement, name: string) => rows(shell).find((r) => r.getAttribute('aria-label') === name)!;
const acts = (r: HTMLElement) => [...r.querySelectorAll<HTMLButtonElement>('[role=menuitem]')];

test('the Word Processor\'s Download menu is a row per format, each with view, download and copy link, and share where the device takes the file', async () => {
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
    acts(row(shell, 'Text (TLO)')).find((b) => b.getAttribute('aria-label') === 'Download the .tlo')!.click();
    await until(() => got.has('notes.tlo'));
    expect(shared.length).toBe(1);
  });
});

test('Copy link gives the link that downloads the file, and opening it downloads the file (.pdf, .png, .md)', async () => {
  const shell = await mount(NOTES);
  await until(() => !!shell.querySelector('to-write-editor'));
  const links: Record<string, string> = {};
  await clipboard(async (copied) => {
    for (const [name, ext] of [['PDF file', 'pdf'], ['Picture (PNG)', 'png'], ['Markdown', 'md']]) {
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

test('the keys: Up and Down between rows, Left and Right between a row\'s actions, Enter acts, Home and End', async () => {
  await page.viewport(390, 844);
  const shell = await mount(NOTES);
  await until(() => !!shell.querySelector('to-write-editor'));
  const button = shell.querySelector<HTMLButtonElement>('.to-download > button')!;
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
