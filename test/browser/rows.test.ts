// The kit's rows controller (src/kit/rows.ts) against a tiny host: a list of words, each at a depth, its family the
// deeper rows after it. Every behaviour the standard gives rows chosen whole (docs/editing.md §3, §6): choosing by the
// handle and by Shift+arrows (both ways, turning at the anchor), Select All, letting go, Delete, Tab, Alt+arrows, Mod+D,
// the clipboard, a drag by pointer events with its target drawn, a tap outside, the bar under the range and its order,
// and a finger's second tap extending.
import { test, expect } from 'vitest';
import { html, LitElement } from 'lit';
import { Rows, lastCopied, type RowRange, type RowSpan } from '../../src/kit/rows.ts';
import type { ToText } from '../../src/kit/text.ts';
import { caret } from '../../src/kit/textops.ts';
import '../../src/kit/text.ts';
import '../../src/styles.css';
import { tick } from './helpers.ts';

type It = { w: string; d: number };

class TestRows extends LitElement {
  items: It[] = [];
  log: string[] = [];
  private fam(i: number): number {
    let j = i + 1;
    while (j < this.items.length && this.items[j].d > this.items[i].d) j++;
    return j;
  }
  private put(items: It[]) {
    this.items = items;
    this.requestUpdate();
  }
  readonly rows: Rows<number> = new Rows<number>(this, {
    rows: () =>
      this.items.map((_, i) => {
        const host = this;
        return {
          id: i,
          span: { from: i, to: this.fam(i) },
          get el() {
            return host.querySelector<HTMLElement>(`.row[data-i="${i}"]`)!;
          },
        };
      }),
    box: () => this.querySelector<HTMLElement>('.list'),
    handle: '.grip',
    nests: true,
    edit: (id, offset) => void this.log.push(`edit ${id} ${offset}`),
    remove: (s) => this.put(this.items.filter((_, i) => i < s.from || i >= s.to)),
    canMove: (s, by) => (by < 0 ? s.from > 0 : s.to < this.items.length),
    move: (s, by) => {
      const r = this.rows.range!;
      const xs = [...this.items];
      const part = xs.splice(s.from, s.to - s.from);
      const at = by < 0 ? s.from - 1 : s.from + 1;
      xs.splice(at, 0, ...part);
      this.put(xs);
      return { anchor: r.anchor + by, focus: r.focus + by };
    },
    canShift: (s, by) => (by > 0 ? s.from > 0 : this.items.slice(s.from, s.to).every((x) => x.d > 0)),
    shift: (s, by) => {
      this.put(this.items.map((x, i) => (i >= s.from && i < s.to ? { ...x, d: x.d + by } : x)));
      return this.rows.range;
    },
    duplicate: (s) => {
      const r = this.rows.range!;
      const xs = [...this.items];
      xs.splice(s.to, 0, ...this.items.slice(s.from, s.to).map((x) => ({ ...x })));
      this.put(xs);
      const n = s.to - s.from;
      return { anchor: r.anchor + n, focus: r.focus + n } as RowRange<number>;
    },
    copy: (s: RowSpan) => {
      const xs = this.items.slice(s.from, s.to);
      return { text: xs.map((x) => `${'  '.repeat(x.d)}- ${x.w}`).join('\n') + '\n', html: `<ul>${xs.map((x) => `<li>${x.w}</li>`).join('')}</ul>` };
    },
    paste: (data, s) => void this.log.push(`paste ${JSON.stringify(data.text)} ${s ? `${s.from}-${s.to}` : 'none'}`),
    drop: (id, to, how) => void this.log.push(`drop ${id} ${how} ${to}`),
    extra: () => [{ label: 'Numbered', does: () => void this.log.push('numbered') }],
  });
  createRenderRoot() {
    return this;
  }
  render() {
    return html`<div class="list" tabindex="-1" style="max-height: 400px; overflow: auto">
        ${this.items.map(
          (it, i) =>
            html`<div class="row ${this.rows.has(i) ? 'ranged' : ''}" data-i=${i} style="display:flex; height: 40px; padding-left:${it.d * 24}px">
              <button type="button" class="grip to-rows-handle" aria-label="Handle ${it.w}" tabindex="-1" style="width:24px">≡</button>
              <to-text shape="line" style="flex:1" .blocks=${[{ k: 'li', depth: 0, runs: [{ t: it.w }] }]}></to-text>
            </div>`,
        )}
      </div>
      ${this.rows.renderContext()}`;
  }
}
customElements.define('test-rows', TestRows);

async function host(words: (string | [string, number])[]): Promise<TestRows> {
  document.body.innerHTML = '';
  const el = document.createElement('test-rows') as TestRows;
  el.items = words.map((w) => (typeof w === 'string' ? { w, d: 0 } : { w: w[0], d: w[1] }));
  document.body.append(el);
  await el.updateComplete;
  await tick();
  return el;
}
const box = (el: HTMLElement) => el.querySelector<HTMLElement>('.list')!;
const handle = (el: HTMLElement, i: number) => el.querySelector<HTMLElement>(`.row[data-i="${i}"] .grip`)!;
const words = (el: HTMLElement, i: number) => el.querySelector<ToText>(`.row[data-i="${i}"] to-text`)!;
const ranged = (el: HTMLElement) => [...el.querySelectorAll<HTMLElement>('.row.ranged')].map((r) => Number(r.dataset.i));
const barOpen = (el: HTMLElement) => !!el.querySelector('.to-rows-context .to-context')?.matches(':popover-open');
const barButton = (el: HTMLElement, label: string) => el.querySelector<HTMLButtonElement>(`.to-rows-context button[aria-label="${label}"]`)!;
const ws = (el: TestRows) => el.items.map((x) => `${'.'.repeat(x.d)}${x.w}`).join(' ');
async function key(el: TestRows, on: HTMLElement, k: string, more: KeyboardEventInit = {}) {
  const e = new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...more });
  on.dispatchEvent(e);
  await el.updateComplete;
  await tick();
  return e;
}
async function settle(el: TestRows) {
  await el.updateComplete;
  await tick();
}
function pointer(on: HTMLElement, type: string, x: number, y: number, more: PointerEventInit = {}) {
  on.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 3, isPrimary: true, button: 0, pointerType: 'mouse', clientX: x, clientY: y, ...more }));
}

test('a tap on a handle chooses the row; Shift+tap extends; the bar comes up under the range in the standard’s order and goes when it is let go', async () => {
  const el = await host(['a', 'b', ['b1', 1], 'c']);
  expect(barOpen(el)).toBe(false);
  handle(el, 1).click();
  await settle(el);
  // A row's family is chosen with it.
  expect(ranged(el)).toEqual([1, 2]);
  expect(el.rows.range).toEqual({ anchor: 1, focus: 1 });
  expect(document.activeElement).toBe(box(el));
  expect(barOpen(el)).toBe(true);
  const labels = [...el.querySelectorAll('.to-rows-context .to-context > *')].map((b) => (b.getAttribute('role') === 'separator' ? '|' : b.getAttribute('aria-label')));
  expect(labels).toEqual(['Edit', 'Move up', 'Move down', 'Numbered', 'Indent', 'Bring out', 'Duplicate', '|', 'Copy', 'Cut', 'Paste', '|', 'Delete']);
  // The bar sits under the range.
  const bar = el.querySelector<HTMLElement>('.to-rows-context .to-context')!.getBoundingClientRect();
  expect(bar.top).toBeGreaterThanOrEqual(el.querySelector('.row[data-i="2"]')!.getBoundingClientRect().bottom - 1);
  expect(barButton(el, 'Move up').disabled).toBe(false);
  handle(el, 3).dispatchEvent(new MouseEvent('click', { bubbles: true, shiftKey: true }));
  await settle(el);
  expect(ranged(el)).toEqual([1, 2, 3]);
  // Edit: the caret into the focus row.
  barButton(el, 'Edit').click();
  await settle(el);
  expect(el.rows.range).toBeNull();
  expect(el.log.at(-1)).toBe('edit 3 end');
  expect(barOpen(el)).toBe(false);
});

test('Shift+Down from the words chooses the row; Shift+arrows extend both ways and turn at the anchor; Mod+A takes every row', async () => {
  const el = await host(['a', 'b', ['b1', 1], 'c', 'd']);
  words(el, 1).sel = caret(0, 1);
  await settle(el);
  await key(el, words(el, 1).tx, 'ArrowDown', { shiftKey: true });
  expect(el.rows.range).toEqual({ anchor: 1, focus: 1 });
  // Down past a family goes to the row after it.
  await key(el, box(el), 'ArrowDown', { shiftKey: true });
  expect(el.rows.range).toEqual({ anchor: 1, focus: 3 });
  expect(ranged(el)).toEqual([1, 2, 3]);
  await key(el, box(el), 'ArrowUp', { shiftKey: true });
  await key(el, box(el), 'ArrowUp', { shiftKey: true });
  await key(el, box(el), 'ArrowUp', { shiftKey: true });
  // Past the anchor the range turns: from a to b.
  expect(el.rows.range).toEqual({ anchor: 1, focus: 0 });
  expect(ranged(el)).toEqual([0, 1, 2]);
  await key(el, box(el), 'ArrowDown', { shiftKey: true });
  expect(ranged(el)).toEqual([1, 2]);
  const all = await key(el, box(el), 'a', { ctrlKey: true });
  expect(all.defaultPrevented).toBe(true);
  expect(ranged(el)).toEqual([0, 1, 2, 3, 4]);
});

test('letting go: Escape and Enter put the caret in the focus row, plain arrows in the row past the range; words focused let go; Escape in words chooses the row', async () => {
  const el = await host(['a', 'b', 'c', 'd']);
  handle(el, 1).click();
  await settle(el);
  await key(el, box(el), 'Escape');
  expect(el.rows.range).toBeNull();
  expect(el.log.at(-1)).toBe('edit 1 end');
  handle(el, 1).click();
  await settle(el);
  await key(el, box(el), 'Enter');
  expect(el.log.at(-1)).toBe('edit 1 end');
  handle(el, 1).click();
  await settle(el);
  handle(el, 2).dispatchEvent(new MouseEvent('click', { bubbles: true, shiftKey: true }));
  await settle(el);
  await key(el, box(el), 'ArrowDown');
  expect(el.log.at(-1)).toBe('edit 3 0');
  handle(el, 1).click();
  await settle(el);
  await key(el, box(el), 'ArrowUp');
  expect(el.log.at(-1)).toBe('edit 0 end');
  // Typing does nothing to chosen rows.
  handle(el, 1).click();
  await settle(el);
  const x = await key(el, box(el), 'x');
  expect(x.defaultPrevented).toBe(false);
  expect(ws(el)).toBe('a b c d');
  // The focus going into words lets the range go.
  words(el, 3).tx.focus();
  await settle(el);
  expect(el.rows.range).toBeNull();
  // Escape in a row's words steps out to the row, chosen.
  words(el, 2).sel = caret(0, 1);
  await settle(el);
  await key(el, words(el, 2).tx, 'Escape');
  expect(el.rows.range).toEqual({ anchor: 2, focus: 2 });
});

test('Delete, Tab and Shift+Tab, Alt+Up/Down and Mod+D act on the range; refused ones are disabled in the bar', async () => {
  const el = await host(['a', 'b', 'c', 'd']);
  handle(el, 1).click();
  await settle(el);
  handle(el, 2).dispatchEvent(new MouseEvent('click', { bubbles: true, shiftKey: true }));
  await settle(el);
  expect(barButton(el, 'Bring out').disabled).toBe(true);
  await key(el, box(el), 'Tab');
  expect(ws(el)).toBe('a .b .c d');
  expect(ranged(el)).toEqual([1, 2]);
  await key(el, box(el), 'Tab', { shiftKey: true });
  expect(ws(el)).toBe('a b c d');
  await key(el, box(el), 'ArrowDown', { altKey: true });
  expect(ws(el)).toBe('a d b c');
  expect(ranged(el)).toEqual([2, 3]);
  expect(barButton(el, 'Move down').disabled).toBe(true);
  barButton(el, 'Move up').click();
  await settle(el);
  expect(ws(el)).toBe('a b c d');
  expect(ranged(el)).toEqual([1, 2]);
  const dup = await key(el, box(el), 'd', { metaKey: true });
  expect(dup.defaultPrevented).toBe(true);
  expect(ws(el)).toBe('a b c b c d');
  // The copy is chosen.
  expect(ranged(el)).toEqual([3, 4]);
  await key(el, box(el), 'Backspace');
  expect(ws(el)).toBe('a b c d');
  expect(el.rows.range).toBeNull();
  expect(barOpen(el)).toBe(false);
  handle(el, 0).click();
  await settle(el);
  barButton(el, 'Delete').click();
  await settle(el);
  expect(ws(el)).toBe('b c d');
});

test('the clipboard: copy and cut give the host’s text and HTML (and keep them for the bar’s Paste); a paste goes in place of the range; outside words only', async () => {
  const el = await host(['a', ['a1', 1], 'b']);
  handle(el, 0).click();
  await settle(el);
  const dt = new DataTransfer();
  box(el).dispatchEvent(new ClipboardEvent('copy', { clipboardData: dt, bubbles: true, cancelable: true }));
  expect(dt.getData('text/plain')).toBe('- a\n  - a1\n');
  expect(dt.getData('text/html')).toBe('<ul><li>a</li><li>a1</li></ul>');
  expect(lastCopied()).toEqual({ text: '- a\n  - a1\n', html: '<ul><li>a</li><li>a1</li></ul>' });
  // Copied with nothing focused: the body has it.
  (document.activeElement as HTMLElement).blur();
  const body = new DataTransfer();
  document.body.dispatchEvent(new ClipboardEvent('copy', { clipboardData: body, bubbles: true, cancelable: true }));
  expect(body.getData('text/plain')).toBe('- a\n  - a1\n');
  handle(el, 2).click();
  await settle(el);
  const p = new DataTransfer();
  p.setData('text/plain', '- x\r\n- y');
  box(el).dispatchEvent(new ClipboardEvent('paste', { clipboardData: p, bubbles: true, cancelable: true }));
  await settle(el);
  expect(el.log.at(-1)).toBe('paste "- x\\n- y" 2-3');
  expect(el.rows.range).toBeNull();
  // Cut: copied, then the rows go.
  handle(el, 0).click();
  await settle(el);
  const cut = new DataTransfer();
  box(el).dispatchEvent(new ClipboardEvent('cut', { clipboardData: cut, bubbles: true, cancelable: true }));
  await settle(el);
  expect(cut.getData('text/plain')).toBe('- a\n  - a1\n');
  expect(ws(el)).toBe('b');
  // With no range, a copy in the words is the words' own.
  words(el, 0).sel = caret(0, 1);
  await settle(el);
  const mine = new DataTransfer();
  const e = new ClipboardEvent('copy', { clipboardData: mine, bubbles: true, cancelable: true });
  words(el, 0).tx.dispatchEvent(e);
  expect(mine.getData('text/html')).not.toBe('<ul><li>a</li><li>a1</li></ul>');
});

test('the bar’s Paste reads the system clipboard where the page may, else what was copied here', async () => {
  const el = await host(['a', 'b']);
  handle(el, 0).click();
  await settle(el);
  barButton(el, 'Copy').click();
  handle(el, 1).click();
  await settle(el);
  barButton(el, 'Paste').click();
  for (let i = 0; i < 50 && !el.log.some((l) => l.startsWith('paste')); i++) await tick(20);
  expect(el.log.find((l) => l.startsWith('paste'))).toBe('paste "- a\\n" 1-2');
});

test('a tap outside the host lets the range go; a tap in the bar does not', async () => {
  const el = await host(['a', 'b']);
  handle(el, 0).click();
  await settle(el);
  barButton(el, 'Numbered').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
  await settle(el);
  expect(el.rows.range).not.toBeNull();
  const out = document.createElement('div');
  document.body.append(out);
  out.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
  await settle(el);
  expect(el.rows.range).toBeNull();
  expect(barOpen(el)).toBe(false);
});

test('a finger: a second tap on another handle extends the range; a tap without movement is a choose, not a drag', async () => {
  const el = await host(['a', 'b', 'c']);
  const tap = (i: number) => {
    const r = handle(el, i).getBoundingClientRect();
    pointer(handle(el, i), 'pointerdown', r.left + 4, r.top + 4, { pointerType: 'touch' });
    pointer(handle(el, i), 'pointerup', r.left + 4, r.top + 4, { pointerType: 'touch' });
    handle(el, i).click();
  };
  tap(0);
  await settle(el);
  expect(el.rows.range).toEqual({ anchor: 0, focus: 0 });
  tap(2);
  await settle(el);
  expect(ranged(el)).toEqual([0, 1, 2]);
  // With a mouse, a second tap chooses afresh.
  const r = handle(el, 1).getBoundingClientRect();
  pointer(handle(el, 1), 'pointerdown', r.left + 4, r.top + 4);
  pointer(handle(el, 1), 'pointerup', r.left + 4, r.top + 4);
  await settle(el);
  expect(ranged(el)).toEqual([1]);
});

test('a drag by the handle: past 6px it carries the row, the target is drawn after a row (under it on its right half), never inside its own family; the drop goes to the host', async () => {
  const el = await host(['a', ['a1', 1], 'b', 'c']);
  const h = handle(el, 0).getBoundingClientRect();
  const row = (i: number) => el.querySelector<HTMLElement>(`.row[data-i="${i}"]`)!.getBoundingClientRect();
  pointer(handle(el, 0), 'pointerdown', h.left + 4, h.top + 4);
  pointer(handle(el, 0), 'pointermove', h.left + 7, h.top + 6);
  expect(el.rows.drag).toBeNull();
  // Over its own child: no target.
  pointer(handle(el, 0), 'pointermove', row(1).left + 40, row(1).top + 20);
  expect(el.rows.drag).toMatchObject({ id: 0, over: null });
  expect(document.querySelector<HTMLElement>('.to-rows-target')?.hidden ?? true).toBe(true);
  // The left half of b: after it.
  pointer(handle(el, 0), 'pointermove', row(2).left + 40, row(2).top + 20);
  await settle(el);
  expect(el.rows.drag).toMatchObject({ id: 0, over: 2, how: 'after' });
  const line = document.querySelector<HTMLElement>('.to-rows-target')!;
  expect(line.hidden).toBe(false);
  expect(Math.abs(line.getBoundingClientRect().top - row(2).bottom)).toBeLessThan(3);
  const after = line.getBoundingClientRect().left;
  // Its right half: under it, the line stepped in.
  pointer(handle(el, 0), 'pointermove', row(2).right - 20, row(2).top + 20);
  expect(el.rows.drag).toMatchObject({ over: 2, how: 'under' });
  expect(line.getBoundingClientRect().left).toBeGreaterThan(after);
  pointer(handle(el, 0), 'pointerup', row(2).right - 20, row(2).top + 20);
  handle(el, 0).click();
  await settle(el);
  expect(el.log.at(-1)).toBe('drop 0 under 2');
  expect(el.rows.drag).toBeNull();
  expect(document.querySelector('.to-rows-target')).toBeNull();
  // The click after a drag is not a choose.
  expect(el.rows.range).toBeNull();
  // pointercancel drops nothing.
  pointer(handle(el, 3), 'pointerdown', h.left + 4, row(3).top + 4);
  pointer(handle(el, 3), 'pointermove', h.left + 4, row(0).top + 10);
  pointer(handle(el, 3), 'pointercancel', h.left + 4, row(0).top + 10);
  expect(el.rows.drag).toBeNull();
  expect(el.log.at(-1)).toBe('drop 0 under 2');
});

test('near the scroller’s edge a drag scrolls it; the handle alone has touch-action none, and is 44px to a coarse pointer', async () => {
  const el = await host(Array.from({ length: 30 }, (_, i) => `r${i}`));
  const list = box(el);
  list.style.maxHeight = '200px';
  await settle(el);
  expect(list.scrollTop).toBe(0);
  const h = handle(el, 0).getBoundingClientRect();
  const bottom = list.getBoundingClientRect().bottom;
  pointer(handle(el, 0), 'pointerdown', h.left + 4, h.top + 4);
  pointer(handle(el, 0), 'pointermove', h.left + 4, bottom - 10);
  for (let i = 0; i < 20 && list.scrollTop === 0; i++) await tick(20);
  expect(list.scrollTop).toBeGreaterThan(0);
  pointer(handle(el, 0), 'pointerup', h.left + 4, bottom - 10);
  await settle(el);
  expect(getComputedStyle(handle(el, 0)).touchAction).toBe('none');
  expect(getComputedStyle(el.querySelector('.row')!).touchAction).not.toBe('none');
  // The coarse-pointer rule: a 44px ::before round the handle.
  const rule = [...document.styleSheets].flatMap((s) => [...s.cssRules]).flatMap((r) => (r instanceof CSSLayerBlockRule ? [...r.cssRules] : [r])).find((r) => r instanceof CSSMediaRule && r.conditionText.includes('pointer: coarse') && r.cssText.includes('.to-rows-handle::before')) as CSSMediaRule | undefined;
  expect(rule).toBeDefined();
  expect(rule!.cssText).toContain('width: 44px');
  expect(rule!.cssText).toContain('height: 44px');
});
