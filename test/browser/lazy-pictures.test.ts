// Web pictures are fetched only as they near the screen (Paul, 2026-10-11: "It shouldn't fetch images until right before
// they are in viewport"): kit/pictures.ts gateSvg holds a shown picture's address in data-src, and watchPictures hands
// it to href as the picture comes within a screen and a half; the pages drawn later are watched too.
import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { mount, until } from './helpers.ts';
import { encodeDoc } from '../../src/kit/codec.ts';

const PIC = (n: number) => `https://upload.wikimedia.org/wikipedia/commons/a/a${n}/picture-${n}.jpg`;
const DOC = `---\ntitle: Pictures\n---\n${Array.from({ length: 6 }, (_, i) => `## Page ${i + 1}\n\n![a picture](${PIC(i)})\n\n${'Words. '.repeat(400)}`).join('\n\n---\n\n')}\n`;

test('a Display Link’s web pictures: the first page’s has its address, a far page’s waits in data-src until the column nears it', async () => {
  await page.viewport(800, 700);
  const shell = await mount(`#/v1/write/${encodeDoc(DOC)}?d`);
  await until(() => shell.querySelectorAll('.to-display-page image').length >= 6);
  const images = [...shell.querySelectorAll<SVGImageElement>('.to-display-page image')];
  await until(() => images[0].getAttribute('href')?.includes('picture-0') === true);
  const last = images[images.length - 1];
  expect(last.getAttribute('data-src')).toContain('picture-5');
  expect(last.getAttribute('href')).not.toContain('picture-5');
  const main = shell.querySelector<HTMLElement>('main.to-display')!;
  // The column scrolled to the last picture itself (to its foot, the picture at the page's top can pass out of the margin).
  main.scrollTop += last.getBoundingClientRect().top - main.getBoundingClientRect().top;
  await until(() => last.getAttribute('href')?.includes('picture-5') === true);
  expect(last.hasAttribute('data-src')).toBe(false);
});
