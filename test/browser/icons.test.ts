// An icon in rich text is drawn as the icon (kit/text.ts, kit/icons.ts): a starter icon at once, any other Lucide
// icon after the one lazy load, an unknown name as its name in small type, written back unchanged; and the icon
// picker's second set, Emoji (kit/icons-picker.ts, kit/emoji-data.ts).
import { expect, test } from 'vitest';
import { parse, write } from '../../src/doc/index.ts';
import { copyData } from '../../src/kit/clipboard.ts';
import { encodeDoc } from '../../src/kit/codec.ts';
import { iconNamed } from '../../src/kit/icons.ts';
import type { ToText } from '../../src/kit/text.ts';
import { mount, until } from './helpers.ts';

const DOC = 'A :rocket: and a :car-front: and a :no-such-icon: here.\n';

const chip = (root: ParentNode, name: string) => root.querySelector<HTMLElement>(`.ic[data-icon="${name}"]`)!;

test('the Word Processor draws an icon as the icon, never as :name:', async () => {
  // Nothing has loaded the whole of Lucide yet: car-front is not a starter icon.
  expect(iconNamed('car-front')).toBeUndefined();
  const shell = await mount(`#/v1/write/${encodeDoc(DOC)}`);
  await until(() => !!shell.querySelector('to-text .ic'));
  const text = shell.querySelector<ToText>('to-text')!;
  const rocket = chip(text, 'rocket');
  // A starter icon: its SVG at once, as an image named for it, in the line's colour.
  expect(rocket.querySelector('svg')).not.toBeNull();
  expect(rocket.getAttribute('role')).toBe('img');
  expect(rocket.getAttribute('aria-label')).toBe('rocket');
  expect(rocket.getAttribute('contenteditable')).toBe('false');
  expect(getComputedStyle(rocket, '::before').content).toMatch(/^(none|normal)$/);
  expect(rocket.textContent).not.toContain(':rocket:');
  // The rest of Lucide arrives once, and the chip is drawn again.
  await until(() => !!chip(text, 'car-front')?.querySelector('svg'), 8000);
  expect(iconNamed('car-front')).toBeDefined();
  // A name no library has: the name in small type, never ":name:".
  const odd = chip(text, 'no-such-icon');
  expect(odd.querySelector('svg')).toBeNull();
  expect(odd.textContent?.trim()).toBe('no-such-icon');
  expect(getComputedStyle(odd, '::before').content).toMatch(/^(none|normal)$/);
  // Byte-stable: the document is written back as it came.
  expect(write(parse(DOC))).toBe(DOC);
  // Copied, a chip still carries its name.
  const doc = parse(DOC);
  const { html } = copyData(doc.blocks, { anchor: { block: 0, offset: 0 }, focus: { block: 0, offset: 10 } });
  expect(html).toContain('data-icon="rocket"');
});

test('the picker searches icons and emoji at once; an emoji picked is its character, put in as words', async () => {
  document.body.innerHTML = '';
  const { chooseIcon } = await import('../../src/kit/icons-picker.ts');
  const chosen = chooseIcon();
  await until(() => !!document.querySelector('.to-icons-search'));
  // The two sets, Icons browsed first.
  const sets = [...document.querySelectorAll<HTMLButtonElement>('.to-icons-sets button')];
  expect(sets.map((b) => [b.textContent?.trim(), b.getAttribute('aria-pressed')])).toEqual([
    ['Icons', 'true'],
    ['Emoji', 'false'],
  ]);
  sets[1].click();
  await until(() => document.querySelectorAll('.to-emoji-btn').length > 1000);
  expect(document.querySelector('.to-icons-section h3')?.textContent).toContain('Smileys & Emotion');
  const search = document.querySelector<HTMLInputElement>('.to-icons-search')!;
  search.value = 'car';
  search.dispatchEvent(new Event('input'));
  await until(() => !!document.querySelector('.to-icon-btn[aria-label="car"]'));
  const car = [...document.querySelectorAll<HTMLButtonElement>('.to-emoji-btn')].find((b) => b.textContent === '🚗')!;
  expect(car).toBeDefined();
  expect(car.getAttribute('aria-label')).toBe('automobile');
  car.click();
  expect(await chosen).toBe('🚗');

  // A caller that needs an icon's name is never offered the emoji.
  const named = chooseIcon({ emoji: false });
  await until(() => !!document.querySelector('.to-icons-search'));
  expect(document.querySelector('.to-icons-sets')).toBeNull();
  const box = document.querySelector<HTMLInputElement>('.to-icons-search')!;
  box.value = 'car';
  box.dispatchEvent(new Event('input'));
  await until(() => !!document.querySelector('.to-icon-btn[aria-label="car"]'));
  expect(document.querySelector('.to-emoji-btn')).toBeNull();
  document.querySelector<HTMLButtonElement>('.to-icon-btn[aria-label="car"]')!.click();
  expect(await named).toBe('car');

  // In the Word Processor the emoji goes in as a character; an icon's name as an icon.
  const shell = await mount(`#/v1/write/${encodeDoc('Go\n')}`);
  await until(() => !!shell.querySelector('to-text .tx'));
  const text = shell.querySelector<ToText>('to-text')!;
  text.focus();
  text.sel = { anchor: { block: 0, offset: 2 }, focus: { block: 0, offset: 2 } };
  text.exec('icon', '🚗');
  await until(() => text.blocks[0]?.k === 'p' && JSON.stringify(text.blocks[0]).includes('🚗'));
  text.exec('icon', 'car-front');
  await until(() => !!chip(text, 'car-front')?.querySelector('svg'));
  expect(write({ ...parse(''), blocks: text.blocks })).toContain('Go🚗:car-front:');
});
