// Plain-parameter links ("#title=…&doc=…") and .tlo files: a document from words alone, no codec.
import { test, expect } from 'vitest';
import { appInHead, plainLink, readFile, readPlain, tloText } from '../src/kit/plain.ts';

const known = (id: string) => ['write', 'sheet', 'todo', 'deck'].includes(id);

test('a plain link is read: the doc, the title and by, the app from the path, the parameter or the head', () => {
  expect(readPlain('#title=Budget&doc=Item+%7C+Cost%0A---+%7C+---%0ARent+%7C+1200', 'sheet', known)).toEqual({ app: 'sheet', text: 'Item | Cost\n--- | ---\nRent | 1200\n', view: '', title: 'Budget' });
  expect(readPlain('#app=todo&doc=-+%5B+%5D+Milk&by=chores-agent', '', known)).toEqual({ app: 'todo', text: '---\nby: chores-agent\n---\n- [ ] Milk\n', view: '', title: '' });
  // The head may name the app (and is the link's no longer).
  expect(readPlain('#doc=' + encodeURIComponent('---\napp: sheet\nchart: bar\n---\nA | B\n'), '', known)).toEqual({ app: 'sheet', text: '---\nchart: bar\n---\nA | B\n', view: '', title: '' });
  // md is the same words; with no app named anywhere, a text.
  expect(readPlain('#md=%23+Hello%0A%0AWorld', '', known)!.app).toBe('write');
  expect(readPlain('#md=%23+Hello', 'deck', known)!.app).toBe('deck');
  // An app that does not exist is not asked for; a view rides along.
  expect(readPlain('#app=nope&doc=x&view=pdf', 'sheet', known)).toEqual({ app: 'sheet', text: 'x\n', view: 'pdf', title: '' });
  expect(readPlain('#view=show&doc=%23%23+One', 'deck', known)!.view).toBe('show');
});

test('a packed link, the home page and a fragment of something else are not plain links', () => {
  expect(readPlain('#/v1/write/yABC', '', known)).toBeNull();
  expect(readPlain('', '', known)).toBeNull();
  expect(readPlain('#/', '', known)).toBeNull();
  expect(readPlain('#section-2', '', known)).toBeNull();
});

test('a plain link is written so that it reads back as the same document', () => {
  const text = 'Name & place | 100% sure\n--- | ---\n#1 | a+b=c\n';
  const url = plainLink('https://tinylittleoffice.com', 'sheet', text, { title: 'Odd # title', by: 'agent' });
  expect(url.startsWith('https://tinylittleoffice.com/sheet/#title=Odd+%23+title&by=agent&doc=')).toBe(true);
  const back = readPlain(url.slice(url.indexOf('#')), 'sheet', known)!;
  expect(back).toEqual({ app: 'sheet', text: '---\nby: agent\n---\n' + text, view: '', title: 'Odd # title' });
});

test('a .tlo file carries its app in its head; opened, the app comes out of it', () => {
  const doc = '---\ntitle: Groceries\n---\n- [ ] Milk\n';
  const file = tloText('todo', doc);
  expect(file).toBe('---\ntitle: Groceries\napp: todo\n---\n- [ ] Milk\n');
  expect(appInHead(file)).toEqual(['todo', doc]);
  expect(readFile('groceries.tlo', file, 'write', known)).toEqual({ app: 'todo', text: doc, view: '', title: 'groceries' });
  // Windows line ends and a byte order mark are the same file.
  expect(readFile('g.tlo', '﻿' + file.replace(/\n/g, '\r\n'), 'write', known)!.text).toBe(doc);
  // A Markdown file opens in the app open now, else a text; a file that is not words does not open.
  expect(readFile('notes.md', '# Notes\n', 'deck', known)).toEqual({ app: 'deck', text: '# Notes\n', view: '', title: 'notes' });
  expect(readFile('notes.md', '# Notes\n', '', known)!.app).toBe('write');
  expect(readFile('pic.png', 'PNG\u0000\u0001', 'write', known)).toBeNull();
  // A head naming an app that does not exist opens where the file would have anyway, the head kept tidy.
  expect(readFile('x.tlo', '---\napp: nope\n---\nHi\n', 'sheet', known)).toEqual({ app: 'sheet', text: 'Hi\n', view: '', title: 'x' });
});
