// A thumbnail takes its page's shape: a portrait page as it always was, a landscape one as wide as its shape,
// to twice its height (kit/draw.ts thumbRatio and thumbWidth, used by the templates list and <to-preview>).
import { expect, test } from 'vitest';
import { thumbRatio, thumbWidth } from '../src/kit/draw.ts';

test('the width follows the aspect, a landscape page clamped to twice the height', () => {
  // The templates list: 72 tall, a portrait page 56 wide whatever its shape.
  expect(thumbWidth({ w: 85, h: 110 }, 72, 56)).toBe(56);
  expect(thumbWidth({ w: 100, h: 100 }, 72, 56)).toBe(56);
  expect(thumbWidth({ w: 1600, h: 900 }, 72, 56)).toBe(128);
  expect(thumbWidth({ w: 400, h: 300 }, 72, 56)).toBe(96);
  expect(thumbWidth({ w: 1300, h: 240 }, 72, 56)).toBe(144);
  // A preview: 56 tall (40 in the menu's results), a portrait page its own shape.
  expect(thumbWidth({ w: 85, h: 110 }, 56)).toBe(43);
  expect(thumbWidth({ w: 960, h: 600 }, 56)).toBe(90);
  expect(thumbWidth({ w: 1300, h: 240 }, 40)).toBe(80);
  expect(thumbRatio({ w: 5000, h: 10 })).toBe(2);
  expect(thumbRatio({ w: 300, h: 400 })).toBe(0.75);
});
