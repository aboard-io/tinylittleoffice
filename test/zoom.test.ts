// The size of everything (src/kit/zoom.ts): clamped to 90%–250%, a pinch kept to the nearest 5%, the stepper moving in
// tens from wherever a pinch left it, and the nav stopping at 150%.
import { test, expect, afterEach } from 'vitest';
import { NAV_MAX, SIZE_MAX, SIZE_MIN, clampSize, keepSize, navSize, pinchSize, size, stepFrom, stepSize } from '../src/kit/zoom.ts';

afterEach(() => void stepSize(0));

test('the size is clamped to 90%–250%, and the nav to 150%', () => {
  expect([SIZE_MIN, SIZE_MAX, NAV_MAX]).toEqual([0.9, 2.5, 1.5]);
  expect(clampSize(0.2)).toBe(0.9);
  expect(clampSize(9)).toBe(2.5);
  expect(clampSize(1.37)).toBe(1.37);
  pinchSize(2.2);
  expect(size()).toBe(2.2);
  expect(navSize()).toBe(1.5);
  pinchSize(1.2);
  expect(navSize()).toBe(1.2);
});

test('a pinch is live until kept, and kept to the nearest 5%', () => {
  pinchSize(1.83);
  expect(size()).toBe(1.83);
  expect(keepSize(1.83)).toBe(1.85);
  expect(size()).toBe(1.85);
  expect(keepSize(1.01)).toBe(1);
  expect(keepSize(3.1)).toBe(2.5);
  expect(keepSize(0.5)).toBe(0.9);
});

test('the stepper moves in tens from wherever a pinch left it', () => {
  expect(stepFrom(1.35, 1)).toBe(1.4);
  expect(stepFrom(1.35, -1)).toBe(1.3);
  expect(stepFrom(1.4, 1)).toBe(1.5);
  expect(stepFrom(1.4, -1)).toBe(1.3);
  expect(stepFrom(2.45, 1)).toBe(2.5);
  expect(stepFrom(2.5, 1)).toBe(2.5);
  expect(stepFrom(0.95, -1)).toBe(0.9);
  expect(stepFrom(1.7, 0)).toBe(1);
  keepSize(1.35);
  expect(stepSize(1)).toBe(1.4);
  expect(stepSize(1)).toBe(1.5);
  expect(stepSize(-1)).toBe(1.4);
});
