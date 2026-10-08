// The shell around every document: its title, the theme, how much room the link has where, and sharing it
// (ported from e2e/apps.spec.ts; the picture shared as a PNG is drawn on a canvas and stays there).
import { test, expect } from 'vitest';
import { button } from './helpers.ts';
import { shell, reopen, editorOf, settleAll, until, texts, choose, opened } from './helpers-apps.ts';

test('shell: themes, page titles, share and room per service', async () => {
  await shell('#/v0/write');
  const page = editorOf('write').querySelector<HTMLElement>('[role="textbox"][aria-label="Document"]')!;
  page.textContent = 'Quarterly memo';
  page.dispatchEvent(new InputEvent('input', { bubbles: true }));
  await settleAll();
  expect(document.title).toBe('Quarterly memo · TinyLittleOffice');

  // Theme: device, then light, then dark; the choice is remembered.
  const html = document.documentElement;
  const theme = () => document.querySelector<HTMLElement>('#nav-drawer .to-theme')!;
  theme().click();
  await settleAll();
  expect(theme().textContent).toContain('Light');
  expect(html.classList.contains('sl-theme-dark')).toBe(false);
  theme().click();
  await settleAll();
  expect(theme().textContent).toContain('Dark');
  expect(html.classList.contains('sl-theme-dark')).toBe(true);
  await reopen();
  expect(theme().textContent).toContain('Dark');
  expect(localStorage.getItem('to-theme')).toBe('dark');
  theme().click();
  await settleAll();
  expect(theme().textContent).toContain('Match the device');
  expect(localStorage.getItem('to-theme')).toBeNull();

  // Room for the link, service by service: on hover, and in the document dialog.
  const ring = document.querySelector('.to-meter sl-progress-ring')!;
  ring.dispatchEvent(new PointerEvent('pointerover', { bubbles: true, composed: true, pointerType: 'mouse' }));
  await until(() => expect(document.querySelector('#to-tip .to-meter-rooms')?.textContent).toContain('Bluesky'));
  ring.dispatchEvent(new PointerEvent('pointerout', { bubbles: true, composed: true, pointerType: 'mouse', relatedTarget: document.body }));
  (ring as HTMLElement).click();
  await settleAll();
  const rooms = [...document.querySelectorAll('#doc-dialog .to-rooms tbody tr')];
  expect(rooms).toHaveLength(10);
  expect(texts(document, '#doc-dialog .to-rooms thead th')).toEqual(['Where', 'Limit', 'This link', 'Left', 'Note']);
  const room = (name: string) => rooms.find((r) => r.textContent?.includes(name))!.textContent;
  expect(room('NTAG215')).toContain('504');
  expect(room('Bluesky')).toContain('any length');
  expect(room('Mastodon')).toContain('any length');
  expect(room('Text message')).toMatch(/\d/);
  button(document.querySelector('#doc-dialog')!, /Done/).click();
  await settleAll();

  // Share: compose boxes open with the link in them.
  await choose('Share', 'Bluesky');
  await until(() => expect(opened().length).toBeGreaterThan(0));
  expect(decodeURIComponent(opened().at(-1)!)).toContain('Quarterly memo ' + location.href.replace('/#/', '/write/#/'));
});
