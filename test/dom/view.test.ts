// A link as anyone opening it finds it: the document to read, with Edit a button away (ported from e2e/view.spec.ts).
import { test, expect } from 'vitest';
import { button } from './helpers.ts';
import { shell, settleAll, texts } from './helpers-apps.ts';

const visitor = { edit: null, open: null } as const;
const edit = async () => {
  button(document.querySelector('to-app')!, 'Edit').click();
  await settleAll();
};
const noButton = (name: string) => expect(() => button(document.querySelector('to-app')!, name)).toThrow();

test('a text opens as its words, and Edit is the editor on the same link', async () => {
  await shell({ app: 'write', body: '# Hello\nSee https://example.com for *more*.', title: 'A letter' }, visitor);
  // A text is its words: no toolbar, links that work.
  expect(texts(document, '.to-view.prose h1')).toEqual(['Hello']);
  expect(document.querySelector('.to-view.prose a')?.getAttribute('href')).toBe('https://example.com');
  expect(document.querySelector('[aria-label="Document"]')).toBeNull();
  noButton('Undo');
  expect(document.title).toBe('A letter · TinyLittleOffice');
  const before = location.href;
  await edit();
  expect(document.querySelector('to-write [aria-label="Document"]')?.textContent).toContain('See https://example.com');
  expect(location.href).toBe(before);
});

test('a game is the game, and its editor a button away', async () => {
  await shell({ app: 'adventure', body: '# Cave\n## start\nDark.\n> Light a match | lit\n## lit\nBats.' }, visitor);
  // (Playing it is the frame's own script: e2e/view.spec.ts plays it.)
  const frame = document.querySelector<HTMLIFrameElement>('iframe.to-view')!;
  expect(frame.getAttribute('srcdoc')).toContain('Light a match');
  expect(document.querySelector('to-adventure')).toBeNull();
  await edit();
  expect(document.querySelector('to-adventure iframe')).toBeTruthy();
  button(document.querySelector('to-adventure')!, 'List').click();
  await settleAll();
  expect(document.querySelector('to-adventure to-lines')).toBeTruthy();
});

test('anything else is its pages; a zine is its own page; a deck presents only from a .show link', async () => {
  await shell({ app: 'todo', body: '- Book flights\nx Renew passport' }, visitor);
  expect(document.querySelector('.to-view.pages svg')?.textContent).toContain('Book flights');
  expect(document.querySelector('to-todo')).toBeNull();
  await shell({ app: 'zine', body: 'Small Joys\nIssue one\n\nCoffee\nThe first cup.' }, visitor);
  expect(document.querySelector('iframe.to-view')?.getAttribute('srcdoc')).toContain('Small Joys');
  // A deck's plain link opens as its slides to read; only a ".show" link presents.
  await shell({ app: 'deck', body: 'Hello\none\ntwo' }, visitor);
  expect(document.querySelector('.deck-show')).toBeNull();
  expect(document.querySelector('.to-view.pages svg')?.textContent).toContain('Hello');
  await shell({ app: 'deck', body: 'Hello\none\ntwo', view: 'show' }, visitor);
  expect(document.querySelector('.deck-show')).toBeTruthy();
});

test('something new opens ready to make; so does a link written for a program to fill in', async () => {
  await shell('#/v0/write', visitor);
  expect(document.querySelector('to-write [aria-label="Document"]')).toBeTruthy();
  // A plain link on an app's own page: turned into the usual link on arrival, and opened to read.
  history.replaceState(null, '', '/menu/#doc=%23+Cafe%0AEspresso+%7C+3.00');
  await shell(location.hash, visitor);
  expect(location.hash).toMatch(/^#\/v0\/menu\/[WYZR]/);
  expect(document.querySelector('.to-view.pages .sheet > svg')?.textContent).toContain('Espresso');
  expect(button(document.querySelector('to-app')!, 'Edit')).toBeTruthy();
  history.replaceState(null, '', '/');
});
