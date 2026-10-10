// Print, or save as PDF (src/kit/exports.ts): every app's first template, as the page the browser prints,
// parses as HTML and holds one figure per page the app draws, each an SVG at its page's size, the paper
// the first page's; where a rule is a page break (a text's, a deck's slides), one page per rule and one
// more. And the Download menu's Print: a hidden frame with that page, gone when the dialog closes.
import { test, expect, afterEach } from 'vitest';
import { cdp } from 'vitest/browser';
import { mount, until } from './helpers.ts';
import { apps, appOf } from '../../src/kit/apps.ts';
import { printHtml } from '../../src/kit/exports.ts';
import { encodeDoc } from '../../src/kit/codec.ts';
import { routeHash } from '../../src/kit/route.ts';
import { pages as rules, parse } from '../../src/doc/index.ts';
import type { Page } from '../../src/kit/app.ts';
import { BASE, remScale } from '../../src/kit/zoom.ts';

afterEach(() => history.replaceState(null, '', location.pathname));

/** The print page, parsed: what the browser would lay out. */
function printed(pages: Page[], title: string) {
  const dom = new DOMParser().parseFromString(printHtml(pages, title), 'text/html');
  return { dom, figures: [...dom.querySelectorAll('body > figure')], css: dom.querySelector('style')!.textContent! };
}

test('every app’s first template prints: a figure per page, each an SVG at its own size, on its paper', () => {
  for (const app of apps()) {
    const tpl = app.templates[0];
    expect(tpl, `${app.id} has a template`).toBeTruthy();
    const pages = app.view(tpl.doc);
    expect(pages.length, app.id).toBeGreaterThan(0);
    const { dom, figures, css } = printed(pages, tpl.name);
    expect(dom.querySelector('parsererror'), app.id).toBeNull();
    expect(dom.title, app.id).toBe(tpl.name);
    expect(figures.length, app.id).toBe(pages.length);
    figures.forEach((f, i) => {
      const svgs = f.querySelectorAll(':scope > svg');
      expect(svgs.length, `${app.id} page ${i + 1}`).toBe(1);
      expect(svgs[0].getAttribute('viewBox'), `${app.id} page ${i + 1}`).toBe(`0 0 ${pages[i].w} ${pages[i].h}`);
      expect(svgs[0].getAttribute('role'), `${app.id} page ${i + 1}`).toBe('img');
    });
    const inches = (px: number) => String(Math.round((px / 96) * 100) / 100);
    expect(css, app.id).toMatch(new RegExp(`@page\\{size:${inches(pages[0].w)}in ${inches(pages[0].h)}in;margin:0\\}`));
    // Each page breaks after itself but the last.
    expect(css, app.id).toContain('break-after:page');
  }
});

test('a rule is a page: a text with two rules prints three pages, a deck a slide per rule and one more', () => {
  const write = appOf('write')!;
  const text = `${write.templates[0].doc.trimEnd()}\n\n---\n\nThe second page.\n\n---\n\nThe third.\n`;
  const ruled = rules(parse(text).blocks).length;
  expect(ruled).toBe(write.view(write.templates[0].doc).length + 2);
  expect(printed(write.view(text), 'Letter').figures).toHaveLength(ruled);

  const deck = appOf('deck')!;
  const talk = deck.templates[0].doc;
  const slides = rules(parse(talk).blocks).length;
  // The talk ends with its QR code, a slide of its own; without it, a slide per rule and one more.
  expect(printed(deck.view(talk), 'Talk').figures).toHaveLength(slides + 1);
  const bare = talk.replace(/^---\n/, '---\nqr: no\n');
  expect(printed(deck.view(bare), 'Talk').figures).toHaveLength(slides);
});

test('Print in the Download menu puts the page in a hidden frame, which goes when the dialog closes, the focus back where it was', async () => {
  const text = '# One\n\n---\n\n# Two\n';
  const shell = await mount(routeHash('write', encodeDoc(text)));
  await until(() => !!shell.querySelector('to-write-editor .tx'));
  const words = shell.querySelector<HTMLElement>('to-write-editor .tx')!;
  words.focus();
  // The browser's own dialog is not for a test: the frame's print() is caught as the frame is made.
  const made = new Promise<HTMLIFrameElement>((found) => {
    new MutationObserver((_, obs) => {
      const f = document.querySelector<HTMLIFrameElement>('iframe.to-print');
      if (!f) return;
      obs.disconnect();
      f.addEventListener('load', () => Object.defineProperty(f.contentWindow!, 'print', { value: () => {} }), { capture: true, once: true });
      found(f);
    }).observe(document.body, { childList: true });
  });
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'p', ctrlKey: true, bubbles: true, cancelable: true }));
  const frame = await made;
  await until(() => frame.contentDocument?.readyState === 'complete' && frame.contentDocument.querySelectorAll('figure').length > 0);
  expect(frame.getAttribute('aria-hidden')).toBe('true');
  expect(frame.contentDocument!.querySelectorAll('figure')).toHaveLength(2);
  // Paper is not the screen: the page is drawn at the normal size (a rem 1.3 × 16px), the frame's page at none of it.
  expect(remScale()).toBe(BASE);
  expect(getComputedStyle(frame.contentDocument!.documentElement).fontSize).toBe('16px');
  expect(getComputedStyle(frame).zoom).toBe('1');
  expect(frame.contentWindow!.devicePixelRatio).toBeCloseTo(window.devicePixelRatio, 4);
  frame.contentWindow!.dispatchEvent(new Event('afterprint'));
  await until(() => !document.querySelector('iframe.to-print'));
  // The focus the frame took to print comes back where it was, not to nothing (walks: lists at a phone, seed 915460951).
  expect(document.activeElement).toBe(words);
});

test('a page printed from the screen has the size of everything taken off: in print both scales are 1 and a rem 16px, the root’s own 1.3 kept', async () => {
  const root = document.documentElement;
  expect(root.style.getPropertyValue('--to-doc')).toBe(String(BASE));
  expect(getComputedStyle(root).fontSize).toBe(`${16 * BASE}px`);
  const session = cdp();
  await session.send('Emulation.setEmulatedMedia', { media: 'print' });
  try {
    expect(matchMedia('print').matches).toBe(true);
    // kit.css's @media print rule outranks the root's inline scales (an !important rule), and the lengths with them.
    expect(root.style.getPropertyValue('--to-doc')).toBe(String(BASE));
    const look = getComputedStyle(root);
    expect(look.fontSize).toBe('16px');
    expect(look.getPropertyValue('--to-doc').trim()).toBe('1');
    expect(look.getPropertyValue('--to-nav').trim()).toBe('1');
  } finally {
    await session.send('Emulation.setEmulatedMedia', { media: '' });
  }
  expect(getComputedStyle(root).fontSize).toBe(`${16 * BASE}px`);
});
