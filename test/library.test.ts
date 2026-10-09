// The library of kept documents: newest first, one per hash, trimmed when full, nothing at all under Private.
import { test, expect, beforeEach } from 'vitest';

/** localStorage as a Map, with a quota in characters to fill. */
class Mem {
  map = new Map<string, string>();
  quota = Infinity;
  get length() {
    return this.map.size;
  }
  key(i: number) {
    return [...this.map.keys()][i] ?? null;
  }
  getItem(k: string) {
    return this.map.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    if (v.length > this.quota) throw new DOMException('full', 'QuotaExceededError');
    this.map.set(k, String(v));
  }
  removeItem(k: string) {
    this.map.delete(k);
  }
  clear() {
    this.map.clear();
  }
}
const mem = new Mem();
// Object.keys(localStorage) is how the store lists its keys: a Proxy shows the Map's.
const ls = new Proxy(mem, {
  ownKeys: (t) => [...t.map.keys()],
  getOwnPropertyDescriptor: (t, k) => (typeof k === 'string' && t.map.has(k) ? { enumerable: true, configurable: true, value: t.map.get(k) } : undefined),
});
Object.defineProperty(globalThis, 'localStorage', { value: ls, configurable: true, writable: true });

const { library, keep, forget, forgetAll, firstWords, ago, MOST } = await import('../src/kit/library.ts');
const { setKeeping } = await import('../src/kit/store.ts');

const entry = (id: string, at: number, hash = `#/v1/write/y${id}`) => ({ id, app: 'write', title: id, hash, at });

beforeEach(() => {
  mem.clear();
  mem.quota = Infinity;
  setKeeping(true);
});

test('kept newest first; the same id is updated in place', () => {
  keep(entry('a', 1));
  keep(entry('b', 3));
  keep(entry('c', 2));
  expect(library().map((k) => k.id)).toEqual(['b', 'c', 'a']);
  keep({ ...entry('a', 4), hash: '#/v1/write/ynew', title: 'A, again' });
  expect(library().map((k) => k.id)).toEqual(['a', 'b', 'c']);
  expect(library()[0].title).toBe('A, again');
});

test('entries with the same hash collapse into one, the newest', () => {
  keep(entry('a', 1, '#/v1/write/ysame'));
  keep(entry('b', 2, '#/v1/write/ysame'));
  expect(library().map((k) => k.id)).toEqual(['b']);
});

test('forget one, forget all', () => {
  keep(entry('a', 1));
  keep(entry('b', 2));
  forget('a');
  expect(library().map((k) => k.id)).toEqual(['b']);
  forgetAll();
  expect(library()).toEqual([]);
  expect(mem.getItem('tinyoffice.library')).toBeNull();
});

test(`at most ${MOST}, and halved until it fits when storage is full`, () => {
  for (let i = 0; i < MOST + 10; i++) keep(entry(`d${i}`, i));
  expect(library()).toHaveLength(MOST);
  expect(library()[0].id).toBe(`d${MOST + 9}`);
  mem.quota = mem.getItem('tinyoffice.library')!.length - 1;
  keep(entry('new', 10_000));
  const left = library();
  expect(left.length).toBe(MOST / 2);
  expect(left[0].id).toBe('new');
});

test('under Private nothing is kept and nothing is written', () => {
  setKeeping(false);
  mem.clear();
  keep(entry('a', 1));
  expect(library()).toEqual([]);
  expect(mem.length).toBe(0);
  // Saved again, it was never kept.
  setKeeping(true);
  expect(library()).toEqual([]);
});

test('first words, for a document with no name', () => {
  expect(firstWords('# Launch meeting {.title}\nmore')).toBe('Launch meeting');
  expect(firstWords('---\ntheme: x\n---\n\n- [ ] **Buy** milk\n')).toBe('Buy milk');
  expect(firstWords('\n\n')).toBe('');
  expect(firstWords('word '.repeat(30)).length).toBeLessThanOrEqual(61);
});

test('when, as people say it', () => {
  const now = Date.UTC(2026, 9, 9, 12);
  expect(ago(now - 2 * 3600e3, 'en', now)).toBe('2 hours ago');
  expect(ago(now - 26 * 3600e3, 'en', now)).toBe('yesterday');
  expect(ago(now - 10e3, 'en', now)).toBe('now');
  expect(ago(Date.UTC(2026, 7, 1, 12), 'en', now)).toBe('Aug 1');
});

test('a new document is numbered by the first number its name for the day leaves free', async () => {
  const { firstFree, localDay } = await import('../src/kit/library.ts');
  expect(localDay(new Date(2026, 9, 9, 23, 59))).toBe('2026-10-09');
  expect(localDay(new Date(2027, 0, 1, 0, 0))).toBe('2027-01-01');
  const name = 'New Spreadsheet 2026-10-09 #{n}';
  expect(firstFree([], name)).toBe(1);
  expect(firstFree(['New Spreadsheet 2026-10-09 #1', 'Budget'], name)).toBe(2);
  expect(firstFree(['New Spreadsheet 2026-10-09 #1', 'New Spreadsheet 2026-10-09 #3'], name)).toBe(2);
  // Another day, another app, a renamed one, or words after the number: not taken.
  expect(firstFree(['New Spreadsheet 2026-10-08 #1', 'New Drawing 2026-10-09 #1', 'New Spreadsheet 2026-10-09 #1 (copy)', 'New Spreadsheet 2026-10-09 #'], name)).toBe(1);
  // The number may sit anywhere in a language's own order.
  expect(firstFree(['Nº 1 · Hoja nueva', 'Nº 2 · Hoja nueva'], 'Nº {n} · Hoja nueva')).toBe(3);
});
