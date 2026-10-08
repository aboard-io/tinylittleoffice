// Links in documents: none opens without the question, Cancel is the default, Go opens it in a new tab with no referrer.
import { test, expect, vi, beforeEach } from 'vitest';
import { mount, settle } from './helpers.ts';
import { installLinkGuard, leaving, type ToLinkGuard } from '../../src/widgets/link-guard.ts';

installLinkGuard();
const opened: string[] = [];
beforeEach(() => {
  opened.length = 0;
  vi.spyOn(window, 'open').mockImplementation(((u: string) => (opened.push(u), null)) as typeof window.open);
});
const guard = () => document.querySelector('to-link-guard') as ToLinkGuard;
// (In text being written a plain click puts the caret in a link; Mod+click follows it. Elsewhere any click does.)
const click = (a: Element) => a.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, composed: true, ctrlKey: !!a.closest('[contenteditable="true"]') }));

test('a link in a text asks first, showing the whole address; Cancel opens nothing, Go opens it', async () => {
  const { el } = await mount('write', 'See https://example.com/a?b=1 for more');
  const a = el.querySelector('a[href^="https://example.com"]')!;
  expect(a).toBeTruthy();
  click(a);
  await settle(guard() as never);
  expect(opened).toEqual([]);
  expect(guard().querySelector('.lg-host')!.textContent).toBe('example.com');
  expect(guard().querySelector('.lg-url')!.textContent).toBe('https://example.com/a?b=1');
  expect(guard().querySelector('.lg-cancel')!.hasAttribute('autofocus')).toBe(true);
  (guard().querySelector('.lg-cancel') as HTMLElement).click();
  expect(opened).toEqual([]);

  click(a);
  await settle(guard() as never);
  (guard().querySelector('.lg-go') as HTMLElement).click();
  expect(opened).toEqual(['https://example.com/a?b=1']);
  expect(vi.mocked(window.open).mock.calls[0][2]).toBe('noopener,noreferrer');
});

test('an address in a task gets a button to follow it, which asks too', async () => {
  const { el } = await mount('todo', '- [ ] Read https://example.org/guide\n- [ ] Plain task');
  const go = el.querySelectorAll('a.to-go');
  expect(go.length).toBe(1);
  expect(go[0].getAttribute('aria-label')).toBe('Open https://example.org/guide');
  click(go[0]);
  await settle(guard() as never);
  expect(guard().querySelector('.lg-host')!.textContent).toBe('example.org');
  expect(opened).toEqual([]);
});

test('where a link goes: this site passes; the web, email and phone ask; anything else never opens', () => {
  const base = 'https://tinylittleoffice.com/write/';
  expect(leaving('#/v0/sheet', base)).toBeNull();
  expect(leaving('/deck/', base)).toBeNull();
  expect((leaving('https://evil.example/x', base) as URL).hostname).toBe('evil.example');
  expect((leaving('mailto:a@b.co', base) as URL).protocol).toBe('mailto:');
  expect(leaving('javascript:alert(1)', base)).toBe('refused');
  expect(leaving('data:text/html,<b>x', base)).toBe('refused');
  expect(leaving('blob:https://tinylittleoffice.com/1234', base)).toBeNull();
  expect(leaving('blob:https://evil.example/1234', base)).toBe('refused');
  // A look-alike letter shows as the address the browser will really reach.
  expect((leaving('https://exаmple.com/', base) as URL).hostname).toBe('xn--exmple-4nf.com');
});
