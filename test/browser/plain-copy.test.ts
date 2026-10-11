// A copy from a drawn page carries no colour (Paul, 2026-10-11: a copy from a midnight slide pasted white into Google
// Docs): the shell takes every copy an editor did not, and puts the words on the clipboard as text and as plain
// paragraphs, no style, no fill, no font.
import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { mount, until } from './helpers.ts';
import { encodeDoc } from '../../src/kit/codec.ts';

test('a copy from a Display Link’s page: the words as text and as paragraphs, nothing of the theme’s colours', async () => {
  await page.viewport(900, 700);
  const shell = await mount(`#/v1/deck/${encodeDoc('---\ntheme: midnight\n---\n## Midnight words\n\n- First line here\n- Second line here\n')}?d`);
  await until(() => !!shell.querySelector('.to-display-page svg text'));
  const texts = [...shell.querySelectorAll<SVGTextElement>('.to-display-page svg text')];
  const sel = document.getSelection()!;
  sel.removeAllRanges();
  const range = document.createRange();
  range.setStartBefore(texts[0]);
  range.setEndAfter(texts[texts.length - 1]);
  sel.addRange(range);
  const dt = new DataTransfer();
  const e = new ClipboardEvent('copy', { clipboardData: dt, bubbles: true, cancelable: true });
  texts[0].dispatchEvent(e);
  expect(e.defaultPrevented).toBe(true);
  const html = dt.getData('text/html');
  expect(dt.getData('text/plain')).toContain('Midnight words');
  expect(html).toContain('<p>Midnight words</p>');
  expect(html).toContain('First line here');
  for (const bad of ['style=', 'fill=', 'color', '<svg', '<text', 'font-']) expect(html).not.toContain(bad);
});
