// Insert ▾ narrowed by the letters typed; the QR code of this document as a picture Write, Deck and Website
// hold; and the new blank documents of every other app offered wherever a document can hold one.
import { test, expect, afterEach } from 'vitest';
import { mount, tick, until } from './helpers.ts';
import { encodeDoc, decodeDoc } from '../../src/kit/codec.ts';
import { apps, appOf } from '../../src/kit/apps.ts';
import { lookup } from '../../src/kit/app.ts';
import { qrPage, setSelfLink } from '../../src/kit/qr-picture.ts';
import type { ToShell } from '../../src/kit/shell.ts';
import type { ToInsert } from '../../src/kit/insert.ts';

afterEach(() => history.replaceState(null, '', location.pathname));

async function openInsert(shell: ToShell, app: string): Promise<ToInsert> {
  await until(() => !!shell.querySelector(`to-${app}-editor to-insert`));
  const ins = shell.querySelector<ToInsert>(`to-${app}-editor to-insert`)!;
  ins.button.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  ins.button.click();
  await until(() => ins.isOpen);
  return ins;
}
const names = (ins: ToInsert) => [...ins.menu.querySelectorAll('[role^=menuitem]')].map((b) => b.querySelector('.to-menu-words > span')!.textContent);
const typeIn = async (ins: ToInsert, key: string) => {
  const at = ins.menu.contains(document.activeElement) ? document.activeElement! : ins.menu;
  at.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
  await ins.updateComplete;
  await tick();
};

test('typing in Insert ▾ narrows it to the items with a word starting so; Backspace widens, Escape clears, then closes', async () => {
  const shell = await mount(`#/v1/write/${encodeDoc('Words.\n')}`);
  const ins = await openInsert(shell, 'write');
  const all = names(ins).length;
  expect(all).toBeGreaterThan(12);
  await typeIn(ins, 't');
  expect(names(ins)).toEqual(expect.arrayContaining(['Table', 'Tiny Little Office Doc…', 'QR code of this document', 'Trip Planner']));
  expect(names(ins)).not.toContain('Web Picture…');
  expect(names(ins).length).toBeLessThan(all);
  await typeIn(ins, 'a');
  expect(names(ins)).toEqual(['Table']);
  expect(ins.menu.querySelector('.to-menu-filter')!.textContent).toBe('Starting “ta”');
  expect(document.activeElement!.textContent).toContain('Table');
  await typeIn(ins, 'z');
  expect(names(ins)).toEqual([]);
  expect(ins.menu.querySelector('.to-menu-filter')!.textContent).toBe('Nothing starts “taz”');
  await typeIn(ins, 'Backspace');
  expect(names(ins)).toEqual(['Table']);
  await typeIn(ins, 'Escape');
  expect(names(ins).length).toBe(all);
  expect(ins.isOpen).toBe(true);
  await typeIn(ins, 'q');
  expect(names(ins)).toEqual(['QR code of this document']);
  await typeIn(ins, 'Escape');
  await typeIn(ins, 'Escape');
  expect(ins.isOpen).toBe(false);
  // Opened again, the list is whole.
  ins.button.click();
  await until(() => ins.isOpen);
  expect(names(ins).length).toBe(all);
  ins.close();
});

test('the QR code of this document: put in from Insert ▾, a fence that draws the code of the document’s own link', async () => {
  const shell = await mount(`#/v1/write/${encodeDoc('Scan me.\n')}`);
  const ins = await openInsert(shell, 'write');
  const qr = [...ins.menu.querySelectorAll<HTMLButtonElement>('[role^=menuitem]')].find((b) => b.textContent!.includes('QR code of this document'))!;
  qr.click();
  await until(() => decodeDoc(location.hash.split('/')[3]).includes('```qr'));
  // With no caret in the words, at the top.
  expect(decodeDoc(location.hash.split('/')[3]).replace(/^---\ncreated: [^\n]*\n---\n/, '')).toBe('```qr\n```\n\nScan me.\n');
  // Drawn from the link as it is now, in the editor and on the page.
  await until(() => !!shell.querySelector('to-write-editor .write-doc svg'));
  const page = appOf('write')!.view(decodeDoc(location.hash.split('/')[3]))[0];
  expect(page.svg).toContain('shape-rendering="crispEdges"');
  await until(() => lookup.appOf('qr')!.view('')[0].svg === qrPage(shell.link).svg);
  expect(lookup.appOf('qr')!.view('')[0].svg).toBe(qrPage(shell.link).svg);
  expect(appOf('qr')).toBeUndefined();
});

test('a QR picture with no link yet, or one too long, says so instead', () => {
  setSelfLink('');
  expect(qrPage('').alt).toBe('QR code of this document');
  expect(qrPage('https://x.example/' + 'a'.repeat(4000)).alt).toMatch(/Too long for a QR code/);
});

test('Deck and Website offer the QR code too; every app that holds documents offers a new one of each other app', async () => {
  for (const [app, doc] of [
    ['write', 'Words.\n'],
    ['deck', '## A slide\n'],
    ['outline', '- An idea\n'],
    ['site', '# Harbor Coffee\n\n## Menu\n\nWords.\n'],
  ] as const) {
    const shell = await mount(`#/v1/${app}/${encodeDoc(doc)}`);
    const ins = await openInsert(shell, app);
    const items = [...ins.menu.querySelectorAll('[role=group]')].find((g) => g.getAttribute('aria-label') === 'A new document');
    expect(items, app).toBeTruthy();
    expect([...items!.querySelectorAll('[role^=menuitem]')].map((b) => b.textContent!.trim())).toEqual(
      apps()
        .filter((a) => a.id !== app)
        .map((a) => a.name),
    );
    if (app !== 'outline') expect(names(ins), app).toContain('QR code of this document');
    ins.close();
  }
});
