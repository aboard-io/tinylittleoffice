// The shell, <to-app>, opened at a link and worked as a person would: what it shows, and the link it writes (ported from e2e/shell.spec.ts).
import { test, expect } from 'vitest';
import { open, reopen, idle, until, link, body, $, $$, text, fill, key, button, press, menu, write, box, cell, toast, downloads, bytes } from './helpers-shell.ts';
import { encodeEnvelope } from '../../src/lib/envelope.ts';
import { parseTodos } from '../../src/lib/todomodel.ts';
import { parseGrid } from '../../src/lib/formula.ts';
// The rest of the shell's tests, by area. They are one file to vitest so the shell and every editor are loaded,
// and warmed, once rather than once a file.
import './shell-privacy.ts';
import './shell-undo.ts';

/** Open the menu and follow its link to an app, unfolding its cluster first if it is shut. */
async function navTo(name: string) {
  button('Menu').click();
  await idle();
  const a = $$('#nav-drawer .to-drawer-nav a').find((l) => text(l) === name)!;
  const cluster = a.closest('details');
  if (cluster && !cluster.open) cluster.open = true;
  // An app in the menu opens in a new tab; the test follows it in this one.
  expect(a.target).toBe('_blank');
  a.addEventListener('click', (e) => e.preventDefault(), { once: true });
  a.click();
  location.hash = a.getAttribute('href')!;
  await new Promise((r) => setTimeout(r, 5));
  await idle();
}

test('navigation: the menu leads to each app, and closes behind it', async () => {
  await open('');
  await navTo('Deck');
  expect(location.hash).toBe('#/v0/deck');
  expect(text($('.to-panel h1'))).toMatch(/^Deck/);
  expect($('#nav-drawer').hasAttribute('open')).toBe(false);
  await navTo('Calendar');
  expect(text($('.to-panel h1'))).toMatch(/^Calendar/);
});

test('the hamburger holds every app and the theme', async () => {
  localStorage.removeItem('tinyoffice.nav');
  await open('#/v0/sheet');
  expect(text($('.to-here'))).toBe('Sheet');
  button('Menu').click();
  await idle();
  const drawer = $('#nav-drawer');
  expect(drawer.hasAttribute('open')).toBe(true);
  // (The three plans are templates in Write now: their links open, but they are not listed.)
  expect($$('.to-drawer-nav a', drawer)).toHaveLength(51);
  // Grouped, with the kinds of drawing listed under Draw.
  const groups = ['Plan', 'Create', 'Collaborate', 'Play', 'Design', 'Print', 'Track'];
  expect($$('.to-drawer-nav h2', drawer).map(text)).toEqual(groups);
  // Sheet, Write and Deck stand on their own at the top; the clusters fold, and stay as left.
  const top = $$('.to-drawer-nav > a', drawer).map(text);
  expect(top.map((t) => t.replace(/\s*\d+$/, ''))).toEqual(['Home', 'Drive', 'Sheet', 'Write', 'Outline', 'Deck']);
  expect($$('details.to-cluster[open] h2', drawer).map(text)).toEqual(groups);
  const play = $$<HTMLDetailsElement>('details.to-cluster', drawer).find((d) => text(d.querySelector('h2')) === 'Play')!;
  play.open = false;
  play.dispatchEvent(new Event('toggle'));
  await idle();
  expect(play.hasAttribute('open')).toBe(false);
  expect(JSON.parse(localStorage.getItem('tinyoffice.nav')!)).toEqual(['Play']);
  // Folded it stays, in a new page.
  await reopen();
  expect($$('#nav-drawer details.to-cluster[open] h2').map(text)).toEqual(groups.filter((g) => g !== 'Play'));
  expect($$('#nav-drawer .to-drawer-nav a.sub').map(text)).toEqual(['Org chart', 'Mind map', 'Swimlanes', 'Venn', 'Network', 'Floor plan', 'Seating chart', 'Family tree', 'Timeline', 'Booklet', 'Brochure', 'Comic', 'Résumé', 'Name badges']);
  expect(text($('#nav-drawer a[aria-current="page"]'))).toContain('Sheet');
  expect(text($('#nav-drawer .to-theme'))).toContain('Theme');
  // Escape closes it.
  button('Menu').click();
  await idle();
  expect($('#nav-drawer').hasAttribute('open')).toBe(true);
  await key('Escape', {}, $('#nav-drawer'));
  await until(() => !$('#nav-drawer').hasAttribute('open'), 'the menu to close');
  // Finding an app narrows the list; Return goes to the first.
  button('Menu').click();
  await idle();
  fill(box('Find an app'), 'gant');
  await idle();
  expect($$('#nav-drawer .to-drawer-nav a:not([hidden])').map(text)).toEqual(['Gantt']);
  // (It follows the link, which opens in a new tab.)
  const followed: string[] = [];
  const keep = (e: Event) => (e.preventDefault(), followed.push((e.target as Element).closest('a')!.getAttribute('href')!));
  $('#nav-drawer').addEventListener('click', keep);
  await key('Enter', {}, box('Find an app'));
  $('#nav-drawer').removeEventListener('click', keep);
  expect(followed).toEqual(['#/v0/gantt']);
  localStorage.removeItem('tinyoffice.nav');
});

test('the meter counts down, and copies the link through the app’s own page', async () => {
  // (The e2e test used a sheet; the meter is the shell's, the same for every app, and a list is quicker to draw.)
  await open('#/v0/todo');
  const ring = $('.to-meter sl-progress-ring');
  expect(ring.getAttribute('value')).toBe('0');
  const add = $('sl-input.todo-new');
  fill(add, 'The quick brown fox');
  add.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  await idle();
  expect(Number(ring.getAttribute('value'))).toBeGreaterThan(0);
  expect(text($('.to-meter .text'))).toMatch(/^\d[\d,]* left$/);
  const before = location.href;
  await press('Copy link');
  // The copied link goes through the app's own page, so it previews as a list.
  expect(await navigator.clipboard.readText()).toBe(before.replace('/#/', '/todo/#/'));
  expect(toast()).toBe('Link copied');
});

test('documents record their creation time, in the link', async () => {
  await open('#/v0/write');
  const meta = () => text($('.to-panel-head .meta'));
  expect(meta()).toBe('');
  write('Document', 'hello');
  await idle();
  expect(meta()).toMatch(/\d{4}/);
  expect(location.hash).toMatch(/^#\/v0\/write\/[WYZR]/);
  expect(link().env!.created).toBeGreaterThan(Date.UTC(2026, 0, 1));
  // Creation time is in the link and survives a reload.
  const created = meta();
  await reopen();
  expect(meta()).toBe(created);
  // A new document starts over.
  await open('#/v0/write');
  expect(meta()).toBe('');
});

test('links carry the format version, v0, and nothing else opens', async () => {
  await open('#/v0/write');
  expect($$('.to-drawer-nav a').find((a) => text(a) === 'Deck')!.getAttribute('href')).toBe('#/v0/deck');
  const doc = location.href.replace(/#.*/, '') + '#/v0/write/' + encodeEnvelope({ created: Date.UTC(2026, 0, 2), body: 'A link' });
  await open(new URL(doc).hash);
  expect(document.querySelector('to-write')).toBeTruthy();
  // Without its version it is not a document's link.
  await open(location.hash.replace('#/v0/', '#/'));
  expect(document.querySelector('to-write')).toBeNull();
  // A link from a future version says so.
  await open(location.hash.replace('#/', '#/v7/'));
  expect(text($('.to-panel-head'))).toContain('newer TinyLittleOffice (v7)');
});

test('keyboard shortcuts are listed, and work everywhere', async () => {
  await open('#/v0/todo');
  const keys = $('#keys-dialog');
  // The menu has the list; so does Ctrl+/.
  button('Menu').click();
  await idle();
  $('#nav-drawer .to-keys').click();
  await idle();
  expect(keys.hasAttribute('open')).toBe(true);
  expect(text(keys)).toContain('Everywhere');
  expect(text(keys)).toContain('In Todo');
  expect($$('kbd', keys).length).toBeGreaterThan(8);
  await press('Done', keys);
  expect(keys.hasAttribute('open')).toBe(false);
  await key('/', { ctrl: true });
  expect(keys.hasAttribute('open')).toBe(true);
  await key('Escape', {}, keys);
  await until(() => !keys.hasAttribute('open'), 'the shortcuts to close');
  // Ctrl+S is the app's first format; Ctrl+K the menu.
  downloads.length = 0;
  await key('s', { ctrl: true });
  await until(() => downloads.length, 'a download');
  expect(downloads[0].name).toBe('todo.md');
  await key('k', { ctrl: true });
  expect($('#nav-drawer').hasAttribute('open')).toBe(true);
});

test('Markdown and CSV come in as well as out', async () => {
  const importing = async (md: string) => {
    await menu('Download', /Import Markdown/);
    const dialog = $('#import-dialog');
    expect(dialog.hasAttribute('open')).toBe(true);
    fill($('textarea', dialog), md);
    await idle();
    await press('Import', dialog);
  };
  await open('#/v0/todo');
  await importing('# Chores\n\n- [x] Sweep\n- [ ] **Shop**\n- [ ] Call mum');
  expect(toast()).toContain('Imported');
  expect(parseTodos(body()).map((t) => [t.text, t.done])).toEqual([['Sweep', true], ['Shop', false], ['Call mum', false]]);
  expect(text($('to-todo'))).toContain('Call mum');
  // A deck reads headings; a sheet reads a table.
  await open('#/v0/deck');
  await importing('# Launch\n\n## Agenda\n\n- one\n- two\n\n## Thanks');
  expect(text($('to-deck'))).toContain('Agenda');
  expect($$('.deck-rail .deck-thumb')).toHaveLength(3);
  await open('#/v0/sheet');
  await importing('| Item | Cost |\n|---|---|\n| Rent | 1200 |');
  expect(cell('A1').value).toBe('Item');
  expect(cell('B2').value).toBe('1200');
  // CSV is a table too (and an import replaces what was there).
  await importing('Item,Cost\nRent,"1,200"\nFood,600');
  expect(parseGrid(body()).slice(0, 3).map((r) => r.slice(0, 2))).toEqual([['Item', 'Cost'], ['Rent', '1,200'], ['Food', '600']]);
  expect(cell('A3').value).toBe('Food');
});

test('download views: the link itself hands over a file', async () => {
  const created = Date.UTC(2026, 0, 2, 3, 4);
  const utf = (b: Uint8Array) => new TextDecoder('utf-8', { ignoreBOM: true }).decode(b);
  const zip = (b: Uint8Array) => expect(utf(b.subarray(0, 2))).toBe('PK');
  const docs: [string, string, string, string, (b: Uint8Array) => void][] = [
    ['deck', 'pptx', '## :rocket: Launch plan\n\n- Build it\n- Ship it\n\n---\n\n## :users: Team\n\n- Everyone\n', 'launch-plan.pptx', zip],
    ['deck', 'ppt', '## Alias', 'alias.pptx', zip],
    ['sheet', 'xlsx', '10\tTotal\n32\n=SUM(A1:A2)*2\t=AVG(A1:A2)', 'sheet.xlsx', zip],
    ['sheet', 'csv', '10\tTotal\n32\n=SUM(A1:A2)*2', 'sheet.csv', (b) => expect(utf(b)).toBe('﻿10,Total\r\n32,\r\n84,\r\n')],
    ['write', 'rtf', '# Memo\nSome *bold* text\n- one\n- two', 'memo.rtf', (b) => expect(utf(b)).toContain('{\\b bold}')],
    ['write', 'html', '# Memo\nSome *bold* text', 'memo.html', (b) => { expect(utf(b)).toContain('<strong>bold</strong>'); expect(utf(b)).toContain('<meta property="og:title" content="Memo">'); }],
    ['draw', 'svg', 'r,2,1,12,6,1,Box\na,14,4,8,0,0', 'draw.svg', (b) => expect(utf(b)).toContain('>Box</text>')],
    ['cal', 'ics', '@America/New_York\nd2,2,Offsite\ntgo,2i,Call', 'cal.ics', (b) => expect(utf(b)).toContain('SUMMARY:Offsite')],
    ['todo', 'html', '- one\nx two', 'todo.html', (b) => { expect(utf(b)).toContain('<input type="checkbox" disabled checked> two'); expect(utf(b)).toMatch(/<meta property="og:image" content="http:\/\/localhost:\d+\/og\/todo\.png">/); }],
  ];
  for (const [app, ext, doc, name, check] of docs) {
    downloads.length = 0;
    await open(`#/v0/${app}.${ext}/${encodeEnvelope({ created, body: doc })}`);
    const file = await until(() => downloads[0], `${name} downloaded`);
    expect(file.name).toBe(name);
    const b = await bytes(file);
    expect(b.length).toBeGreaterThan(20);
    check(b);
    await until(() => toast().includes(`Downloaded ${name}`), 'the toast');
    // The document is still there to edit.
    expect(document.querySelector(`to-${app}`), app).toBeTruthy();
  }
  // The menu offers the same files.
  downloads.length = 0;
  await menu('Download', /^Markdown/);
  expect((await until(() => downloads[0], 'the Markdown')).name).toBe('todo.md');
  // An extension the app does not have is reported, not downloaded.
  downloads.length = 0;
  await open(`#/v0/cal.pptx/${encodeEnvelope({ created, body: 'd2,2,Offsite' })}`);
  await until(() => toast().includes('No .pptx view here'), 'the refusal');
  expect(downloads).toHaveLength(0);
});
