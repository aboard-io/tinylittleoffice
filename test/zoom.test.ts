// The size of everything (src/kit/zoom.ts): clamped to 70%–200%, a pinch kept to the nearest 5%, the stepper moving in
// tens from wherever a pinch left it, and the nav stopping at 120%. The normal size (100%) draws everything at 1.3,
// what the stepper called 130% before: the root's --to-doc is BASE × the size (its font size, kit.css), --to-nav the
// nav's, and nothing drawn outside the page moves.
import { test, expect, afterEach, vi } from 'vitest';
import { BASE, NAV_MAX, SIZE_MAX, SIZE_MIN, applySize, clampSize, deviceStart, keepSize, navSize, pinchSize, size, stepFrom, stepSize } from '../src/kit/zoom.ts';
import { apps } from '../src/kit/apps.ts';

afterEach(() => void stepSize(0));

test('the size is clamped to 70%–200%, and the nav to 120%', () => {
  expect([SIZE_MIN, SIZE_MAX, NAV_MAX]).toEqual([0.7, 2, 1.2]);
  expect(clampSize(0.2)).toBe(0.7);
  expect(clampSize(9)).toBe(2);
  expect(clampSize(1.37)).toBe(1.37);
  pinchSize(1.9);
  expect(size()).toBe(1.9);
  expect(navSize()).toBe(1.2);
  pinchSize(1.1);
  expect(navSize()).toBe(1.1);
});

test('a pinch is live until kept, and kept to the nearest 5%', () => {
  pinchSize(1.83);
  expect(size()).toBe(1.83);
  expect(keepSize(1.83)).toBe(1.85);
  expect(size()).toBe(1.85);
  expect(keepSize(1.01)).toBe(1);
  expect(keepSize(3.1)).toBe(2);
  expect(keepSize(0.5)).toBe(0.7);
});

test('the stepper moves in tens from wherever a pinch left it', () => {
  expect(stepFrom(1.35, 1)).toBe(1.4);
  expect(stepFrom(1.35, -1)).toBe(1.3);
  expect(stepFrom(1.4, 1)).toBe(1.5);
  expect(stepFrom(1.4, -1)).toBe(1.3);
  expect(stepFrom(1.95, 1)).toBe(2);
  expect(stepFrom(2, 1)).toBe(2);
  expect(stepFrom(0.75, -1)).toBe(0.7);
  expect(stepFrom(1.7, 0)).toBe(1);
  keepSize(1.35);
  expect(stepSize(1)).toBe(1.4);
  expect(stepSize(1)).toBe(1.5);
  expect(stepSize(-1)).toBe(1.4);
});

/** Just enough of a page for applySize: the root's style, and a window to say so on. */
function fakePage() {
  const props = new Map<string, string>();
  const style = {
    setProperty: (k: string, v: string) => void (v ? props.set(k, v) : props.delete(k)),
    removeProperty: (k: string) => void props.delete(k),
    getPropertyValue: (k: string) => props.get(k) ?? '',
  };
  const attrs = new Set<string>();
  const g = globalThis as Record<string, unknown>;
  const was = { document: g.document, window: g.window };
  g.document = { documentElement: { style, toggleAttribute: (a: string, on: boolean) => void (on ? attrs.add(a) : attrs.delete(a)) } };
  g.window = { dispatchEvent: () => true };
  return { props, attrs, done: () => Object.assign(g, was) };
}

test('the normal size draws everything at 1.3: the root carries --to-doc (BASE × the size) and --to-nav (stopping at 1.2 × BASE), and no zoom', () => {
  const { props, attrs, done } = fakePage();
  try {
    expect(BASE).toBe(1.3);
    stepSize(0);
    expect(size()).toBe(1);
    expect(props.get('--to-doc')).toBe('1.3');
    expect(props.get('--to-nav')).toBe('1.3');
    expect(attrs.has('data-large')).toBe(false);
    keepSize(2);
    // Above 100% the root says so, and the menu button is opaque while typing (responsive.css).
    expect(attrs.has('data-large')).toBe(true);
    expect(props.get('--to-doc')).toBe('2.6');
    expect(navSize()).toBe(1.2);
    expect(props.get('--to-nav')).toBe('1.56');
    keepSize(0.7);
    expect(props.get('--to-doc')).toBe('0.91');
    expect(props.get('--to-nav')).toBe('0.91');
    applySize();
    expect(props.get('--to-doc')).toBe('0.91');
    // Two plain numbers and nothing else: no zoom, nothing for a length to be divided by.
    expect([...props.keys()].sort()).toEqual(['--to-doc', '--to-nav']);
  } finally {
    stepSize(0);
    done();
  }
});

test('nothing drawn outside the page follows the size: every app’s pages are the same bytes at 70%, 100% and 200%', () => {
  const drawn = () => apps().map((a) => a.templates.map((t) => JSON.stringify(a.view(t.doc, { still: true }))).join('\n'));
  const normal = drawn();
  keepSize(2);
  expect(drawn()).toEqual(normal);
  keepSize(0.7);
  expect(drawn()).toEqual(normal);
});

/** A device's localStorage under node: its items its own properties, as a browser's are (Object.keys lists them). */
class Device {
  getItem(k: string): string | null {
    return Object.hasOwn(this, k) ? (this as unknown as Record<string, string>)[k] : null;
  }
  setItem(k: string, v: string) {
    (this as unknown as Record<string, string>)[k] = String(v);
  }
  removeItem(k: string) {
    delete (this as unknown as Record<string, string>)[k];
  }
}

test('the size is kept on the device under Private too, like the language: a new link opened at 200% is at 200%', async () => {
  const g = globalThis as Record<string, unknown>;
  const device = new Device();
  g.localStorage = device;
  try {
    vi.resetModules();
    const store = await import('../src/kit/store.ts');
    expect(store.keeping()).toBe(false);
    (await import('../src/kit/zoom.ts')).keepSize(2);
    expect(device.getItem('tinyoffice.size')).toBe('2');
    // A fresh visit: the modules loaded anew, the device as it was left.
    vi.resetModules();
    expect((await import('../src/kit/zoom.ts')).size()).toBe(2);
    // The theme is the same kind of preference.
    vi.resetModules();
    const theme = await import('../src/kit/theme.ts');
    expect(device.getItem('to-theme')).toBeNull();
    // Saved, then Private again: both stay on the device, where the language stays; the rest goes into the visit's memory.
    const again = await import('../src/kit/store.ts');
    again.setKeeping(true);
    again.store.set('tinyoffice.pictures', '1');
    again.store.set('to-theme', 'dark');
    again.setKeeping(false);
    expect([device.getItem('tinyoffice.size'), device.getItem('to-theme'), device.getItem('tinyoffice.pictures')]).toEqual(['2', 'dark', null]);
    expect(theme.theme()).toBe('dark');
    // Forget everything still forgets them.
    expect(again.store.keys().sort()).toEqual(['tinyoffice.pictures', 'tinyoffice.size', 'to-theme']);
    for (const k of again.store.keys()) again.store.remove(k);
    expect(Object.keys(device)).toEqual([]);
  } finally {
    delete g.localStorage;
    vi.resetModules();
  }
});

test('on an iPhone the person’s own text size (Settings, Larger Text) is where the size starts: the body style’s size over its normal 17px', () => {
  expect(deviceStart(17)).toBe(1);
  expect(deviceStart(23)).toBe(1.35);
  expect(deviceStart(53)).toBe(SIZE_MAX);
  expect(deviceStart(14)).toBe(0.8);
  expect(deviceStart(NaN)).toBe(1);
});
