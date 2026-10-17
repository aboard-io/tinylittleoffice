// Save in browser turned off forgets what the visit holds in memory too: a password given this visit no longer
// opens its document without being typed again, and a locked document's opened text is gone (Paul, 2026-10-12:
// "Are we sure when I turn stuff off no cookies or local storage or in memory remains").
import { beforeEach, expect, test } from 'vitest';
import { lockWith, remember, reopen, setPrivate } from '../src/kit/share/privacy.ts';
import { pack } from '../src/kit/share/crypt.ts';
import { openedText, setOpened } from '../src/kit/share/locked.ts';

/** localStorage, in memory, for node. */
class Mem {
  private m = new Map<string, string>();
  getItem = (k: string) => this.m.get(k) ?? null;
  setItem = (k: string, v: string) => void this.m.set(k, v);
  removeItem = (k: string) => void this.m.delete(k);
  get length() {
    return this.m.size;
  }
  key = (i: number) => [...this.m.keys()][i] ?? null;
  clear = () => this.m.clear();
}

beforeEach(() => {
  (globalThis as Record<string, unknown>).localStorage = new Mem();
});

test('Private forgets the passwords the visit was given and the texts they opened', async () => {
  const locker = await lockWith('k7Rwm-Xq9Pz-aaaaa-bbbbb');
  const payload = await pack('---\napp: write\n---\nThe words.', locker);
  remember(locker);
  expect((await reopen(payload))?.text).toContain('The words.');
  setOpened('payload-1', 'the opened text');
  expect(openedText('payload-1')).toBe('the opened text');
  await setPrivate(true);
  expect(await reopen(payload)).toBeNull();
  expect(openedText('payload-1')).toBeUndefined();
});
