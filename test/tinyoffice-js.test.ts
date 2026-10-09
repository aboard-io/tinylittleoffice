// public/tinyoffice.js: plain links and embed snippets from a page's own JavaScript, read back as the shell reads them.
import { test, expect } from 'vitest';
import { embed, link } from '../public/tinyoffice.js';
import { readPlain } from '../src/kit/plain.ts';

const known = (id: string) => ['sheet', 'deck', 'write'].includes(id);

test('link() writes the plain link the shell reads', () => {
  const url = link({ app: 'sheet', title: 'Sales & costs', doc: 'Q | Sales\n--- | ---\nQ1 | 120\n', base: 'https://tinylittleoffice.com' });
  expect(url.startsWith('https://tinylittleoffice.com/sheet/#title=Sales+%26+costs&doc=')).toBe(true);
  expect(readPlain(url.slice(url.indexOf('#')), 'sheet', known)).toEqual({ app: 'sheet', text: 'Q | Sales\n--- | ---\nQ1 | 120\n', view: '', title: 'Sales & costs' });
});

test('embed() frames the embed page, which names the app and asks for the embed view', () => {
  const code = embed({ app: 'deck', title: 'Hi "there"', doc: '## Hello {.title}\n', base: 'https://tinylittleoffice.com/' });
  expect(code).toContain('loading="lazy"');
  expect(code).toContain('referrerpolicy="no-referrer"');
  expect(code).toContain('title="Hi &quot;there&quot;"');
  const src = /src="([^"]+)"/.exec(code)![1].replace(/&amp;/g, '&');
  expect(src.startsWith('https://tinylittleoffice.com/embed/#app=deck')).toBe(true);
  expect(readPlain(src.slice(src.indexOf('#')), 'embed', known)).toEqual({ app: 'deck', text: '## Hello {.title}\n', view: 'embed', title: 'Hi "there"' });
});
